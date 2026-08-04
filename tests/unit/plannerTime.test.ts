import { describe, expect, it } from "vitest";
import { calculateTimeRangeMinutes, formatPlannerItemTime, getTimeRangeError } from "@/lib/planner/time";

describe("Planner item exact time", () => {
    it("calculates 09:00–11:00 as 120 minutes", () => {
        expect(calculateTimeRangeMinutes("09:00", "11:00")).toBe(120);
    });

    it("calculates 13:30–15:00 as 90 minutes", () => {
        expect(calculateTimeRangeMinutes("13:30", "15:00")).toBe(90);
    });

    it("rejects start time without end time", () => {
        expect(getTimeRangeError("09:00", null)).toContain("provided together");
    });

    it("rejects end time without start time", () => {
        expect(getTimeRangeError(null, "11:00")).toContain("provided together");
    });

    it("rejects an end time earlier than start time", () => {
        expect(getTimeRangeError("11:00", "09:00")).toContain("later than start time");
    });

    it("rejects equal start and end times", () => {
        expect(getTimeRangeError("09:00", "09:00")).toContain("later than start time");
    });

    it("keeps manual estimated minutes when exact times are absent", () => {
        expect(getTimeRangeError(null, null)).toBeNull();
        expect(formatPlannerItemTime(null, null, 45)).toBe("45 นาที");
    });

    it("supports PATCH semantics for adding an exact range", () => {
        const patch = { start_time: "09:00", end_time: "11:00", estimated_minutes: 15 };
        expect(getTimeRangeError(patch.start_time, patch.end_time)).toBeNull();
        expect(calculateTimeRangeMinutes(patch.start_time, patch.end_time)).toBe(120);
    });

    it("supports PATCH semantics for clearing both exact times", () => {
        const patch = { start_time: null, end_time: null };
        expect(getTimeRangeError(patch.start_time, patch.end_time)).toBeNull();
    });

    it("formats an exact time range for the Planner card", () => {
        expect(formatPlannerItemTime("09:00", "11:00", 120)).toBe("09:00–11:00 · 120 นาที");
        expect(formatPlannerItemTime(null, null, null)).toBe("ไม่ระบุเวลา");
    });
});
