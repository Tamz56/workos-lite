// ---------------------------------------------------------------------------
// WorkOS-Lite execution attempt schema
// AUTOMATION-001-P1D.1 + ACC-P5-001
// Additive governed result storage. backlog.create retains its project_items
// target invariant; ai.read_analyze commits result/evidence with no domain row.
// ---------------------------------------------------------------------------

import type Database from "better-sqlite3";

const EXECUTION_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS operation_execution_attempts (
  id TEXT PRIMARY KEY,
  operation_id TEXT NOT NULL,
  approval_id TEXT NOT NULL,
  execution_kind TEXT NOT NULL DEFAULT 'backlog_create' CHECK (execution_kind IN ('backlog_create', 'ai_read_analyze')),
  execution_status TEXT NOT NULL CHECK (execution_status IN ('started', 'committed', 'failed_before_write', 'rolled_back')),
  trigger_actor_type TEXT NOT NULL CHECK (trigger_actor_type = 'human'),
  trigger_actor_id TEXT NOT NULL,
  trigger_display_name TEXT NULL,
  executor_actor_type TEXT NOT NULL CHECK (executor_actor_type = 'system'),
  executor_actor_id TEXT NOT NULL CHECK (executor_actor_id = 'system'),
  started_at TEXT NOT NULL,
  finished_at TEXT NULL,
  target_table TEXT NULL,
  target_record_id TEXT NULL,
  result_json TEXT NULL,
  failure_code TEXT NULL,
  safe_failure_message TEXT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY(operation_id) REFERENCES operations(id) ON DELETE RESTRICT,
  FOREIGN KEY(approval_id) REFERENCES operation_approvals(id) ON DELETE RESTRICT,
  CHECK (
    (execution_status = 'started' AND finished_at IS NULL AND target_table IS NULL AND target_record_id IS NULL AND result_json IS NULL AND failure_code IS NULL AND safe_failure_message IS NULL)
    OR
    (
      execution_status = 'committed'
      AND finished_at IS NOT NULL
      AND result_json IS NOT NULL
      AND failure_code IS NULL
      AND safe_failure_message IS NULL
      AND (
        (execution_kind = 'backlog_create' AND target_table = 'project_items' AND target_record_id IS NOT NULL)
        OR
        (execution_kind = 'ai_read_analyze' AND target_table IS NULL AND target_record_id IS NULL)
      )
    )
    OR
    (execution_status IN ('failed_before_write', 'rolled_back') AND finished_at IS NOT NULL AND target_table IS NULL AND target_record_id IS NULL AND result_json IS NULL AND failure_code IS NOT NULL AND safe_failure_message IS NOT NULL)
  )
);
`;

const EXECUTION_AUX_SQL = `
CREATE UNIQUE INDEX IF NOT EXISTS idx_operation_execution_attempts_committed
  ON operation_execution_attempts(operation_id)
  WHERE execution_status = 'committed';
CREATE INDEX IF NOT EXISTS idx_operation_execution_attempts_operation
  ON operation_execution_attempts(operation_id);
CREATE INDEX IF NOT EXISTS idx_operation_execution_attempts_approval
  ON operation_execution_attempts(approval_id);
CREATE INDEX IF NOT EXISTS idx_operation_execution_attempts_created
  ON operation_execution_attempts(created_at);

CREATE TRIGGER IF NOT EXISTS trg_operation_execution_attempts_pair_integrity
BEFORE INSERT ON operation_execution_attempts
FOR EACH ROW
BEGIN
  SELECT CASE
    WHEN NOT EXISTS (
      SELECT 1 FROM operation_approvals a
      WHERE a.id = NEW.approval_id AND a.operation_id = NEW.operation_id
    )
    THEN RAISE(ABORT, 'execution approval/operation pair mismatch')
  END;
END;

