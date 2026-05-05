import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db/db";

export async function GET(req: NextRequest) {
    const db = getDb();
    const articles = db.prepare(`
        SELECT a.*, e.episode_title, s.season_title 
        FROM articles a
        LEFT JOIN episodes e ON a.episode_id = e.episode_id
        LEFT JOIN seasons s ON a.season_id = s.season_id
        ORDER BY a.updated_at DESC
    `).all();
    return NextResponse.json(articles);
}
