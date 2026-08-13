// P1E.1B Tier-0 destructive authority tests.
// Proof: unauthorized/foreign-origin callers are denied BEFORE any destructive
// domain mutation; valid H2 + trusted origin preserves route behavior.

import Database from "better-sqlite3";
import { NextRequest } from "next/server";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
    createHumanAuthDb,
    createTestH2Session,
    humanMutationRequest,
    seedHumanOperator,
    TRUSTED_ORIGIN,
    FOREIGN_ORIGIN,
} from "../helpers/humanSession";

const mocks = vi.hoisted(() => ({
    mockGetDb: vi.fn(),
    mockDb: {} as Record<string, unknown>,
    docsStore: {
        readAllDocs: vi.fn(),
        writeAllDocs: vi.fn(),
        withDocsLock: vi.fn(),
    },
}));
vi.mock("@/db/db", () => ({ getDb: mocks.mockGetDb, db: mocks.mockDb }));
vi.mock("@/lib/docsStore", () => ({
    readAllDocs: mocks.docsStore.readAllDocs,
    writeAllDocs: mocks.docsStore.writeAllDocs,
    withDocsLock: mocks.docsStore.withDocsLock,
}));

import { POST as restoreBackup } from "@/app/api/backup/restore/route";
import { POST as resetDemo } from "@/app/api/admin/reset-demo-data/route";
import { POST as importLegacy } from "@/app/api/import/route";
import { DELETE as deleteProject } from "@/app/api/projects/[slug]/route";
import { DELETE as executeProjectDelete } from "@/app/api/projects/[slug]/execute/route";
import { DELETE as deleteTaskBatch } from "@/app/api/tasks/batch/route";
import { POST as cleanupDrafts } from "@/app/api/docs/cleanup-drafts/route";

let db: Database.Database;
let sessionCookie: string;

function attachDb(target: Record<string, unknown>, source: Database.Database): void {
    target.prepare = source.prepare.bind(source);
    target.transaction = source.transaction.bind(source);
    target.exec = source.exec.bind(source);
    target.pragma = source.pragma.bind(source);
    target.close = source.close.bind(source);
}

function createTables(): void {
    db.exec(`
        CREATE TABLE tasks (
          id TEXT PRIMARY KEY, title TEXT NOT NULL, workspace TEXT NOT NULL,
          status TEXT NOT NULL, list_id TEXT, scheduled_date TEXT,
          schedule_bucket TEXT, start_time TEXT, end_time TEXT,
          priority INTEGER, notes TEXT, doc_id TEXT, is_seed INTEGER DEFAULT 0,
          created_at TEXT, updated_at TEXT, done_at TEXT
        );
        CREATE TABLE lists (
          id TEXT PRIMARY KEY, workspace TEXT NOT NULL, slug TEXT NOT NULL,
          title TEXT NOT NULL, is_seed INTEGER DEFAULT 0,
          created_at TEXT, updated_at TEXT
        );
        CREATE TABLE projects (
          id TEXT PRIMARY KEY, slug TEXT NOT NULL UNIQUE, name TEXT NOT NULL,
          status TEXT NOT NULL, is_seed INTEGER DEFAULT 0,
          created_at TEXT, updated_at TEXT
        );
        CREATE TABLE docs (
          id TEXT PRIMARY KEY, title TEXT, content_md TEXT,
          is_seed INTEGER DEFAULT 0, created_at TEXT, updated_at TEXT
        );
        CREATE TABLE events (
          id TEXT PRIMARY KEY, title TEXT, workspace TEXT, start_time TEXT,
          end_time TEXT, all_day INTEGER, kind TEXT, description TEXT,
          is_seed INTEGER DEFAULT 0, created_at TEXT, updated_at TEXT
        );
        CREATE TABLE attachments (
          id TEXT PRIMARY KEY, task_id TEXT, doc_id TEXT, file_name TEXT,
          mime_type TEXT, size_bytes INTEGER, storage_path TEXT, created_at TEXT
        );
        CREATE TABLE sprints (id TEXT PRIMARY KEY, name TEXT NOT NULL);
        CREATE TABLE sprint_items (sprint_id TEXT NOT NULL, project_item_id TEXT NOT NULL);
        CREATE TABLE project_items (
          id TEXT PRIMARY KEY, project_id TEXT NOT NULL, title TEXT NOT NULL,
          status TEXT NOT NULL, created_at TEXT, updated_at TEXT
        );
    `);
}

