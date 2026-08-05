// ---------------------------------------------------------------------------
// WorkOS Project Field Sheet v1 — Authentication & authorization boundary
// WORKOS-SHEET-GATE-5
// Reuses the repository's existing agent-key boundary (x-agent-password +
// agent_keys.scopes_json). Actor identity is always server-derived.
// ---------------------------------------------------------------------------

import { createHash } from "crypto";
import type { NextRequest } from "next/server";
import type Database from "better-sqlite3";
import { getDb } from "@/db/db";
import { ProjectImportApiError } from "./apiErrors";

export type ImportCapability =
    | "project_import:read"
    | "project_import:dry_run"
    | "project_import:approve"
    | "project_import:reject"
    | "project_import:revoke";

export type ImportActor = {
    actorId: string;
    actorName: string;
};

export type AuthorizationDeps = {
    uiPassword?: string;
    serverKey?: string;
    db?: Database.Database;
};

function sha256(value: string): string {
    return createHash("sha256").update(value, "utf8").digest("hex");
}

function forbiddenCodeForCapability(capability: ImportCapability): string {
    switch (capability) {
        case "project_import:read":
            return "IMPORT_READ_FORBIDDEN";
        case "project_import:dry_run":
            return "IMPORT_DRY_RUN_FORBIDDEN";
        default:
            return "IMPORT_APPROVAL_FORBIDDEN";
    }
}

export function authenticateAndAuthorize(
    request: NextRequest,
    capability: ImportCapability,
    deps: AuthorizationDeps = {},
): ImportActor {
    const uiPassword = deps.uiPassword ?? process.env.AGENT_UI_PASSWORD;
    const serverKey = deps.serverKey ?? process.env.AGENT_KEY;
    if (!uiPassword || !serverKey) {
        throw new ProjectImportApiError("IMPORT_INTERNAL_ERROR", "Server authentication is not configured", 500);
    }

    const provided = request.headers.get("x-agent-password");
    if (!provided || provided !== uiPassword) {
        throw new ProjectImportApiError("AUTHENTICATION_REQUIRED", "Authentication required", 401);
    }

    const db = deps.db ?? getDb();
    const keyHash = sha256(serverKey);
    const agent = db.prepare(
        "SELECT id, name, scopes_json, is_enabled FROM agent_keys WHERE key_hash = ? LIMIT 1",
    ).get(keyHash) as { id: string; name: string; scopes_json: string | null; is_enabled: number } | undefined;

    if (!agent || agent.is_enabled !== 1) {
        throw new ProjectImportApiError(forbiddenCodeForCapability(capability), "Access denied", 403);
    }

    let scopes: string[] = [];
    try {
        const parsed = JSON.parse(agent.scopes_json ?? "[]") as unknown;
        if (Array.isArray(parsed) && parsed.every((item) => typeof item === "string")) {
            scopes = parsed;
        }
    } catch {
        scopes = [];
    }

    const granted =
        scopes.includes("*") ||
        scopes.includes("project_import:*") ||
        scopes.includes(capability);
    if (!granted) {
        throw new ProjectImportApiError(forbiddenCodeForCapability(capability), "Insufficient permissions", 403);
    }

    return { actorId: agent.id, actorName: agent.name };
}
