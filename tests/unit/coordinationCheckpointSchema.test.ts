import { readFileSync } from "fs";
import path from "path";
import Database from "better-sqlite3";
import { afterEach, describe, expect, it } from "vitest";
import { ensureCoordinationSchema } from "@/lib/coordination/schema";
import {
    CoordinationCheckpointSchemaError,
    ensureCoordinationCheckpointSchema,
} from "@/lib/coordination/checkpointSchema";

const LIVE_DB_PATH = path.resolve(process.cwd(), "data/workos.db");
const openDatabases: Database.Database[] = [];

function createTestDb(): Database.Database {
    const db = new Database(":memory:");
    openDatabases.push(db);
    expect(path.resolve(db.name)).not.toBe(LIVE_DB_PATH);
    db.pragma("foreign_keys = ON");
    db.exec("CREATE TABLE projects (id TEXT PRIMARY KEY, slug TEXT NOT NULL UNIQUE)");
    ensureCoordinationSchema(db, () => undefined);
    return db;
}

function seedLane(db: Database.Database, laneId = "lane-a", laneKey = "a"): void {
    db.prepare("INSERT OR IGNORE INTO projects (id, slug) VALUES ('project-1', 'project-one')").run();
    db.prepare(
        `INSERT INTO coordination_lanes (id, project_id, lane_key, name)
         VALUES (?, 'project-1', ?, ?)`,
    ).run(laneId, laneKey, laneKey.toUpperCase());
}

function checkpointObjects(db: Database.Database): Array<{ type: string; name: string; sql: string }> {
    return db
        .prepare(
            `SELECT type, name,
                    lower(replace(replace(sql, 'IF NOT EXISTS ', ''), char(10), ' ')) AS sql
             FROM sqlite_master
             WHERE name LIKE 'coordination_lane_checkpoint%'
                OR name LIKE 'idx_coordination_lane_checkpoint%'
                OR name LIKE 'trg_coordination_lane_checkpoint%'
             ORDER BY type, name`,
        )
        .all() as Array<{ type: string; name: string; sql: string }>;
}

const payload = JSON.stringify({
    blocker: null,
    cross_lane_pending: [],
    do_not_reopen: [],
    next_exact_action: "continue",
});

function insertRoot(db: Database.Database, id: string, laneId: string): void {
    db.prepare(
        `INSERT INTO coordination_lane_checkpoints
             (id, lane_id, seq, supersedes_checkpoint_id,
              continuity_schema_version, continuity_payload_json, provenance)
         VALUES (?, ?, 1, NULL, 'coordination-checkpoint-continuity.v1', ?, 'test')`,
    ).run(id, laneId, payload);
}

afterEach(() => {
    while (openDatabases.length > 0) openDatabases.pop()?.close();
});

