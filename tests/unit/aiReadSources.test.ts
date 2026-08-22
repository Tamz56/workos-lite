import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
    buildSourceIndexPage,
    buildCorpusFingerprint,
    DEFAULT_PAGE_SIZE,
    MAX_PAGE_SIZE,
} from "@/lib/ai-read/sourceIndexService";
import { readSourceChunk, MAX_CHUNK_CHARS } from "@/lib/ai-read/readService";
import { ReadApiError } from "@/lib/ai-read/errors";
import {
    PROJECT_CONTEXT_DISPLAY_TITLE,
    DERIVED_CONTEXT_TITLE,
    ProjectContextCuratorError,
} from "@/lib/project-curator/contracts";

const NOW = "2026-08-22T00:00:00.000Z";

// ---------------------------------------------------------------------------
// Fixtures (in-memory; never touches the live DB)
// ---------------------------------------------------------------------------

function createReadDb(options: { includeProjectContexts?: boolean } = {}): Database.Database {
    const db = new Database(":memory:");
    db.exec(`
        CREATE TABLE projects (
          id TEXT PRIMARY KEY, slug TEXT NOT NULL UNIQUE, name TEXT NOT NULL,
          status TEXT NOT NULL, start_date TEXT NULL, end_date TEXT NULL, owner TEXT NULL,
          is_seed INTEGER DEFAULT 0, created_at TEXT, updated_at TEXT,
          category TEXT NULL, registry_status TEXT NULL, priority TEXT NULL,
          current_goal TEXT NULL, progress_stage TEXT NULL, next_action TEXT NULL,
          cadence TEXT NULL, risk_or_blocked_by TEXT NULL, metadata_updated_at TEXT NULL
        );
        CREATE TABLE project_doc_blocks (
          id TEXT PRIMARY KEY, project_id TEXT NOT NULL, legacy_project_slug TEXT,
          import_source TEXT, import_batch_id TEXT, migrated_at TEXT,
          source_row_number INTEGER, source_record_id TEXT, block_type TEXT NOT NULL,
          title TEXT NOT NULL, block_date TEXT NOT NULL, summary TEXT NOT NULL,
          details_md TEXT NOT NULL, evidence_links_json TEXT NOT NULL DEFAULT '[]',
          related_files_json TEXT NOT NULL DEFAULT '[]', next_action TEXT,
          status TEXT NOT NULL DEFAULT 'active', order_index INTEGER, source_text TEXT,
          source_excerpt TEXT, source_type TEXT, generated_by TEXT,
          reviewed_by_user INTEGER NOT NULL DEFAULT 0, applied_at TEXT,
          created_at TEXT NOT NULL, updated_at TEXT NOT NULL
        );
        CREATE TABLE docs (
          id TEXT PRIMARY KEY, title TEXT NOT NULL, content_md TEXT NOT NULL DEFAULT '',
          is_seed INTEGER DEFAULT 0, project_id TEXT, workspace TEXT,
          created_at TEXT NOT NULL, updated_at TEXT NOT NULL
        );
        CREATE TABLE project_decisions (
          id TEXT PRIMARY KEY, project_id TEXT NOT NULL, title TEXT,
          decision TEXT, reason TEXT, impact TEXT, created_at TEXT
        );
        CREATE TABLE project_loops (
          id TEXT PRIMARY KEY, project_id TEXT NOT NULL, template_id TEXT,
          loop_name TEXT, loop_type TEXT, current_step TEXT, status TEXT,
          risk_level TEXT, review_gate_level INTEGER, expected_output TEXT,
          save_destination TEXT, learn_note TEXT, steps_json TEXT,
          created_at TEXT, updated_at TEXT, completed_at TEXT, gate_status TEXT,
          last_gate_action TEXT, last_gate_at TEXT
        );
    `);
    if (options.includeProjectContexts ?? true) {
        db.exec(`
            CREATE TABLE project_contexts (
              id TEXT PRIMARY KEY, project_id TEXT NOT NULL UNIQUE,
              overview TEXT, purpose TEXT, standing_instructions TEXT, tone_voice TEXT,
              guardrails TEXT, output_standards TEXT, decision_rules TEXT, source_of_truth TEXT,
              created_at TEXT, updated_at TEXT
            );
        `);
    }
    return db;
}

