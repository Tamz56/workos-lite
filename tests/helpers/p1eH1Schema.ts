// P1E.1C remaining-H1 test schema (superset for guard + representative success).

import type Database from "better-sqlite3";

export function createRemainingH1Schema(db: Database.Database): void {
    db.exec(`
        CREATE TABLE tasks (
          id TEXT PRIMARY KEY, title TEXT NOT NULL, workspace TEXT NOT NULL,
          status TEXT NOT NULL, list_id TEXT, doc_id TEXT, scheduled_date TEXT,
          notes TEXT, is_seed INTEGER DEFAULT 0,
          created_at TEXT, updated_at TEXT
        );
        CREATE TABLE docs (
          id TEXT PRIMARY KEY, title TEXT, content_md TEXT, project_id TEXT,
          workspace TEXT, created_at TEXT, updated_at TEXT
        );
        CREATE TABLE notes (
          id TEXT PRIMARY KEY, title TEXT, content_json TEXT, content_html TEXT,
          plain_text TEXT, project_id TEXT, created_at TEXT, updated_at TEXT
        );
        CREATE TABLE note_links (
          id TEXT PRIMARY KEY, note_id TEXT NOT NULL,
          linked_entity_type TEXT NOT NULL, linked_entity_id TEXT NOT NULL,
          created_at TEXT
        );
        CREATE TABLE lists (
          id TEXT PRIMARY KEY, workspace TEXT NOT NULL, slug TEXT NOT NULL,
          title TEXT NOT NULL, description TEXT, is_seed INTEGER DEFAULT 0,
          created_at TEXT, updated_at TEXT
        );
        CREATE TABLE projects (
          id TEXT PRIMARY KEY, slug TEXT NOT NULL UNIQUE, name TEXT NOT NULL,
          status TEXT NOT NULL, is_seed INTEGER DEFAULT 0,
          created_at TEXT, updated_at TEXT
        );
        CREATE TABLE project_items (
          id TEXT PRIMARY KEY, project_id TEXT NOT NULL, title TEXT NOT NULL,
          status TEXT NOT NULL, created_at TEXT, updated_at TEXT
        );
        CREATE TABLE sprints (
          id TEXT PRIMARY KEY, project_id TEXT NOT NULL, name TEXT NOT NULL,
          status TEXT NOT NULL, start_date TEXT, end_date TEXT
        );
        CREATE TABLE sprint_items (
          sprint_id TEXT NOT NULL, project_item_id TEXT NOT NULL
        );
        CREATE TABLE planner_days (
          id TEXT PRIMARY KEY, plan_date TEXT NOT NULL UNIQUE,
          main_outcome TEXT, daily_capacity_minutes INTEGER, energy_level TEXT,
          status TEXT DEFAULT 'planning', created_at TEXT, updated_at TEXT
        );
        CREATE TABLE planner_items (
          id TEXT PRIMARY KEY, planner_day_id TEXT NOT NULL,
          source_type TEXT NOT NULL, source_id TEXT NOT NULL,
          work_mode TEXT NOT NULL, priority TEXT NOT NULL,
          estimated_minutes INTEGER, start_time TEXT, end_time TEXT,
          ai_provider_key TEXT, energy_level TEXT, scheduled_block TEXT,
          planned_order INTEGER NOT NULL, planner_status TEXT NOT NULL,
          is_main_task INTEGER NOT NULL DEFAULT 0,
          created_at TEXT, updated_at TEXT
        );
        CREATE TABLE gf_story_sets (
          id TEXT PRIMARY KEY, slug TEXT, title TEXT, description TEXT,
          status TEXT, created_at TEXT, updated_at TEXT
        );
        CREATE TABLE gf_episodes (
          id TEXT PRIMARY KEY, story_set_id TEXT, title TEXT, role TEXT,
          status TEXT, created_at TEXT, updated_at TEXT
        );
        CREATE TABLE gf_writing_projects (
          id TEXT PRIMARY KEY, episode_id TEXT, title TEXT, status TEXT,
          writing_mode TEXT, created_at TEXT, updated_at TEXT
        );
        CREATE TABLE gf_writing_blocks (
          id TEXT PRIMARY KEY, writing_project_id TEXT, content TEXT,
          content_md TEXT, updated_at TEXT
        );
        CREATE TABLE writing_desk_drafts (
          id TEXT PRIMARY KEY, topic_id TEXT, topic_title TEXT,
          content_type TEXT, draft_stage TEXT, writing_mode TEXT,
          source_step TEXT, body TEXT, notes TEXT, linked_task_id TEXT,
          created_at TEXT, updated_at TEXT
        );
        CREATE TABLE arbor_review_results (
          id TEXT PRIMARY KEY, draft_id TEXT, score INTEGER, notes TEXT,
          created_at TEXT
        );
        CREATE TABLE prompt_templates (
          id TEXT PRIMARY KEY, name TEXT NOT NULL, category TEXT,
          purpose TEXT, role TEXT, context TEXT, input_fields TEXT,
          instructions TEXT, constraints TEXT, output_format TEXT,
          review_checklist TEXT, notes TEXT, status TEXT, version TEXT,
          version_notes TEXT, guardrail_preset_ids TEXT,
          created_at TEXT, updated_at TEXT
        );
        CREATE TABLE prompt_versions (
          id TEXT PRIMARY KEY, prompt_template_id TEXT NOT NULL,
          version INTEGER, revision_notes TEXT, is_active INTEGER DEFAULT 0,
          created_at TEXT
        );
        CREATE TABLE prompt_workflows (
          id TEXT PRIMARY KEY, name TEXT NOT NULL, description TEXT,
          status TEXT, created_at TEXT, updated_at TEXT
        );
        CREATE TABLE prompt_workflow_steps (
          id TEXT PRIMARY KEY, workflow_id TEXT NOT NULL, step_name TEXT,
          sort_order INTEGER, created_at TEXT, updated_at TEXT
        );
        CREATE TABLE prompt_run_logs (
          id TEXT PRIMARY KEY, workflow_id TEXT, status TEXT, result_json TEXT,
          created_at TEXT, updated_at TEXT
        );
        CREATE TABLE project_decisions (
          id TEXT PRIMARY KEY, project_id TEXT NOT NULL, title TEXT,
          decision TEXT, reason TEXT, impact TEXT, created_at TEXT
        );
        CREATE TABLE project_loops (
          id TEXT PRIMARY KEY, project_id TEXT NOT NULL, title TEXT,
          status TEXT, created_at TEXT, updated_at TEXT
        );
        CREATE TABLE project_loop_gate_events (
          id TEXT PRIMARY KEY, loop_id TEXT NOT NULL, event_type TEXT,
          created_at TEXT
        );
        CREATE TABLE project_contexts (
          project_id TEXT PRIMARY KEY, context_text TEXT, updated_at TEXT
        );
        CREATE TABLE project_doc_blocks (
          id TEXT PRIMARY KEY, project_id TEXT NOT NULL,
          legacy_project_slug TEXT, import_source TEXT, import_batch_id TEXT,
          migrated_at TEXT, source_row_number INTEGER, source_record_id TEXT,
          block_type TEXT NOT NULL, title TEXT NOT NULL, block_date TEXT NOT NULL,
          summary TEXT NOT NULL, details_md TEXT NOT NULL,
          evidence_links_json TEXT NOT NULL DEFAULT '[]',
          related_files_json TEXT NOT NULL DEFAULT '[]',
          next_action TEXT, status TEXT NOT NULL DEFAULT 'active',
          order_index INTEGER, source_text TEXT, source_excerpt TEXT,
          source_type TEXT, generated_by TEXT,
          reviewed_by_user INTEGER NOT NULL DEFAULT 0, applied_at TEXT,
          created_at TEXT NOT NULL, updated_at TEXT NOT NULL
        );
        CREATE TABLE planner_import_batches (
          id TEXT PRIMARY KEY, fingerprint TEXT NOT NULL UNIQUE,
          project_id TEXT NOT NULL, source_text_hash TEXT NOT NULL,
          conflict_policy TEXT NOT NULL, result_json TEXT NOT NULL,
          created_at TEXT DEFAULT (datetime('now'))
        );
    `);
}
