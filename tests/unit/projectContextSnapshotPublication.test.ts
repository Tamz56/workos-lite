import Database from "better-sqlite3";
import { createHash } from "node:crypto";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import {
    publishProjectContextSnapshot,
    ProjectContextPublicationError,
    snapshotContentDigestOf,
    deriveSnapshotVersionId,
} from "@/lib/project-context-snapshots/publication";
import { renderProjectContextSnapshotMarkdown } from "@/lib/project-context-snapshots/renderer";
import {
    PROJECT_CONTEXT_ATTACHMENT_DISCLOSURE,
    PROJECT_CONTEXT_RECOMMENDATION_DISCLAIMER,
    type ProjectContextSnapshotDraft,
} from "@/lib/project-context-snapshots/contracts";
import { buildSourceIndexPage, buildCorpusFingerprint } from "@/lib/ai-read/sourceIndexService";
import { readSourceChunk, MAX_CHUNK_CHARS } from "@/lib/ai-read/readService";
import { PROJECT_CONTEXT_SNAPSHOT_DISPLAY_TITLE } from "@/lib/project-curator/contracts";

const { mockGetDb } = vi.hoisted(() => ({ mockGetDb: vi.fn() }));
vi.mock("@/db/db", () => ({ getDb: mockGetDb }));

import { NextRequest } from "next/server";
import { POST as publishRoute } from "@/app/api/projects/[slug]/context-snapshot/publish/route";

const SLUG = "arbor-plant-companion-widget-ycc";

// ---------------------------------------------------------------------------
// In-memory fixture DB (committed I2A schema + READ1 tables); never live DB.
// ---------------------------------------------------------------------------

