// ---------------------------------------------------------------------------
// WorkOS-Lite CTX3 Project Context snapshot storage foundation
// Source-backed, known-schema-only DDL. This module owns storage only; it does
// not implement synthesis, validation, publication, READ1, or MCP behavior.
// ---------------------------------------------------------------------------

import type Database from "better-sqlite3";

export type ProjectContextSnapshotSchemaErrorCode =
    | "PROJECT_CONTEXT_CONFIG_SCHEMA_INCOMPATIBLE"
    | "PROJECT_CONTEXT_SNAPSHOT_SCHEMA_PARTIAL"
    | "PROJECT_CONTEXT_SNAPSHOT_SCHEMA_INCOMPATIBLE";

export class ProjectContextSnapshotSchemaError extends Error {
    constructor(readonly code: ProjectContextSnapshotSchemaErrorCode, detail: string) {
        super(`${code}: ${detail}`);
        this.name = "ProjectContextSnapshotSchemaError";
    }
}

export const PROJECT_CONTEXT_CONFIG_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS project_contexts (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL UNIQUE,
  overview TEXT,
  purpose TEXT,
  standing_instructions TEXT,
  tone_voice TEXT,
  guardrails TEXT,
  output_standards TEXT,
  decision_rules TEXT,
  source_of_truth TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE
);`;

export const PROJECT_CONTEXT_CONFIG_TRIGGER_SQL = `
CREATE TRIGGER IF NOT EXISTS trg_project_contexts_updated_at
AFTER UPDATE ON project_contexts
FOR EACH ROW
WHEN NEW.updated_at = OLD.updated_at OR NEW.updated_at IS OLD.updated_at
BEGIN
  UPDATE project_contexts SET updated_at = datetime('now') WHERE id = NEW.id;
END;`;

export const PROJECT_CONTEXT_CONFIG_SCHEMA_SQL = `
${PROJECT_CONTEXT_CONFIG_TABLE_SQL}
${PROJECT_CONTEXT_CONFIG_TRIGGER_SQL}
`;

const SNAPSHOT_CONTAINER_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS project_context_snapshots (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL UNIQUE,
  current_version_id TEXT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(id, current_version_id),
  FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE RESTRICT,
  FOREIGN KEY(id, current_version_id)
    REFERENCES project_context_snapshot_versions(snapshot_id, id)
    ON UPDATE RESTRICT ON DELETE RESTRICT
    DEFERRABLE INITIALLY DEFERRED
);`;

const SNAPSHOT_VERSION_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS project_context_snapshot_versions (
  id TEXT PRIMARY KEY,
  snapshot_id TEXT NOT NULL,
  schema_version TEXT NOT NULL CHECK(schema_version = 'project-context.v1'),
  project_slug TEXT NOT NULL CHECK(length(trim(project_slug)) > 0),
  generated_from_fingerprint TEXT NOT NULL CHECK(
    length(generated_from_fingerprint) = 64
    AND generated_from_fingerprint NOT GLOB '*[^0-9a-f]*'
  ),
  published_corpus_fingerprint TEXT NULL,
  coverage_json TEXT NOT NULL CHECK(json_valid(coverage_json)),
  synthesis_json TEXT NOT NULL CHECK(json_valid(synthesis_json)),
  rendered_markdown TEXT NOT NULL,
  generated_at TEXT NOT NULL,
  approved_at TEXT NULL,
  approved_by TEXT NULL,
  publication_state TEXT NOT NULL CHECK(publication_state IN ('PUBLISHING', 'PUBLISHED')),
  UNIQUE(snapshot_id, id),
  FOREIGN KEY(snapshot_id) REFERENCES project_context_snapshots(id) ON DELETE RESTRICT,
  FOREIGN KEY(approved_by) REFERENCES human_operators(id) ON DELETE RESTRICT,
  CHECK(
    (
      publication_state = 'PUBLISHING'
      AND published_corpus_fingerprint IS NULL
    )
    OR
    (
      publication_state = 'PUBLISHED'
      AND length(published_corpus_fingerprint) = 64
      AND published_corpus_fingerprint NOT GLOB '*[^0-9a-f]*'
      AND approved_at IS NOT NULL
      AND length(trim(approved_at)) > 0
      AND approved_by IS NOT NULL
      AND length(trim(approved_by)) > 0
    )
  )
);`;

const SNAPSHOT_VERSION_INDEX_SQL = `
CREATE INDEX IF NOT EXISTS idx_project_context_snapshot_versions_snapshot
ON project_context_snapshot_versions(snapshot_id);`;

const SNAPSHOT_CONTAINER_IDENTITY_TRIGGER_SQL = `
CREATE TRIGGER IF NOT EXISTS trg_project_context_snapshots_identity_immutable
BEFORE UPDATE OF id, project_id ON project_context_snapshots
FOR EACH ROW
BEGIN
  SELECT RAISE(ABORT, 'project context snapshot identity is immutable');
