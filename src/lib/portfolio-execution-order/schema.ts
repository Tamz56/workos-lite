import type Database from "better-sqlite3";

export const PORTFOLIO_EXECUTION_ORDER_SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS portfolio_execution_order_versions (
    id TEXT PRIMARY KEY,
    scope_id TEXT NOT NULL,
    schema_version TEXT NOT NULL,
    state_payload_json TEXT NOT NULL,
    supersedes_version_id TEXT NULL,
    authority_ref TEXT NOT NULL,
    source_type TEXT NOT NULL,
    source_ref TEXT NOT NULL,
    source_hash TEXT NOT NULL,
    issued_at TEXT NOT NULL,
    issued_by TEXT NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY(supersedes_version_id)
        REFERENCES portfolio_execution_order_versions(id)
        ON DELETE RESTRICT,
    CHECK (
        supersedes_version_id IS NULL
        OR supersedes_version_id <> id
    )
);

CREATE UNIQUE INDEX IF NOT EXISTS
idx_portfolio_execution_order_versions_single_successor
ON portfolio_execution_order_versions(supersedes_version_id)
WHERE supersedes_version_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS
idx_portfolio_execution_order_versions_scope
ON portfolio_execution_order_versions(scope_id);

CREATE TRIGGER IF NOT EXISTS
trg_portfolio_execution_order_versions_predecessor_integrity
BEFORE INSERT ON portfolio_execution_order_versions
FOR EACH ROW
WHEN NEW.supersedes_version_id IS NOT NULL
BEGIN
    SELECT CASE
        WHEN NOT EXISTS (
            SELECT 1
            FROM portfolio_execution_order_versions predecessor
            WHERE predecessor.id = NEW.supersedes_version_id
              AND predecessor.scope_id = NEW.scope_id
        )
        THEN RAISE(
            ABORT,
            'portfolio execution order predecessor/scope mismatch'
        )
    END;
END;

CREATE TRIGGER IF NOT EXISTS
trg_portfolio_execution_order_versions_immutable_update
BEFORE UPDATE ON portfolio_execution_order_versions
FOR EACH ROW
BEGIN
    SELECT RAISE(
        ABORT,
        'portfolio_execution_order_versions rows are immutable'
    );
END;

CREATE TRIGGER IF NOT EXISTS
trg_portfolio_execution_order_versions_immutable_delete
BEFORE DELETE ON portfolio_execution_order_versions
FOR EACH ROW
BEGIN
    SELECT RAISE(
        ABORT,
        'portfolio_execution_order_versions rows are immutable'
    );
END;

CREATE TABLE IF NOT EXISTS portfolio_execution_order_heads (
    scope_id TEXT PRIMARY KEY,
    current_version_id TEXT NOT NULL,
    selected_at TEXT NOT NULL,
    selected_by TEXT NOT NULL,
    selection_authority_ref TEXT NOT NULL,
    FOREIGN KEY(current_version_id)
        REFERENCES portfolio_execution_order_versions(id)
        ON DELETE RESTRICT
);

CREATE TRIGGER IF NOT EXISTS
trg_portfolio_execution_order_heads_scope_binding_insert
BEFORE INSERT ON portfolio_execution_order_heads
FOR EACH ROW
BEGIN
    SELECT CASE
        WHEN NOT EXISTS (
            SELECT 1
            FROM portfolio_execution_order_versions version
            WHERE version.id = NEW.current_version_id
              AND version.scope_id = NEW.scope_id
        )
        THEN RAISE(
            ABORT,
            'portfolio execution order head/version scope mismatch'
        )
    END;
END;

CREATE TRIGGER IF NOT EXISTS
trg_portfolio_execution_order_heads_scope_binding_update
BEFORE UPDATE OF scope_id, current_version_id
ON portfolio_execution_order_heads
FOR EACH ROW
BEGIN
    SELECT CASE
        WHEN NOT EXISTS (
            SELECT 1
            FROM portfolio_execution_order_versions version
            WHERE version.id = NEW.current_version_id
              AND version.scope_id = NEW.scope_id
        )
        THEN RAISE(
            ABORT,
            'portfolio execution order head/version scope mismatch'
        )
    END;
END;
`;

export function ensurePortfolioExecutionOrderSchema(
    db: Database.Database,
): void {
    db.exec(
        PORTFOLIO_EXECUTION_ORDER_SCHEMA_SQL,
    );
}
