// P1E.1C targeted evidence closure — high-risk authorized-success paths.
// Valid H2 + trusted Origin must preserve the real mutation/cascade/apply
// behavior for multi-action, cascade, and apply surfaces; denial retained.

import Database from "better-sqlite3";
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
    createHumanAuthDb,
    createTestH2Session,
    humanMutationRequest,
    seedHumanOperator,
    TRUSTED_ORIGIN,
    FOREIGN_ORIGIN,
} from "../helpers/humanSession";
import { createRemainingH1Schema } from "../helpers/p1eH1Schema";
import { CANONICAL_ROSE_TRIAL_SCHEDULE } from "../fixtures/plannerImportCanonical";

const mocks = vi.hoisted(() => ({
    mockGetDb: vi.fn(),
    mockDb: {} as Record<string, unknown>,
    appendImportLog: vi.fn(),
}));
vi.mock("@/db/db", () => ({ getDb: mocks.mockGetDb, db: mocks.mockDb }));
vi.mock("@/lib/arborInboxStore", () => ({ appendImportLog: mocks.appendImportLog }));

import { POST as arborInbox } from "@/app/api/arbor-inbox/route";
import { DELETE as deleteEpisode } from "@/app/api/content/writing-lab/episodes/[id]/route";
import { POST as executePlannerImport } from "@/app/api/planner-import/execute/route";
import { DELETE as deleteList } from "@/app/api/lists/[id]/route";
import { POST as archiveDocBlock } from "@/app/api/projects/[slug]/doc-blocks/[blockId]/archive/route";
import { POST as restoreDocBlock } from "@/app/api/projects/[slug]/doc-blocks/[blockId]/restore/route";
import { POST as contentPackage } from "@/app/api/content/package/route";

let db: Database.Database;
let sessionCookie: string;

function attachDb(target: Record<string, unknown>, source: Database.Database): void {
    target.prepare = source.prepare.bind(source);
    target.transaction = source.transaction.bind(source);
    target.exec = source.exec.bind(source);
    target.pragma = source.pragma.bind(source);
    target.close = source.close.bind(source);
}

function count(table: string): number {
    return (db.prepare(`SELECT COUNT(*) AS c FROM ${table}`).get() as { c: number }).c;
}

function authedReq(url: string, body?: string): NextRequest {
    return humanMutationRequest(url, { cookieHeader: sessionCookie, origin: TRUSTED_ORIGIN, body });
}

function unauthReq(url: string, body?: string): NextRequest {
    return humanMutationRequest(url, { origin: TRUSTED_ORIGIN, body });
}

function foreignReq(url: string, body?: string): NextRequest {
    return humanMutationRequest(url, { cookieHeader: sessionCookie, origin: FOREIGN_ORIGIN, body });
}

const P = (v: Record<string, string>) => ({ params: Promise.resolve(v) });

