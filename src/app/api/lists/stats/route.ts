import { NextResponse } from "next/server";
import { getDb } from "@/db/db";

// GET /api/lists/stats?workspace=...
export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const workspace = searchParams.get("workspace");

    if (!workspace) {
        return NextResponse.json({ error: "workspace required" }, { status: 400 });
    }

    try {
        const db = getDb();

        // Ensure both lists and task counts are queried securely referencing the workspace
        // This query counts tasks grouped by their list_id, separated by status.
        const stmt = db.prepare(`
            SELECT 
                l.id AS list_id,
                COUNT(t.id) AS total,
                SUM(CASE WHEN t.status = 'inbox' THEN 1 ELSE 0 END) AS inbox,
                SUM(CASE WHEN t.status = 'planned' THEN 1 ELSE 0 END) AS planned,
                SUM(CASE WHEN t.status = 'done' THEN 1 ELSE 0 END) AS done
            FROM lists l
            LEFT JOIN tasks t ON l.id = t.list_id AND t.workspace = l.workspace AND t.parent_task_id IS NULL
            WHERE l.workspace = ?
            GROUP BY l.id
        `);

        const stats = stmt.all(workspace);

        return NextResponse.json(stats);
    } catch (e: any) {
        console.error(e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
