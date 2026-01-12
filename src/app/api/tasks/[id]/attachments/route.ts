export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/db";
import { nanoid } from "nanoid";
import path from "path";
import fs from "fs/promises";

function uploadDir() {
    return path.join(process.cwd(), ".workos-lite", "uploads");
}

async function ensureDir(p: string) {
    await fs.mkdir(p, { recursive: true });
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id: taskId } = await params;

    const rows = db
        .prepare(
            `
      SELECT *
      FROM attachments
      WHERE task_id = ?
      ORDER BY datetime(created_at) DESC
      `
        )
        .all(taskId);

    return NextResponse.json({ attachments: rows });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id: taskId } = await params;

    const task = db.prepare("SELECT id FROM tasks WHERE id = ?").get(taskId);
    if (!task) return NextResponse.json({ error: "Task not found" }, { status: 404 });

    const form = await req.formData();
    const file = form.get("file");
    if (!file || !(file instanceof File)) {
        return NextResponse.json({ error: "Missing file (field name: file)" }, { status: 400 });
    }

    const id = nanoid();
    const now = new Date().toISOString();

    const dir = uploadDir();
    await ensureDir(dir);

    // store with safe name: <id>_<original>
    const originalName = file.name || "upload.bin";
    const storedName = `${id}_${originalName}`.replace(/[^\w.\-() ]+/g, "_");

    // Save file buffer
    const absPath = path.join(dir, storedName);
    const buf = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(absPath, buf);

    // Store RELATIVE path in DB
    const relativePath = path.join("uploads", storedName);

    db.prepare(
        `
    INSERT INTO attachments (id, task_id, file_name, mime_type, size_bytes, storage_path, created_at)
    VALUES (@id, @task_id, @file_name, @mime_type, @size_bytes, @storage_path, @created_at)
    `
    ).run({
        id,
        task_id: taskId,
        file_name: originalName,
        mime_type: file.type || null,
        size_bytes: buf.length,
        storage_path: relativePath,
        created_at: now,
    });

    const attachment = db.prepare("SELECT * FROM attachments WHERE id = ?").get(id);
    return NextResponse.json({ attachment }, { status: 201 });
}
