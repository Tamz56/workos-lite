import Database from "better-sqlite3";
import { describe, expect, it } from "vitest";
import { runWorkOSProjectFieldDryRun } from "@/lib/project-import/dryRunAssembler";
import { persistWorkOSProjectFieldDryRun } from "@/lib/project-import/auditPersistenceService";
import { getBatch, setRetentionEligible, updateBatchStatus } from "@/lib/project-import/auditBatchRepository";
import {
    appendAttempt,
    finalizeAttempt,
    listAttempts,
} from "@/lib/project-import/auditExecutionRepository";
import {
    appendCleanupEvent,
    completeCleanupEvent,
    listCleanupEvents,
    queryBatchDeletionEligible,
    queryPayloadPurgeEligible,
} from "@/lib/project-import/auditCleanupRepository";
import {
    retentionEligibleAt,
    retentionPolicyForBatchStatus,
} from "@/lib/project-import/auditLifecycle";
import { AuditError, AuditTransitionError } from "@/lib/project-import/auditTypes";
import { createAuditTestDatabase } from "../fixtures/auditTestDb";
import { createDryRunTestDatabase, seedProject } from "../fixtures/dryRunTestDb";
import { validWorkbook } from "../fixtures/projectFieldSheetFixtures";

const T0 = "2026-08-05T10:00:00.000Z";

async function persistValidBatch(): Promise<{ auditDb: Database.Database; batchId: string }> {
    const dryDb = createDryRunTestDatabase();
    seedProject(dryDb, "p-example", "example-project-slug", "Example");
    const result = await runWorkOSProjectFieldDryRun({ workbook: await validWorkbook() }, { db: dryDb });
    dryDb.close();
    const auditDb = createAuditTestDatabase();
    const persisted = persistWorkOSProjectFieldDryRun(auditDb, result, {
        sourceFilename: "fixture.xlsx",
        sourceFileSize: 4096,
        sourceMimeType: "xlsx",
    });
    return { auditDb, batchId: persisted.id };
}

describe("Execution attempts", () => {
    it("appends attempts with deterministic incrementing numbers", async () => {
        const { auditDb, batchId } = await persistValidBatch();
        const first = appendAttempt(auditDb, {
            batchId,
            entityType: "project_documentation",
            approvalId: null,
            startedAt: T0,
            eligibleRowCount: 2,
            attemptedRowCount: 2,
        });
        const second = appendAttempt(auditDb, {
            batchId,
            entityType: "project_documentation",
            approvalId: null,
            startedAt: T0,
            eligibleRowCount: 2,
            attemptedRowCount: 0,
        });
        expect(first.attempt_number).toBe(1);
        expect(second.attempt_number).toBe(2);
        expect(listAttempts(auditDb, batchId, "project_documentation")).toHaveLength(2);
        auditDb.close();
    });

    it("finalizes attempts through controlled transitions only", async () => {
        const { auditDb, batchId } = await persistValidBatch();
        const attempt = appendAttempt(auditDb, {
            batchId,
            entityType: "backlog",
            approvalId: null,
            startedAt: T0,
            eligibleRowCount: 2,
            attemptedRowCount: 2,
        });
        const committed = finalizeAttempt(auditDb, attempt.id, {
            status: "committed",
            finishedAt: T0,
            committedRowCount: 2,
        });
        expect(committed.execution_status).toBe("committed");
        expect(() =>
            finalizeAttempt(auditDb, attempt.id, {
                status: "rolled_back",
                finishedAt: T0,
            }),
        ).toThrow(AuditTransitionError);
        auditDb.close();
    });

    it("stores only safe failure messages", async () => {
        const { auditDb, batchId } = await persistValidBatch();
        const attempt = appendAttempt(auditDb, {
            batchId,
            entityType: "backlog",
            approvalId: null,
            startedAt: T0,
            eligibleRowCount: 2,
            attemptedRowCount: 0,
        });
        const failed = finalizeAttempt(auditDb, attempt.id, {
            status: "failed",
            finishedAt: T0,
            failureCode: "E100",
            safeFailureMessage: "Generic execution failure",
        });
        expect(failed.failure_code).toBe("E100");
        expect(failed.safe_failure_message).toBe("Generic execution failure");
        auditDb.close();
    });

    it("keeps attempts immutable after a terminal status and creates a distinct attempt on retry", async () => {
        const { auditDb, batchId } = await persistValidBatch();
        const first = appendAttempt(auditDb, {
            batchId,
            entityType: "project_documentation",
            approvalId: null,
            startedAt: T0,
            eligibleRowCount: 2,
            attemptedRowCount: 2,
        });
        finalizeAttempt(auditDb, first.id, { status: "committed", finishedAt: T0, committedRowCount: 2 });
        expect(() =>
            finalizeAttempt(auditDb, first.id, { status: "rolled_back", finishedAt: T0 }),
        ).toThrow(AuditTransitionError);

        const second = appendAttempt(auditDb, {
            batchId,
            entityType: "project_documentation",
            approvalId: null,
            startedAt: T0,
            eligibleRowCount: 2,
            attemptedRowCount: 2,
        });
        finalizeAttempt(auditDb, second.id, { status: "committed", finishedAt: T0, committedRowCount: 2 });
        const attempts = listAttempts(auditDb, batchId, "project_documentation");
        expect(attempts).toHaveLength(2);
        expect(attempts[0].execution_status).toBe("committed");
        expect(attempts[1].execution_status).toBe("committed");
        expect(attempts[1].attempt_number).toBe(2);
        auditDb.close();
    });
});

