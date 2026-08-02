import Database from "better-sqlite3";
import { NextRequest } from "next/server";
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { mockGetDb } = vi.hoisted(() => ({ mockGetDb: vi.fn() }));
vi.mock("@/db/db", () => ({ getDb: mockGetDb }));

import { GET as listBlocks } from "@/app/api/projects/[slug]/doc-blocks/route";
import { GET as getBlock } from "@/app/api/projects/[slug]/doc-blocks/[blockId]/route";

const WORKOS_PROJECT_ID = "WniiRWTaGeEY7gt3XAsm7";
const GREEN_FINENESS_PROJECT_ID = "RciepxjtyZYQSA6pmKZ0f";
const EMPTY_PROJECT_ID = "EmptyProject0000000001";
const ORDER_PROJECT_ID = "OrderProject0000000001";
const WORKOS_BLOCK_ID = "q02vv7squ4pms8jsphy";
const GREEN_FINENESS_BLOCK_ID = "f83iqwahfxrms8ta2dq";
const ORIGINAL_DETAILS = "## บันทึกการทำงาน\n\n```text\n  preserve spacing\n```\n";

let db: Database.Database;
let baselineRows: unknown[];

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
            generated_by TEXT NULL,
            reviewed_by_user INTEGER NOT NULL DEFAULT 0,
            applied_at TEXT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE RESTRICT
        );

        INSERT INTO projects (id, slug, name) VALUES
            ('${WORKOS_PROJECT_ID}', 'workos-lite-arbordesk', 'WorkOS Lite'),
            ('${GREEN_FINENESS_PROJECT_ID}', 'green-fineness-content', 'Green Fineness'),
            ('${EMPTY_PROJECT_ID}', 'empty-project', 'Empty Project'),
            ('${ORDER_PROJECT_ID}', 'order-project', 'Order Project');
    `);

    insertBlock({
        id: WORKOS_BLOCK_ID,
        projectId: WORKOS_PROJECT_ID,
        legacyProjectSlug: "workos-lite-arbordesk",
        title: "ทบทวนระบบ WorkOS",
        details: ORIGINAL_DETAILS,
        evidenceLinks: ["https://example.com/evidence", "commit-abc"],
        relatedFiles: ["src/lib/example.ts"],
        reviewedByUser: 1,
        sourceText: "ต้นฉบับภาษาไทย",
        sourceExcerpt: "ข้อความย่อ",
        sourceType: "qa_report",
        generatedBy: "arbor",
        appliedAt: "2026-07-31T07:00:00.000Z",
        orderIndex: 3
    });
    insertBlock({
        id: GREEN_FINENESS_BLOCK_ID,
        projectId: GREEN_FINENESS_PROJECT_ID,
        legacyProjectSlug: "green-fineness-content",
        title: "Green Fineness recovery",
        details: "รายละเอียด Green Fineness",
        sourceRowNumber: 2,
        orderIndex: 1
    });
    insertBlock({
        id: "archived-workos-block",
        projectId: WORKOS_PROJECT_ID,
        legacyProjectSlug: "workos-lite-arbordesk",
        title: "Archived block",
        details: "archived details",
        status: "archived",
        sourceRowNumber: 3,
        orderIndex: 1
    });
}

function insertBlock(overrides: Partial<{
    id: string;
    projectId: string;
    legacyProjectSlug: string;
    title: string;
    details: string;
    status: "active" | "archived";
    evidenceLinks: string[];
    relatedFiles: string[];
    reviewedByUser: number;
    sourceText: string | null;
    sourceExcerpt: string | null;
    sourceType: string | null;
    generatedBy: string | null;
    appliedAt: string | null;
    sourceRowNumber: number;
    orderIndex: number | null;
    blockDate: string;
    createdAt: string;
    updatedAt: string;
}> = {}) {
    const value = {
        id: "default-block-id",
        projectId: WORKOS_PROJECT_ID,
        legacyProjectSlug: "workos-lite-arbordesk",
        title: "Default block",
        details: "Default details",
        status: "active" as const,
        evidenceLinks: [] as string[],
        relatedFiles: [] as string[],
        reviewedByUser: 0,
        sourceText: null as string | null,
        sourceExcerpt: null as string | null,
        sourceType: null as string | null,
        generatedBy: null as string | null,
        appliedAt: null as string | null,
        sourceRowNumber: 1,
        orderIndex: null as number | null,
        blockDate: "2026-07-31",
        createdAt: "2026-07-31T06:14:57.046Z",
        updatedAt: "2026-07-31T06:14:57.046Z",
        ...overrides
    };

    db.prepare(`
        INSERT INTO project_doc_blocks (
            id, project_id, legacy_project_slug, import_source, import_batch_id,
            migrated_at, source_row_number, source_record_id, block_type, title,
            block_date, summary, details_md, evidence_links_json, related_files_json,
            next_action, status, order_index, source_text, source_excerpt, source_type,
            generated_by, reviewed_by_user, applied_at, created_at, updated_at
        ) VALUES (
            ?, ?, ?, 'localstorage_recovery', 'localstorage-recovery-2026-08-01-project-doc-blocks',
            '2026-08-01T22:00:00.000Z', ?, ?, 'process_note', ?,
            ?, 'นำเข้าจาก Arbor Project Log', ?, ?, ?,
            'ตรวจขั้นถัดไป', ?, ?, ?, ?, ?,
            ?, ?, ?, ?, ?
        )
    `).run(
        value.id,
        value.projectId,
        value.legacyProjectSlug,
        value.sourceRowNumber,
        value.id,
        value.title,
        value.blockDate,
        value.details,
        JSON.stringify(value.evidenceLinks),
        JSON.stringify(value.relatedFiles),
        value.status,
        value.orderIndex,
        value.sourceText,
        value.sourceExcerpt,
        value.sourceType,
        value.generatedBy,
        value.reviewedByUser,
        value.appliedAt,
        value.createdAt,
        value.updatedAt
    );
}

function rows() {
    return db.prepare("SELECT * FROM project_doc_blocks ORDER BY id").all();
}

function setBaseline() {
    baselineRows = rows();
}

function listRequest(projectId: string, status?: string) {
    const query = status === undefined ? "" : `?status=${encodeURIComponent(status)}`;
    return listBlocks(
        new NextRequest(`http://localhost/api/projects/${projectId}/doc-blocks${query}`),
        { params: Promise.resolve({ slug: projectId }) }
    );
}

