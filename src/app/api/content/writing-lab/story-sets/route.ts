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
