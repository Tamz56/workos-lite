// ---------------------------------------------------------------------------
// WorkOS Project Field Sheet v1 — API-safe DTO types
// WORKOS-SHEET-GATE-5
// ---------------------------------------------------------------------------

export type SafeImportIssue = {
    code: string;
    severity: "error" | "warning" | "info";
    message: string;
    sheetName?: string;
    rowNumber?: number;
    columnName?: string;
};

export type DryRunEntityApiSummary = {
    entityType: "project_documentation" | "backlog";
    status: "ready" | "ready_with_warnings" | "blocked";
    totalRows: number;
    newRows: number;
    duplicateRows: number;
    conflictRows: number;
    reviewRequiredRows: number;
    invalidRows: number;
    skippedRows: number;
};

export type DryRunApiTotals = {
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

export type CreateDryRunApiResponse = {
    batchId: string;
    dryRunId: string;
    createdAt: string;
    source: {
        filename: string;
        sanitizedFilename: string;
        fileHashExcerpt: string;
        fileSize: number;
        mimeType: string;
        schemaVersion: string | null;
        workbookId: string | null;
        batchReference: string | null;
    };
    workbookStatus: "valid" | "valid_with_warnings" | "invalid";
    entities: {
        projectDocumentation: DryRunEntityApiSummary;
        backlog: DryRunEntityApiSummary;
    };
    totals: DryRunApiTotals;
    issues: SafeImportIssue[];
    noBusinessWritePerformed: true;
};

export type ImportBatchApiListItem = {
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

export type ImportBatchApiDetail = ImportBatchApiListItem & {
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
    approvals: ApprovalApiState[];
    executionAttempts: {
        count: number;
        byStatus: Record<string, number>;
    };
};

export type ImportBatchRowApiItem = {
    id: string;
    entityType: "project_documentation" | "backlog";
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

export type ApprovalEventApiItem = {
    id: string;
    eventType: string;
    actor: string | null;
    occurredAt: string | null;
    eventCode: string | null;
    safeReason: string | null;
};

export type ApprovalApiState = {
    entityType: "project_documentation" | "backlog";
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
    events: ApprovalEventApiItem[];
};

export type Paginated<T> = {
    items: T[];
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
};
