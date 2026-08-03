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
      group_post_markdown,
      page_post_markdown,
      personal_post_markdown,
      social_caption,
      hashtags,
      tone_profile,
      web_voice_guideline,
      group_voice_guideline,
      page_voice_guideline,
      personal_voice_guideline,
      claim_guardrail_note,
      attached_to,
      narrative_body,
      knowledge_body,
      narrative_title,
      narrative_slug,
      narrative_hero_subtitle,
      narrative_featured_image_url,
      narrative_short_summary,
      narrative_meta_title,
      narrative_meta_description,
      narrative_keywords,
      narrative_schema_jsonld,
      narrative_status,
      narrative_editors_pick,
      narrative_related_knowledge_article,
      narrative_journey_stage,
      knowledge_title,
      knowledge_slug,
      knowledge_hero_subtitle,
      knowledge_featured_image_url,
      knowledge_short_summary,
      knowledge_meta_title,
      knowledge_meta_description,
      knowledge_keywords,
      knowledge_schema_jsonld,
      knowledge_status,
      knowledge_editors_pick,
      knowledge_related_narrative_article,
      knowledge_primary_keyword,
      knowledge_secondary_keywords,
      knowledge_category
    } = body;

    db.prepare(`
      INSERT INTO gf_writing_projects (
        id, topic_id, title, slug, story_set_id, episode_id, 
        writing_mode, episode_role, journey_stage, status, 
        summary, notes, meta_title, meta_description, keywords,
        excerpt, internal_links_notes, references_notes,
        group_post_markdown, page_post_markdown, personal_post_markdown,
        social_caption, hashtags,
        tone_profile, web_voice_guideline, group_voice_guideline, page_voice_guideline, personal_voice_guideline, claim_guardrail_note,
        attached_to, narrative_body, knowledge_body,
        narrative_title, narrative_slug, narrative_hero_subtitle, narrative_featured_image_url,
        narrative_short_summary, narrative_meta_title, narrative_meta_description, narrative_keywords,
        narrative_schema_jsonld, narrative_status, narrative_editors_pick, narrative_related_knowledge_article, narrative_journey_stage,
        knowledge_title, knowledge_slug, knowledge_hero_subtitle, knowledge_featured_image_url,
        knowledge_short_summary, knowledge_meta_title, knowledge_meta_description, knowledge_keywords,
        knowledge_schema_jsonld, knowledge_status, knowledge_editors_pick, knowledge_related_narrative_article,
        knowledge_primary_keyword, knowledge_secondary_keywords, knowledge_category,
        created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
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
      group_post_markdown || null,
      page_post_markdown || null,
      personal_post_markdown || null,
      social_caption || null,
      hashtags || null,
      tone_profile || null,
      web_voice_guideline || null,
      group_voice_guideline || null,
      page_voice_guideline || null,
      personal_voice_guideline || null,
      claim_guardrail_note || null,
      attached_to || null,
      narrative_body || null,
      knowledge_body || null,
      narrative_title || null,
      narrative_slug || null,
      narrative_hero_subtitle || null,
      narrative_featured_image_url || null,
      narrative_short_summary || null,
      narrative_meta_title || null,
      narrative_meta_description || null,
      narrative_keywords || null,
      narrative_schema_jsonld || null,
      narrative_status || 'draft',
      narrative_editors_pick || 0,
      narrative_related_knowledge_article || null,
      narrative_journey_stage || null,
      knowledge_title || null,
      knowledge_slug || null,
      knowledge_hero_subtitle || null,
      knowledge_featured_image_url || null,
      knowledge_short_summary || null,
      knowledge_meta_title || null,
      knowledge_meta_description || null,
      knowledge_keywords || null,
      knowledge_schema_jsonld || null,
      knowledge_status || 'draft',
      knowledge_editors_pick || 0,
      knowledge_related_narrative_article || null,
      knowledge_primary_keyword || null,
      knowledge_secondary_keywords || null,
      knowledge_category || null
    );

    return NextResponse.json({ id });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
