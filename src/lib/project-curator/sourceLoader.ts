// ---------------------------------------------------------------------------
// WorkOS-Lite — Project Context Curator (CTX2-R1)
// Stage B — Explicit Full-Content Loader
// ---------------------------------------------------------------------------
// Loads full content ONLY for the explicitly caller-supplied source
// references. No implicit "latest N", no category-wide body query, no title
// lookup/substitution. Ownership + identity validation fails closed.
// ---------------------------------------------------------------------------
import type Database from "better-sqlite3";
import { mapRowToBlock, type DbProjectDocBlockRow } from "@/lib/project-doc-blocks/mappers";
import {
    DERIVED_CONTEXT_TITLE,
    PROJECT_CONTEXT_DISPLAY_TITLE,
    PROJECT_CONTEXT_SNAPSHOT_DISPLAY_TITLE,
    ProjectContextCuratorError,
    type ProjectContextLoadedSource,
    type ProjectContextSourceIndexProject,
    type ProjectContextSourceKind,
    type ProjectContextSourceLimits,
    type ProjectContextSourceRef,
} from "./contracts";
import { resolveCuratorLimits, truncateText } from "./bounds";
import { loadProjectProfile, resolveProjectId } from "./knowledgeIndex";

export interface LoadSelectedSourcesOptions {
    limits?: Partial<ProjectContextSourceLimits>;
}

const SUPPORTED_KINDS = new Set<ProjectContextSourceKind>([
    "project_metadata",
    "doc_block",
    "doc",
    "decision",
    "project_context",
    "loop",
    "project_context_snapshot",
]);

const KIND_TABLE: Record<Exclude<ProjectContextSourceKind, "project_metadata">, string> = {
    doc_block: "project_doc_blocks",
    doc: "docs",
    decision: "project_decisions",
    project_context: "project_contexts",
    loop: "project_loops",
    // project_context_snapshot is resolved directly against the snapshot
    // container + version tables (see validateRef / resolveSnapshotBody) and is
    // never reached through findOwnedRow; this key only keeps the exhaustive
    // Record type well-formed.
    project_context_snapshot: "project_context_snapshot_versions",
};

type ContentRow = Record<string, unknown> & { id: string };

function isDerivedTitle(title: string): boolean {
    return title === DERIVED_CONTEXT_TITLE;
}

function titleOf(kind: Exclude<ProjectContextSourceKind, "project_metadata">, row: ContentRow): string {
    if (kind === "loop") return String(row.loop_name ?? "");
    return String(row.title ?? "");
}

/** Fetches the exact (kind, id) row scoped to the project. */
function findOwnedRow(
    db: Database.Database,
    kind: Exclude<ProjectContextSourceKind, "project_metadata">,
    projectId: string,
    sourceId: string,
): ContentRow | undefined {
    const table = KIND_TABLE[kind];
    const row = db
        .prepare(`SELECT * FROM ${table} WHERE id = ? AND project_id = ?`)
        .get(sourceId, projectId) as ContentRow | undefined;
    return row;
}

/** Fetches existence of (kind, id) anywhere (to distinguish cross-project). */
function existsAnywhere(
    db: Database.Database,
    kind: Exclude<ProjectContextSourceKind, "project_metadata">,
    sourceId: string,
): boolean {
    const table = KIND_TABLE[kind];
    return db.prepare(`SELECT 1 FROM ${table} WHERE id = ?`).get(sourceId) !== undefined;
}

