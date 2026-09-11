import { describe, expect, it } from "vitest";

import {
    buildControlCenterProjection,
    CONTROL_CENTER_PROJECTION_SCHEMA_VERSION,
} from "@/lib/arbor-desk/controlCenterProjection";

type FakeOptions = {
    planner?: "available" | "missing-day" | "unavailable";
};

function createFakeDb(options: FakeOptions = {}) {
    const planner = options.planner ?? "missing-day";

    const projectRows = [{
        id: "project-1",
        name: "Project One",
        slug: "project-one",
        status: "planned",
        category: "product",
        registry_status: "ACTIVE",
        priority: "high",
        current_goal: "Ship P3",
        progress_stage: "implementation",
        next_action: "Registry next action",
        cadence: "weekly",
        risk_or_blocked_by: "None",
    }];

    const plannerDay = {
        id: "day-1",
        plan_date: "2026-09-11",
        main_outcome: "Implement P3",
        daily_capacity_minutes: 180,
        energy_level: "high",
        status: "active",
    };

    const plannerItems = [{
        id: "planner-1",
        source_type: "project_item",
        source_id: "item-1",
        work_mode: "focus",
        priority: "critical",
        planner_status: "doing",
        is_main_task: 1,
        source_project_id: "project-1",
    }];

    return {
        prepare(sql: string) {
            if (sql.includes("FROM projects")) {
                return {
                    all: () => projectRows,
                    get: () => undefined,
                };
            }

            if (sql.includes("FROM planner_days")) {
                if (planner === "unavailable") {
                    throw new Error("planner unavailable");
                }

                return {
                    get: () => planner === "available" ? plannerDay : undefined,
                    all: () => [],
                };
            }

            if (sql.includes("FROM planner_items")) {
                return {
                    all: () => planner === "available" ? plannerItems : [],
                    get: () => undefined,
                };
            }

            throw new Error(`Unexpected query: ${sql}`);
        },
    } as Parameters<typeof buildControlCenterProjection>[0];
}

describe("Control Center governed portfolio projection", () => {
    it("keeps Registry metadata separate from canonical Project State", () => {
        const result = buildControlCenterProjection(
            createFakeDb(),
            "2026-09-11",
        );

        expect(result.schemaVersion).toBe(
            CONTROL_CENTER_PROJECTION_SCHEMA_VERSION,
        );

        expect(result.projects).toHaveLength(1);

        expect(result.projects[0].identity).toEqual({
            id: "project-1",
            name: "Project One",
            slug: "project-one",
        });

        expect(result.projects[0].registryMetadata).toMatchObject({
            authority: "REGISTRY_METADATA",
            currentness: "CURRENT_WITHIN_SOURCE",
            nextAction: "Registry next action",
        });

        expect(result.projects[0].canonicalProjectState).toEqual({
            value: null,
            authority: "NONE",
            currentness: "NOT_PROVEN",
        });

        expect(result.projects[0].nextAuthoritativeAction).toEqual({
            value: null,
            authority: "NONE",
            currentness: "NOT_PROVEN",
        });
    });

    it("keeps Planner state under PLANNER_STATE without overriding Project authority", () => {
        const result = buildControlCenterProjection(
            createFakeDb({ planner: "available" }),
            "2026-09-11",
        );

        expect(result.plannerState).toMatchObject({
            authority: "PLANNER_STATE",
            availability: "AVAILABLE",
            currentness: "CURRENT_WITHIN_SOURCE",
        });

        expect(result.plannerState.items[0]).toMatchObject({
            id: "planner-1",
            source_project_id: "project-1",
        });

        expect(result.projects[0].canonicalProjectState.value).toBeNull();
        expect(result.projects[0].nextAuthoritativeAction.value).toBeNull();
    });

    it("reports no Planner day without inventing Planner currentness", () => {
        const result = buildControlCenterProjection(
            createFakeDb({ planner: "missing-day" }),
            "2026-09-11",
        );

        expect(result.plannerState).toMatchObject({
            authority: "PLANNER_STATE",
            availability: "NOT_AVAILABLE",
            currentness: "NOT_PROVEN",
            day: null,
            items: [],
        });
    });

    it("degrades Planner read failure to explicit UNKNOWN / NOT_PROVEN", () => {
        const result = buildControlCenterProjection(
            createFakeDb({ planner: "unavailable" }),
            "2026-09-11",
        );

        expect(result.plannerState).toMatchObject({
            authority: "PLANNER_STATE",
            availability: "UNKNOWN",
            currentness: "NOT_PROVEN",
            day: null,
            items: [],
        });

        expect(result.sources.coordination).toMatchObject({
            authority: "COORDINATION",
            availability: "NOT_AVAILABLE",
            currentness: "NOT_PROVEN",
        });

        expect(result.sources.projectMemory).toMatchObject({
            authority: "PROJECT_MEMORY",
            availability: "NOT_AVAILABLE",
            currentness: "NOT_PROVEN",
        });
    });
});
