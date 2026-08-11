// ---------------------------------------------------------------------------
// WorkOS-Lite human session model
// AUTOMATION-001-H2A
// Opaque 32-byte token (cookie) + SHA-256(token) stored in DB. Never store
// or log the raw token.
// ---------------------------------------------------------------------------

import { createHash, randomBytes, randomUUID } from "crypto";
import type Database from "better-sqlite3";

export const SESSION_COOKIE_NAME = "workos_human_session";
export const SESSION_TTL_HOURS = 12;
const SESSION_TTL_MS = SESSION_TTL_HOURS * 60 * 60 * 1000;

export function sha256Hex(value: string): string {
    return createHash("sha256").update(value, "utf8").digest("hex");
}

export function newHumanSessionId(): string {
    return `hsess-${randomUUID()}`;
}

export type HumanSessionRecord = {
    id: string;
    operator_id: string;
    token_hash: string;
    created_at: string;
    expires_at: string;
    revoked_at: string | null;
};

export function createHumanSession(
    db: Database.Database,
    operatorId: string,
    deps: { now?: string } = {},
): { token: string; session: HumanSessionRecord } {
    const now = deps.now ?? new Date().toISOString();
    const token = randomBytes(32).toString("base64url");
    const tokenHash = sha256Hex(token);
    const expiresAt = new Date(new Date(now).getTime() + SESSION_TTL_MS).toISOString();
    const id = newHumanSessionId();

    db.prepare(`
        INSERT INTO human_sessions (id, operator_id, token_hash, created_at, expires_at)
        VALUES (?, ?, ?, ?, ?)
    `).run(id, operatorId, tokenHash, now, expiresAt);

    const session = db.prepare("SELECT * FROM human_sessions WHERE id = ?").get(id) as HumanSessionRecord;
    return { token, session };
}

export type ResolvedHumanSession = {
    sessionId: string;
    operatorId: string;
    displayName: string;
    actorType: "human";
    expiresAt: string;
};

/**
 * Resolve a raw cookie token to an effective human session.
 * Checks: session exists AND revoked_at IS NULL AND expires_at > now
 * AND operator exists AND operator.enabled = 1.
 */
export function resolveHumanSession(
    db: Database.Database,
    token: string | null,
    deps: { now?: string } = {},
): ResolvedHumanSession | null {
    const now = deps.now ?? new Date().toISOString();
    if (!token) return null;

    const tokenHash = sha256Hex(token);
    const row = db.prepare(`
        SELECT
          s.id AS session_id,
          s.operator_id,
          s.expires_at,
          s.revoked_at,
          o.enabled,
          o.display_name
        FROM human_sessions s
        JOIN human_operators o ON o.id = s.operator_id
        WHERE s.token_hash = ?
    `).get(tokenHash) as {
        session_id: string;
        operator_id: string;
        expires_at: string;
        revoked_at: string | null;
        enabled: number;
        display_name: string;
    } | undefined;

    if (!row) return null;
    if (row.revoked_at !== null) return null;
    if (row.expires_at <= now) return null;
    if (row.enabled !== 1) return null;

    return {
        sessionId: row.session_id,
        operatorId: row.operator_id,
        displayName: row.display_name,
        actorType: "human",
        expiresAt: row.expires_at,
    };
}

export function revokeHumanSession(
    db: Database.Database,
    token: string,
    deps: { now?: string } = {},
): boolean {
    const now = deps.now ?? new Date().toISOString();
    const tokenHash = sha256Hex(token);
    const info = db.prepare(`
        UPDATE human_sessions SET revoked_at = ?
        WHERE token_hash = ? AND revoked_at IS NULL
    `).run(now, tokenHash);
    return info.changes > 0;
}

export function revokeAllHumanSessions(
    db: Database.Database,
    operatorId: string,
    deps: { now?: string } = {},
): number {
    const now = deps.now ?? new Date().toISOString();
    const info = db.prepare(`
        UPDATE human_sessions SET revoked_at = ?
        WHERE operator_id = ? AND revoked_at IS NULL
    `).run(now, operatorId);
    return info.changes;
}
