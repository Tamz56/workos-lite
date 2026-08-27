import { readFileSync } from "fs";
import path from "path";
import Database from "better-sqlite3";
import { afterEach, describe, expect, it } from "vitest";
import {
    CoordinationLaneSchemaError,
    ensureCoordinationSchema,
} from "@/lib/coordination/schema";

const LIVE_DB_PATH = path.resolve(process.cwd(), "data/workos.db");
const openDatabases: Database.Database[] = [];

function createTestDb(): Database.Database {
    const db = new Database(":memory:");
    openDatabases.push(db);
    expect(path.resolve(db.name)).not.toBe(LIVE_DB_PATH);
    db.pragma("foreign_keys = ON");
    db.exec("CREATE TABLE projects (id TEXT PRIMARY KEY, slug TEXT NOT NULL UNIQUE)");
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
        WHERE name = 'coordination_lanes'
           OR name LIKE 'idx_coordination_lanes_%'
           OR name LIKE 'trg_coordination_lanes_%'
        ORDER BY type, name
    `).all() as Array<{ type: string; name: string; sql: string }>;
}

afterEach(() => {
    while (openDatabases.length > 0) openDatabases.pop()?.close();
});

describe("P1-G1A canonical Coordination Lane schema", () => {
    it("provisions only the canonical Lane identity and persistence fields", () => {
        const db = createTestDb();
        ensureCoordinationSchema(db, () => undefined);

        const columns = db.prepare("PRAGMA table_info(coordination_lanes)").all() as Array<{ name: string }>;
        expect(columns.map((column) => column.name)).toEqual([
            "id",
            "project_id",
            "lane_key",
            "name",
            "created_at",
            "updated_at",
        ]);
    });

    it("is idempotent and produces no second-run schema delta", () => {
        const db = createTestDb();
        ensureCoordinationSchema(db, () => undefined);
        const first = schemaObjects(db);
        ensureCoordinationSchema(db, () => undefined);
        expect(schemaObjects(db)).toEqual(first);
    });

    it("fails closed without altering an unknown existing Lane table", () => {
        const db = createTestDb();
        db.exec("CREATE TABLE coordination_lanes (id TEXT PRIMARY KEY, project_id TEXT)");
        const before = schemaObjects(db);

        expect(() => ensureCoordinationSchema(db, () => undefined)).toThrowError(
            expect.objectContaining<CoordinationLaneSchemaError>({
                code: "COORDINATION_LANE_SCHEMA_INCOMPATIBLE",
            }),
        );
        expect(schemaObjects(db)).toEqual(before);
    });

    it("uses a stable project-scoped Lane key and permits the same key in another Project", () => {
        const db = createTestDb();
        ensureCoordinationSchema(db, () => undefined);
        seedProject(db, "project-1", "project-one");
        seedProject(db, "project-2", "project-two");

        insertLane(db, "lane-1", "project-1", "delivery", "Delivery");
        expect(() => insertLane(db, "lane-2", "project-1", "delivery", "Duplicate")).toThrow(/UNIQUE/);
        expect(() => insertLane(db, "lane-3", "project-2", "delivery", "Delivery")).not.toThrow();
    });

    it("rejects malformed Lane keys, blank names, and unknown Project ownership", () => {
        const db = createTestDb();
        ensureCoordinationSchema(db, () => undefined);
        seedProject(db, "project-1", "project-one");

        for (const laneKey of ["", "Delivery", "-delivery", "delivery-", "delivery--core", "delivery_core"]) {
            expect(() => insertLane(db, `lane-${laneKey}`, "project-1", laneKey, "Delivery")).toThrow(/CHECK/);
        }
        expect(() => insertLane(db, "lane-blank", "project-1", "blank", "   ")).toThrow(/CHECK/);
        expect(() => insertLane(db, "lane-orphan", "missing", "delivery", "Delivery")).toThrow(/FOREIGN KEY/);
    });

    it("keeps canonical identity immutable while allowing the display name to change", () => {
        const db = createTestDb();
        ensureCoordinationSchema(db, () => undefined);
        seedProject(db, "project-1", "project-one");
        insertLane(db, "lane-1", "project-1", "delivery", "Delivery");

        for (const statement of [
            "UPDATE coordination_lanes SET id = 'lane-2' WHERE id = 'lane-1'",
            "UPDATE coordination_lanes SET project_id = 'project-2' WHERE id = 'lane-1'",
            "UPDATE coordination_lanes SET lane_key = 'delivery-next' WHERE id = 'lane-1'",
        ]) {
            expect(() => db.exec(statement)).toThrow(/identity is immutable/);
        }

        expect(() => db.prepare(
            "UPDATE coordination_lanes SET name = ? WHERE id = ?",
        ).run("Delivery Lane", "lane-1")).not.toThrow();
        expect(db.prepare("SELECT name FROM coordination_lanes WHERE id = 'lane-1'").get()).toEqual({
            name: "Delivery Lane",
        });
    });

    it("prevents Project deletion while its canonical Lane exists", () => {
        const db = createTestDb();
        ensureCoordinationSchema(db, () => undefined);
        seedProject(db, "project-1", "project-one");
        insertLane(db, "lane-1", "project-1", "delivery", "Delivery");

        expect(() => db.prepare("DELETE FROM projects WHERE id = 'project-1'").run()).toThrow(/FOREIGN KEY/);
    });

    it("keeps schema.sql aligned with the source-backed ensure path", () => {
        const dbFromEnsure = createTestDb();
        ensureCoordinationSchema(dbFromEnsure, () => undefined);

        const dbFromSchema = new Database(":memory:");
        openDatabases.push(dbFromSchema);
        dbFromSchema.pragma("foreign_keys = ON");
        dbFromSchema.exec(readFileSync(path.resolve(process.cwd(), "src/db/schema.sql"), "utf8"));

        expect(schemaObjects(dbFromSchema)).toEqual(schemaObjects(dbFromEnsure));
    });
});
