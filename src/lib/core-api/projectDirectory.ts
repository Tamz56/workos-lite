import type Database from "better-sqlite3";
import { readCanonicalProjectStateBySlug } from "@/lib/project-state/readService";
import type { CanonicalProjectStateReadResult } from "@/lib/project-state/types";
import { MANAGED_PROJECT_BINDINGS } from "./managedProjectBindings";
import {
    MANAGED_PROJECT_DIRECTORY_SCHEMA_VERSION,
    WORKOS_CORE_SCHEMA_VERSION,
    type CoreCanonicalStateSummary,
    type CoreProjectDirectoryEntry,
    type CoreProjectDirectoryResponse,
    type ManagedProjectBindingDefinition,
    type ManagedProjectDirectoryEntry,
    type ManagedProjectDirectoryProjection,
} from "./types";

type ProjectDirectoryRow = {
    id: string;
    slug: string;
    name: string;
    category: string | null;
    registry_status: string | null;
    priority: string | null;
    current_goal: string | null;
    progress_stage: string | null;
    next_action: string | null;
    cadence: string | null;
    risk_or_blocked_by: string | null;
    metadata_updated_at: string | null;
};

function stateRouteFor(projectSlug: string): string {
    return `/api/projects/${encodeURIComponent(projectSlug)}/state`;
}

function summarizeCanonicalState(
    projectSlug: string,
    result: CanonicalProjectStateReadResult,
): CoreCanonicalStateSummary {
    const stateRoute = stateRouteFor(projectSlug);

    if (result.status === "CURRENT") {
        return {
            authority: "PROJECT_STATE",
            stateStatus: "CURRENT",
            stateVersionId: result.state.id,
            stateRoute,
            nextAuthoritativeAction: result.state.payload.nextAuthoritativeAction,
        };
    }

    if (result.status === "STALE") {
        return {
            authority: "PROJECT_STATE",
            stateStatus: "STALE",
            stateVersionId: result.staleStateVersionId,
            stateRoute,
            nextAuthoritativeAction: null,
        };
    }

    return {
        authority: "PROJECT_STATE",
        stateStatus: "NOT_PROVEN",
        stateVersionId: null,
        stateRoute,
        nextAuthoritativeAction: null,
    };
}

function toDirectoryEntry(
    db: Database.Database,
    row: ProjectDirectoryRow,
): CoreProjectDirectoryEntry {
    const canonical = readCanonicalProjectStateBySlug(db, row.slug);

    return {
        projectId: row.id,
        projectSlug: row.slug,
        projectName: row.name,
        registryMetadata: {
            authority: "REGISTRY_METADATA",
            currentness: "CURRENT_WITHIN_SOURCE",
            category: row.category,
            registryStatus: row.registry_status,
            priority: row.priority,
            currentGoal: row.current_goal,
            progressStage: row.progress_stage,
            nextAction: row.next_action,
            cadence: row.cadence,
            riskOrBlockedBy: row.risk_or_blocked_by,
            metadataUpdatedAt: row.metadata_updated_at,
        },
        canonicalProjectState: summarizeCanonicalState(row.slug, canonical),
    };
}

function toManagedProjectEntry(
    definition: ManagedProjectBindingDefinition,
    rawBySlug: ReadonlyMap<string, CoreProjectDirectoryEntry>,
): ManagedProjectDirectoryEntry {
    const workosSlug = definition.workosSlug;

    if (workosSlug === null) {
        return {
            managedProjectId: definition.managedProjectId,
            projectName: definition.projectName,
            managedMembership: { ...definition.managedMembership },
            workosSlug: null,
            directoryBinding: "MISSING_OR_UNBOUND",
            bindingCurrentness: definition.baselineCurrentness,
            registryObservation: "NOT_PROVEN",
            canonicalProjectState: null,
            canonicalCurrentness: "NOT_PROVEN",
            sourceRef: definition.sourceRef,
            provenance: {
                ...definition.provenance,
                sourceRefs: [...definition.provenance.sourceRefs],
            },
            flags: [...definition.flags],
        };
    }

    const rawProject = rawBySlug.get(workosSlug);

    if (!rawProject) {
        return {
            managedProjectId: definition.managedProjectId,
            projectName: definition.projectName,
            managedMembership: { ...definition.managedMembership },
            workosSlug,
            directoryBinding: "BOUND",
            bindingCurrentness: "STALE",
            registryObservation: "PROVEN_ABSENT",
            canonicalProjectState: null,
            canonicalCurrentness: "NOT_PROVEN",
            sourceRef: definition.sourceRef,
            provenance: {
                ...definition.provenance,
                sourceRefs: [...definition.provenance.sourceRefs],
            },
            flags: [...definition.flags],
        };
    }

    return {
        managedProjectId: definition.managedProjectId,
        projectName: definition.projectName,
        managedMembership: { ...definition.managedMembership },
        workosSlug,
        directoryBinding: "BOUND",
        bindingCurrentness: definition.baselineCurrentness,
        registryObservation: "PROVEN_PRESENT",
        canonicalProjectState:
            rawProject.canonicalProjectState.stateVersionId,
        canonicalCurrentness:
            rawProject.canonicalProjectState.stateStatus,
        sourceRef: definition.sourceRef,
        provenance: {
            ...definition.provenance,
            sourceRefs: [...definition.provenance.sourceRefs],
        },
        flags: [...definition.flags],
    };
}

function buildManagedPortfolio(
    rawProjects: CoreProjectDirectoryEntry[],
): ManagedProjectDirectoryProjection {
    const rawBySlug = new Map(
        rawProjects.map((project) => [project.projectSlug, project]),
    );

    const projects = MANAGED_PROJECT_BINDINGS.map((definition) =>
        toManagedProjectEntry(definition, rawBySlug),
    );

    const boundCount = projects.filter(
        (project) => project.directoryBinding === "BOUND",
    ).length;

    const missingOrUnboundCount = projects.filter(
        (project) => project.directoryBinding === "MISSING_OR_UNBOUND",
    ).length;

    return {
        schemaVersion: MANAGED_PROJECT_DIRECTORY_SCHEMA_VERSION,
        projectCount: projects.length,
        boundCount,
        missingOrUnboundCount,
        projects,
    };
}

export function readCoreProjectDirectory(
    db: Database.Database,
): CoreProjectDirectoryResponse {
    const rows = db.prepare(`
        SELECT
            id,
            slug,
            name,
            category,
            registry_status,
            priority,
            current_goal,
            progress_stage,
            next_action,
            cadence,
            risk_or_blocked_by,
            metadata_updated_at
        FROM projects
        ORDER BY id ASC
    `).all() as ProjectDirectoryRow[];

    const projects = rows.map((row) => toDirectoryEntry(db, row));

    return {
        schemaVersion: WORKOS_CORE_SCHEMA_VERSION,
        projects,
        managedPortfolio: buildManagedPortfolio(projects),
    };
}
