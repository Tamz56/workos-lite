// ---------------------------------------------------------------------------
// WorkOS Project Field Sheet v1 — Execute Import API types
// WORKOS-SHEET-GATE-7A
// The request carries only identifiers; every other input is loaded from
// persisted audit state by the Gate 6 execution service.
// ---------------------------------------------------------------------------

import type { EntityType } from "./auditTypes";

export type ExecuteImportApiRequest = {
    approvalId: string;
};

export type ExecuteImportApiInput = {
    batchId: string;
    entityType: EntityType;
    approvalId: string;
    actorId: string;
    actorName: string;
};

export type ExecuteImportApiData = {
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

export type ExecuteImportApiResponse = {
    ok: true;
    data: ExecuteImportApiData;
};
