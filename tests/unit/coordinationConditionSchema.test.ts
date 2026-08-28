import { readFileSync } from "fs";
import path from "path";
import Database from "better-sqlite3";
import { afterEach, describe, expect, it } from "vitest";
import { ensureCoordinationSchema } from "@/lib/coordination/schema";
import { ensureCoordinationDependencySchema } from "@/lib/coordination/dependencySchema";
import {
    COORDINATION_CONDITIONS_TABLE_SQL,
    CoordinationConditionSchemaError,
    ensureCoordinationConditionSchema,
} from "@/lib/coordination/conditionSchema";

const LIVE_DB_PATH = path.resolve(process.cwd(), "data/workos.db");
const openDatabases: Database.Database[] = [];

function createTestDb(): Database.Database {
    const db = new Database(":memory:");
    openDatabases.push(db);
    expect(path.resolve(db.name)).not.toBe(LIVE_DB_PATH);
    db.pragma("foreign_keys = ON");
    db.exec("CREATE TABLE projects (id TEXT PRIMARY KEY, slug TEXT NOT NULL UNIQUE)");
    ensureCoordinationSchema(db, () => undefined);
    ensureCoordinationDependencySchema(db, () => undefined);
    return db;
}

function seedSameProjectLanes(db: Database.Database): void {
    db.exec(`
        INSERT INTO projects (id, slug) VALUES ('project-1', 'project-one');
        INSERT INTO coordination_lanes (id, project_id, lane_key, name)
        VALUES
            ('lane-a', 'project-1', 'a', 'A'),
            ('lane-b', 'project-1', 'b', 'B'),
            ('lane-c', 'project-1', 'c', 'C');
    `);
}

function seedDependencyBC(db: Database.Database): void {
    seedSameProjectLanes(db);
    db.exec(`
        INSERT INTO coordination_dependencies (id, source_lane_id, target_lane_id)
        VALUES ('dep-bc', 'lane-b', 'lane-c');
    `);
}

function conditionSchemaObjects(
    db: Database.Database,
): Array<{ type: string; name: string; sql: string }> {
    return db
        .prepare(
            `SELECT type, name,
                    lower(replace(replace(sql, 'IF NOT EXISTS ', ''), char(10), ' ')) AS sql
             FROM sqlite_master
             WHERE name IN (
                 'coordination_conditions',
                 'coordination_condition_history',
                 'trg_coordination_conditions_identity_immutable',
                 'trg_coordination_conditions_dependency_endpoint',
                 'trg_coordination_condition_history_append_only_update',
                 'trg_coordination_condition_history_append_only_delete'
             )
             ORDER BY type, name`,
        )
        .all() as Array<{ type: string; name: string; sql: string }>;
}

afterEach(() => {
    while (openDatabases.length > 0) openDatabases.pop()?.close();
});

