// src/lib/smart/intelligence/nextTaskEngine.ts
import { Task } from "@/lib/types";

export type RecommendationMode = 'balanced' | 'urgency' | 'focus' | 'momentum';

export interface TuningPreferences {
    preferOverdue: boolean;
    preferContinuity: boolean;
    reduceResurfacing: boolean;
    conservative: boolean;
}

export type FeedbackSignal = 'good' | 'not_now' | 'wrong_context';

import { LearningNudges } from "../learning/types";

export interface IntelligenceContext {
    skips: Record<string, number>;
    viewed: string[];
    lastCompletedTaskId: string | null;
    overrides?: string[]; // RC48: Track manually chosen tasks as overrides
    mode: RecommendationMode; // RC49
    preferences: TuningPreferences; // RC49
    feedback?: Record<string, FeedbackSignal>; // RC49: Feedbacks per task
    learningNudges?: LearningNudges; // RC50: Adaptive patterns
}

export type ConfidenceLevel = 'high' | 'medium' | 'low';

export interface ScoredTask {
    task: Task;
    score: number;
    reasons: string[];
    confidence: ConfidenceLevel;
    explanation: string;
    nudgeReason?: string; // RC51: Transient explanation of behavioral nudge
}

/**
 * RC48: Human-friendly Thai Explanations mapping
 */
function getHumanExplanation(reasons: string[]): string {
    if (reasons.some(r => r.includes("Overdue"))) return "งานที่ค้างนานที่สุด";
    if (reasons.some(r => r.includes("Today"))) return "ต้องทำให้เสร็จวันนี้";
    if (reasons.some(r => r.includes("Urgent"))) return "ความสำคัญเร่งด่วน";
    if (reasons.some(r => r.includes("Momentum"))) return "ทำต่อเนื่องจากงานเดิม";
    if (reasons.some(r => r.includes("High"))) return "งานสำคัญระดับสูง";
    if (reasons.some(r => r.includes("Inbox"))) return "งานใหม่ที่คุณอาจสนใจ";
    return "สอดคล้องกับพฤติกรรม";
}

/**
 * RC47A/RC49 — Weighted Next Task Scoring
 */