function count(table: string): number {
    return (db.prepare(`SELECT COUNT(*) AS c FROM ${table}`).get() as { c: number }).c;
}

function unauthReq(url: string, body?: string): ReturnType<typeof humanMutationRequest> {
    return humanMutationRequest(url, { origin: TRUSTED_ORIGIN, body });
}

function foreignReq(url: string, body?: string): ReturnType<typeof humanMutationRequest> {
    return humanMutationRequest(url, { cookieHeader: sessionCookie, origin: FOREIGN_ORIGIN, body });
}

function authedReq(url: string, body?: string): ReturnType<typeof humanMutationRequest> {
    return humanMutationRequest(url, { cookieHeader: sessionCookie, origin: TRUSTED_ORIGIN, body });
}

beforeEach(() => {
    db = createHumanAuthDb();
    createTables();
    const operatorId = seedHumanOperator(db);
    sessionCookie = createTestH2Session(db, operatorId).cookieHeader;
    attachDb(mocks.mockDb, db);
    mocks.mockGetDb.mockReturnValue(db);
    mocks.docsStore.readAllDocs.mockResolvedValue([]);
    mocks.docsStore.writeAllDocs.mockResolvedValue(undefined);
    mocks.docsStore.withDocsLock.mockImplementation(
        async (fn: () => Promise<unknown>) => fn(),
    );
    vi.stubEnv("WORKOS_TRUSTED_ORIGINS", TRUSTED_ORIGIN);
});

afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
    db.close();
});

describe("Backup restore authority", () => {
    it("denies unauthenticated and foreign-origin restore before any state change", async () => {
        const before = count("tasks");
        expectAuthBlocked(
            await restoreBackup(unauthReq("http://localhost/api/backup/restore", "{}")),
            401,
        );
        expectAuthBlocked(
            await restoreBackup(foreignReq("http://localhost/api/backup/restore", "{}")),
            403,
        );
        expect(count("tasks")).toBe(before);
    });

    it("passes the guard with valid H2 + trusted origin and fails validation safely", async () => {
        const res = await restoreBackup(
            authedReq("http://localhost/api/backup/restore", JSON.stringify({ version: "workos-lite-backup-v1" })),
        );
        expect(res.status).toBe(400);
    });
});

describe("Admin reset authority", () => {
    it("denies unauthenticated and foreign-origin reset before any delete", async () => {
        db.prepare(
            "INSERT INTO tasks (id, title, workspace, status, is_seed) VALUES ('t1', 'Seed', 'avacrm', 'inbox', 1)",
        ).run();
        const before = count("tasks");
        const body = JSON.stringify({ mode: "clear_demo", dry_run: false });
        expectAuthBlocked(await resetDemo(unauthReq("http://localhost/api/admin/reset-demo-data", body)), 401);
        expectAuthBlocked(await resetDemo(foreignReq("http://localhost/api/admin/reset-demo-data", body)), 403);
        expect(count("tasks")).toBe(before);
    });

    it("passes the guard with valid H2 + trusted origin and honors dry-run", async () => {
        db.prepare(
            "INSERT INTO tasks (id, title, workspace, status, is_seed) VALUES ('t1', 'Seed', 'avacrm', 'inbox', 1)",
        ).run();
        const res = await resetDemo(
            authedReq(
                "http://localhost/api/admin/reset-demo-data",
                JSON.stringify({ mode: "clear_demo", dry_run: true }),
            ),
        );
        expect(res.status).toBe(200);
        expect(count("tasks")).toBe(1);
    });
});

describe("Legacy import authority", () => {
    it("denies unauthenticated and foreign-origin import before replace/merge", async () => {
        db.prepare(
            "INSERT INTO tasks (id, title, workspace, status) VALUES ('t1', 'Keep', 'avacrm', 'inbox')",
        ).run();
        const before = count("tasks");
        const body = JSON.stringify({ version: "workos-lite-backup-v1", tasks: [] });
        expectAuthBlocked(
            await importLegacy(unauthReq("http://localhost/api/import?mode=replace", body)),
            401,
        );
        expectAuthBlocked(
            await importLegacy(foreignReq("http://localhost/api/import?mode=replace", body)),
            403,
        );
        expect(count("tasks")).toBe(before);
    });

    it("passes the guard with valid H2 + trusted origin and rejects invalid payloads", async () => {
        const res = await importLegacy(
            authedReq("http://localhost/api/import?mode=replace", "not-json"),
        );
        expect(res.status).toBe(400);
    });
});

