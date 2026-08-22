// ---------------------------------------------------------------------------
// WorkOS-Lite — READ1A
// Dedicated read-only authentication + exact scope allowlist
// ---------------------------------------------------------------------------
// READ1 uses its OWN credential (AGENT_READ_PASSWORD + AGENT_READ_KEY) and its
// OWN agent_keys row. It never falls back to AGENT_UI_PASSWORD / AGENT_KEY and
// never touches the write-agent path. The scope set must be EXACTLY the
// allowlist; unknown/new scopes fail closed automatically.
// ---------------------------------------------------------------------------
import type { NextRequest } from "next/server";
import type Database from "better-sqlite3";
import { getDb } from "@/db/db";
import {
    parseAgentScopes,
    sha256,
    type AgentPrincipal,
} from "@/lib/agent-auth/agentAuthentication";
import { ReadApiError } from "./errors";

/** READ1 v1 allowed scopes — EXACT set. Anything else fails closed. */
export const READ_SCOPE_ALLOWLIST = ["project_sources:read"] as const;

export interface ReadAuthDeps {
    readPassword?: string;
    readKey?: string;
    db?: Database.Database;
}

type AgentRow = { id: string; name: string; scopes_json: string | null; is_enabled: number };

/**
 * Authenticates the dedicated read-only credential.
 * Fail-closed: config missing, wrong password, unknown key, or disabled row
 * each produce a deterministic error. No fallback to write-agent credentials.
 */
export function authenticateReadAgentKey(
    request: NextRequest,
    deps: ReadAuthDeps = {},
): AgentPrincipal {
    const readPassword = deps.readPassword ?? process.env.AGENT_READ_PASSWORD;
    const readKey = deps.readKey ?? process.env.AGENT_READ_KEY;
    if (!readPassword || !readKey) {
        throw new ReadApiError("READ_AUTH_CONFIG_MISSING", "Read authentication is not configured", 500);
    }

    const provided = request.headers.get("x-agent-password");
    if (!provided || provided !== readPassword) {
        throw new ReadApiError("READ_AUTH_FAILED", "Read agent authentication required", 401);
    }

    const db = deps.db ?? getDb();
    const keyHash = sha256(readKey);
    const agent = db
        .prepare("SELECT id, name, scopes_json, is_enabled FROM agent_keys WHERE key_hash = ? LIMIT 1")
        .get(keyHash) as AgentRow | undefined;

    if (!agent) {
        throw new ReadApiError("READ_AUTH_FAILED", "Read agent authentication denied", 401);
    }
    if (agent.is_enabled !== 1) {
        throw new ReadApiError("READ_AGENT_DISABLED", "Read agent is disabled", 403);
    }

    return {
        actorId: agent.id,
        actorName: agent.name,
        scopes: parseAgentScopes(agent.scopes_json),
    };
}

/**
 * Exact scope allowlist. Succeeds ONLY when the normalized principal scope set
 * equals exactly `["project_sources:read"]`. Empty, write, or unknown extra
 * scopes all fail closed (no blacklist — unknown scopes are rejected).
 */
export function requireProjectSourcesRead(principal: AgentPrincipal): void {
    const scopes = [...principal.scopes].sort();
    const allowed = [...READ_SCOPE_ALLOWLIST].sort();
    const exact = scopes.length === allowed.length && scopes.every((s, i) => s === allowed[i]);
    if (!exact) {
        throw new ReadApiError("READ_SCOPE_REJECTED", "Read scope not authorized", 403);
    }
}

/** Combines read authentication + exact scope allowlist. */
export function authenticateReadPrincipal(
    request: NextRequest,
    deps: ReadAuthDeps = {},
): AgentPrincipal {
    const principal = authenticateReadAgentKey(request, deps);
    requireProjectSourcesRead(principal);
    return principal;
}
