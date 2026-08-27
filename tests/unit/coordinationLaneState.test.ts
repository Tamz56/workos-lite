import path from "path";
import Database from "better-sqlite3";
import { afterEach, describe, expect, it } from "vitest";
import { ensureCoordinationSchema } from "@/lib/coordination/schema";
import { ensureCoordinationLaneStateSchema } from "@/lib/coordination/stateSchema";
import {
    appendLaneState,
    CoordinationLaneNotFoundError,
    resolveCurrentLaneState,
    resolveLaneStateBinding,
    resolveLaneStateHistory,
} from "@/lib/coordination/laneState";
import type { ProjectContextSourceKind } from "@/lib/project-curator/contracts";

const LIVE_DB_PATH = path.resolve(process.cwd(), "data/workos.db");
const openDatabases: Database.Database[] = [];

function createTestDb(): Database.Database {
    const db = new Database(":memory:");
    openDatabases.push(db);
    expect(path.resolve(db.name)).not.toBe(LIVE_DB_PATH);
    db.pragma("foreign_keys = ON");
    db.exec("CREATE TABLE projects (id TEXT PRIMARY KEY, slug TEXT NOT NULL UNIQUE)");
    ensureCoordinationSchema(db, () => undefined);
    ensureCoordinationLaneStateSchema(db, () => undefined);
    return db;
}

// NOTE: state values below ("alpha", "beta", ...) are arbitrary opaque values.
// The approved Lane lifecycle vocabulary is UNKNOWN/NOT_PROVEN and is not
// represented here.
function seedLane(
    db: Database.Database,
    id: string,
    laneKey: string = "delivery",
    name: string = "Delivery",
): void {
    db.prepare("INSERT OR IGNORE INTO projects (id, slug) VALUES ('project-1', 'project-one')").run();
    db.prepare(`
        INSERT INTO coordination_lanes (id, project_id, lane_key, name)
        VALUES (?, 'project-1', ?, ?)
    `).run(id, laneKey, name);
}

afterEach(() => {
    while (openDatabases.length > 0) openDatabases.pop()?.close();
});

