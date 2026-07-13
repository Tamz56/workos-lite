import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { getDb } from "@/db/db";
import { CreateAIResourceProfileSchema } from "@/lib/assignment/resourceValidation";
import type { AIResourceProfile } from "@/lib/assignment/types";

export const dynamic = "force-dynamic";

export async function GET() {
    try {
        const profiles = getDb().prepare("SELECT * FROM ai_resource_profiles ORDER BY display_name ASC, provider_key ASC").all() as AIResourceProfile[];
        return NextResponse.json({ profiles });
    } catch (error) {
        return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to load AI resources." }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const parsed = CreateAIResourceProfileSchema.safeParse(await request.json());
        if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Validation failed", details: parsed.error.flatten() }, { status: 400 });
        const data = parsed.data;
        const db = getDb();
        if (db.prepare("SELECT id FROM ai_resource_profiles WHERE provider_key = ?").get(data.provider_key)) {
            return NextResponse.json({ error: "This provider_key already exists." }, { status: 409 });
        }
        const id = `AIRES-${nanoid(8).toUpperCase()}`;
        db.prepare(`INSERT INTO ai_resource_profiles (id, provider_key, display_name, availability, remaining_percent, reset_at, cost_tier, notes, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`).run(id, data.provider_key, data.display_name, data.availability, data.remaining_percent ?? null, data.reset_at ?? null, data.cost_tier ?? null, data.notes ?? null);
        return NextResponse.json(db.prepare("SELECT * FROM ai_resource_profiles WHERE id = ?").get(id), { status: 201 });
    } catch (error) {
        return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to create AI resource." }, { status: 500 });
    }
}
