import type { GovernedFact } from "@/lib/project-state/types";

export const WORKOS_CORE_SCHEMA_VERSION = "workos-core.v0.1" as const;

export type CoreRegistryMetadata = {
    authority: "REGISTRY_METADATA";
    currentness: "CURRENT_WITHIN_SOURCE";
    category: string | null;
    registryStatus: string | null;
    priority: string | null;
    currentGoal: string | null;
    progressStage: string | null;
    nextAction: string | null;
    cadence: string | null;
    riskOrBlockedBy: string | null;
    metadataUpdatedAt: string | null;
};

export type CoreCanonicalStateSummary = {
    authority: "PROJECT_STATE";
    stateStatus: "CURRENT" | "STALE" | "NOT_PROVEN";
    stateVersionId: string | null;
    stateRoute: string;
    nextAuthoritativeAction: GovernedFact | null;
};

export type CoreProjectDirectoryEntry = {
    projectId: string;
    projectSlug: string;
    projectName: string;
    registryMetadata: CoreRegistryMetadata;
    canonicalProjectState: CoreCanonicalStateSummary;
};

export type CoreProjectDirectoryResponse = {
    schemaVersion: typeof WORKOS_CORE_SCHEMA_VERSION;
    projects: CoreProjectDirectoryEntry[];
};
