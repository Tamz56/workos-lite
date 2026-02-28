import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db/db";
import { nanoid } from "nanoid";
import { z } from "zod";

const CreateSprintSchema = z.object({
    project_id: z.string().min(1),
    name: z.string().min(1),
    status: z.enum(["planned", "active", "completed"]).default("planned"),
    start_date: z.string().nullable().optional(),
    end_date: z.string().nullable().optional(),
});

export async function GET(req: NextRequest) {
    try {
        const db = getDb();
        const url = new URL(req.url);
        const projectId = url.searchParams.get("project_id");

        let query = "SELECT * FROM sprints";
        const params: any[] = [];
        if (projectId) {
            query += " WHERE project_id = ?";
            params.push(projectId);
        }
        query += " ORDER BY start_date DESC NULLS LAST";

        const sprints = db.prepare(query).all(params);
        return NextResponse.json(sprints);
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const db = getDb();
        const body = await req.json();
        const parsed = CreateSprintSchema.parse(body);

        const stmt = db.prepare(`
            INSERT INTO sprints (id, project_id, name, status, start_date, end_date)
            VALUES (@id, @project_id, @name, @status, @start_date, @end_date)
        `);

        const id = nanoid();
        stmt.run({
            id,
            project_id: parsed.project_id,
            name: parsed.name,
            status: parsed.status,
            start_date: parsed.start_date || null,
            end_date: parsed.end_date || null
        });

        const sprint = db.prepare("SELECT * FROM sprints WHERE id = ?").get(id);
        return NextResponse.json(sprint);
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 400 });
    }
}
