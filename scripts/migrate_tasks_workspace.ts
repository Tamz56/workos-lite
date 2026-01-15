// scripts/migrate_tasks_workspace.ts
import Database from "better-sqlite3";
import path from "path";

const WORKSPACES = ["avacrm", "ops", "content", "personal", "admin", "finance", "travel", "other"] as const;

type Row = Record<string, unknown>;

function q(s: string) {
    return `'${s.replace(/'/g, "''")}'`;
}

function log(...args: unknown[]) {
     
    console.log(...args);
}

function getDb() {
    const dbPath = path.resolve(process.cwd(), "data/workos.db");
    const db = new Database(dbPath);
    db.pragma("journal_mode = WAL");
    return db;
}

function getCreateSql(db: Database.Database): string {
    const row = db
        .prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='tasks'")
        .get() as Row | undefined;

    const sql = row?.sql;
    if (typeof sql !== "string" || !sql.trim()) {
        throw new Error("Cannot find CREATE TABLE for 'tasks' in sqlite_master.");
    }
    return sql;
}

function hasWorkspaceCheck(sql: string) {
    return /CHECK\s*\(\s*workspace\s+IN\s*\(/i.test(sql);
}

function buildWorkspaceCheck(): string {
    const list = WORKSPACES.map(q).join(",");
    return `workspace TEXT NOT NULL DEFAULT 'avacrm' CHECK (workspace IN (${list}))`;
}

function main() {
    const db = getDb();

    const createSql = getCreateSql(db);
    log("Current tasks schema:\n", createSql);

    if (!/workspace/i.test(createSql)) {
        throw new Error("Column 'workspace' not found in tasks schema; aborting for safety.");
    }

    if (!hasWorkspaceCheck(createSql)) {
        log("No workspace CHECK constraint detected. The 500 may be from another constraint/issue.");
        log("Stop here and inspect API error logs to confirm the real cause.");
        return;
    }

    // We will recreate tasks table with a known-good schema that matches your POST handler expectations.
    // IMPORTANT: If your tasks table has extra columns beyond these, we should include them.
    // We will introspect columns and preserve any extra columns automatically.

    const cols = db.prepare("PRAGMA table_info(tasks)").all() as Array<{
        cid: number;
        name: string;
        type: string;
        notnull: number;
        dflt_value: string | null;
        pk: number;
    }>;

    const colNames = cols.map((c) => c.name);
    log("Detected columns:", colNames);

    // Required baseline columns from your POST handler:
    const required = ["id", "title", "workspace", "status", "scheduled_date", "schedule_bucket", "created_at", "updated_at", "done_at"];
    for (const r of required) {
        if (!colNames.includes(r)) {
            throw new Error(`Missing required column '${r}' in tasks table. Aborting for safety.`);
        }
    }

    // Build CREATE TABLE for new tasks table preserving extra columns.
    // For known columns, we enforce constraints; for unknown extra columns, we keep their original type/default/notnull.
    const workspaceCol = buildWorkspaceCheck();

    const knownColDefs: Record<string, string> = {
        id: "id TEXT PRIMARY KEY",
        title: "title TEXT NOT NULL",
        workspace: workspaceCol,
        status: "status TEXT NOT NULL DEFAULT 'inbox' CHECK (status IN ('inbox','planned','done'))",
        scheduled_date: "scheduled_date TEXT NULL",
        schedule_bucket: "schedule_bucket TEXT NOT NULL DEFAULT 'none' CHECK (schedule_bucket IN ('none','morning','afternoon','evening'))",
        created_at: "created_at TEXT NOT NULL",
        updated_at: "updated_at TEXT NOT NULL",
        done_at: "done_at TEXT NULL",
    };

    const extraColDefs: string[] = [];
    for (const c of cols) {
        if (knownColDefs[c.name]) continue;
        const t = c.type && c.type.trim() ? c.type : "TEXT";
        const nn = c.notnull ? " NOT NULL" : "";
        const dv = c.dflt_value != null ? ` DEFAULT ${c.dflt_value}` : "";
        const pk = c.pk ? " PRIMARY KEY" : "";
        extraColDefs.push(`${c.name} ${t}${nn}${dv}${pk}`);
    }

    const newDefs = [...Object.values(knownColDefs), ...extraColDefs].join(",\n  ");

    const tmp = "tasks_old";
    db.exec("BEGIN;");
    try {
        db.exec(`ALTER TABLE tasks RENAME TO ${tmp};`);
        db.exec(`CREATE TABLE tasks (\n  ${newDefs}\n);`);

        // Copy all columns that exist in old table into new table
        const allCols = colNames.join(", ");
        db.exec(`INSERT INTO tasks (${allCols}) SELECT ${allCols} FROM ${tmp};`);

        db.exec(`DROP TABLE ${tmp};`);

        // Recreate indexes
        db.exec(`
            CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
            CREATE INDEX IF NOT EXISTS idx_tasks_workspace ON tasks(workspace);
            CREATE INDEX IF NOT EXISTS idx_tasks_scheduled_date ON tasks(scheduled_date);
            CREATE INDEX IF NOT EXISTS idx_tasks_bucket ON tasks(schedule_bucket);
            CREATE INDEX IF NOT EXISTS idx_tasks_done_at ON tasks(done_at);
        `);

        // Recreate trigger
        db.exec(`
            CREATE TRIGGER IF NOT EXISTS trg_tasks_updated_at
            AFTER UPDATE ON tasks
            FOR EACH ROW
            BEGIN
                UPDATE tasks SET updated_at = datetime('now') WHERE id = OLD.id;
            END;
        `);

        db.exec("COMMIT;");
        log("Migration complete: workspace CHECK updated to include:", WORKSPACES);
    } catch (e) {
        db.exec("ROLLBACK;");
        throw e;
    }

    db.close();
}

main();
