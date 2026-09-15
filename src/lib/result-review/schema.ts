import type Database from "better-sqlite3";

export const RESULT_REVIEW_SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS operation_result_decisions (
  id TEXT PRIMARY KEY,
  operation_id TEXT NOT NULL,
  execution_attempt_id TEXT NOT NULL UNIQUE,
  approval_id TEXT NOT NULL,
  result_fingerprint TEXT NOT NULL,
  review_contract_version TEXT NOT NULL,
  arbor_review_json TEXT NOT NULL,
  decision TEXT NOT NULL CHECK (decision IN ('ACCEPTED', 'REJECTED', 'RETURNED')),
  decided_by_actor_type TEXT NOT NULL CHECK (decided_by_actor_type = 'human'),
  decided_by_actor_id TEXT NOT NULL,
  decided_by_display_name TEXT NOT NULL,
  reason TEXT NULL,
  return_instruction TEXT NULL,
  decided_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY(operation_id) REFERENCES operations(id) ON DELETE RESTRICT,
  FOREIGN KEY(execution_attempt_id) REFERENCES operation_execution_attempts(id) ON DELETE RESTRICT,
  FOREIGN KEY(approval_id) REFERENCES operation_approvals(id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_operation_result_decisions_operation
  ON operation_result_decisions(operation_id);

CREATE TRIGGER IF NOT EXISTS trg_operation_result_decisions_pair_integrity
BEFORE INSERT ON operation_result_decisions
FOR EACH ROW
BEGIN
  SELECT CASE
    WHEN NOT EXISTS (
      SELECT 1
      FROM operation_execution_attempts e
      WHERE e.id = NEW.execution_attempt_id
        AND e.operation_id = NEW.operation_id
        AND e.approval_id = NEW.approval_id
        AND e.execution_kind = 'ai_read_analyze'
        AND e.execution_status = 'committed'
    )
    THEN RAISE(ABORT, 'result decision execution binding mismatch')
  END;
END;

CREATE TRIGGER IF NOT EXISTS trg_operation_result_decisions_immutable
BEFORE UPDATE ON operation_result_decisions
FOR EACH ROW
BEGIN
  SELECT RAISE(ABORT, 'result decisions are immutable');
END;
`;

export function ensureResultReviewSchema(
    db: Database.Database,
    log: (message: string) => void = console.log,
): void {
    db.exec(RESULT_REVIEW_SCHEMA_SQL);
    log("Result review schema ensured");
}
