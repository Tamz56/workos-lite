import Database from "better-sqlite3";
import fs from "fs";
import path from "path";
import crypto from "crypto";

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

// Required for /api/agent/execute functionality
function ensureAgentTables() {
    db.exec(`
        CREATE TABLE IF NOT EXISTS agent_keys (
          id          TEXT PRIMARY KEY,
          name        TEXT NOT NULL UNIQUE,
          key_hash    TEXT NOT NULL,
          scopes_json TEXT NOT NULL,
          is_enabled  INTEGER NOT NULL DEFAULT 1,
          created_at  TEXT NOT NULL DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS agent_idempotency (
          idempotency_key TEXT PRIMARY KEY,
          agent_key_id    TEXT NOT NULL,
          request_hash    TEXT NOT NULL,
          response_json   TEXT NOT NULL,
          created_at      TEXT NOT NULL DEFAULT (datetime('now')),
          FOREIGN KEY(agent_key_id) REFERENCES agent_keys(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS agent_audit_log (
          id           TEXT PRIMARY KEY,
          agent_key_id TEXT NOT NULL,
          action_type  TEXT NOT NULL,
          payload_json TEXT NOT NULL,
          result_json  TEXT NOT NULL,
          created_at   TEXT NOT NULL DEFAULT (datetime('now')),
          FOREIGN KEY(agent_key_id) REFERENCES agent_keys(id) ON DELETE CASCADE
        );

        CREATE INDEX IF NOT EXISTS idx_agent_audit_log_created_at ON agent_audit_log(created_at);
        CREATE INDEX IF NOT EXISTS idx_agent_audit_log_action_created ON agent_audit_log(action_type, created_at);
        CREATE INDEX IF NOT EXISTS idx_agent_audit_log_agent_created ON agent_audit_log(agent_key_id, created_at);
    `);
}

// Run migrations on init
ensureSchema();
ensureMigrations();
ensureDocsAndAttachments();
ensureEvents();
ensureAgentTables();

function ensureProjectsAndSprints() {
    db.exec(`
        CREATE TABLE IF NOT EXISTS projects (
          id TEXT PRIMARY KEY,
          slug TEXT NOT NULL UNIQUE,
          name TEXT NOT NULL,
          status TEXT NOT NULL CHECK (status IN ('inbox', 'planned', 'done')),
          start_date TEXT NULL,
          end_date TEXT NULL,
          owner TEXT NULL,
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          updated_at TEXT NOT NULL DEFAULT (datetime('now'))
        );
        CREATE TRIGGER IF NOT EXISTS trg_projects_updated_at
        AFTER UPDATE ON projects
        FOR EACH ROW
        BEGIN
          UPDATE projects SET updated_at = datetime('now') WHERE id = OLD.id;
        END;
        CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);

        CREATE TABLE IF NOT EXISTS project_items (
          id TEXT PRIMARY KEY,
          project_id TEXT NOT NULL,
          title TEXT NOT NULL,
          status TEXT NOT NULL CHECK (status IN ('inbox', 'planned', 'done')),
          priority INTEGER NULL,
          schedule_bucket TEXT NULL CHECK (schedule_bucket IN ('morning', 'afternoon', 'evening', 'none') OR schedule_bucket IS NULL),
          start_date TEXT NULL,
          end_date TEXT NULL,
          is_milestone INTEGER NOT NULL DEFAULT 0,
          workstream TEXT NULL,
          dod_text TEXT NULL,
          notes TEXT NULL,
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          updated_at TEXT NOT NULL DEFAULT (datetime('now')),
          FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE
        );
        CREATE TRIGGER IF NOT EXISTS trg_project_items_updated_at
        AFTER UPDATE ON project_items
        FOR EACH ROW
        BEGIN
          UPDATE project_items SET updated_at = datetime('now') WHERE id = OLD.id;
        END;

        CREATE INDEX IF NOT EXISTS idx_project_items_project_status ON project_items(project_id, status);
        CREATE INDEX IF NOT EXISTS idx_project_items_project_start_date ON project_items(project_id, start_date);
        CREATE INDEX IF NOT EXISTS idx_project_items_workstream ON project_items(project_id, workstream, start_date);

        CREATE TABLE IF NOT EXISTS sprints (
          id TEXT PRIMARY KEY,
          project_id TEXT NOT NULL,
          name TEXT NOT NULL,
          status TEXT NOT NULL DEFAULT 'planned',
          start_date TEXT NULL,
          end_date TEXT NULL,
          FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE
        );
        CREATE INDEX IF NOT EXISTS idx_sprints_project_start_date ON sprints(project_id, start_date);

        CREATE TABLE IF NOT EXISTS sprint_items (
          sprint_id TEXT NOT NULL,
          project_item_id TEXT NOT NULL,
          PRIMARY KEY (sprint_id, project_item_id),
          FOREIGN KEY(sprint_id) REFERENCES sprints(id) ON DELETE CASCADE,
          FOREIGN KEY(project_item_id) REFERENCES project_items(id) ON DELETE CASCADE
        );
    `);
}

function ensureSeedProjects() {
    const defaultProjects = [
        "avaone-q1",
        "avaone-q1-sales",
        "avaone-homeforest-q1",
        "avafarm888-fb-content-q1",
        "avaone-fb-content-q1",
        "avaone-tiktok-q1"
    ];

    const insertStmt = db.prepare(`
        INSERT INTO projects (id, slug, name, status, created_at, updated_at)
        VALUES (@id, @slug, @name, 'planned', datetime('now'), datetime('now'))
        ON CONFLICT(slug) DO NOTHING
    `);

    const runTx = db.transaction(() => {
        for (const slug of defaultProjects) {
            insertStmt.run({
                id: crypto.randomUUID(),
                slug: slug,
                // Simple formatting for demonstration (e.g., 'avaone-q1' -> 'Avaone Q1')
                name: slug.replace(/-/g, ' ').replace(/\\b\\w/g, c => c.toUpperCase())
            });
        }
    });

    runTx();
}

ensureProjectsAndSprints();
ensureSeedProjects();

