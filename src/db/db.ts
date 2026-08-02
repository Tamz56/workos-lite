import Database from "better-sqlite3";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { ensureProjectRegistryMetadataColumns } from "@/lib/projects/registryMetadata";

const dbPath = path.resolve(process.cwd(), "data/workos.db");
const dbDir = path.dirname(dbPath);

const LEGACY_AVA_WORKSPACES = ["avacrm", "ops"];
const LEGACY_AVA_PROJECT_SLUGS = [
    "avaone-q1",
    "avaone-q1-sales",
    "avaone-homeforest-q1",
    "avafarm888-fb-content-q1",
    "avaone-fb-content-q1",
    "avaone-tiktok-q1"
];
const LEGACY_DEMO_LIST_SLUGS = ["nanagarden-q1", "sku-ads"];

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
                workspace TEXT NOT NULL DEFAULT 'personal',
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
            WHEN NEW.updated_at = OLD.updated_at OR NEW.updated_at IS OLD.updated_at
            BEGIN
                UPDATE tasks SET updated_at = datetime('now') WHERE id = NEW.id;
            END;
        `);
    }

    // Phase 1: Lists implementation
    const hasListId = cols.some((c) => c.name === "list_id");
    if (!hasListId) {
        db.exec("ALTER TABLE tasks ADD COLUMN list_id TEXT NULL");
    }
    db.exec("CREATE INDEX IF NOT EXISTS idx_tasks_list_id ON tasks(list_id)");

    const hasParentTaskId = cols.some((c) => c.name === "parent_task_id");
    if (!hasParentTaskId) {
        db.exec("ALTER TABLE tasks ADD COLUMN parent_task_id TEXT NULL");
        db.exec("ALTER TABLE tasks ADD COLUMN sort_order INTEGER NULL");
    }
    db.exec("CREATE INDEX IF NOT EXISTS idx_tasks_parent_task_id ON tasks(parent_task_id)");

    const hasIsSeed = cols.some((c) => c.name === "is_seed");
    if (!hasIsSeed) {
        db.exec("ALTER TABLE tasks ADD COLUMN is_seed INTEGER DEFAULT 0");
    }
    db.exec("CREATE INDEX IF NOT EXISTS idx_tasks_is_seed ON tasks(is_seed)");

    const hasDocIsSeed = db.prepare("PRAGMA table_info(docs)").all().some((c: any) => c.name === "is_seed");
    if (!hasDocIsSeed) {
        db.exec("ALTER TABLE docs ADD COLUMN is_seed INTEGER DEFAULT 0");
    }

    const hasReviewStatus = db.prepare("PRAGMA table_info(tasks)").all().some((c: any) => c.name === "review_status");
    if (!hasReviewStatus) {
        db.exec("ALTER TABLE tasks ADD COLUMN review_status TEXT DEFAULT 'draft'");
    }
    db.exec("CREATE INDEX IF NOT EXISTS idx_tasks_review_status ON tasks(review_status)");

    const hasPublishedAt = db.prepare("PRAGMA table_info(tasks)").all().some((c: any) => c.name === "published_at");
    if (!hasPublishedAt) {
        db.exec("ALTER TABLE tasks ADD COLUMN published_at TEXT NULL");
    }
    db.exec("CREATE INDEX IF NOT EXISTS idx_tasks_published_at ON tasks(published_at)");

    const hasDistributionChannels = db.prepare("PRAGMA table_info(tasks)").all().some((c: any) => c.name === "distribution_channels");
    if (!hasDistributionChannels) {
        db.exec("ALTER TABLE tasks ADD COLUMN distribution_channels TEXT NULL");
    }
    db.exec("CREATE INDEX IF NOT EXISTS idx_tasks_distribution_channels ON tasks(distribution_channels)");

    const hasPerformanceMetrics = db.prepare("PRAGMA table_info(tasks)").all().some((c: any) => c.name === "performance_metrics");
    if (!hasPerformanceMetrics) {
        db.exec("ALTER TABLE tasks ADD COLUMN performance_metrics TEXT NULL");
    }
    db.exec("CREATE INDEX IF NOT EXISTS idx_tasks_performance_metrics ON tasks(performance_metrics)");

    // Agent Automation MVP Migration
    const hasAgentEnabled = db.prepare("PRAGMA table_info(tasks)").all().some((c: any) => c.name === "agent_enabled");
    const taskTableSql = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='tasks'").get() as { sql: string } | undefined;
    const hasReviewInConstraint = taskTableSql?.sql.includes("'review'");

    if (!hasAgentEnabled || !hasReviewInConstraint) {
        console.log("🛠 Migrating tasks table for Agent Automation MVP...");
        // Rebuild table to update CHECK constraint and add all new columns
        db.exec(`
            -- Backup existing data
            CREATE TABLE tasks_backup AS SELECT * FROM tasks;

            -- Drop old table
            DROP TABLE tasks;

            -- Recreate from schema.sql (this is safe because we just updated schema.sql)
            -- But easier to just define it here to be explicit
            CREATE TABLE tasks (
                id              TEXT PRIMARY KEY,
                title           TEXT NOT NULL,
                workspace       TEXT NOT NULL,
                list_id         TEXT NULL,
                status          TEXT NOT NULL DEFAULT 'inbox' CHECK (status IN ('inbox','planned','in_progress','review','done')),
                scheduled_date  TEXT NULL,
                schedule_bucket TEXT NULL CHECK (schedule_bucket IN ('morning','afternoon','evening','none') OR schedule_bucket IS NULL),
                start_time      TEXT NULL,
                end_time        TEXT NULL,
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

            -- Restore data (handling missing columns gracefully)
            INSERT INTO tasks (
                id, title, workspace, list_id, status, scheduled_date, schedule_bucket,
                start_time, end_time, priority, notes, parent_task_id, sort_order,
                doc_id, is_seed, created_at, updated_at, done_at, sprint_id,
                published_at, distribution_channels, performance_metrics, review_status
            )
            SELECT
                id, title, workspace, list_id, status, scheduled_date, schedule_bucket,
                start_time, end_time, priority, notes, parent_task_id, sort_order,
                doc_id, is_seed, created_at, updated_at, done_at, sprint_id,
                published_at, distribution_channels, performance_metrics,
                COALESCE(review_status, 'draft')
            FROM tasks_backup;

            -- Cleanup
            DROP TABLE tasks_backup;

            -- Recreate indexes
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
            CREATE INDEX IF NOT EXISTS idx_tasks_agent_enabled ON tasks(agent_enabled);
            CREATE INDEX IF NOT EXISTS idx_tasks_agent_status ON tasks(agent_status);

            -- Recreate trigger
            CREATE TRIGGER IF NOT EXISTS trg_tasks_updated_at
            AFTER UPDATE ON tasks
            FOR EACH ROW
            WHEN NEW.updated_at = OLD.updated_at OR NEW.updated_at IS OLD.updated_at
            BEGIN
                UPDATE tasks SET updated_at = datetime('now') WHERE id = NEW.id;
            END;
        `);
    }



    const hasListIsSeed = db.prepare("PRAGMA table_info(lists)").all().some((c: any) => c.name === "is_seed");
    if (hasListIsSeed === false) { // Table exists but column might be missing if it was created before my changes
        const listsTableExists = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='lists'").get();
        if (listsTableExists) {
            db.exec("ALTER TABLE lists ADD COLUMN is_seed INTEGER DEFAULT 0");
        }
    }

    const hasProjectIsSeed = db.prepare("PRAGMA table_info(projects)").all().some((c: any) => c.name === "is_seed");
    if (!hasProjectIsSeed) {
        db.exec("ALTER TABLE projects ADD COLUMN is_seed INTEGER DEFAULT 0");
    }
    ensureProjectRegistryMetadataColumns(db);

    // Create lists table ensuring it exists during runtime migration safely
    db.exec(`
        CREATE TABLE IF NOT EXISTS lists (
            id TEXT PRIMARY KEY,
            workspace TEXT NOT NULL,
            slug TEXT NOT NULL,
            title TEXT NOT NULL,
            description TEXT DEFAULT '',
            is_seed INTEGER DEFAULT 0,
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            updated_at TEXT NOT NULL DEFAULT (datetime('now'))
        );
        CREATE UNIQUE INDEX IF NOT EXISTS idx_lists_workspace_slug ON lists(workspace, slug);
        CREATE INDEX IF NOT EXISTS idx_lists_workspace ON lists(workspace);

        CREATE TRIGGER IF NOT EXISTS trg_lists_updated_at
        AFTER UPDATE ON lists
        FOR EACH ROW
        WHEN NEW.updated_at = OLD.updated_at OR NEW.updated_at IS OLD.updated_at
        BEGIN
            UPDATE lists SET updated_at = datetime('now') WHERE id = NEW.id;
        END;
    `);

    // BACKLOG-001: Expand project_items status options for content production workflow
    const projectItemsTableInfo = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='project_items'").get() as { sql: string } | undefined;
    const needsProjectItemsStatusMigration = projectItemsTableInfo && (
        !projectItemsTableInfo.sql.includes("'in_progress'") ||
        !projectItemsTableInfo.sql.includes("'drafted'") ||
        !projectItemsTableInfo.sql.includes("'ready_for_review'")
    );

    if (needsProjectItemsStatusMigration) {
        console.log("🛠 Migrating project_items table to expand status options (BACKLOG-001)...");
        db.exec(`
            -- Backup existing data
            CREATE TABLE project_items_backup AS SELECT * FROM project_items;

            -- Drop old table (and its trigger + indexes via CASCADE)
            DROP TABLE project_items;

            -- Recreate with expanded CHECK constraint
            CREATE TABLE project_items (
                id              TEXT PRIMARY KEY,
                project_id      TEXT NOT NULL,
                title           TEXT NOT NULL,
                status          TEXT NOT NULL CHECK (status IN ('inbox', 'planned', 'in_progress', 'drafted', 'ready_for_review', 'done', 'blocked', 'archived')),
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

            -- Restore data
            INSERT INTO project_items (id, project_id, title, status, priority, schedule_bucket, start_date, end_date, is_milestone, workstream, dod_text, notes, created_at, updated_at)
            SELECT id, project_id, title, status, priority, schedule_bucket, start_date, end_date, is_milestone, workstream, dod_text, notes, created_at, updated_at
            FROM project_items_backup;

            -- Cleanup backup
            DROP TABLE project_items_backup;

            -- Recreate indexes
            CREATE INDEX IF NOT EXISTS idx_project_items_project_status ON project_items(project_id, status);
            CREATE INDEX IF NOT EXISTS idx_project_items_project_start_date ON project_items(project_id, start_date);
            CREATE INDEX IF NOT EXISTS idx_project_items_workstream ON project_items(project_id, workstream, start_date);

            -- Recreate trigger
            CREATE TRIGGER IF NOT EXISTS trg_project_items_updated_at
            AFTER UPDATE ON project_items
            FOR EACH ROW
            WHEN NEW.updated_at = OLD.updated_at OR NEW.updated_at IS OLD.updated_at
            BEGIN
                UPDATE project_items SET updated_at = datetime('now') WHERE id = NEW.id;
            END;
        `);
        console.log("✅ project_items table migrated successfully (BACKLOG-001).");
    }

    db.exec(`
        CREATE TABLE IF NOT EXISTS planner_import_batches (
            id               TEXT PRIMARY KEY,
            fingerprint      TEXT NOT NULL UNIQUE,
            project_id       TEXT NOT NULL,
            source_text_hash TEXT NOT NULL,
            conflict_policy  TEXT NOT NULL CHECK (conflict_policy IN ('append','skip')),
            result_json      TEXT NOT NULL,
            created_at       TEXT NOT NULL DEFAULT (datetime('now'))
        );
        DROP INDEX IF EXISTS idx_planner_import_batches_fingerprint;
    `);

    const plannerImportBatchSchema = db.prepare(`
        SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'planner_import_batches'
    `).get() as { sql: string } | undefined;
    if (plannerImportBatchSchema && !plannerImportBatchSchema.sql.includes("CHECK (conflict_policy IN ('append','skip'))")) {
        const rebuildPlannerImportBatches = db.transaction(() => {
            db.exec(`
                ALTER TABLE planner_import_batches RENAME TO planner_import_batches_legacy_001b;
                CREATE TABLE planner_import_batches (
                    id               TEXT PRIMARY KEY,
                    fingerprint      TEXT NOT NULL UNIQUE,
                    project_id       TEXT NOT NULL,
                    source_text_hash TEXT NOT NULL,
                    conflict_policy  TEXT NOT NULL CHECK (conflict_policy IN ('append','skip')),
                    result_json      TEXT NOT NULL,
                    created_at       TEXT NOT NULL DEFAULT (datetime('now'))
                );
                INSERT INTO planner_import_batches (
                    id, fingerprint, project_id, source_text_hash, conflict_policy, result_json, created_at
                )
                SELECT id, fingerprint, project_id, source_text_hash, conflict_policy, result_json, created_at
                FROM planner_import_batches_legacy_001b;
                DROP TABLE planner_import_batches_legacy_001b;
            `);
        });
        rebuildPlannerImportBatches();
    }

    migrated = true;
}

function auditWorkspaceConstraint() {
    const tableInfo = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='tasks'").get() as { sql: string } | undefined;
    if (tableInfo && tableInfo.sql.includes("CHECK (workspace IN")) {
        // If it does not include marketing, surface a warning logically.
        if (!tableInfo.sql.includes("'marketing'")) {
            console.warn("⚠️ DB constraint mismatch: tasks.workspace CHECK missing: marketing. Run DB repair script to rebuild constraint.");
        }
    }
}

function ensureSeedLists() {
    const defaultLists: { workspace: string; slug: string; title: string; desc: string }[] = [];
    if (defaultLists.length === 0) return;
}

function ensureDocsAndAttachments() {
    // Migration for GF Hub Phase 2.2
    const articlesInfo = db.prepare("PRAGMA table_info(articles)").all() as any[];
    const hasArticleTitle = articlesInfo.some((c: any) => c.name === "article_title");
    if (!hasArticleTitle) {
        db.exec("ALTER TABLE articles ADD COLUMN article_title TEXT NULL");
    }
    const hasTopicTitle = articlesInfo.some((c: any) => c.name === "topic_title");
    if (!hasTopicTitle) {
        db.exec("ALTER TABLE articles ADD COLUMN topic_title TEXT NULL");
    }

    const rowDocs = db.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name='docs'`).get();
    if (!rowDocs) {
        db.exec(`
          CREATE TABLE IF NOT EXISTS docs (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            content_md TEXT NOT NULL DEFAULT '',
            is_seed INTEGER DEFAULT 0,
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
auditWorkspaceConstraint();
const shouldSkipSeed = process.env.SKIP_SEED === 'true';

if (!shouldSkipSeed) {
    ensureSeedLists();
}
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
          is_seed INTEGER DEFAULT 0,
          category TEXT NULL,
          registry_status TEXT NULL,
          priority TEXT NULL,
          current_goal TEXT NULL,
          progress_stage TEXT NULL,
          next_action TEXT NULL,
          cadence TEXT NULL,
          risk_or_blocked_by TEXT NULL,
          metadata_updated_at TEXT NULL,
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          updated_at TEXT NOT NULL DEFAULT (datetime('now'))
        );
        CREATE TRIGGER IF NOT EXISTS trg_projects_updated_at
        AFTER UPDATE ON projects
        FOR EACH ROW
        WHEN NEW.updated_at = OLD.updated_at OR NEW.updated_at IS OLD.updated_at
        BEGIN
          UPDATE projects SET updated_at = datetime('now') WHERE id = NEW.id;
        END;
        CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);

        CREATE TABLE IF NOT EXISTS project_items (
          id TEXT PRIMARY KEY,
          project_id TEXT NOT NULL,
          title TEXT NOT NULL,
          status TEXT NOT NULL CHECK (status IN ('inbox', 'planned', 'in_progress', 'drafted', 'ready_for_review', 'done', 'blocked', 'archived')),
          priority INTEGER NULL,
          schedule_bucket TEXT NULL CHECK (schedule_bucket IN ('morning', 'afternoon', 'evening', 'none') OR schedule_bucket IS NULL),
          start_date TEXT NULL,
          end_date TEXT NULL,
          is_milestone INTEGER NOT NULL DEFAULT 0,
          workstream TEXT NULL,
          dod_text TEXT NULL,
          notes TEXT NULL,
          import_fingerprint TEXT NULL,
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          updated_at TEXT NOT NULL DEFAULT (datetime('now')),
          FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE
        );
        CREATE TRIGGER IF NOT EXISTS trg_project_items_updated_at
        AFTER UPDATE ON project_items
        FOR EACH ROW
        WHEN NEW.updated_at = OLD.updated_at OR NEW.updated_at IS OLD.updated_at
        BEGIN
          UPDATE project_items SET updated_at = datetime('now') WHERE id = NEW.id;
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

function ensureProjectContext() {
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
}

function ensureProjectLoops() {
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

    // Alter project_loops columns if needed
    try {
        db.exec("ALTER TABLE project_loops ADD COLUMN gate_status TEXT DEFAULT 'not_required'");
    } catch (e) { /* ignore */ }
    try {
        db.exec("ALTER TABLE project_loops ADD COLUMN last_gate_action TEXT");
    } catch (e) { /* ignore */ }
    try {
        db.exec("ALTER TABLE project_loops ADD COLUMN last_gate_at TEXT");
    } catch (e) { /* ignore */ }

    // Create gate events table
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

    // Seed templates
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
}

function ensureSeedProjects() {
    const defaultProjects: string[] = [];
    if (defaultProjects.length === 0) return;
}

function ensureNotes() {
    db.exec(`
        CREATE TABLE IF NOT EXISTS notes (
          id           TEXT PRIMARY KEY,
          title        TEXT NOT NULL,
          content_json TEXT NOT NULL,
          content_html TEXT NOT NULL,
          plain_text   TEXT NOT NULL,
          project_id   TEXT NULL,
          created_at   TEXT NOT NULL DEFAULT (datetime('now')),
          updated_at   TEXT NOT NULL DEFAULT (datetime('now')),
          FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE SET NULL
        );
        CREATE INDEX IF NOT EXISTS idx_notes_project_id ON notes(project_id);
        CREATE INDEX IF NOT EXISTS idx_notes_updated_at ON notes(updated_at);

        CREATE TABLE IF NOT EXISTS note_links (
          id                 TEXT PRIMARY KEY,
          note_id            TEXT NOT NULL,
          linked_entity_type TEXT NOT NULL,
          linked_entity_id   TEXT NOT NULL,
          created_at         TEXT NOT NULL DEFAULT (datetime('now')),
          FOREIGN KEY(note_id) REFERENCES notes(id) ON DELETE CASCADE
        );
        CREATE INDEX IF NOT EXISTS idx_note_links_note_id ON note_links(note_id);
        CREATE INDEX IF NOT EXISTS idx_note_links_entity ON note_links(linked_entity_type, linked_entity_id);
    `);
}

function placeholders(values: string[]) {
    return values.map(() => "?").join(", ");
}

const LEGACY_AVA_CLEANUP_FLAG = "legacy_ava_demo_cleanup_v1";

function ensureAppMeta() {
    db.exec(`
        CREATE TABLE IF NOT EXISTS app_meta (
          key        TEXT PRIMARY KEY,
          value      TEXT NOT NULL,
          updated_at TEXT NOT NULL DEFAULT (datetime('now'))
        );
    `);
}

function hasAppMetaFlag(key: string) {
    const row = db.prepare("SELECT value FROM app_meta WHERE key = ?").get(key) as { value: string } | undefined;
    return row?.value === "done";
}

function markAppMetaFlagDone(key: string) {
    db.prepare(`
        INSERT INTO app_meta (key, value, updated_at)
        VALUES (?, 'done', datetime('now'))
        ON CONFLICT(key) DO UPDATE SET
            value = excluded.value,
            updated_at = excluded.updated_at
    `).run(key);
}

function cleanupLegacyAvaDemoData() {
    const workspacePlaceholders = placeholders(LEGACY_AVA_WORKSPACES);
    const projectPlaceholders = placeholders(LEGACY_AVA_PROJECT_SLUGS);
    const listPlaceholders = placeholders(LEGACY_DEMO_LIST_SLUGS);

    const projectIds = db.prepare(`
        SELECT id
        FROM projects
        WHERE slug IN (${projectPlaceholders})
           OR lower(slug) LIKE 'avaone-%'
           OR lower(slug) LIKE 'avafarm%'
           OR lower(name) LIKE '%avaone%'
           OR lower(name) LIKE '%avafarm%'
           OR lower(name) LIKE '%avacrm%'
           OR lower(name) LIKE '%avaops%'
    `).all(...LEGACY_AVA_PROJECT_SLUGS) as { id: string }[];

    const legacyListIds = db.prepare(`
        SELECT id
        FROM lists
        WHERE workspace IN (${workspacePlaceholders})
           OR (is_seed = 1 AND slug IN (${listPlaceholders}))
    `).all(...LEGACY_AVA_WORKSPACES, ...LEGACY_DEMO_LIST_SLUGS) as { id: string }[];

    const deleteTx = db.transaction(() => {
        if (legacyListIds.length > 0) {
            const ids = legacyListIds.map((row) => row.id);
            db.prepare(`DELETE FROM tasks WHERE list_id IN (${placeholders(ids)})`).run(...ids);
        }

        db.prepare(`DELETE FROM tasks WHERE workspace IN (${workspacePlaceholders})`).run(...LEGACY_AVA_WORKSPACES);

        for (const slug of LEGACY_AVA_PROJECT_SLUGS) {
            db.prepare(`
                DELETE FROM tasks
                WHERE lower(COALESCE(notes, '')) LIKE ?
                   OR lower(COALESCE(title, '')) LIKE ?
            `).run(`%project:${slug}%`, `%${slug}%`);
        }

        db.prepare(`DELETE FROM events WHERE workspace IN (${workspacePlaceholders})`).run(...LEGACY_AVA_WORKSPACES);

        db.prepare(`
            DELETE FROM docs
            WHERE is_seed = 1
              AND (
                lower(title) LIKE '%avaone%'
                OR lower(title) LIKE '%avafarm%'
                OR lower(title) LIKE '%avacrm%'
                OR lower(title) LIKE '%avaops%'
                OR lower(content_md) LIKE '%project:avaone-%'
                OR lower(content_md) LIKE '%project:avafarm%'
              )
        `).run();

        if (projectIds.length > 0) {
            const ids = projectIds.map((row) => row.id);
            const idsPlaceholders = placeholders(ids);
            const hasNotesProjectId = db.prepare("PRAGMA table_info(notes)").all().some((c: any) => c.name === "project_id");
            if (hasNotesProjectId) {
                db.prepare(`DELETE FROM notes WHERE project_id IN (${idsPlaceholders})`).run(...ids);
            }
            db.prepare(`DELETE FROM projects WHERE id IN (${idsPlaceholders})`).run(...ids);
        }

        db.prepare(`
            DELETE FROM projects
            WHERE slug IN (${projectPlaceholders})
               OR lower(slug) LIKE 'avaone-%'
               OR lower(slug) LIKE 'avafarm%'
               OR lower(name) LIKE '%avaone%'
               OR lower(name) LIKE '%avafarm%'
               OR lower(name) LIKE '%avacrm%'
               OR lower(name) LIKE '%avaops%'
        `).run(...LEGACY_AVA_PROJECT_SLUGS);

        db.prepare(`
            DELETE FROM lists
            WHERE workspace IN (${workspacePlaceholders})
               OR (is_seed = 1 AND slug IN (${listPlaceholders}))
        `).run(...LEGACY_AVA_WORKSPACES, ...LEGACY_DEMO_LIST_SLUGS);
    });

    deleteTx();
}

function cleanupLegacyAvaDemoDataOnce() {
    if (hasAppMetaFlag(LEGACY_AVA_CLEANUP_FLAG)) return;
    cleanupLegacyAvaDemoData();
    markAppMetaFlagDone(LEGACY_AVA_CLEANUP_FLAG);
}

ensureProjectsAndSprints();
function ensurePlannerImportTaskIdentity() {
    const columns = db.prepare("PRAGMA table_info(project_items)").all() as { name: string }[];
    if (!columns.some(column => column.name === "import_fingerprint")) {
        db.exec("ALTER TABLE project_items ADD COLUMN import_fingerprint TEXT NULL");
    }
    db.exec(`
        CREATE UNIQUE INDEX IF NOT EXISTS idx_project_items_import_fingerprint
        ON project_items(import_fingerprint)
        WHERE import_fingerprint IS NOT NULL;
    `);
}
ensurePlannerImportTaskIdentity();
ensureProjectContext();
ensureProjectLoops();
function ensureProjectDocBlocks() {
    db.exec(`
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
    `);
}
ensureProjectDocBlocks();

function ensureGreenFinenessModel() {
    db.exec(`
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

        -- Triggers for updated_at
        CREATE TRIGGER IF NOT EXISTS trg_seasons_updated_at
        AFTER UPDATE ON seasons
        FOR EACH ROW
        WHEN NEW.updated_at = OLD.updated_at OR NEW.updated_at IS OLD.updated_at
        BEGIN
          UPDATE seasons SET updated_at = datetime('now') WHERE season_id = NEW.season_id;
        END;

        CREATE TRIGGER IF NOT EXISTS trg_episodes_updated_at
        AFTER UPDATE ON episodes
        FOR EACH ROW
        WHEN NEW.updated_at = OLD.updated_at OR NEW.updated_at IS OLD.updated_at
        BEGIN
          UPDATE episodes SET updated_at = datetime('now') WHERE episode_id = NEW.episode_id;
        END;

        CREATE TRIGGER IF NOT EXISTS trg_articles_updated_at
        AFTER UPDATE ON articles
        FOR EACH ROW
        WHEN NEW.updated_at = OLD.updated_at OR NEW.updated_at IS OLD.updated_at
        BEGIN
          UPDATE articles SET updated_at = datetime('now') WHERE article_id = NEW.article_id;
        END;
    `);

    // Additive Migrations for articles table
    const columns = db.prepare("PRAGMA table_info(articles)").all() as any[];
    const colNames = columns.map(c => c.name);

    const additiveCols = [
        { name: 'final_url', type: 'TEXT' },
        { name: 'publish_date', type: 'TEXT' },
        { name: 'utm_group', type: 'TEXT' },
        { name: 'utm_page', type: 'TEXT' },
        { name: 'utm_personal', type: 'TEXT' },
        { name: 'publish_status', type: 'TEXT', default: "'waiting_url'" },
        { name: 'hashtags_status', type: 'TEXT', default: "'not_started'" },
        { name: 'publish_log_status', type: 'TEXT', default: "'not_started'" },
        { name: 'seo_status', type: 'TEXT', default: "'pending'" },
        { name: 'schema_status', type: 'TEXT', default: "'pending'" },
        { name: 'ready_to_publish', type: 'INTEGER', default: '0' },
        { name: 'topic_title', type: 'TEXT' },
        { name: 'content_layer', type: 'TEXT' },
        { name: 'article_role', type: 'TEXT' },
        { name: 'story_set', type: 'TEXT' },
        { name: 'story_order', type: 'TEXT' },
        { name: 'narrative_status', type: 'TEXT', default: "'not_started'" },
        { name: 'meta_title', type: 'TEXT' },
        { name: 'meta_description', type: 'TEXT' },
        { name: 'keywords', type: 'TEXT' },
        { name: 'article_markdown', type: 'TEXT' },
        { name: 'body_markdown', type: 'TEXT' },
        { name: 'read_more_markdown', type: 'TEXT' },
        { name: 'faq_markdown', type: 'TEXT' },
        { name: 'references_markdown', type: 'TEXT' },
        { name: 'group_post_markdown', type: 'TEXT' },
        { name: 'page_post_markdown', type: 'TEXT' },
        { name: 'personal_post_markdown', type: 'TEXT' },
        { name: 'social_extras_markdown', type: 'TEXT' }
    ];

    for (const col of additiveCols) {
        if (!colNames.includes(col.name)) {
            let sql = `ALTER TABLE articles ADD COLUMN ${col.name} ${col.type}`;
            if (col.default) sql += ` DEFAULT ${col.default}`;
            db.exec(sql);
        }
    }
}

export function seedGreenFinenessSeason1() {
    const seasonId = "GF-SEASON-01";
    const seasonTitle = "ชีวิตของพืชหนึ่งต้น";

    db.prepare(`
        INSERT INTO seasons (season_id, season_title, season_description, status)
        VALUES (?, ?, ?, 'active')
        ON CONFLICT(season_id) DO UPDATE SET
            season_title = excluded.season_title,
            updated_at = datetime('now')
    `).run(seasonId, seasonTitle, "Green Fineness Season 1: The Life of a Plant");

    const episodes = [
        { id: "GF-S01-E01", no: 1, title: "ดิน: จุดเริ่มต้นของชีวิตพืช" },
        { id: "GF-S01-E02", no: 2, title: "อินทรียวัตถุ: อาหารของดินและพลังงานของระบบ" },
        { id: "GF-S01-E03", no: 3, title: "จุลินทรีย์ในดิน: ผู้ทำงานเล็ก ๆ ที่ทำให้ดินมีชีวิต" },
        { id: "GF-S01-E04", no: 4, title: "ไรโซสเฟียร์: พื้นที่รอบรากที่พืช ดิน และจุลินทรีย์พบกัน" },
        { id: "GF-S01-E05", no: 5, title: "เมล็ดเริ่มงอก: จุดเริ่มต้นของชีวิตใหม่" },
        { id: "GF-S01-E06", no: 6, title: "ราก: ประตูที่พืชใช้เชื่อมกับดิน" },
        { id: "GF-S01-E07", no: 7, title: "ธาตุอาหาร: วัตถุดิบที่พืชใช้สร้างชีวิต" },
        { id: "GF-S01-E08", no: 8, title: "ใบ: โรงงานสังเคราะห์แสงของพืช" },
        { id: "GF-S01-E09", no: 9, title: "ลำต้น: เส้นทางลำเลียงน้ำ ธาตุอาหาร และน้ำตาล" },
        { id: "GF-S01-E10", no: 10, title: "ดอก: เมื่อพืชเปลี่ยนจากการเติบโตสู่การสืบพันธุ์" },
        { id: "GF-S01-E11", no: 11, title: "ผลและเมล็ด: คุณภาพ ผลผลิต และชีวิตรุ่นต่อไป" },
        { id: "GF-S01-E12", no: 12, title: "กลับคืนสู่ดิน: ซากพืช จุลินทรีย์ และการหมุนเวียนธาตุอาหาร" }
    ];

    const stmt = db.prepare(`
        INSERT INTO episodes (episode_id, season_id, episode_no, episode_title, status)
        VALUES (?, ?, ?, ?, 'planned')
        ON CONFLICT(episode_id) DO UPDATE SET
            episode_no = excluded.episode_no,
            episode_title = excluded.episode_title,
            updated_at = datetime('now')
    `);

    const tx = db.transaction(() => {
        for (const ep of episodes) {
            stmt.run(ep.id, seasonId, ep.no, ep.title);
        }
    });
    tx();
}

function ensureArborWritingLab() {
    db.exec(`
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
          narrative_status  TEXT NULL,
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
    `);

    // Idempotent column additions for existing tables
    const storySetCols = db.prepare("PRAGMA table_info(gf_story_sets)").all() as any[];
    const storySetColNames = storySetCols.map(c => c.name);

    if (!storySetColNames.includes('slug')) {
        try {
            db.exec("ALTER TABLE gf_story_sets ADD COLUMN slug TEXT");
        } catch (e: any) {
            if (!e.message?.includes("duplicate column name")) {
                console.error("Migration error on story set slug:", e);
                throw e;
            }
        }
    }

    const episodeCols = db.prepare("PRAGMA table_info(gf_episodes)").all() as any[];
    const episodeColNames = episodeCols.map(c => c.name);

    const additiveCols = [
        { name: 'slug', type: 'TEXT' },
        { name: 'description', type: 'TEXT' },
        { name: 'journey_stage', type: 'TEXT' },
        { name: 'attached_to_episode_id', type: 'TEXT' },
        { name: 'sort_order', type: 'INTEGER', default: '0' },
        { name: 'narrative_status', type: 'TEXT', default: "'unmapped'" }
    ];

    for (const col of additiveCols) {
        if (!episodeColNames.includes(col.name)) {
            try {
                let sql = `ALTER TABLE gf_episodes ADD COLUMN ${col.name} ${col.type}`;
                if (col.default) sql += ` DEFAULT ${col.default}`;
                db.exec(sql);
            } catch (e: any) {
                if (!e.message?.includes("duplicate column name")) {
                    console.error(`Migration error on ${col.name}:`, e);
                    throw e;
                }
            }
        }
    }

    const projectCols = db.prepare("PRAGMA table_info(gf_writing_projects)").all() as any[];
    const projectColNames = projectCols.map(c => c.name);

    const additiveProjectCols = [
        { name: 'topic_id', type: 'TEXT' },
        { name: 'slug', type: 'TEXT' },
        { name: 'episode_role', type: 'TEXT' },
        { name: 'journey_stage', type: 'TEXT' },
        { name: 'summary', type: 'TEXT' },
        { name: 'notes', type: 'TEXT' },
        { name: 'meta_title', type: 'TEXT' },
        { name: 'meta_description', type: 'TEXT' },
        { name: 'keywords', type: 'TEXT' },
        { name: 'excerpt', type: 'TEXT' },
        { name: 'internal_links_notes', type: 'TEXT' },
        { name: 'references_notes', type: 'TEXT' },
        { name: 'group_post_markdown', type: 'TEXT' },
        { name: 'page_post_markdown', type: 'TEXT' },
        { name: 'personal_post_markdown', type: 'TEXT' },
        { name: 'social_caption', type: 'TEXT' },
        { name: 'hashtags', type: 'TEXT' },
        { name: 'tone_profile', type: 'TEXT' },
        { name: 'web_voice_guideline', type: 'TEXT' },
        { name: 'group_voice_guideline', type: 'TEXT' },
        { name: 'page_voice_guideline', type: 'TEXT' },
        { name: 'personal_voice_guideline', type: 'TEXT' },
        { name: 'claim_guardrail_note', type: 'TEXT' },
        { name: 'narrative_body', type: 'TEXT' },
        { name: 'knowledge_body', type: 'TEXT' },
        { name: 'narrative_title', type: 'TEXT' },
        { name: 'narrative_slug', type: 'TEXT' },
        { name: 'narrative_hero_subtitle', type: 'TEXT' },
        { name: 'narrative_featured_image_url', type: 'TEXT' },
        { name: 'narrative_short_summary', type: 'TEXT' },
        { name: 'narrative_meta_title', type: 'TEXT' },
        { name: 'narrative_meta_description', type: 'TEXT' },
        { name: 'narrative_keywords', type: 'TEXT' },
        { name: 'narrative_schema_jsonld', type: 'TEXT' },
        { name: 'narrative_status', type: 'TEXT' },
        { name: 'narrative_editors_pick', type: 'INTEGER' },
        { name: 'narrative_related_knowledge_article', type: 'TEXT' },
        { name: 'narrative_journey_stage', type: 'TEXT' },
        { name: 'knowledge_title', type: 'TEXT' },
        { name: 'knowledge_slug', type: 'TEXT' },
        { name: 'knowledge_hero_subtitle', type: 'TEXT' },
        { name: 'knowledge_featured_image_url', type: 'TEXT' },
        { name: 'knowledge_short_summary', type: 'TEXT' },
        { name: 'knowledge_meta_title', type: 'TEXT' },
        { name: 'knowledge_meta_description', type: 'TEXT' },
        { name: 'knowledge_keywords', type: 'TEXT' },
        { name: 'knowledge_schema_jsonld', type: 'TEXT' },
        { name: 'knowledge_status', type: 'TEXT' },
        { name: 'knowledge_editors_pick', type: 'INTEGER' },
        { name: 'knowledge_related_narrative_article', type: 'TEXT' },
        { name: 'knowledge_primary_keyword', type: 'TEXT' },
        { name: 'knowledge_secondary_keywords', type: 'TEXT' },
        { name: 'knowledge_category', type: 'TEXT' }
    ];

    for (const col of additiveProjectCols) {
        if (!projectColNames.includes(col.name)) {
            try {
                const sql = `ALTER TABLE gf_writing_projects ADD COLUMN ${col.name} ${col.type}`;
                db.exec(sql);
            } catch (e: any) {
                if (!e.message?.includes("duplicate column name")) {
                    console.error(`Migration error on project ${col.name}:`, e);
                    throw e;
                }
            }
        }
    }

    const blockCols = db.prepare("PRAGMA table_info(gf_writing_blocks)").all() as any[];
    const blockColNames = blockCols.map(c => c.name);

    const additiveBlockCols = [
        { name: 'writing_project_id', type: 'TEXT' },
        { name: 'block_type', type: 'TEXT' },
        { name: 'label', type: 'TEXT' },
        { name: 'placeholder', type: 'TEXT' },
        { name: 'content_md', type: 'TEXT' }
    ];

    for (const col of additiveBlockCols) {
        if (!blockColNames.includes(col.name)) {
            try {
                // If it's a critical NOT NULL column like writing_project_id, we might need a default or allow null for migration
                // But since this is a new table in this branch, it's safer to just ADD it.
                const sql = `ALTER TABLE gf_writing_blocks ADD COLUMN ${col.name} ${col.type}`;
                db.exec(sql);
            } catch (e: any) {
                if (!e.message?.includes("duplicate column name")) {
                    console.error(`Migration error on block ${col.name}:`, e);
                    throw e;
                }
            }
        }
    }
}

type ArborStorySetSeed = {
    id: string;
    slug?: string;
    title: string;
    description: string;
};

function normalizeStorySetName(name: string) {
    return name
        .normalize("NFKC")
        .replace(/\s+/g, "")
        .trim()
        .toLocaleLowerCase("th-TH");
}

function seedStorySetsWithoutDuplicates(storySets: ArborStorySetSeed[]) {
    const existingRows = db.prepare("SELECT id, slug, title FROM gf_story_sets").all() as {
        id: string;
        slug: string | null;
        title: string;
    }[];

    const bySlug = new Map<string, string>();
    const byNormalizedTitle = new Map<string, string>();

    for (const row of existingRows) {
        if (row.slug) bySlug.set(row.slug, row.id);
        byNormalizedTitle.set(normalizeStorySetName(row.title), row.id);
    }

    const insertStmt = db.prepare(`
        INSERT INTO gf_story_sets (id, slug, title, description, status, created_at, updated_at)
        VALUES (@id, @slug, @title, @description, 'active', datetime('now'), datetime('now'))
    `);

    const updateStmt = db.prepare(`
        UPDATE gf_story_sets
        SET
            slug = COALESCE(NULLIF(slug, ''), @slug),
            description = CASE
                WHEN description IS NULL OR TRIM(description) = '' THEN @description
                ELSE description
            END,
            status = 'active',
            updated_at = datetime('now')
        WHERE id = @id
    `);

    const tx = db.transaction(() => {
        for (const storySet of storySets) {
            const slug = storySet.slug ?? null;
            const matchId = (slug ? bySlug.get(slug) : undefined)
                ?? byNormalizedTitle.get(normalizeStorySetName(storySet.title));

            if (matchId) {
                updateStmt.run({ ...storySet, id: matchId, slug });
                continue;
            }

            insertStmt.run({ ...storySet, slug });
            if (slug) bySlug.set(slug, storySet.id);
            byNormalizedTitle.set(normalizeStorySetName(storySet.title), storySet.id);
        }
    });

    tx();
}

export function seedArborWritingLab() {
    const storySets = [
        { id: "STORY-SET-01", title: "ชีวิตของพืชหนึ่งต้น", description: "The core journey of a single plant from seed to seed." },
        { id: "STORY-SET-02", title: "โลกใต้พื้นดิน", description: "Exploring the hidden complexity beneath the soil surface." },
        { id: "STORY-SET-03", title: "ธาตุอาหารพืช", description: "Understanding essential nutrients and their roles in plant life." },
        { id: "STORY-SET-04", title: "จุลินทรีย์และไรโซสเฟียร์", description: "The intricate relationship between microbes and plant roots." },
        { id: "STORY-SET-05", title: "การดูแลพืชอย่างเข้าใจ", description: "Practical guide to plant care based on scientific understanding." }
    ];

    const greenFinenessTopicStorySets = [
        {
            id: "plant-observation",
            slug: "plant-observation",
            title: "การสังเกตอาการพืช",
            description: "ชุดบทความสำหรับอ่านใบ ลำต้น ราก และสภาพแวดล้อมแบบ System-Level Observation โดยไม่รีบสรุปจากอาการเดียว"
        },
        {
            id: "soil-organic-matter",
            slug: "soil-organic-matter",
            title: "ดินและอินทรียวัตถุ",
            description: "ชุดบทความเกี่ยวกับโครงสร้างดิน อินทรียวัตถุ น้ำ อากาศ ราก และชีวิตในดิน ซึ่งเป็นฐานของระบบปลูก"
        },
        {
            id: "water-environment",
            slug: "water-environment",
            title: "น้ำและสภาพแวดล้อม",
            description: "ชุดบทความเกี่ยวกับน้ำ แสง อุณหภูมิ อากาศ ความชื้น ปากใบ และสภาพแวดล้อมที่กำหนดจังหวะการทำงานของพืช"
        },
        {
            id: "root-growth",
            slug: "root-growth",
            title: "รากและการเจริญเติบโต",
            description: "ชุดบทความเกี่ยวกับระบบราก การตั้งตัวของพืช ลำต้น ใบ ฮอร์โมน ระบบลำเลียง และการเจริญเติบโตทั้งต้น"
        },
        {
            id: "plant-nutrition",
            slug: "plant-nutrition",
            title: "ธาตุอาหารพืช",
            description: "ชุดบทความเกี่ยวกับบทบาทของธาตุอาหารต่อการสร้างเนื้อเยื่อ การเติบโต การลำเลียง และการจัดการให้พืชใช้ได้จริง"
        },
        {
            id: "growing-system",
            slug: "growing-system",
            title: "ระบบการปลูก",
            description: "ชุดบทความที่เชื่อมความรู้เรื่องดิน น้ำ แสง ราก พืช และการดูแล ให้กลายเป็นการจัดการระบบปลูกอย่างเป็นเหตุเป็นผล"
        },
        {
            id: "ecology-relationships",
            slug: "ecology-relationships",
            title: "นิเวศวิทยาและความสัมพันธ์",
            description: "ชุดบทความที่มองความสัมพันธ์ระหว่างดิน พืช น้ำ อากาศ จุลินทรีย์ อินทรียวัตถุ และสิ่งมีชีวิตรอบข้างในระบบธรรมชาติ"
        }
    ];

    seedStorySetsWithoutDuplicates([...storySets, ...greenFinenessTopicStorySets]);

    // Seed/update EP.7 in gf_episodes
    db.prepare(`
        INSERT INTO gf_episodes (id, story_set_id, title, role, status, created_at, updated_at)
        VALUES ('GF-S01-E07', 'STORY-SET-01', 'ธาตุอาหาร: วัตถุดิบที่พืชใช้สร้างชีวิต', 'core_episode', 'planned', datetime('now'), datetime('now'))
        ON CONFLICT(id) DO NOTHING
    `).run();

    // Check if writing project for EP.7 exists
    const proj = db.prepare("SELECT id FROM gf_writing_projects WHERE episode_id = ?").get('GF-S01-E07') as { id: string } | undefined;
    if (!proj) {
        const projId = 'PROJ-GF-S01-E07';
        db.prepare(`
            INSERT INTO gf_writing_projects (id, episode_id, story_set_id, title, writing_mode, status, created_at, updated_at)
            VALUES (?, 'GF-S01-E07', 'STORY-SET-01', 'จากต้นอ่อนสู่ต้นกล้า: พืชเริ่มเปลี่ยนอะไรบ้าง', 'journey_chapter', 'draft', datetime('now'), datetime('now'))
        `).run(projId);

        // Seed the first writing block as "Article Body"
        db.prepare(`
            INSERT INTO gf_writing_blocks (id, project_id, writing_project_id, type, block_type, label, placeholder, content, content_md, sort_order)
            VALUES ('BLK-GF-S01-E07', ?, ?, 'text', 'text', 'Article Body', 'เริ่มร่างเนื้อหาของตอนที่นี่...', '', '', 0)
        `).run(projId, projId);
    }
}

function ensureWritingDeskTables() {
    db.exec(`
        CREATE TABLE IF NOT EXISTS writing_desk_drafts (
            id              TEXT PRIMARY KEY,
            topic_id        TEXT NULL,
            topic_title     TEXT NOT NULL,
            content_type    TEXT NOT NULL,
            draft_stage     TEXT NOT NULL DEFAULT 'working' CHECK (draft_stage IN ('working', 'reviewed', 'ready_to_export', 'exported', 'archived')),
            writing_mode    TEXT NOT NULL DEFAULT 'draft' CHECK (writing_mode IN ('draft', 'rewrite', 'polish', 'review', 'voice_extract', 'claim_check')),
            source_step     TEXT NULL,
            body            TEXT NOT NULL DEFAULT '',
            notes           TEXT NULL,
            linked_task_id  TEXT NULL,
            created_at      TEXT NOT NULL DEFAULT (datetime('now')),
            updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS arbor_review_results (
            id                      TEXT PRIMARY KEY,
            draft_id                TEXT NOT NULL,
            review_mode             TEXT NOT NULL,
            review_status           TEXT NOT NULL,
            reviewed_content_type   TEXT NULL,
            summary                 TEXT NULL,
            issues_json             TEXT NULL,
            patches_json            TEXT NULL,
            next_step               TEXT NULL,
            structured_json         TEXT NULL,
            created_at              TEXT NOT NULL DEFAULT (datetime('now')),
            FOREIGN KEY(draft_id) REFERENCES writing_desk_drafts(id) ON DELETE CASCADE
        );

        CREATE INDEX IF NOT EXISTS idx_writing_desk_topic_id ON writing_desk_drafts(topic_id);
        CREATE INDEX IF NOT EXISTS idx_writing_desk_linked_task ON writing_desk_drafts(linked_task_id);
        CREATE INDEX IF NOT EXISTS idx_arbor_review_draft_id ON arbor_review_results(draft_id);
    `);

    // Add source_step if it doesn't exist (in case of re-run on older version)
    const columns = db.prepare("PRAGMA table_info(writing_desk_drafts)").all() as any[];
    const colNames = columns.map(c => c.name);
    if (!colNames.includes('source_step')) {
        db.exec("ALTER TABLE writing_desk_drafts ADD COLUMN source_step TEXT NULL");
    }

    // Migration: remove CHECK constraint on content_type and source_step only.
    // draft_stage and writing_mode retain their CHECK constraints.
    // Only runs when the old constraint still exists (idempotent).
    const tableInfo = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='writing_desk_drafts'").get() as { sql: string } | undefined;
    if (tableInfo && tableInfo.sql.includes("CHECK (content_type IN")) {
        console.log("🛠 Migrating writing_desk_drafts: removing CHECK on content_type/source_step, retaining CHECK on draft_stage/writing_mode...");
        const migrateTx = db.transaction(() => {
            db.exec(`
                CREATE TABLE writing_desk_drafts_new (
                    id              TEXT PRIMARY KEY,
                    topic_id        TEXT NULL,
                    topic_title     TEXT NOT NULL,
                    content_type    TEXT NOT NULL,
                    draft_stage     TEXT NOT NULL DEFAULT 'working' CHECK (draft_stage IN ('working', 'reviewed', 'ready_to_export', 'exported', 'archived')),
                    writing_mode    TEXT NOT NULL DEFAULT 'draft' CHECK (writing_mode IN ('draft', 'rewrite', 'polish', 'review', 'voice_extract', 'claim_check')),
                    source_step     TEXT NULL,
                    body            TEXT NOT NULL DEFAULT '',
                    notes           TEXT NULL,
                    linked_task_id  TEXT NULL,
                    created_at      TEXT NOT NULL DEFAULT (datetime('now')),
                    updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
                );

                INSERT INTO writing_desk_drafts_new SELECT * FROM writing_desk_drafts;
                DROP TABLE writing_desk_drafts;
                ALTER TABLE writing_desk_drafts_new RENAME TO writing_desk_drafts;

                CREATE INDEX IF NOT EXISTS idx_writing_desk_topic_id ON writing_desk_drafts(topic_id);
                CREATE INDEX IF NOT EXISTS idx_writing_desk_linked_task ON writing_desk_drafts(linked_task_id);
            `);
        });
        migrateTx();
    }
}

function ensurePromptTemplates() {
    db.exec(`
        CREATE TABLE IF NOT EXISTS prompt_templates (
          id               TEXT PRIMARY KEY,
          name             TEXT NOT NULL,
          category         TEXT NOT NULL,
          purpose          TEXT NULL,
          role             TEXT NULL,
          context          TEXT NULL,
          input_fields     TEXT NULL,
          instructions     TEXT NULL,
          constraints      TEXT NULL,
          output_format    TEXT NULL,
          review_checklist TEXT NULL,
          notes            TEXT NULL,
          status           TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','testing','active','archived')),
          version          TEXT NOT NULL DEFAULT '1.0.0',
          version_notes    TEXT NULL,
          guardrail_preset_ids TEXT DEFAULT '[]',
          created_at       TEXT NOT NULL DEFAULT (datetime('now')),
          updated_at       TEXT NOT NULL DEFAULT (datetime('now'))
        );
        CREATE INDEX IF NOT EXISTS idx_prompt_templates_status ON prompt_templates(status);
        CREATE INDEX IF NOT EXISTS idx_prompt_templates_category ON prompt_templates(category);
    `);

    // Idempotent column check and migration for guardrail_preset_ids (MUST run before insert statement prepare)
    const columns = db.prepare("PRAGMA table_info(prompt_templates)").all() as { name: string }[];
    const colNames = columns.map(c => c.name);
    if (!colNames.includes("guardrail_preset_ids")) {
        db.exec("ALTER TABLE prompt_templates ADD COLUMN guardrail_preset_ids TEXT DEFAULT '[]'");
    }

    const seedPrompts = [
        {
            id: "seed-gf-research-brief",
            name: "Green Fineness Research Brief Assistant",
            category: "Writing",
            purpose: "ช่วยสรุปข้อมูลตั้งต้น บริบทของหัวข้อ กลุ่มผู้อ่าน และข้อเท็จจริงที่ควรใช้ก่อนเริ่มเขียนบทความ Green Fineness",
            role: "คุณคือผู้ช่วยวิเคราะห์ข้อมูลตั้งต้นสำหรับบทความ Green Fineness ที่เน้นความถูกต้อง ความเข้าใจง่าย การอธิบายเชิงวิศวกรรมเกษตร/ดิน และวิทยาศาสตร์ชีวภาพอย่างรอบคอบและปลอดภัย",
            context: "การเตรียมข้อมูลดิบและสรุปประเด็นหลักเพื่อนำไปใช้วางโครงร่าง (Outline) และเขียนบทความ (Draft) ให้สอดคล้องตามเกณฑ์ความปลอดภัย",
            input_fields: JSON.stringify([
                { name: "topic", label: "หัวข้อบทความ", value: "การปรุงดินสำหรับปลูกผักสลัดอินทรีย์" },
                { name: "target_audience", label: "กลุ่มผู้อ่านเป้าหมาย", value: "คนเมืองที่ต้องการปลูกผักทานเองหลังบ้าน" },
                { name: "source_notes", label: "ข้อมูลอ้างอิง/แหล่งข้อมูลหลัก", value: "ผลการทดสอบการใช้ดินปรุงผสมปุ๋ยหมักชีวภาพ" },
                { name: "article_goal", label: "เป้าหมายของบทความ", value: "ให้ความรู้การเตรียมดินโดยเน้นหลักการดินมีชีวิต (Living Soil)" }
            ]),
            instructions: "1. ศึกษาและวิเคราะห์หัวข้อ {{topic}} พร้อมกับพิจารณาข้อมูลดิบจาก {{source_notes}}\n2. ระบุและสรุปข้อมูลวิชาการด้านพืช ดิน หรือจุลินทรีย์ที่เกี่ยวข้องกับหัวข้ออย่างเป็นระบบ\n3. กำหนดกลุ่มผู้อ่านหลักตาม {{target_audience}} และระบุเจตนาในการค้นหาข้อมูล (Search Intent)\n4. สรุปแนวทางการเล่าเรื่องให้สอดคล้องกับ {{article_goal}}\n5. ระบุจุดควรระวังในการกล่าวอ้างสรรพคุณ (Claims) หรือผลลัพธ์เชิงสิ่งแวดล้อมที่เกี่ยวข้องกับหัวข้อนี้ โดยเน้นการใช้ภาษาที่ระมัดระวัง",
            constraints: "- ห้ามสรุปผลลัพธ์แบบแน่นอนเด็ดขาด เช่น เห็นผล 100% หรือ ดินฟื้นตัวทันที\n- ใช้ถ้อยคำที่มีความระมัดระวัง เช่น \"อาจช่วยสนับสนุน\", \"มีส่วนเกี่ยวข้องกับ\", \"ภายใต้การจัดการที่เหมาะสม\"\n- ห้ามแนะนำวิธีการที่ใช้สารเคมีสังเคราะห์หรือเป็นอันตรายต่อระบบนิเวศ",
            output_format: "Markdown Research Brief พร้อมหัวข้อ:\n1. หัวข้อและบริบท\n2. กลุ่มผู้อ่านเป้าหมาย\n3. ประเด็นสำคัญที่ควรอธิบาย\n4. จุดที่ต้องระวังในการกล่าวอ้าง (Claim Avoidance Guidelines)\n5. คำถามที่ควรตรวจสอบเพิ่มเติม",
            review_checklist: "- ข้อมูลมีความถูกต้องทางวิชาการและไม่ชี้นำเกินจริง\n- มีการใช้ถ้อยคำระมัดระวังที่เหมาะสมครบถ้วน\n- โครงสร้างและเป้าหมายบทความชัดเจน",
            notes: "เหมาะสำหรับการทำ Research และเตรียมข้อมูลก่อนการเขียนทุกครั้งเพื่อลดความเสี่ยงการละเมิดกฎการโฆษณา",
            status: "active",
            version: "1.0.0",
            version_notes: "Initial version",
            guardrail_preset_ids: JSON.stringify([
                "preset-gf-core-tone",
                "preset-scientific-claim-caution",
                "preset-non-salesy-edu",
                "preset-gf-review-checklist",
                "preset-soil-microbe-fertilizer"
            ])
        },
        {
            id: "seed-gf-article-outline",
            name: "Green Fineness Article Outline Assistant",
            category: "Writing",
            purpose: "ช่วยวางโครงสร้างบทความ H1, H2, H3 และลำดับการเล่า สำหรับบทความ Green Fineness",
            role: "เป็นผู้เชี่ยวชาญด้านการวางโครงสร้างบทความ SEO และครูสอนเกษตรอินทรีย์ที่เน้นการถ่ายทอดเนื้อหาให้เข้าใจง่ายและเป็นขั้นเป็นตอน",
            context: "การทำ outline สำหรับบทความยาวที่จะเผยแพร่บนเว็บบล็อกของ Green Fineness และนำไปขยายผลเป็นโพสต์โซเชียลมีเดียต่อไป",
            input_fields: JSON.stringify([
                { name: "topic", label: "หัวข้อบทความ", value: "การปรุงดินสำหรับปลูกผักสลัดอินทรีย์" },
                { name: "target_audience", label: "กลุ่มเป้าหมาย", value: "คนเมืองที่ต้องการปลูกผักทานเองหลังบ้าน" }
            ]),
            instructions: "1. วิเคราะห์เจตนาในการค้นหา (Search Intent) ของกลุ่มเป้าหมายตาม {{target_audience}}\n2. แบ่งโครงร่างเนื้อหาหัวข้อ {{topic}} ออกเป็น 4-5 ส่วนหลักโดยใช้โครงสร้างหัวข้อ Markdown H1, H2 และ H3\n3. ในแต่ละหัวข้อย่อย ให้สรุปประเด็นหลักและแนวคิดสำคัญที่จะเขียนสั้น ๆ\n4. เพิ่มส่วนคำถามที่พบบ่อย (FAQ) และบทสรุปเพื่อประโยชน์ของผู้อ่าน",
            constraints: "- โครงร่างต้องสอดคล้องกับแนวคิดดินมีชีวิต (Living Soil) และเกษตรธรรมชาติบำบัด\n- หลีกเลี่ยงการแนะนำสารเคมีสังเคราะห์ทุกชนิด\n- ภาษาเข้าใจง่าย ไม่เป็นวิชาการจนเกินไป",
            output_format: "Markdown Outline พร้อม H1 / H2 / H3 และคำอธิบายสั้นของแต่ละส่วน",
            review_checklist: "- โครงสร้างเรื่องมีการลำดับประเด็นอย่างเป็นระบบลื่นไหลหรือไม่\n- ลำดับการเล่าเรื่องลื่นไหลเข้าใจง่ายหรือไม่\n- ไม่มีเนื้อหาสารเคมีปนเปื้อน",
            notes: "สามารถปรับปรุงโครงสร้างตามฤดูกาลและประเภทพืชได้",
            status: "active",
            version: "1.0.0",
            version_notes: "Initial version",
            guardrail_preset_ids: JSON.stringify([
                "preset-gf-core-tone",
                "preset-scientific-claim-caution",
                "preset-non-salesy-edu",
                "preset-gf-review-checklist"
            ])
        },
        {
            id: "seed-claim-risk-reviewer",
            name: "Green Fineness Claim Risk Reviewer",
            category: "Review",
            purpose: "ช่วยตรวจความเสี่ยงของคำกล่าวอ้างในบทความ โดยเฉพาะเรื่องดิน พืช จุลินทรีย์ ปุ๋ย ธาตุอาหาร ผลผลิต คาร์บอน และสิ่งแวดล้อม",
            role: "คุณคือผู้เชี่ยวชาญด้านการตรวจสอบความเสี่ยงในการสื่อสารของแบรนด์ (Claims Compliance Auditor) และบรรณาธิการอาวุโสที่เชี่ยวชาญกฎเกณฑ์การโฆษณาด้านเกษตรและสมุนไพร",
            context: "การตรวจสอบบทความเกี่ยวกับสรรพคุณของสมุนไพรไทย เกษตรกรรม และสิ่งแวดล้อม ก่อนทำการเผยแพร่สู่สาธารณะเพื่อความปลอดภัยทางกฎหมายและสร้างความน่าเชื่อถือ",
            input_fields: JSON.stringify([
                { name: "content_to_review", label: "เนื้อหาที่ต้องการตรวจสอบ", value: "น้ำสมุนไพรสูตรนี้ช่วยรักษาโรคเบาหวานและความดันโลหิตสูงให้หายขาดได้ใน 7 วัน เพียงแค่ต้มดื่มเช้าเย็น" }
            ]),
            instructions: "1. ค้นหาคำกล่าวอ้างเกี่ยวกับผลลัพธ์ในทางพืช ดิน จุลินทรีย์ ปุ๋ย ธาตุอาหาร ผลผลิต คาร์บอน หรือสิ่งแวดล้อมที่ฟันธงแน่นอนใน {{content_to_review}}\n2. ตรวจสอบการใช้คำโฆษณาเกินจริง เช่น \"เห็นผลแน่นอน\", \"ดีที่สุด\", \"ปลอดภัย 100%\" หรือ \"ฟื้นฟูดินทันที\"\n3. ระบุประโยคที่มีความเสี่ยง พร้อมประเมินระดับความเสี่ยง (ต่ำ / กลาง / สูง)\n4. ให้คำอธิบายเหตุผลและเสนอแนะคำพูดทางเลือกที่มีความระมัดระวัง (Cautious wording)",
            constraints: "- ให้เหตุผลทางกฎหมายและวิทยาศาสตร์กำกับทุกครั้ง\n- เสนอคำทดแทนที่เป็นรูปธรรมและนำไปใช้งานได้ทันที\n- หลีกเลี่ยงถ้อยคำการันตีร้อยเปอร์เซ็นต์เด็ดขาด",
            output_format: "ตาราง Markdown:\n- ข้อความที่พบ\n- ระดับความเสี่ยง\n- เหตุผล\n- คำแนะนำในการปรับถ้อยคำ\n- ถ้อยคำทางเลือกที่ระมัดระวังขึ้น",
            review_checklist: "- ชี้เป้าคำว่า \"หายขาด\" หรือ \"รักษาโรค\" หรือคำกล่าวอ้างเกินจริงทางดินปุ๋ยชีวภาพหรือไม่\n- ให้ประโยคใหม่ที่นำไปใช้แทนได้จริงและระมัดระวังทางวิทยาศาสตร์หรือไม่",
            notes: "ครอบคลุมเกณฑ์การควบคุมโฆษณาและความเสี่ยงด้านการสื่อสารตามมาตรฐานแบรนด์",
            status: "active",
            version: "1.0.0",
            version_notes: "Initial version",
            guardrail_preset_ids: JSON.stringify([
                "preset-gf-core-tone",
                "preset-scientific-claim-caution",
                "preset-non-salesy-edu",
                "preset-gf-review-checklist",
                "preset-soil-microbe-fertilizer"
            ])
        },
        {
            id: "seed-gf-article-draft",
            name: "Green Fineness Article Draft Assistant",
            category: "Writing",
            purpose: "ช่วยร่างบทความ Green Fineness จาก brief และ outline ด้วยภาษาไทยที่อ่านง่าย มีบริบท ไม่ขายแรง และระวังการกล่าวอ้าง",
            role: "คุณคือบรรณาธิการสื่อสารและนักเขียนบทความวิชาการเกษตรอินทรีย์ของ Green Fineness ผู้เชี่ยวชาญในการเล่าเรื่องราวเชิงธรรมชาติด้วยภาษาสงบ ชัดเจน อบอุ่น และน่าอ่าน",
            context: "การร่างบทความจริงจากโครงสร้าง Outline และข้อมูลดิบที่ผ่านการสกรีนความเสี่ยงเรียบร้อยแล้ว",
            input_fields: JSON.stringify([
                { name: "research_brief", label: "สรุปข้อมูลดิบและทิศทางบทความ", value: "1. หัวข้อ: จุลินทรีย์ไมคอร์ไรซากับการช่วยรากพืชดูดซับฟอสฟอรัส\n2. ข้อควรระวัง: ห้ามเคลมว่าเร่งโต 100%" },
                { name: "article_outline", label: "โครงร่างบทความ H2 / H3", value: "H2: ไมคอร์ไรซาคืออะไร\nH2: ความสัมพันธ์แบบพึ่งพิงกับรากพืช\nH2: สรุปความสำคัญ" }
            ]),
            instructions: "1. ร่างบทความฉบับเต็มโดยอ้างอิงข้อมูลใน {{research_brief}} และเรียงตามโครงสร้าง {{article_outline}}\n2. ใช้ภาษาไทยที่สุภาพ สงบ อบอุ่น และสื่อสารความเป็นมิตรเหมือนเพื่อนคู่คิดด้านการเกษตร\n3. เขียนรายละเอียดของหัวข้อ H2 และ H3 แต่ละส่วนให้ลื่นไหลสม่ำเสมอ\n4. ตรวจสอบการนำเสนอหลักวิชาการดินและพืชอย่างเป็นธรรมชาติ และนำเสนอข้อมูลเชิงเปรียบเทียบอย่างเหมาะสม",
            constraints: "- ห้ามเคลมความเร็วในการเห็นผลลัพธ์เชิงฟื้นฟูเด็ดขาด\n- หลีกเลี่ยงภาษาที่เร่งรัดหรือเน้นการขายผลิตภัณฑ์ตรงตัว\n- คำอธิบายผลลัพธ์ต้องใช้คำจำกัดความที่ระมัดระวัง เช่น \"มีส่วนเกี่ยวข้องกับ...\" หรือ \"ช่วยสนับสนุนโอกาสในการ...\"",
            output_format: "บทความฉบับร่าง Markdown พร้อมหัวข้อครบตาม outline",
            review_checklist: "- บทความร่างสมบูรณ์ครบถ้วนตาม Outline หรือไม่\n- น้ำเสียงอบอุ่นและสุภาพตามหลักการ Green Fineness หรือไม่\n- ไม่มีการการันตีผลลัพธ์หรือข้อความสุ่มเสี่ยงเชิงโฆษณา",
            notes: "แนะนำให้ส่งดราฟท์นี้ไปขัดเกลาด้วยเทมเพลต Tone Reviewer และ Claim Reviewer อีกครั้ง",
            status: "active",
            version: "1.0.0",
            version_notes: "Initial version",
            guardrail_preset_ids: JSON.stringify([
                "preset-gf-core-tone",
                "preset-scientific-claim-caution",
                "preset-non-salesy-edu",
                "preset-gf-review-checklist",
                "preset-soil-microbe-fertilizer"
            ])
        },
        {
            id: "seed-gf-tone-reviewer",
            name: "Green Fineness Tone Reviewer",
            category: "Review",
            purpose: "ช่วยขัดเกลาภาษาให้สงบ ชัด อ่านง่าย เป็นมิตร และสอดคล้องกับโทน Green Fineness",
            role: "คุณคือบรรณาธิการอาวุโส (Tone and Voice Specialist) ผู้เชี่ยวชาญการขัดเกลาบทความและเนื้อหาความรู้แนวธรรมชาติบำบัดและเกษตรอินทรีย์ให้มีน้ำเสียงอบอุ่นและสุขุม",
            context: "การขัดเกลาภาษาดราฟท์บทความให้สอดคล้องเป็นหนึ่งเดียวกับเสียงของแบรนด์ (Brand Voice Guidelines)",
            input_fields: JSON.stringify([
                { name: "draft_text", label: "ดราฟท์บทความ", value: "ผู้ป่วยจะต้องรับประทานขิงปริมาณ 5 กรัมต่อวันเพื่อกระตุ้นการทำงานของลำไส้ใหญ่ ไม่เช่นนั้นอาจเกิดภาวะท้องผูกเรื้อรังได้" }
            ]),
            instructions: "1. อ่านข้อความ {{draft_text}} เพื่อประเมินโทนเสียงว่ามีความก้าวร้าว, เร่งรัด, หรือเป็นทางการเชิงวิชาการมากเกินไปหรือไม่\n2. ระบุจุดที่ควรปรับปรุงความลื่นไหลและสไตล์คำพูดให้อบอุ่นยิ่งขึ้น\n3. เขียนเวอร์ชันใหม่ (Rewrite) ที่เป็นมิตรและนุ่มนวล โดยไม่สูญเสียประเด็นความรู้สำคัญ\n4. สรุปคำหรือน้ำเสียงที่ควรหลีกเลี่ยงเพื่อรักษาเอกลักษณ์ของแบรนด์",
            constraints: "- ห้ามเปลี่ยนใจความสำคัญหรือข้อเท็จจริงดั้งเดิมของสมุนไพร/พืช\n- ห้ามใช้ภาษาแสลงที่ไม่เป็นสากล\n- เน้นโทนเสียงแบบ 'โอบรับและเข้าใจธรรมชาติ'",
            output_format: "1. สรุปปัญหาโทนภาษาปัจจุบัน\n2. จุดที่ควรปรับปรุงแยกเป็นข้อ\n3. เวอร์ชัน Rewrite ที่นุ่มนวลและสอดคล้องกับแบรนด์\n4. รายการคำที่ควรหลีกเลี่ยงและคำแนะนำทดแทน",
            review_checklist: "- บทความอ่านง่ายขึ้นและผ่อนคลายขึ้นหรือไม่\n- รักษาข้อเท็จจริงถูกต้องหรือไม่",
            notes: "มีประโยชน์มากเมื่อนำมาขัดเกลางานจากนักเขียนหลายๆ คนให้มีเอกภาพเดียวกัน",
            status: "active",
            version: "1.0.0",
            version_notes: "Initial version",
            guardrail_preset_ids: JSON.stringify([
                "preset-gf-core-tone",
                "preset-scientific-claim-caution",
                "preset-non-salesy-edu",
                "preset-gf-review-checklist"
            ])
        },
        {
            id: "seed-gf-seo-metadata",
            name: "Green Fineness SEO Metadata Assistant",
            category: "Writing",
            purpose: "ช่วยร่าง meta title, meta description, slug และ keyword เบื้องต้นสำหรับบทความ Green Fineness โดยไม่ใช้คำโฆษณาเกินจริง",
            role: "คุณคือผู้เชี่ยวชาญด้านการทำ SEO และ Copywriter มืออาชีพที่รู้วิธีเขียนดึงดูดการคลิกบนหน้าผลค้นหา Google โดยรักษาภาพลักษณ์ที่ดีของแบรนด์",
            context: "การทำ SEO metadata สำหรับบทความวิชาการดินและพืชเพื่อนำไปอัปโหลดขึ้นระบบ CMS",
            input_fields: JSON.stringify([
                { name: "article_content", label: "เนื้อหาหลักของบทความ", value: "การทำดินหมักสำหรับพืชในสวนอินทรีย์ โดยใช้ใบไม้แห้งและเศษผัก..." },
                { name: "target_keywords", label: "คำสำคัญเป้าหมาย", value: "ดินหมักอินทรีย์, เตรียมดินปลูกผัก" }
            ]),
            instructions: "1. วิเคราะห์ข้อมูลจาก {{article_content}} และคำสำคัญจาก {{target_keywords}}\n2. เขียน Meta Title ความยาวไม่เกิน 60 ตัวอักษร ให้มีคีย์เวิร์ดหลักและน่าคลิกอ่าน\n3. เขียน Meta Description ความยาวไม่เกิน 150 ตัวอักษร สรุปประเด็นบทความด้วยภาษาอบอุ่นและชวนศึกษาต่อ\n4. แนะนำ Slug ภาษาอังกฤษที่สั้นกระชับและมีความหมายสัมพันธ์กับบทความ\n5. เสนอแนะคำสำคัญเสริม (Secondary Keywords) และข้อความสั้นสำหรับ Social Preview",
            constraints: "- ห้ามใช้ข้อความโฆษณาชวนเชื่อหรือคำคลิกเบตเกินจริง\n- ข้อมูลใน Metadata ต้องตรงตามประเด็นจริงในบทความและใช้ภาษาระมัดระวัง",
            output_format: "- Meta Title\n- Meta Description\n- Slug\n- Primary Keyword\n- Secondary Keywords\n- Social Preview Text",
            review_checklist: "- ความยาวของ Title และ Description ตรงตามมาตรฐานหรือไม่\n- มีคำสำคัญหลักผสมผสานอย่างเป็นธรรมชาติหรือไม่\n- ข้อความเชิญชวนไม่ใช้ภาษาเร่งรัดการขายเกินไป",
            notes: "ช่วยเพิ่มโอกาสในการแสดงผลและดึงดูดผู้ค้นหาด้วยภาษาสงบและให้คุณค่า",
            status: "active",
            version: "1.0.0",
            version_notes: "Initial version",
            guardrail_preset_ids: JSON.stringify([
                "preset-gf-core-tone",
                "preset-scientific-claim-caution",
                "preset-non-salesy-edu",
                "preset-gf-review-checklist"
            ])
        },
        {
            id: "seed-gf-social-caption",
            name: "Green Fineness Social Caption Assistant",
            category: "Marketing",
            purpose: "ช่วยย่อยบทความเป็นโพสต์สั้นสำหรับ social media โดยรักษาโทนความรู้ ไม่ขายแรง และไม่กล่าวอ้างเกินบริบท",
            role: "คุณคือผู้เชี่ยวชาญด้านการสื่อสารและการตลาดผ่านคอนเทนต์สร้างสรรค์ (Social Media Content Planner) ของ Green Fineness ผู้เชี่ยวชาญการย่อยข้อมูลยาก ๆ ให้เข้าถึงง่ายและเป็นมิตร",
            context: "การสร้างสรรค์ข้อความโพสต์สั้นสำหรับเผยแพร่บน Facebook, Instagram หรือ Line Official Account จากบทความยาว",
            input_fields: JSON.stringify([
                { name: "full_article", label: "บทความเต็ม", value: "อินทรียวัตถุในดินมีความสำคัญต่อสิ่งมีชีวิตขนาดเล็กและโครงสร้างดินที่ร่วนซุย..." },
                { name: "post_objective", label: "วัตถุประสงค์ในการโพสต์", value: "แชร์ความรู้ให้เกษตรกรตระหนักถึงการหยุดเผาใบไม้และนำมาหมักแทน" }
            ]),
            instructions: "1. สรุปสาระสำคัญหลักจาก {{full_article}} ตามเป้าหมาย {{post_objective}}\n2. ออกแบบ Hook ประโยคแรกให้น่าสนใจและมีความเป็นมิตร\n3. ร่างเนื้อหาเป็น 3 สไตล์: 1) แบบให้ความรู้ (Educational focus), 2) แบบชวนคิดชวนคุย (Conversational engagement), 3) แบบสรุปย่อยกระชับ (Quick takeaway)\n4. เสนอแนะแฮชแท็ก (#Hashtags) ของแบรนด์และชุมชนเกษตรอินทรีย์ที่เหมาะสม",
            constraints: "- ห้ามใช้ภาษาเร่งเร้าให้ซื้อสินค้า หรือลดคุณค่าทางความรู้ของโพสต์\n- ห้ามเคลมสรรพคุณสินค้าหรือผลลัพธ์ดิน/พืชเกินความเป็นจริงเด็ดขาด",
            output_format: "3 เวอร์ชัน:\n1. แบบให้ความรู้\n2. แบบชวนคิด\n3. แบบสรุปสั้น\nพร้อม Hashtag ที่เหมาะสม",
            review_checklist: "- โพสต์ทั้ง 3 สไตล์เหมาะสมกับวัตถุประสงค์หรือไม่\n- ภาษาอบอุ่นและเชิญชวนอย่างมีสติ ไม่มีคำโฆษณาเด็ดขาดเกินไป",
            notes: "ช่วยรักษาภาพลักษณ์ที่ดีในการสื่อสารผ่านโซเชียลมีเดียของแบรนด์",
            status: "active",
            version: "1.0.0",
            version_notes: "Initial version",
            guardrail_preset_ids: JSON.stringify([
                "preset-gf-core-tone",
                "preset-scientific-claim-caution",
                "preset-non-salesy-edu",
                "preset-gf-review-checklist"
            ])
        }
    ];

    const stmt = db.prepare(`
        INSERT INTO prompt_templates (
            id, name, category, purpose, role, context, input_fields,
            instructions, constraints, output_format, review_checklist, notes, status, version, version_notes, guardrail_preset_ids
        ) VALUES (
            @id, @name, @category, @purpose, @role, @context, @input_fields,
            @instructions, @constraints, @output_format, @review_checklist, @notes, @status, @version, @version_notes, @guardrail_preset_ids
        ) ON CONFLICT(id) DO NOTHING
    `);

    const tx = db.transaction(() => {
        for (const prompt of seedPrompts) {
            stmt.run(prompt);
        }
    });
    tx();
}

function ensureGuardrailPresets() {
    db.exec(`
        CREATE TABLE IF NOT EXISTS guardrail_presets (
          id           TEXT PRIMARY KEY,
          name         TEXT NOT NULL,
          category     TEXT NOT NULL CHECK (category IN ('tone', 'claims', 'sales', 'review', 'custom')),
          description  TEXT NOT NULL,
          content      TEXT NOT NULL,
          risk_words   TEXT NULL, -- JSON array
          is_active    INTEGER NOT NULL DEFAULT 1,
          created_at   TEXT NOT NULL DEFAULT (datetime('now')),
          updated_at   TEXT NOT NULL DEFAULT (datetime('now'))
        );
    `);

    const seedPresets = [
        {
            id: "preset-gf-core-tone",
            name: "Green Fineness Core Tone",
            category: "tone",
            description: "ใช้ภาษาไทยที่สงบ ชัด อ่านง่าย มีบริบท ไม่เร่งเร้า ไม่ขายแรง และไม่ใช้ถ้อยคำที่ฟังดูเกินจริง",
            content: "ใช้ภาษาไทยที่สงบ ชัด อ่านง่าย มีบริบท ไม่เร่งเร้า ไม่ขายแรง และไม่ใช้ถ้อยคำที่ฟังดูเกินจริง",
            risk_words: JSON.stringify([])
        },
        {
            id: "preset-scientific-claim-caution",
            name: "Scientific Claim Caution",
            category: "claims",
            description: "เมื่อกล่าวถึงผลลัพธ์ทางพืช ดิน จุลินทรีย์ ปุ๋ย ธาตุอาหาร การเจริญเติบโต ผลผลิต คาร์บอน หรือสิ่งแวดล้อม ให้ใช้ถ้อยคำระมัดระวัง และหลีกเลี่ยงการสรุปผลแบบแน่นอนหากไม่มีหลักฐานเฉพาะเจาะจง",
            content: "เมื่อกล่าวถึงผลลัพธ์ทางพืช ดิน จุลินทรีย์ ปุ๋ย ธาตุอาหาร การเจริญเติบโต ผลผลิต คาร์บอน หรือสิ่งแวดล้อม ให้ใช้ถ้อยคำระมัดระวัง และหลีกเลี่ยงการสรุปผลแบบแน่นอนหากไม่มีหลักฐานเฉพาะเจาะจง",
            risk_words: JSON.stringify([
                { word: "เห็นผลแน่นอน", suggestedAlternatives: ["อาจช่วยสนับสนุน", "ในบางบริบท"] },
                { word: "ปลอดภัย 100%", suggestedAlternatives: ["ควรพิจารณาร่วมกับปัจจัยอื่น"] },
                { word: "แก้ปัญหาได้ทันที", suggestedAlternatives: ["ในบางบริบท", "ควรพิจารณาร่วมกับปัจจัยอื่น"] }
            ])
        },
        {
            id: "preset-soil-microbe-fertilizer",
            name: "Soil / Microbe / Fertilizer Claim Guardrail",
            category: "claims",
            description: "หลีกเลี่ยงการกล่าวว่าจุลินทรีย์ ปุ๋ย หรือสารบำรุง “ทำให้” พืชโต ดินฟื้น หรือผลผลิตเพิ่มแบบตรงตัวและแน่นอน ให้ใช้ภาษาที่สะท้อนความเกี่ยวข้องภายใต้บริบท เช่น “อาจช่วยสนับสนุน”, “มีส่วนเกี่ยวข้องกับ”, “ภายใต้การจัดการที่เหมาะสม”",
            content: "หลีกเลี่ยงการกล่าวว่าจุลินทรีย์ ปุ๋ย หรือสารบำรุง “ทำให้” พืชโต ดินฟื้น หรือผลผลิตเพิ่มแบบตรงตัวและแน่นอน ให้ใช้ภาษาที่สะท้อนความเกี่ยวข้องภายใต้บริบท เช่น “อาจช่วยสนับสนุน”, “มีส่วนเกี่ยวข้องกับ”, “ภายใต้การจัดการที่เหมาะสม”",
            risk_words: JSON.stringify([
                { word: "เพิ่มผลผลิตแน่นอน", suggestedAlternatives: ["อาจช่วยสนับสนุน", "ควรพิจารณาร่วมกับปัจจัยอื่น"] },
                { word: "ฟื้นฟูดิน", suggestedAlternatives: ["อาจช่วยสนับสนุน", "ภายใต้การจัดการที่เหมาะสม"] },
                { word: "เร่งโต", suggestedAlternatives: ["อาจช่วยสนับสนุน"] },
                { word: "ดินดีขึ้นทันที", suggestedAlternatives: ["อาจช่วยสนับสนุน", "ภายใต้การจัดการที่เหมาะสม"] },
                { word: "จุลินทรีย์ทำให้...", suggestedAlternatives: ["มีส่วนเกี่ยวข้องกับ", "อาจเป็นหนึ่งในปัจจัยที่เกี่ยวข้อง"] }
            ])
        },
        {
            id: "preset-non-salesy-edu",
            name: "Non-salesy Educational Content",
            category: "sales",
            description: "หลีกเลี่ยง CTA แบบเร่งเร้า คำโฆษณาเกินจริง หรือการพูดเหมือนขายนำ ให้เน้นการอธิบายความเข้าใจ เหตุผล บริบท และการนำไปพิจารณาใช้อย่างเหมาะสม",
            content: "หลีกเลี่ยง CTA แบบเร่งเร้า คำโฆษณาเกินจริง หรือการพูดเหมือนขายนำ ให้เน้นการอธิบายความเข้าใจ เหตุผล บริบท และการนำไปพิจารณาใช้อย่างเหมาะสม",
            risk_words: JSON.stringify([
                { word: "ดีที่สุด", suggestedAlternatives: ["ภายใต้เงื่อนไขที่เหมาะสม", "ภายใต้การจัดการที่เหมาะสม"] },
                { word: "ใช้ได้ทุกพืช", suggestedAlternatives: ["ในบางบริบท"] }
            ])
        },
        {
            id: "preset-gf-review-checklist",
            name: "Green Fineness Review Checklist",
            category: "review",
            description: "ก่อนส่งออกผลลัพธ์ ให้ตรวจความสงบ ความโปร่งใส ชัดเจน และความถูกต้องระมัดระวังตามหลักเกณฑ์",
            content: "ก่อนส่งออกผลลัพธ์ ให้ตรวจว่า:\n- ข้อความชัดและอ่านเข้าใจง่ายหรือไม่\n- มีคำกล่าวอ้างแรงเกินไปหรือไม่\n- น้ำเสียงยังสงบ ไม่ขายแรงหรือไม่\n- มีบริบทเพียงพอหรือไม่\n- ถ้ามี claim เชิงวิทยาศาสตร์ ใช้ถ้อยคำระมัดระวังแล้วหรือไม่",
            risk_words: JSON.stringify([])
        }
    ];

    const stmt = db.prepare(`
        INSERT INTO guardrail_presets (
            id, name, category, description, content, risk_words
        ) VALUES (
            @id, @name, @category, @description, @content, @risk_words
        ) ON CONFLICT(id) DO UPDATE SET
            name = excluded.name,
            category = excluded.category,
            description = excluded.description,
            content = excluded.content,
            risk_words = excluded.risk_words
    `);

    const tx = db.transaction(() => {
        for (const preset of seedPresets) {
            stmt.run(preset);
        }
    });
    tx();
}

function ensurePromptRunLogs() {
    db.exec(`
        CREATE TABLE IF NOT EXISTS prompt_run_logs (
          id                        TEXT PRIMARY KEY,
          prompt_template_id        TEXT NOT NULL,
          input_snapshot            TEXT NOT NULL,
          compiled_prompt_snapshot  TEXT NOT NULL,
          output_notes              TEXT NULL,
          rating                    INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
          next_revision_notes       TEXT NULL,
          summary                   TEXT DEFAULT '',
          run_status                TEXT DEFAULT 'needs_revision',
          created_at                TEXT NOT NULL DEFAULT (datetime('now')),
          updated_at                TEXT NOT NULL DEFAULT (datetime('now')),
          FOREIGN KEY(prompt_template_id) REFERENCES prompt_templates(id) ON DELETE CASCADE
        );
        CREATE INDEX IF NOT EXISTS idx_prompt_run_logs_template_id ON prompt_run_logs(prompt_template_id);

        CREATE TRIGGER IF NOT EXISTS trg_prompt_run_logs_updated_at
        AFTER UPDATE ON prompt_run_logs
        FOR EACH ROW
        WHEN NEW.updated_at = OLD.updated_at OR NEW.updated_at IS OLD.updated_at
        BEGIN
          UPDATE prompt_run_logs SET updated_at = datetime('now') WHERE id = NEW.id;
        END;
    `);

    // Idempotent column check and migration
    const columns = db.prepare("PRAGMA table_info(prompt_run_logs)").all() as { name: string }[];
    const colNames = columns.map(c => c.name);

    if (!colNames.includes("summary")) {
        db.exec("ALTER TABLE prompt_run_logs ADD COLUMN summary TEXT DEFAULT ''");
    }
    if (!colNames.includes("run_status")) {
        db.exec("ALTER TABLE prompt_run_logs ADD COLUMN run_status TEXT DEFAULT 'needs_revision'");
    }
}

function ensurePromptVersions() {
    db.exec(`
        CREATE TABLE IF NOT EXISTS prompt_versions (
          id                        TEXT PRIMARY KEY,
          prompt_template_id        TEXT NOT NULL,
          version                   TEXT NOT NULL, -- e.g. '1.0.0'
          revision_notes            TEXT NULL,
          created_from_run_log_id   TEXT NULL,
          is_active                 INTEGER NOT NULL DEFAULT 0,
          -- Snapshots:
          purpose                   TEXT NULL,
          role                      TEXT NULL,
          context                   TEXT NULL,
          input_fields              TEXT NULL, -- JSON array string
          instructions              TEXT NULL,
          constraints               TEXT NULL,
          output_format             TEXT NULL,
          review_checklist          TEXT NULL,
          notes                     TEXT NULL,
          guardrail_preset_ids      TEXT DEFAULT '[]', -- JSON array string
          created_at                TEXT NOT NULL DEFAULT (datetime('now')),
          updated_at                TEXT NOT NULL DEFAULT (datetime('now')),
          FOREIGN KEY(prompt_template_id) REFERENCES prompt_templates(id) ON DELETE CASCADE,
          FOREIGN KEY(created_from_run_log_id) REFERENCES prompt_run_logs(id) ON DELETE SET NULL
        );

        CREATE INDEX IF NOT EXISTS idx_prompt_versions_template_id ON prompt_versions(prompt_template_id);

        CREATE TRIGGER IF NOT EXISTS trg_prompt_versions_updated_at
        AFTER UPDATE ON prompt_versions
        FOR EACH ROW
        WHEN NEW.updated_at = OLD.updated_at OR NEW.updated_at IS OLD.updated_at
        BEGIN
          UPDATE prompt_versions SET updated_at = datetime('now') WHERE id = NEW.id;
        END;
    `);
}

function ensurePromptWorkflows() {
    db.exec(`
        CREATE TABLE IF NOT EXISTS prompt_workflows (
          id          TEXT PRIMARY KEY,
          name        TEXT NOT NULL,
          description TEXT NULL,
          status      TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
          created_at  TEXT NOT NULL DEFAULT (datetime('now')),
          updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
        );

        CREATE INDEX IF NOT EXISTS idx_prompt_workflows_status ON prompt_workflows(status);

        CREATE TRIGGER IF NOT EXISTS trg_prompt_workflows_updated_at
        AFTER UPDATE ON prompt_workflows
        FOR EACH ROW
        WHEN NEW.updated_at = OLD.updated_at OR NEW.updated_at IS OLD.updated_at
        BEGIN
          UPDATE prompt_workflows SET updated_at = datetime('now') WHERE id = NEW.id;
        END;

        CREATE TABLE IF NOT EXISTS prompt_workflow_steps (
          id                 TEXT PRIMARY KEY,
          workflow_id        TEXT NOT NULL,
          prompt_template_id TEXT NOT NULL,
          step_name          TEXT NOT NULL,
          step_description   TEXT NULL,
          step_instruction   TEXT NULL,
          sort_order         INTEGER NOT NULL,
          run_status         TEXT DEFAULT 'pending',
          output_note        TEXT DEFAULT '',
          last_run_at        TEXT NULL,
          created_at         TEXT NOT NULL DEFAULT (datetime('now')),
          updated_at         TEXT NOT NULL DEFAULT (datetime('now')),
          FOREIGN KEY(workflow_id) REFERENCES prompt_workflows(id) ON DELETE CASCADE,
          FOREIGN KEY(prompt_template_id) REFERENCES prompt_templates(id) ON DELETE CASCADE
        );

        CREATE INDEX IF NOT EXISTS idx_prompt_workflow_steps_workflow ON prompt_workflow_steps(workflow_id, sort_order);

        CREATE TRIGGER IF NOT EXISTS trg_prompt_workflow_steps_updated_at
        AFTER UPDATE ON prompt_workflow_steps
        FOR EACH ROW
        WHEN NEW.updated_at = OLD.updated_at OR NEW.updated_at IS OLD.updated_at
        BEGIN
          UPDATE prompt_workflow_steps SET updated_at = datetime('now') WHERE id = NEW.id;
        END;
    `);

    // Idempotent column check and migration for manual run checklist fields
    const columns = db.prepare("PRAGMA table_info(prompt_workflow_steps)").all() as { name: string }[];
    const colNames = columns.map(c => c.name);

    if (!colNames.includes("run_status")) {
        db.exec("ALTER TABLE prompt_workflow_steps ADD COLUMN run_status TEXT DEFAULT 'pending'");
    }
    if (!colNames.includes("output_note")) {
        db.exec("ALTER TABLE prompt_workflow_steps ADD COLUMN output_note TEXT DEFAULT ''");
    }
    if (!colNames.includes("last_run_at")) {
        db.exec("ALTER TABLE prompt_workflow_steps ADD COLUMN last_run_at TEXT NULL");
    }
}

// --- Arbor Daily Planner (ARBOR-PLANNER-001B) ---
function ensurePlannerTables() {
    db.exec(`
        CREATE TABLE IF NOT EXISTS planner_days (
          id                      TEXT PRIMARY KEY,
          plan_date               TEXT NOT NULL UNIQUE,
          main_outcome            TEXT NULL,
          daily_capacity_minutes  INTEGER NULL,
          energy_level            TEXT NULL CHECK (energy_level IS NULL OR energy_level IN ('low','medium','high','recovery')),
          status                  TEXT NOT NULL DEFAULT 'planning' CHECK (status IN ('planning','active','completed')),
          created_at              TEXT NOT NULL DEFAULT (datetime('now')),
          updated_at              TEXT NOT NULL DEFAULT (datetime('now'))
        );

        CREATE INDEX IF NOT EXISTS idx_planner_days_plan_date ON planner_days(plan_date);
        CREATE INDEX IF NOT EXISTS idx_planner_days_status ON planner_days(status);

        CREATE TRIGGER IF NOT EXISTS trg_planner_days_updated_at
        AFTER UPDATE ON planner_days
        FOR EACH ROW
        WHEN NEW.updated_at = OLD.updated_at OR NEW.updated_at IS OLD.updated_at
        BEGIN
          UPDATE planner_days SET updated_at = datetime('now') WHERE id = NEW.id;
        END;

        CREATE TABLE IF NOT EXISTS planner_items (
          id                TEXT PRIMARY KEY,
          planner_day_id    TEXT NOT NULL,
          source_type       TEXT NOT NULL CHECK (source_type IN ('task','project_item')),
          source_id         TEXT NOT NULL,
          work_mode         TEXT NOT NULL CHECK (work_mode IN ('focus','production','ai_preparation','ai_execution','review','maintenance')),
          priority          TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('critical','high','normal','low')),
          estimated_minutes INTEGER NULL,
          start_time        TEXT NULL,
          end_time          TEXT NULL,
          ai_provider_key   TEXT NULL,
          energy_level      TEXT NULL CHECK (energy_level IS NULL OR energy_level IN ('high','medium','low')),
          scheduled_block   TEXT NULL CHECK (scheduled_block IS NULL OR scheduled_block IN ('morning_focus','afternoon_production','pre_ai_preparation','evening_ai','flexible')),
          planned_order     INTEGER NOT NULL DEFAULT 0,
          planner_status    TEXT NOT NULL DEFAULT 'planned' CHECK (planner_status IN ('planned','ready','doing','waiting','review','completed','carried_forward','blocked')),
          is_main_task      INTEGER NOT NULL DEFAULT 0,
          created_at        TEXT NOT NULL DEFAULT (datetime('now')),
          updated_at        TEXT NOT NULL DEFAULT (datetime('now')),
          FOREIGN KEY(planner_day_id) REFERENCES planner_days(id) ON DELETE CASCADE
        );

        -- Prevent same source being added twice to the same planner day
        CREATE UNIQUE INDEX IF NOT EXISTS idx_planner_items_no_dup
          ON planner_items(planner_day_id, source_type, source_id);

        CREATE INDEX IF NOT EXISTS idx_planner_items_day_order ON planner_items(planner_day_id, planned_order);
        CREATE INDEX IF NOT EXISTS idx_planner_items_source ON planner_items(source_type, source_id);

        CREATE TRIGGER IF NOT EXISTS trg_planner_items_updated_at
        AFTER UPDATE ON planner_items
        FOR EACH ROW
        WHEN NEW.updated_at = OLD.updated_at OR NEW.updated_at IS OLD.updated_at
        BEGIN
          UPDATE planner_items SET updated_at = datetime('now') WHERE id = NEW.id;
        END;
    `);

    const plannerItemColumns = db.prepare("PRAGMA table_info(planner_items)").all() as { name: string }[];
    const plannerItemColumnNames = plannerItemColumns.map(column => column.name);
    if (!plannerItemColumnNames.includes("start_time")) {
        db.exec("ALTER TABLE planner_items ADD COLUMN start_time TEXT NULL");
    }
    if (!plannerItemColumnNames.includes("end_time")) {
        db.exec("ALTER TABLE planner_items ADD COLUMN end_time TEXT NULL");
    }
    if (!plannerItemColumnNames.includes("ai_provider_key")) {
        db.exec("ALTER TABLE planner_items ADD COLUMN ai_provider_key TEXT NULL");
    }
}

function ensureAIResourceProfiles() {
    db.exec(`
        CREATE TABLE IF NOT EXISTS ai_resource_profiles (
          id                TEXT PRIMARY KEY,
          provider_key      TEXT NOT NULL UNIQUE,
          display_name      TEXT NOT NULL,
          availability      TEXT NOT NULL DEFAULT 'unknown' CHECK (availability IN ('unavailable','low','medium','high','unknown')),
          remaining_percent INTEGER NULL CHECK (remaining_percent IS NULL OR (remaining_percent >= 0 AND remaining_percent <= 100)),
          reset_at          TEXT NULL,
          cost_tier         TEXT NULL CHECK (cost_tier IS NULL OR cost_tier IN ('low','medium','high')),
          notes             TEXT NULL,
          created_at        TEXT NOT NULL DEFAULT (datetime('now')),
          updated_at        TEXT NOT NULL DEFAULT (datetime('now'))
        );

        CREATE TRIGGER IF NOT EXISTS trg_ai_resource_profiles_updated_at
        AFTER UPDATE ON ai_resource_profiles
        FOR EACH ROW
        WHEN NEW.updated_at = OLD.updated_at OR NEW.updated_at IS OLD.updated_at
        BEGIN
          UPDATE ai_resource_profiles SET updated_at = datetime('now') WHERE id = NEW.id;
        END;
    `);
}

ensureNotes();
ensureAppMeta();
cleanupLegacyAvaDemoDataOnce();
ensureGreenFinenessModel();
ensureArborWritingLab();
ensureWritingDeskTables();
ensurePromptTemplates();
ensureGuardrailPresets();
ensurePromptRunLogs();
ensurePromptVersions();
ensurePromptWorkflows();
ensurePlannerTables();
ensureAIResourceProfiles();

if (!shouldSkipSeed) {
    ensureSeedProjects();
}
