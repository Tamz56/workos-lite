// P1E.1C Phase A — remaining H1 mutation family authority matrix.
// Every remaining family handler: unauth → 401 delta 0, foreign origin → 403
// delta 0, valid H2 + trusted origin → existing behavior preserved (representative).

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

const mocks = vi.hoisted(() => ({
    mockGetDb: vi.fn(),
    mockDb: {} as Record<string, unknown>,
    seedArborWritingLab: vi.fn(),
}));
vi.mock("@/db/db", () => ({
    getDb: mocks.mockGetDb,
    db: mocks.mockDb,
    seedArborWritingLab: mocks.seedArborWritingLab,
}));

import { POST as createNote, } from "@/app/api/notes/route";
import { PATCH as patchNote, DELETE as deleteNote } from "@/app/api/notes/[id]/route";
import { POST as createNoteLink, DELETE as deleteNoteLink } from "@/app/api/notes/links/route";
import { POST as createList } from "@/app/api/lists/route";
import { PATCH as patchList, DELETE as deleteList } from "@/app/api/lists/[id]/route";
import { POST as createSprint } from "@/app/api/sprints/route";
import { POST as addSprintItem, DELETE as removeSprintItem } from "@/app/api/sprints/[id]/items/route";
import { POST as createPlannerDay, PATCH as patchPlannerDay } from "@/app/api/planner/[date]/route";
import { POST as createPlannerItem } from "@/app/api/planner/[date]/items/route";
import { PATCH as patchPlannerItem, DELETE as deletePlannerItem } from "@/app/api/planner/[date]/items/[id]/route";
import { POST as executePlannerImport } from "@/app/api/planner-import/execute/route";
import { POST as createStorySet } from "@/app/api/content/writing-lab/story-sets/route";
import { POST as createEpisode } from "@/app/api/content/writing-lab/episodes/route";
import { PATCH as patchEpisode, DELETE as deleteEpisode } from "@/app/api/content/writing-lab/episodes/[id]/route";
import { POST as createLabProject } from "@/app/api/content/writing-lab/projects/route";
import { PATCH as patchLabProject, DELETE as deleteLabProject } from "@/app/api/content/writing-lab/projects/[id]/route";
import { POST as createBlock, PUT as putBlocks } from "@/app/api/content/writing-lab/projects/[id]/blocks/route";
import { POST as seedLab } from "@/app/api/content/writing-lab/seed/route";
import { POST as createDraft } from "@/app/api/content/writing-desk/drafts/route";
import { PATCH as patchDraft, DELETE as deleteDraft } from "@/app/api/content/writing-desk/drafts/[id]/route";
import { POST as createReview } from "@/app/api/content/writing-desk/review/route";
import { POST as createPromptTemplate } from "@/app/api/prompt-templates/route";
import { PATCH as patchPromptTemplate, DELETE as deletePromptTemplate } from "@/app/api/prompt-templates/[id]/route";
import { POST as createPromptVersion } from "@/app/api/prompt-templates/[id]/versions/route";
import { PATCH as patchPromptVersion, DELETE as deletePromptVersion } from "@/app/api/prompt-templates/[id]/versions/[versionId]/route";
import { POST as createPromptWorkflow } from "@/app/api/prompt-workflows/route";
import { PATCH as patchPromptWorkflow, DELETE as deletePromptWorkflow } from "@/app/api/prompt-workflows/[id]/route";
import { POST as createPromptStep } from "@/app/api/prompt-workflows/[id]/steps/route";
import { PATCH as patchPromptStep, DELETE as deletePromptStep } from "@/app/api/prompt-workflows/[id]/steps/[stepId]/route";
import { POST as createRunLog, PATCH as patchRunLog } from "@/app/api/prompt-run-logs/route";
import { POST as arborInbox } from "@/app/api/arbor-inbox/route";
import { POST as contentPackage } from "@/app/api/content/package/route";
import { POST as createDocBlock } from "@/app/api/projects/[slug]/doc-blocks/route";
import { PATCH as patchDocBlock } from "@/app/api/projects/[slug]/doc-blocks/[blockId]/route";
import { POST as archiveDocBlock } from "@/app/api/projects/[slug]/doc-blocks/[blockId]/archive/route";
import { POST as restoreDocBlock } from "@/app/api/projects/[slug]/doc-blocks/[blockId]/restore/route";
import { POST as createDecision, DELETE as deleteDecision } from "@/app/api/projects/[slug]/decisions/route";
import { POST as createLoop, PATCH as patchLoop } from "@/app/api/projects/[slug]/loops/route";
import { POST as createGate } from "@/app/api/projects/[slug]/loops/gates/route";
import { POST as createContext } from "@/app/api/projects/[slug]/context/route";

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

