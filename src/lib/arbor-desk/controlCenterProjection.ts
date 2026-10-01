import type Database from "better-sqlite3";

import {
    readCoreProjectDirectory,
} from "@/lib/core-api/projectDirectory";

import type {
    CoreCanonicalStateSummary,
    CoreProjectDirectoryEntry,
    CoreRegistryMetadata,
    ManagedProjectDirectoryEntry,
} from "@/lib/core-api/types";

import {
    readCanonicalProjectStateBySlug,
} from "@/lib/project-state/readService";

import type {
    CanonicalProjectStateReadResult,
    GovernedFact,
} from "@/lib/project-state/types";

export const CONTROL_CENTER_PROJECTION_SCHEMA_VERSION =
    "ACC-PPC-v0.3" as const;

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

type ProjectLinkProjection = {
    href: string | null;
    authority:
        | "MANAGED_PROJECT_REGISTRY"
        | "NONE";
    currentness: ClaimCurrentness;
};

type CanonicalStateEvidenceValue = {
    stateVersionId: string;
    href: string;
    authorityRef: string;
    sourceType: string;
    sourceRef: string;
    issuedAt: string;
};

export type CanonicalEnrichmentConsistency =
    | "PASS"
    | "FAIL"
    | "NOT_APPLICABLE";

export type CanonicalEnrichmentObservation =
    | {
        status: "CURRENT";
        projectSlug: string;
        projectId: string;
        stateVersionId: string;
        dependencies: GovernedFact;
        evidence: {
            authorityRef: string;
            sourceType: string;
            sourceRef: string;
            issuedAt: string;
        };
      }
    | {
        status: "STALE";
        projectSlug: string;
        projectId: string;
        staleStateVersionId: string;
      }
    | {
        status: "NOT_PROVEN";
        projectSlug: string;
        projectId: string | null;
      }
    | {
        status: "PROJECT_NOT_FOUND";
        projectSlug: string;
      };

type CanonicalEnrichmentContext = {
    directoryBinding:
        | "BOUND"
        | "MISSING_OR_UNBOUND";
    registryObservation:
        | "PROVEN_PRESENT"
        | "PROVEN_ABSENT"
        | "NOT_PROVEN";
    workosSlug: string | null;
    registryProjectId: string | null;
    coreCanonical:
        | CoreCanonicalStateSummary
        | null;
};

type CanonicalEnrichmentProjection = {
    consistency:
        CanonicalEnrichmentConsistency;
    dependencyClaim:
        GovernedClaim<GovernedFact>;
    canonicalStateEvidence:
        GovernedClaim<
            CanonicalStateEvidenceValue
        >;
};

type PlannerDayRow = {
    id: string;
    plan_date: string;
    main_outcome: string | null;
    daily_capacity_minutes: number | null;
    energy_level: string | null;
    status: string;
};

export type PlannerItemRow = {
    id: string;
    source_type: string;
    source_id: string;
    work_mode: string;
    priority: string;
    planner_status: string;
    is_main_task: number;
    source_project_id: string | null;
};

type PortfolioStatusBuckets = {
    NOW: PlannerItemRow[];
    NEXT: PlannerItemRow[];
    WAITING: PlannerItemRow[];
    BLOCKED: PlannerItemRow[];
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
        || managed.registryObservation
            !== "PROVEN_PRESENT"
    ) {
        return null;
    }

    const raw =
        rawBySlug.get(
            managed.workosSlug,
        );

    if (
        !raw
        || raw.projectSlug
            !== managed.workosSlug
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
            authority:
                "REGISTRY_METADATA",
            currentness:
                "NOT_PROVEN",
        };
    }

    return {
        value:
            raw.registryMetadata,
        authority:
            "REGISTRY_METADATA",
        currentness:
            "CURRENT_WITHIN_SOURCE",
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
            currentness:
                "NOT_PROVEN",
        };
    }

    const canonical =
        raw.canonicalProjectState;

    if (
        canonical.stateStatus
        === "CURRENT"
    ) {
        return {
            value:
                canonical.stateVersionId,
            authority:
                "PROJECT_STATE",
            currentness:
                "CURRENT",
        };
    }

    if (
        canonical.stateStatus
        === "STALE"
    ) {
        return {
            value:
                canonical.stateVersionId,
            authority:
                "PROJECT_STATE",
            currentness:
                "STALE",
        };
    }

    return {
        value: null,
        authority:
            "PROJECT_STATE",
        currentness:
            "NOT_PROVEN",
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
            currentness:
                "NOT_PROVEN",
        };
    }

    const canonical =
        raw.canonicalProjectState;

    if (
        canonical.stateStatus
        === "CURRENT"
    ) {
        return {
            value:
                canonical
                    .nextAuthoritativeAction,
            authority:
                "PROJECT_STATE",
            currentness:
                "CURRENT",
        };
    }

    if (
        canonical.stateStatus
        === "STALE"
    ) {
        return {
            value: null,
            authority:
                "PROJECT_STATE",
            currentness:
                "STALE",
        };
    }

    return {
        value: null,
        authority:
            "PROJECT_STATE",
        currentness:
            "NOT_PROVEN",
    };
}

