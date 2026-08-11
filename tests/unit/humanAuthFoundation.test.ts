import Database from "better-sqlite3";
import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
    HUMAN_AUTH_SCHEMA_SQL,
    ensureHumanAuthSchema,
} from "@/lib/human-auth/humanAuthSchema";
import {
    hashPassword,
    verifyPassword,
} from "@/lib/human-auth/password";
import {
    SESSION_COOKIE_NAME,
    createHumanSession,
    resolveHumanSession,
    revokeHumanSession,
    sha256Hex,
} from "@/lib/human-auth/session";
import {
    bootstrapHumanOperator,
    resetHumanOperator,
} from "@/lib/human-auth/bootstrap";
import {
    assertTrustedHumanOrigin,
    getAuthenticatedHuman,
    trustedOrigins,
} from "@/lib/human-auth/authorization";

const { mockGetDb } = vi.hoisted(() => ({ mockGetDb: vi.fn() }));
vi.mock("@/db/db", () => ({ getDb: mockGetDb }));

import { POST as loginRoute } from "@/app/api/human-auth/login/route";
import { POST as logoutRoute } from "@/app/api/human-auth/logout/route";
import { GET as sessionRoute } from "@/app/api/human-auth/session/route";
import { POST as agentLoginRoute } from "@/app/api/agent/login/route";

const TEST_PASSWORD = "correct-horse-battery-staple";
const LOCAL_ORIGIN = "http://localhost:3000";

afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
});

function createHumanDb(): Database.Database {
    const db = new Database(":memory:");
    db.pragma("foreign_keys = ON");
    db.exec(HUMAN_AUTH_SCHEMA_SQL);
    return db;
}

function seedOperator(db: Database.Database, password = TEST_PASSWORD, displayName = "Test Owner"): string {
    const result = bootstrapHumanOperator(db, {
        password,
        displayName,
        now: "2026-08-10T09:00:00.000Z",
    });
    return result.operatorId;
}

function createBusinessTables(db: Database.Database): void {
    db.exec(`
        CREATE TABLE projects (id TEXT PRIMARY KEY, slug TEXT NOT NULL UNIQUE, name TEXT NOT NULL, status TEXT NOT NULL, created_at TEXT, updated_at TEXT);
        CREATE TABLE project_items (id TEXT PRIMARY KEY, project_id TEXT NOT NULL, title TEXT NOT NULL, status TEXT NOT NULL, created_at TEXT, updated_at TEXT);
        CREATE TABLE project_doc_blocks (id TEXT PRIMARY KEY, project_id TEXT NOT NULL, title TEXT NOT NULL, created_at TEXT, updated_at TEXT);
        CREATE TABLE tasks (id TEXT PRIMARY KEY, title TEXT NOT NULL, workspace TEXT NOT NULL, status TEXT NOT NULL, created_at TEXT, updated_at TEXT);
    `);
}

function loginRequest(password: string, origin: string | null = LOCAL_ORIGIN, extraBody: Record<string, unknown> = {}): NextRequest {
    const headers: Record<string, string> = { "content-type": "application/json" };
    if (origin !== null) headers.origin = origin;
    return new NextRequest("http://localhost/api/human-auth/login", {
        method: "POST",
        headers,
        body: JSON.stringify({ password, ...extraBody }),
    });
}

function setCookieHeader(response: Response): string | null {
    return response.headers.get("set-cookie");
}

function cookieValue(header: string | null, name: string): string | null {
    if (!header) return null;
    const match = header.match(new RegExp(`${name}=([^;]+)`));
    return match ? match[1] : null;
}

function cookieHasFlag(header: string | null, flag: string): boolean {
    return header?.toLowerCase().includes(flag.toLowerCase()) ?? false;
}

function countRows(db: Database.Database, table: string): number {
    return (db.prepare(`SELECT COUNT(*) AS c FROM ${table}`).get() as { c: number }).c;
}

