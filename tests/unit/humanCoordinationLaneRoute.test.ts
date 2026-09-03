import Database from "better-sqlite3";
import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ensureCoordinationCheckpointSchema } from "@/lib/coordination/checkpointSchema";
import { ensureCoordinationSchema } from "@/lib/coordination/schema";
import { HUMAN_AUTH_SCHEMA_SQL } from "@/lib/human-auth/humanAuthSchema";
import { createHumanSession, SESSION_COOKIE_NAME } from "@/lib/human-auth/session";

const { mockGetDb } = vi.hoisted(() => ({
    mockGetDb: vi.fn(),
}));

vi.mock("@/db/db", () => ({
    getDb: mockGetDb,
}));

import { POST } from "@/app/api/human/coordination/lanes/route";

const ORIGIN = "http://localhost:3000";
const OTHER_ORIGIN = "http://example.invalid";

afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
});

function createDb(): Database.Database {
    const db = new Database(":memory:");
    db.pragma("foreign_keys = ON");
    db.exec(HUMAN_AUTH_SCHEMA_SQL);
    db.exec(
        "CREATE TABLE projects (id TEXT PRIMARY KEY, slug TEXT NOT NULL UNIQUE)",
    );
    ensureCoordinationSchema(db, () => undefined);
    ensureCoordinationCheckpointSchema(db, () => undefined);
    db.exec(`
        INSERT INTO projects (id, slug) VALUES
            ('project-a', 'project-a');
    `);
    return db;
}

function seedSession(db: Database.Database): string {
    db.prepare(`
        INSERT INTO human_operators (
            id,
            display_name,
            credential_hash,
            enabled,
            created_at,
            updated_at
        ) VALUES (?, ?, ?, 1, ?, ?)
    `).run(
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
        name: "Main",
        ...overrides,
    };
}

function request(
    body: unknown,
    token?: string,
    origin = ORIGIN,
): NextRequest {
    const headers: Record<string, string> = {
        "content-type": "application/json",
        origin,
    };

    if (token) {
        headers.cookie = `${SESSION_COOKIE_NAME}=${token}`;
    }

    return new NextRequest(
        "http://localhost/api/human/coordination/lanes",
        {
            method: "POST",
            headers,
            body: JSON.stringify(body),
        },
    );
}

function laneCount(db: Database.Database): number {
    return (
        db.prepare(
            "SELECT COUNT(*) AS count FROM coordination_lanes",
        ).get() as { count: number }
    ).count;
}

describe("Human Coordination Lane creation route", () => {
    it("rejects unauthenticated mutation before Lane creation", async () => {
        const db = createDb();
        mockGetDb.mockReturnValue(db);
        vi.stubEnv("WORKOS_TRUSTED_ORIGINS", ORIGIN);

        const response = await POST(request(payload()));

        expect(response.status).toBe(401);
        expect(laneCount(db)).toBe(0);

        db.close();
    });

    it("rejects an authenticated mutation from an untrusted Origin", async () => {
        const db = createDb();
        mockGetDb.mockReturnValue(db);
        vi.stubEnv("WORKOS_TRUSTED_ORIGINS", ORIGIN);
        const token = seedSession(db);

        const response = await POST(
            request(payload(), token, OTHER_ORIGIN),
        );

        expect(response.status).toBe(403);
        expect(laneCount(db)).toBe(0);

        db.close();
    });

    it("creates one Lane for an authenticated Human through the trusted Origin", async () => {
        const db = createDb();
        mockGetDb.mockReturnValue(db);
        vi.stubEnv("WORKOS_TRUSTED_ORIGINS", ORIGIN);
        const token = seedSession(db);

        const response = await POST(request(payload(), token));
        const body = await response.json();

        expect(response.status).toBe(201);
        expect(body).toMatchObject({
            ok: true,
            lane: {
                projectSlug: "project-a",
                laneKey: "main",
                name: "Main",
            },
        });
        expect(body.lane.laneId).toMatch(/^lane-[0-9a-f-]{36}$/);

        expect(laneCount(db)).toBe(1);
        expect(
            db.prepare(
                "SELECT project_id, lane_key, name FROM coordination_lanes",
            ).get(),
        ).toEqual({
            project_id: "project-a",
            lane_key: "main",
            name: "Main",
        });
        expect(
            db.prepare(
                "SELECT COUNT(*) AS count FROM coordination_lane_checkpoints",
            ).get(),
        ).toEqual({ count: 0 });

        db.close();
    });

    it("rejects caller-supplied projectId/laneId/id before durable creation", async () => {
        for (const invalidBody of [
            payload({ projectId: "project-a" }),
            payload({ laneId: "lane-controlled" }),
            payload({ id: "lane-controlled" }),
        ]) {
            const db = createDb();
            mockGetDb.mockReturnValue(db);
            vi.stubEnv("WORKOS_TRUSTED_ORIGINS", ORIGIN);
            const token = seedSession(db);

            const response = await POST(request(invalidBody, token));

            expect(response.status).toBe(400);
            expect(laneCount(db)).toBe(0);

            db.close();
        }
    });

    it("returns 404 for an unknown Project with zero Lane mutation", async () => {
        const db = createDb();
        mockGetDb.mockReturnValue(db);
        vi.stubEnv("WORKOS_TRUSTED_ORIGINS", ORIGIN);
        const token = seedSession(db);

        const response = await POST(
            request(
                payload({ projectSlug: "missing-project" }),
                token,
            ),
        );

        expect(response.status).toBe(404);
        expect(laneCount(db)).toBe(0);

        db.close();
    });

    it("returns 409 for a duplicate Lane identity and preserves the existing row", async () => {
        const db = createDb();
        mockGetDb.mockReturnValue(db);
        vi.stubEnv("WORKOS_TRUSTED_ORIGINS", ORIGIN);
        const token = seedSession(db);

        const first = await POST(request(payload(), token));
        expect(first.status).toBe(201);

        const existing = db.prepare(
            "SELECT id, name FROM coordination_lanes WHERE project_id = 'project-a' AND lane_key = 'main'",
        ).get();

        const duplicate = await POST(
            request(payload({ name: "Replacement" }), token),
        );

        expect(duplicate.status).toBe(409);
        expect(laneCount(db)).toBe(1);
        expect(
            db.prepare(
                "SELECT id, name FROM coordination_lanes WHERE project_id = 'project-a' AND lane_key = 'main'",
            ).get(),
        ).toEqual(existing);

        expect(
            db.prepare(
                "SELECT COUNT(*) AS count FROM coordination_lane_checkpoints",
            ).get(),
        ).toEqual({ count: 0 });

        db.close();
    });
});
