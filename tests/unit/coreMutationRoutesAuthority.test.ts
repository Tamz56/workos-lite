// P1E.1B focused authority tests for Tier-0 + core H1 mutation families.
// Every protected handler must require a real server-resolved H2 session and a
// trusted origin BEFORE any domain mutation or file side effect.

import Database from "better-sqlite3";
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
}));
vi.mock("@/db/db", () => ({ getDb: mocks.mockGetDb, db: mocks.mockDb }));

import { POST as createTask } from "@/app/api/tasks/route";
import { PATCH as patchTask, DELETE as deleteTask } from "@/app/api/tasks/[id]/route";
import { PATCH as patchBatch, DELETE as deleteBatch } from "@/app/api/tasks/batch/route";
import { POST as runAgent } from "@/app/api/tasks/[id]/run-agent/route";
import { POST as uploadTaskAttachment } from "@/app/api/tasks/[id]/attachments/route";
import { POST as createDoc, DELETE as deleteDocs } from "@/app/api/docs/route";
import { PATCH as patchDoc, DELETE as deleteDoc } from "@/app/api/docs/[id]/route";
import { POST as createEvent } from "@/app/api/events/route";
import { DELETE as deleteEvent } from "@/app/api/events/[id]/route";
import { DELETE as deleteAttachment } from "@/app/api/attachments/[id]/route";
import { POST as createProject } from "@/app/api/projects/route";
import { PUT as updateProject, DELETE as deleteProject } from "@/app/api/projects/[slug]/route";
import { DELETE as executeProjectDelete } from "@/app/api/projects/[slug]/execute/route";
import { POST as createProjectItem } from "@/app/api/projects/[slug]/items/route";
import { PUT as updateProjectItem, DELETE as deleteProjectItem } from "@/app/api/project_items/[id]/route";
import { POST as createProjectFromTemplate } from "@/app/api/admin/create-project-from-template/route";

