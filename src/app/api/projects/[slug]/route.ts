import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db/db";
import { z } from "zod";

const UpdateProjectSchema = z.object({
    name: z.string().min(1).optional(),
    status: z.enum(["inbox", "planned", "done"]).optional(),
    start_date: z.string().nullable().optional(),
    end_date: z.string().nullable().optional(),
    owner: z.string().nullable().optional(),
});

export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
    try {
        const { slug } = await params;
        const db = getDb();
        const project = db.prepare("SELECT * FROM projects WHERE slug = ?").get(slug);

        if (!project) {
            return NextResponse.json({ error: "Project not found" }, { status: 404 });
        }

        return NextResponse.json(project);
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
    try {
        const { slug } = await params;
        const db = getDb();
        const project = db.prepare("SELECT * FROM projects WHERE slug = ?").get(slug);
        if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

        const body = await req.json();
        const parsed = UpdateProjectSchema.parse(body);

        const sets: string[] = [];
        const bind: Record<string, any> = { slug: slug };

        if (parsed.name !== undefined) { sets.push("name = @name"); bind.name = parsed.name; }
        if (parsed.status !== undefined) { sets.push("status = @status"); bind.status = parsed.status; }
        if (parsed.start_date !== undefined) { sets.push("start_date = @start_date"); bind.start_date = parsed.start_date; }
        if (parsed.end_date !== undefined) { sets.push("end_date = @end_date"); bind.end_date = parsed.end_date; }
        if (parsed.owner !== undefined) { sets.push("owner = @owner"); bind.owner = parsed.owner; }

        if (sets.length === 0) {
            return NextResponse.json(project);
        }

        const sql = `UPDATE projects SET ${sets.join(", ")} WHERE slug = @slug`;
        db.prepare(sql).run(bind);

        const updated = db.prepare("SELECT * FROM projects WHERE slug = ?").get(slug);
        return NextResponse.json(updated);
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 400 });
    }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
    try {
        const { slug } = await params;
        const db = getDb();

        // 1. Protection Check
        const project = db.prepare("SELECT * FROM projects WHERE slug = ?").get(slug);
        if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });
        
        if ((project as any).is_seed === 1) {
            return NextResponse.json({ 
                error: "Cannot delete seed/demo project from UI. Please use Reset Demo Data instead." 
            }, { status: 403 });
        }

        // 2. Cascade Delete in Transaction
        const transaction = db.transaction(() => {
            // A. Delete tasks in lists belonging to this project (where list_id starts with slug-)
            db.prepare("DELETE FROM tasks WHERE list_id LIKE ?").run(`${slug}-%`);

            // B. Delete lists
            db.prepare("DELETE FROM lists WHERE slug LIKE ?").run(`${slug}-%`);

            // D. Delete project
            db.prepare("DELETE FROM projects WHERE slug = ?").run(slug);
        });

        transaction();

        return NextResponse.json({ success: true });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
