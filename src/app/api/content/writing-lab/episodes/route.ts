import { NextResponse } from "next/server";
import { db } from "@/db/db";
import crypto from "crypto";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const storySetId = searchParams.get("story_set_id");

    let query = "SELECT * FROM gf_episodes";
    const params: any[] = [];

    if (storySetId) {
      query += " WHERE story_set_id = ?";
      params.push(storySetId);
    }

    query += " ORDER BY sort_order ASC, created_at ASC";
    const episodes = db.prepare(query).all(params);

    return NextResponse.json(episodes);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const id = `EP-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
    const { 
      title, 
      story_set_id, 
      role, 
      slug, 
      description, 
      journey_stage, 
      attached_to_episode_id,
      sort_order,
      narrative_status,
      status
    } = body;

    db.prepare(`
      INSERT INTO gf_episodes (
        id, 
        story_set_id, 
        title, 
        slug, 
        description, 
        role, 
        journey_stage, 
        attached_to_episode_id, 
        sort_order, 
        narrative_status, 
        status, 
        created_at, 
        updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `).run(
      id, 
      story_set_id, 
      title, 
      slug || null, 
      description || null, 
      role, 
      journey_stage || null, 
      attached_to_episode_id || null, 
      sort_order || 0, 
      narrative_status || 'unmapped', 
      status || 'idea'
    );

    return NextResponse.json({ id });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
