// ---------------------------------------------------------------------------
// WorkOS Project Field Sheet v1 — Approval application service
// WORKOS-SHEET-GATE-5
// Actor identity is always server-derived; approval binding is always derived
// from the persisted batch, never from the client.
// ---------------------------------------------------------------------------

import type Database from "better-sqlite3";
import { getBatch } from "./auditBatchRepository";
import { listRowsByBatchEntity } from "./auditRowRepository";
import {
    approveEntity as repoApproveEntity,
    createApproval,
    findLatestValidApproval,
    listApprovalEvents,
    listApprovalHistory,
    rejectApproval as repoRejectApproval,
    revokeApproval as repoRevokeApproval,
    type ApprovalRecord,
} from "./auditApprovalRepository";
import { listAttempts } from "./auditExecutionRepository";
import { ProjectImportApiError } from "./apiErrors";
import { serializeApprovalState } from "./apiSerialization";
import type { ApprovalApiState } from "./apiTypes";
import type { ApprovalBinding, EntityType } from "./auditTypes";
import { AuditBlockedError, AuditBindingMismatchError, AuditNotFoundError, AuditTransitionError } from "./auditTypes";

export type ApprovalServiceDeps = {
    db: Database.Database;
    now?: string;
};

function nowIso(deps: ApprovalServiceDeps): string {
    return deps.now ?? new Date().toISOString();
}

function bindingFromBatch(batch: ReturnType<typeof getBatch>, entityType: EntityType): ApprovalBinding {
    return {
        batchId: batch.id,
        entityType,
        boundFileHash: batch.source_file_hash,
        boundDryRunId: batch.dry_run_id,
        boundSchemaVersion: batch.schema_version,
        boundParserContractVersion: batch.parser_contract_version,
        boundDryRunContractVersion: batch.dry_run_contract_version,
        approvalSummaryFingerprint: "",
    };
}

function getBatchSafe(db: Database.Database, batchId: string): ReturnType<typeof getBatch> {
    try {
        return getBatch(db, batchId);
    } catch (error) {
        if (error instanceof AuditNotFoundError) {
            throw new ProjectImportApiError("IMPORT_BATCH_NOT_FOUND", "Batch not found", 404);
        }
        throw error;
    }
}

function assertEntityType(value: string): asserts value is EntityType {
    if (value !== "project_documentation" && value !== "backlog") {
        throw new ProjectImportApiError("INVALID_IMPORT_ENTITY", "Invalid entity type", 400);
    }
}

function sanitizeReason(reason: unknown): string | null {
    if (typeof reason !== "string") return null;
    const cleaned = reason.replace(/[\u0000-\u001f\u007f]/g, "").trim();
    if (!cleaned) return null;
    return cleaned.slice(0, 200);
}

export function approveEntityApi(
    batchId: string,
    entityTypeRaw: string,
    actorName: string,
    deps: ApprovalServiceDeps,
): ApprovalRecord {
    assertEntityType(entityTypeRaw);
    const now = nowIso(deps);
    const batch = getBatchSafe(deps.db, batchId);

    const existing = findLatestValidApproval(deps.db, batchId, entityTypeRaw, now);
    if (existing) {
        // Idempotent: identical repeat approval returns the current valid approval.
        return existing;
    }

    const rows = listRowsByBatchEntity(deps.db, batchId, entityTypeRaw);
    if (!rows.some((row) => row.dry_run_status === "new")) {
        throw new ProjectImportApiError("IMPORT_ENTITY_HAS_NO_ELIGIBLE_ROWS", "Entity has no eligible new rows", 400);
    }

    try {
        const binding = bindingFromBatch(batch, entityTypeRaw);
        return repoApproveEntity(deps.db, {
            batchId,
            entityType: entityTypeRaw,
            approvedBy: actorName,
            now,
            boundFileHash: binding.boundFileHash,
            boundDryRunId: binding.boundDryRunId,
            boundSchemaVersion: binding.boundSchemaVersion,
            boundParserContractVersion: binding.boundParserContractVersion,
            boundDryRunContractVersion: binding.boundDryRunContractVersion,
        });
    } catch (error) {
        if (error instanceof AuditBlockedError) {
            throw new ProjectImportApiError("IMPORT_ENTITY_BLOCKED", error.message, 409);
        }
        if (error instanceof AuditBindingMismatchError) {
            throw new ProjectImportApiError("IMPORT_APPROVAL_BINDING_MISMATCH", error.message, 409);
        }
        throw error;
    }
}

