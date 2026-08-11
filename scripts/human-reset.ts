// ---------------------------------------------------------------------------
// WorkOS-Lite human operator recovery CLI
// AUTOMATION-001-H2A
// Usage:
//   HUMAN_OPERATOR_RESET_PASSWORD="..." npm run human:reset
// Resets the operator password and revokes all active sessions.
// Local/operator authority only; no unauthenticated browser reset route.
// ---------------------------------------------------------------------------

import { getDb } from "../src/db/db";
import { resetHumanOperator } from "../src/lib/human-auth/bootstrap";

function main(): void {
    const password = process.env.HUMAN_OPERATOR_RESET_PASSWORD ?? "";
    if (!password) {
        console.error(
            "HUMAN_OPERATOR_RESET_PASSWORD is required (provide via environment, never as a CLI argument).",
        );
        process.exit(1);
    }

    const db = getDb();
    const result = resetHumanOperator(db, { password });
    console.log(`Human operator password reset; all sessions revoked (operator: ${result.operatorId}).`);
}

try {
    main();
} catch (error) {
    console.error("ERROR:", error instanceof Error ? error.message : String(error));
    process.exit(1);
}
