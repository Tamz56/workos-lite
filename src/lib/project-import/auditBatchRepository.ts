// ---------------------------------------------------------------------------
// WorkOS Project Field Sheet v1 — import_batches repository (intent-specific)
// WORKOS-SHEET-GATE-4B
// ---------------------------------------------------------------------------

import type Database from "better-sqlite3";
import { newBatchId } from "./auditIds";
import { assertBatchTransition, assertEntityStatusTransition } from "./auditLifecycle";
import type {
    BatchStatus,
    EntityAuditStatus,
    EntityType,
    PersistDryRunBatchInput,
} from "./auditTypes";
import { AuditNotFoundError } from "./auditTypes";

export type BatchRecord = {
    id: string;
    dry_run_id: string;
    schema_version: string;
    parser_contract_version: string;
    dry_run_contract_version: string;
    workbook_id: string | null;
    batch_reference: string | null;
    source_system: string | null;
    source_filename: string | null;
    source_filename_sanitized: string | null;
    source_file_hash: string;
    source_file_size: number;
    source_mime_type: string | null;
    timezone: string | null;
    prepared_by: string | null;
    batch_status: BatchStatus;
    project_documentation_status: EntityAuditStatus | null;
    backlog_status: EntityAuditStatus | null;
    total_rows: number;
    new_rows: number;
    duplicate_rows: number;
    conflict_rows: number;
    review_required_rows: number;
    invalid_rows: number;
    skipped_rows: number;
    warning_count: number;
    error_count: number;
    created_at: string;
    updated_at: string;
    retention_eligible_at: string | null;
    payload_purged_at: string | null;
    deleted_at: string | null;
};

function rowToBatch(row: unknown): BatchRecord {
    return row as BatchRecord;
}

export function createBatch(db: Database.Database, input: PersistDryRunBatchInput): BatchRecord {
    const id = newBatchId();
    db.prepare(`
        INSERT INTO import_batches (
            id, dry_run_id, schema_version, parser_contract_version, dry_run_contract_version,
            workbook_id, batch_reference, source_system, source_filename, source_filename_sanitized,
            source_file_hash, source_file_size, source_mime_type, timezone, prepared_by,
            batch_status, project_documentation_status, backlog_status,
            total_rows, new_rows, duplicate_rows, conflict_rows, review_required_rows, invalid_rows, skipped_rows,
            warning_count, error_count
        ) VALUES (
            @id, @dryRunId, @schemaVersion, @parserContractVersion, @dryRunContractVersion,
            @workbookId, @batchReference, @sourceSystem, @sourceFilename, @sourceFilenameSanitized,
            @sourceFileHash, @sourceFileSize, @sourceMimeType, @timezone, @preparedBy,
            @batchStatus, @projectDocumentationStatus, @backlogStatus,
            @totalRows, @newRows, @duplicateRows, @conflictRows, @reviewRequiredRows, @invalidRows, @skippedRows,
            @warningCount, @errorCount
        )
    `).run({
        id,
        dryRunId: input.dryRunId,
        schemaVersion: input.schemaVersion,
        parserContractVersion: input.parserContractVersion,
        dryRunContractVersion: input.dryRunContractVersion,
        workbookId: input.workbookId,
        batchReference: input.batchReference,
        sourceSystem: input.sourceSystem,
        sourceFilename: input.sourceFilename,
        sourceFilenameSanitized: input.sourceFilenameSanitized,
        sourceFileHash: input.sourceFileHash,
        sourceFileSize: input.sourceFileSize,
        sourceMimeType: input.sourceMimeType,
        timezone: input.timezone,
        preparedBy: input.preparedBy,
        batchStatus: input.batchStatus,
        projectDocumentationStatus: input.projectDocumentationStatus,
        backlogStatus: input.backlogStatus,
        totalRows: input.totals.totalRows,
        newRows: input.totals.newRows,
        duplicateRows: input.totals.duplicateRows,
        conflictRows: input.totals.conflictRows,
        reviewRequiredRows: input.totals.reviewRequiredRows,
        invalidRows: input.totals.invalidRows,
        skippedRows: input.totals.skippedRows,
        warningCount: input.totals.warningCount,
        errorCount: input.totals.errorCount,
    });
    return getBatch(db, id);
}

export function getBatch(db: Database.Database, id: string): BatchRecord {
    const row = db.prepare("SELECT * FROM import_batches WHERE id = ?").get(id);
    if (!row) throw new AuditNotFoundError(`Batch ${id} not found`);
    return rowToBatch(row);
}

export function listRecentBatches(db: Database.Database, limit = 50): BatchRecord[] {
    return db.prepare("SELECT * FROM import_batches ORDER BY created_at DESC LIMIT ?").all(limit) as BatchRecord[];
}

export function queryBatchByFileHash(db: Database.Database, fileHash: string): BatchRecord[] {
    return db.prepare("SELECT * FROM import_batches WHERE source_file_hash = ? ORDER BY created_at DESC").all(fileHash) as BatchRecord[];
}

export function queryBatchByDryRunId(db: Database.Database, dryRunId: string): BatchRecord[] {
    return db.prepare("SELECT * FROM import_batches WHERE dry_run_id = ? ORDER BY created_at DESC").all(dryRunId) as BatchRecord[];
}

export function updateBatchStatus(db: Database.Database, id: string, to: BatchStatus): BatchRecord {
    const current = getBatch(db, id);
    assertBatchTransition(current.batch_status, to);
    db.prepare("UPDATE import_batches SET batch_status = ? WHERE id = ?").run(to, id);
    return getBatch(db, id);
}

export function setEntityStatus(
    db: Database.Database,
    id: string,
    entityType: EntityType,
    to: EntityAuditStatus,
): BatchRecord {
    const current = getBatch(db, id);
    const column = entityType === "project_documentation" ? "project_documentation_status" : "backlog_status";
    const from = current[column];
    if (from !== null && from !== to) assertEntityStatusTransition(from, to);
    db.prepare(`UPDATE import_batches SET ${column} = ? WHERE id = ?`).run(to, id);
    return getBatch(db, id);
}

export function setRetentionEligible(db: Database.Database, id: string, eligibleAt: string): BatchRecord {
    db.prepare("UPDATE import_batches SET retention_eligible_at = ? WHERE id = ?").run(eligibleAt, id);
    return getBatch(db, id);
}
