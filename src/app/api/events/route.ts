export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { nanoid } from "nanoid";
import { getDb } from "@/db/db";
import { toErrorMessage } from "@/lib/error";

import { WORKSPACES } from "@/lib/workspaces";

const Workspace = z.enum(WORKSPACES);
const Kind = z.enum(["appointment", "meeting", "reminder"]);

const CreateEventSchema = z.object({
    title: z.string().min(1),
    start_time: z.string().min(1), // ISO preferred
    end_time: z.string().optional().nullable(),
    all_day: z.boolean().optional().default(false),
    kind: Kind.optional().default("appointment"),
    workspace: Workspace.optional(),
    description: z.string().optional().nullable(),
});

function isYYYYMMDD(s: string) {
    return /^\d{4}-\d{2}-\d{2}$/.test(s);
}

// Normalize datetime input -> strict UTC ISO (throws Error on invalid)
export function normalizeToUtcIso(input: string) {
    const s = (input ?? "").trim();
    if (!s) throw new Error("Invalid datetime: <empty>");

    const d = new Date(s);
    if (Number.isNaN(d.getTime())) {
        throw new Error(`Invalid datetime: ${s}`);
    }
    return d.toISOString();
}


function localDateToUtcIsoStart(ymd: string) {
    // ymd: YYYY-MM-DD interpreted as LOCAL midnight
    const [y, m, d] = ymd.split("-").map(Number);
    const dtLocal = new Date(y, m - 1, d, 0, 0, 0, 0); // local midnight
    return dtLocal.toISOString(); // UTC ISO with Z
}

export async function GET(req: NextRequest) {
    try {
        const url = new URL(req.url);

        const start = url.searchParams.get("start");
        const end = url.searchParams.get("end");
        const q = (url.searchParams.get("q") ?? "").trim();
        const workspace = url.searchParams.get("workspace");
        const limitRaw = url.searchParams.get("limit");
        const limit = Math.min(Math.max(parseInt(limitRaw ?? "200", 10) || 200, 1), 500);

        const where: string[] = [];
        const bind: Record<string, unknown> = { limit };

        let startBound: string | null = null;
        let endBound: string | null = null;

        if (start && isYYYYMMDD(start)) {
            startBound = localDateToUtcIsoStart(start);
        }
        if (end && isYYYYMMDD(end)) {
            const [y, m, d] = end.split("-").map(Number);
            const dtLocalNext = new Date(y, m - 1, d + 1, 0, 0, 0, 0); // next day local midnight
            endBound = dtLocalNext.toISOString();
        }

        if (workspace && Workspace.safeParse(workspace).success) {
            where.push("workspace = @workspace");
            bind.workspace = workspace;
        }

        if (startBound) {
            where.push("start_time >= @startBound");
            bind.startBound = startBound;
        }
        if (endBound) {
            where.push("start_time < @endBound");
            bind.endBound = endBound;
        }

        if (q.length > 0) {
            where.push("(title LIKE @q OR description LIKE @q OR id LIKE @q)");
            bind.q = `%${q}%`;
        }

        const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

        const rows = getDb()
            .prepare(
                `
        SELECT *
        FROM events
        ${whereSql}
        ORDER BY start_time ASC
        LIMIT @limit
        `
            )
            .all(bind);

        return NextResponse.json({ events: rows }); // Wrap in { events: ... } to match client expectation
    } catch (e: unknown) {
        return NextResponse.json({ error: toErrorMessage(e) }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;

        // normalize workspace lowercase
        if (typeof body.workspace === "string") body.workspace = body.workspace.toLowerCase();

        const parsed = CreateEventSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json(
                { error: "Invalid payload", details: parsed.error.flatten() },
                { status: 400 }
            );
        }

        const e = parsed.data;

        // Normalize time to UTC (Strict Re-serialization)
        // Ensures mix of "2026-01-15T10:00:00" and "2026-01-15T10:00:00.000Z" became same format
        const startIso = normalizeToUtcIso(e.start_time);

        // Handle empty strings/whitespace as null
        const rawEnd = typeof e.end_time === "string" && e.end_time.trim() === "" ? null : e.end_time;

        // Option 1: Strictly enforce end_time=null if all_day=true
        const endIso = e.all_day ? null : (rawEnd ? normalizeToUtcIso(rawEnd) : null);

        // Option 2: Strictly enforce end_time > start_time if not all_day
        if (!e.all_day && endIso && endIso <= startIso) {
            return NextResponse.json(
                { error: "Invalid payload", details: { end_time: ["end_time must be after start_time"] } },
                { status: 400 }
            );
        }

        const id = nanoid();
        const now = new Date().toISOString();

        getDb()
            .prepare(
                `
        INSERT INTO events (
          id, title, start_time, end_time, all_day, kind, workspace, description,
          created_at, updated_at
        ) VALUES (
          @id, @title, @start_time, @end_time, @all_day, @kind, @workspace, @description,
          @created_at, @updated_at
        )
        `
            )
            .run({
                id,
                title: e.title,
                start_time: startIso,
                end_time: endIso,
                all_day: e.all_day ? 1 : 0,
                kind: e.kind,
                workspace: e.workspace ?? null,
                description: e.description ?? null,
                created_at: now,
                updated_at: now,
            });

        const created = getDb().prepare("SELECT * FROM events WHERE id = ?").get(id);
        return NextResponse.json({ event: created }, { status: 201 });
    } catch (e: unknown) {
        const msg = toErrorMessage(e);
        if (msg.startsWith("Invalid datetime:")) {
            return NextResponse.json({ error: msg }, { status: 400 });
        }
        return NextResponse.json({ error: msg }, { status: 500 });
    }
}
