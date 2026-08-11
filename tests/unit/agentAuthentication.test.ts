import Database from "better-sqlite3";
import { createHash } from "crypto";
import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
    AgentAuthError,
    authenticateAgentKey,
    type AgentPrincipal,
} from "@/lib/agent-auth/agentAuthentication";

const TEST_UI_PASSWORD = "test-ui-password";
const TEST_SERVER_KEY_A = "server-key-agent-a";
const TEST_SERVER_KEY_B = "server-key-agent-b";

function sha256(value: string): string {
    return createHash("sha256").update(value, "utf8").digest("hex");
}

afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
});

function createAgentDb(): Database.Database {
    const db = new Database(":memory:");
    db.exec(`
        CREATE TABLE agent_keys (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL UNIQUE,
          key_hash TEXT NOT NULL,
          scopes_json TEXT NOT NULL,
          is_enabled INTEGER NOT NULL DEFAULT 1,
          created_at TEXT NOT NULL DEFAULT (datetime('now'))
        );
    `);
    return db;
}

function insertAgent(
    db: Database.Database,
    input: { id: string; name: string; serverKey: string; scopes: string; enabled?: number },
): void {
    db.prepare(`
        INSERT INTO agent_keys (id, name, key_hash, scopes_json, is_enabled)
        VALUES (?, ?, ?, ?, ?)
    `).run(input.id, input.name, sha256(input.serverKey), input.scopes, input.enabled ?? 1);
}

function agentRequest(password?: string, headers: Record<string, string> = {}): NextRequest {
    const allHeaders = { ...headers };
    if (password !== undefined) allHeaders["x-agent-password"] = password;
    return new NextRequest("http://localhost/x", { headers: allHeaders });
}

function errorCode(fn: () => unknown): string {
    try {
        fn();
        throw new Error("expected AgentAuthError");
    } catch (error) {
        if (error instanceof AgentAuthError) return error.code;
        throw error;
    }
}

