import type Database from "better-sqlite3";

export const PROJECT_STATE_SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS project_state_versions (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    schema_version TEXT NOT NULL,
    state_payload_json TEXT NOT NULL,
    supersedes_state_version_id TEXT NULL,
    authority_ref TEXT NOT NULL,
    source_type TEXT NOT NULL,
    source_ref TEXT NOT NULL,
    source_hash TEXT NOT NULL,
    issued_at TEXT NOT NULL,
    issued_by TEXT NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE RESTRICT,
    FOREIGN KEY(supersedes_state_version_id) REFERENCES project_state_versions(id) ON DELETE RESTRICT,
    CHECK (supersedes_state_version_id IS NULL OR supersedes_state_version_id <> id)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_project_state_versions_single_successor
    ON project_state_versions(supersedes_state_version_id)
    WHERE supersedes_state_version_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_project_state_versions_project
    ON project_state_versions(project_id);

CREATE TRIGGER IF NOT EXISTS trg_project_state_versions_predecessor_integrity
BEFORE INSERT ON project_state_versions
FOR EACH ROW
WHEN NEW.supersedes_state_version_id IS NOT NULL
BEGIN
    SELECT CASE
        WHEN NOT EXISTS (
            SELECT 1
            FROM project_state_versions predecessor
            WHERE predecessor.id = NEW.supersedes_state_version_id
              AND predecessor.project_id = NEW.project_id
        )
        THEN RAISE(ABORT, 'project state predecessor/project mismatch')
    END;
END;

CREATE TRIGGER IF NOT EXISTS trg_project_state_versions_immutable_update
BEFORE UPDATE ON project_state_versions
FOR EACH ROW
BEGIN
    SELECT RAISE(ABORT, 'project_state_versions rows are immutable');
END;

CREATE TRIGGER IF NOT EXISTS trg_project_state_versions_immutable_delete
BEFORE DELETE ON project_state_versions
FOR EACH ROW
BEGIN
    SELECT RAISE(ABORT, 'project_state_versions rows are immutable');
END;

CREATE TABLE IF NOT EXISTS project_state_heads (
    project_id TEXT PRIMARY KEY,
    current_state_version_id TEXT NOT NULL,
    selected_at TEXT NOT NULL,
    selected_by TEXT NOT NULL,
    selection_authority_ref TEXT NOT NULL,
    FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE RESTRICT,
    FOREIGN KEY(current_state_version_id) REFERENCES project_state_versions(id) ON DELETE RESTRICT
);

CREATE TRIGGER IF NOT EXISTS trg_project_state_heads_project_binding_insert
BEFORE INSERT ON project_state_heads
FOR EACH ROW
BEGIN
    SELECT CASE
        WHEN NOT EXISTS (
            SELECT 1
            FROM project_state_versions version
            WHERE version.id = NEW.current_state_version_id
              AND version.project_id = NEW.project_id
        )
        THEN RAISE(ABORT, 'project state head/version project mismatch')
    END;
END;

CREATE TRIGGER IF NOT EXISTS trg_project_state_heads_project_binding_update
BEFORE UPDATE OF project_id, current_state_version_id ON project_state_heads
FOR EACH ROW
BEGIN
    SELECT CASE
        WHEN NOT EXISTS (
            SELECT 1
            FROM project_state_versions version
            WHERE version.id = NEW.current_state_version_id
              AND version.project_id = NEW.project_id
        )
        THEN RAISE(ABORT, 'project state head/version project mismatch')
    END;
END;
`;

export function ensureProjectStateSchema(db: Database.Database): void {
    db.exec(PROJECT_STATE_SCHEMA_SQL);
}
