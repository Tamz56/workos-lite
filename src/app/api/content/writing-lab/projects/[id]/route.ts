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
      "internal_links_notes", "references_notes"
    ];

    const updates: string[] = [];
    const values: any[] = [];

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updates.push(`${field} = ?`);
        values.push(body[field]);
      }
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    updates.push("updated_at = datetime('now')");
    values.push(id);

    const sql = `UPDATE gf_writing_projects SET ${updates.join(", ")} WHERE id = ?`;
    console.log(`Updating project ${id} with SQL: ${sql}`, values);
    db.prepare(sql).run(...values);

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
