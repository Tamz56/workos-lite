import Database from "better-sqlite3";
import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";

import { createInitialLaneCheckpoint } from "@/lib/coordination/checkpoint";
import { ensureCoordinationCheckpointSchema } from "@/lib/coordination/checkpointSchema";
import { ensureCoordinationSchema } from "@/lib/coordination/schema";
import { HUMAN_AUTH_SCHEMA_SQL } from "@/lib/human-auth/humanAuthSchema";
import { createHumanSession, SESSION_COOKIE_NAME } from "@/lib/human-auth/session";

const { mockGetDb } = vi.hoisted(() => ({ mockGetDb: vi.fn() }));

vi.mock("@/db/db", () => ({ getDb: mockGetDb }));

import { POST } from "@/app/api/human/coordination/checkpoints/successor/route";

const ORIGIN = "http://localhost:3000";

afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
});

function createDb(): Database.Database {
    const db = new Database(":memory:");
    db.pragma("foreign_keys = ON");
    db.exec(HUMAN_AUTH_SCHEMA_SQL);
    db.exec("CREATE TABLE projects (id TEXT PRIMARY KEY, slug TEXT NOT NULL UNIQUE)");
    ensureCoordinationSchema(db, () => undefined);
    ensureCoordinationCheckpointSchema(db, () => undefined);

    db.exec(`
        INSERT INTO projects (id, slug) VALUES ('project-a', 'project-a');
        INSERT INTO coordination_lanes (id, project_id, lane_key, name)
        VALUES ('lane-a', 'project-a', 'main', 'Main');
    `);

    createInitialLaneCheckpoint(db, {
        id: "cp-1",
        laneId: "lane-a",
        continuity: {
            blocker: null,
            cross_lane_pending: [],
            do_not_reopen: [],
            next_exact_action: "continue",
        },
        openItems: [],
        provenance: "human:route-seed",
    });

    return db;
}

function seedSession(db: Database.Database): string {
    db.prepare(
        "INSERT INTO human_operators (id, display_name, credential_hash, enabled, created_at, updated_at) VALUES (?, ?, ?, 1, ?, ?)",
    ).run(
        "human-1",
        "Owner",
        "hash",
        "2026-01-01",
        "2026-01-01",
    );

    return createHumanSession(db, "human-1").token;
}

function payload(overrides: Record<string, unknown> = {}) {
    return {
        projectSlug: "project-a",
        laneKey: "main",
        id: "cp-2",
        expectedPredecessorCheckpointId: "cp-1",
        continuity: {
            blocker: null,
            cross_lane_pending: [],
            do_not_reopen: [],
            next_exact_action: "continue",
        },
        openItems: [],
        openItemExits: [],
        provenance: "human:successor-route-test",
        ...overrides,
    };
}

function request(body: unknown, token?: string): NextRequest {
    const headers: Record<string, string> = {
        "content-type": "application/json",
        origin: ORIGIN,
    };

    if (token) {
        headers.cookie = `${SESSION_COOKIE_NAME}=${token}`;
    }

    return new NextRequest(
        "http://localhost/api/human/coordination/checkpoints/successor",
        {
            method: "POST",
            headers,
            body: JSON.stringify(body),
        },
    );
}

describe("Human successor coordination checkpoint route", () => {
    it("rejects unauthenticated mutation before successor creation", async () => {
        const db = createDb();
        mockGetDb.mockReturnValue(db);
        vi.stubEnv("WORKOS_TRUSTED_ORIGINS", ORIGIN);

        const response = await POST(request(payload()));

        expect(response.status).toBe(401);
        expect(
            db.prepare(
                "SELECT COUNT(*) AS count FROM coordination_lane_checkpoints",
            ).get(),
        ).toEqual({ count: 1 });

        db.close();
    });

    it("rejects caller-supplied laneId and creates a valid successor through the governed writer", async () => {
        const db = createDb();
        mockGetDb.mockReturnValue(db);
        vi.stubEnv("WORKOS_TRUSTED_ORIGINS", ORIGIN);
        const token = seedSession(db);

        const invalid = await POST(
            request(payload({ laneId: "lane-a" }), token),
        );

        expect(invalid.status).toBe(400);
        expect(
            db.prepare(
                "SELECT COUNT(*) AS count FROM coordination_lane_checkpoints",
            ).get(),
        ).toEqual({ count: 1 });

        const valid = await POST(request(payload(), token));

        expect(valid.status).toBe(201);
        expect(await valid.json()).toMatchObject({
            ok: true,
            checkpoint: {
                checkpoint: {
                    id: "cp-2",
                    laneId: "lane-a",
                    seq: 2,
                    supersedesCheckpointId: "cp-1",
                },
            },
        });

        db.close();
    });

    it("returns conflict for a stale expected predecessor and leaves lineage unchanged", async () => {
        const db = createDb();
        mockGetDb.mockReturnValue(db);
        vi.stubEnv("WORKOS_TRUSTED_ORIGINS", ORIGIN);
        const token = seedSession(db);

        const stale = await POST(
            request(
                payload({
                    expectedPredecessorCheckpointId: "cp-stale",
                }),
                token,
            ),
        );

        expect(stale.status).toBe(409);
        expect(await stale.json()).toMatchObject({
            ok: false,
            error: {
                code: "COORDINATION_CHECKPOINT_STALE_SUCCESSOR",
            },
        });

        expect(
            db.prepare(
                "SELECT COUNT(*) AS count FROM coordination_lane_checkpoints",
            ).get(),
        ).toEqual({ count: 1 });

        db.close();
    });
});
