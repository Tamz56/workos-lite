// ---------------------------------------------------------------------------
// P1E.1A reusable H2 test session helper
// Creates a GENUINE H2 session (real schema, real session row, real cookie)
// without bypassing production authentication logic. Later route-protection
// gates (P1E.1B / P1E.1C) should build request contexts from this helper.
// ---------------------------------------------------------------------------

import Database from "better-sqlite3";
import { NextRequest } from "next/server";
import { HUMAN_AUTH_SCHEMA_SQL } from "@/lib/human-auth/humanAuthSchema";
import { bootstrapHumanOperator } from "@/lib/human-auth/bootstrap";
import {
    createHumanSession,
    revokeHumanSession,
    sha256Hex,
    SESSION_COOKIE_NAME,
} from "@/lib/human-auth/session";

export const TEST_HUMAN_PASSWORD = "correct-horse-battery-staple";
export const TRUSTED_ORIGIN = "http://localhost:3000";
export const FOREIGN_ORIGIN = "https://evil.example";
export const TEST_NOW = "2026-08-10T09:00:00.000Z";

export function createHumanAuthDb(): Database.Database {
    const db = new Database(":memory:");
    db.pragma("foreign_keys = ON");
    db.exec(HUMAN_AUTH_SCHEMA_SQL);
    return db;
}

export function seedHumanOperator(
    db: Database.Database,
    displayName = "Test Owner",
): string {
    return bootstrapHumanOperator(db, {
        password: TEST_HUMAN_PASSWORD,
        displayName,
        now: TEST_NOW,
    }).operatorId;
}

export type H2SessionContext = {
    operatorId: string;
    token: string;
    cookieHeader: string;
};

export function createTestH2Session(
    db: Database.Database,
    operatorId: string,
    opts: { revoke?: boolean; expired?: boolean; now?: string } = {},
): H2SessionContext {
    // Default to the real clock so the 12h session TTL is relative to "now";
    // fixed past timestamps would make every session appear expired.
    const now = opts.now ?? new Date().toISOString();
    const { token } = createHumanSession(db, operatorId, { now });
    if (opts.revoke) {
        revokeHumanSession(db, token, { now });
    }
    if (opts.expired) {
        db.prepare("UPDATE human_sessions SET expires_at = ? WHERE token_hash = ?").run(
            "2020-01-01T00:00:00.000Z",
            sha256Hex(token),
        );
    }
    return { operatorId, token, cookieHeader: `${SESSION_COOKIE_NAME}=${token}` };
}

export function humanMutationRequest(
    url: string,
    opts: {
        cookieHeader?: string | null;
        origin?: string | null;
        method?: string;
        body?: string;
    } = {},
): NextRequest {
    const headers: Record<string, string> = { "content-type": "application/json" };
    if (opts.cookieHeader) headers.cookie = opts.cookieHeader;
    if (opts.origin !== undefined && opts.origin !== null) headers.origin = opts.origin;
    return new NextRequest(url, {
        method: opts.method ?? "POST",
        headers,
        body: opts.body ?? JSON.stringify({}),
    });
}