function seedProject(
    db: Database.Database,
    id: string,
    slug: string,
    name: string,
    updatedAt = "2026-07-01T00:00:00.000Z",
): void {
    db.prepare(`
        INSERT INTO projects (id, slug, name, status, created_at, updated_at)
        VALUES (?, ?, ?, 'planned', '2026-07-01T00:00:00.000Z', ?)
    `).run(id, slug, name, updatedAt);
}

function seedDocBlock(
    db: Database.Database,
    id: string,
    projectId: string,
    overrides: Partial<Record<string, unknown>> = {},
): void {
    db.prepare(`
        INSERT INTO project_doc_blocks (
          id, project_id, block_type, title, block_date, summary, details_md,
          evidence_links_json, related_files_json, next_action, status, order_index,
          source_type, generated_by, reviewed_by_user, created_at, updated_at
        ) VALUES (
          @id, @project_id, @block_type, @title, @block_date, @summary, @details_md,
          @evidence_links_json, @related_files_json, @next_action, @status, @order_index,
          @source_type, @generated_by, @reviewed_by_user, @created_at, @updated_at
        )
    `).run({
        id,
        project_id: projectId,
        block_type: "brief",
        title: `Block ${id}`,
        block_date: "2026-07-10",
        summary: "Summary",
        details_md: "Details body",
        evidence_links_json: "[]",
        related_files_json: "[]",
        next_action: null,
        status: "active",
        order_index: 0,
        source_type: null,
        generated_by: null,
        reviewed_by_user: 0,
        created_at: "2026-07-01T00:00:00.000Z",
        updated_at: "2026-07-10T00:00:00.000Z",
        ...overrides,
    });
}

function seedDoc(
    db: Database.Database,
    id: string,
    projectId: string,
    title: string,
    contentMd: string,
    updatedAt = "2026-07-05T00:00:00.000Z",
): void {
    db.prepare(`
        INSERT INTO docs (id, title, content_md, project_id, workspace, created_at, updated_at)
        VALUES (?, ?, ?, ?, NULL, '2026-07-01T00:00:00.000Z', ?)
    `).run(id, title, contentMd, projectId, updatedAt);
}

function seedDecision(
    db: Database.Database,
    id: string,
    projectId: string,
    title: string,
    decision: string,
    createdAt = "2026-07-03T00:00:00.000Z",
): void {
    db.prepare(`
        INSERT INTO project_decisions (id, project_id, title, decision, reason, impact, created_at)
        VALUES (?, ?, ?, ?, 'reason', 'impact', ?)
    `).run(id, projectId, title, decision, createdAt);
}

function seedProjectContext(
    db: Database.Database,
    id: string,
    projectId: string,
    overrides: Partial<Record<string, unknown>> = {},
): void {
    db.prepare(`
        INSERT INTO project_contexts (
          id, project_id, overview, purpose, standing_instructions, tone_voice,
          guardrails, output_standards, decision_rules, source_of_truth, created_at, updated_at
        ) VALUES (
          @id, @project_id, @overview, @purpose, @standing_instructions, @tone_voice,
          @guardrails, @output_standards, @decision_rules, @source_of_truth, @created_at, @updated_at
        )
    `).run({
        id,
        project_id: projectId,
        overview: "overview text",
        purpose: "purpose text",
        standing_instructions: "standing text",
        tone_voice: "tone text",
        guardrails: "guardrails text",
        output_standards: "output text",
        decision_rules: "rules text",
        source_of_truth: "truth text",
        created_at: "2026-07-02T00:00:00.000Z",
        updated_at: "2026-07-02T00:00:00.000Z",
        ...overrides,
    });
}

