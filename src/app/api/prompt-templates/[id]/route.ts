import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/db";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const template = db.prepare(`
            SELECT t.*, 
                   (SELECT version FROM prompt_versions WHERE prompt_template_id = t.id AND is_active = 1) AS active_version
            FROM prompt_templates t
            WHERE t.id = ?
        `).get(id);
        if (!template) {
            return NextResponse.json({ error: "Prompt template not found" }, { status: 404 });
        }
        return NextResponse.json(template);
    } catch (e) {
        console.error("GET /api/prompt-templates/[id] failed:", e);
        return NextResponse.json({ error: "Failed to fetch prompt template" }, { status: 500 });
    }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const body = await req.json();

        // Check if template exists
        const existing = db.prepare("SELECT * FROM prompt_templates WHERE id = ?").get(id);
        if (!existing) {
            return NextResponse.json({ error: "Prompt template not found" }, { status: 404 });
        }

        const updates: string[] = [];
        const values: unknown[] = [];

        const fields = [
            "name",
            "category",
            "purpose",
            "role",
            "context",
            "input_fields",
            "instructions",
            "constraints",
            "output_format",
            "review_checklist",
            "notes",
            "status",
            "version",
            "version_notes",
            "guardrail_preset_ids"
        ];

        for (const field of fields) {
            if (body[field] !== undefined) {
                if (field === "input_fields" && body[field] !== null) {
                    // Validate input_fields JSON format
                    try {
                        JSON.parse(body[field]);
                    } catch {
                        return NextResponse.json({ error: "Invalid input_fields JSON format" }, { status: 400 });
                    }
                }
                updates.push(`${field} = ?`);
                values.push(body[field]);
            }
        }

        if (updates.length > 0) {
            updates.push("updated_at = ?");
            values.push(new Date().toISOString());

            const query = `UPDATE prompt_templates SET ${updates.join(", ")} WHERE id = ?`;
            db.prepare(query).run(...values, id);
        }

        const updatedTemplate = db.prepare(`
            SELECT t.*, 
                   (SELECT version FROM prompt_versions WHERE prompt_template_id = t.id AND is_active = 1) AS active_version
            FROM prompt_templates t
            WHERE t.id = ?
        `).get(id);
        return NextResponse.json(updatedTemplate);
    } catch (e) {
        console.error("PATCH /api/prompt-templates/[id] failed:", e);
        return NextResponse.json({ error: "Failed to update prompt template" }, { status: 500 });
    }
}

// DELETE: Archive-first behavior (set status to 'archived' instead of hard delete)
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        
        const existing = db.prepare("SELECT * FROM prompt_templates WHERE id = ?").get(id);
        if (!existing) {
            return NextResponse.json({ error: "Prompt template not found" }, { status: 404 });
        }

        const now = new Date().toISOString();
        db.prepare("UPDATE prompt_templates SET status = 'archived', updated_at = ? WHERE id = ?").run(now, id);
        
        const archivedTemplate = db.prepare("SELECT * FROM prompt_templates WHERE id = ?").get(id);
        return NextResponse.json({ success: true, template: archivedTemplate });
    } catch (e) {
        console.error("DELETE /api/prompt-templates/[id] failed:", e);
        return NextResponse.json({ error: "Failed to archive prompt template" }, { status: 500 });
    }
}
