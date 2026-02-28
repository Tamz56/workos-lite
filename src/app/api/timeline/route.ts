import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db/db";

export async function GET(req: NextRequest) {
    try {
        const db = getDb();
        const url = new URL(req.url);

        const projectFilter = url.searchParams.get("project"); // slug or id
        const statusFilter = url.searchParams.get("status");
        const fromDate = url.searchParams.get("from");
        const toDate = url.searchParams.get("to");
        const workstream = url.searchParams.get("workstream");

        let query = `
            SELECT pi.*, p.name as project_name, p.slug as project_slug 
            FROM project_items pi
            JOIN projects p ON pi.project_id = p.id
            WHERE 1=1
        `;
        const params: any[] = [];

        if (projectFilter) {
            query += " AND (p.slug = ? OR p.id = ?)";
            params.push(projectFilter, projectFilter);
        }

        if (statusFilter) {
            const statusArr = statusFilter.split(',');
            query += ` AND pi.status IN (${statusArr.map(() => '?').join(',')})`;
            params.push(...statusArr);
        }

        if (workstream) {
            query += " AND pi.workstream = ?";
            params.push(workstream);
        }

        if (fromDate) {
            query += " AND (pi.end_date >= ? OR pi.start_date >= ?)";
            params.push(fromDate, fromDate);
        }

        if (toDate) {
            query += " AND (pi.start_date <= ? OR pi.end_date <= ?)";
            params.push(toDate, toDate);
        }

        query += " ORDER BY pi.start_date ASC, pi.priority DESC";

        const items = db.prepare(query).all(...params);
        return NextResponse.json(items);
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