END;`;

const SNAPSHOT_CURRENT_INSERT_TRIGGER_SQL = `
CREATE TRIGGER IF NOT EXISTS trg_project_context_snapshots_current_insert
BEFORE INSERT ON project_context_snapshots
FOR EACH ROW
WHEN NEW.current_version_id IS NOT NULL
BEGIN
  SELECT CASE
    WHEN NOT EXISTS (
      SELECT 1
      FROM project_context_snapshot_versions v
      WHERE v.id = NEW.current_version_id
        AND v.snapshot_id = NEW.id
        AND v.publication_state = 'PUBLISHED'
    )
    THEN RAISE(ABORT, 'current snapshot version must be published and belong to the same container')
  END;
END;`;

const SNAPSHOT_CURRENT_UPDATE_TRIGGER_SQL = `
CREATE TRIGGER IF NOT EXISTS trg_project_context_snapshots_current_update
BEFORE UPDATE OF current_version_id ON project_context_snapshots
FOR EACH ROW
WHEN NEW.current_version_id IS NOT NULL
BEGIN
  SELECT CASE
    WHEN NOT EXISTS (
      SELECT 1
      FROM project_context_snapshot_versions v
      WHERE v.id = NEW.current_version_id
        AND v.snapshot_id = NEW.id
        AND v.publication_state = 'PUBLISHED'
    )
    THEN RAISE(ABORT, 'current snapshot version must be published and belong to the same container')
  END;
END;`;

const SNAPSHOT_VERSION_CONTENT_IMMUTABLE_TRIGGER_SQL = `
CREATE TRIGGER IF NOT EXISTS trg_project_context_snapshot_versions_content_immutable
BEFORE UPDATE OF
  id,
  snapshot_id,
  schema_version,
  project_slug,
  generated_from_fingerprint,
  coverage_json,
  synthesis_json,
  rendered_markdown,
  generated_at
ON project_context_snapshot_versions
FOR EACH ROW
BEGIN
  SELECT RAISE(ABORT, 'project context snapshot version content is immutable');
END;`;

const SNAPSHOT_VERSION_PUBLISHED_IMMUTABLE_TRIGGER_SQL = `
CREATE TRIGGER IF NOT EXISTS trg_project_context_snapshot_versions_published_immutable
BEFORE UPDATE ON project_context_snapshot_versions
FOR EACH ROW
WHEN OLD.publication_state = 'PUBLISHED'
BEGIN
  SELECT RAISE(ABORT, 'published project context snapshot version is immutable');
END;`;

const SNAPSHOT_VERSION_PUBLISHED_DELETE_TRIGGER_SQL = `
CREATE TRIGGER IF NOT EXISTS trg_project_context_snapshot_versions_published_no_delete
BEFORE DELETE ON project_context_snapshot_versions
FOR EACH ROW
WHEN OLD.publication_state = 'PUBLISHED'
BEGIN
  SELECT RAISE(ABORT, 'published project context snapshot version cannot be deleted');
