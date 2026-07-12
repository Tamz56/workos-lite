import { describe, expect, it } from "vitest";
import type { EnrichedPlannerItem } from "@/lib/planner/types";
import {
    DELETE_CONFIRMATION, calculateCapacity, getBangkokDate, groupPlannerItems,
} from "@/components/arbor-planner/plannerUi";

function item(overrides: Partial<EnrichedPlannerItem> = {}): EnrichedPlannerItem {
    return {
        id: "PITM-1", planner_day_id: "PDAY-1", source_type: "task", source_id: "TASK-1",
        work_mode: "focus", priority: "normal", estimated_minutes: 60, energy_level: "high",
        start_time: null, end_time: null,
        scheduled_block: "morning_focus", planned_order: 0, planner_status: "planned", is_main_task: 0,
        created_at: "", updated_at: "", source_title: "ทดสอบงานภาษาไทย", source_status: "planned",
        source_workspace: "content", source_project_id: null, source_project_name: null, source_missing: false,
        ...overrides,
    };
}

describe("Arbor Planner UI helpers", () => {
    it("uses Asia/Bangkok semantics instead of UTC slicing", () => {
        expect(getBangkokDate(new Date("2026-07-12T18:30:00.000Z"))).toBe("2026-07-13");
    });

    it("calculates capacity states and excludes unestimated items", () => {
        const within = calculateCapacity([item(), item({ id: "2", estimated_minutes: null })], 100);
        expect(within).toMatchObject({ planned: 60, remaining: 40, unestimated: 1, state: "within" });
        expect(calculateCapacity([item({ estimated_minutes: 85 })], 100).state).toBe("near");
        expect(calculateCapacity([item({ estimated_minutes: 101 })], 100).state).toBe("over");
    });

    it("groups every item into a visible work block and sends unscheduled items to Flexible", () => {
        const grouped = groupPlannerItems([item(), item({ id: "2", scheduled_block: null })]);
        expect(grouped.morning_focus).toHaveLength(1);
        expect(grouped.flexible).toHaveLength(1);
        expect(Object.keys(grouped)).toHaveLength(5);
    });

    it("makes clear that deletion only removes the planner item", () => {
        expect(DELETE_CONFIRMATION).toContain("งานต้นทางจะไม่ถูกลบ");
    });

    it("represents missing sources without requiring a title", () => {
        const missing = item({ source_title: null, source_missing: true });
        expect(missing.source_missing).toBe(true);
        expect(missing.source_title).toBeNull();
    });
});
