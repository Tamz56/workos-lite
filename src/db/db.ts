import Database from "better-sqlite3";
import fs from "fs";
import path from "path";
import crypto from "crypto";

const dbPath = path.resolve(process.cwd(), "data/workos.db");
const dbDir = path.dirname(dbPath);

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
                workspace TEXT NOT NULL DEFAULT 'avacrm',
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
    const defaultLists = [
        { workspace: 'marketing', slug: 'nanagarden-q1', title: 'NanaGarden Q1', desc: 'Q1 Tasks for NanaGarden' },
        { workspace: 'marketing', slug: 'sku-ads', title: 'SKU Ads', desc: 'SKU advertisements tracking' }
    ];

    const insertStmt = db.prepare(`
        INSERT INTO lists (id, workspace, slug, title, description, is_seed, created_at, updated_at)
        VALUES (@id, @workspace, @slug, @title, @description, 1, datetime('now'), datetime('now'))
        ON CONFLICT(workspace, slug) DO NOTHING
    `);

    const runTx = db.transaction(() => {
        for (const list of defaultLists) {
            insertStmt.run({
                id: crypto.randomUUID(),
                workspace: list.workspace,
                slug: list.slug,
                title: list.title,
                description: list.desc
            });
        }
    });

    runTx();
}

function ensureDocsAndAttachments() {
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
    const defaultProjects = [
        "avaone-q1",
        "avaone-q1-sales",
        "avaone-homeforest-q1",
        "avafarm888-fb-content-q1",
        "avaone-fb-content-q1",
        "avaone-tiktok-q1"
    ];

    const insertStmt = db.prepare(`
        INSERT INTO projects (id, slug, name, status, is_seed, created_at, updated_at)
        VALUES (@id, @slug, @name, 'planned', 1, datetime('now'), datetime('now'))
        ON CONFLICT(slug) DO NOTHING
    `);

    const runTx = db.transaction(() => {
        for (const slug of defaultProjects) {
            insertStmt.run({
                id: crypto.randomUUID(),
                slug: slug,
                // Simple formatting for demonstration (e.g., 'avaone-q1' -> 'Avaone Q1')
                name: slug.replace(/-/g, ' ').replace(/\\b\\w/g, c => c.toUpperCase())
            });
        }
    });

    runTx();
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

    db.prepare(`
        INSERT INTO gf_episodes (id, story_set_id, title, role, status, created_at, updated_at)
        VALUES ('GF-S01-E07', 'STORY-SET-01', 'ธาตุอาหาร: วัตถุดิบที่พืชใช้สร้างชีวิต', 'core_episode', 'planned', datetime('now'), datetime('now'))
        ON CONFLICT(id) DO NOTHING
    `).run();
}

ensureProjectsAndSprints();
ensureNotes();
ensureProjectDocBlocks();
ensureArborWritingLab();
if (!shouldSkipSeed) {
    ensureSeedProjects();
    seedArborWritingLab();
}

