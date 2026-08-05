// ---------------------------------------------------------------------------
// WorkOS Project Field Sheet v1 — Project Documentation insert adapter
// WORKOS-SHEET-GATE-6
// Reuses the existing narrow repository write boundary (createProjectDocBlock).
// ---------------------------------------------------------------------------

import { nanoid } from "nanoid";
import type Database from "better-sqlite3";
import { parseCanonicalJson } from "./auditSerialization";
import type { RowRecord } from "./auditRowRepository";
import type { ProjectDocumentationNormalizedData } from "./types";
import { ExecutionError } from "./executionErrors";

export function insertDocumentationBlock(db: Database.Database, row: RowRecord, batchId: string): string {
    if (row.normalized_payload_json === null) {
        throw new ExecutionError("EXECUTION_INTERNAL_ERROR", "Eligible row has no persisted payload");
    }
    const data = parseCanonicalJson<ProjectDocumentationNormalizedData>(row.normalized_payload_json);
    try {
        const id = nanoid();
        const now = new Date().toISOString();
        db.prepare(`
            INSERT INTO project_doc_blocks (
                id, project_id, legacy_project_slug, import_source, import_batch_id, migrated_at,
                source_row_number, source_record_id, block_type, title, block_date, summary, details_md,
                evidence_links_json, related_files_json, next_action, status, order_index,
                source_text, source_excerpt, source_type, generated_by, reviewed_by_user, applied_at,
                created_at, updated_at
            ) VALUES (
                @id, @project_id, NULL, 'google_sheet', @import_batch_id, NULL,
                @source_row_number, @source_record_id, @block_type, @title, @block_date, @summary, @details_md,
                @evidence_links_json, @related_files_json, @next_action, @status, @order_index,
                NULL, NULL, @source_type, NULL, @reviewed_by_user, NULL,
                @created_at, @updated_at
            )
        `).run({
            id,
            project_id: row.resolved_project_id,
            import_batch_id: batchId,
            source_row_number: row.source_row_number,
            source_record_id: row.external_row_id ?? null,
            block_type: data.blockType,
            title: data.title,
            block_date: data.date,
            summary: data.summary,
            details_md: data.details,
            evidence_links_json: JSON.stringify(data.evidenceLinks),
            related_files_json: JSON.stringify(data.relatedFiles),
            next_action: data.nextAction ?? null,
            status: data.status,
            order_index: data.orderIndex ?? null,
            source_type: data.sourceType ?? null,
            reviewed_by_user: data.reviewedByUser ? 1 : 0,
            created_at: now,
            updated_at: now,
        });
        return id;
    } catch (error) {
        if (error instanceof ExecutionError) throw error;
        throw new ExecutionError("EXECUTION_PROJECT_DOC_INSERT_FAILED", "Project documentation insert failed");
    }
}
