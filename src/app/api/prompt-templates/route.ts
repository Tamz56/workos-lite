import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/db";
import { nanoid } from "nanoid";

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const category = searchParams.get("category");
        const status = searchParams.get("status");
        const q = searchParams.get("q");

        let query = "SELECT * FROM prompt_templates WHERE 1=1";
        const params: string[] = [];

        if (category) {
            query += " AND category = ?";
            params.push(category);
        }
        if (status) {
            query += " AND status = ?";
            params.push(status);
        }
        if (q) {
            query += " AND (name LIKE ? ESCAPE '\\' OR purpose LIKE ? ESCAPE '\\' OR role LIKE ? ESCAPE '\\')";
            const escapedQ = `%${q.replace(/[%_\\]/g, "\\$&")}%`;
            params.push(escapedQ, escapedQ, escapedQ);
        }

        query += " ORDER BY updated_at DESC";
        const templates = db.prepare(query).all(...params);
        return NextResponse.json(templates);
    } catch (e) {
        console.error("GET /api/prompt-templates failed:", e);
        return NextResponse.json({ error: "Failed to fetch prompt templates" }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const {
            name,
            category,
            purpose,
            role,
            context,
            input_fields,
            instructions,
            constraints,
            output_format,
            review_checklist,
            notes,
            status,
            version,
            version_notes,
            guardrail_preset_ids
        } = body;

        if (!name || !category) {
            return NextResponse.json({ error: "Name and Category are required" }, { status: 400 });
        }

        const id = "prompt-" + nanoid(10);
        const now = new Date().toISOString();

        // Validate input_fields JSON string if provided
        if (input_fields) {
            try {
                JSON.parse(input_fields);
            } catch {
                return NextResponse.json({ error: "Invalid input_fields format. Must be a JSON array string." }, { status: 400 });
            }
        }

        const insertStmt = db.prepare(`
            INSERT INTO prompt_templates (
                id, name, category, purpose, role, context, input_fields,
                instructions, constraints, output_format, review_checklist, notes,
                status, version, version_notes, guardrail_preset_ids, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        insertStmt.run(
            id,
            name,
            category,
            purpose || null,
            role || null,
            context || null,
            input_fields || "[]",
            instructions || null,
            constraints || null,
            output_format || null,
            review_checklist || null,
            notes || null,
            status || "draft",
            version || "1.0.0",
            version_notes || null,
            guardrail_preset_ids || "[]",
            now,
            now
        );

        const newTemplate = db.prepare("SELECT * FROM prompt_templates WHERE id = ?").get(id);
        return NextResponse.json(newTemplate);
    } catch (e) {
        console.error("POST /api/prompt-templates failed:", e);
        return NextResponse.json({ error: "Failed to create prompt template" }, { status: 500 });
    }
}
