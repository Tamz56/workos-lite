import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { authenticateAndAuthorize } from "@/lib/project-import/authorization";
import { ProjectImportApiError } from "@/lib/project-import/apiErrors";
import {
    createApiAuthDatabase,
    persistDryRunBatch,
    sha256,
    TEST_KEY,
    TEST_PASSWORD,
} from "../fixtures/projectImportApiFixtures";
import { createDryRunTestDatabase, seedProject } from "../fixtures/dryRunTestDb";
import { validWorkbook, workbookWithSchemaVersion } from "../fixtures/projectFieldSheetFixtures";

const { mockGetDb } = vi.hoisted(() => ({ mockGetDb: vi.fn() }));
vi.mock("@/db/db", () => ({ getDb: mockGetDb }));

const { mockOpenReadOnly } = vi.hoisted(() => ({ mockOpenReadOnly: vi.fn() }));
vi.mock("@/lib/project-import/readOnlyAdapter", async () => {
    const actual = await import("@/lib/project-import/readOnlyAdapter");
    return { ...actual, openReadOnlyWorkosDatabase: mockOpenReadOnly };
});

import { POST as createDryRun } from "@/app/api/project-import/dry-runs/route";
import { POST as approveRoute } from "@/app/api/project-import/batches/[batchId]/approvals/[entityType]/approve/route";

afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
});

function authRequest(path: string, password?: string): NextRequest {
    const headers: Record<string, string> = password ? { "x-agent-password": password } : {};
    return new NextRequest(`http://localhost${path}`, { headers });
}

function uploadRequest(buffer: Buffer, filename: string, password = TEST_PASSWORD, files = 1): NextRequest {
    const form = new FormData();
    for (let i = 0; i < files; i++) {
        form.append("file", new File([buffer], i > 0 ? `extra-${filename}` : filename));
    }
    return new NextRequest("http://localhost/api/project-import/dry-runs", {
        method: "POST",
        headers: { "x-agent-password": password },
        body: form,
    });
}

describe("Authorization boundary", () => {
    it("rejects anonymous and wrong-password requests", () => {
        const db = createApiAuthDatabase(["*"]);
        expect(() => authenticateAndAuthorize(authRequest("/x"), "project_import:read", { uiPassword: TEST_PASSWORD, serverKey: TEST_KEY, db }))
            .toThrowError(expect.objectContaining({ code: "AUTHENTICATION_REQUIRED", status: 401 }));
        expect(() => authenticateAndAuthorize(authRequest("/x", "wrong"), "project_import:read", { uiPassword: TEST_PASSWORD, serverKey: TEST_KEY, db }))
            .toThrowError(expect.objectContaining({ code: "AUTHENTICATION_REQUIRED", status: 401 }));
    });

    it("grants capability scopes and rejects missing ones", () => {
        const readOnly = createApiAuthDatabase(["project_import:read"]);
        const actor = authenticateAndAuthorize(authRequest("/x", TEST_PASSWORD), "project_import:read", {
            uiPassword: TEST_PASSWORD,
            serverKey: TEST_KEY,
            db: readOnly,
        });
        expect(actor.actorName).toBe("Test Agent");
        expect(() => authenticateAndAuthorize(authRequest("/x", TEST_PASSWORD), "project_import:approve", {
            uiPassword: TEST_PASSWORD,
            serverKey: TEST_KEY,
            db: readOnly,
        })).toThrowError(expect.objectContaining({ code: "IMPORT_APPROVAL_FORBIDDEN", status: 403 }));
    });

    it("rejects disabled agent keys", () => {
        const db = createApiAuthDatabase(["*"]);
        db.prepare("UPDATE agent_keys SET is_enabled = 0 WHERE id = 'agent-test'").run();
        expect(() => authenticateAndAuthorize(authRequest("/x", TEST_PASSWORD), "project_import:read", {
            uiPassword: TEST_PASSWORD,
            serverKey: TEST_KEY,
            db,
        })).toThrowError(expect.objectContaining({ code: "IMPORT_READ_FORBIDDEN", status: 403 }));
    });
});

