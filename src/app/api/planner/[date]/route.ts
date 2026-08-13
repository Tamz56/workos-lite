// ---------------------------------------------------------------------------
// Planner Day API — GET / POST / PATCH
// ARBOR-PLANNER-001B
// ---------------------------------------------------------------------------

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db/db";
import { nanoid } from "nanoid";
import { z } from "zod";
import type { PlannerDay, PlannerDayTemplate } from "@/lib/planner/types";
import { humanMutationGuard } from "@/lib/human-auth/mutationGuard";

export const dynamic = "force-dynamic";

// --- Date Validation ---

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

function isValidDateString(s: string): boolean {
    if (!DATE_REGEX.test(s)) return false;
    const [y, m, d] = s.split("-").map(Number);
    const date = new Date(y, m - 1, d);
    return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d;
}

// --- Zod Schemas ---

const CreatePlannerDaySchema = z.object({
    main_outcome: z.string().nullable().optional(),
    daily_capacity_minutes: z.number().int().min(0).nullable().optional(),
    energy_level: z.enum(["low", "medium", "high", "recovery"]).nullable().optional(),
    status: z.enum(["planning", "active", "completed"]).default("planning"),
});

const PatchPlannerDaySchema = z.object({
    main_outcome: z.string().nullable().optional(),
    daily_capacity_minutes: z.number().int().min(0).nullable().optional(),
    energy_level: z.enum(["low", "medium", "high", "recovery"]).nullable().optional(),
    status: z.enum(["planning", "active", "completed"]).optional(),
}).strict();

// --- GET: Read planner day (no side effects) ---

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
        const row = db.prepare("SELECT * FROM planner_days WHERE plan_date = ?").get(date) as PlannerDay | undefined;

        if (row) {
            return NextResponse.json(row);
        }

        // Return empty template — NO database write
        const template: PlannerDayTemplate = {
            plan_date: date,
            main_outcome: null,
            daily_capacity_minutes: null,
            energy_level: null,
            status: "planning",
            _template: true,
        };
        return NextResponse.json(template);
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

// --- POST: Create planner day ---

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ date: string }> }
) {
    const authGuard = humanMutationGuard(req);
    if (authGuard instanceof NextResponse) return authGuard;
    try {
        const { date } = await params;

        if (!isValidDateString(date)) {
            return NextResponse.json(
                { error: "Invalid date format. Expected YYYY-MM-DD." },
                { status: 400 }
            );
        }

        const body = await req.json();
        const parsed = CreatePlannerDaySchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json(
                { error: "Validation failed", details: parsed.error.flatten() },
                { status: 400 }
            );
        }

        const db = getDb();

        // Check for existing day (duplicate prevention)
        const existing = db.prepare("SELECT id FROM planner_days WHERE plan_date = ?").get(date);
        if (existing) {
            return NextResponse.json(
                { error: "Planner day already exists for this date." },
                { status: 409 }
            );
        }

        const id = `PDAY-${nanoid(8).toUpperCase()}`;
        const { main_outcome, daily_capacity_minutes, energy_level, status } = parsed.data;

        db.prepare(`
            INSERT INTO planner_days (id, plan_date, main_outcome, daily_capacity_minutes, energy_level, status, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
        `).run(
            id,
            date,
            main_outcome ?? null,
            daily_capacity_minutes ?? null,
            energy_level ?? null,
            status
        );

        const created = db.prepare("SELECT * FROM planner_days WHERE id = ?").get(id);
        return NextResponse.json(created, { status: 201 });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

// --- PATCH: Update existing planner day ---

export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ date: string }> }
) {
    const authGuard = humanMutationGuard(req);
    if (authGuard instanceof NextResponse) return authGuard;
    try {
        const { date } = await params;

        if (!isValidDateString(date)) {
            return NextResponse.json(
                { error: "Invalid date format. Expected YYYY-MM-DD." },
                { status: 400 }
            );
        }

        const db = getDb();
        const existing = db.prepare("SELECT * FROM planner_days WHERE plan_date = ?").get(date) as PlannerDay | undefined;
        if (!existing) {
            return NextResponse.json(
                { error: "Planner day not found. Create it first with POST." },
                { status: 404 }
            );
        }

        const body = await req.json();
        const parsed = PatchPlannerDaySchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json(
                { error: "Validation failed", details: parsed.error.flatten() },
                { status: 400 }
            );
        }

        const updates: string[] = [];
        const values: any[] = [];
        const data = parsed.data;

        if (data.main_outcome !== undefined) {
            updates.push("main_outcome = ?");
            values.push(data.main_outcome);
        }
        if (data.daily_capacity_minutes !== undefined) {
            updates.push("daily_capacity_minutes = ?");
            values.push(data.daily_capacity_minutes);
        }
        if (data.energy_level !== undefined) {
            updates.push("energy_level = ?");
            values.push(data.energy_level);
        }
        if (data.status !== undefined) {
            updates.push("status = ?");
            values.push(data.status);
        }

        if (updates.length === 0) {
            return NextResponse.json(existing);
        }

        values.push(existing.id);
        db.prepare(`UPDATE planner_days SET ${updates.join(", ")} WHERE id = ?`).run(...values);

        const updated = db.prepare("SELECT * FROM planner_days WHERE id = ?").get(existing.id);
        return NextResponse.json(updated);
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