describe("P2-G4B Coordination condition schema", () => {
    it("F1 provisions only the frozen identity and lifecycle fields", () => {
        const db = createTestDb();
        ensureCoordinationConditionSchema(db, () => undefined);

        const identity = db
            .prepare("PRAGMA table_info(coordination_conditions)")
            .all() as Array<{ name: string }>;
        const history = db
            .prepare("PRAGMA table_info(coordination_condition_history)")
            .all() as Array<{ name: string }>;
        expect(identity.map((column) => column.name)).toEqual([
            "id",
            "lane_id",
            "signal_kind",
            "dependency_id",
            "reason",
            "created_at",
        ]);
        expect(history.map((column) => column.name)).toEqual([
            "condition_id",
            "seq",
            "state",
            "recorded_at",
            "provenance",
        ]);
    });

    it("F1 fails closed without altering a malformed identity table", () => {
        const db = createTestDb();
        db.exec("CREATE TABLE coordination_conditions (id TEXT PRIMARY KEY)");
        const before = conditionSchemaObjects(db);
        expect(() => ensureCoordinationConditionSchema(db, () => undefined)).toThrowError(
            expect.objectContaining<CoordinationConditionSchemaError>({
                code: "COORDINATION_CONDITION_SCHEMA_INCOMPATIBLE",
            }),
        );
        expect(conditionSchemaObjects(db)).toEqual(before);
    });

    it("F1 fails closed when only one table from the schema exists", () => {
        const db = createTestDb();
        db.exec(COORDINATION_CONDITIONS_TABLE_SQL);
        const before = conditionSchemaObjects(db);
        expect(() => ensureCoordinationConditionSchema(db, () => undefined)).toThrowError(
            expect.objectContaining<CoordinationConditionSchemaError>({
                code: "COORDINATION_CONDITION_SCHEMA_INCOMPATIBLE",
            }),
        );
        expect(conditionSchemaObjects(db)).toEqual(before);
    });

    it("F2 is idempotent and produces no second-run schema delta", () => {
        const db = createTestDb();
        ensureCoordinationConditionSchema(db, () => undefined);
        const first = conditionSchemaObjects(db);
        ensureCoordinationConditionSchema(db, () => undefined);
        expect(conditionSchemaObjects(db)).toEqual(first);
    });

    it("F3 keeps schema.sql aligned with the source-backed ensure path", () => {
        const dbFromEnsure = createTestDb();
        ensureCoordinationConditionSchema(dbFromEnsure, () => undefined);

        const dbFromSchema = new Database(":memory:");
        openDatabases.push(dbFromSchema);
        dbFromSchema.pragma("foreign_keys = ON");
        dbFromSchema.exec(readFileSync(path.resolve(process.cwd(), "src/db/schema.sql"), "utf8"));
        expect(conditionSchemaObjects(dbFromSchema)).toEqual(
            conditionSchemaObjects(dbFromEnsure),
        );
    });

    it("F4 keeps identity immutable including dependency_id and reason", () => {
        const db = createTestDb();
        ensureCoordinationConditionSchema(db, () => undefined);
        seedDependencyBC(db);
        db.exec(`
            INSERT INTO coordination_conditions (id, lane_id, signal_kind, dependency_id, reason)
            VALUES ('cond-1', 'lane-b', 'blocker', 'dep-bc', 'reason-1');
            INSERT INTO coordination_condition_history (condition_id, seq, state, provenance)
            VALUES ('cond-1', 1, 'active', 'test');
        `);

        expect(() => db.exec("UPDATE coordination_conditions SET id = 'cond-2' WHERE id = 'cond-1'"))
            .toThrow(/identity is immutable/);
        expect(() => db.exec("UPDATE coordination_conditions SET lane_id = 'lane-a' WHERE id = 'cond-1'"))
            .toThrow(/identity is immutable/);
        expect(() => db.exec("UPDATE coordination_conditions SET signal_kind = 'waiting' WHERE id = 'cond-1'"))
            .toThrow(/identity is immutable/);
        expect(() => db.exec("UPDATE coordination_conditions SET reason = 'changed' WHERE id = 'cond-1'"))
            .toThrow(/identity is immutable/);
        // dependency NULL -> dependency is rejected
        expect(() => db.exec("UPDATE coordination_conditions SET dependency_id = 'dep-bc' WHERE id = 'cond-1'"))
            .toThrow(/identity is immutable/);
        // dependency -> NULL is rejected
        expect(() => db.exec("UPDATE coordination_conditions SET dependency_id = NULL WHERE id = 'cond-1'"))
            .toThrow(/identity is immutable/);
        // dependency A -> dependency B is rejected
        db.exec(`
            INSERT INTO coordination_dependencies (id, source_lane_id, target_lane_id)
            VALUES ('dep-ab', 'lane-a', 'lane-b');
        `);
        expect(() => db.exec("UPDATE coordination_conditions SET dependency_id = 'dep-ab' WHERE id = 'cond-1'"))
            .toThrow(/identity is immutable/);
    });

    it("F5 endpoint valid: source Lane B referencing B -> C succeeds", () => {
        const db = createTestDb();
        ensureCoordinationConditionSchema(db, () => undefined);
        seedDependencyBC(db);
        expect(() => db.exec(`
            INSERT INTO coordination_conditions (id, lane_id, signal_kind, dependency_id, reason)
            VALUES ('cond-b', 'lane-b', 'waiting', 'dep-bc', 'waiting for C')
        `)).not.toThrow();
        expect(db.prepare("SELECT COUNT(*) AS count FROM coordination_conditions WHERE id = 'cond-b'").get())
            .toEqual({ count: 1 });
    });

    it("F6 unrelated same-project Lane A referencing B -> C fails closed", () => {
        const db = createTestDb();
        ensureCoordinationConditionSchema(db, () => undefined);
        seedDependencyBC(db);
        expect(() => db.exec(`
            INSERT INTO coordination_conditions (id, lane_id, signal_kind, dependency_id, reason)
            VALUES ('cond-a', 'lane-a', 'blocker', 'dep-bc', 'unrelated')
        `)).toThrow(/source Lane/);
    });

    it("F7 target Lane C referencing B -> C fails closed", () => {
        const db = createTestDb();
        ensureCoordinationConditionSchema(db, () => undefined);
        seedDependencyBC(db);
        expect(() => db.exec(`
            INSERT INTO coordination_conditions (id, lane_id, signal_kind, dependency_id, reason)
            VALUES ('cond-c', 'lane-c', 'attention', 'dep-bc', 'target')
        `)).toThrow(/source Lane/);
    });

    it("F8 direct SQL endpoint bypass is rejected and not persisted", () => {
        const db = createTestDb();
        ensureCoordinationConditionSchema(db, () => undefined);
        seedDependencyBC(db);
        expect(() => db.exec(`
            INSERT INTO coordination_conditions (id, lane_id, signal_kind, dependency_id, reason)
            VALUES ('cond-a', 'lane-a', 'blocker', 'dep-bc', 'bypass')
        `)).toThrow(/source Lane/);
        expect(db.prepare("SELECT COUNT(*) AS count FROM coordination_conditions WHERE id = 'cond-a'").get())
            .toEqual({ count: 0 });
        expect(db.prepare(
            "SELECT COUNT(*) AS count FROM coordination_condition_history WHERE condition_id = 'cond-a'",
        ).get()).toEqual({ count: 0 });
    });

    it("F9 standalone condition with dependency_id NULL is allowed for a valid Lane", () => {
        const db = createTestDb();
        ensureCoordinationConditionSchema(db, () => undefined);
        seedSameProjectLanes(db);
        expect(() => db.exec(`
            INSERT INTO coordination_conditions (id, lane_id, signal_kind, dependency_id, reason)
            VALUES ('cond-standalone', 'lane-a', 'attention', NULL, 'needs review')
        `)).not.toThrow();
    });

    it("F10 unknown Lane / Dependency / Condition references fail closed", () => {
        const db = createTestDb();
        ensureCoordinationConditionSchema(db, () => undefined);
        seedSameProjectLanes(db);

        expect(() => db.exec(`
            INSERT INTO coordination_conditions (id, lane_id, signal_kind, reason)
            VALUES ('cond-unknown-lane', 'missing-lane', 'blocker', 'reason')
        `)).toThrow(/FOREIGN KEY/);

        // The dependency endpoint trigger (BEFORE INSERT) fires before FK
        // checking for a non-existent Dependency; both reject fail-closed.
        expect(() => db.exec(`
            INSERT INTO coordination_conditions (id, lane_id, signal_kind, dependency_id, reason)
            VALUES ('cond-unknown-dep', 'lane-a', 'blocker', 'missing-dep', 'reason')
        `)).toThrow(/source Lane|FOREIGN KEY/);

        expect(() => db.exec(`
            INSERT INTO coordination_condition_history (condition_id, seq, state, provenance)
            VALUES ('missing-condition', 1, 'active', 'test')
        `)).toThrow(/FOREIGN KEY/);
    });

    it("F11 bounded vocabulary: unknown signal_kind and unknown lifecycle state rejected", () => {
        const db = createTestDb();
        ensureCoordinationConditionSchema(db, () => undefined);
        seedSameProjectLanes(db);

        expect(() => db.exec(`
            INSERT INTO coordination_conditions (id, lane_id, signal_kind, reason)
            VALUES ('cond-bad-kind', 'lane-a', 'urgent', 'reason')
        `)).toThrow(/CHECK/);

        db.exec(`
            INSERT INTO coordination_conditions (id, lane_id, signal_kind, reason)
            VALUES ('cond-1', 'lane-a', 'blocker', 'reason');
        `);
        expect(() => db.exec(`
            INSERT INTO coordination_condition_history (condition_id, seq, state, provenance)
            VALUES ('cond-1', 1, 'escalated', 'test')
        `)).toThrow(/CHECK/);
    });

    it("F12 reason: empty/whitespace reason rejected at the database boundary", () => {
        const db = createTestDb();
        ensureCoordinationConditionSchema(db, () => undefined);
        seedSameProjectLanes(db);
        for (const reason of ["", "   "]) {
            expect(() => db.prepare(`
                INSERT INTO coordination_conditions (id, lane_id, signal_kind, reason)
                VALUES (?, 'lane-a', 'blocker', ?)
            `).run(`cond-reason-${reason.length}`, reason)).toThrow(/CHECK/);
        }
    });

    it("F13 provenance: empty/whitespace provenance rejected at the database boundary", () => {
        const db = createTestDb();
        ensureCoordinationConditionSchema(db, () => undefined);
        seedSameProjectLanes(db);
        db.exec(`
            INSERT INTO coordination_conditions (id, lane_id, signal_kind, reason)
            VALUES ('cond-1', 'lane-a', 'blocker', 'reason');
        `);
        for (const provenance of ["", "   "]) {
            expect(() => db.prepare(`
                INSERT INTO coordination_condition_history (condition_id, seq, state, provenance)
                VALUES ('cond-1', ?, 'active', ?)
            `).run(1, provenance)).toThrow(/CHECK/);
        }
    });

    it("F14 history append-only: UPDATE and DELETE rejected at the database boundary", () => {
        const db = createTestDb();
        ensureCoordinationConditionSchema(db, () => undefined);
        seedSameProjectLanes(db);
        db.exec(`
            INSERT INTO coordination_conditions (id, lane_id, signal_kind, reason)
            VALUES ('cond-1', 'lane-a', 'blocker', 'reason');
            INSERT INTO coordination_condition_history (condition_id, seq, state, provenance)
            VALUES ('cond-1', 1, 'active', 'test');
        `);

        expect(() => db.exec(
            "UPDATE coordination_condition_history SET state = 'cleared' WHERE condition_id = 'cond-1'",
        )).toThrow(/append-only/);
        expect(() => db.exec(
            "DELETE FROM coordination_condition_history WHERE condition_id = 'cond-1'",
        )).toThrow(/append-only/);
    });
});
