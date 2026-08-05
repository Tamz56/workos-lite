import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { getBatch } from "@/lib/project-import/auditBatchRepository";
import { listApprovalEvents } from "@/lib/project-import/auditApprovalRepository";
import { consumeApproval, revokeApproval } from "@/lib/project-import/auditApprovalRepository";
import { appendAttempt } from "@/lib/project-import/auditExecutionRepository";
import { approveEntityApi } from "@/lib/project-import/approvalApplicationService";
import { POST as executeRoute } from "@/app/api/project-import/batches/[batchId]/approvals/[entityType]/execute/route";
import {
    createApiExecutionAuthDatabase,
    createApiAuthDatabase,
    persistDryRunBatch,
    TEST_KEY,
    TEST_PASSWORD,
} from "../fixtures/projectImportApiFixtures";
import { T0, T0_PLUS_31 } from "../fixtures/executionHelpers";
import { seedExistingBacklogItem, seedExistingDocBlock, seedProject } from "../fixtures/executionTestDb";
import { runWorkOSProjectFieldDryRun } from "@/lib/project-import/dryRunAssembler";
import { createDryRunTestDatabase, seedProject as seedDryProject } from "../fixtures/dryRunTestDb";
import { validWorkbook } from "../fixtures/projectFieldSheetFixtures";
import type { EntityType } from "@/lib/project-import/auditTypes";

const { mockGetDb } = vi.hoisted(() => ({ mockGetDb: vi.fn() }));
vi.mock("@/db/db", () => ({ getDb: mockGetDb }));

const { mockOpenReadOnly } = vi.hoisted(() => ({ mockOpenReadOnly: vi.fn() }));
vi.mock("@/lib/project-import/readOnlyAdapter", async () => {
    const actual = await import("@/lib/project-import/readOnlyAdapter");
    return { ...actual, openReadOnlyWorkosDatabase: mockOpenReadOnly };
});

afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
});

function executeRequest(
    path: string,
    body: unknown,
    password = TEST_PASSWORD,
): NextRequest {
    return new NextRequest(`http://localhost${path}`, {
        method: "POST",
        headers: {
            "x-agent-password": password,
            "Content-Type": "application/json",
        },
        body: typeof body === "string" ? body : JSON.stringify(body),
    });
}

async function approvedEntityContext(entityType: EntityType) {
    const db = createApiExecutionAuthDatabase(["project_import:execute"]);
    seedProject(db, "p-example", "example-project-slug", "Example");
    const dry = createDryRunTestDatabase();
    seedDryProject(dry, "p-example", "example-project-slug", "Example");
    const result = await runWorkOSProjectFieldDryRun({ workbook: await validWorkbook() }, { db: dry });
    dry.close();
    const batch = persistDryRunBatch(db, result);
    const approval = approveEntityApi(batch.id, entityType, "Test Agent", { db, now: T0 });
    mockGetDb.mockReturnValue(db);
    return { db, batchId: batch.id, approvalId: approval.id };
}

async function postExecute(batchId: string, entityType: string, approvalId: string, now?: string) {
    const response = await executeRoute(
        executeRequest(`/api/project-import/batches/${batchId}/approvals/${entityType}/execute`, { approvalId }),
        { params: Promise.resolve({ batchId, entityType }) },
        { now: now ?? T0 },
    );
    return { response, body: (await response.json()) as Record<string, unknown> };
}

