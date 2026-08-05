// ---------------------------------------------------------------------------
// WorkOS Sheet Gate 5 — API test fixtures
// WORKOS-SHEET-GATE-5
// ---------------------------------------------------------------------------

import { createHash } from "crypto";
import Database from "better-sqlite3";
import { ensureAuditSchema } from "@/lib/project-import/auditSchema";
import { persistWorkOSProjectFieldDryRun, type PersistDryRunSource } from "@/lib/project-import/auditPersistenceService";
import type { PersistedDryRunBatch } from "@/lib/project-import/auditTypes";
import { runWorkOSProjectFieldDryRun } from "@/lib/project-import/dryRunAssembler";
import type { WorkOSProjectFieldDryRunResult } from "@/lib/project-import/dryRunTypes";
import { createDryRunTestDatabase, seedProject } from "./dryRunTestDb";
import { validWorkbook } from "./projectFieldSheetFixtures";

export const TEST_PASSWORD = "test-pass";
export const TEST_KEY = "test-key";

export function sha256(value: string): string {
    return createHash("sha256").update(value, "utf8").digest("hex");
}

export function createApiAuthDatabase(scopes: string[]): Database.Database {
    const db = new Database(":memory:");
    ensureAuditSchema(db);
    db.exec(`
        CREATE TABLE agent_keys (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            key_hash TEXT NOT NULL,
            scopes_json TEXT NULL,
            is_enabled INTEGER NOT NULL DEFAULT 1
        );
        CREATE TABLE projects (
            id TEXT PRIMARY KEY,
            slug TEXT NOT NULL UNIQUE,
            name TEXT NOT NULL,
            status TEXT NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        );
        CREATE TABLE project_doc_blocks (
            id TEXT PRIMARY KEY,
            project_id TEXT NOT NULL,
            title TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'active',
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        );
        CREATE TABLE project_items (
            id TEXT PRIMARY KEY,
            project_id TEXT NOT NULL,
            title TEXT NOT NULL,
            status TEXT NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        );
    `);
    db.prepare(
        "INSERT INTO agent_keys (id, name, key_hash, scopes_json, is_enabled) VALUES (?, ?, ?, ?, 1)",
    ).run("agent-test", "Test Agent", sha256(TEST_KEY), JSON.stringify(scopes));
    return db;
}

export async function buildDryRunResult(): Promise<WorkOSProjectFieldDryRunResult> {
    const db = createDryRunTestDatabase();
    seedProject(db, "p-example", "example-project-slug", "Example");
    const result = await runWorkOSProjectFieldDryRun({ workbook: await validWorkbook() }, { db });
    db.close();
    return result;
}

export function persistDryRunBatch(db: Database.Database, result: WorkOSProjectFieldDryRunResult): PersistedDryRunBatch {
    const source: PersistDryRunSource = {
        sourceFilename: "fixture.xlsx",
        sourceFileSize: 4096,
        sourceMimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    };
    return persistWorkOSProjectFieldDryRun(db, result, source);
}
