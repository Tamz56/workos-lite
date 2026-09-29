import type { GovernedFact } from "@/lib/project-state/types";

export const WORKOS_CORE_SCHEMA_VERSION = "workos-core.v0.1" as const;
export const MANAGED_PROJECT_DIRECTORY_SCHEMA_VERSION =
    "managed-project-directory.v0.1" as const;

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

export type ManagedProjectCurrentness =
    | "CURRENT"
    | "STALE"
    | "NOT_PROVEN";

export type ManagedProjectMembership = {
    authority: "MANAGED_PROJECT_REGISTRY";
    status: "FROZEN";
    value: true;
};

export type ManagedProjectProvenance = {
    baselineAuthority: "WORKOS PROJECT DIRECTORY BINDING v0.1";
    sourceRefs: readonly string[];
    bindingEvidenceClass:
        | "FROZEN_VERIFIED_BINDING"
        | "FROZEN_MISSING_OR_UNBOUND";
    evidenceAsOf: string;
};

export type ManagedProjectBindingDefinition = {
    managedProjectId: string;
    projectName: string;
    managedMembership: ManagedProjectMembership;
    workosSlug: string | null;
    baselineCurrentness: ManagedProjectCurrentness;
    sourceRef: string;
    provenance: ManagedProjectProvenance;
    flags: readonly string[];
};

export type ManagedProjectDirectoryEntry = {
    managedProjectId: string;
    projectName: string;
    managedMembership: ManagedProjectMembership;
    workosSlug: string | null;
    directoryBinding: "BOUND" | "MISSING_OR_UNBOUND";
    bindingCurrentness: ManagedProjectCurrentness;
    registryObservation:
        | "PROVEN_PRESENT"
        | "PROVEN_ABSENT"
        | "NOT_PROVEN";
    canonicalProjectState: string | null;
    canonicalCurrentness: ManagedProjectCurrentness;
    sourceRef: string;
    provenance: ManagedProjectProvenance;
    flags: string[];
};

export type ManagedProjectDirectoryProjection = {
    schemaVersion: typeof MANAGED_PROJECT_DIRECTORY_SCHEMA_VERSION;
    projectCount: number;
    boundCount: number;
    missingOrUnboundCount: number;
    projects: ManagedProjectDirectoryEntry[];
};

export type CoreProjectDirectoryResponse = {
    schemaVersion: typeof WORKOS_CORE_SCHEMA_VERSION;
    projects: CoreProjectDirectoryEntry[];
    managedPortfolio: ManagedProjectDirectoryProjection;
};
