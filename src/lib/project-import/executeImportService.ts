// ---------------------------------------------------------------------------
// WorkOS Project Field Sheet v1 — Execute Import service (internal, insert-only)
// WORKOS-SHEET-GATE-6
// All inputs except identifiers and the server actor are loaded from persisted
// audit state. One atomic transaction per entity. No public route in this Gate.
// ---------------------------------------------------------------------------

import type Database from "better-sqlite3";
import { getBatch, setEntityStatus, updateBatchStatus } from "./auditBatchRepository";
import { listRowsByBatchEntity, updateRowExecutionStatus } from "./auditRowRepository";
import {
    approvalSummaryFingerprint,
    consumeApproval,
    deriveEffectiveApprovalState,
    getApproval,
    listApprovalHistory,
} from "./auditApprovalRepository";
import { appendAttempt, finalizeAttempt, listAttempts } from "./auditExecutionRepository";
import { ExecutionError, EXECUTION_ERROR_CODES, type ExecutionErrorCode } from "./executionErrors";
import { revalidateBacklogRow, revalidateDocumentationRow, revalidateProject } from "./executionRevalidation";
import { insertDocumentationBlock } from "./projectDocumentationWriteAdapter";
import { insertBacklogItem } from "./backlogWriteAdapter";
import { serializeExecutionResult } from "./executionResultSerializer";
import type { EntityType } from "./auditTypes";
import type { ExecuteImportEntityInput, ExecuteImportEntityResult } from "./executionTypes";

export type ExecuteServiceDeps = {
    db: Database.Database;
    now?: string;
};

function nowIso(deps: ExecuteServiceDeps): string {
    return deps.now ?? new Date().toISOString();
}

function assertEntityType(value: EntityType): void {
    if (value !== "project_documentation" && value !== "backlog") {
        throw new ExecutionError(EXECUTION_ERROR_CODES.INVALID_ENTITY, "Invalid entity type");
    }
}

function entityStatusColumn(entityType: EntityType): "project_documentation_status" | "backlog_status" {
    return entityType === "project_documentation" ? "project_documentation_status" : "backlog_status";
}

function advanceBatchToExecutionStarted(db: Database.Database, batchId: string): void {
    let status = getBatch(db, batchId).batch_status;
    if (status === "ready_for_approval") {
        updateBatchStatus(db, batchId, "approved");
        status = "approved";
    } else if (status === "partially_ready") {
        updateBatchStatus(db, batchId, "partially_approved");
        status = "partially_approved";
    }
    if (status === "approved" || status === "partially_approved") {
        updateBatchStatus(db, batchId, "execution_started");
    }
}

function finalizeAttemptSafe(
    db: Database.Database,
    attemptId: string,
    input: Parameters<typeof finalizeAttempt>[2],
): void {
    try {
        finalizeAttempt(db, attemptId, input);
    } catch {
        // Attempt finalization must never mask the original execution error.
    }
}

