// ---------------------------------------------------------------------------
// WorkOS-Lite Planner runtime schema
// P1G-D0.7B-3C-3
// Canonical production Planner schema owner (source-backed additive DDL).
// Single source of truth for planner_days / planner_items /
// planner_import_batches. Mirrors the authoritative runtime contract.
// ---------------------------------------------------------------------------

import type Database from "better-sqlite3";

export const PLANNER_SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS planner_days (
  id TEXT PRIMARY KEY,
  plan_date TEXT NOT NULL UNIQUE,
  main_outcome TEXT NULL,
  daily_capacity_minutes INTEGER NULL,
  energy_level TEXT NULL CHECK (energy_level IN ('low', 'medium', 'high', 'recovery')),
  status TEXT NOT NULL DEFAULT 'planning' CHECK (status IN ('planning', 'active', 'completed')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
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
  id TEXT PRIMARY KEY,
  planner_day_id TEXT NOT NULL,
  source_type TEXT NOT NULL CHECK (source_type IN ('task', 'project_item')),
  source_id TEXT NOT NULL,
  work_mode TEXT NOT NULL CHECK (work_mode IN ('focus', 'production', 'ai_preparation', 'ai_execution', 'review', 'maintenance')),
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('critical', 'high', 'normal', 'low')),
  estimated_minutes INTEGER NULL,
  energy_level TEXT NULL CHECK (energy_level IN ('high', 'medium', 'low')),
  scheduled_block TEXT NULL CHECK (scheduled_block IN ('morning_focus', 'afternoon_production', 'pre_ai_preparation', 'evening_ai', 'flexible')),
  planned_order INTEGER NOT NULL DEFAULT 0,
  planner_status TEXT NOT NULL DEFAULT 'planned' CHECK (planner_status IN ('planned', 'ready', 'doing', 'waiting', 'review', 'completed', 'carried_forward', 'blocked', 'dropped')),
  is_main_task INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  start_time TEXT NULL,
  end_time TEXT NULL,
  ai_provider_key TEXT NULL,
  FOREIGN KEY (planner_day_id) REFERENCES planner_days(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_planner_items_source ON planner_items(source_type, source_id);
CREATE INDEX IF NOT EXISTS idx_planner_items_day_order ON planner_items(planner_day_id, planned_order);
CREATE UNIQUE INDEX IF NOT EXISTS idx_planner_items_no_dup ON planner_items(planner_day_id, source_type, source_id);
CREATE TRIGGER IF NOT EXISTS trg_planner_items_updated_at
AFTER UPDATE ON planner_items
FOR EACH ROW
WHEN NEW.updated_at = OLD.updated_at OR NEW.updated_at IS OLD.updated_at
BEGIN
  UPDATE planner_items SET updated_at = datetime('now') WHERE id = NEW.id;
END;

CREATE TABLE IF NOT EXISTS planner_import_batches (
  id TEXT PRIMARY KEY,
  fingerprint TEXT NOT NULL UNIQUE,
  project_id TEXT NOT NULL,
  source_text_hash TEXT NOT NULL,
  conflict_policy TEXT NOT NULL CHECK (conflict_policy IN ('append', 'skip')),
  result_json TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
`;

// Historical additive columns that may be missing from a pre-existing
// planner_items table. Added safely without rebuilding the table.
const PLANNER_ITEMS_ADDITIVE_COLUMNS: Array<{ column: string; sqlDef: string }> = [
  { column: "start_time", sqlDef: "TEXT NULL" },
  { column: "end_time", sqlDef: "TEXT NULL" },
  { column: "ai_provider_key", sqlDef: "TEXT NULL" },
];

export function ensurePlannerSchema(db: Database.Database, log: (message: string) => void = console.log): void {
  db.exec(PLANNER_SCHEMA_SQL);

  const existingColumns = (db.prepare("PRAGMA table_info(planner_items)").all() as Array<{ name: string }>).map(
    (row) => row.name,
  );
  for (const { column, sqlDef } of PLANNER_ITEMS_ADDITIVE_COLUMNS) {
    if (!existingColumns.includes(column)) {
      db.exec(`ALTER TABLE planner_items ADD COLUMN ${column} ${sqlDef}`);
    }
  }

  log("Planner schema ensured");
}

// ---------------------------------------------------------------------------
// PLANNER_ITEM 'dropped' status support (frozen Phase B contract)
//
// planner_status CHECK cannot be altered additively, so a table-recreate is
// required. This mirrors the proven WorkOS table-recreate pattern (tasks
// migration / execution schema): create planner_items_new, copy rows, drop
// the old table, rename, and recreate indexes + trigger.
//
// Activation is idempotent and is intentionally NOT triggered by
// ensurePlannerSchema(): Phase B forbids live migration. Callers run it
// deliberately — tests during Phase B, and an explicit post-backup migration
// in a later phase.
// ---------------------------------------------------------------------------

// Must stay in sync with the planner_items index/trigger DDL in PLANNER_SCHEMA_SQL.
const PLANNER_ITEMS_INDEX_AND_TRIGGER_SQL = `
CREATE INDEX IF NOT EXISTS idx_planner_items_source ON planner_items(source_type, source_id);
CREATE INDEX IF NOT EXISTS idx_planner_items_day_order ON planner_items(planner_day_id, planned_order);
CREATE UNIQUE INDEX IF NOT EXISTS idx_planner_items_no_dup ON planner_items(planner_day_id, source_type, source_id);
CREATE TRIGGER IF NOT EXISTS trg_planner_items_updated_at
AFTER UPDATE ON planner_items
FOR EACH ROW
WHEN NEW.updated_at = OLD.updated_at OR NEW.updated_at IS OLD.updated_at
BEGIN
  UPDATE planner_items SET updated_at = datetime('now') WHERE id = NEW.id;
END;
`;

const LEGACY_PLANNER_STATUS_CHECK =
  /planner_status\s+TEXT\s+NOT\s+NULL\s+DEFAULT\s+'planned'\s+CHECK\s*\(\s*planner_status\s+IN\s*\(\s*'planned'\s*,\s*'ready'\s*,\s*'doing'\s*,\s*'waiting'\s*,\s*'review'\s*,\s*'completed'\s*,\s*'carried_forward'\s*,\s*'blocked'\s*\)\s*\)/i;

const DROPPED_PLANNER_STATUS_CHECK =
  "planner_status TEXT NOT NULL DEFAULT 'planned' CHECK (planner_status IN ('planned', 'ready', 'doing', 'waiting', 'review', 'completed', 'carried_forward', 'blocked', 'dropped'))";

export function plannerItemsSupportsDroppedStatus(db: Database.Database): boolean {
  const row = db
    .prepare("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'planner_items'")
    .get() as { sql: string | null } | undefined;
  return Boolean(row?.sql && /'dropped'/.test(row.sql));
}

/**
 * Rebuild planner_items so planner_status accepts 'dropped'.
 * Idempotent: returns "unchanged" when the CHECK already supports dropped.
 * Source-level migration primitive — Phase B runs it only on isolated/test DBs.
 */
export function ensurePlannerItemsDroppedStatus(
  db: Database.Database,
  log: (message: string) => void = console.log,
): "unchanged" | "rebuilt" {
  if (plannerItemsSupportsDroppedStatus(db)) {
    return "unchanged";
  }

  const row = db
    .prepare("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'planner_items'")
    .get() as { sql: string } | undefined;
  if (!row?.sql) {
    throw new Error("planner_items table definition not found; cannot rebuild");
  }

  const baseSql = row.sql;
  if (!LEGACY_PLANNER_STATUS_CHECK.test(baseSql)) {
    throw new Error("planner_items has an unsupported planner_status CHECK shape");
  }

  const newTableSql = baseSql
    .replace("CREATE TABLE planner_items (", "CREATE TABLE planner_items_new (")
    .replace(
      "CREATE TABLE IF NOT EXISTS planner_items (",
      "CREATE TABLE IF NOT EXISTS planner_items_new (",
    )
    .replace(LEGACY_PLANNER_STATUS_CHECK, DROPPED_PLANNER_STATUS_CHECK);

  const rebuild = db.transaction(() => {
    db.exec("DROP TABLE IF EXISTS planner_items_new;");
    db.exec(newTableSql);
    db.exec("INSERT INTO planner_items_new SELECT * FROM planner_items;");
    db.exec("DROP TABLE planner_items;");
    db.exec("ALTER TABLE planner_items_new RENAME TO planner_items;");
    db.exec(PLANNER_ITEMS_INDEX_AND_TRIGGER_SQL);
  });

  rebuild.immediate();

  if (!plannerItemsSupportsDroppedStatus(db)) {
    throw new Error("planner_items rebuild did not add dropped support");
  }
  log("planner_items rebuilt to accept dropped status");
  return "rebuilt";
}
