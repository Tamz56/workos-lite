// ---------------------------------------------------------------------------
// WorkOS-Lite P2-G4B — Coordination condition identity + append-only lifecycle
// history schema.
//
// A condition is a durable, first-class coordination signal on a Lane, of a
// bounded kind (blocker | waiting | attention). Identity is stable and
// immutable; the authoritative lifecycle state lives only in append-only
// history and remains opaque to other surfaces.
//
// Frozen P2-G4B-R2 contract:
//  - identity fields id / lane_id / signal_kind / dependency_id / reason are
//    immutable,
//  - when dependency_id is non-null the condition Lane MUST be the source Lane
//    of the referenced Directional Dependency (endpoint rule; same Project
//    follows from the Dependency's own F1 invariant),
//  - lifecycle state vocabulary is bounded to active | cleared,
//  - reason is the opaque semantic content (never overloaded into provenance).
// ---------------------------------------------------------------------------

import type Database from "better-sqlite3";

export const COORDINATION_CONDITION_SCHEMA_ERROR =
    "COORDINATION_CONDITION_SCHEMA_INCOMPATIBLE" as const;

export class CoordinationConditionSchemaError extends Error {
    readonly code = COORDINATION_CONDITION_SCHEMA_ERROR;

    constructor(detail: string) {
        super(`${COORDINATION_CONDITION_SCHEMA_ERROR}: ${detail}`);
        this.name = "CoordinationConditionSchemaError";
    }
}

export const COORDINATION_CONDITION_SIGNAL_KINDS = [
    "blocker",
    "waiting",
    "attention",
] as const;

export const COORDINATION_CONDITION_STATES = ["active", "cleared"] as const;

export const COORDINATION_CONDITIONS_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS coordination_conditions (
  id TEXT PRIMARY KEY CHECK(length(trim(id)) > 0),
  lane_id TEXT NOT NULL CHECK(length(trim(lane_id)) > 0),
  signal_kind TEXT NOT NULL CHECK(
    length(trim(signal_kind)) > 0
    AND signal_kind IN ('blocker','waiting','attention')
  ),
  dependency_id TEXT NULL,
  reason TEXT NOT NULL CHECK(length(trim(reason)) > 0),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY(lane_id) REFERENCES coordination_lanes(id) ON DELETE RESTRICT,
  FOREIGN KEY(dependency_id) REFERENCES coordination_dependencies(id) ON DELETE RESTRICT
);`;

export const COORDINATION_CONDITIONS_IDENTITY_TRIGGER_SQL = `
CREATE TRIGGER IF NOT EXISTS trg_coordination_conditions_identity_immutable
BEFORE UPDATE OF id, lane_id, signal_kind, dependency_id, reason ON coordination_conditions
FOR EACH ROW
BEGIN
  SELECT RAISE(ABORT, 'coordination condition identity is immutable');
END;`;

export const COORDINATION_CONDITIONS_DEPENDENCY_ENDPOINT_TRIGGER_SQL = `
CREATE TRIGGER IF NOT EXISTS trg_coordination_conditions_dependency_endpoint
BEFORE INSERT ON coordination_conditions
FOR EACH ROW
WHEN NEW.dependency_id IS NOT NULL AND NOT EXISTS (
  SELECT 1
  FROM coordination_dependencies
  WHERE id = NEW.dependency_id
    AND source_lane_id = NEW.lane_id
)
BEGIN
  SELECT RAISE(ABORT, 'coordination condition Lane must be the source Lane of the referenced Dependency');
END;`;

export const COORDINATION_CONDITION_HISTORY_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS coordination_condition_history (
  condition_id TEXT NOT NULL,
  seq INTEGER NOT NULL CHECK(seq > 0),
  state TEXT NOT NULL CHECK(length(trim(state)) > 0 AND state IN ('active','cleared')),
  recorded_at TEXT NOT NULL DEFAULT (datetime('now')),
  provenance TEXT NOT NULL CHECK(length(trim(provenance)) > 0),
  PRIMARY KEY (condition_id, seq),
  FOREIGN KEY(condition_id) REFERENCES coordination_conditions(id) ON DELETE RESTRICT
);`;

export const COORDINATION_CONDITION_HISTORY_UPDATE_TRIGGER_SQL = `
CREATE TRIGGER IF NOT EXISTS trg_coordination_condition_history_append_only_update
BEFORE UPDATE ON coordination_condition_history
FOR EACH ROW
BEGIN
  SELECT RAISE(ABORT, 'coordination condition history is append-only');
END;`;

export const COORDINATION_CONDITION_HISTORY_DELETE_TRIGGER_SQL = `
CREATE TRIGGER IF NOT EXISTS trg_coordination_condition_history_append_only_delete
BEFORE DELETE ON coordination_condition_history
FOR EACH ROW
BEGIN
  SELECT RAISE(ABORT, 'coordination condition history is append-only');
END;`;

export const COORDINATION_CONDITION_SCHEMA_SQL = `
${COORDINATION_CONDITIONS_TABLE_SQL}
${COORDINATION_CONDITIONS_IDENTITY_TRIGGER_SQL}
${COORDINATION_CONDITIONS_DEPENDENCY_ENDPOINT_TRIGGER_SQL}
${COORDINATION_CONDITION_HISTORY_TABLE_SQL}
${COORDINATION_CONDITION_HISTORY_UPDATE_TRIGGER_SQL}
${COORDINATION_CONDITION_HISTORY_DELETE_TRIGGER_SQL}
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
        throw new CoordinationConditionSchemaError(
            `${type} ${name} has an unsupported shape`,
        );
    }
}

function assertCoordinationConditionSchema(db: Database.Database): void {
    const objects: Array<[SchemaObjectType, string, string]> = [
        ["table", "coordination_conditions", COORDINATION_CONDITIONS_TABLE_SQL],
        [
            "trigger",
            "trg_coordination_conditions_identity_immutable",
            COORDINATION_CONDITIONS_IDENTITY_TRIGGER_SQL,
        ],
        [
            "trigger",
            "trg_coordination_conditions_dependency_endpoint",
            COORDINATION_CONDITIONS_DEPENDENCY_ENDPOINT_TRIGGER_SQL,
        ],
        [
            "table",
            "coordination_condition_history",
            COORDINATION_CONDITION_HISTORY_TABLE_SQL,
        ],
        [
            "trigger",
            "trg_coordination_condition_history_append_only_update",
            COORDINATION_CONDITION_HISTORY_UPDATE_TRIGGER_SQL,
        ],
        [
            "trigger",
            "trg_coordination_condition_history_append_only_delete",
            COORDINATION_CONDITION_HISTORY_DELETE_TRIGGER_SQL,
        ],
    ];
    for (const [type, name, sql] of objects) {
        assertSchemaObject(db, type, name, sql);
    }
}

export function ensureCoordinationConditionSchema(
    db: Database.Database,
    log: (message: string) => void = console.log,
): void {
    const ensure = db.transaction(() => {
        const identityExists = schemaObjectSql(db, "table", "coordination_conditions");
        const historyExists = schemaObjectSql(db, "table", "coordination_condition_history");
        if (identityExists || historyExists) {
            assertCoordinationConditionSchema(db);
        } else {
            db.exec(COORDINATION_CONDITION_SCHEMA_SQL);
            assertCoordinationConditionSchema(db);
        }
    });

    ensure.immediate();
    log("Coordination condition schema ensured");
}