let db: Database.Database;
let operatorId: string;
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
          status TEXT NOT NULL, scheduled_date TEXT, schedule_bucket TEXT,
          start_time TEXT, end_time TEXT, priority INTEGER, notes TEXT,
          list_id TEXT, parent_task_id TEXT, sort_order INTEGER, sprint_id TEXT,
          review_status TEXT, topic_id TEXT, topic_title TEXT,
          agent_enabled INTEGER DEFAULT 0, is_seed INTEGER DEFAULT 0,
          created_at TEXT, updated_at TEXT, done_at TEXT
        );
        CREATE TABLE docs (
          id TEXT PRIMARY KEY, title TEXT, content_md TEXT, project_id TEXT,
          workspace TEXT, created_at TEXT, updated_at TEXT
        );
        CREATE TABLE events (
          id TEXT PRIMARY KEY, title TEXT, start_time TEXT, end_time TEXT,
          all_day INTEGER, kind TEXT, workspace TEXT, description TEXT,
          created_at TEXT, updated_at TEXT
        );
        CREATE TABLE attachments (
          id TEXT PRIMARY KEY, task_id TEXT, doc_id TEXT, file_name TEXT,
          mime_type TEXT, size_bytes INTEGER, storage_path TEXT, created_at TEXT
        );
        CREATE TABLE lists (
          id TEXT PRIMARY KEY, workspace TEXT NOT NULL, slug TEXT NOT NULL,
          title TEXT NOT NULL, is_seed INTEGER DEFAULT 0,
          created_at TEXT, updated_at TEXT
        );
        CREATE TABLE projects (
          id TEXT PRIMARY KEY, slug TEXT NOT NULL UNIQUE, name TEXT NOT NULL,
          status TEXT NOT NULL, start_date TEXT, end_date TEXT, owner TEXT,
          is_seed INTEGER DEFAULT 0, created_at TEXT DEFAULT (datetime('now')),
          updated_at TEXT DEFAULT (datetime('now')),
          category TEXT, registry_status TEXT, priority TEXT, current_goal TEXT,
          progress_stage TEXT, next_action TEXT, cadence TEXT,
          risk_or_blocked_by TEXT, metadata_updated_at TEXT
        );
        CREATE TABLE project_items (
          id TEXT PRIMARY KEY, project_id TEXT NOT NULL, title TEXT NOT NULL,
          status TEXT NOT NULL, priority INTEGER, schedule_bucket TEXT,
          start_date TEXT, end_date TEXT, is_milestone INTEGER DEFAULT 0,
          workstream TEXT, dod_text TEXT, notes TEXT,
          created_at TEXT DEFAULT (datetime('now')),
          updated_at TEXT DEFAULT (datetime('now'))
        );
    `);
}

function count(table: string): number {
    return (db.prepare(`SELECT COUNT(*) AS c FROM ${table}`).get() as { c: number }).c;
}

function expectAuthBlocked(res: Response, status: number): void {
    expect(res.status).toBe(status);
}

function unauthReq(url: string, body?: string): ReturnType<typeof humanMutationRequest> {
    return humanMutationRequest(url, { origin: TRUSTED_ORIGIN, body });
}

function foreignReq(url: string, body?: string): ReturnType<typeof humanMutationRequest> {
    return humanMutationRequest(url, { cookieHeader: sessionCookie, origin: FOREIGN_ORIGIN, body });
}

beforeEach(() => {
    db = createHumanAuthDb();
    createTables();
    operatorId = seedHumanOperator(db);
    sessionCookie = createTestH2Session(db, operatorId).cookieHeader;
    attachDb(mocks.mockDb, db);
    mocks.mockGetDb.mockReturnValue(db);
    vi.stubEnv("WORKOS_TRUSTED_ORIGINS", TRUSTED_ORIGIN);
});

afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
    db.close();
});

describe("Tasks family authority", () => {
    it("blocks unauthenticated and foreign-origin task creation with zero delta", async () => {
        const before = count("tasks");
        const unauth = await createTask(humanMutationRequest("http://localhost/api/tasks", { origin: TRUSTED_ORIGIN }));
        expectAuthBlocked(unauth, 401);
        const foreign = await createTask(
            humanMutationRequest("http://localhost/api/tasks", { cookieHeader: sessionCookie, origin: FOREIGN_ORIGIN }),
        );
        expectAuthBlocked(foreign, 403);
        expect(count("tasks")).toBe(before);
    });

    it("allows task creation with valid H2 + trusted origin", async () => {
        const res = await createTask(
            humanMutationRequest("http://localhost/api/tasks", {
                cookieHeader: sessionCookie,
                origin: TRUSTED_ORIGIN,
                body: JSON.stringify({ title: "Authorized task" }),
            }),
        );
        expect(res.status).toBe(201);
        expect(count("tasks")).toBe(1);
    });

    it("blocks unauthenticated task update/delete/batch/run-agent/attachment with zero delta", async () => {
        db.prepare(
            "INSERT INTO tasks (id, title, workspace, status) VALUES ('t1', 'Task', 'avacrm', 'inbox')",
        ).run();
        const before = count("tasks");

        expectAuthBlocked(await patchTask(unauthReq("http://localhost/api/tasks/t1"), { params: Promise.resolve({ id: "t1" }) }), 401);
        expectAuthBlocked(await deleteTask(unauthReq("http://localhost/api/tasks/t1"), { params: Promise.resolve({ id: "t1" }) }), 401);
        expectAuthBlocked(await patchBatch(unauthReq("http://localhost/api/tasks/batch")), 401);
        expectAuthBlocked(await deleteBatch(unauthReq("http://localhost/api/tasks/batch")), 401);
        expectAuthBlocked(await runAgent(unauthReq("http://localhost/api/tasks/t1/run-agent"), { params: Promise.resolve({ id: "t1" }) }), 401);
        expectAuthBlocked(await uploadTaskAttachment(unauthReq("http://localhost/api/tasks/t1/attachments"), { params: Promise.resolve({ id: "t1" }) }), 401);
        expect(count("tasks")).toBe(before);
    });

    it("blocks foreign-origin task mutations with zero delta", async () => {
        db.prepare(
            "INSERT INTO tasks (id, title, workspace, status) VALUES ('t1', 'Task', 'avacrm', 'inbox')",
        ).run();
        const before = count("tasks");

        expectAuthBlocked(await patchTask(foreignReq("http://localhost/api/tasks/t1"), { params: Promise.resolve({ id: "t1" }) }), 403);
        expectAuthBlocked(await deleteTask(foreignReq("http://localhost/api/tasks/t1"), { params: Promise.resolve({ id: "t1" }) }), 403);
        expectAuthBlocked(await patchBatch(foreignReq("http://localhost/api/tasks/batch")), 403);
        expectAuthBlocked(await deleteBatch(foreignReq("http://localhost/api/tasks/batch")), 403);
        expect(count("tasks")).toBe(before);
    });

    it("allows task update/delete with valid H2 + trusted origin", async () => {
        db.prepare(
            "INSERT INTO tasks (id, title, workspace, status) VALUES ('t1', 'Task', 'avacrm', 'inbox')",
        ).run();
        const patched = await patchTask(
            humanMutationRequest("http://localhost/api/tasks/t1", {
                cookieHeader: sessionCookie,
                origin: TRUSTED_ORIGIN,
                method: "PATCH",
                body: JSON.stringify({ title: "Updated" }),
            }),
            { params: Promise.resolve({ id: "t1" }) },
        );
        expect(patched.status).toBe(200);
        const deleted = await deleteTask(
            humanMutationRequest("http://localhost/api/tasks/t1", {
                cookieHeader: sessionCookie,
                origin: TRUSTED_ORIGIN,
                method: "DELETE",
            }),
            { params: Promise.resolve({ id: "t1" }) },
        );
        expect(deleted.status).toBe(200);
        expect(count("tasks")).toBe(0);
    });
});

describe("Docs family authority", () => {
    it("blocks unauthenticated doc mutations with zero delta", async () => {
        db.prepare(
            "INSERT INTO docs (id, title, content_md, created_at, updated_at) VALUES ('d1', 'Doc', '', 't', 't')",
        ).run();
        const before = count("docs");

        expectAuthBlocked(await createDoc(unauthReq("http://localhost/api/docs")), 401);
        expectAuthBlocked(await deleteDocs(unauthReq("http://localhost/api/docs")), 401);
        expectAuthBlocked(await patchDoc(unauthReq("http://localhost/api/docs/d1"), { params: Promise.resolve({ id: "d1" }) }), 401);
        expectAuthBlocked(await deleteDoc(unauthReq("http://localhost/api/docs/d1"), { params: Promise.resolve({ id: "d1" }) }), 401);
        expect(count("docs")).toBe(before);
    });

    it("allows doc create/update/delete with valid H2 + trusted origin", async () => {
        const created = await createDoc(
            humanMutationRequest("http://localhost/api/docs", {
                cookieHeader: sessionCookie,
                origin: TRUSTED_ORIGIN,
                body: JSON.stringify({ title: "Doc", content_md: "x" }),
            }),
        );
        expect(created.status).toBe(201);
        expect(count("docs")).toBe(1);

        const id = ((await created.json()) as { doc: { id: string } }).doc.id;
        const patched = await patchDoc(
            humanMutationRequest(`http://localhost/api/docs/${id}`, {
                cookieHeader: sessionCookie,
                origin: TRUSTED_ORIGIN,
                method: "PATCH",
                body: JSON.stringify({ title: "Updated" }),
            }),
            { params: Promise.resolve({ id }) },
        );
        expect(patched.status).toBe(200);

        const deleted = await deleteDoc(
            humanMutationRequest(`http://localhost/api/docs/${id}`, {
                cookieHeader: sessionCookie,
                origin: TRUSTED_ORIGIN,
                method: "DELETE",
            }),
            { params: Promise.resolve({ id }) },
        );
        expect(deleted.status).toBe(200);
        expect(count("docs")).toBe(0);
    });
});

