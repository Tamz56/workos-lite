// ---------------------------------------------------------------------------
// WorkOS-Lite P1-G1A — Canonical Coordination Lane storage foundation
//
// This module owns Lane identity and persistence only. Lifecycle state,
// dependencies, coordination signals, cross-Lane relations, checkpoints,
// currentness, reconciliation, Context Packs, and API behavior are outside
// this bounded slice.
// ---------------------------------------------------------------------------

import type Database from "better-sqlite3";

export const COORDINATION_LANE_SCHEMA_ERROR =
    "COORDINATION_LANE_SCHEMA_INCOMPATIBLE" as const;

export class CoordinationLaneSchemaError extends Error {
    readonly code = COORDINATION_LANE_SCHEMA_ERROR;

    constructor(detail: string) {
        super(`${COORDINATION_LANE_SCHEMA_ERROR}: ${detail}`);
        this.name = "CoordinationLaneSchemaError";
    }
}

export const COORDINATION_LANES_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS coordination_lanes (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  lane_key TEXT NOT NULL CHECK(
    length(trim(lane_key)) > 0
    AND lane_key = lower(lane_key)
    AND lane_key NOT GLOB '*[^a-z0-9-]*'
    AND lane_key NOT LIKE '-%'
    AND lane_key NOT LIKE '%-'
    AND lane_key NOT LIKE '%--%'
  ),
  name TEXT NOT NULL CHECK(length(trim(name)) > 0),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(project_id, lane_key),
  FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE RESTRICT
);`;

export const COORDINATION_LANES_PROJECT_INDEX_SQL = `
CREATE INDEX IF NOT EXISTS idx_coordination_lanes_project
ON coordination_lanes(project_id);`;

export const COORDINATION_LANES_IDENTITY_TRIGGER_SQL = `
CREATE TRIGGER IF NOT EXISTS trg_coordination_lanes_identity_immutable
BEFORE UPDATE OF id, project_id, lane_key ON coordination_lanes
FOR EACH ROW
BEGIN
  SELECT RAISE(ABORT, 'coordination Lane identity is immutable');
END;`;

export const COORDINATION_LANES_UPDATED_AT_TRIGGER_SQL = `
CREATE TRIGGER IF NOT EXISTS trg_coordination_lanes_updated_at
AFTER UPDATE ON coordination_lanes
FOR EACH ROW
WHEN NEW.updated_at = OLD.updated_at OR NEW.updated_at IS OLD.updated_at
BEGIN
  UPDATE coordination_lanes SET updated_at = datetime('now') WHERE id = NEW.id;
END;`;

export const COORDINATION_SCHEMA_SQL = `
${COORDINATION_LANES_TABLE_SQL}
${COORDINATION_LANES_PROJECT_INDEX_SQL}
${COORDINATION_LANES_IDENTITY_TRIGGER_SQL}
${COORDINATION_LANES_UPDATED_AT_TRIGGER_SQL}
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
): void {
    const actualSql = schemaObjectSql(db, type, name);
    if (!actualSql || normalizeSql(actualSql) !== normalizeSql(expectedSql)) {
        throw new CoordinationLaneSchemaError(`${type} ${name} has an unsupported shape`);
    }
}

function assertCoordinationSchema(db: Database.Database): void {
    const objects: Array<[SchemaObjectType, string, string]> = [
        ["table", "coordination_lanes", COORDINATION_LANES_TABLE_SQL],
        ["index", "idx_coordination_lanes_project", COORDINATION_LANES_PROJECT_INDEX_SQL],
        ["trigger", "trg_coordination_lanes_identity_immutable", COORDINATION_LANES_IDENTITY_TRIGGER_SQL],
        ["trigger", "trg_coordination_lanes_updated_at", COORDINATION_LANES_UPDATED_AT_TRIGGER_SQL],
    ];
    for (const [type, name, sql] of objects) {
        assertSchemaObject(db, type, name, sql);
    }
}

export function ensureCoordinationSchema(
    db: Database.Database,
    log: (message: string) => void = console.log,
): void {
    const ensure = db.transaction(() => {
        const existing = schemaObjectSql(db, "table", "coordination_lanes");
        if (existing) {
            assertCoordinationSchema(db);
        } else {
            db.exec(COORDINATION_SCHEMA_SQL);
            assertCoordinationSchema(db);
        }
    });

    ensure.immediate();
    log("Coordination Lane schema ensured");
}
