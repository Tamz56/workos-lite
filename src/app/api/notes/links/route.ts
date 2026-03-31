import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/db";
import { nanoid } from "nanoid";

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const noteId = searchParams.get("note_id");
        const entityId = searchParams.get("entity_id");
        const entityType = searchParams.get("entity_type");

        let query = "SELECT * FROM note_links WHERE 1=1";
        const params: any[] = [];

        if (noteId) { query += " AND note_id = ?"; params.push(noteId); }
        if (entityId) { query += " AND linked_entity_id = ?"; params.push(entityId); }
        if (entityType) { query += " AND linked_entity_type = ?"; params.push(entityType); }

        const links = db.prepare(query).all(...params);
        return NextResponse.json(links);
    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: "Failed to fetch note links" }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { note_id, linked_entity_type, linked_entity_id } = body;

        if (!note_id || !linked_entity_type || !linked_entity_id) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        const id = nanoid();
        const now = new Date().toISOString();

        db.prepare(`
            INSERT INTO note_links (id, note_id, linked_entity_type, linked_entity_id, created_at)
            VALUES (?, ?, ?, ?, ?)
        `).run(id, note_id, linked_entity_type, linked_entity_id, now);

        const link = db.prepare("SELECT * FROM note_links WHERE id = ?").get(id);
        return NextResponse.json(link);
    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: "Failed to create note link" }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const id = searchParams.get("id");
        const noteId = searchParams.get("note_id");
        const entityId = searchParams.get("entity_id");

        if (id) {
            db.prepare("DELETE FROM note_links WHERE id = ?").run(id);
        } else if (noteId && entityId) {
            db.prepare("DELETE FROM note_links WHERE note_id = ? AND linked_entity_id = ?").run(noteId, entityId);
        } else {
            return NextResponse.json({ error: "Missing link identifier" }, { status: 400 });
        }

        return NextResponse.json({ success: true });
    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: "Failed to delete note link" }, { status: 500 });
    }
}
