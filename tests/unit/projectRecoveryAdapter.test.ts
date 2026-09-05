import path from "path";
import Database from "better-sqlite3";
import { afterEach, describe, expect, it } from "vitest";
import {
    createInitialLaneCheckpoint,
    type CoordinationCheckpointContinuityPayload,
} from "@/lib/coordination/checkpoint";
import { ensureCoordinationCheckpointSchema } from "@/lib/coordination/checkpointSchema";
import { ProjectRecoveryAdapter } from "@/lib/coordination/projectRecoveryAdapter";
import { ensureCoordinationSchema } from "@/lib/coordination/schema";

const LIVE_DB_PATH = path.resolve(process.cwd(), "data/workos.db");
const openDatabases: Database.Database[] = [];

const PROJECT_PROVENANCE = {
    source: "projects",
    authorityClass: "PROJECT_IDENTITY",
    currentness: "RESOLVED_AT_REQUEST",
} as const;

const LANE_PROVENANCE = {
    source: "coordination_lanes",
    authorityClass: "COORDINATION_BINDING",
    currentness: "RESOLVED_AT_REQUEST",
} as const;

const PROJECT_STATE_NOT_PROVEN = {
    value: null,
    source: null,
    authorityClass: "NONE",
    currentness: "NOT_PROVEN",
} as const;

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
    db.exec("CREATE TABLE projects (id TEXT PRIMARY KEY, slug TEXT NOT NULL UNIQUE, name TEXT NOT NULL)");
    ensureCoordinationSchema(db, () => undefined);
    ensureCoordinationCheckpointSchema(db, () => undefined);
    db.exec(`
        INSERT INTO projects (id, slug, name) VALUES
            ('project-1', 'allowed-project', 'Allowed Project'),
            ('project-2', 'multi-lane-project', 'Multi Lane Project'),
            ('project-3', 'no-lane-project', 'No Lane Project');
    `);
    return db;
}

function checkpointCount(db: Database.Database): number {
    return (db.prepare("SELECT COUNT(*) AS count FROM coordination_lane_checkpoints").get() as { count: number }).count;
}

afterEach(() => {
    while (openDatabases.length > 0) openDatabases.pop()?.close();
});

