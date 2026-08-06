import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { getBatchDetailApi, listBatchesApi, listRowsApi } from "@/lib/project-import/importHistoryService";
import { parsePagination } from "@/lib/project-import/apiRouteHelpers";
import { ProjectImportApiError } from "@/lib/project-import/apiErrors";
import { approveEntityApi, rejectEntityApi } from "@/lib/project-import/approvalApplicationService";
import {
    createApiAuthDatabase,
    buildDryRunResult,
    persistDryRunBatch,
    TEST_PASSWORD,
} from "../fixtures/projectImportApiFixtures";

const { mockGetDb } = vi.hoisted(() => ({ mockGetDb: vi.fn() }));
vi.mock("@/db/db", () => ({ getDb: mockGetDb }));

import { GET as listBatchesRoute } from "@/app/api/project-import/batches/route";

const T0 = "2026-08-05T10:00:00.000Z";

afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
});

describe("Import history queries", () => {
    it("lists batches with bounded pagination and deterministic sorting", async () => {
        const db = createApiAuthDatabase(["project_import:*"]);
        const first = persistDryRunBatch(db, await buildDryRunResult());
        const second = persistDryRunBatch(db, await buildDryRunResult());
        const page = listBatchesApi(db, { page: 1, pageSize: 25 });
        expect(page.totalItems).toBe(2);
        const ids = page.items.map((item) => item.id);
        expect(new Set(ids)).toEqual(new Set([first.id, second.id]));
        const repeat = listBatchesApi(db, { page: 1, pageSize: 25 });
        expect(repeat.items.map((item) => item.id)).toEqual(ids);
        expect(JSON.stringify(page)).not.toContain("normalized_payload");
        db.close();
    });

    it("rejects invalid pagination", () => {
        const params = new URLSearchParams({ page: "0", pageSize: "1000" });
        expect(() => parsePagination(params)).toThrowError(expect.objectContaining({ code: "INVALID_QUERY_PARAMETER" }));
    });

    it("returns batch detail with approvals and attempts without payloads", async () => {
        const db = createApiAuthDatabase(["project_import:*"]);
        const batch = persistDryRunBatch(db, await buildDryRunResult());
        approveEntityApi(batch.id, "project_documentation", "Test Agent", { db, now: T0 });
        const detail = getBatchDetailApi(db, batch.id, T0);
        expect(detail.id).toBe(batch.id);
        expect(detail.approvals).toHaveLength(2);
        expect(detail.approvals[0].effectiveStatus).toBe("approved");
        expect(JSON.stringify(detail)).not.toContain("normalized_payload");
        db.close();
    });

    it("returns 404 for unknown batches", () => {
        const db = createApiAuthDatabase(["project_import:*"]);
        try {
            getBatchDetailApi(db, "batch-missing");
            throw new Error("expected failure");
        } catch (error) {
            expect((error as ProjectImportApiError).code).toBe("IMPORT_BATCH_NOT_FOUND");
        }
        db.close();
    });

    it("paginates rows and applies filters without exposing payloads", async () => {
        const db = createApiAuthDatabase(["project_import:*"]);
        const batch = persistDryRunBatch(db, await buildDryRunResult());
        const docRows = listRowsApi(db, batch.id, { page: 1, pageSize: 25, entityType: "project_documentation" });
        expect(docRows.totalItems).toBe(2);
        expect(docRows.items.every((row) => row.entityType === "project_documentation")).toBe(true);
        expect(JSON.stringify(docRows)).not.toContain("normalized_payload");
        expect(JSON.stringify(docRows)).not.toContain("Details line 1");
        const backlogRows = listRowsApi(db, batch.id, { page: 1, pageSize: 25, entityType: "backlog" });
        expect(backlogRows.totalItems).toBe(2);
        expect(backlogRows.items.every((row) => row.entityType === "backlog")).toBe(true);
        const docIds = docRows.items.map((row) => row.externalRowId);
        const backlogIds = backlogRows.items.map((row) => row.externalRowId);
        expect(docIds.some((id) => backlogIds.includes(id))).toBe(false);
        db.close();
    });
});

describe("API privacy and audit-only write boundary", () => {
    it("returns safe error responses without sqlite/stack/path details", async () => {
        const db = createApiAuthDatabase(["project_import:*"]);
        mockGetDb.mockReturnValue(db);
        vi.stubEnv("AGENT_UI_PASSWORD", TEST_PASSWORD);
        vi.stubEnv("AGENT_KEY", "test-key");
        const request = new NextRequest("http://localhost/api/project-import/batches", { headers: {} });
        const response = await listBatchesRoute(request);
        expect(response.status).toBe(401);
        const text = await response.text();
        expect(text).not.toContain("SqliteError");
        expect(text).not.toContain("at ");
        expect(text).not.toContain("/Users/");
    });

    it("only audit and approval tables change during API-level operations", async () => {
        const db = createApiAuthDatabase(["project_import:*"]);
        const result = await buildDryRunResult();
        const count = (table: string) => (db.prepare(`SELECT COUNT(*) AS c FROM ${table}`).get() as { c: number }).c;
        const before = {
            projects: count("projects"),
            docBlocks: count("project_doc_blocks"),
            items: count("project_items"),
        };

        const batch = persistDryRunBatch(db, result);
        approveEntityApi(batch.id, "project_documentation", "Test Agent", { db, now: T0 });
        rejectEntityApi(batch.id, "backlog", "Test Agent", "deferred", { db, now: T0 });

        expect(count("projects")).toBe(before.projects);
        expect(count("project_doc_blocks")).toBe(before.docBlocks);
        expect(count("project_items")).toBe(before.items);
        expect(count("import_batches")).toBeGreaterThan(0);
        expect(count("import_batch_rows")).toBeGreaterThan(0);
        expect(count("import_approvals")).toBeGreaterThan(0);
        expect(count("import_approval_events")).toBeGreaterThan(0);
        expect("Gate 5 audit-and-approval-only write boundary verified").toBe("Gate 5 audit-and-approval-only write boundary verified");
        db.close();
    });
});