describe("P1-G2A Lane state storage + deterministic currentness", () => {
    it("appends durable records with deterministic per-Lane monotonic seq", () => {
        const db = createTestDb();
        seedLane(db, "lane-1");

        const first = appendLaneState(db, { laneId: "lane-1", state: "alpha", provenance: "test" });
        const second = appendLaneState(db, { laneId: "lane-1", state: "beta", provenance: "test" });

        expect(first).toEqual(expect.objectContaining({ laneId: "lane-1", seq: 1, state: "alpha" }));
        expect(second).toEqual(expect.objectContaining({ laneId: "lane-1", seq: 2, state: "beta" }));
    });

    it("resolves current Lane state deterministically as the highest-seq record", () => {
        const db = createTestDb();
        seedLane(db, "lane-1");
        appendLaneState(db, { laneId: "lane-1", state: "alpha", provenance: "test" });
        appendLaneState(db, { laneId: "lane-1", state: "beta", provenance: "test" });
        appendLaneState(db, { laneId: "lane-1", state: "gamma", provenance: "test" });

        const current = resolveCurrentLaneState(db, "lane-1");
        expect(current).toEqual(
            expect.objectContaining({ laneId: "lane-1", seq: 3, state: "gamma" }),
        );
    });

    it("returns null for a Lane with no durable history", () => {
        const db = createTestDb();
        seedLane(db, "lane-1");
        expect(resolveCurrentLaneState(db, "lane-1")).toBeNull();
    });

    it("keeps Lane state histories isolated per Lane", () => {
        const db = createTestDb();
        seedLane(db, "lane-1", "delivery");
        seedLane(db, "lane-2", "core", "Core");

        appendLaneState(db, { laneId: "lane-1", state: "alpha", provenance: "test" });
        appendLaneState(db, { laneId: "lane-2", state: "alpha", provenance: "test" });
        appendLaneState(db, { laneId: "lane-1", state: "beta", provenance: "test" });

        expect(resolveCurrentLaneState(db, "lane-1")).toEqual(
            expect.objectContaining({ seq: 2, state: "beta" }),
        );
        expect(resolveCurrentLaneState(db, "lane-2")).toEqual(
            expect.objectContaining({ seq: 1, state: "alpha" }),
        );
    });

    it("surfaces provenance and recorded_at explicitly on the current record", () => {
        const db = createTestDb();
        seedLane(db, "lane-1");
        appendLaneState(db, { laneId: "lane-1", state: "alpha", provenance: "workos:human-1" });

        const current = resolveCurrentLaneState(db, "lane-1");
        expect(current?.provenance).toBe("workos:human-1");
        expect(current?.recordedAt).toBeTruthy();
    });

    it("never silently mutates the Lane row (no silent state promotion)", () => {
        const db = createTestDb();
        seedLane(db, "lane-1");
        const laneBefore = db.prepare("SELECT * FROM coordination_lanes WHERE id = 'lane-1'").get();

        appendLaneState(db, { laneId: "lane-1", state: "alpha", provenance: "test" });
        appendLaneState(db, { laneId: "lane-1", state: "beta", provenance: "test" });

        const laneAfter = db.prepare("SELECT * FROM coordination_lanes WHERE id = 'lane-1'").get();
        expect(laneAfter).toEqual(laneBefore);
    });

    it("rejects appending to a Lane that does not exist", () => {
        const db = createTestDb();
        expect(() =>
            appendLaneState(db, { laneId: "missing", state: "alpha", provenance: "test" }),
        ).toThrowError(
            expect.objectContaining<CoordinationLaneNotFoundError>({
                code: "COORDINATION_LANE_NOT_FOUND",
            }),
        );
    });

    it("preserves full durable history in ascending order", () => {
        const db = createTestDb();
        seedLane(db, "lane-1");
        appendLaneState(db, { laneId: "lane-1", state: "alpha", provenance: "test" });
        appendLaneState(db, { laneId: "lane-1", state: "beta", provenance: "test" });
        appendLaneState(db, { laneId: "lane-1", state: "gamma", provenance: "test" });

        const history = resolveLaneStateHistory(db, "lane-1");
        expect(history.map((record) => record.seq)).toEqual([1, 2, 3]);
        expect(history.map((record) => record.state)).toEqual(["alpha", "beta", "gamma"]);
    });

    // P1-G2A-R1-B — sequence authority proofs
    it("never lets a caller supply or promote seq through the primitive", () => {
        const db = createTestDb();
        seedLane(db, "lane-1");

        for (let i = 0; i < 5; i++) {
            const record = appendLaneState(db, {
                laneId: "lane-1",
                state: `opaque-${i}`,
                provenance: "test",
            });
            expect(record.seq).toBe(i + 1);
        }
        const history = resolveLaneStateHistory(db, "lane-1");
        expect(history.map((record) => record.seq)).toEqual([1, 2, 3, 4, 5]);

        // A caller cannot rewrite an existing record's seq to promote it.
        expect(() =>
            db.prepare(
                "UPDATE coordination_lane_state_history SET seq = 999 WHERE lane_id = ? AND seq = 1",
            ).run("lane-1"),
        ).toThrow(/append-only/);
    });

    it("makes duplicate (lane_id, seq) appends fail visibly", () => {
        const db = createTestDb();
        seedLane(db, "lane-1");
        appendLaneState(db, { laneId: "lane-1", state: "alpha", provenance: "test" });

        expect(() =>
            db.prepare(`
                INSERT INTO coordination_lane_state_history (lane_id, seq, state, provenance)
                VALUES ('lane-1', 1, 'beta', 'test')
            `).run(),
        ).toThrow(/UNIQUE|PRIMARY KEY/);

        expect(resolveLaneStateHistory(db, "lane-1")).toHaveLength(1);
    });
});

// ---------------------------------------------------------------------------
// P1-G2B — optional evaluated-state / baseline binding
// ---------------------------------------------------------------------------

