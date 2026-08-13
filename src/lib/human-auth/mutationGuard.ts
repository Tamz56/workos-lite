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

import type { NextRequest } from "next/server";
import {
    assertTrustedHumanOrigin,
    getAuthenticatedHuman,
    type AuthenticatedHuman,
} from "./authorization";
import { HumanAuthError } from "./errors";

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
