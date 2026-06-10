import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/db";
import { nanoid } from "nanoid";

export async function GET() {
    try {
        const workflows = db.prepare(`
            SELECT w.*, 
                   (SELECT COUNT(*) FROM prompt_workflow_steps WHERE workflow_id = w.id) AS step_count
            FROM prompt_workflows w
            WHERE w.status = 'active'
            ORDER BY w.updated_at DESC
        `).all();
        return NextResponse.json(workflows);
    } catch (e) {
        console.error("GET /api/prompt-workflows failed:", e);
        return NextResponse.json({ error: "Failed to fetch workflows" }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { name, description } = body;

        if (!name || !name.trim()) {
            return NextResponse.json({ error: "Workflow name is required" }, { status: 400 });
        }

        const id = "workflow-" + nanoid(10);
        const now = new Date().toISOString();

        db.prepare(`
            INSERT INTO prompt_workflows (id, name, description, status, created_at, updated_at)
            VALUES (?, ?, ?, 'active', ?, ?)
        `).run(id, name.trim(), description || null, now, now);

        const newWorkflow = db.prepare("SELECT * FROM prompt_workflows WHERE id = ?").get(id);
        return NextResponse.json(newWorkflow);
    } catch (e) {
        console.error("POST /api/prompt-workflows failed:", e);
        return NextResponse.json({ error: "Failed to create workflow" }, { status: 500 });
    }
}
