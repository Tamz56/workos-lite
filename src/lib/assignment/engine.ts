import type { AIResourceAvailability, AIResourceProfile, AssignmentCandidate, AssignmentContext, AssignmentFactor, AssignmentOwner, AssignmentRecommendation, AssignmentResult } from "./types";

const statusScores = { doing: 25, ready: 22, planned: 15, review: 18, waiting: 5, blocked: -40, carried_forward: 18, completed: 0 } as const;
const readinessScores = { doing: 18, ready: 20, planned: 10, review: 16, waiting: 4, blocked: -30, carried_forward: 10, completed: 0 } as const;
const priorityScores = { critical: 20, high: 15, normal: 10, low: 4 } as const;
function factor(key: string, label: string, score: number, reason: string): AssignmentFactor { return { key, label, score, reason }; }
function contextOf(item: AssignmentCandidate) { return item.source_project_id || item.source_workspace || null; }

function matchResource(providerKey: string | null, resources: AIResourceProfile[]) {
    if (!providerKey) return null;
    return resources.find(resource => resource.provider_key === providerKey) ?? null;
}

function isCodexProvider(providerKey: string) {
    return providerKey.toLowerCase().includes("codex");
}

function ownerFor(item: AssignmentCandidate, resource: AIResourceProfile | null, score: number): AssignmentOwner {
    if (item.planner_status === "blocked" || item.planner_status === "waiting" && score < 20) return "defer";
    if (item.work_mode === "ai_execution") {
        if (!resource || ["unavailable", "unknown"].includes(resource.availability)) return "defer";
        return isCodexProvider(resource.provider_key) ? "codex" : "arbor_assistant";
    }
    if (item.work_mode === "focus") return "tam";
    if (item.work_mode === "ai_preparation" || item.work_mode === "review") return "arbor_assistant";
    return "manual";
}

