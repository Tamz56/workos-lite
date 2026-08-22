import Database from "better-sqlite3";
import { createHash } from "node:crypto";
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { mockGetDb } = vi.hoisted(() => ({ mockGetDb: vi.fn() }));
vi.mock("@/db/db", () => ({ getDb: mockGetDb }));

import { GET as getSources } from "@/app/api/ai-read/projects/[slug]/sources/route";
import { POST as readSource } from "@/app/api/ai-read/projects/[slug]/sources/read/route";

const READ_PASSWORD = "route-read-password";
const READ_KEY = "route-read-key";
const PROJECT_SLUG = "route-project";

let db: Database.Database;

function sha256(value: string): string {
    return createHash("sha256").update(value, "utf8").digest("hex");
}

function createRouteDb(): Database.Database {
    const database = new Database(":memory:");
    database.exec(`
        CREATE TABLE agent_keys (
          id TEXT PRIMARY KEY, name TEXT NOT NULL UNIQUE, key_hash TEXT NOT NULL,
          scopes_json TEXT NOT NULL, is_enabled INTEGER NOT NULL DEFAULT 1,
          created_at TEXT NOT NULL DEFAULT (datetime('now'))
        );
        CREATE TABLE projects (
          id TEXT PRIMARY KEY, slug TEXT NOT NULL UNIQUE, name TEXT NOT NULL,
          status TEXT NOT NULL, start_date TEXT, end_date TEXT, owner TEXT,
          is_seed INTEGER DEFAULT 0, created_at TEXT, updated_at TEXT,
          category TEXT, registry_status TEXT, priority TEXT, current_goal TEXT,
          progress_stage TEXT, next_action TEXT, cadence TEXT,
          risk_or_blocked_by TEXT, metadata_updated_at TEXT
        );
        CREATE TABLE project_doc_blocks (
          id TEXT PRIMARY KEY, project_id TEXT NOT NULL, legacy_project_slug TEXT,
          import_source TEXT, import_batch_id TEXT, migrated_at TEXT,
          source_row_number INTEGER, source_record_id TEXT, block_type TEXT NOT NULL,
          title TEXT NOT NULL, block_date TEXT NOT NULL, summary TEXT NOT NULL,
          details_md TEXT NOT NULL, evidence_links_json TEXT NOT NULL DEFAULT '[]',
          related_files_json TEXT NOT NULL DEFAULT '[]', next_action TEXT,
          status TEXT NOT NULL DEFAULT 'active', order_index INTEGER,
          source_text TEXT, source_excerpt TEXT, source_type TEXT, generated_by TEXT,
          reviewed_by_user INTEGER NOT NULL DEFAULT 0, applied_at TEXT,
          created_at TEXT NOT NULL, updated_at TEXT NOT NULL
        );
        CREATE TABLE docs (
          id TEXT PRIMARY KEY, title TEXT NOT NULL, content_md TEXT NOT NULL,
          is_seed INTEGER DEFAULT 0, project_id TEXT, workspace TEXT,
          created_at TEXT NOT NULL, updated_at TEXT NOT NULL
        );
        CREATE TABLE project_decisions (
          id TEXT PRIMARY KEY, project_id TEXT NOT NULL, title TEXT,
          decision TEXT, reason TEXT, impact TEXT, created_at TEXT
        );
        CREATE TABLE project_contexts (
          id TEXT PRIMARY KEY, project_id TEXT NOT NULL UNIQUE,
          overview TEXT, purpose TEXT, standing_instructions TEXT, tone_voice TEXT,
          guardrails TEXT, output_standards TEXT, decision_rules TEXT,
          source_of_truth TEXT, created_at TEXT, updated_at TEXT
        );
        CREATE TABLE project_loops (
          id TEXT PRIMARY KEY, project_id TEXT NOT NULL, template_id TEXT,
          loop_name TEXT, loop_type TEXT, current_step TEXT, status TEXT,
          risk_level TEXT, review_gate_level INTEGER, expected_output TEXT,
          save_destination TEXT, learn_note TEXT, steps_json TEXT,
          created_at TEXT, updated_at TEXT, completed_at TEXT,
          gate_status TEXT, last_gate_action TEXT, last_gate_at TEXT
        );
    `);
    database.prepare(
        "INSERT INTO agent_keys (id, name, key_hash, scopes_json, is_enabled) VALUES (?, ?, ?, ?, 1)",
    ).run("read-agent", "Read Agent", sha256(READ_KEY), JSON.stringify(["project_sources:read"]));
    database.prepare(`
        INSERT INTO projects (
          id, slug, name, status, created_at, updated_at, current_goal,
          next_action, risk_or_blocked_by, progress_stage
        ) VALUES (?, ?, ?, 'planned', ?, ?, NULL, NULL, NULL, NULL)
    `).run("proj-1", PROJECT_SLUG, "Route Project", "2026-08-01T00:00:00.000Z", "2026-08-10T00:00:00.000Z");
    database.prepare(`
        INSERT INTO projects (
          id, slug, name, status, created_at, updated_at, current_goal,
          next_action, risk_or_blocked_by, progress_stage
        ) VALUES (?, ?, ?, 'planned', ?, ?, NULL, NULL, NULL, NULL)
    `).run("proj-2", "other-project", "Other Project", "2026-08-01T00:00:00.000Z", "2026-08-01T00:00:00.000Z");
    database.prepare(`
        INSERT INTO docs (id, title, content_md, project_id, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
    `).run("doc-1", "Route Document", "route document body", "proj-1", "2026-08-01T00:00:00.000Z", "2026-08-09T00:00:00.000Z");
    database.prepare(`
        INSERT INTO docs (id, title, content_md, project_id, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
    `).run("doc-other", "Other Document", "other body", "proj-2", "2026-08-01T00:00:00.000Z", "2026-08-02T00:00:00.000Z");
    return database;
}

