// ---------------------------------------------------------------------------
// WorkOS-Lite Human Operator Identity & Session schema
// AUTOMATION-001-H2A
// Source-backed additive DDL (same pattern as project-import auditSchema.ts):
// exported SQL + idempotent ensure function wired through db.ts.
// ---------------------------------------------------------------------------

import type Database from "better-sqlite3";

export const HUMAN_AUTH_SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS human_operators (
  id TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  credential_hash TEXT NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 1 CHECK (enabled IN (0, 1)),
  bootstrapped_at TEXT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_human_operators_display_name ON human_operators(display_name);
-- Single trusted human operator: the table itself can never contain more than
-- one row, regardless of display name, concurrent CLI processes, or future
-- accidental INSERTs. (Unique index on the constant expression (1).)
CREATE UNIQUE INDEX IF NOT EXISTS idx_human_operators_singleton ON human_operators((1));
CREATE TRIGGER IF NOT EXISTS trg_human_operators_updated_at
AFTER UPDATE ON human_operators
FOR EACH ROW
WHEN NEW.updated_at = OLD.updated_at OR NEW.updated_at IS OLD.updated_at
BEGIN
  UPDATE human_operators SET updated_at = datetime('now') WHERE id = NEW.id;
END;

CREATE TABLE IF NOT EXISTS human_sessions (
  id TEXT PRIMARY KEY,
  operator_id TEXT NOT NULL,
  token_hash TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at TEXT NOT NULL,
  revoked_at TEXT NULL,
  FOREIGN KEY(operator_id) REFERENCES human_operators(id) ON DELETE RESTRICT
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_human_sessions_token_hash ON human_sessions(token_hash);
CREATE INDEX IF NOT EXISTS idx_human_sessions_operator ON human_sessions(operator_id);
`;

export function ensureHumanAuthSchema(db: Database.Database, log: (message: string) => void = console.log): void {
    db.exec(HUMAN_AUTH_SCHEMA_SQL);
    log("Human auth schema ensured");
}
