// ---------------------------------------------------------------------------
// WorkOS-Lite CTX3 Project Context snapshot draft contract
// Domain-only types: no persistence, publication, READ1, or provider behavior.
// ---------------------------------------------------------------------------

export const PROJECT_CONTEXT_SNAPSHOT_SCHEMA_VERSION = "project-context.v1" as const;

export const PROJECT_CONTEXT_AUTHORITY_CLASSES = [
    "AUTHORITY_ELIGIBLE",
    "DERIVED_WORKING_MEMORY",
    "CONVERSATIONAL_HISTORY",
] as const;

export const PROJECT_CONTEXT_EVIDENCE_CLASSIFICATIONS = [
    "CONFIRMED",
    "CONFLICT",
    "AMBIGUITY",
    "UNKNOWN",
] as const;

export const PROJECT_CONTEXT_COVERAGE_STATUSES = ["FULL_CURRENT", "PARTIAL", "STALE"] as const;

export const PROJECT_CONTEXT_RECOMMENDATION_CLASSIFICATION = "RECOMMENDATION" as const;
export const PROJECT_CONTEXT_ATTACHMENT_DISCLOSURE =
    "TEXT_CORPUS_COMPLETE_ATTACHMENT_SCOPE_EXCLUDED" as const;
export const PROJECT_CONTEXT_RECOMMENDATION_DISCLAIMER =
    "Derived recommendation; not an approved decision or Human instruction." as const;

export type ProjectContextAuthorityClass = typeof PROJECT_CONTEXT_AUTHORITY_CLASSES[number];
export type ProjectContextEvidenceClassification =
    typeof PROJECT_CONTEXT_EVIDENCE_CLASSIFICATIONS[number];
export type ProjectContextCoverageStatus = typeof PROJECT_CONTEXT_COVERAGE_STATUSES[number];

export interface ProjectContextSourceRegistryEntry {
    sourceKind: string;
    sourceId: string;
    title: string;
    authorityClass: ProjectContextAuthorityClass;
    declaredScope: string;
}

export interface ProjectContextSubstantiveItem {
    text: string;
    classification: ProjectContextEvidenceClassification;
    sourceRefs: string[];
}

export interface ProjectContextConflictAssertion {
    text: string;
    sourceRefs: string[];
}

export interface ProjectContextConflict {
    subject: string;
    classification: "CONFLICT" | "AMBIGUITY";
    assertions: ProjectContextConflictAssertion[];
}

export interface ProjectContextUnknown {
    text: string;
    classification: "UNKNOWN";
    missingEvidence: string;
}

export interface ProjectContextRecordedNextAction {
    text: string;
    classification: ProjectContextEvidenceClassification;
    sourceRefs: string[];
}

export interface ProjectContextRecommendedNextAction {
    text: string;
    classification: typeof PROJECT_CONTEXT_RECOMMENDATION_CLASSIFICATION;
    rationaleSourceRefs: string[];
    disclaimer: typeof PROJECT_CONTEXT_RECOMMENDATION_DISCLAIMER;
}

export interface ProjectContextExcludedSource {
    sourceRef: string;
    authorityClass: ProjectContextAuthorityClass;
    reason: string;
}

export interface ProjectContextCoverage {
    status: ProjectContextCoverageStatus;
    manifestSourceCount: number;
    authorityEligibleSourceCount: number;
    authorityReadSourceCount: number;
    excludedSourceRefs: ProjectContextExcludedSource[];
    missingAuthoritySourceRefs: string[];
    duplicateAuthoritySourceRefs: string[];
    attachmentDisclosure: typeof PROJECT_CONTEXT_ATTACHMENT_DISCLOSURE;
}

export interface ProjectContextSnapshotDraft {
    schemaVersion: typeof PROJECT_CONTEXT_SNAPSHOT_SCHEMA_VERSION;
    projectSlug: string;
    generatedFromFingerprint: string;
    publishedCorpusFingerprint: null;
    generatedAt: string;
    coverage: ProjectContextCoverage;
    currentState: ProjectContextSubstantiveItem[];
    currentObjective: ProjectContextSubstantiveItem[];
    completed: ProjectContextSubstantiveItem[];
    active: ProjectContextSubstantiveItem[];
    decisions: ProjectContextSubstantiveItem[];
    blockers: ProjectContextSubstantiveItem[];
    conflicts: ProjectContextConflict[];
    unknowns: ProjectContextUnknown[];
    recordedNextAction: ProjectContextRecordedNextAction;
    recommendedNextAction: ProjectContextRecommendedNextAction;
    sourceRegistry: Record<string, ProjectContextSourceRegistryEntry>;
    previousWorkingMemoryRefs: string[];
}

declare const validatedProjectContextSnapshotDraft: unique symbol;

/** Produced only by the validation module and required by the renderer. */
export type ValidatedProjectContextSnapshotDraft = ProjectContextSnapshotDraft & {
    readonly [validatedProjectContextSnapshotDraft]: true;
};
