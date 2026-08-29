// ---------------------------------------------------------------------------
// WorkOS-Lite P2-G6B-I1 — Coordination Lane checkpoint storage foundation.
//
// `coordination_lane_checkpoints` is the sole canonical checkpoint lineage.
// The two child tables are immutable checkpoint-owned OPEN_ITEMS evidence;
// neither child table is an independent currentness authority.
// ---------------------------------------------------------------------------

import type Database from "better-sqlite3";

export const COORDINATION_CHECKPOINT_SCHEMA_ERROR =
    "COORDINATION_CHECKPOINT_SCHEMA_INCOMPATIBLE" as const;

export class CoordinationCheckpointSchemaError extends Error {
    readonly code = COORDINATION_CHECKPOINT_SCHEMA_ERROR;

    constructor(detail: string) {
        super(`${COORDINATION_CHECKPOINT_SCHEMA_ERROR}: ${detail}`);
        this.name = "CoordinationCheckpointSchemaError";
    }
}

export const COORDINATION_LANE_CHECKPOINTS_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS coordination_lane_checkpoints (
  id TEXT PRIMARY KEY CHECK(length(trim(id)) > 0),
  lane_id TEXT NOT NULL CHECK(length(trim(lane_id)) > 0),
  seq INTEGER NOT NULL CHECK(seq > 0),
  supersedes_checkpoint_id TEXT NULL,
  continuity_schema_version TEXT NOT NULL CHECK(length(trim(continuity_schema_version)) > 0),
  continuity_payload_json TEXT NOT NULL CHECK(length(trim(continuity_payload_json)) > 0),
  provenance TEXT NOT NULL CHECK(length(trim(provenance)) > 0),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(lane_id, seq),
  UNIQUE(supersedes_checkpoint_id),
  UNIQUE(lane_id, id),
  CHECK(
    (seq = 1 AND supersedes_checkpoint_id IS NULL)
    OR (seq > 1 AND supersedes_checkpoint_id IS NOT NULL)
  ),
  FOREIGN KEY(lane_id) REFERENCES coordination_lanes(id) ON DELETE RESTRICT,
  FOREIGN KEY(lane_id, supersedes_checkpoint_id)
    REFERENCES coordination_lane_checkpoints(lane_id, id) ON DELETE RESTRICT
);`;

export const COORDINATION_LANE_CHECKPOINTS_LANE_INDEX_SQL = `
CREATE INDEX IF NOT EXISTS idx_coordination_lane_checkpoints_lane_seq
ON coordination_lane_checkpoints(lane_id, seq);`;

export const COORDINATION_LANE_CHECKPOINTS_PREDECESSOR_TRIGGER_SQL = `
CREATE TRIGGER IF NOT EXISTS trg_coordination_lane_checkpoints_immediate_predecessor
BEFORE INSERT ON coordination_lane_checkpoints
FOR EACH ROW
WHEN NEW.seq > 1 AND NOT EXISTS (
  SELECT 1
  FROM coordination_lane_checkpoints AS predecessor
  WHERE predecessor.id = NEW.supersedes_checkpoint_id
    AND predecessor.lane_id = NEW.lane_id
    AND predecessor.seq = NEW.seq - 1
)
BEGIN
  SELECT RAISE(ABORT, 'coordination checkpoint predecessor must be the immediate prior Lane checkpoint');
END;`;

export const COORDINATION_LANE_CHECKPOINTS_UPDATE_TRIGGER_SQL = `
CREATE TRIGGER IF NOT EXISTS trg_coordination_lane_checkpoints_append_only_update
BEFORE UPDATE ON coordination_lane_checkpoints
FOR EACH ROW
BEGIN
  SELECT RAISE(ABORT, 'coordination checkpoints are immutable');
END;`;

export const COORDINATION_LANE_CHECKPOINTS_DELETE_TRIGGER_SQL = `
CREATE TRIGGER IF NOT EXISTS trg_coordination_lane_checkpoints_append_only_delete
BEFORE DELETE ON coordination_lane_checkpoints
FOR EACH ROW
BEGIN
  SELECT RAISE(ABORT, 'coordination checkpoints are logically durable');
