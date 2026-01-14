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
    const row = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='events'").get();
    if (!row) {
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
            CREATE INDEX IF NOT EXISTS idx_events_workspace ON events(workspace);
        `);
    }
}

// Run migrations on init
ensureSchema();
ensureMigrations();
ensureDocsAndAttachments();
ensureEvents();

