export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { nanoid } from "nanoid";
import { getDb } from "@/db/db";
import { toErrorMessage } from "@/lib/error";

const Workspace = z.enum(["avacrm", "ops", "content"]);
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

        if (start && isYYYYMMDD(start)) {
            // include start day
            where.push("date(start_time) >= date(@start)");
            bind.start = start;
        }
        if (end && isYYYYMMDD(end)) {
            // include end day
            where.push("date(start_time) <= date(@end)");
            bind.end = end;
        }

        if (workspace && Workspace.safeParse(workspace).success) {
            where.push("workspace = @workspace");
            bind.workspace = workspace;
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
        ORDER BY datetime(start_time) ASC
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
                start_time: e.start_time,
                end_time: e.end_time ?? null,
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
        return NextResponse.json({ error: toErrorMessage(e) }, { status: 500 });
    }
}
