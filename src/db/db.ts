import Database from "better-sqlite3";
import fs from "fs";
import path from "path";
import crypto from "crypto";

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

export function seedArborWritingLab() {
    const storySets = [
        { id: "STORY-SET-01", title: "ชีวิตของพืชหนึ่งต้น", description: "The core journey of a single plant from seed to seed." },
        { id: "STORY-SET-02", title: "โลกใต้พื้นดิน", description: "Exploring the hidden complexity beneath the soil surface." },
        { id: "STORY-SET-03", title: "ธาตุอาหารพืช", description: "Understanding essential nutrients and their roles in plant life." },
        { id: "STORY-SET-04", title: "จุลินทรีย์และไรโซสเฟียร์", description: "The intricate relationship between microbes and plant roots." },
        { id: "STORY-SET-05", title: "การดูแลพืชอย่างเข้าใจ", description: "Practical guide to plant care based on scientific understanding." }
    ];

    const stmt = db.prepare(`
        INSERT INTO gf_story_sets (id, title, description, status)
        VALUES (?, ?, ?, 'active')
        ON CONFLICT(id) DO UPDATE SET
            title = excluded.title,
            description = excluded.description,
            updated_at = datetime('now')
    `);

    const tx = db.transaction(() => {
        for (const ss of storySets) {
            stmt.run(ss.id, ss.title, ss.description);
        }
    });
    tx();

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

    const seedPrompts = [
        {
            id: "seed-gf-article-outline",
            name: "Green Fineness Article Outline Assistant",
            category: "Writing",
            purpose: "ช่วยร่างโครงร่างบทความ (Outline) สำหรับเนื้อหาเกี่ยวกับการเกษตรอินทรีย์ ดิน และสมุนไพร",
            role: "เป็นผู้เชี่ยวชาญด้านการวางโครงสร้างบทความ SEO และครูสอนเกษตรอินทรีย์ที่เน้นการถ่ายทอดเนื้อหาให้เข้าใจง่ายและเป็นขั้นเป็นตอน",
            context: "การทำ outline สำหรับบทความยาวที่จะเผยแพร่บนเว็บบล็อกของ Green Fineness และนำไปขยายผลเป็นโพสต์โซเชียลมีเดียต่อไป",
            input_fields: JSON.stringify([
                { name: "topic", label: "หัวข้อบทความ", value: "การปรุงดินสำหรับปลูกผักสลัดอินทรีย์" },
                { name: "target_audience", label: "กลุ่มเป้าหมาย", value: "คนเมืองที่ต้องการปลูกผักทานเองหลังบ้าน" }
            ]),
            instructions: "1. วิเคราะห์เจตนาในการค้นหา (Search Intent) ของกลุ่มเป้าหมาย\n2. แบ่งโครงร่างเป็น 4-5 ส่วนหลักโดยใช้โครงสร้าง H2 และ H3\n3. ในแต่ละส่วน ให้ระบุประเด็นสำคัญที่จะเขียนพร้อมคีย์เวิร์ดแนะนำ\n4. เพิ่มส่วน FAQ ที่กลุ่มเป้าหมายมักสงสัย",
            constraints: "- โครงร่างต้องสอดคล้องกับแนวคิดดินมีชีวิต (Living Soil) และชีวภาพ\n- หลีกเลี่ยงการแนะนำสารเคมีสังเคราะห์ทุกชนิด\n- ภาษาเข้าใจง่าย ไม่เป็นวิชาการจนเกินไป",
            output_format: "เสนอเป็น Markdown Outline ที่พร้อมนำไปเขียนต่อในบทความจริง",
            review_checklist: "- มีความครอบคลุมคำถามที่พบบ่อยหรือไม่\n- ลำดับการเล่าเรื่องลื่นไหลเข้าใจง่ายหรือไม่\n- ไม่มีเนื้อหาสารเคมีปนเปื้อน",
            notes: "สามารถปรับปรุงโครงสร้างตามฤดูกาลและประเภทพืชได้",
            status: "active",
            version: "1.0.0",
            version_notes: "Initial version"
        },
        {
            id: "seed-claim-risk-reviewer",
            name: "Claim Risk Reviewer",
            category: "Review",
            purpose: "ตรวจสอบความเสี่ยงของการกล่าวอ้างเกินจริง (Medical Claim Overclaim) สำหรับเนื้อหาเกี่ยวกับสมุนไพรและสุขภาพ",
            role: "เป็นที่ปรึกษากฎหมายด้านคุ้มครองผู้บริโภค (อย. และ สคบ.) และผู้ตรวจสอบข้อเท็จจริงทางการแพทย์ที่มีประสบการณ์สูง",
            context: "การตรวจสอบบทความเกี่ยวกับสรรพคุณของสมุนไพรไทยก่อนทำการเผยแพร่สู่สาธารณะเพื่อความปลอดภัยทางกฎหมายและสร้างความน่าเชื่อถือ",
            input_fields: JSON.stringify([
                { name: "content_to_review", label: "เนื้อหาที่ต้องการตรวจสอบ", value: "น้ำสมุนไพรสูตรนี้ช่วยรักษาโรคเบาหวานและความดันโลหิตสูงให้หายขาดได้ใน 7 วัน เพียงแค่ต้มดื่มเช้าเย็น" }
            ]),
            instructions: "1. ค้นหาคำกล่าวอ้างเกี่ยวกับผลลัพธ์ในการรักษาโรค (เช่น รักษาหายขาด, ป้องกันได้ 100%, การระบุระยะเวลาที่เห็นผลแน่นอน)\n2. ระบุส่วนที่มีความเสี่ยงสูงต่อการละเมิดกฎหมายควบคุมโฆษณาอาหารและยาในไทย\n3. เสนอแนะคำพูดหรือประโยคที่ถูกต้องและปลอดภัย (เช่น จาก \"รักษา\" เป็น \"ช่วยบรรเทา\" หรือ \"มีส่วนช่วยปรับสมดุล\")\n4. ให้คะแนนระดับความเสี่ยง (ต่ำ / กลาง / สูง)",
            constraints: "- ให้เหตุผลทางกฎหมายและวิทยาศาสตร์กำกับทุกครั้ง\n- เสนอคำทดแทนที่เป็นรูปธรรมและนำไปใช้งานได้ทันที",
            output_format: "จัดกลุ่มข้อค้นพบเป็นตาราง: ข้อความที่มีความเสี่ยง -> ระดับความเสี่ยง -> ข้อเสนอแนะคำที่ควรใช้",
            review_checklist: "- ชี้เป้าคำว่า \"หายขาด\" หรือ \"รักษาโรค\" หรือไม่\n- ให้ประโยคใหม่ที่นำไปใช้แทนได้จริงหรือไม่",
            notes: "ครอบคลุมกฎเกณฑ์ของ อย. ประเทศไทยฉบับล่าสุด",
            status: "active",
            version: "1.0.0",
            version_notes: "Initial version"
        },
        {
            id: "seed-gf-tone-reviewer",
            name: "Green Fineness Tone Reviewer",
            category: "Review",
            purpose: "ปรับแต่งและตรวจสอบโทนเสียงของบทความสุขภาพให้มีความเป็นธรรมชาติ อบอุ่น และน่าเชื่อถือ",
            role: "เป็นบรรณาธิการอาวุโส (Tone and Voice Specialist) ของนิตยสารสุขภาพระดับพรีเมียม",
            context: "ขัดเกลาบทความที่เขียนเสร็จแล้วให้อยู่ในกรอบน้ำเสียงที่เป็นมิตร เล่าเรื่องสนุกเหมือนเพื่อนแนะนำเพื่อน แต่ยังอิงหลักการธรรมชาติบำบัดที่ถูกต้อง",
            input_fields: JSON.stringify([
                { name: "draft_text", label: "ดราฟท์บทความ", value: "ผู้ป่วยจะต้องรับประทานขิงปริมาณ 5 กรัมต่อวันเพื่อกระตุ้นการทำงานของลำไส้ใหญ่ ไม่เช่นนั้นอาจเกิดภาวะท้องผูกเรื้อรังได้" }
            ]),
            instructions: "1. ประเมินดราฟท์ปัจจุบันว่ามีความตึงเครียดหรือเป็นทางการมากเกินไปหรือไม่\n2. แปลงข้อความให้อ่านง่ายขึ้น (Readability) โดยใช้คำพูดแบบแชร์ประสบการณ์จริงและสร้างกำลังใจ\n3. ปรับระดับการมีปฏิสัมพันธ์กับผู้อ่านให้รู้สึกอบอุ่น แต่ไม่ดูไร้ความรู้ทางวิชาการ",
            constraints: "- ห้ามเปลี่ยนใจความสำคัญหรือข้อเท็จจริงดั้งเดิมของสมุนไพร\n- ห้ามใช้ภาษาแสลงที่ไม่เป็นสากล\n- เน้นโทนเสียงแบบ 'โอบรับและเข้าใจธรรมชาติ'",
            output_format: "เสนอ 3 รูปแบบการปรับปรุง: 1) วิเคราะห์สไตล์ปัจจุบัน 2) ข้อเสนอแนะการเขียนใหม่ (Rewrite) 3) สรุปคีย์เวิร์ดที่ช่วยขับเน้นโทน",
            review_checklist: "- บทความอ่านง่ายขึ้นและผ่อนคลายขึ้นหรือไม่\n- รักษาข้อเท็จจริงถูกต้องหรือไม่",
            notes: "มีประโยชน์มากเมื่อนำมาขัดเกลางานจากนักเขียนหลายๆ คนให้มีเอกภาพเดียวกัน",
            status: "active",
            version: "1.0.0",
            version_notes: "Initial version"
        }
    ];

    const stmt = db.prepare(`
        INSERT INTO prompt_templates (
            id, name, category, purpose, role, context, input_fields,
            instructions, constraints, output_format, review_checklist, notes, status, version, version_notes
        ) VALUES (
            @id, @name, @category, @purpose, @role, @context, @input_fields,
            @instructions, @constraints, @output_format, @review_checklist, @notes, @status, @version, @version_notes
        ) ON CONFLICT(id) DO NOTHING
    `);

    const tx = db.transaction(() => {
        for (const prompt of seedPrompts) {
            stmt.run(prompt);
        }
    });
    tx();

    // Idempotent column check and migration for guardrail_preset_ids
    const columns = db.prepare("PRAGMA table_info(prompt_templates)").all() as { name: string }[];
    const colNames = columns.map(c => c.name);
    if (!colNames.includes("guardrail_preset_ids")) {
        db.exec("ALTER TABLE prompt_templates ADD COLUMN guardrail_preset_ids TEXT DEFAULT '[]'");
    }
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

if (!shouldSkipSeed) {
    ensureSeedProjects();
}