function seedLoop(
    db: Database.Database,
    id: string,
    projectId: string,
    status: string,
    updatedAt = "2026-07-04T00:00:00.000Z",
): void {
    db.prepare(`
        INSERT INTO project_loops (id, project_id, loop_name, loop_type, status, risk_level, current_step, created_at, updated_at)
        VALUES (?, ?, 'Loop', 'review', ?, 'low', 'step', '2026-07-04T00:00:00.000Z', ?)
    `).run(id, projectId, status, updatedAt);
}

function seedBaseFixture(db: Database.Database): void {
    seedProject(db, "proj-1", "arbor-plant-companion-widget-ycc", "Arbor Widget", "2026-07-11T00:00:00.000Z");
    seedProject(db, "proj-2", "second-project", "Second Project");
    seedDocBlock(db, "blk-1", "proj-1", { title: "KFS-001", updated_at: "2026-07-10T00:00:00.000Z" });
    seedDocBlock(db, "blk-2", "proj-1", { title: "ARCH-001", block_type: "issue_fix", updated_at: "2026-07-09T00:00:00.000Z" });
    seedDocBlock(db, "blk-archived", "proj-1", { title: "Old Archived", status: "archived", updated_at: "2026-07-08T00:00:00.000Z" });
    seedDocBlock(db, "blk-dup-a", "proj-1", { title: "DUPE-TITLE", updated_at: "2026-07-07T00:00:00.000Z" });
    seedDocBlock(db, "blk-dup-b", "proj-1", { title: "DUPE-TITLE", updated_at: "2026-07-06T00:00:00.000Z" });
    seedDoc(db, "doc-1", "proj-1", "Content Roadmap", "roadmap body", "2026-07-15T00:00:00.000Z");
    seedDoc(db, "doc-2", "proj-1", "Big Doc", "x".repeat(65_000), "2026-07-05T00:00:00.000Z");
    seedDecision(db, "dec-1", "proj-1", "Tech stack", "Use React");
    seedProjectContext(db, "ctx-1", "proj-1");
    seedLoop(db, "loop-1", "proj-1", "active", "2026-07-04T00:00:00.000Z");
    seedLoop(db, "loop-archived", "proj-1", "archived", "2026-07-03T00:00:00.000Z");
    // cross-project source
    seedDoc(db, "doc-x", "proj-2", "Other Project Doc", "other body", "2026-07-01T00:00:00.000Z");
}

