import path from "path";
import Database from "better-sqlite3";
import { afterEach, describe, expect, it } from "vitest";
import {
    CoordinationCheckpointWriterError,
    createGovernedInitialLaneCheckpoint,
    createGovernedSuccessorLaneCheckpoint,
} from "@/lib/coordination/checkpointWriter";
import { CoordinationCheckpointStaleSuccessorError } from "@/lib/coordination/checkpoint";
import { CoordinationLaneResolutionError } from "@/lib/coordination/laneResolver";
import { ensureCoordinationCheckpointSchema } from "@/lib/coordination/checkpointSchema";
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
    ensureCoordinationCheckpointSchema(db, () => undefined);
    db.exec(`
        INSERT INTO projects (id, slug) VALUES ('project-a', 'project-a'), ('project-b', 'project-b');
        INSERT INTO coordination_lanes (id, project_id, lane_key, name) VALUES
            ('lane-a', 'project-a', 'main', 'Main'),
            ('lane-b', 'project-b', 'other', 'Other');
    `);
    return db;
}

function request(overrides: Record<string, unknown> = {}) {
    return {
        projectSlug: "project-a",
        laneKey: "main",
        id: "cp-initial",
        continuity: {
            blocker: null,
            cross_lane_pending: [],
            do_not_reopen: ["P2-G6B"],
            next_exact_action: "continue",
        },
        openItems: [{
            openItemId: "item-a",
            itemOrdinal: 1,
            summary: "first item",
            continuityKind: "ADDED",
        }],
        provenance: "human:test",
        ...overrides,
    };
}

afterEach(() => {
    while (openDatabases.length > 0) openDatabases.pop()?.close();
});

describe("CP-P2-C governed initial checkpoint writer", () => {
    it("resolves the canonical Project/Lane server-side and delegates durable initial creation", () => {
        const db = createTestDb();
        const created = createGovernedInitialLaneCheckpoint(db, request());

        expect(created).toMatchObject({
            checkpoint: { id: "cp-initial", laneId: "lane-a", seq: 1, supersedesCheckpointId: null },
            openItems: [{ checkpointId: "cp-initial", openItemId: "item-a", continuityKind: "ADDED" }],
        });
    });

    it("fails closed for a Lane key not owned by the resolved Project, unknown Project, and unknown Lane", () => {
        const db = createTestDb();
        expect(() => createGovernedInitialLaneCheckpoint(db, request({ laneKey: "other" })))
            .toThrow(CoordinationLaneResolutionError);
        expect(() => createGovernedInitialLaneCheckpoint(db, request({ projectSlug: "missing-project" })))
            .toThrow(CoordinationLaneResolutionError);
        expect(() => createGovernedInitialLaneCheckpoint(db, request({ laneKey: "missing" })))
            .toThrow(CoordinationLaneResolutionError);
        expect(db.prepare("SELECT COUNT(*) AS count FROM coordination_lane_checkpoints").get())
            .toEqual({ count: 0 });
    });

    it("rejects missing identity, malformed checkpoint payload, and caller mutation-control fields before delegation", () => {
        const db = createTestDb();
        for (const invalid of [
            request({ projectSlug: "" }),
            request({ laneKey: "" }),
            request({ continuity: { next_exact_action: "missing required facts" } }),
            request({ laneId: "lane-b" }),
            request({ seq: 99 }),
            request({ supersedesCheckpointId: "cp-other" }),
            request({ supersedes_checkpoint_id: "cp-other" }),
        ]) {
            expect(() => createGovernedInitialLaneCheckpoint(db, invalid)).toThrow(CoordinationCheckpointWriterError);
        }
        expect(db.prepare("SELECT COUNT(*) AS count FROM coordination_lane_checkpoints").get())
            .toEqual({ count: 0 });
    });
});

describe("SCW-P1 governed successor checkpoint writer", () => {
    function successorRequest(overrides: Record<string, unknown> = {}) {
        return {
            projectSlug: "project-a",
            laneKey: "main",
            id: "cp-successor",
            expectedPredecessorCheckpointId: "cp-initial",
            continuity: {
                blocker: null,
                cross_lane_pending: [],
                do_not_reopen: ["P2-G6B"],
                next_exact_action: "continue after successor",
            },
            openItems: [],
            openItemExits: [],
            provenance: "human:successor-test",
            ...overrides,
        };
    }

    it("resolves Project/Lane server-side and creates the successor only for the expected predecessor", () => {
        const db = createTestDb();

        createGovernedInitialLaneCheckpoint(db, request({ openItems: [] }));

        const created = createGovernedSuccessorLaneCheckpoint(
            db,
            successorRequest(),
        );

        expect(created).toMatchObject({
            checkpoint: {
                id: "cp-successor",
                laneId: "lane-a",
                seq: 2,
                supersedesCheckpointId: "cp-initial",
            },
        });
    });

    it("rejects a stale or incorrect expected predecessor without creating another checkpoint", () => {
        const db = createTestDb();

        createGovernedInitialLaneCheckpoint(db, request({ openItems: [] }));

        expect(() =>
            createGovernedSuccessorLaneCheckpoint(
                db,
                successorRequest({
                    expectedPredecessorCheckpointId: "cp-stale",
                }),
            ),
        ).toThrow(CoordinationCheckpointStaleSuccessorError);

        expect(
            db.prepare(
                "SELECT COUNT(*) AS count FROM coordination_lane_checkpoints",
            ).get(),
        ).toEqual({ count: 1 });
    });

    it("rejects caller-supplied laneId as unsupported mutation authority", () => {
        const db = createTestDb();

        createGovernedInitialLaneCheckpoint(db, request({ openItems: [] }));

        expect(() =>
            createGovernedSuccessorLaneCheckpoint(
                db,
                successorRequest({ laneId: "lane-b" }),
            ),
        ).toThrow(CoordinationCheckpointWriterError);

        expect(
            db.prepare(
                "SELECT COUNT(*) AS count FROM coordination_lane_checkpoints",
            ).get(),
        ).toEqual({ count: 1 });
    });
});
