import { readFileSync } from "fs";
import path from "path";
import Database from "better-sqlite3";
import { afterEach, describe, expect, it } from "vitest";
import { ensureCoordinationSchema } from "@/lib/coordination/schema";
import {
    CoordinationLaneStateSchemaError,
    ensureCoordinationLaneStateBindingColumns,
    ensureCoordinationLaneStateSchema,
    LANE_LIFECYCLE_SEMANTICS_STATUS,
} from "@/lib/coordination/stateSchema";

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

function seedProject(db: Database.Database, id: string, slug: string): void {
    db.prepare("INSERT INTO projects (id, slug) VALUES (?, ?)").run(id, slug);
}

function insertLane(
    db: Database.Database,
    id: string,
    projectId: string,
    laneKey: string,
    name: string,
): void {
    db.prepare(`
        INSERT INTO coordination_lanes (id, project_id, lane_key, name)
        VALUES (?, ?, ?, ?)
    `).run(id, projectId, laneKey, name);
}

function schemaObjects(db: Database.Database): Array<{ type: string; name: string; sql: string }> {
    return db.prepare(`
        SELECT type, name, lower(replace(replace(sql, 'IF NOT EXISTS ', ''), char(10), ' ')) AS sql
        FROM sqlite_master
        WHERE name = 'coordination_lane_state_history'
           OR name LIKE 'trg_coordination_lane_state_history_%'
        ORDER BY type, name
    `).all() as Array<{ type: string; name: string; sql: string }>;
}

afterEach(() => {
    while (openDatabases.length > 0) openDatabases.pop()?.close();
});