describe("Events + Attachments authority", () => {
    it("blocks unauthenticated event/attachment mutations with zero delta", async () => {
        db.prepare(
            "INSERT INTO events (id, title, start_time, created_at, updated_at) VALUES ('e1', 'Event', '2026-01-01T00:00:00.000Z', 't', 't')",
        ).run();
        db.prepare(
            "INSERT INTO attachments (id, task_id, file_name, storage_path, created_at) VALUES ('a1', 't1', 'f.txt', 'missing.txt', 't')",
        ).run();
        const eventsBefore = count("events");
        const attachmentsBefore = count("attachments");

        expectAuthBlocked(await createEvent(unauthReq("http://localhost/api/events")), 401);
        expectAuthBlocked(await deleteEvent(unauthReq("http://localhost/api/events/e1"), { params: Promise.resolve({ id: "e1" }) }), 401);
        expectAuthBlocked(await deleteAttachment(unauthReq("http://localhost/api/attachments/a1"), { params: Promise.resolve({ id: "a1" }) }), 401);
        expect(count("events")).toBe(eventsBefore);
        expect(count("attachments")).toBe(attachmentsBefore);
    });

    it("allows event create/delete and attachment delete with valid H2 + trusted origin", async () => {
        const created = await createEvent(
            humanMutationRequest("http://localhost/api/events", {
                cookieHeader: sessionCookie,
                origin: TRUSTED_ORIGIN,
                body: JSON.stringify({ title: "Event", start_time: "2026-01-01T00:00:00.000Z" }),
            }),
        );
        expect(created.status).toBe(201);
        expect(count("events")).toBe(1);

        const id = ((await created.json()) as { event: { id: string } }).event.id;
        const deleted = await deleteEvent(
            humanMutationRequest(`http://localhost/api/events/${id}`, {
                cookieHeader: sessionCookie,
                origin: TRUSTED_ORIGIN,
                method: "DELETE",
            }),
            { params: Promise.resolve({ id }) },
        );
        expect(deleted.status).toBe(200);
        expect(count("events")).toBe(0);

        db.prepare(
            "INSERT INTO attachments (id, task_id, file_name, storage_path, created_at) VALUES ('a1', 't1', 'f.txt', 'missing.txt', 't')",
        ).run();
        const attachmentDeleted = await deleteAttachment(
            humanMutationRequest("http://localhost/api/attachments/a1", {
                cookieHeader: sessionCookie,
                origin: TRUSTED_ORIGIN,
                method: "DELETE",
            }),
            { params: Promise.resolve({ id: "a1" }) },
        );
        expect(attachmentDeleted.status).toBe(200);
        expect(count("attachments")).toBe(0);
    });
});

