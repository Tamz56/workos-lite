// ---------------------------------------------------------------------------
// WorkOS-Lite — Project Context Curator (CTX2-R1)
// Contracts
// ---------------------------------------------------------------------------
// Provider-neutral contracts for the two-stage source architecture:
//
//   Project Stores
//     → Stage A: metadata-only Project Knowledge Index
//     → caller supplies explicit source references (CTX3 decides relevance)
//     → Stage B: bounded full-content loader for exactly those references
//     → Project Context Source Bundle
//
// CTX2 does NOT decide semantic relevance and does NOT call any AI model.
// Source records remain authoritative; these objects are deterministic
// projections. Read-only by contract — no business-data mutation.
// ---------------------------------------------------------------------------

export const PROJECT_CONTEXT_SOURCE_INDEX_SCHEMA_VERSION =
    "project-context-source-index.v1";
export const PROJECT_CONTEXT_SOURCE_BUNDLE_SCHEMA_VERSION =
    "project-context-source-bundle.v1";

/**
 * Canonical source kinds. Canonical identity is `sourceKind + sourceId` —
 * a title is never an identity.
 */
export type ProjectContextSourceKind =
    | "project_metadata"
    | "doc_block"
    | "doc"
    | "decision"
    | "loop";

/** Explicit source reference supplied by the caller / CTX3. */
export interface ProjectContextSourceRef {
    sourceKind: ProjectContextSourceKind;
    sourceId: string;
}

/**
 * Reserved deterministic identity for previously-derived project context.
 * Such a source stays visible in the index for transparency but MUST NOT be
 * used as authoritative source material for a new curation generation.
 */
export const DERIVED_CONTEXT_TITLE = "PROJECT-CONTEXT-CURRENT";

// ---------------------------------------------------------------------------
// Stage A — metadata-only index
// ---------------------------------------------------------------------------

/**
 * Normalized metadata-only index entry. Never contains full document bodies.
 * Optionality follows the real schema.
 */
export interface ProjectContextSourceIndexEntry {
    sourceKind: ProjectContextSourceKind;
    sourceId: string;
    title: string;

    sourceType?: string | null;
    status?: string | null;

    date?: string | null;
    createdAt?: string | null;
    updatedAt?: string | null;

    summary?: string | null;
    nextAction?: string | null;

    /** True when a full-content loader exists for this source kind. */
    hasFullContent: boolean;
    /** True when this entry carries the reserved derived-context identity. */
    isDerivedContext: boolean;
    /** Deterministic flag when another source id shares the same title. */
    possibleDuplicateTitle?: boolean;
}

/** Bounded project identity/profile carried by the index (metadata only). */
export interface ProjectContextSourceIndexProject {
    id: string;
    slug: string;
    name: string;

    status?: string | null;
    currentGoal?: string | null;
    nextAction?: string | null;
    riskOrBlockedBy?: string | null;
    progressStage?: string | null;

    createdAt?: string | null;
    updatedAt?: string | null;
}

/** Stage A output. Contains no full-content records and no AI fields. */
export interface ProjectContextSourceIndex {
    schemaVersion: typeof PROJECT_CONTEXT_SOURCE_INDEX_SCHEMA_VERSION;
    project: ProjectContextSourceIndexProject;
    sources: ProjectContextSourceIndexEntry[];
    generatedAt: string;
}

// ---------------------------------------------------------------------------
// Stage B — loaded sources
// ---------------------------------------------------------------------------

/**
 * A single fully-loaded source for the explicitly selected reference.
 * Truncation is never hidden: provenance fields are always exact.
 */
export interface ProjectContextLoadedSource {
    ref: ProjectContextSourceRef;

    title: string;
    sourceType?: string | null;
    status?: string | null;

    content: string;

    contentTruncated: boolean;
    originalCharacterCount: number;
    includedCharacterCount: number;
}

/** Provider-neutral hard limits for selected full-content input. */
export interface ProjectContextSourceLimits {
    maxSelectedSources: number;
    maxCharsPerSource: number;
    maxTotalChars: number;
}

export interface ProjectContextBundleTrace {
    stageA: {
        sourceCounts: Record<ProjectContextSourceKind, number>;
    };
    stageB: {
        requested: number;
        loaded: number;
        totalIncludedCharacters: number;
    };
}

/**
 * Provider-neutral, CTX3-ready bundle. `selectedSourceRefs` are supplied by
 * the caller; CTX2 never determines them using semantic relevance.
 */
export interface ProjectContextSourceBundle {
    schemaVersion: typeof PROJECT_CONTEXT_SOURCE_BUNDLE_SCHEMA_VERSION;
    project: ProjectContextSourceIndexProject;
    sourceIndex: ProjectContextSourceIndexEntry[];
    selectedSourceRefs: ProjectContextSourceRef[];
    selectedSources: ProjectContextLoadedSource[];
    limits: ProjectContextSourceLimits;
    trace: ProjectContextBundleTrace;
}

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

export type ProjectContextCuratorErrorCode =
    | "PROJECT_NOT_FOUND"
    | "UNSUPPORTED_SOURCE_KIND"
    | "UNKNOWN_SOURCE"
    | "CROSS_PROJECT_SOURCE"
    | "DERIVED_CONTEXT_REJECTED"
    | "MAX_SELECTED_SOURCES_EXCEEDED"
    | "MAX_TOTAL_CHARS_EXCEEDED";

/** Deterministic, fail-closed curator error. */
export class ProjectContextCuratorError extends Error {
    readonly code: ProjectContextCuratorErrorCode;

    constructor(code: ProjectContextCuratorErrorCode, message: string) {
        super(message);
        this.name = "ProjectContextCuratorError";
        this.code = code;
    }
}
