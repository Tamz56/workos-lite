// src/lib/smart/learning/actionEngine.ts
import { 
    InsightReport, 
    SuggestedAction, 
    MicroInsight, 
    ActionPayload, 
    BehaviorEvent 
} from "./types";
import { RecommendationMode, TuningPreferences } from "../intelligence/nextTaskEngine";

const COOLDOWN_KEY = "ws_action_cooldowns";

/**
 * RC51: Suggests 1-2 top actions based on recent patterns and current context.
 */
export function deriveSuggestedActions(
    report: InsightReport, 
    currentMode: RecommendationMode,
    currentPrefs: TuningPreferences,
    recommendedTaskId?: string
): SuggestedAction[] {
    const actions: SuggestedAction[] = [];
    const cooldowns = getCooldowns();

    // 1. Style-based Mode Suggestions
    if (report.styleBadge.label.includes("Deep Diver") && currentMode !== 'focus') {
        actions.push({
            id: 'suggest_focus_mode',
            label: "ลองเปิดโหมด Focus ไหม เพื่อการทำงานที่ต่อเนื่องขึ้น",
            type: 'switch_mode',
            payload: { mode: 'focus' },
            priority: 8
        });
    } else if (report.styleBadge.label.includes("Firefighter") && currentMode !== 'urgency') {
        actions.push({
            id: 'suggest_urgency_mode',
            label: "คุณเน้นงานด่วนเยอะมาก ลองสลับเป็นโหมด Urgency ดูไหม?",
            type: 'switch_mode',
            payload: { mode: 'urgency' },
            priority: 8
        });
    }

    // 2. Metric-based Preference Suggestions
    if (report.metrics.skippedCount > 5 && !currentPrefs.conservative) {
        actions.push({
            id: 'suggest_conservative_pref',
            label: "คำแนะนำเปลี่ยนบ่อยไปไหม? ลองเปิดระบบช่วยประคองงาน (Conservative) ดูครับ",
            type: 'toggle_pref',
            payload: { preferenceKey: 'conservative' },
            priority: 6
        });
    }

    // 3. Task Specific Suggestions
    if (recommendedTaskId && report.metrics.acceptanceRate < 0.5) {
        actions.push({
            id: `suggest_pin_${recommendedTaskId}`,
            label: "งานนี้สำคัญมาก ปักหมุดไว้ไม่ให้พลาดดีไหมครับ?",
            type: 'pin_task',
            payload: { taskId: recommendedTaskId },
            priority: 5
        });
    }

    // Filter by Cooldown & current state (Deduplication / Priority Ordering)
    return actions
        .filter(a => !cooldowns.includes(a.id))
        .sort((a, b) => b.priority - a.priority)
        .slice(0, 2);
}

/**
 * RC51: Generates a single, stable micro-insight for the header.
 */
export function deriveMicroInsights(events: BehaviorEvent[]): MicroInsight | null {
    if (events.length < 5) return null;

    const last5 = events.slice(-5);
    const completedCount = last5.filter(e => e.type === 'task_completed').length;
    const skipCount = last5.filter(e => e.type === 'task_skipped').length;

    if (completedCount >= 3) {
        return { message: "คุณกำลังโปรดักทีฟสุดๆ! สู่ๆ นะครับ ✨", type: 'success' };
    }
    if (skipCount >= 2) {
        return { message: "งานอาจจะยังไม่โดนใจ? ลองเปลี่ยนโหมดดูได้นะ 🧭", type: 'nudge' };
    }

    return { message: "โฟกัสงานนี้ให้จบ! เราช่วยเชียร์อยู่ 🚀", type: 'info' };
}

// Cooldown Management
export function recordActionDismissal(actionId: string) {
    if (typeof window === 'undefined') return;
    const cooldowns = getCooldowns();
    if (!cooldowns.includes(actionId)) {
        cooldowns.push(actionId);
        sessionStorage.setItem(COOLDOWN_KEY, JSON.stringify(cooldowns));
    }
}

function getCooldowns(): string[] {
    if (typeof window === 'undefined') return [];
    const raw = sessionStorage.getItem(COOLDOWN_KEY);
    try {
        return raw ? JSON.parse(raw) : [];
    } catch {
        return [];
    }
}
