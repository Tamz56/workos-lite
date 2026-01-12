// src/app/api/dashboard/route.ts
import { NextResponse } from "next/server";
import { db } from "@/db/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Bucket = "morning" | "afternoon" | "evening" | "none";

type DashboardDTO = {
    today: {
        date: string;
        total: number;
        by_bucket: Record<Bucket, number>;
        unbucketed: number;
    };
    inbox: { total: number; by_workspace: Record<string, number> };
    done_today: { total: number };
    hygiene: { unscheduled: number };
    workspaces: Array<{
        workspace: string;
        inbox: number;
        today: number;
        done_today: number;
    }>;
    recent: Array<{
        id: string;
        title: string;
        workspace: string;
        status: string;
        updated_at: string;
    }>;
    unscheduled_tasks: Array<{
        id: string;
        title: string;
        workspace: string;
        status: string;
        updated_at: string;
    }>;
    unbucketed_today_tasks: Array<{
        id: string;
        title: string;
        workspace: string;
        status: string;
        updated_at: string;
    }>;
};

function yyyyMmDdInTZ(date: Date, timeZone = "Asia/Bangkok") {
    const parts = new Intl.DateTimeFormat("en-CA", {
        timeZone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).formatToParts(date);

    const y = parts.find((p) => p.type === "year")?.value ?? "1970";
    const m = parts.find((p) => p.type === "month")?.value ?? "01";
    const d = parts.find((p) => p.type === "day")?.value ?? "01";
    return `${y}-${m}-${d}`;
}

function emptyBuckets(): Record<Bucket, number> {
    return { morning: 0, afternoon: 0, evening: 0, none: 0 };
}

// NOTE: assumptions (แก้ได้ 2-3 บรรทัดถ้าไม่ตรง)
// - table: tasks
// - columns: id, title, workspace, status, scheduled_date, schedule_bucket, done_at, updated_at
export async function GET(req: Request) {
    const url = new URL(req.url);
    const qDate = url.searchParams.get("date");
    const date = qDate && /^\d{4}-\d{2}-\d{2}$/.test(qDate) ? qDate : yyyyMmDdInTZ(new Date());

    // Today total (planned today, excluding done)
    const todayTotalRow = db
        .prepare(
            `
      SELECT COUNT(*) as c
      FROM tasks
      WHERE scheduled_date = ?
        AND status = 'planned'
    `
        )
        .get(date) as { c: number } | undefined;

    // Today by bucket
    const todayByBucketRows = db
        .prepare(
            `
      SELECT COALESCE(schedule_bucket, 'none') AS bucket,
             COUNT(*) AS c
      FROM tasks
      WHERE scheduled_date = ?
        AND status = 'planned'
      GROUP BY COALESCE(schedule_bucket, 'none')
    `
        )
        .all(date) as Array<{ bucket: string; c: number }>;

    const by_bucket = emptyBuckets();
    for (const r of todayByBucketRows) {
        const b = (r.bucket as Bucket) in by_bucket ? (r.bucket as Bucket) : "none";
        by_bucket[b] += Number(r.c || 0);
    }

    // Unbucketed today = scheduled today but bucket null/none/empty
    const unbucketedRow = db
        .prepare(
            `
      SELECT COUNT(*) as c
      FROM tasks
      WHERE scheduled_date = ?
        AND status = 'planned'
        AND (schedule_bucket IS NULL OR schedule_bucket = 'none')
    `
        )
        .get(date) as { c: number } | undefined;

    // Inbox backlog total
    const inboxTotalRow = db
        .prepare(
            `
      SELECT COUNT(*) as c
      FROM tasks
      WHERE status = 'inbox'
    `
        )
        .get() as { c: number } | undefined;

    // Inbox by workspace
    const inboxByWorkspaceRows = db
        .prepare(
            `
      SELECT COALESCE(NULLIF(workspace, ''), 'unknown') AS workspace,
             COUNT(*) AS c
      FROM tasks
      WHERE status = 'inbox'
      GROUP BY COALESCE(NULLIF(workspace, ''), 'unknown')
      ORDER BY c DESC
    `
        )
        .all() as Array<{ workspace: string; c: number }>;

    const inboxByWorkspace: Record<string, number> = {};
    for (const r of inboxByWorkspaceRows) inboxByWorkspace[r.workspace] = Number(r.c || 0);

    // Done today
    // If done_at is ISO datetime text -> date(done_at) works for 'YYYY-MM-DD...' in SQLite.
    const doneTodayRow = db
        .prepare(
            `
      SELECT COUNT(*) as c
      FROM tasks
      WHERE status = 'done'
        AND date(done_at) = ?
    `
        )
        .get(date) as { c: number } | undefined;

    // Hygiene: unscheduled (scheduled_date is null, not done)
    const unscheduledRow = db
        .prepare(
            `
      SELECT COUNT(*) as c
      FROM tasks
      WHERE scheduled_date IS NULL
        AND status != 'done'
    `
        )
        .get() as { c: number } | undefined;

    // Workspaces breakdown (inbox / today / done_today)
    const workspaceRows = db
        .prepare(
            `
      WITH ws(workspace) AS (
        VALUES ('avacrm'), ('ops'), ('content')
      ),
      agg AS (
        SELECT
          workspace,
          SUM(CASE WHEN status = 'inbox' THEN 1 ELSE 0 END) AS inbox,
          SUM(CASE WHEN scheduled_date = ? AND status = 'planned' THEN 1 ELSE 0 END) AS today,
          SUM(CASE WHEN status = 'done' AND date(done_at) = ? THEN 1 ELSE 0 END) AS done_today
        FROM tasks
        GROUP BY workspace
      )
      SELECT
        ws.workspace AS workspace,
        COALESCE(agg.inbox, 0) AS inbox,
        COALESCE(agg.today, 0) AS today,
        COALESCE(agg.done_today, 0) AS done_today
      FROM ws
      LEFT JOIN agg ON agg.workspace = ws.workspace
      ORDER BY today DESC, inbox DESC;
    `
        )
        .all(date, date) as Array<{ workspace: string; inbox: number; today: number; done_today: number }>;

    // Recent activity
    const recentRows = db
        .prepare(
            `
      SELECT id, title,
             COALESCE(NULLIF(workspace, ''), 'unknown') AS workspace,
             status,
             updated_at
      FROM tasks
      ORDER BY datetime(updated_at) DESC
      LIMIT 10
    `
        )
        .all() as Array<{ id: string; title: string; workspace: string; status: string; updated_at: string }>;

    // unscheduled top 5
    const unscheduledTasks = db
        .prepare(
            `
      SELECT id, title,
             COALESCE(NULLIF(workspace, ''), 'unknown') AS workspace,
             status,
             updated_at
      FROM tasks
      WHERE scheduled_date IS NULL AND status != 'done'
      ORDER BY datetime(updated_at) DESC
      LIMIT 5
    `
        )
        .all() as Array<{ id: string; title: string; workspace: string; status: string; updated_at: string }>;

    // unbucketed today top 5
    const unbucketedTodayTasks = db
        .prepare(
            `
      SELECT id, title,
             COALESCE(NULLIF(workspace, ''), 'unknown') AS workspace,
             status,
             updated_at
      FROM tasks
      WHERE scheduled_date = ?
        AND status = 'planned'
        AND (schedule_bucket IS NULL OR schedule_bucket = 'none')
      ORDER BY datetime(updated_at) DESC
      LIMIT 5
    `
        )
        .all(date) as Array<{ id: string; title: string; workspace: string; status: string; updated_at: string }>;

    const dto: DashboardDTO = {
        today: {
            date,
            total: Number(todayTotalRow?.c || 0),
            by_bucket,
            unbucketed: Number(unbucketedRow?.c || 0),
        },
        inbox: {
            total: Number(inboxTotalRow?.c || 0),
            by_workspace: inboxByWorkspace,
        },
        done_today: { total: Number(doneTodayRow?.c || 0) },
        hygiene: { unscheduled: Number(unscheduledRow?.c || 0) },
        workspaces: workspaceRows.map((r) => ({
            workspace: r.workspace,
            inbox: Number(r.inbox || 0),
            today: Number(r.today || 0),
            done_today: Number(r.done_today || 0),
        })),
        recent: recentRows.map((r) => ({
            id: r.id,
            title: r.title,
            workspace: r.workspace,
            status: r.status,
            updated_at: r.updated_at,
        })),
        unscheduled_tasks: unscheduledTasks.map((r) => ({
            id: r.id,
            title: r.title,
            workspace: r.workspace,
            status: r.status,
            updated_at: r.updated_at,
        })),
        unbucketed_today_tasks: unbucketedTodayTasks.map((r) => ({
            id: r.id,
            title: r.title,
            workspace: r.workspace,
            status: r.status,
            updated_at: r.updated_at,
        })),
    };

    return NextResponse.json(dto, {
        headers: {
            "Cache-Control": "no-store, max-age=0",
        },
    });
}