function projectLinkProjection(
    managed: ManagedProjectDirectoryEntry,
): ProjectLinkProjection {
    if (
        managed.directoryBinding
        === "MISSING_OR_UNBOUND"
    ) {
        return {
            href: null,
            authority: "NONE",
            currentness: "UNBOUND",
        };
    }

    if (
        managed.registryObservation
            !== "PROVEN_PRESENT"
        || managed.workosSlug === null
    ) {
        return {
            href: null,
            authority:
                "MANAGED_PROJECT_REGISTRY",
            currentness:
                "NOT_PROVEN",
        };
    }

    return {
        href:
            `/projects/${encodeURIComponent(
                managed.workosSlug,
            )}`,
        authority:
            "MANAGED_PROJECT_REGISTRY",
        currentness:
            managed.bindingCurrentness,
    };
}

export function isCanonicalEnrichmentEligible(
    value: Pick<
        CanonicalEnrichmentContext,
        | "directoryBinding"
        | "registryObservation"
        | "workosSlug"
    >,
): boolean {
    return (
        value.directoryBinding
            === "BOUND"
        && value.registryObservation
            === "PROVEN_PRESENT"
        && value.workosSlug !== null
    );
}

function canonicalObservationFromRead(
    result:
        CanonicalProjectStateReadResult,
): CanonicalEnrichmentObservation {
    if (
        result.status
        === "CURRENT"
    ) {
        return {
            status: "CURRENT",
            projectSlug:
                result.projectSlug,
            projectId:
                result.projectId,
            stateVersionId:
                result.state.id,
            dependencies:
                result.state
                    .payload
                    .dependencies,
            evidence: {
                authorityRef:
                    result.state
                        .authorityRef,
                sourceType:
                    result.state
                        .sourceType,
                sourceRef:
                    result.state
                        .sourceRef,
                issuedAt:
                    result.state
                        .issuedAt,
            },
        };
    }

    if (
        result.status
        === "STALE"
    ) {
        return {
            status: "STALE",
            projectSlug:
                result.projectSlug,
            projectId:
                result.projectId,
            staleStateVersionId:
                result
                    .staleStateVersionId,
        };
    }

    if (
        result.status
        === "NOT_PROVEN"
    ) {
        return {
            status:
                "NOT_PROVEN",
            projectSlug:
                result.projectSlug,
            projectId:
                result.projectId
                ?? null,
        };
    }

    return {
        status:
            "PROJECT_NOT_FOUND",
        projectSlug:
            result.projectSlug,
    };
}

function failClosedCanonicalEnrichment():
    CanonicalEnrichmentProjection {
    return {
        consistency:
            "FAIL",

        dependencyClaim: {
            value: null,
            authority:
                "PROJECT_STATE",
            currentness:
                "NOT_PROVEN",
        },

        canonicalStateEvidence: {
            value: null,
            authority:
                "PROJECT_STATE",
            currentness:
                "NOT_PROVEN",
        },
    };
}

