// ---------------------------------------------------------------------------
// WorkOS-Lite human session authorization + CSRF trusted-origin validation
// AUTOMATION-001-H2A
// ---------------------------------------------------------------------------

import type { NextRequest } from "next/server";
import type Database from "better-sqlite3";
import { getDb } from "@/db/db";
import { HumanAuthError } from "./errors";
import { resolveHumanSession, SESSION_COOKIE_NAME } from "./session";

export type AuthenticatedHuman = {
    operatorId: string;
    displayName: string;
    actorType: "human";
};

/**
 * Canonical server-side helper for resolving the current human session.
 * Future approval routes must reuse this helper instead of parsing cookies
 * or querying sessions themselves.
 */
export function getAuthenticatedHuman(
    request: NextRequest,
    deps: { db?: Database.Database } = {},
): AuthenticatedHuman | null {
    const token = request.cookies.get(SESSION_COOKIE_NAME)?.value ?? null;
    if (!token) return null;
    const db = deps.db ?? getDb();
    const session = resolveHumanSession(db, token);
    if (!session) return null;
    return {
        operatorId: session.operatorId,
        displayName: session.displayName,
        actorType: "human",
    };
}

/**
 * Explicit trusted-origin security configuration. NOT bound to Next.js
 * allowedDevOrigins (that is a development HMR setting, not a security policy).
 * - WORKOS_TRUSTED_ORIGINS (comma-separated exact origins) wins when set.
 * - Development fallback: http://localhost:3000 (documented dev port).
 * - Production: fail closed (no fallback; env must be configured).
 */
export function trustedOrigins(): string[] {
    const raw = process.env.WORKOS_TRUSTED_ORIGINS;
    if (raw && raw.trim() !== "") {
        return raw
            .split(",")
            .map((origin) => origin.trim())
            .filter((origin) => origin.length > 0);
    }
    if (process.env.NODE_ENV === "production") return [];
    return ["http://localhost:3000"];
}

/**
 * Fail-closed Origin validation for browser state-changing human-session
 * requests (login, logout, and future approve/reject/revoke/execute).
 * Missing Origin is rejected (explicit locked policy).
 */
export function assertTrustedHumanOrigin(request: NextRequest): void {
    const origin = request.headers.get("origin");
    if (!origin) {
        throw new HumanAuthError(
            "HUMAN_AUTH_CSRF_REJECTED",
            "Origin header is required for state-changing human requests",
            403,
        );
    }
    const allowed = trustedOrigins();
    if (!allowed.includes(origin)) {
        throw new HumanAuthError("HUMAN_AUTH_CSRF_REJECTED", "Origin is not trusted", 403);
    }
}
