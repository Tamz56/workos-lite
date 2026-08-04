import { NextResponse } from "next/server";
import { getDb } from "@/db/db";
import { toErrorMessage } from "@/lib/error";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

export async function GET(req: Request) {
    try {
        const db = getDb();
        const url = new URL(req.url);
        const qDate = url.searchParams.get("date");
        const todayStr = qDate && /^\d{4}-\d{2}-\d{2}$/.test(qDate) ? qDate : yyyyMmDdInTZ(new Date());

        // 1. Fetch Candidates for "Continue Last Work"
        const recentDraft = db.prepare(`
            SELECT id, topic_id, topic_title as title, 'draft' as type, updated_at, body
            FROM writing_desk_drafts
            ORDER BY updated_at DESC LIMIT 1
        `).get() as { id: string; topic_id: string | null; title: string; type: string; updated_at: string; body: string } | undefined;

        const recentDoc = db.prepare(`
            SELECT id, workspace, project_id, title, 'doc' as type, updated_at, content_md as body
            FROM docs
            ORDER BY updated_at DESC LIMIT 1
        `).get() as { id: string; workspace: string | null; project_id: string | null; title: string; type: string; updated_at: string; body: string } | undefined;

        const recentTask = db.prepare(`
            SELECT id, workspace, title, 'task' as type, updated_at, notes as body
            FROM tasks
            ORDER BY updated_at DESC LIMIT 1
        `).get() as { id: string; workspace: string; title: string; type: string; updated_at: string; body: string | null } | undefined;

        // Compare timestamps to find the absolute latest edited item
        let continueLastWork: any = null;
        let latestTime = 0;

        const candidates = [
            { item: recentDraft, parsedTime: recentDraft ? Date.parse(recentDraft.updated_at) : 0 },
            { item: recentDoc, parsedTime: recentDoc ? Date.parse(recentDoc.updated_at) : 0 },
            { item: recentTask, parsedTime: recentTask ? Date.parse(recentTask.updated_at) : 0 }
        ];

        for (const candidate of candidates) {
            if (candidate.item && !isNaN(candidate.parsedTime) && candidate.parsedTime > latestTime) {
                latestTime = candidate.parsedTime;
                continueLastWork = {
                    id: candidate.item.id,
                    title: candidate.item.title || "Untitled",
                    type: candidate.item.type,
                    workspace: (candidate.item as any).workspace || (candidate.item as any).topic_id || "personal",
                    updated_at: candidate.item.updated_at,
                    excerpt: candidate.item.body ? candidate.item.body.slice(0, 120) + (candidate.item.body.length > 120 ? "..." : "") : ""
                };
            }
        }

        // 2. Fetch Today Tasks
        const todayTasks = db.prepare(`
            SELECT id, title, workspace, status, priority, scheduled_date, schedule_bucket
            FROM tasks
            WHERE scheduled_date = ?
            ORDER BY status = 'done' ASC, priority DESC, created_at DESC
        `).all(todayStr) as any[];

        // 3. Fetch Recent Documents
        const recentDocuments = db.prepare(`
            SELECT id, title, workspace, project_id, updated_at,
                   (SELECT COUNT(*) FROM attachments a WHERE a.doc_id = docs.id) as attachment_count
            FROM docs
            ORDER BY updated_at DESC LIMIT 5
        `).all() as any[];

        // 4. Fetch Project Shortcuts
        const projects = db.prepare(`
            SELECT id, name, slug, status, created_at
            FROM projects
            ORDER BY updated_at DESC LIMIT 6
        `).all() as any[];

        return NextResponse.json({
            continueLastWork,
            todayTasks,
            recentDocuments,
            projects
        }, {
            headers: {
                "Cache-Control": "no-store, max-age=0"
            }
        });
    } catch (e: unknown) {
        return NextResponse.json({ error: toErrorMessage(e) }, { status: 500 });
    }
}
