const Database = require('better-sqlite3');
const path = require('path');
const dbPath = path.resolve(process.cwd(), "data/workos.db");
const db = new Database(dbPath);

console.log("Starting DB migration for RC5 Sprint Lite...");
const cols = db.prepare("PRAGMA table_info(tasks)").all();
const hasSprintId = cols.some(c => c.name === "sprint_id");

if (!hasSprintId) {
    db.exec("ALTER TABLE tasks ADD COLUMN sprint_id TEXT NULL");
    db.exec("CREATE INDEX IF NOT EXISTS idx_tasks_sprint_id ON tasks(sprint_id)");
    console.log("Added sprint_id to tasks.");
}

// Check constraint if needed
const tableInfo = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='tasks'").get();
if (tableInfo.sql.includes("'planned','done'")) {
    if (!tableInfo.sql.includes("'in_progress'")) {
        console.log("Rebuilding tasks table to allow 'in_progress' status...");
        
        db.exec(`
            DROP TABLE IF EXISTS tasks_new;
            CREATE TABLE tasks_new (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                workspace TEXT NOT NULL DEFAULT 'avacrm',
                list_id TEXT NULL,
                status TEXT NOT NULL DEFAULT 'inbox' CHECK (status IN ('inbox','planned','in_progress','done')),
                scheduled_date TEXT NULL,
                schedule_bucket TEXT NULL CHECK (schedule_bucket IN ('morning','afternoon','evening','none') OR schedule_bucket IS NULL),
                start_time TEXT NULL,
                end_time TEXT NULL,
                priority INTEGER NULL,
                notes TEXT NULL,
                parent_task_id TEXT NULL,
                sort_order INTEGER NULL,
                doc_id TEXT NULL,
                is_seed INTEGER DEFAULT 0,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                done_at TEXT NULL,
                sprint_id TEXT NULL
            );
            
            INSERT INTO tasks_new 
            SELECT id, title, workspace, list_id, status, scheduled_date, schedule_bucket, start_time, end_time, priority, notes, parent_task_id, sort_order, doc_id, is_seed, created_at, updated_at, done_at, sprint_id 
            FROM tasks;
            
            DROP TABLE tasks;
            ALTER TABLE tasks_new RENAME TO tasks;
            
            CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
            CREATE INDEX IF NOT EXISTS idx_tasks_workspace ON tasks(workspace);
            CREATE INDEX IF NOT EXISTS idx_tasks_list_id ON tasks(list_id);
            CREATE INDEX IF NOT EXISTS idx_tasks_parent_task_id ON tasks(parent_task_id);
            CREATE INDEX IF NOT EXISTS idx_tasks_scheduled_date ON tasks(scheduled_date);
            CREATE INDEX IF NOT EXISTS idx_tasks_bucket ON tasks(schedule_bucket);
            CREATE INDEX IF NOT EXISTS idx_tasks_done_at ON tasks(done_at);
            CREATE INDEX IF NOT EXISTS idx_tasks_is_seed ON tasks(is_seed);
            CREATE INDEX IF NOT EXISTS idx_tasks_sprint_id ON tasks(sprint_id);
            
            CREATE TRIGGER IF NOT EXISTS trg_tasks_updated_at
            AFTER UPDATE ON tasks
            FOR EACH ROW
            BEGIN
                UPDATE tasks SET updated_at = datetime('now') WHERE id = OLD.id;
            END;
        `);
        console.log("Tasks table rebuilt successfully.");
    }
}
console.log("Migration complete.");