describe("Human auth schema", () => {
    it("creates human_operators and human_sessions with valid FKs and unique token hash", () => {
        const db = createHumanDb();
        const tables = db.prepare(
            "SELECT name FROM sqlite_master WHERE type = 'table' AND name IN ('human_operators','human_sessions') ORDER BY name",
        ).all() as Array<{ name: string }>;
        expect(tables.map((row) => row.name)).toEqual(["human_operators", "human_sessions"]);

        const operatorId = seedOperator(db);
        createHumanSession(db, operatorId, { now: "2026-08-10T10:00:00.000Z" });

        expect(() => createHumanSession(db, "human-does-not-exist", { now: "2026-08-10T10:00:00.000Z" }))
            .toThrow();

        db.prepare(`
            INSERT INTO human_sessions (id, operator_id, token_hash, created_at, expires_at)
            VALUES ('hsess-dupe', ?, 'same-hash', '2026-08-10T10:00:00.000Z', '2026-08-10T22:00:00.000Z')
        `).run(operatorId);
        expect(() => {
            db.prepare(`
                INSERT INTO human_sessions (id, operator_id, token_hash, created_at, expires_at)
                VALUES ('hsess-dupe-2', ?, 'same-hash', '2026-08-10T10:00:00.000Z', '2026-08-10T22:00:00.000Z')
            `).run(operatorId);
        }).toThrow();
        db.close();
    });

    it("is idempotent when initialized twice", () => {
        const db = createHumanDb();
        ensureHumanAuthSchema(db, () => undefined);
        expect(countRows(db, "human_operators")).toBe(0);
        const info = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='human_operators'").get();
        expect(info).toBeTruthy();
        const singleton = db.prepare(
            "SELECT name FROM sqlite_master WHERE type='index' AND name='idx_human_operators_singleton'",
        ).get();
        expect(singleton).toBeTruthy();
        db.close();
    });

    it("hard-enforces the single-operator invariant at the DB level (F-01)", () => {
        const db = createHumanDb();
        bootstrapHumanOperator(db, { password: TEST_PASSWORD, displayName: "Owner A" });
        expect(countRows(db, "human_operators")).toBe(1);

        // Different display name: only the singleton index can reject this row.
        expect(() => {
            db.prepare(`
                INSERT INTO human_operators (
                    id, display_name, credential_hash, enabled, bootstrapped_at, created_at, updated_at
                ) VALUES (?, ?, ?, 1, ?, ?, ?)
            `).run(
                "human-second",
                "Owner B",
                hashPassword("second-password-123"),
                "2026-08-11T00:00:00.000Z",
                "2026-08-11T00:00:00.000Z",
                "2026-08-11T00:00:00.000Z",
            );
        }).toThrow(/idx_human_operators_singleton/);

        expect(countRows(db, "human_operators")).toBe(1);
        db.close();
    });

    it("keeps schema initialization idempotent with the singleton index present", () => {
        const db = createHumanDb();
        ensureHumanAuthSchema(db, () => undefined);
        ensureHumanAuthSchema(db, () => undefined);
        expect(countRows(db, "human_operators")).toBe(0);
        db.close();
    });
});

describe("Canonical scrypt parameter enforcement (F-02)", () => {
    it("rejects any stored hash whose N/r/p differs from the canonical H2 set", () => {
        const canonical = hashPassword(TEST_PASSWORD);
        const parts = canonical.split("$");
        expect(parts.slice(0, 4)).toEqual(["scrypt", "16384", "8", "1"]);

        const variants: Array<[string, string, string]> = [
            ["32768", "8", "1"], // N doubled
            ["16385", "8", "1"], // N off by one
            ["16384", "16", "1"], // r doubled
            ["16384", "8", "2"], // p doubled
            ["1048576", "32", "8"], // huge but previously in-range
            ["-16384", "8", "1"], // negative
            ["0", "8", "1"], // zero
            ["abc", "8", "1"], // non-numeric
            ["16384.0", "8", "1"], // non-integer
        ];

        for (const [n, r, p] of variants) {
            const stored = [parts[0], n, r, p, parts[4], parts[5]].join("$");
            expect(verifyPassword(TEST_PASSWORD, stored)).toBe(false);
        }

        expect(verifyPassword(TEST_PASSWORD, canonical)).toBe(true);
    });
});