describe("P1-G2A canonical Lane state history schema", () => {
    it("marks the approved Lane lifecycle vocabulary as UNKNOWN/NOT_PROVEN", () => {
        expect(LANE_LIFECYCLE_SEMANTICS_STATUS).toBe("UNKNOWN/NOT_PROVEN");
    });

    it("provisions the canonical durable history fields plus approved binding columns", () => {
        const db = createTestDb();
        ensureCoordinationLaneStateSchema(db, () => undefined);
        ensureCoordinationLaneStateBindingColumns(db, () => undefined);

        const columns = db.prepare("PRAGMA table_info(coordination_lane_state_history)").all() as Array<{ name: string }>;
        expect(columns.map((column) => column.name)).toEqual([
            "lane_id",
            "seq",
            "state",
            "recorded_at",
            "provenance",
            "source_ref_kind",
            "source_ref_id",
            "evaluated_state_lane_id",
            "evaluated_state_seq",
            "evaluated_baseline_kind",
            "evaluated_baseline_id",
            "evaluated_baseline_fingerprint",
        ]);
    });

    it("is idempotent and produces no second-run schema delta", () => {
        const db = createTestDb();
        ensureCoordinationLaneStateSchema(db, () => undefined);
        const first = schemaObjects(db);
        ensureCoordinationLaneStateSchema(db, () => undefined);
        expect(schemaObjects(db)).toEqual(first);
    });

    it("fails closed without altering an unknown existing history table", () => {
        const db = createTestDb();
        db.exec("CREATE TABLE coordination_lane_state_history (id TEXT PRIMARY KEY, lane_id TEXT)");
        const before = schemaObjects(db);

        expect(() => ensureCoordinationLaneStateSchema(db, () => undefined)).toThrowError(
            expect.objectContaining<CoordinationLaneStateSchemaError>({
                code: "COORDINATION_LANE_STATE_SCHEMA_INCOMPATIBLE",
            }),
        );
        expect(schemaObjects(db)).toEqual(before);
    });

    it("is append-only: UPDATE and DELETE are rejected at the database level", () => {
        const db = createTestDb();
        ensureCoordinationLaneStateSchema(db, () => undefined);
        seedProject(db, "project-1", "project-one");
        insertLane(db, "lane-1", "project-1", "delivery", "Delivery");
        db.prepare(`
            INSERT INTO coordination_lane_state_history (lane_id, seq, state, provenance)
            VALUES ('lane-1', 1, 'alpha', 'test')
        `).run();

        expect(() => db.prepare(
            "UPDATE coordination_lane_state_history SET state = ? WHERE lane_id = ?",
        ).run("beta", "lane-1")).toThrow(/append-only/);

        expect(() => db.prepare(
            "DELETE FROM coordination_lane_state_history WHERE lane_id = ?",
        ).run("lane-1")).toThrow(/append-only/);
    });

    it("requires an existing Lane and prevents Lane deletion while history exists", () => {
        const db = createTestDb();
        ensureCoordinationLaneStateSchema(db, () => undefined);
        seedProject(db, "project-1", "project-one");
        insertLane(db, "lane-1", "project-1", "delivery", "Delivery");

        expect(() => db.prepare(`
            INSERT INTO coordination_lane_state_history (lane_id, seq, state, provenance)
            VALUES ('missing', 1, 'alpha', 'test')
        `).run()).toThrow(/FOREIGN KEY/);

        db.prepare(`
            INSERT INTO coordination_lane_state_history (lane_id, seq, state, provenance)
            VALUES ('lane-1', 1, 'alpha', 'test')
        `).run();
        expect(() => db.prepare("DELETE FROM coordination_lanes WHERE id = ?").run("lane-1")).toThrow(/FOREIGN KEY/);
    });

    it("never materializes a current-state column on the Lane (no competing authority)", () => {
        const db = createTestDb();
        ensureCoordinationLaneStateSchema(db, () => undefined);
        const lanes = db.prepare("PRAGMA table_info(coordination_lanes)").all() as Array<{ name: string }>;
        expect(lanes.map((column) => column.name)).toEqual([
            "id",
            "project_id",
            "lane_key",
            "name",
            "created_at",
            "updated_at",
        ]);
    });

    it("additive binding-column ensure is idempotent on a fresh schema", () => {
        const db = createTestDb();
        ensureCoordinationLaneStateSchema(db, () => undefined);
        expect(ensureCoordinationLaneStateBindingColumns(db, () => undefined)).toHaveLength(0);
        const columns = db.prepare("PRAGMA table_info(coordination_lane_state_history)").all() as Array<{ name: string }>;
        expect(columns).toHaveLength(12);
    });

    it("T11 keeps an existing pre-G2B row valid when binding columns are added (no rewrite/backfill)", () => {
        const db = createTestDb();
        // createTestDb does not provision the history table; build the pre-G2B
        // (core-columns-only) shape directly.
        db.exec(`CREATE TABLE coordination_lane_state_history (
            lane_id TEXT NOT NULL, seq INTEGER NOT NULL CHECK(seq > 0),
            state TEXT NOT NULL CHECK(length(trim(state)) > 0),
            recorded_at TEXT NOT NULL DEFAULT (datetime('now')),
            provenance TEXT NOT NULL CHECK(length(trim(provenance)) > 0),
            PRIMARY KEY (lane_id, seq),
            FOREIGN KEY(lane_id) REFERENCES coordination_lanes(id) ON DELETE RESTRICT
        );
        CREATE TRIGGER trg_coordination_lane_state_history_append_only_update
        BEFORE UPDATE ON coordination_lane_state_history
        FOR EACH ROW BEGIN SELECT RAISE(ABORT, 'coordination Lane state history is append-only'); END;
        CREATE TRIGGER trg_coordination_lane_state_history_append_only_delete
        BEFORE DELETE ON coordination_lane_state_history
        FOR EACH ROW BEGIN SELECT RAISE(ABORT, 'coordination Lane state history is append-only'); END;`);
        seedProject(db, "project-1", "project-one");
        insertLane(db, "lane-1", "project-1", "delivery", "Delivery");
        db.prepare(`INSERT INTO coordination_lane_state_history (lane_id, seq, state, provenance) VALUES ('lane-1', 1, 'alpha', 'workos:human-1')`).run();

        ensureCoordinationLaneStateSchema(db, () => undefined);
        const added = ensureCoordinationLaneStateBindingColumns(db, () => undefined);
        expect(added).toHaveLength(7);

        const columns = db.prepare("PRAGMA table_info(coordination_lane_state_history)").all() as Array<{ name: string }>;
        expect(columns).toHaveLength(12);
        const row = db.prepare(
            "SELECT lane_id, seq, state, provenance, source_ref_kind FROM coordination_lane_state_history WHERE lane_id = 'lane-1'",
        ).get() as Record<string, unknown>;
        expect(row).toEqual({
            lane_id: "lane-1",
            seq: 1,
            state: "alpha",
            provenance: "workos:human-1",
            source_ref_kind: null,
        });
    });

    it("keeps schema.sql aligned with the source-backed ensure path", () => {
        const dbFromEnsure = createTestDb();
        ensureCoordinationLaneStateSchema(dbFromEnsure, () => undefined);

        const dbFromSchema = new Database(":memory:");
        openDatabases.push(dbFromSchema);
        dbFromSchema.pragma("foreign_keys = ON");
        dbFromSchema.exec(readFileSync(path.resolve(process.cwd(), "src/db/schema.sql"), "utf8"));

        expect(schemaObjects(dbFromSchema)).toEqual(schemaObjects(dbFromEnsure));
    });
});
