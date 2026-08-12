// ---------------------------------------------------------------------------
// WorkOS-Lite Operations execution attempt schema
// AUTOMATION-001-P1D.1
// Additive source-backed DDL. Attempts are append-only audit rows; the
// in-transaction `started` row is ephemeral (rolls back with the business
// transaction). Committed uniqueness is DB-enforced.
// ---------------------------------------------------------------------------

import type Database from "better-sqlite3";

export const EXECUTION_SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS operation_execution_attempts (
  id TEXT PRIMARY KEY,
  operation_id TEXT NOT NULL,
  approval_id TEXT NOT NULL,
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
    (execution_status = 'committed' AND finished_at IS NOT NULL AND target_table = 'project_items' AND target_record_id IS NOT NULL AND result_json IS NOT NULL AND failure_code IS NULL AND safe_failure_message IS NULL)
    OR
    (execution_status IN ('failed_before_write', 'rolled_back') AND finished_at IS NOT NULL AND target_table IS NULL AND target_record_id IS NULL AND result_json IS NULL AND failure_code IS NOT NULL AND safe_failure_message IS NOT NULL)
  )
);
-- At most one committed business execution per operation (hard invariant).
CREATE UNIQUE INDEX IF NOT EXISTS idx_operation_execution_attempts_committed
  ON operation_execution_attempts(operation_id)
  WHERE execution_status = 'committed';
CREATE INDEX IF NOT EXISTS idx_operation_execution_attempts_operation
  ON operation_execution_attempts(operation_id);
CREATE INDEX IF NOT EXISTS idx_operation_execution_attempts_approval
  ON operation_execution_attempts(approval_id);
CREATE INDEX IF NOT EXISTS idx_operation_execution_attempts_created
  ON operation_execution_attempts(created_at);
-- Separate FKs do not prove approval.operation_id == attempt.operation_id.
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
-- Audit identity fields are immutable after insertion.
CREATE TRIGGER IF NOT EXISTS trg_operation_execution_attempts_binding_immutable
BEFORE UPDATE OF
  operation_id,
  approval_id,
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

export function ensureExecutionSchema(db: Database.Database, log: (message: string) => void = console.log): void {
    db.exec(EXECUTION_SCHEMA_SQL);
    log("Execution schema ensured");
}
