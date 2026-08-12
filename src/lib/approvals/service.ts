// ---------------------------------------------------------------------------
// WorkOS-Lite human approval lifecycle service
// AUTOMATION-001-P1C.1
// Approve / reject / revoke run inside BEGIN IMMEDIATE write-serialized
// transactions. Rejection is an operation-level event, never an approval row.
// ---------------------------------------------------------------------------

import { randomUUID } from "crypto";
import type Database from "better-sqlite3";
import { ApprovalError } from "./errors";
import { verifyOperationIntegrity } from "./operationIntegrity";
import type {
    ApprovalEventRow,
    ApprovalMutationResult,
    ApprovalRow,
    ApprovalView,
    HumanApprover,
    OperationRow,
    RejectionView,
    ReviewDetail,
    ReviewState,
    ReviewSummary,
} from "./types";

const REJECT_REASON_MAX_LENGTH = 200;

type Deps = { now?: string };

function nowIso(deps: Deps): string {
    return deps.now ?? new Date().toISOString();
}

function loadOperation(db: Database.Database, operationId: string): OperationRow {
    const row = db.prepare("SELECT * FROM operations WHERE id = ?").get(operationId) as OperationRow | undefined;
    if (!row) throw new ApprovalError("OPS_APPROVAL_OPERATION_NOT_FOUND", "Operation not found", 404);
    return row;
}

function requireReviewable(op: OperationRow): void {
    if (op.status !== "pending") {
        throw new ApprovalError("OPS_APPROVAL_NOT_REVIEWABLE", "Operation is not reviewable", 409);
    }
}

function findActiveApproval(db: Database.Database, operationId: string): ApprovalRow | undefined {
    return db.prepare(`
        SELECT * FROM operation_approvals
        WHERE operation_id = ? AND approval_status = 'approved'
        LIMIT 1
    `).get(operationId) as ApprovalRow | undefined;
}

function findLatestApproval(db: Database.Database, operationId: string): ApprovalRow | undefined {
    return db.prepare(`
        SELECT * FROM operation_approvals
        WHERE operation_id = ?
        ORDER BY created_at DESC, rowid DESC
        LIMIT 1
    `).get(operationId) as ApprovalRow | undefined;
}

function findRejection(db: Database.Database, operationId: string): ApprovalEventRow | undefined {
    return db.prepare(`
        SELECT * FROM operation_approval_events
        WHERE operation_id = ? AND event_type = 'rejected'
        LIMIT 1
    `).get(operationId) as ApprovalEventRow | undefined;
}

function loadApprovalById(db: Database.Database, approvalId: string): ApprovalRow {
    const row = db.prepare("SELECT * FROM operation_approvals WHERE id = ?").get(approvalId) as ApprovalRow | undefined;
    if (!row) throw new ApprovalError("OPS_APPROVAL_NOT_FOUND", "Approval not found", 404);
    return row;
}