export function rejectEntityApi(
    batchId: string,
    entityTypeRaw: string,
    actorName: string,
    reason: unknown,
    deps: ApprovalServiceDeps,
): ApprovalRecord {
    assertEntityType(entityTypeRaw);
    const now = nowIso(deps);
    const batch = getBatchSafe(deps.db, batchId);
    const safeReason = sanitizeReason(reason);

    const transaction = deps.db.transaction(() => {
        const history = listApprovalHistory(deps.db, batchId, entityTypeRaw);
        const latest = history[history.length - 1];
        if (latest && latest.approval_status === "pending") {
            return repoRejectApproval(deps.db, latest.id, { rejectedBy: actorName, now, reason: safeReason });
        }
        const pending = createApproval(deps.db, bindingFromBatch(batch, entityTypeRaw));
        return repoRejectApproval(deps.db, pending.id, { rejectedBy: actorName, now, reason: safeReason });
    });
    return transaction();
}

export function revokeEntityApi(
    batchId: string,
    entityTypeRaw: string,
    actorName: string,
    deps: ApprovalServiceDeps,
): ApprovalRecord {
    assertEntityType(entityTypeRaw);
    const now = nowIso(deps);
    getBatchSafe(deps.db, batchId);
    const approval = findLatestValidApproval(deps.db, batchId, entityTypeRaw, now);
    if (!approval) {
        throw new ProjectImportApiError("IMPORT_APPROVAL_NOT_FOUND", "No active approval to revoke", 404);
    }
    try {
        return repoRevokeApproval(deps.db, approval.id, { revokedBy: actorName, now });
    } catch (error) {
        if (error instanceof AuditTransitionError) {
            throw new ProjectImportApiError("IMPORT_APPROVAL_INVALID_TRANSITION", error.message, 409);
        }
        throw error;
    }
}

export function approvalStateForEntity(
    batchId: string,
    entityTypeRaw: string,
    deps: ApprovalServiceDeps,
): ApprovalApiState {
    assertEntityType(entityTypeRaw);
    const now = nowIso(deps);
    getBatchSafe(deps.db, batchId);
    const history = listApprovalHistory(deps.db, batchId, entityTypeRaw);
    const latest = history[history.length - 1];
    if (!latest) {
        return {
            entityType: entityTypeRaw,
            approvalId: null,
            effectiveStatus: "none",
            approvedBy: null,
            approvedAt: null,
            expiresAt: null,
            rejectedBy: null,
            rejectedAt: null,
            revokedBy: null,
            revokedAt: null,
            consumedAt: null,
            validityAt: now,
            isValidNow: false,
            bindingFingerprintExcerpt: "",
            events: [],
        };
    }
    return serializeApprovalState(latest, listApprovalEvents(deps.db, latest.id), now);
}

export function approvalStatesForBatch(batchId: string, deps: ApprovalServiceDeps): ApprovalApiState[] {
    return [
        approvalStateForEntity(batchId, "project_documentation", deps),
        approvalStateForEntity(batchId, "backlog", deps),
    ];
}

export function executionAttemptSummaries(batchId: string, deps: ApprovalServiceDeps) {
    return [
        ...listAttempts(deps.db, batchId, "project_documentation"),
        ...listAttempts(deps.db, batchId, "backlog"),
    ];
}