function itemRequest(projectId: string, blockId: string) {
    return getBlock(
        new NextRequest(`http://localhost/api/projects/${projectId}/doc-blocks/${blockId}`),
        { params: Promise.resolve({ slug: projectId, blockId }) }
    );
}

beforeEach(() => {
    db = new Database(":memory:");
    createSchema();
    mockGetDb.mockReturnValue(db);
    setBaseline();
});

afterEach(() => {
    expect(rows()).toEqual(baselineRows);
    db.close();
    vi.clearAllMocks();
});

afterAll(() => {
    vi.restoreAllMocks();
});

describe("Project documentation block collection GET", () => {
    it("lists active blocks for the WorkOS project by default", async () => {
        const response = await listRequest(WORKOS_PROJECT_ID);
        const payload = await response.json();
        expect(response.status).toBe(200);
        expect(payload.map((block: { id: string }) => block.id)).toEqual([WORKOS_BLOCK_ID]);
    });

    it("lists active blocks for the Green Fineness project", async () => {
        const response = await listRequest(GREEN_FINENESS_PROJECT_ID);
        const payload = await response.json();
        expect(response.status).toBe(200);
        expect(payload).toHaveLength(1);
        expect(payload[0].id).toBe(GREEN_FINENESS_BLOCK_ID);
    });

    it("isolates every returned block to the requested project", async () => {
        const response = await listRequest(WORKOS_PROJECT_ID, "all");
        const payload = await response.json();
        expect(payload.every((block: { projectId: string }) => block.projectId === WORKOS_PROJECT_ID)).toBe(true);
        expect(payload.some((block: { id: string }) => block.id === GREEN_FINENESS_BLOCK_ID)).toBe(false);
    });

    it("returns an empty array for an existing project with no blocks", async () => {
        const response = await listRequest(EMPTY_PROJECT_ID);
        expect(response.status).toBe(200);
        expect(await response.json()).toEqual([]);
    });

    it("supports the explicit active filter", async () => {
        const response = await listRequest(WORKOS_PROJECT_ID, "active");
        const payload = await response.json();
        expect(payload.map((block: { status: string }) => block.status)).toEqual(["active"]);
    });

    it("supports the archived filter", async () => {
        const response = await listRequest(WORKOS_PROJECT_ID, "archived");
        const payload = await response.json();
        expect(payload.map((block: { id: string }) => block.id)).toEqual(["archived-workos-block"]);
    });

    it("supports the all filter", async () => {
        const response = await listRequest(WORKOS_PROJECT_ID, "all");
        const payload = await response.json();
        expect(payload).toHaveLength(2);
        expect(new Set(payload.map((block: { status: string }) => block.status))).toEqual(new Set(["active", "archived"]));
    });

    it("rejects an invalid status", async () => {
        const response = await listRequest(WORKOS_PROJECT_ID, "deleted");
        expect(response.status).toBe(400);
        expect(await response.json()).toEqual({ error: "Invalid status" });
    });

    it("returns 404 for an unknown valid project ID", async () => {
        const response = await listRequest("UnknownProject0000001");
        expect(response.status).toBe(404);
        expect(await response.json()).toEqual({ error: "Project not found" });
    });

    it("rejects a SQL injection-like project ID without executing it", async () => {
        const response = await listRequest("project' OR 1=1 --");
        expect(response.status).toBe(400);
        expect(await response.json()).toEqual({ error: "Invalid project ID" });
    });

    it("uses the approved Task 1 order with a stable ID tie-breaker", async () => {
        insertBlock({ id: "order-c", projectId: ORDER_PROJECT_ID, legacyProjectSlug: "order-project", orderIndex: 2, blockDate: "2026-08-02", createdAt: "2026-08-03T00:00:00.000Z" });
        insertBlock({ id: "order-b", projectId: ORDER_PROJECT_ID, legacyProjectSlug: "order-project", orderIndex: 1, blockDate: "2026-07-01", createdAt: "2026-08-01T00:00:00.000Z" });
        insertBlock({ id: "order-a", projectId: ORDER_PROJECT_ID, legacyProjectSlug: "order-project", orderIndex: 2, blockDate: "2026-08-02", createdAt: "2026-08-03T00:00:00.000Z" });
        setBaseline();

        const response = await listRequest(ORDER_PROJECT_ID);
        const payload = await response.json();
        expect(payload.map((block: { id: string }) => block.id)).toEqual(["order-b", "order-a", "order-c"]);
    });

    it("returns a safe 500 without exposing database details", async () => {
        mockGetDb.mockImplementation(() => {
            throw new Error("SQLITE_ERROR SELECT secret FROM /private/data/workos.db");
        });
        const response = await listRequest(WORKOS_PROJECT_ID);
        const body = JSON.stringify(await response.json());
        expect(response.status).toBe(500);
        expect(body).toBe('{"error":"Unable to load project documentation blocks"}');
        expect(body).not.toContain("SQLITE");
        expect(body).not.toContain("/private/");
    });
});

