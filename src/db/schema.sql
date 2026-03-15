-- WorkOS-Lite schema (SQLite)
-- Definitive source of truth for Release Candidate

PRAGMA foreign_keys = ON;

-- Tasks
CREATE TABLE IF NOT EXISTS tasks (
  id              TEXT PRIMARY KEY,
  title           TEXT NOT NULL,
  workspace       TEXT NOT NULL,
  list_id         TEXT NULL,
  status          TEXT NOT NULL DEFAULT 'inbox' CHECK (status IN ('inbox','planned','done')),
  scheduled_date  TEXT NULL, -- YYYY-MM-DD
  schedule_bucket TEXT NULL CHECK (schedule_bucket IN ('morning','afternoon','evening','none') OR schedule_bucket IS NULL),
  start_time      TEXT NULL, -- HH:MM
  end_time        TEXT NULL, -- HH:MM
  priority        INTEGER NULL,
  notes           TEXT NULL,
  parent_task_id  TEXT NULL,
  sort_order      INTEGER NULL,
  doc_id          TEXT NULL,
  is_seed         INTEGER DEFAULT 0,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now')),
  done_at         TEXT NULL
);

CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_workspace ON tasks(workspace);
CREATE INDEX IF NOT EXISTS idx_tasks_list_id ON tasks(list_id);
CREATE INDEX IF NOT EXISTS idx_tasks_parent_task_id ON tasks(parent_task_id);
CREATE INDEX IF NOT EXISTS idx_tasks_scheduled_date ON tasks(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_tasks_bucket ON tasks(schedule_bucket);
CREATE INDEX IF NOT EXISTS idx_tasks_done_at ON tasks(done_at);
CREATE INDEX IF NOT EXISTS idx_tasks_is_seed ON tasks(is_seed);

CREATE TRIGGER IF NOT EXISTS trg_tasks_updated_at
AFTER UPDATE ON tasks
FOR EACH ROW
BEGIN
  UPDATE tasks SET updated_at = datetime('now') WHERE id = OLD.id;
END;

-- Lists
CREATE TABLE IF NOT EXISTS lists (
  id          TEXT PRIMARY KEY,
  workspace   TEXT NOT NULL,
  slug        TEXT NOT NULL,
  title       TEXT NOT NULL,
  description TEXT DEFAULT '',
  is_seed     INTEGER DEFAULT 0,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_lists_workspace_slug ON lists(workspace, slug);
CREATE INDEX IF NOT EXISTS idx_lists_workspace ON lists(workspace);

CREATE TRIGGER IF NOT EXISTS trg_lists_updated_at
AFTER UPDATE ON lists
FOR EACH ROW
BEGIN
  UPDATE lists SET updated_at = datetime('now') WHERE id = OLD.id;
END;

-- Docs
CREATE TABLE IF NOT EXISTS docs (
  id          TEXT PRIMARY KEY,
  title       TEXT NOT NULL,
  content_md  TEXT NOT NULL DEFAULT '',
  is_seed     INTEGER DEFAULT 0,
  project_id  TEXT NULL,
  workspace   TEXT NULL,
  created_at  TEXT NOT NULL,
  updated_at  TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_docs_updated_at ON docs(updated_at);

-- Attachments
CREATE TABLE IF NOT EXISTS attachments (
  id            TEXT PRIMARY KEY,
  task_id       TEXT NULL,
  doc_id        TEXT NULL,
  file_name     TEXT NOT NULL,
  mime_type     TEXT,
  size_bytes    INTEGER,
  storage_path  TEXT NOT NULL,
  created_at    TEXT NOT NULL,
  FOREIGN KEY(task_id) REFERENCES tasks(id) ON DELETE CASCADE,
  FOREIGN KEY(doc_id) REFERENCES docs(id) ON DELETE CASCADE,
  CHECK (
    (task_id IS NOT NULL AND doc_id IS NULL) OR 
    (task_id IS NULL AND doc_id IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_attachments_task_id ON attachments(task_id);
CREATE INDEX IF NOT EXISTS idx_attachments_doc_id ON attachments(doc_id);

-- Projects
CREATE TABLE IF NOT EXISTS projects (
  id          TEXT PRIMARY KEY,
  slug        TEXT NOT NULL UNIQUE,
  name        TEXT NOT NULL,
  status      TEXT NOT NULL CHECK (status IN ('inbox', 'planned', 'done')),
  start_date  TEXT NULL,
  end_date    TEXT NULL,
  owner       TEXT NULL,
  is_seed     INTEGER DEFAULT 0,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
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
  id              TEXT PRIMARY KEY,
  project_id      TEXT NOT NULL,
  title           TEXT NOT NULL,
  status          TEXT NOT NULL CHECK (status IN ('inbox', 'planned', 'done')),
  priority        INTEGER NULL,
  schedule_bucket TEXT NULL CHECK (schedule_bucket IN ('morning', 'afternoon', 'evening', 'none') OR schedule_bucket IS NULL),
  start_date      TEXT NULL,
  end_date        TEXT NULL,
  is_milestone    INTEGER NOT NULL DEFAULT 0,
  workstream      TEXT NULL,
  dod_text        TEXT NULL,
  notes           TEXT NULL,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now')),
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

-- Events
CREATE TABLE IF NOT EXISTS events (
    id          TEXT PRIMARY KEY,
    title       TEXT NOT NULL,
    start_time  TEXT NOT NULL,
    end_time    TEXT,
    all_day     INTEGER DEFAULT 0,
    kind        TEXT DEFAULT 'appointment',
    workspace   TEXT,
    description TEXT,
    created_at  TEXT NOT NULL,
    updated_at  TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_events_start_time ON events(start_time);
CREATE INDEX IF NOT EXISTS idx_events_workspace_start_time ON events(workspace, start_time);

-- Agent Infrastructure
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
