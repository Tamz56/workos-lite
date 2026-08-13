// ---------------------------------------------------------------------------
// WorkOS-Lite shared human mutation authorization guard
// AUTOMATION-001-P1E.1A
//
// Authentication and origin validation are separate controls:
//   - getAuthenticatedHuman() is the authoritative server-side session check
//     (revoked / expired / disabled sessions resolve to null).
//   - assertTrustedHumanOrigin() blocks browser CSRF / cross-origin callers.
// Origin alone never authenticates; a cookie alone never proves browser origin.
// This helper performs NO domain writes.
// ---------------------------------------------------------------------------

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
    assertTrustedHumanOrigin,
    getAuthenticatedHuman,
    type AuthenticatedHuman,
} from "./authorization";
import { HumanAuthError, toHumanAuthError } from "./errors";

export function requireHumanMutation(request: NextRequest): AuthenticatedHuman {
    const human = getAuthenticatedHuman(request);
    if (!human) {
        throw new HumanAuthError(
            "HUMAN_AUTH_SESSION_INVALID",
            "Human authentication required",
            401,
        );
    }
    assertTrustedHumanOrigin(request);
    return human;
}

/**
 * Route-friendly wrapper: calls requireHumanMutation and converts the H2
 * authorization errors into the preserved 401/403 JSON contract instead of
 * letting them become generic 500s in routes that do not catch them.
 */
export function humanMutationGuard(
    request: NextRequest,
): AuthenticatedHuman | NextResponse {
    try {
        return requireHumanMutation(request);
    } catch (error) {
        if (error instanceof HumanAuthError) {
            const mapped = toHumanAuthError(error);
            return NextResponse.json({ error: mapped }, { status: mapped.status });
        }
        throw error;
    }
}
