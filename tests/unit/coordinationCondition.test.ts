import path from "path";
import Database from "better-sqlite3";
import { afterEach, describe, expect, it } from "vitest";
import {
    appendCoordinationConditionState,
    CoordinationConditionError,
    CoordinationConditionNotFoundError,
    createCoordinationCondition,
    resolveCoordinationCondition,
    resolveCoordinationConditionHistory,
    resolveCurrentCoordinationConditionState,
    resolveCurrentEffectiveCoordinationConditions,
} from "@/lib/coordination/condition";
import { ensureCoordinationConditionSchema } from "@/lib/coordination/conditionSchema";
import { ensureCoordinationSchema } from "@/lib/coordination/schema";
import { ensureCoordinationDependencySchema } from "@/lib/coordination/dependencySchema";

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
    ensureCoordinationConditionSchema(db, () => undefined);
    return db;
}

function seedProject(db: Database.Database, id: string, slug: string): void {
    db.prepare("INSERT INTO projects (id, slug) VALUES (?, ?)").run(id, slug);
}

function seedLane(
    db: Database.Database,
    id: string,
    projectId: string,
    laneKey: string,
): void {
    db.prepare(
        `INSERT INTO coordination_lanes (id, project_id, lane_key, name)
         VALUES (?, ?, ?, ?)`,
    ).run(id, projectId, laneKey, laneKey);
}

function seedSameProjectLanes(db: Database.Database): void {
    seedProject(db, "project-1", "project-one");
    seedLane(db, "lane-a", "project-1", "a");
    seedLane(db, "lane-b", "project-1", "b");
    seedLane(db, "lane-c", "project-1", "c");
}

function seedDependency(
    db: Database.Database,
    id: string,
    sourceLaneId: string,
    targetLaneId: string,
): void {
    db.prepare(
        `INSERT INTO coordination_dependencies (id, source_lane_id, target_lane_id)
         VALUES (?, ?, ?)`,
    ).run(id, sourceLaneId, targetLaneId);
}

function seedDependencyBC(db: Database.Database): void {
    seedSameProjectLanes(db);
    seedDependency(db, "dep-bc", "lane-b", "lane-c");
}

afterEach(() => {
    while (openDatabases.length > 0) openDatabases.pop()?.close();
});

