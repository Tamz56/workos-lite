// ---------------------------------------------------------------------------
// WorkOS-Lite — Project Context Curator (CTX2-R1)
// Stage A — Metadata-only Project Knowledge Index
// ---------------------------------------------------------------------------
// Reads ONLY metadata columns. It MUST NOT SELECT or materialize large
// content fields (details_md, content_md, decision/reason/impact bodies).
// No semantic relevance decisions are made here.
// ---------------------------------------------------------------------------
import type Database from "better-sqlite3";
import { createHash } from "crypto";
import {
    DERIVED_CONTEXT_TITLE,
    PROJECT_CONTEXT_DISPLAY_TITLE,
    PROJECT_CONTEXT_SNAPSHOT_DISPLAY_TITLE,
    PROJECT_CONTEXT_SOURCE_INDEX_SCHEMA_VERSION,
    ProjectContextCuratorError,
    type ProjectContextSnapshotMetadata,
    type ProjectContextSourceIndex,
    type ProjectContextSourceIndexEntry,
    type ProjectContextSourceIndexProject,
    type ProjectContextSourceKind,
    type ProjectContextSourceRef,
} from "./contracts";
import { MAX_INDEX_ENTRIES_PER_KIND } from "./bounds";

/** Stable source-kind ordering used by the deterministic index ordering. */
export const PROJECT_CONTEXT_KIND_ORDER: ProjectContextSourceKind[] = [
    "project_metadata",
    "doc_block",
    "doc",
    "decision",
    "project_context",
    "loop",
    "project_context_snapshot",
];

export interface CollectSourceIndexOptions {
    /** Deterministic timestamp override (ISO 8601). */
    now?: string;
    /** Include archived loops in the index. Defaults to false. */
    includeArchivedLoops?: boolean;
}

type ProjectRow = {
    id: string;
    slug: string;
    name: string;
    status: string;
    current_goal: string | null;
    next_action: string | null;
    risk_or_blocked_by: string | null;
    progress_stage: string | null;
    created_at: string;
    updated_at: string;
};

type DocBlockMetaRow = {
    id: string;
    block_type: string;
    title: string;
    block_date: string;
    status: string;
    summary: string;
    next_action: string | null;
    source_type: string | null;
    created_at: string;
    updated_at: string;
};

type DocMetaRow = {
    id: string;
    title: string;
    workspace: string | null;
    created_at: string;
    updated_at: string;
};

type DecisionMetaRow = {
    id: string;
    title: string;
    created_at: string;
};

type LoopMetaRow = {
    id: string;
    loop_name: string;
    loop_type: string | null;
    status: string | null;
    current_step: string | null;
    created_at: string;
    updated_at: string;
};

/**
 * Resolves a project identifier (id or slug) to its canonical id.
 * Shared by Stage A and Stage B.
 */
export function resolveProjectId(db: Database.Database, identifier: string): string {
    const byId = db.prepare("SELECT id FROM projects WHERE id = ?").get(identifier) as
        | { id: string }
        | undefined;
    if (byId) return byId.id;
    const bySlug = db.prepare("SELECT id FROM projects WHERE slug = ?").get(identifier) as
        | { id: string }
        | undefined;
    if (bySlug) return bySlug.id;
    throw new ProjectContextCuratorError("PROJECT_NOT_FOUND", `Project not found: ${identifier}`);
}

export function loadProjectProfile(db: Database.Database, projectId: string): ProjectContextSourceIndexProject {
    const row = db
        .prepare(
            `SELECT id, slug, name, status, current_goal, next_action,
                    risk_or_blocked_by, progress_stage, created_at, updated_at
             FROM projects
             WHERE id = ?`,
        )
        .get(projectId) as ProjectRow | undefined;
    if (!row) {
        throw new ProjectContextCuratorError("PROJECT_NOT_FOUND", `Project not found: ${projectId}`);
    }
    return {
        id: row.id,
        slug: row.slug,
        name: row.name,
        status: row.status,
        currentGoal: row.current_goal,
        nextAction: row.next_action,
        riskOrBlockedBy: row.risk_or_blocked_by,
        progressStage: row.progress_stage,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    };
}

function isDerivedTitle(title: string): boolean {
    return title === DERIVED_CONTEXT_TITLE;
}

// --- metadata-only per-kind queries (NO full bodies) ---

