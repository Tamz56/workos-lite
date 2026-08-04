import { describe, expect, it } from "vitest";
import { ASSIGNMENT_EMPTY_STATES, OWNER_LABELS, formatAssignmentFactor, getAIProviderOptions, validateAvailableMinutes } from "@/components/arbor-planner/assignmentUi";

describe("Assignment UI helpers", () => {
    it("formats every owner label", () => { expect(OWNER_LABELS).toEqual({ tam: "Tam", arbor_assistant: "Arbor Assistant", codex: "Codex", manual: "ลงมือทำเอง", defer: "พักไว้ก่อน" }); });
    it("formats recommendation factors with signed scores", () => { expect(formatAssignmentFactor({ key: "priority", label: "ความสำคัญ", score: 15, reason: "Priority high" })).toBe("ความสำคัญ: +15 — Priority high"); });
    it("provides all required empty-state messages", () => { expect(Object.values(ASSIGNMENT_EMPTY_STATES)).toEqual(expect.arrayContaining(["ยังไม่มีแผนสำหรับวันที่เลือก", "เพิ่มงานลงใน Planner ก่อน เพื่อให้ Arbor ช่วยจัดลำดับ", "ระบุเวลาที่เหลือวันนี้ เพื่อให้คำแนะนำเหมาะกับสถานการณ์มากขึ้น", "ยังไม่มีงานที่เหมาะสำหรับแนะนำในขณะนี้"])); });
    it("validates remaining time", () => { expect(validateAvailableMinutes("")).toBe(ASSIGNMENT_EMPTY_STATES.noMinutes); expect(validateAvailableMinutes("-1")).not.toBeNull(); expect(validateAvailableMinutes("90")).toBeNull(); });
    it("formats provider selector options", () => { expect(getAIProviderOptions([{ id: "1", provider_key: "codex", display_name: "Codex", availability: "high", remaining_percent: null, reset_at: null, cost_tier: null, notes: null, created_at: "", updated_at: "" }])).toEqual([{ value: "codex", label: "Codex (high)" }]); });
});
