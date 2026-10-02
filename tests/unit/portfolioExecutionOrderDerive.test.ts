import {
    describe,
    expect,
    it,
} from "vitest";

import {
    derivePortfolioExecutionOrderProjection,
    type Phase7ProjectInput,
} from "@/lib/portfolio-execution-order/derive";

import type {
    PortfolioExecutionOrderReadResult,
} from "@/lib/portfolio-execution-order/types";

const KNOWN = <T>(value: T) => ({
    status: "KNOWN" as const,
    value,
});

function dependency(
    relationships: unknown[] = [],
    completeness:
        | "COMPLETE"
        | "PARTIAL" = "COMPLETE",
): Phase7ProjectInput["dependency"] {
    return {
        fact: KNOWN({
            schemaVersion:
                "dependency-set.v0.1",
            completeness,
            relationships,
        }),
        currentness: "CURRENT",
        authorityRef:
            "PROJECT-STATE-AUTH",
        sourceRefs: [
            "PROJECT-STATE-SOURCE",
        ],
    };
}

function blocker(
    blockers: unknown[] = [],
    completeness:
        | "COMPLETE"
        | "PARTIAL" = "COMPLETE",
): Phase7ProjectInput["blocker"] {
    return {
        fact: KNOWN({
            schemaVersion:
                "blocker-set.v0.1",
            completeness,
            blockers,
        }),
        currentness: "CURRENT",
        authorityRef:
            "PROJECT-STATE-AUTH",
        sourceRefs: [
            "PROJECT-STATE-SOURCE",
        ],
    };
}

function project(
    managedProjectId: string,
    dependencyInput =
        dependency(),
    blockerInput =
        blocker(),
): Phase7ProjectInput {
    return {
        managedProjectId,
        dependency:
            dependencyInput,
        blocker:
            blockerInput,
    };
}

function currentRead(
    ids: readonly string[],
    assignments =
        ids.map(
            (managedProjectId) => ({
                managedProjectId,
                portfolioPriority:
                    "PRIMARY" as const,
                executionPosture:
                    "CONTINUE" as const,
            }),
        ),
): PortfolioExecutionOrderReadResult {
    return {
        status: "CURRENT",
        head: {
            scope_id:
                "MANAGED_PORTFOLIO",
            current_version_id:
                "PEO-V1",
            selected_at:
                "2026-10-02T00:00:00Z",
            selected_by: "human",
            selection_authority_ref:
                "PEO-HEAD-AUTH",
        },
        state: {
            schemaVersion:
                "portfolio-execution-order.v0.1",
            scope:
                "MANAGED_PORTFOLIO",
            managedDirectoryRef:
                "WORKOS PROJECT DIRECTORY BINDING v0.1",
            managedProjectSetHash:
                "a".repeat(64),
            authorityRef:
                "PEO-HUMAN-AUTH",
            sourceRef:
                "PEO-HUMAN-SOURCE",
            decidedAt:
                "2026-10-02T00:00:00Z",
            reviewedAt:
                "2026-10-02T00:00:00Z",
            reviewBy:
                "2026-12-31T00:00:00Z",
            assignments:
                [...assignments],
        },
        coverage:
            ids.map(
                (managedProjectId) => {
                    const assignment =
                        assignments.find(
                            (item) =>
                                item.managedProjectId
                                === managedProjectId,
                        );

                    if (!assignment) {
                        return {
                            managedProjectId,
                            assignmentPresent:
                                false,
                            portfolioPriority: {
                                status:
                                    "NOT_PROVEN" as const,
                            },
                            executionPosture: {
                                status:
                                    "NOT_PROVEN" as const,
                            },
                        };
                    }

                    return {
                        managedProjectId,
                        assignmentPresent:
                            true,
                        portfolioPriority: {
                            status:
                                "KNOWN" as const,
                            value:
                                assignment
                                    .portfolioPriority,
                        },
                        executionPosture: {
                            status:
                                "KNOWN" as const,
                            value:
                                assignment
                                    .executionPosture,
                        },
                    };
                },
            ),
        currentManagedProjectSetHash:
            "a".repeat(64),
    };
}

function staleRead(
    ids: readonly string[],
): PortfolioExecutionOrderReadResult {
    const current =
        currentRead(ids);

    if (
        current.status !== "CURRENT"
    ) {
        throw new Error(
            "fixture must be current",
        );
    }

    return {
        ...current,
        status: "STALE",
        reason:
            "MANAGED_PROJECT_SET_DRIFT",
    };
}