END;`;

export const PROJECT_CONTEXT_SNAPSHOT_SCHEMA_SQL = `
${SNAPSHOT_CONTAINER_TABLE_SQL}
${SNAPSHOT_VERSION_TABLE_SQL}
${SNAPSHOT_VERSION_INDEX_SQL}
${SNAPSHOT_CONTAINER_IDENTITY_TRIGGER_SQL}
${SNAPSHOT_CURRENT_INSERT_TRIGGER_SQL}
${SNAPSHOT_CURRENT_UPDATE_TRIGGER_SQL}
${SNAPSHOT_VERSION_CONTENT_IMMUTABLE_TRIGGER_SQL}
${SNAPSHOT_VERSION_PUBLISHED_IMMUTABLE_TRIGGER_SQL}
${SNAPSHOT_VERSION_PUBLISHED_DELETE_TRIGGER_SQL}
`;

type SchemaObjectType = "table" | "index" | "trigger";

function normalizeSql(sql: string): string {
    return sql
        .trim()
        .replace(/\s+/g, " ")
        .replace(/CREATE (TABLE|INDEX|TRIGGER) IF NOT EXISTS/gi, "CREATE $1")
        .replace(/;$/, "")
        .toLowerCase();
}

function schemaObjectSql(
    db: Database.Database,
    type: SchemaObjectType,
    name: string,
): string | undefined {
    const row = db
        .prepare("SELECT sql FROM sqlite_master WHERE type = ? AND name = ?")
        .get(type, name) as { sql: string | null } | undefined;
    return row?.sql ?? undefined;
}

function assertSchemaObject(
    db: Database.Database,
    type: SchemaObjectType,
    name: string,
    expectedSql: string,
    code: ProjectContextSnapshotSchemaErrorCode,
): void {
    const actualSql = schemaObjectSql(db, type, name);
    if (!actualSql || normalizeSql(actualSql) !== normalizeSql(expectedSql)) {
        throw new ProjectContextSnapshotSchemaError(code, `${type} ${name} has an unsupported shape`);
    }
}

function tableExists(db: Database.Database, name: string): boolean {
    return schemaObjectSql(db, "table", name) !== undefined;
}

function assertProjectContextConfigSchema(db: Database.Database): void {
    assertSchemaObject(
        db,
        "table",
        "project_contexts",
        PROJECT_CONTEXT_CONFIG_TABLE_SQL,
        "PROJECT_CONTEXT_CONFIG_SCHEMA_INCOMPATIBLE",
    );
    assertSchemaObject(
        db,
        "trigger",
        "trg_project_contexts_updated_at",
        PROJECT_CONTEXT_CONFIG_TRIGGER_SQL,
        "PROJECT_CONTEXT_CONFIG_SCHEMA_INCOMPATIBLE",
    );
}

function assertSnapshotSchema(db: Database.Database): void {
    const objects: Array<[SchemaObjectType, string, string]> = [
        ["table", "project_context_snapshots", SNAPSHOT_CONTAINER_TABLE_SQL],
        ["table", "project_context_snapshot_versions", SNAPSHOT_VERSION_TABLE_SQL],
        ["index", "idx_project_context_snapshot_versions_snapshot", SNAPSHOT_VERSION_INDEX_SQL],
        ["trigger", "trg_project_context_snapshots_identity_immutable", SNAPSHOT_CONTAINER_IDENTITY_TRIGGER_SQL],
        ["trigger", "trg_project_context_snapshots_current_insert", SNAPSHOT_CURRENT_INSERT_TRIGGER_SQL],
        ["trigger", "trg_project_context_snapshots_current_update", SNAPSHOT_CURRENT_UPDATE_TRIGGER_SQL],
        [
            "trigger",
            "trg_project_context_snapshot_versions_content_immutable",
            SNAPSHOT_VERSION_CONTENT_IMMUTABLE_TRIGGER_SQL,
        ],
        [
            "trigger",
            "trg_project_context_snapshot_versions_published_immutable",
            SNAPSHOT_VERSION_PUBLISHED_IMMUTABLE_TRIGGER_SQL,
        ],
        [
            "trigger",
            "trg_project_context_snapshot_versions_published_no_delete",
            SNAPSHOT_VERSION_PUBLISHED_DELETE_TRIGGER_SQL,
        ],
    ];
    for (const [type, name, sql] of objects) {
        assertSchemaObject(db, type, name, sql, "PROJECT_CONTEXT_SNAPSHOT_SCHEMA_INCOMPATIBLE");
    }
}

export function ensureProjectContextSnapshotSchema(
    db: Database.Database,
    log: (message: string) => void = console.log,
): void {
    const ensure = db.transaction(() => {
        if (tableExists(db, "project_contexts")) {
            assertProjectContextConfigSchema(db);
        } else {
            db.exec(PROJECT_CONTEXT_CONFIG_SCHEMA_SQL);
            assertProjectContextConfigSchema(db);
        }

        const hasContainers = tableExists(db, "project_context_snapshots");
        const hasVersions = tableExists(db, "project_context_snapshot_versions");
        if (hasContainers !== hasVersions) {
            throw new ProjectContextSnapshotSchemaError(
                "PROJECT_CONTEXT_SNAPSHOT_SCHEMA_PARTIAL",
                "snapshot container and version tables must be provisioned together",
            );
        }
        if (hasContainers) {
            assertSnapshotSchema(db);
        } else {
            db.exec(PROJECT_CONTEXT_SNAPSHOT_SCHEMA_SQL);
            assertSnapshotSchema(db);
        }
    });

    ensure.immediate();
    log("Project Context snapshot schema ensured");
}