function createOwnershipTestDb(): Database.Database {
    const db = new Database(":memory:");
    openDatabases.push(db);
    expect(path.resolve(db.name)).not.toBe(LIVE_DB_PATH);
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
          id TEXT PRIMARY KEY, project_id TEXT NOT NULL, block_type TEXT NOT NULL,
          title TEXT NOT NULL, block_date TEXT NOT NULL, summary TEXT NOT NULL,
          next_action TEXT, status TEXT NOT NULL DEFAULT 'active', source_type TEXT,
          created_at TEXT NOT NULL, updated_at TEXT NOT NULL
        );
        CREATE TABLE docs (
          id TEXT PRIMARY KEY, title TEXT NOT NULL, content_md TEXT NOT NULL DEFAULT '',
          project_id TEXT, workspace TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
        );
        CREATE TABLE project_decisions (
          id TEXT PRIMARY KEY, project_id TEXT NOT NULL, title TEXT, created_at TEXT
        );
        CREATE TABLE project_loops (
          id TEXT PRIMARY KEY, project_id TEXT NOT NULL, loop_name TEXT, loop_type TEXT,
          status TEXT, current_step TEXT, created_at TEXT, updated_at TEXT
        );
        CREATE TABLE project_contexts (
          id TEXT PRIMARY KEY, project_id TEXT NOT NULL UNIQUE, created_at TEXT, updated_at TEXT
        );
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
    ensureCoordinationSchema(db, () => undefined);
    ensureCoordinationLaneStateSchema(db, () => undefined);
    return db;
}

function seedOwnershipProject(db: Database.Database, id: string, slug: string): void {
    db.prepare(`
        INSERT INTO projects (id, slug, name, status, current_goal, next_action,
          risk_or_blocked_by, progress_stage, created_at, updated_at)
        VALUES (?, ?, ?, 'planned', NULL, NULL, NULL, NULL, '2026-07-01T00:00:00.000Z', '2026-07-01T00:00:00.000Z')
    `).run(id, slug, slug);
}

function seedOwnedDoc(db: Database.Database, projectId: string, docId: string): void {
    db.prepare(`
        INSERT INTO docs (id, title, content_md, project_id, workspace, created_at, updated_at)
        VALUES (?, 'Doc', '', ?, NULL, '2026-07-01T00:00:00.000Z', '2026-07-01T00:00:00.000Z')
    `).run(docId, projectId);
}

function seedLaneOnProject(db: Database.Database, laneId: string, projectId: string): void {
    db.prepare(`
        INSERT INTO coordination_lanes (id, project_id, lane_key, name)
        VALUES (?, ?, 'delivery', 'Delivery')
    `).run(laneId, projectId);
}