END;`;

export const COORDINATION_LANE_CHECKPOINT_OPEN_ITEMS_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS coordination_lane_checkpoint_open_items (
  checkpoint_id TEXT NOT NULL CHECK(length(trim(checkpoint_id)) > 0),
  open_item_id TEXT NOT NULL CHECK(length(trim(open_item_id)) > 0),
  item_ordinal INTEGER NOT NULL CHECK(item_ordinal > 0),
  summary TEXT NOT NULL CHECK(length(trim(summary)) > 0),
  continuity_kind TEXT NOT NULL CHECK(continuity_kind IN ('RETAINED','ADDED')),
  PRIMARY KEY(checkpoint_id, open_item_id),
  UNIQUE(checkpoint_id, item_ordinal),
  FOREIGN KEY(checkpoint_id) REFERENCES coordination_lane_checkpoints(id)
    ON DELETE RESTRICT DEFERRABLE INITIALLY DEFERRED
);`;

export const COORDINATION_LANE_CHECKPOINT_OPEN_ITEMS_LATE_INSERT_TRIGGER_SQL = `
CREATE TRIGGER IF NOT EXISTS trg_coordination_lane_checkpoint_open_items_closed_insert
BEFORE INSERT ON coordination_lane_checkpoint_open_items
FOR EACH ROW
WHEN EXISTS (
  SELECT 1 FROM coordination_lane_checkpoints WHERE id = NEW.checkpoint_id
)
BEGIN
  SELECT RAISE(ABORT, 'coordination checkpoint OPEN_ITEMS snapshot is already closed');
END;`;

export const COORDINATION_LANE_CHECKPOINT_OPEN_ITEMS_UPDATE_TRIGGER_SQL = `
CREATE TRIGGER IF NOT EXISTS trg_coordination_lane_checkpoint_open_items_immutable_update
BEFORE UPDATE ON coordination_lane_checkpoint_open_items
FOR EACH ROW
BEGIN
  SELECT RAISE(ABORT, 'coordination checkpoint OPEN_ITEMS are immutable');
END;`;

export const COORDINATION_LANE_CHECKPOINT_OPEN_ITEMS_DELETE_TRIGGER_SQL = `
CREATE TRIGGER IF NOT EXISTS trg_coordination_lane_checkpoint_open_items_immutable_delete
BEFORE DELETE ON coordination_lane_checkpoint_open_items
FOR EACH ROW
BEGIN
  SELECT RAISE(ABORT, 'coordination checkpoint OPEN_ITEMS are immutable');
END;`;

export const COORDINATION_LANE_CHECKPOINT_OPEN_ITEM_EXITS_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS coordination_lane_checkpoint_open_item_exits (
  checkpoint_id TEXT NOT NULL CHECK(length(trim(checkpoint_id)) > 0),
  open_item_id TEXT NOT NULL CHECK(length(trim(open_item_id)) > 0),
  exit_disposition TEXT NOT NULL CHECK(exit_disposition IN ('RESOLVED','WITHDRAWN','REPLACED')),
  exit_note TEXT NOT NULL CHECK(length(trim(exit_note)) > 0),
  replacement_open_item_id TEXT NULL,
  PRIMARY KEY(checkpoint_id, open_item_id),
  CHECK(
    (exit_disposition = 'REPLACED' AND replacement_open_item_id IS NOT NULL AND length(trim(replacement_open_item_id)) > 0)
    OR (exit_disposition IN ('RESOLVED','WITHDRAWN') AND replacement_open_item_id IS NULL)
  ),
  FOREIGN KEY(checkpoint_id) REFERENCES coordination_lane_checkpoints(id)
    ON DELETE RESTRICT DEFERRABLE INITIALLY DEFERRED,
  FOREIGN KEY(checkpoint_id, replacement_open_item_id)
    REFERENCES coordination_lane_checkpoint_open_items(checkpoint_id, open_item_id)
    ON DELETE RESTRICT DEFERRABLE INITIALLY DEFERRED
);`;

export const COORDINATION_LANE_CHECKPOINT_OPEN_ITEM_EXITS_REPLACEMENT_TRIGGER_SQL = `
CREATE TRIGGER IF NOT EXISTS trg_coordination_lane_checkpoint_open_item_exits_replacement_added
BEFORE INSERT ON coordination_lane_checkpoint_open_item_exits
FOR EACH ROW
WHEN NEW.exit_disposition = 'REPLACED' AND NOT EXISTS (
  SELECT 1
  FROM coordination_lane_checkpoint_open_items AS replacement
  WHERE replacement.checkpoint_id = NEW.checkpoint_id
    AND replacement.open_item_id = NEW.replacement_open_item_id
    AND replacement.continuity_kind = 'ADDED'
)
BEGIN
  SELECT RAISE(ABORT, 'coordination checkpoint replacement must identify an ADDED current item in the same successor');
