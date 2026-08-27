// ---------------------------------------------------------------------------
// WorkOS-Lite P1-G2A — Lane current-state lifecycle foundation (storage only)
//
// Durable, append-only Lane state history is the authoritative record.
// Current Lane state is deterministically DERIVED from history (highest seq);
// it is never materialized on `coordination_lanes`, so there is no independent
// competing authority and no silent state promotion is possible.
//
// The approved Lane lifecycle state vocabulary and transition rules are
// UNKNOWN / NOT_PROVEN in this runtime (frozen authority is not available
// here). They are NOT invented in this slice: the `state` column is
// intentionally vocabulary-agnostic opaque non-empty text, and no transition
// table or status vocabulary is introduced.
//
// Explicitly OUT OF SCOPE (not implemented here):
//   G3 durable dependencies, G4 blocker/waiting/attention semantics,
//   G5 cross-Lane source item + target relation, G6 checkpoint/resume,
//   G7 reusable broader currentness resolver, G8 correction/supersession/
//   reconciliation, G9 Coordination Context Pack, APIs, Operations Gateway,
//   Project Memory, READ1/MCP, live DB migration.
// ---------------------------------------------------------------------------

import type Database from "better-sqlite3";

export const COORDINATION_LANE_STATE_SCHEMA_ERROR =
    "COORDINATION_LANE_STATE_SCHEMA_INCOMPATIBLE" as const;

export class CoordinationLaneStateSchemaError extends Error {
    readonly code = COORDINATION_LANE_STATE_SCHEMA_ERROR;

    constructor(detail: string) {
        super(`${COORDINATION_LANE_STATE_SCHEMA_ERROR}: ${detail}`);
        this.name = "CoordinationLaneStateSchemaError";
    }
}

// Approved Lane lifecycle vocabulary/transitions are not available in this
// runtime; they are marked UNKNOWN/NOT_PROVEN and are never invented here.
export const LANE_LIFECYCLE_SEMANTICS_STATUS = "UNKNOWN/NOT_PROVEN" as const;

export const COORDINATION_LANE_STATE_HISTORY_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS coordination_lane_state_history (
  lane_id TEXT NOT NULL,
  seq INTEGER NOT NULL CHECK(seq > 0),
  state TEXT NOT NULL CHECK(length(trim(state)) > 0),
  recorded_at TEXT NOT NULL DEFAULT (datetime('now')),
  provenance TEXT NOT NULL CHECK(length(trim(provenance)) > 0),
  PRIMARY KEY (lane_id, seq),
  FOREIGN KEY(lane_id) REFERENCES coordination_lanes(id) ON DELETE RESTRICT
);`;

export const COORDINATION_LANE_STATE_APPEND_ONLY_UPDATE_TRIGGER_SQL = `
CREATE TRIGGER IF NOT EXISTS trg_coordination_lane_state_history_append_only_update
BEFORE UPDATE ON coordination_lane_state_history
FOR EACH ROW
BEGIN
  SELECT RAISE(ABORT, 'coordination Lane state history is append-only');
END;`;

export const COORDINATION_LANE_STATE_APPEND_ONLY_DELETE_TRIGGER_SQL = `
CREATE TRIGGER IF NOT EXISTS trg_coordination_lane_state_history_append_only_delete
BEFORE DELETE ON coordination_lane_state_history
FOR EACH ROW
BEGIN
  SELECT RAISE(ABORT, 'coordination Lane state history is append-only');
END;`;

export const COORDINATION_LANE_STATE_SCHEMA_SQL = `
${COORDINATION_LANE_STATE_HISTORY_TABLE_SQL}
${COORDINATION_LANE_STATE_APPEND_ONLY_UPDATE_TRIGGER_SQL}
${COORDINATION_LANE_STATE_APPEND_ONLY_DELETE_TRIGGER_SQL}
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
        throw new CoordinationLaneStateSchemaError(
            `${type} ${name} has an unsupported shape`,
        );
    }
}

function assertCoordinationLaneStateSchema(db: Database.Database): void {
    const objects: Array<[SchemaObjectType, string, string]> = [
        ["table", "coordination_lane_state_history", COORDINATION_LANE_STATE_HISTORY_TABLE_SQL],
        ["trigger", "trg_coordination_lane_state_history_append_only_update", COORDINATION_LANE_STATE_APPEND_ONLY_UPDATE_TRIGGER_SQL],
        ["trigger", "trg_coordination_lane_state_history_append_only_delete", COORDINATION_LANE_STATE_APPEND_ONLY_DELETE_TRIGGER_SQL],
    ];
    for (const [type, name, sql] of objects) {
        assertSchemaObject(db, type, name, sql);
    }
}

export function ensureCoordinationLaneStateSchema(
    db: Database.Database,
    log: (message: string) => void = console.log,
): void {
    const ensure = db.transaction(() => {
        const existing = schemaObjectSql(db, "table", "coordination_lane_state_history");
        if (existing) {
            assertCoordinationLaneStateSchema(db);
        } else {
            db.exec(COORDINATION_LANE_STATE_SCHEMA_SQL);
            assertCoordinationLaneStateSchema(db);
        }
    });

    ensure.immediate();
    log("Coordination Lane state history schema ensured");
}
