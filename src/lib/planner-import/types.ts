// ---------------------------------------------------------------------------
// Arbor Operational Schedule Import Types
// ARBOR-PLANNER-IMPORT-001A
// ---------------------------------------------------------------------------

import type { PlannerDayEnergyLevel, PlannerDayStatus, PlannerScheduledBlock } from "@/lib/planner/types";

export type ImportConflictPolicy = "append" | "skip";

export interface ParsedDefinitionOfDone {
    raw_text: string;
    criteria?: string[];
}

export interface ParsedDecisionPoint {
    raw_text: string;
    gate_type?: "readiness_gate" | "decision_point" | "gate_result" | "decision_rule";
    rule?: string;
    result?: string;
}

export interface ParsedRisk {
    raw_text: string;
}

export interface ParsedScheduleTask {
    id?: string;
    raw_text: string;
    title: string;
    order: number;
    is_bullet?: boolean;
    category?: "งานหลัก" | "งานที่ทำได้" | "Recommended System Work" | "general";
    dod?: ParsedDefinitionOfDone[];
    metadata_notes?: string[];
}

export interface ParsedScheduleDay {
    id?: string;
    raw_text: string;
    date_text: string;
    parsed_date: string | null; // YYYY-MM-DD
    date_range?: {
        start_date: string; // YYYY-MM-DD
        end_date: string;   // YYYY-MM-DD
        raw_range_text: string;
    } | null;
    is_date_range: boolean;
    objective?: string | null;
    main_outcome?: string | null;
    daily_capacity_minutes?: number | null;
    energy_level?: PlannerDayEnergyLevel | null;
    planner_status?: PlannerDayStatus | null;
    tasks: ParsedScheduleTask[];
    dods: ParsedDefinitionOfDone[];
    decision_points: ParsedDecisionPoint[];
    do_not_dos: string[];
    risks: ParsedRisk[];
    raw_notes: string[];
    warnings: string[];
}

export interface ParsedSchedule {
    days: ParsedScheduleDay[];
    raw_text: string;
    overall_notes: string[];
    total_days: number;
    total_tasks: number;
    warnings: string[];
    source_text_hash: string;
}

export interface ImportPreviewStats {
    days_count: number;
    project_items_count: number;
    planner_items_count: number;
    unresolved_range_count: number;
    blocking_warning_count: number;
}

export interface ImportPreview {
    schedule: ParsedSchedule;
    project_id: string | null;
    project_slug: string | null;
    unresolved_warnings: string[];
    blocking_warnings: string[];
    stats: ImportPreviewStats;
}

export interface ImportExecutePayload {
    raw_text: string;
    schedule: ParsedSchedule;
    project_id: string;
    conflict_policy: ImportConflictPolicy;
    default_work_mode?: "focus" | "production" | "ai_preparation" | "ai_execution" | "review" | "maintenance";
    default_priority?: "critical" | "high" | "normal" | "low";
    default_planner_status?: "planned" | "ready" | "doing" | "waiting" | "review" | "completed" | "carried_forward" | "blocked";
    default_scheduled_block?: PlannerScheduledBlock;
    daily_capacity_minutes?: number | null;
    confirmed: boolean;
}

export interface ImportExecutionResult {
    success: boolean;
    batch_id: string;
    fingerprint: string;
    project_id: string;
    created_project_items: string[];
    created_planner_days: string[];
    created_planner_items: string[];
    skipped_planner_items: number;
    skipped_days: string[];
    warnings: string[];
    metadata_results: ImportMetadataResult[];
    duplicate?: boolean;
    message?: string;
}

export interface ImportMetadataResult {
    plan_date: string;
    applied_fields: string[];
    preserved_fields: string[];
}

export interface PlannerImportBatchRecord {
    id: string;
    fingerprint: string;
    project_id: string;
    source_text_hash: string;
    conflict_policy: string;
    result_json: string;
    created_at: string;
}