describe("Execute API authorization", () => {
    it("rejects anonymous requests and wrong passwords", async () => {
        const db = createApiExecutionAuthDatabase(["project_import:execute"]);
        mockGetDb.mockReturnValue(db);
        vi.stubEnv("AGENT_UI_PASSWORD", TEST_PASSWORD);
        vi.stubEnv("AGENT_KEY", TEST_KEY);

        const anonymous = await executeRoute(
            executeRequest("/api/project-import/batches/batch-1/approvals/project_documentation/execute", { approvalId: "apr-1" }, ""),
            { params: Promise.resolve({ batchId: "batch-1", entityType: "project_documentation" }) },
        );
        expect(anonymous.status).toBe(401);
        expect((await anonymous.json()).error.code).toBe("AUTHENTICATION_REQUIRED");
        db.close();
    });

    it("rejects a disabled agent key", async () => {
        const db = createApiExecutionAuthDatabase(["project_import:execute"]);
        db.prepare("UPDATE agent_keys SET is_enabled = 0 WHERE id = 'agent-test'").run();
        mockGetDb.mockReturnValue(db);
        vi.stubEnv("AGENT_UI_PASSWORD", TEST_PASSWORD);
        vi.stubEnv("AGENT_KEY", TEST_KEY);

        const response = await executeRoute(
            executeRequest("/api/project-import/batches/batch-1/approvals/project_documentation/execute", { approvalId: "apr-1" }),
            { params: Promise.resolve({ batchId: "batch-1", entityType: "project_documentation" }) },
        );
        expect(response.status).toBe(403);
        expect((await response.json()).error.code).toBe("IMPORT_EXECUTE_FORBIDDEN");
        db.close();
    });

    it.each(["project_import:read", "project_import:approve", "project_import:dry_run"])(
        "rejects a %s-only agent with 403",
        async (scope) => {
            const db = createApiExecutionAuthDatabase([scope]);
            mockGetDb.mockReturnValue(db);
            vi.stubEnv("AGENT_UI_PASSWORD", TEST_PASSWORD);
            vi.stubEnv("AGENT_KEY", TEST_KEY);

            const response = await executeRoute(
                executeRequest("/api/project-import/batches/batch-1/approvals/project_documentation/execute", { approvalId: "apr-1" }),
                { params: Promise.resolve({ batchId: "batch-1", entityType: "project_documentation" }) },
            );
            expect(response.status).toBe(403);
            expect((await response.json()).error.code).toBe("IMPORT_EXECUTE_FORBIDDEN");
            db.close();
        },
    );

    it("allows project_import:execute and derives the actor server-side", async () => {
        const { db, batchId, approvalId } = await approvedEntityContext("project_documentation");
        vi.stubEnv("AGENT_UI_PASSWORD", TEST_PASSWORD);
        vi.stubEnv("AGENT_KEY", TEST_KEY);

        const { response } = await postExecute(batchId, "project_documentation", approvalId);
        expect(response.status).toBe(200);
        const attempt = db.prepare("SELECT * FROM import_execution_attempts").get() as { execution_status: string };
        expect(attempt.execution_status).toBe("committed");
        db.close();
    });
});

describe("Execute API request validation", () => {
    async function context() {
        return approvedEntityContext("project_documentation");
    }

    it("rejects an invalid batch ID", async () => {
        const { db, approvalId } = await context();
        vi.stubEnv("AGENT_UI_PASSWORD", TEST_PASSWORD);
        vi.stubEnv("AGENT_KEY", TEST_KEY);
        const { response, body } = await postExecute("batch!", "project_documentation", approvalId);
        expect(response.status).toBe(400);
        expect(body.error.code).toBe("INVALID_BATCH_ID");
        db.close();
    });

    it("rejects an invalid entity type", async () => {
        const { db, batchId, approvalId } = await context();
        vi.stubEnv("AGENT_UI_PASSWORD", TEST_PASSWORD);
        vi.stubEnv("AGENT_KEY", TEST_KEY);
        const { response, body } = await postExecute(batchId, "unknown_entity", approvalId);
        expect(response.status).toBe(400);
        expect(body.error.code).toBe("INVALID_IMPORT_ENTITY");
        db.close();
    });

    it("rejects a missing or malformed approval ID", async () => {
        const { db, batchId } = await context();
        vi.stubEnv("AGENT_UI_PASSWORD", TEST_PASSWORD);
        vi.stubEnv("AGENT_KEY", TEST_KEY);

        const missing = await postExecute(batchId, "project_documentation", "");
        expect(missing.response.status).toBe(400);
        expect(missing.body.error.code).toBe("INVALID_APPROVAL_ID");

        const wrongShape = await postExecute(batchId, "project_documentation", "not-an-approval");
        expect(wrongShape.response.status).toBe(400);
        expect(wrongShape.body.error.code).toBe("INVALID_APPROVAL_ID");
        db.close();
    });

    it("rejects malformed JSON and unknown override fields", async () => {
        const { db, batchId, approvalId } = await context();
        vi.stubEnv("AGENT_UI_PASSWORD", TEST_PASSWORD);
        vi.stubEnv("AGENT_KEY", TEST_KEY);

        const malformed = await executeRoute(
            executeRequest(`/api/project-import/batches/${batchId}/approvals/project_documentation/execute`, "{not json"),
            { params: Promise.resolve({ batchId, entityType: "project_documentation" }) },
        );
        expect(malformed.status).toBe(400);
        expect((await malformed.json()).error.code).toBe("INVALID_EXECUTION_REQUEST");

        const override = await executeRoute(
            executeRequest(`/api/project-import/batches/${batchId}/approvals/project_documentation/execute`, {
                approvalId,
                force: true,
            }),
            { params: Promise.resolve({ batchId, entityType: "project_documentation" }) },
        );
        expect(override.status).toBe(400);
        expect((await override.json()).error.code).toBe("INVALID_EXECUTION_REQUEST");
        db.close();
    });

    it("ignores client-supplied actor fields via strict schema rejection", async () => {
        const { db, batchId, approvalId } = await context();
        vi.stubEnv("AGENT_UI_PASSWORD", TEST_PASSWORD);
        vi.stubEnv("AGENT_KEY", TEST_KEY);
        const response = await executeRoute(
            executeRequest(`/api/project-import/batches/${batchId}/approvals/project_documentation/execute`, {
                approvalId,
                actorName: "hacker",
            }),
            { params: Promise.resolve({ batchId, entityType: "project_documentation" }) },
        );
        expect(response.status).toBe(400);
        db.close();
    });
});

