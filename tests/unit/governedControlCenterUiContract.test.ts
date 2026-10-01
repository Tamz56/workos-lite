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
    "ACC-PPC-v0.3 governed Control Center UI contract",
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
            "exposes exact governed Project links without deriving routes from names",
            () => {
                expect(
                    viewSource,
                ).toContain(
                    "project.projectLink.href",
                );

                expect(
                    viewSource,
                ).toContain(
                    "Open Project",
                );

                expect(
                    viewSource,
                ).not.toContain(
                    "encodeURIComponent(project.identity.name",
                );

                expect(
                    viewSource,
                ).not.toContain(
                    "project.identity.id}/",
                );
            },
        );

        it(
            "renders canonical Dependencies and Canonical State Evidence with exact wording",
            () => {
                expect(
                    viewSource,
                ).toContain(
                    "Dependencies",
                );

                expect(
                    viewSource,
                ).toContain(
                    "Canonical State Evidence",
                );

                expect(
                    viewSource,
                ).toContain(
                    "Open Canonical Evidence",
                );

                expect(
                    viewSource,
                ).toContain(
                    "canonicalStateEvidence.value.sourceRef",
                );

                expect(
                    viewSource,
                ).not.toContain(
                    "href={project.canonicalStateEvidence.value.sourceRef}",
                );

                expect(
                    viewSource,
                ).not.toContain(
                    "Latest Evidence",
                );

                expect(
                    viewSource,
                ).not.toContain(
                    "Latest Report",
                );

                expect(
                    viewSource,
                ).not.toContain(
                    "Latest Execution Evidence",
                );
            },
        );

        it(
            "keeps Execution Evidence a separate unavailable governed source",
            () => {
                expect(
                    viewSource,
                ).toContain(
                    "Execution Evidence",
                );

                expect(
                    viewSource,
                ).toContain(
                    "data.sources.executionEvidence",
                );

                expect(
                    viewSource,
                ).toContain(
                    "No governed execution activity is available in this projection.",
                );
            },
        );

        it(
            "renders Portfolio Status as classification-only NOW NEXT WAITING BLOCKED buckets",
            () => {
                expect(
                    viewSource,
                ).toContain(
                    "Portfolio Status",
                );

                expect(
                    viewSource,
                ).toContain(
                    '["NOW", "NEXT", "WAITING", "BLOCKED"]',
                );

                expect(
                    viewSource,
                ).toContain(
                    "Classification only. Not portfolio priority or execution order.",
                );

                expect(
                    viewSource,
                ).toContain(
                    "data.portfolioStatus.buckets[bucket]",
                );
            },
        );

        it(
            "does not introduce Phase 7 portfolio ordering semantics",
            () => {
                for (
                    const forbidden
                    of [
                        "Portfolio Priority",
                        "What Must Happen First",
                        "What Can Run in Parallel",
                        "Human Decision Required ordering",
                        "Waiting for External Dependency sequencing",
                    ]
                ) {
                    expect(
                        viewSource,
                    ).not.toContain(
                        forbidden,
                    );
                }

                expect(
                    viewSource,
                ).toContain(
                    "ID: {item.id}",
                );
            },
        );

        it(
            "preserves explicit governed disclosure states",
            () => {
                for (
                    const state
                    of [
                        "CURRENT",
                        "STALE",
                        "NOT_PROVEN",
                        "UNBOUND",
                        "UNKNOWN",
                        "NOT_AVAILABLE",
                        "CURRENT_WITHIN_SOURCE",
                    ]
                ) {
                    expect(
                        viewSource,
                    ).toContain(
                        state,
                    );
                }

                expect(
                    viewSource,
                ).toContain(
                    "Source:",
                );

                expect(
                    viewSource,
                ).toContain(
                    "Authority:",
                );
            },
        );
    },
);
