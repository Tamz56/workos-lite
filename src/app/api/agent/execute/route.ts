export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db/db";
import { z } from "zod";
import { nanoid } from "nanoid";
import crypto from "crypto";
import { toErrorMessage } from "@/lib/error";
import { WORKSPACES } from "@/lib/workspaces";

const Workspace = z.enum(WORKSPACES);
const Status = z.enum(["inbox", "planned", "done"]);
const Bucket = z.enum(["none", "morning", "afternoon", "evening"]);

// ---- Action Schemas ----
const TaskCreate = z.object({
    title: z.string().min(1),
    workspace: Workspace.default("avacrm"),
    status: Status.default("inbox"),
    scheduled_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
    schedule_bucket: Bucket.nullable().optional(),
    start_time: z.string().nullable().optional(), // "HH:MM"
    end_time: z.string().nullable().optional(),
    priority: z.number().int().nullable().optional(),
    notes: z.string().nullable().optional(),
    doc_id_ref: z.string().optional(),
    doc_id: z.string().nullable().optional(),
});

const TaskUpdate = z.object({
    id: z.string().min(1),
    title: z.string().min(1).optional(),
    workspace: Workspace.optional(),
    status: Status.optional(),
    scheduled_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
    schedule_bucket: Bucket.nullable().optional(),
    start_time: z.string().nullable().optional(),
    end_time: z.string().nullable().optional(),
    priority: z.number().int().nullable().optional(),
    notes: z.string().nullable().optional(),
    doc_id: z.string().nullable().optional(),
    done_at: z.string().nullable().optional(),
});

const DocCreate = z.object({
    title: z.string().min(1),
    content_md: z.string().optional().default(""),
});

const DocUpdate = z.object({
    id: z.string().min(1),
    title: z.string().min(1).optional(),
    content_md: z.string().optional(),
});

const EventCreate = z.object({
    title: z.string().min(1),
    start_time: z.string().min(1),
    end_time: z.string().nullable().optional(),
    all_day: z.number().int().optional().default(0),
    kind: z.string().nullable().optional(),
    workspace: z.string().nullable().optional(),
    description: z.string().nullable().optional(),
});

const AttachmentCreate = z.object({
    task_id: z.string().min(1),
    file_name: z.string().min(1),
    mime_type: z.string().nullable().optional(),
    size_bytes: z.number().int().nullable().optional(),
    storage_path: z.string().min(1),
});

// union ของ action
const ActionSchema = z.discriminatedUnion("type", [
    z.object({ type: z.literal("task.create"), data: TaskCreate, saveAs: z.string().optional() }),
    z.object({ type: z.literal("task.update"), data: TaskUpdate }),
    z.object({ type: z.literal("doc.create"), data: DocCreate, saveAs: z.string().optional() }),
    z.object({ type: z.literal("doc.update"), data: DocUpdate }),
    z.object({ type: z.literal("event.create"), data: EventCreate, saveAs: z.string().optional() }),
    z.object({ type: z.literal("attachment.create"), data: AttachmentCreate, saveAs: z.string().optional() }),
]);

const ExecuteSchema = z.object({
    actions: z.array(ActionSchema).min(1).max(200),
    dry_run: z.boolean().optional().default(false),
});

type Scope = "tasks:read" | "tasks:write" | "docs:read" | "docs:write" | "events:read" | "events:write" | "attachments:read" | "attachments:write";

const ACTION_SCOPE: Record<string, Scope> = {
    "task.create": "tasks:write",
    "task.update": "tasks:write",
    "doc.create": "docs:write",
    "doc.update": "docs:write",
    "event.create": "events:write",
    "attachment.create": "attachments:write",
};

function requiredScope(actionType: string): Scope {
    const need = ACTION_SCOPE[actionType];
    if (!need) throw new Error(`Unknown action type: ${actionType}`);
    return need;
}

function sha256(s: string) {
    return crypto.createHash("sha256").update(s).digest("hex");
}

function getAgentPassword(req: NextRequest) {
    return req.headers.get("x-agent-password") || null;
}

