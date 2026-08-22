import Database from "better-sqlite3";
import { createHash } from "crypto";
import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { authenticateAgentKey } from "@/lib/agent-auth/agentAuthentication";
import {
    authenticateReadAgentKey,
    authenticateReadPrincipal,
    requireProjectSourcesRead,
    READ_SCOPE_ALLOWLIST,
} from "@/lib/ai-read/scope";
import { ReadApiError } from "@/lib/ai-read/errors";

const READ_PASSWORD = "read-secret-password";
const READ_KEY = "read-only-agent-key";
const READ_KEY_2 = "read-only-agent-key-2";
const WRITE_UI_PASSWORD = "write-ui-password";
const WRITE_SERVER_KEY = "write-server-key";

function sha256(value: string): string {
    return createHash("sha256").update(value, "utf8").digest("hex");
}

afterEach(() => {
    vi.unstubAllEnvs();
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

function readErrorCode(fn: () => unknown): string {
    try {
        fn();
        throw new Error("expected ReadApiError");
    } catch (error) {
        if (error instanceof ReadApiError) return error.code;
        throw error;
    }
}

describe("READ1A — dedicated read authentication", () => {
    it("fails closed when read env config is missing (behavior 1)", () => {
        vi.stubEnv("AGENT_READ_PASSWORD", "");
        vi.stubEnv("AGENT_READ_KEY", "");
        const db = createAgentDb();
        expect(
            readErrorCode(() =>
                authenticateReadAgentKey(agentRequest(READ_PASSWORD), { db }),
            ),
        ).toBe("READ_AUTH_CONFIG_MISSING");
    });

    it("rejects a wrong read password (behavior 2)", () => {
        const db = createAgentDb();
        insertAgent(db, {
            id: "read-agent",
            name: "Read Agent",
            serverKey: READ_KEY,
            scopes: JSON.stringify([...READ_SCOPE_ALLOWLIST]),
        });
        expect(
            readErrorCode(() =>
                authenticateReadAgentKey(agentRequest("wrong-password"), {
                    db,
                    readPassword: READ_PASSWORD,
                    readKey: READ_KEY,
                }),
            ),
        ).toBe("READ_AUTH_FAILED");
    });

    it("rejects an unknown read key (behavior 3)", () => {
        const db = createAgentDb();
        // No row for READ_KEY_2.
        expect(
            readErrorCode(() =>
                authenticateReadAgentKey(agentRequest(READ_PASSWORD), {
                    db,
                    readPassword: READ_PASSWORD,
                    readKey: READ_KEY_2,
                }),
            ),
        ).toBe("READ_AUTH_FAILED");
    });

    it("rejects a disabled read principal (behavior 4)", () => {
        const db = createAgentDb();
        insertAgent(db, {
            id: "read-disabled",
            name: "Read Disabled",
            serverKey: READ_KEY,
            scopes: JSON.stringify([...READ_SCOPE_ALLOWLIST]),
            enabled: 0,
        });
        expect(
            readErrorCode(() =>
                authenticateReadAgentKey(agentRequest(READ_PASSWORD), {
                    db,
                    readPassword: READ_PASSWORD,
                    readKey: READ_KEY,
                }),
            ),
        ).toBe("READ_AGENT_DISABLED");
    });

    it("accepts an exact ['project_sources:read'] principal (behavior 5)", () => {
        const db = createAgentDb();
        insertAgent(db, {
            id: "read-ok",
            name: "Read OK",
            serverKey: READ_KEY,
            scopes: JSON.stringify([...READ_SCOPE_ALLOWLIST]),
        });
        const principal = authenticateReadPrincipal(agentRequest(READ_PASSWORD), {
            db,
            readPassword: READ_PASSWORD,
            readKey: READ_KEY,
        });
        expect(principal.actorId).toBe("read-ok");
        expect(principal.scopes).toEqual([...READ_SCOPE_ALLOWLIST]);
    });

    it("rejects a missing scope (behavior 6)", () => {
        const db = createAgentDb();
        insertAgent(db, {
            id: "read-no-scope",
            name: "No Scope",
            serverKey: READ_KEY,
            scopes: "[]",
        });
        const principal = authenticateReadAgentKey(agentRequest(READ_PASSWORD), {
            db,
            readPassword: READ_PASSWORD,
            readKey: READ_KEY,
        });
        expect(readErrorCode(() => requireProjectSourcesRead(principal))).toBe("READ_SCOPE_REJECTED");
    });

    it("rejects read + write scope (behavior 7)", () => {
        const db = createAgentDb();
        insertAgent(db, {
            id: "read-write",
            name: "Read+Write",
            serverKey: READ_KEY,
            scopes: JSON.stringify(["project_sources:read", "docs:write"]),
        });
        const principal = authenticateReadAgentKey(agentRequest(READ_PASSWORD), {
            db,
            readPassword: READ_PASSWORD,
            readKey: READ_KEY,
        });
        expect(readErrorCode(() => requireProjectSourcesRead(principal))).toBe("READ_SCOPE_REJECTED");
    });

    it("rejects read + unknown extra scope (behavior 8)", () => {
        const db = createAgentDb();
        insertAgent(db, {
            id: "read-unknown",
            name: "Read+Unknown",
            serverKey: READ_KEY,
            scopes: JSON.stringify(["project_sources:read", "future:unknown"]),
        });
        const principal = authenticateReadAgentKey(agentRequest(READ_PASSWORD), {
            db,
            readPassword: READ_PASSWORD,
            readKey: READ_KEY,
        });
        expect(readErrorCode(() => requireProjectSourcesRead(principal))).toBe("READ_SCOPE_REJECTED");
    });

    it("does not modify the existing write-agent auth path (behavior 9)", () => {
        const db = createAgentDb();
        insertAgent(db, {
            id: "write-agent",
            name: "Write Agent",
            serverKey: WRITE_SERVER_KEY,
            scopes: JSON.stringify(["docs:write", "tasks:write"]),
        });
        const principal = authenticateAgentKey(agentRequest(WRITE_UI_PASSWORD), {
            db,
            uiPassword: WRITE_UI_PASSWORD,
            serverKey: WRITE_SERVER_KEY,
        });
        expect(principal.actorId).toBe("write-agent");
        expect(principal.scopes).toEqual(["docs:write", "tasks:write"]);
    });
});
