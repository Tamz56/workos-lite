// ---------------------------------------------------------------------------
// WorkOS Project Field Sheet v1 — Backlog insert adapter
// WORKOS-SHEET-GATE-6
// Mirrors the current project_items create contract (zod enums + defaults).
// ---------------------------------------------------------------------------

import { nanoid } from "nanoid";
import type Database from "better-sqlite3";
import { parseCanonicalJson } from "./auditSerialization";
import type { RowRecord } from "./auditRowRepository";
import type { BacklogNormalizedData } from "./types";
import { ExecutionError } from "./executionErrors";

export function insertBacklogItem(db: Database.Database, row: RowRecord): string {
    if (row.normalized_payload_json === null) {
        throw new ExecutionError("EXECUTION_INTERNAL_ERROR", "Eligible row has no persisted payload");
    }
    const data = parseCanonicalJson<BacklogNormalizedData>(row.normalized_payload_json);
    const id = nanoid();
    try {
        db.prepare(`
            INSERT INTO project_items (
                id, project_id, title, status, priority, schedule_bucket,
                start_date, end_date, is_milestone, workstream, dod_text, notes,
                created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
        `).run(
            id,
            row.resolved_project_id,
            data.title,
            data.status,
            data.priority ?? null,
            data.scheduleBucket ?? null,
            data.startDate ?? null,
            data.endDate ?? null,
            data.isMilestone ? 1 : 0,
            data.workstream ?? null,
            data.dodText ?? null,
            data.notes ?? null,
        );
    } catch (error) {
        if (error instanceof ExecutionError) throw error;
        throw new ExecutionError("EXECUTION_BACKLOG_INSERT_FAILED", "Backlog insert failed");
    }
    return id;
}
