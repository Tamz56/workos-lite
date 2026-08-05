// ---------------------------------------------------------------------------
// WorkOS Project Field Sheet v1 — Audit types and status vocabularies
// WORKOS-SHEET-GATE-4B
// ---------------------------------------------------------------------------

export const AUDIT_PARSER_CONTRACT_VERSION = "workos-field-sheet-parser-v1";

export const BATCH_STATUSES = [
    "dry_run_created",
    "dry_run_invalid",
    "ready_for_approval",
    "partially_ready",
    "approved",
    "partially_approved",
    "rejected",
    "approval_expired",
    "execution_started",
    "executed",
    "partially_executed",
    "execution_failed",
    "cancelled",
    "retention_eligible",
    "deleted",
] as const;

export type BatchStatus = (typeof BATCH_STATUSES)[number];

export const ENTITY_AUDIT_STATUSES = [
    "ready",
    "ready_with_warnings",
    "blocked",
    "approved",
    "rejected",
    "expired",
    "executed",
] as const;

export type EntityAuditStatus = (typeof ENTITY_AUDIT_STATUSES)[number];

export const APPROVAL_STATUSES = ["pending", "approved", "rejected", "expired", "revoked", "consumed"] as const;

export type ApprovalStatus = (typeof APPROVAL_STATUSES)[number];

export const ROW_EXECUTION_STATUSES = [
    "not_started",
    "attempted",
    "committed",
    "rolled_back",
    "failed_before_write",
    "skipped",
] as const;

export type RowExecutionStatus = (typeof ROW_EXECUTION_STATUSES)[number];

export const ATTEMPT_STATUSES = [
    "started",
    "committed",
    "rolled_back",
    "failed_before_write",
    "failed",
    "cancelled",
] as const;

export type AttemptStatus = (typeof ATTEMPT_STATUSES)[number];

export const CLEANUP_EVENT_STATUSES = ["started", "completed", "failed"] as const;

export type CleanupEventStatus = (typeof CLEANUP_EVENT_STATUSES)[number];

export type EntityType = "project_documentation" | "backlog";

export const APPROVAL_EVENT_TYPES = ["created", "approved", "rejected", "expired", "revoked", "consumed"] as const;

export type ApprovalEventType = (typeof APPROVAL_EVENT_TYPES)[number];

export type ApprovalEventInput = {
    eventType: ApprovalEventType;
    actor?: string | null;
    at?: string | null;
    eventCode?: string | null;
    safeReason?: string | null;
};

export type DryRunEntityRowSummary = {
    entityType: EntityType;
    status: "ready" | "ready_with_warnings" | "blocked";
    totalRows: number;
    newRows: number;
    duplicateRows: number;
    conflictRows: number;
    reviewRequiredRows: number;
    invalidRows: number;
    skippedRows: number;
};

export type PersistDryRunBatchInput = {
    dryRunId: string;
    schemaVersion: string;
    parserContractVersion: string;
    dryRunContractVersion: string;
    workbookId: string | null;
    batchReference: string | null;
    sourceSystem: string | null;
    sourceFilename: string | null;
    sourceFilenameSanitized: string | null;
    sourceFileHash: string;
    sourceFileSize: number;
    sourceMimeType: string | null;
    timezone: string | null;
    preparedBy: string | null;
    batchStatus: BatchStatus;
    projectDocumentationStatus: EntityAuditStatus | null;
    backlogStatus: EntityAuditStatus | null;
    totals: {
        totalRows: number;
        newRows: number;
        duplicateRows: number;
        conflictRows: number;
        reviewRequiredRows: number;
        invalidRows: number;
        skippedRows: number;
        warningCount: number;
        errorCount: number;
    };
};

export type PersistDryRunRowInput = {
    entityType: EntityType;
    worksheetName: string;
    sourceRowNumber: number;
    externalRowId: string | null;
    projectSlug: string | null;
    resolvedProjectId: string | null;
    parserStatus: "valid" | "valid_with_warnings" | "invalid" | "skipped";
    dryRunStatus: "new" | "duplicate" | "conflict" | "review_required" | "invalid" | "skipped";
    proposedOperation: "insert" | "none" | "manual_review";
    normalizedPayload: unknown | null;
    validationIssueCodes: string[];
    warningCount: number;
    errorCount: number;
    existingRecordReference: string | null;
};

export type PersistedDryRunBatch = {
    id: string;
    dryRunId: string;
    batchStatus: BatchStatus;
    sourceFileHash: string;
    createdAt: string;
    rowIds: string[];
};

export type ApprovalBinding = {
    batchId: string;
    entityType: EntityType;
    boundFileHash: string;
    boundDryRunId: string;
    boundSchemaVersion: string;
    boundParserContractVersion: string;
    boundDryRunContractVersion: string;
    approvalSummaryFingerprint: string;
};

export type AttemptAppendInput = {
    batchId: string;
    entityType: EntityType;
    approvalId: string | null;
    startedAt: string;
    eligibleRowCount: number;
    attemptedRowCount: number;
};

export type AttemptFinalizeInput = {
    status: AttemptStatus;
    finishedAt: string;
    committedRowCount?: number;
    skippedRowCount?: number;
    rolledBackRowCount?: number;
    failureCode?: string | null;
    safeFailureMessage?: string | null;
    transactionReference?: string | null;
};

export class AuditError extends Error {
    code: string;

    constructor(code: string, message: string) {
        super(message);
        this.name = "AuditError";
        this.code = code;
    }
}

export class AuditNotFoundError extends AuditError {
    constructor(message: string) {
        super("AUDIT_NOT_FOUND", message);
        this.name = "AuditNotFoundError";
    }
}

export class AuditTransitionError extends AuditError {
    constructor(from: string, to: string) {
        super("AUDIT_INVALID_TRANSITION", `Invalid transition ${from} -> ${to}`);
        this.name = "AuditTransitionError";
    }
}

export class AuditBindingMismatchError extends AuditError {
    constructor(message: string) {
        super("AUDIT_BINDING_MISMATCH", message);
        this.name = "AuditBindingMismatchError";
    }
}

export class AuditBlockedError extends AuditError {
    constructor(message: string) {
        super("AUDIT_ENTITY_BLOCKED", message);
        this.name = "AuditBlockedError";
    }
}
