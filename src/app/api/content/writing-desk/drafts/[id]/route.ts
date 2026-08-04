export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db/db";
import { z } from "zod";
import { toErrorMessage } from "@/lib/error";

const UpdateDraftSchema = z.object({
    topic_id: z.string().optional().nullable(),
    topic_title: z.string().optional(),
    content_type: z.enum([
        'group_post',
        'page_post',
        'personal_post',
        'web_article_section',
        'website_fields',
        'body_markdown',
        'reference_note',
        'schema_jsonld',
        'visual_brief',
        'publish_note',
        'research_raw',
        'research_direction',
        'brief',
        'outline_web_article',
        'script_caption',
        'assets_canva',
        'seo_schema',
        'narrative_article'
    ]).optional(),
    draft_stage: z.enum(['working', 'reviewed', 'ready_to_export', 'exported', 'archived']).optional(),
    writing_mode: z.enum(['draft', 'rewrite', 'polish', 'review', 'voice_extract', 'claim_check']).optional(),
    source_step: z.enum([
        'research_prompt',
        'direction_plan',
        'article_pack',
        'publish_social_pack',
        'research_raw',
        'research_direction',
        'brief',
        'outline_web_article',
        'script_caption',
        'assets_canva',
        'website_publish_pack',
        'publish',
        'narrative_article'
    ]).optional().nullable(),
    body: z.string().optional(),
    notes: z.string().optional().nullable(),
    linked_task_id: z.string().optional().nullable(),
});

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const row = getDb().prepare("SELECT * FROM writing_desk_drafts WHERE id = ?").get(id);
        if (!row) return NextResponse.json({ error: "Draft not found" }, { status: 404 });
        return NextResponse.json(row);
    } catch (e) {
        return NextResponse.json({ error: toErrorMessage(e) }, { status: 500 });
    }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    console.log("PATCH request for ID:", id);
    try {
        const body = await req.json();
        const parsed = UpdateDraftSchema.safeParse(body);

        if (!parsed.success) {
            return NextResponse.json({ error: "Invalid payload", details: parsed.error.flatten() }, { status: 400 });
        }

        const data = parsed.data;
        const now = new Date().toISOString();

        const updates: string[] = [];
        const values: any[] = [];

        Object.entries(data).forEach(([key, value]) => {
            if (value !== undefined) {
                updates.push(`${key} = ?`);
                values.push(value);
            }
        });

        if (updates.length === 0) {
            return NextResponse.json({ error: "No fields to update" }, { status: 400 });
        }

        updates.push("updated_at = ?");
        values.push(now);
        values.push(id);

        const sql = `
            UPDATE writing_desk_drafts
            SET ${updates.join(", ")}
            WHERE id = ?
        `;

        const result = getDb().prepare(sql).run(...values);

        if (result.changes === 0) {
            return NextResponse.json({ error: "Draft not found" }, { status: 404 });
        }

        const updated = getDb().prepare("SELECT * FROM writing_desk_drafts WHERE id = ?").get(id);
        return NextResponse.json(updated);
    } catch (e) {
        return NextResponse.json({ error: toErrorMessage(e) }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const db = getDb();

        // Explicitly delete related reviews (though DB cascade should handle it)
        db.prepare("DELETE FROM arbor_review_results WHERE draft_id = ?").run(id);

        const result = db.prepare("DELETE FROM writing_desk_drafts WHERE id = ?").run(id);
        if (result.changes === 0) {
            return NextResponse.json({ error: "Draft not found" }, { status: 404 });
        }
        return NextResponse.json({ success: true });
    } catch (e) {
        return NextResponse.json({ error: toErrorMessage(e) }, { status: 500 });
    }
}
