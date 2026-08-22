// ---------------------------------------------------------------------------
// WorkOS-Lite — Project Context Curator (CTX2-R1)
// Bundle orchestrator
// ---------------------------------------------------------------------------
// Composes Stage A (metadata-only index) + caller-supplied references +
// Stage B (bounded full-content loader) into the provider-neutral bundle.
// Stage A and Stage B remain separately callable/testable.
// ---------------------------------------------------------------------------
import type Database from "better-sqlite3";
import {
    PROJECT_CONTEXT_SOURCE_BUNDLE_SCHEMA_VERSION,
    type ProjectContextSourceBundle,
    type ProjectContextSourceKind,
    type ProjectContextSourceRef,
} from "./contracts";
import { resolveCuratorLimits } from "./bounds";
import {
    collectProjectContextSourceIndex,
    type CollectSourceIndexOptions,
} from "./knowledgeIndex";
import {
    loadProjectContextSources,
    type LoadSelectedSourcesOptions,
} from "./sourceLoader";

export interface BuildProjectContextSourceBundleOptions extends CollectSourceIndexOptions {
    limits?: LoadSelectedSourcesOptions["limits"];
}

function countByKind(
    entries: ProjectContextSourceBundle["sourceIndex"],
): Record<ProjectContextSourceKind, number> {
    const counts: Record<ProjectContextSourceKind, number> = {
        project_metadata: 0,
        doc_block: 0,
        doc: 0,
        decision: 0,
        loop: 0,
    };
    for (const entry of entries) {
        counts[entry.sourceKind] += 1;
    }
    return counts;
}

/**
 * Composes the full provider-neutral bundle.
 * `selectedSourceRefs` are supplied by the caller (CTX3); CTX2 never chooses
 * them by semantic relevance.
 */
export function buildProjectContextSourceBundle(
    db: Database.Database,
    projectIdentifier: string,
    selectedSourceRefs: ProjectContextSourceRef[],
    options: BuildProjectContextSourceBundleOptions = {},
): ProjectContextSourceBundle {
    const index = collectProjectContextSourceIndex(db, projectIdentifier, options);
    const selectedSources = loadProjectContextSources(
        db,
        projectIdentifier,
        selectedSourceRefs,
        options,
    );
    const limits = resolveCuratorLimits(options.limits);

    return {
        schemaVersion: PROJECT_CONTEXT_SOURCE_BUNDLE_SCHEMA_VERSION,
        project: index.project,
        sourceIndex: index.sources,
        selectedSourceRefs: [...selectedSourceRefs],
        selectedSources,
        limits,
        trace: {
            stageA: { sourceCounts: countByKind(index.sources) },
            stageB: {
                requested: selectedSourceRefs.length,
                loaded: selectedSources.length,
                totalIncludedCharacters: selectedSources.reduce(
                    (sum, source) => sum + source.includedCharacterCount,
                    0,
                ),
            },
        },
    };
}
