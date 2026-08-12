import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db/db";
import { CreateProjectItemSchema } from "@/lib/projects/backlogCreateSchema";
import { insertProjectItem } from "@/lib/projects/backlogWrite";

export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
    try {
        const { slug } = await params;
        const db = getDb();
        const project = db.prepare("SELECT id FROM projects WHERE slug = ?").get(slug) as { id: string } | undefined;
        if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

        const url = new URL(req.url);
        const workstream = url.searchParams.get("workstream");
        const status = url.searchParams.get("status");

        let query = "SELECT * FROM project_items WHERE project_id = ?";
        const queryParams: any[] = [project.id];

        if (workstream) {
            query += " AND workstream = ?";
            queryParams.push(workstream);
        }
        if (status) {
            const statusArr = status.split(',');
            query += ` AND status IN (${statusArr.map(() => '?').join(',')})`;
            queryParams.push(...statusArr);
        }

        query += " ORDER BY start_date ASC, priority DESC, created_at DESC";

        const items = db.prepare(query).all(...queryParams);
        return NextResponse.json(items);
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
    try {
        const { slug } = await params;
        const db = getDb();
        const project = db.prepare("SELECT id FROM projects WHERE slug = ?").get(slug) as { id: string } | undefined;
        if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

        const body = await req.json();
        const parsed = CreateProjectItemSchema.parse(body);

        const id = insertProjectItem(db, project.id, parsed);

        const item = db.prepare("SELECT * FROM project_items WHERE id = ?").get(id);
        return NextResponse.json(item);
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 400 });
    }
}
