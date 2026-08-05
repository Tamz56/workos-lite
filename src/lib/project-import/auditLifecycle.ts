// ---------------------------------------------------------------------------
// WorkOS Project Field Sheet v1 — Lifecycle vocabularies and transition guards
// WORKOS-SHEET-GATE-4B
// ---------------------------------------------------------------------------

import {
    APPROVAL_STATUSES,
    ATTEMPT_STATUSES,
    BATCH_STATUSES,
    ROW_EXECUTION_STATUSES,
    type ApprovalStatus,
    type AttemptStatus,
    type BatchStatus,
    type EntityAuditStatus,
    type RowExecutionStatus,
    AuditTransitionError,
} from "./auditTypes";

const BATCH_TRANSITIONS: Record<BatchStatus, readonly BatchStatus[]> = {
    dry_run_created: ["dry_run_invalid", "ready_for_approval", "partially_ready", "cancelled"],
    dry_run_invalid: ["cancelled"],
    ready_for_approval: ["approved", "partially_approved", "rejected", "approval_expired", "cancelled"],
    partially_ready: ["partially_approved", "rejected", "approval_expired", "cancelled"],
    approved: ["execution_started", "approval_expired", "cancelled"],
    partially_approved: ["execution_started", "approval_expired", "cancelled"],
    rejected: ["cancelled"],
    approval_expired: ["cancelled"],
    execution_started: ["executed", "partially_executed", "execution_failed", "cancelled"],
    executed: ["retention_eligible"],
    partially_executed: ["execution_failed", "executed", "retention_eligible"],
    execution_failed: ["execution_started", "cancelled"],
    cancelled: [],
    retention_eligible: ["deleted"],
    deleted: [],
};

const APPROVAL_TRANSITIONS: Record<ApprovalStatus, readonly ApprovalStatus[]> = {
    pending: ["approved", "rejected", "expired", "revoked"],
    approved: ["expired", "revoked", "consumed"],
    rejected: [],
    expired: [],
    revoked: [],
    consumed: [],
};

const ROW_EXECUTION_TRANSITIONS: Record<RowExecutionStatus, readonly RowExecutionStatus[]> = {
    not_started: ["attempted", "skipped"],
    attempted: ["committed", "rolled_back", "failed_before_write"],
    committed: [],
    rolled_back: [],
    failed_before_write: [],
    skipped: [],
};

const ATTEMPT_TRANSITIONS: Record<AttemptStatus, readonly AttemptStatus[]> = {
    started: ["committed", "rolled_back", "failed", "failed_before_write", "cancelled"],
    committed: [],
    rolled_back: [],
    failed: [],
    failed_before_write: [],
    cancelled: [],
};

const ENTITY_TRANSITIONS: Record<EntityAuditStatus, readonly EntityAuditStatus[]> = {
    ready: ["approved", "rejected", "expired"],
    ready_with_warnings: ["approved", "rejected", "expired"],
    blocked: ["rejected"],
    approved: ["executed"],
    rejected: [],
    expired: [],
    executed: [],
};

export function assertBatchTransition(from: BatchStatus, to: BatchStatus): void {
    if (!BATCH_TRANSITIONS[from].includes(to)) throw new AuditTransitionError(from, to);
}

export function assertApprovalTransition(from: ApprovalStatus, to: ApprovalStatus): void {
    if (!APPROVAL_TRANSITIONS[from].includes(to)) throw new AuditTransitionError(from, to);
}

export function assertRowExecutionTransition(from: RowExecutionStatus, to: RowExecutionStatus): void {
    if (!ROW_EXECUTION_TRANSITIONS[from].includes(to)) throw new AuditTransitionError(from, to);
}

export function assertAttemptTransition(from: AttemptStatus, to: AttemptStatus): void {
    if (!ATTEMPT_TRANSITIONS[from].includes(to)) throw new AuditTransitionError(from, to);
}

export function assertEntityStatusTransition(from: EntityAuditStatus, to: EntityAuditStatus): void {
    if (!ENTITY_TRANSITIONS[from].includes(to)) throw new AuditTransitionError(from, to);
}

export const APPROVAL_TTL_MINUTES = 30;

export function approvalExpiresAt(approvedAt: string): string {
    const date = new Date(approvedAt);
    if (Number.isNaN(date.getTime())) throw new Error("Invalid approvedAt timestamp");
    return new Date(date.getTime() + APPROVAL_TTL_MINUTES * 60 * 1000).toISOString();
}

export function isApprovalValid(status: ApprovalStatus, expiresAt: string | null, now: string): boolean {
    return status === "approved" && expiresAt !== null && expiresAt > now;
}

export function retentionEligibleAt(baseTimestamp: string, days: number): string {
    const date = new Date(baseTimestamp);
    if (Number.isNaN(date.getTime())) throw new Error("Invalid retention base timestamp");
    return new Date(date.getTime() + days * 24 * 60 * 60 * 1000).toISOString();
}

export type RetentionPolicy = {
    batchEligibleDays: number | null;
    payloadPurgeDays: number | null;
};

export function retentionPolicyForBatchStatus(status: BatchStatus): RetentionPolicy {
    switch (status) {
        case "rejected":
        case "approval_expired":
            return { batchEligibleDays: 30, payloadPurgeDays: null };
        case "execution_failed":
            return { batchEligibleDays: 90, payloadPurgeDays: null };
        case "executed":
        case "partially_executed":
            return { batchEligibleDays: 365, payloadPurgeDays: 90 };
        default:
            return { batchEligibleDays: null, payloadPurgeDays: null };
    }
}

export function isBatchStatus(value: string): value is BatchStatus {
    return (BATCH_STATUSES as readonly string[]).includes(value);
}

export function isApprovalStatus(value: string): value is ApprovalStatus {
    return (APPROVAL_STATUSES as readonly string[]).includes(value);
}

export function isAttemptStatus(value: string): value is AttemptStatus {
    return (ATTEMPT_STATUSES as readonly string[]).includes(value);
}

export function isRowExecutionStatus(value: string): value is RowExecutionStatus {
    return (ROW_EXECUTION_STATUSES as readonly string[]).includes(value);
}

export function isEntityAuditStatus(value: string): value is EntityAuditStatus {
    return ["ready", "ready_with_warnings", "blocked", "approved", "rejected", "expired", "executed"].includes(value);
}
