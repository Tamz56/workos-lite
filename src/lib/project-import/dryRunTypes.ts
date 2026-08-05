// ---------------------------------------------------------------------------
// WorkOS Project Field Sheet v1 — Dry-run canonical types
// WORKOS-SHEET-GATE-3
// ---------------------------------------------------------------------------

import type { ImportValidationIssue, NormalizedImportRow, ParsedWorkbookMetadata } from "./types";
import type Database from "better-sqlite3";

export const DRY_RUN_CONTRACT_VERSION = "workos-sheet-dry-run-v1";

export type RunWorkOSProjectFieldDryRunInput = {
    workbook: Buffer;
    sourceFilename?: string;
};

export type DryRunOptions = {
    db?: Database.Database;
};

export type DryRunEntityStatus = "ready" | "ready_with_warnings" | "blocked";

export type DryRunRowStatus = "new" | "duplicate" | "conflict" | "review_required" | "invalid" | "skipped";

export type DryRunProposedOperation = "insert" | "none" | "manual_review";

export type DryRunRowResult = {
    entityType: "project_documentation" | "backlog";
    sheetName: string;
    sourceRowNumber: number;
    externalRowId: string | null;
    projectSlug: string | null;
    projectId: string | null;
    parserStatus: "valid" | "valid_with_warnings" | "invalid" | "skipped";
    dryRunStatus: DryRunRowStatus;
    proposedOperation: DryRunProposedOperation;
    normalizedData: unknown | null;
    existingRecordReference?: string | null;
    issues: ImportValidationIssue[];
};

export type DryRunEntityResult = {
    entityType: "project_documentation" | "backlog";
    sheetName: string;
    status: DryRunEntityStatus;
    totalRows: number;
    validRows: number;
    newRows: number;
    duplicateRows: number;
    conflictRows: number;
    reviewRequiredRows: number;
    invalidRows: number;
    skippedRows: number;
    rows: DryRunRowResult[];
    issues: ImportValidationIssue[];
};

export type DryRunTotals = {
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

export type WorkOSProjectFieldDryRunResult = {
    dryRunId: string;
    generatedAt: string;
    fileHash: string;
    sourceFilename: string | null;
    schemaVersion: string | null;
    metadata: ParsedWorkbookMetadata | null;
    workbookStatus: "valid" | "valid_with_warnings" | "invalid";
    entities: {
        projectDocumentation: DryRunEntityResult;
        backlog: DryRunEntityResult;
    };
    workbookIssues: ImportValidationIssue[];
    totals: DryRunTotals;
    noWritePerformed: true;
};

// Read-only database row shapes (subset of the real tables needed for classification)

export type DryRunProjectDocumentationRow = {
    id: string;
    project_id: string;
    legacy_project_slug: string | null;
    import_source: string | null;
    import_batch_id: string | null;
    migrated_at: string | null;
    source_row_number: number | null;
    source_record_id: string | null;
    block_type: string;
    title: string;
    block_date: string;
    summary: string;
    details_md: string;
    evidence_links_json: string;
    related_files_json: string;
    next_action: string | null;
    status: string;
    order_index: number | null;
    source_text: string | null;
    source_excerpt: string | null;
    source_type: string | null;
    generated_by: string | null;
    reviewed_by_user: number;
    applied_at: string | null;
    created_at: string;
    updated_at: string;
};

export type DryRunBacklogItemRow = {
    id: string;
    project_id: string;
    title: string;
    status: string;
    priority: number | null;
    schedule_bucket: string | null;
    start_date: string | null;
    end_date: string | null;
    is_milestone: number;
    workstream: string | null;
    dod_text: string | null;
    notes: string | null;
};

export type DryRunReadAdapter = {
    resolveProjectBySlug(slug: string): Array<{ id: string; slug: string }>;
    findDocumentationBlocksByProject(projectId: string): DryRunProjectDocumentationRow[];
    findDocumentationBlocksByIdentity(projectId: string, sourceRecordId: string): DryRunProjectDocumentationRow[];
    findDocumentationDuplicateCandidates(projectId: string, title: string, date: string): DryRunProjectDocumentationRow[];
    findBacklogItemsByProject(projectId: string): DryRunBacklogItemRow[];
};

export type NormalizedRowWithParserStatus = NormalizedImportRow;
