// ---------------------------------------------------------------------------
// WorkOS Project Field Sheet v1 — Deterministic audit serialization
// WORKOS-SHEET-GATE-4B
// ---------------------------------------------------------------------------

import { createHash } from "crypto";
import { AuditError } from "./auditTypes";

function assertJsonSafe(value: unknown, path: string): void {
    if (value === undefined) {
        throw new AuditError("AUDIT_SERIALIZATION_UNDEFINED", `Cannot serialize undefined at ${path}`);
    }
    if (typeof value === "bigint" || typeof value === "function" || typeof value === "symbol") {
        throw new AuditError("AUDIT_SERIALIZATION_UNSUPPORTED", `Cannot serialize value at ${path}`);
    }
    if (value !== null && typeof value === "object") {
        if (Array.isArray(value)) {
            value.forEach((item, index) => assertJsonSafe(item, `${path}[${index}]`));
            return;
        }
        const proto = Object.getPrototypeOf(value);
        if (proto !== Object.prototype && proto !== null) {
            throw new AuditError("AUDIT_SERIALIZATION_UNSUPPORTED", `Unsupported object at ${path}`);
        }
        for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
            assertJsonSafe(item, `${path}.${key}`);
        }
    }
}

function canonicalize(value: unknown): unknown {
    if (value === null || typeof value !== "object") return value;
    if (Array.isArray(value)) return value.map(canonicalize);
    const result: Record<string, unknown> = {};
    for (const key of Object.keys(value as Record<string, unknown>).sort()) {
        result[key] = canonicalize((value as Record<string, unknown>)[key]);
    }
    return result;
}

export function serializeCanonicalJson(value: unknown): string {
    assertJsonSafe(value, "$");
    return JSON.stringify(canonicalize(value));
}

export function parseCanonicalJson<T>(text: string): T {
    const parsed: unknown = JSON.parse(text);
    assertJsonSafe(parsed, "$");
    return parsed as T;
}

export function computeAuditFingerprint(value: unknown): string {
    return createHash("sha256").update(serializeCanonicalJson(value), "utf8").digest("hex");
}
