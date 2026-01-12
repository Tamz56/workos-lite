export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { db } from "@/db/db";
import { readAllDocs } from "@/lib/docsStore";

function isoCompact(d = new Date()) {
    return d.toISOString().replace(/[:.]/g, "-");
}

export async function GET() {
    const now = new Date().toISOString();

    const tasks = db.prepare("SELECT * FROM tasks ORDER BY datetime(updated_at) DESC").all();
    const attachments = db
        .prepare("SELECT * FROM attachments ORDER BY datetime(created_at) DESC")
        .all();

    const docs = await readAllDocs();

    const payload = {
        exported_at: now,
        version: "workos-lite-backup-v1",
        tasks,
        attachments,
        docs,
    };

    const filename = `workos-lite-backup-${isoCompact()}.json`;

    return new NextResponse(JSON.stringify(payload, null, 2), {
        status: 200,
        headers: {
            "Content-Type": "application/json; charset=utf-8",
            "Content-Disposition": `attachment; filename="${filename}"`,
            "Cache-Control": "no-store",
        },
    });
}
