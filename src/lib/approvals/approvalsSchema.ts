// ---------------------------------------------------------------------------
// WorkOS-Lite human approval lifecycle schema
// AUTOMATION-001-P1C.1
// Design B: operation_approvals (real approval issuances only) +
// operation_approval_events (append-only audit, includes terminal rejection).
// ---------------------------------------------------------------------------

import type Database from "better-sqlite3";

export const APPROVALS_SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS operation_approvals (
  id TEXT PRIMARY KEY,
  operation_id TEXT NOT NULL,
  approval_status TEXT NOT NULL CHECK (approval_status IN ('approved', 'revoked', 'expired', 'consumed')),
  approver_actor_type TEXT NOT NULL CHECK (approver_actor_type = 'human'),
  approver_actor_id TEXT NOT NULL,
  approver_display_name TEXT NOT NULL,
  approved_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  revoked_at TEXT NULL,
  revoked_by_actor_type TEXT NULL,
  revoked_by_actor_id TEXT NULL,
  revoked_by_display_name TEXT NULL,
  consumed_at TEXT NULL,
  bound_operation_type TEXT NOT NULL,
  bound_target_type TEXT NOT NULL,
  bound_target_ref TEXT NOT NULL,
  bound_resolved_target_id TEXT NOT NULL,
  bound_payload_hash TEXT NOT NULL,
  bound_contract_version TEXT NOT NULL,
  bound_preview_fingerprint TEXT NOT NULL,
  preview_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY(operation_id) REFERENCES operations(id) ON DELETE RESTRICT
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_operation_approvals_active
  ON operation_approvals(operation_id)
  WHERE approval_status = 'approved';
CREATE INDEX IF NOT EXISTS idx_operation_approvals_operation
  ON operation_approvals(operation_id);

-- Binding fields are immutable after insertion.
CREATE TRIGGER IF NOT EXISTS trg_operation_approvals_binding_immutable
BEFORE UPDATE OF
  operation_id,
  bound_operation_type,
  bound_target_type,
  bound_target_ref,
  bound_resolved_target_id,
  bound_payload_hash,
  bound_contract_version,
  bound_preview_fingerprint,
  preview_json,
  approver_actor_type,
  approver_actor_id,
  approved_at,
  expires_at
ON operation_approvals
FOR EACH ROW
BEGIN
  SELECT RAISE(ABORT, 'approval binding fields are immutable');
END;

CREATE TABLE IF NOT EXISTS operation_approval_events (
  id TEXT PRIMARY KEY,
  operation_id TEXT NOT NULL,
  approval_id TEXT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('approved', 'rejected', 'revoked', 'expired', 'consumed')),
  actor_type TEXT NOT NULL CHECK (actor_type IN ('human', 'system')),
  actor_id TEXT NOT NULL,
  actor_display_name TEXT NULL,
  occurred_at TEXT NOT NULL,
  event_code TEXT NULL,
  safe_reason TEXT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY(operation_id) REFERENCES operations(id) ON DELETE RESTRICT,
  FOREIGN KEY(approval_id) REFERENCES operation_approvals(id) ON DELETE RESTRICT
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_operation_approval_events_rejected
  ON operation_approval_events(operation_id)
  WHERE event_type = 'rejected';
CREATE INDEX IF NOT EXISTS idx_operation_approval_events_operation
  ON operation_approval_events(operation_id);
CREATE INDEX IF NOT EXISTS idx_operation_approval_events_approval
  ON operation_approval_events(approval_id);
-- P1D hardening: one consumed event maximum per approval.
CREATE UNIQUE INDEX IF NOT EXISTS idx_operation_approval_events_consumed
  ON operation_approval_events(approval_id)
  WHERE event_type = 'consumed';
-- P1D hardening: consumed events always carry the consumed approval id.
CREATE TRIGGER IF NOT EXISTS trg_operation_approval_events_consumed_approval_id
BEFORE INSERT ON operation_approval_events
FOR EACH ROW
WHEN NEW.event_type = 'consumed' AND NEW.approval_id IS NULL
BEGIN
  SELECT RAISE(ABORT, 'consumed events require an approval id');
END;
-- P1D hardening (F-02): an event's approval must belong to the same operation.
CREATE TRIGGER IF NOT EXISTS trg_operation_approval_events_pair_integrity
BEFORE INSERT ON operation_approval_events
FOR EACH ROW
WHEN NEW.approval_id IS NOT NULL
BEGIN
  SELECT CASE
    WHEN NOT EXISTS (
      SELECT 1 FROM operation_approvals a
      WHERE a.id = NEW.approval_id AND a.operation_id = NEW.operation_id
    )
    THEN RAISE(ABORT, 'approval/operation pair mismatch')
  END;
END;
`;

export function ensureApprovalsSchema(db: Database.Database, log: (message: string) => void = console.log): void {
    db.exec(APPROVALS_SCHEMA_SQL);
    log("Approvals schema ensured");
}