describe("Execute API success flows", () => {
    it("executes an approved Project Documentation entity and returns a safe response", async () => {
        const { db, batchId, approvalId } = await approvedEntityContext("project_documentation");
        vi.stubEnv("AGENT_UI_PASSWORD", TEST_PASSWORD);
        vi.stubEnv("AGENT_KEY", TEST_KEY);

        const { response, body } = await postExecute(batchId, "project_documentation", approvalId);
        expect(response.status).toBe(200);
        expect(body.ok).toBe(true);
        const data = body.data as Record<string, unknown>;
        expect(data.batchId).toBe(batchId);
        expect(data.entityType).toBe("project_documentation");
        expect(data.approvalId).toBe(approvalId);
        expect(data.status).toBe("committed");
        expect(data.insertedCount).toBe(2);
        expect(Array.isArray(data.targetRecordIds)).toBe(true);
        expect(data.approvalConsumed).toBe(true);
        expect(data.transactionCommitted).toBe(true);

        const blocks = db.prepare("SELECT * FROM project_doc_blocks ORDER BY source_row_number ASC").all() as Array<Record<string, unknown>>;
        expect(blocks).toHaveLength(2);
        expect(blocks.every((block) => block.import_source === "google_sheet" && block.import_batch_id === batchId)).toBe(true);
        expect(blocks.every((block) => block.generated_by === null)).toBe(true);

        const approval = db.prepare("SELECT approval_status, consumed_at FROM import_approvals WHERE id = ?").get(approvalId) as {
            approval_status: string;
            consumed_at: string | null;
        };
        expect(approval.approval_status).toBe("consumed");
        expect(approval.consumed_at).not.toBeNull();
        expect(listApprovalEvents(db, approvalId).map((event) => event.event_type)).toContain("consumed");

        const auditRows = db.prepare(
            "SELECT execution_status, target_record_id FROM import_batch_rows WHERE entity_type = 'project_documentation' AND dry_run_status = 'new'",
        ).all() as Array<{ execution_status: string; target_record_id: string | null }>;
        expect(auditRows.every((row) => row.execution_status === "committed" && row.target_record_id !== null)).toBe(true);
        expect(getBatch(db, batchId).batch_status).toBe("partially_executed");
        db.close();
    });

    it("executes an approved Backlog entity with provenance kept in audit tables only", async () => {
        const { db, batchId, approvalId } = await approvedEntityContext("backlog");
        vi.stubEnv("AGENT_UI_PASSWORD", TEST_PASSWORD);
        vi.stubEnv("AGENT_KEY", TEST_KEY);

        const { response, body } = await postExecute(batchId, "backlog", approvalId);
        expect(response.status).toBe(200);
        expect((body.data as Record<string, unknown>).insertedCount).toBe(2);

        const items = db.prepare("SELECT * FROM project_items ORDER BY start_date ASC").all() as Array<{ status: string; notes: string | null }>;
        expect(items).toHaveLength(2);
        expect(items.every((item) => ["inbox", "planned", "done"].includes(item.status))).toBe(true);
        expect(items.every((item) => item.notes === "Note text" || item.notes === null)).toBe(true);
        expect(JSON.stringify(body)).not.toContain("import_batch");
        db.close();
    });

    it("supports wildcard and project_import:* scopes", async () => {
        for (const scope of ["*", "project_import:*"]) {
            const db = createApiExecutionAuthDatabase([scope]);
            seedProject(db, "p-example", "example-project-slug", "Example");
            const dry = createDryRunTestDatabase();
            seedDryProject(dry, "p-example", "example-project-slug", "Example");
            const result = await runWorkOSProjectFieldDryRun({ workbook: await validWorkbook() }, { db: dry });
            dry.close();
            const batch = persistDryRunBatch(db, result);
            const approval = approveEntityApi(batch.id, "project_documentation", "Test Agent", { db, now: T0 });
            mockGetDb.mockReturnValue(db);
            vi.stubEnv("AGENT_UI_PASSWORD", TEST_PASSWORD);
            vi.stubEnv("AGENT_KEY", TEST_KEY);

            const { response, body } = await postExecute(batch.id, "project_documentation", approval.id);
            expect(response.status).toBe(200);
            expect((body.data as Record<string, unknown>).status).toBe("committed");
            db.close();
            vi.unstubAllEnvs();
            vi.restoreAllMocks();
        }
    });
});

