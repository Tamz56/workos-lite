-- WorkOS-Lite schema (SQLite)

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS tasks (
  id            TEXT PRIMARY KEY,
  title         TEXT NOT NULL,
  workspace     TEXT NOT NULL,

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

-- Projects
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

-- Project Items
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

-- Sprints
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

-- Sprint Items (Join Table)
CREATE TABLE IF NOT EXISTS sprint_items (
  sprint_id TEXT NOT NULL,
  project_item_id TEXT NOT NULL,
  PRIMARY KEY (sprint_id, project_item_id),
  FOREIGN KEY(sprint_id) REFERENCES sprints(id) ON DELETE CASCADE,
  FOREIGN KEY(project_item_id) REFERENCES project_items(id) ON DELETE CASCADE
);
