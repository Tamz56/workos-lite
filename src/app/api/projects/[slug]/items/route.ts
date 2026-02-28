import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db/db";
import { nanoid } from "nanoid";
import { z } from "zod";

const CreateProjectItemSchema = z.object({
    title: z.string().min(1),
    status: z.enum(["inbox", "planned", "done"]).default("planned"),
    priority: z.number().int().nullable().optional(),
    schedule_bucket: z.enum(["morning", "afternoon", "evening", "none"]).nullable().optional(),
    start_date: z.string().nullable().optional(),
    end_date: z.string().nullable().optional(),
    is_milestone: z.union([z.boolean(), z.number()]).transform(v => (v ? 1 : 0)).optional(),
    workstream: z.string().nullable().optional(),
    dod_text: z.string().nullable().optional(),
    notes: z.string().nullable().optional()
});

export async function GET(req: NextRequest, { params }: { params: { slug: string } }) {
    try {
        const db = getDb();
        const project = db.prepare("SELECT id FROM projects WHERE slug = ?").get(params.slug) as { id: string } | undefined;
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

export async function POST(req: NextRequest, { params }: { params: { slug: string } }) {
    try {
        const db = getDb();
        const project = db.prepare("SELECT id FROM projects WHERE slug = ?").get(params.slug) as { id: string } | undefined;
        if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

        const body = await req.json();
        const parsed = CreateProjectItemSchema.parse(body);

        const stmt = db.prepare(`
            INSERT INTO project_items (
                id, project_id, title, status, priority, schedule_bucket,
                start_date, end_date, is_milestone, workstream, dod_text, notes
            ) VALUES (
                @id, @project_id, @title, @status, @priority, @schedule_bucket,
                @start_date, @end_date, @is_milestone, @workstream, @dod_text, @notes
            )
        `);

        const id = nanoid();
        stmt.run({
            id,
            project_id: project.id,
            title: parsed.title,
            status: parsed.status,
            priority: parsed.priority ?? null,
            schedule_bucket: parsed.schedule_bucket ?? null,
            start_date: parsed.start_date ?? null,
            end_date: parsed.end_date ?? null,
            is_milestone: parsed.is_milestone ?? 0,
            workstream: parsed.workstream ?? null,
            dod_text: parsed.dod_text ?? null,
            notes: parsed.notes ?? null,
        });

        const item = db.prepare("SELECT * FROM project_items WHERE id = ?").get(id);
        return NextResponse.json(item);
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 400 });
    }
}
