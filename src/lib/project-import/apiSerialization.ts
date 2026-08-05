// ---------------------------------------------------------------------------
// WorkOS Project Field Sheet v1 — API-safe serializers
// WORKOS-SHEET-GATE-5
// Never returns normalized payloads, raw cell values, workbook bytes, or
// internal fields. Timestamps are canonical ISO-8601.
// ---------------------------------------------------------------------------

import type { ImportValidationIssue } from "./types";
import type {
    ApprovalApiState,
    ApprovalEventApiItem,
    CreateDryRunApiResponse,
    DryRunEntityApiSummary,
    DryRunApiTotals,
    ImportBatchApiDetail,
    ImportBatchApiListItem,
    ImportBatchRowApiItem,
    SafeImportIssue,
} from "./apiTypes";
import type { BatchRecord } from "./auditBatchRepository";
import type { RowRecord } from "./auditRowRepository";
import type { ApprovalEventRecord, ApprovalRecord } from "./auditApprovalRepository";
import type { AttemptRecord } from "./auditExecutionRepository";
import type { PersistedDryRunBatch } from "./auditTypes";
import type { WorkOSProjectFieldDryRunResult } from "./dryRunTypes";
import { isApprovalValid } from "./auditLifecycle";
import { getRowIssueCodes } from "./auditRowRepository";

export function fileHashExcerpt(hash: string): string {
    return hash.slice(0, 12);
}

export function serializeSafeIssue(issue: ImportValidationIssue): SafeImportIssue {
    return {
        code: issue.code,
        severity: issue.severity,
        message: issue.message,
        ...(issue.sheetName ? { sheetName: issue.sheetName } : {}),
        ...(issue.rowNumber !== undefined ? { rowNumber: issue.rowNumber } : {}),
        ...(issue.columnName ? { columnName: issue.columnName } : {}),
    };
}

export function serializeDryRunResponse(
    persisted: PersistedDryRunBatch,
    result: WorkOSProjectFieldDryRunResult,
    source: { filename: string; sanitizedFilename: string; fileSize: number; mimeType: string },
): CreateDryRunApiResponse {
    const entitySummary = (entity: WorkOSProjectFieldDryRunResult["entities"]["projectDocumentation"]): DryRunEntityApiSummary => ({
        entityType: entity.entityType,
        status: entity.status,
        totalRows: entity.totalRows,
        newRows: entity.newRows,
        duplicateRows: entity.duplicateRows,
        conflictRows: entity.conflictRows,
        reviewRequiredRows: entity.reviewRequiredRows,
        invalidRows: entity.invalidRows,
        skippedRows: entity.skippedRows,
    });

    const totals: DryRunApiTotals = {
        totalPhysicalRows: result.totals.totalPhysicalRows,
        totalCandidateRows: result.totals.totalCandidateRows,
        validParserRows: result.totals.validParserRows,
        newRows: result.totals.newRows,
        duplicateRows: result.totals.duplicateRows,
        conflictRows: result.totals.conflictRows,
        reviewRequiredRows: result.totals.reviewRequiredRows,
        invalidRows: result.totals.invalidRows,
        skippedRows: result.totals.skippedRows,
        warningCount: result.totals.warningCount,
        errorCount: result.totals.errorCount,
    };

    const issues = [
        ...result.workbookIssues,
        ...result.entities.projectDocumentation.issues,
        ...result.entities.backlog.issues,
    ].map(serializeSafeIssue);

    return {
        batchId: persisted.id,
        dryRunId: result.dryRunId,
        createdAt: persisted.createdAt,
        source: {
            filename: source.filename,
            sanitizedFilename: source.sanitizedFilename,
            fileHashExcerpt: fileHashExcerpt(result.fileHash),
            fileSize: source.fileSize,
            mimeType: source.mimeType,
            schemaVersion: result.schemaVersion,
            workbookId: result.metadata?.workbookId ?? null,
            batchReference: result.metadata?.batchReference ?? null,
        },
        workbookStatus: result.workbookStatus,
        entities: {
            projectDocumentation: entitySummary(result.entities.projectDocumentation),
            backlog: entitySummary(result.entities.backlog),
        },
        totals,
        issues,
        noBusinessWritePerformed: true,
    };
}

