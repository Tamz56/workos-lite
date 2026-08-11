// ---------------------------------------------------------------------------
// WorkOS-Lite human password hashing (Node built-in crypto.scrypt)
// AUTOMATION-001-H2A
// Encoded format: scrypt$N$r$p$<salt-base64url>$<derived-base64url>
// ---------------------------------------------------------------------------

import { randomBytes, scryptSync, timingSafeEqual } from "crypto";
import { HumanAuthError } from "./errors";

export const MIN_PASSWORD_LENGTH = 12;

const FORMAT_PREFIX = "scrypt";
const SCRYPT_N = 16384;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const KEY_LENGTH = 64;
const SALT_LENGTH = 16;

function base64Url(buffer: Buffer): string {
    return buffer.toString("base64url");
}

export function assertPasswordPolicy(password: string): void {
    if (typeof password !== "string" || password.length < MIN_PASSWORD_LENGTH) {
        throw new HumanAuthError(
            "HUMAN_AUTH_PASSWORD_TOO_SHORT",
            `Password must be at least ${MIN_PASSWORD_LENGTH} characters`,
            400,
        );
    }
}

export function hashPassword(password: string): string {
    assertPasswordPolicy(password);
    const salt = randomBytes(SALT_LENGTH);
    const derived = scryptSync(password, salt, KEY_LENGTH, { N: SCRYPT_N, r: SCRYPT_R, p: SCRYPT_P });
    return [
        FORMAT_PREFIX,
        String(SCRYPT_N),
        String(SCRYPT_R),
        String(SCRYPT_P),
        base64Url(salt),
        base64Url(derived),
    ].join("$");
}

/**
 * Constant-time verification. Malformed stored hashes are safely rejected
 * (returns false) and never crash the caller.
 */
export function verifyPassword(password: string, stored: string): boolean {
    try {
        const parts = stored.split("$");
        if (parts.length !== 6 || parts[0] !== FORMAT_PREFIX) return false;

        // H2 credentials are created with exactly one canonical parameter set.
        // The verifier accepts only that set (no historical/work-factor variants).
        if (
            parts[1] !== String(SCRYPT_N) ||
            parts[2] !== String(SCRYPT_R) ||
            parts[3] !== String(SCRYPT_P)
        ) {
            return false;
        }

        const salt = Buffer.from(parts[4], "base64url");
        const expected = Buffer.from(parts[5], "base64url");
        if (salt.length < 8 || expected.length !== KEY_LENGTH) return false;

        const derived = scryptSync(password, salt, KEY_LENGTH, { N: SCRYPT_N, r: SCRYPT_R, p: SCRYPT_P });
        return timingSafeEqual(derived, expected);
    } catch {
        return false;
    }
}
