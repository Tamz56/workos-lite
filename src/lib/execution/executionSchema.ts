// ---------------------------------------------------------------------------
// WorkOS-Lite execution attempt schema
// AUTOMATION-001-P1D.1 + ACC-P5-001 + ACC-P5-RTP-07
//
// G1 canonical execution semantics:
//   backlog_create   -> committed project_items target
//   ai_read_analyze  -> committed result/evidence with no domain target
//
// RTP-07 explicitly retires the legacy G1 schema allowance for committed
// project_doc_blocks rows. Project Documentation remains governed separately
// by Project Import / import_execution_attempts.
//
// Legacy migration is fail-closed:
//   - exact PRE-P5 backlog-only shape is recognized
//   - exact PRE-P5 widened shape is recognized
//   - widened state may migrate only when no committed project_doc_blocks row
//     exists and every row is safely classifiable as historical backlog.create
//   - unknown variants are never destructively rebuilt
// ---------------------------------------------------------------------------

import type Database from "better-sqlite3";

const TABLE_NAME = "operation_execution_attempts";
const LEGACY_TABLE_NAME = `${TABLE_NAME}_acc_p5_legacy`;

const LEGACY_COLUMNS = [
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
];

const CURRENT_COLUMNS = [
    "id",
    "operation_id",
    "approval_id",
    "execution_kind",
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
];

const COMMON_TABLE_MARKERS = [
    "execution_status TEXT NOT NULL CHECK (execution_status IN ('started', 'committed', 'failed_before_write', 'rolled_back'))",
    "trigger_actor_type TEXT NOT NULL CHECK (trigger_actor_type = 'human')",
    "executor_actor_type TEXT NOT NULL CHECK (executor_actor_type = 'system')",
    "executor_actor_id TEXT NOT NULL CHECK (executor_actor_id = 'system')",
    "FOREIGN KEY(operation_id) REFERENCES operations(id) ON DELETE RESTRICT",
    "FOREIGN KEY(approval_id) REFERENCES operation_approvals(id) ON DELETE RESTRICT",
    "(execution_status = 'started' AND finished_at IS NULL AND target_table IS NULL AND target_record_id IS NULL AND result_json IS NULL AND failure_code IS NULL AND safe_failure_message IS NULL)",
    "(execution_status IN ('failed_before_write', 'rolled_back') AND finished_at IS NOT NULL AND target_table IS NULL AND target_record_id IS NULL AND result_json IS NULL AND failure_code IS NOT NULL AND safe_failure_message IS NOT NULL)",
];

const PRE_P5_BACKLOG_ONLY_MARKER =
    "execution_status = 'committed' AND finished_at IS NOT NULL AND target_table = 'project_items' AND target_record_id IS NOT NULL AND result_json IS NOT NULL AND failure_code IS NULL AND safe_failure_message IS NULL";

const PRE_P5_WIDENED_MARKER =
    "execution_status = 'committed' AND finished_at IS NOT NULL AND target_table IN ('project_items', 'project_doc_blocks') AND target_record_id IS NOT NULL AND result_json IS NOT NULL AND failure_code IS NULL AND safe_failure_message IS NULL";

const P5_EXECUTION_KIND_MARKER =
    "execution_kind TEXT NOT NULL DEFAULT 'backlog_create' CHECK (execution_kind IN ('backlog_create', 'ai_read_analyze'))";

const P5_BACKLOG_COMMITTED_MARKER =
    "(execution_kind = 'backlog_create' AND target_table = 'project_items' AND target_record_id IS NOT NULL)";

const P5_AI_COMMITTED_MARKER =
    "(execution_kind = 'ai_read_analyze' AND target_table IS NULL AND target_record_id IS NULL)";

const LEGACY_ALLOWED_AUX_NAMES = new Set([
    "idx_operation_execution_attempts_committed",
    "idx_operation_execution_attempts_operation",
    "idx_operation_execution_attempts_approval",
    "idx_operation_execution_attempts_created",
    "trg_operation_execution_attempts_pair_integrity",
    "trg_operation_execution_attempts_binding_immutable",
]);

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

export class ExecutionSchemaMigrationError extends Error {
    readonly code = "EXECUTION_SCHEMA_UNKNOWN_STATE";

    constructor(detail: string) {
        super(`Execution schema migration cannot proceed safely: ${detail}`);
        this.name = "ExecutionSchemaMigrationError";
    }
}

