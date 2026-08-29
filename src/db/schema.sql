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
  review_status   TEXT DEFAULT 'draft',
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
  updated_at  TEXT NOT NULL DEFAULT (datetime('now')),
  category TEXT NULL,
  registry_status TEXT NULL,
  priority TEXT NULL,
  current_goal TEXT NULL,
  progress_stage TEXT NULL,
  next_action TEXT NULL,
  cadence TEXT NULL,
  risk_or_blocked_by TEXT NULL,
  metadata_updated_at TEXT NULL
);

CREATE TRIGGER IF NOT EXISTS trg_projects_updated_at
AFTER UPDATE ON projects
FOR EACH ROW
BEGIN
  UPDATE projects SET updated_at = datetime('now') WHERE id = OLD.id;
END;

CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);

-- Canonical Coordination Lanes (P1-G1A identity/persistence only)
CREATE TABLE IF NOT EXISTS coordination_lanes (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  lane_key TEXT NOT NULL CHECK(
    length(trim(lane_key)) > 0
    AND lane_key = lower(lane_key)
    AND lane_key NOT GLOB '*[^a-z0-9-]*'
    AND lane_key NOT LIKE '-%'
    AND lane_key NOT LIKE '%-'
    AND lane_key NOT LIKE '%--%'
  ),
  name TEXT NOT NULL CHECK(length(trim(name)) > 0),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(project_id, lane_key),
  FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_coordination_lanes_project
ON coordination_lanes(project_id);

CREATE TRIGGER IF NOT EXISTS trg_coordination_lanes_identity_immutable
BEFORE UPDATE OF id, project_id, lane_key ON coordination_lanes
FOR EACH ROW
BEGIN
  SELECT RAISE(ABORT, 'coordination Lane identity is immutable');
END;

CREATE TRIGGER IF NOT EXISTS trg_coordination_lanes_updated_at
AFTER UPDATE ON coordination_lanes
FOR EACH ROW
WHEN NEW.updated_at = OLD.updated_at OR NEW.updated_at IS OLD.updated_at
BEGIN
  UPDATE coordination_lanes SET updated_at = datetime('now') WHERE id = NEW.id;
END;

-- Canonical Coordination Lane state history (P1-G2A current-state lifecycle foundation)
-- Durable, append-only. Current Lane state is DERIVED (highest seq); never materialized.
-- Approved Lane lifecycle state vocabulary/transitions = UNKNOWN/NOT_PROVEN (not invented).
CREATE TABLE IF NOT EXISTS coordination_lane_state_history (
  lane_id TEXT NOT NULL,
  seq INTEGER NOT NULL CHECK(seq > 0),
  state TEXT NOT NULL CHECK(length(trim(state)) > 0),
  recorded_at TEXT NOT NULL DEFAULT (datetime('now')),
  provenance TEXT NOT NULL CHECK(length(trim(provenance)) > 0),
  source_ref_kind TEXT NULL,
  source_ref_id TEXT NULL,
  evaluated_state_lane_id TEXT NULL,
  evaluated_state_seq INTEGER NULL,
  evaluated_baseline_kind TEXT NULL,
  evaluated_baseline_id TEXT NULL,
  evaluated_baseline_fingerprint TEXT NULL,
  PRIMARY KEY (lane_id, seq),
  FOREIGN KEY(lane_id) REFERENCES coordination_lanes(id) ON DELETE RESTRICT
);

CREATE TRIGGER IF NOT EXISTS trg_coordination_lane_state_history_append_only_update
BEFORE UPDATE ON coordination_lane_state_history
FOR EACH ROW
BEGIN
  SELECT RAISE(ABORT, 'coordination Lane state history is append-only');
END;

CREATE TRIGGER IF NOT EXISTS trg_coordination_lane_state_history_append_only_delete
BEFORE DELETE ON coordination_lane_state_history
FOR EACH ROW
BEGIN
  SELECT RAISE(ABORT, 'coordination Lane state history is append-only');
END;

-- Canonical Coordination Lane dependencies (P2-G3B identity + history foundation)
-- Directional Lane-only identity; authoritative state is append-only history.
CREATE TABLE IF NOT EXISTS coordination_dependencies (
  id TEXT PRIMARY KEY CHECK(length(trim(id)) > 0),
  source_lane_id TEXT NOT NULL CHECK(length(trim(source_lane_id)) > 0),
  target_lane_id TEXT NOT NULL CHECK(length(trim(target_lane_id)) > 0),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY(source_lane_id) REFERENCES coordination_lanes(id) ON DELETE RESTRICT,
  FOREIGN KEY(target_lane_id) REFERENCES coordination_lanes(id) ON DELETE RESTRICT
);

CREATE TRIGGER IF NOT EXISTS trg_coordination_dependencies_identity_immutable
BEFORE UPDATE OF id, source_lane_id, target_lane_id ON coordination_dependencies
FOR EACH ROW
BEGIN
  SELECT RAISE(ABORT, 'coordination dependency identity is immutable');
END;

CREATE TRIGGER IF NOT EXISTS trg_coordination_dependencies_same_project
BEFORE INSERT ON coordination_dependencies
FOR EACH ROW
WHEN NOT EXISTS (
  SELECT 1
  FROM coordination_lanes AS source_lane
  JOIN coordination_lanes AS target_lane
    ON target_lane.project_id = source_lane.project_id
  WHERE source_lane.id = NEW.source_lane_id
    AND target_lane.id = NEW.target_lane_id
)
BEGIN
  SELECT RAISE(ABORT, 'coordination dependency endpoints must be existing Lanes in the same Project');
END;

CREATE TABLE IF NOT EXISTS coordination_dependency_history (
  dependency_id TEXT NOT NULL,
  seq INTEGER NOT NULL CHECK(seq > 0),
  state TEXT NOT NULL CHECK(length(trim(state)) > 0),
  recorded_at TEXT NOT NULL DEFAULT (datetime('now')),
  provenance TEXT NOT NULL CHECK(length(trim(provenance)) > 0),
  PRIMARY KEY (dependency_id, seq),
  FOREIGN KEY(dependency_id) REFERENCES coordination_dependencies(id) ON DELETE RESTRICT
);

CREATE TRIGGER IF NOT EXISTS trg_coordination_dependency_history_append_only_update
BEFORE UPDATE ON coordination_dependency_history
FOR EACH ROW
BEGIN
  SELECT RAISE(ABORT, 'coordination dependency history is append-only');
END;

CREATE TRIGGER IF NOT EXISTS trg_coordination_dependency_history_append_only_delete
BEFORE DELETE ON coordination_dependency_history
FOR EACH ROW
BEGIN
  SELECT RAISE(ABORT, 'coordination dependency history is append-only');
END;

-- Canonical Coordination conditions (P2-G4B identity + lifecycle history foundation)
-- First-class coordination signals (blocker | waiting | attention). Identity is
-- immutable; authoritative lifecycle state is append-only history (active | cleared).
-- When dependency_id is present the condition Lane MUST be the source Lane of the
-- referenced Directional Dependency (endpoint rule; same Project follows from the
-- Dependency's own F1 invariant).
CREATE TABLE IF NOT EXISTS coordination_conditions (
  id TEXT PRIMARY KEY CHECK(length(trim(id)) > 0),
  lane_id TEXT NOT NULL CHECK(length(trim(lane_id)) > 0),
  signal_kind TEXT NOT NULL CHECK(
    length(trim(signal_kind)) > 0
    AND signal_kind IN ('blocker','waiting','attention')
  ),
  dependency_id TEXT NULL,
  reason TEXT NOT NULL CHECK(length(trim(reason)) > 0),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY(lane_id) REFERENCES coordination_lanes(id) ON DELETE RESTRICT,
  FOREIGN KEY(dependency_id) REFERENCES coordination_dependencies(id) ON DELETE RESTRICT
);

CREATE TRIGGER IF NOT EXISTS trg_coordination_conditions_identity_immutable
BEFORE UPDATE OF id, lane_id, signal_kind, dependency_id, reason ON coordination_conditions
FOR EACH ROW
BEGIN
  SELECT RAISE(ABORT, 'coordination condition identity is immutable');
END;

CREATE TRIGGER IF NOT EXISTS trg_coordination_conditions_dependency_endpoint
BEFORE INSERT ON coordination_conditions
FOR EACH ROW
WHEN NEW.dependency_id IS NOT NULL AND NOT EXISTS (
  SELECT 1
  FROM coordination_dependencies
  WHERE id = NEW.dependency_id
    AND source_lane_id = NEW.lane_id
)
BEGIN
  SELECT RAISE(ABORT, 'coordination condition Lane must be the source Lane of the referenced Dependency');
END;

CREATE TABLE IF NOT EXISTS coordination_condition_history (
  condition_id TEXT NOT NULL,
  seq INTEGER NOT NULL CHECK(seq > 0),
  state TEXT NOT NULL CHECK(length(trim(state)) > 0 AND state IN ('active','cleared')),
  recorded_at TEXT NOT NULL DEFAULT (datetime('now')),
  provenance TEXT NOT NULL CHECK(length(trim(provenance)) > 0),
  PRIMARY KEY (condition_id, seq),
  FOREIGN KEY(condition_id) REFERENCES coordination_conditions(id) ON DELETE RESTRICT
);

CREATE TRIGGER IF NOT EXISTS trg_coordination_condition_history_append_only_update
BEFORE UPDATE ON coordination_condition_history
FOR EACH ROW
BEGIN
  SELECT RAISE(ABORT, 'coordination condition history is append-only');
END;

CREATE TRIGGER IF NOT EXISTS trg_coordination_condition_history_append_only_delete
BEFORE DELETE ON coordination_condition_history
FOR EACH ROW
BEGIN
  SELECT RAISE(ABORT, 'coordination condition history is append-only');
END;

-- Canonical Coordination Cross-Lane Impact (P2-G5B identity + lifecycle/history foundation)
-- Three durable surfaces: Source Item identity, Source Item append-only lifecycle,
-- and append-only Target Relations (logical identity (source_item_id, target_lane_id)).
-- Frozen guards: self-relation prohibited; same-project only (v1, fail-closed);
-- NONE is an explicit impact classification; no direct target-Lane authority/state mutation.
CREATE TABLE IF NOT EXISTS coordination_cross_lane_source_items (
  id TEXT PRIMARY KEY CHECK(length(trim(id)) > 0),
  source_lane_id TEXT NOT NULL CHECK(length(trim(source_lane_id)) > 0),
  summary TEXT NOT NULL CHECK(length(trim(summary)) > 0),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY(source_lane_id) REFERENCES coordination_lanes(id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_coordination_cross_lane_source_items_source_lane
ON coordination_cross_lane_source_items(source_lane_id);

CREATE TRIGGER IF NOT EXISTS trg_coordination_cross_lane_source_items_identity_immutable
BEFORE UPDATE OF id, source_lane_id, summary ON coordination_cross_lane_source_items
FOR EACH ROW
BEGIN
  SELECT RAISE(ABORT, 'coordination cross-lane source item identity is immutable');
END;

CREATE TABLE IF NOT EXISTS coordination_cross_lane_source_item_history (
  source_item_id TEXT NOT NULL,
  seq INTEGER NOT NULL CHECK(seq > 0),
  applicable INTEGER NOT NULL CHECK(applicable IN (0,1)),
  recorded_at TEXT NOT NULL DEFAULT (datetime('now')),
  source_provenance TEXT NOT NULL CHECK(length(trim(source_provenance)) > 0),
  PRIMARY KEY (source_item_id, seq),
  FOREIGN KEY(source_item_id) REFERENCES coordination_cross_lane_source_items(id) ON DELETE RESTRICT
);

CREATE TRIGGER IF NOT EXISTS trg_coordination_cross_lane_source_item_history_append_only_update
BEFORE UPDATE ON coordination_cross_lane_source_item_history
FOR EACH ROW
BEGIN
  SELECT RAISE(ABORT, 'coordination cross-lane source item history is append-only');
END;

CREATE TRIGGER IF NOT EXISTS trg_coordination_cross_lane_source_item_history_append_only_delete
BEFORE DELETE ON coordination_cross_lane_source_item_history
FOR EACH ROW
BEGIN
  SELECT RAISE(ABORT, 'coordination cross-lane source item history is append-only');
END;

CREATE TABLE IF NOT EXISTS coordination_cross_lane_target_relation_history (
  source_item_id TEXT NOT NULL,
  target_lane_id TEXT NOT NULL CHECK(length(trim(target_lane_id)) > 0),
  seq INTEGER NOT NULL CHECK(seq > 0),
  impact_classification TEXT NOT NULL CHECK(
    length(trim(impact_classification)) > 0
    AND impact_classification IN ('ACTION_REQUIRED','AWARENESS_ONLY','RECORD_ONLY','NONE')
  ),
  applicable INTEGER NOT NULL CHECK(applicable IN (0,1)),
  recorded_at TEXT NOT NULL DEFAULT (datetime('now')),
  relation_provenance TEXT NOT NULL CHECK(length(trim(relation_provenance)) > 0),
  PRIMARY KEY (source_item_id, target_lane_id, seq),
  FOREIGN KEY(source_item_id) REFERENCES coordination_cross_lane_source_items(id) ON DELETE RESTRICT,
  FOREIGN KEY(target_lane_id) REFERENCES coordination_lanes(id) ON DELETE RESTRICT
);

CREATE TRIGGER IF NOT EXISTS trg_coordination_cross_lane_target_relation_history_append_only_update
BEFORE UPDATE ON coordination_cross_lane_target_relation_history
FOR EACH ROW
BEGIN
  SELECT RAISE(ABORT, 'coordination cross-lane target relation history is append-only');
END;

CREATE TRIGGER IF NOT EXISTS trg_coordination_cross_lane_target_relation_history_append_only_delete
BEFORE DELETE ON coordination_cross_lane_target_relation_history
FOR EACH ROW
BEGIN
  SELECT RAISE(ABORT, 'coordination cross-lane target relation history is append-only');
END;

CREATE TRIGGER IF NOT EXISTS trg_coordination_cross_lane_target_relation_same_project
BEFORE INSERT ON coordination_cross_lane_target_relation_history
FOR EACH ROW
WHEN NOT EXISTS (
  SELECT 1
  FROM coordination_cross_lane_source_items AS item
  JOIN coordination_lanes AS source_lane ON source_lane.id = item.source_lane_id
  JOIN coordination_lanes AS target_lane ON target_lane.id = NEW.target_lane_id
  WHERE item.id = NEW.source_item_id
    AND source_lane.project_id = target_lane.project_id
)
BEGIN
  SELECT RAISE(ABORT, 'coordination cross-lane target relation must reference a Lane in the same Project');
END;

CREATE TRIGGER IF NOT EXISTS trg_coordination_cross_lane_target_relation_no_self
BEFORE INSERT ON coordination_cross_lane_target_relation_history
FOR EACH ROW
WHEN NEW.target_lane_id = (
  SELECT source_lane_id
  FROM coordination_cross_lane_source_items
  WHERE id = NEW.source_item_id
)
BEGIN
  SELECT RAISE(ABORT, 'coordination cross-lane target relation must not reference its own source Lane');
END;

-- Coordination Lane checkpoint / resume core
CREATE TABLE IF NOT EXISTS coordination_lane_checkpoints (
  id TEXT PRIMARY KEY CHECK(length(trim(id)) > 0),
  lane_id TEXT NOT NULL CHECK(length(trim(lane_id)) > 0),
  seq INTEGER NOT NULL CHECK(seq > 0),
  supersedes_checkpoint_id TEXT NULL,
  continuity_schema_version TEXT NOT NULL CHECK(length(trim(continuity_schema_version)) > 0),
  continuity_payload_json TEXT NOT NULL CHECK(length(trim(continuity_payload_json)) > 0),
  provenance TEXT NOT NULL CHECK(length(trim(provenance)) > 0),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(lane_id, seq),
  UNIQUE(supersedes_checkpoint_id),
  UNIQUE(lane_id, id),
  CHECK(
    (seq = 1 AND supersedes_checkpoint_id IS NULL)
    OR (seq > 1 AND supersedes_checkpoint_id IS NOT NULL)
  ),
  FOREIGN KEY(lane_id) REFERENCES coordination_lanes(id) ON DELETE RESTRICT,
  FOREIGN KEY(lane_id, supersedes_checkpoint_id)
    REFERENCES coordination_lane_checkpoints(lane_id, id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_coordination_lane_checkpoints_lane_seq
ON coordination_lane_checkpoints(lane_id, seq);

CREATE TRIGGER IF NOT EXISTS trg_coordination_lane_checkpoints_immediate_predecessor
BEFORE INSERT ON coordination_lane_checkpoints
FOR EACH ROW
WHEN NEW.seq > 1 AND NOT EXISTS (
  SELECT 1
  FROM coordination_lane_checkpoints AS predecessor
  WHERE predecessor.id = NEW.supersedes_checkpoint_id
    AND predecessor.lane_id = NEW.lane_id
    AND predecessor.seq = NEW.seq - 1
)
BEGIN
  SELECT RAISE(ABORT, 'coordination checkpoint predecessor must be the immediate prior Lane checkpoint');
END;

CREATE TRIGGER IF NOT EXISTS trg_coordination_lane_checkpoints_append_only_update
BEFORE UPDATE ON coordination_lane_checkpoints
FOR EACH ROW
BEGIN
  SELECT RAISE(ABORT, 'coordination checkpoints are immutable');
END;

CREATE TRIGGER IF NOT EXISTS trg_coordination_lane_checkpoints_append_only_delete
BEFORE DELETE ON coordination_lane_checkpoints
FOR EACH ROW
BEGIN
  SELECT RAISE(ABORT, 'coordination checkpoints are logically durable');
END;

CREATE TABLE IF NOT EXISTS coordination_lane_checkpoint_open_items (
  checkpoint_id TEXT NOT NULL CHECK(length(trim(checkpoint_id)) > 0),
  open_item_id TEXT NOT NULL CHECK(length(trim(open_item_id)) > 0),
  item_ordinal INTEGER NOT NULL CHECK(item_ordinal > 0),
  summary TEXT NOT NULL CHECK(length(trim(summary)) > 0),
  continuity_kind TEXT NOT NULL CHECK(continuity_kind IN ('RETAINED','ADDED')),
  PRIMARY KEY(checkpoint_id, open_item_id),
  UNIQUE(checkpoint_id, item_ordinal),
  FOREIGN KEY(checkpoint_id) REFERENCES coordination_lane_checkpoints(id)
    ON DELETE RESTRICT DEFERRABLE INITIALLY DEFERRED
);

CREATE TRIGGER IF NOT EXISTS trg_coordination_lane_checkpoint_open_items_closed_insert
BEFORE INSERT ON coordination_lane_checkpoint_open_items
FOR EACH ROW
WHEN EXISTS (
  SELECT 1 FROM coordination_lane_checkpoints WHERE id = NEW.checkpoint_id
)
BEGIN
  SELECT RAISE(ABORT, 'coordination checkpoint OPEN_ITEMS snapshot is already closed');
END;

CREATE TRIGGER IF NOT EXISTS trg_coordination_lane_checkpoint_open_items_immutable_update
BEFORE UPDATE ON coordination_lane_checkpoint_open_items
FOR EACH ROW
BEGIN
  SELECT RAISE(ABORT, 'coordination checkpoint OPEN_ITEMS are immutable');
END;

CREATE TRIGGER IF NOT EXISTS trg_coordination_lane_checkpoint_open_items_immutable_delete
BEFORE DELETE ON coordination_lane_checkpoint_open_items
FOR EACH ROW
BEGIN
  SELECT RAISE(ABORT, 'coordination checkpoint OPEN_ITEMS are immutable');
END;

CREATE TABLE IF NOT EXISTS coordination_lane_checkpoint_open_item_exits (
  checkpoint_id TEXT NOT NULL CHECK(length(trim(checkpoint_id)) > 0),
  open_item_id TEXT NOT NULL CHECK(length(trim(open_item_id)) > 0),
  exit_disposition TEXT NOT NULL CHECK(exit_disposition IN ('RESOLVED','WITHDRAWN','REPLACED')),
  exit_note TEXT NOT NULL CHECK(length(trim(exit_note)) > 0),
  replacement_open_item_id TEXT NULL,
  PRIMARY KEY(checkpoint_id, open_item_id),
  CHECK(
    (exit_disposition = 'REPLACED' AND replacement_open_item_id IS NOT NULL AND length(trim(replacement_open_item_id)) > 0)
    OR (exit_disposition IN ('RESOLVED','WITHDRAWN') AND replacement_open_item_id IS NULL)
  ),
  FOREIGN KEY(checkpoint_id) REFERENCES coordination_lane_checkpoints(id)
    ON DELETE RESTRICT DEFERRABLE INITIALLY DEFERRED,
  FOREIGN KEY(checkpoint_id, replacement_open_item_id)
    REFERENCES coordination_lane_checkpoint_open_items(checkpoint_id, open_item_id)
    ON DELETE RESTRICT DEFERRABLE INITIALLY DEFERRED
);

CREATE TRIGGER IF NOT EXISTS trg_coordination_lane_checkpoint_open_item_exits_replacement_added
BEFORE INSERT ON coordination_lane_checkpoint_open_item_exits
FOR EACH ROW
WHEN NEW.exit_disposition = 'REPLACED' AND NOT EXISTS (
  SELECT 1
  FROM coordination_lane_checkpoint_open_items AS replacement
  WHERE replacement.checkpoint_id = NEW.checkpoint_id
    AND replacement.open_item_id = NEW.replacement_open_item_id
    AND replacement.continuity_kind = 'ADDED'
)
BEGIN
  SELECT RAISE(ABORT, 'coordination checkpoint replacement must identify an ADDED current item in the same successor');
END;

CREATE TRIGGER IF NOT EXISTS trg_coordination_lane_checkpoint_open_item_exits_closed_insert
BEFORE INSERT ON coordination_lane_checkpoint_open_item_exits
FOR EACH ROW
WHEN EXISTS (
  SELECT 1 FROM coordination_lane_checkpoints WHERE id = NEW.checkpoint_id
)
BEGIN
  SELECT RAISE(ABORT, 'coordination checkpoint OPEN_ITEMS exit evidence is already closed');
END;

CREATE TRIGGER IF NOT EXISTS trg_coordination_lane_checkpoint_open_item_exits_immutable_update
BEFORE UPDATE ON coordination_lane_checkpoint_open_item_exits
FOR EACH ROW
BEGIN
  SELECT RAISE(ABORT, 'coordination checkpoint OPEN_ITEMS exit evidence is immutable');
END;

CREATE TRIGGER IF NOT EXISTS trg_coordination_lane_checkpoint_open_item_exits_immutable_delete
BEFORE DELETE ON coordination_lane_checkpoint_open_item_exits
FOR EACH ROW
BEGIN
  SELECT RAISE(ABORT, 'coordination checkpoint OPEN_ITEMS exit evidence is immutable');
END;

-- Human-authored Project Context Configuration
CREATE TABLE IF NOT EXISTS project_contexts (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL UNIQUE,
  overview TEXT,
  purpose TEXT,
  standing_instructions TEXT,
  tone_voice TEXT,
  guardrails TEXT,
  output_standards TEXT,
  decision_rules TEXT,
  source_of_truth TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE
);

CREATE TRIGGER IF NOT EXISTS trg_project_contexts_updated_at
AFTER UPDATE ON project_contexts
FOR EACH ROW
WHEN NEW.updated_at = OLD.updated_at OR NEW.updated_at IS OLD.updated_at
BEGIN
  UPDATE project_contexts SET updated_at = datetime('now') WHERE id = NEW.id;
END;

-- CTX3 derived Project Context Snapshot storage
CREATE TABLE IF NOT EXISTS project_context_snapshots (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL UNIQUE,
  current_version_id TEXT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(id, current_version_id),
  FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE RESTRICT,
  FOREIGN KEY(id, current_version_id)
    REFERENCES project_context_snapshot_versions(snapshot_id, id)
    ON UPDATE RESTRICT ON DELETE RESTRICT
    DEFERRABLE INITIALLY DEFERRED
);

CREATE TABLE IF NOT EXISTS project_context_snapshot_versions (
  id TEXT PRIMARY KEY,
  snapshot_id TEXT NOT NULL,
  schema_version TEXT NOT NULL CHECK(schema_version = 'project-context.v1'),
  project_slug TEXT NOT NULL CHECK(length(trim(project_slug)) > 0),
  generated_from_fingerprint TEXT NOT NULL CHECK(
    length(generated_from_fingerprint) = 64
    AND generated_from_fingerprint NOT GLOB '*[^0-9a-f]*'
  ),
  published_corpus_fingerprint TEXT NULL,
  coverage_json TEXT NOT NULL CHECK(json_valid(coverage_json)),
  synthesis_json TEXT NOT NULL CHECK(json_valid(synthesis_json)),
  rendered_markdown TEXT NOT NULL,
  generated_at TEXT NOT NULL,
  approved_at TEXT NULL,
  approved_by TEXT NULL,
  publication_state TEXT NOT NULL CHECK(publication_state IN ('PUBLISHING', 'PUBLISHED')),
  UNIQUE(snapshot_id, id),
  FOREIGN KEY(snapshot_id) REFERENCES project_context_snapshots(id) ON DELETE RESTRICT,
  FOREIGN KEY(approved_by) REFERENCES human_operators(id) ON DELETE RESTRICT,
  CHECK(
    (
      publication_state = 'PUBLISHING'
      AND published_corpus_fingerprint IS NULL
    )
    OR
    (
      publication_state = 'PUBLISHED'
      AND length(published_corpus_fingerprint) = 64
      AND published_corpus_fingerprint NOT GLOB '*[^0-9a-f]*'
      AND approved_at IS NOT NULL
      AND length(trim(approved_at)) > 0
      AND approved_by IS NOT NULL
      AND length(trim(approved_by)) > 0
    )
  )
);

CREATE INDEX IF NOT EXISTS idx_project_context_snapshot_versions_snapshot
ON project_context_snapshot_versions(snapshot_id);

CREATE TRIGGER IF NOT EXISTS trg_project_context_snapshots_identity_immutable
BEFORE UPDATE OF id, project_id ON project_context_snapshots
FOR EACH ROW
BEGIN
  SELECT RAISE(ABORT, 'project context snapshot identity is immutable');
END;

CREATE TRIGGER IF NOT EXISTS trg_project_context_snapshots_current_insert
BEFORE INSERT ON project_context_snapshots
FOR EACH ROW
WHEN NEW.current_version_id IS NOT NULL
BEGIN
  SELECT CASE
    WHEN NOT EXISTS (
      SELECT 1
      FROM project_context_snapshot_versions v
      WHERE v.id = NEW.current_version_id
        AND v.snapshot_id = NEW.id
        AND v.publication_state = 'PUBLISHED'
    )
    THEN RAISE(ABORT, 'current snapshot version must be published and belong to the same container')
  END;
END;

CREATE TRIGGER IF NOT EXISTS trg_project_context_snapshots_current_update
BEFORE UPDATE OF current_version_id ON project_context_snapshots
FOR EACH ROW
WHEN NEW.current_version_id IS NOT NULL
BEGIN
  SELECT CASE
    WHEN NOT EXISTS (
      SELECT 1
      FROM project_context_snapshot_versions v
      WHERE v.id = NEW.current_version_id
        AND v.snapshot_id = NEW.id
        AND v.publication_state = 'PUBLISHED'
    )
    THEN RAISE(ABORT, 'current snapshot version must be published and belong to the same container')
  END;
END;

CREATE TRIGGER IF NOT EXISTS trg_project_context_snapshot_versions_content_immutable
BEFORE UPDATE OF
  id,
  snapshot_id,
  schema_version,
  project_slug,
  generated_from_fingerprint,
  coverage_json,
  synthesis_json,
  rendered_markdown,
  generated_at
ON project_context_snapshot_versions
FOR EACH ROW
BEGIN
  SELECT RAISE(ABORT, 'project context snapshot version content is immutable');
END;

CREATE TRIGGER IF NOT EXISTS trg_project_context_snapshot_versions_published_immutable
BEFORE UPDATE ON project_context_snapshot_versions
FOR EACH ROW
WHEN OLD.publication_state = 'PUBLISHED'
BEGIN
  SELECT RAISE(ABORT, 'published project context snapshot version is immutable');
END;

CREATE TRIGGER IF NOT EXISTS trg_project_context_snapshot_versions_published_no_delete
BEFORE DELETE ON project_context_snapshot_versions
FOR EACH ROW
WHEN OLD.publication_state = 'PUBLISHED'
BEGIN
  SELECT RAISE(ABORT, 'published project context snapshot version cannot be deleted');
END;

-- Project Documentation Blocks
CREATE TABLE IF NOT EXISTS project_doc_blocks (
  id                  TEXT PRIMARY KEY,
  project_id          TEXT NOT NULL,
  legacy_project_slug TEXT NULL,
  import_source       TEXT NULL CHECK(import_source IN ('localstorage_recovery', 'google_sheet', 'manual', 'arbor_summary') OR import_source IS NULL),
  import_batch_id     TEXT NULL,
  migrated_at         TEXT NULL,
  source_row_number   INTEGER NULL,
  source_record_id    TEXT NULL,
  block_type          TEXT NOT NULL CHECK (block_type IN ('brief', 'structure', 'sop', 'process_note', 'decision', 'milestone', 'issue_fix', 'publish', 'qa_review')),
  title               TEXT NOT NULL,
  block_date          TEXT NOT NULL, -- YYYY-MM-DD
  summary             TEXT NOT NULL,
  details_md          TEXT NOT NULL,
  evidence_links_json TEXT NOT NULL DEFAULT '[]',
  related_files_json  TEXT NOT NULL DEFAULT '[]',
  next_action         TEXT NULL,
  status              TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  order_index         INTEGER NULL,

  -- Source tracking & Arbor Assistant
  source_text         TEXT NULL,
  source_excerpt      TEXT NULL,
  source_type         TEXT NULL CHECK (source_type IN ('manual_paste', 'walkthrough', 'commit_log', 'qa_report', 'publish_log', 'chat_summary') OR source_type IS NULL),
  generated_by        TEXT NULL CHECK (generated_by IN ('arbor') OR generated_by IS NULL),
  reviewed_by_user    INTEGER NOT NULL DEFAULT 0 CHECK (reviewed_by_user IN (0, 1)),
  applied_at          TEXT NULL,

  created_at          TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at          TEXT NOT NULL DEFAULT (datetime('now')),

  FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE RESTRICT
);

CREATE TRIGGER IF NOT EXISTS trg_project_doc_blocks_updated_at
AFTER UPDATE ON project_doc_blocks
FOR EACH ROW
WHEN NEW.updated_at = OLD.updated_at OR NEW.updated_at IS OLD.updated_at
BEGIN
  UPDATE project_doc_blocks SET updated_at = datetime('now') WHERE id = NEW.id;
END;

CREATE INDEX IF NOT EXISTS idx_project_doc_blocks_proj_order ON project_doc_blocks(project_id, order_index, block_date);
CREATE INDEX IF NOT EXISTS idx_project_doc_blocks_proj_date ON project_doc_blocks(project_id, block_date);

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

-- Arbor Writing Lab Entities
CREATE TABLE IF NOT EXISTS gf_story_sets (
  id           TEXT PRIMARY KEY,
  slug         TEXT NULL,
  title        TEXT NOT NULL,
  description  TEXT NULL,
  status       TEXT NOT NULL DEFAULT 'active',
  created_at   TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS gf_episodes (
  id                      TEXT PRIMARY KEY,
  story_set_id            TEXT NOT NULL,
  title                   TEXT NOT NULL,
  slug                    TEXT NULL,
  description             TEXT NULL,
  role                    TEXT NOT NULL CHECK (role IN ('core_episode', 'supporting_article', 'bridge_article', 'practical_guide', 'journal_note', 'social_only_piece')),
  journey_stage           TEXT NULL,
  attached_to_episode_id  TEXT NULL,
  sort_order              INTEGER NOT NULL DEFAULT 0,
  narrative_status        TEXT NOT NULL DEFAULT 'unmapped',
  status                  TEXT NOT NULL DEFAULT 'planned',
  created_at              TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at              TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY(story_set_id) REFERENCES gf_story_sets(id) ON DELETE CASCADE,
  FOREIGN KEY(attached_to_episode_id) REFERENCES gf_episodes(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS gf_writing_projects (
  id                TEXT PRIMARY KEY,
  topic_id          TEXT NULL,
  title             TEXT NOT NULL,
  slug              TEXT NULL,
  story_set_id      TEXT NULL,
  episode_id        TEXT NULL,
  writing_mode      TEXT NOT NULL CHECK (writing_mode IN ('knowledge_article', 'knowledge_journey_article', 'documentary_chapter', 'writers_journal', 'social_story_copy', 'journey_chapter')),
  episode_role      TEXT NULL,
  journey_stage     TEXT NULL,
  status            TEXT NOT NULL DEFAULT 'draft',
  summary           TEXT NULL,
  notes             TEXT NULL,
  attached_to       TEXT NULL,
  tone_profile      TEXT NULL,
  web_voice_guideline TEXT NULL,
  group_voice_guideline TEXT NULL,
  page_voice_guideline TEXT NULL,
  personal_voice_guideline TEXT NULL,
  claim_guardrail_note TEXT NULL,
  narrative_body    TEXT NULL,
  knowledge_body    TEXT NULL,
  narrative_title   TEXT NULL,
  narrative_slug    TEXT NULL,
  narrative_hero_subtitle TEXT NULL,
  narrative_featured_image_url TEXT NULL,
  narrative_short_summary TEXT NULL,
  narrative_meta_title TEXT NULL,
  narrative_meta_description TEXT NULL,
  narrative_keywords TEXT NULL,
  narrative_schema_jsonld TEXT NULL,
  narrative_status  TEXT NULL,
  narrative_editors_pick INTEGER NULL,
  narrative_related_knowledge_article TEXT NULL,
  narrative_journey_stage TEXT NULL,
  knowledge_title   TEXT NULL,
  knowledge_slug    TEXT NULL,
  knowledge_hero_subtitle TEXT NULL,
  knowledge_featured_image_url TEXT NULL,
  knowledge_short_summary TEXT NULL,
  knowledge_meta_title TEXT NULL,
  knowledge_meta_description TEXT NULL,
  knowledge_keywords TEXT NULL,
  knowledge_schema_jsonld TEXT NULL,
  knowledge_status  TEXT NULL,
  knowledge_editors_pick INTEGER NULL,
  knowledge_related_narrative_article TEXT NULL,
  knowledge_primary_keyword TEXT NULL,
  knowledge_secondary_keywords TEXT NULL,
  knowledge_category TEXT NULL,
  created_at        TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at        TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY(story_set_id) REFERENCES gf_story_sets(id) ON DELETE SET NULL,
  FOREIGN KEY(episode_id) REFERENCES gf_episodes(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS gf_writing_blocks (
  id                  TEXT PRIMARY KEY,
  writing_project_id  TEXT NOT NULL,
  block_type          TEXT NOT NULL DEFAULT 'text',
  label               TEXT NULL,
  placeholder         TEXT NULL,
  content_md          TEXT NOT NULL DEFAULT '',
  sort_order          INTEGER NOT NULL DEFAULT 0,
  created_at          TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at          TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY(writing_project_id) REFERENCES gf_writing_projects(id) ON DELETE CASCADE
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

-- ---------------------------------------------------------------------------
-- WorkOS Sheet Import Audit (WORKOS-SHEET-GATE-4B)
-- Canonical mirror of src/lib/project-import/auditSchema.ts
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS import_batches (
  id TEXT PRIMARY KEY,
  dry_run_id TEXT NOT NULL,
  schema_version TEXT NOT NULL,
  parser_contract_version TEXT NOT NULL,
  dry_run_contract_version TEXT NOT NULL,
  workbook_id TEXT NULL,
  batch_reference TEXT NULL,
  source_system TEXT NULL,
  source_filename TEXT NULL,
  source_filename_sanitized TEXT NULL,
  source_file_hash TEXT NOT NULL,
  source_file_size INTEGER NOT NULL,
  source_mime_type TEXT NULL,
  timezone TEXT NULL,
  prepared_by TEXT NULL,
  batch_status TEXT NOT NULL DEFAULT 'dry_run_created' CHECK (batch_status IN ('dry_run_created','dry_run_invalid','ready_for_approval','partially_ready','approved','partially_approved','rejected','approval_expired','execution_started','executed','partially_executed','execution_failed','cancelled','retention_eligible','deleted')),
  project_documentation_status TEXT NULL CHECK (project_documentation_status IN ('ready','ready_with_warnings','blocked','approved','rejected','expired','executed')),
  backlog_status TEXT NULL CHECK (backlog_status IN ('ready','ready_with_warnings','blocked','approved','rejected','expired','executed')),
  total_rows INTEGER NOT NULL DEFAULT 0,
  new_rows INTEGER NOT NULL DEFAULT 0,
  duplicate_rows INTEGER NOT NULL DEFAULT 0,
  conflict_rows INTEGER NOT NULL DEFAULT 0,
  review_required_rows INTEGER NOT NULL DEFAULT 0,
  invalid_rows INTEGER NOT NULL DEFAULT 0,
  skipped_rows INTEGER NOT NULL DEFAULT 0,
  warning_count INTEGER NOT NULL DEFAULT 0,
  error_count INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  retention_eligible_at TEXT NULL,
  payload_purged_at TEXT NULL,
  deleted_at TEXT NULL
);
CREATE INDEX IF NOT EXISTS idx_import_batches_dry_run_id ON import_batches(dry_run_id);
CREATE INDEX IF NOT EXISTS idx_import_batches_file_hash ON import_batches(source_file_hash);
CREATE INDEX IF NOT EXISTS idx_import_batches_status ON import_batches(batch_status);
CREATE INDEX IF NOT EXISTS idx_import_batches_created_at ON import_batches(created_at);
CREATE INDEX IF NOT EXISTS idx_import_batches_retention ON import_batches(retention_eligible_at);
CREATE TRIGGER IF NOT EXISTS trg_import_batches_updated_at
AFTER UPDATE ON import_batches
FOR EACH ROW
WHEN NEW.updated_at = OLD.updated_at OR NEW.updated_at IS OLD.updated_at
BEGIN
  UPDATE import_batches SET updated_at = datetime('now') WHERE id = NEW.id;
END;

CREATE TABLE IF NOT EXISTS import_batch_rows (
  id TEXT PRIMARY KEY,
  batch_id TEXT NOT NULL REFERENCES import_batches(id) ON DELETE RESTRICT,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('project_documentation','backlog')),
  worksheet_name TEXT NOT NULL,
  source_row_number INTEGER NOT NULL,
  external_row_id TEXT NULL,
  project_slug TEXT NULL,
  resolved_project_id TEXT NULL,
  parser_status TEXT NOT NULL CHECK (parser_status IN ('valid','valid_with_warnings','invalid','skipped')),
  dry_run_status TEXT NOT NULL CHECK (dry_run_status IN ('new','duplicate','conflict','review_required','invalid','skipped')),
  proposed_operation TEXT NOT NULL CHECK (proposed_operation IN ('insert','none','manual_review')),
  normalized_payload_json TEXT NULL,
  validation_issue_codes_json TEXT NOT NULL DEFAULT '[]',
  warning_count INTEGER NOT NULL DEFAULT 0,
  error_count INTEGER NOT NULL DEFAULT 0,
  existing_record_reference TEXT NULL,
  target_table TEXT NULL,
  target_record_id TEXT NULL,
  execution_status TEXT NOT NULL DEFAULT 'not_started' CHECK (execution_status IN ('not_started','attempted','committed','rolled_back','failed_before_write','skipped')),
  execution_error_code TEXT NULL,
  executed_at TEXT NULL,
  retry_count INTEGER NOT NULL DEFAULT 0,
  last_attempt_reference TEXT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_import_batch_rows_batch_entity ON import_batch_rows(batch_id, entity_type);
CREATE INDEX IF NOT EXISTS idx_import_batch_rows_batch_sheet_row ON import_batch_rows(batch_id, worksheet_name, source_row_number);
CREATE INDEX IF NOT EXISTS idx_import_batch_rows_project_entity_ext ON import_batch_rows(resolved_project_id, entity_type, external_row_id);
CREATE INDEX IF NOT EXISTS idx_import_batch_rows_target ON import_batch_rows(target_record_id);
CREATE TRIGGER IF NOT EXISTS trg_import_batch_rows_updated_at
AFTER UPDATE ON import_batch_rows
FOR EACH ROW
WHEN NEW.updated_at = OLD.updated_at OR NEW.updated_at IS OLD.updated_at
BEGIN
  UPDATE import_batch_rows SET updated_at = datetime('now') WHERE id = NEW.id;
END;

CREATE TABLE IF NOT EXISTS import_approvals (
  id TEXT PRIMARY KEY,
  batch_id TEXT NOT NULL REFERENCES import_batches(id) ON DELETE RESTRICT,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('project_documentation','backlog')),
  approval_status TEXT NOT NULL DEFAULT 'pending' CHECK (approval_status IN ('pending','approved','rejected','expired','revoked','consumed')),
  approved_by TEXT NULL,
  approved_at TEXT NULL,
  expires_at TEXT NULL,
  rejected_by TEXT NULL,
  rejected_at TEXT NULL,
  revoked_by TEXT NULL,
  revoked_at TEXT NULL,
  consumed_at TEXT NULL,
  bound_file_hash TEXT NOT NULL,
  bound_dry_run_id TEXT NOT NULL,
  bound_schema_version TEXT NOT NULL,
  bound_parser_contract_version TEXT NOT NULL,
  bound_dry_run_contract_version TEXT NOT NULL,
  approval_summary_fingerprint TEXT NOT NULL,
  reason_or_note TEXT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_import_approvals_batch_entity ON import_approvals(batch_id, entity_type);
CREATE INDEX IF NOT EXISTS idx_import_approvals_expiry ON import_approvals(batch_id, entity_type, expires_at);
CREATE INDEX IF NOT EXISTS idx_import_approvals_dry_run ON import_approvals(bound_dry_run_id);
CREATE INDEX IF NOT EXISTS idx_import_approvals_file_hash ON import_approvals(bound_file_hash);

CREATE TABLE IF NOT EXISTS import_approval_events (
  id TEXT PRIMARY KEY,
  approval_id TEXT NOT NULL REFERENCES import_approvals(id) ON DELETE RESTRICT,
  event_type TEXT NOT NULL CHECK (event_type IN ('created','approved','rejected','expired','revoked','consumed')),
  actor TEXT NULL,
  occurred_at TEXT NULL,
  event_code TEXT NULL,
  safe_reason TEXT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_import_approval_events_approval ON import_approval_events(approval_id);
CREATE INDEX IF NOT EXISTS idx_import_approval_events_type ON import_approval_events(event_type);
CREATE INDEX IF NOT EXISTS idx_import_approval_events_created ON import_approval_events(created_at);

CREATE TABLE IF NOT EXISTS import_execution_attempts (
  id TEXT PRIMARY KEY,
  batch_id TEXT NOT NULL REFERENCES import_batches(id) ON DELETE RESTRICT,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('project_documentation','backlog')),
  approval_id TEXT NULL,
  attempt_number INTEGER NOT NULL,
  execution_status TEXT NOT NULL CHECK (execution_status IN ('started','committed','rolled_back','failed_before_write','failed','cancelled')),
  started_at TEXT NULL,
  finished_at TEXT NULL,
  eligible_row_count INTEGER NOT NULL DEFAULT 0,
  attempted_row_count INTEGER NOT NULL DEFAULT 0,
  committed_row_count INTEGER NOT NULL DEFAULT 0,
  skipped_row_count INTEGER NOT NULL DEFAULT 0,
  rolled_back_row_count INTEGER NOT NULL DEFAULT 0,
  failure_code TEXT NULL,
  safe_failure_message TEXT NULL,
  transaction_reference TEXT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_import_attempts_batch_entity ON import_execution_attempts(batch_id, entity_type);
CREATE INDEX IF NOT EXISTS idx_import_attempts_approval ON import_execution_attempts(approval_id);
CREATE INDEX IF NOT EXISTS idx_import_attempts_created ON import_execution_attempts(created_at);

CREATE TABLE IF NOT EXISTS import_cleanup_log (
  id TEXT PRIMARY KEY,
  batch_id TEXT NULL REFERENCES import_batches(id) ON DELETE SET NULL,
  cleanup_action TEXT NOT NULL,
  cleanup_scope TEXT NOT NULL,
  initiated_by TEXT NULL,
  reason TEXT NULL,
  rows_affected INTEGER NOT NULL DEFAULT 0,
  payloads_purged INTEGER NOT NULL DEFAULT 0,
  records_deleted INTEGER NOT NULL DEFAULT 0,
  started_at TEXT NULL,
  completed_at TEXT NULL,
  status TEXT NOT NULL DEFAULT 'started' CHECK (status IN ('started','completed','failed')),
  error_code TEXT NULL,
  safe_error_message TEXT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_import_cleanup_batch ON import_cleanup_log(batch_id);
CREATE INDEX IF NOT EXISTS idx_import_cleanup_status ON import_cleanup_log(status);
