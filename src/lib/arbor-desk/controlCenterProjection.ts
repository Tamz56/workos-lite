import type Database from "better-sqlite3";
import { readCoreProjectDirectory } from "@/lib/core-api/projectDirectory";
import type {
    CoreProjectDirectoryEntry,
    CoreRegistryMetadata,
    ManagedProjectDirectoryEntry,
} from "@/lib/core-api/types";
import type { GovernedFact } from "@/lib/project-state/types";

export const CONTROL_CENTER_PROJECTION_SCHEMA_VERSION =
    "ACC-PPC-v0.2" as const;

type Availability =
    | "AVAILABLE"
    | "NOT_AVAILABLE"
    | "UNKNOWN";

type SourceCurrentness =
    | "CURRENT_WITHIN_SOURCE"
    | "NOT_PROVEN";

type ClaimCurrentness =
    | "CURRENT_WITHIN_SOURCE"
    | "CURRENT"
    | "STALE"
    | "NOT_PROVEN"
    | "UNBOUND";

type SourceDescriptor = {
    authority: string;
    availability: Availability;
    currentness: SourceCurrentness;
};

type GovernedClaim<T> = {
    value: T | null;
    authority:
        | "REGISTRY_METADATA"
        | "PROJECT_STATE"
        | "NONE";
    currentness: ClaimCurrentness;
};

type PlannerDayRow = {
    id: string;
    plan_date: string;
    main_outcome: string | null;
    daily_capacity_minutes: number | null;
    energy_level: string | null;
    status: string;
};

type PlannerItemRow = {
    id: string;
    source_type: string;
    source_id: string;
    work_mode: string;
    priority: string;
    planner_status: string;
    is_main_task: number;
    source_project_id: string | null;
};

function descriptor(
    authority: string,
    availability: Availability,
    currentness: SourceCurrentness,
): SourceDescriptor {
    return {
        authority,
        availability,
        currentness,
    };
}

function readPlanner(
    db: Database.Database,
    date: string,
) {
    try {
        const day = db.prepare(`
            SELECT
                id,
                plan_date,
                main_outcome,
                daily_capacity_minutes,
                energy_level,
                status
            FROM planner_days
            WHERE plan_date = ?
        `).get(date) as PlannerDayRow | undefined;

        if (!day) {
            return {
                source: descriptor(
                    "PLANNER_STATE",
                    "NOT_AVAILABLE",
                    "NOT_PROVEN",
                ),
                day: null,
                items: [] as PlannerItemRow[],
            };
        }

        const items = db.prepare(`
            SELECT
                pi.id,
                pi.source_type,
                pi.source_id,
                pi.work_mode,
                pi.priority,
                pi.planner_status,
                pi.is_main_task,
                CASE
                    WHEN pi.source_type = 'project_item'
                    THEN pitem.project_id
                    ELSE NULL
                END AS source_project_id
            FROM planner_items pi
            LEFT JOIN project_items pitem
              ON pi.source_type = 'project_item'
             AND pitem.id = pi.source_id
            WHERE pi.planner_day_id = ?
            ORDER BY
                pi.planned_order ASC,
                pi.created_at ASC
        `).all(day.id) as PlannerItemRow[];

        return {
            source: descriptor(
                "PLANNER_STATE",
                "AVAILABLE",
                "CURRENT_WITHIN_SOURCE",
            ),
            day,
            items,
        };
    } catch {
        return {
            source: descriptor(
                "PLANNER_STATE",
                "UNKNOWN",
                "NOT_PROVEN",
            ),
            day: null,
            items: [] as PlannerItemRow[],
        };
    }
}

function exactRawProject(
    managed: ManagedProjectDirectoryEntry,
    rawBySlug: ReadonlyMap<
        string,
        CoreProjectDirectoryEntry
    >,
): CoreProjectDirectoryEntry | null {
    if (
        managed.workosSlug === null
        || managed.registryObservation !== "PROVEN_PRESENT"
    ) {
        return null;
    }

    const raw = rawBySlug.get(
        managed.workosSlug,
    );

    if (
        !raw
        || raw.projectSlug !== managed.workosSlug
    ) {
        return null;
    }

    return raw;
}

function registryClaim(
    managed: ManagedProjectDirectoryEntry,
    raw: CoreProjectDirectoryEntry | null,
): GovernedClaim<CoreRegistryMetadata> {
    if (
        managed.directoryBinding
        === "MISSING_OR_UNBOUND"
    ) {
        return {
            value: null,
            authority: "NONE",
            currentness: "UNBOUND",
        };
    }

    if (!raw) {
        return {
            value: null,
            authority: "REGISTRY_METADATA",
            currentness: "NOT_PROVEN",
        };
    }

    return {
        value: raw.registryMetadata,
        authority: "REGISTRY_METADATA",
        currentness: "CURRENT_WITHIN_SOURCE",
    };
}

