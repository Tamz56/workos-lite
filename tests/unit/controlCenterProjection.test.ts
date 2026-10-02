import Database from "better-sqlite3";

import {
    afterEach,
    beforeEach,
    describe,
    expect,
    it,
} from "vitest";

import {
    buildControlCenterProjection,
    CONTROL_CENTER_PROJECTION_SCHEMA_VERSION,
    isCanonicalEnrichmentEligible,
    resolveCanonicalEnrichment,
} from "@/lib/arbor-desk/controlCenterProjection";

import type {
    GovernedFact,
} from "@/lib/project-state/types";

import {
    ensureProjectStateSchema,
} from "@/lib/project-state/schema";

import {
    ensurePortfolioExecutionOrderSchema,
} from "@/lib/portfolio-execution-order/schema";

const P04_REGISTRY_ID =
    "WniiRWTaGeEY7gt3XAsm7";

const P04_SLUG =
    "workos-lite-arbordesk";

const P04_STATE =
    "PSV-WORKOS-LITE-000002";

const P04_ACTION = {
    status: "KNOWN",
    value:
        "Run Human-controlled Phase 6 reconciliation",
} as const;

const CURRENT_PAYLOAD =
    JSON.stringify({
        projectStatus: {
            status: "KNOWN",
            value: "ACTIVE",
        },

        posture: {
            status: "KNOWN",
            value: "READ_ONLY",
        },

        phase: {
            status: "KNOWN",
            value: "PHASE 6B",
        },

        currentFocus: {
            status: "KNOWN",
            value:
                "Control Center binding",
        },

        nextAuthoritativeAction:
            P04_ACTION,

        waitingOrHold: {
            status: "NOT_GOVERNED",
        },

        blockers: {
            status: "KNOWN",
            value: [],
        },

        dependencies: {
            status: "KNOWN",
            value: [],
        },
    });

function createProjectsTable(
    db: Database.Database,
): void {
    db.exec(`
        CREATE TABLE projects (
            id TEXT PRIMARY KEY,
            slug TEXT NOT NULL UNIQUE,
            name TEXT NOT NULL,
            category TEXT,
            registry_status TEXT,
            priority TEXT,
            current_goal TEXT,
            progress_stage TEXT,
            next_action TEXT,
            cadence TEXT,
            risk_or_blocked_by TEXT,
            metadata_updated_at TEXT
        )
    `);
}

function insertProject(
    db: Database.Database,
    values: {
        id: string;
        slug: string;
        name: string;
        nextAction: string;
    },
): void {
    db.prepare(`
        INSERT INTO projects (
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
        ) VALUES (
            ?, ?, ?,
            'system',
            'active',
            'high',
            'Registry goal',
            'implementation',
            ?,
            'weekly',
            NULL,
            '2026-09-29T00:00:00Z'
        )
    `).run(
        values.id,
        values.slug,
        values.name,
        values.nextAction,
    );
}

function insertP04(
    db: Database.Database,
): void {
    insertProject(
        db,
        {
            id: P04_REGISTRY_ID,
            slug: P04_SLUG,
            name:
                "WorkOS-Lite / ArborDesk",
            nextAction:
                "REGISTRY ACTION MUST REMAIN SEPARATE",
        },
    );

    db.prepare(`
        INSERT INTO project_state_versions (
            id,
            project_id,
            schema_version,
            state_payload_json,
            supersedes_state_version_id,
            authority_ref,
            source_type,
            source_ref,
            source_hash,
            issued_at,
            issued_by,
            created_at
        ) VALUES (
            ?, ?,
            'project-state.v1',
            ?,
            NULL,
            'PHASE6-TEST-AUTH',
            'human_frozen_contract',
            'PHASE6-TEST-SOURCE',
            'PHASE6-TEST-HASH',
            '2026-09-29T00:00:00Z',
            'human',
            '2026-09-29T00:00:00Z'
        )
    `).run(
        P04_STATE,
        P04_REGISTRY_ID,
        CURRENT_PAYLOAD,
    );

    db.prepare(`
        INSERT INTO project_state_heads (
            project_id,
            current_state_version_id,
            selected_at,
            selected_by,
            selection_authority_ref
        ) VALUES (
            ?, ?,
            '2026-09-29T00:10:00Z',
            'human',
            'PHASE6-TEST-HEAD-AUTH'
        )
    `).run(
        P04_REGISTRY_ID,
        P04_STATE,
    );
}

