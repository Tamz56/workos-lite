import path from "path";
import Database from "better-sqlite3";
import { afterEach, describe, expect, it } from "vitest";
import {
    CHECKPOINT_CONTINUITY_SCHEMA_VERSION,
    createInitialLaneCheckpoint,
    createSuccessorLaneCheckpoint,
    type CoordinationCheckpointContinuityPayload,
} from "@/lib/coordination/checkpoint";
import { ensureCoordinationCheckpointSchema } from "@/lib/coordination/checkpointSchema";
import {
    lookupLaneCheckpoint,
    readLaneCheckpointHistory,
    resolveCurrentLaneCheckpoint,
    resumeLaneFromValidatedCurrentCheckpoint,
} from "@/lib/coordination/checkpointService";
import { ensureCoordinationSchema } from "@/lib/coordination/schema";

const LIVE_DB_PATH = path.resolve(process.cwd(), "data/workos.db");
const openDatabases: Database.Database[] = [];

function continuity(next = "continue"): CoordinationCheckpointContinuityPayload {
    return {
        blocker: null,
        cross_lane_pending: ["lane-b"],
        do_not_reopen: ["P2-U1"],
        next_exact_action: next,
    };
}

function createTestDb(withCheckpointSchema = true): Database.Database {
    const db = new Database(":memory:");
    openDatabases.push(db);
    expect(path.resolve(db.name)).not.toBe(LIVE_DB_PATH);
    db.pragma("foreign_keys = ON");
    db.exec("CREATE TABLE projects (id TEXT PRIMARY KEY, slug TEXT NOT NULL UNIQUE)");
    ensureCoordinationSchema(db, () => undefined);
    if (withCheckpointSchema) ensureCoordinationCheckpointSchema(db, () => undefined);
    db.exec(`
        INSERT INTO projects (id, slug) VALUES ('project-1', 'project-one');
        INSERT INTO coordination_lanes (id, project_id, lane_key, name)
        VALUES ('lane-a', 'project-1', 'a', 'A');
    `);
    return db;
}

function seedValidHistory(db: Database.Database): void {
    createInitialLaneCheckpoint(db, {
        id: "cp-1",
        laneId: "lane-a",
        continuity: continuity("first"),
        openItems: [{
            openItemId: "item-a",
            itemOrdinal: 1,
            summary: "first",
            continuityKind: "ADDED",
        }],
        provenance: "test",
    });
    createSuccessorLaneCheckpoint(db, {
        id: "cp-2",
        laneId: "lane-a",
        expectedPredecessorCheckpointId: "cp-1",
        continuity: continuity("second"),
        openItems: [{
            openItemId: "item-a",
            itemOrdinal: 1,
            summary: "retained",
            continuityKind: "RETAINED",
        }],
        openItemExits: [],
        provenance: "test",
    });
}

function createLooseCheckpointTables(db: Database.Database): void {
    db.exec(`
        CREATE TABLE coordination_lane_checkpoints (
          id TEXT,
          lane_id TEXT,
          seq INTEGER,
          supersedes_checkpoint_id TEXT,
          continuity_schema_version TEXT,
          continuity_payload_json TEXT,
          provenance TEXT,
          created_at TEXT
        );
        CREATE TABLE coordination_lane_checkpoint_open_items (
          checkpoint_id TEXT,
          open_item_id TEXT,
          item_ordinal INTEGER,
          summary TEXT,
          continuity_kind TEXT
        );
        CREATE TABLE coordination_lane_checkpoint_open_item_exits (
          checkpoint_id TEXT,
          open_item_id TEXT,
          exit_disposition TEXT,
          exit_note TEXT,
          replacement_open_item_id TEXT
        );
    `);
}

const payload = JSON.stringify(continuity());

afterEach(() => {
    while (openDatabases.length > 0) openDatabases.pop()?.close();
});

