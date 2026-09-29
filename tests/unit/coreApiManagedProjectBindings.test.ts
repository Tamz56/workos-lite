import { describe, expect, it } from "vitest";
import { MANAGED_PROJECT_BINDINGS } from "@/lib/core-api/managedProjectBindings";

const EXPECTED_BOUND = {
    P02: "green-fineness-content",
    P03: "arbor-plant-companion-widget-ycc",
    P04: "workos-lite-arbordesk",
    P05: "astro-real-app",
    P06: "www-greenfineness",
    P08: "green-fineness-nutrient-planner-app-y2z",
    P09: "web-platform-prototype-y68",
    "MUSIC-LAB": "music-lab",
    "PERSONAL-HEALTH": "personal-health-routine-tracker-0m8",
    GFKVS: "gf-knowledge-video-studio",
} as const;

const EXPECTED_UNBOUND = [
    "P01",
    "P07",
    "GF-TOOLS",
    "AVACRM",
    "GF-LEARNING-CONTENT",
] as const;

const FORBIDDEN_OUTSIDE_SLUGS = [
    "ba-project-omni-asm-ys4",
    "slug-test-proj-1784727968956",
    "green-fineness-operations-intelligence-tgd",
    "gf-content-analytics",
    "gf-trial-lab",
    "home-renovation-planner",
    "personal-positioning-income-design",
    "portfolio-command-center",
    "green-fineness-learning-content-sprint-l5e",
] as const;

describe("managed Project binding manifest", () => {
    it("preserves exactly 15 frozen managed Projects", () => {
        expect(MANAGED_PROJECT_BINDINGS).toHaveLength(15);

        const ids = MANAGED_PROJECT_BINDINGS.map(
            (project) => project.managedProjectId,
        );

        expect(new Set(ids).size).toBe(15);
        expect(ids).toEqual([
            "P01",
            "P02",
            "P03",
            "P04",
            "P05",
            "P06",
            "P07",
            "P08",
            "P09",
            "GF-TOOLS",
            "MUSIC-LAB",
            "AVACRM",
            "PERSONAL-HEALTH",
            "GFKVS",
            "GF-LEARNING-CONTENT",
        ]);
    });

    it("contains exactly 10 verified bound slugs and five explicit null bindings", () => {
        const bound = Object.fromEntries(
            MANAGED_PROJECT_BINDINGS
                .filter((project) => project.workosSlug !== null)
                .map((project) => [
                    project.managedProjectId,
                    project.workosSlug,
                ]),
        );

        const unbound = MANAGED_PROJECT_BINDINGS
            .filter((project) => project.workosSlug === null)
            .map((project) => project.managedProjectId)
            .sort();

        expect(bound).toEqual(EXPECTED_BOUND);
        expect(unbound).toEqual([...EXPECTED_UNBOUND].sort());
        expect(Object.keys(bound)).toHaveLength(10);
        expect(unbound).toHaveLength(5);
    });

    it("preserves frozen 10 CURRENT / 4 STALE / 1 NOT_PROVEN currentness", () => {
        const counts = MANAGED_PROJECT_BINDINGS.reduce(
            (acc, project) => {
                acc[project.baselineCurrentness] += 1;
                return acc;
            },
            {
                CURRENT: 0,
                STALE: 0,
                NOT_PROVEN: 0,
            },
        );

        expect(counts).toEqual({
            CURRENT: 10,
            STALE: 4,
            NOT_PROVEN: 1,
        });
    });

    it("contains no outside-set or invented WorkOS slug", () => {
        const boundSlugs = MANAGED_PROJECT_BINDINGS
            .map((project) => project.workosSlug)
            .filter((slug): slug is string => slug !== null);

        expect(new Set(boundSlugs).size).toBe(10);

        for (const forbidden of FORBIDDEN_OUTSIDE_SLUGS) {
            expect(boundSlugs).not.toContain(forbidden);
        }
    });

    it("carries frozen membership and non-null provenance for every entry", () => {
        for (const project of MANAGED_PROJECT_BINDINGS) {
            expect(project.managedMembership).toEqual({
                authority: "MANAGED_PROJECT_REGISTRY",
                status: "FROZEN",
                value: true,
            });

            expect(project.sourceRef.length).toBeGreaterThan(0);

            expect(project.provenance.baselineAuthority).toBe(
                "WORKOS PROJECT DIRECTORY BINDING v0.1",
            );

            expect(project.provenance.sourceRefs).toEqual([
                "MANAGED PROJECT REGISTRY v0.1",
                "PORTFOLIO READ MODEL v0.1",
                "PROJECT DATA RECONCILIATION MATRIX v0.1",
            ]);

            expect(project.provenance.evidenceAsOf.length).toBeGreaterThan(0);

            expect([
                "FROZEN_VERIFIED_BINDING",
                "FROZEN_MISSING_OR_UNBOUND",
            ]).toContain(project.provenance.bindingEvidenceClass);
        }
    });
});
