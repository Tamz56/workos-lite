import { NextResponse } from "next/server";
import { db } from "@/db/db";

export async function GET() {
  try {
    const storySets = db.prepare("SELECT * FROM gf_story_sets ORDER BY created_at ASC").all();
    const episodes = db.prepare("SELECT * FROM gf_episodes ORDER BY created_at ASC").all();

    const data = (storySets as any[]).map(ss => ({
      ...ss,
      episodes: (episodes as any[]).filter(ep => ep.story_set_id === ss.id)
    }));

    return NextResponse.json(data);
  } catch (error: any) {
    console.error("Fetch story sets failed", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const crypto = await import("crypto");
    const body = await req.json();
    const { title, description, status } = body;
    if (!title) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }
    const id = `STORY-SET-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
    db.prepare(`
      INSERT INTO gf_story_sets (id, title, description, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))
    `).run(id, title, description || null, status || 'active');
    
    return NextResponse.json({ success: true, id });
  } catch (error: any) {
    console.error("Create story set failed", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
