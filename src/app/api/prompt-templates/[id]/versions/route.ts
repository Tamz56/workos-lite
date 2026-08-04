import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/db";
import { nanoid } from "nanoid";

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const versions = db.prepare(`
            SELECT * FROM prompt_versions
            WHERE prompt_template_id = ?
            ORDER BY created_at DESC
        `).all(id);
        return NextResponse.json(versions);
    } catch (e) {
        console.error("GET /api/prompt-templates/[id]/versions failed:", e);
        return NextResponse.json({ error: "Failed to fetch versions" }, { status: 500 });
    }
}

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: promptTemplateId } = await params;
        const body = await req.json();
        const { version, revision_notes, created_from_run_log_id } = body;

        if (!version) {
            return NextResponse.json({ error: "Version string is required" }, { status: 400 });
        }

        // Query the current state of the template
        const current = db.prepare("SELECT * FROM prompt_templates WHERE id = ?").get(promptTemplateId) as any;
        if (!current) {
            return NextResponse.json({ error: "Prompt template not found" }, { status: 404 });
        }

        const id = "version-" + nanoid(10);
        const now = new Date().toISOString();

        const insertStmt = db.prepare(`
            INSERT INTO prompt_versions (
                id, prompt_template_id, version, revision_notes, created_from_run_log_id, is_active,
                purpose, role, context, input_fields, instructions, constraints, output_format,
                review_checklist, notes, guardrail_preset_ids, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        insertStmt.run(
            id,
            promptTemplateId,
            version,
            revision_notes || null,
            created_from_run_log_id || null,
            0, // is_active is 0 by default when created
            current.purpose || null,
            current.role || null,
            current.context || null,
            current.input_fields || "[]",
            current.instructions || null,
            current.constraints || null,
            current.output_format || null,
            current.review_checklist || null,
            current.notes || null,
            current.guardrail_preset_ids || "[]",
            now,
            now
        );

        const newVersion = db.prepare("SELECT * FROM prompt_versions WHERE id = ?").get(id);
        return NextResponse.json(newVersion);
    } catch (e) {
        console.error("POST /api/prompt-templates/[id]/versions failed:", e);
        return NextResponse.json({ error: "Failed to create version snapshot" }, { status: 500 });
    }
}