describe("Dry-run upload API", () => {
    it("accepts a valid xlsx upload, persists the batch, and returns a safe response", async () => {
        const writeDb = createApiAuthDatabase(["project_import:*"]);
        mockGetDb.mockReturnValue(writeDb);
        const readDb = createDryRunTestDatabase();
        seedProject(readDb, "p-example", "example-project-slug", "Example");
        mockOpenReadOnly.mockReturnValue(readDb);
        vi.stubEnv("AGENT_UI_PASSWORD", TEST_PASSWORD);
        vi.stubEnv("AGENT_KEY", TEST_KEY);

        const response = await createDryRun(uploadRequest(await validWorkbook(), "fixture.xlsx"));
        expect(mockOpenReadOnly.mock.calls.length, "readonly opener should be called").toBeGreaterThan(0);
        expect(mockOpenReadOnly.mock.results[0]?.value === readDb, "mock should return the seeded read db").toBe(true);
        expect(response.status).toBe(200);
        const body = await response.json();
        expect(body.batchId).toMatch(/^batch-/);
        expect(body.source.fileHashExcerpt).toHaveLength(12);
        expect(body.workbookStatus, JSON.stringify(body.issues)).toBe("valid");
        expect(body.noBusinessWritePerformed).toBe(true);
        expect(JSON.stringify(body)).not.toContain("Details line 1");

        const batchCount = (writeDb.prepare("SELECT COUNT(*) AS c FROM import_batches").get() as { c: number }).c;
        expect(batchCount).toBe(1);
        expect((writeDb.prepare("SELECT COUNT(*) AS c FROM projects").get() as { c: number }).c).toBe(0);
    });

    it("rejects missing and multiple files", async () => {
        const writeDb = createApiAuthDatabase(["project_import:*"]);
        mockGetDb.mockReturnValue(writeDb);
        mockOpenReadOnly.mockReturnValue(createDryRunTestDatabase());
        vi.stubEnv("AGENT_UI_PASSWORD", TEST_PASSWORD);
        vi.stubEnv("AGENT_KEY", TEST_KEY);

        const emptyForm = new NextRequest("http://localhost/api/project-import/dry-runs", {
            method: "POST",
            headers: { "x-agent-password": TEST_PASSWORD },
            body: new FormData(),
        });
        const missing = await createDryRun(emptyForm);
        expect(missing.status).toBe(400);
        expect((await missing.json()).error.code).toBe("MISSING_UPLOAD_FILE");

        const multiple = await createDryRun(uploadRequest(await validWorkbook(), "fixture.xlsx", TEST_PASSWORD, 2));
        expect(multiple.status).toBe(400);
        expect((await multiple.json()).error.code).toBe("MULTIPLE_UPLOAD_FILES");
    });

    it("rejects non-xlsx files and oversized files before parsing", async () => {
        const writeDb = createApiAuthDatabase(["project_import:*"]);
        mockGetDb.mockReturnValue(writeDb);
        mockOpenReadOnly.mockReturnValue(createDryRunTestDatabase());
        vi.stubEnv("AGENT_UI_PASSWORD", TEST_PASSWORD);
        vi.stubEnv("AGENT_KEY", TEST_KEY);

        const badExt = await createDryRun(uploadRequest(Buffer.from("not a workbook"), "file.txt"));
        expect(badExt.status).toBe(400);
        expect((await badExt.json()).error.code).toBe("UNSUPPORTED_FILE_TYPE");

        const oversized = Buffer.alloc(25 * 1024 * 1024 + 1);
        const big = await createDryRun(uploadRequest(oversized, "big.xlsx"));
        expect(big.status).toBe(400);
        expect((await big.json()).error.code).toBe("FILE_TOO_LARGE");
    });

    it("returns a safe error for unreadable workbooks without persisting a batch", async () => {
        const writeDb = createApiAuthDatabase(["project_import:*"]);
        mockGetDb.mockReturnValue(writeDb);
        mockOpenReadOnly.mockReturnValue(createDryRunTestDatabase());
        vi.stubEnv("AGENT_UI_PASSWORD", TEST_PASSWORD);
        vi.stubEnv("AGENT_KEY", TEST_KEY);

        const response = await createDryRun(uploadRequest(Buffer.from("garbage bytes not zip"), "broken.xlsx"));
        expect(response.status).toBe(400);
        const body = await response.json();
        expect(body.error.code).toBe("WORKBOOK_PARSE_FAILED");
        expect((writeDb.prepare("SELECT COUNT(*) AS c FROM import_batches").get() as { c: number }).c).toBe(0);
    });

    it("persists an invalid but safely parsed workbook as a batch", async () => {
        const writeDb = createApiAuthDatabase(["project_import:*"]);
        mockGetDb.mockReturnValue(writeDb);
        const readDb = createDryRunTestDatabase();
        seedProject(readDb, "p-example", "example-project-slug", "Example");
        mockOpenReadOnly.mockReturnValue(readDb);
        vi.stubEnv("AGENT_UI_PASSWORD", TEST_PASSWORD);
        vi.stubEnv("AGENT_KEY", TEST_KEY);

        const response = await createDryRun(uploadRequest(await workbookWithSchemaVersion("workos-field-sheet-v2"), "fixture.xlsx"));
        expect(response.status, await response.clone().text()).toBe(200);
        const body = await response.json();
        expect(body.workbookStatus).toBe("invalid");
        expect((writeDb.prepare("SELECT COUNT(*) AS c FROM import_batches").get() as { c: number }).c).toBe(1);
    });
});

