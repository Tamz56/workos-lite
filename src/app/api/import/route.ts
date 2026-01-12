export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db/db";
import { readAllDocs, writeAllDocs, withDocsLock, type DocRow } from "@/lib/docsStore";
import { toErrorMessage } from "@/lib/error";

type Mode = "merge" | "replace";

type BackupPayload = {
    version?: unknown;
    tasks?: unknown;
    attachments?: unknown;
    docs?: unknown;
    [key: string]: unknown;
};

function parseTime(s?: string | null) {
    if (!s) return 0;
    const t = new Date(s).getTime();
    return Number.isNaN(t) ? 0 : t;
}

function safeJsonParse(text: string): unknown {
    try {
        return JSON.parse(text);
    } catch {
        return null;
    }
}

function pick<T extends object>(obj: unknown, keys: (keyof T)[]) {
    const out = {} as T;
    const src = obj as Record<string, unknown> | null | undefined;
    if (!src) return out;
    for (const k of keys) {
        const val = src[k as string];
        if (val !== undefined) out[k] = val as T[keyof T];
    }
    return out;
}

export async function POST(req: NextRequest) {
    const url = new URL(req.url);
    const mode = (url.searchParams.get("mode") || "merge") as Mode;

    if (mode !== "merge" && mode !== "replace") {
        return NextResponse.json({ error: "Invalid mode (allowed: merge, replace)" }, { status: 400 });
    }

    // ---- read payload (json or file) ----
    let rawText = "";

    const ct = req.headers.get("content-type") || "";
    if (ct.includes("multipart/form-data")) {
        const fd = await req.formData();
        const f = fd.get("file");
        if (!(f instanceof File)) {
            return NextResponse.json({ error: "Missing file in form-data (field name: file)" }, { status: 400 });
        }
        rawText = await f.text();
    } else {
        rawText = await req.text();
    }

    const payload = safeJsonParse(rawText) as BackupPayload | null;
    if (!payload || typeof payload !== "object") {
        return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    if (payload.version !== "workos-lite-backup-v1") {
        return NextResponse.json(
            { error: "Unsupported backup version", got: payload.version, expected: "workos-lite-backup-v1" },
            { status: 400 }
        );
    }

    const tasks = Array.isArray(payload.tasks) ? payload.tasks : [];
    const attachments = Array.isArray(payload.attachments) ? payload.attachments : [];
    const docs = Array.isArray(payload.docs) ? payload.docs : [];

    // ---- prepare statements ----
    const db = getDb();
    const upsertTask = db.prepare(`
    INSERT INTO tasks (
      id, title, workspace, status,
      scheduled_date, schedule_bucket,
      start_time, end_time,
      priority, notes, doc_id,
      created_at, updated_at, done_at
    )
    VALUES (
      @id, @title, @workspace, @status,
      @scheduled_date, @schedule_bucket,
      @start_time, @end_time,
      @priority, @notes, @doc_id,
      @created_at, @updated_at, @done_at
    )
    ON CONFLICT(id) DO UPDATE SET
      title=excluded.title,
      workspace=excluded.workspace,
      status=excluded.status,
      scheduled_date=excluded.scheduled_date,
      schedule_bucket=excluded.schedule_bucket,
      start_time=excluded.start_time,
      end_time=excluded.end_time,
      priority=excluded.priority,
      notes=excluded.notes,
      doc_id=excluded.doc_id,
      created_at=excluded.created_at,
      updated_at=excluded.updated_at,
      done_at=excluded.done_at
  `);

    const upsertAttachment = db.prepare(`
    INSERT INTO attachments (
      id, task_id, file_name, mime_type, size_bytes, storage_path, created_at
    )
    VALUES (
      @id, @task_id, @file_name, @mime_type, @size_bytes, @storage_path, @created_at
    )
    ON CONFLICT(id) DO UPDATE SET
      task_id=excluded.task_id,
      file_name=excluded.file_name,
      mime_type=excluded.mime_type,
      size_bytes=excluded.size_bytes,
      storage_path=excluded.storage_path,
      created_at=excluded.created_at
  `);

    // ---- import DB in a transaction ----
    let insertedTasks = 0;
    let insertedAttachments = 0;

    try {
        db.exec("BEGIN");

        if (mode === "replace") {
            // ล้างของเดิมก่อน (attachments จะโดนลบเองจาก cascade ตอนลบ tasks ก็ได้
            // แต่ลบ attachments ก่อนชัวร์กว่า)
            db.exec("DELETE FROM attachments");
            db.exec("DELETE FROM tasks");
        }

        for (const t of tasks) {
            // map ตาม schema ล่าสุด
            const row = pick<{
                id: string;
                title: string;
                workspace: string;
                status: string;
                scheduled_date: string | null;
                schedule_bucket: string | null;
                start_time: string | null;
                end_time: string | null;
                priority: number | null;
                notes: string | null;
                doc_id: string | null;
                created_at: string;
                updated_at: string;
                done_at: string | null;
            }>(t, [
                "id",
                "title",
                "workspace",
                "status",
                "scheduled_date",
                "schedule_bucket",
                "start_time",
                "end_time",
                "priority",
                "notes",
                "doc_id",
                "created_at",
                "updated_at",
                "done_at",
            ]);

            if (!row.id || !row.title || !row.workspace || !row.status) continue;

            // normalize nullable fields
            row.scheduled_date = row.scheduled_date ?? null;
            row.schedule_bucket = row.schedule_bucket ?? null;
            row.start_time = row.start_time ?? null;
            row.end_time = row.end_time ?? null;
            row.priority = row.priority ?? null;
            row.notes = row.notes ?? null;
            row.doc_id = row.doc_id ?? null;
            row.done_at = row.done_at ?? null;

            // ensure timestamps
            row.created_at = row.created_at || new Date().toISOString();
            row.updated_at = row.updated_at || row.created_at;

            try {
                upsertTask.run(row);
                insertedTasks++;
            } catch (e: unknown) {
                console.error(toErrorMessage(e));
                // continue
            }
        }

        // attachments: insert after tasks to satisfy FK
        for (const a of attachments) {
            const row = pick<{
                id: string;
                task_id: string;
                file_name: string;
                mime_type: string | null;
                size_bytes: number | null;
                storage_path: string;
                created_at: string;
            }>(a, ["id", "task_id", "file_name", "mime_type", "size_bytes", "storage_path", "created_at"]);

            if (!row.id || !row.task_id || !row.file_name || !row.storage_path) continue;

            row.mime_type = row.mime_type ?? null;
            row.size_bytes = row.size_bytes ?? null;
            row.created_at = row.created_at || new Date().toISOString();

            // ถ้า task_id ไม่มีจริง (backup เพี้ยน) จะชน FK -> ข้ามแบบปลอดภัย
            try {
                upsertAttachment.run(row);
                insertedAttachments++;
            } catch {
                // ignore FK fail
            }
        }

        db.exec("COMMIT");
    } catch (e: unknown) {
        try {
            db.exec("ROLLBACK");
        } catch { }
        return NextResponse.json(
            { error: toErrorMessage(e) },
            { status: 500 }
        );
    }

    // ---- import docs into docsStore (file-based) ----
    let mergedDocsCount = 0;
    try {
        await withDocsLock(async () => {
            const existing = await readAllDocs();
            const byId = new Map<string, DocRow>();
            for (const d of existing) byId.set(d.id, d);

            if (mode === "replace") {
                byId.clear();
            }

            for (const d of docs) {
                const id = String(d?.id || "");
                if (!id) continue;

                const incoming: DocRow = {
                    id,
                    title: typeof d?.title === "string" ? d.title : "",
                    content_md: typeof d?.content_md === "string" ? d.content_md : "",
                    created_at: typeof d?.created_at === "string" ? d.created_at : new Date().toISOString(),
                    updated_at: typeof d?.updated_at === "string" ? d.updated_at : new Date().toISOString(),
                };

                const cur = byId.get(id);
                if (!cur) {
                    byId.set(id, incoming);
                    mergedDocsCount++;
                    continue;
                }

                // merge rule: เอา updated_at ที่ใหม่กว่า
                const curT = parseTime(cur.updated_at) || parseTime(cur.created_at);
                const inT = parseTime(incoming.updated_at) || parseTime(incoming.created_at);

                if (inT >= curT) {
                    byId.set(id, incoming);
                    mergedDocsCount++;
                }
            }

            const next = Array.from(byId.values());
            await writeAllDocs(next);
        });
    } catch (e: unknown) {
        // DB import ผ่านแล้ว แต่ docs import fail: แจ้งเป็น warning
        return NextResponse.json({
            ok: true,
            mode,
            tasks_imported: insertedTasks,
            attachments_imported: insertedAttachments,
            docs_merged: mergedDocsCount,
            warning: toErrorMessage(e) ?? "Docs import failed",
        });
    }

    return NextResponse.json({
        ok: true,
        mode,
        tasks_imported: insertedTasks,
        attachments_imported: insertedAttachments,
        docs_merged: mergedDocsCount,
    });
}