beforeEach(() => {
    db = createHumanAuthDb();
    createRemainingH1Schema(db);
    // Planner Import execute requires the import-fingerprint project_items shape.
    db.exec(`
        DROP TABLE project_items;
        CREATE TABLE project_items (
          id TEXT PRIMARY KEY, project_id TEXT NOT NULL, title TEXT NOT NULL,
          status TEXT NOT NULL, start_date TEXT, dod_text TEXT, notes TEXT,
          import_fingerprint TEXT
        );
        CREATE UNIQUE INDEX idx_project_items_import_fingerprint
          ON project_items(import_fingerprint)
          WHERE import_fingerprint IS NOT NULL;
    `);
    db.prepare(
        "INSERT INTO projects (id, slug, name, status) VALUES ('P1', 'workos-lite-arbordesk', 'WorkOS Lite', 'planned')",
    ).run();
    const operatorId = seedHumanOperator(db);
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

describe("Arbor Inbox authorized success", () => {
    it("executes a representative import action with valid H2 + trusted origin", async () => {
        const res = await arborInbox(
            authedReq(
                "http://localhost/api/arbor-inbox",
                JSON.stringify({
                    action: "import",
                    payload: {
                        schemaVersion: "workos-arbor-import-v0.1",
                        source: "p1e1c-test",
                        importBatchTitle: "Test batch",
                        items: [
                            { type: "project", title: "Rose Trial", status: "planned" },
                            {
                                type: "task",
                                title: "Buy soil",
                                targetProject: "Rose Trial",
                                workspace: "avacrm",
                                status: "inbox",
                            },
                        ],
                    },
                }),
            ),
        );
        expect(res.status).toBeLessThan(400);
        expect(count("projects")).toBe(2);
        expect(count("tasks")).toBe(1);
    });

    it("denies unauthenticated dispatch before any side effect", async () => {
        const projectsBefore = count("projects");
        const tasksBefore = count("tasks");
        const res = await arborInbox(
            unauthReq("http://localhost/api/arbor-inbox", JSON.stringify({ action: "import", items: [] })),
        );
        expect(res.status).toBe(401);
        expect(count("projects")).toBe(projectsBefore);
        expect(count("tasks")).toBe(tasksBefore);
    });
});

describe("Writing Lab cascade (episode delete)", () => {
    function seedEpisodeWithChild(): void {
        db.prepare(
            "INSERT INTO gf_episodes (id, story_set_id, title, role, status, created_at, updated_at) VALUES ('e1', NULL, 'Episode', 'role', 'active', 't', 't')",
        ).run();
        db.prepare(
            "INSERT INTO gf_writing_projects (id, episode_id, title, status, created_at, updated_at) VALUES ('gp1', 'e1', 'Child Project', 'draft', 't', 't')",
        ).run();
    }

    it("deletes the episode and cascades child projects with valid H2 + trusted origin", async () => {
        seedEpisodeWithChild();
        const res = await deleteEpisode(authedReq("http://localhost/api/content/writing-lab/episodes/e1"), P({ id: "e1" }));
        expect(res.status).toBeLessThan(400);
        expect(count("gf_episodes")).toBe(0);
        expect(count("gf_writing_projects")).toBe(0);
    });

    it("denies unauthenticated and foreign-origin cascade with zero delta", async () => {
        seedEpisodeWithChild();
        const episodesBefore = count("gf_episodes");
        const projectsBefore = count("gf_writing_projects");
        expectAuthBlocked(
            await deleteEpisode(unauthReq("http://localhost/api/content/writing-lab/episodes/e1"), P({ id: "e1" })),
            401,
        );
        expectAuthBlocked(
            await deleteEpisode(foreignReq("http://localhost/api/content/writing-lab/episodes/e1"), P({ id: "e1" })),
            403,
        );
        expect(count("gf_episodes")).toBe(episodesBefore);
        expect(count("gf_writing_projects")).toBe(projectsBefore);
    });
});

describe("Planner Import execute authorized apply", () => {
    it("applies a real schedule with valid H2 + trusted origin", async () => {
        const res = await executePlannerImport(
            authedReq(
                "http://localhost/api/planner-import/execute",
                JSON.stringify({
                    raw_text: CANONICAL_ROSE_TRIAL_SCHEDULE,
                    project_id: "P1",
                    conflict_policy: "append",
                    confirmed: true,
                }),
            ),
        );
        expect(res.status).toBeLessThan(400);
        expect(count("planner_import_batches")).toBe(1);
        expect(count("project_items")).toBeGreaterThan(0);
        expect(count("planner_days")).toBeGreaterThan(0);
        expect(count("planner_items")).toBeGreaterThan(0);
    });

    it("denies unauthenticated and foreign-origin apply with zero delta", async () => {
        const body = JSON.stringify({
            raw_text: CANONICAL_ROSE_TRIAL_SCHEDULE,
            project_id: "P1",
            conflict_policy: "append",
            confirmed: true,
        });
        const batchesBefore = count("planner_import_batches");
        const itemsBefore = count("project_items");
        expectAuthBlocked(await executePlannerImport(unauthReq("http://localhost/api/planner-import/execute", body)), 401);
        expectAuthBlocked(await executePlannerImport(foreignReq("http://localhost/api/planner-import/execute", body)), 403);
        expect(count("planner_import_batches")).toBe(batchesBefore);
        expect(count("project_items")).toBe(itemsBefore);
    });
});

describe("Lists delete detach behavior", () => {
    function seedListWithTask(): void {
        db.prepare(
            "INSERT INTO lists (id, workspace, slug, title, created_at, updated_at) VALUES ('l1', 'avacrm', 'my-list', 'My List', 't', 't')",
        ).run();
        db.prepare(
            "INSERT INTO tasks (id, title, workspace, status, list_id) VALUES ('t1', 'Task', 'avacrm', 'inbox', 'l1')",
        ).run();
    }

    it("detaches tasks and deletes the list with valid H2 + trusted origin", async () => {
        seedListWithTask();
        const res = await deleteList(authedReq("http://localhost/api/lists/l1"), P({ id: "l1" }));
        expect(res.status).toBe(200);
        expect(count("lists")).toBe(0);
        expect(count("tasks")).toBe(1);
        const task = db.prepare("SELECT list_id FROM tasks WHERE id = 't1'").get() as { list_id: string | null };
        expect(task.list_id).toBeNull();
    });

    it("denies unauthenticated delete with zero delta", async () => {
        seedListWithTask();
        const listsBefore = count("lists");
        const tasksBefore = count("tasks");
        expectAuthBlocked(await deleteList(unauthReq("http://localhost/api/lists/l1"), P({ id: "l1" })), 401);
        expect(count("lists")).toBe(listsBefore);
        expect(count("tasks")).toBe(tasksBefore);
    });
});

describe("Project secondary state transition (doc-block archive/restore)", () => {
    function seedBlock(updatedAt: string): void {
        db.prepare(`
            INSERT INTO project_doc_blocks (
                id, project_id, block_type, title, block_date, summary, details_md,
                evidence_links_json, related_files_json, status, reviewed_by_user,
                created_at, updated_at
            ) VALUES ('b1', 'P1', 'process_note', 'Block', '2026-08-02', 'Summary', 'Details',
                '[]', '[]', 'active', 1, ?, ?)
        `).run(updatedAt, updatedAt);
    }

    it("archives and restores a block with valid H2 + trusted origin", async () => {
        seedBlock("2026-08-01T12:00:00.000Z");

        const archived = await archiveDocBlock(
            authedReq(
                "http://localhost/api/projects/workos-lite-arbordesk/doc-blocks/b1/archive",
                JSON.stringify({ expectedUpdatedAt: "2026-08-01T12:00:00.000Z" }),
            ),
            P({ slug: "workos-lite-arbordesk", blockId: "b1" }),
        );
        expect(archived.status).toBeLessThan(400);
        const afterArchive = db.prepare("SELECT status, updated_at FROM project_doc_blocks WHERE id = 'b1'").get() as {
            status: string;
            updated_at: string;
        };
        expect(afterArchive.status).toBe("archived");

        const restored = await restoreDocBlock(
            authedReq(
                "http://localhost/api/projects/workos-lite-arbordesk/doc-blocks/b1/restore",
                JSON.stringify({ expectedUpdatedAt: afterArchive.updated_at }),
            ),
            P({ slug: "workos-lite-arbordesk", blockId: "b1" }),
        );
        expect(restored.status).toBeLessThan(400);
        const afterRestore = db.prepare("SELECT status FROM project_doc_blocks WHERE id = 'b1'").get() as {
            status: string;
        };
        expect(afterRestore.status).toBe("active");
    });

    it("denies unauthenticated archive with zero delta", async () => {
        seedBlock("2026-08-01T12:00:00.000Z");
        const before = count("project_doc_blocks");
        expectAuthBlocked(
            await archiveDocBlock(
                unauthReq("http://localhost/api/projects/workos-lite-arbordesk/doc-blocks/b1/archive", JSON.stringify({})),
                P({ slug: "workos-lite-arbordesk", blockId: "b1" }),
            ),
            401,
        );
        expect(count("project_doc_blocks")).toBe(before);
    });
});

describe("Content Package multi-write", () => {
    it("creates docs and tasks with valid H2 + trusted origin", async () => {
        const res = await contentPackage(
            authedReq(
                "http://localhost/api/content/package",
                JSON.stringify({ topicId: "TOPIC-001", topicTitle: "Topic Title" }),
            ),
        );
        expect(res.status).toBeLessThan(400);
        expect(count("docs")).toBe(1);
        expect(count("tasks")).toBeGreaterThanOrEqual(1);
    });

    it("denies unauthenticated package creation with zero delta", async () => {
        const docsBefore = count("docs");
        const tasksBefore = count("tasks");
        expectAuthBlocked(
            await contentPackage(
                unauthReq("http://localhost/api/content/package", JSON.stringify({ topicId: "TOPIC-001", topicTitle: "Topic" })),
            ),
            401,
        );
        expect(count("docs")).toBe(docsBefore);
        expect(count("tasks")).toBe(tasksBefore);
    });
});

function expectAuthBlocked(res: Response, status: number): void {
    expect(res.status).toBe(status);
}