describe("Project documentation block item GET", () => {
    it("gets an existing block under its project", async () => {
        const response = await itemRequest(WORKOS_PROJECT_ID, WORKOS_BLOCK_ID);
        const payload = await response.json();
        expect(response.status).toBe(200);
        expect(payload.id).toBe(WORKOS_BLOCK_ID);
        expect(payload.projectId).toBe(WORKOS_PROJECT_ID);
    });

    it("returns 404 for an existing block requested under the wrong project", async () => {
        const response = await itemRequest(GREEN_FINENESS_PROJECT_ID, WORKOS_BLOCK_ID);
        expect(response.status).toBe(404);
    });

    it("returns 404 for an unknown block", async () => {
        const response = await itemRequest(WORKOS_PROJECT_ID, "unknown-block-id");
        expect(response.status).toBe(404);
    });

    it("preserves Thai Unicode", async () => {
        const response = await itemRequest(WORKOS_PROJECT_ID, WORKOS_BLOCK_ID);
        const payload = await response.json();
        expect(payload.title).toBe("ทบทวนระบบ WorkOS");
        expect(payload.sourceText).toBe("ต้นฉบับภาษาไทย");
    });

    it("preserves Markdown details and whitespace exactly", async () => {
        const response = await itemRequest(WORKOS_PROJECT_ID, WORKOS_BLOCK_ID);
        expect((await response.json()).details).toBe(ORIGINAL_DETAILS);
    });

    it("maps JSON arrays to arrays", async () => {
        const response = await itemRequest(WORKOS_PROJECT_ID, WORKOS_BLOCK_ID);
        const payload = await response.json();
        expect(payload.evidenceLinks).toEqual(["https://example.com/evidence", "commit-abc"]);
        expect(payload.relatedFiles).toEqual(["src/lib/example.ts"]);
    });

    it("maps the SQLite reviewed flag to a boolean", async () => {
        const response = await itemRequest(WORKOS_PROJECT_ID, WORKOS_BLOCK_ID);
        const payload = await response.json();
        expect(payload.reviewedByUser).toBe(true);
        expect(typeof payload.reviewedByUser).toBe("boolean");
    });

    it("maps import metadata to camelCase fields", async () => {
        const response = await itemRequest(WORKOS_PROJECT_ID, WORKOS_BLOCK_ID);
        const payload = await response.json();
        expect(payload).toMatchObject({
            legacyProjectSlug: "workos-lite-arbordesk",
            importSource: "localstorage_recovery",
            importBatchId: "localstorage-recovery-2026-08-01-project-doc-blocks",
            migratedAt: "2026-08-01T22:00:00.000Z",
            sourceRowNumber: 1,
            sourceRecordId: WORKOS_BLOCK_ID
        });
    });

    it("preserves original timestamps", async () => {
        const response = await itemRequest(WORKOS_PROJECT_ID, WORKOS_BLOCK_ID);
        const payload = await response.json();
        expect(payload.createdAt).toBe("2026-07-31T06:14:57.046Z");
        expect(payload.updatedAt).toBe("2026-07-31T06:14:57.046Z");
    });

    it("performs no database writes", async () => {
        const before = rows();
        await itemRequest(WORKOS_PROJECT_ID, WORKOS_BLOCK_ID);
        await listRequest(WORKOS_PROJECT_ID, "all");
        expect(rows()).toEqual(before);
    });

    it("rejects an invalid project ID", async () => {
        const response = await itemRequest("bad project id", WORKOS_BLOCK_ID);
        expect(response.status).toBe(400);
        expect(await response.json()).toEqual({ error: "Invalid project ID" });
    });

    it("rejects a SQL injection-like block ID without executing it", async () => {
        const response = await itemRequest(WORKOS_PROJECT_ID, "block' OR 1=1 --");
        expect(response.status).toBe(400);
        expect(await response.json()).toEqual({ error: "Invalid block ID" });
    });

    it("returns 404 when the parent project does not exist", async () => {
        const response = await itemRequest("UnknownProject0000001", WORKOS_BLOCK_ID);
        expect(response.status).toBe(404);
        expect(await response.json()).toEqual({ error: "Project not found" });
    });

    it("returns a safe 500 without exposing database details", async () => {
        mockGetDb.mockImplementation(() => {
            throw new Error("SQLITE_CORRUPT at /Users/private/workos.db");
        });
        const response = await itemRequest(WORKOS_PROJECT_ID, WORKOS_BLOCK_ID);
        const body = JSON.stringify(await response.json());
        expect(response.status).toBe(500);
        expect(body).toBe('{"error":"Unable to load project documentation block"}');
        expect(body).not.toContain("SQLITE");
        expect(body).not.toContain("/Users/");
    });
});

