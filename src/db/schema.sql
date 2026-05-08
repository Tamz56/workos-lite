-- WorkOS-Lite schema (SQLite)
-- Definitive source of truth for Release Candidate

PRAGMA foreign_keys = ON;

-- Tasks
CREATE TABLE IF NOT EXISTS tasks (
  id              TEXT PRIMARY KEY,
  title           TEXT NOT NULL,
  workspace       TEXT NOT NULL,
  list_id         TEXT NULL,
  status          TEXT NOT NULL DEFAULT 'inbox' CHECK (status IN ('inbox','planned','in_progress','review','done')),
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
  done_at         TEXT NULL,
  sprint_id       TEXT NULL,
  published_at    TEXT NULL,
  distribution_channels TEXT NULL,
  performance_metrics TEXT NULL,
  -- Agent Automation (MVP)
  agent_enabled   INTEGER DEFAULT 0,
  agent_mode      TEXT NULL,
  scheduled_run_at TEXT NULL,
  source_note_id  TEXT NULL,
  research_note_id TEXT NULL,
  output_target   TEXT DEFAULT 'new_note',
  approval_required INTEGER DEFAULT 1,
  agent_status    TEXT DEFAULT 'idle',
  agent_last_run_at TEXT NULL,
  last_agent_result_note_id TEXT NULL,
  last_agent_error TEXT NULL
);

CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_workspace ON tasks(workspace);
CREATE INDEX IF NOT EXISTS idx_tasks_list_id ON tasks(list_id);
CREATE INDEX IF NOT EXISTS idx_tasks_parent_task_id ON tasks(parent_task_id);
CREATE INDEX IF NOT EXISTS idx_tasks_scheduled_date ON tasks(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_tasks_bucket ON tasks(schedule_bucket);
CREATE INDEX IF NOT EXISTS idx_tasks_done_at ON tasks(done_at);
CREATE INDEX IF NOT EXISTS idx_tasks_is_seed ON tasks(is_seed);
CREATE INDEX IF NOT EXISTS idx_tasks_sprint_id ON tasks(sprint_id);
CREATE INDEX IF NOT EXISTS idx_tasks_published_at ON tasks(published_at);
CREATE INDEX IF NOT EXISTS idx_tasks_distribution_channels ON tasks(distribution_channels);
CREATE INDEX IF NOT EXISTS idx_tasks_performance_metrics ON tasks(performance_metrics);




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
-- Notes
CREATE TABLE IF NOT EXISTS notes (
  id           TEXT PRIMARY KEY,
  title        TEXT NOT NULL,
  content_json TEXT NOT NULL, -- JSON string for Tiptap
  content_html TEXT NOT NULL, -- Rendered HTML
  plain_text   TEXT NOT NULL, -- Plain text for search
  project_id   TEXT NULL,
  created_at   TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at   TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_notes_project_id ON notes(project_id);
CREATE INDEX IF NOT EXISTS idx_notes_updated_at ON notes(updated_at);

-- Note Links
CREATE TABLE IF NOT EXISTS note_links (
  id                 TEXT PRIMARY KEY,
  note_id            TEXT NOT NULL,
  linked_entity_type TEXT NOT NULL, -- 'task', 'project', etc.
  linked_entity_id   TEXT NOT NULL,
  created_at         TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY(note_id) REFERENCES notes(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_note_links_note_id ON note_links(note_id);
CREATE INDEX IF NOT EXISTS idx_note_links_entity ON note_links(linked_entity_type, linked_entity_id);

-- Green Fineness Content Operating Model
CREATE TABLE IF NOT EXISTS seasons (
  season_id          TEXT PRIMARY KEY,
  season_title       TEXT NOT NULL,
  season_description TEXT NULL,
  status             TEXT NOT NULL DEFAULT 'active',
  created_at         TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at         TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS episodes (
  episode_id         TEXT PRIMARY KEY,
  season_id          TEXT NOT NULL,
  episode_no         INTEGER NOT NULL,
  episode_title      TEXT NOT NULL,
  episode_role       TEXT NULL,
  journey_stage      TEXT NULL,
  primary_system     TEXT NULL,
  secondary_systems  TEXT NULL, -- JSON array
  main_article_title TEXT NULL,
  supporting_article_backlog TEXT NULL, -- JSON array
  bridge_from        TEXT NULL,
  bridge_to          TEXT NULL,
  priority           INTEGER DEFAULT 2,
  status             TEXT DEFAULT 'planned',
  notes              TEXT NULL,
  created_at         TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at         TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY(season_id) REFERENCES seasons(season_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS articles (
  article_id         TEXT PRIMARY KEY,
  topic_id           TEXT NULL, -- Links to content packages
  season_id          TEXT NULL,
  episode_id         TEXT NULL,
  article_type       TEXT DEFAULT 'main', -- main | supporting | faq | reference
  title              TEXT NOT NULL,
  article_title      TEXT NULL,
  topic_title        TEXT NULL,
  content_layer      TEXT NULL,
  article_role       TEXT NULL,
  story_set          TEXT NULL,
  story_order        TEXT NULL,
  narrative_status   TEXT NULL,
  article_markdown   TEXT NULL, -- Legacy combined content
  body_markdown      TEXT NULL, -- Main article body
  read_more_markdown TEXT NULL, -- Internal links / Read more
  faq_markdown       TEXT NULL, -- FAQ section
  references_markdown TEXT NULL, -- References section
  group_post_markdown TEXT NULL, -- Facebook Group post copy
  page_post_markdown  TEXT NULL, -- Facebook Page post copy
  personal_post_markdown TEXT NULL, -- Personal/profile post copy
  social_extras_markdown TEXT NULL, -- Hooks, hashtags, captions, etc.
  meta_title         TEXT NULL,
  meta_description   TEXT NULL,
  keywords           TEXT NULL, -- JSON array
  slug               TEXT NULL,
  website_url        TEXT NULL,
  website_draft_url  TEXT NULL,
  final_url          TEXT NULL,
  publish_date       TEXT NULL,
  utm_group          TEXT NULL,
  utm_page           TEXT NULL,
  utm_personal       TEXT NULL,
  content_pillar     TEXT NULL,
  journey_stage      TEXT NULL,
  primary_system     TEXT NULL,
  secondary_systems  TEXT NULL, -- JSON array
  status             TEXT DEFAULT 'idea',
  publish_status     TEXT DEFAULT 'waiting_url',
  priority           INTEGER DEFAULT 2,
  current_step       TEXT DEFAULT '0', -- 0 to 7
  publish_pack_status TEXT DEFAULT 'not_started',
  group_post_status  TEXT DEFAULT 'not_started',
  page_post_status   TEXT DEFAULT 'not_started',
  personal_post_status TEXT DEFAULT 'not_started',
  hashtags_status    TEXT DEFAULT 'not_started',
  publish_log_status TEXT DEFAULT 'not_started',
  canva_status       TEXT DEFAULT 'not_started',
  image_folder       TEXT NULL,
  references_status  TEXT DEFAULT 'pending',
  seo_status         TEXT DEFAULT 'pending',
  schema_status      TEXT DEFAULT 'pending',
  ready_to_publish   INTEGER DEFAULT 0,
  next_action        TEXT NULL,
  notes              TEXT NULL,
  created_at         TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at         TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY(season_id) REFERENCES seasons(season_id) ON DELETE SET NULL,
  FOREIGN KEY(episode_id) REFERENCES episodes(episode_id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_articles_topic_id ON articles(topic_id);
CREATE INDEX IF NOT EXISTS idx_articles_season_episode ON articles(season_id, episode_id);

CREATE TRIGGER IF NOT EXISTS trg_seasons_updated_at
AFTER UPDATE ON seasons
FOR EACH ROW
BEGIN
  UPDATE seasons SET updated_at = datetime('now') WHERE season_id = OLD.season_id;
END;

CREATE TRIGGER IF NOT EXISTS trg_episodes_updated_at
AFTER UPDATE ON episodes
FOR EACH ROW
BEGIN
  UPDATE episodes SET updated_at = datetime('now') WHERE episode_id = OLD.episode_id;
END;

CREATE TRIGGER IF NOT EXISTS trg_articles_updated_at
AFTER UPDATE ON articles
FOR EACH ROW
BEGIN
  UPDATE articles SET updated_at = datetime('now') WHERE article_id = OLD.id;
END;

-- Arbor Writing Lab Entities
CREATE TABLE IF NOT EXISTS gf_story_sets (
  id           TEXT PRIMARY KEY,
  title        TEXT NOT NULL,
  description  TEXT NULL,
  status       TEXT NOT NULL DEFAULT 'active',
  created_at   TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS gf_episodes (
  id            TEXT PRIMARY KEY,
  story_set_id  TEXT NOT NULL,
  title         TEXT NOT NULL,
  role          TEXT NOT NULL CHECK (role IN ('core_episode', 'supporting_article', 'bridge_article', 'practical_guide', 'journal_note', 'social_only_piece')),
  status        TEXT NOT NULL DEFAULT 'planned',
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY(story_set_id) REFERENCES gf_story_sets(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS gf_writing_projects (
  id                TEXT PRIMARY KEY,
  title             TEXT NOT NULL,
  story_set_id      TEXT NULL,
  episode_id        TEXT NULL,
  writing_mode      TEXT NOT NULL CHECK (writing_mode IN ('knowledge_article', 'knowledge_journey_article', 'documentary_chapter', 'writers_journal', 'social_story_copy')),
  status            TEXT NOT NULL DEFAULT 'draft',
  narrative_status  TEXT NULL,
  attached_to       TEXT NULL, -- Topic ID or Task ID
  created_at        TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at        TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY(story_set_id) REFERENCES gf_story_sets(id) ON DELETE SET NULL,
  FOREIGN KEY(episode_id) REFERENCES gf_episodes(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS gf_writing_blocks (
  id          TEXT PRIMARY KEY,
  project_id  TEXT NOT NULL,
  type        TEXT NOT NULL DEFAULT 'text',
  content     TEXT NOT NULL DEFAULT '',
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY(project_id) REFERENCES gf_writing_projects(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS gf_article_relationships (
  id                TEXT PRIMARY KEY,
  source_id         TEXT NOT NULL,
  target_id         TEXT NOT NULL,
  relationship_type TEXT NOT NULL CHECK (relationship_type IN ('bridge_from', 'bridge_to', 'related', 'prerequisite', 'next_step', 'supports', 'expands', 'same_story_set')),
  created_at        TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY(source_id) REFERENCES gf_episodes(id) ON DELETE CASCADE,
  FOREIGN KEY(target_id) REFERENCES gf_episodes(id) ON DELETE CASCADE
);
