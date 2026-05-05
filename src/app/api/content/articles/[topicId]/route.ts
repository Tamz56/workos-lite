import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db/db";
import { nanoid } from "nanoid";

export async function GET(
    req: NextRequest,
    { params }: { params: { topicId: string } }
) {
    const { topicId } = params;
    const db = getDb();
    
    const article = db.prepare("SELECT * FROM articles WHERE topic_id = ?").get(topicId);
    
    if (!article) {
        return NextResponse.json({ found: false });
    }
    
    return NextResponse.json({ found: true, article });
}

export async function PATCH(
    req: NextRequest,
    { params }: { params: { topicId: string } }
) {
    const { topicId } = params;
    const body = await req.json();
    const db = getDb();
    const now = new Date().toISOString();

    const existing = db.prepare("SELECT article_id FROM articles WHERE topic_id = ?").get(topicId) as { article_id: string } | undefined;

    if (!existing) {
        // Create new article mapping
        const articleId = nanoid();
        const fields = Object.keys(body).filter(k => k !== 'article_id' && k !== 'topic_id');
        const placeholders = fields.map(() => "?").join(", ");
        const columns = fields.join(", ");
        
        const sql = `
            INSERT INTO articles (article_id, topic_id, ${columns}, created_at, updated_at)
            VALUES (?, ?, ${placeholders}, ?, ?)
        `;
        
        const values = [articleId, topicId, ...fields.map(f => body[f]), now, now];
        
        db.prepare(sql).run(...values);
        
        const newRecord = db.prepare("SELECT * FROM articles WHERE article_id = ?").get(articleId);
        return NextResponse.json({ ok: true, article: newRecord });
    } else {
        // Update existing
        const fields = Object.keys(body).filter(k => k !== 'article_id' && k !== 'topic_id' && k !== 'created_at');
        if (fields.length === 0) {
            return NextResponse.json({ ok: true, message: "No fields to update" });
        }
        
        const setClause = fields.map(f => `${f} = ?`).join(", ");
        const sql = `UPDATE articles SET ${setClause}, updated_at = ? WHERE topic_id = ?`;
        const values = [...fields.map(f => body[f]), now, topicId];
        
        db.prepare(sql).run(...values);
        
        const updatedRecord = db.prepare("SELECT * FROM articles WHERE topic_id = ?").get(topicId);
        return NextResponse.json({ ok: true, article: updatedRecord });
    }
}