function getRequest(query = "", password = READ_PASSWORD): NextRequest {
    return new NextRequest(`http://localhost/api/ai-read/projects/${PROJECT_SLUG}/sources${query}`, {
        headers: { "x-agent-password": password },
    });
}

function postRequest(body: unknown, password = READ_PASSWORD): NextRequest {
    return new NextRequest(`http://localhost/api/ai-read/projects/${PROJECT_SLUG}/sources/read`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "x-agent-password": password,
        },
        body: JSON.stringify(body),
    });
}

function params() {
    return { params: Promise.resolve({ slug: PROJECT_SLUG }) };
}

function businessFingerprint(): string {
    const tables = ["projects", "project_doc_blocks", "docs", "project_decisions", "project_contexts", "project_loops"];
    return tables.map((table) => JSON.stringify(db.prepare(`SELECT * FROM ${table} ORDER BY id`).all())).join("|");
}

async function errorCode(response: Response): Promise<string> {
    const body = await response.json() as { error: { code: string } };
    return body.error.code;
}

type AuthCase = {
    name: string;
    status: number;
    code: string;
    password?: string;
    configure: () => void;
};

function authCases(): AuthCase[] {
    return [
        {
            name: "missing read configuration",
            status: 500,
            code: "READ_AUTH_CONFIG_MISSING",
            configure: () => {
                vi.stubEnv("AGENT_READ_PASSWORD", "");
                vi.stubEnv("AGENT_READ_KEY", "");
            },
        },
        {
            name: "wrong read password",
            status: 401,
            code: "READ_AUTH_FAILED",
            password: "wrong-password",
            configure: () => undefined,
        },
        {
            name: "disabled read principal",
            status: 403,
            code: "READ_AGENT_DISABLED",
            configure: () => {
                db.prepare("UPDATE agent_keys SET is_enabled = 0 WHERE id = 'read-agent'").run();
            },
        },
        {
            name: "missing scope",
            status: 403,
            code: "READ_SCOPE_REJECTED",
            configure: () => {
                db.prepare("UPDATE agent_keys SET scopes_json = '[]' WHERE id = 'read-agent'").run();
            },
        },
        {
            name: "read plus extra scope",
            status: 403,
            code: "READ_SCOPE_REJECTED",
            configure: () => {
                db.prepare("UPDATE agent_keys SET scopes_json = ? WHERE id = 'read-agent'")
                    .run(JSON.stringify(["project_sources:read", "docs:write"]));
            },
        },
    ];
}

beforeEach(() => {
    db = createRouteDb();
    mockGetDb.mockReset();
    mockGetDb.mockReturnValue(db);
    vi.stubEnv("AGENT_READ_PASSWORD", READ_PASSWORD);
    vi.stubEnv("AGENT_READ_KEY", READ_KEY);
});

afterEach(() => {
    vi.unstubAllEnvs();
    db.close();
});

