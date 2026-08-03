import { getDb } from "@/db/db";
import { ProjectDocumentationBlock } from "@/lib/types";
import {
    DbProjectDocBlockRow,
    mapRowToBlock,
    mapRowToApiResponse,
    mapBlockToRow,
    ProjectDocBlockApiResponse,
    ProjectDocBlockPersistenceContext
} from "./mappers";
import { nanoid } from "nanoid";

export type ProjectDocBlockListStatus = "active" | "archived" | "all";

/**
 * Resolves the slug of a project from its ID.
 */
export function getProjectSlug(projectId: string): string {
    const db = getDb();
    const row = db.prepare("SELECT slug FROM projects WHERE id = ?").get(projectId) as { slug: string } | undefined;
    if (!row) {
        throw new Error(`Data Integrity Error: Project ID ${projectId} does not exist in the projects table.`);
    }
    return row.slug;
}

/**
 * Resolves the project ID from a project slug.
 */
export function getProjectIdBySlug(slug: string): string | null {
    const db = getDb();
    const row = db.prepare("SELECT id FROM projects WHERE slug = ?").get(slug) as { id: string } | undefined;
    return row ? row.id : null;
}

/**
 * Checks project existence without loading document blocks.
 */
export function projectExistsById(projectId: string): boolean {
    const db = getDb();
    const row = db.prepare("SELECT 1 FROM projects WHERE id = ?").get(projectId);
    return row !== undefined;
}

/**
 * Resolves a project identifier (ID or slug) to its canonical project ID.
 * Queries by ID first, then by slug. Returns null if neither matches.
 */
export function resolveProjectId(identifier: string): string | null {
    const db = getDb();
    const byId = db.prepare("SELECT id FROM projects WHERE id = ?").get(identifier) as { id: string } | undefined;
    if (byId) return byId.id;
    const bySlug = db.prepare("SELECT id FROM projects WHERE slug = ?").get(identifier) as { id: string } | undefined;
    return bySlug ? bySlug.id : null;
}

/**
 * Lists document blocks for the read-only API using the approved Task 1 order.
 */
export function listProjectDocBlocks(input: {
    projectId: string;
    status: ProjectDocBlockListStatus;
}): ProjectDocBlockApiResponse[] {
    const db = getDb();
    const slug = getProjectSlug(input.projectId);
    let query = "SELECT * FROM project_doc_blocks WHERE project_id = ?";
    const params: string[] = [input.projectId];

    if (input.status !== "all") {
        query += " AND status = ?";
        params.push(input.status);
    }

    query += " ORDER BY order_index ASC, block_date DESC, created_at DESC, id ASC";

    const rows = db.prepare(query).all(...params) as DbProjectDocBlockRow[];
    return rows.map(row => mapRowToApiResponse(row, slug));
}

/**
 * Gets one document block only when it belongs to the requested project.
 */
export function getProjectDocBlockByProjectAndId(
    projectId: string,
    blockId: string
): ProjectDocBlockApiResponse | null {
    const db = getDb();
    const row = db.prepare(
        "SELECT * FROM project_doc_blocks WHERE project_id = ? AND id = ?"
    ).get(projectId, blockId) as DbProjectDocBlockRow | undefined;

    if (!row) return null;
    return mapRowToApiResponse(row, getProjectSlug(projectId));
}

/**
 * Finds all document blocks associated with a project ID.
 */
export function findProjectDocBlocksByProjectId(projectId: string, includeArchived = false): ProjectDocumentationBlock[] {
    const db = getDb();
    const slug = getProjectSlug(projectId);

    let query = "SELECT * FROM project_doc_blocks WHERE project_id = ?";
    if (!includeArchived) {
        query += " AND status = 'active'";
    }
    query += " ORDER BY order_index ASC, block_date DESC, created_at DESC";

    const rows = db.prepare(query).all(projectId) as DbProjectDocBlockRow[];
    return rows.map(row => mapRowToBlock(row, slug));
}

/**
 * Finds a single document block by its ID.
 */
export function findProjectDocBlockById(id: string): ProjectDocumentationBlock | null {
    const db = getDb();
    const row = db.prepare("SELECT * FROM project_doc_blocks WHERE id = ?").get(id) as DbProjectDocBlockRow | undefined;
    if (!row) return null;
    const slug = getProjectSlug(row.project_id);
    return mapRowToBlock(row, slug);
}