describe("Projects / project-items authority", () => {
    function seedProject(): void {
        db.prepare(
            "INSERT INTO projects (id, slug, name, status) VALUES ('p1', 'project-a', 'Project A', 'planned')",
        ).run();
        db.prepare(
            "INSERT INTO project_items (id, project_id, title, status) VALUES ('pi1', 'p1', 'Item', 'inbox')",
        ).run();
    }

    it("blocks unauthenticated project mutations with zero delta", async () => {
        seedProject();
        const projectsBefore = count("projects");
        const itemsBefore = count("project_items");

        expectAuthBlocked(await createProject(unauthReq("http://localhost/api/projects")), 401);
        expectAuthBlocked(await updateProject(unauthReq("http://localhost/api/projects/project-a"), { params: Promise.resolve({ slug: "project-a" }) }), 401);
        expectAuthBlocked(await deleteProject(unauthReq("http://localhost/api/projects/project-a"), { params: Promise.resolve({ slug: "project-a" }) }), 401);
        expectAuthBlocked(await executeProjectDelete(unauthReq("http://localhost/api/projects/project-a/execute"), { params: Promise.resolve({ slug: "project-a" }) }), 401);
        expectAuthBlocked(await createProjectItem(unauthReq("http://localhost/api/projects/project-a/items"), { params: Promise.resolve({ slug: "project-a" }) }), 401);
        expectAuthBlocked(await updateProjectItem(unauthReq("http://localhost/api/project_items/pi1"), { params: Promise.resolve({ id: "pi1" }) }), 401);
        expectAuthBlocked(await deleteProjectItem(unauthReq("http://localhost/api/project_items/pi1"), { params: Promise.resolve({ id: "pi1" }) }), 401);
        expect(count("projects")).toBe(projectsBefore);
        expect(count("project_items")).toBe(itemsBefore);
    });

    it("blocks foreign-origin project mutations with zero delta", async () => {
        seedProject();
        const projectsBefore = count("projects");

        expectAuthBlocked(await createProject(foreignReq("http://localhost/api/projects")), 403);
        expectAuthBlocked(await deleteProject(foreignReq("http://localhost/api/projects/project-a"), { params: Promise.resolve({ slug: "project-a" }) }), 403);
        expect(count("projects")).toBe(projectsBefore);
    });

    it("allows project create/update/delete and item mutations with valid H2 + trusted origin", async () => {
        const created = await createProject(
            humanMutationRequest("http://localhost/api/projects", {
                cookieHeader: sessionCookie,
                origin: TRUSTED_ORIGIN,
                body: JSON.stringify({ name: "Project A", slug: "project-a" }),
            }),
        );
        expect(created.status).toBe(200);

        const updated = await updateProject(
            humanMutationRequest("http://localhost/api/projects/project-a", {
                cookieHeader: sessionCookie,
                origin: TRUSTED_ORIGIN,
                method: "PUT",
                body: JSON.stringify({ name: "Project A2" }),
            }),
            { params: Promise.resolve({ slug: "project-a" }) },
        );
        expect(updated.status).toBe(200);

        const item = await createProjectItem(
            humanMutationRequest("http://localhost/api/projects/project-a/items", {
                cookieHeader: sessionCookie,
                origin: TRUSTED_ORIGIN,
                body: JSON.stringify({ title: "Item", status: "inbox" }),
            }),
            { params: Promise.resolve({ slug: "project-a" }) },
        );
        expect(item.status).toBe(200);
        const itemId = ((await item.json()) as { id: string }).id;

        const itemUpdated = await updateProjectItem(
            humanMutationRequest(`http://localhost/api/project_items/${itemId}`, {
                cookieHeader: sessionCookie,
                origin: TRUSTED_ORIGIN,
                method: "PUT",
                body: JSON.stringify({ title: "Item2" }),
            }),
            { params: Promise.resolve({ id: itemId }) },
        );
        expect(itemUpdated.status).toBe(200);

        const itemDeleted = await deleteProjectItem(
            humanMutationRequest(`http://localhost/api/project_items/${itemId}`, {
                cookieHeader: sessionCookie,
                origin: TRUSTED_ORIGIN,
                method: "DELETE",
            }),
            { params: Promise.resolve({ id: itemId }) },
        );
        expect(itemDeleted.status).toBe(200);

        const deleted = await deleteProject(
            humanMutationRequest("http://localhost/api/projects/project-a", {
                cookieHeader: sessionCookie,
                origin: TRUSTED_ORIGIN,
                method: "DELETE",
            }),
            { params: Promise.resolve({ slug: "project-a" }) },
        );
        expect(deleted.status).toBe(200);
        expect(count("projects")).toBe(0);
    });
});

describe("Admin template authority", () => {
    it("blocks unauthenticated and foreign-origin template creation", async () => {
        const noAuth = humanMutationRequest("http://localhost/api/admin/create-project-from-template", {
            origin: TRUSTED_ORIGIN,
            body: JSON.stringify({ projectName: "X", templateId: "missing" }),
        });
        expectAuthBlocked(await createProjectFromTemplate(noAuth), 401);

        const foreign = humanMutationRequest("http://localhost/api/admin/create-project-from-template", {
            cookieHeader: sessionCookie,
            origin: FOREIGN_ORIGIN,
            body: JSON.stringify({ projectName: "X", templateId: "missing" }),
        });
        expectAuthBlocked(await createProjectFromTemplate(foreign), 403);
        expect(count("projects")).toBe(0);
    });

    it("passes the guard with valid H2 + trusted origin (reaches template lookup)", async () => {
        const res = await createProjectFromTemplate(
            humanMutationRequest("http://localhost/api/admin/create-project-from-template", {
                cookieHeader: sessionCookie,
                origin: TRUSTED_ORIGIN,
                body: JSON.stringify({ projectName: "X", templateId: "missing" }),
            }),
        );
        expect(res.status).toBe(404);
    });
});
