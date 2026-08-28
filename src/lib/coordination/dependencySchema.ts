// ---------------------------------------------------------------------------
// WorkOS-Lite P2-G3B — Lane dependency identity + append-only history schema.
//
// Dependency endpoints are directional Coordination Lanes. Identity is stable;
// authoritative state lives only in append-only history and remains opaque.
// ---------------------------------------------------------------------------

import type Database from "better-sqlite3";

export const COORDINATION_DEPENDENCY_SCHEMA_ERROR =
    "COORDINATION_DEPENDENCY_SCHEMA_INCOMPATIBLE" as const;

export class CoordinationDependencySchemaError extends Error {
    readonly code = COORDINATION_DEPENDENCY_SCHEMA_ERROR;

    constructor(detail: string) {
        super(`${COORDINATION_DEPENDENCY_SCHEMA_ERROR}: ${detail}`);
        this.name = "CoordinationDependencySchemaError";
    }
}

export const COORDINATION_DEPENDENCIES_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS coordination_dependencies (
  id TEXT PRIMARY KEY CHECK(length(trim(id)) > 0),
  source_lane_id TEXT NOT NULL CHECK(length(trim(source_lane_id)) > 0),
  target_lane_id TEXT NOT NULL CHECK(length(trim(target_lane_id)) > 0),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY(source_lane_id) REFERENCES coordination_lanes(id) ON DELETE RESTRICT,
  FOREIGN KEY(target_lane_id) REFERENCES coordination_lanes(id) ON DELETE RESTRICT
);`;

export const COORDINATION_DEPENDENCIES_IDENTITY_TRIGGER_SQL = `
CREATE TRIGGER IF NOT EXISTS trg_coordination_dependencies_identity_immutable
BEFORE UPDATE OF id, source_lane_id, target_lane_id ON coordination_dependencies
FOR EACH ROW
BEGIN
  SELECT RAISE(ABORT, 'coordination dependency identity is immutable');
END;`;

export const COORDINATION_DEPENDENCIES_SAME_PROJECT_TRIGGER_SQL = `
CREATE TRIGGER IF NOT EXISTS trg_coordination_dependencies_same_project
BEFORE INSERT ON coordination_dependencies
FOR EACH ROW
WHEN NOT EXISTS (
  SELECT 1
  FROM coordination_lanes AS source_lane
  JOIN coordination_lanes AS target_lane
    ON target_lane.project_id = source_lane.project_id
  WHERE source_lane.id = NEW.source_lane_id
    AND target_lane.id = NEW.target_lane_id
)
BEGIN
  SELECT RAISE(ABORT, 'coordination dependency endpoints must be existing Lanes in the same Project');
END;`;

export const COORDINATION_DEPENDENCY_HISTORY_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS coordination_dependency_history (
  dependency_id TEXT NOT NULL,
  seq INTEGER NOT NULL CHECK(seq > 0),
  state TEXT NOT NULL CHECK(length(trim(state)) > 0),
  recorded_at TEXT NOT NULL DEFAULT (datetime('now')),
  provenance TEXT NOT NULL CHECK(length(trim(provenance)) > 0),
  PRIMARY KEY (dependency_id, seq),
  FOREIGN KEY(dependency_id) REFERENCES coordination_dependencies(id) ON DELETE RESTRICT
);`;

export const COORDINATION_DEPENDENCY_HISTORY_UPDATE_TRIGGER_SQL = `
CREATE TRIGGER IF NOT EXISTS trg_coordination_dependency_history_append_only_update
BEFORE UPDATE ON coordination_dependency_history
FOR EACH ROW
BEGIN
  SELECT RAISE(ABORT, 'coordination dependency history is append-only');
END;`;

export const COORDINATION_DEPENDENCY_HISTORY_DELETE_TRIGGER_SQL = `
CREATE TRIGGER IF NOT EXISTS trg_coordination_dependency_history_append_only_delete
BEFORE DELETE ON coordination_dependency_history
FOR EACH ROW
BEGIN
  SELECT RAISE(ABORT, 'coordination dependency history is append-only');
END;`;

export const COORDINATION_DEPENDENCY_SCHEMA_SQL = `
${COORDINATION_DEPENDENCIES_TABLE_SQL}
${COORDINATION_DEPENDENCIES_IDENTITY_TRIGGER_SQL}
${COORDINATION_DEPENDENCIES_SAME_PROJECT_TRIGGER_SQL}
${COORDINATION_DEPENDENCY_HISTORY_TABLE_SQL}
${COORDINATION_DEPENDENCY_HISTORY_UPDATE_TRIGGER_SQL}
${COORDINATION_DEPENDENCY_HISTORY_DELETE_TRIGGER_SQL}
`;

type SchemaObjectType = "table" | "trigger";

function normalizeSql(sql: string): string {
    return sql
        .trim()
        .replace(/\s+/g, " ")
        .replace(/CREATE (TABLE|TRIGGER) IF NOT EXISTS/gi, "CREATE $1")
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
): void {
    const actualSql = schemaObjectSql(db, type, name);
    if (!actualSql || normalizeSql(actualSql) !== normalizeSql(expectedSql)) {
        throw new CoordinationDependencySchemaError(`${type} ${name} has an unsupported shape`);
    }
}

function assertCoordinationDependencySchema(db: Database.Database): void {
    const objects: Array<[SchemaObjectType, string, string]> = [
        ["table", "coordination_dependencies", COORDINATION_DEPENDENCIES_TABLE_SQL],
        [
            "trigger",
            "trg_coordination_dependencies_identity_immutable",
            COORDINATION_DEPENDENCIES_IDENTITY_TRIGGER_SQL,
        ],
        [
            "trigger",
            "trg_coordination_dependencies_same_project",
            COORDINATION_DEPENDENCIES_SAME_PROJECT_TRIGGER_SQL,
        ],
        [
            "table",
            "coordination_dependency_history",
            COORDINATION_DEPENDENCY_HISTORY_TABLE_SQL,
        ],
        [
            "trigger",
            "trg_coordination_dependency_history_append_only_update",
            COORDINATION_DEPENDENCY_HISTORY_UPDATE_TRIGGER_SQL,
        ],
        [
            "trigger",
            "trg_coordination_dependency_history_append_only_delete",
            COORDINATION_DEPENDENCY_HISTORY_DELETE_TRIGGER_SQL,
        ],
    ];
    for (const [type, name, sql] of objects) {
        assertSchemaObject(db, type, name, sql);
    }
}

export function ensureCoordinationDependencySchema(
    db: Database.Database,
    log: (message: string) => void = console.log,
): void {
    const ensure = db.transaction(() => {
        const identityExists = schemaObjectSql(db, "table", "coordination_dependencies");
        const historyExists = schemaObjectSql(db, "table", "coordination_dependency_history");
        if (identityExists || historyExists) {
            assertCoordinationDependencySchema(db);
        } else {
            db.exec(COORDINATION_DEPENDENCY_SCHEMA_SQL);
            assertCoordinationDependencySchema(db);
        }
    });

    ensure.immediate();
    log("Coordination dependency schema ensured");
}
