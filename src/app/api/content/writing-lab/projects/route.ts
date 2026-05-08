import { NextResponse } from "next/server";
import { db } from "@/db/db";
import crypto from "crypto";

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const projects = db.prepare(`
      SELECT 
        p.*,
        COALESCE(p.episode_role, e.role) as episode_role,
        COALESCE(p.journey_stage, e.journey_stage) as journey_stage,
        s.title as story_set_title,
        e.title as episode_title
      FROM gf_writing_projects p
      LEFT JOIN gf_story_sets s ON p.story_set_id = s.id
      LEFT JOIN gf_episodes e ON p.episode_id = e.id
      ORDER BY p.created_at DESC
    `).all();
    return NextResponse.json(projects);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const id = `PROJ-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
    const { 
      title, 
      topic_id, 
      slug, 
      story_set_id, 
      episode_id, 
      writing_mode, 
      episode_role, 
      journey_stage,
      status,
      summary,
      notes,
      meta_title,
      meta_description,
      keywords,
      excerpt,
      internal_links_notes,
      references_notes,
      attached_to
    } = body;

    db.prepare(`
      INSERT INTO gf_writing_projects (
        id, topic_id, title, slug, story_set_id, episode_id, 
        writing_mode, episode_role, journey_stage, status, 
        summary, notes, meta_title, meta_description, keywords,
        excerpt, internal_links_notes, references_notes,
        attached_to, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `).run(
      id, 
      topic_id || null, 
      title, 
      slug || null, 
      story_set_id || null, 
      episode_id || null, 
      writing_mode, 
      episode_role || null, 
      journey_stage || null, 
      status || 'draft',
      summary || null,
      notes || null,
      meta_title || null,
      meta_description || null,
      keywords || null,
      excerpt || null,
      internal_links_notes || null,
      references_notes || null,
      attached_to || null
    );

    return NextResponse.json({ id });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