function canonicalStateClaim(
    managed: ManagedProjectDirectoryEntry,
    raw: CoreProjectDirectoryEntry | null,
): GovernedClaim<string> {
    if (
        managed.directoryBinding
        === "MISSING_OR_UNBOUND"
    ) {
        return {
            value: null,
            authority: "NONE",
            currentness: "UNBOUND",
        };
    }

    if (!raw) {
        return {
            value: null,
            authority: "NONE",
            currentness: "NOT_PROVEN",
        };
    }

    const canonical =
        raw.canonicalProjectState;

    if (canonical.stateStatus === "CURRENT") {
        return {
            value: canonical.stateVersionId,
            authority: "PROJECT_STATE",
            currentness: "CURRENT",
        };
    }

    if (canonical.stateStatus === "STALE") {
        return {
            value: canonical.stateVersionId,
            authority: "PROJECT_STATE",
            currentness: "STALE",
        };
    }

    return {
        value: null,
        authority: "PROJECT_STATE",
        currentness: "NOT_PROVEN",
    };
}

function nextAuthoritativeActionClaim(
    managed: ManagedProjectDirectoryEntry,
    raw: CoreProjectDirectoryEntry | null,
): GovernedClaim<GovernedFact> {
    if (
        managed.directoryBinding
        === "MISSING_OR_UNBOUND"
    ) {
        return {
            value: null,
            authority: "NONE",
            currentness: "UNBOUND",
        };
    }

    if (!raw) {
        return {
            value: null,
            authority: "NONE",
            currentness: "NOT_PROVEN",
        };
    }

    const canonical =
        raw.canonicalProjectState;

    if (canonical.stateStatus === "CURRENT") {
        return {
            value:
                canonical.nextAuthoritativeAction,
            authority: "PROJECT_STATE",
            currentness: "CURRENT",
        };
    }

    if (canonical.stateStatus === "STALE") {
        return {
            value: null,
            authority: "PROJECT_STATE",
            currentness: "STALE",
        };
    }

    return {
        value: null,
        authority: "PROJECT_STATE",
        currentness: "NOT_PROVEN",
    };
}

function toManagedProjectProjection(
    managed: ManagedProjectDirectoryEntry,
    rawBySlug: ReadonlyMap<
        string,
        CoreProjectDirectoryEntry
    >,
) {
    const raw = exactRawProject(
        managed,
        rawBySlug,
    );

    return {
        identity: {
            id: managed.managedProjectId,
            name: managed.projectName,
            slug: managed.workosSlug,
            registryProjectId:
                raw?.projectId ?? null,
        },

        managedMembership: {
            ...managed.managedMembership,
        },

        directoryBinding:
            managed.directoryBinding,

        bindingCurrentness:
            managed.bindingCurrentness,

        registryObservation:
            managed.registryObservation,

        registryMetadata:
            registryClaim(managed, raw),

        canonicalProjectState:
            canonicalStateClaim(
                managed,
                raw,
            ),

        nextAuthoritativeAction:
            nextAuthoritativeActionClaim(
                managed,
                raw,
            ),

        sourceRef:
            managed.sourceRef,

        provenance: {
            ...managed.provenance,
            sourceRefs: [
                ...managed.provenance.sourceRefs,
            ],
        },

        flags: [
            ...managed.flags,
        ],
    };
}

export function buildControlCenterProjection(
    db: Database.Database,
    date: string,
) {
    const core =
        readCoreProjectDirectory(db);

    const rawBySlug = new Map(
        core.projects.map((project) => [
            project.projectSlug,
            project,
        ]),
    );

    const managedProjects =
        core.managedPortfolio.projects.map(
            (managed) =>
                toManagedProjectProjection(
                    managed,
                    rawBySlug,
                ),
        );

    const planner =
        readPlanner(db, date);

    return {
        schemaVersion:
            CONTROL_CENTER_PROJECTION_SCHEMA_VERSION,

        asOfDate:
            date,

        coreSchemaVersion:
            core.schemaVersion,

        managedDirectorySchemaVersion:
            core.managedPortfolio.schemaVersion,

        sources: {
            projectRegistry: descriptor(
                "REGISTRY_METADATA",
                "AVAILABLE",
                "CURRENT_WITHIN_SOURCE",
            ),

            planner:
                planner.source,

            coordination: descriptor(
                "COORDINATION",
                "NOT_AVAILABLE",
                "NOT_PROVEN",
            ),

            projectMemory: descriptor(
                "PROJECT_MEMORY",
                "NOT_AVAILABLE",
                "NOT_PROVEN",
            ),

            executionEvidence: descriptor(
                "EXECUTION_EVIDENCE",
                "NOT_AVAILABLE",
                "NOT_PROVEN",
            ),
        },

        managedProjectSummary: {
            projectCount:
                core.managedPortfolio.projectCount,

            boundCount:
                core.managedPortfolio.boundCount,

            missingOrUnboundCount:
                core.managedPortfolio
                    .missingOrUnboundCount,
        },

        managedProjects,

        plannerState: {
            authority:
                "PLANNER_STATE",

            currentness:
                planner.source.currentness,

            availability:
                planner.source.availability,

            day:
                planner.day,

            items:
                planner.items,
        },
    };
}
