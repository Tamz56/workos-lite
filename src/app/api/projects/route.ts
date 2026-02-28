import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db/db";
import { nanoid } from "nanoid";
import { z } from "zod";

const CreateProjectSchema = z.object({
    name: z.string().min(1),
    slug: z.string().min(1).regex(/^[a-z0-9-]+$/),
    status: z.enum(["inbox", "planned", "done"]).default("planned"),
    start_date: z.string().nullable().optional(),
    end_date: z.string().nullable().optional(),
    owner: z.string().nullable().optional(),
});

export async function GET(req: NextRequest) {
    try {
        const db = getDb();
        const url = new URL(req.url);
        const status = url.searchParams.get("status");

        let query = "SELECT * FROM projects";
        const params: any[] = [];
        if (status) {
            query += " WHERE status = ?";
            params.push(status);
        }
        query += " ORDER BY created_at DESC";

        const projects = db.prepare(query).all(params);
        return NextResponse.json(projects);
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const db = getDb();
        const body = await req.json();
        const parsed = CreateProjectSchema.parse(body);

        const stmt = db.prepare(`
            INSERT INTO projects (id, slug, name, status, start_date, end_date, owner)
            VALUES (@id, @slug, @name, @status, @start_date, @end_date, @owner)
        `);

        const id = nanoid();
        stmt.run({
            id,
            slug: parsed.slug,
            name: parsed.name,
            status: parsed.status,
            start_date: parsed.start_date || null,
            end_date: parsed.end_date || null,
            owner: parsed.owner || null
        });

        const project = db.prepare("SELECT * FROM projects WHERE id = ?").get(id);
        return NextResponse.json(project);
    } catch (e: any) {
        if (e.code === 'SQLITE_CONSTRAINT_UNIQUE') {
            return NextResponse.json({ error: "Slug already exists" }, { status: 409 });
        }
        return NextResponse.json({ error: e.message }, { status: 400 });
    }
}
