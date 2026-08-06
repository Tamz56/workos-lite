// ---------------------------------------------------------------------------
// WorkOS Project Field Sheet v1 — Import UI client types
// WORKOS-SHEET-GATE-7B
// Client-side mirrors of the Gate 5 / Gate 7A API DTOs. These types are for
// UI rendering only; they never carry normalized payloads or raw cells.
// ---------------------------------------------------------------------------

export type ImportEntityType = "project_documentation" | "backlog";

export type UiDryRunSource = {
    filename: string;
    sanitizedFilename: string;
    fileHashExcerpt: string;
    fileSize: number;
    mimeType: string;
    schemaVersion: string | null;
    workbookId: string | null;
    batchReference: string | null;
};

export type UiDryRunEntitySummary = {
    entityType: ImportEntityType;
    status: "ready" | "ready_with_warnings" | "blocked";
    totalRows: number;
    newRows: number;
    duplicateRows: number;
    conflictRows: number;
    reviewRequiredRows: number;
    invalidRows: number;
    skippedRows: number;
};

export type UiDryRunTotals = {
    totalPhysicalRows: number;
    totalCandidateRows: number;
    validParserRows: number;
    newRows: number;
    duplicateRows: number;
    conflictRows: number;
    reviewRequiredRows: number;
    invalidRows: number;
    skippedRows: number;
    warningCount: number;
    errorCount: number;
};

export type UiSafeIssue = {
    code: string;
    severity: "error" | "warning" | "info";
    message: string;
    sheetName?: string;
    rowNumber?: number;
    columnName?: string;
};

export type UiDryRunResponse = {
    batchId: string;
    dryRunId: string;
    createdAt: string;
    source: UiDryRunSource;
    workbookStatus: "valid" | "valid_with_warnings" | "invalid";
    entities: {
        projectDocumentation: UiDryRunEntitySummary;
        backlog: UiDryRunEntitySummary;
    };
    totals: UiDryRunTotals;
    issues: UiSafeIssue[];
    noBusinessWritePerformed: true;
};

export type UiBatchListItem = {
    id: string;
    dryRunId: string;
    createdAt: string;
    updatedAt: string;
    batchStatus: string;
    projectDocumentationStatus: string | null;
    backlogStatus: string | null;
    sourceFilenameSanitized: string | null;
    sourceFileHashExcerpt: string;
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

export type UiApprovalEvent = {
    id: string;
    eventType: string;
    actor: string | null;
    occurredAt: string | null;
    eventCode: string | null;
    safeReason: string | null;
};

export type UiApprovalState = {
    entityType: ImportEntityType;
    approvalId: string | null;
    effectiveStatus: string;
    approvedBy: string | null;
    approvedAt: string | null;
    expiresAt: string | null;
    rejectedBy: string | null;
    rejectedAt: string | null;
    revokedBy: string | null;
    revokedAt: string | null;
    consumedAt: string | null;
    validityAt: string;
    isValidNow: boolean;
    bindingFingerprintExcerpt: string;
    events: UiApprovalEvent[];
};

export type UiBatchDetail = UiBatchListItem & {
    schemaVersion: string;
    parserContractVersion: string;
    dryRunContractVersion: string;
    workbookId: string | null;
    batchReference: string | null;
    sourceSystem: string | null;
    sourceMimeType: string | null;
    timezone: string | null;
    retention: {
        retentionEligibleAt: string | null;
        payloadPurgedAt: string | null;
        deletedAt: string | null;
    };
    approvals: UiApprovalState[];
    executionAttempts: {
        count: number;
        byStatus: Record<string, number>;
    };
};

export type UiBatchRowItem = {
    id: string;
    entityType: ImportEntityType;
    worksheetName: string;
    sourceRowNumber: number;
    externalRowId: string | null;
    projectSlug: string | null;
    resolvedProjectId: string | null;
    parserStatus: string;
    dryRunStatus: string;
    proposedOperation: string;
    warningCount: number;
    errorCount: number;
    issueCodes: string[];
    existingRecordReference: string | null;
    executionStatus: string;
    targetRecordId: string | null;
};

export type UiPaginated<T> = {
    items: T[];
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
};

export type UiExecuteResult = {
    batchId: string;
    entityType: ImportEntityType;
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

export type UiApiErrorBody = {
    ok: false;
    error: {
        code: string;
        message: string;
        status: number;
        requestId?: string;
        details?: Array<{ code: string; message: string }>;
    };
};
