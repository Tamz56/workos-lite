export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/db";
import { z } from "zod";
import { defaultBucketForWorkspace } from "@/lib/planning";
import fs from "fs/promises";
import path from "path";

const Workspace = z.enum(["avacrm", "ops", "content"]);
const Status = z.enum(["inbox", "planned", "done"]);
const Bucket = z.enum(["none", "morning", "afternoon", "evening"]);

const PatchTaskSchema = z
    .object({
        title: z.string().min(1).optional(),
        workspace: Workspace.optional(),
        status: Status.optional(),
        scheduled_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
        schedule_bucket: Bucket.optional(),
        start_time: z.string().nullable().optional(),
        end_time: z.string().nullable().optional(),
        priority: z.number().int().nullable().optional(),
        notes: z.string().nullable().optional(),
        doc_id: z.string().nullable().optional(),
    })
    .strict();

export async function GET(
    _req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const task = db.prepare("SELECT * FROM tasks WHERE id = ?").get(id);

    if (!task) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ task });
}

export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;

    const body = (await req.json().catch(() => ({}))) as unknown;
    const parsed = PatchTaskSchema.safeParse(body);

    if (!parsed.success) {
        return NextResponse.json(
            { error: "Invalid payload", details: parsed.error.flatten() },
            { status: 400 }
        );
    }

    const patch = parsed.data;

    // load current row (needed for transition rules)
    const current = db.prepare("SELECT * FROM tasks WHERE id = ?").get(id) as {
        status: string;
        scheduled_date: string | null;
        schedule_bucket: string | null;
        workspace: z.infer<typeof Workspace>;
    };
    if (!current) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const keys = Object.keys(patch) as (keyof typeof patch)[];
    if (keys.length === 0) return NextResponse.json({ task: current });

    const setClauses: string[] = [];
    const bind: Record<string, unknown> = { id };

    // Apply fields
    for (const k of keys) {
        if (k === "scheduled_date") {
            setClauses.push(`scheduled_date = @scheduled_date`);
            bind.scheduled_date = patch.scheduled_date ?? null;
            continue;
        }
        setClauses.push(`${k} = @${k}`);
        bind[k] = patch[k];
    }



    // Schedule consistency:
    // - if scheduled_date is explicitly cleared -> bucket must be 'none'
    if ("scheduled_date" in patch && patch.scheduled_date === null) {
        setClauses.push(`schedule_bucket = 'none'`);
    } else {
        // - if being planned (status=planned or has date) but bucket is none or missing
        const isPlanned = (patch.status === "planned") || (patch.scheduled_date) || (current.status === "planned" && current.scheduled_date);
        if (isPlanned) {
            const targetBucket = patch.schedule_bucket || current.schedule_bucket || "none";
            if (targetBucket === "none") {
                const workspace = patch.workspace || current.workspace;
                const fallback = defaultBucketForWorkspace(workspace) ?? "afternoon";
                setClauses.push(`schedule_bucket = @fallback_bucket`);
                bind.fallback_bucket = fallback;
            }
        }
    }

    // updated_at always
    setClauses.push("updated_at = @updated_at");
    bind.updated_at = new Date().toISOString();

    // status ↔ done_at rules (transition-based)
    if (patch.status) {
        const fromStatus = current.status as string;
        const toStatus = patch.status;

        if (fromStatus !== "done" && toStatus === "done") {
            setClauses.push("done_at = @done_at");
            bind.done_at = new Date().toISOString();
        } else if (fromStatus === "done" && toStatus !== "done") {
            setClauses.push("done_at = NULL");
        }

        // Optional but recommended: moving to inbox clears schedule
        if (toStatus === "inbox") {
            setClauses.push("scheduled_date = NULL");
            setClauses.push("schedule_bucket = 'none'");
        }
    }

    const sql = `UPDATE tasks SET ${setClauses.join(", ")} WHERE id = @id`;
    const info = db.prepare(sql).run(bind);

    if (info.changes === 0) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const task = db.prepare("SELECT * FROM tasks WHERE id = ?").get(id);
    return NextResponse.json({ task });
}


async function safeUnlink(
    absPath: string,
    ctx: { taskId: string; attachmentId?: string; storagePath?: string }
) {
    try {
        await fs.unlink(absPath);
    } catch (err: unknown) {
        const e = err as { code?: string; message?: string };
        if (e?.code === "ENOENT") return; // ignore missing file

        console.error("[delete-task] unlink failed", {
            ...ctx,
            absPath,
            code: e?.code,
            message: e?.message,
        });

        throw err; // keep 500 for real errors
    }
}

export async function DELETE(
    _req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;

    // Cleanup files before DB cascade deletes the rows
    const attachments = db.prepare("SELECT id, storage_path FROM attachments WHERE task_id = ?").all(id) as { id: string; storage_path: string }[];

    for (const a of attachments) {
        if (a.storage_path) {
            // Adjust root to match your actual storage location
            // If storage_path is relative, join with process.cwd() + .workos-lite (or wherever you store them)
            const absPath = path.isAbsolute(a.storage_path)
                ? a.storage_path
                : path.join(process.cwd(), ".workos-lite", a.storage_path);

            await safeUnlink(absPath, { taskId: id, attachmentId: a.id, storagePath: a.storage_path });
        }
    }

    const info = db.prepare("DELETE FROM tasks WHERE id = ?").run(id);

    if (info.changes === 0) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
}
