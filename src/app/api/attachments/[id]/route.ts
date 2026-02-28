export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/db";
import fs from "fs/promises";
import fsSync from "fs";
import path from "path";

function resolvePath(storedPath: string) {
    if (path.isAbsolute(storedPath)) return storedPath;

    // Check new data directory first
    const dataPath = path.join(process.cwd(), "data", storedPath);
    if (fsSync.existsSync(dataPath)) return dataPath;

    // Fallback to .workos-lite directory
    return path.join(process.cwd(), ".workos-lite", storedPath);
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;

    const att = db.prepare("SELECT * FROM attachments WHERE id = ?").get(id) as {
        id: string;
        storage_path: string;
        file_name: string;
        mime_type: string;
    };
    if (!att) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const fullPath = resolvePath(att.storage_path);

    try {
        const data = await fs.readFile(fullPath);

        const url = new URL(req.url);
        const forceDownload = url.searchParams.get("download") === "1";
        const disposition = forceDownload ? "attachment" : "inline";
        const encodedName = encodeURIComponent(att.file_name);

        return new NextResponse(data, {
            headers: {
                "Content-Type": att.mime_type || "application/octet-stream",
                "Content-Disposition": `${disposition}; filename="${encodedName}"; filename*=UTF-8''${encodedName}`,
                "Cache-Control": "no-store",
            },
        });
    } catch {
        return NextResponse.json({ error: "File not found on disk" }, { status: 404 });
    }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;

    const att = db.prepare("SELECT * FROM attachments WHERE id = ?").get(id) as { storage_path: string };
    if (!att) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const fullPath = resolvePath(att.storage_path);

    try {
        await fs.unlink(fullPath);
    } catch { }

    db.prepare("DELETE FROM attachments WHERE id = ?").run(id);
    return NextResponse.json({ ok: true });
}
