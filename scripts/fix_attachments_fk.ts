// scripts/fix_attachments_fk.ts
// Run with: npx ts-node scripts/fix_attachments_fk.ts
//
// Fixes corrupted FK in attachments table that references "tasks_old" instead of "tasks"

import Database from "better-sqlite3";
import path from "path";

function getDb() {
    const dbPath = path.resolve(process.cwd(), "data/workos.db");
    const db = new Database(dbPath);
    db.pragma("journal_mode = WAL");
    return db;
}

function main() {
    const db = getDb();

    // Check current attachments schema
    const row = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='attachments'").get() as { sql: string } | undefined;

    if (!row) {
        console.log("No attachments table found. Nothing to fix.");
        db.close();
        return;
    }

    console.log("Current attachments schema:");
    console.log(row.sql);

    if (!row.sql.includes('tasks_old')) {
        console.log("\nNo corrupted FK found. attachments table is fine.");
        db.close();
        return;
    }

    console.log("\n*** FOUND corrupted FK referencing tasks_old. Fixing... ***\n");

    db.exec("BEGIN;");
    try {
        // Disable FK to allow table recreation
        db.exec("PRAGMA foreign_keys = OFF;");

        // Create new table with correct FK
        db.exec(`
            CREATE TABLE attachments_new (
                id TEXT PRIMARY KEY,
                task_id TEXT NOT NULL,
                file_name TEXT NOT NULL,
                mime_type TEXT,
                size_bytes INTEGER,
                storage_path TEXT NOT NULL,
                created_at TEXT NOT NULL,
                FOREIGN KEY(task_id) REFERENCES tasks(id) ON DELETE CASCADE
            );
        `);

        // Copy data
        db.exec(`
            INSERT INTO attachments_new (id, task_id, file_name, mime_type, size_bytes, storage_path, created_at)
            SELECT id, task_id, file_name, mime_type, size_bytes, storage_path, created_at
            FROM attachments;
        `);

        // Drop old table and rename
        db.exec("DROP TABLE attachments;");
        db.exec("ALTER TABLE attachments_new RENAME TO attachments;");

        // Recreate index
        db.exec("CREATE INDEX IF NOT EXISTS idx_attachments_task_id ON attachments(task_id);");

        // Re-enable FK
        db.exec("PRAGMA foreign_keys = ON;");

        db.exec("COMMIT;");

        console.log("✅ Fixed! attachments table now references 'tasks' correctly.");

        // Verify
        const newRow = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='attachments'").get() as { sql: string };
        console.log("\nNew schema:");
        console.log(newRow.sql);

    } catch (e) {
        db.exec("ROLLBACK;");
        console.error("Failed to fix:", e);
        throw e;
    }

    db.close();
}

main();