function unauthReq(url: string, body?: string): NextRequest {
    return humanMutationRequest(url, { origin: TRUSTED_ORIGIN, body });
}

function foreignReq(url: string, body?: string): NextRequest {
    return humanMutationRequest(url, { cookieHeader: sessionCookie, origin: FOREIGN_ORIGIN, body });
}

function authedReq(url: string, body?: string): NextRequest {
    return humanMutationRequest(url, { cookieHeader: sessionCookie, origin: TRUSTED_ORIGIN, body });
}

type Case = {
    label: string;
    table: string;
    call: (req: NextRequest) => Promise<Response>;
};

const P = (v: Record<string, string>) => ({ params: Promise.resolve(v) });

const cases: Case[] = [
    { label: "notes POST", table: "notes", call: (r) => createNote(r) },
    { label: "notes PATCH", table: "notes", call: (r) => patchNote(r, P({ id: "n1" })) },
    { label: "notes DELETE", table: "notes", call: (r) => deleteNote(r, P({ id: "n1" })) },
    { label: "notes links POST", table: "note_links", call: (r) => createNoteLink(r) },
    { label: "notes links DELETE", table: "note_links", call: (r) => deleteNoteLink(r) },
    { label: "lists POST", table: "lists", call: (r) => createList(r) },
    { label: "lists PATCH", table: "lists", call: (r) => patchList(r, P({ id: "l1" })) },
    { label: "lists DELETE", table: "lists", call: (r) => deleteList(r, P({ id: "l1" })) },
    { label: "sprints POST", table: "sprints", call: (r) => createSprint(r) },
    { label: "sprints items POST", table: "sprint_items", call: (r) => addSprintItem(r, P({ id: "s1" })) },
    { label: "sprints items DELETE", table: "sprint_items", call: (r) => removeSprintItem(r, P({ id: "s1" })) },
    { label: "planner day POST", table: "planner_days", call: (r) => createPlannerDay(r, P({ date: "2026-07-13" })) },
    { label: "planner day PATCH", table: "planner_days", call: (r) => patchPlannerDay(r, P({ date: "2026-07-13" })) },
    { label: "planner items POST", table: "planner_items", call: (r) => createPlannerItem(r, P({ date: "2026-07-13" })) },
    { label: "planner items PATCH", table: "planner_items", call: (r) => patchPlannerItem(r, P({ date: "2026-07-13", id: "pi1" })) },
    { label: "planner items DELETE", table: "planner_items", call: (r) => deletePlannerItem(r, P({ date: "2026-07-13", id: "pi1" })) },
    { label: "planner-import execute POST", table: "planner_import_batches", call: (r) => executePlannerImport(r) },
    { label: "story-sets POST", table: "gf_story_sets", call: (r) => createStorySet(r) },
    { label: "episodes POST", table: "gf_episodes", call: (r) => createEpisode(r) },
    { label: "episodes PATCH", table: "gf_episodes", call: (r) => patchEpisode(r, P({ id: "e1" })) },
    { label: "episodes DELETE", table: "gf_episodes", call: (r) => deleteEpisode(r, P({ id: "e1" })) },
    { label: "lab projects POST", table: "gf_writing_projects", call: (r) => createLabProject(r) },
    { label: "lab projects PATCH", table: "gf_writing_projects", call: (r) => patchLabProject(r, P({ id: "p1" })) },
    { label: "lab projects DELETE", table: "gf_writing_projects", call: (r) => deleteLabProject(r, P({ id: "p1" })) },
    { label: "lab blocks POST", table: "gf_writing_blocks", call: (r) => createBlock(r, P({ id: "p1" })) },
    { label: "lab blocks PUT", table: "gf_writing_blocks", call: (r) => putBlocks(r, P({ id: "p1" })) },
    { label: "writing-lab seed POST", table: "tasks", call: (r) => seedLab(r) },
    { label: "drafts POST", table: "writing_desk_drafts", call: (r) => createDraft(r) },
    { label: "drafts PATCH", table: "writing_desk_drafts", call: (r) => patchDraft(r, P({ id: "d1" })) },
    { label: "drafts DELETE", table: "writing_desk_drafts", call: (r) => deleteDraft(r, P({ id: "d1" })) },
    { label: "review POST", table: "arbor_review_results", call: (r) => createReview(r) },
    { label: "prompt templates POST", table: "prompt_templates", call: (r) => createPromptTemplate(r) },
    { label: "prompt templates PATCH", table: "prompt_templates", call: (r) => patchPromptTemplate(r, P({ id: "t1" })) },
    { label: "prompt templates DELETE", table: "prompt_templates", call: (r) => deletePromptTemplate(r, P({ id: "t1" })) },
    { label: "prompt versions POST", table: "prompt_versions", call: (r) => createPromptVersion(r, P({ id: "t1" })) },
    { label: "prompt versions PATCH", table: "prompt_versions", call: (r) => patchPromptVersion(r, P({ id: "t1", versionId: "v1" })) },
    { label: "prompt versions DELETE", table: "prompt_versions", call: (r) => deletePromptVersion(r, P({ id: "t1", versionId: "v1" })) },
    { label: "prompt workflows POST", table: "prompt_workflows", call: (r) => createPromptWorkflow(r) },
    { label: "prompt workflows PATCH", table: "prompt_workflows", call: (r) => patchPromptWorkflow(r, P({ id: "w1" })) },
    { label: "prompt workflows DELETE", table: "prompt_workflows", call: (r) => deletePromptWorkflow(r, P({ id: "w1" })) },
    { label: "prompt steps POST", table: "prompt_workflow_steps", call: (r) => createPromptStep(r, P({ id: "w1" })) },
    { label: "prompt steps PATCH", table: "prompt_workflow_steps", call: (r) => patchPromptStep(r, P({ id: "w1", stepId: "s1" })) },
    { label: "prompt steps DELETE", table: "prompt_workflow_steps", call: (r) => deletePromptStep(r, P({ id: "w1", stepId: "s1" })) },
    { label: "run logs POST", table: "prompt_run_logs", call: (r) => createRunLog(r) },
    { label: "run logs PATCH", table: "prompt_run_logs", call: (r) => patchRunLog(r) },
    { label: "arbor-inbox POST", table: "tasks", call: (r) => arborInbox(r) },
    { label: "content package POST", table: "docs", call: (r) => contentPackage(r) },
    { label: "doc-blocks POST", table: "project_doc_blocks", call: (r) => createDocBlock(r, P({ slug: "workos-lite-arbordesk" })) },
    { label: "doc-blocks PATCH", table: "project_doc_blocks", call: (r) => patchDocBlock(r, P({ slug: "workos-lite-arbordesk", blockId: "b1" })) },
    { label: "doc-blocks archive POST", table: "project_doc_blocks", call: (r) => archiveDocBlock(r, P({ slug: "workos-lite-arbordesk", blockId: "b1" })) },
    { label: "doc-blocks restore POST", table: "project_doc_blocks", call: (r) => restoreDocBlock(r, P({ slug: "workos-lite-arbordesk", blockId: "b1" })) },
    { label: "decisions POST", table: "project_decisions", call: (r) => createDecision(r, P({ slug: "workos-lite-arbordesk" })) },
    { label: "decisions DELETE", table: "project_decisions", call: (r) => deleteDecision(r, P({ slug: "workos-lite-arbordesk" })) },
    { label: "loops POST", table: "project_loops", call: (r) => createLoop(r, P({ slug: "workos-lite-arbordesk" })) },
    { label: "loops PATCH", table: "project_loops", call: (r) => patchLoop(r, P({ slug: "workos-lite-arbordesk" })) },
    { label: "loops gates POST", table: "project_loop_gate_events", call: (r) => createGate(r, P({ slug: "workos-lite-arbordesk" })) },
    { label: "context POST", table: "project_contexts", call: (r) => createContext(r, P({ slug: "workos-lite-arbordesk" })) },
];

