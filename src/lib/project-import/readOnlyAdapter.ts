// ---------------------------------------------------------------------------
// WorkOS Project Field Sheet v1 — Read-only database adapter
// WORKOS-SHEET-GATE-3
// The dry-run layer must never import @/db/db (its module-level initialization
// runs schema ensures). A truly read-only better-sqlite3 connection is used
// instead, or an injected in-memory database in tests.
// ---------------------------------------------------------------------------

import Database from "better-sqlite3";
import type {
    DryRunBacklogItemRow,
    DryRunProjectDocumentationRow,
    DryRunReadAdapter,
} from "./dryRunTypes";

export function openReadOnlyWorkosDatabase(dbPath: string): Database.Database {
    return new Database(dbPath, { readonly: true, fileMustExist: true });
}

export function createDryRunReadAdapter(db: Database.Database): DryRunReadAdapter {
    const resolveProjectBySlug = db.prepare("SELECT id, slug FROM projects WHERE slug = ?");
    const documentationByProject = db.prepare("SELECT * FROM project_doc_blocks WHERE project_id = ?");
    const documentationByIdentity = db.prepare("SELECT * FROM project_doc_blocks WHERE project_id = ? AND source_record_id = ?");
    const documentationCandidates = db.prepare(
        "SELECT * FROM project_doc_blocks WHERE project_id = ? AND LOWER(TRIM(title)) = LOWER(TRIM(?)) AND block_date = ?",
    );
    const backlogByProject = db.prepare("SELECT * FROM project_items WHERE project_id = ?");

    return {
        resolveProjectBySlug: (slug) => resolveProjectBySlug.all(slug) as Array<{ id: string; slug: string }>,
        findDocumentationBlocksByProject: (projectId) => documentationByProject.all(projectId) as DryRunProjectDocumentationRow[],
        findDocumentationBlocksByIdentity: (projectId, sourceRecordId) =>
            documentationByIdentity.all(projectId, sourceRecordId) as DryRunProjectDocumentationRow[],
        findDocumentationDuplicateCandidates: (projectId, title, date) =>
            documentationCandidates.all(projectId, title, date) as DryRunProjectDocumentationRow[],
        findBacklogItemsByProject: (projectId) => backlogByProject.all(projectId) as DryRunBacklogItemRow[],
    };
}