function appendEvent(
    db: Database.Database,
    input: {
        operationId: string;
        approvalId: string | null;
        eventType: ApprovalEventRow["event_type"];
        actorType: ApprovalEventRow["actor_type"];
        actorId: string;
        actorDisplayName: string | null;
        at: string;
        eventCode?: string | null;
        safeReason?: string | null;
    },
): ApprovalEventRow {
    const id = `ape-${randomUUID()}`;
    db.prepare(`
        INSERT INTO operation_approval_events (
            id, operation_id, approval_id, event_type, actor_type, actor_id,
            actor_display_name, occurred_at, event_code, safe_reason, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
        id,
        input.operationId,
        input.approvalId,
        input.eventType,
        input.actorType,
        input.actorId,
        input.actorDisplayName,
        input.at,
        input.eventCode ?? null,
        input.safeReason ?? null,
        input.at,
    );
    return db.prepare("SELECT * FROM operation_approval_events WHERE id = ?").get(id) as ApprovalEventRow;
}

function materializeExpired(db: Database.Database, approval: ApprovalRow, now: string): void {
    db.prepare(`
        UPDATE operation_approvals
        SET approval_status = 'expired', updated_at = ?
        WHERE id = ? AND approval_status = 'approved'
    `).run(now, approval.id);
    appendEvent(db, {
        operationId: approval.operation_id,
        approvalId: approval.id,
        eventType: "expired",
        actorType: "system",
        actorId: "system",
        actorDisplayName: null,
        at: now,
        eventCode: "APPROVAL_EXPIRED",
    });
}

function parseExpectedReviewBody(
    body: unknown,
    opts: { allowReason?: boolean } = {},
): { expectedPreviewFingerprint: string; expectedPayloadHash: string; expectedContractVersion: string; reason: string | null } {
    if (body === null || typeof body !== "object" || Array.isArray(body)) {
        throw new ApprovalError("OPS_APPROVAL_INVALID_REQUEST", "Invalid review request", 400);
    }
    const obj = body as Record<string, unknown>;
    const allowed = new Set(["expectedPreviewFingerprint", "expectedPayloadHash", "expectedContractVersion"]);
    if (opts.allowReason) allowed.add("reason");
    for (const key of Object.keys(obj)) {
        if (!allowed.has(key)) throw new ApprovalError("OPS_APPROVAL_INVALID_REQUEST", "Invalid review request", 400);
    }
    const { expectedPreviewFingerprint, expectedPayloadHash, expectedContractVersion } = obj;
    if (
        typeof expectedPreviewFingerprint !== "string" ||
        typeof expectedPayloadHash !== "string" ||
        typeof expectedContractVersion !== "string"
    ) {
        throw new ApprovalError("OPS_APPROVAL_INVALID_REQUEST", "Invalid review request", 400);
    }
    let reason: string | null = null;
    if (opts.allowReason && obj.reason !== undefined) {
        if (typeof obj.reason !== "string") {
            throw new ApprovalError("OPS_APPROVAL_INVALID_REQUEST", "Invalid reason", 400);
        }
        const trimmed = obj.reason.trim();
        if (trimmed.length > REJECT_REASON_MAX_LENGTH) {
            throw new ApprovalError("OPS_APPROVAL_INVALID_REQUEST", "Reason is too long", 400);
        }
        reason = trimmed || null;
    }
    return { expectedPreviewFingerprint, expectedPayloadHash, expectedContractVersion, reason };
}

function assertExpectedReview(expected: ReturnType<typeof parseExpectedReviewBody>, op: OperationRow): void {
    if (
        expected.expectedPreviewFingerprint !== op.preview_fingerprint ||
        expected.expectedPayloadHash !== op.payload_hash ||
        expected.expectedContractVersion !== op.contract_version
    ) {
        throw new ApprovalError("OPS_APPROVAL_STALE_SNAPSHOT", "Review snapshot is stale", 409);
    }
}

function parseRevokeBody(body: unknown): { approvalId: string } {
    if (body === null || typeof body !== "object" || Array.isArray(body)) {
        throw new ApprovalError("OPS_APPROVAL_INVALID_REQUEST", "Invalid revoke request", 400);
    }
    const obj = body as Record<string, unknown>;
    for (const key of Object.keys(obj)) {
        if (key !== "approvalId") throw new ApprovalError("OPS_APPROVAL_INVALID_REQUEST", "Invalid revoke request", 400);
    }
    const { approvalId } = obj;
    if (typeof approvalId !== "string" || !/^apr-/.test(approvalId)) {
        throw new ApprovalError("OPS_APPROVAL_INVALID_REQUEST", "Invalid approvalId", 400);
    }
    return { approvalId };
}

export function approvalView(row: ApprovalRow): ApprovalView {
    return {
        id: row.id,
        operationId: row.operation_id,
        status: row.approval_status,
        approvedAt: row.approved_at,
        expiresAt: row.expires_at,
        approverActor: `human:${row.approver_actor_id}`,
        revokedAt: row.revoked_at,
        revokedBy:
            row.revoked_at !== null && row.revoked_by_actor_id !== null
                ? {
                      actorType: row.revoked_by_actor_type ?? "human",
                      actorId: `human:${row.revoked_by_actor_id}`,
                      displayName: row.revoked_by_display_name ?? "",
                  }
                : null,
        binding: {
            operationType: row.bound_operation_type,
            targetType: row.bound_target_type,
            targetRef: row.bound_target_ref,
            resolvedTargetId: row.bound_resolved_target_id,
            payloadHash: row.bound_payload_hash,
            contractVersion: row.bound_contract_version,
            previewFingerprint: row.bound_preview_fingerprint,
        },
        preview: JSON.parse(row.preview_json),
    };
}

export function rejectionView(event: ApprovalEventRow): RejectionView {
    return {
        eventId: event.id,
        operationId: event.operation_id,
        rejectedAt: event.occurred_at,
        actor: `human:${event.actor_id}`,
        reason: event.safe_reason,
    };
}

export function deriveReviewState(
    op: OperationRow,
    latest: ApprovalRow | undefined,
    rejection: ApprovalEventRow | undefined,
    now: string,
): ReviewState {
    if (rejection) return "rejected";
    if (!latest) return "awaiting_review";
    switch (latest.approval_status) {
        case "consumed":
            return "consumed";
        case "revoked":
            return "revoked";
        case "expired":
            return "approval_expired";
        case "approved":
            return latest.expires_at <= now ? "approval_expired" : "approved";
        default:
            return "awaiting_review";
    }
}

function mutationResult(
    operationId: string,
    state: ReviewState,
    approval: ApprovalView | null,
    rejection: RejectionView | null,
): ApprovalMutationResult {
    return { ok: true, review: { operationId, state, approval, rejection } };
}

export function approveOperation(
    db: Database.Database,
    human: HumanApprover,
    operationId: string,
    body: unknown,
    deps: Deps = {},
): ApprovalMutationResult {
    return db.transaction(() => {
        const now = nowIso(deps);
        const op = loadOperation(db, operationId);
        requireReviewable(op);
        verifyOperationIntegrity(op);
        const expected = parseExpectedReviewBody(body);
        assertExpectedReview(expected, op);
        if (findRejection(db, operationId)) {
            throw new ApprovalError("OPS_APPROVAL_REJECTED_TERMINAL", "Operation was rejected and is terminal", 409);
        }

        const active = findActiveApproval(db, operationId);
        if (active) {
            if (active.expires_at > now) {
                return mutationResult(operationId, "approved", approvalView(active), null);
            }
            materializeExpired(db, active, now);
        }

        const approvalId = `apr-${randomUUID()}`;
        db.prepare(`
            INSERT INTO operation_approvals (
                id, operation_id, approval_status,
                approver_actor_type, approver_actor_id, approver_display_name,
                approved_at, expires_at,
                bound_operation_type, bound_target_type, bound_target_ref,
                bound_resolved_target_id, bound_payload_hash,
                bound_contract_version, bound_preview_fingerprint, preview_json,
                created_at, updated_at
            ) VALUES (
                @id, @operation_id, 'approved',
                'human', @actorId, @actorName,
                @approvedAt, @expiresAt,
                @boundOperationType, @boundTargetType, @boundTargetRef,
                @boundResolvedTargetId, @boundPayloadHash,
                @boundContractVersion, @boundPreviewFingerprint, @previewJson,
                @now, @now
            )
        `).run({
            id: approvalId,
            operation_id: op.id,
            actorId: human.actorId,
            actorName: human.displayName,
            approvedAt: now,
            expiresAt: new Date(new Date(now).getTime() + 30 * 60 * 1000).toISOString(),
            boundOperationType: op.operation_type,
            boundTargetType: op.target_type,
            boundTargetRef: op.target_ref,
            boundResolvedTargetId: op.resolved_target_id,
            boundPayloadHash: op.payload_hash,
            boundContractVersion: op.contract_version,
            boundPreviewFingerprint: op.preview_fingerprint,
            previewJson: op.preview_json,
            now,
        });
        appendEvent(db, {
            operationId: op.id,
            approvalId,
            eventType: "approved",
            actorType: "human",
            actorId: human.actorId,
            actorDisplayName: human.displayName,
            at: now,
            eventCode: "APPROVAL_APPROVED",
        });
        return mutationResult(operationId, "approved", approvalView(loadApprovalById(db, approvalId)), null);
    }).immediate();
}

export function rejectOperation(
    db: Database.Database,
    human: HumanApprover,
    operationId: string,
    body: unknown,
    deps: Deps = {},
): ApprovalMutationResult {
    return db.transaction(() => {
        const now = nowIso(deps);
        const op = loadOperation(db, operationId);
        requireReviewable(op);
        verifyOperationIntegrity(op);
        const expected = parseExpectedReviewBody(body, { allowReason: true });
        assertExpectedReview(expected, op);

        const existing = findRejection(db, operationId);
        if (existing) {
            return mutationResult(operationId, "rejected", null, rejectionView(existing));
        }

        const active = findActiveApproval(db, operationId);
        if (active) {
            if (active.expires_at > now) {
                throw new ApprovalError("OPS_APPROVAL_CONFLICT", "Active approval exists; revoke before rejecting", 409);
            }
            materializeExpired(db, active, now);
        }

        const event = appendEvent(db, {
            operationId: op.id,
            approvalId: null,
            eventType: "rejected",
            actorType: "human",
            actorId: human.actorId,
            actorDisplayName: human.displayName,
            at: now,
            eventCode: "APPROVAL_REJECTED",
            safeReason: expected.reason,
        });
        return mutationResult(operationId, "rejected", null, rejectionView(event));
    }).immediate();
}

export function revokeOperation(
    db: Database.Database,
    human: HumanApprover,
    operationId: string,
    body: unknown,
    deps: Deps = {},
): ApprovalMutationResult {
    return db.transaction(() => {
        const now = nowIso(deps);
        const { approvalId } = parseRevokeBody(body);
        const approval = loadApprovalById(db, approvalId);
        if (approval.operation_id !== operationId) {
            throw new ApprovalError("OPS_APPROVAL_NOT_FOUND", "Approval not found", 404);
        }
        if (approval.approval_status === "revoked") {
            throw new ApprovalError("OPS_APPROVAL_REVOKED", "Approval is already revoked", 409);
        }
        if (approval.approval_status === "consumed") {
            throw new ApprovalError("OPS_APPROVAL_CONFLICT", "Approval is consumed", 409);
        }
        if (approval.approval_status === "expired") {
            throw new ApprovalError("OPS_APPROVAL_EXPIRED", "Approval has expired", 409);
        }
        if (approval.expires_at <= now) {
            materializeExpired(db, approval, now);
            throw new ApprovalError("OPS_APPROVAL_EXPIRED", "Approval has expired", 409);
        }

        const info = db.prepare(`
            UPDATE operation_approvals
            SET approval_status = 'revoked',
                revoked_at = @now,
                revoked_by_actor_type = 'human',
                revoked_by_actor_id = @actorId,
                revoked_by_display_name = @actorName,
                updated_at = @now
            WHERE id = @id AND operation_id = @operationId AND approval_status = 'approved'
        `).run({ now, actorId: human.actorId, actorName: human.displayName, id: approvalId, operationId });
        if (info.changes !== 1) {
            throw new ApprovalError("OPS_APPROVAL_CONFLICT", "Approval state changed concurrently", 409);
        }
        appendEvent(db, {
            operationId,
            approvalId,
            eventType: "revoked",
            actorType: "human",
            actorId: human.actorId,
            actorDisplayName: human.displayName,
            at: now,
            eventCode: "APPROVAL_REVOKED",
        });
        return mutationResult(operationId, "revoked", approvalView(loadApprovalById(db, approvalId)), null);
    }).immediate();
}

export function listReviews(db: Database.Database, limit: number, deps: Deps = {}): ReviewSummary[] {
    const now = nowIso(deps);
    const rows = db.prepare("SELECT * FROM operations ORDER BY requested_at DESC LIMIT ?").all(limit) as OperationRow[];
    return rows.map((op) => summarize(db, op, now));
}

export function getReviewDetail(db: Database.Database, operationId: string, deps: Deps = {}): ReviewDetail {
    const op = loadOperation(db, operationId);
    const now = nowIso(deps);
    const summary = summarize(db, op, now);
    return {
        ...summary,
        payload: JSON.parse(op.payload_json),
        payloadHash: op.payload_hash,
        preview: JSON.parse(op.preview_json),
        previewFingerprint: op.preview_fingerprint,
        contractVersion: op.contract_version,
        status: op.status,
    };
}

function summarize(db: Database.Database, op: OperationRow, now: string): ReviewSummary {
    const latest = findLatestApproval(db, op.id);
    const rejection = findRejection(db, op.id);
    const reviewState = deriveReviewState(op, latest, rejection, now);
    return {
        operationId: op.id,
        operationType: op.operation_type,
        targetType: op.target_type,
        targetRef: op.target_ref,
        requesterActorType: op.requester_actor_type,
        requesterActorId: op.requester_actor_id,
        requestedAt: op.requested_at,
        reviewState,
        approval: latest ? approvalView(latest) : null,
        rejection: rejection ? rejectionView(rejection) : null,
    };
}