beforeEach(() => {
    db = createHumanAuthDb();
    createRemainingH1Schema(db);
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

describe("remaining H1 family authority", () => {
    for (const c of cases) {
        it(`denies unauthenticated ${c.label} with zero delta`, async () => {
            const before = count(c.table);
            const res = await c.call(unauthReq("http://localhost/api/h1"));
            expect(res.status).toBe(401);
            expect(count(c.table)).toBe(before);
        });

        it(`denies foreign-origin ${c.label} with zero delta`, async () => {
            const before = count(c.table);
            const res = await c.call(foreignReq("http://localhost/api/h1"));
            expect(res.status).toBe(403);
            expect(count(c.table)).toBe(before);
        });
    }
});

describe("remaining H1 authorized success paths", () => {
    it("notes POST succeeds with valid H2 + trusted origin", async () => {
        const res = await createNote(authedReq("http://localhost/api/notes", JSON.stringify({ title: "Note" })));
        expect(res.status).toBeLessThan(400);
        expect(count("notes")).toBe(1);
    });

    it("lists POST succeeds with valid H2 + trusted origin", async () => {
        const res = await createList(
            authedReq("http://localhost/api/lists", JSON.stringify({ workspace: "avacrm", slug: "my-list", title: "My List" })),
        );
        expect(res.status).toBeLessThan(400);
        expect(count("lists")).toBe(1);
    });

    it("sprints POST succeeds with valid H2 + trusted origin", async () => {
        const res = await createSprint(
            authedReq("http://localhost/api/sprints", JSON.stringify({ project_id: "P1", name: "Sprint 1" })),
        );
        expect(res.status).toBeLessThan(400);
        expect(count("sprints")).toBe(1);
    });

    it("planner day POST succeeds with valid H2 + trusted origin", async () => {
        const res = await createPlannerDay(
            authedReq("http://localhost/api/planner/2026-07-13", JSON.stringify({ main_outcome: "Focus" })),
            P({ date: "2026-07-13" }),
        );
        expect(res.status).toBeLessThan(400);
        expect(count("planner_days")).toBe(1);
    });

    it("writing-desk draft POST succeeds with valid H2 + trusted origin", async () => {
        const res = await createDraft(
            authedReq(
                "http://localhost/api/content/writing-desk/drafts",
                JSON.stringify({ topic_title: "Topic", content_type: "group_post", body: "Body" }),
            ),
        );
        expect(res.status).toBeLessThan(400);
        expect(count("writing_desk_drafts")).toBe(1);
    });

    it("prompt template POST succeeds with valid H2 + trusted origin", async () => {
        const res = await createPromptTemplate(
            authedReq("http://localhost/api/prompt-templates", JSON.stringify({ name: "Template", category: "general" })),
        );
        expect(res.status).toBeLessThan(400);
        expect(count("prompt_templates")).toBe(1);
    });

    it("doc-block POST succeeds with valid H2 + trusted origin", async () => {
        const res = await createDocBlock(
            authedReq("http://localhost/api/projects/workos-lite-arbordesk/doc-blocks", JSON.stringify({
                type: "process_note",
                title: "Block",
                date: "2026-08-02",
                summary: "Summary",
                details: "Details",
                evidenceLinks: [],
                relatedFiles: [],
                status: "active",
            })),
            P({ slug: "workos-lite-arbordesk" }),
        );
        expect(res.status).toBeLessThan(400);
        expect(count("project_doc_blocks")).toBe(1);
    });

    it("planner-import execute passes the guard (business validation still applies)", async () => {
        const res = await executePlannerImport(
            authedReq("http://localhost/api/planner-import/execute", JSON.stringify({ raw_text: "x", project_id: "P1", conflict_policy: "append", confirmed: false })),
        );
        expect(res.status).not.toBe(401);
        expect(res.status).not.toBe(403);
    });

    it("arbor-inbox / content-package / episodes / review / run-logs / blocks / seed pass the guard", async () => {
        const guardPassed: Array<Promise<Response>> = [
            arborInbox(authedReq("http://localhost/api/arbor-inbox", "{}")),
            contentPackage(authedReq("http://localhost/api/content/package", "{}")),
            createEpisode(authedReq("http://localhost/api/content/writing-lab/episodes", "{}")),
            createReview(authedReq("http://localhost/api/content/writing-desk/review", "{}")),
            createRunLog(authedReq("http://localhost/api/prompt-run-logs", "{}")),
            createBlock(authedReq("http://localhost/api/content/writing-lab/projects/p1/blocks", "{}"), P({ id: "p1" })),
            seedLab(authedReq("http://localhost/api/content/writing-lab/seed")),
        ];
        for (const res of await Promise.all(guardPassed)) {
            expect(res.status).not.toBe(401);
            expect(res.status).not.toBe(403);
        }
    });
});
