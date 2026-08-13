import Database from "better-sqlite3";
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mapRowToBlock } from "@/lib/project-doc-blocks/mappers";
import { HUMAN_AUTH_SCHEMA_SQL } from "@/lib/human-auth/humanAuthSchema";
import {
    createTestH2Session,
    seedHumanOperator,
    TRUSTED_ORIGIN,
} from "../helpers/humanSession";

const { mockGetDb } = vi.hoisted(() => ({ mockGetDb: vi.fn() }));
vi.mock("@/db/db", () => ({ getDb: mockGetDb }));

import { PATCH as updateBlock } from "@/app/api/projects/[slug]/doc-blocks/[blockId]/route";

const PROJECT_ID = "p-arbor";
const BLOCK_ID = "blk-arbor-001";
const ARBOR_UPDATED_AT = "2026-08-05T09:16:29.963Z";

let db: Database.Database;
let sessionCookie: string;

function createSchema() {
    db.exec(`
        PRAGMA foreign_keys = ON;
        CREATE TABLE projects (
            id TEXT PRIMARY KEY,
            slug TEXT NOT NULL UNIQUE,
            name TEXT NOT NULL
        );
        CREATE TABLE project_doc_blocks (
            id TEXT PRIMARY KEY,
            project_id TEXT NOT NULL,
            legacy_project_slug TEXT NULL,
            import_source TEXT NULL,
            import_batch_id TEXT NULL,
            migrated_at TEXT NULL,
            source_row_number INTEGER NULL,
            source_record_id TEXT NULL,
            block_type TEXT NOT NULL,
            title TEXT NOT NULL,
            block_date TEXT NOT NULL,
            summary TEXT NOT NULL,
            details_md TEXT NOT NULL,
            evidence_links_json TEXT NOT NULL DEFAULT '[]',
            related_files_json TEXT NOT NULL DEFAULT '[]',
            next_action TEXT NULL,
            status TEXT NOT NULL DEFAULT 'active',
            order_index INTEGER NULL,
            source_text TEXT NULL,
            source_excerpt TEXT NULL,
            source_type TEXT NULL,
            generated_by TEXT NULL CHECK (generated_by IN ('arbor') OR generated_by IS NULL),
            reviewed_by_user INTEGER NOT NULL DEFAULT 0,
            applied_at TEXT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE RESTRICT
        );
    `);
}

function seedArborBlock() {
    db.prepare(`INSERT INTO projects (id, slug, name) VALUES (?, ?, ?)`).run(PROJECT_ID, "arbor-project", "Arbor Project");
    db.prepare(`
        INSERT INTO project_doc_blocks (
            id, project_id, block_type, title, block_date, summary, details_md,
            evidence_links_json, related_files_json, status, generated_by, reviewed_by_user,
            created_at, updated_at
        ) VALUES (?, ?, 'qa_review', 'Arbor Auto-Draft: QA / Review Log', '2026-08-02', 'summary', 'details',
            '[]', '[]', 'active', 'arbor', 1, ?, ?)
    `).run(BLOCK_ID, PROJECT_ID, ARBOR_UPDATED_AT, ARBOR_UPDATED_AT);
}

function patchRequest(body: unknown) {
    return new NextRequest(`http://localhost/api/projects/arbor-project/doc-blocks/${BLOCK_ID}`, {
        method: "PATCH",
        headers: {
            "Content-Type": "application/json",
            cookie: sessionCookie,
            origin: TRUSTED_ORIGIN,
        },
        body: JSON.stringify(body),
    });
}

beforeEach(() => {
    db = new Database(":memory:");
    db.exec(HUMAN_AUTH_SCHEMA_SQL);
    createSchema();
    seedArborBlock();
    const operatorId = seedHumanOperator(db);
    sessionCookie = createTestH2Session(db, operatorId).cookieHeader;
    vi.stubEnv("WORKOS_TRUSTED_ORIGINS", TRUSTED_ORIGIN);
    mockGetDb.mockReturnValue(db);
});

afterEach(() => {
    vi.unstubAllEnvs();
    db.close();
});

describe("Project Documentation block update on arbor-generated records", () => {
    it("maps stored generated_by 'arbor' back to 'arbor'", () => {
        const row = db.prepare("SELECT * FROM project_doc_blocks WHERE id = ?").get(BLOCK_ID) as Parameters<typeof mapRowToBlock>[0];
        const block = mapRowToBlock(row, "arbor-project");
        expect(block.generatedBy).toBe("arbor");
    });

    it("updates an arbor-generated block without touching provenance", async () => {
        const response = await updateBlock(
            patchRequest({
                title: "Arbor Auto-Draft: QA / Review Log (edited)",
                summary: "updated summary",
                details: "updated details",
                nextAction: "Review the edit",
                status: "active",
                reviewedByUser: true,
                expectedUpdatedAt: ARBOR_UPDATED_AT,
            }),
            { params: Promise.resolve({ slug: "arbor-project", blockId: BLOCK_ID }) },
        );
        expect(response.status).toBe(200);
        const body = await response.json();
        expect(body.title).toBe("Arbor Auto-Draft: QA / Review Log (edited)");
        expect(body.generatedBy).toBe("arbor");
        const row = db.prepare("SELECT generated_by, title, updated_at FROM project_doc_blocks WHERE id = ?").get(BLOCK_ID) as {
            generated_by: string | null;
            title: string;
            updated_at: string;
        };
        expect(row.generated_by).toBe("arbor");
        expect(row.title).toBe("Arbor Auto-Draft: QA / Review Log (edited)");
        expect(row.updated_at).not.toBe(ARBOR_UPDATED_AT);
    });

    it("rejects attempts to change generatedBy as immutable", async () => {
        const response = await updateBlock(
            patchRequest({
                title: "Attempted edit",
                generatedBy: "arbor_assistant",
                expectedUpdatedAt: ARBOR_UPDATED_AT,
            }),
            { params: Promise.resolve({ slug: "arbor-project", blockId: BLOCK_ID }) },
        );
        expect(response.status).toBe(400);
        const body = await response.json();
        expect(body.error).toContain("Immutable fields cannot be updated");
        const row = db.prepare("SELECT title FROM project_doc_blocks WHERE id = ?").get(BLOCK_ID) as { title: string };
        expect(row.title).toBe("Arbor Auto-Draft: QA / Review Log");
    });

    it("clears an optional field without partial failure", async () => {
        const response = await updateBlock(
            patchRequest({
                nextAction: null,
                expectedUpdatedAt: ARBOR_UPDATED_AT,
            }),
            { params: Promise.resolve({ slug: "arbor-project", blockId: BLOCK_ID }) },
        );
        expect(response.status).toBe(200);
        const row = db.prepare("SELECT next_action FROM project_doc_blocks WHERE id = ?").get(BLOCK_ID) as { next_action: string | null };
        expect(row.next_action).toBeNull();
    });

    it("returns 409 for stale concurrency tokens", async () => {
        const response = await updateBlock(
            patchRequest({
                title: "stale edit",
                expectedUpdatedAt: "2020-01-01T00:00:00.000Z",
            }),
            { params: Promise.resolve({ slug: "arbor-project", blockId: BLOCK_ID }) },
        );
        expect(response.status).toBe(409);
        expect((await response.json()).error).toContain("changed");
    });
});
