// ---------------------------------------------------------------------------
// WorkOS Project Field Sheet v1 — Stale-state revalidation before insert
// WORKOS-SHEET-GATE-6
// ---------------------------------------------------------------------------

import type Database from "better-sqlite3";
import { computeContentDuplicateHash } from "@/lib/project-doc-blocks/hashing";
import { mapRowToBlock } from "@/lib/project-doc-blocks/mappers";
import { parseCanonicalJson } from "./auditSerialization";
import type { RowRecord } from "./auditRowRepository";
import type { BacklogNormalizedData, ProjectDocumentationNormalizedData } from "./types";
import { ExecutionError } from "./executionErrors";

function docData(row: RowRecord): ProjectDocumentationNormalizedData {
    if (row.normalized_payload_json === null) {
        throw new ExecutionError("EXECUTION_INTERNAL_ERROR", "Eligible row has no persisted payload");
    }
    return parseCanonicalJson<ProjectDocumentationNormalizedData>(row.normalized_payload_json);
}

function incomingDocHash(row: RowRecord): string {
    const data = docData(row);
    return computeContentDuplicateHash({
        projectSlug: data.projectSlug,
        type: data.blockType,
        title: data.title,
        date: data.date,
        summary: data.summary,
        details: data.details,
        evidenceLinks: data.evidenceLinks,
        relatedFiles: data.relatedFiles,
        nextAction: data.nextAction ?? undefined,
        orderIndex: data.orderIndex ?? undefined,
        status: data.status,
    });
}

function existingDocHash(row: { block_type: string; title: string; block_date: string; summary: string; details_md: string; evidence_links_json: string; related_files_json: string; next_action: string | null; status: string; order_index: number | null; source_record_id: string | null }, slug: string): string {
    return computeContentDuplicateHash(
        mapRowToBlock(row as Parameters<typeof mapRowToBlock>[0], slug),
    );
}

export function revalidateProject(db: Database.Database, row: RowRecord): void {
    if (!row.resolved_project_id || !row.project_slug) {
        throw new ExecutionError("EXECUTION_STALE_PROJECT", "Project resolution is missing");
    }
    const project = db.prepare("SELECT id, slug FROM projects WHERE id = ?").get(row.resolved_project_id) as { id: string; slug: string } | undefined;
    if (!project) {
        throw new ExecutionError("EXECUTION_STALE_PROJECT", "Project no longer exists");
    }
    const bySlug = db.prepare("SELECT id, slug FROM projects WHERE slug = ?").get(row.project_slug) as { id: string; slug: string } | undefined;
    if (!bySlug || bySlug.id !== row.resolved_project_id || bySlug.slug !== row.project_slug) {
        throw new ExecutionError("EXECUTION_STALE_PROJECT", "Project slug no longer matches");
    }
}

export function revalidateDocumentationRow(db: Database.Database, row: RowRecord): void {
    if (!row.external_row_id || !row.resolved_project_id) {
        throw new ExecutionError("EXECUTION_INTERNAL_ERROR", "Eligible row is missing identity");
    }
    const identityMatch = db.prepare(
        "SELECT * FROM project_doc_blocks WHERE project_id = ? AND source_record_id = ?",
    ).get(row.resolved_project_id, row.external_row_id) as Parameters<typeof mapRowToBlock>[0] | undefined;
    const incomingHash = incomingDocHash(row);

    if (identityMatch) {
        if (identityMatch.status === "archived") {
            throw new ExecutionError("EXECUTION_STALE_REVIEW_REQUIRED", "Identity now points to an archived record");
        }
        if (existingDocHash(identityMatch, row.project_slug!) === incomingHash) {
            throw new ExecutionError("EXECUTION_STALE_DUPLICATE", "Identity now matches existing content");
        }
        throw new ExecutionError("EXECUTION_STALE_CONFLICT", "Identity now exists with different content");
    }

    const allBlocks = db.prepare("SELECT * FROM project_doc_blocks WHERE project_id = ?").all(row.resolved_project_id) as Parameters<typeof mapRowToBlock>[0][];
    const contentMatch = allBlocks.find(
        (block) => block.status !== "archived" && existingDocHash(block, row.project_slug!) === incomingHash,
    );
    if (contentMatch) {
        throw new ExecutionError("EXECUTION_STALE_DUPLICATE", "Equivalent content now exists under a different identity");
    }
}

function backlogData(row: RowRecord): BacklogNormalizedData {
    if (row.normalized_payload_json === null) {
        throw new ExecutionError("EXECUTION_INTERNAL_ERROR", "Eligible row has no persisted payload");
    }
    return parseCanonicalJson<BacklogNormalizedData>(row.normalized_payload_json);
}

function incomingBacklogKey(row: RowRecord): string {
    const data = backlogData(row);
    return JSON.stringify({
        project_id: row.resolved_project_id,
        title: data.title.trim(),
        status: data.status,
        priority: data.priority ?? null,
        schedule_bucket: data.scheduleBucket ?? null,
        start_date: data.startDate ?? null,
        end_date: data.endDate ?? null,
        is_milestone: data.isMilestone,
        workstream: data.workstream ?? null,
        dod_text: data.dodText ?? null,
        notes: data.notes ?? null,
    });
}

function existingBacklogKey(item: { title: string; status: string; priority: number | null; schedule_bucket: string | null; start_date: string | null; end_date: string | null; is_milestone: number; workstream: string | null; dod_text: string | null; notes: string | null }, projectId: string): string {
    return JSON.stringify({
        project_id: projectId,
        title: (item.title ?? "").trim(),
        status: item.status,
        priority: item.priority ?? null,
        schedule_bucket: item.schedule_bucket ?? null,
        start_date: item.start_date ?? null,
        end_date: item.end_date ?? null,
        is_milestone: item.is_milestone === 1,
        workstream: (item.workstream ?? "").trim() || null,
        dod_text: (item.dod_text ?? "").trim() || null,
        notes: (item.notes ?? "").trim() || null,
    });
}

export function revalidateBacklogRow(db: Database.Database, row: RowRecord): void {
    if (!row.resolved_project_id) {
        throw new ExecutionError("EXECUTION_STALE_PROJECT", "Project resolution is missing");
    }
    const items = db.prepare("SELECT * FROM project_items WHERE project_id = ?").all(row.resolved_project_id) as Array<{
        title: string;
        status: string;
        priority: number | null;
        schedule_bucket: string | null;
        start_date: string | null;
        end_date: string | null;
        is_milestone: number;
        workstream: string | null;
        dod_text: string | null;
        notes: string | null;
    }>;
    const incomingKey = incomingBacklogKey(row);
    if (items.some((item) => existingBacklogKey(item, row.resolved_project_id!) === incomingKey)) {
        throw new ExecutionError("EXECUTION_STALE_DUPLICATE", "Exact backlog content now exists");
    }
}
