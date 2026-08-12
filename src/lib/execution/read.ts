// ---------------------------------------------------------------------------
// WorkOS-Lite execution read surface (READ ONLY)
// AUTOMATION-001-P1D.2
// Builds a safe presentation DTO from persisted execution attempts. Never
// executes, never writes, never repairs state. The committed attempt row is
// the authoritative duplicate-write fact.
// ---------------------------------------------------------------------------

import type Database from "better-sqlite3";
import type { ExecutionAttemptRow } from "./types";

export type ExecutionAttemptPresentation = {
    attemptId: string;
    approvalId: string;
    status: "committed" | "failed_before_write" | "rolled_back";
    startedAt: string;
    finishedAt: string | null;
    targetTable: string | null;
    targetRecordId: string | null;
    failureCode: string | null;
    safeFailureMessage: string | null;
};

export type OperationExecutionPresentation = {
    committed: ExecutionAttemptPresentation | null;
    latestFailure: ExecutionAttemptPresentation | null;
};

function project(row: ExecutionAttemptRow): ExecutionAttemptPresentation {
    return {
        attemptId: row.id,
        approvalId: row.approval_id,
        status: row.execution_status as ExecutionAttemptPresentation["status"],
        startedAt: row.started_at,
        finishedAt: row.finished_at,
        targetTable: row.target_table,
        targetRecordId: row.target_record_id,
        failureCode: row.failure_code,
        safeFailureMessage: row.safe_failure_message,
    };
}

export function getOperationExecutionPresentation(
    db: Database.Database,
    operationId: string,
): OperationExecutionPresentation {
    const committed = db.prepare(`
        SELECT * FROM operation_execution_attempts
        WHERE operation_id = ? AND execution_status = 'committed'
        LIMIT 1
    `).get(operationId) as ExecutionAttemptRow | undefined;

    const latestFailure = db.prepare(`
        SELECT * FROM operation_execution_attempts
        WHERE operation_id = ? AND execution_status IN ('failed_before_write', 'rolled_back')
        ORDER BY created_at DESC, rowid DESC
        LIMIT 1
    `).get(operationId) as ExecutionAttemptRow | undefined;

    return {
        committed: committed ? project(committed) : null,
        latestFailure: latestFailure ? project(latestFailure) : null,
    };
}
