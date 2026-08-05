// ---------------------------------------------------------------------------
// WorkOS Project Field Sheet v1 — import_execution_attempts repository (append-only)
// WORKOS-SHEET-GATE-4B
// ---------------------------------------------------------------------------

import type Database from "better-sqlite3";
import { newAttemptId } from "./auditIds";
import { assertAttemptTransition } from "./auditLifecycle";
import type {
    AttemptAppendInput,
    AttemptFinalizeInput,
    AttemptStatus,
    EntityType,
} from "./auditTypes";
import { AuditNotFoundError } from "./auditTypes";

export type AttemptRecord = {
    id: string;
    batch_id: string;
    entity_type: EntityType;
    approval_id: string | null;
    attempt_number: number;
    execution_status: AttemptStatus;
    started_at: string | null;
    finished_at: string | null;
    eligible_row_count: number;
    attempted_row_count: number;
    committed_row_count: number;
    skipped_row_count: number;
    rolled_back_row_count: number;
    failure_code: string | null;
    safe_failure_message: string | null;
    transaction_reference: string | null;
    created_at: string;
};

export function appendAttempt(db: Database.Database, input: AttemptAppendInput): AttemptRecord {
    const id = newAttemptId();
    const tx = db.transaction(() => {
        const next = db.prepare(
            "SELECT COALESCE(MAX(attempt_number), 0) + 1 AS n FROM import_execution_attempts WHERE batch_id = ? AND entity_type = ?",
        ).get(input.batchId, input.entityType) as { n: number };
        db.prepare(`
            INSERT INTO import_execution_attempts (
                id, batch_id, entity_type, approval_id, attempt_number, execution_status,
                started_at, eligible_row_count, attempted_row_count
            ) VALUES (?, ?, ?, ?, ?, 'started', ?, ?, ?)
        `).run(id, input.batchId, input.entityType, input.approvalId, next.n, input.startedAt, input.eligibleRowCount, input.attemptedRowCount);
    });
    tx();
    return getAttempt(db, id);
}

export function getAttempt(db: Database.Database, id: string): AttemptRecord {
    const row = db.prepare("SELECT * FROM import_execution_attempts WHERE id = ?").get(id);
    if (!row) throw new AuditNotFoundError(`Attempt ${id} not found`);
    return row as AttemptRecord;
}

export function finalizeAttempt(
    db: Database.Database,
    attemptId: string,
    input: AttemptFinalizeInput,
): AttemptRecord {
    const current = getAttempt(db, attemptId);
    assertAttemptTransition(current.execution_status, input.status);
    db.prepare(`
        UPDATE import_execution_attempts SET
            execution_status = @status,
            finished_at = @finishedAt,
            committed_row_count = @committedRowCount,
            skipped_row_count = @skippedRowCount,
            rolled_back_row_count = @rolledBackRowCount,
            failure_code = @failureCode,
            safe_failure_message = @safeFailureMessage,
            transaction_reference = @transactionReference
        WHERE id = @attemptId
    `).run({
        status: input.status,
        finishedAt: input.finishedAt,
        committedRowCount: input.committedRowCount ?? 0,
        skippedRowCount: input.skippedRowCount ?? 0,
        rolledBackRowCount: input.rolledBackRowCount ?? 0,
        failureCode: input.failureCode ?? null,
        safeFailureMessage: input.safeFailureMessage ?? null,
        transactionReference: input.transactionReference ?? null,
        attemptId,
    });
    return getAttempt(db, attemptId);
}

export function listAttempts(db: Database.Database, batchId: string, entityType: EntityType): AttemptRecord[] {
    return db.prepare(
        "SELECT * FROM import_execution_attempts WHERE batch_id = ? AND entity_type = ? ORDER BY attempt_number ASC",
    ).all(batchId, entityType) as AttemptRecord[];
}
