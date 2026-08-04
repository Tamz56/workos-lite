import type { AIResourceProfile, AssignmentFactor, AssignmentOwner } from "@/lib/assignment/types";

export const ASSIGNMENT_EMPTY_STATES = {
    noDay: "ยังไม่มีแผนสำหรับวันที่เลือก",
    noItems: "เพิ่มงานลงใน Planner ก่อน เพื่อให้ Arbor ช่วยจัดลำดับ",
    noMinutes: "ระบุเวลาที่เหลือวันนี้ เพื่อให้คำแนะนำเหมาะกับสถานการณ์มากขึ้น",
    noRecommendation: "ยังไม่มีงานที่เหมาะสำหรับแนะนำในขณะนี้",
} as const;

export const OWNER_LABELS: Record<AssignmentOwner, string> = {
    tam: "Tam", arbor_assistant: "Arbor Assistant", codex: "Codex", manual: "ลงมือทำเอง", defer: "พักไว้ก่อน",
};

export function formatAssignmentFactor(entry: AssignmentFactor) {
    return `${entry.label}: ${entry.score >= 0 ? "+" : ""}${entry.score} — ${entry.reason}`;
}

export function validateAvailableMinutes(value: string) {
    if (value.trim() === "") return ASSIGNMENT_EMPTY_STATES.noMinutes;
    if (!/^\d+$/.test(value) || Number(value) < 0) return "เวลาที่เหลือต้องเป็นจำนวนเต็มตั้งแต่ 0 นาทีขึ้นไป";
    return null;
}

export function getAIProviderOptions(profiles: AIResourceProfile[]) {
    return profiles.map(profile => ({ value: profile.provider_key, label: `${profile.display_name} (${profile.availability})` }));
}