export function resolveCanonicalEnrichment(
    context:
        CanonicalEnrichmentContext,
    observation:
        CanonicalEnrichmentObservation
        | null,
): CanonicalEnrichmentProjection {
    if (
        context.directoryBinding
        === "MISSING_OR_UNBOUND"
    ) {
        return {
            consistency:
                "NOT_APPLICABLE",

            dependencyClaim: {
                value: null,
                authority: "NONE",
                currentness:
                    "UNBOUND",
            },

            canonicalStateEvidence: {
                value: null,
                authority: "NONE",
                currentness:
                    "UNBOUND",
            },
        };
    }

    if (
        context.registryObservation
            !== "PROVEN_PRESENT"
        || context.workosSlug === null
    ) {
        return {
            consistency:
                "NOT_APPLICABLE",

            dependencyClaim: {
                value: null,
                authority: "NONE",
                currentness:
                    "NOT_PROVEN",
            },

            canonicalStateEvidence: {
                value: null,
                authority: "NONE",
                currentness:
                    "NOT_PROVEN",
            },
        };
    }

    if (
        context.coreCanonical === null
        || context.registryProjectId
            === null
        || observation === null
        || observation.status
            === "PROJECT_NOT_FOUND"
        || observation.projectSlug
            !== context.workosSlug
    ) {
        return (
            failClosedCanonicalEnrichment()
        );
    }

    const core =
        context.coreCanonical;

    if (
        core.stateStatus
        === "CURRENT"
    ) {
        if (
            observation.status
                !== "CURRENT"
            || observation.projectId
                !== context
                    .registryProjectId
            || observation.stateVersionId
                !== core.stateVersionId
        ) {
            return (
                failClosedCanonicalEnrichment()
            );
        }

        return {
            consistency: "PASS",

            dependencyClaim: {
                value:
                    observation
                        .dependencies,
                authority:
                    "PROJECT_STATE",
                currentness:
                    "CURRENT",
            },

            canonicalStateEvidence: {
                value: {
                    stateVersionId:
                        observation
                            .stateVersionId,

                    href:
                        core.stateRoute,

                    authorityRef:
                        observation
                            .evidence
                            .authorityRef,

                    sourceType:
                        observation
                            .evidence
                            .sourceType,

                    sourceRef:
                        observation
                            .evidence
                            .sourceRef,

                    issuedAt:
                        observation
                            .evidence
                            .issuedAt,
                },

                authority:
                    "PROJECT_STATE",

                currentness:
                    "CURRENT",
            },
        };
    }

    if (
        core.stateStatus
        === "STALE"
    ) {
        if (
            observation.status
                !== "STALE"
            || observation.projectId
                !== context
                    .registryProjectId
            || observation
                .staleStateVersionId
                !== core.stateVersionId
        ) {
            return (
                failClosedCanonicalEnrichment()
            );
        }

        return {
            consistency: "PASS",

            dependencyClaim: {
                value: null,
                authority:
                    "PROJECT_STATE",
                currentness:
                    "STALE",
            },

            canonicalStateEvidence: {
                value: null,
                authority:
                    "PROJECT_STATE",
                currentness:
                    "STALE",
            },
        };
    }

    if (
        observation.status
            !== "NOT_PROVEN"
        || observation.projectId
            !== context
                .registryProjectId
    ) {
        return (
            failClosedCanonicalEnrichment()
        );
    }

    return {
        consistency: "PASS",

        dependencyClaim: {
            value: null,
            authority:
                "PROJECT_STATE",
            currentness:
                "NOT_PROVEN",
        },

        canonicalStateEvidence: {
            value: null,
            authority:
                "PROJECT_STATE",
            currentness:
                "NOT_PROVEN",
        },
    };
}

function stableItemIdCompare(
    left: PlannerItemRow,
    right: PlannerItemRow,
): number {
    if (left.id < right.id) {
        return -1;
    }

    if (left.id > right.id) {
        return 1;
    }

    return 0;
}

export function classifyPortfolioStatus(
    items:
        readonly PlannerItemRow[],
): PortfolioStatusBuckets {
    const buckets:
        PortfolioStatusBuckets = {
            NOW: [],
            NEXT: [],
            WAITING: [],
            BLOCKED: [],
        };

    for (const item of items) {
        switch (
            item
                .planner_status
                .toLowerCase()
        ) {
            case "doing":
                buckets.NOW.push(item);
                break;

            case "ready":
                buckets.NEXT.push(item);
                break;

            case "waiting":
                buckets.WAITING.push(
                    item,
                );
                break;

            case "blocked":
                buckets.BLOCKED.push(
                    item,
                );
                break;

            default:
                break;
        }
    }

    for (
        const bucket
        of [
            buckets.NOW,
            buckets.NEXT,
            buckets.WAITING,
            buckets.BLOCKED,
        ]
    ) {
        bucket.sort(
            stableItemIdCompare,
        );
    }

    return buckets;
}