describe("Agent authentication primitive (P1B.AUTH)", () => {
    it("derives the configured agent identity and parsed scopes", () => {
        const db = createAgentDb();
        insertAgent(db, {
            id: "agent-test-a",
            name: "Test Agent A",
            serverKey: TEST_SERVER_KEY_A,
            scopes: '["operations:request"]',
        });

        const principal = authenticateAgentKey(agentRequest(TEST_UI_PASSWORD), {
            uiPassword: TEST_UI_PASSWORD,
            serverKey: TEST_SERVER_KEY_A,
            db,
        });

        expect(principal).toEqual({
            actorId: "agent-test-a",
            actorName: "Test Agent A",
            scopes: ["operations:request"],
        });
        db.close();
    });

    it("rejects missing and wrong request credentials with the same neutral category", () => {
        const db = createAgentDb();
        insertAgent(db, {
            id: "agent-test-a",
            name: "Test Agent A",
            serverKey: TEST_SERVER_KEY_A,
            scopes: "[]",
        });
        const deps = { uiPassword: TEST_UI_PASSWORD, serverKey: TEST_SERVER_KEY_A, db };

        expect(errorCode(() => authenticateAgentKey(agentRequest(), deps))).toBe("AGENT_AUTH_REQUIRED");
        expect(errorCode(() => authenticateAgentKey(agentRequest("wrong-password"), deps))).toBe(
            "AGENT_AUTH_REQUIRED",
        );

        const missingMessage = (() => {
            try {
                authenticateAgentKey(agentRequest(), deps);
                return "";
            } catch (error) {
                return error instanceof AgentAuthError ? error.message : "";
            }
        })();
        const wrongMessage = (() => {
            try {
                authenticateAgentKey(agentRequest("wrong-password"), deps);
                return "";
            } catch (error) {
                return error instanceof AgentAuthError ? error.message : "";
            }
        })();
        expect(missingMessage).toBe(wrongMessage); // no distinction leaked
        db.close();
    });

    it("reports a neutral internal error when server configuration is missing", () => {
        vi.stubEnv("AGENT_UI_PASSWORD", "");
        vi.stubEnv("AGENT_KEY", "");
        const db = createAgentDb();

        // both env values missing (empty)
        expect(errorCode(() => authenticateAgentKey(agentRequest(TEST_UI_PASSWORD), { db })))
            .toBe("AGENT_AUTH_NOT_CONFIGURED");
        // explicit uiPassword but no serverKey
        expect(errorCode(() => authenticateAgentKey(agentRequest(TEST_UI_PASSWORD), { uiPassword: TEST_UI_PASSWORD, db })))
            .toBe("AGENT_AUTH_NOT_CONFIGURED");
        // explicit serverKey but no uiPassword
        expect(errorCode(() => authenticateAgentKey(agentRequest(TEST_UI_PASSWORD), { serverKey: TEST_SERVER_KEY_A, db })))
            .toBe("AGENT_AUTH_NOT_CONFIGURED");
        db.close();
    });

    it("fails closed when no agent_keys row matches the server key", () => {
        const db = createAgentDb();
        expect(errorCode(() =>
            authenticateAgentKey(agentRequest(TEST_UI_PASSWORD), {
                uiPassword: TEST_UI_PASSWORD,
                serverKey: TEST_SERVER_KEY_A,
                db,
            }),
        )).toBe("AGENT_AUTH_FORBIDDEN");
        db.close();
    });

    it("fails closed for a disabled agent row", () => {
        const db = createAgentDb();
        insertAgent(db, {
            id: "agent-test-a",
            name: "Test Agent A",
            serverKey: TEST_SERVER_KEY_A,
            scopes: "[]",
            enabled: 0,
        });
        expect(errorCode(() =>
            authenticateAgentKey(agentRequest(TEST_UI_PASSWORD), {
                uiPassword: TEST_UI_PASSWORD,
                serverKey: TEST_SERVER_KEY_A,
                db,
            }),
        )).toBe("AGENT_AUTH_FORBIDDEN");
        db.close();
    });

    it("parses malformed scopes JSON to an empty list (fail closed)", () => {
        const cases = ["not-json", '{"a":1}', '[1,2]', '["ok", 3]'];
        for (const malformed of cases) {
            const db = createAgentDb();
            insertAgent(db, {
                id: "agent-test-a",
                name: "Test Agent A",
                serverKey: TEST_SERVER_KEY_A,
                scopes: malformed,
            });
            const principal = authenticateAgentKey(agentRequest(TEST_UI_PASSWORD), {
                uiPassword: TEST_UI_PASSWORD,
                serverKey: TEST_SERVER_KEY_A,
                db,
            });
            expect(principal.scopes).toEqual([]);
            db.close();
        }
    });

    it("derives actor identity only from the server-configured key (no caller selector)", () => {
        const db = createAgentDb();
        insertAgent(db, {
            id: "agent-a",
            name: "Agent A",
            serverKey: TEST_SERVER_KEY_A,
            scopes: '["ops-a"]',
        });
        insertAgent(db, {
            id: "agent-b",
            name: "Agent B",
            serverKey: TEST_SERVER_KEY_B,
            scopes: '["ops-b"]',
        });

        // Caller attempts to claim agent-a via body/header; server key selects agent-b.
        const request = new NextRequest("http://localhost/x", {
            method: "POST",
            headers: { "x-agent-password": TEST_UI_PASSWORD, "x-agent-id": "agent-a" },
            body: JSON.stringify({ actorId: "agent-a", actorName: "Spoofed" }),
        });
        const principal = authenticateAgentKey(request, {
            uiPassword: TEST_UI_PASSWORD,
            serverKey: TEST_SERVER_KEY_B,
            db,
        });
        expect(principal.actorId).toBe("agent-b");
        expect(principal.actorName).toBe("Agent B");
        expect(principal.scopes).toEqual(["ops-b"]);
        db.close();
    });

    it("does not authenticate a human session cookie as an agent", () => {
        const db = createAgentDb();
        insertAgent(db, {
            id: "agent-test-a",
            name: "Test Agent A",
            serverKey: TEST_SERVER_KEY_A,
            scopes: "[]",
        });
        const humanOnly = agentRequest(undefined, { cookie: "workos_human_session=some-token" });
        expect(errorCode(() =>
            authenticateAgentKey(humanOnly, {
                uiPassword: TEST_UI_PASSWORD,
                serverKey: TEST_SERVER_KEY_A,
                db,
            }),
        )).toBe("AGENT_AUTH_REQUIRED");
        db.close();
    });

    it("never exposes credentials or key material in the returned principal", () => {
        const db = createAgentDb();
        insertAgent(db, {
            id: "agent-test-a",
            name: "Test Agent A",
            serverKey: TEST_SERVER_KEY_A,
            scopes: '["operations:request"]',
        });
        const principal: AgentPrincipal = authenticateAgentKey(agentRequest(TEST_UI_PASSWORD), {
            uiPassword: TEST_UI_PASSWORD,
            serverKey: TEST_SERVER_KEY_A,
            db,
        });
        const serialized = JSON.stringify(principal);
        expect(Object.keys(principal).sort()).toEqual(["actorId", "actorName", "scopes"]);
        expect(serialized.includes(TEST_SERVER_KEY_A)).toBe(false);
        expect(serialized.includes(TEST_UI_PASSWORD)).toBe(false);
        expect(serialized.includes(sha256(TEST_SERVER_KEY_A))).toBe(false);
        db.close();
    });
});