/** Fail-closed per-reference ownership + identity validation. */
function validateRef(
    db: Database.Database,
    projectId: string,
    ref: ProjectContextSourceRef,
): void {
    if (!SUPPORTED_KINDS.has(ref.sourceKind)) {
        throw new ProjectContextCuratorError(
            "UNSUPPORTED_SOURCE_KIND",
            `Unsupported source kind: ${ref.sourceKind}`,
        );
    }
    if (ref.sourceKind === "project_metadata") {
        if (ref.sourceId !== projectId) {
            throw new ProjectContextCuratorError(
                "CROSS_PROJECT_SOURCE",
                `project_metadata ${ref.sourceId} does not match project ${projectId}`,
            );
        }
        return;
    }
    if (ref.sourceKind === "project_context_snapshot") {
        // Snapshot is derived working memory; Stage B selected-source loading is
        // for authoritative material only. READ1 reads it via the chunk path.
        throw new ProjectContextCuratorError(
            "UNSUPPORTED_SOURCE_KIND",
            `project_context_snapshot is not a supported Stage B selected source: ${ref.sourceId}`,
        );
    }
    const row = findOwnedRow(db, ref.sourceKind, projectId, ref.sourceId);
    if (!row) {
        if (existsAnywhere(db, ref.sourceKind, ref.sourceId)) {
            throw new ProjectContextCuratorError(
                "CROSS_PROJECT_SOURCE",
                `Source ${ref.sourceKind}:${ref.sourceId} belongs to a different project`,
            );
        }
        throw new ProjectContextCuratorError(
            "UNKNOWN_SOURCE",
            `Unknown source ${ref.sourceKind}:${ref.sourceId}`,
        );
    }
    if (isDerivedTitle(titleOf(ref.sourceKind, row))) {
        throw new ProjectContextCuratorError(
            "DERIVED_CONTEXT_REJECTED",
            `Derived context source ${ref.sourceKind}:${ref.sourceId} is not authoritative`,
        );
    }
}

// --- deterministic content renderers (no synthetic prose) ---

function renderProjectMetadata(project: ProjectContextSourceIndexProject): string {
    return [
        `id: ${project.id}`,
        `slug: ${project.slug}`,
        `name: ${project.name}`,
        `status: ${project.status ?? ""}`,
        `current_goal: ${project.currentGoal ?? ""}`,
        `next_action: ${project.nextAction ?? ""}`,
        `risk_or_blocked_by: ${project.riskOrBlockedBy ?? ""}`,
        `progress_stage: ${project.progressStage ?? ""}`,
        `created_at: ${project.createdAt ?? ""}`,
        `updated_at: ${project.updatedAt ?? ""}`,
    ].join("\n");
}

function renderDecision(row: ContentRow): string {
    return [
        `title: ${String(row.title ?? "")}`,
        `decision: ${String(row.decision ?? "")}`,
        `reason: ${String(row.reason ?? "")}`,
        `impact: ${String(row.impact ?? "")}`,
    ].join("\n");
}

function renderLoop(row: ContentRow): string {
    return [
        `title: ${String(row.loop_name ?? "")}`,
        `loop_type: ${String(row.loop_type ?? "")}`,
        `status: ${String(row.status ?? "")}`,
        `risk_level: ${String(row.risk_level ?? "")}`,
        `current_step: ${String(row.current_step ?? "")}`,
    ].join("\n");
}

function renderProjectContext(row: ContentRow): string {
    return [
        `overview: ${String(row.overview ?? "")}`,
        `purpose: ${String(row.purpose ?? "")}`,
        `standing_instructions: ${String(row.standing_instructions ?? "")}`,
        `tone_voice: ${String(row.tone_voice ?? "")}`,
        `guardrails: ${String(row.guardrails ?? "")}`,
        `output_standards: ${String(row.output_standards ?? "")}`,
        `decision_rules: ${String(row.decision_rules ?? "")}`,
        `source_of_truth: ${String(row.source_of_truth ?? "")}`,
    ].join("\n");
}

function buildLoaded(
    ref: ProjectContextSourceRef,
    title: string,
    sourceType: string | null | undefined,
    status: string | null | undefined,
    fullContent: string,
    limits: ProjectContextSourceLimits,
): ProjectContextLoadedSource {
    const originalCharacterCount = fullContent.length;
    const { value, truncated } = truncateText(fullContent, limits.maxCharsPerSource);
    return {
        ref,
        title,
        sourceType: sourceType ?? null,
        status: status ?? null,
        content: value,
        contentTruncated: truncated,
        originalCharacterCount,
        includedCharacterCount: value.length,
    };
}

