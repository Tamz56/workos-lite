import path from "path";
import Database from "better-sqlite3";
import { afterEach, describe, expect, it } from "vitest";
import { ensureCoordinationSchema } from "@/lib/coordination/schema";
import { ensureCoordinationLaneStateSchema } from "@/lib/coordination/stateSchema";
import {
    appendLaneState,
    CoordinationLaneNotFoundError,
    resolveCurrentLaneState,
    resolveLaneStateHistory,
} from "@/lib/coordination/laneState";

const LIVE_DB_PATH = path.resolve(process.cwd(), "data/workos.db");
const openDatabases: Database.Database[] = [];

function createTestDb(): Database.Database {
    const db = new Database(":memory:");
    openDatabases.push(db);
    expect(path.resolve(db.name)).not.toBe(LIVE_DB_PATH);
    db.pragma("foreign_keys = ON");
    db.exec("CREATE TABLE projects (id TEXT PRIMARY KEY, slug TEXT NOT NULL UNIQUE)");
    ensureCoordinationSchema(db, () => undefined);
    ensureCoordinationLaneStateSchema(db, () => undefined);
    return db;
}

// NOTE: state values below ("alpha", "beta", ...) are arbitrary opaque values.
// The approved Lane lifecycle vocabulary is UNKNOWN/NOT_PROVEN and is not
// represented here.
function seedLane(
    db: Database.Database,
    id: string,
    laneKey: string = "delivery",
    name: string = "Delivery",
): void {
    db.prepare("INSERT OR IGNORE INTO projects (id, slug) VALUES ('project-1', 'project-one')").run();
    db.prepare(`
        INSERT INTO coordination_lanes (id, project_id, lane_key, name)
        VALUES (?, 'project-1', ?, ?)
    `).run(id, laneKey, name);
}

afterEach(() => {
    while (openDatabases.length > 0) openDatabases.pop()?.close();
});

describe("P1-G2A Lane state storage + deterministic currentness", () => {
    it("appends durable records with deterministic per-Lane monotonic seq", () => {
        const db = createTestDb();
        seedLane(db, "lane-1");

        const first = appendLaneState(db, { laneId: "lane-1", state: "alpha", provenance: "test" });
        const second = appendLaneState(db, { laneId: "lane-1", state: "beta", provenance: "test" });

        expect(first).toEqual(expect.objectContaining({ laneId: "lane-1", seq: 1, state: "alpha" }));
        expect(second).toEqual(expect.objectContaining({ laneId: "lane-1", seq: 2, state: "beta" }));
    });

    it("resolves current Lane state deterministically as the highest-seq record", () => {
        const db = createTestDb();
        seedLane(db, "lane-1");
        appendLaneState(db, { laneId: "lane-1", state: "alpha", provenance: "test" });
        appendLaneState(db, { laneId: "lane-1", state: "beta", provenance: "test" });
        appendLaneState(db, { laneId: "lane-1", state: "gamma", provenance: "test" });

        const current = resolveCurrentLaneState(db, "lane-1");
        expect(current).toEqual(
            expect.objectContaining({ laneId: "lane-1", seq: 3, state: "gamma" }),
        );
    });

    it("returns null for a Lane with no durable history", () => {
        const db = createTestDb();
        seedLane(db, "lane-1");
        expect(resolveCurrentLaneState(db, "lane-1")).toBeNull();
    });

    it("keeps Lane state histories isolated per Lane", () => {
        const db = createTestDb();
        seedLane(db, "lane-1", "delivery");
        seedLane(db, "lane-2", "core", "Core");

        appendLaneState(db, { laneId: "lane-1", state: "alpha", provenance: "test" });
        appendLaneState(db, { laneId: "lane-2", state: "alpha", provenance: "test" });
        appendLaneState(db, { laneId: "lane-1", state: "beta", provenance: "test" });

        expect(resolveCurrentLaneState(db, "lane-1")).toEqual(
            expect.objectContaining({ seq: 2, state: "beta" }),
        );
        expect(resolveCurrentLaneState(db, "lane-2")).toEqual(
            expect.objectContaining({ seq: 1, state: "alpha" }),
        );
    });

    it("surfaces provenance and recorded_at explicitly on the current record", () => {
        const db = createTestDb();
        seedLane(db, "lane-1");
        appendLaneState(db, { laneId: "lane-1", state: "alpha", provenance: "workos:human-1" });

        const current = resolveCurrentLaneState(db, "lane-1");
        expect(current?.provenance).toBe("workos:human-1");
        expect(current?.recordedAt).toBeTruthy();
    });

    it("never silently mutates the Lane row (no silent state promotion)", () => {
        const db = createTestDb();
        seedLane(db, "lane-1");
        const laneBefore = db.prepare("SELECT * FROM coordination_lanes WHERE id = 'lane-1'").get();

        appendLaneState(db, { laneId: "lane-1", state: "alpha", provenance: "test" });
        appendLaneState(db, { laneId: "lane-1", state: "beta", provenance: "test" });

        const laneAfter = db.prepare("SELECT * FROM coordination_lanes WHERE id = 'lane-1'").get();
        expect(laneAfter).toEqual(laneBefore);
    });

    it("rejects appending to a Lane that does not exist", () => {
        const db = createTestDb();
        expect(() =>
            appendLaneState(db, { laneId: "missing", state: "alpha", provenance: "test" }),
        ).toThrowError(
            expect.objectContaining<CoordinationLaneNotFoundError>({
                code: "COORDINATION_LANE_NOT_FOUND",
            }),
        );
    });

    it("preserves full durable history in ascending order", () => {
        const db = createTestDb();
        seedLane(db, "lane-1");
        appendLaneState(db, { laneId: "lane-1", state: "alpha", provenance: "test" });
        appendLaneState(db, { laneId: "lane-1", state: "beta", provenance: "test" });
        appendLaneState(db, { laneId: "lane-1", state: "gamma", provenance: "test" });

        const history = resolveLaneStateHistory(db, "lane-1");
        expect(history.map((record) => record.seq)).toEqual([1, 2, 3]);
        expect(history.map((record) => record.state)).toEqual(["alpha", "beta", "gamma"]);
    });

    // P1-G2A-R1-B — sequence authority proofs
    it("never lets a caller supply or promote seq through the primitive", () => {
        const db = createTestDb();
        seedLane(db, "lane-1");

        for (let i = 0; i < 5; i++) {
            const record = appendLaneState(db, {
                laneId: "lane-1",
                state: `opaque-${i}`,
                provenance: "test",
            });
            expect(record.seq).toBe(i + 1);
        }
        const history = resolveLaneStateHistory(db, "lane-1");
        expect(history.map((record) => record.seq)).toEqual([1, 2, 3, 4, 5]);

        // A caller cannot rewrite an existing record's seq to promote it.
        expect(() =>
            db.prepare(
                "UPDATE coordination_lane_state_history SET seq = 999 WHERE lane_id = ? AND seq = 1",
            ).run("lane-1"),
        ).toThrow(/append-only/);
    });

    it("makes duplicate (lane_id, seq) appends fail visibly", () => {
        const db = createTestDb();
        seedLane(db, "lane-1");
        appendLaneState(db, { laneId: "lane-1", state: "alpha", provenance: "test" });

        expect(() =>
            db.prepare(`
                INSERT INTO coordination_lane_state_history (lane_id, seq, state, provenance)
                VALUES ('lane-1', 1, 'beta', 'test')
            `).run(),
        ).toThrow(/UNIQUE|PRIMARY KEY/);

        expect(resolveLaneStateHistory(db, "lane-1")).toHaveLength(1);
    });
});
