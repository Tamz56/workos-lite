import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/db";
import { humanMutationGuard } from "@/lib/human-auth/mutationGuard";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authGuard = humanMutationGuard(req);
  if (authGuard instanceof NextResponse) return authGuard;
  const { id } = await params;
  try {
    const body = await req.json();
    const allowedFields = ["title", "status", "role", "journey_stage", "description", "sort_order", "narrative_status"];
    
    const updates: string[] = [];
    const values: any[] = [];

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updates.push(`${field} = ?`);
        values.push(body[field]);
      }
    }

    if (updates.length === 0 && !body.sync_project_title && body.archive_project === undefined && body.restore_project === undefined) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    const tx = db.transaction(() => {
      if (updates.length > 0) {
        const sql = `UPDATE gf_episodes SET ${updates.join(", ")}, updated_at = datetime('now') WHERE id = ?`;
        db.prepare(sql).run(...values, id);
      }

      // Sync project title if requested and title is provided
      if (body.title !== undefined && body.sync_project_title) {
        db.prepare("UPDATE gf_writing_projects SET title = ?, updated_at = datetime('now') WHERE episode_id = ?").run(body.title, id);
      }

      // Archive project if requested
      if (body.status === "archived" && body.archive_project) {
        db.prepare("UPDATE gf_writing_projects SET status = 'archived', updated_at = datetime('now') WHERE episode_id = ?").run(id);
      }

      // Restore project to 'draft' if requested
      if (body.status !== "archived" && body.status !== undefined && body.restore_project) {
        db.prepare("UPDATE gf_writing_projects SET status = 'draft', updated_at = datetime('now') WHERE episode_id = ? AND status = 'archived'").run(id);
      }
    });

    tx();

    const updatedEpisode = db.prepare("SELECT * FROM gf_episodes WHERE id = ?").get(id);
    return NextResponse.json(updatedEpisode);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authGuard = humanMutationGuard(req);
  if (authGuard instanceof NextResponse) return authGuard;
  const { id } = await params;
  try {
    // Transactional delete: Projects (which will cascade to blocks) then Episode
    const deleteProjects = db.prepare("DELETE FROM gf_writing_projects WHERE episode_id = ?");
    const deleteEpisode = db.prepare("DELETE FROM gf_episodes WHERE id = ?");

    const tx = db.transaction(() => {
      deleteProjects.run(id);
      deleteEpisode.run(id);
    });

    tx();
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