describe("Approval actor identity", () => {
    it("derives the actor from server auth and ignores client spoofing", async () => {
        const writeDb = createApiAuthDatabase(["project_import:*"]);
        mockGetDb.mockReturnValue(writeDb);
        const readDb = createDryRunTestDatabase();
        seedProject(readDb, "p-example", "example-project-slug", "Example");
        vi.stubEnv("AGENT_UI_PASSWORD", TEST_PASSWORD);
        vi.stubEnv("AGENT_KEY", TEST_KEY);

        const result = await (async () => {
            const { runWorkOSProjectFieldDryRun } = await import("@/lib/project-import/dryRunAssembler");
            return runWorkOSProjectFieldDryRun({ workbook: await validWorkbook() }, { db: readDb });
        })();
        const persisted = persistDryRunBatch(writeDb, result);

        const approveReq = new NextRequest(`http://localhost/api/project-import/batches/${persisted.id}/approvals/project_documentation/approve`, {
            method: "POST",
            headers: { "x-agent-password": TEST_PASSWORD, "Content-Type": "application/json" },
            body: JSON.stringify({ approvedBy: "hacker" }),
        });
        const response = await approveRoute(approveReq, { params: Promise.resolve({ batchId: persisted.id, entityType: "project_documentation" }) });
        expect(response.status).toBe(200);
        const approval = writeDb.prepare("SELECT approved_by FROM import_approvals").get() as { approved_by: string };
        expect(approval.approved_by).toBe("Test Agent");
        expect(sha256(TEST_KEY)).toBeTruthy();
    });
});

describe("ProjectImportApiError safety", () => {
    it("maps to a safe response without stack or sqlite details", () => {
        const error = new ProjectImportApiError("IMPORT_BATCH_NOT_FOUND", "Batch not found", 404);
        const body = { ok: false as const, error: { code: error.code, message: error.message, status: error.status } };
        expect(JSON.stringify(body)).not.toContain("stack");
        expect(JSON.stringify(body)).not.toContain("SqliteError");
    });
});