END;`;

export const COORDINATION_LANE_CHECKPOINT_OPEN_ITEM_EXITS_LATE_INSERT_TRIGGER_SQL = `
CREATE TRIGGER IF NOT EXISTS trg_coordination_lane_checkpoint_open_item_exits_closed_insert
BEFORE INSERT ON coordination_lane_checkpoint_open_item_exits
FOR EACH ROW
WHEN EXISTS (
  SELECT 1 FROM coordination_lane_checkpoints WHERE id = NEW.checkpoint_id
)
BEGIN
  SELECT RAISE(ABORT, 'coordination checkpoint OPEN_ITEMS exit evidence is already closed');
END;`;

export const COORDINATION_LANE_CHECKPOINT_OPEN_ITEM_EXITS_UPDATE_TRIGGER_SQL = `
CREATE TRIGGER IF NOT EXISTS trg_coordination_lane_checkpoint_open_item_exits_immutable_update
BEFORE UPDATE ON coordination_lane_checkpoint_open_item_exits
FOR EACH ROW
BEGIN
  SELECT RAISE(ABORT, 'coordination checkpoint OPEN_ITEMS exit evidence is immutable');
END;`;

export const COORDINATION_LANE_CHECKPOINT_OPEN_ITEM_EXITS_DELETE_TRIGGER_SQL = `
CREATE TRIGGER IF NOT EXISTS trg_coordination_lane_checkpoint_open_item_exits_immutable_delete
BEFORE DELETE ON coordination_lane_checkpoint_open_item_exits
FOR EACH ROW
BEGIN
  SELECT RAISE(ABORT, 'coordination checkpoint OPEN_ITEMS exit evidence is immutable');
END;`;

export const COORDINATION_CHECKPOINT_SCHEMA_SQL = `
${COORDINATION_LANE_CHECKPOINTS_TABLE_SQL}
${COORDINATION_LANE_CHECKPOINTS_LANE_INDEX_SQL}
${COORDINATION_LANE_CHECKPOINTS_PREDECESSOR_TRIGGER_SQL}
${COORDINATION_LANE_CHECKPOINTS_UPDATE_TRIGGER_SQL}
${COORDINATION_LANE_CHECKPOINTS_DELETE_TRIGGER_SQL}
${COORDINATION_LANE_CHECKPOINT_OPEN_ITEMS_TABLE_SQL}
${COORDINATION_LANE_CHECKPOINT_OPEN_ITEMS_LATE_INSERT_TRIGGER_SQL}
${COORDINATION_LANE_CHECKPOINT_OPEN_ITEMS_UPDATE_TRIGGER_SQL}
${COORDINATION_LANE_CHECKPOINT_OPEN_ITEMS_DELETE_TRIGGER_SQL}
${COORDINATION_LANE_CHECKPOINT_OPEN_ITEM_EXITS_TABLE_SQL}
${COORDINATION_LANE_CHECKPOINT_OPEN_ITEM_EXITS_REPLACEMENT_TRIGGER_SQL}
${COORDINATION_LANE_CHECKPOINT_OPEN_ITEM_EXITS_LATE_INSERT_TRIGGER_SQL}
${COORDINATION_LANE_CHECKPOINT_OPEN_ITEM_EXITS_UPDATE_TRIGGER_SQL}
${COORDINATION_LANE_CHECKPOINT_OPEN_ITEM_EXITS_DELETE_TRIGGER_SQL}
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
        throw new CoordinationCheckpointSchemaError(
            `${type} ${name} has an unsupported shape`,
        );
    }
}

