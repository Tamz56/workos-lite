import { NextResponse } from "next/server";
import { db } from "@/db/db";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
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

    if (updates.length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    updates.push("updated_at = datetime('now')");
    values.push(id);

    const sql = `UPDATE gf_episodes SET ${updates.join(", ")} WHERE id = ?`;
    db.prepare(sql).run(...values);

    const updatedEpisode = db.prepare("SELECT * FROM gf_episodes WHERE id = ?").get(id);
    return NextResponse.json(updatedEpisode);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
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