describe("P1-G2B optional evaluated-state / baseline binding", () => {
    it("T1 keeps an existing caller without binding valid", () => {
        const db = createTestDb();
        seedLane(db, "lane-1");
        const record = appendLaneState(db, { laneId: "lane-1", state: "alpha", provenance: "test" });
        expect(record).toEqual(expect.objectContaining({ laneId: "lane-1", seq: 1, state: "alpha" }));
        expect(resolveLaneStateBinding(db, "lane-1", 1)).toBeNull();
    });

    it("T2 keeps provenance independent of binding", () => {
        const db = createTestDb();
        seedLane(db, "lane-1");
        appendLaneState(db, {
            laneId: "lane-1",
            state: "alpha",
            provenance: "workos:human-1",
            binding: { evaluatedBaseline: { baselineKind: "b", baselineId: "1" } },
        });
        expect(resolveCurrentLaneState(db, "lane-1")?.provenance).toBe("workos:human-1");
        expect(resolveLaneStateBinding(db, "lane-1", 1)).toEqual({
            evaluatedBaseline: { baselineKind: "b", baselineId: "1" },
        });
    });

    it("T4 round-trips evaluatedStateRef laneId+seq exactly", () => {
        const db = createTestDb();
        seedLane(db, "lane-1");
        appendLaneState(db, { laneId: "lane-1", state: "alpha", provenance: "test" });
        appendLaneState(db, {
            laneId: "lane-1",
            state: "beta",
            provenance: "test",
            binding: { evaluatedStateRef: { laneId: "lane-1", seq: 1 } },
        });
        expect(resolveLaneStateBinding(db, "lane-1", 2)).toEqual({
            evaluatedStateRef: { laneId: "lane-1", seq: 1 },
        });
    });

    it("T5 fails visibly when evaluatedStateRef references a nonexistent record", () => {
        const db = createTestDb();
        seedLane(db, "lane-1");
        expect(() =>
            appendLaneState(db, {
                laneId: "lane-1",
                state: "beta",
                provenance: "test",
                binding: { evaluatedStateRef: { laneId: "lane-1", seq: 99 } },
            }),
        ).toThrow(/does not exist/);
    });

    it("rejects an evaluatedStateRef to an existing state in another Lane", () => {
        const db = createTestDb();
        seedLane(db, "lane-1", "delivery", "Delivery");
        seedLane(db, "lane-2", "core", "Core");
        const lane2State = appendLaneState(db, {
            laneId: "lane-2",
            state: "alpha",
            provenance: "test",
        });

        expect(lane2State).toEqual(expect.objectContaining({ laneId: "lane-2", seq: 1 }));
        expect(resolveCurrentLaneState(db, "lane-2")).toEqual(
            expect.objectContaining({ laneId: "lane-2", seq: lane2State.seq }),
        );
        expect(() =>
            appendLaneState(db, {
                laneId: "lane-1",
                state: "beta",
                provenance: "test",
                binding: {
                    evaluatedStateRef: { laneId: "lane-2", seq: lane2State.seq },
                },
            }),
        ).toThrow(/evaluatedStateRef\.laneId lane-2 does not match lane lane-1/);
    });

    it("T6 observes a newer state without classifying it as stale", () => {
        const db = createTestDb();
        seedLane(db, "lane-1");
        appendLaneState(db, { laneId: "lane-1", state: "alpha", provenance: "test" });
        appendLaneState(db, { laneId: "lane-1", state: "beta", provenance: "test" });
        const current = resolveCurrentLaneState(db, "lane-1");
        expect(current).toEqual(expect.objectContaining({ laneId: "lane-1", seq: 2, state: "beta" }));
    });

    it("T7 does not fabricate currentness when binding is absent", () => {
        const db = createTestDb();
        seedLane(db, "lane-1");
        appendLaneState(db, { laneId: "lane-1", state: "alpha", provenance: "test" });
        expect(resolveCurrentLaneState(db, "lane-1")?.state).toBe("alpha");
        expect(resolveLaneStateBinding(db, "lane-1", 1)).toBeNull();
    });

    it("T9/T10 keeps baseline fingerprint opaque / reference-only (no SHA-256 enforcement)", () => {
        const db = createTestDb();
        seedLane(db, "lane-1");
        appendLaneState(db, {
            laneId: "lane-1",
            state: "alpha",
            provenance: "test",
            binding: {
                evaluatedBaseline: {
                    baselineKind: "arbitrary-kind",
                    baselineId: "bl-1",
                    baselineFingerprint: "not-a-hash",
                },
            },
        });
        expect(resolveLaneStateBinding(db, "lane-1", 1)).toEqual({
            evaluatedBaseline: {
                baselineKind: "arbitrary-kind",
                baselineId: "bl-1",
                baselineFingerprint: "not-a-hash",
            },
        });
    });

    it("T15 accepts a source owned by the Lane's Project and round-trips it (T3)", () => {
        const db = createOwnershipTestDb();
        seedOwnershipProject(db, "proj-1", "project-one");
        seedOwnedDoc(db, "proj-1", "doc-1");
        seedLaneOnProject(db, "lane-1", "proj-1");
        expect(() =>
            appendLaneState(db, {
                laneId: "lane-1",
                state: "alpha",
                provenance: "test",
                binding: { sourceRef: { sourceKind: "doc", sourceId: "doc-1" } },
            }),
        ).not.toThrow();
        expect(resolveLaneStateBinding(db, "lane-1", 1)).toEqual({
            sourceRef: { sourceKind: "doc", sourceId: "doc-1" },
        });
    });

    it("T16 fails visibly when the source belongs to another Project", () => {
        const db = createOwnershipTestDb();
        seedOwnershipProject(db, "proj-1", "project-one");
        seedOwnershipProject(db, "proj-2", "project-two");
        seedOwnedDoc(db, "proj-2", "doc-x");
        seedLaneOnProject(db, "lane-1", "proj-1");
        expect(() =>
            appendLaneState(db, {
                laneId: "lane-1",
                state: "alpha",
                provenance: "test",
                binding: { sourceRef: { sourceKind: "doc", sourceId: "doc-x" } },
            }),
        ).toThrow(/not owned by project proj-1/);
    });

    it("T17 fails visibly for a known kind with a nonexistent sourceId", () => {
        const db = createOwnershipTestDb();
        seedOwnershipProject(db, "proj-1", "project-one");
        seedLaneOnProject(db, "lane-1", "proj-1");
        expect(() =>
            appendLaneState(db, {
                laneId: "lane-1",
                state: "alpha",
                provenance: "test",
                binding: { sourceRef: { sourceKind: "doc", sourceId: "doc-missing" } },
            }),
        ).toThrow(/not owned by project proj-1/);
    });

    it("T8 fails visibly for an unknown sourceKind", () => {
        const db = createTestDb();
        seedLane(db, "lane-1");
        expect(() =>
            appendLaneState(db, {
                laneId: "lane-1",
                state: "alpha",
                provenance: "test",
                binding: {
                    sourceRef: { sourceKind: "bogus" as unknown as ProjectContextSourceKind, sourceId: "x" },
                },
            }),
        ).toThrow(/Unsupported source kind/);
    });

    it("T18 accepts a valid enumerated project_context_snapshot even though derived", () => {
        const db = createOwnershipTestDb();
        seedOwnershipProject(db, "proj-1", "project-one");
        db.prepare(
            `INSERT INTO project_context_snapshots (id, project_id, current_version_id, created_at) VALUES ('snap-1', 'proj-1', 'ver-1', '2026-07-01T00:00:00.000Z')`,
        ).run();
        db.prepare(
            `INSERT INTO project_context_snapshot_versions (
              id, snapshot_id, schema_version, project_slug, generated_from_fingerprint,
              published_corpus_fingerprint, coverage_json, synthesis_json, rendered_markdown,
              generated_at, approved_at, approved_by, publication_state
            ) VALUES ('ver-1', 'snap-1', 'project-context.v1', 'project-one', ?, NULL, '{}', '{}', 'md', '2026-07-01T00:00:00.000Z', '2026-07-02T00:00:00.000Z', 'human-1', 'PUBLISHED')`,
        ).run("a".repeat(64));
        seedLaneOnProject(db, "lane-1", "proj-1");
        expect(() =>
            appendLaneState(db, {
                laneId: "lane-1",
                state: "alpha",
                provenance: "test",
                binding: { sourceRef: { sourceKind: "project_context_snapshot", sourceId: "ver-1" } },
            }),
        ).not.toThrow();
    });

    it("T20 fails visibly on a partial sourceRef persisted row", () => {
        const db = createTestDb();
        seedLane(db, "lane-1");
        db.prepare(
            `INSERT INTO coordination_lane_state_history (lane_id, seq, state, provenance, source_ref_kind) VALUES ('lane-1', 1, 'alpha', 'test', 'doc')`,
        ).run();
        expect(() => resolveLaneStateBinding(db, "lane-1", 1)).toThrow(/partial sourceRef/);
    });

    it("T21 fails visibly on a partial evaluatedStateRef persisted row", () => {
        const db = createTestDb();
        seedLane(db, "lane-1");
        db.prepare(
            `INSERT INTO coordination_lane_state_history (lane_id, seq, state, provenance, evaluated_state_lane_id) VALUES ('lane-1', 1, 'alpha', 'test', 'lane-1')`,
        ).run();
        expect(() => resolveLaneStateBinding(db, "lane-1", 1)).toThrow(/evaluatedStateRef/);
    });

    it("T22 fails visibly on an invalid persisted evaluated_state_seq", () => {
        const db = createTestDb();
        seedLane(db, "lane-1");
        db.prepare(
            `INSERT INTO coordination_lane_state_history (lane_id, seq, state, provenance, evaluated_state_lane_id, evaluated_state_seq) VALUES ('lane-1', 1, 'alpha', 'test', 'lane-1', 0)`,
        ).run();
        expect(() => resolveLaneStateBinding(db, "lane-1", 1)).toThrow(/evaluatedStateRef/);
    });

    it("T23 fails visibly on partial/orphan evaluatedBaseline persisted rows", () => {
        const db = createTestDb();
        seedLane(db, "lane-1");
        db.prepare(
            `INSERT INTO coordination_lane_state_history (lane_id, seq, state, provenance, evaluated_baseline_kind) VALUES ('lane-1', 1, 'alpha', 'test', 'kind')`,
        ).run();
        expect(() => resolveLaneStateBinding(db, "lane-1", 1)).toThrow(/evaluatedBaseline/);
        db.prepare(
            `INSERT INTO coordination_lane_state_history (lane_id, seq, state, provenance, evaluated_baseline_fingerprint) VALUES ('lane-1', 2, 'beta', 'test', 'fp')`,
        ).run();
        expect(() => resolveLaneStateBinding(db, "lane-1", 2)).toThrow(/evaluatedBaseline/);
    });
});
