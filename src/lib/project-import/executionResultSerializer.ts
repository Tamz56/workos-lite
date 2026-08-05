// ---------------------------------------------------------------------------
// WorkOS Project Field Sheet v1 — Execution result serializer
// WORKOS-SHEET-GATE-6
// ---------------------------------------------------------------------------

import type { ExecuteImportEntityResult } from "./executionTypes";
import type { EntityType } from "./auditTypes";

export function serializeExecutionResult(input: {
    batchId: string;
    entityType: EntityType;
    approvalId: string;
    executionAttemptId: string;
    insertedCount: number;
    skippedCount: number;
    targetRecordIds: string[];
    startedAt: string;
    finishedAt: string;
}): ExecuteImportEntityResult {
    return {
        batchId: input.batchId,
        entityType: input.entityType,
        approvalId: input.approvalId,
        executionAttemptId: input.executionAttemptId,
        status: "committed",
        insertedCount: input.insertedCount,
        skippedCount: input.skippedCount,
        targetRecordIds: input.targetRecordIds,
        startedAt: input.startedAt,
        finishedAt: input.finishedAt,
        approvalConsumed: true,
        transactionCommitted: true,
    };
}
