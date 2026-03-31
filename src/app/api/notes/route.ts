import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/db";
import { nanoid } from "nanoid";

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const projectId = searchParams.get("project_id");
        const taskId = searchParams.get("task_id");
        const q = searchParams.get("q");

        let query = "SELECT * FROM notes WHERE 1=1";
        let params: any[] = [];

        if (taskId) {
            query = `
                SELECT n.* FROM notes n
                JOIN note_links nl ON n.id = nl.note_id
                WHERE nl.linked_entity_type = 'task' AND nl.linked_entity_id = ?
            `;
            params = [taskId];
        } else {
            if (projectId) {
                query += " AND project_id = ?";
                params.push(projectId);
            }
            if (q) {
                query += " AND (title LIKE ? ESCAPE '\\' OR plain_text LIKE ? ESCAPE '\\')";
                const escapedQ = `%${q.replace(/[%_\\]/g, "\\$&")}%`;
                params.push(escapedQ, escapedQ);
            }
        }

        query += " ORDER BY updated_at DESC";
        const notes = db.prepare(query).all(...params);
        return NextResponse.json(notes);
    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: "Failed to fetch notes" }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { title, content_json, content_html, plain_text, project_id, linked_task_id } = body;

        const id = nanoid();
        const now = new Date().toISOString();

        const insertNote = db.prepare(`
            INSERT INTO notes (id, title, content_json, content_html, plain_text, project_id, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `);

        db.transaction(() => {
            insertNote.run(id, title || "Untitled Note", content_json, content_html, plain_text, project_id || null, now, now);

            if (linked_task_id) {
                const linkId = nanoid();
                db.prepare(`
                    INSERT INTO note_links (id, note_id, linked_entity_type, linked_entity_id, created_at)
                    VALUES (?, ?, 'task', ?, ?)
                `).run(linkId, id, linked_task_id, now);
            }
        })();

        const note = db.prepare("SELECT * FROM notes WHERE id = ?").get(id);
        return NextResponse.json(note);
    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: "Failed to create note" }, { status: 500 });
    }
}
