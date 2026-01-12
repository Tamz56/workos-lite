export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { db } from "@/db/db";
import { readAllDocs } from "@/lib/docsStore";

import archiver from "archiver";
import fs from "fs";
import path from "path";
import { PassThrough, Readable } from "stream";

function isoCompact(d = new Date()) {
    return d.toISOString().replace(/[:.]/g, "-");
}

function resolveStorageAbs(storagePath: string) {
    // ให้สอดคล้องกับ logic ใน DELETE task
    // ถ้า storage_path เป็น relative -> อยู่ใต้ process.cwd()/.workos-lite/<storage_path>
    return path.isAbsolute(storagePath)
        ? storagePath
        : path.join(process.cwd(), ".workos-lite", storagePath);
}

export async function GET() {
    const now = new Date().toISOString();

    const tasks = db.prepare("SELECT * FROM tasks ORDER BY datetime(updated_at) DESC").all();
    const attachments = db
        .prepare("SELECT id, task_id, file_name, size_bytes, storage_path, created_at FROM attachments ORDER BY datetime(created_at) DESC")
        .all() as Array<{
            id: string;
            task_id: string;
            file_name: string;
            size_bytes: number | null;
            storage_path: string;
            created_at: string;
        }>;

    const docs = await readAllDocs();

    // สร้าง backup.json (metadata)
    const payload = {
        exported_at: now,
        version: "workos-lite-backup-v1",
        tasks,
        attachments,
        docs,
    };

    const filename = `workos-lite-backup-${isoCompact()}.zip`;

    // stream zip
    const pass = new PassThrough();
    const archive = archiver("zip", { zlib: { level: 9 } });

    archive.on("error", (err) => {
        // ส่ง error ผ่าน stream (ถ้าพลาดจะทำให้ request fail)
        pass.destroy(err);
    });

    archive.pipe(pass);

    // 1) ใส่ backup.json
    archive.append(JSON.stringify(payload, null, 2), { name: "backup.json" });

    // 2) ใส่ไฟล์แนบ
    // โครงสร้างใน zip: attachments/<taskId>/<attachmentId>-<file_name>
    const missing: Array<(typeof attachments)[0] & { abs_path: string }> = [];

    for (const a of attachments) {
        const abs = resolveStorageAbs(a.storage_path);
        if (!abs || !fs.existsSync(abs)) {
            missing.push({ ...a, abs_path: abs });
            continue;
        }

        const safeName = (a.file_name || "file").replace(/[<>:"/\\|?*\x00-\x1F]/g, "_");
        const zipPath = path.posix.join("attachments", a.task_id, `${a.id}-${safeName}`);

        archive.file(abs, { name: zipPath });
    }

    // 3) ใส่รายงานไฟล์ที่หาไม่เจอ (ถ้ามี)
    if (missing.length > 0) {
        archive.append(JSON.stringify({ missing_attachments: missing }, null, 2), {
            name: "missing_attachments.json",
        });
    }

    void archive.finalize();

    // Node stream -> Web stream สำหรับ NextResponse
    const webStream = Readable.toWeb(pass) as unknown as ReadableStream;

    return new NextResponse(webStream, {
        status: 200,
        headers: {
            "Content-Type": "application/zip",
            "Content-Disposition": `attachment; filename="${filename}"`,
            "Cache-Control": "no-store",
        },
    });
}
