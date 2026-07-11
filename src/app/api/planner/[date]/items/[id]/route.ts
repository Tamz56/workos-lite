// ---------------------------------------------------------------------------
// Planner Item PATCH / DELETE API
// ARBOR-PLANNER-001B
// ---------------------------------------------------------------------------

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db/db";
import { z } from "zod";
import type { PlannerDay } from "@/lib/planner/types";

export const dynamic = "force-dynamic";

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

function isValidDateString(s: string): boolean {
    if (!DATE_REGEX.test(s)) return false;
    const [y, m, d] = s.split("-").map(Number);
    const date = new Date(y, m - 1, d);
    return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d;
}

// Patch schema: does NOT allow changing source_type or source_id
const PatchPlannerItemSchema = z.object({
    work_mode: z.enum(["focus", "production", "ai_preparation", "ai_execution", "review", "maintenance"]).optional(),
    priority: z.enum(["critical", "high", "normal", "low"]).optional(),
    estimated_minutes: z.number().int().min(0).nullable().optional(),
    energy_level: z.enum(["high", "medium", "low"]).nullable().optional(),
    scheduled_block: z.enum(["morning_focus", "afternoon_production", "pre_ai_preparation", "evening_ai", "flexible"]).nullable().optional(),
    planned_order: z.number().int().min(0).optional(),
    planner_status: z.enum(["planned", "ready", "doing", "waiting", "review", "completed", "carried_forward", "blocked"]).optional(),
    is_main_task: z.union([z.boolean(), z.literal(0), z.literal(1)])
        .transform(v => (v ? 1 : 0))
        .optional(),
}).strict();

// --- Helper: validate date + day + item ---

async function resolveContext(params: Promise<{ date: string; id: string }>) {
    const { date, id } = await params;

    if (!isValidDateString(date)) {
        return { error: NextResponse.json({ error: "Invalid date format. Expected YYYY-MM-DD." }, { status: 400 }) };
    }

    const db = getDb();
    const plannerDay = db.prepare("SELECT * FROM planner_days WHERE plan_date = ?").get(date) as PlannerDay | undefined;
    if (!plannerDay) {
        return { error: NextResponse.json({ error: "Planner day not found." }, { status: 404 }) };
    }

    const item = db.prepare("SELECT * FROM planner_items WHERE id = ?").get(id) as any;
    if (!item) {
        return { error: NextResponse.json({ error: "Planner item not found." }, { status: 404 }) };
    }

    // Validate item belongs to the correct planner day
    if (item.planner_day_id !== plannerDay.id) {
        return { error: NextResponse.json({ error: "Planner item does not belong to this planner day." }, { status: 400 }) };
    }

    return { db, plannerDay, item };
}

// --- PATCH: Update planner item fields ---

export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ date: string; id: string }> }
) {
    try {
        const ctx = await resolveContext(params);
        if ("error" in ctx) return ctx.error;
        const { db, plannerDay, item } = ctx;

        const body = await req.json();
        const parsed = PatchPlannerItemSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json(
                { error: "Validation failed", details: parsed.error.flatten() },
                { status: 400 }
            );
        }

        const data = parsed.data;

        // Enforce one main task per day
        if (data.is_main_task === 1 && item.is_main_task !== 1) {
            const existingMain = db.prepare(
                "SELECT id FROM planner_items WHERE planner_day_id = ? AND is_main_task = 1 AND id != ?"
            ).get(plannerDay.id, item.id);
            if (existingMain) {
                return NextResponse.json(
                    { error: "This planner day already has a main task. Only one main task per day is allowed." },
                    { status: 409 }
                );
            }
        }

        const updates: string[] = [];
        const values: any[] = [];

        if (data.work_mode !== undefined) { updates.push("work_mode = ?"); values.push(data.work_mode); }
        if (data.priority !== undefined) { updates.push("priority = ?"); values.push(data.priority); }
        if (data.estimated_minutes !== undefined) { updates.push("estimated_minutes = ?"); values.push(data.estimated_minutes); }
        if (data.energy_level !== undefined) { updates.push("energy_level = ?"); values.push(data.energy_level); }
        if (data.scheduled_block !== undefined) { updates.push("scheduled_block = ?"); values.push(data.scheduled_block); }
        if (data.planned_order !== undefined) { updates.push("planned_order = ?"); values.push(data.planned_order); }
        if (data.planner_status !== undefined) { updates.push("planner_status = ?"); values.push(data.planner_status); }
        if (data.is_main_task !== undefined) { updates.push("is_main_task = ?"); values.push(data.is_main_task); }

        if (updates.length === 0) {
            return NextResponse.json(item);
        }

        values.push(item.id);
        db.prepare(`UPDATE planner_items SET ${updates.join(", ")} WHERE id = ?`).run(...values);

        const updated = db.prepare("SELECT * FROM planner_items WHERE id = ?").get(item.id);
        return NextResponse.json(updated);
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

// --- DELETE: Remove planner item (does NOT delete source task/project_item) ---

export async function DELETE(
    _req: NextRequest,
    { params }: { params: Promise<{ date: string; id: string }> }
) {
    try {
        const ctx = await resolveContext(params);
        if ("error" in ctx) return ctx.error;
        const { db, item } = ctx;

        db.prepare("DELETE FROM planner_items WHERE id = ?").run(item.id);

        return NextResponse.json({ deleted: true, id: item.id });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