export function serializeBatchListItem(batch: BatchRecord): ImportBatchApiListItem {
    return {
        id: batch.id,
        dryRunId: batch.dry_run_id,
        createdAt: batch.created_at,
        updatedAt: batch.updated_at,
        batchStatus: batch.batch_status,
        projectDocumentationStatus: batch.project_documentation_status,
        backlogStatus: batch.backlog_status,
        sourceFilenameSanitized: batch.source_filename_sanitized,
        sourceFileHashExcerpt: fileHashExcerpt(batch.source_file_hash),
        totals: {
            totalRows: batch.total_rows,
            newRows: batch.new_rows,
            duplicateRows: batch.duplicate_rows,
            conflictRows: batch.conflict_rows,
            reviewRequiredRows: batch.review_required_rows,
            invalidRows: batch.invalid_rows,
            skippedRows: batch.skipped_rows,
            warningCount: batch.warning_count,
            errorCount: batch.error_count,
        },
    };
}

export function serializeBatchDetail(
    batch: BatchRecord,
    approvals: ApprovalApiState[],
    attempts: AttemptRecord[],
): ImportBatchApiDetail {
    const listItem = serializeBatchListItem(batch);
    const byStatus: Record<string, number> = {};
    for (const attempt of attempts) {
        byStatus[attempt.execution_status] = (byStatus[attempt.execution_status] ?? 0) + 1;
    }
    return {
        ...listItem,
        schemaVersion: batch.schema_version,
        parserContractVersion: batch.parser_contract_version,
        dryRunContractVersion: batch.dry_run_contract_version,
        workbookId: batch.workbook_id,
        batchReference: batch.batch_reference,
        sourceSystem: batch.source_system,
        sourceMimeType: batch.source_mime_type,
        timezone: batch.timezone,
        retention: {
            retentionEligibleAt: batch.retention_eligible_at,
            payloadPurgedAt: batch.payload_purged_at,
            deletedAt: batch.deleted_at,
        },
        approvals,
        executionAttempts: {
            count: attempts.length,
            byStatus,
        },
    };
}

export function serializeRowItem(row: RowRecord): ImportBatchRowApiItem {
    return {
        id: row.id,
        entityType: row.entity_type,
        worksheetName: row.worksheet_name,
        sourceRowNumber: row.source_row_number,
        externalRowId: row.external_row_id,
        projectSlug: row.project_slug,
        resolvedProjectId: row.resolved_project_id,
        parserStatus: row.parser_status,
        dryRunStatus: row.dry_run_status,
        proposedOperation: row.proposed_operation,
        warningCount: row.warning_count,
        errorCount: row.error_count,
        issueCodes: getRowIssueCodes(row),
        existingRecordReference: row.existing_record_reference,
        executionStatus: row.execution_status,
        targetRecordId: row.target_record_id,
    };
}

export function serializeApprovalEvent(event: ApprovalEventRecord): ApprovalEventApiItem {
    return {
        id: event.id,
        eventType: event.event_type,
        actor: event.actor,
        occurredAt: event.occurred_at,
        eventCode: event.event_code,
        safeReason: event.safe_reason,
    };
}

export function serializeApprovalState(
    approval: ApprovalRecord,
    events: ApprovalEventRecord[],
    now: string,
): ApprovalApiState {
    const expiredByTtl = approval.approval_status === "approved" && approval.expires_at !== null && approval.expires_at <= now;
    const effectiveStatus = expiredByTtl ? "expired" : approval.approval_status;
    return {
        entityType: approval.entity_type,
        approvalId: approval.id,
        effectiveStatus,
        approvedBy: approval.approved_by,
        approvedAt: approval.approved_at,
        expiresAt: approval.expires_at,
        rejectedBy: approval.rejected_by,
        rejectedAt: approval.rejected_at,
        revokedBy: approval.revoked_by,
        revokedAt: approval.revoked_at,
        consumedAt: approval.consumed_at,
        validityAt: now,
        isValidNow: isApprovalValid(approval.approval_status, approval.expires_at, now),
        bindingFingerprintExcerpt: approval.approval_summary_fingerprint.slice(0, 12),
        events: events.map(serializeApprovalEvent),
    };
}
