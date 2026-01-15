export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db/db";
import { nanoid } from "nanoid";
import { z } from "zod";
import { toErrorMessage } from "@/lib/error";

import { WORKSPACES, normalizeWorkspace } from "@/lib/workspaces";

const Workspace = z.enum(WORKSPACES);
const Status = z.enum(["inbox", "planned", "done"]);
const Bucket = z.enum(["none", "morning", "afternoon", "evening"]);

const CreateTaskSchema = z.object({
    title: z.string().min(1),
    workspace: Workspace.default("avacrm"),
    status: Status.default("inbox"),
    scheduled_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    schedule_bucket: Bucket.optional(),
});

function isDateYYYYMMDD(s: string) {
    return /^\d{4}-\d{2}-\d{2}$/.test(s);
}

export async function GET(req: NextRequest) {
    try {
        const url = new URL(req.url);

        const status = url.searchParams.get("status");
        const workspace = url.searchParams.get("workspace");
        const q = (url.searchParams.get("q") ?? "").trim();
        const scheduled_date = url.searchParams.get("scheduled_date");
        const schedule_bucket = url.searchParams.get("schedule_bucket");

        const limitRaw = url.searchParams.get("limit");
        const limit = Math.min(Math.max(parseInt(limitRaw ?? "200", 10) || 200, 1), 500);

        const where: string[] = [];
        const bind: Record<string, unknown> = { limit };

        const statusOk = !!(status && Status.safeParse(status).success);
        const workspaceOk = !!(workspace && Workspace.safeParse(workspace).success);
        const bucketOk = !!(schedule_bucket && Bucket.safeParse(schedule_bucket).success);

        // Filter Logic (overdue / upcoming)
        const filter = url.searchParams.get("filter");
        const cutoff_date = url.searchParams.get("cutoff_date");

        // NEW: inclusive flag (accept "1" or "true")
        const inclusive = ["1", "true"].includes((url.searchParams.get("inclusive") ?? "").toLowerCase());

        // normalize cutoff
        const cutoffOk = !!(cutoff_date && isDateYYYYMMDD(cutoff_date));
        if (cutoffOk) bind.cutoff_date = cutoff_date;

        // default cutoff: local today (YYYY-MM-DD)
        const cutoffExpr = cutoffOk ? "@cutoff_date" : "date('now','localtime')";

        if (filter === "overdue") {
            // strict: only planned tasks
            where.push("status = 'planned'");
            where.push("scheduled_date IS NOT NULL");
            // keep overdue strict to avoid overlapping "today"
            where.push(`scheduled_date < ${cutoffExpr}`);
        } else if (filter === "upcoming") {
            // strict: only planned tasks
            where.push("status = 'planned'");
            where.push("scheduled_date IS NOT NULL");
            // NEW: inclusive affects upcoming only
            const op = inclusive ? ">=" : ">";
            where.push(`scheduled_date ${op} ${cutoffExpr}`);
        }

        const isSpecialFilter = filter === "overdue" || filter === "upcoming";

        if (!isSpecialFilter && statusOk) {
            where.push("status = @status");
            bind.status = status;
        }

        if (workspaceOk) {
            where.push("workspace = @workspace");
            bind.workspace = workspace;
        }

        if (scheduled_date) {
            if (scheduled_date === "null") {
                where.push("scheduled_date IS NULL");
            } else if (isDateYYYYMMDD(scheduled_date)) {
                where.push("scheduled_date = @scheduled_date");
                bind.scheduled_date = scheduled_date;
            }
        }

        if (bucketOk) {
            where.push("schedule_bucket = @schedule_bucket");
            bind.schedule_bucket = schedule_bucket;
        }

        if (q.length > 0) {
            // match title/workspace/id
            where.push("(title LIKE @q OR workspace LIKE @q OR id LIKE @q)");
            bind.q = `%${q}%`;
        }

        const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

        // ordering (make NULL predictable)
        let orderSql = `
          ORDER BY
            datetime(updated_at) DESC,
            datetime(created_at) DESC
        `;

        if (statusOk && status === "done") {
            orderSql = `
              ORDER BY
                (done_at IS NULL) ASC,
                datetime(done_at) DESC,
                datetime(updated_at) DESC
            `;
        } else if (statusOk && status === "planned") {
            orderSql = `
              ORDER BY
                (scheduled_date IS NULL) ASC,
                scheduled_date ASC,
                CASE schedule_bucket
                  WHEN 'morning' THEN 1
                  WHEN 'afternoon' THEN 2
                  WHEN 'evening' THEN 3
                  ELSE 9
                END ASC,
                datetime(updated_at) DESC
            `;
        }

        const rows = getDb()
            .prepare(
                `
        SELECT *
        FROM tasks
        ${whereSql}
        ${orderSql}
        LIMIT @limit
        `
            )
            .all(bind);

        return NextResponse.json(rows);
    } catch (e: unknown) {
        return NextResponse.json(
            { error: toErrorMessage(e) },
            { status: 500 }
        );
    }
}

export async function POST(req: NextRequest) {
    try {
        const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;

        // Normalize workspace using central logic
        if (body && typeof body.workspace === "string") {
            body.workspace = normalizeWorkspace(body.workspace);
        }

        const parsed = CreateTaskSchema.safeParse(body);

        if (!parsed.success) {
            return NextResponse.json({ error: "Invalid payload", details: parsed.error.flatten() }, { status: 400 });
        }

        const t = parsed.data;
        const id = nanoid();
        const now = new Date().toISOString();

        // schedule consistency: if scheduled_date missing -> bucket should be 'none'
        const scheduledDate = t.scheduled_date ?? null;
        const bucket = scheduledDate ? (t.schedule_bucket ?? "none") : "none";

        getDb().prepare(
            `
      INSERT INTO tasks (
        id, title, workspace, status,
        scheduled_date, schedule_bucket,
        created_at, updated_at,
        done_at
      )
      VALUES (
        @id, @title, @workspace, @status,
        @scheduled_date, @schedule_bucket,
        @created_at, @updated_at,
        @done_at
      )
      `
        ).run({
            id,
            title: t.title,
            workspace: t.workspace,
            status: t.status,
            scheduled_date: scheduledDate,
            schedule_bucket: bucket,
            created_at: now,
            updated_at: now,
            done_at: t.status === "done" ? now : null,
        });

        const created = getDb().prepare("SELECT * FROM tasks WHERE id = ?").get(id);
        return NextResponse.json({ task: created }, { status: 201 });
    } catch (e: unknown) {
        return NextResponse.json(
            { error: toErrorMessage(e) },
            { status: 500 }
        );
    }
}