describe("Human password hashing", () => {
    it("hashes and verifies with constant-time comparison, wrong password rejected", () => {
        const hash = hashPassword(TEST_PASSWORD);
        expect(verifyPassword(TEST_PASSWORD, hash)).toBe(true);
        expect(verifyPassword("wrong-password-123", hash)).toBe(false);
    });

    it("uses unique salt so identical passwords produce different hashes", () => {
        const hashA = hashPassword(TEST_PASSWORD);
        const hashB = hashPassword(TEST_PASSWORD);
        expect(hashA).not.toBe(hashB);
        expect(verifyPassword(TEST_PASSWORD, hashA)).toBe(true);
        expect(verifyPassword(TEST_PASSWORD, hashB)).toBe(true);
        expect(verifyPassword(TEST_PASSWORD + "x", hashA)).toBe(false);
    });

    it("safely rejects malformed stored hashes without throwing", () => {
        const malformed = [
            "",
            "garbage",
            "scrypt$1$2$3$4",
            "scrypt$16384$8$1$bWluaW1hbA==$AAAA",
            "scrypt$128$8$1$bWluaW1hbA==$AAAA",
            "scrypt$16384$8$1$YQ==$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
            "plaintext",
        ];
        for (const stored of malformed) {
            expect(() => verifyPassword(TEST_PASSWORD, stored)).not.toThrow();
            expect(verifyPassword(TEST_PASSWORD, stored)).toBe(false);
        }
    });

    it("enforces a 12-character minimum without arbitrary complexity rules", () => {
        expect(() => hashPassword("short")).toThrowError(
            expect.objectContaining({ code: "HUMAN_AUTH_PASSWORD_TOO_SHORT" }),
        );
        const exactlyTwelve = "abcdefghijkl";
        expect(exactlyTwelve.length).toBe(12);
        expect(verifyPassword(exactlyTwelve, hashPassword(exactlyTwelve))).toBe(true);
    });
});

describe("Human operator bootstrap", () => {
    it("creates exactly one operator on first bootstrap, never storing plaintext", () => {
        const db = createHumanDb();
        const result = bootstrapHumanOperator(db, {
            password: TEST_PASSWORD,
            displayName: null,
            now: "2026-08-10T09:00:00.000Z",
        });
        expect(result.operatorId).toMatch(/^human-/);
        expect(result.displayName).toBe("WorkOS Owner");
        expect(countRows(db, "human_operators")).toBe(1);

        const row = db.prepare("SELECT * FROM human_operators WHERE id = ?").get(result.operatorId) as {
            credential_hash: string;
            bootstrapped_at: string | null;
            enabled: number;
        };
        expect(row.credential_hash).not.toBe(TEST_PASSWORD);
        expect(row.credential_hash.includes(TEST_PASSWORD)).toBe(false);
        expect(row.bootstrapped_at).toBe("2026-08-10T09:00:00.000Z");
        expect(row.enabled).toBe(1);
        db.close();
    });

    it("refuses a second bootstrap with zero mutation", () => {
        const db = createHumanDb();
        const first = bootstrapHumanOperator(db, { password: TEST_PASSWORD, displayName: "Owner A" });
        expect(() => bootstrapHumanOperator(db, { password: "another-password-123", displayName: "Owner B" }))
            .toThrowError(expect.objectContaining({ code: "HUMAN_AUTH_BOOTSTRAP_ALREADY_EXISTS" }));
        expect(countRows(db, "human_operators")).toBe(1);
        const row = db.prepare("SELECT display_name FROM human_operators WHERE id = ?").get(first.operatorId) as {
            display_name: string;
        };
        expect(row.display_name).toBe("Owner A");
        db.close();
    });

    it("refuses missing/short bootstrap passwords without creating an operator", () => {
        const db = createHumanDb();
        expect(() => bootstrapHumanOperator(db, { password: "" }))
            .toThrowError(expect.objectContaining({ code: "HUMAN_AUTH_PASSWORD_TOO_SHORT" }));
        expect(() => bootstrapHumanOperator(db, { password: "short" }))
            .toThrowError(expect.objectContaining({ code: "HUMAN_AUTH_PASSWORD_TOO_SHORT" }));
        expect(countRows(db, "human_operators")).toBe(0);
        db.close();
    });
});

