import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/db";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const note = db.prepare("SELECT * FROM notes WHERE id = ?").get(id);
        if (!note) return NextResponse.json({ error: "Note not found" }, { status: 404 });
        return NextResponse.json(note);
    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: "Failed to fetch note" }, { status: 500 });
    }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const body = await req.json();
        const { title, content_json, content_html, plain_text, project_id } = body;

        const updates: string[] = [];
        const values: any[] = [];

        if (title !== undefined) { updates.push("title = ?"); values.push(title); }
        if (content_json !== undefined) { updates.push("content_json = ?"); values.push(content_json); }
        if (content_html !== undefined) { updates.push("content_html = ?"); values.push(content_html); }
        if (plain_text !== undefined) { updates.push("plain_text = ?"); values.push(plain_text); }
        if (project_id !== undefined) { updates.push("project_id = ?"); values.push(project_id); }

        if (updates.length > 0) {
            updates.push("updated_at = ?");
            values.push(new Date().toISOString());
            
            const query = `UPDATE notes SET ${updates.join(", ")} WHERE id = ?`;
            db.prepare(query).run(...values, id);
        }

        const note = db.prepare("SELECT * FROM notes WHERE id = ?").get(id);
        return NextResponse.json(note);
    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: "Failed to update note" }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        db.prepare("DELETE FROM notes WHERE id = ?").run(id);
        return NextResponse.json({ success: true });
    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: "Failed to delete note" }, { status: 500 });
    }
}
