// P1E.1C Phase B — legacy /api/agent/execute shutdown.
// dry_run:true  → preview only, zero domain write
// dry_run:false → 403 AGENT_DIRECT_WRITE_DISABLED, zero domain write

import Database from "better-sqlite3";
import { createHash } from "node:crypto";
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { mockGetDb } = vi.hoisted(() => ({ mockGetDb: vi.fn() }));
vi.mock("@/db/db", () => ({ getDb: mockGetDb }));

import { POST as agentExecute } from "@/app/api/agent/execute/route";

const UI_PASSWORD = "ui-password";
const SERVER_KEY = "server-key";

let db: Database.Database;

function sha256(value: string): string {
    return createHash("sha256").update(value, "utf8").digest("hex");
}

function createSchema(): void {
    db.exec(`
        CREATE TABLE agent_keys (
          id TEXT PRIMARY KEY, name TEXT NOT NULL UNIQUE, key_hash TEXT NOT NULL,
          scopes_json TEXT NOT NULL, is_enabled INTEGER NOT NULL DEFAULT 1,
          created_at TEXT NOT NULL DEFAULT (datetime('now'))
        );
        CREATE TABLE agent_idempotency (
          idempotency_key TEXT PRIMARY KEY, agent_key_id TEXT NOT NULL,
          request_hash TEXT NOT NULL, response_json TEXT NOT NULL,
          created_at TEXT NOT NULL DEFAULT (datetime('now'))
        );
        CREATE TABLE agent_audit_log (
          id TEXT PRIMARY KEY, agent_key_id TEXT NOT NULL, action_type TEXT NOT NULL,
          payload_json TEXT NOT NULL, result_json TEXT NOT NULL,
          created_at TEXT NOT NULL DEFAULT (datetime('now'))
        );
        CREATE TABLE tasks (
          id TEXT PRIMARY KEY, title TEXT NOT NULL, workspace TEXT NOT NULL,
          status TEXT NOT NULL, scheduled_date TEXT, schedule_bucket TEXT,
          start_time TEXT, end_time TEXT, priority INTEGER, notes TEXT,
          doc_id TEXT, created_at TEXT, updated_at TEXT
        );
        CREATE TABLE docs (
          id TEXT PRIMARY KEY, title TEXT, content_md TEXT,
          created_at TEXT, updated_at TEXT
        );
        CREATE TABLE events (
          id TEXT PRIMARY KEY, title TEXT, start_time TEXT, end_time TEXT,
          all_day INTEGER, kind TEXT, workspace TEXT, description TEXT,
          created_at TEXT, updated_at TEXT
        );
        CREATE TABLE attachments (
          id TEXT PRIMARY KEY, task_id TEXT, file_name TEXT, mime_type TEXT,
          size_bytes INTEGER, storage_path TEXT, created_at TEXT
        );
    `);
    db.prepare(
        "INSERT INTO agent_keys (id, name, key_hash, scopes_json, is_enabled) VALUES (?, ?, ?, ?, 1)",
    ).run(
        "agent-1",
        "Test Agent",
        sha256(SERVER_KEY),
        JSON.stringify(["tasks:write", "docs:write", "events:write", "attachments:write"]),
    );
}

function request(body: unknown): NextRequest {
    return new NextRequest("http://localhost/api/agent/execute", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "x-agent-password": UI_PASSWORD,
        },
        body: JSON.stringify(body),
    });
}

const TASK_CREATE_ACTION = {
    type: "task.create",
    data: { title: "Agent Task" },
};

beforeEach(() => {
    db = new Database(":memory:");
    db.pragma("foreign_keys = ON");
    createSchema();
    mockGetDb.mockReturnValue(db);
    vi.stubEnv("AGENT_UI_PASSWORD", UI_PASSWORD);
    vi.stubEnv("AGENT_KEY", SERVER_KEY);
});

afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
    db.close();
});

