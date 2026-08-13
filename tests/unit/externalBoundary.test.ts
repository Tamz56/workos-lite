// P1E.1C — external boundary proof (scoped to implemented P1E surfaces).
//   unauthenticated HTTP caller  → H1 business writes = 0
//   agent-authenticated caller   → H1 business writes = 0 (agent creds do not
//                                 map to human H1 authority)
//   authenticated human + Origin → H1 explicit writes allowed
//   G1 agent propose             → governed semantics remain

import Database from "better-sqlite3";
import { createHash } from "node:crypto";
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { OPERATIONS_SCHEMA_SQL } from "@/lib/operations/operationsSchema";
import {
    createHumanAuthDb,
    createTestH2Session,
    humanMutationRequest,
    seedHumanOperator,
    TRUSTED_ORIGIN,
} from "../helpers/humanSession";

const mocks = vi.hoisted(() => ({
    mockGetDb: vi.fn(),
    mockDb: {} as Record<string, unknown>,
}));
vi.mock("@/db/db", () => ({ getDb: mocks.mockGetDb, db: mocks.mockDb }));

import { POST as createTask } from "@/app/api/tasks/route";
import { POST as proposeOperation } from "@/app/api/operations/route";

const UI_PASSWORD = "ui-password";
const SERVER_KEY = "server-key";

let db: Database.Database;
let sessionCookie: string;

function sha256(value: string): string {
    return createHash("sha256").update(value, "utf8").digest("hex");
}

function attachDb(target: Record<string, unknown>, source: Database.Database): void {
    target.prepare = source.prepare.bind(source);
    target.transaction = source.transaction.bind(source);
    target.exec = source.exec.bind(source);
    target.pragma = source.pragma.bind(source);
    target.close = source.close.bind(source);
}

beforeEach(() => {
    db = createHumanAuthDb();
    db.exec(OPERATIONS_SCHEMA_SQL);
    db.exec(`
        CREATE TABLE tasks (
          id TEXT PRIMARY KEY, title TEXT NOT NULL, workspace TEXT NOT NULL,
          status TEXT NOT NULL, list_id TEXT, scheduled_date TEXT,
          schedule_bucket TEXT, start_time TEXT, end_time TEXT,
          priority INTEGER, notes TEXT, parent_task_id TEXT, sort_order INTEGER,
          sprint_id TEXT, review_status TEXT, topic_id TEXT, topic_title TEXT,
          created_at TEXT, updated_at TEXT, done_at TEXT
        );
        CREATE TABLE projects (
          id TEXT PRIMARY KEY, slug TEXT NOT NULL UNIQUE, name TEXT NOT NULL,
          status TEXT NOT NULL, created_at TEXT, updated_at TEXT
        );
        CREATE TABLE agent_keys (
          id TEXT PRIMARY KEY, name TEXT NOT NULL UNIQUE, key_hash TEXT NOT NULL,
          scopes_json TEXT NOT NULL, is_enabled INTEGER NOT NULL DEFAULT 1,
          created_at TEXT NOT NULL DEFAULT (datetime('now'))
        );
    `);
    db.prepare(
        "INSERT INTO projects (id, slug, name, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
    ).run("p1", "project-a", "Project A", "planned", "2026-01-01", "2026-01-01");
    db.prepare(
        "INSERT INTO agent_keys (id, name, key_hash, scopes_json, is_enabled) VALUES (?, ?, ?, ?, 1)",
    ).run("agent-1", "Test Agent", sha256(SERVER_KEY), JSON.stringify(["operations:request"]));

    const operatorId = seedHumanOperator(db);
    sessionCookie = createTestH2Session(db, operatorId).cookieHeader;
    attachDb(mocks.mockDb, db);
    mocks.mockGetDb.mockReturnValue(db);
    vi.stubEnv("WORKOS_TRUSTED_ORIGINS", TRUSTED_ORIGIN);
    vi.stubEnv("AGENT_UI_PASSWORD", UI_PASSWORD);
    vi.stubEnv("AGENT_KEY", SERVER_KEY);
});

afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
    db.close();
});

function countTasks(): number {
    return (db.prepare("SELECT COUNT(*) AS c FROM tasks").get() as { c: number }).c;
}

describe("external boundary proof", () => {
    it("unauthenticated HTTP caller cannot write H1 business state", async () => {
        const before = countTasks();
        const res = await createTask(
            humanMutationRequest("http://localhost/api/tasks", {
                origin: TRUSTED_ORIGIN,
                body: JSON.stringify({ title: "Task" }),
            }),
        );
        expect(res.status).toBe(401);
        expect(countTasks()).toBe(before);
    });

    it("agent credentials do not grant H1 human mutation authority", async () => {
        const before = countTasks();
        const req = new NextRequest("http://localhost/api/tasks", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "x-agent-password": UI_PASSWORD,
            },
            body: JSON.stringify({ title: "Agent Task" }),
        });
        const res = await createTask(req);
        expect(res.status).toBe(401);
        expect(countTasks()).toBe(before);
    });

    it("authenticated human with trusted origin can write H1 business state", async () => {
        const res = await createTask(
            humanMutationRequest("http://localhost/api/tasks", {
                cookieHeader: sessionCookie,
                origin: TRUSTED_ORIGIN,
                body: JSON.stringify({ title: "Human Task" }),
            }),
        );
        expect(res.status).toBe(201);
        expect(countTasks()).toBe(1);
    });

    it("G1 agent propose remains functional under its own governance", async () => {
        const res = await proposeOperation(
            new NextRequest("http://localhost/api/operations", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "x-agent-password": UI_PASSWORD,
                },
                body: JSON.stringify({
                    operationType: "backlog.create",
                    targetType: "project",
                    targetRef: "project-a",
                    payload: { title: "Task A" },
                }),
            }),
        );
        expect(res.status).toBe(200);
    });
});
