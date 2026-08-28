import { readFileSync } from "fs";
import path from "path";
import Database from "better-sqlite3";
import { afterEach, describe, expect, it } from "vitest";
import { ensureCoordinationSchema } from "@/lib/coordination/schema";
import {
    COORDINATION_CROSS_LANE_SOURCE_ITEMS_TABLE_SQL,
    CoordinationCrossLaneSchemaError,
    ensureCoordinationCrossLaneSchema,
} from "@/lib/coordination/crossLaneSchema";

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

function seedProjectsAndLanes(db: Database.Database): void {
    db.exec(`
        INSERT INTO projects (id, slug) VALUES
            ('project-1', 'project-one'),
            ('project-2', 'project-two');
        INSERT INTO coordination_lanes (id, project_id, lane_key, name)
        VALUES
            ('lane-a', 'project-1', 'a', 'A'),
            ('lane-b', 'project-1', 'b', 'B'),
            ('lane-c', 'project-1', 'c', 'C'),
            ('lane-x', 'project-2', 'x', 'X');
    `);
}

function seedSourceItem(db: Database.Database, id: string, sourceLaneId: string): void {
    db.exec(`
        INSERT INTO coordination_cross_lane_source_items (id, source_lane_id, summary)
        VALUES ('${id}', '${sourceLaneId}', 'impact summary');
    `);
}

function crossLaneSchemaObjects(
    db: Database.Database,
): Array<{ type: string; name: string; sql: string }> {
    return db
        .prepare(
            `SELECT type, name,
                    lower(replace(replace(sql, 'IF NOT EXISTS ', ''), char(10), ' ')) AS sql
             FROM sqlite_master
             WHERE name LIKE 'coordination_cross_lane_%'
                OR name LIKE 'idx_coordination_cross_lane_%'
                OR name LIKE 'trg_coordination_cross_lane_%'
             ORDER BY type, name`,
        )
        .all() as Array<{ type: string; name: string; sql: string }>;
}

afterEach(() => {
    while (openDatabases.length > 0) openDatabases.pop()?.close();
});