describe("Project delete / execute authority", () => {
    function seedProject(): void {
        db.prepare(
            "INSERT INTO projects (id, slug, name, status) VALUES ('p1', 'project-a', 'Project A', 'planned')",
        ).run();
        db.prepare(
            "INSERT INTO tasks (id, title, workspace, status, list_id) VALUES ('t1', 'Task', 'avacrm', 'inbox', 'project-a-1')",
        ).run();
    }

    it("denies unauthenticated and foreign-origin project deletion before cascade", async () => {
        seedProject();
        const before = count("projects");
        expectAuthBlocked(
            await deleteProject(unauthReq("http://localhost/api/projects/project-a"), { params: Promise.resolve({ slug: "project-a" }) }),
            401,
        );
        expectAuthBlocked(
            await executeProjectDelete(foreignReq("http://localhost/api/projects/project-a/execute"), { params: Promise.resolve({ slug: "project-a" }) }),
            403,
        );
        expect(count("projects")).toBe(before);
        expect(count("tasks")).toBe(1);
    });

    it("allows project delete with valid H2 + trusted origin", async () => {
        seedProject();
        const res = await deleteProject(
            authedReq("http://localhost/api/projects/project-a"),
            { params: Promise.resolve({ slug: "project-a" }) },
        );
        expect(res.status).toBe(200);
        expect(count("projects")).toBe(0);
        expect(count("tasks")).toBe(0);
    });
});

describe("Task batch delete authority", () => {
    it("denies unauthenticated batch delete before bulk removal", async () => {
        db.prepare(
            "INSERT INTO tasks (id, title, workspace, status) VALUES ('t1', 'Task', 'avacrm', 'inbox')",
        ).run();
        const before = count("tasks");
        expectAuthBlocked(
            await deleteTaskBatch(unauthReq("http://localhost/api/tasks/batch", JSON.stringify({ ids: ["t1"] }))),
            401,
        );
        expect(count("tasks")).toBe(before);
    });

    it("allows batch delete with valid H2 + trusted origin", async () => {
        db.prepare(
            "INSERT INTO tasks (id, title, workspace, status) VALUES ('t1', 'Task', 'avacrm', 'inbox')",
        ).run();
        const res = await deleteTaskBatch(
            authedReq("http://localhost/api/tasks/batch", JSON.stringify({ ids: ["t1"] })),
        );
        expect(res.status).toBe(200);
        expect(count("tasks")).toBe(0);
    });
});

describe("Docs cleanup-drafts authority", () => {
    it("denies unauthenticated and foreign-origin cleanup before bulk deletion", async () => {
        expectAuthBlocked(await cleanupDrafts(unauthReq("http://localhost/api/docs/cleanup-drafts")), 401);
        expectAuthBlocked(await cleanupDrafts(foreignReq("http://localhost/api/docs/cleanup-drafts")), 403);
        expect(mocks.docsStore.readAllDocs).not.toHaveBeenCalled();
    });

    it("allows cleanup with valid H2 + trusted origin (docsStore mocked, no file IO)", async () => {
        const res = await cleanupDrafts(authedReq("http://localhost/api/docs/cleanup-drafts"));
        expect(res.status).toBe(200);
        expect(mocks.docsStore.readAllDocs).toHaveBeenCalled();
    });
});

