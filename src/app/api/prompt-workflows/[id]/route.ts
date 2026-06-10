import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/db";

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        
        const workflow = db.prepare("SELECT * FROM prompt_workflows WHERE id = ?").get(id) as any;
        if (!workflow) {
            return NextResponse.json({ error: "Workflow not found" }, { status: 404 });
        }

        const steps = db.prepare(`
            SELECT s.*, 
                   t.name AS template_name,
                   t.category AS template_category,
                   t.status AS template_status,
                   (SELECT version FROM prompt_versions WHERE prompt_template_id = t.id AND is_active = 1) AS active_version
            FROM prompt_workflow_steps s
            JOIN prompt_templates t ON s.prompt_template_id = t.id
            WHERE s.workflow_id = ?
            ORDER BY s.sort_order ASC
        `).all(id);

        return NextResponse.json({
            ...workflow,
            steps
        });
    } catch (e) {
        console.error("GET /api/prompt-workflows/[id] failed:", e);
        return NextResponse.json({ error: "Failed to fetch workflow details" }, { status: 500 });
    }
}

export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const body = await req.json();
        const { name, description, status } = body;

        const workflow = db.prepare("SELECT * FROM prompt_workflows WHERE id = ?").get(id);
        if (!workflow) {
            return NextResponse.json({ error: "Workflow not found" }, { status: 404 });
        }

        const updates: string[] = [];
        const values: any[] = [];

        if (name !== undefined) {
            if (!name.trim()) {
                return NextResponse.json({ error: "Workflow name cannot be empty" }, { status: 400 });
            }
            updates.push("name = ?");
            values.push(name.trim());
        }

        if (description !== undefined) {
            updates.push("description = ?");
            values.push(description || null);
        }

        if (status !== undefined) {
            if (status !== "active" && status !== "archived") {
                return NextResponse.json({ error: "Invalid status value" }, { status: 400 });
            }
            updates.push("status = ?");
            values.push(status);
        }

        if (updates.length > 0) {
            updates.push("updated_at = ?");
            values.push(new Date().toISOString());
            
            db.prepare(`
                UPDATE prompt_workflows 
                SET ${updates.join(", ")} 
                WHERE id = ?
            `).run(...values, id);
        }

        const updatedWorkflow = db.prepare("SELECT * FROM prompt_workflows WHERE id = ?").get(id);
        return NextResponse.json(updatedWorkflow);
    } catch (e) {
        console.error("PATCH /api/prompt-workflows/[id] failed:", e);
        return NextResponse.json({ error: "Failed to update workflow" }, { status: 500 });
    }
}

export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const workflow = db.prepare("SELECT * FROM prompt_workflows WHERE id = ?").get(id);
        if (!workflow) {
            return NextResponse.json({ error: "Workflow not found" }, { status: 404 });
        }

        db.prepare("DELETE FROM prompt_workflows WHERE id = ?").run(id);
        return NextResponse.json({ success: true });
    } catch (e) {
        console.error("DELETE /api/prompt-workflows/[id] failed:", e);
        return NextResponse.json({ error: "Failed to delete workflow" }, { status: 500 });
    }
}
