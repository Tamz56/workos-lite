// ---------------------------------------------------------------------------
// WorkOS Project Field Sheet v1 — Execute Import API serialization and
// typed error-to-HTTP mapping.
// WORKOS-SHEET-GATE-7A
// Never returns normalized payloads, SQL, stack traces, or local paths.
// ---------------------------------------------------------------------------

import { ProjectImportApiError } from "./apiErrors";
import type { EntityType } from "./auditTypes";
import {
    ExecutionError,
    EXECUTION_ERROR_CODES,
    type ExecutionErrorCode,
} from "./executionErrors";
import type { ExecuteImportEntityResult } from "./executionTypes";
import type { ExecuteImportApiData, ExecuteImportApiResponse } from "./executeApiTypes";

export function serializeExecuteApiResponse(result: ExecuteImportEntityResult): ExecuteImportApiResponse {
    const data: ExecuteImportApiData = {
        batchId: result.batchId,
        entityType: result.entityType,
        approvalId: result.approvalId,
        executionAttemptId: result.executionAttemptId,
        status: result.status,
        insertedCount: result.insertedCount,
        skippedCount: result.skippedCount,
        targetRecordIds: result.targetRecordIds,
        startedAt: result.startedAt,
        finishedAt: result.finishedAt,
        approvalConsumed: result.approvalConsumed,
        transactionCommitted: result.transactionCommitted,
    };
    return { ok: true, data };
}

const CONFLICT_CODES = new Set<ExecutionErrorCode>([
    EXECUTION_ERROR_CODES.APPROVAL_EXPIRED,
    EXECUTION_ERROR_CODES.APPROVAL_REVOKED,
    EXECUTION_ERROR_CODES.APPROVAL_CONSUMED,
    EXECUTION_ERROR_CODES.APPROVAL_BINDING_MISMATCH,
    EXECUTION_ERROR_CODES.ENTITY_BLOCKED,
    EXECUTION_ERROR_CODES.NO_ELIGIBLE_ROWS,
    EXECUTION_ERROR_CODES.ALREADY_COMPLETED,
    EXECUTION_ERROR_CODES.ALREADY_IN_PROGRESS,
    EXECUTION_ERROR_CODES.STALE_PROJECT,
    EXECUTION_ERROR_CODES.STALE_DUPLICATE,
    EXECUTION_ERROR_CODES.STALE_CONFLICT,
    EXECUTION_ERROR_CODES.STALE_REVIEW_REQUIRED,
]);

const NOT_FOUND_CODES = new Set<ExecutionErrorCode>([
    EXECUTION_ERROR_CODES.BATCH_NOT_FOUND,
    EXECUTION_ERROR_CODES.APPROVAL_NOT_FOUND,
]);

const BAD_REQUEST_CODES = new Set<ExecutionErrorCode>([
    EXECUTION_ERROR_CODES.INVALID_ENTITY,
]);

export function toExecuteApiError(error: unknown): ProjectImportApiError {
    if (error instanceof ProjectImportApiError) {
        return error;
    }
    if (error instanceof ExecutionError) {
        if (BAD_REQUEST_CODES.has(error.code)) {
            return new ProjectImportApiError(error.code, error.message, 400);
        }
        if (NOT_FOUND_CODES.has(error.code)) {
            return new ProjectImportApiError(error.code, error.message, 404);
        }
        if (CONFLICT_CODES.has(error.code)) {
            return new ProjectImportApiError(error.code, error.message, 409);
        }
        return new ProjectImportApiError(error.code, "Import execution failed", 500);
    }
    return new ProjectImportApiError("EXECUTION_INTERNAL_ERROR", "An unexpected execution error occurred", 500);
}

export function assertEntityTypeValue(value: string): asserts value is EntityType {
    if (value !== "project_documentation" && value !== "backlog") {
        throw new ProjectImportApiError("INVALID_IMPORT_ENTITY", "Invalid entity type", 400);
    }
}
