// src/lib/smart/learning/types.ts

export type BehaviorEventType = 
    | 'task_completed' 
    | 'task_skipped' 
    | 'task_override' 
    | 'feedback_given' 
    | 'mode_changed'
    | 'intelligence_restored'
    | 'tasks_deleted_batch';

export interface BehaviorEvent {
    type: BehaviorEventType;
    taskId?: string;
    workspaceId: string;
    timestamp: string;
    metadata?: Record<string, any>; // Compact: e.g. { fromMode: 'balanced', toMode: 'focus' }
}

export interface InsightMetrics {
    acceptedCount: number;
    skippedCount: number;
    overrideCount: number;
    totalEvents: number;
    acceptanceRate: number;
}

export interface InsightReport {
    metrics: InsightMetrics;
    styleBadge: {
        label: string; // Thai label
        description: string; // Thai description
        icon: string;
    };
    topAvoidedPackageIds: string[];
    recommendationQuality: 'improving' | 'stable' | 'needs_tuning';
}

export interface LearningNudges {
    continuityBoost?: number; // e.g. +5
    urgencyBoost?: number;    // e.g. +5
    skipPenaltyMultiplier?: number; // e.g. 1.2
    lastRecalculatedAt: string;
}

// RC51 — Insight -> Action Types

export type ActionType = 'switch_mode' | 'toggle_pref' | 'pin_task';

export interface ActionPayload {
    mode?: 'balanced' | 'urgency' | 'focus' | 'momentum';
    preferenceKey?: 'preferOverdue' | 'preferContinuity' | 'reduceResurfacing' | 'conservative';
    taskId?: string;
}

export interface SuggestedAction {
    id: string;
    label: string; // Thai copy e.g. "ลองเปิดโหมด Focus ไหม"
    type: ActionType;
    payload: ActionPayload;
    priority: number; // 1-10
}

export interface MicroInsight {
    message: string; // Thai copy e.g. "กำลังอยู่ในช่วงโฟกัสได้ดี"
    type: 'success' | 'info' | 'nudge';
}