describe("Project identifier resolver (slug support)", () => {
    it("GET collection by slug returns 200 with correct blocks", async () => {
        const response = await listRequest("workos-lite-arbordesk");
        const payload = await response.json();
        expect(response.status).toBe(200);
        expect(payload.map((block: { id: string }) => block.id)).toEqual([WORKOS_BLOCK_ID]);
    });

    it("GET collection by ID and slug return the same records", async () => {
        const byId = await listRequest(WORKOS_PROJECT_ID, "all");
        const bySlug = await listRequest("workos-lite-arbordesk", "all");
        expect(byId.status).toBe(200);
        expect(bySlug.status).toBe(200);
        const payloadId = await byId.json();
        const payloadSlug = await bySlug.json();
        expect(payloadId).toEqual(payloadSlug);
    });

    it("GET item by slug returns 200 with correct block", async () => {
        const response = await itemRequest("workos-lite-arbordesk", WORKOS_BLOCK_ID);
        const payload = await response.json();
        expect(response.status).toBe(200);
        expect(payload.id).toBe(WORKOS_BLOCK_ID);
        expect(payload.projectId).toBe(WORKOS_PROJECT_ID);
    });

    it("returns 404 for unknown slug", async () => {
        const response = await listRequest("unknown-project-slug");
        expect(response.status).toBe(404);
        expect(await response.json()).toEqual({ error: "Project not found" });
    });

    it("returns 404 for item with unknown slug", async () => {
        const response = await itemRequest("unknown-project-slug", WORKOS_BLOCK_ID);
        expect(response.status).toBe(404);
        expect(await response.json()).toEqual({ error: "Project not found" });
    });

    it("performs no database writes when resolving by slug", async () => {
        const before = rows();
        await listRequest("workos-lite-arbordesk");
        await itemRequest("workos-lite-arbordesk", WORKOS_BLOCK_ID);
        expect(rows()).toEqual(before);
    });
});
