import path from "path";
import Database from "better-sqlite3";
import { afterEach, describe, expect, it } from "vitest";
import {
    appendCoordinationDependencyHistory,
    CoordinationDependencyError,
    CoordinationDependencyNotFoundError,
    createCoordinationDependency,
    resolveCoordinationDependency,
    resolveCoordinationDependencyHistory,
    resolveCurrentCoordinationDependencyState,
} from "@/lib/coordination/dependency";
import { ensureCoordinationDependencySchema } from "@/lib/coordination/dependencySchema";
import { ensureCoordinationSchema } from "@/lib/coordination/schema";

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
}

afterEach(() => {
    while (openDatabases.length > 0) openDatabases.pop()?.close();
});

describe("P2-G3B Lane dependency primitive", () => {
    it("atomically creates a stable directional identity and initial history", () => {
        const db = createTestDb();
        seedSameProjectLanes(db);
        const created = createCoordinationDependency(db, {
            id: "dep-1",
            sourceLaneId: "lane-a",
            targetLaneId: "lane-b",
            state: "opaque-initial",
            provenance: "test",
        });

        expect(created.dependency).toEqual(expect.objectContaining({
            id: "dep-1",
            sourceLaneId: "lane-a",
            targetLaneId: "lane-b",
        }));
        expect(created.initialHistory).toEqual(expect.objectContaining({
            dependencyId: "dep-1",
            seq: 1,
            state: "opaque-initial",
        }));
        expect(resolveCoordinationDependencyHistory(db, "dep-1")).toHaveLength(1);
    });

    it("rolls back identity when the initial history row is invalid", () => {
        const db = createTestDb();
        seedSameProjectLanes(db);
        expect(() => createCoordinationDependency(db, {
            id: "dep-1",
            sourceLaneId: "lane-a",
            targetLaneId: "lane-b",
            state: "   ",
            provenance: "test",
        })).toThrow(/CHECK/);
        expect(resolveCoordinationDependency(db, "dep-1")).toBeNull();
    });

    it("fails closed for unknown and non-Lane endpoints", () => {
        const db = createTestDb();
        seedSameProjectLanes(db);
        for (const sourceLaneId of ["missing", "project-1", "   "]) {
            expect(() => createCoordinationDependency(db, {
                id: `dep-${sourceLaneId}`,
                sourceLaneId,
                targetLaneId: "lane-b",
                state: "opaque",
                provenance: "test",
            })).toThrowError(expect.objectContaining<CoordinationDependencyError>({
                code: "COORDINATION_DEPENDENCY_INVALID",
            }));
        }
        expect(() => createCoordinationDependency(db, {
            id: "   ",
            sourceLaneId: "lane-a",
            targetLaneId: "lane-b",
            state: "opaque",
            provenance: "test",
        })).toThrow(/id must be non-empty/);
        expect(() => createCoordinationDependency(db, {
            id: "dep-blank-target",
            sourceLaneId: "lane-a",
            targetLaneId: "   ",
            state: "opaque",
            provenance: "test",
        })).toThrow(/targetLaneId must be non-empty/);
        expect(db.prepare("SELECT COUNT(*) AS count FROM coordination_dependencies").get())
            .toEqual({ count: 0 });
    });

    it("fails closed when source and target Lanes belong to different Projects", () => {
        const db = createTestDb();
        seedProject(db, "project-1", "project-one");
        seedProject(db, "project-2", "project-two");
        seedLane(db, "lane-a", "project-1", "a");
        seedLane(db, "lane-b", "project-2", "b");

        expect(() => createCoordinationDependency(db, {
            id: "dep-1",
            sourceLaneId: "lane-a",
            targetLaneId: "lane-b",
            state: "opaque",
            provenance: "test",
        })).toThrow(/different Projects/);
        expect(resolveCoordinationDependency(db, "dep-1")).toBeNull();
    });

    it("rejects direct SQL persistence across Projects at the database boundary", () => {
        const db = createTestDb();
        seedProject(db, "project-1", "project-one");
        seedProject(db, "project-2", "project-two");
        seedLane(db, "lane-a", "project-1", "a");
        seedLane(db, "lane-b", "project-2", "b");

        expect(() => db.prepare(
            `INSERT INTO coordination_dependencies (id, source_lane_id, target_lane_id)
             VALUES ('dep-direct', 'lane-a', 'lane-b')`,
        ).run()).toThrow(/same Project/);
        expect(db.prepare(
            "SELECT COUNT(*) AS count FROM coordination_dependencies WHERE id = 'dep-direct'",
        ).get()).toEqual({ count: 0 });
        expect(db.prepare(
            "SELECT COUNT(*) AS count FROM coordination_dependency_history WHERE dependency_id = 'dep-direct'",
        ).get()).toEqual({ count: 0 });
    });

    it("preserves SOURCE to TARGET direction without normalization", () => {
        const db = createTestDb();
        seedSameProjectLanes(db);
        createCoordinationDependency(db, {
            id: "dep-forward",
            sourceLaneId: "lane-a",
            targetLaneId: "lane-b",
            state: "opaque",
            provenance: "test",
        });
        createCoordinationDependency(db, {
            id: "dep-reverse",
            sourceLaneId: "lane-b",
            targetLaneId: "lane-a",
            state: "opaque",
            provenance: "test",
        });
        expect(resolveCoordinationDependency(db, "dep-forward")).toEqual(
            expect.objectContaining({ sourceLaneId: "lane-a", targetLaneId: "lane-b" }),
        );
        expect(resolveCoordinationDependency(db, "dep-reverse")).toEqual(
            expect.objectContaining({ sourceLaneId: "lane-b", targetLaneId: "lane-a" }),
        );
    });

    it("appends history with internal per-dependency seq and highest-seq currentness", () => {
        const db = createTestDb();
        seedSameProjectLanes(db);
        createCoordinationDependency(db, {
            id: "dep-1",
            sourceLaneId: "lane-a",
            targetLaneId: "lane-b",
            state: "opaque-1",
            provenance: "test",
        });
        const second = appendCoordinationDependencyHistory(db, {
            dependencyId: "dep-1",
            state: "opaque-2",
            provenance: "test",
            seq: 99,
        } as Parameters<typeof appendCoordinationDependencyHistory>[1] & { seq: number });
        const third = appendCoordinationDependencyHistory(db, {
            dependencyId: "dep-1",
            state: "opaque-3",
            provenance: "test",
        });

        expect(second.seq).toBe(2);
        expect(third.seq).toBe(3);
        const history = resolveCoordinationDependencyHistory(db, "dep-1");
        expect(history.map((row) => row.seq)).toEqual([1, 2, 3]);
        expect(history.map((row) => row.state)).toEqual(["opaque-1", "opaque-2", "opaque-3"]);
        expect(resolveCurrentCoordinationDependencyState(db, "dep-1"))
            .toEqual(expect.objectContaining({ seq: 3, state: "opaque-3" }));
    });

    it("keeps state opaque but rejects empty state", () => {
        const db = createTestDb();
        seedSameProjectLanes(db);
        createCoordinationDependency(db, {
            id: "dep-1",
            sourceLaneId: "lane-a",
            targetLaneId: "lane-b",
            state: "arbitrary value / not a vocabulary",
            provenance: "test",
        });
        expect(resolveCurrentCoordinationDependencyState(db, "dep-1")?.state)
            .toBe("arbitrary value / not a vocabulary");
        expect(() => appendCoordinationDependencyHistory(db, {
            dependencyId: "dep-1",
            state: "",
            provenance: "test",
        })).toThrow(/CHECK/);
        expect(resolveCoordinationDependencyHistory(db, "dep-1")).toHaveLength(1);
    });

    it("fails visibly when appending history to an unknown dependency", () => {
        const db = createTestDb();
        expect(() => appendCoordinationDependencyHistory(db, {
            dependencyId: "missing",
            state: "opaque",
            provenance: "test",
        })).toThrowError(expect.objectContaining<CoordinationDependencyNotFoundError>({
            code: "COORDINATION_DEPENDENCY_NOT_FOUND",
        }));
    });
});