function nowIso() {
    return new Date().toISOString();
}

export async function POST(req: NextRequest) {
    let agentIdForLogging: string | null = null;
    let parsedPayloadForLogging: any = null;
    let isDryRun = false;

    try {
        const db = getDb();

        // --- auth ---
        const uiPassword = process.env.AGENT_UI_PASSWORD;
        const serverKey = process.env.AGENT_KEY;

        if (!uiPassword || !serverKey) {
            return NextResponse.json({ error: "Server misconfigured: missing AGENT_UI_PASSWORD or AGENT_KEY" }, { status: 500 });
        }

        const providedPassword = getAgentPassword(req);
        if (!providedPassword) {
            return NextResponse.json({ error: "Missing x-agent-password header. Authorization required." }, { status: 401 });
        }

        if (providedPassword !== uiPassword) {
            return NextResponse.json({ error: "Invalid x-agent-password. Access denied." }, { status: 401 });
        }

        // Hash the server key to match against our DB
        const keyHash = sha256(serverKey);
        const agent = db.prepare(
            `SELECT id, name, scopes_json, is_enabled FROM agent_keys WHERE key_hash = ? LIMIT 1`
        ).get(keyHash) as any;

        if (!agent || agent.is_enabled !== 1) {
            return NextResponse.json({ error: "Invalid or disabled agent key on server" }, { status: 403 });
        }

        agentIdForLogging = agent.id;

        const scopes = (() => {
            try { return JSON.parse(agent.scopes_json || "[]") as Scope[]; } catch { return [] as Scope[]; }
        })();

        // --- parse payload ---
        const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
        const parsed = ExecuteSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json({ error: "Invalid payload", details: parsed.error.flatten() }, { status: 400 });
        }

        parsedPayloadForLogging = {
            dry_run: parsed.data.dry_run,
            actions_count: parsed.data.actions.length,
            phase: "validation"
        };
        isDryRun = parsed.data.dry_run;

        const idempotencyKey = req.headers.get("x-idempotency-key")?.trim() || null;
        const reqHash = sha256(JSON.stringify(parsed.data));

        // --- idempotency check ---
        if (idempotencyKey && !isDryRun) {
            const prev = db.prepare(
                `SELECT response_json, request_hash FROM agent_idempotency WHERE idempotency_key = ? LIMIT 1`
            ).get(idempotencyKey) as any;

            if (prev) {
                if (prev.request_hash !== reqHash) {
                    return NextResponse.json({ error: "Idempotency key reuse with different payload" }, { status: 409 });
                }
                return NextResponse.json(JSON.parse(prev.response_json), { status: 200 });
            }
        }

        // --- execute with transaction ---
        const refMap = new Map<string, string>(); // saveAs -> id
        const results: any[] = [];
        const startedAt = nowIso();

        const runTx = db.transaction(() => {
            if (parsedPayloadForLogging) parsedPayloadForLogging.phase = "execute";

            for (const a of parsed.data.actions) {
                const need = requiredScope(a.type);
                if (!scopes.includes(need)) {
                    throw new Error(`Forbidden scope for action ${a.type}: need ${need}`);
                }

                let result: any = { ok: true, type: a.type };

                if (a.type === "task.create") {
                    const id = isDryRun ? `dry_${nanoid()}` : nanoid();
                    const now = nowIso();
                    const t = a.data;

                    const docIdResolved = t.doc_id_ref
                        ? (refMap.get(t.doc_id_ref) ?? null)
                        : (t.doc_id ? (refMap.get(t.doc_id) ?? t.doc_id) : null);

                    const bucket = t.schedule_bucket ?? (t.status === "planned" ? "morning" : "none");
                    const priority = t.priority ?? 2;

                    if (!isDryRun) {
                        db.prepare(`
              INSERT INTO tasks (
                id, title, workspace, status,
                scheduled_date, schedule_bucket, start_time, end_time,
                priority, notes, doc_id, created_at, updated_at
              ) VALUES (
                @id, @title, @workspace, @status,
                @scheduled_date, @schedule_bucket, @start_time, @end_time,
                @priority, @notes, @doc_id, @created_at, @updated_at
              )
            `).run({
                            id,
                            title: t.title,
                            workspace: t.workspace,
                            status: t.status,
                            scheduled_date: t.scheduled_date ?? null,
                            schedule_bucket: bucket,
                            start_time: t.start_time ?? null,
                            end_time: t.end_time ?? null,
                            priority: priority,
                            notes: t.notes ?? null,
                            doc_id: docIdResolved,
                            created_at: now,
                            updated_at: now,
                        });
                    }

                    if (a.saveAs) refMap.set(a.saveAs, id);
                    result.id = id;
                    if (isDryRun) {
                        result.doc_id_resolved = docIdResolved;
                        result.schedule_bucket_resolved = bucket;
                        result.priority_resolved = priority;
                    }
                }

                if (a.type === "task.update") {
                    const u = a.data as any;

                    const docIdResolved = u.doc_id_ref
                        ? (refMap.get(u.doc_id_ref) ?? null)
                        : (u.doc_id ? (refMap.get(u.doc_id) ?? u.doc_id) : undefined);

                    const sets: string[] = [];
                    const bind: Record<string, unknown> = { id: u.id };

                    const maybeSet = (k: string, v: unknown) => { sets.push(`${k} = @${k}`); bind[k] = v; };

                    if (u.title != null) maybeSet("title", u.title);
                    if (u.workspace != null) maybeSet("workspace", u.workspace);
                    if (u.status != null) maybeSet("status", u.status);
                    if (u.scheduled_date !== undefined) maybeSet("scheduled_date", u.scheduled_date);
                    if (u.schedule_bucket !== undefined) maybeSet("schedule_bucket", u.schedule_bucket);
                    if (u.start_time !== undefined) maybeSet("start_time", u.start_time);
                    if (u.end_time !== undefined) maybeSet("end_time", u.end_time);
                    if (u.priority !== undefined) maybeSet("priority", u.priority);
                    if (u.notes !== undefined) maybeSet("notes", u.notes);
                    if (docIdResolved !== undefined) maybeSet("doc_id", docIdResolved);
                    if (u.done_at !== undefined) maybeSet("done_at", u.done_at);

                    if (sets.length === 0) {
                        result.ok = true;
                        result.note = "No fields to update";
                    } else {
                        if (!isDryRun) {
                            const sql = `UPDATE tasks SET ${sets.join(", ")} WHERE id = @id`;
                            const info = db.prepare(sql).run(bind);
                            result.changes = info.changes;
                        } else {
                            result.changes_preview = sets;
                        }
                    }
                    if (isDryRun) result.doc_id_resolved = docIdResolved;
                }

                if (a.type === "doc.create") {
                    const id = isDryRun ? `dry_${nanoid()}` : nanoid();
                    const now = nowIso();
                    const d = a.data;

                    if (!isDryRun) {
                        db.prepare(`
              INSERT INTO docs (id, title, content_md, created_at, updated_at)
              VALUES (@id, @title, @content_md, @created_at, @updated_at)
            `).run({
                            id,
                            title: d.title,
                            content_md: d.content_md ?? "",
                            created_at: now,
                            updated_at: now,
                        });
                    }

                    if (a.saveAs) refMap.set(a.saveAs, id);
                    result.id = id;
                }

                if (a.type === "doc.update") {
                    const u = a.data;
                    const sets: string[] = [];
                    const bind: Record<string, unknown> = { id: u.id, updated_at: nowIso() };
                    if (u.title != null) { sets.push("title = @title"); bind.title = u.title; }
                    if (u.content_md != null) { sets.push("content_md = @content_md"); bind.content_md = u.content_md; }
                    sets.push("updated_at = @updated_at");

                    if (!isDryRun) {
                        const sql = `UPDATE docs SET ${sets.join(", ")} WHERE id = @id`;
                        const info = db.prepare(sql).run(bind);
                        result.changes = info.changes;
                    } else {
                        result.changes_preview = sets;
                    }
                }

                if (a.type === "event.create") {
                    const id = isDryRun ? `dry_${nanoid()}` : nanoid();
                    const now = nowIso();
                    const e = a.data;

                    if (!isDryRun) {
                        db.prepare(`
              INSERT INTO events (
                id, title, start_time, end_time, all_day, kind, workspace, description, created_at, updated_at
              ) VALUES (
                @id, @title, @start_time, @end_time, @all_day, @kind, @workspace, @description, @created_at, @updated_at
              )
            `).run({
                            id,
                            title: e.title,
                            start_time: e.start_time,
                            end_time: e.end_time ?? null,
                            all_day: e.all_day ?? 0,
                            kind: e.kind ?? "appointment",
                            workspace: e.workspace ?? null,
                            description: e.description ?? null,
                            created_at: now,
                            updated_at: now,
                        });
                    }

                    if (a.saveAs) refMap.set(a.saveAs, id);
                    result.id = id;
                }

                if (a.type === "attachment.create") {
                    const id = isDryRun ? `dry_${nanoid()}` : nanoid();
                    const now = nowIso();
                    const f = a.data;

                    if (!isDryRun) {
                        db.prepare(`
              INSERT INTO attachments (
                id, task_id, file_name, mime_type, size_bytes, storage_path, created_at
              ) VALUES (
                @id, @task_id, @file_name, @mime_type, @size_bytes, @storage_path, @created_at
              )
            `).run({
                            id,
                            task_id: f.task_id,
                            file_name: f.file_name,
                            mime_type: f.mime_type ?? null,
                            size_bytes: f.size_bytes ?? null,
                            storage_path: f.storage_path,
                            created_at: now,
                        });
                    }

                    result.id = id;
                }

                // audit each action
                if (!isDryRun) {
                    db.prepare(`
            INSERT INTO agent_audit_log (id, agent_key_id, action_type, payload_json, result_json, created_at)
            VALUES (@id, @agent_key_id, @action_type, @payload_json, @result_json, @created_at)
          `).run({
                        id: nanoid(),
                        agent_key_id: agent.id,
                        action_type: a.type,
                        payload_json: JSON.stringify(a),
                        result_json: JSON.stringify(result),
                        created_at: nowIso(),
                    });
                }

                if (isDryRun) {
                    result.would_write = false;
                }

                results.push(result);
            }
        });

        runTx();

        const response: any = {
            ok: true,
            agent: { id: agent.id, name: agent.name },
            startedAt,
            results,
        };

        if (isDryRun) {
            response.dry_run = true;
            response.preview_only = true;
        } else if (idempotencyKey) {
            // store idempotency response
            db.prepare(`
        INSERT INTO agent_idempotency (idempotency_key, agent_key_id, request_hash, response_json, created_at)
        VALUES (@k, @agent_key_id, @h, @r, datetime('now'))
      `).run({
                k: idempotencyKey,
                agent_key_id: agent.id,
                h: reqHash,
                r: JSON.stringify(response),
            });
        }

        return NextResponse.json(response, { status: 200 });
    } catch (e: unknown) {
        if (agentIdForLogging) {
            try {
                const db = getDb();
                db.prepare(`
          INSERT INTO agent_audit_log (id, agent_key_id, action_type, payload_json, result_json, created_at)
          VALUES (@id, @agent_key_id, @action_type, @payload_json, @result_json, @created_at)
        `).run({
                    id: nanoid(),
                    agent_key_id: agentIdForLogging,
                    action_type: "request.error",
                    payload_json: JSON.stringify(parsedPayloadForLogging || { error: "Failed to parse" }),
                    result_json: JSON.stringify({ ok: false, error: toErrorMessage(e) }),
                    created_at: nowIso(),
                });
            } catch (logDbErr) {
                // do not crash if logging fails
                console.error("Failed to log request.error", logDbErr);
            }
        }
        return NextResponse.json({ error: toErrorMessage(e) }, { status: 500 });
    }
}
