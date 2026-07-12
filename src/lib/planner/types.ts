// ---------------------------------------------------------------------------
// Arbor Daily Planner — Foundation Types
// ARBOR-PLANNER-001B
// ---------------------------------------------------------------------------

// --- Enum-like constants (matching repo pattern from workspaces.ts) ---

export const PLANNER_DAY_STATUSES = ["planning", "active", "completed"] as const;
export type PlannerDayStatus = (typeof PLANNER_DAY_STATUSES)[number];

export const PLANNER_SOURCE_TYPES = ["task", "project_item"] as const;
export type PlannerSourceType = (typeof PLANNER_SOURCE_TYPES)[number];

export const PLANNER_WORK_MODES = [
    "focus",
    "production",
    "ai_preparation",
    "ai_execution",
    "review",
    "maintenance",
] as const;
export type PlannerWorkMode = (typeof PLANNER_WORK_MODES)[number];

export const PLANNER_PRIORITIES = ["critical", "high", "normal", "low"] as const;
export type PlannerPriority = (typeof PLANNER_PRIORITIES)[number];

export const PLANNER_ENERGY_LEVELS = ["high", "medium", "low"] as const;
export type PlannerEnergyLevel = (typeof PLANNER_ENERGY_LEVELS)[number];

// Superset for planner_days: includes 'recovery' which items don't use
export const PLANNER_DAY_ENERGY_LEVELS = ["high", "medium", "low", "recovery"] as const;
export type PlannerDayEnergyLevel = (typeof PLANNER_DAY_ENERGY_LEVELS)[number];

export const PLANNER_SCHEDULED_BLOCKS = [
    "morning_focus",
    "afternoon_production",
    "pre_ai_preparation",
    "evening_ai",
    "flexible",
] as const;
export type PlannerScheduledBlock = (typeof PLANNER_SCHEDULED_BLOCKS)[number];

export const PLANNER_ITEM_STATUSES = [
    "planned",
    "ready",
    "doing",
    "waiting",
    "review",
    "completed",
    "carried_forward",
    "blocked",
] as const;
export type PlannerItemStatus = (typeof PLANNER_ITEM_STATUSES)[number];

// --- Data types ---

export interface PlannerDay {
    id: string;
    plan_date: string;              // YYYY-MM-DD (Asia/Bangkok semantic date)
    main_outcome: string | null;    // Thai text OK
    daily_capacity_minutes: number | null;
    energy_level: PlannerDayEnergyLevel | null;
    status: PlannerDayStatus;
    created_at: string;             // UTC datetime
    updated_at: string;             // UTC datetime
}

export interface PlannerItem {
    id: string;
    planner_day_id: string;
    source_type: PlannerSourceType;
    source_id: string;
    work_mode: PlannerWorkMode;
    priority: PlannerPriority;
    estimated_minutes: number | null;
    start_time: string | null;
    end_time: string | null;
    energy_level: PlannerEnergyLevel | null;
    scheduled_block: PlannerScheduledBlock | null;
    planned_order: number;
    planner_status: PlannerItemStatus;
    is_main_task: number;           // 0 or 1 (SQLite integer boolean)
    created_at: string;             // UTC datetime
    updated_at: string;             // UTC datetime
}

// --- Enriched planner item (returned by GET /api/planner/[date]/items) ---

export interface EnrichedPlannerItem extends PlannerItem {
    source_title: string | null;
    source_status: string | null;
    source_workspace: string | null;    // From tasks
    source_project_id: string | null;   // From project_items
    source_project_name: string | null; // Joined from projects
    source_missing: boolean;
}

// --- Empty template (returned by GET when no record exists) ---

export interface PlannerDayTemplate {
    plan_date: string;
    main_outcome: null;
    daily_capacity_minutes: null;
    energy_level: null;
    status: "planning";
    _template: true;    // Marker to distinguish from persisted record
}
