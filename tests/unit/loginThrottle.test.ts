// P1E.2 / R1-M1 — login abuse throttling (process-local, deterministic clocks).

import Database from "better-sqlite3";
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { HUMAN_AUTH_SCHEMA_SQL } from "@/lib/human-auth/humanAuthSchema";
import { bootstrapHumanOperator } from "@/lib/human-auth/bootstrap";
import {
    checkLoginThrottle,
    LoginThrottle,
    recordLoginFailure,
    resetLoginThrottle,
} from "@/lib/human-auth/loginThrottle";

const { mockGetDb } = vi.hoisted(() => ({ mockGetDb: vi.fn() }));
vi.mock("@/db/db", () => ({ getDb: mockGetDb }));

import { POST as loginRoute } from "@/app/api/human-auth/login/route";

const ORIGIN = "http://localhost:3000";
const TEST_PASSWORD = "correct-horse-battery-staple";

let db: Database.Database;

beforeEach(() => {
    db = new Database(":memory:");
    db.pragma("foreign_keys = ON");
    db.exec(HUMAN_AUTH_SCHEMA_SQL);
    bootstrapHumanOperator(db, { password: TEST_PASSWORD, displayName: "Owner" });
    mockGetDb.mockReturnValue(db);
    vi.stubEnv("WORKOS_TRUSTED_ORIGINS", ORIGIN);
    resetLoginThrottle();
});

afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
    resetLoginThrottle();
    db.close();
});

function loginRequest(password: string, origin: string | null = ORIGIN): NextRequest {
    const headers: Record<string, string> = { "content-type": "application/json" };
    if (origin !== null) headers.origin = origin;
    return new NextRequest("http://localhost/api/human-auth/login", {
        method: "POST",
        headers,
        body: JSON.stringify({ password }),
    });
}

function sessionCount(): number {
    return (db.prepare("SELECT COUNT(*) AS c FROM human_sessions").get() as { c: number }).c;
}

describe("LoginThrottle unit behavior", () => {
    it("locks after the threshold and enforces retry-after with deterministic time", () => {
        const throttle = new LoginThrottle(3, 10_000, 1_000);
        expect(throttle.status(1000).throttled).toBe(false);
        throttle.recordFailure(1000);
        throttle.recordFailure(2000);
        throttle.recordFailure(3000);
        const locked = throttle.status(3000);
        expect(locked.throttled).toBe(true);
        expect(locked.retryAfterMs).toBeGreaterThan(0);
        expect(throttle.status(3000 + 500).throttled).toBe(true);
        expect(throttle.status(3000 + 1000).throttled).toBe(false);
    });

    it("expires the failure window after the window passes", () => {
        const throttle = new LoginThrottle(3, 10_000, 1_000);
        throttle.recordFailure(1000);
        throttle.recordFailure(2000);
        expect(throttle.status(20_000).failures).toBe(0);
        expect(throttle.status(20_000).throttled).toBe(false);
    });

    it("resets failure state", () => {
        const throttle = new LoginThrottle(2, 10_000, 1_000);
        throttle.recordFailure(1000);
        throttle.recordFailure(2000);
        expect(throttle.status(2500).throttled).toBe(true);
        throttle.reset(4000);
        expect(throttle.status(5000).throttled).toBe(false);
    });
});

describe("login route throttling", () => {
    it("rejects repeated bad passwords then returns 429 with Retry-After", async () => {
        for (let i = 0; i < 5; i += 1) {
            const res = await loginRoute(loginRequest("wrong-password"));
            expect(res.status).toBe(401);
        }
        const throttled = await loginRoute(loginRequest("wrong-password"));
        expect(throttled.status).toBe(429);
        expect(throttled.headers.get("Retry-After")).toBeTruthy();
        expect(sessionCount()).toBe(0);
    });

    it("does not reach session minting while throttled", async () => {
        for (let i = 0; i < 5; i += 1) await loginRoute(loginRequest("wrong-password"));
        const res = await loginRoute(loginRequest(TEST_PASSWORD));
        expect(res.status).toBe(429);
        expect(sessionCount()).toBe(0);
    });

    it("resets failure state on a successful login", async () => {
        for (let i = 0; i < 3; i += 1) await loginRoute(loginRequest("wrong-password"));
        const ok = await loginRoute(loginRequest(TEST_PASSWORD));
        expect(ok.status).toBe(200);
        expect(sessionCount()).toBe(1);

        const afterReset = await loginRoute(loginRequest("wrong-password"));
        expect(afterReset.status).toBe(401);
    });

    it("still rejects foreign or missing Origin before throttling matters", async () => {
        const foreign = await loginRoute(loginRequest(TEST_PASSWORD, "https://evil.example"));
        expect(foreign.status).toBe(403);
        const missing = await loginRoute(loginRequest(TEST_PASSWORD, null));
        expect(missing.status).toBe(403);
        expect(sessionCount()).toBe(0);
    });

    it("keeps generic errors for unknown and wrong credentials (no enumeration)", async () => {
        const unknown = await loginRoute(loginRequest("wrong-password"));
        const wrong = await loginRoute(loginRequest("also-wrong-password"));
        const unknownBody = await unknown.json();
        const wrongBody = await wrong.json();
        expect(unknownBody.error.message).toBe(wrongBody.error.message);
    });
});

describe("throttle module helpers", () => {
    it("exposes deterministic check/record/reset", () => {
        expect(checkLoginThrottle(1).throttled).toBe(false);
        recordLoginFailure(1);
        recordLoginFailure(2);
        expect(checkLoginThrottle(3).throttled).toBe(false);
        resetLoginThrottle(4);
        expect(checkLoginThrottle(5).throttled).toBe(false);
    });
});
