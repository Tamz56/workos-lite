export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db/db";
import { randomUUID } from "crypto";
import { toErrorMessage } from "@/lib/error";

function now() {
    return new Date().toISOString();
}

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);

        const limitRaw = searchParams.get("limit");
        const offsetRaw = searchParams.get("offset");
        const qRaw = searchParams.get("q");
        const project_id = searchParams.get("project_id");
        const workspace = searchParams.get("workspace");

        // clamp เพื่อกันยิงหนัก
        const limit = Math.min(Math.max(parseInt(limitRaw ?? "50", 10) || 50, 1), 200);
        const offset = Math.max(parseInt(offsetRaw ?? "0", 10) || 0, 0);

        const q = (qRaw ?? "").trim();
        const hasQ = q.length > 0;

        const db = getDb();

        let sql = `
            SELECT d.*, 
                   (SELECT COUNT(*) FROM attachments a WHERE a.doc_id = d.id) as attachment_count
            FROM docs d 
            WHERE 1=1
        `;
        const params: any[] = [];

        if (hasQ) {
            sql += ` AND (d.title LIKE ? ESCAPE '\\' OR d.content_md LIKE ? ESCAPE '\\')`;
            const escapedQ = `%${q.replace(/[%_\\]/g, "\\$&")}%`;
            params.push(escapedQ, escapedQ);
        }

        if (project_id) {
            sql += ` AND d.project_id = ?`;
            params.push(project_id);
        }

        if (workspace) {
            sql += ` AND d.workspace = ?`;
            params.push(workspace);
        }

        sql += ` ORDER BY d.updated_at DESC LIMIT ? OFFSET ?`;
        params.push(limit, offset);

        const docs = db.prepare(sql).all(...params) as ({
            id: string;
            title: string;
            content_md: string;
            project_id: string | null;
            workspace: string | null;
            created_at: string;
            updated_at: string;
            attachment_count: number;
        })[];

        return NextResponse.json({ docs });
    } catch (e: unknown) {
        return NextResponse.json({ error: toErrorMessage(e) }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
        const title = body.title !== undefined ? String(body.title).trim() : "";
        const content_md = String(body?.content_md ?? "");
        const project_id = body?.project_id ? String(body.project_id) : null;
        const workspace = body?.workspace ? String(body.workspace) : null;
        
        const id = randomUUID();
        const ts = now();

        getDb().prepare(
            `INSERT INTO docs (id, title, content_md, project_id, workspace, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
        ).run(id, title, content_md, project_id, workspace, ts, ts);

        const doc = getDb().prepare("SELECT * FROM docs WHERE id = ?").get(id);
        return NextResponse.json({ doc }, { status: 201 });
    } catch (e: unknown) {
        return NextResponse.json({ error: toErrorMessage(e) }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const mode = searchParams.get("mode");
        const olderThan = searchParams.get("older_than_days");

        if (mode === "drafts") {
            let sql = `DELETE FROM docs WHERE (title IS NULL OR title = '' OR title = 'Untitled') AND (content_md IS NULL OR content_md = '')`;
            const params: unknown[] = [];

            if (olderThan) {
                const days = parseInt(olderThan);
                if (!isNaN(days)) {
                    const cutoff = new Date();
                    cutoff.setDate(cutoff.getDate() - days);
                    const cutoffStr = cutoff.toISOString();
                    // Check updated_at first, fallback to created_at
                    sql += ` AND (COALESCE(updated_at, created_at) < ?)`;
                    params.push(cutoffStr);
                }
            }

            const res = getDb().prepare(sql).run(...params);
            return NextResponse.json({ deleted: res.changes });
        }

        return NextResponse.json({ error: "Invalid mode" }, { status: 400 });
    } catch (e: unknown) {
        return NextResponse.json({ error: toErrorMessage(e) }, { status: 500 });
    }
}
