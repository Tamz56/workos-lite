import { readFileSync } from "fs";
import path from "path";
import Database from "better-sqlite3";
import { afterEach, describe, expect, it } from "vitest";
import { ensureCoordinationSchema } from "@/lib/coordination/schema";
import {
    COORDINATION_DEPENDENCIES_TABLE_SQL,
    CoordinationDependencySchemaError,
    ensureCoordinationDependencySchema,
} from "@/lib/coordination/dependencySchema";

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

function seedSameProjectLanes(db: Database.Database): void {
    db.exec(`
        INSERT INTO projects (id, slug) VALUES ('project-1', 'project-one');
        INSERT INTO coordination_lanes (id, project_id, lane_key, name)
        VALUES ('lane-a', 'project-1', 'a', 'A'), ('lane-b', 'project-1', 'b', 'B');
    `);
}

function dependencySchemaObjects(
    db: Database.Database,
): Array<{ type: string; name: string; sql: string }> {
    return db
        .prepare(
            `SELECT type, name,
                    lower(replace(replace(sql, 'IF NOT EXISTS ', ''), char(10), ' ')) AS sql
             FROM sqlite_master
             WHERE name IN (
                 'coordination_dependencies',
                 'coordination_dependency_history',
                 'trg_coordination_dependencies_identity_immutable',
                 'trg_coordination_dependencies_same_project',
                 'trg_coordination_dependency_history_append_only_update',
                 'trg_coordination_dependency_history_append_only_delete'
             )
             ORDER BY type, name`,
        )
        .all() as Array<{ type: string; name: string; sql: string }>;
}

afterEach(() => {
    while (openDatabases.length > 0) openDatabases.pop()?.close();
});

describe("P2-G3B Coordination dependency schema", () => {
    it("provisions only identity endpoints and authoritative history fields", () => {
        const db = createTestDb();
        ensureCoordinationDependencySchema(db, () => undefined);

        const identity = db.prepare("PRAGMA table_info(coordination_dependencies)").all() as Array<{ name: string }>;
        const history = db.prepare("PRAGMA table_info(coordination_dependency_history)").all() as Array<{ name: string }>;
        expect(identity.map((column) => column.name)).toEqual([
            "id",
            "source_lane_id",
            "target_lane_id",
            "created_at",
        ]);
        expect(history.map((column) => column.name)).toEqual([
            "dependency_id",
            "seq",
            "state",
            "recorded_at",
            "provenance",
        ]);
    });

    it("is idempotent and produces no second-run schema delta", () => {
        const db = createTestDb();
        ensureCoordinationDependencySchema(db, () => undefined);
        const first = dependencySchemaObjects(db);
        ensureCoordinationDependencySchema(db, () => undefined);
        expect(dependencySchemaObjects(db)).toEqual(first);
    });

    it("fails closed without altering an incompatible identity table", () => {
        const db = createTestDb();
        db.exec("CREATE TABLE coordination_dependencies (id TEXT PRIMARY KEY)");
        const before = dependencySchemaObjects(db);
        expect(() => ensureCoordinationDependencySchema(db, () => undefined)).toThrowError(
            expect.objectContaining<CoordinationDependencySchemaError>({
                code: "COORDINATION_DEPENDENCY_SCHEMA_INCOMPATIBLE",
            }),
        );
        expect(dependencySchemaObjects(db)).toEqual(before);
    });

    it("fails closed when only one table from the schema exists", () => {
        const db = createTestDb();
        db.exec(COORDINATION_DEPENDENCIES_TABLE_SQL);
        const before = dependencySchemaObjects(db);
        expect(() => ensureCoordinationDependencySchema(db, () => undefined)).toThrowError(
            expect.objectContaining<CoordinationDependencySchemaError>({
                code: "COORDINATION_DEPENDENCY_SCHEMA_INCOMPATIBLE",
            }),
        );
        expect(dependencySchemaObjects(db)).toEqual(before);
    });

    it("keeps dependency identity immutable and history append-only", () => {
        const db = createTestDb();
        ensureCoordinationDependencySchema(db, () => undefined);
        seedSameProjectLanes(db);
        db.exec(`
            INSERT INTO coordination_dependencies (id, source_lane_id, target_lane_id)
            VALUES ('dep-1', 'lane-a', 'lane-b');
            INSERT INTO coordination_dependency_history (dependency_id, seq, state, provenance)
            VALUES ('dep-1', 1, 'opaque', 'test');
        `);

        expect(() => db.exec(
            "UPDATE coordination_dependencies SET source_lane_id = 'lane-b' WHERE id = 'dep-1'",
        )).toThrow(/identity is immutable/);
        expect(() => db.exec(
            "UPDATE coordination_dependency_history SET state = 'changed' WHERE dependency_id = 'dep-1'",
        )).toThrow(/append-only/);
        expect(() => db.exec(
            "DELETE FROM coordination_dependency_history WHERE dependency_id = 'dep-1'",
        )).toThrow(/append-only/);
    });

    it("requires Lane endpoints and restricts deletion while durable dependency data exists", () => {
        const db = createTestDb();
        ensureCoordinationDependencySchema(db, () => undefined);
        seedSameProjectLanes(db);
        expect(() => db.exec(`
            INSERT INTO coordination_dependencies (id, source_lane_id, target_lane_id)
            VALUES ('dep-missing', 'lane-a', 'not-a-lane')
        `)).toThrow(/existing Lanes in the same Project/);

        db.exec(`
            INSERT INTO coordination_dependencies (id, source_lane_id, target_lane_id)
            VALUES ('dep-1', 'lane-a', 'lane-b');
            INSERT INTO coordination_dependency_history (dependency_id, seq, state, provenance)
            VALUES ('dep-1', 1, 'opaque', 'test');
        `);
        expect(() => db.exec("DELETE FROM coordination_dependencies WHERE id = 'dep-1'"))
            .toThrow(/FOREIGN KEY/);
        expect(() => db.exec("DELETE FROM coordination_lanes WHERE id = 'lane-a'"))
            .toThrow(/FOREIGN KEY/);
    });

    it("keeps schema.sql aligned with the source-backed ensure path", () => {
        const dbFromEnsure = createTestDb();
        ensureCoordinationDependencySchema(dbFromEnsure, () => undefined);

        const dbFromSchema = new Database(":memory:");
        openDatabases.push(dbFromSchema);
        dbFromSchema.pragma("foreign_keys = ON");
        dbFromSchema.exec(readFileSync(path.resolve(process.cwd(), "src/db/schema.sql"), "utf8"));
        expect(dependencySchemaObjects(dbFromSchema)).toEqual(
            dependencySchemaObjects(dbFromEnsure),
        );
    });
});