describe("ProjectRecoveryAdapter", () => {
    it("rejects a non-canonical project slug with null identity provenance and NOT_PROVEN Project State", () => {
        const db = createTestDb();
        const result = new ProjectRecoveryAdapter(db).recover("Allowed Project");
        expect(result).toMatchObject({
            schemaVersion: "project-recovery.v1",
            operation: "PROJECT_RECOVERY",
            status: "INVALID_ARGUMENT",
            projectSlug: "Allowed Project",
            projectId: null,
        });
        expect(result.project).toEqual({ value: null, ...PROJECT_PROVENANCE });
        expect(result.lane).toEqual({ value: null, ...LANE_PROVENANCE });
        expect(result.projectState).toEqual(PROJECT_STATE_NOT_PROVEN);
    });

    it("returns PROJECT_NOT_FOUND with null project identity and NOT_PROVEN Project State", () => {
        const db = createTestDb();
        const result = new ProjectRecoveryAdapter(db).recover("missing-project");
        expect(result).toMatchObject({
            status: "PROJECT_NOT_FOUND",
            projectSlug: "missing-project",
            projectId: null,
        });
        expect(result.project).toEqual({ value: null, ...PROJECT_PROVENANCE });
        expect(result.projectState).toEqual(PROJECT_STATE_NOT_PROVEN);
    });

    it("returns NO_RECOVERY_LANE with exact Project identity and no Lane binding", () => {
        const db = createTestDb();
        const result = new ProjectRecoveryAdapter(db).recover("no-lane-project");
        expect(result).toMatchObject({
            status: "NO_RECOVERY_LANE",
            projectSlug: "no-lane-project",
            projectId: "project-3",
        });
        expect(result.project).toEqual({
            value: { projectId: "project-3", projectSlug: "no-lane-project", projectName: "No Lane Project" },
            ...PROJECT_PROVENANCE,
        });
        expect(result.lane).toEqual({ value: null, ...LANE_PROVENANCE });
        expect(result.projectState).toEqual(PROJECT_STATE_NOT_PROVEN);
        expect(result.coordinationResume).toBeUndefined();
        expect(result.candidates).toBeUndefined();
    });

    it("delegates the single Lane to authoritative resume: exact provenance, VALIDATED_CURRENT_ONLY, continuity nested", () => {
        const db = createTestDb();
        db.exec(`INSERT INTO coordination_lanes (id, project_id, lane_key, name)
                 VALUES ('lane-a', 'project-1', 'main', 'Main')`);
        createInitialLaneCheckpoint(db, {
            id: "cp-1",
            laneId: "lane-a",
            continuity: continuity("continue-here"),
            openItems: [],
            provenance: "test-provenance",
        });
        const before = checkpointCount(db);
        const result = new ProjectRecoveryAdapter(db).recover("allowed-project");

        expect(result).toMatchObject({
            status: "RECOVERED",
            projectSlug: "allowed-project",
            projectId: "project-1",
        });
        // Project provenance exact.
        expect(result.project).toEqual({
            value: { projectId: "project-1", projectSlug: "allowed-project", projectName: "Allowed Project" },
            ...PROJECT_PROVENANCE,
        });
        // Lane provenance exact.
        expect(result.lane).toEqual({
            value: { laneId: "lane-a", laneKey: "main", laneName: "Main" },
            ...LANE_PROVENANCE,
        });
        // Successful resume: wrapped, VALIDATED_CURRENT_ONLY, exact inner resume preserved.
        expect(result.coordinationResume).toMatchObject({
            source: "CoordinationReadAdapter.resume",
            authorityClass: "AUTHORITATIVE_RESUME",
            currentness: "VALIDATED_CURRENT_ONLY",
            value: {
                operation: "RESUME",
                status: "RESUMED",
                authorityClass: "AUTHORITATIVE_RESUME",
                identity: { projectSlug: "allowed-project", laneKey: "main", laneId: "lane-a" },
                data: {
                    checkpoint: { id: "cp-1", provenance: "test-provenance" },
                    continuity: { next_exact_action: "continue-here" },
                },
            },
        });
        // continuity is NOT promoted to the Project State or top level.
        expect(result.continuity).toBeUndefined();
        expect(result.projectState).toEqual(PROJECT_STATE_NOT_PROVEN);
        expect(result.candidates).toBeUndefined();
        expect(checkpointCount(db)).toBe(before);
    });

    it("preserves failed Resume authorityClass/status with currentness NOT_PROVEN", () => {
        const db = createTestDb();
        db.exec(`INSERT INTO coordination_lanes (id, project_id, lane_key, name)
                 VALUES ('lane-a', 'project-1', 'main', 'Main')`);
        const result = new ProjectRecoveryAdapter(db).recover("allowed-project");
        expect(result).toMatchObject({
            status: "NO_CHECKPOINT_YET",
            projectId: "project-1",
        });
        expect(result.lane).toEqual({
            value: { laneId: "lane-a", laneKey: "main", laneName: "Main" },
            ...LANE_PROVENANCE,
        });
        expect(result.coordinationResume).toMatchObject({
            source: "CoordinationReadAdapter.resume",
            authorityClass: "NONE",
            currentness: "NOT_PROVEN",
            value: {
                status: "NO_CHECKPOINT_YET",
                authorityClass: "NONE",
            },
        });
        expect(result.projectState).toEqual(PROJECT_STATE_NOT_PROVEN);
    });

    it("returns AMBIGUOUS_LANE with deterministic lane_key ASC candidates, Project identity present, no resume", () => {
        const db = createTestDb();
        // Insert in non-sorted order to prove ordering is by lane_key ASC only.
        db.exec(`
            INSERT INTO coordination_lanes (id, project_id, lane_key, name) VALUES
                ('lane-z', 'project-2', 'z-lane', 'Z'),
                ('lane-a', 'project-2', 'alpha', 'Alpha'),
                ('lane-m', 'project-2', 'bravo', 'Bravo');
        `);
        const result = new ProjectRecoveryAdapter(db).recover("multi-lane-project");
        expect(result).toMatchObject({
            status: "AMBIGUOUS_LANE",
            projectSlug: "multi-lane-project",
            projectId: "project-2",
        });
        expect(result.project).toEqual({
            value: { projectId: "project-2", projectSlug: "multi-lane-project", projectName: "Multi Lane Project" },
            ...PROJECT_PROVENANCE,
        });
        expect(result.lane).toEqual({ value: null, ...LANE_PROVENANCE });
        expect(result.candidates?.map((candidate) => candidate.laneKey)).toEqual(["alpha", "bravo", "z-lane"]);
        expect(result.coordinationResume).toBeUndefined();
        expect(result.projectState).toEqual(PROJECT_STATE_NOT_PROVEN);
    });
});
