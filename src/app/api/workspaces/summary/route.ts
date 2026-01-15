
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db/db";
import { WORKSPACES_LIST } from "@/lib/workspaces";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
    try {
        const db = getDb();
        const stats = WORKSPACES_LIST.map(ws => {
            const key = ws.id;

            // Total Active
            const total = db.prepare(`SELECT COUNT(*) as c FROM tasks WHERE workspace = ? AND status != 'done'`).get(key) as { c: number };

            // Overdue
            const overdue = db.prepare(`
                SELECT COUNT(*) as c FROM tasks 
                WHERE workspace = ? 
                AND status = 'planned' 
                AND scheduled_date < date('now','localtime')
                AND status != 'done'
            `).get(key) as { c: number };

            // Inbox
            const inbox = db.prepare(`SELECT COUNT(*) as c FROM tasks WHERE workspace = ? AND status = 'inbox'`).get(key) as { c: number };

            // Recent 3
            const recent = db.prepare(`
                SELECT id, title, status, updated_at 
                FROM tasks 
                WHERE workspace = ? 
                AND status != 'done'
                ORDER BY updated_at DESC 
                LIMIT 3
            `).all(key);

            return {
                key,
                label: ws.label,
                total: total.c,
                overdue: overdue.c,
                inbox: inbox.c,
                recent
            };
        });

        return NextResponse.json(stats);
    } catch (e) {
        return NextResponse.json({ error: String(e) }, { status: 500 });
    }
}
