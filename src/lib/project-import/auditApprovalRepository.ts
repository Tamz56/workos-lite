// ---------------------------------------------------------------------------
// WorkOS Project Field Sheet v1 — import_approvals + import_approval_events
// WORKOS-SHEET-GATE-4B
// Approval identity/binding lives in import_approvals; approval lifecycle
// history is append-only in import_approval_events. The cached status column
// is kept consistent with events inside the same transaction.
// ---------------------------------------------------------------------------

import type Database from "better-sqlite3";
import { newApprovalEventId, newApprovalId } from "./auditIds";
import { approvalExpiresAt, isApprovalValid } from "./auditLifecycle";
import type {
    ApprovalBinding,
    ApprovalEventInput,
    ApprovalEventType,
    ApprovalStatus,
    EntityType,
} from "./auditTypes";
import {
    AuditBindingMismatchError,
    AuditBlockedError,
    AuditNotFoundError,
    AuditTransitionError,
} from "./auditTypes";
import { computeAuditFingerprint } from "./auditSerialization";
import { getBatch, setEntityStatus } from "./auditBatchRepository";
import { listRowsByBatchEntity, type RowRecord } from "./auditRowRepository";

export type ApprovalRecord = {
    id: string;
    batch_id: string;
    entity_type: EntityType;
    approval_status: ApprovalStatus;
    approved_by: string | null;
    approved_at: string | null;
    expires_at: string | null;
    rejected_by: string | null;
    rejected_at: string | null;
    revoked_by: string | null;
    revoked_at: string | null;
    consumed_at: string | null;
    bound_file_hash: string;
    bound_dry_run_id: string;
    bound_schema_version: string;
    bound_parser_contract_version: string;
    bound_dry_run_contract_version: string;
    approval_summary_fingerprint: string;
    reason_or_note: string | null;
    created_at: string;
};

export type ApprovalEventRecord = {
    id: string;
    approval_id: string;
    event_type: ApprovalEventType;
    actor: string | null;
    occurred_at: string | null;
    event_code: string | null;
    safe_reason: string | null;
    created_at: string;
};

export function getApproval(db: Database.Database, id: string): ApprovalRecord {
    const row = db.prepare("SELECT * FROM import_approvals WHERE id = ?").get(id);
    if (!row) throw new AuditNotFoundError(`Approval ${id} not found`);
    return row as ApprovalRecord;
}