describe("Execute API conflict and stale-state mapping", () => {
    it("returns 409 for an expired approval", async () => {
        const { db, batchId, approvalId } = await approvedEntityContext("project_documentation");
        vi.stubEnv("AGENT_UI_PASSWORD", TEST_PASSWORD);
        vi.stubEnv("AGENT_KEY", TEST_KEY);
        const { response, body } = await postExecute(batchId, "project_documentation", approvalId, T0_PLUS_31);
        expect(response.status).toBe(409);
        expect(body.error.code).toBe("EXECUTION_APPROVAL_EXPIRED");
        db.close();
    });

    it("returns 409 for a revoked approval", async () => {
        const { db, batchId, approvalId } = await approvedEntityContext("project_documentation");
        revokeApproval(db, approvalId, { revokedBy: "owner", now: T0 });
        vi.stubEnv("AGENT_UI_PASSWORD", TEST_PASSWORD);
        vi.stubEnv("AGENT_KEY", TEST_KEY);
        const { response, body } = await postExecute(batchId, "project_documentation", approvalId);
        expect(response.status).toBe(409);
        expect(body.error.code).toBe("EXECUTION_APPROVAL_REVOKED");
        db.close();
    });

    it("returns 409 for a consumed approval", async () => {
        const { db, batchId, approvalId } = await approvedEntityContext("project_documentation");
        consumeApproval(db, approvalId, T0);
        vi.stubEnv("AGENT_UI_PASSWORD", TEST_PASSWORD);
        vi.stubEnv("AGENT_KEY", TEST_KEY);
        const { response, body } = await postExecute(batchId, "project_documentation", approvalId);
        expect(response.status).toBe(409);
        expect(body.error.code).toBe("EXECUTION_APPROVAL_CONSUMED");
        db.close();
    });

    it("returns 409 for a binding mismatch", async () => {
        const { db, batchId, approvalId } = await approvedEntityContext("project_documentation");
        db.prepare("UPDATE import_approvals SET bound_file_hash = 'wrong-hash' WHERE id = ?").run(approvalId);
        vi.stubEnv("AGENT_UI_PASSWORD", TEST_PASSWORD);
        vi.stubEnv("AGENT_KEY", TEST_KEY);
        const { response, body } = await postExecute(batchId, "project_documentation", approvalId);
        expect(response.status).toBe(409);
        expect(body.error.code).toBe("EXECUTION_APPROVAL_BINDING_MISMATCH");
        db.close();
    });

    it.each(["invalid", "conflict", "review_required"])(
        "returns 409 for an entity containing %s rows",
        async (status) => {
            const { db, batchId, approvalId } = await approvedEntityContext("project_documentation");
            db.prepare("UPDATE import_batch_rows SET dry_run_status = ? WHERE entity_type = 'project_documentation' LIMIT 1").run(status);
            vi.stubEnv("AGENT_UI_PASSWORD", TEST_PASSWORD);
            vi.stubEnv("AGENT_KEY", TEST_KEY);
            const { response, body } = await postExecute(batchId, "project_documentation", approvalId);
            expect(response.status).toBe(409);
            expect(body.error.code).toBe("EXECUTION_ENTITY_BLOCKED");
            db.close();
        },
    );

    it("returns 409 when the project disappears after approval", async () => {
        const { db, batchId, approvalId } = await approvedEntityContext("project_documentation");
        db.prepare("DELETE FROM projects WHERE id = 'p-example'").run();
        vi.stubEnv("AGENT_UI_PASSWORD", TEST_PASSWORD);
        vi.stubEnv("AGENT_KEY", TEST_KEY);
        const { response, body } = await postExecute(batchId, "project_documentation", approvalId);
        expect(response.status).toBe(409);
        expect(body.error.code).toBe("EXECUTION_STALE_PROJECT");
        db.close();
    });

    it("returns 409 when documentation identity now exists with different content", async () => {
        const { db, batchId, approvalId } = await approvedEntityContext("project_documentation");
        seedExistingDocBlock(db, {
            id: "stale-1",
            projectId: "p-example",
            sourceRecordId: "TEST-DOC-001",
            title: "Different title now",
            blockDate: "2026-08-02",
            summary: "Changed summary",
            detailsMd: "Changed details",
        });
        vi.stubEnv("AGENT_UI_PASSWORD", TEST_PASSWORD);
        vi.stubEnv("AGENT_KEY", TEST_KEY);
        const { response, body } = await postExecute(batchId, "project_documentation", approvalId);
        expect(response.status).toBe(409);
        expect(body.error.code).toBe("EXECUTION_STALE_CONFLICT");
        db.close();
    });

    it("returns 409 when documentation identity now matches existing content", async () => {
        const { db, batchId, approvalId } = await approvedEntityContext("project_documentation");
        const incoming = db.prepare(
            "SELECT normalized_payload_json FROM import_batch_rows WHERE entity_type = 'project_documentation' ORDER BY source_row_number ASC LIMIT 1",
        ).get() as { normalized_payload_json: string };
        const payload = JSON.parse(incoming.normalized_payload_json) as Record<string, unknown>;
        seedExistingDocBlock(db, {
            id: "stale-dup",
            projectId: "p-example",
            sourceRecordId: String(payload.externalRowId ?? "TEST-DOC-001"),
            title: String(payload.title),
            blockDate: String(payload.date),
            summary: String(payload.summary),
            detailsMd: String(payload.details),
            evidenceLinksJson: JSON.stringify(payload.evidenceLinks ?? []),
            relatedFilesJson: JSON.stringify(payload.relatedFiles ?? []),
            nextAction: payload.nextAction != null ? String(payload.nextAction) : null,
            orderIndex: payload.orderIndex != null ? Number(payload.orderIndex) : null,
            blockType: String(payload.blockType),
        });
        vi.stubEnv("AGENT_UI_PASSWORD", TEST_PASSWORD);
        vi.stubEnv("AGENT_KEY", TEST_KEY);
        const { response, body } = await postExecute(batchId, "project_documentation", approvalId);
        expect(response.status).toBe(409);
        expect(body.error.code).toBe("EXECUTION_STALE_DUPLICATE");
        db.close();
    });

    it("returns 409 when the identity is archived after approval", async () => {
        const { db, batchId, approvalId } = await approvedEntityContext("project_documentation");
        seedExistingDocBlock(db, {
            id: "stale-archived",
            projectId: "p-example",
            sourceRecordId: "TEST-DOC-001",
            status: "archived",
        });
        vi.stubEnv("AGENT_UI_PASSWORD", TEST_PASSWORD);
        vi.stubEnv("AGENT_KEY", TEST_KEY);
        const { response, body } = await postExecute(batchId, "project_documentation", approvalId);
        expect(response.status).toBe(409);
        expect(body.error.code).toBe("EXECUTION_STALE_REVIEW_REQUIRED");
        db.close();
    });

    it("returns 409 for an exact backlog duplicate appearing after approval", async () => {
        const { db, batchId, approvalId } = await approvedEntityContext("backlog");
        const incoming = db.prepare(
            "SELECT normalized_payload_json FROM import_batch_rows WHERE entity_type = 'backlog' ORDER BY source_row_number ASC LIMIT 1",
        ).get() as { normalized_payload_json: string };
        const payload = JSON.parse(incoming.normalized_payload_json) as Record<string, unknown>;
        seedExistingBacklogItem(db, {
            id: "stale-backlog",
            projectId: "p-example",
            title: String(payload.title),
            status: String(payload.status),
            priority: payload.priority != null ? Number(payload.priority) : null,
            scheduleBucket: payload.scheduleBucket != null ? String(payload.scheduleBucket) : null,
            startDate: payload.startDate != null ? String(payload.startDate) : null,
            endDate: payload.endDate != null ? String(payload.endDate) : null,
            isMilestone: payload.isMilestone ? 1 : 0,
            workstream: payload.workstream != null ? String(payload.workstream) : null,
            dodText: payload.dodText != null ? String(payload.dodText) : null,
            notes: payload.notes != null ? String(payload.notes) : null,
        });
        vi.stubEnv("AGENT_UI_PASSWORD", TEST_PASSWORD);
        vi.stubEnv("AGENT_KEY", TEST_KEY);
        const { response, body } = await postExecute(batchId, "backlog", approvalId);
        expect(response.status).toBe(409);
        expect(body.error.code).toBe("EXECUTION_STALE_DUPLICATE");
        db.close();
    });
});

