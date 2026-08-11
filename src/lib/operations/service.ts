// ---------------------------------------------------------------------------
// WorkOS-Lite Operations control-plane service
// AUTOMATION-001-P1B.1
// request -> validate -> resolve target -> normalize -> hash -> preview
// -> fingerprint -> idempotency reconciliation -> persist (status=pending)
// ---------------------------------------------------------------------------

import { randomUUID } from "crypto";
import type Database from "better-sqlite3";
import type { AgentPrincipal } from "@/lib/agent-auth/agentAuthentication";
import {
    BACKLOG_CREATE_CONTRACT_VERSION,
    OPERATIONS_SOURCE,
    buildBacklogCreatePreview,
    normalizeBacklogCreatePayload,
} from "./adapters/backlogCreate";
import { canonicalJson, computeDomainHash } from "./canonicalization";
import { OpsError } from "./errors";
import type { NormalizedBacklogCreatePayload, OperationRecord } from "./types";

export const PAYLOAD_HASH_PREFIX = "ops-payload-v1:";
export const PREVIEW_HASH_PREFIX = "ops-preview-v1:";
export const MAX_TARGET_REF_LENGTH = 128;
export const MAX_IDEMPOTENCY_KEY_LENGTH = 128;

type OperationsRow = {
    id: string;
    operation_type: string;
    target_type: string;
    target_ref: string;
    resolved_target_id: string;
    payload_json: string;
    payload_hash: string;
    idempotency_key: string | null;
    source: string;
    requester_actor_type: "agent";
    requester_actor_id: string;
    status: string;
    validation_result_json: string;
    preview_json: string;
    preview_fingerprint: string;
    contract_version: string;
    requested_at: string;
    created_at: string;
    updated_at: string;
};

const ENVELOPE_KEYS = new Set(["operationType", "targetType", "targetRef", "payload", "idempotencyKey"]);

function parseEnvelope(body: unknown): {
    operationType: string;
    targetType: string;
    targetRef: string;
    payload: unknown;
    idempotencyKey: string | null;
} {
    if (body === null || typeof body !== "object" || Array.isArray(body)) {
        throw new OpsError("OPS_INVALID_ENVELOPE", "Invalid operation envelope", 400);
    }
    const obj = body as Record<string, unknown>;
    for (const key of Object.keys(obj)) {
        if (!ENVELOPE_KEYS.has(key)) {
            throw new OpsError("OPS_INVALID_ENVELOPE", "Unknown envelope field", 400);
        }
    }

    const { operationType, targetType, targetRef } = obj;
    if (typeof operationType !== "string" || typeof targetType !== "string" || typeof targetRef !== "string") {
        throw new OpsError("OPS_INVALID_ENVELOPE", "Invalid envelope fields", 400);
    }
    if (!("payload" in obj)) {
        throw new OpsError("OPS_INVALID_ENVELOPE", "payload is required", 400);
    }

    let idempotencyKey: string | null = null;
    if (obj.idempotencyKey !== undefined) {
        if (typeof obj.idempotencyKey !== "string") {
            throw new OpsError("OPS_INVALID_ENVELOPE", "Invalid idempotencyKey", 400);
        }
        const trimmed = obj.idempotencyKey.trim();
        if (trimmed.length === 0 || trimmed.length > MAX_IDEMPOTENCY_KEY_LENGTH) {
            throw new OpsError("OPS_INVALID_ENVELOPE", "Invalid idempotencyKey", 400);
        }
        idempotencyKey = trimmed;
    }

    return { operationType, targetType, targetRef, payload: obj.payload, idempotencyKey };
}

function rowToRecord(row: OperationsRow): OperationRecord {
    return {
        id: row.id,
        operationType: row.operation_type,
        targetType: row.target_type,
        targetRef: row.target_ref,
        resolvedTargetId: row.resolved_target_id,
        payload: JSON.parse(row.payload_json),
        payloadHash: row.payload_hash,
        idempotencyKey: row.idempotency_key,
        source: row.source,
        requesterActorType: row.requester_actor_type,
        requesterActorId: row.requester_actor_id,
        status: row.status,
        validationResult: JSON.parse(row.validation_result_json),
        preview: JSON.parse(row.preview_json),
        previewFingerprint: row.preview_fingerprint,
        contractVersion: row.contract_version,
        requestedAt: row.requested_at,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    };
}

function findByIdempotency(
    db: Database.Database,
    requesterActorId: string,
    idempotencyKey: string,
): OperationsRow | undefined {
    return db.prepare(`
        SELECT * FROM operations
        WHERE requester_actor_id = ? AND idempotency_key = ?
        LIMIT 1
    `).get(requesterActorId, idempotencyKey) as OperationsRow | undefined;
}