describe("Human login API", () => {
    it("authenticates with password, creates an identified session, and sets a safe cookie", async () => {
        const db = createHumanDb();
        const operatorId = seedOperator(db);
        mockGetDb.mockReturnValue(db);

        const response = await loginRoute(loginRequest(TEST_PASSWORD));
        expect(response.status).toBe(200);
        const body = await response.json();
        expect(body.operator).toEqual({ id: operatorId, displayName: "Test Owner", actorType: "human" });

        const header = setCookieHeader(response);
        expect(cookieHasFlag(header, SESSION_COOKIE_NAME)).toBe(true);
        expect(cookieHasFlag(header, "HttpOnly")).toBe(true);
        expect(cookieHasFlag(header, "SameSite=Lax")).toBe(true);
        expect(cookieHasFlag(header, "Path=/")).toBe(true);
        expect(cookieHasFlag(header, "Secure")).toBe(false); // NODE_ENV != production

        const token = cookieValue(header, SESSION_COOKIE_NAME)!;
        const stored = db.prepare("SELECT token_hash FROM human_sessions WHERE operator_id = ?").get(operatorId) as {
            token_hash: string;
        };
        expect(stored.token_hash).not.toBe(token);
        expect(stored.token_hash).toBe(sha256Hex(token));
        db.close();
    });

    it("rejects invalid passwords with a generic non-sensitive error", async () => {
        const db = createHumanDb();
        seedOperator(db);
        mockGetDb.mockReturnValue(db);

        const response = await loginRoute(loginRequest("wrong-password-123"));
        expect(response.status).toBe(401);
        const body = await response.json();
        expect(body.error.code).toBe("HUMAN_AUTH_INVALID_CREDENTIALS");
        expect(body.error.message).toBe("Invalid credentials");
        expect(JSON.stringify(body).includes("Test Owner")).toBe(false);
        expect(JSON.stringify(body).includes("human-")).toBe(false);
        db.close();
    });

    it("denies disabled operators", async () => {
        const db = createHumanDb();
        const operatorId = seedOperator(db);
        db.prepare("UPDATE human_operators SET enabled = 0 WHERE id = ?").run(operatorId);
        mockGetDb.mockReturnValue(db);

        const response = await loginRoute(loginRequest(TEST_PASSWORD));
        expect(response.status).toBe(401);
        db.close();
    });

    it("ignores client-supplied actor identity fields (server-derived only)", async () => {
        const db = createHumanDb();
        const operatorId = seedOperator(db);
        mockGetDb.mockReturnValue(db);

        const response = await loginRoute(loginRequest(TEST_PASSWORD, LOCAL_ORIGIN, {
            humanOperatorId: "human-spoofed",
            actorType: "agent",
            approvedBy: "fake-human",
        }));
        expect(response.status).toBe(200);
        const body = await response.json();
        expect(body.operator.id).toBe(operatorId);
        expect(body.operator.actorType).toBe("human");
        db.close();
    });

    it("rejects missing or foreign origins (CSRF fail-closed)", async () => {
        const db = createHumanDb();
        seedOperator(db);
        mockGetDb.mockReturnValue(db);

        const missingOrigin = await loginRoute(loginRequest(TEST_PASSWORD, null));
        expect(missingOrigin.status).toBe(403);
        expect((await missingOrigin.json()).error.code).toBe("HUMAN_AUTH_CSRF_REJECTED");

        const foreign = await loginRoute(loginRequest(TEST_PASSWORD, "https://evil.example.com"));
        expect(foreign.status).toBe(403);
        db.close();
    });

    it("honors WORKOS_TRUSTED_ORIGINS override and applies Secure in production", async () => {
        vi.stubEnv("WORKOS_TRUSTED_ORIGINS", "https://app.greenfineness.com");
        vi.stubEnv("NODE_ENV", "production");
        const db = createHumanDb();
        seedOperator(db);
        mockGetDb.mockReturnValue(db);

        const trusted = await loginRoute(loginRequest(TEST_PASSWORD, "https://app.greenfineness.com"));
        expect(trusted.status).toBe(200);
        expect(cookieHasFlag(setCookieHeader(trusted), "Secure")).toBe(true);

        const untrusted = await loginRoute(loginRequest(TEST_PASSWORD, LOCAL_ORIGIN));
        expect(untrusted.status).toBe(403);
        db.close();
    });
});

