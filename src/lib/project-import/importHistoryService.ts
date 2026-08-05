// ---------------------------------------------------------------------------
// WorkOS Project Field Sheet v1 — Import history application service
// WORKOS-SHEET-GATE-5
// ---------------------------------------------------------------------------

import type Database from "better-sqlite3";
import { getBatch } from "./auditBatchRepository";
import { listRowsByBatchEntity } from "./auditRowRepository";
import { listApprovalEvents, listApprovalHistory } from "./auditApprovalRepository";
import { listAttempts } from "./auditExecutionRepository";
import { ProjectImportApiError } from "./apiErrors";
import { serializeApprovalState, serializeBatchDetail, serializeBatchListItem, serializeRowItem } from "./apiSerialization";
import type { ImportBatchApiDetail, ImportBatchApiListItem, ImportBatchRowApiItem, Paginated } from "./apiTypes";
import type { EntityType } from "./auditTypes";
import { AuditNotFoundError } from "./auditTypes";
import type { RowRecord } from "./auditRowRepository";

export type BatchListQuery = {
    page: number;
    pageSize: number;
    status?: string;
    entityType?: string;
    projectId?: string;
    createdFrom?: string;
    createdTo?: string;
};

export type RowListQuery = {
    page: number;
    pageSize: number;
    entityType?: string;
    dryRunStatus?: string;
    parserStatus?: string;
    proposedOperation?: string;
    projectSlug?: string;
    sourceRowNumber?: number;
    hasErrors?: boolean;
    hasWarnings?: boolean;
};

function assertEntityType(value: string | undefined): value is EntityType {
    if (value === undefined) return true;
    return value === "project_documentation" || value === "backlog";
}

export function listBatchesApi(db: Database.Database, query: BatchListQuery): Paginated<ImportBatchApiListItem> {
    const where: string[] = [];
    const params: unknown[] = [];
    if (query.status) {
        where.push("batch_status = ?");
        params.push(query.status);
    }
    if (query.entityType) {
        if (!assertEntityType(query.entityType)) {
            throw new ProjectImportApiError("INVALID_QUERY_PARAMETER", "Invalid entityType", 400);
        }
        where.push("EXISTS (SELECT 1 FROM import_batch_rows r WHERE r.batch_id = import_batches.id AND r.entity_type = ?)");
        params.push(query.entityType);
    }
    if (query.projectId) {
        where.push("EXISTS (SELECT 1 FROM import_batch_rows r WHERE r.batch_id = import_batches.id AND r.resolved_project_id = ?)");
        params.push(query.projectId);
    }
    if (query.createdFrom) {
        where.push("created_at >= ?");
        params.push(query.createdFrom);
    }
    if (query.createdTo) {
        where.push("created_at <= ?");
        params.push(query.createdTo);
    }
    const whereSql = where.length > 0 ? ` WHERE ${where.join(" AND ")}` : "";
    const total = (db.prepare(`SELECT COUNT(*) AS c FROM import_batches${whereSql}`).get(...params) as { c: number }).c;
    const rows = db.prepare(
        `SELECT * FROM import_batches${whereSql} ORDER BY created_at DESC, id DESC LIMIT ? OFFSET ?`,
    ).all(...params, query.pageSize, (query.page - 1) * query.pageSize) as Array<Record<string, unknown>>;
    const totalPages = Math.ceil(total / query.pageSize);
    return {
        items: rows.map((row) => serializeBatchListItem(row as Parameters<typeof serializeBatchListItem>[0])),
        page: query.page,
        pageSize: query.pageSize,
        totalItems: total,
        totalPages,
    };
}

export function getBatchDetailApi(db: Database.Database, batchId: string, now = new Date().toISOString()): ImportBatchApiDetail {
    let batch;
    try {
        batch = getBatch(db, batchId);
    } catch (error) {
        if (error instanceof AuditNotFoundError) {
            throw new ProjectImportApiError("IMPORT_BATCH_NOT_FOUND", "Batch not found", 404);
        }
        throw error;
    }
    const approvals = (["project_documentation", "backlog"] as EntityType[]).map((entityType) => {
        const history = listApprovalHistory(db, batchId, entityType);
        const latest = history[history.length - 1];
        if (!latest) {
            return {
                entityType,
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
        return serializeApprovalState(latest, listApprovalEvents(db, latest.id), now);
    });
    const attempts = [
        ...listAttempts(db, batchId, "project_documentation"),
        ...listAttempts(db, batchId, "backlog"),
    ];
    return serializeBatchDetail(batch, approvals, attempts);
}

export function listRowsApi(db: Database.Database, batchId: string, query: RowListQuery): Paginated<ImportBatchRowApiItem> {
    try {
        getBatch(db, batchId);
    } catch (error) {
        if (error instanceof AuditNotFoundError) {
            throw new ProjectImportApiError("IMPORT_BATCH_NOT_FOUND", "Batch not found", 404);
        }
        throw error;
    }

    const where: string[] = ["batch_id = ?"];
    const params: unknown[] = [batchId];
    if (query.entityType) {
        if (!assertEntityType(query.entityType)) {
            throw new ProjectImportApiError("INVALID_QUERY_PARAMETER", "Invalid entityType", 400);
        }
        where.push("entity_type = ?");
        params.push(query.entityType);
    }
    if (query.dryRunStatus) {
        where.push("dry_run_status = ?");
        params.push(query.dryRunStatus);
    }
    if (query.parserStatus) {
        where.push("parser_status = ?");
        params.push(query.parserStatus);
    }
    if (query.proposedOperation) {
        where.push("proposed_operation = ?");
        params.push(query.proposedOperation);
    }
    if (query.projectSlug) {
        where.push("project_slug = ?");
        params.push(query.projectSlug);
    }
    if (query.sourceRowNumber !== undefined) {
        where.push("source_row_number = ?");
        params.push(query.sourceRowNumber);
    }
    if (query.hasErrors === true) {
        where.push("error_count > 0");
    }
    if (query.hasWarnings === true) {
        where.push("warning_count > 0");
    }

    const whereSql = ` WHERE ${where.join(" AND ")}`;
    const total = (db.prepare(`SELECT COUNT(*) AS c FROM import_batch_rows${whereSql}`).get(...params) as { c: number }).c;
    const rows = db.prepare(
        `SELECT * FROM import_batch_rows${whereSql} ORDER BY source_row_number ASC, id ASC LIMIT ? OFFSET ?`,
    ).all(...params, query.pageSize, (query.page - 1) * query.pageSize) as RowRecord[];
    const totalPages = Math.ceil(total / query.pageSize);
    return {
        items: rows.map(serializeRowItem),
        page: query.page,
        pageSize: query.pageSize,
        totalItems: total,
        totalPages,
    };
}

export function listRowsByBatchEntitySafe(db: Database.Database, batchId: string, entityType: EntityType) {
    return listRowsByBatchEntity(db, batchId, entityType);
}