function loadOne(
    db: Database.Database,
    project: ProjectContextSourceIndexProject,
    ref: ProjectContextSourceRef,
    limits: ProjectContextSourceLimits,
): ProjectContextLoadedSource {
    switch (ref.sourceKind) {
        case "project_metadata": {
            return buildLoaded(
                ref,
                project.name,
                null,
                project.status ?? null,
                renderProjectMetadata(project),
                limits,
            );
        }
        case "doc_block": {
            const row = findOwnedRow(db, "doc_block", project.id, ref.sourceId) as
                | DbProjectDocBlockRow
                | undefined;
            // row is guaranteed by validateRef; re-check defensively.
            if (!row) {
                throw new ProjectContextCuratorError(
                    "UNKNOWN_SOURCE",
                    `Unknown source ${ref.sourceKind}:${ref.sourceId}`,
                );
            }
            const block = mapRowToBlock(row, project.slug);
            return buildLoaded(
                ref,
                block.title,
                block.sourceType ?? null,
                block.status,
                block.details,
                limits,
            );
        }
        case "doc": {
            const row = findOwnedRow(db, "doc", project.id, ref.sourceId);
            if (!row) {
                throw new ProjectContextCuratorError(
                    "UNKNOWN_SOURCE",
                    `Unknown source ${ref.sourceKind}:${ref.sourceId}`,
                );
            }
            return buildLoaded(
                ref,
                String(row.title ?? ""),
                null,
                null,
                String(row.content_md ?? ""),
                limits,
            );
        }
        case "decision": {
            const row = findOwnedRow(db, "decision", project.id, ref.sourceId);
            if (!row) {
                throw new ProjectContextCuratorError(
                    "UNKNOWN_SOURCE",
                    `Unknown source ${ref.sourceKind}:${ref.sourceId}`,
                );
            }
            return buildLoaded(
                ref,
                String(row.title ?? ""),
                null,
                null,
                renderDecision(row),
                limits,
            );
        }
        case "loop": {
            const row = findOwnedRow(db, "loop", project.id, ref.sourceId);
            if (!row) {
                throw new ProjectContextCuratorError(
                    "UNKNOWN_SOURCE",
                    `Unknown source ${ref.sourceKind}:${ref.sourceId}`,
                );
            }
            return buildLoaded(
                ref,
                String(row.loop_name ?? ""),
                null,
                (row.status as string | null) ?? null,
                renderLoop(row),
                limits,
            );
        }
        case "project_context": {
            const row = findOwnedRow(db, "project_context", project.id, ref.sourceId);
            if (!row) {
                throw new ProjectContextCuratorError(
                    "UNKNOWN_SOURCE",
                    `Unknown source ${ref.sourceKind}:${ref.sourceId}`,
                );
            }
            return buildLoaded(
                ref,
                PROJECT_CONTEXT_DISPLAY_TITLE,
                null,
                null,
                renderProjectContext(row),
                limits,
            );
        }
        case "project_context_snapshot":
            // Unreachable: validateRef rejects snapshot refs in Stage B.
            throw new ProjectContextCuratorError(
                "UNSUPPORTED_SOURCE_KIND",
                `Unsupported source kind in Stage B: ${ref.sourceKind}`,
            );
    }
}

/**
 * Stage B — loads full content ONLY for the explicitly supplied references.
 * Fail-closed ownership/identity validation and hard limits.
 */
export function loadProjectContextSources(
    db: Database.Database,
    projectIdentifier: string,
    selectedSourceRefs: ProjectContextSourceRef[],
    options: LoadSelectedSourcesOptions = {},
): ProjectContextLoadedSource[] {
    const limits = resolveCuratorLimits(options.limits);
    const projectId = resolveProjectId(db, projectIdentifier);

    if (selectedSourceRefs.length > limits.maxSelectedSources) {
        throw new ProjectContextCuratorError(
            "MAX_SELECTED_SOURCES_EXCEEDED",
            `Selected sources (${selectedSourceRefs.length}) exceed the limit (${limits.maxSelectedSources})`,
        );
    }

    const project = loadProjectProfile(db, projectId);

    // Validate every ref first (deterministic order, fail closed).
    for (const ref of selectedSourceRefs) {
        validateRef(db, projectId, ref);
    }

    const loaded: ProjectContextLoadedSource[] = [];
    let totalIncludedCharacters = 0;
    for (const ref of selectedSourceRefs) {
        const source = loadOne(db, project, ref, limits);
        totalIncludedCharacters += source.includedCharacterCount;
        loaded.push(source);
    }

    if (totalIncludedCharacters > limits.maxTotalChars) {
        throw new ProjectContextCuratorError(
            "MAX_TOTAL_CHARS_EXCEEDED",
            `Total selected content (${totalIncludedCharacters}) exceeds the limit (${limits.maxTotalChars})`,
        );
    }

    return loaded;
}

