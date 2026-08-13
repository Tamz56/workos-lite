import { NextRequest, NextResponse } from "next/server";
import { humanMutationGuard } from "@/lib/human-auth/mutationGuard";
import { db } from "@/db/db";
import { nanoid } from "nanoid";

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const authGuard = humanMutationGuard(req);
    if (authGuard instanceof NextResponse) return authGuard;
    try {
        const { id: workflowId } = await params;
        const body = await req.json();
        const { prompt_template_id, step_name, step_description, step_instruction } = body;

        if (!prompt_template_id) {
            return NextResponse.json({ error: "prompt_template_id is required" }, { status: 400 });
        }

        // Validate workflow exists
        const workflow = db.prepare("SELECT * FROM prompt_workflows WHERE id = ?").get(workflowId);
        if (!workflow) {
            return NextResponse.json({ error: "Workflow not found" }, { status: 404 });
        }

        // Validate template exists
        const template = db.prepare("SELECT * FROM prompt_templates WHERE id = ?").get(prompt_template_id) as any;
        if (!template) {
            return NextResponse.json({ error: "Prompt template not found" }, { status: 404 });
        }

        const stepId = "step-" + nanoid(10);
        const now = new Date().toISOString();

        // Calculate next sort_order
        const maxOrderRow = db.prepare("SELECT MAX(sort_order) AS max_order FROM prompt_workflow_steps WHERE workflow_id = ?").get(workflowId) as any;
        const nextOrder = (maxOrderRow?.max_order || 0) + 1;

        db.prepare(`
            INSERT INTO prompt_workflow_steps (
                id, workflow_id, prompt_template_id, step_name, step_description, step_instruction, sort_order, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
            stepId,
            workflowId,
            prompt_template_id,
            (step_name || template.name).trim(),
            step_description || null,
            step_instruction || null,
            nextOrder,
            now,
            now
        );

        const newStep = db.prepare("SELECT * FROM prompt_workflow_steps WHERE id = ?").get(stepId);
        return NextResponse.json(newStep);
    } catch (e) {
        console.error("POST /api/prompt-workflows/[id]/steps failed:", e);
        return NextResponse.json({ error: "Failed to add step to workflow" }, { status: 500 });
    }
}
