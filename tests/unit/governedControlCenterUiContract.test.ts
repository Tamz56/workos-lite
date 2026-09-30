import {
    readFileSync,
} from "node:fs";

import path from "node:path";

import {
    describe,
    expect,
    it,
} from "vitest";

const HOST_PATH =
    path.resolve(
        process.cwd(),
        "src/components/arbor-desk/CommandCenterPanel.tsx",
    );

const VIEW_PATH =
    path.resolve(
        process.cwd(),
        "src/components/arbor-desk/GovernedControlCenterView.tsx",
    );

const hostSource =
    readFileSync(
        HOST_PATH,
        "utf8",
    );

const viewSource =
    readFileSync(
        VIEW_PATH,
        "utf8",
    );

describe(
    "ACC-PPC-v0.2 governed Control Center UI contract",
    () => {
        it(
            "mounts the governed view inside the existing host",
            () => {
                expect(
                    hostSource,
                ).toContain(
                    'import GovernedControlCenterView from "@/components/arbor-desk/GovernedControlCenterView"',
                );

                expect(
                    hostSource,
                ).toContain(
                    "<GovernedControlCenterView />",
                );
            },
        );

        it(
            "consumes only the governed read-only Control Center endpoint",
            () => {
                expect(
                    viewSource,
                ).toContain(
                    'fetch("/api/arbor-desk/control-center", { cache: "no-store" })',
                );

                expect(
                    viewSource,
                ).not.toContain(
                    "/api/tasks?limit=300",
                );

                expect(
                    viewSource,
                ).not.toContain(
                    "/api/content/writing-lab/projects",
                );

                expect(
                    viewSource,
                ).not.toContain(
                    "/api/arbor-inbox",
                );
            },
        );

        it(
            "introduces no mutation API methods",
            () => {
                for (
                    const method
                    of [
                        "POST",
                        "PUT",
                        "PATCH",
                        "DELETE",
                    ]
                ) {
                    expect(
                        viewSource,
                    ).not.toMatch(
                        new RegExp(
                            `method\\s*:\\s*[\\\"']${method}[\\\"']`,
                            "i",
                        ),
                    );
                }
            },
        );

        it(
            "renders Managed Projects rather than raw Registry count",
            () => {
                expect(
                    viewSource,
                ).toContain(
                    "managedProjectSummary.projectCount",
                );

                expect(
                    viewSource,
                ).toContain(
                    "managedProjects",
                );

                expect(
                    viewSource,
                ).toContain(
                    "Managed Projects",
                );

                expect(
                    viewSource,
                ).not.toContain(
                    "Registry projects",
                );
            },
        );

        it(
            "keeps Registry, canonical state, and authoritative action separate",
            () => {
                expect(
                    viewSource,
                ).toContain(
                    "registryMetadata",
                );

                expect(
                    viewSource,
                ).toContain(
                    "canonicalProjectState",
                );

                expect(
                    viewSource,
                ).toContain(
                    "nextAuthoritativeAction",
                );

                expect(
                    viewSource,
                ).toContain(
                    "Registry next action",
                );

                expect(
                    viewSource,
                ).toContain(
                    "Canonical Project State",
                );

                expect(
                    viewSource,
                ).toContain(
                    "Next Authoritative Action",
                );
            },
        );

        it(
            "renders governed claim states and GovernedFact states explicitly",
            () => {
                for (
                    const state
                    of [
                        "CURRENT",
                        "STALE",
                        "NOT_PROVEN",
                        "UNBOUND",
                        "KNOWN",
                        "UNKNOWN",
                        "NOT_GOVERNED",
                    ]
                ) {
                    expect(
                        viewSource,
                    ).toContain(
                        `"${state}"`,
                    );
                }

                expect(
                    viewSource,
                ).toContain(
                    "CURRENT_WITHIN_SOURCE",
                );
            },
        );

        it(
            "keeps Planner status surfaces explicit",
            () => {
                for (
                    const status
                    of [
                        "doing",
                        "ready",
                        "waiting",
                        "blocked",
                        "review",
                    ]
                ) {
                    expect(
                        viewSource,
                    ).toContain(
                        `"${status}"`,
                    );
                }

                expect(
                    viewSource,
                ).toContain(
                    "is_main_task === 1",
                );

                expect(
                    viewSource,
                ).toContain(
                    "No Today state is inferred",
                );
            },
        );

        it(
            "keeps unavailable execution and dependency evidence explicit",
            () => {
                expect(
                    viewSource,
                ).toContain(
                    "executionEvidence",
                );

                expect(
                    viewSource,
                ).toContain(
                    "Dedicated dependency projection",
                );

                expect(
                    viewSource,
                ).toContain(
                    "No governed execution activity is available in this projection.",
                );
            },
        );
    },
);