describe("Human session model", () => {
    it("resolves a valid session to a human actor and never stores the raw token", () => {
        const db = createHumanDb();
        const operatorId = seedOperator(db);
        const { token, session } = createHumanSession(db, operatorId, { now: "2026-08-10T10:00:00.000Z" });

        const resolved = resolveHumanSession(db, token, { now: "2026-08-10T11:00:00.000Z" });
        expect(resolved).toEqual({
            sessionId: session.id,
            operatorId,
            displayName: "Test Owner",
            actorType: "human",
            expiresAt: "2026-08-10T22:00:00.000Z",
        });

        const stored = db.prepare("SELECT token_hash FROM human_sessions WHERE id = ?").get(session.id) as {
            token_hash: string;
        };
        expect(stored.token_hash).not.toBe(token);
        expect(stored.token_hash).toBe(sha256Hex(token));
        db.close();
    });

    it("denies expired, revoked, and disabled-operator sessions", () => {
        const db = createHumanDb();
        const operatorId = seedOperator(db);
        const { token } = createHumanSession(db, operatorId, { now: "2026-08-10T10:00:00.000Z" });

        expect(resolveHumanSession(db, token, { now: "2026-08-10T22:00:01.000Z" })).toBeNull();
        expect(resolveHumanSession(db, token, { now: "2026-08-10T11:00:00.000Z" })).not.toBeNull();

        revokeHumanSession(db, token, { now: "2026-08-10T12:00:00.000Z" });
        expect(resolveHumanSession(db, token, { now: "2026-08-10T13:00:00.000Z" })).toBeNull();

        const { token: token2 } = createHumanSession(db, operatorId, { now: "2026-08-10T13:00:00.000Z" });
        db.prepare("UPDATE human_operators SET enabled = 0 WHERE id = ?").run(operatorId);
        expect(resolveHumanSession(db, token2, { now: "2026-08-10T14:00:00.000Z" })).toBeNull();
        db.close();
    });
});

describe("Human logout API", () => {
    it("revokes the session, clears the cookie, and is idempotent", async () => {
        const db = createHumanDb();
        const operatorId = seedOperator(db);
        mockGetDb.mockReturnValue(db);

        const login = await loginRoute(loginRequest(TEST_PASSWORD));
        const token = cookieValue(setCookieHeader(login), SESSION_COOKIE_NAME)!;

        const logoutReq = (cookie?: string) =>
            new NextRequest("http://localhost/api/human-auth/logout", {
                method: "POST",
                headers: {
                    origin: LOCAL_ORIGIN,
                    ...(cookie ? { cookie: `${SESSION_COOKIE_NAME}=${cookie}` } : {}),
                },
            });

        const first = await logoutRoute(logoutReq(token));
        expect(first.status).toBe(200);
        expect(cookieHasFlag(setCookieHeader(first), "Max-Age=0")).toBe(true);
        const row = db.prepare("SELECT revoked_at FROM human_sessions WHERE operator_id = ?").get(operatorId) as {
            revoked_at: string | null;
        };
        expect(row.revoked_at).not.toBeNull();

        const second = await logoutRoute(logoutReq(token));
        expect(second.status).toBe(200);

        const noSession = await logoutRoute(logoutReq());
        expect(noSession.status).toBe(200);
        expect(cookieHasFlag(setCookieHeader(noSession), "Max-Age=0")).toBe(true);
        db.close();
    });

    it("rejects logout from an untrusted origin", async () => {
        const db = createHumanDb();
        seedOperator(db);
        mockGetDb.mockReturnValue(db);
        const req = new NextRequest("http://localhost/api/human-auth/logout", {
            method: "POST",
            headers: { origin: "https://evil.example.com" },
        });
        const response = await logoutRoute(req);
        expect(response.status).toBe(403);
        db.close();
    });
});

