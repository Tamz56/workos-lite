import Database from "better-sqlite3";
import { describe, expect, it } from "vitest";
import {
    buildProjectContextSourceBundle,
    collectProjectContextSourceIndex,
    DERIVED_CONTEXT_TITLE,
    loadProjectContextSources,
    PROJECT_CONTEXT_SOURCE_BUNDLE_SCHEMA_VERSION,
    PROJECT_CONTEXT_SOURCE_INDEX_SCHEMA_VERSION,
    ProjectContextCuratorError,
    DEFAULT_CURATOR_LIMITS,
    TRUNCATION_SUFFIX,
} from "@/lib/project-curator";
import { assertProjectOwnsSource } from "@/lib/project-curator/knowledgeIndex";

const NOW = "2026-08-22T00:00:00.000Z";

// ---------------------------------------------------------------------------
// Fixtures (in-memory; never touches the live DB)
// ---------------------------------------------------------------------------

function createCuratorTestDb(): Database.Database {
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
    return db;
}

function seedProjects(db: Database.Database): void {
    db.prepare(`
        INSERT INTO projects (id, slug, name, status, current_goal, next_action,
          risk_or_blocked_by, progress_stage, created_at, updated_at)
        VALUES ('proj-1', 'arbor-plant-companion-widget-ycc', 'Arbor Plant Companion Widget',
          'planned', 'Build the widget', 'Review roadmap', 'none', 'Concept',
          '2026-07-01T00:00:00.000Z', '2026-07-11T00:00:00.000Z'),
               ('proj-2', 'second-project', 'Second Project', 'planned',
          NULL, NULL, NULL, NULL, '2026-07-01T00:00:00.000Z', '2026-07-01T00:00:00.000Z')
    `).run();
}

