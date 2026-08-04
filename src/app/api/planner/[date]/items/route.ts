// ---------------------------------------------------------------------------
// Planner Items API — GET / POST
// ARBOR-PLANNER-001B
// ---------------------------------------------------------------------------

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db/db";
import { nanoid } from "nanoid";
import { z } from "zod";
import type { PlannerDay, EnrichedPlannerItem } from "@/lib/planner/types";
import { calculateTimeRangeMinutes, getTimeRangeError } from "@/lib/planner/time";
import { aiProviderExists } from "@/lib/planner/provider";

export const dynamic = "force-dynamic";

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

function isValidDateString(s: string): boolean {
    if (!DATE_REGEX.test(s)) return false;
    const [y, m, d] = s.split("-").map(Number);
    const date = new Date(y, m - 1, d);
    return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d;
}

// --- Zod Schema ---

const OptionalTimeField = z.preprocess(value => value === "" ? null : value, z.string().nullable().optional());
const OptionalProviderKey = z.preprocess(value => value === "" ? null : value, z.string().trim().min(1).nullable().optional());

const CreatePlannerItemSchema = z.object({
    source_type: z.enum(["task", "project_item"]),
    source_id: z.string().min(1),
    work_mode: z.enum(["focus", "production", "ai_preparation", "ai_execution", "review", "maintenance"]),
    priority: z.enum(["critical", "high", "normal", "low"]).default("normal"),
    estimated_minutes: z.number().int().min(0).nullable().optional(),
    start_time: OptionalTimeField,
    end_time: OptionalTimeField,
    ai_provider_key: OptionalProviderKey,
    energy_level: z.enum(["high", "medium", "low"]).nullable().optional(),
    scheduled_block: z.enum(["morning_focus", "afternoon_production", "pre_ai_preparation", "evening_ai", "flexible"]).nullable().optional(),
    planned_order: z.number().int().min(0).default(0),
    planner_status: z.enum(["planned", "ready", "doing", "waiting", "review", "completed", "carried_forward", "blocked"]).default("planned"),
    is_main_task: z.union([z.boolean(), z.literal(0), z.literal(1)])
        .transform(v => (v ? 1 : 0))
        .default(0),
}).superRefine((data, ctx) => {
    const error = getTimeRangeError(data.start_time, data.end_time);
    if (error) ctx.addIssue({ code: "custom", message: error, path: ["start_time"] });
});

// --- Source enrichment ---

function enrichItem(db: ReturnType<typeof getDb>, item: any): EnrichedPlannerItem {
    let source_title: string | null = null;
    let source_status: string | null = null;
    let source_workspace: string | null = null;
    let source_project_id: string | null = null;
    let source_project_name: string | null = null;
    let source_missing = false;

    if (item.source_type === "task") {
        const task = db.prepare("SELECT title, status, workspace FROM tasks WHERE id = ?").get(item.source_id) as any;
        if (task) {
            source_title = task.title;
            source_status = task.status;
            source_workspace = task.workspace;
        } else {
            source_missing = true;
        }
    } else if (item.source_type === "project_item") {
        const pi = db.prepare(`
            SELECT pi.title, pi.status, pi.project_id, p.name AS project_name
            FROM project_items pi
            LEFT JOIN projects p ON p.id = pi.project_id
            WHERE pi.id = ?
        `).get(item.source_id) as any;
        if (pi) {
            source_title = pi.title;
            source_status = pi.status;
            source_project_id = pi.project_id;
            source_project_name = pi.project_name;
        } else {
            source_missing = true;
        }
    }

    return {
        ...item,
        source_title,
        source_status,
        source_workspace,
        source_project_id,
        source_project_name,
        source_missing,
    };
}

// --- GET: List planner items for a date (no side effects) ---

