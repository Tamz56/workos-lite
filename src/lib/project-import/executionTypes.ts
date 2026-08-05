// ---------------------------------------------------------------------------
// WorkOS Project Field Sheet v1 — Execute Import service types
// WORKOS-SHEET-GATE-6
// ---------------------------------------------------------------------------

import type { EntityType } from "./auditTypes";

export type ExecuteImportEntityInput = {
    batchId: string;
    entityType: EntityType;
    approvalId: string;
    requestedBy: string;
};

export type ExecuteImportEntityResult = {
    batchId: string;
    entityType: EntityType;
    approvalId: string;
    executionAttemptId: string;
    status: "committed";
    insertedCount: number;
    skippedCount: number;
    targetRecordIds: string[];
    startedAt: string;
    finishedAt: string;
    approvalConsumed: true;
    transactionCommitted: true;
};
