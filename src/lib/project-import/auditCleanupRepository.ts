// ---------------------------------------------------------------------------
// WorkOS Project Field Sheet v1 — import_cleanup_log repository + retention queries
// WORKOS-SHEET-GATE-4B
// ---------------------------------------------------------------------------

import type Database from "better-sqlite3";
import { newCleanupEventId } from "./auditIds";
import type { CleanupEventStatus } from "./auditTypes";
import { AuditError, AuditNotFoundError } from "./auditTypes";
import type { BatchRecord } from "./auditBatchRepository";

export type CleanupEventRecord = {
    id: string;
    batch_id: string | null;
    cleanup_action: string;
    cleanup_scope: string;
    initiated_by: string | null;
    reason: string | null;
    rows_affected: number;
    payloads_purged: number;
    records_deleted: number;
    started_at: string | null;
    completed_at: string | null;
    status: CleanupEventStatus;
    error_code: string | null;
    safe_error_message: string | null;
    created_at: string;
};

export function appendCleanupEvent(
    db: Database.Database,
    input: {
        batchId?: string | null;
        cleanupAction: string;
        cleanupScope: string;
        initiatedBy?: string | null;
        reason?: string | null;
        startedAt?: string | null;
    },
): CleanupEventRecord {
    const id = newCleanupEventId();
    db.prepare(`
        INSERT INTO import_cleanup_log (
            id, batch_id, cleanup_action, cleanup_scope, initiated_by, reason, started_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, input.batchId ?? null, input.cleanupAction, input.cleanupScope, input.initiatedBy ?? null, input.reason ?? null, input.startedAt ?? null);
    return getCleanupEvent(db, id);
}

export function getCleanupEvent(db: Database.Database, id: string): CleanupEventRecord {
    const row = db.prepare("SELECT * FROM import_cleanup_log WHERE id = ?").get(id);
    if (!row) throw new AuditNotFoundError(`Cleanup event ${id} not found`);
    return row as CleanupEventRecord;
}

export function completeCleanupEvent(
    db: Database.Database,
    id: string,
    input: {
        status: "completed" | "failed";
        completedAt: string;
        rowsAffected?: number;
        payloadsPurged?: number;
        recordsDeleted?: number;
        errorCode?: string | null;
        safeErrorMessage?: string | null;
    },
): CleanupEventRecord {
    const current = getCleanupEvent(db, id);
    if (current.status !== "started") {
        throw new AuditError("AUDIT_CLEANUP_TRANSITION", `Cleanup event ${id} is not started`);
    }
    db.prepare(`
        UPDATE import_cleanup_log SET
            status = @status,
            completed_at = @completedAt,
            rows_affected = @rowsAffected,
            payloads_purged = @payloadsPurged,
            records_deleted = @recordsDeleted,
            error_code = @errorCode,
            safe_error_message = @safeErrorMessage
        WHERE id = @id
    `).run({
        status: input.status,
        completedAt: input.completedAt,
        rowsAffected: input.rowsAffected ?? 0,
        payloadsPurged: input.payloadsPurged ?? 0,
        recordsDeleted: input.recordsDeleted ?? 0,
        errorCode: input.errorCode ?? null,
        safeErrorMessage: input.safeErrorMessage ?? null,
        id,
    });
    return getCleanupEvent(db, id);
}

export function listCleanupEvents(db: Database.Database, batchId?: string | null): CleanupEventRecord[] {
    if (batchId) {
        return db.prepare("SELECT * FROM import_cleanup_log WHERE batch_id = ? ORDER BY created_at ASC").all(batchId) as CleanupEventRecord[];
    }
    return db.prepare("SELECT * FROM import_cleanup_log ORDER BY created_at ASC").all() as CleanupEventRecord[];
}

export function queryPayloadPurgeEligible(db: Database.Database, now: string): Array<{ batchId: string; rowId: string }> {
    const cutoff = new Date(new Date(now).getTime() - 90 * 24 * 60 * 60 * 1000).toISOString();
    return db.prepare(`
        SELECT r.batch_id AS batchId, r.id AS rowId
        FROM import_batch_rows r
        JOIN import_batches b ON b.id = r.batch_id
        WHERE b.batch_status IN ('executed', 'partially_executed')
          AND b.payload_purged_at IS NULL
          AND r.created_at <= ?
    `).all(cutoff) as Array<{ batchId: string; rowId: string }>;
}

export function queryBatchDeletionEligible(db: Database.Database, now: string): BatchRecord[] {
    return db.prepare(
        "SELECT * FROM import_batches WHERE retention_eligible_at IS NOT NULL AND retention_eligible_at <= ? ORDER BY retention_eligible_at ASC",
    ).all(now) as BatchRecord[];
}
