import Database from "better-sqlite3";
import fs from "fs";
import path from "path";

const dbPath = path.resolve(process.cwd(), "data/workos.db");
const dbDir = path.dirname(dbPath);

if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });

// Avoid "global as any" by defining a precise type
type GlobalDb = typeof globalThis & { __workosDb?: Database.Database };
const g = globalThis as unknown as GlobalDb;

export function getDb() {
    if (!g.__workosDb) {
        const newDb = new Database(dbPath);
        newDb.pragma("journal_mode = WAL");
        newDb.pragma("foreign_keys = ON");
        g.__workosDb = newDb;
    }
    return g.__workosDb;
}

// Export singleton
export const db = getDb();

function ensureSchema() {
    // สร้างตารางเฉพาะตอนยังไม่มี (กัน schema.sql ทับของเดิมทุกครั้ง)
    const row = db
        .prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name='tasks'`)
        .get();

    if (!row) {
        const schemaPath = path.resolve(process.cwd(), "src/db/schema.sql");
        const schema = fs.readFileSync(schemaPath, "utf-8");
        db.exec(schema);
    }
}

let migrated = false;
function ensureMigrations() {
    if (migrated) return;

    const cols = db.prepare("PRAGMA table_info(tasks)").all() as { name: string }[];
    const hasDoneAt = cols.some((c) => c.name === "done_at");

    if (!hasDoneAt) {
        db.exec("ALTER TABLE tasks ADD COLUMN done_at TEXT NULL");
    }
    db.exec("CREATE INDEX IF NOT EXISTS idx_tasks_done_at ON tasks(done_at)");

    // Migration: Remove workspace CHECK constraint (SQLite requires table recreation)
    // Check if constraint exists by looking at table SQL
    const tableInfo = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='tasks'").get() as { sql: string } | undefined;
    if (tableInfo && tableInfo.sql.includes("CHECK (workspace IN") && !tableInfo.sql.includes("'finance'")) {
        // First, fix any NULL timestamps in existing data
        db.exec(`
            UPDATE tasks SET created_at = datetime('now') WHERE created_at IS NULL OR created_at = '';
            UPDATE tasks SET updated_at = COALESCE(NULLIF(updated_at,''), created_at, datetime('now')) WHERE updated_at IS NULL OR updated_at = '';
        `);

        db.exec(`
            -- Cleanup any leftover from previous failed migration
            DROP TABLE IF EXISTS tasks_new;
            
            -- Step 1: Create new table without workspace CHECK constraint
            CREATE TABLE tasks_new (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                workspace TEXT NOT NULL DEFAULT 'avacrm',
                status TEXT NOT NULL DEFAULT 'inbox' CHECK (status IN ('inbox','planned','done')),
                scheduled_date TEXT NULL,
                schedule_bucket TEXT NULL CHECK (schedule_bucket IN ('morning','afternoon','evening','none') OR schedule_bucket IS NULL),
                start_time TEXT NULL,
                end_time TEXT NULL,
                priority INTEGER NULL,
                notes TEXT NULL,
                doc_id TEXT NULL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                done_at TEXT NULL
            );
            
            -- Step 2: Copy data with explicit columns and COALESCE for timestamps
            INSERT INTO tasks_new (id, title, workspace, status, scheduled_date, schedule_bucket, start_time, end_time, priority, notes, doc_id, created_at, updated_at, done_at)
            SELECT 
                id, title, workspace, status, scheduled_date, schedule_bucket, start_time, end_time, priority, notes, doc_id,
                COALESCE(NULLIF(created_at,''), datetime('now')) AS created_at,
                COALESCE(NULLIF(updated_at,''), NULLIF(created_at,''), datetime('now')) AS updated_at,
                done_at 
            FROM tasks;
            
            -- Step 3: Drop old table
            DROP TABLE tasks;
            
            -- Step 4: Rename new table
            ALTER TABLE tasks_new RENAME TO tasks;
            
            -- Step 5: Recreate indexes
            CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
            CREATE INDEX IF NOT EXISTS idx_tasks_workspace ON tasks(workspace);
            CREATE INDEX IF NOT EXISTS idx_tasks_scheduled_date ON tasks(scheduled_date);
            CREATE INDEX IF NOT EXISTS idx_tasks_bucket ON tasks(schedule_bucket);
            CREATE INDEX IF NOT EXISTS idx_tasks_done_at ON tasks(done_at);
            
            -- Step 6: Recreate trigger
            CREATE TRIGGER IF NOT EXISTS trg_tasks_updated_at
            AFTER UPDATE ON tasks
            FOR EACH ROW
            BEGIN
                UPDATE tasks SET updated_at = datetime('now') WHERE id = OLD.id;
            END;
        `);
    }

    migrated = true;
}

function ensureDocsAndAttachments() {
    const rowDocs = db.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name='docs'`).get();
    if (!rowDocs) {
        db.exec(`
          CREATE TABLE IF NOT EXISTS docs (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            content_md TEXT NOT NULL DEFAULT '',
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
          );
          CREATE INDEX IF NOT EXISTS idx_docs_updated_at ON docs(updated_at);
        `);
    }

    const rowAttachments = db.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name='attachments'`).get();
    if (!rowAttachments) {
        db.exec(`
          CREATE TABLE IF NOT EXISTS attachments (
            id TEXT PRIMARY KEY,
            task_id TEXT NOT NULL,
            file_name TEXT NOT NULL,
            mime_type TEXT,
            size_bytes INTEGER,
            storage_path TEXT NOT NULL,
            created_at TEXT NOT NULL,
            FOREIGN KEY(task_id) REFERENCES tasks(id) ON DELETE CASCADE
          );
          CREATE INDEX IF NOT EXISTS idx_attachments_task_id ON attachments(task_id);
        `);
    }
}

function ensureEvents() {
    // Run consistently to ensure table and new indexes exist
    db.exec(`
        CREATE TABLE IF NOT EXISTS events (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            start_time TEXT NOT NULL,
            end_time TEXT,
            all_day INTEGER DEFAULT 0,
            kind TEXT DEFAULT 'appointment',
            workspace TEXT,
            description TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_events_start_time ON events(start_time);
        -- Optimized Composite Index: Filter by workspace -> Range scan by start_time
        CREATE INDEX IF NOT EXISTS idx_events_workspace_start_time ON events(workspace, start_time);
    `);
}

// Run migrations on init
ensureSchema();
ensureMigrations();
ensureDocsAndAttachments();
ensureEvents();

