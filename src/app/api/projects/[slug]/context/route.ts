import { NextRequest, NextResponse } from "next/server";
import { humanMutationGuard } from "@/lib/human-auth/mutationGuard";
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

        const context = db.prepare("SELECT * FROM project_contexts WHERE project_id = ?").get(project.id) as any;

        // Non-destructive: If no context exists in the DB yet, return a clean template structure
        // but DO NOT write it to the database.
        const result = context || {
            project_id: project.id,
            overview: "",
            purpose: "",
            standing_instructions: "",
            tone_voice: "",
            guardrails: "",
            output_standards: "",
            decision_rules: "",
            source_of_truth: ""
        };

        return NextResponse.json(result);
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
    const authGuard = humanMutationGuard(req);
    if (authGuard instanceof NextResponse) return authGuard;
    try {
        const { slug } = await params;
        const db = getDb();
        const project = db.prepare("SELECT * FROM projects WHERE slug = ?").get(slug) as any;
        if (!project) {
            return NextResponse.json({ error: "Project not found" }, { status: 404 });
        }

        const body = await req.json();
        const {
            overview,
            purpose,
            standing_instructions,
            tone_voice,
            guardrails,
            output_standards,
            decision_rules,
            source_of_truth
        } = body;

        const id = `CTX-${nanoid(8).toUpperCase()}`;

        // Upsert context safely by project_id, preserving created_at
        db.prepare(`
            INSERT INTO project_contexts (
                id, project_id, overview, purpose, standing_instructions, tone_voice, guardrails,
                output_standards, decision_rules, source_of_truth, created_at, updated_at
            ) VALUES (
                ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now')
            ) ON CONFLICT(project_id) DO UPDATE SET
                overview = excluded.overview,
                purpose = excluded.purpose,
                standing_instructions = excluded.standing_instructions,
                tone_voice = excluded.tone_voice,
                guardrails = excluded.guardrails,
                output_standards = excluded.output_standards,
                decision_rules = excluded.decision_rules,
                source_of_truth = excluded.source_of_truth,
                updated_at = datetime('now')
        `).run(
            id,
            project.id,
            overview || "",
            purpose || "",
            standing_instructions || "",
            tone_voice || "",
            guardrails || "",
            output_standards || "",
            decision_rules || "",
            source_of_truth || ""
        );

        const updatedContext = db.prepare("SELECT * FROM project_contexts WHERE project_id = ?").get(project.id);
        return NextResponse.json(updatedContext);
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