type ExecutionSchemaState =
    | "absent"
    | "p5_current"
    | "pre_p5_backlog_only"
    | "pre_p5_widened"
    | "unknown";

function tableColumns(db: Database.Database): string[] {
    return (
        db.prepare(`PRAGMA table_info(${TABLE_NAME})`).all() as { name: string }[]
    ).map((column) => column.name);
}

function sameColumns(actual: string[], expected: string[]): boolean {
    return (
        actual.length === expected.length
        && actual.every((column, index) => column === expected[index])
    );
}

function includesAll(sql: string, markers: string[]): boolean {
    return markers.every((marker) => sql.includes(marker));
}

function detectExecutionSchemaState(db: Database.Database): ExecutionSchemaState {
    const existing = db.prepare(
        "SELECT sql FROM sqlite_master WHERE type = 'table' AND name = ?",
    ).get(TABLE_NAME) as { sql: string } | undefined;

    if (!existing) {
        return "absent";
    }

    const columns = tableColumns(db);
    const sql = existing.sql ?? "";

    if (
        sameColumns(columns, CURRENT_COLUMNS)
        && includesAll(sql, COMMON_TABLE_MARKERS)
        && sql.includes(P5_EXECUTION_KIND_MARKER)
        && sql.includes(P5_BACKLOG_COMMITTED_MARKER)
        && sql.includes(P5_AI_COMMITTED_MARKER)
    ) {
        return "p5_current";
    }

    if (
        sameColumns(columns, LEGACY_COLUMNS)
        && includesAll(sql, COMMON_TABLE_MARKERS)
    ) {
        if (sql.includes(PRE_P5_WIDENED_MARKER)) {
            return "pre_p5_widened";
        }

        if (sql.includes(PRE_P5_BACKLOG_ONLY_MARKER)) {
            return "pre_p5_backlog_only";
        }
    }

    return "unknown";
}

function scalarCount(db: Database.Database, sql: string): number {
    return (db.prepare(sql).get() as { count: number }).count;
}

function assertKnownLegacyAuxObjects(db: Database.Database): void {
    const rows = db.prepare(`
        SELECT name
        FROM sqlite_master
        WHERE tbl_name = ?
          AND type IN ('index', 'trigger')
          AND sql IS NOT NULL
        ORDER BY name
    `).all(TABLE_NAME) as { name: string }[];

    const unknownNames = rows
        .map((row) => row.name)
        .filter((name) => !LEGACY_ALLOWED_AUX_NAMES.has(name));

    if (unknownNames.length > 0) {
        throw new ExecutionSchemaMigrationError(
            `legacy ${TABLE_NAME} has unrecognized auxiliary objects: ${unknownNames.join(", ")}`,
        );
    }
}

function assertLegacyRowsSafelyClassifiable(
    db: Database.Database,
    state: "pre_p5_backlog_only" | "pre_p5_widened",
): void {
    if (state === "pre_p5_widened") {
        const committedProjectDocBlocks = scalarCount(
            db,
            `
                SELECT COUNT(*) AS count
                FROM operation_execution_attempts
                WHERE execution_status = 'committed'
                  AND target_table = 'project_doc_blocks'
            `,
        );

        if (committedProjectDocBlocks > 0) {
            throw new ExecutionSchemaMigrationError(
                "legacy widened schema contains committed project_doc_blocks attempts; refusing retirement migration",
            );
        }
    }

    const unsafeRows = scalarCount(
        db,
        `
            SELECT COUNT(*) AS count
            FROM operation_execution_attempts attempt
            LEFT JOIN operations operation
              ON operation.id = attempt.operation_id
            LEFT JOIN operation_approvals approval
              ON approval.id = attempt.approval_id
            WHERE operation.id IS NULL
               OR approval.id IS NULL
               OR approval.operation_id <> attempt.operation_id
               OR operation.operation_type <> 'backlog.create'
               OR (
                    attempt.execution_status = 'committed'
                    AND (
                        attempt.target_table IS NULL
                        OR attempt.target_table <> 'project_items'
                        OR attempt.target_record_id IS NULL
                    )
               )
               OR (
                    attempt.execution_status <> 'committed'
                    AND (
                        attempt.target_table IS NOT NULL
                        OR attempt.target_record_id IS NOT NULL
                    )
               )
        `,
    );

    if (unsafeRows > 0) {
        throw new ExecutionSchemaMigrationError(
            `${unsafeRows} legacy execution attempt row(s) cannot be classified safely as historical backlog_create`,
        );
    }
}