function collectProjectMetadataEntry(
    project: ProjectContextSourceIndexProject,
): ProjectContextSourceIndexEntry {
    return {
        sourceKind: "project_metadata",
        sourceId: project.id,
        title: project.name,
        status: project.status ?? null,
        createdAt: project.createdAt ?? null,
        updatedAt: project.updatedAt ?? null,
        hasFullContent: false,
        isDerivedContext: false,
    };
}

function collectDocBlockEntries(
    db: Database.Database,
    projectId: string,
    maxEntries: number = MAX_INDEX_ENTRIES_PER_KIND,
): ProjectContextSourceIndexEntry[] {
    const rows = db
        .prepare(
            `SELECT id, block_type, title, block_date, status, summary, next_action,
                    source_type, created_at, updated_at
             FROM project_doc_blocks
             WHERE project_id = ?
             ORDER BY updated_at DESC, created_at DESC, id ASC`,
        )
        .all(projectId) as DocBlockMetaRow[];

    return rows.slice(0, maxEntries).map((row) => ({
        sourceKind: "doc_block",
        sourceId: row.id,
        title: row.title,
        sourceType: row.source_type,
        status: row.status,
        date: row.block_date,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        summary: row.summary,
        nextAction: row.next_action,
        hasFullContent: true,
        isDerivedContext: isDerivedTitle(row.title),
    }));
}

function collectDocEntries(
    db: Database.Database,
    projectId: string,
    maxEntries: number = MAX_INDEX_ENTRIES_PER_KIND,
): ProjectContextSourceIndexEntry[] {
    const rows = db
        .prepare(
            `SELECT id, title, workspace, created_at, updated_at
             FROM docs
             WHERE project_id = ?
             ORDER BY updated_at DESC, created_at DESC, id ASC`,
        )
        .all(projectId) as DocMetaRow[];

    return rows.slice(0, maxEntries).map((row) => ({
        sourceKind: "doc",
        sourceId: row.id,
        title: row.title,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        hasFullContent: true,
        isDerivedContext: isDerivedTitle(row.title),
    }));
}

function collectDecisionEntries(
    db: Database.Database,
    projectId: string,
    maxEntries: number = MAX_INDEX_ENTRIES_PER_KIND,
): ProjectContextSourceIndexEntry[] {
    const rows = db
        .prepare(
            `SELECT id, title, created_at
             FROM project_decisions
             WHERE project_id = ?
             ORDER BY created_at DESC, id ASC`,
        )
        .all(projectId) as DecisionMetaRow[];

    return rows.slice(0, maxEntries).map((row) => ({
        sourceKind: "decision",
        sourceId: row.id,
        title: row.title,
        createdAt: row.created_at,
        updatedAt: row.created_at,
        hasFullContent: true,
        isDerivedContext: isDerivedTitle(row.title),
    }));
}

function collectProjectContextEntries(
    db: Database.Database,
    projectId: string,
    maxEntries: number = MAX_INDEX_ENTRIES_PER_KIND,
): ProjectContextSourceIndexEntry[] {
    const tableExists = db
        .prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?")
        .get("project_contexts");
    if (!tableExists) return [];

    const rows = db
        .prepare(
            `SELECT id, created_at, updated_at
             FROM project_contexts
             WHERE project_id = ?
             ORDER BY updated_at DESC, created_at DESC, id ASC`,
        )
        .all(projectId) as Array<{ id: string; created_at: string; updated_at: string }>;

    return rows.slice(0, maxEntries).map((row) => ({
        sourceKind: "project_context",
        sourceId: row.id,
        title: PROJECT_CONTEXT_DISPLAY_TITLE,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        hasFullContent: true,
        isDerivedContext: false,
    }));
}

function collectLoopEntries(
    db: Database.Database,
    projectId: string,
    includeArchived: boolean,
    maxEntries: number = MAX_INDEX_ENTRIES_PER_KIND,
): ProjectContextSourceIndexEntry[] {
    let query =
        `SELECT id, loop_name, loop_type, status, current_step, created_at, updated_at
         FROM project_loops
         WHERE project_id = ?`;
    if (!includeArchived) query += ` AND status != 'archived'`;
    query += ` ORDER BY updated_at DESC, created_at DESC, id ASC`;

    const rows = db.prepare(query).all(projectId) as LoopMetaRow[];

    return rows.slice(0, maxEntries).map((row) => ({
        sourceKind: "loop",
        sourceId: row.id,
        title: row.loop_name,
        status: row.status,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        hasFullContent: true,
        isDerivedContext: false,
    }));
}

type SnapshotVersionMetaRow = {
    id: string;
    schema_version: string;
    generated_from_fingerprint: string;
    published_corpus_fingerprint: string | null;
    rendered_markdown: string;
    generated_at: string;
    approved_at: string | null;
};

