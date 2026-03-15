import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db/db";
import { toErrorMessage } from "@/lib/error";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
    try {
        const db = getDb();
        const today = new Date().toISOString().split('T')[0];
        const last7Days = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

        // 1. KPIs (Task-based)
        const kpis = db.prepare(`
            SELECT 
                COUNT(CASE WHEN status != 'done' AND scheduled_date < ? THEN 1 END) as overdue,
                COUNT(CASE WHEN status != 'done' AND scheduled_date = ? THEN 1 END) as today,
                COUNT(CASE WHEN status = 'inbox' THEN 1 END) as inbox,
                COUNT(CASE WHEN status = 'done' AND date(done_at) = ? THEN 1 END) as doneToday
            FROM tasks
        `).get(today, today, today) as { overdue: number; today: number; inbox: number; doneToday: number };

        // 2. Project Health
        // Ordering: overdueCount DESC, then openTasks DESC, then name ASC.
        const projects = db.prepare(`
            SELECT 
                p.id, p.name, p.slug,
                COUNT(CASE WHEN pi.status != 'done' THEN 1 END) as openTasks,
                COUNT(CASE WHEN pi.status != 'done' AND pi.end_date < ? THEN 1 END) as overdueCount,
                (SELECT COUNT(*) FROM docs d WHERE d.project_id = p.id) as noteCount
            FROM projects p
            LEFT JOIN project_items pi ON p.id = pi.project_id
            WHERE p.status != 'done'
            GROUP BY p.id
            ORDER BY overdueCount DESC, openTasks DESC, p.name ASC
        `).all(today) as any[];

        // 3. Knowledge Activity (Doc-based)
        const knowledge = db.prepare(`
            SELECT 
                d.id, d.title, d.updated_at,
                (SELECT COUNT(*) FROM attachments a WHERE a.doc_id = d.id) as attachmentCount
            FROM docs d
            ORDER BY d.updated_at DESC
            LIMIT 5
        `).all() as any[];

        const knowledgeFormatted = knowledge.map(k => ({
            id: k.id,
            title: k.title,
            updated_at: k.updated_at,
            hasAttachments: k.attachmentCount > 0
        }));

        // 4. Focus Signals
        // oldestInboxItemYmd
        const oldestInbox = db.prepare(`
            SELECT MIN(created_at) as oldest FROM tasks WHERE status = 'inbox'
        `).get() as { oldest: string | null };

        // mostActiveWorkspace: highest count of updated_at in last 7 days
        const mostActive = db.prepare(`
            SELECT workspace, COUNT(*) as activityCount
            FROM (
                SELECT workspace, updated_at FROM tasks WHERE updated_at > ?
                UNION ALL
                SELECT workspace, updated_at FROM docs WHERE updated_at > ?
            )
            GROUP BY workspace
            ORDER BY activityCount DESC
            LIMIT 1
        `).get(last7Days, last7Days) as { workspace: string; activityCount: number } | undefined;

        return NextResponse.json({
            kpis: kpis || { overdue: 0, today: 0, inbox: 0, doneToday: 0 },
            projects: projects || [],
            knowledge: knowledgeFormatted || [],
            focus: {
                oldestInboxItemYmd: oldestInbox?.oldest ? oldestInbox.oldest.split('T')[0] : null,
                mostActiveWorkspace: mostActive?.workspace || null
            }
        });
    } catch (e: unknown) {
        return NextResponse.json({ error: toErrorMessage(e) }, { status: 500 });
    }
}
