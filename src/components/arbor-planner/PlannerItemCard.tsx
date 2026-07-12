"use client";

import type { EnrichedPlannerItem } from "@/lib/planner/types";
import { formatPlannerItemTime } from "@/lib/planner/time";

const labels: Record<string, string> = {
    task: "Task", project_item: "Project Item", focus: "Focus", production: "Production",
    ai_preparation: "AI Prep", ai_execution: "AI Execution", review: "Review", maintenance: "Maintenance",
    critical: "Critical", high: "High", normal: "Normal", low: "Low", planned: "Planned", ready: "Ready",
    doing: "Doing", waiting: "Waiting", completed: "Completed", carried_forward: "Carried Forward", blocked: "Blocked",
};

export function PlannerItemCard({ item, onEdit, onDelete, busy }: {
    item: EnrichedPlannerItem; onEdit: () => void; onDelete: () => void; busy: boolean;
}) {
    const context = item.source_type === "task" ? item.source_workspace : item.source_project_name;
    return (
        <article className="rounded-xl border border-theme-border bg-theme-card-elevated p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                        {item.is_main_task === 1 && <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold text-amber-600">งานหลัก</span>}
                        <span className="text-[10px] font-bold uppercase tracking-wider text-theme-muted">{labels[item.source_type]}</span>
                    </div>
                    <h3 className="mt-1 font-semibold text-theme-primary">{item.source_missing ? "ไม่พบงานต้นทาง" : item.source_title}</h3>
                    <p className="mt-1 text-xs text-theme-muted">{item.source_missing ? `Source ID: ${item.source_id}` : `${context || "ไม่ระบุโปรเจกต์หรือ workspace"} · สถานะต้นทาง: ${item.source_status || "ไม่ระบุ"}`}</p>
                </div>
                <div className="text-right text-sm font-semibold text-theme-primary">{formatPlannerItemTime(item.start_time, item.end_time, item.estimated_minutes)}</div>
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5 text-[11px] text-theme-secondary">
                <span className="rounded-md bg-theme-hover px-2 py-1">{labels[item.work_mode]}</span>
                <span className="rounded-md bg-theme-hover px-2 py-1">Priority: {labels[item.priority]}</span>
                <span className="rounded-md bg-theme-hover px-2 py-1">Energy: {item.energy_level ? labels[item.energy_level] : "ไม่ระบุ"}</span>
                <span className="rounded-md bg-theme-hover px-2 py-1">{labels[item.planner_status] || item.planner_status}</span>
                <span className="rounded-md bg-theme-hover px-2 py-1">Order: {item.planned_order}</span>
            </div>
            <div className="mt-3 flex justify-end gap-2 border-t border-theme-border-subtle pt-3">
                <button disabled={busy} onClick={onEdit} className="rounded-lg border border-theme-border px-3 py-1.5 text-xs font-medium text-theme-secondary hover:bg-theme-hover disabled:opacity-50">แก้ไข</button>
                <button disabled={busy} onClick={onDelete} className="rounded-lg border border-red-500/30 px-3 py-1.5 text-xs font-medium text-red-500 hover:bg-red-500/10 disabled:opacity-50">นำออกจากแผน</button>
            </div>
        </article>
    );
}
