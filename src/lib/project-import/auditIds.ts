// ---------------------------------------------------------------------------
// WorkOS Project Field Sheet v1 — Audit ID generation
// WORKOS-SHEET-GATE-4B
// ---------------------------------------------------------------------------

import { randomUUID } from "crypto";

export function newBatchId(): string {
    return `batch-${randomUUID()}`;
}

export function newRowId(): string {
    return `row-${randomUUID()}`;
}

export function newApprovalId(): string {
    return `apr-${randomUUID()}`;
}

export function newApprovalEventId(): string {
    return `ape-${randomUUID()}`;
}

export function newAttemptId(): string {
    return `att-${randomUUID()}`;
}

export function newCleanupEventId(): string {
    return `cln-${randomUUID()}`;
}