function createDb(): Database.Database {
    const db = new Database(":memory:");
    db.pragma("foreign_keys = ON");
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
        CREATE TABLE project_contexts (
          id TEXT PRIMARY KEY, project_id TEXT NOT NULL UNIQUE,
          overview TEXT, purpose TEXT, standing_instructions TEXT, tone_voice TEXT,
          guardrails TEXT, output_standards TEXT, decision_rules TEXT, source_of_truth TEXT,
          created_at TEXT, updated_at TEXT
        );
        CREATE TABLE project_loops (
          id TEXT PRIMARY KEY, project_id TEXT NOT NULL, template_id TEXT,
          loop_name TEXT, loop_type TEXT, current_step TEXT, status TEXT,
          risk_level TEXT, review_gate_level INTEGER, expected_output TEXT,
          save_destination TEXT, learn_note TEXT, steps_json TEXT,
          created_at TEXT, updated_at TEXT, completed_at TEXT, gate_status TEXT,
          last_gate_action TEXT, last_gate_at TEXT
        );
        CREATE TABLE human_operators (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          created_at TEXT NOT NULL DEFAULT (datetime('now'))
        );
        CREATE TABLE project_context_snapshots (
          id TEXT PRIMARY KEY,
          project_id TEXT NOT NULL UNIQUE,
          current_version_id TEXT NULL,
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          UNIQUE(id, current_version_id),
          FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE RESTRICT,
          FOREIGN KEY(id, current_version_id)
            REFERENCES project_context_snapshot_versions(snapshot_id, id)
            ON UPDATE RESTRICT ON DELETE RESTRICT
            DEFERRABLE INITIALLY DEFERRED
        );
        CREATE TABLE project_context_snapshot_versions (
          id TEXT PRIMARY KEY,
          snapshot_id TEXT NOT NULL,
          schema_version TEXT NOT NULL CHECK(schema_version = 'project-context.v1'),
          project_slug TEXT NOT NULL CHECK(length(trim(project_slug)) > 0),
          generated_from_fingerprint TEXT NOT NULL CHECK(
            length(generated_from_fingerprint) = 64
            AND generated_from_fingerprint NOT GLOB '*[^0-9a-f]*'
          ),
          published_corpus_fingerprint TEXT NULL,
          coverage_json TEXT NOT NULL CHECK(json_valid(coverage_json)),
          synthesis_json TEXT NOT NULL CHECK(json_valid(synthesis_json)),
          rendered_markdown TEXT NOT NULL,
          generated_at TEXT NOT NULL,
          approved_at TEXT NULL,
          approved_by TEXT NULL,
          publication_state TEXT NOT NULL CHECK(publication_state IN ('PUBLISHING', 'PUBLISHED')),
          UNIQUE(snapshot_id, id),
          FOREIGN KEY(snapshot_id) REFERENCES project_context_snapshots(id) ON DELETE RESTRICT,
          FOREIGN KEY(approved_by) REFERENCES human_operators(id) ON DELETE RESTRICT,
          CHECK(
            (
              publication_state = 'PUBLISHING'
              AND published_corpus_fingerprint IS NULL
            )
            OR
            (
              publication_state = 'PUBLISHED'
              AND length(published_corpus_fingerprint) = 64
              AND published_corpus_fingerprint NOT GLOB '*[^0-9a-f]*'
              AND approved_at IS NOT NULL
              AND length(trim(approved_at)) > 0
              AND approved_by IS NOT NULL
              AND length(trim(approved_by)) > 0
            )
          )
        );
        CREATE INDEX idx_project_context_snapshot_versions_snapshot
          ON project_context_snapshot_versions(snapshot_id);
        CREATE TRIGGER trg_project_context_snapshots_identity_immutable
        BEFORE UPDATE OF id, project_id ON project_context_snapshots
        FOR EACH ROW BEGIN
          SELECT RAISE(ABORT, 'project context snapshot identity is immutable');
        END;
        CREATE TRIGGER trg_project_context_snapshots_current_insert
        BEFORE INSERT ON project_context_snapshots
        FOR EACH ROW WHEN NEW.current_version_id IS NOT NULL
        BEGIN
          SELECT CASE WHEN NOT EXISTS (
            SELECT 1 FROM project_context_snapshot_versions v
            WHERE v.id = NEW.current_version_id AND v.snapshot_id = NEW.id
              AND v.publication_state = 'PUBLISHED'
          ) THEN RAISE(ABORT, 'current snapshot version must be published and belong to the same container') END;
        END;
        CREATE TRIGGER trg_project_context_snapshots_current_update
        BEFORE UPDATE OF current_version_id ON project_context_snapshots
        FOR EACH ROW WHEN NEW.current_version_id IS NOT NULL
        BEGIN
          SELECT CASE WHEN NOT EXISTS (
            SELECT 1 FROM project_context_snapshot_versions v
            WHERE v.id = NEW.current_version_id AND v.snapshot_id = NEW.id
              AND v.publication_state = 'PUBLISHED'
          ) THEN RAISE(ABORT, 'current snapshot version must be published and belong to the same container') END;
        END;
        CREATE TRIGGER trg_project_context_snapshot_versions_content_immutable
        BEFORE UPDATE OF id, snapshot_id, schema_version, project_slug,
          generated_from_fingerprint, coverage_json, synthesis_json,
          rendered_markdown, generated_at
        ON project_context_snapshot_versions FOR EACH ROW BEGIN
          SELECT RAISE(ABORT, 'project context snapshot version content is immutable');
        END;
        CREATE TRIGGER trg_project_context_snapshot_versions_published_immutable
        BEFORE UPDATE ON project_context_snapshot_versions
        FOR EACH ROW WHEN OLD.publication_state = 'PUBLISHED'
        BEGIN
          SELECT RAISE(ABORT, 'published project context snapshot version is immutable');
        END;
        CREATE TRIGGER trg_project_context_snapshot_versions_published_no_delete
        BEFORE DELETE ON project_context_snapshot_versions
        FOR EACH ROW WHEN OLD.publication_state = 'PUBLISHED'
        BEGIN
          SELECT RAISE(ABORT, 'published project context snapshot version cannot be deleted');
        END;
    `);
    return db;
}

function seedProject(db: Database.Database): void {
    db.prepare(`
        INSERT INTO projects (id, slug, name, status, created_at, updated_at)
        VALUES ('proj-1', ?, 'Arbor Widget', 'planned', '2026-07-01T00:00:00.000Z', '2026-07-11T00:00:00.000Z')
    `).run(SLUG);
    db.prepare(`
        INSERT INTO projects (id, slug, name, status, created_at, updated_at)
        VALUES ('proj-2', 'second-project', 'Second Project', 'planned', '2026-07-01T00:00:00.000Z', '2026-07-01T00:00:00.000Z')
    `).run();
    db.prepare("INSERT OR IGNORE INTO human_operators (id, name) VALUES ('operator-1', 'Operator')").run();
    db.prepare(`
        INSERT INTO project_doc_blocks (
          id, project_id, block_type, title, block_date, summary, details_md,
          evidence_links_json, related_files_json, next_action, status, order_index,
          source_type, generated_by, reviewed_by_user, created_at, updated_at
        ) VALUES (
          'blk-1', 'proj-1', 'brief', 'KFS-001', '2026-07-10', 'Summary', 'Details body',
          '[]', '[]', NULL, 'active', 0, NULL, NULL, 0, '2026-07-01T00:00:00.000Z', '2026-07-10T00:00:00.000Z'
        )
    `).run();
    db.prepare(`
        INSERT INTO docs (id, title, content_md, project_id, workspace, created_at, updated_at)
        VALUES ('doc-1', 'Content Roadmap', 'roadmap body', 'proj-1', NULL, '2026-07-01T00:00:00.000Z', '2026-07-15T00:00:00.000Z')
    `).run();
    db.prepare(`
        INSERT INTO project_decisions (id, project_id, title, decision, reason, impact, created_at)
        VALUES ('dec-1', 'proj-1', 'Tech stack', 'Use React', 'reason', 'impact', '2026-07-03T00:00:00.000Z')
    `).run();
    db.prepare(`
        INSERT INTO project_contexts (id, project_id, overview, created_at, updated_at)
        VALUES ('ctx-1', 'proj-1', 'overview text', '2026-07-02T00:00:00.000Z', '2026-07-02T00:00:00.000Z')
    `).run();
    db.prepare(`
        INSERT INTO project_loops (id, project_id, loop_name, loop_type, status, risk_level, current_step, created_at, updated_at)
        VALUES ('loop-1', 'proj-1', 'Loop', 'review', 'active', 'low', 'step', '2026-07-04T00:00:00.000Z', '2026-07-04T00:00:00.000Z')
    `).run();
}

function currentFingerprint(db: Database.Database): string {
    return buildSourceIndexPage(db, SLUG, { pageSize: 200, now: "2026-08-24T00:00:00.000Z" }).corpusFingerprint;
}

const FINGERPRINT_64 = "b".repeat(64);

function validDraft(generatedFromFingerprint: string, overrides: Partial<Record<string, unknown>> = {}): ProjectContextSnapshotDraft {
    return {
        schemaVersion: "project-context.v1",
        projectSlug: SLUG,
        generatedFromFingerprint,
        publishedCorpusFingerprint: null,
        generatedAt: "2026-08-24T01:02:03.000Z",
        coverage: {
            status: "PARTIAL",
            manifestSourceCount: 3,
            authorityEligibleSourceCount: 1,
            authorityReadSourceCount: 1,
            excludedSourceRefs: [
                { sourceRef: "memory", authorityClass: "DERIVED_WORKING_MEMORY", reason: "Prior snapshot" },
                { sourceRef: "chat", authorityClass: "CONVERSATIONAL_HISTORY", reason: "Conversation context" },
            ],
            missingAuthoritySourceRefs: [],
            duplicateAuthoritySourceRefs: [],
            attachmentDisclosure: PROJECT_CONTEXT_ATTACHMENT_DISCLOSURE,
        },
        currentState: [{ text: "Foundation complete", classification: "CONFIRMED", sourceRefs: ["authority"] }],
        currentObjective: [],
        completed: [],
        active: [],
        decisions: [],
        blockers: [],
        conflicts: [],
        unknowns: [{ text: "Launch date", classification: "UNKNOWN", missingEvidence: "Approved schedule" }],
        recordedNextAction: {
            text: "Review the contract",
            classification: "CONFIRMED",
            sourceRefs: ["authority"],
        },
        recommendedNextAction: {
            text: "Prepare the review packet",
            classification: "RECOMMENDATION",
            rationaleSourceRefs: ["memory"],
            disclaimer: PROJECT_CONTEXT_RECOMMENDATION_DISCLAIMER,
        },
        sourceRegistry: {
            authority: {
                sourceKind: "project_context",
                sourceId: "ctx-1",
                title: "Human context",
                authorityClass: "AUTHORITY_ELIGIBLE",
                declaredScope: "Human-authored configuration",
            },
            memory: {
                sourceKind: "project_context_snapshot",
                sourceId: "snapshot-1",
                title: "Prior snapshot",
                authorityClass: "DERIVED_WORKING_MEMORY",
                declaredScope: "Working-memory continuity only",
            },
            chat: {
                sourceKind: "conversational_history",
                sourceId: "conversation-1",
                title: "Conversation context",
                authorityClass: "CONVERSATIONAL_HISTORY",
                declaredScope: "Non-canonical conversation context",
            },
        },
        previousWorkingMemoryRefs: ["memory"],
        ...overrides,
    } as ProjectContextSnapshotDraft;
}

function clone(value: unknown): Record<string, any> {
    return structuredClone(value) as Record<string, any>;
}

function snapshotRows(db: Database.Database): { containers: number; versions: number } {
    return {
        containers: db.prepare("SELECT count(*) n FROM project_context_snapshots").get().n as number,
        versions: db.prepare("SELECT count(*) n FROM project_context_snapshot_versions").get().n as number,
    };
}

function expectPublishError(fn: () => unknown, code: string): void {
    try {
        fn();
        throw new Error("expected error");
    } catch (err) {
        if (err instanceof ProjectContextPublicationError) expect(err.code).toBe(code);
        else throw err;
    }
}

// ---------------------------------------------------------------------------
// Service-level publication tests
// ---------------------------------------------------------------------------

describe("CTX3-I2D — snapshot publication service", () => {
    it("first publication: container+version, PUBLISHED, current pointer, approved_by, server Markdown, digest (12-19)", () => {
        const db = createDb();
        seedProject(db);
        const x = currentFingerprint(db);
        const draft = validDraft(x);
        const approvedAt = "2026-08-24T10:00:00.000Z";

        const result = publishProjectContextSnapshot(db, {
            projectSlug: SLUG,
            draft,
            approvedBy: "operator-1",
            approvedAt,
            operationId: "op-1",
        });

        const rows = snapshotRows(db);
        expect(rows.containers).toBe(1);
        expect(rows.versions).toBe(1);

        const container = db.prepare("SELECT * FROM project_context_snapshots WHERE project_id = 'proj-1'").get() as any;
        expect(container.current_version_id).toBe(result.versionId);

        const version = db.prepare("SELECT * FROM project_context_snapshot_versions WHERE id = ?").get(result.versionId) as any;
        expect(version.publication_state).toBe("PUBLISHED");
        expect(version.schema_version).toBe("project-context.v1");
        expect(version.approved_by).toBe("operator-1"); // server identity, not request
        expect(version.approved_at).toBe(approvedAt); // server-controlled
        expect(version.generated_from_fingerprint).toBe(x);
        expect(version.published_corpus_fingerprint).toBe(result.corpusFingerprint);
        // stored Markdown equals deterministic renderer output
        const rendered = renderProjectContextSnapshotMarkdown(draft);
        expect(version.rendered_markdown).toBe(rendered);
        // digest equals exact body SHA-256
        expect(snapshotContentDigestOf(rendered)).toBe(createHash("sha256").update(rendered, "utf8").digest("hex"));
        expect(result.snapshotContentDigest).toBe(snapshotContentDigestOf(rendered));
        db.close();
    });

    it("publishes only when generatedFromFingerprint equals current corpus fingerprint (9, 10, 11)", () => {
        const db = createDb();
        seedProject(db);
        const x = currentFingerprint(db);

        // stale draft → rejected, zero rows
        const stale = clone(validDraft(x));
        stale.generatedFromFingerprint = "f".repeat(64);
        expectPublishError(
            () => publishProjectContextSnapshot(db, { projectSlug: SLUG, draft: stale, approvedBy: "operator-1", operationId: "op-stale" }),
            "SNAPSHOT_SOURCE_CORPUS_CHANGED",
        );
        expect(snapshotRows(db)).toEqual({ containers: 0, versions: 0 });

        // matching draft → allowed
        const ok = publishProjectContextSnapshot(db, { projectSlug: SLUG, draft: validDraft(x), approvedBy: "operator-1", operationId: "op-ok" });
        expect(ok.corpusFingerprint).toMatch(/^[a-f0-9]{64}$/);
        db.close();
    });

    it("rejects invalid draft schema before any write (5)", () => {
        const db = createDb();
        seedProject(db);
        const x = currentFingerprint(db);
        const bad = clone(validDraft(x));
        bad.schemaVersion = "project-context.v2";
        expectPublishError(
            () => publishProjectContextSnapshot(db, { projectSlug: SLUG, draft: bad, approvedBy: "operator-1", operationId: "op-bad" }),
            "INVALID_SNAPSHOT_DRAFT",
        );
        expect(snapshotRows(db)).toEqual({ containers: 0, versions: 0 });
        db.close();
    });

    it("rejects a draft carrying a client-published fingerprint (6)", () => {
        const db = createDb();
        seedProject(db);
        const x = currentFingerprint(db);
        const bad = clone(validDraft(x));
        bad.publishedCorpusFingerprint = "c".repeat(64);
        expectPublishError(
            () => publishProjectContextSnapshot(db, { projectSlug: SLUG, draft: bad, approvedBy: "operator-1", operationId: "op-bad" }),
            "INVALID_SNAPSHOT_DRAFT",
        );
        expect(snapshotRows(db)).toEqual({ containers: 0, versions: 0 });
        db.close();
    });

    it("rejects a draft carrying arbitrary rendered Markdown (7)", () => {
        const db = createDb();
        seedProject(db);
        const x = currentFingerprint(db);
        const bad = clone(validDraft(x));
        bad.renderedMarkdown = "arbitrary markdown"; // extra unknown field → strict validation fails
        expectPublishError(
            () => publishProjectContextSnapshot(db, { projectSlug: SLUG, draft: bad, approvedBy: "operator-1", operationId: "op-bad" }),
            "INVALID_SNAPSHOT_DRAFT",
        );
        expect(snapshotRows(db)).toEqual({ containers: 0, versions: 0 });
        db.close();
    });

    it("rejects an unknown Project (8)", () => {
        const db = createDb();
        seedProject(db);
        const x = currentFingerprint(db);
        expectPublishError(
            () => publishProjectContextSnapshot(db, { projectSlug: "missing-project", draft: validDraft(x), approvedBy: "operator-1", operationId: "op-unknown" }),
            "PROJECT_NOT_FOUND",
        );
        db.close();
    });

    it("fingerprint transition X→Y with no recursion (20-25)", () => {
        const db = createDb();
        seedProject(db);
        const x = currentFingerprint(db);
        const result = publishProjectContextSnapshot(db, { projectSlug: SLUG, draft: validDraft(x), approvedBy: "operator-1", operationId: "op-fp" });

        const y = result.corpusFingerprint;
        expect(y).not.toBe(x); // X != Y
        const version = db.prepare("SELECT * FROM project_context_snapshot_versions WHERE id = ?").get(result.versionId) as any;
        expect(version.published_corpus_fingerprint).toBe(y);

        // actual READ1 manifest fingerprint == Y
        const after = buildSourceIndexPage(db, SLUG, { pageSize: 200, now: "2026-08-24T00:00:00.000Z" });
        expect(after.corpusFingerprint).toBe(y);

        // changing only publishedCorpusFingerprint metadata does not alter Y
        const mutated = after.sources.map((e) =>
            e.sourceKind === "project_context_snapshot" && e.snapshotMetadata
                ? { ...e, snapshotMetadata: { ...e.snapshotMetadata, publishedCorpusFingerprint: "f".repeat(64) } }
                : e,
        );
        expect(buildCorpusFingerprint(mutated)).toBe(y);
        db.close();
    });

    it("README post-publication contract (26-31)", () => {
        const db = createDb();
        seedProject(db);
        const x = currentFingerprint(db);
        const result = publishProjectContextSnapshot(db, {
            projectSlug: SLUG,
            draft: validDraft(x),
            approvedBy: "operator-1",
            approvedAt: "2026-08-24T10:00:00.000Z",
            operationId: "op-readme",
        });

        const before = db.prepare("SELECT count(*) n FROM project_doc_blocks").get().n as number
            + (db.prepare("SELECT count(*) n FROM docs").get().n as number)
            + (db.prepare("SELECT count(*) n FROM project_decisions").get().n as number)
            + (db.prepare("SELECT count(*) n FROM project_contexts").get().n as number)
            + (db.prepare("SELECT count(*) n FROM project_loops").get().n as number)
            + 1; // project_metadata

        const after = buildSourceIndexPage(db, SLUG, { pageSize: 200, now: "2026-08-24T00:00:00.000Z" });
        expect(after.counts.project_context_snapshot).toBe(1); // 26
        expect(after.pagination.totalSources).toBe(before + 1); // 27 (N → N+1)
        const snap = after.sources.find((e) => e.sourceKind === "project_context_snapshot")!;
        expect(snap.sourceId).toBe(result.versionId); // 28 immutable version id
        expect(snap.isDerivedContext).toBe(true); // 29
        expect(snap.hasFullContent).toBe(true);
        expect(snap.title).toBe(PROJECT_CONTEXT_SNAPSHOT_DISPLAY_TITLE);
        // snapshot metadata complete (31)
        expect(snap.snapshotMetadata).toMatchObject({
            schemaVersion: "project-context.v1",
            generatedFromFingerprint: x,
            publishedCorpusFingerprint: result.corpusFingerprint,
            generatedAt: "2026-08-24T01:02:03.000Z",
            approvedAt: "2026-08-24T10:00:00.000Z",
        });
        // body fetch exact (30)
        const chunk = readSourceChunk(db, SLUG, {
            source: { sourceKind: "project_context_snapshot", sourceId: result.versionId },
            offset: 0,
            limit: MAX_CHUNK_CHARS,
        });
        expect(chunk.content).toBe((db.prepare("SELECT rendered_markdown FROM project_context_snapshot_versions WHERE id = ?").get(result.versionId) as any).rendered_markdown);
        expect(chunk.metadata.isDerivedContext).toBe(true);
        db.close();
    });

    it("re-publication creates a new immutable version, retains the old, moves the pointer (32-36)", () => {
        const db = createDb();
        seedProject(db);
        const x = currentFingerprint(db);
        const first = publishProjectContextSnapshot(db, { projectSlug: SLUG, draft: validDraft(x), approvedBy: "operator-1", operationId: "op-repub-1" });
        const y1 = first.corpusFingerprint;

        const draft2 = validDraft(y1);
        (draft2 as any).generatedAt = "2026-08-25T01:02:03.000Z";
        (draft2 as any).currentState = [{ text: "Updated state", classification: "CONFIRMED", sourceRefs: ["authority"] }];
        const second = publishProjectContextSnapshot(db, { projectSlug: SLUG, draft: draft2, approvedBy: "operator-1", operationId: "op-repub-2" });

        expect(second.versionId).not.toBe(first.versionId); // new immutable version (32)
        expect(snapshotRows(db).containers).toBe(1); // container remains one (33)
        expect(snapshotRows(db).versions).toBe(2);

        const container = db.prepare("SELECT current_version_id FROM project_context_snapshots WHERE project_id = 'proj-1'").get() as any;
        expect(container.current_version_id).toBe(second.versionId); // pointer moves (35)

        const oldVersion = db.prepare("SELECT publication_state FROM project_context_snapshot_versions WHERE id = ?").get(first.versionId) as any;
        expect(oldVersion.publication_state).toBe("PUBLISHED"); // retained as historical (34)

        const after = buildSourceIndexPage(db, SLUG, { pageSize: 200, now: "2026-08-24T00:00:00.000Z" });
        const snaps = after.sources.filter((e) => e.sourceKind === "project_context_snapshot");
        expect(snaps).toHaveLength(1); // READ1 enumerates only newest (36)
        expect(snaps[0].sourceId).toBe(second.versionId);
        expect(after.counts.project_context_snapshot).toBe(1);
        expect(after.corpusFingerprint).toBe(second.corpusFingerprint);
        db.close();
    });

    it("atomicity: a failed insert rolls back all writes and never leaves PUBLISHING current (37, 39, 40)", () => {
        const db = createDb();
        seedProject(db);
        const x = currentFingerprint(db);
        // approvedBy references a non-existent human operator → FK violation inside the transaction
        expectPublishError(
            () => publishProjectContextSnapshot(db, { projectSlug: SLUG, draft: validDraft(x), approvedBy: "missing-operator", operationId: "op-fk" }),
            "PUBLICATION_TRANSACTION_FAILED",
        );
        // no partial container/version remains after rollback
        expect(snapshotRows(db)).toEqual({ containers: 0, versions: 0 });
        // no PUBLISHING row is visible/current
        expect(db.prepare("SELECT count(*) n FROM project_context_snapshot_versions WHERE publication_state = 'PUBLISHING'").get().n).toBe(0);
        db.close();
    });
});

// ---------------------------------------------------------------------------
// CTX3-I2D-R1 — final fingerprint mismatch atomicity + retry safety
// ---------------------------------------------------------------------------

describe("CTX3-I2D-R1 — finalization atomicity + retry safety", () => {
    it("final fingerprint mismatch rolls back container/version/pointer and leaves no PUBLISHING residue (38)", () => {
        const db = createDb();
        seedProject(db);
        const x = currentFingerprint(db);

        expectPublishError(
            () =>
                publishProjectContextSnapshot(
                    db,
                    { projectSlug: SLUG, draft: validDraft(x), approvedBy: "operator-1", operationId: "op-mismatch" },
                    { finalManifestResolver: () => "f".repeat(64) }, // force mismatch after finalization
                ),
            "FINGERPRINT_FINALIZATION_MISMATCH",
        );

        // entire transaction rolled back: no container, no version, no pointer change
        expect(snapshotRows(db)).toEqual({ containers: 0, versions: 0 });
        expect(db.prepare("SELECT count(*) n FROM project_context_snapshots").get().n).toBe(0);
        expect(db.prepare("SELECT count(*) n FROM project_context_snapshot_versions WHERE publication_state = 'PUBLISHING'").get().n).toBe(0);
        expect(db.prepare("SELECT count(*) n FROM project_context_snapshot_versions WHERE publication_state = 'PUBLISHED'").get().n).toBe(0);
        db.close();
    });

    it("A/B: retrying the SAME operation reconciles without a duplicate version", () => {
        const db = createDb();
        seedProject(db);
        const x = currentFingerprint(db);
        const draft = validDraft(x);
        const first = publishProjectContextSnapshot(db, {
            projectSlug: SLUG,
            draft,
            approvedBy: "operator-1",
            operationId: "op-publish-1",
            approvedAt: "2026-08-24T10:00:00.000Z",
        });
        expect(first.replayed).toBe(false);
        expect(snapshotRows(db)).toEqual({ containers: 1, versions: 1 });

        const retry = publishProjectContextSnapshot(db, {
            projectSlug: SLUG,
            draft,
            approvedBy: "operator-1",
            operationId: "op-publish-1",
            approvedAt: "2026-08-24T10:00:00.000Z",
        });
        expect(retry.replayed).toBe(true);
        expect(retry.versionId).toBe(first.versionId);
        expect(retry.corpusFingerprint).toBe(first.corpusFingerprint);
        // container count / version count / current pointer / fingerprint unchanged
        expect(snapshotRows(db)).toEqual({ containers: 1, versions: 1 });
        const container = db.prepare("SELECT current_version_id FROM project_context_snapshots WHERE project_id = 'proj-1'").get() as any;
        expect(container.current_version_id).toBe(first.versionId);
        db.close();
    });

    it("C: a NEW explicit publication operation creates a new immutable version", () => {
        const db = createDb();
        seedProject(db);
        const x = currentFingerprint(db);
        const first = publishProjectContextSnapshot(db, {
            projectSlug: SLUG,
            draft: validDraft(x),
            approvedBy: "operator-1",
            operationId: "op-publish-1",
        });
        const y1 = first.corpusFingerprint;

        const draft2 = validDraft(y1);
        (draft2 as any).generatedAt = "2026-08-25T01:02:03.000Z";
        (draft2 as any).currentState = [{ text: "Updated state", classification: "CONFIRMED", sourceRefs: ["authority"] }];
        const second = publishProjectContextSnapshot(db, {
            projectSlug: SLUG,
            draft: draft2,
            approvedBy: "operator-1",
            operationId: "op-publish-2",
        });
        expect(second.replayed).toBe(false);
        expect(second.versionId).not.toBe(first.versionId);
        expect(snapshotRows(db)).toEqual({ containers: 1, versions: 2 });
        const container = db.prepare("SELECT current_version_id FROM project_context_snapshots WHERE project_id = 'proj-1'").get() as any;
        expect(container.current_version_id).toBe(second.versionId);
        // previous version retained as historical PUBLISHED
        const old = db.prepare("SELECT publication_state FROM project_context_snapshot_versions WHERE id = ?").get(first.versionId) as any;
        expect(old.publication_state).toBe("PUBLISHED");
        db.close();
    });

    it("D: conflicting reuse of the same operation identity with different input fails closed", () => {
        const db = createDb();
        seedProject(db);
        const x = currentFingerprint(db);
        publishProjectContextSnapshot(db, {
            projectSlug: SLUG,
            draft: validDraft(x),
            approvedBy: "operator-1",
            operationId: "op-publish-1",
        });

        const different = clone(validDraft(x));
        different.currentState = [{ text: "Different state", classification: "CONFIRMED", sourceRefs: ["authority"] }];
        expectPublishError(
            () =>
                publishProjectContextSnapshot(db, {
                    projectSlug: SLUG,
                    draft: different,
                    approvedBy: "operator-1",
                    operationId: "op-publish-1",
                }),
            "PUBLICATION_IDEMPOTENCY_CONFLICT",
        );
        // no new version created
        expect(snapshotRows(db)).toEqual({ containers: 1, versions: 1 });
        db.close();
    });
});

// ---------------------------------------------------------------------------
// Route-level Human authority tests
// ---------------------------------------------------------------------------

describe("CTX3-I2D — publication route Human authority", () => {
    beforeEach(() => {
        mockGetDb.mockReset();
        const db = createDb();
        seedProject(db);
        mockGetDb.mockReturnValue(db);
        vi.stubEnv("WORKOS_TRUSTED_ORIGINS", "http://localhost:3000");
    });
    afterEach(() => {
        vi.unstubAllEnvs();
    });

    it("rejects unauthenticated publication (1)", async () => {
        const req = new NextRequest(`http://localhost:3000/api/projects/${SLUG}/context-snapshot/publish`, {
            method: "POST",
            headers: { origin: "http://localhost:3000", "content-type": "application/json" },
            body: JSON.stringify({ draft: {} }),
        });
        const res = await publishRoute(req, { params: Promise.resolve({ slug: SLUG }) });
        expect(res.status).toBe(401);
        const body = await res.json();
        expect(body.error.code).toBe("HUMAN_AUTH_SESSION_INVALID");
    });

    it("rejects an Agent Read credential (no Human session) (2)", async () => {
        const req = new NextRequest(`http://localhost:3000/api/projects/${SLUG}/context-snapshot/publish`, {
            method: "POST",
            headers: { origin: "http://localhost:3000", "x-agent-password": "agent-read-password", "content-type": "application/json" },
            body: JSON.stringify({ draft: {} }),
        });
        const res = await publishRoute(req, { params: Promise.resolve({ slug: SLUG }) });
        expect(res.status).toBe(401);
    });
});

