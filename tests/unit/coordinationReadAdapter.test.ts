import path from "path";
import Database from "better-sqlite3";
import { afterEach, describe, expect, it } from "vitest";
import {
    CHECKPOINT_CONTINUITY_SCHEMA_VERSION,
    createInitialLaneCheckpoint,
    createSuccessorLaneCheckpoint,
    type CoordinationCheckpointContinuityPayload,
} from "@/lib/coordination/checkpoint";
import { ensureCoordinationCheckpointSchema } from "@/lib/coordination/checkpointSchema";
import { CoordinationReadAdapter } from "@/lib/coordination/readAdapter";
import { ensureCoordinationSchema } from "@/lib/coordination/schema";

const LIVE_DB_PATH = path.resolve(process.cwd(), "data/workos.db");
const openDatabases: Database.Database[] = [];

function continuity(next = "continue"): CoordinationCheckpointContinuityPayload {
    return {
        blocker: null,
        cross_lane_pending: [],
        do_not_reopen: ["P2-G6B"],
        next_exact_action: next,
    };
}

function createTestDb(): Database.Database {
    const db = new Database(":memory:");
    openDatabases.push(db);
    expect(path.resolve(db.name)).not.toBe(LIVE_DB_PATH);
    db.pragma("foreign_keys = ON");
    db.exec("CREATE TABLE projects (id TEXT PRIMARY KEY, slug TEXT NOT NULL UNIQUE)");
    ensureCoordinationSchema(db, () => undefined);
    ensureCoordinationCheckpointSchema(db, () => undefined);
    db.exec(`
        INSERT INTO projects (id, slug) VALUES
            ('project-1', 'allowed-project'),
            ('project-2', 'other-project');
        INSERT INTO coordination_lanes (id, project_id, lane_key, name) VALUES
            ('lane-a', 'project-1', 'main', 'Main'),
            ('lane-b', 'project-2', 'main', 'Other Main');
    `);
    return db;
}

function seedHistory(db: Database.Database): void {
    createInitialLaneCheckpoint(db, {
        id: "cp-1",
        laneId: "lane-a",
        continuity: continuity("first"),
        openItems: [{
            openItemId: "item-a",
            itemOrdinal: 1,
            summary: "first item",
            continuityKind: "ADDED",
        }],
        provenance: "test",
    });
    createSuccessorLaneCheckpoint(db, {
        id: "cp-2",
        laneId: "lane-a",
        expectedPredecessorCheckpointId: "cp-1",
        continuity: continuity("second"),
        openItems: [{
            openItemId: "item-a",
            itemOrdinal: 1,
            summary: "retained item",
            continuityKind: "RETAINED",
        }],
        openItemExits: [],
        provenance: "test",
    });
}

afterEach(() => {
    while (openDatabases.length > 0) openDatabases.pop()?.close();
});