describe("P2-G6B-I1 Coordination checkpoint schema", () => {
    it("provisions exactly one canonical checkpoint table plus two checkpoint-owned evidence tables", () => {
        const db = createTestDb();
        ensureCoordinationCheckpointSchema(db, () => undefined);

        const tables = db
            .prepare(
                `SELECT name FROM sqlite_master
                 WHERE type='table' AND name LIKE 'coordination_lane_checkpoint%'
                 ORDER BY name`,
            )
            .all() as Array<{ name: string }>;
        expect(tables.map((row) => row.name)).toEqual([
            "coordination_lane_checkpoint_open_item_exits",
            "coordination_lane_checkpoint_open_items",
            "coordination_lane_checkpoints",
        ]);

        const coreColumns = db
            .prepare("PRAGMA table_info(coordination_lane_checkpoints)")
            .all() as Array<{ name: string }>;
        expect(coreColumns.map((column) => column.name)).toEqual([
            "id",
            "lane_id",
            "seq",
            "supersedes_checkpoint_id",
            "continuity_schema_version",
            "continuity_payload_json",
            "provenance",
            "created_at",
        ]);
        expect(coreColumns.map((column) => column.name)).not.toEqual(
            expect.arrayContaining(["is_current", "session_id", "handoff_id", "compaction_seq"]),
        );
    });

    it("is idempotent and matches the source-backed schema.sql objects", () => {
        const dbFromEnsure = createTestDb();
        ensureCoordinationCheckpointSchema(dbFromEnsure, () => undefined);
        const once = checkpointObjects(dbFromEnsure);
        ensureCoordinationCheckpointSchema(dbFromEnsure, () => undefined);
        expect(checkpointObjects(dbFromEnsure)).toEqual(once);

        const dbFromSchema = new Database(":memory:");
        openDatabases.push(dbFromSchema);
        dbFromSchema.pragma("foreign_keys = ON");
        dbFromSchema.exec(readFileSync(path.resolve(process.cwd(), "src/db/schema.sql"), "utf8"));
        expect(checkpointObjects(dbFromSchema)).toEqual(once);
    });

    it("fails closed on an incompatible pre-existing checkpoint table", () => {
        const db = createTestDb();
        db.exec("CREATE TABLE coordination_lane_checkpoints (id TEXT PRIMARY KEY)");
        expect(() => ensureCoordinationCheckpointSchema(db, () => undefined)).toThrowError(
            expect.objectContaining<CoordinationCheckpointSchemaError>({
                code: "COORDINATION_CHECKPOINT_SCHEMA_INCOMPATIBLE",
            }),
        );
        expect(
            db.prepare(
                `SELECT COUNT(*) AS count FROM sqlite_master
                 WHERE type='table' AND name='coordination_lane_checkpoint_open_items'`,
            ).get(),
        ).toEqual({ count: 0 });
    });

    it("enforces root/successor sequence, same-Lane predecessor, and one successor per predecessor", () => {
        const db = createTestDb();
        ensureCoordinationCheckpointSchema(db, () => undefined);
        seedLane(db, "lane-a", "a");
        seedLane(db, "lane-b", "b");
        insertRoot(db, "cp-a1", "lane-a");
        insertRoot(db, "cp-b1", "lane-b");

        expect(() => db.prepare(
            `INSERT INTO coordination_lane_checkpoints
                 (id, lane_id, seq, supersedes_checkpoint_id, continuity_schema_version,
                  continuity_payload_json, provenance)
             VALUES ('bad-gap', 'lane-a', 3, 'cp-a1',
                     'coordination-checkpoint-continuity.v1', ?, 'test')`,
        ).run(payload)).toThrow(/immediate prior/);

        expect(() => db.prepare(
            `INSERT INTO coordination_lane_checkpoints
                 (id, lane_id, seq, supersedes_checkpoint_id, continuity_schema_version,
                  continuity_payload_json, provenance)
             VALUES ('bad-cross', 'lane-a', 2, 'cp-b1',
                     'coordination-checkpoint-continuity.v1', ?, 'test')`,
        ).run(payload)).toThrow();

        db.prepare(
            `INSERT INTO coordination_lane_checkpoints
                 (id, lane_id, seq, supersedes_checkpoint_id, continuity_schema_version,
                  continuity_payload_json, provenance)
             VALUES ('cp-a2', 'lane-a', 2, 'cp-a1',
                     'coordination-checkpoint-continuity.v1', ?, 'test')`,
        ).run(payload);

        expect(() => db.prepare(
            `INSERT INTO coordination_lane_checkpoints
                 (id, lane_id, seq, supersedes_checkpoint_id, continuity_schema_version,
                  continuity_payload_json, provenance)
             VALUES ('fork', 'lane-a', 3, 'cp-a1',
                     'coordination-checkpoint-continuity.v1', ?, 'test')`,
        ).run(payload)).toThrow();
    });

    it("closes and makes checkpoint core and child evidence immutable", () => {
        const db = createTestDb();
        ensureCoordinationCheckpointSchema(db, () => undefined);
        seedLane(db);

        const tx = db.transaction(() => {
            db.prepare(
                `INSERT INTO coordination_lane_checkpoint_open_items
                     (checkpoint_id, open_item_id, item_ordinal, summary, continuity_kind)
                 VALUES ('cp-1', 'item-1', 1, 'open', 'ADDED')`,
            ).run();
            insertRoot(db, "cp-1", "lane-a");
        });
        tx.immediate();

        expect(() => db.prepare(
            `INSERT INTO coordination_lane_checkpoint_open_items
                 (checkpoint_id, open_item_id, item_ordinal, summary, continuity_kind)
             VALUES ('cp-1', 'late', 2, 'late', 'ADDED')`,
        ).run()).toThrow(/already closed/);
        expect(() => db.prepare(
            "UPDATE coordination_lane_checkpoint_open_items SET summary='changed' WHERE checkpoint_id='cp-1'",
        ).run()).toThrow(/immutable/);
        expect(() => db.prepare(
            "DELETE FROM coordination_lane_checkpoint_open_items WHERE checkpoint_id='cp-1'",
        ).run()).toThrow(/immutable/);
        expect(() => db.prepare(
            "UPDATE coordination_lane_checkpoints SET provenance='changed' WHERE id='cp-1'",
        ).run()).toThrow(/immutable/);
        expect(() => db.prepare(
            "DELETE FROM coordination_lane_checkpoints WHERE id='cp-1'",
        ).run()).toThrow(/logically durable/);
    });

    it("requires REPLACED evidence to target an ADDED current item in the same successor", () => {
        const db = createTestDb();
        ensureCoordinationCheckpointSchema(db, () => undefined);
        seedLane(db);
        insertRoot(db, "cp-1", "lane-a");

        const invalid = db.transaction(() => {
            db.prepare(
                `INSERT INTO coordination_lane_checkpoint_open_items
                     (checkpoint_id, open_item_id, item_ordinal, summary, continuity_kind)
                 VALUES ('cp-2', 'retained', 1, 'retained', 'RETAINED')`,
            ).run();
            db.prepare(
                `INSERT INTO coordination_lane_checkpoint_open_item_exits
                     (checkpoint_id, open_item_id, exit_disposition, exit_note, replacement_open_item_id)
                 VALUES ('cp-2', 'old', 'REPLACED', 'replaced', 'retained')`,
            ).run();
        });
        expect(() => invalid.immediate()).toThrow(/ADDED current item/);

        const valid = db.transaction(() => {
            db.prepare(
                `INSERT INTO coordination_lane_checkpoint_open_items
                     (checkpoint_id, open_item_id, item_ordinal, summary, continuity_kind)
                 VALUES ('cp-2', 'replacement', 1, 'replacement', 'ADDED')`,
            ).run();
            db.prepare(
                `INSERT INTO coordination_lane_checkpoint_open_item_exits
                     (checkpoint_id, open_item_id, exit_disposition, exit_note, replacement_open_item_id)
                 VALUES ('cp-2', 'old', 'REPLACED', 'replaced', 'replacement')`,
            ).run();
            db.prepare(
                `INSERT INTO coordination_lane_checkpoints
                     (id, lane_id, seq, supersedes_checkpoint_id, continuity_schema_version,
                      continuity_payload_json, provenance)
                 VALUES ('cp-2', 'lane-a', 2, 'cp-1',
                         'coordination-checkpoint-continuity.v1', ?, 'test')`,
            ).run(payload);
        });
        valid.immediate();
        expect(db.prepare(
            "SELECT replacement_open_item_id AS replacement FROM coordination_lane_checkpoint_open_item_exits WHERE checkpoint_id='cp-2'",
        ).get()).toEqual({ replacement: "replacement" });
    });
});