/**
 * Finds a single document block by ID and project ID.
 */
export function findProjectDocBlockByIdAndProjectId(id: string, projectId: string): ProjectDocumentationBlock | null {
    const db = getDb();
    const row = db.prepare("SELECT * FROM project_doc_blocks WHERE id = ? AND project_id = ?").get(id, projectId) as DbProjectDocBlockRow | undefined;
    if (!row) return null;
    const slug = getProjectSlug(projectId);
    return mapRowToBlock(row, slug);
}

/**
 * Finds duplicate candidates under a project with matching title and date.
 */
export function findDuplicateCandidates(projectId: string, title: string, date: string): ProjectDocumentationBlock[] {
    const db = getDb();
    const slug = getProjectSlug(projectId);

    // Exact title matching (case-insensitive in SQLite usually, but let's trimmed match)
    const rows = db.prepare(`
        SELECT * FROM project_doc_blocks
        WHERE project_id = ? AND LOWER(TRIM(title)) = LOWER(TRIM(?)) AND block_date = ?
    `).all(projectId, title, date) as DbProjectDocBlockRow[];

    return rows.map(row => mapRowToBlock(row, slug));
}

/**
 * Inserts a document block into the database.
 */
export function insertProjectDocBlock(block: ProjectDocumentationBlock, context: ProjectDocBlockPersistenceContext): void {
    const db = getDb();
    const row = mapBlockToRow(block, context);

    db.prepare(`
        INSERT INTO project_doc_blocks (
            id, project_id, legacy_project_slug, import_source, import_batch_id,
            migrated_at, source_row_number, source_record_id, block_type, title,
            block_date, summary, details_md, evidence_links_json, related_files_json,
            next_action, status, order_index, source_text, source_excerpt,
            source_type, generated_by, reviewed_by_user, applied_at, created_at, updated_at
        ) VALUES (
            ?, ?, ?, ?, ?,
            ?, ?, ?, ?, ?,
            ?, ?, ?, ?, ?,
            ?, ?, ?, ?, ?,
            ?, ?, ?, ?, ?, ?
        )
    `).run(
        row.id,
        row.project_id,
        row.legacy_project_slug,
        row.import_source,
        row.import_batch_id,
        row.migrated_at,
        row.source_row_number,
        row.source_record_id,
        row.block_type,
        row.title,
        row.block_date,
        row.summary,
        row.details_md,
        row.evidence_links_json,
        row.related_files_json,
        row.next_action,
        row.status,
        row.order_index,
        row.source_text,
        row.source_excerpt,
        row.source_type,
        row.generated_by,
        row.reviewed_by_user,
        row.applied_at,
        row.created_at,
        row.updated_at
    );
}

/**
 * Updates a document block with partial parameters.
 */
/**
 * Updates a document block with project isolation, concurrency check, and returns status + optional updated block.
 */
export function updateProjectDocBlock(input: {
    id: string;
    projectId: string;
    expectedUpdatedAt: string;
    payload: Partial<Omit<DbProjectDocBlockRow, "id" | "project_id" | "created_at" | "updated_at">> & { status?: string };
}): { success: boolean; errorType?: "not_found" | "conflict"; block?: ProjectDocBlockApiResponse } {
    const db = getDb();

    // 1. Check isolation & existence
    const current = db.prepare("SELECT updated_at, project_id FROM project_doc_blocks WHERE id = ?").get(input.id) as { updated_at: string, project_id: string } | undefined;
    if (!current) {
        return { success: false, errorType: "not_found" };
    }
    if (current.project_id !== input.projectId) {
        return { success: false, errorType: "not_found" };
    }

    // 2. Concurrency check
    if (current.updated_at !== input.expectedUpdatedAt) {
        return { success: false, errorType: "conflict" };
    }

    const entries = Object.entries(input.payload);
    if (entries.length === 0) {
        const block = getProjectDocBlockByProjectAndId(input.projectId, input.id);
        return { success: true, block: block || undefined };
    }

    // Generate explicit server updated_at
    const serverUpdatedAt = new Date().toISOString();

    const setClauses = [...entries.map(([key]) => `${key} = ?`), "updated_at = ?"].join(", ");
    const values = [...entries.map(([, value]) => value), serverUpdatedAt];

    // Update check using transaction-like where clause
    const result = db.prepare(`
        UPDATE project_doc_blocks
        SET ${setClauses}
        WHERE id = ? AND project_id = ? AND updated_at = ?
    `).run(...values, input.id, input.projectId, input.expectedUpdatedAt);

    if (result.changes === 0) {
        return { success: false, errorType: "conflict" };
    }

    // 3. Read back from database to get the exact final state
    const block = getProjectDocBlockByProjectAndId(input.projectId, input.id);
    if (!block) {
        return { success: false, errorType: "not_found" };
    }

    return { success: true, block };
}