CREATE TRIGGER IF NOT EXISTS trg_operation_execution_attempts_kind_integrity
BEFORE INSERT ON operation_execution_attempts
FOR EACH ROW
BEGIN
  SELECT CASE
    WHEN NOT EXISTS (
      SELECT 1 FROM operations o
      WHERE o.id = NEW.operation_id
        AND (
          (NEW.execution_kind = 'backlog_create' AND o.operation_type = 'backlog.create')
          OR
          (NEW.execution_kind = 'ai_read_analyze' AND o.operation_type = 'ai.read_analyze')
        )
    )
    THEN RAISE(ABORT, 'execution kind/operation type mismatch')
  END;
END;

CREATE TRIGGER IF NOT EXISTS trg_operation_execution_attempts_binding_immutable
BEFORE UPDATE OF
  operation_id,
  approval_id,
  execution_kind,
  trigger_actor_type,
  trigger_actor_id,
  trigger_display_name,
  executor_actor_type,
  executor_actor_id,
  started_at,
  created_at
ON operation_execution_attempts
FOR EACH ROW
BEGIN
  SELECT RAISE(ABORT, 'execution attempt binding fields are immutable');
END;
`;

export const EXECUTION_SCHEMA_SQL = EXECUTION_TABLE_SQL + EXECUTION_AUX_SQL;

function tableExists(db: Database.Database): boolean {
    return Boolean(
        db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='operation_execution_attempts'").get(),
    );
}

function hasExecutionKind(db: Database.Database): boolean {
    const columns = db.prepare("PRAGMA table_info(operation_execution_attempts)").all() as { name: string }[];
    return columns.some((column) => column.name === "execution_kind");
}

function migrateLegacyExecutionSchema(db: Database.Database): void {
    db.transaction(() => {
        db.exec(`
            DROP TRIGGER IF EXISTS trg_operation_execution_attempts_pair_integrity;
            DROP TRIGGER IF EXISTS trg_operation_execution_attempts_binding_immutable;
            DROP TRIGGER IF EXISTS trg_operation_execution_attempts_kind_integrity;
            DROP INDEX IF EXISTS idx_operation_execution_attempts_committed;
            DROP INDEX IF EXISTS idx_operation_execution_attempts_operation;
            DROP INDEX IF EXISTS idx_operation_execution_attempts_approval;
            DROP INDEX IF EXISTS idx_operation_execution_attempts_created;
            DROP TABLE IF EXISTS operation_execution_attempts_acc_p5_legacy;
            ALTER TABLE operation_execution_attempts RENAME TO operation_execution_attempts_acc_p5_legacy;
        `);

        db.exec(EXECUTION_TABLE_SQL);
        db.exec(`
            INSERT INTO operation_execution_attempts (
                id, operation_id, approval_id, execution_kind, execution_status,
                trigger_actor_type, trigger_actor_id, trigger_display_name,
                executor_actor_type, executor_actor_id,
                started_at, finished_at, target_table, target_record_id, result_json,
                failure_code, safe_failure_message, created_at, updated_at
            )
            SELECT
                id, operation_id, approval_id, 'backlog_create', execution_status,
                trigger_actor_type, trigger_actor_id, trigger_display_name,
                executor_actor_type, executor_actor_id,
                started_at, finished_at, target_table, target_record_id, result_json,
                failure_code, safe_failure_message, created_at, updated_at
            FROM operation_execution_attempts_acc_p5_legacy;
            DROP TABLE operation_execution_attempts_acc_p5_legacy;
        `);
        db.exec(EXECUTION_AUX_SQL);
    }).immediate();
}

export function ensureExecutionSchema(db: Database.Database, log: (message: string) => void = console.log): void {
    if (!tableExists(db)) {
        db.exec(EXECUTION_SCHEMA_SQL);
        log("Execution schema ensured");
        return;
    }

    if (!hasExecutionKind(db)) {
        migrateLegacyExecutionSchema(db);
        log("Execution schema migrated for ACC-P5-001");
        return;
    }

    db.exec(EXECUTION_AUX_SQL);
    log("Execution schema ensured");
}
