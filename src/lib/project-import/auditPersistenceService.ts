// ---------------------------------------------------------------------------
// WorkOS Project Field Sheet v1 — Dry-run audit persistence service
// WORKOS-SHEET-GATE-4B
// ---------------------------------------------------------------------------

import type Database from "better-sqlite3";
import { createBatch } from "./auditBatchRepository";
import { insertBatchRows } from "./auditRowRepository";
import { AUDIT_PARSER_CONTRACT_VERSION, type PersistDryRunBatchInput, type PersistDryRunRowInput, type PersistedDryRunBatch } from "./auditTypes";
import { DRY_RUN_CONTRACT_VERSION, type WorkOSProjectFieldDryRunResult } from "./dryRunTypes";
import type { BatchStatus } from "./auditTypes";

export type PersistDryRunSource = {
    sourceFilename?: string;
    sourceFileSize: number;
    sourceMimeType: string;
};

export function sanitizeSourceFilename(name: string): string {
    const base = name.split(/[\\/]/).pop() ?? name;
    const cleaned = base.replace(/[^A-Za-z0-9._-]/g, "_").replace(/^\.+/, "").slice(0, 80);
    return cleaned || "workbook.xlsx";
}

function deriveBatchStatus(result: WorkOSProjectFieldDryRunResult): BatchStatus {
    if (result.workbookStatus === "invalid") return "dry_run_invalid";
    const docBlocked = result.entities.projectDocumentation.status === "blocked";
    const backlogBlocked = result.entities.backlog.status === "blocked";
    if (docBlocked || backlogBlocked) return "partially_ready";
    return "ready_for_approval";
}

export function persistWorkOSProjectFieldDryRun(
    db: Database.Database,
    result: WorkOSProjectFieldDryRunResult,
    source: PersistDryRunSource,
): PersistedDryRunBatch {
    const docRows = result.entities.projectDocumentation.rows;
    const backlogRows = result.entities.backlog.rows;

    const rowInputs: PersistDryRunRowInput[] = [...docRows, ...backlogRows].map((row) => ({
        entityType: row.entityType,
        worksheetName: row.sheetName,
        sourceRowNumber: row.sourceRowNumber,
        externalRowId: row.externalRowId,
        projectSlug: row.projectSlug,
        resolvedProjectId: row.projectId,
        parserStatus: row.parserStatus,
        dryRunStatus: row.dryRunStatus,
        proposedOperation: row.proposedOperation,
        normalizedPayload: row.normalizedData,
        validationIssueCodes: row.issues.map((issue) => issue.code),
        warningCount: row.issues.filter((issue) => issue.severity === "warning").length,
        errorCount: row.issues.filter((issue) => issue.severity === "error").length,
        existingRecordReference: row.existingRecordReference ?? null,
    }));

    const batchInput: PersistDryRunBatchInput = {
        dryRunId: result.dryRunId,
        schemaVersion: result.schemaVersion ?? "",
        parserContractVersion: AUDIT_PARSER_CONTRACT_VERSION,
        dryRunContractVersion: DRY_RUN_CONTRACT_VERSION,
        workbookId: result.metadata?.workbookId ?? null,
        batchReference: result.metadata?.batchReference ?? null,
        sourceSystem: result.metadata?.sourceSystem ?? null,
        sourceFilename: source.sourceFilename ?? null,
        sourceFilenameSanitized: source.sourceFilename ? sanitizeSourceFilename(source.sourceFilename) : null,
        sourceFileHash: result.fileHash,
        sourceFileSize: source.sourceFileSize,
        sourceMimeType: source.sourceMimeType,
        timezone: result.metadata?.timezone ?? null,
        preparedBy: result.metadata?.preparedBy ?? null,
        batchStatus: deriveBatchStatus(result),
        projectDocumentationStatus: result.entities.projectDocumentation.status,
        backlogStatus: result.entities.backlog.status,
        totals: {
            totalRows: result.totals.totalCandidateRows,
            newRows: result.totals.newRows,
            duplicateRows: result.totals.duplicateRows,
            conflictRows: result.totals.conflictRows,
            reviewRequiredRows: result.totals.reviewRequiredRows,
            invalidRows: result.totals.invalidRows,
            skippedRows: result.totals.skippedRows,
            warningCount: result.totals.warningCount,
            errorCount: result.totals.errorCount,
        },
    };

    let batchId = "";
    let rowIds: string[] = [];
    const transaction = db.transaction(() => {
        const batch = createBatch(db, batchInput);
        batchId = batch.id;
        rowIds = insertBatchRows(db, batchId, rowInputs);
    });
    transaction();

    return {
        id: batchId,
        dryRunId: result.dryRunId,
        batchStatus: batchInput.batchStatus,
        sourceFileHash: result.fileHash,
        createdAt: new Date().toISOString(),
        rowIds,
    };
}