function createPlannerTables(
    db: Database.Database,
): void {
    db.exec(`
        CREATE TABLE planner_days (
            id TEXT PRIMARY KEY,
            plan_date TEXT NOT NULL,
            main_outcome TEXT,
            daily_capacity_minutes INTEGER,
            energy_level TEXT,
            status TEXT NOT NULL
        );

        CREATE TABLE project_items (
            id TEXT PRIMARY KEY,
            project_id TEXT NOT NULL
        );

        CREATE TABLE planner_items (
            id TEXT PRIMARY KEY,
            planner_day_id TEXT NOT NULL,
            source_type TEXT NOT NULL,
            source_id TEXT NOT NULL,
            work_mode TEXT NOT NULL,
            priority TEXT NOT NULL,
            planner_status TEXT NOT NULL,
            is_main_task INTEGER NOT NULL,
            planned_order INTEGER NOT NULL,
            created_at TEXT NOT NULL
        );
    `);
}

describe(
    "Control Center governed managed-Portfolio projection",
    () => {
        let db:
            Database.Database;

        beforeEach(() => {
            db =
                new Database(":memory:");

            createProjectsTable(db);
            ensureProjectStateSchema(db);
        });

        afterEach(() => {
            if (db.open) {
                db.close();
            }
        });

        it(
            "projects ACC-PPC-v0.4 from the frozen 15 / 10 / 5 managed directory",
            () => {
                insertP04(db);

                const result =
                    buildControlCenterProjection(
                        db,
                        "2026-09-29",
                    );

                expect(
                    result.schemaVersion,
                ).toBe(
                    CONTROL_CENTER_PROJECTION_SCHEMA_VERSION,
                );

                expect(
                    result.schemaVersion,
                ).toBe(
                    "ACC-PPC-v0.4",
                );

                expect(
                    result.managedProjectSummary,
                ).toEqual({
                    projectCount: 15,
                    boundCount: 10,
                    missingOrUnboundCount: 5,
                });

                expect(
                    result.managedProjects,
                ).toHaveLength(15);

                const unbound =
                    result.managedProjects
                        .filter(
                            (project) =>
                                project
                                    .directoryBinding
                                ===
                                "MISSING_OR_UNBOUND",
                        )
                        .map(
                            (project) =>
                                project
                                    .identity
                                    .id,
                        )
                        .sort();

                expect(
                    unbound,
                ).toEqual([
                    "AVACRM",
                    "GF-LEARNING-CONTENT",
                    "GF-TOOLS",
                    "P01",
                    "P07",
                ]);

                const p04 =
                    result.managedProjects
                        .find(
                            (project) =>
                                project
                                    .identity
                                    .id
                                === "P04",
                        );

                expect(p04).toMatchObject({
                    identity: {
                        id: "P04",
                        slug: P04_SLUG,
                        registryProjectId:
                            P04_REGISTRY_ID,
                    },

                    directoryBinding:
                        "BOUND",

                    registryObservation:
                        "PROVEN_PRESENT",

                    canonicalProjectState: {
                        value:
                            P04_STATE,
                        authority:
                            "PROJECT_STATE",
                        currentness:
                            "CURRENT",
                    },

                    nextAuthoritativeAction: {
                        value:
                            P04_ACTION,
                        authority:
                            "PROJECT_STATE",
                        currentness:
                            "CURRENT",
                    },
                });

                expect(
                    p04?.registryMetadata,
                ).toEqual({
                    value:
                        expect.objectContaining({
                            authority:
                                "REGISTRY_METADATA",

                            currentness:
                                "CURRENT_WITHIN_SOURCE",

                            nextAction:
                                "REGISTRY ACTION MUST REMAIN SEPARATE",
                        }),

                    authority:
                        "REGISTRY_METADATA",

                    currentness:
                        "CURRENT_WITHIN_SOURCE",
                });

                expect(
                    p04
                        ?.registryMetadata
                        .value
                        ?.nextAction,
                ).not.toEqual(
                    p04
                        ?.nextAuthoritativeAction
                        .value,
                );
            },
        );

        it(
            "fails closed with available Phase 7 authority tables and no Human portfolio head",
            () => {
                ensurePortfolioExecutionOrderSchema(
                    db,
                );

                insertP04(db);

                const result =
                    buildControlCenterProjection(
                        db,
                        "2026-09-29",
                    );

                expect(
                    result
                        .portfolioExecutionOrder
                        .authorityRead,
                ).toEqual({
                    status:
                        "NOT_PROVEN",
                    reason:
                        "NO_HEAD",
                    humanPortfolioHead:
                        "ABSENT",
                });

                expect(
                    result
                        .portfolioExecutionOrder
                        .dependencyOrder
                        .currentness,
                ).toBe(
                    "NOT_PROVEN",
                );

                expect(
                    result
                        .portfolioExecutionOrder
                        .projects,
                ).toHaveLength(15);

                for (
                    const project
                    of result
                        .portfolioExecutionOrder
                        .projects
                ) {
                    expect(
                        project
                            .portfolioPriority
                            .currentness,
                    ).toBe(
                        "NOT_PROVEN",
                    );

                    expect(
                        project
                            .executionPosture
                            .currentness,
                    ).toBe(
                        "NOT_PROVEN",
                    );

                    expect(
                        project
                            .humanDecisionRequired
                            .value
                            ?.required,
                    ).toBe(true);
                }

                expect(
                    result
                        .portfolioStatus
                        .meaning,
                ).toBe(
                    "Classification only. Not portfolio priority or execution order.",
                );
            },
        );

        it(
            "uses exact slug joins only and never adopts an outside-set project by name",
            () => {
                insertProject(
                    db,
                    {
                        id:
                            "outside-p01",

                        slug:
                            "green-fineness-operations-intelligence-tgd",

                        name:
                            "Green Fineness — Nursery Operations Platform",

                        nextAction:
                            "Outside-set registry action",
                    },
                );

                const result =
                    buildControlCenterProjection(
                        db,
                        "2026-09-29",
                    );

                const p01 =
                    result.managedProjects
                        .find(
                            (project) =>
                                project
                                    .identity
                                    .id
                                === "P01",
                        );

                expect(p01).toMatchObject({
                    identity: {
                        id: "P01",
                        slug: null,
                        registryProjectId:
                            null,
                    },

                    directoryBinding:
                        "MISSING_OR_UNBOUND",

                    registryObservation:
                        "NOT_PROVEN",

                    registryMetadata: {
                        value: null,
                        authority: "NONE",
                        currentness:
                            "UNBOUND",
                    },

                    canonicalProjectState: {
                        value: null,
                        authority: "NONE",
                        currentness:
                            "UNBOUND",
                    },

                    nextAuthoritativeAction: {
                        value: null,
                        authority: "NONE",
                        currentness:
                            "UNBOUND",
                    },
                });

                const promotedOutside =
                    result.managedProjects
                        .filter(
                            (project) =>
                                project
                                    .identity
                                    .slug
                                ===
                                "green-fineness-operations-intelligence-tgd",
                        );

                expect(
                    promotedOutside,
                ).toEqual([]);
            },
        );

        it(
            "implements the frozen BOUND + PROVEN_ABSENT fail-closed amendment exactly",
            () => {
                const result =
                    buildControlCenterProjection(
                        db,
                        "2026-09-29",
                    );

                const p02 =
                    result.managedProjects
                        .find(
                            (project) =>
                                project
                                    .identity
                                    .id
                                === "P02",
                        );

                expect(p02).toMatchObject({
                    identity: {
                        id: "P02",

                        slug:
                            "green-fineness-content",

                        registryProjectId:
                            null,
                    },

                    directoryBinding:
                        "BOUND",

                    registryObservation:
                        "PROVEN_ABSENT",

                    registryMetadata: {
                        value: null,

                        authority:
                            "REGISTRY_METADATA",

                        currentness:
                            "NOT_PROVEN",
                    },

                    canonicalProjectState: {
                        value: null,
                        authority: "NONE",
                        currentness:
                            "NOT_PROVEN",
                    },

                    nextAuthoritativeAction: {
                        value: null,
                        authority: "NONE",
                        currentness:
                            "NOT_PROVEN",
                    },
                });

                expect(
                    p02
                        ?.canonicalProjectState
                        .authority,
                ).not.toBe(
                    "PROJECT_STATE",
                );

                expect(
                    p02
                        ?.nextAuthoritativeAction
                        .authority,
                ).not.toBe(
                    "PROJECT_STATE",
                );
            },
        );

        it(
            "keeps Planner under PLANNER_STATE without overriding governed Project claims",
            () => {
                insertP04(db);
                createPlannerTables(db);

                db.prepare(`
                    INSERT INTO planner_days (
                        id,
                        plan_date,
                        main_outcome,
                        daily_capacity_minutes,
                        energy_level,
                        status
                    ) VALUES (
                        'day-1',
                        '2026-09-29',
                        'Planner-only outcome',
                        180,
                        'high',
                        'active'
                    )
                `).run();

                db.prepare(`
                    INSERT INTO project_items (
                        id,
                        project_id
                    ) VALUES (
                        'item-1',
                        ?
                    )
                `).run(
                    P04_REGISTRY_ID,
                );

                db.prepare(`
                    INSERT INTO planner_items (
                        id,
                        planner_day_id,
                        source_type,
                        source_id,
                        work_mode,
                        priority,
                        planner_status,
                        is_main_task,
                        planned_order,
                        created_at
                    ) VALUES (
                        'planner-1',
                        'day-1',
                        'project_item',
                        'item-1',
                        'focus',
                        'critical',
                        'doing',
                        1,
                        1,
                        '2026-09-29T00:00:00Z'
                    )
                `).run();

                const result =
                    buildControlCenterProjection(
                        db,
                        "2026-09-29",
                    );

                expect(
                    result.plannerState,
                ).toMatchObject({
                    authority:
                        "PLANNER_STATE",

                    availability:
                        "AVAILABLE",

                    currentness:
                        "CURRENT_WITHIN_SOURCE",
                });

                const p04 =
                    result.managedProjects
                        .find(
                            (project) =>
                                project
                                    .identity
                                    .id
                                === "P04",
                        );

                expect(
                    p04
                        ?.canonicalProjectState,
                ).toEqual({
                    value:
                        P04_STATE,

                    authority:
                        "PROJECT_STATE",

                    currentness:
                        "CURRENT",
                });

                expect(
                    p04
                        ?.nextAuthoritativeAction,
                ).toEqual({
                    value:
                        P04_ACTION,

                    authority:
                        "PROJECT_STATE",

                    currentness:
                        "CURRENT",
                });
            },
        );
        it(
            "projects canonical dependencies, exact project links, and Canonical State Evidence for consistent CURRENT state",
            () => {
                insertP04(db);

                const result =
                    buildControlCenterProjection(
                        db,
                        "2026-09-29",
                    );

                expect(
                    result
                        .canonicalEnrichmentConsistency,
                ).toBe("PASS");

                const p04 =
                    result.managedProjects.find(
                        (project) =>
                            project.identity.id
                            === "P04",
                    );

                expect(
                    p04?.dependencyClaim,
                ).toEqual({
                    value: {
                        status: "KNOWN",
                        value: [],
                    },
                    authority:
                        "PROJECT_STATE",
                    currentness:
                        "CURRENT",
                });

                expect(
                    p04?.projectLink,
                ).toEqual({
                    href:
                        "/projects/workos-lite-arbordesk",
                    authority:
                        "MANAGED_PROJECT_REGISTRY",
                    currentness:
                        "CURRENT",
                });

                expect(
                    p04
                        ?.canonicalStateEvidence,
                ).toEqual({
                    value: {
                        stateVersionId:
                            P04_STATE,
                        href:
                            "/api/projects/workos-lite-arbordesk/state",
                        authorityRef:
                            "PHASE6-TEST-AUTH",
                        sourceType:
                            "human_frozen_contract",
                        sourceRef:
                            "PHASE6-TEST-SOURCE",
                        issuedAt:
                            "2026-09-29T00:00:00Z",
                    },
                    authority:
                        "PROJECT_STATE",
                    currentness:
                        "CURRENT",
                });

                expect(
                    p04
                        ?.canonicalEnrichmentConsistency,
                ).toBe("PASS");

                const p02 =
                    result.managedProjects.find(
                        (project) =>
                            project.identity.id
                            === "P02",
                    );

                expect(
                    p02?.projectLink.href,
                ).toBeNull();

                expect(
                    p02?.dependencyClaim,
                ).toEqual({
                    value: null,
                    authority: "NONE",
                    currentness:
                        "NOT_PROVEN",
                });

                const p01 =
                    result.managedProjects.find(
                        (project) =>
                            project.identity.id
                            === "P01",
                    );

                expect(
                    p01?.projectLink.href,
                ).toBeNull();

                expect(
                    p01?.dependencyClaim,
                ).toEqual({
                    value: null,
                    authority: "NONE",
                    currentness:
                        "UNBOUND",
                });
            },
        );

        it(
            "preserves KNOWN UNKNOWN and NOT_GOVERNED dependency GovernedFact values exactly",
            () => {
                const context = {
                    directoryBinding:
                        "BOUND",
                    registryObservation:
                        "PROVEN_PRESENT",
                    workosSlug:
                        P04_SLUG,
                    registryProjectId:
                        P04_REGISTRY_ID,
                    coreCanonical: {
                        authority:
                            "PROJECT_STATE",
                        stateStatus:
                            "CURRENT",
                        stateVersionId:
                            P04_STATE,
                        stateRoute:
                            "/api/projects/workos-lite-arbordesk/state",
                        nextAuthoritativeAction:
                            P04_ACTION,
                    },
                } as const;

                const dependencies:
                    GovernedFact[] = [
                        {
                            status: "KNOWN",
                            value: [
                                "P05",
                            ],
                        },
                        {
                            status:
                                "UNKNOWN",
                        },
                        {
                            status:
                                "NOT_GOVERNED",
                        },
                    ];

                for (
                    const dependency
                    of dependencies
                ) {
                    const result =
                        resolveCanonicalEnrichment(
                            context,
                            {
                                status:
                                    "CURRENT",
                                projectSlug:
                                    P04_SLUG,
                                projectId:
                                    P04_REGISTRY_ID,
                                stateVersionId:
                                    P04_STATE,
                                dependencies:
                                    dependency,
                                evidence: {
                                    authorityRef:
                                        "AUTH",
                                    sourceType:
                                        "TYPE",
                                    sourceRef:
                                        "REF",
                                    issuedAt:
                                        "2026-09-29T00:00:00Z",
                                },
                            },
                        );

                    expect(
                        result.consistency,
                    ).toBe("PASS");

                    expect(
                        result
                            .dependencyClaim
                            .value,
                    ).toEqual(
                        dependency,
                    );
                }
            },
        );

        it(
            "fails closed when Core and canonical enrichment disagree on CURRENT version",
            () => {
                const result =
                    resolveCanonicalEnrichment(
                        {
                            directoryBinding:
                                "BOUND",
                            registryObservation:
                                "PROVEN_PRESENT",
                            workosSlug:
                                P04_SLUG,
                            registryProjectId:
                                P04_REGISTRY_ID,
                            coreCanonical: {
                                authority:
                                    "PROJECT_STATE",
                                stateStatus:
                                    "CURRENT",
                                stateVersionId:
                                    P04_STATE,
                                stateRoute:
                                    "/api/projects/workos-lite-arbordesk/state",
                                nextAuthoritativeAction:
                                    P04_ACTION,
                            },
                        },
                        {
                            status:
                                "CURRENT",
                            projectSlug:
                                P04_SLUG,
                            projectId:
                                P04_REGISTRY_ID,
                            stateVersionId:
                                "WRONG-VERSION",
                            dependencies: {
                                status:
                                    "KNOWN",
                                value: [
                                    "MUST-NOT-LEAK",
                                ],
                            },
                            evidence: {
                                authorityRef:
                                    "AUTH",
                                sourceType:
                                    "TYPE",
                                sourceRef:
                                    "REF",
                                issuedAt:
                                    "2026-09-29T00:00:00Z",
                            },
                        },
                    );

                expect(
                    result.consistency,
                ).toBe("FAIL");

                expect(
                    result.dependencyClaim,
                ).toEqual({
                    value: null,
                    authority:
                        "PROJECT_STATE",
                    currentness:
                        "NOT_PROVEN",
                });

                expect(
                    result
                        .canonicalStateEvidence,
                ).toEqual({
                    value: null,
                    authority:
                        "PROJECT_STATE",
                    currentness:
                        "NOT_PROVEN",
                });
            },
        );

        it(
            "permits canonical enrichment only for BOUND PROVEN_PRESENT exact slug eligibility",
            () => {
                expect(
                    isCanonicalEnrichmentEligible({
                        directoryBinding:
                            "BOUND",
                        registryObservation:
                            "PROVEN_PRESENT",
                        workosSlug:
                            P04_SLUG,
                    }),
                ).toBe(true);

                expect(
                    isCanonicalEnrichmentEligible({
                        directoryBinding:
                            "BOUND",
                        registryObservation:
                            "PROVEN_ABSENT",
                        workosSlug:
                            P04_SLUG,
                    }),
                ).toBe(false);

                expect(
                    isCanonicalEnrichmentEligible({
                        directoryBinding:
                            "MISSING_OR_UNBOUND",
                        registryObservation:
                            "NOT_PROVEN",
                        workosSlug:
                            null,
                    }),
                ).toBe(false);

                expect(
                    isCanonicalEnrichmentEligible({
                        directoryBinding:
                            "BOUND",
                        registryObservation:
                            "PROVEN_PRESENT",
                        workosSlug:
                            null,
                    }),
                ).toBe(false);
            },
        );

        it(
            "maps Planner status to NOW NEXT WAITING BLOCKED and keeps membership and display order independent of priority planned_order and is_main_task",
            () => {
                createPlannerTables(db);

                db.prepare(`
                    INSERT INTO planner_days (
                        id,
                        plan_date,
                        main_outcome,
                        daily_capacity_minutes,
                        energy_level,
                        status
                    ) VALUES (
                        'status-day',
                        '2026-09-29',
                        'Classification proof',
                        240,
                        'normal',
                        'active'
                    )
                `).run();

                const rows = [
                    [
                        "status-20",
                        "doing",
                        "low",
                        0,
                        1,
                    ],
                    [
                        "status-10",
                        "doing",
                        "critical",
                        1,
                        5,
                    ],
                    [
                        "status-40",
                        "ready",
                        "medium",
                        0,
                        2,
                    ],
                    [
                        "status-30",
                        "waiting",
                        "high",
                        1,
                        4,
                    ],
                    [
                        "status-50",
                        "blocked",
                        "critical",
                        0,
                        3,
                    ],
                ] as const;

                for (
                    const [
                        id,
                        status,
                        priority,
                        isMain,
                        plannedOrder,
                    ]
                    of rows
                ) {
                    db.prepare(`
                        INSERT INTO planner_items (
                            id,
                            planner_day_id,
                            source_type,
                            source_id,
                            work_mode,
                            priority,
                            planner_status,
                            is_main_task,
                            planned_order,
                            created_at
                        ) VALUES (
                            ?,
                            'status-day',
                            'manual',
                            ?,
                            'focus',
                            ?,
                            ?,
                            ?,
                            ?,
                            '2026-09-29T00:00:00Z'
                        )
                    `).run(
                        id,
                        id,
                        priority,
                        status,
                        isMain,
                        plannedOrder,
                    );
                }

                const before =
                    buildControlCenterProjection(
                        db,
                        "2026-09-29",
                    );

                const ids = (
                    bucket:
                        keyof typeof before
                            .portfolioStatus
                            .buckets,
                ) =>
                    before
                        .portfolioStatus
                        .buckets[
                            bucket
                        ]
                        .map(
                            (item) =>
                                item.id,
                        );

                expect(
                    ids("NOW"),
                ).toEqual([
                    "status-10",
                    "status-20",
                ]);

                expect(
                    ids("NEXT"),
                ).toEqual([
                    "status-40",
                ]);

                expect(
                    ids("WAITING"),
                ).toEqual([
                    "status-30",
                ]);

                expect(
                    ids("BLOCKED"),
                ).toEqual([
                    "status-50",
                ]);

                expect(
                    before
                        .portfolioStatus
                        .meaning,
                ).toBe(
                    "Classification only. Not portfolio priority or execution order.",
                );

                const beforeIds =
                    Object.fromEntries(
                        (
                            [
                                "NOW",
                                "NEXT",
                                "WAITING",
                                "BLOCKED",
                            ] as const
                        ).map(
                            (bucket) => [
                                bucket,
                                before
                                    .portfolioStatus
                                    .buckets[
                                        bucket
                                    ]
                                    .map(
                                        (
                                            item,
                                        ) =>
                                            item.id,
                                    ),
                            ],
                        ),
                    );

                db.exec(`
                    UPDATE planner_items
                    SET
                        priority =
                            CASE
                                WHEN priority = 'critical'
                                THEN 'low'
                                ELSE 'critical'
                            END,
                        planned_order =
                            100 - planned_order,
                        is_main_task =
                            CASE
                                WHEN is_main_task = 1
                                THEN 0
                                ELSE 1
                            END
                `);

                const after =
                    buildControlCenterProjection(
                        db,
                        "2026-09-29",
                    );

                const afterIds =
                    Object.fromEntries(
                        (
                            [
                                "NOW",
                                "NEXT",
                                "WAITING",
                                "BLOCKED",
                            ] as const
                        ).map(
                            (bucket) => [
                                bucket,
                                after
                                    .portfolioStatus
                                    .buckets[
                                        bucket
                                    ]
                                    .map(
                                        (
                                            item,
                                        ) =>
                                            item.id,
                                    ),
                            ],
                        ),
                    );

                expect(
                    afterIds,
                ).toEqual(
                    beforeIds,
                );
            },
        );

    },
);
