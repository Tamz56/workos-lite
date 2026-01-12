-- WorkOS-Lite schema (SQLite)

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS tasks (
  id            TEXT PRIMARY KEY,
  title         TEXT NOT NULL,
  workspace     TEXT NOT NULL CHECK (workspace IN ('avacrm','ops','content')),

  status        TEXT NOT NULL CHECK (status IN ('inbox','planned','done')),

  scheduled_date   TEXT NULL, -- YYYY-MM-DD
  schedule_bucket  TEXT NULL CHECK (schedule_bucket IN ('morning','afternoon','evening','none') OR schedule_bucket IS NULL),

  start_time    TEXT NULL, -- HH:MM
  end_time      TEXT NULL, -- HH:MM

  priority      INTEGER NULL,
  notes         TEXT NULL,

  doc_id        TEXT NULL,

  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now')),
  done_at       TEXT NULL
);

-- Keep updated_at fresh
CREATE TRIGGER IF NOT EXISTS trg_tasks_updated_at
AFTER UPDATE ON tasks
FOR EACH ROW
BEGIN
  UPDATE tasks SET updated_at = datetime('now') WHERE id = OLD.id;
END;

-- Helpful indexes
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_workspace ON tasks(workspace);
CREATE INDEX IF NOT EXISTS idx_tasks_scheduled_date ON tasks(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_tasks_bucket ON tasks(schedule_bucket);
CREATE INDEX IF NOT EXISTS idx_tasks_done_at ON tasks(done_at);

-- Docs: 1 doc can be linked by tasks.doc_id
CREATE TABLE IF NOT EXISTS docs (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  content_md TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_docs_updated_at ON docs(updated_at);

-- Attachments: many per task
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
