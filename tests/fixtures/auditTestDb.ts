// ---------------------------------------------------------------------------
// WorkOS Sheet Gate 4B — isolated audit test database helpers
// WORKOS-SHEET-GATE-4B
// ---------------------------------------------------------------------------

import Database from "better-sqlite3";
import { ensureAuditSchema } from "@/lib/project-import/auditSchema";

export const AUDIT_TABLE_NAMES = [
    "import_batches",
    "import_batch_rows",
    "import_approvals",
    "import_approval_events",
    "import_execution_attempts",
    "import_cleanup_log",
];

export function createAuditTestDatabase(withBusinessTables = false): Database.Database {
    const db = new Database(":memory:");
    ensureAuditSchema(db);
    if (withBusinessTables) {
        db.exec(`
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
    }
    return db;
}

export function tableExists(db: Database.Database, name: string): boolean {
    const row = db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?").get(name);
    return row !== undefined;
}

export function tableColumns(db: Database.Database, name: string): string[] {
    return (db.prepare(`PRAGMA table_info(${name})`).all() as Array<{ name: string }>).map((row) => row.name);
}

export function tableIndexes(db: Database.Database, name: string): string[] {
    return (db.prepare(`PRAGMA index_list(${name})`).all() as Array<{ name: string }>).map((row) => row.name);
}
