// ---------------------------------------------------------------------------
// WorkOS-Lite Operations-local deterministic canonical serialization
// AUTOMATION-001-P1B.1
// Recursive key sorting, array order preserved, unsupported values rejected.
// ---------------------------------------------------------------------------

import { createHash } from "crypto";
import { OpsError } from "./errors";

function isPlainObject(value: unknown): value is Record<string, unknown> {
    if (value === null || typeof value !== "object") return false;
    const proto = Object.getPrototypeOf(value);
    return proto === Object.prototype || proto === null;
}

export function canonicalize(value: unknown): unknown {
    if (value === null) return null;
    switch (typeof value) {
        case "boolean":
        case "string":
            return value;
        case "number":
            if (!Number.isFinite(value)) {
                throw new OpsError("OPS_INVALID_PAYLOAD", "Non-finite numbers are not supported in canonical intent", 400);
            }
            return value;
        case "undefined":
            throw new OpsError("OPS_INVALID_PAYLOAD", "undefined is not supported in canonical intent", 400);
        case "function":
            throw new OpsError("OPS_INVALID_PAYLOAD", "function is not supported in canonical intent", 400);
        case "symbol":
            throw new OpsError("OPS_INVALID_PAYLOAD", "symbol is not supported in canonical intent", 400);
        case "bigint":
            throw new OpsError("OPS_INVALID_PAYLOAD", "bigint is not supported in canonical intent", 400);
        case "object":
            if (Array.isArray(value)) return value.map(canonicalize);
            if (!isPlainObject(value)) {
                throw new OpsError("OPS_INVALID_PAYLOAD", "Unsupported object type in canonical intent", 400);
            }
            const result: Record<string, unknown> = {};
            for (const key of Object.keys(value).sort()) {
                result[key] = canonicalize(value[key]);
            }
            return result;
        default:
            throw new OpsError("OPS_INVALID_PAYLOAD", "Unsupported value in canonical intent", 400);
    }
}

export function canonicalJson(value: unknown): string {
    return JSON.stringify(canonicalize(value));
}

export function sha256Hex(input: string): string {
    return createHash("sha256").update(input, "utf8").digest("hex");
}

export function computeDomainHash(prefix: string, value: unknown): string {
    return sha256Hex(prefix + canonicalJson(value));
}
