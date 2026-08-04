import type { PlannerDayEnergyLevel, PlannerEnergyLevel, PlannerItemStatus, PlannerPriority, PlannerScheduledBlock, PlannerSourceType, PlannerWorkMode } from "@/lib/planner/types";

export const AI_RESOURCE_AVAILABILITIES = ["unavailable", "low", "medium", "high", "unknown"] as const;
export type AIResourceAvailability = (typeof AI_RESOURCE_AVAILABILITIES)[number];
export const AI_RESOURCE_COST_TIERS = ["low", "medium", "high"] as const;
export type AIResourceCostTier = (typeof AI_RESOURCE_COST_TIERS)[number];
export const ASSIGNMENT_OWNERS = ["tam", "arbor_assistant", "codex", "manual", "defer"] as const;
export type AssignmentOwner = (typeof ASSIGNMENT_OWNERS)[number];

export interface AIResourceProfile {
    id: string;
    provider_key: string;
    display_name: string;
    availability: AIResourceAvailability;
    remaining_percent: number | null;
    reset_at: string | null;
    cost_tier: AIResourceCostTier | null;
    notes: string | null;
    created_at: string;
    updated_at: string;
}

export interface AssignmentCandidate {
    id: string;
    source_type: PlannerSourceType;
    source_id: string;
    source_title: string | null;
    source_status: string | null;
    source_workspace: string | null;
    source_project_id: string | null;
    source_project_name: string | null;
    source_missing: boolean;
    work_mode: PlannerWorkMode;
    priority: PlannerPriority;
    estimated_minutes: number | null;
    start_time: string | null;
    end_time: string | null;
    ai_provider_key: string | null;
    energy_level: PlannerEnergyLevel | null;
    scheduled_block: PlannerScheduledBlock | null;
    planned_order: number;
    planner_status: PlannerItemStatus;
}

export interface AssignmentFactor { key: string; label: string; score: number; reason: string; }

export interface AssignmentRecommendation {
    item: AssignmentCandidate;
    total_score: number;
    factors: AssignmentFactor[];
    reasons: string[];
    warnings: string[];
    recommended_owner: AssignmentOwner;
    recommended_block: PlannerScheduledBlock | null;
    estimated_duration: number | null;
    matched_resource: AIResourceProfile | null;
}

export interface AssignmentContext {
    plan_date: string;
    day_energy_level: PlannerDayEnergyLevel | null;
    daily_capacity_minutes: number | null;
    available_minutes: number | null;
    candidates: AssignmentCandidate[];
    ai_resources: AIResourceProfile[];
}

export interface AssignmentResult {
    recommendations: AssignmentRecommendation[];
    top_recommendation: AssignmentRecommendation | null;
    message: string | null;
}
