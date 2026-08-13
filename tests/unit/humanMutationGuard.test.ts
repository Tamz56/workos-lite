import { afterEach, describe, expect, it, vi } from "vitest";
import {
    createHumanAuthDb,
    createTestH2Session,
    humanMutationRequest,
    seedHumanOperator,
    TRUSTED_ORIGIN,
    FOREIGN_ORIGIN,
} from "../helpers/humanSession";
import { requireHumanMutation } from "@/lib/human-auth/mutationGuard";
import { HumanAuthError, toHumanAuthError } from "@/lib/human-auth/errors";

const { mockGetDb } = vi.hoisted(() => ({ mockGetDb: vi.fn() }));
vi.mock("@/db/db", () => ({ getDb: mockGetDb }));

const GUARD_URL = "http://localhost/api/tasks";

afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
});

function stubTrustedOrigin(): void {
    vi.stubEnv("WORKOS_TRUSTED_ORIGINS", TRUSTED_ORIGIN);
}

describe("requireHumanMutation", () => {
    it("throws 401 HUMAN_AUTH_SESSION_INVALID with no session", () => {
        stubTrustedOrigin();
        const db = createHumanAuthDb();
        mockGetDb.mockReturnValue(db);

        const req = humanMutationRequest(GUARD_URL, { origin: TRUSTED_ORIGIN });
        expect(() => requireHumanMutation(req)).toThrowError(HumanAuthError);
        try {
            requireHumanMutation(req);
        } catch (error) {
            expect(toHumanAuthError(error)).toEqual({
                code: "HUMAN_AUTH_SESSION_INVALID",
                message: "Human authentication required",
                status: 401,
            });
        }
    });

    it("throws 401 for an invalid/stale (unknown) cookie", () => {
        stubTrustedOrigin();
        const db = createHumanAuthDb();
        mockGetDb.mockReturnValue(db);

        const req = humanMutationRequest(GUARD_URL, {
            cookieHeader: "workos_human_session=forged-token",
            origin: TRUSTED_ORIGIN,
        });
        try {
            requireHumanMutation(req);
            expect.unreachable("guard should reject forged cookie");
        } catch (error) {
            expect(toHumanAuthError(error).status).toBe(401);
        }
    });

    it("throws 401 for a revoked session", () => {
        stubTrustedOrigin();
        const db = createHumanAuthDb();
        const operatorId = seedHumanOperator(db);
        const session = createTestH2Session(db, operatorId, { revoke: true });
        mockGetDb.mockReturnValue(db);

        const req = humanMutationRequest(GUARD_URL, {
            cookieHeader: session.cookieHeader,
            origin: TRUSTED_ORIGIN,
        });
        try {
            requireHumanMutation(req);
            expect.unreachable("guard should reject revoked session");
        } catch (error) {
            expect(toHumanAuthError(error).status).toBe(401);
        }
    });

    it("throws 401 for an expired session", () => {
        stubTrustedOrigin();
        const db = createHumanAuthDb();
        const operatorId = seedHumanOperator(db);
        const session = createTestH2Session(db, operatorId, { expired: true });
        mockGetDb.mockReturnValue(db);

        const req = humanMutationRequest(GUARD_URL, {
            cookieHeader: session.cookieHeader,
            origin: TRUSTED_ORIGIN,
        });
        try {
            requireHumanMutation(req);
            expect.unreachable("guard should reject expired session");
        } catch (error) {
            expect(toHumanAuthError(error).status).toBe(401);
        }
    });

    it("throws 403 HUMAN_AUTH_CSRF_REJECTED for valid session + missing origin", () => {
        stubTrustedOrigin();
        const db = createHumanAuthDb();
        const operatorId = seedHumanOperator(db);
        const session = createTestH2Session(db, operatorId);
        mockGetDb.mockReturnValue(db);

        const req = humanMutationRequest(GUARD_URL, {
            cookieHeader: session.cookieHeader,
            origin: null,
        });
        try {
            requireHumanMutation(req);
            expect.unreachable("guard should reject missing origin");
        } catch (error) {
            expect(toHumanAuthError(error)).toMatchObject({
                code: "HUMAN_AUTH_CSRF_REJECTED",
                status: 403,
            });
        }
    });

    it("throws 403 HUMAN_AUTH_CSRF_REJECTED for valid session + foreign origin", () => {
        stubTrustedOrigin();
        const db = createHumanAuthDb();
        const operatorId = seedHumanOperator(db);
        const session = createTestH2Session(db, operatorId);
        mockGetDb.mockReturnValue(db);

        const req = humanMutationRequest(GUARD_URL, {
            cookieHeader: session.cookieHeader,
            origin: FOREIGN_ORIGIN,
        });
        try {
            requireHumanMutation(req);
            expect.unreachable("guard should reject foreign origin");
        } catch (error) {
            expect(toHumanAuthError(error)).toMatchObject({
                code: "HUMAN_AUTH_CSRF_REJECTED",
                status: 403,
            });
        }
    });

    it("returns the authenticated human for valid session + trusted origin", () => {
        stubTrustedOrigin();
        const db = createHumanAuthDb();
        const operatorId = seedHumanOperator(db);
        const session = createTestH2Session(db, operatorId);
        mockGetDb.mockReturnValue(db);

        const req = humanMutationRequest(GUARD_URL, {
            cookieHeader: session.cookieHeader,
            origin: TRUSTED_ORIGIN,
        });
        const human = requireHumanMutation(req);
        expect(human).toEqual({
            operatorId,
            displayName: "Test Owner",
            actorType: "human",
        });
    });

    it("performs no domain mutation while checking authority", () => {
        stubTrustedOrigin();
        const db = createHumanAuthDb();
        db.exec(
            "CREATE TABLE tasks (id TEXT PRIMARY KEY, title TEXT NOT NULL);" +
                "INSERT INTO tasks (id, title) VALUES ('t1', 'keep me');",
        );
        const operatorId = seedHumanOperator(db);
        const session = createTestH2Session(db, operatorId);
        mockGetDb.mockReturnValue(db);

        const before = db.prepare("SELECT COUNT(*) AS c FROM tasks").get() as { c: number };
        const req = humanMutationRequest(GUARD_URL, {
            cookieHeader: session.cookieHeader,
            origin: TRUSTED_ORIGIN,
        });
        requireHumanMutation(req);
        const after = db.prepare("SELECT COUNT(*) AS c FROM tasks").get() as { c: number };
        expect(before.c).toBe(1);
        expect(after.c).toBe(1);
    });
});