describe("P2-G5B Coordination Cross-Lane schema", () => {
    it("F1 provisions only the frozen three-table surface and index", () => {
        const db = createTestDb();
        ensureCoordinationCrossLaneSchema(db, () => undefined);

        const items = db
            .prepare("PRAGMA table_info(coordination_cross_lane_source_items)")
            .all() as Array<{ name: string }>;
        const itemHistory = db
            .prepare("PRAGMA table_info(coordination_cross_lane_source_item_history)")
            .all() as Array<{ name: string }>;
        const relationHistory = db
            .prepare("PRAGMA table_info(coordination_cross_lane_target_relation_history)")
            .all() as Array<{ name: string }>;

        expect(items.map((column) => column.name)).toEqual([
            "id",
            "source_lane_id",
            "summary",
            "created_at",
        ]);
        expect(itemHistory.map((column) => column.name)).toEqual([
            "source_item_id",
            "seq",
            "applicable",
            "recorded_at",
            "source_provenance",
        ]);
        expect(relationHistory.map((column) => column.name)).toEqual([
            "source_item_id",
            "target_lane_id",
            "seq",
            "impact_classification",
            "applicable",
            "recorded_at",
            "relation_provenance",
        ]);

        const index = db
            .prepare(
                "SELECT name FROM sqlite_master WHERE type = 'index' AND name = 'idx_coordination_cross_lane_source_items_source_lane'",
            )
            .get();
        expect(index).toBeTruthy();
    });

    it("F1 fails closed without altering a malformed source items table", () => {
        const db = createTestDb();
        db.exec("CREATE TABLE coordination_cross_lane_source_items (id TEXT PRIMARY KEY)");
        const before = crossLaneSchemaObjects(db);
        expect(() => ensureCoordinationCrossLaneSchema(db, () => undefined)).toThrowError(
            expect.objectContaining<CoordinationCrossLaneSchemaError>({
                code: "COORDINATION_CROSS_LANE_SCHEMA_INCOMPATIBLE",
            }),
        );
        expect(crossLaneSchemaObjects(db)).toEqual(before);
    });

    it("F1 fails closed when only one table from the schema exists", () => {
        const db = createTestDb();
        db.exec(COORDINATION_CROSS_LANE_SOURCE_ITEMS_TABLE_SQL);
        const before = crossLaneSchemaObjects(db);
        expect(() => ensureCoordinationCrossLaneSchema(db, () => undefined)).toThrowError(
            expect.objectContaining<CoordinationCrossLaneSchemaError>({
                code: "COORDINATION_CROSS_LANE_SCHEMA_INCOMPATIBLE",
            }),
        );
        expect(crossLaneSchemaObjects(db)).toEqual(before);
    });

    it("F2 is idempotent and produces no second-run schema delta", () => {
        const db = createTestDb();
        ensureCoordinationCrossLaneSchema(db, () => undefined);
        const first = crossLaneSchemaObjects(db);
        ensureCoordinationCrossLaneSchema(db, () => undefined);
        expect(crossLaneSchemaObjects(db)).toEqual(first);
    });

    it("F3 keeps schema.sql aligned with the source-backed ensure path", () => {
        const dbFromEnsure = createTestDb();
        ensureCoordinationCrossLaneSchema(dbFromEnsure, () => undefined);

        const dbFromSchema = new Database(":memory:");
        openDatabases.push(dbFromSchema);
        dbFromSchema.pragma("foreign_keys = ON");
        dbFromSchema.exec(readFileSync(path.resolve(process.cwd(), "src/db/schema.sql"), "utf8"));
        expect(crossLaneSchemaObjects(dbFromSchema)).toEqual(
            crossLaneSchemaObjects(dbFromEnsure),
        );
    });

    it("F4 keeps source item identity immutable", () => {
        const db = createTestDb();
        ensureCoordinationCrossLaneSchema(db, () => undefined);
        seedProjectsAndLanes(db);
        seedSourceItem(db, "item-1", "lane-a");

        expect(() => db.exec("UPDATE coordination_cross_lane_source_items SET id = 'item-2' WHERE id = 'item-1'"))
            .toThrow(/identity is immutable/);
        expect(() => db.exec("UPDATE coordination_cross_lane_source_items SET source_lane_id = 'lane-b' WHERE id = 'item-1'"))
            .toThrow(/identity is immutable/);
        expect(() => db.exec("UPDATE coordination_cross_lane_source_items SET summary = 'changed' WHERE id = 'item-1'"))
            .toThrow(/identity is immutable/);
    });

    it("F5 source item history is append-only", () => {
        const db = createTestDb();
        ensureCoordinationCrossLaneSchema(db, () => undefined);
        seedProjectsAndLanes(db);
        seedSourceItem(db, "item-1", "lane-a");
        db.exec(`
            INSERT INTO coordination_cross_lane_source_item_history
                (source_item_id, seq, applicable, source_provenance)
            VALUES ('item-1', 1, 1, 'test');
        `);

        expect(() => db.exec(
            "UPDATE coordination_cross_lane_source_item_history SET applicable = 0 WHERE source_item_id = 'item-1'",
        )).toThrow(/append-only/);
        expect(() => db.exec(
            "DELETE FROM coordination_cross_lane_source_item_history WHERE source_item_id = 'item-1'",
        )).toThrow(/append-only/);
    });

    it("F6 target relation history is append-only", () => {
        const db = createTestDb();
        ensureCoordinationCrossLaneSchema(db, () => undefined);
        seedProjectsAndLanes(db);
        seedSourceItem(db, "item-1", "lane-a");
        db.exec(`
            INSERT INTO coordination_cross_lane_target_relation_history
                (source_item_id, target_lane_id, seq, impact_classification, applicable, relation_provenance)
            VALUES ('item-1', 'lane-b', 1, 'ACTION_REQUIRED', 1, 'test');
        `);

        expect(() => db.exec(
            "UPDATE coordination_cross_lane_target_relation_history SET applicable = 0 WHERE source_item_id = 'item-1'",
        )).toThrow(/append-only/);
        expect(() => db.exec(
            "DELETE FROM coordination_cross_lane_target_relation_history WHERE source_item_id = 'item-1'",
        )).toThrow(/append-only/);
    });

    it("F7 impact classification is bounded to the frozen vocabulary", () => {
        const db = createTestDb();
        ensureCoordinationCrossLaneSchema(db, () => undefined);
        seedProjectsAndLanes(db);
        seedSourceItem(db, "item-1", "lane-a");

        expect(() => db.exec(`
            INSERT INTO coordination_cross_lane_target_relation_history
                (source_item_id, target_lane_id, seq, impact_classification, applicable, relation_provenance)
            VALUES ('item-1', 'lane-b', 1, 'MAYBE', 1, 'test')
        `)).toThrow(/CHECK/);
    });

    it("F8 applicable is bounded to a boolean", () => {
        const db = createTestDb();
        ensureCoordinationCrossLaneSchema(db, () => undefined);
        seedProjectsAndLanes(db);
        seedSourceItem(db, "item-1", "lane-a");
        db.exec(`
            INSERT INTO coordination_cross_lane_source_item_history
                (source_item_id, seq, applicable, source_provenance)
            VALUES ('item-1', 1, 1, 'test');
        `);

        expect(() => db.exec(`
            INSERT INTO coordination_cross_lane_source_item_history
                (source_item_id, seq, applicable, source_provenance)
            VALUES ('item-1', 2, 5, 'test')
        `)).toThrow(/CHECK/);
    });

    it("F9 same-project: a target Lane in a different Project is rejected", () => {
        const db = createTestDb();
        ensureCoordinationCrossLaneSchema(db, () => undefined);
        seedProjectsAndLanes(db);
        seedSourceItem(db, "item-1", "lane-a");

        expect(() => db.exec(`
            INSERT INTO coordination_cross_lane_target_relation_history
                (source_item_id, target_lane_id, seq, impact_classification, applicable, relation_provenance)
            VALUES ('item-1', 'lane-x', 1, 'ACTION_REQUIRED', 1, 'test')
        `)).toThrow(/same Project/);
    });

    it("F11 self-relation: a target Lane equal to the source item's own Lane is rejected", () => {
        const db = createTestDb();
        ensureCoordinationCrossLaneSchema(db, () => undefined);
        seedProjectsAndLanes(db);
        seedSourceItem(db, "item-1", "lane-a");

        expect(() => db.exec(`
            INSERT INTO coordination_cross_lane_target_relation_history
                (source_item_id, target_lane_id, seq, impact_classification, applicable, relation_provenance)
            VALUES ('item-1', 'lane-a', 1, 'ACTION_REQUIRED', 1, 'test')
        `)).toThrow(/must not reference its own source Lane/);
    });

    it("F10 unknown references fail closed", () => {
        const db = createTestDb();
        ensureCoordinationCrossLaneSchema(db, () => undefined);
        seedProjectsAndLanes(db);

        // Unknown source Lane on a source item.
        expect(() => db.exec(`
            INSERT INTO coordination_cross_lane_source_items (id, source_lane_id, summary)
            VALUES ('item-unknown-lane', 'missing-lane', 'summary')
        `)).toThrow(/FOREIGN KEY/);

        // Unknown source item on a relation (same-project trigger fires first).
        expect(() => db.exec(`
            INSERT INTO coordination_cross_lane_target_relation_history
                (source_item_id, target_lane_id, seq, impact_classification, applicable, relation_provenance)
            VALUES ('missing-item', 'lane-b', 1, 'ACTION_REQUIRED', 1, 'test')
        `)).toThrow(/same Project|FOREIGN KEY/);

        // Unknown target Lane on a relation.
        expect(() => db.exec(`
            INSERT INTO coordination_cross_lane_target_relation_history
                (source_item_id, target_lane_id, seq, impact_classification, applicable, relation_provenance)
            VALUES ('missing-item', 'missing-lane', 1, 'ACTION_REQUIRED', 1, 'test')
        `)).toThrow(/same Project|FOREIGN KEY/);
    });

    it("F14 NONE is an explicit classification and persists", () => {
        const db = createTestDb();
        ensureCoordinationCrossLaneSchema(db, () => undefined);
        seedProjectsAndLanes(db);
        seedSourceItem(db, "item-1", "lane-a");
        db.exec(`
            INSERT INTO coordination_cross_lane_target_relation_history
                (source_item_id, target_lane_id, seq, impact_classification, applicable, relation_provenance)
            VALUES ('item-1', 'lane-b', 1, 'NONE', 1, 'test');
        `);
        const row = db
            .prepare(
                "SELECT impact_classification AS impactClassification FROM coordination_cross_lane_target_relation_history WHERE source_item_id = 'item-1'",
            )
            .get() as { impactClassification: string };
        expect(row.impactClassification).toBe("NONE");
    });

    it("F17 empty/whitespace summary and provenance are rejected", () => {
        const db = createTestDb();
        ensureCoordinationCrossLaneSchema(db, () => undefined);
        seedProjectsAndLanes(db);

        for (const summary of ["", "   "]) {
            expect(() => db.prepare(`
                INSERT INTO coordination_cross_lane_source_items (id, source_lane_id, summary)
                VALUES (?, 'lane-a', ?)
            `).run(`item-summary-${summary.length}`, summary)).toThrow(/CHECK/);
        }

        seedSourceItem(db, "item-1", "lane-a");
        for (const provenance of ["", "   "]) {
            expect(() => db.prepare(`
                INSERT INTO coordination_cross_lane_source_item_history
                    (source_item_id, seq, applicable, source_provenance)
                VALUES ('item-1', ?, 1, ?)
            `).run(1, provenance)).toThrow(/CHECK/);
        }
    });
});