describe("P2-G6B-I1 U5 checkpoint service semantics", () => {
    it("keeps LOOKUP and HISTORY_ACCESS historical without CURRENT assertion", () => {
        const db = createTestDb();
        seedValidHistory(db);

        const lookup = lookupLaneCheckpoint(db, "lane-a", { checkpointId: "cp-1" });
        expect(lookup.status).toBe("FOUND");
        if (lookup.status === "FOUND") {
            expect(lookup.snapshot.checkpoint.seq).toBe(1);
            expect(lookup).not.toHaveProperty("current");
        }
        expect(lookupLaneCheckpoint(db, "lane-a", { seq: 99 })).toEqual({ status: "NOT_FOUND" });

        const history = readLaneCheckpointHistory(db, "lane-a");
        expect(history.status).toBe("HISTORY");
        if (history.status === "HISTORY") {
            expect(history.checkpoints.map((snapshot) => snapshot.checkpoint.id)).toEqual([
                "cp-1",
                "cp-2",
            ]);
            expect(history).not.toHaveProperty("current");
        }
    });

    it("CURRENT_RESOLUTION alone asserts CURRENT from complete U2 core lineage", () => {
        const db = createTestDb();
        seedValidHistory(db);
        expect(resolveCurrentLaneCheckpoint(db, "lane-a")).toEqual(
            expect.objectContaining({
                status: "CURRENT",
                checkpoint: expect.objectContaining({ id: "cp-2", seq: 2 }),
            }),
        );
    });

    it("distinguishes proven empty Lane from unavailable checkpoint evidence", () => {
        const empty = createTestDb();
        expect(resolveCurrentLaneCheckpoint(empty, "lane-a")).toEqual({
            status: "NO_CHECKPOINT_YET",
        });

        const unavailable = createTestDb(false);
        expect(resolveCurrentLaneCheckpoint(unavailable, "lane-a")).toEqual(
            expect.objectContaining({ status: "EVIDENCE_UNAVAILABLE" }),
        );
    });

    it("reports malformed U2 lineage as CURRENTNESS_UNRESOLVABLE with no seq/timestamp fallback", () => {
        const db = createTestDb(false);
        createLooseCheckpointTables(db);
        db.prepare(
            `INSERT INTO coordination_lane_checkpoints
                 (id, lane_id, seq, supersedes_checkpoint_id, continuity_schema_version,
                  continuity_payload_json, provenance, created_at)
             VALUES ('cp-1', 'lane-a', 1, NULL, ?, ?, 'test', '2099-01-01'),
                    ('cp-3', 'lane-a', 3, 'cp-1', ?, ?, 'test', '2000-01-01')`,
        ).run(
            CHECKPOINT_CONTINUITY_SCHEMA_VERSION,
            payload,
            CHECKPOINT_CONTINUITY_SCHEMA_VERSION,
            payload,
        );
        expect(resolveCurrentLaneCheckpoint(db, "lane-a")).toEqual(
            expect.objectContaining({ status: "CURRENTNESS_UNRESOLVABLE" }),
        );
    });

    it("does not let malformed U3 evidence become a competing checkpoint-currentness authority", () => {
        const db = createTestDb();
        createInitialLaneCheckpoint(db, {
            id: "cp-1",
            laneId: "lane-a",
            continuity: continuity(),
            openItems: [{
                openItemId: "item-a",
                itemOrdinal: 1,
                summary: "open",
                continuityKind: "ADDED",
            }],
            provenance: "test",
        });

        db.prepare(
            `INSERT INTO coordination_lane_checkpoints
                 (id, lane_id, seq, supersedes_checkpoint_id, continuity_schema_version,
                  continuity_payload_json, provenance, created_at)
             VALUES ('cp-2', 'lane-a', 2, 'cp-1', ?, ?, 'direct', '1999-01-01')`,
        ).run(CHECKPOINT_CONTINUITY_SCHEMA_VERSION, payload);

        const current = resolveCurrentLaneCheckpoint(db, "lane-a");
        expect(current).toEqual(expect.objectContaining({
            status: "CURRENT",
            checkpoint: expect.objectContaining({ id: "cp-2", seq: 2 }),
        }));

        expect(resumeLaneFromValidatedCurrentCheckpoint(db, "lane-a")).toEqual(
            expect.objectContaining({ status: "CHECKPOINT_EVIDENCE_INVALID" }),
        );
    });

    it("uses U2 ordering rather than timestamps", () => {
        const db = createTestDb();
        const tx = db.transaction(() => {
            db.prepare(
                `INSERT INTO coordination_lane_checkpoints
                     (id, lane_id, seq, supersedes_checkpoint_id, continuity_schema_version,
                      continuity_payload_json, provenance, created_at)
                 VALUES ('cp-1', 'lane-a', 1, NULL, ?, ?, 'test', '2099-01-01')`,
            ).run(CHECKPOINT_CONTINUITY_SCHEMA_VERSION, payload);
            db.prepare(
                `INSERT INTO coordination_lane_checkpoints
                     (id, lane_id, seq, supersedes_checkpoint_id, continuity_schema_version,
                      continuity_payload_json, provenance, created_at)
                 VALUES ('cp-2', 'lane-a', 2, 'cp-1', ?, ?, 'test', '2000-01-01')`,
            ).run(CHECKPOINT_CONTINUITY_SCHEMA_VERSION, payload);
        });
        tx.immediate();
        expect(resolveCurrentLaneCheckpoint(db, "lane-a")).toEqual(
            expect.objectContaining({
                status: "CURRENT",
                checkpoint: expect.objectContaining({ id: "cp-2" }),
            }),
        );
    });

    it("authoritative RESUME accepts validated current only and is side-effect free", () => {
        const db = createTestDb();
        seedValidHistory(db);
        const before = {
            checkpoints: db.prepare("SELECT COUNT(*) AS count FROM coordination_lane_checkpoints").get(),
            items: db.prepare("SELECT COUNT(*) AS count FROM coordination_lane_checkpoint_open_items").get(),
            lanes: db.prepare("SELECT COUNT(*) AS count FROM coordination_lanes").get(),
        };

        const resumed = resumeLaneFromValidatedCurrentCheckpoint(db, "lane-a");
        expect(resumed).toEqual(expect.objectContaining({
            status: "RESUMED",
            checkpoint: expect.objectContaining({ id: "cp-2" }),
            continuity: expect.objectContaining({
                blocker: null,
                next_exact_action: "second",
            }),
        }));

        const after = {
            checkpoints: db.prepare("SELECT COUNT(*) AS count FROM coordination_lane_checkpoints").get(),
            items: db.prepare("SELECT COUNT(*) AS count FROM coordination_lane_checkpoint_open_items").get(),
            lanes: db.prepare("SELECT COUNT(*) AS count FROM coordination_lanes").get(),
        };
        expect(after).toEqual(before);
    });

    it("does not let an unsupported historical payload version block resume when current required evidence is valid", () => {
        const db = createTestDb();
        db.prepare(
            `INSERT INTO coordination_lane_checkpoints
                 (id, lane_id, seq, supersedes_checkpoint_id, continuity_schema_version,
                  continuity_payload_json, provenance)
             VALUES ('cp-1', 'lane-a', 1, NULL, 'legacy.unknown', ?, 'direct')`,
        ).run(payload);
        db.prepare(
            `INSERT INTO coordination_lane_checkpoints
                 (id, lane_id, seq, supersedes_checkpoint_id, continuity_schema_version,
                  continuity_payload_json, provenance)
             VALUES ('cp-2', 'lane-a', 2, 'cp-1', ?, ?, 'direct')`,
        ).run(CHECKPOINT_CONTINUITY_SCHEMA_VERSION, payload);

        expect(resolveCurrentLaneCheckpoint(db, "lane-a")).toEqual(
            expect.objectContaining({ status: "CURRENT", checkpoint: expect.objectContaining({ id: "cp-2" }) }),
        );
        expect(resumeLaneFromValidatedCurrentCheckpoint(db, "lane-a")).toEqual(
            expect.objectContaining({ status: "RESUMED", checkpoint: expect.objectContaining({ id: "cp-2" }) }),
        );
    });

    it("fails RESUME on unknown continuity schema version without changing U2 currentness", () => {
        const db = createTestDb();
        db.prepare(
            `INSERT INTO coordination_lane_checkpoints
                 (id, lane_id, seq, supersedes_checkpoint_id, continuity_schema_version,
                  continuity_payload_json, provenance)
             VALUES ('cp-1', 'lane-a', 1, NULL, 'unknown.v9', ?, 'direct')`,
        ).run(payload);

        expect(resolveCurrentLaneCheckpoint(db, "lane-a")).toEqual(
            expect.objectContaining({ status: "CURRENT", checkpoint: expect.objectContaining({ id: "cp-1" }) }),
        );
        expect(resumeLaneFromValidatedCurrentCheckpoint(db, "lane-a")).toEqual(
            expect.objectContaining({ status: "CHECKPOINT_EVIDENCE_INVALID" }),
        );
    });

    it("does not offer a historical checkpoint override for authoritative RESUME", () => {
        expect(resumeLaneFromValidatedCurrentCheckpoint.length).toBe(2);
    });
});
