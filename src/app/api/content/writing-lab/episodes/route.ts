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
    const { 
      episode_code,
      id: customId,
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

    const id = (episode_code || customId || `EP-${crypto.randomBytes(4).toString("hex").toUpperCase()}`).trim();

    // Check conflict
    const existing = db.prepare("SELECT id FROM gf_episodes WHERE id = ?").get(id);
    if (existing) {
      return NextResponse.json({ error: `Episode code "${id}" already exists.` }, { status: 409 });
    }

    const projId = `PROJ-${id}`;

    const runTx = db.transaction(() => {
      // 1. Insert Episode
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
        status || 'planned'
      );

      // 2. Insert writing project
      db.prepare(`
        INSERT INTO gf_writing_projects (
          id, 
          episode_id, 
          story_set_id, 
          title, 
          writing_mode, 
          status, 
          notes, 
          created_at, 
          updated_at
        )
        VALUES (?, ?, ?, ?, 'journey_chapter', 'draft', '{}', datetime('now'), datetime('now'))
      `).run(projId, id, story_set_id, title);

      // 3. Insert 5 default blocks
      const blockTemplates = [
        { label: "Article Body", placeholder: "เขียนเนื้อหาตอนหลักในรูปแบบ Markdown ที่นี่..." },
        { label: "Social Drafts", placeholder: "เขียนข้อความโซเชียลที่นี่..." },
        { label: "SEO & Website Fields", placeholder: "ระบุรายละเอียด SEO ที่นี่..." },
        { label: "UTM / Publish", placeholder: "กำหนดรายละเอียด UTM ที่นี่..." },
        { label: "Arbor Review", placeholder: "ผลการวิเคราะห์ Arbor Review..." }
      ];

      const insertBlock = db.prepare(`
        INSERT INTO gf_writing_blocks (
          id, 
          project_id, 
          writing_project_id, 
          type, 
          block_type, 
          label, 
          placeholder, 
          content, 
          content_md, 
          sort_order
        )
        VALUES (?, ?, ?, 'text', 'text', ?, ?, '', '', ?)
      `);

      blockTemplates.forEach((template, index) => {
        const blockId = `BLK-${id}-${index + 1}`;
        insertBlock.run(blockId, projId, projId, template.label, template.placeholder, index);
      });
    });

    runTx();

    const createdEpisode = db.prepare(`
      SELECT 
        e.id, 
        e.title, 
        e.story_set_id, 
        s.title as story_set_title, 
        e.role, 
        e.status, 
        e.journey_stage,
        p.id as writing_project_id
      FROM gf_episodes e
      LEFT JOIN gf_story_sets s ON e.story_set_id = s.id
      LEFT JOIN gf_writing_projects p ON e.id = p.episode_id
      WHERE e.id = ?
    `).get(id);

    return NextResponse.json(createdEpisode);
  } catch (error: any) {
    console.error("Failed to create episode & project structure:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
