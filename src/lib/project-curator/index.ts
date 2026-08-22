// ---------------------------------------------------------------------------
// WorkOS-Lite — Project Context Curator (CTX2-R1)
// Public entry point
// ---------------------------------------------------------------------------
export {
    DERIVED_CONTEXT_TITLE,
    PROJECT_CONTEXT_SOURCE_BUNDLE_SCHEMA_VERSION,
    PROJECT_CONTEXT_SOURCE_INDEX_SCHEMA_VERSION,
    ProjectContextCuratorError,
} from "./contracts";
export type {
    ProjectContextBundleTrace,
    ProjectContextCuratorErrorCode,
    ProjectContextLoadedSource,
    ProjectContextSourceBundle,
    ProjectContextSourceIndex,
    ProjectContextSourceIndexEntry,
    ProjectContextSourceIndexProject,
    ProjectContextSourceKind,
    ProjectContextSourceLimits,
    ProjectContextSourceRef,
} from "./contracts";

export {
    DEFAULT_CURATOR_LIMITS,
    MAX_INDEX_ENTRIES_PER_KIND,
    resolveCuratorLimits,
    TRUNCATION_SUFFIX,
    truncateText,
} from "./bounds";

export {
    collectProjectContextSourceIndex,
    loadProjectProfile,
    PROJECT_CONTEXT_KIND_ORDER,
    resolveProjectId,
} from "./knowledgeIndex";
export type { CollectSourceIndexOptions } from "./knowledgeIndex";

export { loadProjectContextSources } from "./sourceLoader";
export type { LoadSelectedSourcesOptions } from "./sourceLoader";

export { buildProjectContextSourceBundle } from "./collector";
export type { BuildProjectContextSourceBundleOptions } from "./collector";
