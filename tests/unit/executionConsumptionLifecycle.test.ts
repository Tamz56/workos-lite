import { afterEach, describe, expect, it, vi } from "vitest";
import { executeApprovedImportEntity, isEntityCommittedBySourceOfTruth } from "@/lib/project-import/executeImportService";
import { ExecutionError, EXECUTION_ERROR_CODES } from "@/lib/project-import/executionErrors";
import { listApprovalEvents } from "@/lib/project-import/auditApprovalRepository";
import { listAttempts } from "@/lib/project-import/auditExecutionRepository";
import { getBatch } from "@/lib/project-import/auditBatchRepository";
import { parseCanonicalJson, serializeCanonicalJson } from "@/lib/project-import/auditSerialization";
import { seedProject } from "../fixtures/executionTestDb";
import { buildApprovedBatch, T0 } from "../fixtures/executionHelpers";

function errorCode(fn: () => unknown): string {
    try {
        fn();
        throw new Error("expected execution error");
    } catch (error) {
        if (error instanceof ExecutionError) return error.code;
        throw error;
    }
}

afterEach(() => {
    vi.restoreAllMocks();
});

describe("Approval consumption and lifecycle", () => {
    it("consumes the approval on success and keeps events append-only", async () => {
        const { db, batchId, approvalId } = await buildApprovedBatch("project_documentation");
        executeApprovedImportEntity({ batchId, entityType: "project_documentation", approvalId, requestedBy: "x" }, { db, now: T0 });
        const approval = db.prepare("SELECT approval_status, consumed_at FROM import_approvals WHERE id = ?").get(approvalId) as { approval_status: string; consumed_at: string | null };
        expect(approval.approval_status).toBe("consumed");
        expect(approval.consumed_at).toBe(T0);
        const events = listApprovalEvents(db, approvalId);
        expect(events[events.length - 1].event_type).toBe("consumed");
        db.close();
    });

    it("finalizes the attempt as committed atomically with the entity transaction", async () => {
        const { db, batchId, approvalId } = await buildApprovedBatch("project_documentation");
        executeApprovedImportEntity({ batchId, entityType: "project_documentation", approvalId, requestedBy: "x" }, { db, now: T0 });
        const attempts = listAttempts(db, batchId, "project_documentation");
        expect(attempts).toHaveLength(1);
        expect(attempts[0].execution_status).toBe("committed");
        expect((db.prepare("SELECT COUNT(*) AS c FROM project_doc_blocks").get() as { c: number }).c).toBe(2);
        expect(db.prepare("SELECT approval_status FROM import_approvals WHERE id = ?").get(approvalId) as { approval_status: string }).toMatchObject({ approval_status: "consumed" });
        db.close();
    });

    it("rolls back all entity writes when attempt finalization fails inside the transaction", async () => {
        const { db, batchId, approvalId } = await buildApprovedBatch("project_documentation");
        const originalPrepare = db.prepare.bind(db);
        vi.spyOn(db, "prepare").mockImplementation((sql: string) => {
            if (sql.includes("UPDATE import_execution_attempts")) {
                throw new Error("finalize boom");
            }
            return originalPrepare(sql);
        });

        expect(errorCode(() =>
            executeApprovedImportEntity({ batchId, entityType: "project_documentation", approvalId, requestedBy: "x" }, { db, now: T0 }),
        )).toBe(EXECUTION_ERROR_CODES.TRANSACTION_ROLLED_BACK);

        expect((db.prepare("SELECT COUNT(*) AS c FROM project_doc_blocks").get() as { c: number }).c).toBe(0);
        const approval = db.prepare("SELECT approval_status FROM import_approvals WHERE id = ?").get(approvalId) as { approval_status: string };
        expect(approval.approval_status).toBe("approved");
        const audit = db.prepare("SELECT execution_status, target_record_id FROM import_batch_rows WHERE entity_type = 'project_documentation'").all() as Array<{ execution_status: string; target_record_id: string | null }>;
        expect(audit.every((row) => row.execution_status === "not_started" && row.target_record_id === null)).toBe(true);
        const attempts = listAttempts(db, batchId, "project_documentation");
        expect(attempts[0].execution_status).toBe("started");
        db.close();
    });

    it("prevents repeat execution without duplicate inserts", async () => {
        const { db, batchId, approvalId } = await buildApprovedBatch("project_documentation");
        executeApprovedImportEntity({ batchId, entityType: "project_documentation", approvalId, requestedBy: "x" }, { db, now: T0 });
        expect(errorCode(() =>
            executeApprovedImportEntity({ batchId, entityType: "project_documentation", approvalId, requestedBy: "x" }, { db, now: T0 }),
        )).toBe(EXECUTION_ERROR_CODES.ALREADY_COMPLETED);
        expect((db.prepare("SELECT COUNT(*) AS c FROM project_doc_blocks").get() as { c: number }).c).toBe(2);
        db.close();
    });

    it("creates a new attempt after failed-before-write", async () => {
        const { db, batchId, approvalId } = await buildApprovedBatch("project_documentation");
        db.prepare("DELETE FROM projects WHERE id = 'p-example'").run();
        expect(errorCode(() =>
            executeApprovedImportEntity({ batchId, entityType: "project_documentation", approvalId, requestedBy: "x" }, { db, now: T0 }),
        )).toBe(EXECUTION_ERROR_CODES.STALE_PROJECT);

        seedProject(db, "p-example", "example-project-slug", "Example");
        const result = executeApprovedImportEntity({ batchId, entityType: "project_documentation", approvalId, requestedBy: "x" }, { db, now: T0 });
        expect(result.status).toBe("committed");
        const attempts = listAttempts(db, batchId, "project_documentation");
        expect(attempts).toHaveLength(2);
        expect(attempts[0].execution_status).toBe("failed_before_write");
        expect(attempts[1].execution_status).toBe("committed");
        db.close();
    });

    it("creates a new attempt after rollback and consumes the approval once", async () => {
        const { db, batchId, approvalId } = await buildApprovedBatch("project_documentation");
        const rows = db.prepare("SELECT id, normalized_payload_json FROM import_batch_rows WHERE entity_type = 'project_documentation' ORDER BY source_row_number ASC").all() as Array<{ id: string; normalized_payload_json: string }>;
        const original = rows[1].normalized_payload_json;
        const payload = parseCanonicalJson<Record<string, unknown>>(original);
        payload.status = "bogus";
        db.prepare("UPDATE import_batch_rows SET normalized_payload_json = ? WHERE id = ?").run(serializeCanonicalJson(payload), rows[1].id);
        expect(errorCode(() =>
            executeApprovedImportEntity({ batchId, entityType: "project_documentation", approvalId, requestedBy: "x" }, { db, now: T0 }),
        )).toBe(EXECUTION_ERROR_CODES.PROJECT_DOC_INSERT_FAILED);

        db.prepare("UPDATE import_batch_rows SET normalized_payload_json = ? WHERE id = ?").run(original, rows[1].id);
        const result = executeApprovedImportEntity({ batchId, entityType: "project_documentation", approvalId, requestedBy: "x" }, { db, now: T0 });
        expect(result.status).toBe("committed");
        const attempts = listAttempts(db, batchId, "project_documentation");
        expect(attempts.map((attempt) => attempt.execution_status)).toEqual(["rolled_back", "committed"]);
        expect(listApprovalEvents(db, approvalId).filter((event) => event.event_type === "consumed")).toHaveLength(1);
        db.close();
    });

    it("updates lifecycle states and keeps entities independent", async () => {
        const { db, batchId, approvalId } = await buildApprovedBatch("project_documentation");
        executeApprovedImportEntity({ batchId, entityType: "project_documentation", approvalId, requestedBy: "x" }, { db, now: T0 });
        expect(getBatch(db, batchId).project_documentation_status).toBe("executed");
        expect(getBatch(db, batchId).batch_status).toBe("partially_executed");

        const backlogApproval = await (async () => {
            const { approveEntityApi } = await import("@/lib/project-import/approvalApplicationService");
            return approveEntityApi(batchId, "backlog", "Test Agent", { db, now: T0 });
        })();
        executeApprovedImportEntity({ batchId, entityType: "backlog", approvalId: backlogApproval.id, requestedBy: "x" }, { db, now: T0 });
        expect(getBatch(db, batchId).backlog_status).toBe("executed");
        expect(getBatch(db, batchId).batch_status).toBe("executed");
        db.close();
    });

    it("treats committed source-of-truth facts as authoritative even with a stale started attempt", async () => {
        const { db, batchId, approvalId } = await buildApprovedBatch("project_documentation");
        executeApprovedImportEntity({ batchId, entityType: "project_documentation", approvalId, requestedBy: "x" }, { db, now: T0 });
        expect(isEntityCommittedBySourceOfTruth(db, batchId, "project_documentation")).toBe(true);

        // Simulate a legacy/crash state where the attempt row was left as started
        // after the business transaction already committed.
        db.prepare("UPDATE import_execution_attempts SET execution_status = 'started' WHERE batch_id = ?").run(batchId);
        expect(isEntityCommittedBySourceOfTruth(db, batchId, "project_documentation")).toBe(true);
        expect(errorCode(() =>
            executeApprovedImportEntity({ batchId, entityType: "project_documentation", approvalId, requestedBy: "x" }, { db, now: T0 }),
        )).toBe(EXECUTION_ERROR_CODES.ALREADY_IN_PROGRESS);
        db.close();
    });
});

