import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db/db";
import { PatchAIResourceProfileSchema } from "@/lib/assignment/resourceValidation";

export const dynamic = "force-dynamic";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const db = getDb();
        if (!db.prepare("SELECT id FROM ai_resource_profiles WHERE id = ?").get(id)) return NextResponse.json({ error: "AI resource profile not found." }, { status: 404 });
        const parsed = PatchAIResourceProfileSchema.safeParse(await request.json());
        if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Validation failed", details: parsed.error.flatten() }, { status: 400 });
        const updates: string[] = []; const values: unknown[] = [];
        for (const key of ["display_name", "availability", "remaining_percent", "reset_at", "cost_tier", "notes"] as const) {
            if (parsed.data[key] !== undefined) { updates.push(`${key} = ?`); values.push(parsed.data[key]); }
        }
        if (updates.length) { values.push(id); db.prepare(`UPDATE ai_resource_profiles SET ${updates.join(", ")} WHERE id = ?`).run(...values); }
        return NextResponse.json(db.prepare("SELECT * FROM ai_resource_profiles WHERE id = ?").get(id));
    } catch (error) {
        return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to update AI resource." }, { status: 500 });
    }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const result = getDb().prepare("DELETE FROM ai_resource_profiles WHERE id = ?").run(id);
        if (!result.changes) return NextResponse.json({ error: "AI resource profile not found." }, { status: 404 });
        return NextResponse.json({ deleted: true, id });
    } catch (error) {
        return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to delete AI resource." }, { status: 500 });
    }
}