/**
 * READ1 — zero-or-one `project_context_snapshot` enumerator.
 *
 * Eligible ONLY when: the container belongs to the exact Project, its
 * `current_version_id` is non-null, the referenced version belongs to the same
 * container, its publication state is PUBLISHED, and it is the current version.
 * Everything else (historical PUBLISHED, PUBLISHING, orphan/fabricated,
 * cross-Project) is excluded fail-closed (returns null → zero sources).
 *
 * `sourceId` is the immutable snapshot version id. The deterministic display
 * title is metadata only and never an identity. `isDerivedContext=true` is
 * based on the semantic source kind, never title inference.
 */
function collectProjectContextSnapshotEntry(
    db: Database.Database,
    projectId: string,
): ProjectContextSourceIndexEntry | null {
    const containerTable = db
        .prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?")
        .get("project_context_snapshots");
    if (!containerTable) return null;

    const container = db
        .prepare("SELECT id, current_version_id FROM project_context_snapshots WHERE project_id = ?")
        .get(projectId) as { id: string; current_version_id: string | null } | undefined;
    if (!container || !container.current_version_id) return null;

    const version = db
        .prepare(
            `SELECT id, schema_version, generated_from_fingerprint,
                    published_corpus_fingerprint, rendered_markdown, generated_at, approved_at
             FROM project_context_snapshot_versions
             WHERE id = ? AND snapshot_id = ? AND publication_state = 'PUBLISHED'`,
        )
        .get(container.current_version_id, container.id) as SnapshotVersionMetaRow | undefined;
    if (!version) return null;

    // Snapshot-only digest material: SHA-256 over the exact deterministic
    // READ1 body bytes. `publishedCorpusFingerprint` is deliberately excluded.
    const contentDigest = createHash("sha256").update(version.rendered_markdown, "utf8").digest("hex");

    const snapshotMetadata: ProjectContextSnapshotMetadata = {
        schemaVersion: version.schema_version,
        generatedFromFingerprint: version.generated_from_fingerprint,
        publishedCorpusFingerprint: version.published_corpus_fingerprint,
        generatedAt: version.generated_at,
        approvedAt: version.approved_at,
    };

    return {
        sourceKind: "project_context_snapshot",
        sourceId: version.id,
        title: PROJECT_CONTEXT_SNAPSHOT_DISPLAY_TITLE,
        status: "PUBLISHED",
        createdAt: version.generated_at,
        updatedAt: version.generated_at,
        hasFullContent: true,
        isDerivedContext: true,
        contentDigest,
        snapshotMetadata,
    };
}

export function entryRecency(entry: ProjectContextSourceIndexEntry): string {
    return entry.updatedAt ?? entry.date ?? entry.createdAt ?? "";
}

/**
 * Globally sorts the combined Stage A index by:
 *   A. effective recency DESC  (updatedAt → date → createdAt → no date)
 *   B. stable source-kind order
 *   C. sourceId ASC (final tie-breaker)
 *
 * Recency is the PRIMARY key so chronology is not dominated by source-kind
 * grouping; a newer doc is listed before an older doc_block.
 */
export function sortIndexEntries(entries: ProjectContextSourceIndexEntry[]): ProjectContextSourceIndexEntry[] {
    return [...entries].sort((a, b) => {
        const recencyA = entryRecency(a);
        const recencyB = entryRecency(b);
        if (recencyA !== recencyB) return recencyA < recencyB ? 1 : -1;
        const kindA = PROJECT_CONTEXT_KIND_ORDER.indexOf(a.sourceKind);
        const kindB = PROJECT_CONTEXT_KIND_ORDER.indexOf(b.sourceKind);
        if (kindA !== kindB) return kindA - kindB;
        return a.sourceId < b.sourceId ? -1 : a.sourceId > b.sourceId ? 1 : 0;
    });
}

/**
 * Marks `possibleDuplicateTitle` deterministically for every entry whose
 * exact title is shared by another source id. Both entries are kept.
 */
function markPossibleDuplicateTitles(
    entries: ProjectContextSourceIndexEntry[],
): ProjectContextSourceIndexEntry[] {
    const titleCounts = new Map<string, number>();
    for (const entry of entries) {
        titleCounts.set(entry.title, (titleCounts.get(entry.title) ?? 0) + 1);
    }
    return entries.map((entry) =>
        (titleCounts.get(entry.title) ?? 0) > 1 ? { ...entry, possibleDuplicateTitle: true } : entry,
    );
}

