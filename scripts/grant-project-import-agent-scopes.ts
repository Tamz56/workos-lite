// ---------------------------------------------------------------------------
// WorkOS Project Field Sheet v1 — Agent Key Project Import scope grant
// WORKOS-SHEET-GATE-7B OPERATIONAL SETUP
// Appends only the missing project_import scopes to an existing agent key.
// Idempotent, refuses ambiguous/disabled keys, never prints secrets, and
// creates a timestamped database backup before applying.
// ---------------------------------------------------------------------------

import fs from "node:fs";
import path from "node:path";
import { getDb } from "../src/db/db";

const REQUIRED_SCOPES = [
    "project_import:read",
    "project_import:dry_run",
    "project_import:approve",
    "project_import:reject",
    "project_import:revoke",
    "project_import:execute",
] as const;

type AgentKeyRow = {
    id: string;
    name: string;
    is_enabled: number;
    scopes_json: string;
};

function parseArgs(argv: string[]): { keyId: string | null; dryRun: boolean; apply: boolean; allowDisabled: boolean } {
    let keyId: string | null = null;
    let dryRun = false;
    let apply = false;
    let allowDisabled = false;
    for (let i = 0; i < argv.length; i++) {
        const arg = argv[i];
        if (arg === "--key-id") {
            keyId = argv[++i] ?? null;
        } else if (arg === "--dry-run") {
            dryRun = true;
        } else if (arg === "--apply") {
            apply = true;
        } else if (arg === "--allow-disabled") {
            allowDisabled = true;
        } else {
            throw new Error(`Unknown argument: ${arg}`);
        }
    }
    if (dryRun && apply) throw new Error("Choose either --dry-run or --apply, not both");
    if (!keyId) throw new Error("Missing --key-id <id>");
    return { keyId, dryRun, apply, allowDisabled };
}

function backupDatabase(dbPath: string): string {
    const dir = path.join(path.dirname(dbPath), "backups");
    fs.mkdirSync(dir, { recursive: true });
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const target = path.join(dir, `workos-${stamp}-before-project-import-scopes.db`);
    fs.copyFileSync(dbPath, target);
    return target;
}

function main(): void {
    const { keyId, dryRun, apply, allowDisabled } = parseArgs(process.argv.slice(2));
    const db = getDb();
    const dbPath = path.resolve(process.cwd(), "data/workos.db");

    const rows = db.prepare(
        "SELECT id, name, is_enabled, scopes_json FROM agent_keys WHERE id = ?",
    ).all(keyId) as AgentKeyRow[];

    if (rows.length === 0) {
        throw new Error(`No agent key found with id '${keyId}'`);
    }
    if (rows.length > 1) {
        throw new Error(`Ambiguous agent key id '${keyId}' (${rows.length} matches)`);
    }

    const row = rows[0];
    let scopes: string[];
    try {
        const parsed = JSON.parse(row.scopes_json) as unknown;
        scopes = Array.isArray(parsed) && parsed.every((item) => typeof item === "string") ? parsed : [];
    } catch {
        scopes = [];
    }

    if (row.is_enabled !== 1 && !allowDisabled) {
        throw new Error(`Agent key '${keyId}' is disabled; pass --allow-disabled to modify it`);
    }

    const missing = REQUIRED_SCOPES.filter((scope) => !scopes.includes(scope) && scopes.includes("project_import:*") === false);
    const hasWildcard = scopes.includes("project_import:*") || scopes.includes("*");
    const missingEffective = hasWildcard ? [] : missing;

    console.log("Agent key:", row.id, `(${row.name})`);
    console.log("Enabled:", row.is_enabled === 1);
    console.log("Current scopes:", JSON.stringify(scopes));
    console.log("Missing project_import scopes:", JSON.stringify(missingEffective));

    if (missingEffective.length === 0) {
        console.log("No scope change required (already covered by wildcard or full set).");
        return;
    }

    if (dryRun) {
        console.log("DRY RUN — no database change was made.");
        return;
    }

    if (!apply) {
        console.log("Run with --apply to modify the database, or --dry-run to inspect only.");
        return;
    }

    const backupPath = backupDatabase(dbPath);
    console.log("Backup created:", backupPath);

    const updated = [...scopes, ...missingEffective];
    db.prepare("UPDATE agent_keys SET scopes_json = ? WHERE id = ?").run(JSON.stringify(updated), keyId);

    const verified = db.prepare("SELECT scopes_json, is_enabled FROM agent_keys WHERE id = ?").get(keyId) as {
        scopes_json: string;
        is_enabled: number;
    };
    const finalScopes = JSON.parse(verified.scopes_json) as string[];
    const allPresent = REQUIRED_SCOPES.every((scope) => finalScopes.includes(scope) || finalScopes.includes("project_import:*") || finalScopes.includes("*"));
    console.log("Final scopes:", JSON.stringify(finalScopes));
    console.log("Enabled after update:", verified.is_enabled === 1);
    if (!allPresent) throw new Error("Verification failed: not all project_import scopes are present");
    console.log("Verification passed: all project_import scopes present.");
}

try {
    main();
} catch (error) {
    console.error("ERROR:", error instanceof Error ? error.message : String(error));
    process.exit(1);
}
