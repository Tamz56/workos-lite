import {
    DocBlockSourceType,
    ProjectDocBlockType,
    ProjectDocumentationBlock
} from "@/lib/types";

export interface DbProjectDocBlockRow {
    id: string;
    project_id: string;
    legacy_project_slug: string | null;
    import_source: string | null;
    import_batch_id: string | null;
    migrated_at: string | null;
    source_row_number: number | null;
    source_record_id: string | null;
    block_type: ProjectDocBlockType;
    title: string;
    block_date: string;
    summary: string;
    details_md: string;
    evidence_links_json: string;
    related_files_json: string;
    next_action: string | null;
    status: string;
    order_index: number | null;
    source_text: string | null;
    source_excerpt: string | null;
    source_type: DocBlockSourceType | null;
    generated_by: "arbor" | null;
    reviewed_by_user: number;
    applied_at: string | null;
    created_at: string;
    updated_at: string;
}

export type ProjectDocBlockPersistenceContext = {
    projectId: string;
    legacyProjectSlug?: string | null;
    importSource?: string | null;
    importBatchId?: string | null;
    migratedAt?: string | null;
    sourceRowNumber?: number | null;
    sourceRecordId?: string | null;
};

export type ProjectDocBlockApiResponse = Omit<ProjectDocumentationBlock, "projectSlug"> & {
    projectId: string;
    legacyProjectSlug: string | null;
    importSource: string | null;
    importBatchId: string | null;
    migratedAt: string | null;
    sourceRowNumber: number | null;
    sourceRecordId: string | null;
};

/**
 * Maps a SQLite database row to a domain ProjectDocumentationBlock object.
 * Validates that JSON array fields are correctly formatted.
 */
export function mapRowToBlock(row: DbProjectDocBlockRow, projectSlug: string): ProjectDocumentationBlock {
    let evidenceLinks: string[] = [];
    let relatedFiles: string[] = [];

    // Safe parsing for evidenceLinks
    try {
        const parsed = JSON.parse(row.evidence_links_json || "[]");
        if (!Array.isArray(parsed) || !parsed.every(item => typeof item === "string")) {
            throw new Error("Not a string array");
        }
        evidenceLinks = parsed;
    } catch {
        console.error(`[Data Integrity Error] Invalid JSON in evidence_links_json for block ID ${row.id}: ${row.evidence_links_json}`);
        throw new Error(`Data Integrity Error: Invalid evidence links format in database for block ${row.id}`);
    }

    // Safe parsing for relatedFiles
    try {
        const parsed = JSON.parse(row.related_files_json || "[]");
        if (!Array.isArray(parsed) || !parsed.every(item => typeof item === "string")) {
            throw new Error("Not a string array");
        }
        relatedFiles = parsed;
    } catch {
        console.error(`[Data Integrity Error] Invalid JSON in related_files_json for block ID ${row.id}: ${row.related_files_json}`);
        throw new Error(`Data Integrity Error: Invalid related files format in database for block ${row.id}`);
    }

    return {
        id: row.id,
        projectSlug,
        type: row.block_type,
        title: row.title,
        date: row.block_date,
        summary: row.summary,
        details: row.details_md,
        evidenceLinks,
        relatedFiles,
        status: row.status,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        ...(row.next_action && { nextAction: row.next_action }),
        ...(row.order_index !== null && { orderIndex: row.order_index }),
        ...(row.source_text && { sourceText: row.source_text }),
        ...(row.source_excerpt && { sourceExcerpt: row.source_excerpt }),
        ...(row.source_type && { sourceType: row.source_type }),
        ...(row.generated_by && { generatedBy: (row.import_source === "localstorage_recovery") ? "arbor" as const : "arbor_assistant" as const }),
        reviewedByUser: row.reviewed_by_user === 1,
        ...(row.applied_at && { appliedAt: row.applied_at })
    };
}

/**
 * Maps a SQLite row to the public read-only API contract.
 */
export function mapRowToApiResponse(
    row: DbProjectDocBlockRow,
    projectSlug: string
): ProjectDocBlockApiResponse {
    const { projectSlug: _projectSlug, ...block } = mapRowToBlock(row, projectSlug);
    void _projectSlug;

    return {
        ...block,
        projectId: row.project_id,
        legacyProjectSlug: row.legacy_project_slug,
        importSource: row.import_source,
        importBatchId: row.import_batch_id,
        migratedAt: row.migrated_at,
        sourceRowNumber: row.source_row_number,
        sourceRecordId: row.source_record_id
    };
}

/**
 * Maps a domain ProjectDocumentationBlock object to a database row.
 * Accepts an optional context for import metadata.
 */
export function mapBlockToRow(
    block: ProjectDocumentationBlock,
    context: ProjectDocBlockPersistenceContext
): DbProjectDocBlockRow {
    return {
        id: block.id,
        project_id: context.projectId,
        legacy_project_slug: context.legacyProjectSlug !== undefined ? context.legacyProjectSlug : (block.projectSlug || null),
        import_source: context.importSource || null,
        import_batch_id: context.importBatchId || null,
        migrated_at: context.migratedAt || null,
        source_row_number: context.sourceRowNumber !== undefined ? context.sourceRowNumber : null,
        source_record_id: context.sourceRecordId || null,
        block_type: block.type,
        title: block.title,
        block_date: block.date,
        summary: block.summary || "",
        details_md: block.details,
        evidence_links_json: JSON.stringify(block.evidenceLinks || []),
        related_files_json: JSON.stringify(block.relatedFiles || []),
        next_action: block.nextAction || null,
        status: block.status || "active",
        order_index: block.orderIndex !== undefined ? block.orderIndex : null,
        source_text: block.sourceText || null,
        source_excerpt: block.sourceExcerpt || null,
        source_type: block.sourceType || null,
        generated_by: (block.generatedBy === "arbor" || block.generatedBy === "arbor_assistant") ? "arbor" : null,
        reviewed_by_user: block.reviewedByUser ? 1 : 0,
        applied_at: block.appliedAt || null,
        created_at: block.createdAt,
        updated_at: block.updatedAt
    };
}