describe("CSRF trusted-origin configuration", () => {
    it("defaults to localhost in development and fail-closes in production", () => {
        vi.stubEnv("NODE_ENV", "test");
        delete process.env.WORKOS_TRUSTED_ORIGINS;
        expect(trustedOrigins()).toEqual([LOCAL_ORIGIN]);

        vi.stubEnv("NODE_ENV", "production");
        delete process.env.WORKOS_TRUSTED_ORIGINS;
        expect(trustedOrigins()).toEqual([]);
    });

    it("supports explicit env config and exact-origin matching", () => {
        vi.stubEnv("WORKOS_TRUSTED_ORIGINS", "https://app.greenfineness.com, https://other.example.com");
        expect(trustedOrigins()).toEqual(["https://app.greenfineness.com", "https://other.example.com"]);
    });

    it("allows trusted origin, rejects foreign and missing origins", () => {
        const request = (origin: string | null) =>
            new NextRequest("http://localhost/x", {
                method: "POST",
                headers: origin ? { origin } : {},
            });
        expect(() => assertTrustedHumanOrigin(request(LOCAL_ORIGIN))).not.toThrow();
        expect(() => assertTrustedHumanOrigin(request("https://evil.example.com"))).toThrowError(
            expect.objectContaining({ code: "HUMAN_AUTH_CSRF_REJECTED" }),
        );
        expect(() => assertTrustedHumanOrigin(request(null))).toThrowError(
            expect.objectContaining({ code: "HUMAN_AUTH_CSRF_REJECTED" }),
        );
    });
});

describe("Agent / human identity separation", () => {
    it("agent credentials and agent_ui cookie cannot authenticate as human", async () => {
        const db = createHumanDb();
        mockGetDb.mockReturnValue(db);

        const agentHeader = new NextRequest("http://localhost/api/human-auth/session", {
            headers: { "x-agent-password": "agent-secret" },
        });
        expect(await (await sessionRoute(agentHeader)).json()).toMatchObject({ authenticated: false });

        const agentCookie = new NextRequest("http://localhost/api/human-auth/session", {
            headers: { cookie: "agent_ui=1" },
        });
        expect(await (await sessionRoute(agentCookie)).json()).toMatchObject({ authenticated: false });
        db.close();
    });

    it("a human session does not satisfy agent login and agent login behavior is unchanged", async () => {
        vi.stubEnv("AGENT_UI_PASSWORD", "agent-ui-secret");
        const db = createHumanDb();
        const operatorId = seedOperator(db);
        mockGetDb.mockReturnValue(db);
        const { token } = createHumanSession(db, operatorId, { now: "2026-08-10T10:00:00.000Z" });

        const wrongPassword = new NextRequest("http://localhost/api/agent/login", {
            method: "POST",
            headers: {
                "content-type": "application/json",
                cookie: `${SESSION_COOKIE_NAME}=${token}`,
            },
            body: JSON.stringify({ password: "wrong" }),
        });
        const denied = await agentLoginRoute(wrongPassword);
        expect(denied.status).toBe(401);

        const correctPassword = new NextRequest("http://localhost/api/agent/login", {
            method: "POST",
            headers: {
                "content-type": "application/json",
                cookie: `${SESSION_COOKIE_NAME}=${token}`,
            },
            body: JSON.stringify({ password: "agent-ui-secret" }),
        });
        const allowed = await agentLoginRoute(correctPassword);
        expect(allowed.status).toBe(200);
        db.close();
    });

    it("getAuthenticatedHuman only trusts the human session cookie", async () => {
        const db = createHumanDb();
        const operatorId = seedOperator(db);
        const { token } = createHumanSession(db, operatorId);

        const valid = new NextRequest("http://localhost/x", {
            headers: { cookie: `${SESSION_COOKIE_NAME}=${token}` },
        });
        expect(getAuthenticatedHuman(valid, { db })).toEqual({
            operatorId,
            displayName: "Test Owner",
            actorType: "human",
        });

        const spoofed = new NextRequest("http://localhost/x", {
            headers: { "x-agent-password": "anything", cookie: "agent_ui=1" },
        });
        expect(getAuthenticatedHuman(spoofed, { db })).toBeNull();
        db.close();
    });
});

