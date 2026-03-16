export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/db";

function now() {
    return new Date().toISOString();
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const doc = db.prepare("SELECT * FROM docs WHERE id = ?").get(id) as { 
        id: string; 
        title: string; 
        content_md: string; 
        project_id: string | null; 
        workspace: string | null; 
        updated_at: string; 
        created_at: string 
    };
    if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ doc });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const existing = db.prepare("SELECT * FROM docs WHERE id = ?").get(id) as { 
        title: string; 
        content_md: string; 
        project_id: string | null; 
        workspace: string | null 
    };
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const title = body.title !== undefined ? String(body.title).trim() : existing.title;
    const content_md = body.content_md !== undefined ? String(body.content_md) : existing.content_md;
    const project_id = body.project_id !== undefined ? (body.project_id ? String(body.project_id) : null) : (existing as any).project_id;
    const workspace = body.workspace !== undefined ? (body.workspace ? String(body.workspace) : null) : (existing as any).workspace;

    db.prepare("UPDATE docs SET title = ?, content_md = ?, project_id = ?, workspace = ?, updated_at = ? WHERE id = ?").run(
        title,
        content_md,
        project_id,
        workspace,
        now(),
        id
    );

    const doc = db.prepare("SELECT * FROM docs WHERE id = ?").get(id);
    return NextResponse.json({ doc });
}

import fs from "fs/promises";
import path from "path";

async function safeUnlink(
    absPath: string,
    ctx: { docId: string; attachmentId?: string; storagePath?: string }
) {
    try {
        await fs.unlink(absPath);
    } catch (err: unknown) {
        const e = err as { code?: string; message?: string };
        if (e?.code === "ENOENT") return; // ignore missing file

        console.error("[delete-doc] unlink failed", {
            ...ctx,
            absPath,
            code: e?.code,
            message: e?.message,
        });
    }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;

    // Cleanup files before DB cascade deletes the rows
    const attachments = db.prepare("SELECT id, storage_path FROM attachments WHERE doc_id = ?").all(id) as { id: string; storage_path: string }[];

    for (const a of attachments) {
        if (a.storage_path) {
            const absPath = path.isAbsolute(a.storage_path)
                ? a.storage_path
                : path.join(process.cwd(), "data", a.storage_path);

            await safeUnlink(absPath, { docId: id, attachmentId: a.id, storagePath: a.storage_path });
        }
    }

    db.prepare("DELETE FROM docs WHERE id = ?").run(id);
    return NextResponse.json({ ok: true });
}