export async function GET(
    _req: NextRequest,
    { params }: { params: Promise<{ date: string }> }
) {
    try {
        const { date } = await params;

        if (!isValidDateString(date)) {
            return NextResponse.json(
                { error: "Invalid date format. Expected YYYY-MM-DD." },
                { status: 400 }
            );
        }

        const db = getDb();
        const plannerDay = db.prepare("SELECT id FROM planner_days WHERE plan_date = ?").get(date) as PlannerDay | undefined;

        if (!plannerDay) {
            // No planner day — return empty array, no side effects
            return NextResponse.json({ items: [] });
        }

        const rows = db.prepare(
            "SELECT * FROM planner_items WHERE planner_day_id = ? ORDER BY planned_order ASC, created_at ASC"
        ).all(plannerDay.id);

        const enriched = rows.map(row => enrichItem(db, row));

        return NextResponse.json({ items: enriched });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

// --- POST: Add item to planner day ---

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ date: string }> }
) {
    try {
        const { date } = await params;

        if (!isValidDateString(date)) {
            return NextResponse.json(
                { error: "Invalid date format. Expected YYYY-MM-DD." },
                { status: 400 }
            );
        }

        const db = getDb();
        const plannerDay = db.prepare("SELECT * FROM planner_days WHERE plan_date = ?").get(date) as PlannerDay | undefined;

        if (!plannerDay) {
            return NextResponse.json(
                { error: "Planner day does not exist. Create the planner day first." },
                { status: 404 }
            );
        }

        const body = await req.json();
        const parsed = CreatePlannerItemSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json(
                { error: parsed.error.issues[0]?.message ?? "Validation failed", details: parsed.error.flatten() },
                { status: 400 }
            );
        }

        const data = parsed.data;
        const calculatedMinutes = data.start_time && data.end_time
            ? calculateTimeRangeMinutes(data.start_time, data.end_time)
            : data.estimated_minutes ?? null;

        if (!aiProviderExists(db, data.ai_provider_key)) {
            return NextResponse.json({ error: `AI provider '${data.ai_provider_key}' not found.` }, { status: 400 });
        }

        // Verify source exists
        if (data.source_type === "task") {
            const task = db.prepare("SELECT id FROM tasks WHERE id = ?").get(data.source_id);
            if (!task) {
                return NextResponse.json(
                    { error: `Source task '${data.source_id}' not found.` },
                    { status: 404 }
                );
            }
        } else if (data.source_type === "project_item") {
            const pi = db.prepare("SELECT id FROM project_items WHERE id = ?").get(data.source_id);
            if (!pi) {
                return NextResponse.json(
                    { error: `Source project_item '${data.source_id}' not found.` },
                    { status: 404 }
                );
            }
        }

        // Check duplicate source on same day (also enforced by unique index)
        const existingDup = db.prepare(
            "SELECT id FROM planner_items WHERE planner_day_id = ? AND source_type = ? AND source_id = ?"
        ).get(plannerDay.id, data.source_type, data.source_id);
        if (existingDup) {
            return NextResponse.json(
                { error: "This source is already added to this planner day." },
                { status: 409 }
            );
        }

        // Enforce one main task per day (API-level enforcement)
        // Why not partial unique index: SQLite partial unique indexes with WHERE is_main_task = 1
        // require careful handling around INSERT OR REPLACE patterns and are fragile with the
        // existing migration-via-ensure pattern. API enforcement is safer and more explicit.
        if (data.is_main_task === 1) {
            const existingMain = db.prepare(
                "SELECT id FROM planner_items WHERE planner_day_id = ? AND is_main_task = 1"
            ).get(plannerDay.id);
            if (existingMain) {
                return NextResponse.json(
                    { error: "This planner day already has a main task. Only one main task per day is allowed." },
                    { status: 409 }
                );
            }
        }

        const id = `PITM-${nanoid(8).toUpperCase()}`;

        db.prepare(`
            INSERT INTO planner_items (
                id, planner_day_id, source_type, source_id, work_mode, priority,
                estimated_minutes, start_time, end_time, ai_provider_key, energy_level, scheduled_block, planned_order,
                planner_status, is_main_task, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
        `).run(
            id,
            plannerDay.id,
            data.source_type,
            data.source_id,
            data.work_mode,
            data.priority,
            calculatedMinutes,
            data.start_time ?? null,
            data.end_time ?? null,
            data.ai_provider_key ?? null,
            data.energy_level ?? null,
            data.scheduled_block ?? null,
            data.planned_order,
            data.planner_status,
            data.is_main_task
        );

        const created = db.prepare("SELECT * FROM planner_items WHERE id = ?").get(id);
        const enriched = enrichItem(db, created);

        return NextResponse.json(enriched, { status: 201 });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
