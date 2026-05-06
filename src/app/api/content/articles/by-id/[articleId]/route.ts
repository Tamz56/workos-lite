import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db/db";

export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ articleId: string }> }
) {
    try {
        const { articleId } = await params;

        if (!articleId) {
            return NextResponse.json({ ok: false, error: "Missing articleId" }, { status: 400 });
        }

        const db = getDb();

        // Safety: only delete from articles table — never touch tasks, seasons, or episodes
        const existing = db
            .prepare("SELECT article_id, topic_id, title FROM articles WHERE article_id = ?")
            .get(articleId) as { article_id: string; topic_id: string | null; title: string } | undefined;

        if (!existing) {
            return NextResponse.json({ ok: false, error: "Article not found" }, { status: 404 });
        }

        db.prepare("DELETE FROM articles WHERE article_id = ?").run(articleId);

        console.log(`[DELETE /api/content/articles/by-id/${articleId}] Deleted: "${existing.title}" (topic_id: ${existing.topic_id ?? "null"})`);

        return NextResponse.json({ ok: true, deleted: { article_id: articleId, title: existing.title } });
    } catch (err) {
        console.error("[DELETE /api/content/articles/by-id/:articleId] Error:", err);
        return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
    }
}