function reconcile(existing: OperationsRow, payloadHash: string): OperationRecord {
    if (existing.payload_hash !== payloadHash) {
        throw new OpsError("OPS_IDEMPOTENCY_CONFLICT", "Idempotency key reused with different payload", 409);
    }
    return rowToRecord(existing);
}

function isUniqueViolation(error: unknown): boolean {
    return error instanceof Error && /UNIQUE constraint failed/.test(error.message);
}

export function createOperation(
    db: Database.Database,
    principal: AgentPrincipal,
    body: unknown,
): OperationRecord {
    const envelope = parseEnvelope(body);

    if (envelope.operationType !== "backlog.create") {
        throw new OpsError("OPS_INVALID_OPERATION_TYPE", "Unsupported operation type", 400);
    }
    if (envelope.targetType !== "project") {
        throw new OpsError("OPS_INVALID_ENVELOPE", "Invalid target type", 400);
    }
    if (
        envelope.targetRef.length === 0 ||
        envelope.targetRef.length > MAX_TARGET_REF_LENGTH ||
        envelope.targetRef !== envelope.targetRef.trim()
    ) {
        throw new OpsError("OPS_INVALID_ENVELOPE", "Invalid targetRef", 400);
    }

    const normalized: NormalizedBacklogCreatePayload = normalizeBacklogCreatePayload(envelope.payload);

    const project = db.prepare("SELECT id, slug FROM projects WHERE slug = ?").get(envelope.targetRef) as
        | { id: string; slug: string }
        | undefined;
    if (!project) {
        throw new OpsError("OPS_TARGET_NOT_FOUND", "Project not found", 404);
    }

    const payloadHash = computeDomainHash(PAYLOAD_HASH_PREFIX, {
        operationType: envelope.operationType,
        targetType: envelope.targetType,
        targetRef: envelope.targetRef,
        payload: normalized,
    });

    if (envelope.idempotencyKey !== null) {
        const existing = findByIdempotency(db, principal.actorId, envelope.idempotencyKey);
        if (existing) return reconcile(existing, payloadHash);
    }

    const preview = buildBacklogCreatePreview({
        targetRef: envelope.targetRef,
        resolvedTargetId: project.id,
        payload: normalized,
    });
    const previewFingerprint = computeDomainHash(PREVIEW_HASH_PREFIX, preview);
    const now = new Date().toISOString();
    const id = `op-${randomUUID()}`;

    const row: OperationsRow = {
        id,
        operation_type: envelope.operationType,
        target_type: envelope.targetType,
        target_ref: envelope.targetRef,
        resolved_target_id: project.id,
        payload_json: canonicalJson(normalized),
        payload_hash: payloadHash,
        idempotency_key: envelope.idempotencyKey,
        source: OPERATIONS_SOURCE,
        requester_actor_type: "agent",
        requester_actor_id: principal.actorId,
        status: "pending",
        validation_result_json: canonicalJson({ valid: true, issues: [] }),
        preview_json: canonicalJson(preview),
        preview_fingerprint: previewFingerprint,
        contract_version: BACKLOG_CREATE_CONTRACT_VERSION,
        requested_at: now,
        created_at: now,
        updated_at: now,
    };

    try {
        db.prepare(`
            INSERT INTO operations (
                id, operation_type, target_type, target_ref, resolved_target_id,
                payload_json, payload_hash, idempotency_key, source,
                requester_actor_type, requester_actor_id, status,
                validation_result_json, preview_json, preview_fingerprint,
                contract_version, requested_at, created_at, updated_at
            ) VALUES (
                @id, @operation_type, @target_type, @target_ref, @resolved_target_id,
                @payload_json, @payload_hash, @idempotency_key, @source,
                @requester_actor_type, @requester_actor_id, @status,
                @validation_result_json, @preview_json, @preview_fingerprint,
                @contract_version, @requested_at, @created_at, @updated_at
            )
        `).run(row);
    } catch (error) {
        if (isUniqueViolation(error) && envelope.idempotencyKey !== null) {
            const existing = findByIdempotency(db, principal.actorId, envelope.idempotencyKey);
            if (existing) return reconcile(existing, payloadHash);
        }
        throw error;
    }

    const persisted = db.prepare("SELECT * FROM operations WHERE id = ?").get(id) as OperationsRow;
    return rowToRecord(persisted);
}

export function getOperationForRequester(
    db: Database.Database,
    principal: AgentPrincipal,
    operationId: string,
): OperationRecord {
    const row = db.prepare(
        "SELECT * FROM operations WHERE id = ? AND requester_actor_id = ?",
    ).get(operationId, principal.actorId) as OperationsRow | undefined;
    if (!row) {
        throw new OpsError("OPS_OPERATION_NOT_FOUND", "Operation not found", 404);
    }
    return rowToRecord(row);
}