export function executeApprovedImportEntity(
    input: ExecuteImportEntityInput,
    deps: ExecuteServiceDeps,
): ExecuteImportEntityResult {
    const db = deps.db;
    const now = nowIso(deps);
    assertEntityType(input.entityType);

    // 1. Batch
    let batch;
    try {
        batch = getBatch(db, input.batchId);
    } catch {
        throw new ExecutionError(EXECUTION_ERROR_CODES.BATCH_NOT_FOUND, "Batch not found");
    }

    // 2. No committed / in-progress execution
    const attempts = listAttempts(db, input.batchId, input.entityType);
    if (attempts.some((attempt) => attempt.execution_status === "committed")) {
        throw new ExecutionError(EXECUTION_ERROR_CODES.ALREADY_COMPLETED, "Execution already completed for this entity");
    }
    if (attempts.some((attempt) => attempt.execution_status === "started")) {
        throw new ExecutionError(EXECUTION_ERROR_CODES.ALREADY_IN_PROGRESS, "Execution already in progress for this entity");
    }

    // 3. Entity approved
    const entityColumn = entityStatusColumn(input.entityType);
    if (batch[entityColumn] !== "approved") {
        throw new ExecutionError(EXECUTION_ERROR_CODES.ENTITY_BLOCKED, "Entity is not approved for execution");
    }

    // 4. Approval exists and belongs to batch/entity
    let approval;
    try {
        approval = getApproval(db, input.approvalId);
    } catch {
        throw new ExecutionError(EXECUTION_ERROR_CODES.APPROVAL_NOT_FOUND, "Approval not found");
    }
    if (approval.batch_id !== input.batchId || approval.entity_type !== input.entityType) {
        throw new ExecutionError(EXECUTION_ERROR_CODES.APPROVAL_NOT_FOUND, "Approval does not belong to this batch and entity");
    }

    // 5. Effective approval state + TTL
    const effective = deriveEffectiveApprovalState(db, approval.id);
    if (effective !== "approved") {
        if (effective === "expired") {
            throw new ExecutionError(EXECUTION_ERROR_CODES.APPROVAL_EXPIRED, "Approval has expired");
        }
        if (effective === "revoked") {
            throw new ExecutionError(EXECUTION_ERROR_CODES.APPROVAL_REVOKED, "Approval has been revoked");
        }
        if (effective === "consumed") {
            throw new ExecutionError(EXECUTION_ERROR_CODES.APPROVAL_CONSUMED, "Approval has already been consumed");
        }
        throw new ExecutionError(EXECUTION_ERROR_CODES.APPROVAL_NOT_FOUND, "Approval is not valid for execution");
    }
    if (approval.expires_at !== null && approval.expires_at <= now) {
        throw new ExecutionError(EXECUTION_ERROR_CODES.APPROVAL_EXPIRED, "Approval has expired");
    }

    // 6. Blocking rows + eligible rows
    const rows = listRowsByBatchEntity(db, input.batchId, input.entityType);
    if (rows.some((row) => ["invalid", "conflict", "review_required"].includes(row.dry_run_status))) {
        throw new ExecutionError(EXECUTION_ERROR_CODES.ENTITY_BLOCKED, "Entity contains blocking rows");
    }
    const eligible = rows.filter((row) => row.dry_run_status === "new" && row.proposed_operation === "insert");
    if (eligible.length === 0) {
        throw new ExecutionError(EXECUTION_ERROR_CODES.NO_ELIGIBLE_ROWS, "Entity has no eligible new rows");
    }

    // 7. Binding match
    const fingerprint = approvalSummaryFingerprint(rows, input.entityType);
    const bindingMatches =
        batch.source_file_hash === approval.bound_file_hash &&
        batch.dry_run_id === approval.bound_dry_run_id &&
        batch.schema_version === approval.bound_schema_version &&
        batch.parser_contract_version === approval.bound_parser_contract_version &&
        batch.dry_run_contract_version === approval.bound_dry_run_contract_version &&
        fingerprint === approval.approval_summary_fingerprint;
    if (!bindingMatches) {
        throw new ExecutionError(EXECUTION_ERROR_CODES.APPROVAL_BINDING_MISMATCH, "Approval binding does not match the batch");
    }

    // 8. Start attempt (before business transaction)
    const attempt = appendAttempt(db, {
        batchId: input.batchId,
        entityType: input.entityType,
        approvalId: approval.id,
        startedAt: now,
        eligibleRowCount: eligible.length,
        attemptedRowCount: 0,
    });

    const insertedIds: string[] = [];
    let revalidationFailed = false;
    let rollbackCode: ExecutionErrorCode = EXECUTION_ERROR_CODES.TRANSACTION_ROLLED_BACK;

    try {
        const transaction = db.transaction(() => {
            // 9. Revalidate every eligible row inside the transaction
            for (const row of eligible) {
                try {
                    revalidateProject(db, row);
                    if (input.entityType === "project_documentation") {
                        revalidateDocumentationRow(db, row);
                    } else {
                        revalidateBacklogRow(db, row);
                    }
                } catch (error) {
                    revalidationFailed = true;
                    if (error instanceof ExecutionError) {
                        rollbackCode = error.code;
                    }
                    throw error;
                }
            }

            // 10. Insert all eligible rows
            for (const row of eligible) {
                updateRowExecutionStatus(db, row.id, "attempted", {
                    retryCount: attempt.attempt_number,
                    lastAttemptReference: attempt.id,
                });
                const targetId =
                    input.entityType === "project_documentation"
                        ? insertDocumentationBlock(db, row, input.batchId)
                        : insertBacklogItem(db, row);
                insertedIds.push(targetId);
                updateRowExecutionStatus(db, row.id, "committed", {
                    targetTable: input.entityType === "project_documentation" ? "project_doc_blocks" : "project_items",
                    targetRecordId: targetId,
                    executedAt: now,
                    retryCount: attempt.attempt_number,
                    lastAttemptReference: attempt.id,
                });
            }

            // 11. Consume approval in the same transaction
            consumeApproval(db, approval.id, now);

            // 12. Lifecycle
            advanceBatchToExecutionStarted(db, input.batchId);
            setEntityStatus(db, input.batchId, input.entityType, "executed");
            const otherColumn = input.entityType === "project_documentation" ? "backlog_status" : "project_documentation_status";
            const otherStatus = getBatch(db, input.batchId)[otherColumn];
            updateBatchStatus(db, input.batchId, otherStatus === "executed" ? "executed" : "partially_executed");

            // 13. Finalize the attempt as committed inside the same entity transaction.
            // This makes the attempt committed atomic with business inserts, audit
            // target linkage, approval consumption, and lifecycle updates.
            finalizeAttempt(db, attempt.id, {
                status: "committed",
                finishedAt: now,
                committedRowCount: insertedIds.length,
                skippedRowCount: eligible.length - insertedIds.length,
                transactionReference: attempt.id,
            });
        });
        transaction();
    } catch (error) {
        const attemptStatus = revalidationFailed ? "failed_before_write" : "rolled_back";
        finalizeAttemptSafe(db, attempt.id, {
            status: attemptStatus,
            finishedAt: now,
            rolledBackRowCount: revalidationFailed ? 0 : eligible.length,
            failureCode: error instanceof ExecutionError ? error.code : rollbackCode,
            safeFailureMessage: "Entity execution rolled back",
            transactionReference: attempt.id,
        });
        if (error instanceof ExecutionError) throw error;
        throw new ExecutionError(rollbackCode, "Entity execution failed");
    }

    return serializeExecutionResult({
        batchId: input.batchId,
        entityType: input.entityType,
        approvalId: approval.id,
        executionAttemptId: attempt.id,
        insertedCount: insertedIds.length,
        skippedCount: eligible.length - insertedIds.length,
        targetRecordIds: insertedIds,
        startedAt: now,
        finishedAt: now,
    });
}

/**
 * Source-of-truth invariant: if the approval is consumed and any eligible audit
 * row is committed with a target record ID, the entity must be treated as
 * committed even if an execution-attempt finalization is incomplete.
 * A stale `started` attempt alone must never imply "safe retry".
 */
export function isEntityCommittedBySourceOfTruth(
    db: Database.Database,
    batchId: string,
    entityType: EntityType,
): boolean {
    const approvals = listApprovalHistory(db, batchId, entityType);
    const consumed = approvals.some((approval) => approval.approval_status === "consumed");
    const rows = listRowsByBatchEntity(db, batchId, entityType);
    const committedRows = rows.some(
        (row) => row.execution_status === "committed" && row.target_record_id !== null,
    );
    return consumed && committedRows;
}
