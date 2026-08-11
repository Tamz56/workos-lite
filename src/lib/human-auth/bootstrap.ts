// ---------------------------------------------------------------------------
// WorkOS-Lite human operator bootstrap / recovery primitives
// AUTOMATION-001-H2A
// Explicit CLI bootstrap only (scripts/human-init.ts). Server startup never
// creates or mutates identity rows automatically.
// ---------------------------------------------------------------------------

import { randomUUID } from "crypto";
import type Database from "better-sqlite3";
import { HumanAuthError } from "./errors";
import { hashPassword } from "./password";
import { revokeAllHumanSessions } from "./session";

export const DEFAULT_HUMAN_DISPLAY_NAME = "WorkOS Owner";

export function bootstrapHumanOperator(
    db: Database.Database,
    input: { password: string; displayName?: string | null; now?: string },
): { operatorId: string; displayName: string } {
    const now = input.now ?? new Date().toISOString();
    const existing = db.prepare("SELECT COUNT(*) AS c FROM human_operators").get() as { c: number };
    if (existing.c > 0) {
        throw new HumanAuthError(
            "HUMAN_AUTH_BOOTSTRAP_ALREADY_EXISTS",
            "A human operator already exists; bootstrap is refused",
            409,
        );
    }

    const credentialHash = hashPassword(input.password); // enforces policy (min 12)
    const displayName = (input.displayName ?? "").trim() || DEFAULT_HUMAN_DISPLAY_NAME;
    const operatorId = `human-${randomUUID()}`;

    db.prepare(`
        INSERT INTO human_operators (id, display_name, credential_hash, enabled, bootstrapped_at, created_at, updated_at)
        VALUES (?, ?, ?, 1, ?, ?, ?)
    `).run(operatorId, displayName, credentialHash, now, now, now);

    return { operatorId, displayName };
}

export function resetHumanOperator(
    db: Database.Database,
    input: { password: string; now?: string },
): { operatorId: string } {
    const now = input.now ?? new Date().toISOString();
    const operator = db.prepare(
        "SELECT id FROM human_operators ORDER BY created_at ASC LIMIT 1",
    ).get() as { id: string } | undefined;
    if (!operator) {
        throw new HumanAuthError("HUMAN_AUTH_RESET_NO_OPERATOR", "No human operator exists to reset", 404);
    }

    const credentialHash = hashPassword(input.password); // enforces policy (min 12)
    const transaction = db.transaction(() => {
        db.prepare("UPDATE human_operators SET credential_hash = ?, updated_at = ? WHERE id = ?")
            .run(credentialHash, now, operator.id);
        revokeAllHumanSessions(db, operator.id, { now });
    });
    transaction();

    return { operatorId: operator.id };
}