describe(
    "Phase 7 deterministic Portfolio Execution Order derivation",
    () => {
        it(
            "F01 valid Human state produces CURRENT priority and posture",
            () => {
                const result =
                    derivePortfolioExecutionOrderProjection({
                        portfolioRead:
                            currentRead([
                                "A",
                            ]),
                        projects: [
                            project("A"),
                        ],
                    });

                expect(
                    result.projects[0]
                        .portfolioPriority,
                ).toMatchObject({
                    value: "PRIMARY",
                    authority:
                        "HUMAN_PORTFOLIO_DECISION",
                    currentness:
                        "CURRENT",
                });

                expect(
                    result.projects[0]
                        .executionPosture,
                ).toMatchObject({
                    value: "CONTINUE",
                    authority:
                        "HUMAN_PORTFOLIO_DECISION",
                    currentness:
                        "CURRENT",
                });
            },
        );

        it(
            "F02 managed membership drift keeps Human priority and posture STALE",
            () => {
                const result =
                    derivePortfolioExecutionOrderProjection({
                        portfolioRead:
                            staleRead([
                                "A",
                            ]),
                        projects: [
                            project("A"),
                        ],
                    });

                expect(
                    result.projects[0]
                        .portfolioPriority
                        .currentness,
                ).toBe("STALE");

                expect(
                    result.projects[0]
                        .executionPosture
                        .currentness,
                ).toBe("STALE");
            },
        );

        it(
            "F03 missing Human assignment fails closed and requires Human decision",
            () => {
                const result =
                    derivePortfolioExecutionOrderProjection({
                        portfolioRead:
                            currentRead(
                                ["A"],
                                [],
                            ),
                        projects: [
                            project("A"),
                        ],
                    });

                expect(
                    result.projects[0]
                        .portfolioPriority
                        .currentness,
                ).toBe(
                    "NOT_PROVEN",
                );

                expect(
                    result.projects[0]
                        .humanDecisionRequired
                        .value,
                ).toMatchObject({
                    required: true,
                });
            },
        );

        it(
            "F04 COMPLETE graph derives exact deterministic target-to-subject order",
            () => {
                const result =
                    derivePortfolioExecutionOrderProjection({
                        portfolioRead:
                            currentRead([
                                "A",
                                "B",
                            ]),
                        projects: [
                            project(
                                "A",
                                dependency([
                                    {
                                        id: "A-needs-B",
                                        target: {
                                            kind:
                                                "PROJECT",
                                            managedProjectId:
                                                "B",
                                        },
                                        requirement:
                                            "REQUIRED",
                                        state:
                                            "OPEN",
                                        evidenceRef:
                                            "DEP-EVIDENCE",
                                    },
                                ]),
                            ),
                            project("B"),
                        ],
                    });

                expect(
                    result
                        .dependencyOrder,
                ).toMatchObject({
                    value: [
                        ["B"],
                        ["A"],
                    ],
                    currentness:
                        "CURRENT",
                });

                expect(
                    result.projects.find(
                        (item) =>
                            item.managedProjectId
                            === "A",
                    )?.mustHappenFirst
                        .value,
                ).toEqual({
                    direct: ["B"],
                    transitive: ["B"],
                });
            },
        );

        it(
            "F05 required dependency cycle is CONFLICTED",
            () => {
                const result =
                    derivePortfolioExecutionOrderProjection({
                        portfolioRead:
                            currentRead([
                                "A",
                                "B",
                            ]),
                        projects: [
                            project(
                                "A",
                                dependency([
                                    {
                                        id: "A-needs-B",
                                        target: {
                                            kind:
                                                "PROJECT",
                                            managedProjectId:
                                                "B",
                                        },
                                        requirement:
                                            "REQUIRED",
                                        state:
                                            "OPEN",
                                        evidenceRef:
                                            "E-A",
                                    },
                                ]),
                            ),
                            project(
                                "B",
                                dependency([
                                    {
                                        id: "B-needs-A",
                                        target: {
                                            kind:
                                                "PROJECT",
                                            managedProjectId:
                                                "A",
                                        },
                                        requirement:
                                            "REQUIRED",
                                        state:
                                            "OPEN",
                                        evidenceRef:
                                            "E-B",
                                    },
                                ]),
                            ),
                        ],
                    });

                expect(
                    result
                        .dependencyOrder
                        .currentness,
                ).toBe(
                    "CONFLICTED",
                );

                expect(
                    result.projects[0]
                        .humanDecisionRequired
                        .value
                        ?.reasons,
                ).toContain(
                    "DEPENDENCY_CYCLE",
                );
            },
        );

        it(
            "F06 untyped and PARTIAL dependency evidence cannot become global order",
            () => {
                const untyped =
                    derivePortfolioExecutionOrderProjection({
                        portfolioRead:
                            currentRead([
                                "A",
                            ]),
                        projects: [
                            project(
                                "A",
                                {
                                    fact:
                                        KNOWN([]),
                                    currentness:
                                        "CURRENT",
                                    authorityRef:
                                        "PS-AUTH",
                                    sourceRefs: [
                                        "PS-SOURCE",
                                    ],
                                },
                            ),
                        ],
                    });

                expect(
                    untyped
                        .dependencyOrder
                        .currentness,
                ).toBe(
                    "NOT_PROVEN",
                );

                const partial =
                    derivePortfolioExecutionOrderProjection({
                        portfolioRead:
                            currentRead([
                                "A",
                            ]),
                        projects: [
                            project(
                                "A",
                                dependency(
                                    [],
                                    "PARTIAL",
                                ),
                            ),
                        ],
                    });

                expect(
                    partial
                        .dependencyOrder
                        .currentness,
                ).toBe(
                    "NOT_PROVEN",
                );
            },
        );

        it(
            "F07 explicit CURRENT REQUIRED OPEN external dependency is visible as external waiting",
            () => {
                const result =
                    derivePortfolioExecutionOrderProjection({
                        portfolioRead:
                            currentRead([
                                "A",
                            ]),
                        projects: [
                            project(
                                "A",
                                dependency([
                                    {
                                        id:
                                            "A-needs-external",
                                        target: {
                                            kind:
                                                "EXTERNAL",
                                            externalId:
                                                "EXT-1",
                                            label:
                                                "External approval",
                                        },
                                        requirement:
                                            "REQUIRED",
                                        state:
                                            "OPEN",
                                        evidenceRef:
                                            "EXT-EVIDENCE",
                                    },
                                ]),
                            ),
                        ],
                    });

                expect(
                    result.projects[0]
                        .waitingForExternalDependency,
                ).toMatchObject({
                    currentness:
                        "CURRENT",
                    value: [
                        {
                            externalId:
                                "EXT-1",
                            label:
                                "External approval",
                            evidenceRef:
                                "EXT-EVIDENCE",
                        },
                    ],
                });

                expect(
                    result.projects[0]
                        .blockingStatus
                        .value,
                ).toBe(
                    "BLOCKED",
                );
            },
        );

        it(
            "F08 COMPLETE valid no-path graph proves parallel eligibility",
            () => {
                const result =
                    derivePortfolioExecutionOrderProjection({
                        portfolioRead:
                            currentRead([
                                "A",
                                "B",
                            ]),
                        projects: [
                            project("A"),
                            project("B"),
                        ],
                    });

                expect(
                    result.projects.find(
                        (item) =>
                            item.managedProjectId
                            === "A",
                    )?.canRunInParallel,
                ).toMatchObject({
                    value: ["B"],
                    currentness:
                        "CURRENT",
                });
            },
        );

        it(
            "F09 Planner and Registry context cannot alter Human Portfolio authority",
            () => {
                const base = {
                    portfolioRead:
                        currentRead([
                            "A",
                        ]),
                    projects: [
                        project("A"),
                    ],
                    registryPriority:
                        "critical",
                    plannerPriority:
                        "high",
                    plannedOrder: 1,
                    isMainTask: 1,
                };

                const before =
                    derivePortfolioExecutionOrderProjection(
                        base,
                    );

                const after =
                    derivePortfolioExecutionOrderProjection({
                        ...base,
                        registryPriority:
                            "low",
                        plannerPriority:
                            "low",
                        plannedOrder: 999,
                        isMainTask: 0,
                    });

                expect(
                    after.projects[0]
                        .portfolioPriority,
                ).toEqual(
                    before.projects[0]
                        .portfolioPriority,
                );

                expect(
                    after.projects[0]
                        .executionPosture,
                ).toEqual(
                    before.projects[0]
                        .executionPosture,
                );
            },
        );
    },
);