export function appendApprovalEvent(
    db: Database.Database,
    approvalId: string,
    input: ApprovalEventInput,
): ApprovalEventRecord {
    const id = newApprovalEventId();
    db.prepare(`
        INSERT INTO import_approval_events (
            id, approval_id, event_type, actor, occurred_at, event_code, safe_reason
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
        id,
        approvalId,
        input.eventType,
        input.actor ?? null,
        input.at ?? null,
        input.eventCode ?? null,
        input.safeReason ?? null,
    );
    const event = db.prepare("SELECT * FROM import_approval_events WHERE id = ?").get(id);
    return event as ApprovalEventRecord;
}

export function listApprovalEvents(db: Database.Database, approvalId: string): ApprovalEventRecord[] {
    return db.prepare(
        "SELECT * FROM import_approval_events WHERE approval_id = ? ORDER BY rowid ASC",
    ).all(approvalId) as ApprovalEventRecord[];
}

export function deriveEffectiveApprovalState(db: Database.Database, approvalId: string): ApprovalStatus {
    const events = listApprovalEvents(db, approvalId);
    if (events.length === 0) return "pending";
    const last = events[events.length - 1];
    switch (last.event_type) {
        case "created":
            return "pending";
        case "approved":
            return "approved";
        case "rejected":
            return "rejected";
        case "expired":
            return "expired";
        case "revoked":
            return "revoked";
        case "consumed":
            return "consumed";
    }
}

function setApprovalStatus(db: Database.Database, approvalId: string, status: ApprovalStatus): void {
    db.prepare("UPDATE import_approvals SET approval_status = ? WHERE id = ?").run(status, approvalId);
}

function insertApproval(
    db: Database.Database,
    binding: ApprovalBinding & {
        status: ApprovalStatus;
        approvedBy?: string | null;
        approvedAt?: string | null;
        expiresAt?: string | null;
        rejectedBy?: string | null;
        rejectedAt?: string | null;
        revokedBy?: string | null;
        revokedAt?: string | null;
        consumedAt?: string | null;
        reasonOrNote?: string | null;
    },
): ApprovalRecord {
    const id = newApprovalId();
    db.prepare(`
        INSERT INTO import_approvals (
            id, batch_id, entity_type, approval_status,
            approved_by, approved_at, expires_at, rejected_by, rejected_at,
            revoked_by, revoked_at, consumed_at,
            bound_file_hash, bound_dry_run_id, bound_schema_version,
            bound_parser_contract_version, bound_dry_run_contract_version,
            approval_summary_fingerprint, reason_or_note
        ) VALUES (
            @id, @batchId, @entityType, @status,
            @approvedBy, @approvedAt, @expiresAt, @rejectedBy, @rejectedAt,
            @revokedBy, @revokedAt, @consumedAt,
            @boundFileHash, @boundDryRunId, @boundSchemaVersion,
            @boundParserContractVersion, @boundDryRunContractVersion,
            @fingerprint, @reasonOrNote
        )
    `).run({
        id,
        batchId: binding.batchId,
        entityType: binding.entityType,
        status: binding.status,
        approvedBy: binding.approvedBy ?? null,
        approvedAt: binding.approvedAt ?? null,
        expiresAt: binding.expiresAt ?? null,
        rejectedBy: binding.rejectedBy ?? null,
        rejectedAt: binding.rejectedAt ?? null,
        revokedBy: binding.revokedBy ?? null,
        revokedAt: binding.revokedAt ?? null,
        consumedAt: binding.consumedAt ?? null,
        boundFileHash: binding.boundFileHash,
        boundDryRunId: binding.boundDryRunId,
        boundSchemaVersion: binding.boundSchemaVersion,
        boundParserContractVersion: binding.boundParserContractVersion,
        boundDryRunContractVersion: binding.boundDryRunContractVersion,
        fingerprint: binding.approvalSummaryFingerprint,
        reasonOrNote: binding.reasonOrNote ?? null,
    });
    return getApproval(db, id);
}

export function createApproval(db: Database.Database, binding: ApprovalBinding): ApprovalRecord {
    const approval = insertApproval(db, { ...binding, status: "pending" });
    appendApprovalEvent(db, approval.id, { eventType: "created", at: new Date().toISOString() });
    return getApproval(db, approval.id);
}

export function approvalSummaryFingerprint(rows: RowRecord[], entityType: EntityType): string {
    const counts = {
        new: rows.filter((row) => row.dry_run_status === "new").length,
        duplicate: rows.filter((row) => row.dry_run_status === "duplicate").length,
        conflict: rows.filter((row) => row.dry_run_status === "conflict").length,
        reviewRequired: rows.filter((row) => row.dry_run_status === "review_required").length,
        invalid: rows.filter((row) => row.dry_run_status === "invalid").length,
        skipped: rows.filter((row) => row.dry_run_status === "skipped").length,
    };
    return computeAuditFingerprint({ entityType, counts });
}

export type ApproveEntityInput = {
    batchId: string;
    entityType: EntityType;
    approvedBy: string;
    now: string;
    boundFileHash: string;
    boundDryRunId: string;
    boundSchemaVersion: string;
    boundParserContractVersion: string;
    boundDryRunContractVersion: string;
};

export function approveEntity(db: Database.Database, input: ApproveEntityInput): ApprovalRecord {
    const transaction = db.transaction(() => {
        const batch = getBatch(db, input.batchId);
        const statusColumn = input.entityType === "project_documentation" ? "project_documentation_status" : "backlog_status";
        const entityStatus = batch[statusColumn];

        if (entityStatus === "blocked") {
            throw new AuditBlockedError(`Entity ${input.entityType} is blocked`);
        }

        const rows = listRowsByBatchEntity(db, input.batchId, input.entityType);
        const blocking = rows.filter((row) =>
            ["invalid", "conflict", "review_required"].includes(row.dry_run_status),
        );
        if (blocking.length > 0) {
            throw new AuditBlockedError(`Entity ${input.entityType} has blocking rows: ${blocking.map((row) => row.dry_run_status).join(", ")}`);
        }

        const fingerprint = approvalSummaryFingerprint(rows, input.entityType);
        const bindingMatches =
            batch.source_file_hash === input.boundFileHash &&
            batch.dry_run_id === input.boundDryRunId &&
            batch.schema_version === input.boundSchemaVersion &&
            batch.parser_contract_version === input.boundParserContractVersion &&
            batch.dry_run_contract_version === input.boundDryRunContractVersion;
        if (!bindingMatches) {
            throw new AuditBindingMismatchError("Approval binding does not match the batch");
        }

        const approval = insertApproval(db, {
            batchId: input.batchId,
            entityType: input.entityType,
            boundFileHash: input.boundFileHash,
            boundDryRunId: input.boundDryRunId,
            boundSchemaVersion: input.boundSchemaVersion,
            boundParserContractVersion: input.boundParserContractVersion,
            boundDryRunContractVersion: input.boundDryRunContractVersion,
            approvalSummaryFingerprint: fingerprint,
            status: "approved",
            approvedBy: input.approvedBy,
            approvedAt: input.now,
            expiresAt: approvalExpiresAt(input.now),
        });
        appendApprovalEvent(db, approval.id, { eventType: "created", at: input.now });
        appendApprovalEvent(db, approval.id, { eventType: "approved", actor: input.approvedBy, at: input.now });
        setEntityStatus(db, input.batchId, input.entityType, "approved");
        return approval;
    });
    return transaction();
}

export function rejectApproval(
    db: Database.Database,
    approvalId: string,
    input: { rejectedBy: string; now: string; reason?: string | null },
): ApprovalRecord {
    const transaction = db.transaction(() => {
        const current = getApproval(db, approvalId);
        const effective = deriveEffectiveApprovalState(db, approvalId);
        if (effective !== "pending") throw new AuditTransitionError(effective, "rejected");
        appendApprovalEvent(db, approvalId, { eventType: "rejected", actor: input.rejectedBy, at: input.now, safeReason: input.reason ?? null });
        setApprovalStatus(db, approvalId, "rejected");
        db.prepare("UPDATE import_approvals SET rejected_by = ?, rejected_at = ?, reason_or_note = ? WHERE id = ?")
            .run(input.rejectedBy, input.now, input.reason ?? null, approvalId);
        void current;
        return getApproval(db, approvalId);
    });
    return transaction();
}

export function revokeApproval(
    db: Database.Database,
    approvalId: string,
    input: { revokedBy: string; now: string },
): ApprovalRecord {
    const transaction = db.transaction(() => {
        const effective = deriveEffectiveApprovalState(db, approvalId);
        if (effective !== "approved") throw new AuditTransitionError(effective, "revoked");
        appendApprovalEvent(db, approvalId, { eventType: "revoked", actor: input.revokedBy, at: input.now });
        setApprovalStatus(db, approvalId, "revoked");
        db.prepare("UPDATE import_approvals SET revoked_by = ?, revoked_at = ? WHERE id = ?")
            .run(input.revokedBy, input.now, approvalId);
        return getApproval(db, approvalId);
    });
    return transaction();
}

export function markApprovalExpired(db: Database.Database, approvalId: string, at?: string): ApprovalRecord {
    const transaction = db.transaction(() => {
        const effective = deriveEffectiveApprovalState(db, approvalId);
        if (effective !== "approved") throw new AuditTransitionError(effective, "expired");
        appendApprovalEvent(db, approvalId, { eventType: "expired", at: at ?? new Date().toISOString() });
        setApprovalStatus(db, approvalId, "expired");
        return getApproval(db, approvalId);
    });
    return transaction();
}

export function consumeApproval(db: Database.Database, approvalId: string, now: string): ApprovalRecord {
    const transaction = db.transaction(() => {
        const approval = getApproval(db, approvalId);
        const effective = deriveEffectiveApprovalState(db, approvalId);
        if (effective !== "approved") throw new AuditTransitionError(effective, "consumed");
        if (approval.expires_at !== null && approval.expires_at <= now) {
            throw new AuditTransitionError("approved", "consumed");
        }
        appendApprovalEvent(db, approvalId, { eventType: "consumed", at: now });
        setApprovalStatus(db, approvalId, "consumed");
        db.prepare("UPDATE import_approvals SET consumed_at = ? WHERE id = ?").run(now, approvalId);
        return getApproval(db, approvalId);
    });
    return transaction();
}

export function evaluateExpiration(db: Database.Database, approvalId: string, now: string): ApprovalRecord {
    const approval = getApproval(db, approvalId);
    if (approval.approval_status === "approved" && approval.expires_at !== null && approval.expires_at <= now) {
        return markApprovalExpired(db, approvalId, now);
    }
    return approval;
}

export function findLatestValidApproval(
    db: Database.Database,
    batchId: string,
    entityType: EntityType,
    now: string,
): ApprovalRecord | null {
    const rows = db.prepare(
        "SELECT * FROM import_approvals WHERE batch_id = ? AND entity_type = ? AND approval_status = 'approved' ORDER BY created_at DESC",
    ).all(batchId, entityType) as ApprovalRecord[];
    return rows.find((row) => isApprovalValid(row.approval_status, row.expires_at, now)) ?? null;
}

export function listApprovalHistory(db: Database.Database, batchId: string, entityType: EntityType): ApprovalRecord[] {
    return db.prepare(
        "SELECT * FROM import_approvals WHERE batch_id = ? AND entity_type = ? ORDER BY created_at ASC",
    ).all(batchId, entityType) as ApprovalRecord[];
}

export function assertApprovalBinding(db: Database.Database, approvalId: string, expected: ApprovalBinding): void {
    const approval = getApproval(db, approvalId);
    if (
        approval.batch_id !== expected.batchId ||
        approval.entity_type !== expected.entityType ||
        approval.bound_file_hash !== expected.boundFileHash ||
        approval.bound_dry_run_id !== expected.boundDryRunId ||
        approval.bound_schema_version !== expected.boundSchemaVersion ||
        approval.bound_parser_contract_version !== expected.boundParserContractVersion ||
        approval.bound_dry_run_contract_version !== expected.boundDryRunContractVersion ||
        approval.approval_summary_fingerprint !== expected.approvalSummaryFingerprint
    ) {
        throw new AuditBindingMismatchError("Approval binding mismatch");
    }
}
