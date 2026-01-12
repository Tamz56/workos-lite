export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/db";

function now() {
    return new Date().toISOString();
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const doc = db.prepare("SELECT * FROM docs WHERE id = ?").get(id) as { id: string; title: string; content_md: string; updated_at: string; created_at: string };
    if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ doc });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const existing = db.prepare("SELECT * FROM docs WHERE id = ?").get(id) as { title: string; content_md: string };
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const title = body.title !== undefined ? String(body.title).trim() : existing.title;
    const content_md = body.content_md !== undefined ? String(body.content_md) : existing.content_md;

    db.prepare("UPDATE docs SET title = ?, content_md = ?, updated_at = ? WHERE id = ?").run(
        title,
        content_md,
        now(),
        id
    );

    const doc = db.prepare("SELECT * FROM docs WHERE id = ?").get(id) as { id: string; title: string; content_md: string; updated_at: string; created_at: string };
    return NextResponse.json({ doc });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    db.prepare("DELETE FROM docs WHERE id = ?").run(id);
    return NextResponse.json({ ok: true });
}
