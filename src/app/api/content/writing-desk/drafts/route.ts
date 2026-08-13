export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db/db";
import { nanoid } from "nanoid";
import { z } from "zod";
import { humanMutationGuard } from "@/lib/human-auth/mutationGuard";
import { toErrorMessage } from "@/lib/error";

const DraftSchema = z.object({
    topic_id: z.string().optional().nullable(),
    topic_title: z.string().min(1),
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
    ]),
    draft_stage: z.enum(['working', 'reviewed', 'ready_to_export', 'exported', 'archived']).default('working'),
    writing_mode: z.enum(['draft', 'rewrite', 'polish', 'review', 'voice_extract', 'claim_check']).default('draft'),
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
    body: z.string().default(''),
    notes: z.string().optional().nullable(),
    linked_task_id: z.string().optional().nullable(),
});

export async function GET(req: NextRequest) {
    try {
        const url = new URL(req.url);
        const topic_id = url.searchParams.get("topic_id");
        const limit = parseInt(url.searchParams.get("limit") ?? "50", 10);

        let query = "SELECT * FROM writing_desk_drafts";
        const params: any[] = [];

        if (topic_id) {
            query += " WHERE topic_id = ?";
            params.push(topic_id);
        }

        query += " ORDER BY updated_at DESC LIMIT ?";
        params.push(limit);

        const rows = getDb().prepare(query).all(...params);
        return NextResponse.json(rows);
    } catch (e) {
        return NextResponse.json({ error: toErrorMessage(e) }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    const authGuard = humanMutationGuard(req);
    if (authGuard instanceof NextResponse) return authGuard;
    try {
        const body = await req.json();
        const parsed = DraftSchema.safeParse(body);

        if (!parsed.success) {
            return NextResponse.json({ error: "Invalid payload", details: parsed.error.flatten() }, { status: 400 });
        }

        const data = parsed.data;
        const id = nanoid();
        const now = new Date().toISOString();

        getDb().prepare(`
            INSERT INTO writing_desk_drafts (
                id, topic_id, topic_title, content_type, draft_stage,
                writing_mode, source_step, body, notes, linked_task_id,
                created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
            id,
            data.topic_id ?? null,
            data.topic_title,
            data.content_type,
            data.draft_stage,
            data.writing_mode,
            data.source_step ?? null,
            data.body,
            data.notes ?? null,
            data.linked_task_id ?? null,
            now,
            now
        );

        const created = getDb().prepare("SELECT * FROM writing_desk_drafts WHERE id = ?").get(id);
        return NextResponse.json(created, { status: 201 });
    } catch (e) {
        return NextResponse.json({ error: toErrorMessage(e) }, { status: 500 });
    }
}