/**
 * Stage A — builds the metadata-only Project Knowledge Index for a project.
 * Read-only; no full document bodies are loaded or materialized.
 */
export function collectProjectContextSourceIndex(
    db: Database.Database,
    projectIdentifier: string,
    options: CollectSourceIndexOptions = {},
): ProjectContextSourceIndex {
    const projectId = resolveProjectId(db, projectIdentifier);
    const project = loadProjectProfile(db, projectId);
    const now = options.now ?? new Date().toISOString();

    const byKind = new Map<ProjectContextSourceKind, ProjectContextSourceIndexEntry[]>();
    byKind.set("project_metadata", [collectProjectMetadataEntry(project)]);
    byKind.set("doc_block", collectDocBlockEntries(db, projectId));
    byKind.set("doc", collectDocEntries(db, projectId));
    byKind.set("decision", collectDecisionEntries(db, projectId));
    byKind.set("loop", collectLoopEntries(db, projectId, options.includeArchivedLoops ?? false));

    // Deterministic global ordering: effective recency DESC (primary),
    // stable source-kind order (secondary), sourceId ASC (tie-breaker).
    const sources = markPossibleDuplicateTitles(
        sortIndexEntries(PROJECT_CONTEXT_KIND_ORDER.flatMap((kind) => byKind.get(kind) ?? [])),
    );

    return {
        schemaVersion: PROJECT_CONTEXT_SOURCE_INDEX_SCHEMA_VERSION,
        project,
        sources,
        generatedAt: now,
    };
}

/**
 * READ1 — COMPLETE metadata enumerator.
 * Collects EVERY supported text source for the project across all kinds
 * (including `project_context` and archived loops) with NO per-kind cap and
 * NO hidden truncation, then applies the canonical global ordering
 * (effective recency DESC → source-kind order → sourceId ASC).
 *
 * This is distinct from CTX2's bounded curation-oriented index, which keeps
 * its own `MAX_INDEX_ENTRIES_PER_KIND` safety cap.
 */
export function collectCompleteProjectSourceEntries(
    db: Database.Database,
    projectIdentifier: string,
    options: CollectSourceIndexOptions = {},
): { project: ProjectContextSourceIndexProject; entries: ProjectContextSourceIndexEntry[] } {
    const projectId = resolveProjectId(db, projectIdentifier);
    const project = loadProjectProfile(db, projectId);

    const snapshotEntry = collectProjectContextSnapshotEntry(db, projectId);
    const entries = markPossibleDuplicateTitles(
        sortIndexEntries([
            collectProjectMetadataEntry(project),
            ...collectDocBlockEntries(db, projectId, Infinity),
            ...collectDocEntries(db, projectId, Infinity),
            ...collectDecisionEntries(db, projectId, Infinity),
            ...collectProjectContextEntries(db, projectId, Infinity),
            ...collectLoopEntries(db, projectId, options.includeArchivedLoops ?? true, Infinity),
            ...(snapshotEntry ? [snapshotEntry] : []),
        ]),
    );

    return { project, entries };
}

/**
 * P1-G2B ownership seam — asserts the Project owns an existing source
 * identified exactly by `ref`, WITHOUT Stage-B authority/admissibility
 * semantics (does not reject derived sources; does not classify authority).
 *
 * Membership is decided against the complete Project Context enumeration, so
 * every established `ProjectContextSourceKind` follows its existing identity
 * semantics (e.g. `project_metadata` → project id; `project_context_snapshot` →
 * current published version id). Unknown kinds and sources not owned by the
 * Project fail visibly.
 */
export function assertProjectOwnsSource(
    db: Database.Database,
    projectId: string,
    ref: ProjectContextSourceRef,
): void {
    if (!PROJECT_CONTEXT_KIND_ORDER.includes(ref.sourceKind)) {
        throw new ProjectContextCuratorError(
            "UNSUPPORTED_SOURCE_KIND",
            `Unsupported source kind: ${ref.sourceKind}`,
        );
    }
    const { entries } = collectCompleteProjectSourceEntries(db, projectId);
    const owned = entries.some(
        (entry) => entry.sourceKind === ref.sourceKind && entry.sourceId === ref.sourceId,
    );
    if (!owned) {
        throw new ProjectContextCuratorError(
            "UNKNOWN_SOURCE",
            `Source ${ref.sourceKind}:${ref.sourceId} is not owned by project ${projectId}`,
        );
    }
}
