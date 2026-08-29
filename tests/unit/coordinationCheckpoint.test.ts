import { mkdtempSync, rmSync } from "fs";
import os from "os";
import path from "path";
import Database from "better-sqlite3";
import { afterEach, describe, expect, it } from "vitest";
import {
    CoordinationCheckpointEvidenceError,
    CoordinationCheckpointStaleSuccessorError,
    createInitialLaneCheckpoint,
    createSuccessorLaneCheckpoint,
    readLaneCheckpointCores,
    type CoordinationCheckpointContinuityPayload,
} from "@/lib/coordination/checkpoint";
import { ensureCoordinationCheckpointSchema } from "@/lib/coordination/checkpointSchema";
import { ensureCoordinationSchema } from "@/lib/coordination/schema";

const LIVE_DB_PATH = path.resolve(process.cwd(), "data/workos.db");
const openDatabases: Database.Database[] = [];
const tempDirs: string[] = [];

function continuity(next = "continue"): CoordinationCheckpointContinuityPayload {
    return {
        blocker: null,
        cross_lane_pending: [],
        do_not_reopen: [],
        next_exact_action: next,
    };
}

function configureDb(db: Database.Database): Database.Database {
    openDatabases.push(db);
    expect(path.resolve(db.name)).not.toBe(LIVE_DB_PATH);
    db.pragma("foreign_keys = ON");
    db.exec("CREATE TABLE IF NOT EXISTS projects (id TEXT PRIMARY KEY, slug TEXT NOT NULL UNIQUE)");
    ensureCoordinationSchema(db, () => undefined);
    ensureCoordinationCheckpointSchema(db, () => undefined);
    return db;
}

function createTestDb(): Database.Database {
    return configureDb(new Database(":memory:"));
}

function seedProjectAndLane(
    db: Database.Database,
    laneId = "lane-a",
    laneKey = "a",
): void {
    db.prepare("INSERT OR IGNORE INTO projects (id, slug) VALUES ('project-1', 'project-one')").run();
    db.prepare(
        `INSERT INTO coordination_lanes (id, project_id, lane_key, name)
         VALUES (?, 'project-1', ?, ?)`,
    ).run(laneId, laneKey, laneKey.toUpperCase());
}

function createRootWithItem(db: Database.Database, itemId = "item-a") {
    return createInitialLaneCheckpoint(db, {
        id: "cp-1",
        laneId: "lane-a",
        continuity: continuity("after cp1"),
        openItems: [
            {
                openItemId: itemId,
                itemOrdinal: 1,
                summary: "first item",
                continuityKind: "ADDED",
            },
        ],
        provenance: "test",
    });
}

afterEach(() => {
    while (openDatabases.length > 0) openDatabases.pop()?.close();
    while (tempDirs.length > 0) rmSync(tempDirs.pop() as string, { recursive: true, force: true });
});