function scoreCandidate(item: AssignmentCandidate, context: AssignmentContext): AssignmentRecommendation {
    const factors: AssignmentFactor[] = [];
    factors.push(factor("status", "สถานะงาน", statusScores[item.planner_status] ?? 0, `สถานะ ${item.planner_status} ให้คะแนนความเร่งด่วน ${statusScores[item.planner_status] ?? 0}`));
    factors.push(factor("priority", "ความสำคัญ", priorityScores[item.priority], `Priority ${item.priority} ให้คะแนน ${priorityScores[item.priority]}`));
    factors.push(factor("readiness", "ความพร้อม", readinessScores[item.planner_status] ?? 0, `ระดับความพร้อมจากสถานะ ${item.planner_status} ให้คะแนน ${readinessScores[item.planner_status] ?? 0}`));

    let timeScore = -5; let timeReason = "ยังไม่ระบุเวลาประมาณการ จึงประเมินความพอดีของเวลาไม่ได้";
    if (item.estimated_minutes != null && context.available_minutes != null) {
        const ratio = context.available_minutes > 0 ? item.estimated_minutes / context.available_minutes : Infinity;
        if (ratio <= 1) { timeScore = 15; timeReason = `ใช้ ${item.estimated_minutes} นาที และพอดีกับเวลาที่เหลือ ${context.available_minutes} นาที`; }
        else if (ratio <= 1.25) { timeScore = 5; timeReason = `เกินเวลาที่เหลือไม่เกิน 25% (${item.estimated_minutes}/${context.available_minutes} นาที)`; }
        else { timeScore = -10; timeReason = `ต้องใช้ ${item.estimated_minutes} นาที ซึ่งเกินเวลาที่เหลือ ${context.available_minutes} นาทีมากกว่า 25%`; }
    } else if (item.estimated_minutes != null) { timeScore = 0; timeReason = "มีเวลาประมาณการ แต่ยังไม่ได้ระบุเวลาที่เหลือวันนี้"; }
    if (item.start_time && item.end_time) timeReason = `มีช่วงเวลาที่กำหนด ${item.start_time}–${item.end_time}; ${timeReason}`;
    factors.push(factor("time_fit", "ความพอดีของเวลา", timeScore, timeReason));

    let energyScore = 0; let energyReason = "งานไม่ได้ระบุระดับพลังงาน";
    if (item.energy_level === "high" && context.day_energy_level === "high") { energyScore = 10; energyReason = "งานพลังงานสูงสอดคล้องกับพลังงานของวันนี้"; }
    else if (item.energy_level === "high" && ["low", "recovery"].includes(context.day_energy_level ?? "")) { energyScore = -8; energyReason = "งานต้องใช้พลังงานสูง แต่วันนี้มีพลังงานต่ำหรืออยู่ในโหมดฟื้นตัว"; }
    else if (item.energy_level === "medium" && ["medium", "high"].includes(context.day_energy_level ?? "")) { energyScore = 8; energyReason = "งานพลังงานปานกลางเหมาะกับพลังงานของวันนี้"; }
    else if (item.energy_level === "low") { energyScore = 6; energyReason = "งานพลังงานต่ำเริ่มทำได้ง่าย"; }
    factors.push(factor("energy_fit", "ความเหมาะสมกับพลังงาน", energyScore, energyReason));

    const usesAIProvider = item.work_mode === "ai_execution" || item.work_mode === "ai_preparation";
    const resource = usesAIProvider ? matchResource(item.ai_provider_key, context.ai_resources) : null;
    const aiScores: Record<AIResourceAvailability, number> = { high: 10, medium: 5, low: -5, unavailable: -25, unknown: -8 };
    const aiScore = item.work_mode === "ai_execution" ? resource ? aiScores[resource.availability] : item.ai_provider_key ? -25 : -8 : 0;
    const aiReason = item.work_mode !== "ai_execution"
        ? item.work_mode === "ai_preparation" && resource ? `เตรียมงานสำหรับ ${resource.display_name}; availability ไม่ลดคะแนนงานเตรียม` : "งานนี้ไม่ต้องใช้ AI execution"
        : resource ? `${resource.display_name} มีสถานะ ${resource.availability}`
        : item.ai_provider_key ? `ไม่พบข้อมูลผู้ให้บริการ ${item.ai_provider_key}` : "ยังไม่ได้ระบุผู้ให้บริการ AI สำหรับงานนี้";
    factors.push(factor("ai_resource_fit", "ความพร้อมของ AI", aiScore, aiReason));

    const currentContext = contextOf(item);
    const doingContexts = context.candidates.filter(candidate => candidate.planner_status === "doing" && candidate.id !== item.id).map(contextOf).filter(Boolean);
    const contextScore = currentContext && doingContexts.includes(currentContext) ? 5 : currentContext && doingContexts.length > 0 ? -10 : 0;
    const contextReason = contextScore === 5 ? "มีงานจากโปรเจกต์หรือ workspace เดียวกันกำลังทำอยู่ ลดการสลับบริบท" : contextScore === -10 ? "มีงานจากบริบทอื่นกำลังทำอยู่ การเริ่มงานนี้เพิ่ม context switching" : "ไม่มี context switching ที่ต้องปรับคะแนน";
    factors.push(factor("context_switch", "การสลับบริบท", contextScore, contextReason));

    const total = factors.reduce((sum, entry) => sum + entry.score, 0);
    const warnings: string[] = [];
    if (item.planner_status === "blocked") warnings.push("งานยังถูกระบุว่า blocked");
    if (item.estimated_minutes != null && context.available_minutes != null && item.estimated_minutes > context.available_minutes) warnings.push("เวลาที่ต้องใช้มากกว่าเวลาที่เหลือวันนี้");
    if (item.work_mode === "ai_execution" && !item.ai_provider_key) warnings.push("ยังไม่ได้ระบุผู้ให้บริการ AI สำหรับงานนี้");
    else if (item.work_mode === "ai_execution" && !resource) warnings.push(`ไม่พบข้อมูลผู้ให้บริการ AI '${item.ai_provider_key}'`);
    else if (item.work_mode === "ai_execution" && resource && ["unavailable", "unknown"].includes(resource.availability)) warnings.push("ทรัพยากร AI ยังไม่พร้อมหรือไม่ทราบสถานะ");
    const plannedMinutes = context.candidates.reduce((sum, candidate) => sum + (candidate.estimated_minutes ?? 0), 0);
    if (context.daily_capacity_minutes != null && plannedMinutes > context.daily_capacity_minutes) warnings.push("เวลารวมในแผนเกิน Daily Capacity ที่กำหนด");
    return { item, total_score: total, factors, reasons: factors.map(entry => entry.reason), warnings, recommended_owner: ownerFor(item, resource, total), recommended_block: item.scheduled_block, estimated_duration: item.estimated_minutes, matched_resource: resource };
}

export function recommendAssignments(context: AssignmentContext): AssignmentResult {
    const recommendations = context.candidates
        .filter(item => item.planner_status !== "completed" && !item.source_missing)
        .map(item => scoreCandidate(item, context))
        .sort((a, b) => b.total_score - a.total_score || a.item.planned_order - b.item.planned_order || a.item.id.localeCompare(b.item.id));
    return { recommendations, top_recommendation: recommendations[0] ?? null, message: recommendations.length ? null : "ยังไม่มีงานที่เหมาะสำหรับแนะนำในขณะนี้" };
}
