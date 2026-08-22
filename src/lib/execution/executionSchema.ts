// ---------------------------------------------------------------------------
// WorkOS-Lite Operations execution attempt schema
// AUTOMATION-001-P1D.1
// Additive source-backed DDL. Attempts are append-only audit rows; the
// in-transaction `started` row is ephemeral (rolls back with the business
// transaction). Committed uniqueness is DB-enforced.
//
// P1G-D0.7B-3C-9D1 (schema compatibility):
//   Committed attempts now support both `project_items` and
//   `project_doc_blocks`. Fresh databases get the widened CHECK directly.
//   Existing databases that still carry the old committed CHECK
//   (`target_table = 'project_items'`) are rebuilt idempotently at ensure
//   time using the repository's proven rename/create/copy/drop pattern.
//   Unrecognized schema variants fail closed with no destructive rebuild.
// ---------------------------------------------------------------------------

import type Database from "better-sqlite3";

const TABLE_NAME = "operation_execution_attempts";
const NEW_TABLE_NAME = `${TABLE_NAME}_new`;

// Exact committed-branch markers used for sqlite_master inspection.
const OLD_COMMITTED_TARGET = "target_table = 'project_items'";
const NEW_COMMITTED_TARGET = "target_table IN ('project_items', 'project_doc_blocks')";

const EXECUTION_ATTEMPT_COLUMNS = `
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
    (execution_status = 'committed' AND finished_at IS NOT NULL AND target_table IN ('project_items', 'project_doc_blocks') AND target_record_id IS NOT NULL AND result_json IS NOT NULL AND failure_code IS NULL AND safe_failure_message IS NULL)
    OR
    (execution_status IN ('failed_before_write', 'rolled_back') AND finished_at IS NOT NULL AND target_table IS NULL AND target_record_id IS NULL AND result_json IS NULL AND failure_code IS NOT NULL AND safe_failure_message IS NOT NULL)
  )
`;

function attemptsTableSql(tableName: string, ifNotExists: boolean): string {
    return `CREATE TABLE ${ifNotExists ? "IF NOT EXISTS " : ""}${tableName} (${EXECUTION_ATTEMPT_COLUMNS}\n)`;
}

export const EXECUTION_ATTEMPTS_TABLE_SQL = attemptsTableSql(TABLE_NAME, true);

export const EXECUTION_ATTEMPTS_INDEXES_TRIGGERS_SQL = `
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

export const EXECUTION_SCHEMA_SQL = `${EXECUTION_ATTEMPTS_TABLE_SQL};\n${EXECUTION_ATTEMPTS_INDEXES_TRIGGERS_SQL}`;

const EXECUTION_ATTEMPT_COPY_COLUMNS = [
    "id",
    "operation_id",
    "approval_id",
    "execution_status",
    "trigger_actor_type",
    "trigger_actor_id",
    "trigger_display_name",
    "executor_actor_type",
    "executor_actor_id",
    "started_at",
    "finished_at",
    "target_table",
    "target_record_id",
    "result_json",
    "failure_code",
    "safe_failure_message",
    "created_at",
    "updated_at",
].join(", ");

export class ExecutionSchemaMigrationError extends Error {
    readonly code = "EXECUTION_SCHEMA_UNKNOWN_STATE";

    constructor(detail: string) {
        super(`Execution schema migration cannot proceed safely: ${detail}`);
        this.name = "ExecutionSchemaMigrationError";
    }
}

export type ExecutionAttemptsSchemaState = "absent" | "current" | "old" | "unknown";

export function detectExecutionAttemptsSchemaState(tableSql: string | undefined): ExecutionAttemptsSchemaState {
    if (tableSql === undefined) return "absent";
    if (tableSql.includes(NEW_COMMITTED_TARGET)) return "current";
    if (tableSql.includes(OLD_COMMITTED_TARGET)) return "old";
    return "unknown";
}

function migrateExecutionAttemptsSchema(db: Database.Database): void {
    const leftover = db.prepare(
        "SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?",
    ).get(NEW_TABLE_NAME);
    if (leftover) {
        throw new ExecutionSchemaMigrationError(
            `partial table ${NEW_TABLE_NAME} already exists; refusing to rebuild ${TABLE_NAME}`,
        );
    }

    const rebuild = db.transaction(() => {
        db.exec(attemptsTableSql(NEW_TABLE_NAME, false));
        db.prepare(`
            INSERT INTO ${NEW_TABLE_NAME} (${EXECUTION_ATTEMPT_COPY_COLUMNS})
            SELECT ${EXECUTION_ATTEMPT_COPY_COLUMNS}
            FROM ${TABLE_NAME}
        `).run();
        db.exec(`DROP TABLE ${TABLE_NAME}`);
        db.exec(`ALTER TABLE ${NEW_TABLE_NAME} RENAME TO ${TABLE_NAME}`);
        // The old table's indexes/triggers are dropped with it; recreate them
        // inside the same transaction so the upgrade is atomic.
        db.exec(EXECUTION_ATTEMPTS_INDEXES_TRIGGERS_SQL);
    });
    rebuild.immediate();
}

export function ensureExecutionSchema(db: Database.Database, log: (message: string) => void = console.log): void {
    const existing = db.prepare(
        "SELECT sql FROM sqlite_master WHERE type = 'table' AND name = ?",
    ).get(TABLE_NAME) as { sql: string } | undefined;

    const state = detectExecutionAttemptsSchemaState(existing?.sql);
    switch (state) {
        case "absent":
            db.exec(EXECUTION_SCHEMA_SQL);
            log("Execution schema ensured");
            return;
        case "current":
            // No rebuild; only re-ensure idempotent indexes/triggers.
            db.exec(EXECUTION_ATTEMPTS_INDEXES_TRIGGERS_SQL);
            log("Execution schema already current");
            return;
        case "old":
            migrateExecutionAttemptsSchema(db);
            log("Execution schema migrated: committed target_table widened to project_items/project_doc_blocks");
            return;
        default:
            throw new ExecutionSchemaMigrationError(
                `${TABLE_NAME} has an unrecognized schema variant; no destructive rebuild was performed`,
            );
    }
}