describe("P2-G6B-I1 Coordination checkpoint persistence", () => {
    it("creates the first immutable snapshot with internally allocated seq=1", () => {
        const db = createTestDb();
        seedProjectAndLane(db);
        const created = createInitialLaneCheckpoint(db, {
            id: "cp-1",
            laneId: "lane-a",
            continuity: continuity(),
            openItems: [],
            provenance: "test",
            seq: 99,
        } as Parameters<typeof createInitialLaneCheckpoint>[1] & { seq: number });

        expect(created.checkpoint).toEqual(expect.objectContaining({
            id: "cp-1",
            laneId: "lane-a",
            seq: 1,
            supersedesCheckpointId: null,
        }));
        expect(created.openItems).toEqual([]);
        expect(created.openItemExits).toEqual([]);
    });

    it("requires every initial OPEN_ITEM to be ADDED", () => {
        const db = createTestDb();
        seedProjectAndLane(db);
        expect(() => createInitialLaneCheckpoint(db, {
            id: "cp-1",
            laneId: "lane-a",
            continuity: continuity(),
            openItems: [{
                openItemId: "item-a",
                itemOrdinal: 1,
                summary: "invalid retained root",
                continuityKind: "RETAINED",
            }],
            provenance: "test",
        })).toThrow(/must be ADDED/);
        expect(readLaneCheckpointCores(db, "lane-a")).toEqual([]);
    });

    it("rejects unknown RETAINED identities and ADDED identities already current in the predecessor", () => {
        const db = createTestDb();
        seedProjectAndLane(db);
        createRootWithItem(db);

        expect(() => createSuccessorLaneCheckpoint(db, {
            id: "cp-retained-unknown",
            laneId: "lane-a",
            expectedPredecessorCheckpointId: "cp-1",
            continuity: continuity(),
            openItems: [{
                openItemId: "unknown",
                itemOrdinal: 1,
                summary: "unknown retained",
                continuityKind: "RETAINED",
            }],
            openItemExits: [{
                openItemId: "item-a",
                exitDisposition: "WITHDRAWN",
                exitNote: "withdraw old",
                replacementOpenItemId: null,
            }],
            provenance: "test",
        })).toThrow(/absent from immediate predecessor/);

        expect(() => createSuccessorLaneCheckpoint(db, {
            id: "cp-added-existing",
            laneId: "lane-a",
            expectedPredecessorCheckpointId: "cp-1",
            continuity: continuity(),
            openItems: [{
                openItemId: "item-a",
                itemOrdinal: 1,
                summary: "incorrectly added again",
                continuityKind: "ADDED",
            }],
            openItemExits: [],
            provenance: "test",
        })).toThrow(/reuses a prior Lane identity/);

        expect(readLaneCheckpointCores(db, "lane-a")).toHaveLength(1);
    });

    it("rejects an OPEN_ITEM that is both current and EXITED in the same successor", () => {
        const db = createTestDb();
        seedProjectAndLane(db);
        createRootWithItem(db);
        expect(() => createSuccessorLaneCheckpoint(db, {
            id: "cp-2",
            laneId: "lane-a",
            expectedPredecessorCheckpointId: "cp-1",
            continuity: continuity(),
            openItems: [{
                openItemId: "item-a",
                itemOrdinal: 1,
                summary: "still current",
                continuityKind: "RETAINED",
            }],
            openItemExits: [{
                openItemId: "item-a",
                exitDisposition: "RESOLVED",
                exitNote: "contradictory exit",
                replacementOpenItemId: null,
            }],
            provenance: "test",
        })).toThrow(/cannot also be EXITED|cannot be both RETAINED and EXITED/);
        expect(readLaneCheckpointCores(db, "lane-a")).toHaveLength(1);
    });

    it("fails closed on unknown top-level continuity semantics", () => {
        const db = createTestDb();
        seedProjectAndLane(db);
        expect(() => createInitialLaneCheckpoint(db, {
            id: "cp-1",
            laneId: "lane-a",
            continuity: {
                ...continuity(),
                session_handoff: "must-not-be-promoted",
            } as unknown as CoordinationCheckpointContinuityPayload,
            openItems: [],
            provenance: "test",
        })).toThrow(/continuity payload keys must be exactly/);
        expect(readLaneCheckpointCores(db, "lane-a")).toEqual([]);
    });

    it("allocates independent Lane-local sequences", () => {
        const db = createTestDb();
        seedProjectAndLane(db, "lane-a", "a");
        seedProjectAndLane(db, "lane-b", "b");
        for (const [id, laneId] of [["cp-a1", "lane-a"], ["cp-b1", "lane-b"]] as const) {
            createInitialLaneCheckpoint(db, {
                id,
                laneId,
                continuity: continuity(),
                openItems: [],
                provenance: "test",
            });
        }
        expect(readLaneCheckpointCores(db, "lane-a").map((row) => row.seq)).toEqual([1]);
        expect(readLaneCheckpointCores(db, "lane-b").map((row) => row.seq)).toEqual([1]);
    });

    it("creates a successor atomically with RETAINED, ADDED and explicit REPLACED exit evidence", () => {
        const db = createTestDb();
        seedProjectAndLane(db);
        createInitialLaneCheckpoint(db, {
            id: "cp-1",
            laneId: "lane-a",
            continuity: continuity(),
            openItems: [
                { openItemId: "keep", itemOrdinal: 1, summary: "keep", continuityKind: "ADDED" },
                { openItemId: "replace-me", itemOrdinal: 2, summary: "replace", continuityKind: "ADDED" },
            ],
            provenance: "test",
        });

        const successor = createSuccessorLaneCheckpoint(db, {
            id: "cp-2",
            laneId: "lane-a",
            expectedPredecessorCheckpointId: "cp-1",
            continuity: continuity("after cp2"),
            openItems: [
                { openItemId: "keep", itemOrdinal: 1, summary: "keep updated", continuityKind: "RETAINED" },
                { openItemId: "replacement", itemOrdinal: 2, summary: "new item", continuityKind: "ADDED" },
            ],
            openItemExits: [
                {
                    openItemId: "replace-me",
                    exitDisposition: "REPLACED",
                    exitNote: "superseded by narrower work",
                    replacementOpenItemId: "replacement",
                },
            ],
            provenance: "test",
        });

        expect(successor.checkpoint).toEqual(expect.objectContaining({
            seq: 2,
            supersedesCheckpointId: "cp-1",
        }));
        expect(successor.openItems.map((item) => [item.openItemId, item.continuityKind])).toEqual([
            ["keep", "RETAINED"],
            ["replacement", "ADDED"],
        ]);
        expect(successor.openItemExits[0]).toEqual(expect.objectContaining({
            openItemId: "replace-me",
            exitDisposition: "REPLACED",
            replacementOpenItemId: "replacement",
        }));
    });

    it("fails closed when predecessor absence lacks explicit EXITED evidence", () => {
        const db = createTestDb();
        seedProjectAndLane(db);
        createRootWithItem(db);
        expect(() => createSuccessorLaneCheckpoint(db, {
            id: "cp-2",
            laneId: "lane-a",
            expectedPredecessorCheckpointId: "cp-1",
            continuity: continuity(),
            openItems: [],
            openItemExits: [],
            provenance: "test",
        })).toThrow(/requires explicit EXITED evidence/);
        expect(readLaneCheckpointCores(db, "lane-a")).toHaveLength(1);
    });

    it("requires non-empty exit_note for every disposition", () => {
        const db = createTestDb();
        seedProjectAndLane(db);
        createRootWithItem(db);
        for (const disposition of ["RESOLVED", "WITHDRAWN"] as const) {
            expect(() => createSuccessorLaneCheckpoint(db, {
                id: `cp-${disposition}`,
                laneId: "lane-a",
                expectedPredecessorCheckpointId: "cp-1",
                continuity: continuity(),
                openItems: [],
                openItemExits: [{
                    openItemId: "item-a",
                    exitDisposition: disposition,
                    exitNote: "   ",
                    replacementOpenItemId: null,
                }],
                provenance: "test",
            })).toThrowError(expect.objectContaining<CoordinationCheckpointEvidenceError>({
                code: "COORDINATION_CHECKPOINT_EVIDENCE_INVALID",
            }));
        }
    });

    it("rejects a REPLACED exit without a same-successor ADDED replacement", () => {
        const db = createTestDb();
        seedProjectAndLane(db);
        createRootWithItem(db);
        expect(() => createSuccessorLaneCheckpoint(db, {
            id: "cp-2",
            laneId: "lane-a",
            expectedPredecessorCheckpointId: "cp-1",
            continuity: continuity(),
            openItems: [],
            openItemExits: [{
                openItemId: "item-a",
                exitDisposition: "REPLACED",
                exitNote: "replace",
                replacementOpenItemId: "missing",
            }],
            provenance: "test",
        })).toThrow(/must be an ADDED current item/);
        expect(readLaneCheckpointCores(db, "lane-a")).toHaveLength(1);
    });

    it("prohibits reappearance of an EXITED identity under the v1 no-reopen contract", () => {
        const db = createTestDb();
        seedProjectAndLane(db);
        createRootWithItem(db);
        createSuccessorLaneCheckpoint(db, {
            id: "cp-2",
            laneId: "lane-a",
            expectedPredecessorCheckpointId: "cp-1",
            continuity: continuity(),
            openItems: [],
            openItemExits: [{
                openItemId: "item-a",
                exitDisposition: "RESOLVED",
                exitNote: "done",
                replacementOpenItemId: null,
            }],
            provenance: "test",
        });

        expect(() => createSuccessorLaneCheckpoint(db, {
            id: "cp-3",
            laneId: "lane-a",
            expectedPredecessorCheckpointId: "cp-2",
            continuity: continuity(),
            openItems: [{
                openItemId: "item-a",
                itemOrdinal: 1,
                summary: "attempted reopen",
                continuityKind: "ADDED",
            }],
            openItemExits: [],
            provenance: "test",
        })).toThrow(/reuses a prior Lane identity/);
        expect(readLaneCheckpointCores(db, "lane-a")).toHaveLength(2);
    });

    it("requires positive contiguous unique ordinals", () => {
        const db = createTestDb();
        seedProjectAndLane(db);
        expect(() => createInitialLaneCheckpoint(db, {
            id: "cp-1",
            laneId: "lane-a",
            continuity: continuity(),
            openItems: [
                { openItemId: "a", itemOrdinal: 1, summary: "a", continuityKind: "ADDED" },
                { openItemId: "b", itemOrdinal: 3, summary: "b", continuityKind: "ADDED" },
            ],
            provenance: "test",
        })).toThrow(/contiguous/);
        expect(readLaneCheckpointCores(db, "lane-a")).toEqual([]);
    });

    it("rejects a stale successor across two SQLite connections without auto-rebase or renumber", () => {
        const dir = mkdtempSync(path.join(os.tmpdir(), "workos-checkpoint-"));
        tempDirs.push(dir);
        const dbPath = path.join(dir, "coordination.db");
        const first = configureDb(new Database(dbPath));
        seedProjectAndLane(first);
        createRootWithItem(first);

        const second = new Database(dbPath);
        openDatabases.push(second);
        second.pragma("foreign_keys = ON");
        const observedBySecond = readLaneCheckpointCores(second, "lane-a")[0].id;
        expect(observedBySecond).toBe("cp-1");

        createSuccessorLaneCheckpoint(first, {
            id: "cp-2",
            laneId: "lane-a",
            expectedPredecessorCheckpointId: "cp-1",
            continuity: continuity(),
            openItems: [{
                openItemId: "item-a",
                itemOrdinal: 1,
                summary: "retained",
                continuityKind: "RETAINED",
            }],
            openItemExits: [],
            provenance: "writer-1",
        });

        expect(() => createSuccessorLaneCheckpoint(second, {
            id: "cp-stale",
            laneId: "lane-a",
            expectedPredecessorCheckpointId: observedBySecond,
            continuity: continuity(),
            openItems: [{
                openItemId: "item-a",
                itemOrdinal: 1,
                summary: "stale",
                continuityKind: "RETAINED",
            }],
            openItemExits: [],
            provenance: "writer-2",
        })).toThrowError(expect.objectContaining<CoordinationCheckpointStaleSuccessorError>({
            code: "COORDINATION_CHECKPOINT_STALE_SUCCESSOR",
        }));

        expect(readLaneCheckpointCores(first, "lane-a").map((row) => [row.id, row.seq])).toEqual([
            ["cp-1", 1],
            ["cp-2", 2],
        ]);
    });

    it("rolls back the entire snapshot when a child constraint fails", () => {
        const db = createTestDb();
        seedProjectAndLane(db);
        expect(() => createInitialLaneCheckpoint(db, {
            id: "cp-1",
            laneId: "lane-a",
            continuity: continuity(),
            openItems: [{
                openItemId: "item-a",
                itemOrdinal: 1,
                summary: "   ",
                continuityKind: "ADDED",
            }],
            provenance: "test",
        })).toThrow();
        expect(readLaneCheckpointCores(db, "lane-a")).toEqual([]);
        expect(db.prepare(
            "SELECT COUNT(*) AS count FROM coordination_lane_checkpoint_open_items",
        ).get()).toEqual({ count: 0 });
    });
});
