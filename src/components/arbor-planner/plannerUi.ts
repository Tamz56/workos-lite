import type { EnrichedPlannerItem, PlannerScheduledBlock } from "@/lib/planner/types";

export const WORK_BLOCKS: { key: PlannerScheduledBlock; label: string; description: string }[] = [
    { key: "morning_focus", label: "Morning Focus", description: "งานสำคัญที่ต้องใช้สมาธิสูง" },
    { key: "afternoon_production", label: "Afternoon Production", description: "ช่วงผลิตและเดินงานหลัก" },
    { key: "pre_ai_preparation", label: "AI Preparation", description: "เตรียมข้อมูล บริบท และ prompt" },
    { key: "evening_ai", label: "Evening AI", description: "ทำงานร่วมกับ AI และตรวจผลลัพธ์" },
    { key: "flexible", label: "Flexible", description: "งานยืดหยุ่นหรือยังไม่ล็อกช่วงเวลา" },
];

export function getBangkokDate(date = new Date()) {
    const parts = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Bangkok", year: "numeric", month: "2-digit", day: "2-digit",
    }).formatToParts(date);
    const value = (type: Intl.DateTimeFormatPartTypes) => parts.find(part => part.type === type)?.value ?? "";
    return `${value("year")}-${value("month")}-${value("day")}`;
}

export function shiftPlannerDate(value: string, days: number) {
    const [year, month, day] = value.split("-").map(Number);
    const date = new Date(Date.UTC(year, month - 1, day + days));
    return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
}

export function calculateCapacity(items: EnrichedPlannerItem[], capacity: number | null) {
    const planned = items.reduce((total, item) => total + (item.estimated_minutes ?? 0), 0);
    const unestimated = items.filter(item => item.estimated_minutes == null).length;
    const remaining = capacity == null ? null : capacity - planned;
    const ratio = capacity && capacity > 0 ? planned / capacity : 0;
    const state = ratio > 1 ? "over" : ratio >= 0.85 ? "near" : "within";
    return { planned, capacity, remaining, unestimated, state } as const;
}

export function groupPlannerItems(items: EnrichedPlannerItem[]) {
    const grouped: Record<PlannerScheduledBlock, EnrichedPlannerItem[]> = {
        morning_focus: [], afternoon_production: [], pre_ai_preparation: [], evening_ai: [], flexible: [],
    };
    for (const item of items) grouped[item.scheduled_block ?? "flexible"].push(item);
    return grouped;
}

export const DELETE_CONFIRMATION = "นำรายการนี้ออกจากแผนวันนี้ใช่หรือไม่? งานต้นทางจะไม่ถูกลบ";