/**
 * Archives a block with project isolation and concurrency checks.
 */
export function archiveProjectDocBlock(input: {
    id: string;
    projectId: string;
    expectedUpdatedAt: string;
}): { success: boolean; errorType?: "not_found" | "conflict"; block?: ProjectDocBlockApiResponse } {
    return updateProjectDocBlock({
        id: input.id,
        projectId: input.projectId,
        expectedUpdatedAt: input.expectedUpdatedAt,
        payload: { status: "archived" }
    });
}

/**
 * Restores a block with project isolation and concurrency checks.
 */
export function restoreProjectDocBlock(input: {
    id: string;
    projectId: string;
    expectedUpdatedAt: string;
}): { success: boolean; errorType?: "not_found" | "conflict"; block?: ProjectDocBlockApiResponse } {
    return updateProjectDocBlock({
        id: input.id,
        projectId: input.projectId,
        expectedUpdatedAt: input.expectedUpdatedAt,
        payload: { status: "active" }
    });
}

/**
 * Inserts a document block into the database and returns the fully mapped block.
 */
export function createProjectDocBlock(
    block: Omit<ProjectDocumentationBlock, "id" | "createdAt" | "updatedAt" | "projectSlug"> & { projectSlug?: string },
    context: ProjectDocBlockPersistenceContext
): ProjectDocBlockApiResponse {
    const db = getDb();
    const id = nanoid();
    const now = new Date().toISOString();
    const projectSlug = block.projectSlug || getProjectSlug(context.projectId);

    const blockToInsert: ProjectDocumentationBlock = {
        ...block,
        projectSlug,
        id,
        createdAt: now,
        updatedAt: now
    };

    const row = mapBlockToRow(blockToInsert, context);

    db.prepare(`
        INSERT INTO project_doc_blocks (
            id, project_id, legacy_project_slug, import_source, import_batch_id,
            migrated_at, source_row_number, source_record_id, block_type, title,
            block_date, summary, details_md, evidence_links_json, related_files_json,
            next_action, status, order_index, source_text, source_excerpt,
            source_type, generated_by, reviewed_by_user, applied_at, created_at, updated_at
        ) VALUES (
            ?, ?, ?, ?, ?,
            ?, ?, ?, ?, ?,
            ?, ?, ?, ?, ?,
            ?, ?, ?, ?, ?,
            ?, ?, ?, ?, ?, ?
        )
    `).run(
        row.id,
        row.project_id,
        row.legacy_project_slug,
        row.import_source,
        row.import_batch_id,
        row.migrated_at,
        row.source_row_number,
        row.source_record_id,
        row.block_type,
        row.title,
        row.block_date,
        row.summary,
        row.details_md,
        row.evidence_links_json,
        row.related_files_json,
        row.next_action,
        row.status,
        row.order_index,
        row.source_text,
        row.source_excerpt,
        row.source_type,
        row.generated_by,
        row.reviewed_by_user,
        row.applied_at,
        row.created_at,
        row.updated_at
    );

    const savedBlock = getProjectDocBlockByProjectAndId(context.projectId, id);
    if (!savedBlock) {
        throw new Error("Failed to retrieve created record.");
    }
    return savedBlock;
}

/**
 * Performs a hard delete on a document block.
 */
export function deleteProjectDocBlock(id: string): void {
    const db = getDb();
    db.prepare("DELETE FROM project_doc_blocks WHERE id = ?").run(id);
}