describe("Human foundation no-business-write boundary", () => {
    it("login/bootstrap/session lifecycle mutates only human_operators and human_sessions", async () => {
        const db = createHumanDb();
        createBusinessTables(db);
        db.prepare("INSERT INTO projects (id, slug, name, status, created_at, updated_at) VALUES (?,?,?,?,?,?)")
            .run("p1", "proj-a", "Project A", "planned", "2026-01-01", "2026-01-01");
        db.prepare("INSERT INTO project_items (id, project_id, title, status, created_at, updated_at) VALUES (?,?,?,?,?,?)")
            .run("i1", "p1", "Item 1", "planned", "2026-01-01", "2026-01-01");
        db.prepare("INSERT INTO project_doc_blocks (id, project_id, title, created_at, updated_at) VALUES (?,?,?,?,?)")
            .run("d1", "p1", "Doc 1", "2026-01-01", "2026-01-01");
        db.prepare("INSERT INTO tasks (id, title, workspace, status, created_at, updated_at) VALUES (?,?,?,?,?,?)")
            .run("t1", "Task 1", "avacrm", "inbox", "2026-01-01", "2026-01-01");

        const counts = {
            projects: countRows(db, "projects"),
            projectItems: countRows(db, "project_items"),
            docBlocks: countRows(db, "project_doc_blocks"),
            tasks: countRows(db, "tasks"),
        };
        const itemBefore = JSON.stringify(db.prepare("SELECT * FROM project_items WHERE id = 'i1'").get());

        mockGetDb.mockReturnValue(db);
        const operatorId = seedOperator(db);
        const { token } = createHumanSession(db, operatorId);
        const login = await loginRoute(loginRequest(TEST_PASSWORD));
        expect(login.status).toBe(200);
        const session = new NextRequest("http://localhost/api/human-auth/session", {
            headers: { cookie: `${SESSION_COOKIE_NAME}=${token}` },
        });
        expect(await (await sessionRoute(session)).json()).toMatchObject({ authenticated: true });

        expect(countRows(db, "projects")).toBe(counts.projects);
        expect(countRows(db, "project_items")).toBe(counts.projectItems);
        expect(countRows(db, "project_doc_blocks")).toBe(counts.docBlocks);
        expect(countRows(db, "tasks")).toBe(counts.tasks);
        expect(JSON.stringify(db.prepare("SELECT * FROM project_items WHERE id = 'i1'").get())).toBe(itemBefore);
        db.close();
    });
});

describe("Human recovery CLI primitive", () => {
    it("resets password and revokes all sessions; refuses when no operator exists", () => {
        const db = createHumanDb();
        expect(() => resetHumanOperator(db, { password: "new-password-12345" }))
            .toThrowError(expect.objectContaining({ code: "HUMAN_AUTH_RESET_NO_OPERATOR" }));

        const operatorId = seedOperator(db);
        const { token } = createHumanSession(db, operatorId, { now: "2026-08-10T10:00:00.000Z" });
        const newPassword = "brand-new-password-42";
        resetHumanOperator(db, { password: newPassword, now: "2026-08-10T15:00:00.000Z" });

        const row = db.prepare("SELECT credential_hash FROM human_operators WHERE id = ?").get(operatorId) as {
            credential_hash: string;
        };
        expect(verifyPassword(TEST_PASSWORD, row.credential_hash)).toBe(false);
        expect(verifyPassword(newPassword, row.credential_hash)).toBe(true);
        expect(resolveHumanSession(db, token, { now: "2026-08-10T16:00:00.000Z" })).toBeNull();
        db.close();
    });
});
