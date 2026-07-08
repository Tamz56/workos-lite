import { NextResponse } from "next/server";
import { db } from "@/db/db";

export async function PATCH(
  req: Request,
  props: { params: Promise<{ id: string }> }
) {
  const { id } = await props.params;
  try {
    const body = await req.json();
    console.log(`PATCH project ${id} body:`, body);
    const allowedFields = [
      "title", "slug", "status", "summary", "notes",
      "meta_title", "meta_description", "keywords", "excerpt",
      "internal_links_notes", "references_notes",
      "group_post_markdown", "page_post_markdown", "personal_post_markdown",
      "social_caption", "hashtags",
      "tone_profile", "web_voice_guideline", "group_voice_guideline", 
      "page_voice_guideline", "personal_voice_guideline", "claim_guardrail_note",
      "narrative_body", "knowledge_body",
      "narrative_title", "narrative_slug", "narrative_hero_subtitle", "narrative_featured_image_url",
      "narrative_short_summary", "narrative_meta_title", "narrative_meta_description", "narrative_keywords",
      "narrative_schema_jsonld", "narrative_status", "narrative_editors_pick", "narrative_related_knowledge_article", "narrative_journey_stage",
      "knowledge_title", "knowledge_slug", "knowledge_hero_subtitle", "knowledge_featured_image_url",
      "knowledge_short_summary", "knowledge_meta_title", "knowledge_meta_description", "knowledge_keywords",
      "knowledge_schema_jsonld", "knowledge_status", "knowledge_editors_pick", "knowledge_related_narrative_article",
      "knowledge_primary_keyword", "knowledge_secondary_keywords", "knowledge_category"
    ];

    const updates: string[] = [];
    const values: any[] = [];

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updates.push(`${field} = ?`);
        values.push(body[field]);
      }
    }

    if (updates.length === 0 && body.archive_episode === undefined && body.restore_episode === undefined) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    const tx = db.transaction(() => {
      if (updates.length > 0) {
        const localUpdates = [...updates, "updated_at = datetime('now')"];
        const localValues = [...values, id];
        const sql = `UPDATE gf_writing_projects SET ${localUpdates.join(", ")} WHERE id = ?`;
        console.log(`Updating project ${id} with SQL: ${sql}`, localValues);
        db.prepare(sql).run(...localValues);
      }

      // Archive episode if requested
      if (body.status === "archived" && body.archive_episode) {
        const project = db.prepare("SELECT episode_id FROM gf_writing_projects WHERE id = ?").get(id) as { episode_id: string | null } | undefined;
        if (project?.episode_id) {
          db.prepare("UPDATE gf_episodes SET status = 'archived', updated_at = datetime('now') WHERE id = ?").run(project.episode_id);
        }
      }

      // Restore episode if requested (to 'idea' status)
      if (body.status !== "archived" && body.status !== undefined && body.restore_episode) {
        const project = db.prepare("SELECT episode_id FROM gf_writing_projects WHERE id = ?").get(id) as { episode_id: string | null } | undefined;
        if (project?.episode_id) {
          db.prepare("UPDATE gf_episodes SET status = 'idea', updated_at = datetime('now') WHERE id = ? AND status = 'archived'").run(project.episode_id);
        }
      }
    });

    tx();

    const updatedProject = db.prepare(`
      SELECT p.*,
        COALESCE(p.episode_role, e.role) as episode_role,
        COALESCE(p.journey_stage, e.journey_stage) as journey_stage,
        s.title as story_set_title,
        e.title as episode_title
      FROM gf_writing_projects p
      LEFT JOIN gf_story_sets s ON p.story_set_id = s.id
      LEFT JOIN gf_episodes e ON p.episode_id = e.id
      WHERE p.id = ?
    `).get(id);

    return NextResponse.json(updatedProject);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  props: { params: Promise<{ id: string }> }
) {
  const { id } = await props.params;
  try {
    // Delete projects (cascade will handle blocks because of FK ON DELETE CASCADE)
    db.prepare("DELETE FROM gf_writing_projects WHERE id = ?").run(id);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