// ---------------------------------------------------------------------------
// Stage B+ — Range-aware complete-source chunk reader (READ1)
// ---------------------------------------------------------------------------

export interface LoadProjectContextSourceChunkOptions {
    offset: number;
    limit: number;
    /** READ1 evidence layer may read derived context for transparency. */
    allowDerivedContext?: boolean;
}

export interface ProjectContextSourceChunk {
    ref: ProjectContextSourceRef;
    title: string;
    sourceType: string | null;
    status: string | null;
    isDerivedContext: boolean;
    content: string;
    chunk: {
        offset: number;
        includedChars: number;
        totalCharacterCount: number;
        nextOffset: number;
        hasMore: boolean;
    };
}

type SnapshotBodyRow = {
    id: string;
    rendered_markdown: string;
};

/** Resolves the current PUBLISHED snapshot version owned by the project. */
function findCurrentSnapshotVersion(
    db: Database.Database,
    projectId: string,
    sourceId: string,
): SnapshotBodyRow | undefined {
    return db
        .prepare(
            `SELECT v.id, v.rendered_markdown
             FROM project_context_snapshots s
             JOIN project_context_snapshot_versions v ON v.snapshot_id = s.id
             WHERE s.project_id = ? AND s.current_version_id = ? AND v.id = ?
               AND v.publication_state = 'PUBLISHED'`,
        )
        .get(projectId, sourceId, sourceId) as SnapshotBodyRow | undefined;
}

/** True when sourceId is the current PUBLISHED version of another project. */
function snapshotIsCurrentOfOtherProject(
    db: Database.Database,
    projectId: string,
    sourceId: string,
): boolean {
    return (
        db
            .prepare(
                `SELECT 1 FROM project_context_snapshots s
                 JOIN project_context_snapshot_versions v ON v.snapshot_id = s.id
                 WHERE v.id = ? AND s.project_id != ? AND s.current_version_id = v.id
                   AND v.publication_state = 'PUBLISHED'`,
            )
            .get(sourceId, projectId) !== undefined
    );
}

/**
 * READ1 full-body resolution for a snapshot. The stored deterministic Markdown
 * (produced by the approved I2B renderer) is returned byte-identical; no
 * reconstruction, no DB-generated current timestamp, no secrets, no body
 * mutation during fetch. `publishedCorpusFingerprint` is never injected into
 * the body. `isDerivedContext=true` is from the semantic source kind.
 * Historical / PUBLISHING / fabricated / cross-Project ids fail closed and are
 * never silently redirected to the current version.
 */
function resolveSnapshotBody(
    db: Database.Database,
    project: ProjectContextSourceIndexProject,
    sourceId: string,
): { body: string; title: string; sourceType: null; status: string; isDerivedContext: true } {
    const row = findCurrentSnapshotVersion(db, project.id, sourceId);
    if (!row) {
        if (snapshotIsCurrentOfOtherProject(db, project.id, sourceId)) {
            throw new ProjectContextCuratorError(
                "CROSS_PROJECT_SOURCE",
                `Snapshot version ${sourceId} belongs to a different project`,
            );
        }
        throw new ProjectContextCuratorError(
            "UNKNOWN_SOURCE",
            `Unknown snapshot version ${sourceId}`,
        );
    }
    return {
        body: row.rendered_markdown,
        title: PROJECT_CONTEXT_SNAPSHOT_DISPLAY_TITLE,
        sourceType: null,
        status: "PUBLISHED",
        isDerivedContext: true,
    };
}

/**
 * Resolves the deterministic full body + provenance for an exact ref.
 * Ownership/identity validation fails closed; derived context is rejected
 * unless `allowDerivedContext` opts in (READ1 evidence layer).
 */
