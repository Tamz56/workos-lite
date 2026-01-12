export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db/db";
import { randomUUID } from "crypto";
import { toErrorMessage } from "@/lib/error";

function now() {
    return new Date().toISOString();
}

export async function GET() {
    try {
        const docs = getDb()
            .prepare("SELECT * FROM docs ORDER BY updated_at DESC")
            .all() as { id: string; title: string; content_md: string; created_at: string; updated_at: string }[];

        return NextResponse.json({ docs });
    } catch (e: unknown) {
        return NextResponse.json({ error: toErrorMessage(e) }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
        const title = String(body?.title ?? "Untitled").trim() || "Untitled";
        const content_md = String(body?.content_md ?? "");
        const id = randomUUID();
        const ts = now();

        getDb().prepare(
            `INSERT INTO docs (id, title, content_md, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?)`
        ).run(id, title, content_md, ts, ts);

        const doc = getDb().prepare("SELECT * FROM docs WHERE id = ?").get(id) as { id: string; title: string; content_md: string; created_at: string; updated_at: string };
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