function toManagedProjectProjection(
    db: Database.Database,
    managed:
        ManagedProjectDirectoryEntry,
    rawBySlug:
        ReadonlyMap<
            string,
            CoreProjectDirectoryEntry
        >,
) {
    const raw =
        exactRawProject(
            managed,
            rawBySlug,
        );

    const eligible =
        isCanonicalEnrichmentEligible(
            managed,
        );

    const enrichment =
        eligible
        && managed.workosSlug !== null
            ? canonicalObservationFromRead(
                readCanonicalProjectStateBySlug(
                    db,
                    managed.workosSlug,
                ),
            )
            : null;

    const canonicalEnrichment =
        resolveCanonicalEnrichment(
            {
                directoryBinding:
                    managed
                        .directoryBinding,

                registryObservation:
                    managed
                        .registryObservation,

                workosSlug:
                    managed
                        .workosSlug,

                registryProjectId:
                    raw?.projectId
                    ?? null,

                coreCanonical:
                    raw
                        ?.canonicalProjectState
                    ?? null,
            },
            enrichment,
        );

    return {
        identity: {
            id:
                managed
                    .managedProjectId,

            name:
                managed
                    .projectName,

            slug:
                managed
                    .workosSlug,

            registryProjectId:
                raw?.projectId
                ?? null,
        },

        managedMembership: {
            ...managed
                .managedMembership,
        },

        directoryBinding:
            managed
                .directoryBinding,

        bindingCurrentness:
            managed
                .bindingCurrentness,

        registryObservation:
            managed
                .registryObservation,

        registryMetadata:
            registryClaim(
                managed,
                raw,
            ),

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

        projectLink:
            projectLinkProjection(
                managed,
            ),

        dependencyClaim:
            canonicalEnrichment
                .dependencyClaim,

        canonicalStateEvidence:
            canonicalEnrichment
                .canonicalStateEvidence,

        canonicalEnrichmentConsistency:
            canonicalEnrichment
                .consistency,

        sourceRef:
            managed.sourceRef,

        provenance: {
            ...managed.provenance,

            sourceRefs: [
                ...managed
                    .provenance
                    .sourceRefs,
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

    const rawBySlug =
        new Map(
            core.projects.map(
                (project) => [
                    project
                        .projectSlug,
                    project,
                ],
            ),
        );

    const managedProjects =
        core.managedPortfolio
            .projects
            .map(
                (managed) =>
                    toManagedProjectProjection(
                        db,
                        managed,
                        rawBySlug,
                    ),
            );

    const planner =
        readPlanner(
            db,
            date,
        );

    const portfolioBuckets =
        classifyPortfolioStatus(
            planner.items,
        );

    const canonicalEnrichmentConsistency =
        managedProjects.some(
            (project) =>
                project
                    .canonicalEnrichmentConsistency
                === "FAIL",
        )
            ? "FAIL"
            : "PASS";

    return {
        schemaVersion:
            CONTROL_CENTER_PROJECTION_SCHEMA_VERSION,

        asOfDate:
            date,

        coreSchemaVersion:
            core.schemaVersion,

        managedDirectorySchemaVersion:
            core
                .managedPortfolio
                .schemaVersion,

        canonicalEnrichmentConsistency,

        sources: {
            projectRegistry:
                descriptor(
                    "REGISTRY_METADATA",
                    "AVAILABLE",
                    "CURRENT_WITHIN_SOURCE",
                ),

            planner:
                planner.source,

            coordination:
                descriptor(
                    "COORDINATION",
                    "NOT_AVAILABLE",
                    "NOT_PROVEN",
                ),

            projectMemory:
                descriptor(
                    "PROJECT_MEMORY",
                    "NOT_AVAILABLE",
                    "NOT_PROVEN",
                ),

            executionEvidence:
                descriptor(
                    "EXECUTION_EVIDENCE",
                    "NOT_AVAILABLE",
                    "NOT_PROVEN",
                ),
        },

        managedProjectSummary: {
            projectCount:
                core
                    .managedPortfolio
                    .projectCount,

            boundCount:
                core
                    .managedPortfolio
                    .boundCount,

            missingOrUnboundCount:
                core
                    .managedPortfolio
                    .missingOrUnboundCount,
        },

        managedProjects,

        plannerState: {
            authority:
                "PLANNER_STATE",

            currentness:
                planner
                    .source
                    .currentness,

            availability:
                planner
                    .source
                    .availability,

            day:
                planner.day,

            items:
                planner.items,
        },

        portfolioStatus: {
            authority:
                "PLANNER_STATE",

            currentness:
                planner
                    .source
                    .currentness,

            availability:
                planner
                    .source
                    .availability,

            meaning:
                "Classification only. Not portfolio priority or execution order.",

            buckets:
                portfolioBuckets,
        },
    };
}
