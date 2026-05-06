import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db/db";
import { nanoid } from "nanoid";

// Whitelist of columns that are safe to update via PATCH
const ALLOWED_FIELDS = new Set([
    "title", "article_title", "topic_title", "slug", "status", "publish_status", "publish_date",
    "current_step", "season_id", "episode_id", "article_type",
    "website_url", "website_draft_url", "final_url",
    "utm_group", "utm_page", "utm_personal",
    "publish_pack_status", "group_post_status", "page_post_status",
    "personal_post_status", "hashtags_status", "publish_log_status",
    "canva_status", "image_folder", "references_status",
    "seo_status", "schema_status", "ready_to_publish",
    "meta_title", "meta_description", "keywords",
    "content_layer", "article_role", "story_set", "story_order", "narrative_status",
    "next_action", "notes", "priority",
    "primary_system", "secondary_systems",
    "body_markdown", "read_more_markdown", "faq_markdown", "references_markdown", "article_markdown",
]);

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ topicId: string }> }
) {
    try {
        const { topicId } = await params;
        if (!topicId) {
            return NextResponse.json({ found: false, error: "Missing topicId" }, { status: 400 });
        }

        const db = getDb();
        const article = db.prepare("SELECT * FROM articles WHERE topic_id = ?").get(topicId);

        if (!article) {
            return NextResponse.json({ found: false });
        }

        return NextResponse.json({ found: true, article });
    } catch (err) {
        console.error("[GET /api/content/articles/:topicId] Error:", err);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ topicId: string }> }
) {
    try {
        const { topicId } = await params;

        if (!topicId || topicId === "null" || topicId === "undefined") {
            return NextResponse.json(
                { ok: false, error: "Invalid topicId — must be a valid GF-CONTENT-### string" },
                { status: 400 }
            );
        }

        const body = await req.json();
        const db = getDb();
        const now = new Date().toISOString();

        // Filter to only allowed fields
        const fields = Object.keys(body).filter(k => ALLOWED_FIELDS.has(k));

        // 1. Try to find an existing row by topic_id
        let existing = db
            .prepare("SELECT article_id FROM articles WHERE topic_id = ?")
            .get(topicId) as { article_id: string } | undefined;

        // 2. If not found by topic_id, check if there is a null-topic_id row whose
        //    title contains the topicId code — repair it in place rather than creating a duplicate
        if (!existing) {
            const orphan = db
                .prepare("SELECT article_id FROM articles WHERE topic_id IS NULL AND title LIKE ?")
                .get(`%${topicId}%`) as { article_id: string } | undefined;

            if (orphan) {
                // Repair the orphan row by setting its topic_id
                db.prepare("UPDATE articles SET topic_id = ?, updated_at = ? WHERE article_id = ?")
                    .run(topicId, now, orphan.article_id);
                existing = orphan;
                console.log(`[PATCH articles] Repaired orphan row ${orphan.article_id} → topic_id = ${topicId}`);
            }
        }

        const processValue = (k: string, v: unknown) => {
            if (k === "keywords" || k === "secondary_systems") {
                if (Array.isArray(v)) return v.join(",");
            }
            return v;
        };

        if (!existing) {
            // Create a minimal new article row
            const articleId = nanoid();
            const insertFields = fields.length > 0 ? fields : [];
            const columns = insertFields.length > 0 ? `, ${insertFields.join(", ")}` : "";
            const placeholders = insertFields.length > 0 ? `, ${insertFields.map(() => "?").join(", ")}` : "";
            const values: unknown[] = [
                articleId,
                topicId,
                ...insertFields.map(f => processValue(f, body[f])),
                now,
                now,
            ];

            // Ensure title exists
            const titleVal = (body.title as string | undefined) || topicId;
            if (!insertFields.includes("title")) {
                db.prepare(
                    `INSERT INTO articles (article_id, topic_id, title${columns}, created_at, updated_at)
                     VALUES (?, ?, ?${placeholders}, ?, ?)`
                ).run(articleId, topicId, titleVal, ...insertFields.map(f => processValue(f, body[f])), now, now);
            } else {
                db.prepare(
                    `INSERT INTO articles (article_id, topic_id${columns}, created_at, updated_at)
                     VALUES (?, ?${placeholders}, ?, ?)`
                ).run(...values);
            }

            const newRecord = db.prepare("SELECT * FROM articles WHERE article_id = ?").get(articleId);
            return NextResponse.json({ ok: true, article: newRecord });
        }

        // Update existing row
        if (fields.length === 0) {
            const record = db.prepare("SELECT * FROM articles WHERE topic_id = ?").get(topicId);
            return NextResponse.json({ ok: true, article: record });
        }

        const setClause = fields.map(f => `${f} = ?`).join(", ");
        const updateValues = [...fields.map(f => processValue(f, body[f])), now, topicId];

        db.prepare(`UPDATE articles SET ${setClause}, updated_at = ? WHERE topic_id = ?`)
            .run(...updateValues);

        const updatedRecord = db.prepare("SELECT * FROM articles WHERE topic_id = ?").get(topicId);
        return NextResponse.json({ ok: true, article: updatedRecord });

    } catch (err) {
        console.error("[PATCH /api/content/articles/:topicId] Error:", err);
        return NextResponse.json(
            { ok: false, error: String(err) },
            { status: 500 }
        );
    }
}