export function scoreTask(task: Task, context: IntelligenceContext, allTasks: Task[]): ScoredTask {
    let score = 0;
    const reasons: string[] = [];
    const today = new Date().toISOString().split('T')[0];

    // 1. Urgency
    if (task.scheduled_date) {
        if (task.scheduled_date < today) {
            const diffDays = Math.floor((new Date(today).getTime() - new Date(task.scheduled_date).getTime()) / (1000 * 60 * 60 * 24));
            const overdueBonus = 50 + (diffDays * 2);
            score += overdueBonus;
            reasons.push(`Overdue (+${overdueBonus})`);
        } else if (task.scheduled_date === today) {
            score += 30;
            reasons.push("Today (+30)");
        }
    }

    // 2. Priority
    const p = task.priority ?? 2;
    if (p >= 4) {
        score += 40;
        reasons.push("Priority: Urgent (+40)");
    } else if (p === 3) {
        score += 20;
        reasons.push("Priority: High (+20)");
    }

    // 3. Momentum (Same-package continuity)
    if (context.lastCompletedTaskId) {
        const lastTask = allTasks.find(t => t.id === context.lastCompletedTaskId);
        if (lastTask?.package_id && task.package_id === lastTask.package_id) {
            score += 15;
            reasons.push("Package momentum (+15)");
        }
    }

    // --- RC49: Mode-based adjustments ---
    if (context.mode === 'urgency') {
        if (task.scheduled_date && task.scheduled_date <= today) {
            score += 30;
            reasons.push("Urgency Mode (+30)");
        }
    } else if (context.mode === 'focus') {
        // High weight on continuity
        const lastTask = context.lastCompletedTaskId ? allTasks.find(t => t.id === context.lastCompletedTaskId) : null;
        if (lastTask?.package_id && task.package_id === lastTask.package_id) {
            score += 25;
            reasons.push("Focus Mode (+25)");
        }
    } else if (context.mode === 'momentum') {
        // Boost inbox/planned tasks for momentum
        if (task.status === 'inbox' || task.status === 'planned') {
            score += 15;
            reasons.push("Momentum Mode (+15)");
        }
    }

    // --- RC49: Preferences adjustments ---
    if (context.preferences.preferOverdue && task.scheduled_date && task.scheduled_date < today) {
        score += 10;
        reasons.push("Pref: Overdue (+10)");
    }
    if (context.preferences.preferContinuity) {
        const lastTask = context.lastCompletedTaskId ? allTasks.find(t => t.id === context.lastCompletedTaskId) : null;
        if (lastTask?.package_id && task.package_id === lastTask.package_id) {
            score += 10;
            reasons.push("Pref: Continuity (+10)");
        }
    }

    // Penalties
    // Skips (RC47B)
    const skipCount = context.skips[task.id] || 0;
    if (skipCount > 0) {
        const penaltyMultiplier = context.preferences.reduceResurfacing ? 1.5 : 1.0;
        const penalty = Math.min(skipCount, 3) * 20 * penaltyMultiplier;
        score -= penalty;
        reasons.push(`Skipped ${skipCount}x (-${penalty})`);
    }

    // Feedback Signals (RC49)
    if (context.feedback?.[task.id]) {
        const sig = context.feedback[task.id];
        if (sig === 'good') {
            score += 10;
            reasons.push("Feedback: Good (+10)");
        } else if (sig === 'not_now') {
            score -= 20;
            reasons.push("Feedback: Not Now (-20)");
        } else if (sig === 'wrong_context') {
            score -= 40;
            reasons.push("Feedback: Wrong Context (-40)");
        }
    }

    // Overrides (RC48)
    if (context.overrides?.includes(task.id)) {
        score -= 15;
        reasons.push("Recently overridden (-15)");
    }

    // --- RC50: Learning Nudges ---
    if (context.learningNudges) {
        if (context.learningNudges.continuityBoost) {
            const lastTask = context.lastCompletedTaskId ? allTasks.find(t => t.id === context.lastCompletedTaskId) : null;
            if (lastTask?.package_id && task.package_id === lastTask.package_id) {
                score += context.learningNudges.continuityBoost;
                reasons.push(`Nudge: Pattern continuity (+${context.learningNudges.continuityBoost})`);
            }
        }
        if (context.learningNudges.urgencyBoost) {
            if (task.scheduled_date && task.scheduled_date <= today) {
                score += context.learningNudges.urgencyBoost;
                reasons.push(`Nudge: Pattern urgency (+${context.learningNudges.urgencyBoost})`);
            }
        }
        // Multiply penalties if user is in a skip-heavy pattern
        if (context.learningNudges.skipPenaltyMultiplier && skipCount > 0) {
            const extraPenalty = Math.floor(skipCount * 5 * (context.learningNudges.skipPenaltyMultiplier - 1));
            score -= extraPenalty;
            if (extraPenalty > 0) reasons.push(`Nudge: Skip avoidance (-${extraPenalty})`);
        }
    }

    return { 
        task, 
        score, 
        reasons,
        confidence: 'low',
        explanation: getHumanExplanation(reasons),
        nudgeReason: reasons.find(r => r.includes("Nudge:"))?.split(":")[1]?.trim()
    };
}

/**
 * RC47A/RC49 — High-level Resolver with Stability Check
 */
export function resolveBestNextTask(
    tasks: Task[], 
    currentTaskId: string | null,
    context: IntelligenceContext,
    previousBestId?: string | null // For Conservative stability
): ScoredTask | null {
    const activeTasks = tasks.filter(t => t.status !== 'done' && t.id !== currentTaskId);
    if (activeTasks.length === 0) return null;

    const scoredTasks = activeTasks
        .map(t => scoreTask(t, context, tasks))
        .sort((a, b) => b.score - a.score || (a.task.created_at < b.task.created_at ? -1 : 1));

    if (scoredTasks.length === 0) return null;

    let best = scoredTasks[0];
    const second = scoredTasks[1];

    // --- RC49: Conservative Stability Logic ---
    if (context.preferences.conservative && previousBestId && best.task.id !== previousBestId) {
        const prevBest = scoredTasks.find(s => s.task.id === previousBestId);
        if (prevBest) {
            // Require a significant score gap (threshold) to change recommendation
            const STABILITY_THRESHOLD = 15;
            if (best.score < prevBest.score + STABILITY_THRESHOLD) {
                best = prevBest;
            }
        }
    }

    // RC48: Calculate Confidence Band
    let confidence: ConfidenceLevel = 'low';
    if (best.score > 70) {
        if (!second || (best.score - second.score) > 20) confidence = 'high';
        else confidence = 'medium';
    } else if (best.score > 40 || (second && (best.score - second.score) > 10)) {
        confidence = 'medium';
    }

    best.confidence = confidence;

    return best;
}