function seedDocBlock(
    db: Database.Database,
    id: string,
    overrides: Partial<Record<string, unknown>> = {},
): void {
    db.prepare(`
        INSERT INTO project_doc_blocks (
          id, project_id, block_type, title, block_date, summary, details_md,
          evidence_links_json, related_files_json, next_action, status, order_index,
          source_type, generated_by, reviewed_by_user, created_at, updated_at
        ) VALUES (
          @id, 'proj-1', @block_type, @title, @block_date, @summary, @details_md,
          @evidence_links_json, @related_files_json, @next_action, @status, @order_index,
          @source_type, @generated_by, @reviewed_by_user, @created_at, @updated_at
        )
    `).run({
        id,
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
    updatedAt: string,
): void {
    db.prepare(`
        INSERT INTO docs (id, title, content_md, project_id, workspace, created_at, updated_at)
        VALUES (?, ?, ?, ?, NULL, '2026-07-01T00:00:00.000Z', ?)
    `).run(id, title, contentMd, projectId, updatedAt);
}

function seedFixture(db: Database.Database): void {
    seedProjects(db);

    // proj-1 doc blocks (ordered by updated_at desc within kind)
    seedDocBlock(db, "db-2", { title: "ARCH-001A", block_type: "qa_review", updated_at: "2026-07-12T00:00:00.000Z", details_md: "details body ARCH" });
    seedDocBlock(db, "db-1", { title: "KFS-001", updated_at: "2026-07-10T00:00:00.000Z", details_md: "details body KFS", next_action: "Review KFS", source_type: "commit_log", reviewed_by_user: 1 });
    seedDocBlock(db, "db-3", { title: DERIVED_CONTEXT_TITLE, block_type: "process_note", updated_at: "2026-07-08T00:00:00.000Z", details_md: "PREVIOUS DERIVED CONTEXT — not authoritative" });
    seedDocBlock(db, "db-4", { title: "DUPE-TITLE", updated_at: "2026-07-06T00:00:00.000Z", details_md: "first dupe" });
    seedDocBlock(db, "db-5", { title: "DUPE-TITLE", updated_at: "2026-07-04T00:00:00.000Z", details_md: "second dupe" });

    // proj-1 docs
    seedDoc(db, "doc-1", "proj-1", "Content Roadmap", "roadmap body", "2026-07-15T00:00:00.000Z");
    seedDoc(db, "doc-2", "proj-1", "Publish Log", "log body", "2026-07-11T00:00:00.000Z");
    seedDoc(db, "doc-big", "proj-1", "Big Doc", "x".repeat(40_000), "2026-07-05T00:00:00.000Z");

    // proj-1 decisions
    db.prepare(`
        INSERT INTO project_decisions (id, project_id, title, decision, reason, impact, created_at)
        VALUES ('dec-1', 'proj-1', 'Tech stack', 'Use React', 'Team familiarity', 'Faster delivery', '2026-07-04T00:00:00.000Z')
    `).run();

    // proj-1 loops (one archived, excluded by default)
    db.prepare(`
        INSERT INTO project_loops (id, project_id, loop_name, loop_type, status, risk_level, current_step, created_at, updated_at)
        VALUES ('loop-1', 'proj-1', 'Publish Review', 'review', 'active', 'low', 'step-1', '2026-07-05T00:00:00.000Z', '2026-07-13T00:00:00.000Z'),
               ('loop-archived', 'proj-1', 'Old Loop', 'review', 'archived', 'high', NULL, '2026-07-06T00:00:00.000Z', '2026-07-06T00:00:00.000Z')
    `).run();

    // proj-2 doc (for cross-project tests)
    seedDoc(db, "doc-x", "proj-2", "Cross Project Doc", "other body", "2026-07-01T00:00:00.000Z");
}

function fingerprint(db: Database.Database): string {
    const tables = ["projects", "project_doc_blocks", "docs", "project_decisions", "project_loops"];
    return tables
        .map((t) => JSON.stringify(db.prepare(`SELECT * FROM ${t} ORDER BY id`).all()))
        .join("|");
}

function expectCuratorError(fn: () => unknown, code: string): void {
    try {
        fn();
        throw new Error("Expected ProjectContextCuratorError but none was thrown");
    } catch (err) {
        if (err instanceof ProjectContextCuratorError) {
            expect(err.code).toBe(code);
        } else {
            throw err;
        }
    }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("Project Context Curator (CTX2-R1) — Stage A metadata-only index", () => {
    it("returns a deterministic metadata-only index (behavior 1)", () => {
        const db = createCuratorTestDb();
        seedFixture(db);
        const a = collectProjectContextSourceIndex(db, "proj-1", { now: NOW });
        const b = collectProjectContextSourceIndex(db, "proj-1", { now: NOW });
        expect(a).toEqual(b);
        expect(a.schemaVersion).toBe(PROJECT_CONTEXT_SOURCE_INDEX_SCHEMA_VERSION);
        expect(a.generatedAt).toBe(NOW);
        db.close();
    });

    it("exposes no full bodies: doc_block, doc, decision (behaviors 2,3,4)", () => {
        const db = createCuratorTestDb();
        seedFixture(db);
        const index = collectProjectContextSourceIndex(db, "proj-1", { now: NOW });
        for (const entry of index.sources) {
            expect(entry).not.toHaveProperty("details");
            expect(entry).not.toHaveProperty("details_md");
            expect(entry).not.toHaveProperty("content_md");
            expect(entry).not.toHaveProperty("contentMd");
            expect(entry).not.toHaveProperty("decision");
            expect(entry).not.toHaveProperty("reason");
            expect(entry).not.toHaveProperty("impact");
        }
        db.close();
    });

    it("uses stable deterministic ordering: global recency DESC primary (behavior 5)", () => {
        const db = createCuratorTestDb();
        seedFixture(db);
        const index = collectProjectContextSourceIndex(db, "proj-1", { now: NOW });

        // Global recency DESC (updatedAt/date), then stable source-kind order,
        // then sourceId ASC as final tie-breaker.
        const orderedIds = index.sources.map((e) => e.sourceId);
        expect(orderedIds).toEqual([
            "doc-1", // 2026-07-15 (doc)
            "loop-1", // 2026-07-13 (loop)
            "db-2", // 2026-07-12 (doc_block)
            "proj-1", // 2026-07-11 (project_metadata; kind tie-break before doc-2)
            "doc-2", // 2026-07-11 (doc)
            "db-1", // 2026-07-10 (doc_block)
            "db-3", // 2026-07-08 (doc_block)
            "db-4", // 2026-07-06 (doc_block)
            "doc-big", // 2026-07-05 (doc)
            "db-5", // 2026-07-04 (doc_block; kind tie-break before dec-1)
            "dec-1", // 2026-07-04 (decision)
        ]);

        // Recency dominates source-kind grouping: a newer doc precedes an older doc_block.
        const doc1 = index.sources.findIndex((e) => e.sourceId === "doc-1");
        const db2 = index.sources.findIndex((e) => e.sourceId === "db-2");
        expect(doc1).toBeLessThan(db2);

        // Within a kind, relative recency order is preserved.
        const docBlockIds = index.sources
            .filter((e) => e.sourceKind === "doc_block")
            .map((e) => e.sourceId);
        expect(docBlockIds).toEqual(["db-2", "db-1", "db-3", "db-4", "db-5"]);

        const docIds = index.sources.filter((e) => e.sourceKind === "doc").map((e) => e.sourceId);
        expect(docIds).toEqual(["doc-1", "doc-2", "doc-big"]);

        // Archived loop excluded by default.
        expect(index.sources.filter((e) => e.sourceId === "loop-archived")).toHaveLength(0);
        db.close();
    });

    it("orders equal-recency same-kind sources by sourceId ASC (behavior C)", () => {
        const db = createCuratorTestDb();
        seedProjects(db);
        // Same sourceKind + same effective recency + different sourceId.
        seedDocBlock(db, "a-source", { title: "A", updated_at: "2026-07-20T10:00:00.000Z" });
        seedDocBlock(db, "b-source", { title: "B", updated_at: "2026-07-20T10:00:00.000Z" });
        const index = collectProjectContextSourceIndex(db, "proj-1", { now: NOW });

        const a = index.sources.findIndex((e) => e.sourceId === "a-source");
        const b = index.sources.findIndex((e) => e.sourceId === "b-source");
        expect(a).toBeGreaterThanOrEqual(0);
        expect(b).toBeGreaterThanOrEqual(0);
        // Equal recency + equal kind → sourceId ASC.
        expect(a).toBeLessThan(b);
        db.close();
    });

    it("orders dated sources before undated sources (behavior D)", () => {
        const db = createCuratorTestDb();
        seedProjects(db);
        seedDocBlock(db, "dated-block", { title: "Dated", updated_at: "2026-07-20T10:00:00.000Z" });
        // Genuinely undated decision: created_at NULL (no date/updatedAt/createdAt).
        db.prepare(`
            INSERT INTO project_decisions (id, project_id, title, decision, reason, impact, created_at)
            VALUES ('dec-undated', 'proj-1', 'Undated Decision', 'x', 'y', 'z', NULL)
        `).run();

        const index = collectProjectContextSourceIndex(db, "proj-1", { now: NOW });
        const undated = index.sources.find((e) => e.sourceId === "dec-undated");
        expect(undated).toBeDefined();
        // Genuinely undated: effective recency has no date component.
        expect(undated?.updatedAt).toBeNull();
        expect(undated?.date).toBeUndefined();
        expect(undated?.createdAt).toBeNull();

        const datedIdx = index.sources.findIndex((e) => e.sourceId === "dated-block");
        const undatedIdx = index.sources.findIndex((e) => e.sourceId === "dec-undated");
        expect(datedIdx).toBeLessThan(undatedIdx);
        // Undated source sorts last.
        expect(undatedIdx).toBe(index.sources.length - 1);
        db.close();
    });

    it("keeps both identical-title sources and marks duplicates deterministically (behavior 6)", () => {
        const db = createCuratorTestDb();
        seedFixture(db);
        const index = collectProjectContextSourceIndex(db, "proj-1", { now: NOW });
        const dupes = index.sources.filter((e) => e.title === "DUPE-TITLE");
        expect(dupes.map((e) => e.sourceId).sort()).toEqual(["db-4", "db-5"]);
        expect(dupes.every((e) => e.possibleDuplicateTitle === true)).toBe(true);
        const nonDup = index.sources.find((e) => e.sourceId === "db-1");
        expect(nonDup?.possibleDuplicateTitle).toBeUndefined();
        db.close();
    });

    it("identifies PROJECT-CONTEXT-CURRENT as derived but keeps it visible (behaviors 7,8)", () => {
        const db = createCuratorTestDb();
        seedFixture(db);
        const index = collectProjectContextSourceIndex(db, "proj-1", { now: NOW });
        const derived = index.sources.find((e) => e.sourceId === "db-3");
        expect(derived).toBeDefined();
        expect(derived?.isDerivedContext).toBe(true);
        expect(derived?.title).toBe(DERIVED_CONTEXT_TITLE);
        db.close();
    });
});

describe("Project Context Curator (CTX2-R1) — Stage B explicit loader", () => {
    it("loads exact doc_block, doc, and decision bodies (behaviors 10,11,12)", () => {
        const db = createCuratorTestDb();
        seedFixture(db);
        const loaded = loadProjectContextSources(db, "proj-1", [
            { sourceKind: "doc_block", sourceId: "db-1" },
            { sourceKind: "doc", sourceId: "doc-2" },
            { sourceKind: "decision", sourceId: "dec-1" },
            { sourceKind: "project_metadata", sourceId: "proj-1" },
        ]);

        const byRef = new Map(loaded.map((s) => [`${s.ref.sourceKind}:${s.ref.sourceId}`, s]));
        expect(byRef.get("doc_block:db-1")?.content).toBe("details body KFS");
        expect(byRef.get("doc_block:db-1")?.title).toBe("KFS-001");
        expect(byRef.get("doc:doc-2")?.content).toBe("log body");
        expect(byRef.get("decision:dec-1")?.content).toContain("decision: Use React");
        expect(byRef.get("decision:dec-1")?.content).toContain("reason: Team familiarity");
        expect(byRef.get("decision:dec-1")?.content).toContain("impact: Faster delivery");
        expect(byRef.get("project_metadata:proj-1")?.content).toContain("name: Arbor Plant Companion Widget");
        db.close();
    });

    it("rejects unknown, cross-project, unsupported, and derived sources (behaviors 9,13,14,15)", () => {
        const db = createCuratorTestDb();
        seedFixture(db);

        // 9: derived context rejected as authoritative
        expectCuratorError(
            () => loadProjectContextSources(db, "proj-1", [{ sourceKind: "doc_block", sourceId: "db-3" }]),
            "DERIVED_CONTEXT_REJECTED",
        );

        // 13: unknown source id
        expectCuratorError(
            () => loadProjectContextSources(db, "proj-1", [{ sourceKind: "doc", sourceId: "nope" }]),
            "UNKNOWN_SOURCE",
        );

        // 14: cross-project source
        expectCuratorError(
            () => loadProjectContextSources(db, "proj-1", [{ sourceKind: "doc", sourceId: "doc-x" }]),
            "CROSS_PROJECT_SOURCE",
        );

        // 15: unsupported sourceKind (simulated invalid caller payload)
        expectCuratorError(
            () =>
                loadProjectContextSources(db, "proj-1", [
                    { sourceKind: "note", sourceId: "n1" } as never,
                ]),
            "UNSUPPORTED_SOURCE_KIND",
        );

        db.close();
    });

    it("never substitutes title for source id (behavior 16)", () => {
        const db = createCuratorTestDb();
        seedFixture(db);
        // A doc titled "Content Roadmap" exists, but a wrong id must NOT resolve by title.
        expectCuratorError(
            () => loadProjectContextSources(db, "proj-1", [{ sourceKind: "doc", sourceId: "not-roadmap" }]),
            "UNKNOWN_SOURCE",
        );
        db.close();
    });

    it("enforces MAX_SELECTED_SOURCES = 12 (behavior 17)", () => {
        const db = createCuratorTestDb();
        seedFixture(db);
        const refs = Array.from({ length: 13 }, (_, i) => ({
            sourceKind: "doc" as const,
            sourceId: `doc-${i}`,
        }));
        expectCuratorError(
            () => loadProjectContextSources(db, "proj-1", refs),
            "MAX_SELECTED_SOURCES_EXCEEDED",
        );
        db.close();
    });

    it("enforces per-source bound with exact truncation provenance (behaviors 18,19)", () => {
        const db = createCuratorTestDb();
        seedFixture(db);
        const loaded = loadProjectContextSources(db, "proj-1", [
            { sourceKind: "doc", sourceId: "doc-big" }, // 40_000 chars
        ]);
        const source = loaded[0];
        expect(source.originalCharacterCount).toBe(40_000);
        expect(source.contentTruncated).toBe(true);
        expect(source.includedCharacterCount).toBe(source.content.length);
        expect(source.includedCharacterCount).toBeLessThanOrEqual(DEFAULT_CURATOR_LIMITS.maxCharsPerSource);
        expect(source.content.endsWith(TRUNCATION_SUFFIX)).toBe(true);
        // Provenance never lets truncated content appear complete.
        expect(source.content.length).toBeLessThan(source.originalCharacterCount);
        db.close();
    });

    it("fails closed when total selected content exceeds MAX_TOTAL_CHARS (behavior 20)", () => {
        const db = createCuratorTestDb();
        seedFixture(db);
        expectCuratorError(
            () =>
                loadProjectContextSources(db, "proj-1", [
                    { sourceKind: "doc", sourceId: "doc-1" },
                    { sourceKind: "doc", sourceId: "doc-2" },
                ], { limits: { maxTotalChars: 10 } }),
            "MAX_TOTAL_CHARS_EXCEEDED",
        );
        db.close();
    });
});

describe("Project Context Curator (CTX2-R1) — bundle + safety", () => {
    it("has stable schema versions (behavior 21)", () => {
        expect(PROJECT_CONTEXT_SOURCE_INDEX_SCHEMA_VERSION).toBe("project-context-source-index.v1");
        expect(PROJECT_CONTEXT_SOURCE_BUNDLE_SCHEMA_VERSION).toBe("project-context-source-bundle.v1");
    });

    it("keeps Stage A and Stage B separately callable (behavior 22)", () => {
        const db = createCuratorTestDb();
        seedFixture(db);
        const index = collectProjectContextSourceIndex(db, "proj-1", { now: NOW });
        expect(index.sources.length).toBeGreaterThan(0);
        const loaded = loadProjectContextSources(db, "proj-1", [
            { sourceKind: "doc_block", sourceId: "db-1" },
        ]);
        expect(loaded).toHaveLength(1);
        db.close();
    });

    it("does not mutate the DB from Stage A or Stage B (behaviors 23,24)", () => {
        const db = createCuratorTestDb();
        seedFixture(db);
        const before = fingerprint(db);

        collectProjectContextSourceIndex(db, "proj-1", { now: NOW });
        expect(fingerprint(db)).toBe(before);

        loadProjectContextSources(db, "proj-1", [
            { sourceKind: "doc_block", sourceId: "db-1" },
            { sourceKind: "doc", sourceId: "doc-1" },
        ]);
        expect(fingerprint(db)).toBe(before);
        db.close();
    });

    it("composes a provider-neutral bundle from Stage A + refs + Stage B", () => {
        const db = createCuratorTestDb();
        seedFixture(db);
        const refs = [
            { sourceKind: "doc_block", sourceId: "db-1" },
            { sourceKind: "doc", sourceId: "doc-1" },
        ];
        const bundle = buildProjectContextSourceBundle(db, "proj-1", refs, { now: NOW });

        expect(bundle.schemaVersion).toBe(PROJECT_CONTEXT_SOURCE_BUNDLE_SCHEMA_VERSION);
        expect(bundle.project.slug).toBe("arbor-plant-companion-widget-ycc");
        expect(bundle.sourceIndex.length).toBeGreaterThan(0);
        expect(bundle.selectedSourceRefs).toEqual(refs);
        expect(bundle.selectedSources).toHaveLength(2);
        expect(bundle.limits).toEqual(DEFAULT_CURATOR_LIMITS);
        expect(bundle.trace.stageB).toMatchObject({ requested: 2, loaded: 2 });
        expect(bundle.trace.stageA.sourceCounts).toMatchObject({
            doc_block: 5,
            doc: 3,
            decision: 1,
            loop: 1,
            project_metadata: 1,
        });
        db.close();
    });
});

describe("P1-G2B assertProjectOwnsSource ownership seam", () => {
    it("T8 fails visibly for an unknown sourceKind", () => {
        const db = createCuratorTestDb();
        seedFixture(db);
        expect(() =>
            assertProjectOwnsSource(db, "proj-1", { sourceKind: "bogus" as never, sourceId: "x" }),
        ).toThrowError(
            expect.objectContaining<ProjectContextCuratorError>({ code: "UNSUPPORTED_SOURCE_KIND" }),
        );
        db.close();
    });

    it("T15 accepts sources owned by the Project (doc, project_metadata)", () => {
        const db = createCuratorTestDb();
        seedFixture(db);
        expect(() =>
            assertProjectOwnsSource(db, "proj-1", { sourceKind: "doc", sourceId: "doc-1" }),
        ).not.toThrow();
        expect(() =>
            assertProjectOwnsSource(db, "proj-1", { sourceKind: "project_metadata", sourceId: "proj-1" }),
        ).not.toThrow();
        db.close();
    });

    it("T16 fails visibly when the source belongs to another Project", () => {
        const db = createCuratorTestDb();
        seedFixture(db);
        expect(() =>
            assertProjectOwnsSource(db, "proj-1", { sourceKind: "doc", sourceId: "doc-x" }),
        ).toThrowError(
            expect.objectContaining<ProjectContextCuratorError>({ code: "UNKNOWN_SOURCE" }),
        );
        db.close();
    });

    it("T17 fails visibly for a known kind with a nonexistent sourceId", () => {
        const db = createCuratorTestDb();
        seedFixture(db);
        expect(() =>
            assertProjectOwnsSource(db, "proj-1", { sourceKind: "doc", sourceId: "doc-missing" }),
        ).toThrowError(
            expect.objectContaining<ProjectContextCuratorError>({ code: "UNKNOWN_SOURCE" }),
        );
        db.close();
    });

    it("T19 does not import Stage-B admissibility (derived-title doc_block accepted)", () => {
        const db = createCuratorTestDb();
        seedFixture(db);
        // db-3 carries DERIVED_CONTEXT_TITLE; Stage-B validateRef would reject it,
        // the ownership seam must NOT.
        expect(() =>
            assertProjectOwnsSource(db, "proj-1", { sourceKind: "doc_block", sourceId: "db-3" }),
        ).not.toThrow();
        db.close();
    });

    it("T18 accepts a valid enumerated project_context_snapshot even though derived", () => {
        const db = createCuratorTestDb();
        seedFixture(db);
        db.exec(`
            CREATE TABLE project_context_snapshots (
              id TEXT PRIMARY KEY, project_id TEXT NOT NULL UNIQUE, current_version_id TEXT NULL, created_at TEXT
            );
            CREATE TABLE project_context_snapshot_versions (
              id TEXT PRIMARY KEY, snapshot_id TEXT NOT NULL, schema_version TEXT NOT NULL,
              project_slug TEXT NOT NULL, generated_from_fingerprint TEXT NOT NULL,
              published_corpus_fingerprint TEXT NULL, coverage_json TEXT NOT NULL,
              synthesis_json TEXT NOT NULL, rendered_markdown TEXT NOT NULL,
              generated_at TEXT NOT NULL, approved_at TEXT NULL, approved_by TEXT NULL,
              publication_state TEXT NOT NULL
            );
        `);
        db.prepare(
            `INSERT INTO project_context_snapshots (id, project_id, current_version_id) VALUES ('snap-1', 'proj-1', 'ver-1')`,
        ).run();
        db.prepare(
            `INSERT INTO project_context_snapshot_versions (
              id, snapshot_id, schema_version, project_slug, generated_from_fingerprint,
              published_corpus_fingerprint, coverage_json, synthesis_json, rendered_markdown,
              generated_at, approved_at, approved_by, publication_state
            ) VALUES ('ver-1', 'snap-1', 'project-context.v1', 'proj-1', ?, NULL, '{}', '{}', 'markdown body', '2026-07-01T00:00:00.000Z', '2026-07-02T00:00:00.000Z', 'human-1', 'PUBLISHED')`,
        ).run("a".repeat(64));
        expect(() =>
            assertProjectOwnsSource(db, "proj-1", { sourceKind: "project_context_snapshot", sourceId: "ver-1" }),
        ).not.toThrow();
        db.close();
    });
});