describe("CoordinationReadAdapter", () => {
    it("binds projectSlug + laneKey to the canonical Lane without cross-project lane leakage", () => {
        const db = createTestDb();
        seedHistory(db);
        const adapter = new CoordinationReadAdapter(db);

        expect(adapter.current("allowed-project", "main")).toMatchObject({
            status: "CURRENT",
            identity: { projectSlug: "allowed-project", laneKey: "main", laneId: "lane-a" },
            data: { checkpoint: { id: "cp-2" } },
        });
        expect(adapter.current("other-project", "main")).toMatchObject({
            status: "NO_CHECKPOINT_YET",
            identity: { projectSlug: "other-project", laneKey: "main", laneId: "lane-b" },
        });
    });

    it("returns deterministic project/lane-not-found results", () => {
        const adapter = new CoordinationReadAdapter(createTestDb());
        expect(adapter.current("missing-project", "main")).toMatchObject({
            status: "PROJECT_NOT_FOUND",
            authorityClass: "NONE",
        });
        expect(adapter.current("allowed-project", "missing")).toMatchObject({
            status: "LANE_NOT_FOUND",
            authorityClass: "NONE",
        });
    });

    it("keeps LOOKUP exact and historical-only", () => {
        const db = createTestDb();
        seedHistory(db);
        const adapter = new CoordinationReadAdapter(db);

        expect(adapter.lookup("allowed-project", "main", {
            by: "checkpoint_id",
            checkpointId: "cp-1",
        })).toMatchObject({
            operation: "LOOKUP",
            status: "FOUND",
            authorityClass: "HISTORICAL_ONLY",
            data: { snapshot: { checkpoint: { id: "cp-1", seq: 1 } } },
        });
        expect(adapter.lookup("allowed-project", "main", { by: "seq", seq: 99 })).toMatchObject({
            status: "NOT_FOUND",
            authorityClass: "HISTORICAL_ONLY",
        });
    });

    it("returns HISTORY as historical-only and distinguishes an empty Lane", () => {
        const db = createTestDb();
        const adapter = new CoordinationReadAdapter(db);
        expect(adapter.history("allowed-project", "main")).toMatchObject({
            status: "NO_CHECKPOINT_YET",
            authorityClass: "HISTORICAL_ONLY",
            data: { checkpoints: [] },
        });

        seedHistory(db);
        const history = adapter.history("allowed-project", "main");
        expect(history).toMatchObject({ status: "HISTORY", authorityClass: "HISTORICAL_ONLY" });
        expect((history.data?.checkpoints as Array<{ checkpoint: { id: string } }>).map(
            (entry) => entry.checkpoint.id,
        )).toEqual(["cp-1", "cp-2"]);
    });

    it("delegates CURRENT to the G6B U2 resolver and keeps malformed U3 from selecting an older checkpoint", () => {
        const db = createTestDb();
        createInitialLaneCheckpoint(db, {
            id: "cp-1",
            laneId: "lane-a",
            continuity: continuity(),
            openItems: [{
                openItemId: "item-a",
                itemOrdinal: 1,
                summary: "open",
                continuityKind: "ADDED",
            }],
            provenance: "test",
        });
        db.prepare(
            `INSERT INTO coordination_lane_checkpoints
                 (id, lane_id, seq, supersedes_checkpoint_id, continuity_schema_version,
                  continuity_payload_json, provenance, created_at)
             VALUES ('cp-2', 'lane-a', 2, 'cp-1', ?, ?, 'direct', '1999-01-01')`,
        ).run(CHECKPOINT_CONTINUITY_SCHEMA_VERSION, JSON.stringify(continuity("bad-u3")));

        const adapter = new CoordinationReadAdapter(db);
        expect(adapter.current("allowed-project", "main")).toMatchObject({
            status: "CURRENT",
            authorityClass: "CURRENT",
            data: { checkpoint: { id: "cp-2", seq: 2 } },
        });
        expect(adapter.resume("allowed-project", "main")).toMatchObject({
            status: "CHECKPOINT_EVIDENCE_INVALID",
            authorityClass: "NONE",
        });
    });

    it("reports unresolved U2 currentness without timestamp or adapter fallback", () => {
        const db = createTestDb();
        db.exec("DROP TRIGGER trg_coordination_lane_checkpoints_immediate_predecessor");
        db.prepare(
            `INSERT INTO coordination_lane_checkpoints
                 (id, lane_id, seq, supersedes_checkpoint_id, continuity_schema_version,
                  continuity_payload_json, provenance, created_at)
             VALUES ('cp-1', 'lane-a', 1, NULL, ?, ?, 'test', '2099-01-01'),
                    ('cp-3', 'lane-a', 3, 'cp-1', ?, ?, 'test', '2000-01-01')`,
        ).run(
            CHECKPOINT_CONTINUITY_SCHEMA_VERSION,
            JSON.stringify(continuity()),
            CHECKPOINT_CONTINUITY_SCHEMA_VERSION,
            JSON.stringify(continuity()),
        );

        expect(new CoordinationReadAdapter(db).current("allowed-project", "main")).toMatchObject({
            status: "CURRENTNESS_UNRESOLVABLE",
            authorityClass: "NONE",
        });
    });

    it("preserves U2 CURRENT under an unsupported continuity version but fails authoritative resume", () => {
        const db = createTestDb();
        db.prepare(
            `INSERT INTO coordination_lane_checkpoints
                 (id, lane_id, seq, supersedes_checkpoint_id, continuity_schema_version,
                  continuity_payload_json, provenance)
             VALUES ('cp-future', 'lane-a', 1, NULL, 'coordination-future.v2', ?, 'future')`,
        ).run(JSON.stringify(continuity("future")));
        const adapter = new CoordinationReadAdapter(db);

        expect(adapter.current("allowed-project", "main")).toMatchObject({
            status: "CURRENT",
            authorityClass: "CURRENT",
            data: {
                checkpoint: { id: "cp-future" },
                continuityCompatibility: "UNSUPPORTED_VERSION",
            },
        });
        expect(adapter.resume("allowed-project", "main")).toMatchObject({
            status: "UNSUPPORTED_VERSION",
            authorityClass: "NONE",
        });
    });

    it("returns authoritative resume from validated CURRENT with zero canonical mutation", () => {
        const db = createTestDb();
        seedHistory(db);
        const adapter = new CoordinationReadAdapter(db);
        const before = db.prepare("SELECT COUNT(*) AS count FROM coordination_lane_checkpoints").get() as { count: number };

        expect(adapter.resume("allowed-project", "main")).toMatchObject({
            operation: "RESUME",
            status: "RESUMED",
            authorityClass: "AUTHORITATIVE_RESUME",
            data: {
                checkpoint: { id: "cp-2" },
                continuity: { next_exact_action: "second" },
            },
        });
        const after = db.prepare("SELECT COUNT(*) AS count FROM coordination_lane_checkpoints").get() as { count: number };
        expect(after.count).toBe(before.count);
    });

    it("provides stable invalid-argument and unsupported-operation classes for future transports", () => {
        const adapter = new CoordinationReadAdapter(createTestDb());
        expect(adapter.execute({
            operation: "LOOKUP",
            projectSlug: "Allowed Project",
            laneKey: "main",
        })).toMatchObject({ status: "INVALID_ARGUMENT" });
        expect(adapter.execute({
            operation: "WRITE",
            projectSlug: "allowed-project",
            laneKey: "main",
        })).toMatchObject({
            status: "UNSUPPORTED_OPERATION",
            authorityClass: "NONE",
        });
    });
});
