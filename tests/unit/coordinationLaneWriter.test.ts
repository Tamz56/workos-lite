import Database from "better-sqlite3";
import { describe, expect, it } from "vitest";

import { ensureCoordinationCheckpointSchema } from "@/lib/coordination/checkpointSchema";
import {
    CoordinationLaneWriterError,
    createGovernedCoordinationLane,
    parseGovernedCoordinationLaneRequest,
} from "@/lib/coordination/laneWriter";
import { ensureCoordinationSchema } from "@/lib/coordination/schema";

const UUID_A = "11111111-1111-4111-8111-111111111111";
const UUID_B = "22222222-2222-4222-8222-222222222222";

function createDb(): Database.Database {
    const db = new Database(":memory:");
    db.pragma("foreign_keys = ON");
    db.exec(
        "CREATE TABLE projects (id TEXT PRIMARY KEY, slug TEXT NOT NULL UNIQUE)",
    );
    ensureCoordinationSchema(db, () => undefined);
    ensureCoordinationCheckpointSchema(db, () => undefined);
    db.exec(`
        INSERT INTO projects (id, slug) VALUES
            ('project-a', 'project-a'),
            ('project-b', 'project-b');
    `);
    return db;
}

function totalChanges(db: Database.Database): number {
    return (
        db.prepare("SELECT total_changes() AS count").get() as { count: number }
    ).count;
}

function request(overrides: Record<string, unknown> = {}) {
    return {
        projectSlug: "project-a",
        laneKey: "main",
        name: "Main",
        ...overrides,
    };
}

function expectWriterError(
    fn: () => unknown,
    expected: Partial<CoordinationLaneWriterError>,
): void {
    try {
        fn();
        throw new Error("expected CoordinationLaneWriterError");
    } catch (error) {
        expect(error).toBeInstanceOf(CoordinationLaneWriterError);
        expect(error).toMatchObject(expected);
    }
}

describe("governed Coordination Lane writer", () => {
    it("creates exactly one canonical Lane bound to the server-resolved Project", () => {
        const db = createDb();
        const before = totalChanges(db);

        const created = createGovernedCoordinationLane(
            db,
            request(),
            { randomUUID: () => UUID_A },
        );

        expect(created).toEqual({
            projectSlug: "project-a",
            laneKey: "main",
            laneId: `lane-${UUID_A}`,
            name: "Main",
        });

        expect(
            db.prepare(`
                SELECT id, project_id, lane_key, name
                FROM coordination_lanes
            `).all(),
        ).toEqual([
            {
                id: `lane-${UUID_A}`,
                project_id: "project-a",
                lane_key: "main",
                name: "Main",
            },
        ]);

        expect(totalChanges(db) - before).toBe(1);
        expect(
            db.prepare(
                "SELECT COUNT(*) AS count FROM coordination_lane_checkpoints",
            ).get(),
        ).toEqual({ count: 0 });

        db.close();
    });

    it("validates canonical projectSlug/laneKey without normalization or derivation", () => {
        for (const invalid of [
            request({ projectSlug: "Project-A" }),
            request({ projectSlug: " project-a " }),
            request({ laneKey: "Main" }),
            request({ laneKey: "main lane" }),
            request({ laneKey: " main " }),
        ]) {
            expectWriterError(
                () => parseGovernedCoordinationLaneRequest(invalid),
                {
                    code: "COORDINATION_LANE_WRITER_INVALID",
                    status: 400,
                },
            );
        }

        const preserved = parseGovernedCoordinationLaneRequest(
            request({ laneKey: "human-key", name: " Human Name " }),
        );

        expect(preserved).toEqual({
            projectSlug: "project-a",
            laneKey: "human-key",
            name: " Human Name ",
        });
    });

    it("rejects empty name and caller-controlled canonical identity fields", () => {
        for (const invalid of [
            request({ name: "" }),
            request({ name: "   " }),
            request({ projectId: "project-a" }),
            request({ laneId: "lane-controlled" }),
            request({ id: "lane-controlled" }),
            request({ createdAt: "2026-01-01" }),
            request({ checkpoint: {} }),
        ]) {
            expectWriterError(
                () => parseGovernedCoordinationLaneRequest(invalid),
                {
                    code: "COORDINATION_LANE_WRITER_INVALID",
                    status: 400,
                },
            );
        }
    });

    it("fails closed for an unknown canonical Project with zero Lane mutation", () => {
        const db = createDb();
        const before = totalChanges(db);

        expectWriterError(
            () =>
                createGovernedCoordinationLane(
                    db,
                    request({ projectSlug: "missing-project" }),
                    { randomUUID: () => UUID_A },
                ),
            {
                code: "COORDINATION_PROJECT_NOT_FOUND",
                status: 404,
            },
        );

        expect(totalChanges(db)).toBe(before);
        expect(
            db.prepare("SELECT COUNT(*) AS count FROM coordination_lanes").get(),
        ).toEqual({ count: 0 });

        db.close();
    });

    it("rejects duplicate project-scoped laneKey and leaves the existing Lane unchanged", () => {
        const db = createDb();

        createGovernedCoordinationLane(
            db,
            request(),
            { randomUUID: () => UUID_A },
        );

        const before = totalChanges(db);

        expectWriterError(
            () =>
                createGovernedCoordinationLane(
                    db,
                    request({ name: "Replacement Name" }),
                    { randomUUID: () => UUID_B },
                ),
            {
                code: "COORDINATION_LANE_CONFLICT",
                status: 409,
            },
        );

        expect(totalChanges(db)).toBe(before);
        expect(
            db.prepare(
                "SELECT id, name FROM coordination_lanes WHERE project_id = 'project-a' AND lane_key = 'main'",
            ).get(),
        ).toEqual({
            id: `lane-${UUID_A}`,
            name: "Main",
        });

        db.close();
    });

    it("allows the same laneKey on another Project because identity is Project-scoped", () => {
        const db = createDb();

        const first = createGovernedCoordinationLane(
            db,
            request(),
            { randomUUID: () => UUID_A },
        );

        const second = createGovernedCoordinationLane(
            db,
            request({
                projectSlug: "project-b",
                name: "Project B Main",
            }),
            { randomUUID: () => UUID_B },
        );

        expect(first.laneKey).toBe("main");
        expect(second.laneKey).toBe("main");

        expect(
            db.prepare(`
                SELECT project_id, lane_key
                FROM coordination_lanes
                ORDER BY project_id
            `).all(),
        ).toEqual([
            { project_id: "project-a", lane_key: "main" },
            { project_id: "project-b", lane_key: "main" },
        ]);

        db.close();
    });
});
