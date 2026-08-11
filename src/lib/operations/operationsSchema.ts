// ---------------------------------------------------------------------------
// WorkOS-Lite Operations Gateway control-plane schema
// AUTOMATION-001-P1B.1
// Source-backed additive DDL (same pattern as auditSchema/humanAuthSchema).
// P1B: `operations` only. No approval/execution tables yet.
// ---------------------------------------------------------------------------

import type Database from "better-sqlite3";

export const OPERATIONS_SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS operations (
  id TEXT PRIMARY KEY,
  operation_type TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_ref TEXT NOT NULL,
  resolved_target_id TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  payload_hash TEXT NOT NULL,
  idempotency_key TEXT NULL,
  source TEXT NOT NULL,
  requester_actor_type TEXT NOT NULL CHECK (requester_actor_type = 'agent'),
  requester_actor_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'executing', 'succeeded', 'failed')),
  validation_result_json TEXT NOT NULL,
  preview_json TEXT NOT NULL,
  preview_fingerprint TEXT NOT NULL,
  contract_version TEXT NOT NULL,
  requested_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_operations_requester_idempotency
  ON operations(requester_actor_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;
`;

export function ensureOperationsSchema(db: Database.Database, log: (message: string) => void = console.log): void {
    db.exec(OPERATIONS_SCHEMA_SQL);
    log("Operations schema ensured");
}