function migrateLegacyExecutionSchema(
    db: Database.Database,
    state: "pre_p5_backlog_only" | "pre_p5_widened",
): void {
    assertKnownLegacyAuxObjects(db);
    assertLegacyRowsSafelyClassifiable(db, state);

    const leftover = db.prepare(
        "SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?",
    ).get(LEGACY_TABLE_NAME);

    if (leftover) {
        throw new ExecutionSchemaMigrationError(
            `partial table ${LEGACY_TABLE_NAME} already exists`,
        );
    }

    const beforeCount = scalarCount(
        db,
        "SELECT COUNT(*) AS count FROM operation_execution_attempts",
    );

    db.transaction(() => {
        db.exec(`
            DROP TRIGGER IF EXISTS trg_operation_execution_attempts_pair_integrity;
            DROP TRIGGER IF EXISTS trg_operation_execution_attempts_binding_immutable;
            DROP TRIGGER IF EXISTS trg_operation_execution_attempts_kind_integrity;

            DROP INDEX IF EXISTS idx_operation_execution_attempts_committed;
            DROP INDEX IF EXISTS idx_operation_execution_attempts_operation;
            DROP INDEX IF EXISTS idx_operation_execution_attempts_approval;
            DROP INDEX IF EXISTS idx_operation_execution_attempts_created;

            ALTER TABLE operation_execution_attempts
              RENAME TO operation_execution_attempts_acc_p5_legacy;
        `);

        db.exec(EXECUTION_TABLE_SQL);

        const inserted = db.prepare(`
            INSERT INTO operation_execution_attempts (
                id,
                operation_id,
                approval_id,
                execution_kind,
                execution_status,
                trigger_actor_type,
                trigger_actor_id,
                trigger_display_name,
                executor_actor_type,
                executor_actor_id,
                started_at,
                finished_at,
                target_table,
                target_record_id,
                result_json,
                failure_code,
                safe_failure_message,
                created_at,
                updated_at
            )
            SELECT
                id,
                operation_id,
                approval_id,
                'backlog_create',
                execution_status,
                trigger_actor_type,
                trigger_actor_id,
                trigger_display_name,
                executor_actor_type,
                executor_actor_id,
                started_at,
                finished_at,
                target_table,
                target_record_id,
                result_json,
                failure_code,
                safe_failure_message,
                created_at,
                updated_at
            FROM operation_execution_attempts_acc_p5_legacy
        `).run();

        if (inserted.changes !== beforeCount) {
            throw new ExecutionSchemaMigrationError(
                `legacy row-copy mismatch: expected ${beforeCount}, copied ${inserted.changes}`,
            );
        }

        db.exec(`
            DROP TABLE operation_execution_attempts_acc_p5_legacy;
        `);

        db.exec(EXECUTION_AUX_SQL);

        const afterCount = scalarCount(
            db,
            "SELECT COUNT(*) AS count FROM operation_execution_attempts",
        );

        if (afterCount !== beforeCount) {
            throw new ExecutionSchemaMigrationError(
                `post-migration row-count mismatch: before ${beforeCount}, after ${afterCount}`,
            );
        }
    }).immediate();
}

export function ensureExecutionSchema(
    db: Database.Database,
    log: (message: string) => void = console.log,
): void {
    const state = detectExecutionSchemaState(db);

    switch (state) {
        case "absent":
            db.exec(EXECUTION_SCHEMA_SQL);
            log("Execution schema ensured");
            return;

        case "p5_current":
            db.exec(EXECUTION_AUX_SQL);
            log("Execution schema already current");
            return;

        case "pre_p5_backlog_only":
            migrateLegacyExecutionSchema(db, state);
            log("Execution schema migrated from PRE-P5 backlog-only state");
            return;

        case "pre_p5_widened":
            migrateLegacyExecutionSchema(db, state);
            log("Execution schema migrated from PRE-P5 widened state after G1 allowance retirement");
            return;

        default:
            throw new ExecutionSchemaMigrationError(
                `${TABLE_NAME} has an unrecognized schema variant; no destructive rebuild was performed`,
            );
    }
}
