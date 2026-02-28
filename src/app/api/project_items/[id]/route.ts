import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db/db";
import { z } from "zod";

const UpdateProjectItemSchema = z.object({
    title: z.string().min(1).optional(),
    status: z.enum(["inbox", "planned", "done"]).optional(),
    priority: z.number().int().nullable().optional(),
    schedule_bucket: z.enum(["morning", "afternoon", "evening", "none"]).nullable().optional(),
    start_date: z.string().nullable().optional(),
    end_date: z.string().nullable().optional(),
    is_milestone: z.union([z.boolean(), z.number()]).transform(v => (v ? 1 : 0)).optional(),
    workstream: z.string().nullable().optional(),
    dod_text: z.string().nullable().optional(),
    notes: z.string().nullable().optional()
});

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
    try {
        const db = getDb();
        const item = db.prepare("SELECT * FROM project_items WHERE id = ?").get(params.id);
        if (!item) return NextResponse.json({ error: "Project item not found" }, { status: 404 });

        const body = await req.json();
        const parsed = UpdateProjectItemSchema.parse(body);

        const sets: string[] = [];
        const bind: Record<string, any> = { id: params.id };

        const maybeSet = (k: string, v: unknown) => { sets.push(`${k} = @${k}`); bind[k] = v; };

        if (parsed.title !== undefined) maybeSet("title", parsed.title);
        if (parsed.status !== undefined) maybeSet("status", parsed.status);
        if (parsed.priority !== undefined) maybeSet("priority", parsed.priority);
        if (parsed.schedule_bucket !== undefined) maybeSet("schedule_bucket", parsed.schedule_bucket);
        if (parsed.start_date !== undefined) maybeSet("start_date", parsed.start_date);
        if (parsed.end_date !== undefined) maybeSet("end_date", parsed.end_date);
        if (parsed.is_milestone !== undefined) maybeSet("is_milestone", parsed.is_milestone);
        if (parsed.workstream !== undefined) maybeSet("workstream", parsed.workstream);
        if (parsed.dod_text !== undefined) maybeSet("dod_text", parsed.dod_text);
        if (parsed.notes !== undefined) maybeSet("notes", parsed.notes);

        if (sets.length === 0) {
            return NextResponse.json(item);
        }

        const sql = `UPDATE project_items SET ${sets.join(", ")} WHERE id = @id`;
        db.prepare(sql).run(bind);

        const updated = db.prepare("SELECT * FROM project_items WHERE id = ?").get(params.id);
        return NextResponse.json(updated);
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 400 });
    }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
    try {
        const db = getDb();
        const info = db.prepare("DELETE FROM project_items WHERE id = ?").run(params.id);
        if (info.changes === 0) {
            return NextResponse.json({ error: "Project item not found" }, { status: 404 });
        }
        return NextResponse.json({ success: true });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
