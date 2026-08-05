import { describe, expect, it } from "vitest";
import { executeApprovedImportEntity } from "@/lib/project-import/executeImportService";
import { ExecutionError, EXECUTION_ERROR_CODES } from "@/lib/project-import/executionErrors";
import { appendAttempt } from "@/lib/project-import/auditExecutionRepository";
import { consumeApproval, revokeApproval } from "@/lib/project-import/auditApprovalRepository";
import { buildApprovedBatch, T0, T0_PLUS_31 } from "../fixtures/executionHelpers";

function errorCode(fn: () => unknown): string {
    try {
        fn();
        throw new Error("expected execution error");
    } catch (error) {
        if (error instanceof ExecutionError) return error.code;
        throw error;
    }
}

describe("Execute Import preconditions", () => {
    it("executes an approved documentation entity", async () => {
        const { db, batchId, approvalId } = await buildApprovedBatch("project_documentation");
        const result = executeApprovedImportEntity(
            { batchId, entityType: "project_documentation", approvalId, requestedBy: "Test Agent" },
            { db, now: T0 },
        );
        expect(result.status).toBe("committed");
        expect(result.insertedCount).toBe(2);
        expect(result.targetRecordIds).toHaveLength(2);
        expect((db.prepare("SELECT COUNT(*) AS c FROM project_doc_blocks").get() as { c: number }).c).toBe(2);
        db.close();
    });

    it("rejects a missing approval", async () => {
        const { db, batchId } = await buildApprovedBatch("project_documentation");
        expect(errorCode(() =>
            executeApprovedImportEntity({ batchId, entityType: "project_documentation", approvalId: "apr-missing", requestedBy: "x" }, { db, now: T0 }),
        )).toBe(EXECUTION_ERROR_CODES.APPROVAL_NOT_FOUND);
        db.close();
    });

    it("rejects an approval that belongs to another entity", async () => {
        const { db, batchId, approvalId } = await buildApprovedBatch("project_documentation");
        const { approveEntityApi } = await import("@/lib/project-import/approvalApplicationService");
        approveEntityApi(batchId, "backlog", "Test Agent", { db, now: T0 });
        expect(errorCode(() =>
            executeApprovedImportEntity({ batchId, entityType: "backlog", approvalId, requestedBy: "x" }, { db, now: T0 }),
        )).toBe(EXECUTION_ERROR_CODES.APPROVAL_NOT_FOUND);
        db.close();
    });

    it("rejects expired approvals", async () => {
        const { db, batchId, approvalId } = await buildApprovedBatch("project_documentation");
        expect(errorCode(() =>
            executeApprovedImportEntity({ batchId, entityType: "project_documentation", approvalId, requestedBy: "x" }, { db, now: T0_PLUS_31 }),
        )).toBe(EXECUTION_ERROR_CODES.APPROVAL_EXPIRED);
        db.close();
    });

    it("rejects revoked approvals", async () => {
        const { db, batchId, approvalId } = await buildApprovedBatch("project_documentation");
        revokeApproval(db, approvalId, { revokedBy: "owner", now: T0 });
        expect(errorCode(() =>
            executeApprovedImportEntity({ batchId, entityType: "project_documentation", approvalId, requestedBy: "x" }, { db, now: T0 }),
        )).toBe(EXECUTION_ERROR_CODES.APPROVAL_REVOKED);
        db.close();
    });

    it("rejects consumed approvals", async () => {
        const { db, batchId, approvalId } = await buildApprovedBatch("project_documentation");
        consumeApproval(db, approvalId, T0);
        expect(errorCode(() =>
            executeApprovedImportEntity({ batchId, entityType: "project_documentation", approvalId, requestedBy: "x" }, { db, now: T0 }),
        )).toBe(EXECUTION_ERROR_CODES.APPROVAL_CONSUMED);
        db.close();
    });

    it("rejects binding mismatches", async () => {
        const { db, batchId, approvalId } = await buildApprovedBatch("project_documentation");
        db.prepare("UPDATE import_approvals SET bound_file_hash = 'wrong' WHERE id = ?").run(approvalId);
        expect(errorCode(() =>
            executeApprovedImportEntity({ batchId, entityType: "project_documentation", approvalId, requestedBy: "x" }, { db, now: T0 }),
        )).toBe(EXECUTION_ERROR_CODES.APPROVAL_BINDING_MISMATCH);
        db.close();
    });

    it.each(["invalid", "conflict", "review_required"])("rejects entities with %s rows", async (status) => {
        const { db, batchId, approvalId } = await buildApprovedBatch("project_documentation");
        db.prepare("UPDATE import_batch_rows SET dry_run_status = ? WHERE entity_type = 'project_documentation' LIMIT 1").run(status);
        expect(errorCode(() =>
            executeApprovedImportEntity({ batchId, entityType: "project_documentation", approvalId, requestedBy: "x" }, { db, now: T0 }),
        )).toBe(EXECUTION_ERROR_CODES.ENTITY_BLOCKED);
        db.close();
    });

    it("rejects entities with no eligible new rows", async () => {
        const { db, batchId, approvalId } = await buildApprovedBatch("project_documentation");
        db.prepare("UPDATE import_batch_rows SET dry_run_status = 'duplicate' WHERE entity_type = 'project_documentation'").run();
        expect(errorCode(() =>
            executeApprovedImportEntity({ batchId, entityType: "project_documentation", approvalId, requestedBy: "x" }, { db, now: T0 }),
        )).toBe(EXECUTION_ERROR_CODES.NO_ELIGIBLE_ROWS);
        db.close();
    });

    it("prevents repeat execution after completion", async () => {
        const { db, batchId, approvalId } = await buildApprovedBatch("project_documentation");
        executeApprovedImportEntity({ batchId, entityType: "project_documentation", approvalId, requestedBy: "x" }, { db, now: T0 });
        expect(errorCode(() =>
            executeApprovedImportEntity({ batchId, entityType: "project_documentation", approvalId, requestedBy: "x" }, { db, now: T0 }),
        )).toBe(EXECUTION_ERROR_CODES.ALREADY_COMPLETED);
        db.close();
    });

    it("rejects an already-in-progress execution", async () => {
        const { db, batchId, approvalId } = await buildApprovedBatch("project_documentation");
        appendAttempt(db, {
            batchId,
            entityType: "project_documentation",
            approvalId,
            startedAt: T0,
            eligibleRowCount: 2,
            attemptedRowCount: 0,
        });
        expect(errorCode(() =>
            executeApprovedImportEntity({ batchId, entityType: "project_documentation", approvalId, requestedBy: "x" }, { db, now: T0 }),
        )).toBe(EXECUTION_ERROR_CODES.ALREADY_IN_PROGRESS);
        db.close();
    });
});
