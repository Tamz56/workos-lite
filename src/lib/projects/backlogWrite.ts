// ---------------------------------------------------------------------------
// WorkOS-Lite canonical project_items write primitive
// AUTOMATION-001-P1D.W
// Write-only: caller owns validation, project resolution, transactions,
// error mapping, and authorization. Mirrors the canonical backlog route
// INSERT semantics exactly (nanoid id, no explicit created_at/updated_at).
// ---------------------------------------------------------------------------

import { nanoid } from "nanoid";
import type Database from "better-sqlite3";
import { z } from "zod";
import { CreateProjectItemSchema } from "./backlogCreateSchema";

export type ParsedProjectItem = z.output<typeof CreateProjectItemSchema>;

export function insertProjectItem(
    db: Database.Database,
    projectId: string,
    parsed: ParsedProjectItem,
): string {
    const id = nanoid();
    db.prepare(`
        INSERT INTO project_items (
            id, project_id, title, status, priority, schedule_bucket,
            start_date, end_date, is_milestone, workstream, dod_text, notes
        ) VALUES (
            @id, @projectId, @title, @status, @priority, @scheduleBucket,
            @startDate, @endDate, @isMilestone, @workstream, @dodText, @notes
        )
    `).run({
        id,
        projectId,
        title: parsed.title,
        status: parsed.status,
        priority: parsed.priority ?? null,
        scheduleBucket: parsed.schedule_bucket ?? null,
        startDate: parsed.start_date ?? null,
        endDate: parsed.end_date ?? null,
        isMilestone: parsed.is_milestone ?? 0,
        workstream: parsed.workstream ?? null,
        dodText: parsed.dod_text ?? null,
        notes: parsed.notes ?? null,
    });
    return id;
}
