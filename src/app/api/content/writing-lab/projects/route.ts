import { NextResponse } from "next/server";
import { db } from "@/db/db";
import crypto from "crypto";

export async function GET() {
  try {
    const projects = db.prepare(`
      SELECT p.*, s.title as story_set_title, e.title as episode_title, e.role as episode_role
      FROM gf_writing_projects p
      LEFT JOIN gf_story_sets s ON p.story_set_id = s.id
      LEFT JOIN gf_episodes e ON p.episode_id = e.id
      ORDER BY p.updated_at DESC
    `).all();
    return NextResponse.json(projects);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const id = `WP-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
    const { title, story_set_id, episode_id, writing_mode } = body;

    db.prepare(`
      INSERT INTO gf_writing_projects (id, title, story_set_id, episode_id, writing_mode, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, 'draft', datetime('now'), datetime('now'))
    `).run(id, title, story_set_id, episode_id, writing_mode);

    return NextResponse.json({ id });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
