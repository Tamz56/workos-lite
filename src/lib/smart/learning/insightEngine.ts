// src/lib/smart/learning/insightEngine.ts
import { BehaviorEvent, InsightReport, LearningNudges, InsightMetrics } from "./types";

/**
 * RC50: Generates human-readable Thai insights based on behavior logs.
 */
export function generateInsights(events: BehaviorEvent[]): InsightReport {
    const metrics = calculateMetrics(events);
    
    // Style Detection Logic
    let style = {
        label: "เริ่มต้นการเรียนรู้",
        description: "ระบบกำลังรวบรวมข้อมูลเพื่อวิเคราะห์สไตล์การทำงานของคุณ",
        icon: "✨"
    };

    if (events.length >= 10) {
        const completed = events.filter(e => e.type === 'task_completed').length;
        const skipped = events.filter(e => e.type === 'task_skipped' || e.type === 'feedback_given').length;
        
        // Simple heuristic for work style
        const modeChanges = events.filter(e => e.type === 'mode_changed');
        const focusModeCount = modeChanges.filter(e => e.metadata?.toMode === 'focus').length;
        const urgencyModeCount = modeChanges.filter(e => e.metadata?.toMode === 'urgency').length;

        if (urgencyModeCount > focusModeCount && urgencyModeCount > 2) {
            style = {
                label: "Firefighter (นักดับเพลิง)",
                description: "คุณให้ความสำคัญกับงานด่วนและงานที่ค้างนานเพื่อลดความเสี่ยงของโปรเจกต์",
                icon: "🔥"
            };
        } else if (focusModeCount > urgencyModeCount && focusModeCount > 2) {
            style = {
                label: "Deep Diver (นักเจาะลึก)",
                description: "คุณชอบโฟกัสงานในแพ็กเกจเดียวให้เสร็จสิ้นก่อนเริ่มงานใหม่ เพื่อรักษา Flow การทำงาน",
                icon: "🌊"
            };
        } else if (completed > 15 && metrics.acceptanceRate > 0.7) {
            style = {
                label: "Completionist (นักจัดการ)",
                description: "คุณมีระเบียบวินัยสูงและทำตามคำแนะนำของระบบได้อย่างแม่นยำ",
                icon: "✅"
            };
        } else {
            style = {
                label: "Adaptive Worker (ผู้ปรับตัวเก่ง)",
                description: "คุณมีการผสมผสานการทำงานที่หลากหลายตามบริบทในแต่ละวัน",
                icon: "🧩"
            };
        }
    }

    return {
        metrics,
        styleBadge: style,
        topAvoidedPackageIds: [], // Future refinement
        recommendationQuality: metrics.acceptanceRate > 0.6 ? 'improving' : 'needs_tuning'
    };
}

/**
 * RC50: Derives score nudges based on long-term patterns with decay.
 */
export function deriveAdaptiveNudges(events: BehaviorEvent[]): LearningNudges {
    const nudges: LearningNudges = {
        lastRecalculatedAt: new Date().toISOString()
    };

    if (events.length < 5) return nudges;

    // Analyze Recency & Decay (Events older than 7 days contribute 50% less)
    const now = new Date().getTime();
    const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;

    let continuityScore = 0;
    let urgencyScore = 0;

    events.forEach(e => {
        const age = now - new Date(e.timestamp).getTime();
        const decay = age > SEVEN_DAYS ? 0.5 : 1.0;

        if (e.type === 'mode_changed') {
            if (e.metadata?.toMode === 'focus') continuityScore += 2 * decay;
            if (e.metadata?.toMode === 'urgency') urgencyScore += 2 * decay;
        }
        if (e.type === 'task_completed') {
            // If they complete tasks while in Focus mode, reward continuity
            if (e.metadata?.activeMode === 'focus') continuityScore += 1 * decay;
            if (e.metadata?.activeMode === 'urgency') urgencyScore += 1 * decay;
        }
    });

    // Apply Bounded Nudges (Max +/- 10)
    if (continuityScore > 5) nudges.continuityBoost = Math.min(10, Math.floor(continuityScore));
    if (urgencyScore > 5) nudges.urgencyBoost = Math.min(10, Math.floor(urgencyScore));

    return nudges;
}

function calculateMetrics(events: BehaviorEvent[]): InsightMetrics {
    const total = events.length;
    if (total === 0) return { acceptedCount: 0, skippedCount: 0, overrideCount: 0, totalEvents: 0, acceptanceRate: 0 };

    const acceptedCount = events.filter(e => e.type === 'task_completed').length;
    const skippedCount = events.filter(e => e.type === 'task_skipped' || e.type === 'feedback_given').length;
    const overrideCount = events.filter(e => e.type === 'task_override').length;

    return {
        acceptedCount,
        skippedCount,
        overrideCount,
        totalEvents: total,
        acceptanceRate: total > 0 ? (acceptedCount / total) : 0
    };
}