describe("Import replace authorized success path", () => {
    it("replaces domain rows for valid H2 + trusted origin", async () => {
        db.prepare(
            "INSERT INTO tasks (id, title, workspace, status) VALUES ('old-1', 'Old', 'avacrm', 'inbox')",
        ).run();
        db.prepare(
            "INSERT INTO tasks (id, title, workspace, status) VALUES ('old-2', 'Old', 'avacrm', 'inbox')",
        ).run();

        const payload = {
            version: "workos-lite-backup-v1",
            exported_at: "2026-08-13T00:00:00.000Z",
            tasks: [{ id: "new-1", title: "New", workspace: "avacrm", status: "inbox" }],
            attachments: [
                { id: "att-1", task_id: "new-1", file_name: "a.txt", storage_path: "uploads/a.txt" },
            ],
            docs: [],
        };

        const res = await importLegacy(
            authedReq("http://localhost/api/import?mode=replace", JSON.stringify(payload)),
        );
        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body).toMatchObject({
            ok: true,
            mode: "replace",
            tasks_imported: 1,
            attachments_imported: 1,
            docs_merged: 0,
        });
        expect(count("tasks")).toBe(1);
        expect(count("attachments")).toBe(1);
        const task = db.prepare("SELECT id FROM tasks").get() as { id: string };
        expect(task.id).toBe("new-1");
    });

    it("still denies unauthenticated and foreign-origin replace with zero delta", async () => {
        db.prepare(
            "INSERT INTO tasks (id, title, workspace, status) VALUES ('t1', 'Keep', 'avacrm', 'inbox')",
        ).run();
        const before = count("tasks");
        const body = JSON.stringify({ version: "workos-lite-backup-v1", tasks: [] });
        expectAuthBlocked(
            await importLegacy(unauthReq("http://localhost/api/import?mode=replace", body)),
            401,
        );
        expectAuthBlocked(
            await importLegacy(foreignReq("http://localhost/api/import?mode=replace", body)),
            403,
        );
        expect(count("tasks")).toBe(before);
    });
});

describe("Backup restore authorized success path", () => {
    it("completes a valid restore for valid H2 + trusted origin (isolated temp dir)", async () => {
        const originalCwd = process.cwd();
        const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "p1e1b-restore-"));
        try {
            const dataDir = path.join(tmp, "data");
            fs.mkdirSync(dataDir, { recursive: true });
            const fileDb = new Database(path.join(dataDir, "workos.db"));
            fileDb.exec("CREATE TABLE probe (id TEXT)");
            fileDb.close();
            process.chdir(tmp);

            db.prepare(
                "INSERT INTO tasks (id, title, workspace, status) VALUES ('old-1', 'Old', 'avacrm', 'inbox')",
            ).run();

            const payload = {
                meta: {
                    app: "workos-lite",
                    schema_version: 1,
                    exported_at: "2026-08-13T00:00:00.000Z",
                },
                data: {
                    tasks: [
                        {
                            id: "rt-1",
                            title: "Restored Task",
                            workspace: "avacrm",
                            status: "inbox",
                            created_at: "2026-01-01T00:00:00.000Z",
                            updated_at: "2026-01-01T00:00:00.000Z",
                        },
                    ],
                    events: [
                        {
                            id: "re-1",
                            title: "Restored Event",
                            workspace: "avacrm",
                            start_time: "2026-01-02T00:00:00.000Z",
                        },
                    ],
                    docs: [],
                    attachments: [],
                },
            };

            const form = new FormData();
            form.append(
                "file",
                new File([JSON.stringify(payload)], "backup.json", { type: "application/json" }),
            );
            const req = new NextRequest("http://localhost/api/backup/restore", {
                method: "POST",
                headers: { cookie: sessionCookie, origin: TRUSTED_ORIGIN },
                body: form,
            });

            const res = await restoreBackup(req);
            expect(res.status).toBe(200);
            const body = await res.json();
            expect(body.ok).toBe(true);
            expect(body.restored).toEqual({ tasks: 1, events: 1, docs: 0, attachments: 0 });
            expect(count("tasks")).toBe(1);
            expect(count("events")).toBe(1);
            const task = db.prepare("SELECT id FROM tasks").get() as { id: string };
            expect(task.id).toBe("rt-1");
        } finally {
            process.chdir(originalCwd);
            fs.rmSync(tmp, { recursive: true, force: true });
        }
    });

    it("still denies unauthenticated and foreign-origin restore with zero delta", async () => {
        const before = count("tasks");
        expectAuthBlocked(
            await restoreBackup(unauthReq("http://localhost/api/backup/restore", "{}")),
            401,
        );
        expectAuthBlocked(
            await restoreBackup(foreignReq("http://localhost/api/backup/restore", "{}")),
            403,
        );
        expect(count("tasks")).toBe(before);
    });
});

function expectAuthBlocked(res: Response, status: number): void {
    expect(res.status).toBe(status);
}
