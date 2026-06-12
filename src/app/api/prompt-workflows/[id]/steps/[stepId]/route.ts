import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/db";

export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string; stepId: string }> }
) {
    try {
        const { id: workflowId, stepId } = await params;
        const body = await req.json();
        const { step_name, step_description, step_instruction, direction, run_status, output_note, last_run_at } = body;

        // Check if the step exists
        const step = db.prepare("SELECT * FROM prompt_workflow_steps WHERE id = ? AND workflow_id = ?").get(stepId, workflowId) as any;
        if (!step) {
            return NextResponse.json({ error: "Workflow step not found" }, { status: 404 });
        }

        const now = new Date().toISOString();

        if (direction) {
            const currentOrder = step.sort_order;
            let targetStep: any = null;

            if (direction === "up") {
                // Find step with largest sort_order that is less than currentOrder
                targetStep = db.prepare(`
                    SELECT * FROM prompt_workflow_steps 
                    WHERE workflow_id = ? AND sort_order < ? 
                    ORDER BY sort_order DESC 
                    LIMIT 1
                `).get(workflowId, currentOrder);
            } else if (direction === "down") {
                // Find step with smallest sort_order that is greater than currentOrder
                targetStep = db.prepare(`
                    SELECT * FROM prompt_workflow_steps 
                    WHERE workflow_id = ? AND sort_order > ? 
                    ORDER BY sort_order ASC 
                    LIMIT 1
                `).get(workflowId, currentOrder);
            } else {
                return NextResponse.json({ error: "Invalid direction. Must be 'up' or 'down'." }, { status: 400 });
            }

            if (targetStep) {
                // Swap in a transaction
                const tx = db.transaction(() => {
                    db.prepare("UPDATE prompt_workflow_steps SET sort_order = ?, updated_at = ? WHERE id = ?").run(targetStep.sort_order, now, stepId);
                    db.prepare("UPDATE prompt_workflow_steps SET sort_order = ?, updated_at = ? WHERE id = ?").run(currentOrder, now, targetStep.id);
                });
                tx();
            }
        } else {
            // General updates
            const updates: string[] = [];
            const values: any[] = [];

            if (step_name !== undefined) {
                if (!step_name.trim()) {
                    return NextResponse.json({ error: "Step name cannot be empty" }, { status: 400 });
                }
                updates.push("step_name = ?");
                values.push(step_name.trim());
            }

            if (step_description !== undefined) {
                updates.push("step_description = ?");
                values.push(step_description || null);
            }

            if (step_instruction !== undefined) {
                updates.push("step_instruction = ?");
                values.push(step_instruction || null);
            }

            if (run_status !== undefined) {
                if (run_status !== null && !["pending", "in_progress", "done", "skipped"].includes(run_status)) {
                    return NextResponse.json({ error: "Invalid run status" }, { status: 400 });
                }
                updates.push("run_status = ?");
                values.push(run_status || "pending");
            }

            if (output_note !== undefined) {
                updates.push("output_note = ?");
                values.push(output_note !== null ? output_note : "");
            }

            if (last_run_at !== undefined) {
                updates.push("last_run_at = ?");
                values.push(last_run_at);
            }

            if (updates.length > 0) {
                updates.push("updated_at = ?");
                values.push(now);

                db.prepare(`
                    UPDATE prompt_workflow_steps 
                    SET ${updates.join(", ")} 
                    WHERE id = ?
                `).run(...values, stepId);
            }
        }

        const updatedStep = db.prepare("SELECT * FROM prompt_workflow_steps WHERE id = ?").get(stepId);
        return NextResponse.json(updatedStep);
    } catch (e) {
        console.error("PATCH /api/prompt-workflows/[id]/steps/[stepId] failed:", e);
        return NextResponse.json({ error: "Failed to update step" }, { status: 500 });
    }
}

export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ id: string; stepId: string }> }
) {
    try {
        const { id: workflowId, stepId } = await params;

        // Check if the step exists
        const step = db.prepare("SELECT * FROM prompt_workflow_steps WHERE id = ? AND workflow_id = ?").get(stepId, workflowId) as any;
        if (!step) {
            return NextResponse.json({ error: "Workflow step not found" }, { status: 404 });
        }

        // Delete the step and reorder remaining steps in a transaction
        const tx = db.transaction(() => {
            // Delete
            db.prepare("DELETE FROM prompt_workflow_steps WHERE id = ?").run(stepId);
            
            // Fetch remaining steps ordered by sort_order
            const remaining = db.prepare(`
                SELECT id FROM prompt_workflow_steps 
                WHERE workflow_id = ? 
                ORDER BY sort_order ASC
            `).all(workflowId) as { id: string }[];

            // Re-sequence
            const now = new Date().toISOString();
            const updateStmt = db.prepare("UPDATE prompt_workflow_steps SET sort_order = ?, updated_at = ? WHERE id = ?");
            remaining.forEach((item, index) => {
                updateStmt.run(index + 1, now, item.id);
            });
        });
        tx();

        return NextResponse.json({ success: true });
    } catch (e) {
        console.error("DELETE /api/prompt-workflows/[id]/steps/[stepId] failed:", e);
        return NextResponse.json({ error: "Failed to delete step" }, { status: 500 });
    }
}