function resolveFullBody(
    db: Database.Database,
    project: ProjectContextSourceIndexProject,
    ref: ProjectContextSourceRef,
    allowDerivedContext: boolean,
): {
    body: string;
    title: string;
    sourceType: string | null;
    status: string | null;
    isDerivedContext: boolean;
} {
    if (!SUPPORTED_KINDS.has(ref.sourceKind)) {
        throw new ProjectContextCuratorError(
            "UNSUPPORTED_SOURCE_KIND",
            `Unsupported source kind: ${ref.sourceKind}`,
        );
    }
    if (ref.sourceKind === "project_metadata") {
        if (ref.sourceId !== project.id) {
            throw new ProjectContextCuratorError(
                "CROSS_PROJECT_SOURCE",
                `project_metadata ${ref.sourceId} does not match project ${project.id}`,
            );
        }
        return {
            body: renderProjectMetadata(project),
            title: project.name,
            sourceType: null,
            status: project.status ?? null,
            isDerivedContext: false,
        };
    }
    if (ref.sourceKind === "project_context_snapshot") {
        return resolveSnapshotBody(db, project, ref.sourceId);
    }
    const row = findOwnedRow(db, ref.sourceKind, project.id, ref.sourceId);
    if (!row) {
        if (existsAnywhere(db, ref.sourceKind, ref.sourceId)) {
            throw new ProjectContextCuratorError(
                "CROSS_PROJECT_SOURCE",
                `Source ${ref.sourceKind}:${ref.sourceId} belongs to a different project`,
            );
        }
        throw new ProjectContextCuratorError(
            "UNKNOWN_SOURCE",
            `Unknown source ${ref.sourceKind}:${ref.sourceId}`,
        );
    }
    const derived = isDerivedTitle(titleOf(ref.sourceKind, row));
    if (derived && !allowDerivedContext) {
        throw new ProjectContextCuratorError(
            "DERIVED_CONTEXT_REJECTED",
            `Derived context source ${ref.sourceKind}:${ref.sourceId} is not authoritative`,
        );
    }
    switch (ref.sourceKind) {
        case "doc_block": {
            const block = mapRowToBlock(row as DbProjectDocBlockRow, project.slug);
            return {
                body: block.details,
                title: block.title,
                sourceType: block.sourceType ?? null,
                status: block.status,
                isDerivedContext: derived,
            };
        }
        case "doc":
            return {
                body: String(row.content_md ?? ""),
                title: String(row.title ?? ""),
                sourceType: null,
                status: null,
                isDerivedContext: derived,
            };
        case "decision":
            return {
                body: renderDecision(row),
                title: String(row.title ?? ""),
                sourceType: null,
                status: null,
                isDerivedContext: derived,
            };
        case "project_context":
            return {
                body: renderProjectContext(row),
                title: PROJECT_CONTEXT_DISPLAY_TITLE,
                sourceType: null,
                status: null,
                isDerivedContext: derived,
            };
        case "loop":
            return {
                body: renderLoop(row),
                title: String(row.loop_name ?? ""),
                sourceType: null,
                status: (row.status as string | null) ?? null,
                isDerivedContext: false,
            };
    }
    throw new ProjectContextCuratorError(
        "UNSUPPORTED_SOURCE_KIND",
        `Unsupported source kind: ${ref.sourceKind}`,
    );
}

/**
 * Reads a deterministic range of a source's complete content. The full
 * representation is resolved first (never pre-truncated), then the requested
 * range is applied. Chunk offsets are stable across calls (no gaps/overlap).
 */
export function loadProjectContextSourceChunk(
    db: Database.Database,
    projectIdentifier: string,
    sourceRef: ProjectContextSourceRef,
    options: LoadProjectContextSourceChunkOptions,
): ProjectContextSourceChunk {
    if (!Number.isInteger(options.offset) || options.offset < 0) {
        throw new ProjectContextCuratorError("INVALID_OFFSET", `Invalid offset: ${options.offset}`);
    }
    if (!Number.isInteger(options.limit) || options.limit <= 0) {
        throw new ProjectContextCuratorError("INVALID_CHUNK_LIMIT", `Invalid chunk limit: ${options.limit}`);
    }
    const projectId = resolveProjectId(db, projectIdentifier);
    const project = loadProjectProfile(db, projectId);
    const { body, title, sourceType, status, isDerivedContext } = resolveFullBody(
        db,
        project,
        sourceRef,
        options.allowDerivedContext ?? false,
    );
    const total = body.length;
    const start = options.offset;
    const end = Math.min(start + options.limit, total);
    const content = start >= total ? "" : body.slice(start, end);
    const nextOffset = start + content.length;
    return {
        ref: sourceRef,
        title,
        sourceType,
        status,
        isDerivedContext,
        content,
        chunk: {
            offset: start,
            includedChars: content.length,
            totalCharacterCount: total,
            nextOffset,
            hasMore: nextOffset < total,
        },
    };
}
