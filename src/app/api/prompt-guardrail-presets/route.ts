import { NextResponse } from "next/server";
import { db } from "@/db/db";

interface DBGuardrailPreset {
    id: string;
    name: string;
    category: string;
    description: string;
    content: string;
    risk_words: string | null;
    is_active: number;
    created_at: string;
    updated_at: string;
}

export async function GET() {
    try {
        const query = "SELECT * FROM guardrail_presets WHERE is_active = 1 ORDER BY category ASC, name ASC";
        const presets = db.prepare(query).all() as DBGuardrailPreset[];
        return NextResponse.json(presets);
    } catch (e) {
        console.error("GET /api/prompt-guardrail-presets failed:", e);
        return NextResponse.json({ error: "Failed to fetch guardrail presets" }, { status: 500 });
    }
}
