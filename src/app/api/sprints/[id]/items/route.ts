import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db/db";
import { z } from "zod";

const AttachSprintItemSchema = z.object({
    project_item_id: z.string().min(1)
});

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
    try {
        const db = getDb();
        const query = `
            SELECT pi.* 
            FROM project_items pi
            JOIN sprint_items si ON pi.id = si.project_item_id
            WHERE si.sprint_id = ?
            ORDER BY pi.status ASC, pi.priority DESC
        `;
        const items = db.prepare(query).all(params.id);
        return NextResponse.json(items);
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
    try {
        const db = getDb();
        const body = await req.json();
        const parsed = AttachSprintItemSchema.parse(body);

        const stmt = db.prepare(`
            INSERT OR IGNORE INTO sprint_items (sprint_id, project_item_id)
            VALUES (?, ?)
        `);
        stmt.run(params.id, parsed.project_item_id);

        return NextResponse.json({ success: true });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 400 });
    }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
    try {
        const db = getDb();
        const url = new URL(req.url);
        const itemId = url.searchParams.get("item_id");

        if (!itemId) {
            return NextResponse.json({ error: "item_id is required" }, { status: 400 });
        }

        db.prepare("DELETE FROM sprint_items WHERE sprint_id = ? AND project_item_id = ?").run(params.id, itemId);

        return NextResponse.json({ success: true });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
