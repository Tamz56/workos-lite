export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db/db";
import { nanoid } from "nanoid";
import { z } from "zod";
import { toErrorMessage } from "@/lib/error";

import { WORKSPACES, normalizeWorkspace } from "@/lib/workspaces";

const Workspace = z.enum(WORKSPACES);
const Status = z.enum(["inbox", "planned", "in_progress", "done"]);
const Bucket = z.enum(["none", "morning", "afternoon", "evening"]);
const ReviewStatus = z.enum(["draft", "in_review", "approved", "published"]); // RC26

const CreateTaskSchema = z.object({
    title: z.string().min(1),
    workspace: Workspace.default("avacrm"),
    status: Status.default("inbox"),
    list_id: z.string().optional().nullable(),
    scheduled_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
    schedule_bucket: Bucket.optional().nullable(),
    start_time: z.string().optional().nullable(),
    end_time: z.string().optional().nullable(),
    priority: z.number().int().optional().nullable(),
    notes: z.string().optional().nullable(),
    parent_task_id: z.string().optional().nullable(),
    sort_order: z.number().int().optional().nullable(),
    sprint_id: z.string().optional().nullable(),
    review_status: ReviewStatus.default("draft"), // RC26
});

function isDateYYYYMMDD(s: string) {
    return /^\d{4}-\d{2}-\d{2}$/.test(s);
}