describe("Cleanup log and retention", () => {
    it("appends cleanup events and does not mutate audit records on completion", async () => {
        const { auditDb, batchId } = await persistValidBatch();
        const before = (auditDb.prepare("SELECT COUNT(*) AS c FROM import_batches").get() as { c: number }).c;
        const event = appendCleanupEvent(auditDb, {
            batchId,
            cleanupAction: "batch_deleted",
            cleanupScope: "batch",
            initiatedBy: "cleanup-executor",
            reason: "retention expired",
        });
        completeCleanupEvent(auditDb, event.id, { status: "completed", completedAt: T0, recordsDeleted: 1 });
        expect(listCleanupEvents(auditDb, batchId)).toHaveLength(1);
        expect(() =>
            completeCleanupEvent(auditDb, event.id, { status: "completed", completedAt: T0 }),
        ).toThrow(AuditError);
        expect((auditDb.prepare("SELECT COUNT(*) AS c FROM import_batches").get() as { c: number }).c).toBe(before);
        auditDb.close();
    });

    it("computes retention policy per batch status", () => {
        expect(retentionPolicyForBatchStatus("rejected")).toEqual({ batchEligibleDays: 30, payloadPurgeDays: null });
        expect(retentionPolicyForBatchStatus("approval_expired")).toEqual({ batchEligibleDays: 30, payloadPurgeDays: null });
        expect(retentionPolicyForBatchStatus("execution_failed")).toEqual({ batchEligibleDays: 90, payloadPurgeDays: null });
        expect(retentionPolicyForBatchStatus("executed")).toEqual({ batchEligibleDays: 365, payloadPurgeDays: 90 });
        expect(retentionPolicyForBatchStatus("dry_run_created")).toEqual({ batchEligibleDays: null, payloadPurgeDays: null });
    });

    it("marks successful batches retention-eligible after 365 days", async () => {
        const { auditDb, batchId } = await persistValidBatch();
        updateBatchStatus(auditDb, batchId, "approved");
        updateBatchStatus(auditDb, batchId, "execution_started");
        updateBatchStatus(auditDb, batchId, "executed");
        const batch = getBatch(auditDb, batchId);
        const eligibleAt = retentionEligibleAt(batch.created_at, 365);
        setRetentionEligible(auditDb, batchId, eligibleAt);
        const later = new Date(new Date(batch.created_at).getTime() + 366 * 24 * 60 * 60 * 1000).toISOString();
        const eligible = queryBatchDeletionEligible(auditDb, later);
        expect(eligible.map((row) => row.id)).toContain(batchId);
        auditDb.close();
    });

    it("marks failed executions retention-eligible after 90 days and rejected batches after 30 days", async () => {
        const { auditDb, batchId } = await persistValidBatch();
        updateBatchStatus(auditDb, batchId, "approved");
        updateBatchStatus(auditDb, batchId, "execution_started");
        updateBatchStatus(auditDb, batchId, "execution_failed");
        const failed = getBatch(auditDb, batchId);
        setRetentionEligible(auditDb, batchId, retentionEligibleAt(failed.created_at, 90));

        const { auditDb: auditDb2, batchId: batchId2 } = await persistValidBatch();
        updateBatchStatus(auditDb2, batchId2, "rejected");
        const rejected = getBatch(auditDb2, batchId2);
        setRetentionEligible(auditDb2, batchId2, retentionEligibleAt(rejected.created_at, 30));

        const laterFailed = new Date(new Date(failed.created_at).getTime() + 91 * 24 * 60 * 60 * 1000).toISOString();
        const laterRejected = new Date(new Date(rejected.created_at).getTime() + 31 * 24 * 60 * 60 * 1000).toISOString();
        expect(queryBatchDeletionEligible(auditDb, laterFailed).map((row) => row.id)).toContain(batchId);
        expect(queryBatchDeletionEligible(auditDb2, laterRejected).map((row) => row.id)).toContain(batchId2);
        auditDb.close();
        auditDb2.close();
    });

    it("reports payload purge eligibility after 90 days without purging", async () => {
        const { auditDb, batchId } = await persistValidBatch();
        updateBatchStatus(auditDb, batchId, "approved");
        updateBatchStatus(auditDb, batchId, "execution_started");
        updateBatchStatus(auditDb, batchId, "executed");
        const now = "2026-11-15T00:00:00.000Z";
        const old = "2026-08-01T00:00:00.000Z";
        auditDb.prepare("UPDATE import_batch_rows SET created_at = ? WHERE batch_id = ?").run(old, batchId);

        const eligible = queryPayloadPurgeEligible(auditDb, now);
        expect(eligible.length).toBeGreaterThan(0);
        expect(eligible.every((row) => row.batchId === batchId)).toBe(true);
        expect(queryPayloadPurgeEligible(auditDb, "2026-08-10T00:00:00.000Z")).toHaveLength(0);
        auditDb.close();
    });
});
