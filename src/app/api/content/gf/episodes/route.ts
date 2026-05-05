import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db/db";

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const seasonId = searchParams.get("seasonId");
    const db = getDb();
    
    let sql = "SELECT * FROM episodes";
    const params: any[] = [];
    
    if (seasonId) {
        sql += " WHERE season_id = ?";
        params.push(seasonId);
    }
    
    sql += " ORDER BY episode_no ASC";
    
    const episodes = db.prepare(sql).all(...params);
    return NextResponse.json(episodes);
}