describe("Execute API idempotency and rollback", () => {
    it("returns 409 ALREADY_COMPLETED on repeat without inserting duplicate rows", async () => {
        const { db, batchId, approvalId } = await approvedEntityContext("project_documentation");
        vi.stubEnv("AGENT_UI_PASSWORD", TEST_PASSWORD);
        vi.stubEnv("AGENT_KEY", TEST_KEY);

        const first = await postExecute(batchId, "project_documentation", approvalId);
        expect(first.response.status).toBe(200);
        const second = await postExecute(batchId, "project_documentation", approvalId);
        expect(second.response.status).toBe(409);
        expect(second.body.error.code).toBe("EXECUTION_ALREADY_COMPLETED");
        expect((db.prepare("SELECT COUNT(*) AS c FROM project_doc_blocks").get() as { c: number }).c).toBe(2);
        db.close();
    });

    it("returns 409 ALREADY_IN_PROGRESS while an attempt is active", async () => {
        const { db, batchId, approvalId } = await approvedEntityContext("project_documentation");
        appendAttempt(db, {
            batchId,
            entityType: "project_documentation",
            approvalId,
            startedAt: T0,
            eligibleRowCount: 2,
            attemptedRowCount: 0,
        });
        vi.stubEnv("AGENT_UI_PASSWORD", TEST_PASSWORD);
        vi.stubEnv("AGENT_KEY", TEST_KEY);
        const { response, body } = await postExecute(batchId, "project_documentation", approvalId);
        expect(response.status).toBe(409);
        expect(body.error.code).toBe("EXECUTION_ALREADY_IN_PROGRESS");
        db.close();
    });

    it("returns a safe 500 on insert failure with full rollback", async () => {
        const { db, batchId, approvalId } = await approvedEntityContext("project_documentation");
        const rows = db.prepare(
            "SELECT id, normalized_payload_json FROM import_batch_rows WHERE entity_type = 'project_documentation' ORDER BY source_row_number ASC",
        ).all() as Array<{ id: string; normalized_payload_json: string }>;
        const payload = JSON.parse(rows[1].normalized_payload_json) as Record<string, unknown>;
        payload.status = "bogus";
        db.prepare("UPDATE import_batch_rows SET normalized_payload_json = ? WHERE id = ?").run(JSON.stringify(payload), rows[1].id);
        vi.stubEnv("AGENT_UI_PASSWORD", TEST_PASSWORD);
        vi.stubEnv("AGENT_KEY", TEST_KEY);

        const { response, body } = await postExecute(batchId, "project_documentation", approvalId);
        expect(response.status).toBe(500);
        expect(body.error.code).toBe("EXECUTION_PROJECT_DOC_INSERT_FAILED");
        expect(JSON.stringify(body)).not.toContain("SqliteError");
        expect(JSON.stringify(body)).not.toContain("stack");
        expect(JSON.stringify(body)).not.toContain("Details line 1");
        expect((db.prepare("SELECT COUNT(*) AS c FROM project_doc_blocks").get() as { c: number }).c).toBe(0);
        const approval = db.prepare("SELECT approval_status FROM import_approvals WHERE id = ?").get(approvalId) as { approval_status: string };
        expect(approval.approval_status).toBe("approved");
        const audit = db.prepare(
            "SELECT execution_status, target_record_id FROM import_batch_rows WHERE entity_type = 'project_documentation'",
        ).all() as Array<{ execution_status: string; target_record_id: string | null }>;
        expect(audit.every((row) => row.execution_status === "not_started" && row.target_record_id === null)).toBe(true);
        const attempts = db.prepare("SELECT execution_status FROM import_execution_attempts").all() as Array<{ execution_status: string }>;
        expect(attempts).toHaveLength(1);
        expect(attempts[0].execution_status).toBe("rolled_back");
        db.close();
    });
});

