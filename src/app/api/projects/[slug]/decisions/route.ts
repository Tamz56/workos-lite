import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db/db";
import { nanoid } from "nanoid";

export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
    try {
        const { slug } = await params;
        const db = getDb();
        const project = db.prepare("SELECT * FROM projects WHERE slug = ?").get(slug) as any;
        if (!project) {
            return NextResponse.json({ error: "Project not found" }, { status: 404 });
        }

        const decisions = db.prepare("SELECT * FROM project_decisions WHERE project_id = ? ORDER BY created_at DESC").all(project.id);
        return NextResponse.json(decisions);
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
    try {
        const { slug } = await params;
        const db = getDb();
        const project = db.prepare("SELECT * FROM projects WHERE slug = ?").get(slug) as any;
        if (!project) {
            return NextResponse.json({ error: "Project not found" }, { status: 404 });
        }

        const body = await req.json();
        const { title, decision, reason, impact } = body;
        if (!title || !decision) {
            return NextResponse.json({ error: "Title and Decision are required" }, { status: 400 });
        }

        const id = `DEC-${nanoid(8).toUpperCase()}`;
        db.prepare(`
            INSERT INTO project_decisions (id, project_id, title, decision, reason, impact, created_at)
            VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
        `).run(
            id,
            project.id,
            title,
            decision,
            reason || "",
            impact || ""
        );

        const newDecision = db.prepare("SELECT * FROM project_decisions WHERE id = ?").get(id);
        return NextResponse.json(newDecision);
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
    try {
        const { slug } = await params;
        const searchParams = req.nextUrl.searchParams;
        const id = searchParams.get("id");
        if (!id) {
            return NextResponse.json({ error: "id parameter is required" }, { status: 400 });
        }

        const db = getDb();
        const project = db.prepare("SELECT * FROM projects WHERE slug = ?").get(slug) as any;
        if (!project) {
            return NextResponse.json({ error: "Project not found" }, { status: 404 });
        }

        // Validate project ownership using id + project_id
        const info = db.prepare("DELETE FROM project_decisions WHERE id = ? AND project_id = ?").run(id, project.id);

        if (info.changes === 0) {
            return NextResponse.json({ error: "Decision not found or does not belong to this project" }, { status: 403 });
        }

        return NextResponse.json({ success: true });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
