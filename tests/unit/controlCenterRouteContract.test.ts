import {
    readFileSync,
} from "node:fs";

import path from "node:path";

import {
    describe,
    expect,
    it,
} from "vitest";

const ROUTE_PATH =
    path.resolve(
        process.cwd(),
        "src/app/api/arbor-desk/control-center/route.ts",
    );

const PROJECTION_PATH =
    path.resolve(
        process.cwd(),
        "src/lib/arbor-desk/controlCenterProjection.ts",
    );

const routeSource =
    readFileSync(
        ROUTE_PATH,
        "utf8",
    );

const projectionSource =
    readFileSync(
        PROJECTION_PATH,
        "utf8",
    );

describe(
    "ACC-PPC-v0.3 Control Center route contract",
    () => {
        it(
            "exposes GET only with no mutation handlers",
            () => {
                expect(
                    routeSource,
                ).toContain(
                    "export async function GET",
                );

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
                        routeSource,
                    ).not.toMatch(
                        new RegExp(
                            `export\\s+(?:async\\s+)?function\\s+${method}\\b`,
                        ),
                    );
                }
            },
        );

        it(
            "uses one read-only DB handle for Core Planner and canonical enrichment reads",
            () => {
                expect(
                    routeSource,
                ).toContain(
                    'from "@/db/readOnlyDb"',
                );

                expect(
                    routeSource,
                ).not.toContain(
                    'from "@/db/db"',
                );

                expect(
                    routeSource,
                ).not.toContain(
                    "getDb()",
                );

                expect(
                    routeSource,
                ).toContain(
                    "openReadOnlyWorkosDatabase()",
                );

                expect(
                    projectionSource,
                ).toContain(
                    "readCoreProjectDirectory(db)",
                );

                expect(
                    projectionSource,
                ).toContain(
                    "readPlanner(",
                );

                expect(
                    projectionSource,
                ).toContain(
                    "readCanonicalProjectStateBySlug(",
                );

                expect(
                    projectionSource,
                ).toContain(
                    "isCanonicalEnrichmentEligible(",
                );

                expect(
                    routeSource,
                ).toContain(
                    "db?.close()",
                );
            },
        );

        it(
            "does not select Project-State tables directly from the Control Center projection",
            () => {
                expect(
                    projectionSource,
                ).not.toMatch(
                    /\bFROM\s+project_state_/i,
                );

                expect(
                    projectionSource,
                ).not.toMatch(
                    /\bJOIN\s+project_state_/i,
                );
            },
        );

        it(
            "contains no direct database mutation SQL",
            () => {
                for (
                    const source
                    of [
                        routeSource,
                        projectionSource,
                    ]
                ) {
                    expect(
                        source,
                    ).not.toMatch(
                        /\b(INSERT\s+INTO|UPDATE\s+\w+|DELETE\s+FROM|CREATE\s+TABLE|ALTER\s+TABLE|DROP\s+TABLE)\b/i,
                    );
                }
            },
        );

        it(
            "rejects malformed dates and disables caching",
            () => {
                expect(
                    routeSource,
                ).toContain(
                    "Invalid date format. Expected YYYY-MM-DD.",
                );

                expect(
                    routeSource,
                ).toContain(
                    "status: 400",
                );

                expect(
                    routeSource,
                ).toContain(
                    '"Cache-Control":',
                );

                expect(
                    routeSource,
                ).toContain(
                    '"no-store, max-age=0"',
                );
            },
        );

        it(
            "returns bounded errors and closes the DB in finally",
            () => {
                expect(
                    routeSource,
                ).toContain(
                    '"CONTROL_CENTER_READ_UNAVAILABLE"',
                );

                expect(
                    routeSource,
                ).toContain(
                    "status: 500",
                );

                expect(
                    routeSource,
                ).toContain(
                    "} finally {",
                );

                expect(
                    routeSource,
                ).toContain(
                    "db?.close()",
                );
            },
        );
    },
);