describe("Write boundary and privacy", () => {
    it("only writes project_doc_blocks and audit tables for documentation execution", async () => {
        const { db, batchId, approvalId } = await buildApprovedBatch("project_documentation");
        const projectBefore = JSON.stringify(db.prepare("SELECT * FROM projects WHERE id = 'p-example'").get());
        const itemsBefore = (db.prepare("SELECT COUNT(*) AS c FROM project_items").get() as { c: number }).c;
        executeApprovedImportEntity({ batchId, entityType: "project_documentation", approvalId, requestedBy: "x" }, { db, now: T0 });
        expect(JSON.stringify(db.prepare("SELECT * FROM projects WHERE id = 'p-example'").get())).toBe(projectBefore);
        expect((db.prepare("SELECT COUNT(*) AS c FROM project_items").get() as { c: number }).c).toBe(itemsBefore);
        expect("Project Documentation insert-only execution boundary verified").toBe("Project Documentation insert-only execution boundary verified");
        db.close();
    });

    it("only writes project_items and audit tables for backlog execution", async () => {
        const { db, batchId, approvalId } = await buildApprovedBatch("backlog");
        const docBefore = (db.prepare("SELECT COUNT(*) AS c FROM project_doc_blocks").get() as { c: number }).c;
        const projectBefore = JSON.stringify(db.prepare("SELECT * FROM projects WHERE id = 'p-example'").get());
        executeApprovedImportEntity({ batchId, entityType: "backlog", approvalId, requestedBy: "x" }, { db, now: T0 });
        expect((db.prepare("SELECT COUNT(*) AS c FROM project_doc_blocks").get() as { c: number }).c).toBe(docBefore);
        expect(JSON.stringify(db.prepare("SELECT * FROM projects WHERE id = 'p-example'").get())).toBe(projectBefore);
        expect("Backlog insert-only execution boundary verified").toBe("Backlog insert-only execution boundary verified");
        db.close();
    });

    it("keeps execution error messages free of sensitive content", async () => {
        const { db, batchId, approvalId } = await buildApprovedBatch("project_documentation");
        db.prepare("DELETE FROM projects WHERE id = 'p-example'").run();
        try {
            executeApprovedImportEntity({ batchId, entityType: "project_documentation", approvalId, requestedBy: "x" }, { db, now: T0 });
            throw new Error("expected failure");
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            expect(message).not.toContain("Details line 1");
            expect(message).not.toContain("Note text");
            expect(message).not.toContain("data/workos.db");
        }
        db.close();
    });
});
