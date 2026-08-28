import path from "path";
import Database from "better-sqlite3";
import { afterEach, describe, expect, it } from "vitest";
import {
    appendCrossLaneSourceItemState,
    appendCrossLaneTargetRelationState,
    CoordinationCrossLaneError,
    CoordinationCrossLaneNotFoundError,
    createCrossLaneSourceItem,
    createCrossLaneTargetRelation,
    resolveCrossLaneSourceItem,
    resolveCrossLaneSourceItemHistory,
    resolveCrossLaneTargetRelationHistory,
    resolveCurrentCrossLaneSourceItemState,
    resolveCurrentCrossLaneTargetRelationState,
    resolveCurrentEffectiveCrossLaneTargetRelations,
} from "@/lib/coordination/crossLane";
import { ensureCoordinationCrossLaneSchema } from "@/lib/coordination/crossLaneSchema";
import { ensureCoordinationSchema } from "@/lib/coordination/schema";
import { ensureCoordinationDependencySchema } from "@/lib/coordination/dependencySchema";
import { ensureCoordinationConditionSchema } from "@/lib/coordination/conditionSchema";

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
    ensureCoordinationCrossLaneSchema(db, () => undefined);
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

function seedProjectsAndLanes(db: Database.Database): void {
    seedProject(db, "project-1", "project-one");
    seedProject(db, "project-2", "project-two");
    seedLane(db, "lane-a", "project-1", "a");
    seedLane(db, "lane-b", "project-1", "b");
    seedLane(db, "lane-c", "project-1", "c");
    seedLane(db, "lane-x", "project-2", "x");
}

afterEach(() => {
    while (openDatabases.length > 0) openDatabases.pop()?.close();
});

