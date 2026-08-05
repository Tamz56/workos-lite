// ---------------------------------------------------------------------------
// WorkOS Project Field Sheet v1 — import_batch_rows repository
// WORKOS-SHEET-GATE-4B
// ---------------------------------------------------------------------------

import type Database from "better-sqlite3";
import { newRowId } from "./auditIds";
import { assertRowExecutionTransition } from "./auditLifecycle";
import type { EntityType, PersistDryRunRowInput, RowExecutionStatus } from "./auditTypes";
import { AuditNotFoundError } from "./auditTypes";
import { parseCanonicalJson, serializeCanonicalJson } from "./auditSerialization";

export type RowRecord = {
    id: string;
    batch_id: string;
    entity_type: EntityType;
    worksheet_name: string;
    source_row_number: number;
    external_row_id: string | null;
    project_slug: string | null;
    resolved_project_id: string | null;
    parser_status: string;
    dry_run_status: string;
    proposed_operation: string;
    normalized_payload_json: string | null;
    validation_issue_codes_json: string;
    warning_count: number;
    error_count: number;
    existing_record_reference: string | null;
    target_table: string | null;
    target_record_id: string | null;
    execution_status: RowExecutionStatus;
    execution_error_code: string | null;
    executed_at: string | null;
    retry_count: number;
    last_attempt_reference: string | null;
    created_at: string;
    updated_at: string;
};

export function insertBatchRows(db: Database.Database, batchId: string, rows: PersistDryRunRowInput[]): string[] {
    const stmt = db.prepare(`
        INSERT INTO import_batch_rows (
            id, batch_id, entity_type, worksheet_name, source_row_number, external_row_id,
            project_slug, resolved_project_id, parser_status, dry_run_status, proposed_operation,
            normalized_payload_json, validation_issue_codes_json, warning_count, error_count,
            existing_record_reference
        ) VALUES (
            @id, @batchId, @entityType, @worksheetName, @sourceRowNumber, @externalRowId,
            @projectSlug, @resolvedProjectId, @parserStatus, @dryRunStatus, @proposedOperation,
            @normalizedPayloadJson, @validationIssueCodesJson, @warningCount, @errorCount,
            @existingRecordReference
        )
    `);
    const ids: string[] = [];
    for (const row of rows) {
        const id = newRowId();
        stmt.run({
            id,
            batchId,
            entityType: row.entityType,
            worksheetName: row.worksheetName,
            sourceRowNumber: row.sourceRowNumber,
            externalRowId: row.externalRowId,
            projectSlug: row.projectSlug,
            resolvedProjectId: row.resolvedProjectId,
            parserStatus: row.parserStatus,
            dryRunStatus: row.dryRunStatus,
            proposedOperation: row.proposedOperation,
            normalizedPayloadJson: row.normalizedPayload === null ? null : serializeCanonicalJson(row.normalizedPayload),
            validationIssueCodesJson: serializeCanonicalJson(row.validationIssueCodes),
            warningCount: row.warningCount,
            errorCount: row.errorCount,
            existingRecordReference: row.existingRecordReference,
        });
        ids.push(id);
    }
    return ids;
}

export function listRowsByBatchEntity(db: Database.Database, batchId: string, entityType: EntityType): RowRecord[] {
    return db.prepare("SELECT * FROM import_batch_rows WHERE batch_id = ? AND entity_type = ? ORDER BY source_row_number ASC").all(batchId, entityType) as RowRecord[];
}

export function updateRowExecutionStatus(
    db: Database.Database,
    rowId: string,
    to: RowExecutionStatus,
    fields: {
        targetTable?: string | null;
        targetRecordId?: string | null;
        executedAt?: string | null;
        errorCode?: string | null;
        retryCount?: number;
        lastAttemptReference?: string | null;
    } = {},
): RowRecord {
    const current = db.prepare("SELECT * FROM import_batch_rows WHERE id = ?").get(rowId) as RowRecord | undefined;
    if (!current) throw new AuditNotFoundError(`Row ${rowId} not found`);
    assertRowExecutionTransition(current.execution_status, to);
    db.prepare(`
        UPDATE import_batch_rows SET
            execution_status = @to,
            target_table = COALESCE(@targetTable, target_table),
            target_record_id = COALESCE(@targetRecordId, target_record_id),
            executed_at = COALESCE(@executedAt, executed_at),
            execution_error_code = @errorCode,
            retry_count = @retryCount,
            last_attempt_reference = @lastAttemptReference
        WHERE id = @rowId
    `).run({
        to,
        targetTable: fields.targetTable ?? null,
        targetRecordId: fields.targetRecordId ?? null,
        executedAt: fields.executedAt ?? null,
        errorCode: fields.errorCode ?? null,
        retryCount: fields.retryCount ?? current.retry_count,
        lastAttemptReference: fields.lastAttemptReference ?? null,
        rowId,
    });
    return db.prepare("SELECT * FROM import_batch_rows WHERE id = ?").get(rowId) as RowRecord;
}

export function findPriorBacklogProvenance(db: Database.Database, projectId: string, externalRowId: string): RowRecord[] {
    return db.prepare(
        "SELECT * FROM import_batch_rows WHERE resolved_project_id = ? AND entity_type = 'backlog' AND external_row_id = ? ORDER BY created_at DESC",
    ).all(projectId, externalRowId) as RowRecord[];
}

export function getRowPayload<T>(row: RowRecord): T | null {
    if (row.normalized_payload_json === null) return null;
    return parseCanonicalJson<T>(row.normalized_payload_json);
}

export function getRowIssueCodes(row: RowRecord): string[] {
    return parseCanonicalJson<string[]>(row.validation_issue_codes_json);
}
