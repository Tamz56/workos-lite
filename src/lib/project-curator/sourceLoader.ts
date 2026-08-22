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
    "loop",
]);

const KIND_TABLE: Record<Exclude<ProjectContextSourceKind, "project_metadata">, string> = {
    doc_block: "project_doc_blocks",
    doc: "docs",
    decision: "project_decisions",
    loop: "project_loops",
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