export function assertCoordinationCheckpointSchema(db: Database.Database): void {
    const objects: Array<[SchemaObjectType, string, string]> = [
        ["table", "coordination_lane_checkpoints", COORDINATION_LANE_CHECKPOINTS_TABLE_SQL],
        ["index", "idx_coordination_lane_checkpoints_lane_seq", COORDINATION_LANE_CHECKPOINTS_LANE_INDEX_SQL],
        ["trigger", "trg_coordination_lane_checkpoints_immediate_predecessor", COORDINATION_LANE_CHECKPOINTS_PREDECESSOR_TRIGGER_SQL],
        ["trigger", "trg_coordination_lane_checkpoints_append_only_update", COORDINATION_LANE_CHECKPOINTS_UPDATE_TRIGGER_SQL],
        ["trigger", "trg_coordination_lane_checkpoints_append_only_delete", COORDINATION_LANE_CHECKPOINTS_DELETE_TRIGGER_SQL],
        ["table", "coordination_lane_checkpoint_open_items", COORDINATION_LANE_CHECKPOINT_OPEN_ITEMS_TABLE_SQL],
        ["trigger", "trg_coordination_lane_checkpoint_open_items_closed_insert", COORDINATION_LANE_CHECKPOINT_OPEN_ITEMS_LATE_INSERT_TRIGGER_SQL],
        ["trigger", "trg_coordination_lane_checkpoint_open_items_immutable_update", COORDINATION_LANE_CHECKPOINT_OPEN_ITEMS_UPDATE_TRIGGER_SQL],
        ["trigger", "trg_coordination_lane_checkpoint_open_items_immutable_delete", COORDINATION_LANE_CHECKPOINT_OPEN_ITEMS_DELETE_TRIGGER_SQL],
        ["table", "coordination_lane_checkpoint_open_item_exits", COORDINATION_LANE_CHECKPOINT_OPEN_ITEM_EXITS_TABLE_SQL],
        ["trigger", "trg_coordination_lane_checkpoint_open_item_exits_replacement_added", COORDINATION_LANE_CHECKPOINT_OPEN_ITEM_EXITS_REPLACEMENT_TRIGGER_SQL],
        ["trigger", "trg_coordination_lane_checkpoint_open_item_exits_closed_insert", COORDINATION_LANE_CHECKPOINT_OPEN_ITEM_EXITS_LATE_INSERT_TRIGGER_SQL],
        ["trigger", "trg_coordination_lane_checkpoint_open_item_exits_immutable_update", COORDINATION_LANE_CHECKPOINT_OPEN_ITEM_EXITS_UPDATE_TRIGGER_SQL],
        ["trigger", "trg_coordination_lane_checkpoint_open_item_exits_immutable_delete", COORDINATION_LANE_CHECKPOINT_OPEN_ITEM_EXITS_DELETE_TRIGGER_SQL],
    ];
    for (const [type, name, sql] of objects) {
        assertSchemaObject(db, type, name, sql);
    }
}

export function ensureCoordinationCheckpointSchema(
    db: Database.Database,
    log: (message: string) => void = console.log,
): void {
    const ensure = db.transaction(() => {
        const existing = schemaObjectSql(db, "table", "coordination_lane_checkpoints");
        if (!existing) {
            db.exec(COORDINATION_CHECKPOINT_SCHEMA_SQL);
        }
        assertCoordinationCheckpointSchema(db);
    });

    ensure.immediate();
    log("Coordination checkpoint schema ensured");
}