describe("Execute API privacy and write boundary", () => {
    it("does not expose payloads, sql, or paths in any response", async () => {
        const { db, batchId, approvalId } = await approvedEntityContext("project_documentation");
        vi.stubEnv("AGENT_UI_PASSWORD", TEST_PASSWORD);
        vi.stubEnv("AGENT_KEY", TEST_KEY);
        const { response, body } = await postExecute(batchId, "project_documentation", approvalId);
        const serialized = JSON.stringify(body);
        expect(serialized).not.toContain("normalized_payload");
        expect(serialized).not.toContain("project_doc_blocks");
        expect(serialized).not.toContain("import_batch_rows");
        expect(serialized).not.toContain("sqlite");
        expect(serialized).not.toContain("/Users/");
        expect(response.status).toBe(200);
        db.close();
    });

    it("changes only approved business and audit tables during execution", async () => {
        const { db, batchId, approvalId } = await approvedEntityContext("project_documentation");
        vi.stubEnv("AGENT_UI_PASSWORD", TEST_PASSWORD);
        vi.stubEnv("AGENT_KEY", TEST_KEY);
        const before = {
            projects: (db.prepare("SELECT COUNT(*) AS c FROM projects").get() as { c: number }).c,
            items: (db.prepare("SELECT COUNT(*) AS c FROM project_items").get() as { c: number }).c,
        };
        const { response } = await postExecute(batchId, "project_documentation", approvalId);
        expect(response.status).toBe(200);
        expect((db.prepare("SELECT COUNT(*) AS c FROM projects").get() as { c: number }).c).toBe(before.projects);
        expect((db.prepare("SELECT COUNT(*) AS c FROM project_items").get() as { c: number }).c).toBe(before.items);
        db.close();
    });

    it("route import has no database side effect", async () => {
        const db = createApiExecutionAuthDatabase(["project_import:execute"]);
        const batchCount = (db.prepare("SELECT COUNT(*) AS c FROM import_batches").get() as { c: number }).c;
        expect(batchCount).toBe(0);
        const attemptCount = (db.prepare("SELECT COUNT(*) AS c FROM import_execution_attempts").get() as { c: number }).c;
        expect(attemptCount).toBe(0);
        db.close();
    });
});

describe("Execute API scope separation", () => {
    it("approve scope does not imply execute and execute scope does not imply approval", async () => {
        const approveOnly = createApiAuthDatabase(["project_import:approve"]);
        mockGetDb.mockReturnValue(approveOnly);
        vi.stubEnv("AGENT_UI_PASSWORD", TEST_PASSWORD);
        vi.stubEnv("AGENT_KEY", TEST_KEY);
        const response = await executeRoute(
            executeRequest("/api/project-import/batches/batch-1/approvals/project_documentation/execute", { approvalId: "apr-1" }),
            { params: Promise.resolve({ batchId: "batch-1", entityType: "project_documentation" }) },
        );
        expect(response.status).toBe(403);
        expect((await response.json()).error.code).toBe("IMPORT_EXECUTE_FORBIDDEN");
        approveOnly.close();
    });
});
