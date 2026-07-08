import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db/db";
import { nanoid } from "nanoid";

const ALLOWED_STATUSES = [
    "draft", "planned", "active", "waiting_review", "needs_revision", 
    "verified", "completed", "archived", "stopped"
];

const ALLOWED_RISKS = ["low", "medium", "high", "critical"];

const ALLOWED_GATES = [0, 1, 2, 3];

export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
    try {
        const { slug } = await params;
        const db = getDb();
        const project = db.prepare("SELECT * FROM projects WHERE slug = ?").get(slug) as any;
        if (!project) {
            return NextResponse.json({ error: "Project not found" }, { status: 404 });
        }

        const searchParams = req.nextUrl.searchParams;
        const includeArchived = searchParams.get("include_archived") === "1";

        // Fetch loops for the project
        let loopsQuery = "SELECT * FROM project_loops WHERE project_id = ?";
        if (!includeArchived) {
            loopsQuery += " AND status != 'archived'";
        }
        loopsQuery += " ORDER BY updated_at DESC";

        const loops = db.prepare(loopsQuery).all(project.id);
        const templates = db.prepare("SELECT * FROM project_loop_templates WHERE is_active = 1").all();

        return NextResponse.json({ loops, templates });
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
        const { template_id, loop_name, loop_type } = body;

        let finalName = loop_name;
        let finalType = loop_type;
        let finalSteps = "[]";
        let finalRisk = "low";
        let finalGate = 0;
        let finalCurrentStep = "";

        if (template_id) {
            const template = db.prepare("SELECT * FROM project_loop_templates WHERE id = ? AND is_active = 1").get(template_id) as any;
            if (!template) {
                return NextResponse.json({ error: "Template not found or inactive" }, { status: 404 });
            }
            if (!finalName) {
                finalName = template.template_name;
            }
            finalType = template.loop_type;
            finalSteps = template.steps_json;
            finalRisk = template.default_risk_level;
            finalGate = template.default_review_gate_level;

            try {
                const parsedSteps = JSON.parse(finalSteps);
                if (Array.isArray(parsedSteps) && parsedSteps.length > 0) {
                    finalCurrentStep = parsedSteps[0];
                }
            } catch {
                finalCurrentStep = "";
            }
        } else {
            if (!finalName || !finalType) {
                return NextResponse.json({ error: "loop_name and loop_type are required for custom loops" }, { status: 400 });
            }
        }

        const id = `LP-${nanoid(8).toUpperCase()}`;
        db.prepare(`
            INSERT INTO project_loops (
                id, project_id, template_id, loop_name, loop_type, current_step, 
                status, risk_level, review_gate_level, expected_output, save_destination, 
                learn_note, steps_json, created_at, updated_at
            ) VALUES (
                ?, ?, ?, ?, ?, ?, 'draft', ?, ?, '', '', '', ?, datetime('now'), datetime('now')
            )
        `).run(
            id,
            project.id,
            template_id || null,
            finalName,
            finalType,
            finalCurrentStep,
            finalRisk,
            finalGate,
            finalSteps
        );

        const created = db.prepare("SELECT * FROM project_loops WHERE id = ?").get(id);
        return NextResponse.json(created);
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
    try {
        const { slug } = await params;
        const db = getDb();
        const project = db.prepare("SELECT * FROM projects WHERE slug = ?").get(slug) as any;
        if (!project) {
            return NextResponse.json({ error: "Project not found" }, { status: 404 });
        }

        const body = await req.json();
        const { 
            id, loop_name, current_step, status, risk_level, 
            review_gate_level, expected_output, save_destination, learn_note 
        } = body;

        if (!id) {
            return NextResponse.json({ error: "Loop ID is required" }, { status: 400 });
        }

        // Project ownership validation
        const existing = db.prepare("SELECT * FROM project_loops WHERE id = ? AND project_id = ?").get(id, project.id) as any;
        if (!existing) {
            return NextResponse.json({ error: "Loop not found or does not belong to this project" }, { status: 403 });
        }

        // Strict enums validation
        if (status !== undefined && !ALLOWED_STATUSES.includes(status)) {
            return NextResponse.json({ error: `Invalid status: ${status}` }, { status: 400 });
        }
        if (risk_level !== undefined && !ALLOWED_RISKS.includes(risk_level)) {
            return NextResponse.json({ error: `Invalid risk_level: ${risk_level}` }, { status: 400 });
        }
        if (review_gate_level !== undefined && !ALLOWED_GATES.includes(Number(review_gate_level))) {
            return NextResponse.json({ error: `Invalid review_gate_level: ${review_gate_level}` }, { status: 400 });
        }

        const sets: string[] = [];
        const bind: Record<string, any> = { id, project_id: project.id };

        if (loop_name !== undefined) { sets.push("loop_name = @loop_name"); bind.loop_name = loop_name; }
        if (current_step !== undefined) { sets.push("current_step = @current_step"); bind.current_step = current_step; }
        if (status !== undefined) { sets.push("status = @status"); bind.status = status; }
        if (risk_level !== undefined) { sets.push("risk_level = @risk_level"); bind.risk_level = risk_level; }
        if (review_gate_level !== undefined) { sets.push("review_gate_level = @review_gate_level"); bind.review_gate_level = Number(review_gate_level); }
        if (expected_output !== undefined) { sets.push("expected_output = @expected_output"); bind.expected_output = expected_output; }
        if (save_destination !== undefined) { sets.push("save_destination = @save_destination"); bind.save_destination = save_destination; }
        if (learn_note !== undefined) { sets.push("learn_note = @learn_note"); bind.learn_note = learn_note; }

        // completed_at logic
        if (status === "completed" && !existing.completed_at) {
            sets.push("completed_at = datetime('now')");
        }

        if (sets.length === 0) {
            return NextResponse.json(existing);
        }

        sets.push("updated_at = datetime('now')");
        const sql = `UPDATE project_loops SET ${sets.join(", ")} WHERE id = @id AND project_id = @project_id`;
        db.prepare(sql).run(bind);

        const updated = db.prepare("SELECT * FROM project_loops WHERE id = ?").get(id);
        return NextResponse.json(updated);
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