describe("P2-G5B Cross-Lane Impact primitive", () => {
    it("atomically creates a source item with an initial applicable history record", () => {
        const db = createTestDb();
        seedProjectsAndLanes(db);
        const created = createCrossLaneSourceItem(db, {
            id: "item-1",
            sourceLaneId: "lane-a",
            summary: "impact on delivery",
            applicable: true,
            provenance: "test",
        });

        expect(created.sourceItem).toEqual(
            expect.objectContaining({
                id: "item-1",
                sourceLaneId: "lane-a",
                summary: "impact on delivery",
            }),
        );
        expect(created.initialHistory).toEqual(
            expect.objectContaining({
                sourceItemId: "item-1",
                seq: 1,
                applicable: true,
                sourceProvenance: "test",
            }),
        );
        expect(resolveCrossLaneSourceItemHistory(db, "item-1")).toHaveLength(1);
    });

    it("creates a valid same-project, non-self target relation", () => {
        const db = createTestDb();
        seedProjectsAndLanes(db);
        createCrossLaneSourceItem(db, {
            id: "item-1",
            sourceLaneId: "lane-a",
            summary: "impact",
            applicable: true,
            provenance: "test",
        });
        const relation = createCrossLaneTargetRelation(db, {
            sourceItemId: "item-1",
            targetLaneId: "lane-b",
            impactClassification: "ACTION_REQUIRED",
            applicable: true,
            provenance: "test",
        });

        expect(relation).toEqual(
            expect.objectContaining({
                sourceItemId: "item-1",
                targetLaneId: "lane-b",
                seq: 1,
                impactClassification: "ACTION_REQUIRED",
                applicable: true,
            }),
        );
    });

    it("F9 rejects a target Lane in a different Project at the app boundary", () => {
        const db = createTestDb();
        seedProjectsAndLanes(db);
        createCrossLaneSourceItem(db, {
            id: "item-1",
            sourceLaneId: "lane-a",
            summary: "impact",
            applicable: true,
            provenance: "test",
        });
        expect(() => createCrossLaneTargetRelation(db, {
            sourceItemId: "item-1",
            targetLaneId: "lane-x",
            impactClassification: "ACTION_REQUIRED",
            applicable: true,
            provenance: "test",
        })).toThrowError(
            expect.objectContaining<CoordinationCrossLaneError>({
                code: "COORDINATION_CROSS_LANE_INVALID",
            }),
        );
        expect(resolveCrossLaneTargetRelationHistory(db, "item-1", "lane-x")).toHaveLength(0);
    });

    it("F11 rejects a self-relation at the app boundary", () => {
        const db = createTestDb();
        seedProjectsAndLanes(db);
        createCrossLaneSourceItem(db, {
            id: "item-1",
            sourceLaneId: "lane-a",
            summary: "impact",
            applicable: true,
            provenance: "test",
        });
        expect(() => createCrossLaneTargetRelation(db, {
            sourceItemId: "item-1",
            targetLaneId: "lane-a",
            impactClassification: "ACTION_REQUIRED",
            applicable: true,
            provenance: "test",
        })).toThrowError(
            expect.objectContaining<CoordinationCrossLaneError>({
                code: "COORDINATION_CROSS_LANE_INVALID",
            }),
        );
        expect(resolveCrossLaneTargetRelationHistory(db, "item-1", "lane-a")).toHaveLength(0);
    });

    it("F10 rejects unknown source item / source Lane / target Lane at the app boundary", () => {
        const db = createTestDb();
        seedProjectsAndLanes(db);
        expect(() => createCrossLaneSourceItem(db, {
            id: "item-bad-lane",
            sourceLaneId: "missing-lane",
            summary: "impact",
            applicable: true,
            provenance: "test",
        })).toThrowError(
            expect.objectContaining<CoordinationCrossLaneError>({
                code: "COORDINATION_CROSS_LANE_INVALID",
            }),
        );
        expect(() => createCrossLaneTargetRelation(db, {
            sourceItemId: "missing-item",
            targetLaneId: "lane-b",
            impactClassification: "ACTION_REQUIRED",
            applicable: true,
            provenance: "test",
        })).toThrowError(
            expect.objectContaining<CoordinationCrossLaneNotFoundError>({
                code: "COORDINATION_CROSS_LANE_NOT_FOUND",
            }),
        );
    });

    it("F16 a source item with no target relations is valid and standalone", () => {
        const db = createTestDb();
        seedProjectsAndLanes(db);
        const created = createCrossLaneSourceItem(db, {
            id: "item-1",
            sourceLaneId: "lane-a",
            summary: "standalone",
            applicable: true,
            provenance: "test",
        });
        expect(resolveCrossLaneSourceItem(db, "item-1")).not.toBeNull();
        expect(resolveCurrentEffectiveCrossLaneTargetRelations(db, "item-1")).toEqual([]);
        expect(created.initialHistory.applicable).toBe(true);
    });

    it("appends source item lifecycle with deterministic per-item seq and highest-seq currentness", () => {
        const db = createTestDb();
        seedProjectsAndLanes(db);
        createCrossLaneSourceItem(db, {
            id: "item-1",
            sourceLaneId: "lane-a",
            summary: "impact",
            applicable: true,
            provenance: "test",
        });
        const second = appendCrossLaneSourceItemState(db, {
            sourceItemId: "item-1",
            applicable: false,
            provenance: "test",
        });
        expect(second.seq).toBe(2);
        expect(second.applicable).toBe(false);
        expect(resolveCurrentCrossLaneSourceItemState(db, "item-1"))
            .toEqual(expect.objectContaining({ seq: 2, applicable: false }));
    });

    it("F12 appends relation history with highest-seq currentness per relation pair", () => {
        const db = createTestDb();
        seedProjectsAndLanes(db);
        createCrossLaneSourceItem(db, {
            id: "item-1",
            sourceLaneId: "lane-a",
            summary: "impact",
            applicable: true,
            provenance: "test",
        });
        createCrossLaneTargetRelation(db, {
            sourceItemId: "item-1",
            targetLaneId: "lane-b",
            impactClassification: "ACTION_REQUIRED",
            applicable: true,
            provenance: "test",
        });
        const second = appendCrossLaneTargetRelationState(db, {
            sourceItemId: "item-1",
            targetLaneId: "lane-b",
            impactClassification: "AWARENESS_ONLY",
            applicable: true,
            provenance: "test",
        });
        expect(second.seq).toBe(2);
        expect(second.impactClassification).toBe("AWARENESS_ONLY");
        expect(resolveCurrentCrossLaneTargetRelationState(db, "item-1", "lane-b"))
            .toEqual(expect.objectContaining({ seq: 2, impactClassification: "AWARENESS_ONLY" }));
    });

    it("F13 effective relation requires BOTH current source item and current relation applicable", () => {
        const db = createTestDb();
        seedProjectsAndLanes(db);
        createCrossLaneSourceItem(db, {
            id: "item-1",
            sourceLaneId: "lane-a",
            summary: "impact",
            applicable: true,
            provenance: "test",
        });
        createCrossLaneTargetRelation(db, {
            sourceItemId: "item-1",
            targetLaneId: "lane-b",
            impactClassification: "ACTION_REQUIRED",
            applicable: true,
            provenance: "test",
        });

        expect(resolveCurrentEffectiveCrossLaneTargetRelations(db, "item-1")).toHaveLength(1);

        // Clear the source item: the relation is no longer effective.
        appendCrossLaneSourceItemState(db, {
            sourceItemId: "item-1",
            applicable: false,
            provenance: "test",
        });
        expect(resolveCurrentEffectiveCrossLaneTargetRelations(db, "item-1")).toHaveLength(0);

        // Re-activate the source item, then clear only the relation.
        appendCrossLaneSourceItemState(db, {
            sourceItemId: "item-1",
            applicable: true,
            provenance: "test",
        });
        expect(resolveCurrentEffectiveCrossLaneTargetRelations(db, "item-1")).toHaveLength(1);
        appendCrossLaneTargetRelationState(db, {
            sourceItemId: "item-1",
            targetLaneId: "lane-b",
            impactClassification: "ACTION_REQUIRED",
            applicable: false,
            provenance: "test",
        });
        expect(resolveCurrentEffectiveCrossLaneTargetRelations(db, "item-1")).toHaveLength(0);
    });

    it("F14 NONE is an explicit classification at the app boundary", () => {
        const db = createTestDb();
        seedProjectsAndLanes(db);
        createCrossLaneSourceItem(db, {
            id: "item-1",
            sourceLaneId: "lane-a",
            summary: "impact",
            applicable: true,
            provenance: "test",
        });
        const relation = createCrossLaneTargetRelation(db, {
            sourceItemId: "item-1",
            targetLaneId: "lane-b",
            impactClassification: "NONE",
            applicable: true,
            provenance: "test",
        });
        expect(relation.impactClassification).toBe("NONE");
        expect(resolveCurrentCrossLaneTargetRelationState(db, "item-1", "lane-b")?.impactClassification)
            .toBe("NONE");
    });

    it("keeps the impact classification bounded at the app boundary", () => {
        const db = createTestDb();
        seedProjectsAndLanes(db);
        createCrossLaneSourceItem(db, {
            id: "item-1",
            sourceLaneId: "lane-a",
            summary: "impact",
            applicable: true,
            provenance: "test",
        });
        expect(() => createCrossLaneTargetRelation(db, {
            sourceItemId: "item-1",
            targetLaneId: "lane-b",
            impactClassification: "MAYBE" as never,
            applicable: true,
            provenance: "test",
        })).toThrow(/impactClassification must be one of/);
    });

    it("rolls back all persistence when creation fails partway", () => {
        const db = createTestDb();
        seedProjectsAndLanes(db);
        createCrossLaneSourceItem(db, {
            id: "item-1",
            sourceLaneId: "lane-a",
            summary: "impact",
            applicable: true,
            provenance: "test",
        });
        // Duplicate identity PK must fail without leaving a partial second row.
        expect(() => createCrossLaneSourceItem(db, {
            id: "item-1",
            sourceLaneId: "lane-a",
            summary: "impact",
            applicable: true,
            provenance: "test",
        })).toThrow(/UNIQUE|PRIMARY KEY/);
        const history = resolveCrossLaneSourceItemHistory(db, "item-1");
        expect(history).toHaveLength(1);
        expect(history[0].seq).toBe(1);
    });

    it("F15 never mutates coordination_lanes, G3 dependency, or G4 condition data", () => {
        const db = createTestDb();
        seedProjectsAndLanes(db);
        const laneBefore = db.prepare("SELECT * FROM coordination_lanes WHERE id = 'lane-a'").get();
        const dependencyBefore = db
            .prepare("SELECT COUNT(*) AS count FROM coordination_dependencies")
            .get() as { count: number };
        const conditionBefore = db
            .prepare("SELECT COUNT(*) AS count FROM coordination_conditions")
            .get() as { count: number };

        createCrossLaneSourceItem(db, {
            id: "item-1",
            sourceLaneId: "lane-a",
            summary: "impact",
            applicable: true,
            provenance: "test",
        });
        createCrossLaneTargetRelation(db, {
            sourceItemId: "item-1",
            targetLaneId: "lane-b",
            impactClassification: "ACTION_REQUIRED",
            applicable: true,
            provenance: "test",
        });
        appendCrossLaneSourceItemState(db, {
            sourceItemId: "item-1",
            applicable: false,
            provenance: "test",
        });

        expect(db.prepare("SELECT * FROM coordination_lanes WHERE id = 'lane-a'").get())
            .toEqual(laneBefore);
        expect(db.prepare("SELECT COUNT(*) AS count FROM coordination_dependencies").get())
            .toEqual(dependencyBefore);
        expect(db.prepare("SELECT COUNT(*) AS count FROM coordination_conditions").get())
            .toEqual(conditionBefore);
    });

    it("rejects empty provenance on lifecycle facts", () => {
        const db = createTestDb();
        seedProjectsAndLanes(db);
        expect(() => createCrossLaneSourceItem(db, {
            id: "item-1",
            sourceLaneId: "lane-a",
            summary: "impact",
            applicable: true,
            provenance: "   ",
        })).toThrow(/provenance must be non-empty/);
        expect(resolveCrossLaneSourceItem(db, "item-1")).toBeNull();
    });

    it("fails visibly when appending to an unknown source item", () => {
        const db = createTestDb();
        seedProjectsAndLanes(db);
        expect(() => appendCrossLaneSourceItemState(db, {
            sourceItemId: "missing",
            applicable: false,
            provenance: "test",
        })).toThrowError(
            expect.objectContaining<CoordinationCrossLaneNotFoundError>({
                code: "COORDINATION_CROSS_LANE_NOT_FOUND",
            }),
        );
    });
});