// ---------------------------------------------------------------------------
// CTX3-I2D-R2 — retry contract purity
// ---------------------------------------------------------------------------

describe("CTX3-I2D-R2 — retry contract purity", () => {
    it("A: operationId is required for every publication", () => {
        const db = createDb();
        seedProject(db);
        const x = currentFingerprint(db);
        const draft = validDraft(x);
        const withoutOperationId = { projectSlug: SLUG, draft, approvedBy: "operator-1" };
        expectPublishError(
            () => publishProjectContextSnapshot(db, withoutOperationId as never),
            "INVALID_SNAPSHOT_DRAFT",
        );
        expect(snapshotRows(db)).toEqual({ containers: 0, versions: 0 });
        db.close();
    });

    it("B: malformed operationId is rejected deterministically", () => {
        const db = createDb();
        seedProject(db);
        const x = currentFingerprint(db);
        for (const op of ["", "   ", "  op  ", "o".repeat(129)]) {
            expectPublishError(
                () => publishProjectContextSnapshot(db, {
                    projectSlug: SLUG,
                    draft: validDraft(x),
                    approvedBy: "operator-1",
                    operationId: op,
                }),
                "INVALID_SNAPSHOT_DRAFT",
            );
        }
        expect(snapshotRows(db)).toEqual({ containers: 0, versions: 0 });
        db.close();
    });

    it("D: replay reconciles after the corpus moved X→Y (replay before stale guard)", () => {
        const db = createDb();
        seedProject(db);
        const x = currentFingerprint(db);
        const draft = validDraft(x); // generatedFromFingerprint = X
        const first = publishProjectContextSnapshot(db, {
            projectSlug: SLUG,
            draft,
            approvedBy: "operator-1",
            operationId: "op-retry-x-y",
        });
        const y = first.corpusFingerprint;
        expect(y).not.toBe(x);

        // ambiguous retry carries the SAME original draft (X) while current is Y;
        // replay must reconcile instead of failing as stale.
        const retry = publishProjectContextSnapshot(db, {
            projectSlug: SLUG,
            draft,
            approvedBy: "operator-1",
            operationId: "op-retry-x-y",
        });
        expect(retry.replayed).toBe(true);
        expect(retry.versionId).toBe(first.versionId);
        expect(snapshotRows(db)).toEqual({ containers: 1, versions: 1 });
        db.close();
    });

    it("G/H: deterministic operation identity is Project-scoped and Human-scoped", () => {
        const idA = deriveSnapshotVersionId("proj-1", "operator-1", "op-x");
        const idB = deriveSnapshotVersionId("proj-2", "operator-1", "op-x"); // different Project
        const idC = deriveSnapshotVersionId("proj-1", "operator-2", "op-x"); // different Human
        const idD = deriveSnapshotVersionId("proj-1", "operator-1", "op-y"); // different operation
        expect(idA).toMatch(/^[a-f0-9]{64}$/);
        expect(idB).not.toBe(idA);
        expect(idC).not.toBe(idA);
        expect(idD).not.toBe(idA);
        expect(deriveSnapshotVersionId("proj-1", "operator-1", "op-x")).toBe(idA); // deterministic
    });

    it("I/J: stored synthesis_json and Markdown contain no retry metadata", () => {
        const db = createDb();
        seedProject(db);
        const x = currentFingerprint(db);
        const draft = validDraft(x);
        const result = publishProjectContextSnapshot(db, {
            projectSlug: SLUG,
            draft,
            approvedBy: "operator-1",
            operationId: "op-purity",
            approvedAt: "2026-08-24T10:00:00.000Z",
        });

        const version = db
            .prepare("SELECT synthesis_json, rendered_markdown FROM project_context_snapshot_versions WHERE id = ?")
            .get(result.versionId) as { synthesis_json: string; rendered_markdown: string };
        const parsed = JSON.parse(version.synthesis_json);
        expect(Object.keys(parsed).sort()).toEqual(
            [
                "active", "blockers", "completed", "conflicts", "currentObjective", "currentState",
                "decisions", "previousWorkingMemoryRefs", "recordedNextAction", "recommendedNextAction",
                "sourceRegistry", "unknowns",
            ].sort(),
        );
        for (const forbidden of ["operationId", "draftHash", "idempotency", "retry"]) {
            expect(JSON.stringify(parsed)).not.toContain(forbidden);
            expect(version.rendered_markdown).not.toContain(forbidden);
        }
        db.close();
    });
});
