import Database from 'better-sqlite3';
import path from 'path';
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

// Migration: Add project_contexts and project_decisions tables
console.log("Adding project_contexts and project_decisions tables if needed...");
db.exec(`
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

    CREATE TABLE IF NOT EXISTS project_decisions (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      title TEXT NOT NULL,
      decision TEXT NOT NULL,
      reason TEXT,
      impact TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_project_decisions_project_id ON project_decisions(project_id);
`);
console.log("Context and Decisions tables created/verified.");

// Migration: Add project_loop_templates and project_loops tables
console.log("Adding project_loop_templates and project_loops tables if needed...");
db.exec(`
    CREATE TABLE IF NOT EXISTS project_loop_templates (
      id TEXT PRIMARY KEY,
      template_name TEXT NOT NULL,
      loop_type TEXT NOT NULL,
      description TEXT,
      steps_json TEXT NOT NULL,
      expected_outputs_json TEXT,
      default_risk_level TEXT NOT NULL DEFAULT 'low',
      default_review_gate_level INTEGER NOT NULL DEFAULT 1,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TRIGGER IF NOT EXISTS trg_project_loop_templates_updated_at
    AFTER UPDATE ON project_loop_templates
    FOR EACH ROW
    WHEN NEW.updated_at = OLD.updated_at OR NEW.updated_at IS OLD.updated_at
    BEGIN
      UPDATE project_loop_templates SET updated_at = datetime('now') WHERE id = NEW.id;
    END;

    CREATE TABLE IF NOT EXISTS project_loops (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      template_id TEXT,
      loop_name TEXT NOT NULL,
      loop_type TEXT NOT NULL,
      current_step TEXT,
      status TEXT NOT NULL DEFAULT 'draft',
      risk_level TEXT NOT NULL DEFAULT 'low',
      review_gate_level INTEGER NOT NULL DEFAULT 0,
      expected_output TEXT,
      save_destination TEXT,
      learn_note TEXT,
      steps_json TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      completed_at TEXT,
      FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE
    );

    CREATE TRIGGER IF NOT EXISTS trg_project_loops_updated_at
    AFTER UPDATE ON project_loops
    FOR EACH ROW
    WHEN NEW.updated_at = OLD.updated_at OR NEW.updated_at IS OLD.updated_at
    BEGIN
      UPDATE project_loops SET updated_at = datetime('now') WHERE id = NEW.id;
    END;
`);

// Seed loops templates
console.log("Seeding project loop templates...");
db.prepare(`
    INSERT OR IGNORE INTO project_loop_templates (
        id, template_name, loop_type, description, steps_json, expected_outputs_json, 
        default_risk_level, default_review_gate_level, is_active, created_at, updated_at
    ) VALUES (
        'tpl-gf-article-loop-v1',
        'GF Article Loop v1',
        'content_creation',
        'Enforces strict Green Fineness Knowledge Articles Standard: research-backed, readable, and system-oriented.',
        '["Topic Idea", "Content Brief", "Knowledge Angle", "Draft Article", "Claim Risk Review", "GF Tone Review", "Website Fields", "Image Brief", "Social Drafts", "Publish Checklist", "Learn Note"]',
        '["Article Draft", "SEO Title", "Excerpt", "Slug Suggestion", "Facebook Caption", "Image Prompt", "Claim Risk Notes", "Publish Checklist"]',
        'low',
        1,
        1,
        datetime('now'),
        datetime('now')
    )
`).run();

db.prepare(`
    INSERT OR IGNORE INTO project_loop_templates (
        id, template_name, loop_type, description, steps_json, expected_outputs_json, 
        default_risk_level, default_review_gate_level, is_active, created_at, updated_at
    ) VALUES (
        'tpl-claim-tone-review-loop-v1',
        'Claim & Tone Review Loop v1',
        'content_review',
        'Compliance and scientific credibility scan for Thai content drafts.',
        '["Input Content", "Claim Scan", "Risk Classification", "Tone Review", "Safer Wording", "Final Review", "Pass / Partial / Failed", "Learn Note"]',
        '["Passed / Partial / Failed", "Risk Notes", "Suggested Safer Wording", "Final Review Summary"]',
        'low',
        1,
        1,
        datetime('now'),
        datetime('now')
    )
`).run();

db.prepare(`
    INSERT OR IGNORE INTO project_loop_templates (
        id, template_name, loop_type, description, steps_json, expected_outputs_json, 
        default_risk_level, default_review_gate_level, is_active, created_at, updated_at
    ) VALUES (
        'tpl-workos-dev-loop-v1',
        'WorkOS Dev Loop v1',
        'dev_work',
        'Pair programming and QA pipeline validation standard.',
        '["Problem", "Scope", "Implementation Plan", "Patch", "Lint / Build", "QA Evidence", "User Review", "Commit Readiness", "Handoff Note"]',
        '["Implementation Plan", "Files Changed", "QA Evidence", "Build Result", "Lint Result", "Git Status", "Commit Recommendation"]',
        'medium',
        2,
        1,
        datetime('now'),
        datetime('now')
    )
`).run();
console.log("Loops templates seeded/verified.");

// Migration: Add Decision Gate columns to project_loops and create project_loop_gate_events
console.log("Adding Decision Gate columns/tables if needed...");
try {
    db.exec("ALTER TABLE project_loops ADD COLUMN gate_status TEXT DEFAULT 'not_required'");
} catch (e) { /* ignore */ }
try {
    db.exec("ALTER TABLE project_loops ADD COLUMN last_gate_action TEXT");
} catch (e) { /* ignore */ }
try {
    db.exec("ALTER TABLE project_loops ADD COLUMN last_gate_at TEXT");
} catch (e) { /* ignore */ }

db.exec(`
    CREATE TABLE IF NOT EXISTS project_loop_gate_events (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      loop_id TEXT NOT NULL,
      gate_level INTEGER NOT NULL,
      gate_action TEXT NOT NULL,
      gate_status TEXT NOT NULL,
      summary TEXT,
      reason TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE,
      FOREIGN KEY(loop_id) REFERENCES project_loops(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_project_loop_gate_events_loop_id ON project_loop_gate_events(loop_id);
`);
console.log("Decision Gate tables/columns verified.");

console.log("Migration complete.");