function tableFingerprint(db: Database.Database): string {
    const tables = ["projects", "project_doc_blocks", "docs", "project_decisions", "project_contexts", "project_loops"];
    return tables
        .filter((t) => db.prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?").get(t))
        .map((t) => JSON.stringify(db.prepare(`SELECT * FROM ${t} ORDER BY id`).all()))
        .join("|");
}

function encodeTestCursor(tuple: [string, string, string]): string {
    return Buffer.from(JSON.stringify(tuple), "utf8").toString("base64url");
}

function expectReadError(fn: () => unknown, code: string): void {
    try {
        fn();
        throw new Error("expected error");
    } catch (err) {
        if (err instanceof ReadApiError || err instanceof ProjectContextCuratorError) {
            expect(err.code).toBe(code);
        } else {
            throw err;
        }
    }
}

/** Walks every page and returns all collected sources. */
function walkAllPages(
    db: Database.Database,
    projectIdentifier: string,
    pageSize: number,
): { all: { sourceKind: string; sourceId: string }[]; totalSources: number; fingerprint: string } {
    const first = buildSourceIndexPage(db, projectIdentifier, { pageSize, now: NOW });
    const fingerprint = first.corpusFingerprint;
    const all: { sourceKind: string; sourceId: string }[] = [...first.sources];
    let cursor = first.pagination.nextCursor;
    while (first.pagination.hasMore) {
        const page = buildSourceIndexPage(db, projectIdentifier, {
            pageSize,
            cursor: cursor ?? undefined,
            expectedCorpusFingerprint: fingerprint,
            now: NOW,
        });
        all.push(...page.sources);
        cursor = page.pagination.nextCursor;
        if (!page.pagination.hasMore) break;
    }
    return { all, totalSources: first.pagination.totalSources, fingerprint };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("READ1A — complete source index", () => {
    it("enumerates all supported text kinds including project_context (behaviors 10,11)", () => {
        const db = createReadDb();
        seedBaseFixture(db);
        const page = buildSourceIndexPage(db, "proj-1", { pageSize: 200, now: NOW });
        expect(page.counts).toMatchObject({
            project_metadata: 1,
            doc_block: 5,
            doc: 2,
            decision: 1,
            project_context: 1,
            loop: 2, // archived loop included in complete corpus
        });
        const ctx = page.sources.find((e) => e.sourceKind === "project_context");
        expect(ctx?.sourceId).toBe("ctx-1");
        expect(ctx?.title).toBe(PROJECT_CONTEXT_DISPLAY_TITLE);
        db.close();
    });

    it("continues the complete index when the optional project_contexts table is absent", () => {
        const db = createReadDb({ includeProjectContexts: false });
        seedProject(db, "proj-no-context", "no-context", "No Context");
        seedDoc(db, "doc-kept", "proj-no-context", "Kept", "body");
        const before = tableFingerprint(db);

        const page = buildSourceIndexPage(db, "no-context", { pageSize: 200, now: NOW });

        expect(page.counts.project_context).toBe(0);
        expect(page.sources.some((source) => source.sourceId === "doc-kept")).toBe(true);
        expect(page.sources.some((source) => source.sourceKind === "project_metadata")).toBe(true);
        expect(tableFingerprint(db)).toBe(before);
        db.close();
    });

    it("keeps archived doc blocks visible with status (behavior 12)", () => {
        const db = createReadDb();
        seedBaseFixture(db);
        const page = buildSourceIndexPage(db, "proj-1", { pageSize: 200, now: NOW });
        const archived = page.sources.find((e) => e.sourceId === "blk-archived");
        expect(archived).toBeDefined();
        expect(archived?.status).toBe("archived");
        db.close();
    });

    it("preserves duplicate titles (behavior 13)", () => {
        const db = createReadDb();
        seedBaseFixture(db);
        const page = buildSourceIndexPage(db, "proj-1", { pageSize: 200, now: NOW });
        const dupes = page.sources.filter((e) => e.title === "DUPE-TITLE");
        expect(dupes.map((e) => e.sourceId).sort()).toEqual(["blk-dup-a", "blk-dup-b"]);
        db.close();
    });

    it("discovers >500 records of one kind with no hidden loss (behaviors 14,15,16)", () => {
        const db = createReadDb();
        seedProject(db, "proj-big", "big-project", "Big");
        const count = 510;
        for (let i = 0; i < count; i++) {
            seedDocBlock(db, `blk-${String(i).padStart(3, "0")}`, "proj-big", {
                title: `Block ${i}`,
                updated_at: `2026-07-${String((i % 20) + 1).padStart(2, "0")}T00:00:00.000Z`,
            });
        }
        const walked = walkAllPages(db, "big-project", DEFAULT_PAGE_SIZE);
        // project_metadata(1) + 510 doc_blocks
        expect(walked.totalSources).toBe(511);
        expect(walked.all.length).toBe(511);
        const uniqueRefs = new Set(walked.all.map((s) => `${s.sourceKind}:${s.sourceId}`));
        expect(uniqueRefs.size).toBe(511);
        const blockRefs = walked.all.filter((s) => s.sourceKind === "doc_block");
        expect(blockRefs.length).toBe(510);
        db.close();
    });

    it("enforces page-size max and default (behavior 17)", () => {
        const db = createReadDb();
        seedBaseFixture(db);
        expectReadError(
            () => buildSourceIndexPage(db, "proj-1", { pageSize: MAX_PAGE_SIZE + 1, now: NOW }),
            "INVALID_PAGE_SIZE",
        );
        expectReadError(() => buildSourceIndexPage(db, "proj-1", { pageSize: 0, now: NOW }), "INVALID_PAGE_SIZE");
        const defaultPage = buildSourceIndexPage(db, "proj-1", { now: NOW });
        expect(defaultPage.pagination.pageSize).toBe(DEFAULT_PAGE_SIZE);
        db.close();
    });

    it("rejects an invalid cursor deterministically (behavior 18)", () => {
        const db = createReadDb();
        seedBaseFixture(db);
        const fp = buildSourceIndexPage(db, "proj-1", { pageSize: 200, now: NOW }).corpusFingerprint;
        expectReadError(
            () =>
                buildSourceIndexPage(db, "proj-1", {
                    cursor: "not-a-valid-cursor!!!",
                    expectedCorpusFingerprint: fp,
                    now: NOW,
                }),
            "INVALID_CURSOR",
        );
        db.close();
    });

    it("fingerprint covers the whole corpus and changes with the corpus (behavior 19)", () => {
        const db = createReadDb();
        seedBaseFixture(db);
        const page1 = buildSourceIndexPage(db, "proj-1", { pageSize: 2, now: NOW });
        const f1 = page1.corpusFingerprint;
        const full = buildSourceIndexPage(db, "proj-1", { pageSize: 200, now: NOW });
        expect(f1).toBe(full.corpusFingerprint); // same regardless of page
        // adding a source changes the fingerprint
        seedDocBlock(db, "blk-new", "proj-1", { title: "New", updated_at: "2026-07-20T00:00:00.000Z" });
        const f2 = buildSourceIndexPage(db, "proj-1", { pageSize: 200, now: NOW }).corpusFingerprint;
        expect(f2).not.toBe(f1);
        db.close();
    });

    it("continues pages with matching fingerprint (behavior 20)", () => {
        const db = createReadDb();
        seedBaseFixture(db);
        const first = buildSourceIndexPage(db, "proj-1", { pageSize: 3, now: NOW });
        const second = buildSourceIndexPage(db, "proj-1", {
            pageSize: 3,
            cursor: first.pagination.nextCursor ?? undefined,
            expectedCorpusFingerprint: first.corpusFingerprint,
            now: NOW,
        });
        const full = buildSourceIndexPage(db, "proj-1", { pageSize: 200, now: NOW });
        const combined = [...first.sources, ...second.sources];
        expect(combined).toEqual(full.sources.slice(0, combined.length));
        expect(second.sources[0]).not.toEqual(first.sources[first.sources.length - 1]);
        db.close();
    });

    it("rejects a fabricated but structurally valid cursor", () => {
        const db = createReadDb();
        seedBaseFixture(db);
        const page = buildSourceIndexPage(db, "proj-1", { pageSize: 3, now: NOW });
        const anchor = page.sources[page.sources.length - 1];
        const cursor = encodeTestCursor([
            anchor.updatedAt ?? anchor.date ?? anchor.createdAt ?? "",
            anchor.sourceKind,
            "fabricated-source-id",
        ]);
        expectReadError(
            () => buildSourceIndexPage(db, "proj-1", { cursor, expectedCorpusFingerprint: page.corpusFingerprint, now: NOW }),
            "INVALID_CURSOR",
        );
        db.close();
    });

    it("rejects a cursor with a valid source id but altered recency", () => {
        const db = createReadDb();
        seedBaseFixture(db);
        const page = buildSourceIndexPage(db, "proj-1", { pageSize: 3, now: NOW });
        const anchor = page.sources[page.sources.length - 1];
        const cursor = encodeTestCursor(["1999-01-01T00:00:00.000Z", anchor.sourceKind, anchor.sourceId]);
        expectReadError(
            () => buildSourceIndexPage(db, "proj-1", { cursor, expectedCorpusFingerprint: page.corpusFingerprint, now: NOW }),
            "INVALID_CURSOR",
        );
        db.close();
    });

    it("rejects invalid and noncanonical base64url cursors", () => {
        const db = createReadDb();
        seedBaseFixture(db);
        const page = buildSourceIndexPage(db, "proj-1", { pageSize: 3, now: NOW });
        const valid = page.pagination.nextCursor as string;
        for (const cursor of [`${valid}!`, `${valid}=`]) {
            expectReadError(
                () => buildSourceIndexPage(db, "proj-1", { cursor, expectedCorpusFingerprint: page.corpusFingerprint, now: NOW }),
                "INVALID_CURSOR",
            );
        }
        db.close();
    });

    it("rejects malformed decoded JSON and unsupported cursor source kinds", () => {
        const db = createReadDb();
        seedBaseFixture(db);
        const page = buildSourceIndexPage(db, "proj-1", { pageSize: 3, now: NOW });
        const malformed = Buffer.from("not-json", "utf8").toString("base64url");
        const unsupported = encodeTestCursor(["2026-07-01T00:00:00.000Z", "note", "note-1"]);
        for (const cursor of [malformed, unsupported]) {
            expectReadError(
                () => buildSourceIndexPage(db, "proj-1", { cursor, expectedCorpusFingerprint: page.corpusFingerprint, now: NOW }),
                "INVALID_CURSOR",
            );
        }
        db.close();
    });

    it("fails closed with CORPUS_CHANGED when the corpus changes mid-paging (behavior 21)", () => {
        const db = createReadDb();
        seedBaseFixture(db);
        const first = buildSourceIndexPage(db, "proj-1", { pageSize: 3, now: NOW });
        const f = first.corpusFingerprint;
        seedDocBlock(db, "blk-changed", "proj-1", { title: "Changed", updated_at: "2026-07-20T00:00:00.000Z" });
        expectReadError(
            () =>
                buildSourceIndexPage(db, "proj-1", {
                    pageSize: 3,
                    cursor: first.pagination.nextCursor ?? undefined,
                    expectedCorpusFingerprint: f,
                    now: NOW,
                }),
            "CORPUS_CHANGED",
        );
        db.close();
    });
});

describe("READ1A — complete chunk read", () => {
    it("reads a small document fully (behavior 22)", () => {
        const db = createReadDb();
        seedBaseFixture(db);
        const res = readSourceChunk(db, "proj-1", {
            source: { sourceKind: "doc", sourceId: "doc-1" },
            offset: 0,
            limit: MAX_CHUNK_CHARS,
        });
        expect(res.content).toBe("roadmap body");
        expect(res.chunk.includedChars).toBe("roadmap body".length);
        expect(res.chunk.totalCharacterCount).toBe("roadmap body".length);
        expect(res.chunk.hasMore).toBe(false);
        expect(res.metadata.sourceKind).toBe("doc");
        expect(res.metadata.sourceId).toBe("doc-1");
        db.close();
    });

    it("reads a >30k document across chunks with exact continuation (behaviors 23,24,25,26)", () => {
        const db = createReadDb();
        seedBaseFixture(db);
        const original = "x".repeat(65_000);
        let offset = 0;
        let collected = "";
        let guard = 0;
        let hasMore = true;
        while (hasMore) {
            const res = readSourceChunk(db, "proj-1", {
                source: { sourceKind: "doc", sourceId: "doc-2" },
                offset,
                limit: MAX_CHUNK_CHARS,
            });
            expect(res.chunk.offset).toBe(offset); // no gap/overlap: next chunk starts at prior nextOffset
            expect(res.chunk.includedChars).toBe(res.content.length);
            collected += res.content;
            offset = res.chunk.nextOffset;
            hasMore = res.chunk.hasMore;
            guard += 1;
            expect(guard).toBeLessThan(20);
        }
        expect(collected).toBe(original); // concatenated chunks reproduce full content
        db.close();
    });

    it("returns an empty final chunk when offset equals total (behavior 27)", () => {
        const db = createReadDb();
        seedBaseFixture(db);
        const total = "roadmap body".length;
        const res = readSourceChunk(db, "proj-1", {
            source: { sourceKind: "doc", sourceId: "doc-1" },
            offset: total,
            limit: MAX_CHUNK_CHARS,
        });
        expect(res.content).toBe("");
        expect(res.chunk.offset).toBe(total);
        expect(res.chunk.includedChars).toBe(0);
        expect(res.chunk.nextOffset).toBe(total);
        expect(res.chunk.hasMore).toBe(false);
        db.close();
    });

    it("preserves a requested offset beyond total in an empty final chunk", () => {
        const db = createReadDb();
        seedBaseFixture(db);
        const requestedOffset = 1000;
        const res = readSourceChunk(db, "proj-1", {
            source: { sourceKind: "doc", sourceId: "doc-1" },
            offset: requestedOffset,
            limit: MAX_CHUNK_CHARS,
        });
        expect(res.content).toBe("");
        expect(res.chunk.offset).toBe(requestedOffset);
        expect(res.chunk.includedChars).toBe(0);
        expect(res.chunk.nextOffset).toBe(requestedOffset);
        expect(res.chunk.totalCharacterCount).toBe("roadmap body".length);
        expect(res.chunk.hasMore).toBe(false);
        db.close();
    });

    it("rejects invalid limits and offsets (behaviors 28,29)", () => {
        const db = createReadDb();
        seedBaseFixture(db);
        expectReadError(
            () =>
                readSourceChunk(db, "proj-1", {
                    source: { sourceKind: "doc", sourceId: "doc-1" },
                    offset: 0,
                    limit: MAX_CHUNK_CHARS + 1,
                }),
            "INVALID_CHUNK_LIMIT",
        );
        expectReadError(
            () =>
                readSourceChunk(db, "proj-1", {
                    source: { sourceKind: "doc", sourceId: "doc-1" },
                    offset: -1,
                    limit: 100,
                }),
            "INVALID_OFFSET",
        );
        db.close();
    });

    it("rejects unknown, cross-project, and unsupported sources (behaviors 30,31,32)", () => {
        const db = createReadDb();
        seedBaseFixture(db);
        expectReadError(
            () =>
                readSourceChunk(db, "proj-1", {
                    source: { sourceKind: "doc", sourceId: "nope" },
                    offset: 0,
                    limit: 100,
                }),
            "UNKNOWN_SOURCE",
        );
        expectReadError(
            () =>
                readSourceChunk(db, "proj-1", {
                    source: { sourceKind: "doc", sourceId: "doc-x" },
                    offset: 0,
                    limit: 100,
                }),
            "CROSS_PROJECT_SOURCE",
        );
        expectReadError(
            () =>
                readSourceChunk(db, "proj-1", {
                    source: { sourceKind: "note", sourceId: "n1" } as never,
                    offset: 0,
                    limit: 100,
                }),
            "UNSUPPORTED_SOURCE_KIND",
        );
        db.close();
    });

    it("reads project_context fully with deterministic rendering (behavior 33)", () => {
        const db = createReadDb();
        seedBaseFixture(db);
        const res = readSourceChunk(db, "proj-1", {
            source: { sourceKind: "project_context", sourceId: "ctx-1" },
            offset: 0,
            limit: MAX_CHUNK_CHARS,
        });
        expect(res.title).toBe(PROJECT_CONTEXT_DISPLAY_TITLE);
        expect(res.content).toContain("overview: overview text");
        expect(res.content).toContain("purpose: purpose text");
        expect(res.content).toContain("source_of_truth: truth text");
        expect(res.chunk.hasMore).toBe(false);
        db.close();
    });

    it("renders decisions deterministically and stably (behavior 34)", () => {
        const db = createReadDb();
        seedBaseFixture(db);
        const a = readSourceChunk(db, "proj-1", {
            source: { sourceKind: "decision", sourceId: "dec-1" },
            offset: 0,
            limit: MAX_CHUNK_CHARS,
        });
        const b = readSourceChunk(db, "proj-1", {
            source: { sourceKind: "decision", sourceId: "dec-1" },
            offset: 0,
            limit: MAX_CHUNK_CHARS,
        });
        expect(a.content).toBe(b.content);
        expect(a.content).toContain("decision: Use React");
        expect(a.content).toContain("reason: reason");
        db.close();
    });

    it("reads derived context transparently with isDerivedContext=true (behavior 35)", () => {
        const db = createReadDb();
        seedBaseFixture(db);
        seedDocBlock(db, "blk-derived", "proj-1", {
            title: DERIVED_CONTEXT_TITLE,
            details_md: "PREVIOUS DERIVED CONTEXT — not authoritative",
            updated_at: "2026-07-20T00:00:00.000Z",
        });
        const res = readSourceChunk(db, "proj-1", {
            source: { sourceKind: "doc_block", sourceId: "blk-derived" },
            offset: 0,
            limit: MAX_CHUNK_CHARS,
        });
        expect(res.metadata.isDerivedContext).toBe(true);
        expect(res.content).toContain("PREVIOUS DERIVED CONTEXT");
        db.close();
    });

    it("performs no DB mutation after enumeration or chunk reads (behaviors 36,37)", () => {
        const db = createReadDb();
        seedBaseFixture(db);
        const before = tableFingerprint(db);
        buildSourceIndexPage(db, "proj-1", { pageSize: 200, now: NOW });
        expect(tableFingerprint(db)).toBe(before);
        readSourceChunk(db, "proj-1", {
            source: { sourceKind: "doc", sourceId: "doc-2" },
            offset: 0,
            limit: MAX_CHUNK_CHARS,
        });
        readSourceChunk(db, "proj-1", {
            source: { sourceKind: "project_context", sourceId: "ctx-1" },
            offset: 0,
            limit: MAX_CHUNK_CHARS,
        });
        expect(tableFingerprint(db)).toBe(before);
        db.close();
    });

    it("contains no AI/provider coupling in the read module (behavior 39)", () => {
        const dirs = [
            path.resolve(__dirname, "../../src/lib/ai-read"),
            path.resolve(__dirname, "../../src/lib/project-curator"),
        ];
        const forbidden = /OpenAI|Anthropic|DeepSeek|Gemini/;
        const found: string[] = [];
        for (const dir of dirs) {
            for (const file of fs.readdirSync(dir)) {
                if (file.endsWith(".ts")) {
                    const text = fs.readFileSync(path.join(dir, file), "utf8");
                    if (forbidden.test(text)) found.push(`${dir}/${file}`);
                }
            }
        }
        expect(found).toEqual([]);
    });

    it("exposes a deterministic whole-corpus fingerprint via buildCorpusFingerprint (behavior 19/cover)", () => {
        const db = createReadDb();
        seedBaseFixture(db);
        const page = buildSourceIndexPage(db, "proj-1", { pageSize: 200, now: NOW });
        // Fixture corpus (12 sources) fits on one page, so page.sources IS the
        // whole corpus; recomputing the fingerprint over it must match.
        expect(page.corpusFingerprint.length).toBe(64); // sha256 hex
        expect(buildCorpusFingerprint(page.sources)).toBe(page.corpusFingerprint);
        db.close();
    });
});
