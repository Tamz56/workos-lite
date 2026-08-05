// ---------------------------------------------------------------------------
// WorkOS Project Field Sheet v1 — Parser canonical types
// WORKOS-SHEET-GATE-2
// ---------------------------------------------------------------------------

export type ImportIssueSeverity = "error" | "warning" | "info";
export type ImportIssueScope = "file" | "workbook" | "sheet" | "row" | "cell";

export interface ImportValidationIssue {
    code: string;
    severity: ImportIssueSeverity;
    scope: ImportIssueScope;
    message: string;
    sheetName?: string;
    rowNumber?: number;
    columnName?: string;
    rawValue?: unknown;
}

export type ParsedWorkbookMetadata = {
    schemaVersion: string;
    workbookId: string;
    batchReference: string;
    sourceSystem: string;
    exportTimestamp: string;
    timezone: string;
    preparedBy: string | null;
    notes: string | null;
};

export type ProjectDocumentationNormalizedData = {
    externalRowId: string;
    projectSlug: string;
    blockType: string;
    title: string;
    date: string;
    summary: string;
    details: string;
    evidenceLinks: string[];
    relatedFiles: string[];
    nextAction: string | null;
    status: string;
    orderIndex: number | null;
    sourceType: string | null;
    reviewedByUser: boolean;
};

export type BacklogNormalizedData = {
    externalRowId: string;
    projectSlug: string;
    title: string;
    status: string;
    priority: number | null;
    scheduleBucket: string | null;
    startDate: string | null;
    endDate: string | null;
    isMilestone: boolean;
    workstream: string | null;
    dodText: string | null;
    notes: string | null;
};

export type NormalizedImportRowClassification = "valid" | "valid_with_warnings" | "invalid" | "skipped";

export type NormalizedImportRow = {
    entityType: "project_documentation" | "backlog";
    worksheetName: string;
    sourceRowNumber: number;
    externalRowId: string;
    projectSlug: string;
    data: ProjectDocumentationNormalizedData | BacklogNormalizedData;
    rawValues: Record<string, unknown>;
    issues: ImportValidationIssue[];
    classification: NormalizedImportRowClassification;
};

export type ParsedEntitySheetResult = {
    sheetName: string;
    totalPhysicalRows: number;
    totalCandidateRows: number;
    blankRowsSkipped: number;
    rows: NormalizedImportRow[];
    issues: ImportValidationIssue[];
};

export type WorkbookParseResult = {
    ok: boolean;
    fileHash: string;
    schemaVersion: string | null;
    metadata: ParsedWorkbookMetadata | null;
    sheets: {
        projectDocumentation: ParsedEntitySheetResult;
        backlog: ParsedEntitySheetResult;
    };
    workbookIssues: ImportValidationIssue[];
    noWritePerformed: true;
};

export type ParserOptions = {
    rowLimit?: number;
    detailsMaxBytes?: number;
};