describe("P2-G4B Coordination condition primitive", () => {
    it("atomically creates a stable condition identity and initial active history", () => {
        const db = createTestDb();
        seedSameProjectLanes(db);
        const created = createCoordinationCondition(db, {
            id: "cond-1",
            laneId: "lane-a",
            signalKind: "blocker",
            reason: "waiting on external approval",
            provenance: "test",
        });

        expect(created.condition).toEqual(
            expect.objectContaining({
                id: "cond-1",
                laneId: "lane-a",
                signalKind: "blocker",
                dependencyId: null,
                reason: "waiting on external approval",
            }),
        );
        expect(created.initialHistory).toEqual(
            expect.objectContaining({
                conditionId: "cond-1",
                seq: 1,
                state: "active",
                provenance: "test",
            }),
        );
        expect(resolveCoordinationConditionHistory(db, "cond-1")).toHaveLength(1);
    });

    it("keeps identity immutable across all frozen identity fields", () => {
        const db = createTestDb();
        seedDependencyBC(db);
        createCoordinationCondition(db, {
            id: "cond-1",
            laneId: "lane-b",
            signalKind: "blocker",
            dependencyId: "dep-bc",
            reason: "blocked on C",
            provenance: "test",
        });
        expect(() =>
            db.prepare("UPDATE coordination_conditions SET reason = 'changed' WHERE id = 'cond-1'").run(),
        ).toThrow(/identity is immutable/);
    });

    it("F5 endpoint valid: source Lane B referencing B -> C succeeds at the app boundary", () => {
        const db = createTestDb();
        seedDependencyBC(db);
        const created = createCoordinationCondition(db, {
            id: "cond-b",
            laneId: "lane-b",
            signalKind: "waiting",
            dependencyId: "dep-bc",
            reason: "waiting for C",
            provenance: "test",
        });
        expect(created.condition).toEqual(
            expect.objectContaining({ id: "cond-b", laneId: "lane-b", dependencyId: "dep-bc" }),
        );
    });

    it("F6 unrelated same-project Lane A referencing B -> C fails closed at the app boundary", () => {
        const db = createTestDb();
        seedDependencyBC(db);
        expect(() => createCoordinationCondition(db, {
            id: "cond-a",
            laneId: "lane-a",
            signalKind: "blocker",
            dependencyId: "dep-bc",
            reason: "unrelated",
            provenance: "test",
        })).toThrowError(
            expect.objectContaining<CoordinationConditionError>({
                code: "COORDINATION_CONDITION_INVALID",
            }),
        );
        expect(resolveCoordinationCondition(db, "cond-a")).toBeNull();
        expect(db.prepare("SELECT COUNT(*) AS count FROM coordination_condition_history").get())
            .toEqual({ count: 0 });
    });

    it("F7 target Lane C referencing B -> C fails closed at the app boundary", () => {
        const db = createTestDb();
        seedDependencyBC(db);
        expect(() => createCoordinationCondition(db, {
            id: "cond-c",
            laneId: "lane-c",
            signalKind: "attention",
            dependencyId: "dep-bc",
            reason: "target lane",
            provenance: "test",
        })).toThrowError(
            expect.objectContaining<CoordinationConditionError>({
                code: "COORDINATION_CONDITION_INVALID",
            }),
        );
        expect(resolveCoordinationCondition(db, "cond-c")).toBeNull();
    });

    it("F9 standalone condition without a Dependency reference is allowed", () => {
        const db = createTestDb();
        seedSameProjectLanes(db);
        const created = createCoordinationCondition(db, {
            id: "cond-standalone",
            laneId: "lane-a",
            signalKind: "attention",
            reason: "needs human review",
            provenance: "test",
        });
        expect(created.condition.dependencyId).toBeNull();
        expect(resolveCoordinationCondition(db, "cond-standalone")).not.toBeNull();
    });

    it("fails closed for unknown Lane and unknown Dependency references", () => {
        const db = createTestDb();
        seedSameProjectLanes(db);
        expect(() => createCoordinationCondition(db, {
            id: "cond-unknown-lane",
            laneId: "missing-lane",
            signalKind: "blocker",
            reason: "reason",
            provenance: "test",
        })).toThrowError(
            expect.objectContaining<CoordinationConditionError>({
                code: "COORDINATION_CONDITION_INVALID",
            }),
        );
        expect(() => createCoordinationCondition(db, {
            id: "cond-unknown-dep",
            laneId: "lane-a",
            signalKind: "blocker",
            dependencyId: "missing-dep",
            reason: "reason",
            provenance: "test",
        })).toThrowError(
            expect.objectContaining<CoordinationConditionError>({
                code: "COORDINATION_CONDITION_INVALID",
            }),
        );
    });

    it("fails closed for blank identity fields and an invalid signal kind", () => {
        const db = createTestDb();
        seedSameProjectLanes(db);
        expect(() => createCoordinationCondition(db, {
            id: "   ",
            laneId: "lane-a",
            signalKind: "blocker",
            reason: "reason",
            provenance: "test",
        })).toThrow(/id must be non-empty/);
        expect(() => createCoordinationCondition(db, {
            id: "cond-blank-lane",
            laneId: "   ",
            signalKind: "blocker",
            reason: "reason",
            provenance: "test",
        })).toThrow(/laneId must be non-empty/);
        expect(() => createCoordinationCondition(db, {
            id: "cond-blank-reason",
            laneId: "lane-a",
            signalKind: "blocker",
            reason: "   ",
            provenance: "test",
        })).toThrow(/reason must be non-empty/);
        expect(() => createCoordinationCondition(db, {
            id: "cond-bad-kind",
            laneId: "lane-a",
            signalKind: "urgent" as never,
            reason: "reason",
            provenance: "test",
        })).toThrow(/signalKind must be one of/);
        expect(db.prepare("SELECT COUNT(*) AS count FROM coordination_conditions").get())
            .toEqual({ count: 0 });
    });

    it("rolls back all persistence when creation fails partway", () => {
        const db = createTestDb();
        seedSameProjectLanes(db);
        createCoordinationCondition(db, {
            id: "cond-1",
            laneId: "lane-a",
            signalKind: "blocker",
            reason: "reason",
            provenance: "test",
        });
        // Duplicate identity PK must fail without leaving a partial second row.
        expect(() => createCoordinationCondition(db, {
            id: "cond-1",
            laneId: "lane-a",
            signalKind: "blocker",
            reason: "reason",
            provenance: "test",
        })).toThrow(/UNIQUE|PRIMARY KEY/);
        const history = resolveCoordinationConditionHistory(db, "cond-1");
        expect(history).toHaveLength(1);
        expect(history[0].seq).toBe(1);
    });

    it("appends lifecycle history with deterministic per-condition seq and highest-seq currentness", () => {
        const db = createTestDb();
        seedSameProjectLanes(db);
        createCoordinationCondition(db, {
            id: "cond-1",
            laneId: "lane-a",
            signalKind: "blocker",
            reason: "reason-1",
            provenance: "test",
        });
        const second = appendCoordinationConditionState(db, {
            conditionId: "cond-1",
            state: "cleared",
            provenance: "test",
        });
        expect(second.seq).toBe(2);
        expect(second.state).toBe("cleared");
        expect(resolveCurrentCoordinationConditionState(db, "cond-1"))
            .toEqual(expect.objectContaining({ seq: 2, state: "cleared" }));
        expect(resolveCoordinationConditionHistory(db, "cond-1").map((row) => row.seq))
            .toEqual([1, 2]);
    });

    it("F16 reactivation: active -> cleared -> active resolves active", () => {
        const db = createTestDb();
        seedSameProjectLanes(db);
        createCoordinationCondition(db, {
            id: "cond-1",
            laneId: "lane-a",
            signalKind: "blocker",
            reason: "reason",
            provenance: "test",
        });
        appendCoordinationConditionState(db, {
            conditionId: "cond-1",
            state: "cleared",
            provenance: "test",
        });
        appendCoordinationConditionState(db, {
            conditionId: "cond-1",
            state: "active",
            provenance: "test",
        });
        expect(resolveCurrentCoordinationConditionState(db, "cond-1"))
            .toEqual(expect.objectContaining({ seq: 3, state: "active" }));
    });

    it("F15 multi-condition: A active, B active, A cleared -> B remains effective", () => {
        const db = createTestDb();
        seedSameProjectLanes(db);
        createCoordinationCondition(db, {
            id: "blocker-a",
            laneId: "lane-a",
            signalKind: "blocker",
            reason: "A",
            provenance: "test",
        });
        createCoordinationCondition(db, {
            id: "blocker-b",
            laneId: "lane-a",
            signalKind: "blocker",
            reason: "B",
            provenance: "test",
        });
        appendCoordinationConditionState(db, {
            conditionId: "blocker-a",
            state: "cleared",
            provenance: "test",
        });

        expect(resolveCurrentCoordinationConditionState(db, "blocker-a"))
            .toEqual(expect.objectContaining({ state: "cleared" }));
        expect(resolveCurrentCoordinationConditionState(db, "blocker-b"))
            .toEqual(expect.objectContaining({ state: "active" }));

        const effective = resolveCurrentEffectiveCoordinationConditions(db, "lane-a", "blocker");
        expect(effective.map((condition) => condition.id)).toEqual(["blocker-b"]);
    });

    it("aggregates effective conditions per identity first, then by kind", () => {
        const db = createTestDb();
        seedSameProjectLanes(db);
        createCoordinationCondition(db, {
            id: "blocker-1",
            laneId: "lane-a",
            signalKind: "blocker",
            reason: "b1",
            provenance: "test",
        });
        createCoordinationCondition(db, {
            id: "blocker-2",
            laneId: "lane-a",
            signalKind: "blocker",
            reason: "b2",
            provenance: "test",
        });
        createCoordinationCondition(db, {
            id: "waiting-1",
            laneId: "lane-a",
            signalKind: "waiting",
            reason: "w1",
            provenance: "test",
        });
        appendCoordinationConditionState(db, {
            conditionId: "blocker-2",
            state: "cleared",
            provenance: "test",
        });

        expect(resolveCurrentEffectiveCoordinationConditions(db, "lane-a", "blocker")
            .map((c) => c.id)).toEqual(["blocker-1"]);
        expect(resolveCurrentEffectiveCoordinationConditions(db, "lane-a", "waiting")
            .map((c) => c.id)).toEqual(["waiting-1"]);
        expect(resolveCurrentEffectiveCoordinationConditions(db, "lane-a", "attention"))
            .toHaveLength(0);
    });

    it("rejects empty provenance on lifecycle facts", () => {
        const db = createTestDb();
        seedSameProjectLanes(db);
        expect(() => createCoordinationCondition(db, {
            id: "cond-1",
            laneId: "lane-a",
            signalKind: "blocker",
            reason: "reason",
            provenance: "   ",
        })).toThrow(/provenance must be non-empty/);
        expect(resolveCoordinationCondition(db, "cond-1")).toBeNull();
    });

    it("keeps lifecycle state bounded at the app boundary", () => {
        const db = createTestDb();
        seedSameProjectLanes(db);
        createCoordinationCondition(db, {
            id: "cond-1",
            laneId: "lane-a",
            signalKind: "blocker",
            reason: "reason",
            provenance: "test",
        });
        expect(() => appendCoordinationConditionState(db, {
            conditionId: "cond-1",
            state: "escalated" as never,
            provenance: "test",
        })).toThrow(/state must be one of/);
    });

    it("F17 never mutates the Lane row (no competing current coordination state)", () => {
        const db = createTestDb();
        seedSameProjectLanes(db);
        const laneBefore = db.prepare("SELECT * FROM coordination_lanes WHERE id = 'lane-a'").get();

        createCoordinationCondition(db, {
            id: "cond-1",
            laneId: "lane-a",
            signalKind: "blocker",
            reason: "reason",
            provenance: "test",
        });
        appendCoordinationConditionState(db, {
            conditionId: "cond-1",
            state: "cleared",
            provenance: "test",
        });

        const laneAfter = db.prepare("SELECT * FROM coordination_lanes WHERE id = 'lane-a'").get();
        expect(laneAfter).toEqual(laneBefore);
    });

    it("fails visibly when appending history to an unknown condition", () => {
        const db = createTestDb();
        seedSameProjectLanes(db);
        expect(() => appendCoordinationConditionState(db, {
            conditionId: "missing",
            state: "cleared",
            provenance: "test",
        })).toThrowError(
            expect.objectContaining<CoordinationConditionNotFoundError>({
                code: "COORDINATION_CONDITION_NOT_FOUND",
            }),
        );
    });
});