describe("legacy agent execute shutdown", () => {
    it("dry_run:true returns a preview with zero domain writes", async () => {
        const before = (db.prepare("SELECT COUNT(*) AS c FROM tasks").get() as { c: number }).c;
        const res = await agentExecute(
            request({ actions: [TASK_CREATE_ACTION], dry_run: true }),
        );
        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.dry_run).toBe(true);
        expect(body.preview_only).toBe(true);
        expect(body.results[0].ok).toBe(true);
        const after = (db.prepare("SELECT COUNT(*) AS c FROM tasks").get() as { c: number }).c;
        expect(after).toBe(before);
        expect((db.prepare("SELECT COUNT(*) AS c FROM agent_audit_log").get() as { c: number }).c).toBe(0);
        expect((db.prepare("SELECT COUNT(*) AS c FROM agent_idempotency").get() as { c: number }).c).toBe(0);
    });

    it("records a denial audit event for dry_run:false without exposing payload secrets", async () => {
        const res = await agentExecute(
            request({
                actions: [
                    {
                        type: "task.create",
                        data: { title: "SECRET_TITLE_SHOULD_NOT_LEAK" },
                    },
                ],
                dry_run: false,
            }),
        );
        expect(res.status).toBe(403);
        const row = db.prepare(
            "SELECT action_type, payload_json, result_json FROM agent_audit_log ORDER BY created_at DESC LIMIT 1",
        ).get() as { action_type: string; payload_json: string; result_json: string } | undefined;
        expect(row).toBeDefined();
        expect(row?.action_type).toBe("legacy.live_write_denied");
        expect(row?.result_json).toContain("AGENT_DIRECT_WRITE_DISABLED");
        expect(row?.payload_json).toContain("task.create");
        expect(row?.payload_json).not.toContain("SECRET_TITLE_SHOULD_NOT_LEAK");
    });

    it("records one denial audit entry covering all six legacy action types", async () => {
        const actions = [
            { type: "task.create", data: { title: "t" } },
            { type: "task.update", data: { id: "t1", title: "u" } },
            { type: "doc.create", data: { title: "d" } },
            { type: "doc.update", data: { id: "d1", title: "u" } },
            { type: "event.create", data: { title: "e", start_time: "2026-01-01T00:00:00.000Z" } },
            { type: "attachment.create", data: { task_id: "t1", file_name: "a.txt", storage_path: "x.txt" } },
        ];
        const res = await agentExecute(request({ actions, dry_run: false }));
        expect(res.status).toBe(403);
        const rows = db.prepare(
            "SELECT payload_json FROM agent_audit_log WHERE action_type = 'legacy.live_write_denied'",
        ).all() as Array<{ payload_json: string }>;
        expect(rows).toHaveLength(1);
        expect(rows[0].payload_json).toContain('"actions_count":6');
        for (const action of actions) {
            expect(rows[0].payload_json).toContain(action.type);
        }
    });

    it("dry_run:false returns 403 AGENT_DIRECT_WRITE_DISABLED with zero domain writes", async () => {
        const before = (db.prepare("SELECT COUNT(*) AS c FROM tasks").get() as { c: number }).c;
        const res = await agentExecute(
            request({ actions: [TASK_CREATE_ACTION], dry_run: false }),
        );
        expect(res.status).toBe(403);
        const body = await res.json();
        expect(body.code).toBe("AGENT_DIRECT_WRITE_DISABLED");
        expect(body.gateway).toBe("/api/operations");
        expect(body.error).toContain("Direct agent writes are disabled");
        const after = (db.prepare("SELECT COUNT(*) AS c FROM tasks").get() as { c: number }).c;
        expect(after).toBe(before);
        // A denial audit event is the intended behavior for live attempts.
        expect((db.prepare("SELECT COUNT(*) AS c FROM agent_audit_log").get() as { c: number }).c).toBe(1);
        expect((db.prepare("SELECT COUNT(*) AS c FROM agent_idempotency").get() as { c: number }).c).toBe(0);
    });

    it("blocks live writes for every legacy action type with zero domain delta", async () => {
        const actions = [
            { type: "task.create", data: { title: "t" } },
            { type: "task.update", data: { id: "t1", title: "u" } },
            { type: "doc.create", data: { title: "d" } },
            { type: "doc.update", data: { id: "d1", title: "u" } },
            { type: "event.create", data: { title: "e", start_time: "2026-01-01T00:00:00.000Z" } },
            { type: "attachment.create", data: { task_id: "t1", file_name: "a.txt", storage_path: "x.txt" } },
        ];
        const tables = ["tasks", "docs", "events", "attachments"] as const;
        const before = Object.fromEntries(
            tables.map((t) => [t, (db.prepare(`SELECT COUNT(*) AS c FROM ${t}`).get() as { c: number }).c]),
        );

        const res = await agentExecute(request({ actions, dry_run: false }));
        expect(res.status).toBe(403);

        for (const t of tables) {
            const after = (db.prepare(`SELECT COUNT(*) AS c FROM ${t}`).get() as { c: number }).c;
            expect(after).toBe(before[t]);
        }
    });
});
