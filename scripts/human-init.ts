// ---------------------------------------------------------------------------
// WorkOS-Lite explicit human operator bootstrap CLI
// AUTOMATION-001-H2A
// Usage:
//   HUMAN_OPERATOR_BOOTSTRAP_PASSWORD="..." [HUMAN_OPERATOR_DISPLAY_NAME="..."] npm run human:init
// Password is read from the environment only — never from CLI arguments —
// and is never printed.
// ---------------------------------------------------------------------------

import { getDb } from "../src/db/db";
import { bootstrapHumanOperator } from "../src/lib/human-auth/bootstrap";

function main(): void {
    const password = process.env.HUMAN_OPERATOR_BOOTSTRAP_PASSWORD ?? "";
    if (!password) {
        console.error(
            "HUMAN_OPERATOR_BOOTSTRAP_PASSWORD is required (provide via environment, never as a CLI argument).",
        );
        process.exit(1);
    }

    const db = getDb();
    const result = bootstrapHumanOperator(db, {
        password,
        displayName: process.env.HUMAN_OPERATOR_DISPLAY_NAME ?? null,
    });
    console.log(`Human operator initialized: ${result.operatorId} (${result.displayName})`);
}

try {
    main();
} catch (error) {
    console.error("ERROR:", error instanceof Error ? error.message : String(error));
    process.exit(1);
}
