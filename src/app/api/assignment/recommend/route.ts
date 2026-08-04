import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db/db";
import { recommendAssignments } from "@/lib/assignment/engine";
import type { AIResourceProfile, AssignmentCandidate } from "@/lib/assignment/types";
import type { PlannerDay } from "@/lib/planner/types";

export const dynamic = "force-dynamic";
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function validDate(value: string) {
    if (!DATE_PATTERN.test(value)) return false;
    const [year, month, day] = value.split("-").map(Number);
    const parsed = new Date(year, month - 1, day);
    return parsed.getFullYear() === year && parsed.getMonth() === month - 1 && parsed.getDate() === day;
}

function enrichCandidate(db: ReturnType<typeof getDb>, item: AssignmentCandidate): AssignmentCandidate {
    if (item.source_type === "task") {
        const source = db.prepare("SELECT title, status, workspace FROM tasks WHERE id = ?").get(item.source_id) as { title: string; status: string; workspace: string } | undefined;
        return { ...item, source_title: source?.title ?? null, source_status: source?.status ?? null, source_workspace: source?.workspace ?? null, source_missing: !source };
    }
    const source = db.prepare(`SELECT pi.title, pi.status, pi.project_id, p.name AS project_name FROM project_items pi LEFT JOIN projects p ON p.id = pi.project_id WHERE pi.id = ?`).get(item.source_id) as { title: string; status: string; project_id: string; project_name: string | null } | undefined;
    return { ...item, source_title: source?.title ?? null, source_status: source?.status ?? null, source_project_id: source?.project_id ?? null, source_project_name: source?.project_name ?? null, source_missing: !source };
}

export async function GET(request: NextRequest) {
    try {
        const url = new URL(request.url);
        const date = url.searchParams.get("date") ?? "";
        const availableRaw = url.searchParams.get("available_minutes");
        if (!validDate(date)) return NextResponse.json({ error: "Invalid date format. Expected YYYY-MM-DD." }, { status: 400 });
        if (availableRaw == null || !/^\d+$/.test(availableRaw)) return NextResponse.json({ error: "available_minutes must be a non-negative integer." }, { status: 400 });
        const availableMinutes = Number(availableRaw);
        const db = getDb();
        const day = db.prepare("SELECT * FROM planner_days WHERE plan_date = ?").get(date) as PlannerDay | undefined;
        if (!day) return NextResponse.json({ recommendations: [], top_recommendation: null, message: "ยังไม่มีแผนสำหรับวันที่เลือก" });
        const rows = db.prepare("SELECT * FROM planner_items WHERE planner_day_id = ? ORDER BY planned_order ASC, created_at ASC").all(day.id) as AssignmentCandidate[];
        const candidates = rows.map(row => enrichCandidate(db, { ...row, source_title: null, source_status: null, source_workspace: null, source_project_id: null, source_project_name: null, source_missing: false }));
        const resources = db.prepare("SELECT * FROM ai_resource_profiles ORDER BY provider_key ASC").all() as AIResourceProfile[];
        return NextResponse.json(recommendAssignments({ plan_date: date, day_energy_level: day.energy_level, daily_capacity_minutes: day.daily_capacity_minutes, available_minutes: availableMinutes, candidates, ai_resources: resources }));
    } catch (error) {
        return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to recommend an assignment." }, { status: 500 });
    }
}