describe("READ1A actual GET route", () => {
    it("authenticates, returns the source index, and performs no business write", async () => {
        const before = businessFingerprint();
        const response = await getSources(getRequest("?pageSize=1"), params());
        expect(response.status).toBe(200);
        const body = await response.json();
        expect(body.sources).toHaveLength(1);
        expect(body.pagination.totalSources).toBe(2);
        expect(body.corpusFingerprint).toMatch(/^[a-f0-9]{64}$/);
        expect(businessFingerprint()).toBe(before);
    });

    it.each(authCases())("rejects $name", async ({ configure, password, status, code }) => {
        configure();
        const response = await getSources(getRequest("", password ?? READ_PASSWORD), params());
        expect(response.status).toBe(status);
        expect(await errorCode(response)).toBe(code);
    });

    it("maps invalid page size and invalid cursor errors", async () => {
        const invalidSize = await getSources(getRequest("?pageSize=0"), params());
        expect(invalidSize.status).toBe(400);
        expect(await errorCode(invalidSize)).toBe("INVALID_PAGE_SIZE");

        const first = await getSources(getRequest("?pageSize=1"), params());
        const firstBody = await first.json();
        const invalidCursor = await getSources(
            getRequest(`?cursor=invalid!&expectedCorpusFingerprint=${firstBody.corpusFingerprint}`),
            params(),
        );
        expect(invalidCursor.status).toBe(400);
        expect(await errorCode(invalidCursor)).toBe("INVALID_CURSOR");
    });

    it("rejects a cursor without a fingerprint and maps corpus changes", async () => {
        const first = await getSources(getRequest("?pageSize=1"), params());
        const firstBody = await first.json();
        const missingFingerprint = await getSources(
            getRequest(`?pageSize=1&cursor=${firstBody.pagination.nextCursor}`),
            params(),
        );
        expect(missingFingerprint.status).toBe(400);
        expect(await errorCode(missingFingerprint)).toBe("INVALID_CURSOR");

        db.prepare(`
            INSERT INTO docs (id, title, content_md, project_id, created_at, updated_at)
            VALUES ('doc-new', 'New', 'new body', 'proj-1', '2026-08-01T00:00:00.000Z', '2026-08-11T00:00:00.000Z')
        `).run();
        const changed = await getSources(
            getRequest(`?pageSize=1&cursor=${firstBody.pagination.nextCursor}&expectedCorpusFingerprint=${firstBody.corpusFingerprint}`),
            params(),
        );
        expect(changed.status).toBe(409);
        expect(await errorCode(changed)).toBe("CORPUS_CHANGED");
    });
});

describe("READ1A actual POST route", () => {
    const validBody = {
        source: { sourceKind: "doc", sourceId: "doc-1" },
        offset: 0,
        limit: 8,
    };

    it("authenticates, returns canonical chunk metadata, and performs no business write", async () => {
        const before = businessFingerprint();
        const response = await readSource(postRequest(validBody), params());
        expect(response.status).toBe(200);
        const body = await response.json();
        expect(body.ref).toEqual(validBody.source);
        expect(body.content).toBe("route do");
        expect(body.chunk).toMatchObject({
            offset: 0,
            includedChars: 8,
            nextOffset: 8,
            totalCharacterCount: "route document body".length,
            hasMore: true,
        });
        expect(businessFingerprint()).toBe(before);
    });

    it.each(authCases())("rejects $name", async ({ configure, password, status, code }) => {
        configure();
        const response = await readSource(postRequest(validBody, password ?? READ_PASSWORD), params());
        expect(response.status).toBe(status);
        expect(await errorCode(response)).toBe(code);
    });

    it.each([
        {
            name: "unknown source",
            body: { ...validBody, source: { sourceKind: "doc", sourceId: "missing" } },
            code: "UNKNOWN_SOURCE",
        },
        {
            name: "cross-project source",
            body: { ...validBody, source: { sourceKind: "doc", sourceId: "doc-other" } },
            code: "CROSS_PROJECT_SOURCE",
        },
        {
            name: "unsupported source kind",
            body: { ...validBody, source: { sourceKind: "note", sourceId: "note-1" } },
            code: "UNSUPPORTED_SOURCE_KIND",
        },
        {
            name: "invalid offset",
            body: { ...validBody, offset: -1 },
            code: "INVALID_OFFSET",
        },
        {
            name: "invalid chunk limit",
            body: { ...validBody, limit: 30_001 },
            code: "INVALID_CHUNK_LIMIT",
        },
    ])("maps $name", async ({ body, code }) => {
        const response = await readSource(postRequest(body), params());
        expect(response.status).toBe(400);
        expect(await errorCode(response)).toBe(code);
    });
});