export async function GET(req: NextRequest) {
    try {
        const url = new URL(req.url);

        // Multi-value filters
        const statuses = url.searchParams.get("statuses")?.split(",").filter(Boolean) || [];
        const workspaces = url.searchParams.get("workspaces")?.split(",").filter(Boolean) || [];
        const list_ids = url.searchParams.get("list_ids")?.split(",").filter(Boolean) || [];
        const sprint_ids = url.searchParams.get("sprint_ids")?.split(",").filter(Boolean) || [];
        const template_keys = url.searchParams.get("template_keys")?.split(",").filter(Boolean) || [];
        const review_statuses = url.searchParams.get("review_statuses")?.split(",").filter(Boolean) || []; // RC26
        const schedule_state = url.searchParams.get("schedule_state") || "all";

        // Single value legacy support
        const status = url.searchParams.get("status");
        const workspace = url.searchParams.get("workspace");
        const list_id = url.searchParams.get("list_id");
        const sprint_id = url.searchParams.get("sprint_id");

        const q = (url.searchParams.get("q") ?? "").trim();
        const scheduled_date = url.searchParams.get("scheduled_date");
        const schedule_bucket = url.searchParams.get("schedule_bucket");
        const parent_id = url.searchParams.get("parent_id");
        const start = url.searchParams.get("start");
        const end = url.searchParams.get("end");

        const limitRaw = url.searchParams.get("limit");
        const offsetRaw = url.searchParams.get("offset");
        const limit = Math.min(Math.max(parseInt(limitRaw ?? "200", 10) || 200, 1), 500);
        const offset = Math.max(parseInt(offsetRaw ?? "0", 10) || 0, 0);

        const where: string[] = [];
        const bind: Record<string, unknown> = { limit, offset };

        // Helper for IN queries
        const addInClause = (field: string, values: string[], paramPrefix: string) => {
            if (values.length === 0) return;
            const placeholders = values.map((_, i) => `@${paramPrefix}_${i}`);
            where.push(`${field} IN (${placeholders.join(", ")})`);
            values.forEach((v, i) => {
                bind[`${paramPrefix}_${i}`] = v;
            });
        };

        // Filter Logic (overdue / upcoming)
        const filter = url.searchParams.get("filter");
        const cutoff_date = url.searchParams.get("cutoff_date");
        const inclusive = ["1", "true"].includes((url.searchParams.get("inclusive") ?? "").toLowerCase());

        const cutoffOk = !!(cutoff_date && isDateYYYYMMDD(cutoff_date));
        if (cutoffOk) bind.cutoff_date = cutoff_date;

        const cutoffExpr = cutoffOk ? "@cutoff_date" : "date('now','localtime')";

        if (filter === "overdue") {
            where.push("status = 'planned'");
            where.push("scheduled_date IS NOT NULL");
            where.push(`scheduled_date < ${cutoffExpr}`);
        } else if (filter === "upcoming") {
            where.push("status = 'planned'");
            where.push("scheduled_date IS NOT NULL");
            const op = inclusive ? ">=" : ">";
            where.push(`scheduled_date ${op} ${cutoffExpr}`);
        }

        const isSpecialFilter = filter === "overdue" || filter === "upcoming";

        // Multi-status vs Single status
        if (!isSpecialFilter) {
            if (statuses.length > 0) {
                addInClause("status", statuses, "st");
            } else if (status && Status.safeParse(status).success) {
                where.push("status = @status");
                bind.status = status;
            }
        }

        // Multi-workspace vs Single workspace
        if (workspaces.length > 0) {
            addInClause("workspace", workspaces, "ws");
        } else if (workspace && Workspace.safeParse(workspace).success) {
            where.push("workspace = @workspace");
            bind.workspace = workspace;
        }

        // Multi-list vs Single list
        if (list_ids.length > 0) {
            addInClause("list_id", list_ids, "ls");
        } else if (list_id) {
            if (list_id === "unassigned" || list_id === "null") {
                where.push("list_id IS NULL");
            } else {
                where.push("list_id = @list_id");
                bind.list_id = list_id;
            }
        }

        // Multi-sprint vs Single sprint
        if (sprint_ids.length > 0) {
            addInClause("sprint_id", sprint_ids, "sp");
        } else if (sprint_id) {
            if (sprint_id === "backlog" || sprint_id === "null") {
                where.push("sprint_id IS NULL");
            } else {
                where.push("sprint_id = @sprint_id");
                bind.sprint_id = sprint_id;
            }
        }

        // RC26: Review statuses filter
        if (review_statuses && review_statuses.length > 0) {
            addInClause("review_status", review_statuses, "rs");
        }

        if (parent_id !== null) {
            if (parent_id === "unassigned" || parent_id === "null") {
                where.push("parent_task_id IS NULL");
            } else {
                where.push("parent_task_id = @parent_id");
                bind.parent_id = parent_id;
            }
        }

        if (scheduled_date) {
            if (scheduled_date === "null") {
                where.push("scheduled_date IS NULL");
            } else if (isDateYYYYMMDD(scheduled_date)) {
                where.push("scheduled_date = @scheduled_date");
                bind.scheduled_date = scheduled_date;
            }
        }

        if (start && isDateYYYYMMDD(start)) {
            where.push("scheduled_date >= @start");
            bind.start = start;
        }
        if (end && isDateYYYYMMDD(end)) {
            where.push("scheduled_date <= @end");
            bind.end = end;
        }

        if (schedule_bucket && Bucket.safeParse(schedule_bucket).success) {
            where.push("schedule_bucket = @schedule_bucket");
            bind.schedule_bucket = schedule_bucket;
        }

        // RC19: Schedule state filter
        if (schedule_state === "scheduled") {
            where.push("scheduled_date IS NOT NULL");
        } else if (schedule_state === "unscheduled") {
            where.push("scheduled_date IS NULL");
        }

        // RC19: Template keys filter (using notes LIKE since metadata is there)
        if (template_keys.length > 0) {
            const templateClauses = template_keys.map((key, i) => {
                const paramName = `tk_${i}`;
                bind[paramName] = `%template_key: ${key}%`;
                return `notes LIKE @${paramName}`;
            });
            where.push(`(${templateClauses.join(" OR ")})`);
        }

        if (q.length > 0) {
            where.push("(title LIKE @q OR workspace LIKE @q OR id LIKE @q)");
            bind.q = `%${q}%`;
        }

        const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

        // Deterministic Ordering for Pagination
        let orderSql = `
          ORDER BY
            datetime(updated_at) DESC,
            id ASC
        `;

        const hasAnyStatus = statuses.length > 0 || (status && Status.safeParse(status).success);
        const firstStatus = statuses[0] || status;

        if (hasAnyStatus && firstStatus === "done") {
            orderSql = `
              ORDER BY
                (done_at IS NULL) ASC,
                datetime(done_at) DESC,
                datetime(updated_at) DESC,
                id ASC
            `;
        } else if (hasAnyStatus && firstStatus === "planned") {
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
                sort_order ASC,
                datetime(updated_at) DESC,
                id ASC
            `;
        }

        const rows = getDb()
            .prepare(
                `
        SELECT *
        FROM tasks
        ${whereSql}
        ${orderSql}
        LIMIT @limit OFFSET @offset
        `
            )
            .all(bind) as any[];

        // RC19/RC21: Enrich rows with template_key and topic_id from notes
        const enrichedRows = rows.map(row => {
            let templateKey = null;
            let topicId = null;
            if (row.notes) {
                const tMatch = row.notes.match(/template_key:\s*([a-zA-Z0-9_-]+)/);
                if (tMatch) templateKey = tMatch[1];
                
                const idMatch = row.notes.match(/topic_id:\s*([a-zA-Z0-9_-]+)/);
                if (idMatch) topicId = idMatch[1];
            }
            return {
                ...row,
                template_key: templateKey,
                topic_id: topicId
            };
        });

        // RC21: Batch fetch package progress for identified topics
        const uniqueTopicIds = Array.from(new Set(enrichedRows.map(r => r.topic_id).filter(Boolean))) as string[];
        if (uniqueTopicIds.length > 0) {
            const statsMap: Record<string, { total: number, done: number }> = {};
            
            // Loop through unique topics and count tasks for each
            const stmt = getDb().prepare(`
                SELECT COUNT(*) as total, SUM(CASE WHEN status = 'done' THEN 1 ELSE 0 END) as done
                FROM tasks
                WHERE notes LIKE @topic_pattern
            `);

            for (const tid of uniqueTopicIds) {
                const res = stmt.get({ topic_pattern: `%topic_id: ${tid}%` }) as { total: number, done: number };
                if (res) {
                    statsMap[tid] = { total: res.total, done: res.done || 0 };
                }
            }

            enrichedRows.forEach(row => {
                if (row.topic_id && statsMap[row.topic_id]) {
                    row.package_total = statsMap[row.topic_id].total;
                    row.package_done = statsMap[row.topic_id].done;
                }
            });
        }

        return NextResponse.json(enrichedRows);
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

        // Validate List Workspace Boundary
        if (t.list_id) {
            const tgtList = getDb().prepare("SELECT id, workspace FROM lists WHERE id = ?").get(t.list_id) as { id: string, workspace: string } | undefined;
            if (!tgtList) {
                return NextResponse.json({ error: "Provided list_id does not exist." }, { status: 400 });
            }
            if (tgtList.workspace !== t.workspace) {
                return NextResponse.json({ error: "list workspace mismatch" }, { status: 400 });
            }
        }

        // Parent task validation
        if (t.parent_task_id) {
            const parent = getDb().prepare("SELECT id, workspace, list_id FROM tasks WHERE id = ?").get(t.parent_task_id) as { id: string, workspace: string, list_id: string | null } | undefined;
            if (!parent) {
                return NextResponse.json({ error: "Provided parent_task_id does not exist." }, { status: 400 });
            }
            if (parent.workspace !== t.workspace) {
                return NextResponse.json({ error: "parent workspace mismatch" }, { status: 400 });
            }
            if (parent.list_id && t.list_id && parent.list_id !== t.list_id) {
                return NextResponse.json({ error: "parent list_id mismatch" }, { status: 400 });
            }
            // Inherit list_id if not provided
            if (!t.list_id && parent.list_id) {
                t.list_id = parent.list_id;
            }
        }

        // schedule consistency: if scheduled_date missing -> bucket should be 'none'
        const scheduledDate = t.scheduled_date ?? null;
        const bucket = scheduledDate ? (t.schedule_bucket ?? "none") : "none";

        getDb().prepare(
            `
      INSERT INTO tasks (
        id, title, workspace, list_id, status,
        scheduled_date, schedule_bucket,
        start_time, end_time,
        priority, notes,
        parent_task_id, sort_order, sprint_id,
        review_status,
        created_at, updated_at,
        done_at
      )
      VALUES (
        @id, @title, @workspace, @list_id, @status,
        @scheduled_date, @schedule_bucket,
        @start_time, @end_time,
        @priority, @notes,
        @parent_task_id, @sort_order, @sprint_id,
        @review_status,
        @created_at, @updated_at,
        @done_at
      )
      `
        ).run({
            id,
            title: t.title,
            workspace: t.workspace,
            list_id: t.list_id ?? null,
            status: t.status,
            scheduled_date: scheduledDate,
            schedule_bucket: bucket,
            start_time: t.start_time ?? null,
            end_time: t.end_time ?? null,
            priority: t.priority ?? null,
            notes: t.notes ?? null,
            parent_task_id: t.parent_task_id ?? null,
            sort_order: t.sort_order ?? null,
            sprint_id: t.sprint_id ?? null,
            review_status: t.review_status ?? "draft",
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
