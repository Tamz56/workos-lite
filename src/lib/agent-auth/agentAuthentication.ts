// ---------------------------------------------------------------------------
// WorkOS-Lite canonical agent authentication primitive
// AUTOMATION-001-P1B.AUTH
//
// Pure addition. Extracts ONLY authentication:
//   request credential gate -> resolve server-configured AGENT_KEY
//   -> agent_keys lookup -> enabled check -> scope parsing
//   -> server-derived AgentPrincipal
//
// Authorization policy (scope semantics) is consumer-specific and is NOT
// decided here. No wildcard policy, no Operations-specific codes, no
// legacy-consumer migration.
// ---------------------------------------------------------------------------

import { createHash } from "crypto";
import type { NextRequest } from "next/server";
import type Database from "better-sqlite3";
import { getDb } from "@/db/db";

export type AgentPrincipal = {
    actorId: string;
    actorName: string;
    scopes: readonly string[];
};

export type AgentAuthenticationDeps = {
    uiPassword?: string;
    serverKey?: string;
    db?: Database.Database;
};

export type AgentAuthErrorCode =
    | "AGENT_AUTH_NOT_CONFIGURED"
    | "AGENT_AUTH_REQUIRED"
    | "AGENT_AUTH_FORBIDDEN";

export class AgentAuthError extends Error {
    code: AgentAuthErrorCode;

    constructor(code: AgentAuthErrorCode, message: string) {
        super(message);
        this.name = "AgentAuthError";
        this.code = code;
    }
}

function sha256(value: string): string {
    return createHash("sha256").update(value, "utf8").digest("hex");
}

/**
 * Fail-closed scope parsing: only a JSON array of strings is accepted;
 * malformed JSON or invalid shapes produce an empty scope list.
 */
function parseAgentScopes(raw: string | null): string[] {
    try {
        const parsed = JSON.parse(raw ?? "[]") as unknown;
        if (Array.isArray(parsed) && parsed.every((item) => typeof item === "string")) {
            return parsed;
        }
        return [];
    } catch {
        return [];
    }
}

/**
 * Authenticate the configured agent credential boundary and return the
 * server-derived agent identity from the selected agent_keys row.
 *
 * NOTE on timing: the request credential is compared with a plain string
 * comparison, matching the behavior of the existing consumers this primitive
 * is extracted from. Timing-safe hardening is intentionally out of scope for
 * P1B.AUTH (see gate contract).
 */
export function authenticateAgentKey(
    request: NextRequest,
    deps: AgentAuthenticationDeps = {},
): AgentPrincipal {
    const uiPassword = deps.uiPassword ?? process.env.AGENT_UI_PASSWORD;
    const serverKey = deps.serverKey ?? process.env.AGENT_KEY;
    if (!uiPassword || !serverKey) {
        throw new AgentAuthError("AGENT_AUTH_NOT_CONFIGURED", "Server authentication is not configured");
    }

    const provided = request.headers.get("x-agent-password");
    if (!provided || provided !== uiPassword) {
        // Neutral: never reveal which comparison failed.
        throw new AgentAuthError("AGENT_AUTH_REQUIRED", "Agent authentication required");
    }

    const db = deps.db ?? getDb();
    const keyHash = sha256(serverKey);
    const agent = db.prepare(
        "SELECT id, name, scopes_json, is_enabled FROM agent_keys WHERE key_hash = ? LIMIT 1",
    ).get(keyHash) as { id: string; name: string; scopes_json: string | null; is_enabled: number } | undefined;

    if (!agent || agent.is_enabled !== 1) {
        throw new AgentAuthError("AGENT_AUTH_FORBIDDEN", "Agent authentication denied");
    }

    return {
        actorId: agent.id,
        actorName: agent.name,
        scopes: parseAgentScopes(agent.scopes_json),
    };
}
