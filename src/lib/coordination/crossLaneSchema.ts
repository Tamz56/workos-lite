// ---------------------------------------------------------------------------
// WorkOS-Lite P2-G5B — Cross-Lane Impact schema (identity + append-only
// lifecycle/history foundation).
//
// Three durable tables:
//   1. coordination_cross_lane_source_items           (immutable identity)
//   2. coordination_cross_lane_source_item_history    (append-only lifecycle)
//   3. coordination_cross_lane_target_relation_history(append-only relations)
//
// Frozen P2-G5B-I1 guards (never changed/extended here):
//   - Who Should Know != Who Must Act,
//   - Dependency != Cross-Lane Impact,
//   - G4 Condition != Cross-Lane Impact,
//   - NONE is an explicit classification, never an absent relation,
//   - self-relation is prohibited (fail-closed at DB + application),
//   - same-project only in v1 (fail-closed),
//   - no direct target-Lane authority/state mutation.
//
// Currentness is always DERIVED as the highest durable seq per scope:
//   - source item state    : highest seq per source_item_id,
//   - target relation state: highest seq per (source_item_id, target_lane_id).
// ---------------------------------------------------------------------------

import type Database from "better-sqlite3";

export const COORDINATION_CROSS_LANE_SCHEMA_ERROR =
    "COORDINATION_CROSS_LANE_SCHEMA_INCOMPATIBLE" as const;

export class CoordinationCrossLaneSchemaError extends Error {
    readonly code = COORDINATION_CROSS_LANE_SCHEMA_ERROR;

    constructor(detail: string) {
        super(`${COORDINATION_CROSS_LANE_SCHEMA_ERROR}: ${detail}`);
        this.name = "CoordinationCrossLaneSchemaError";
    }
}

export const CROSS_LANE_IMPACT_CLASSIFICATIONS = [
    "ACTION_REQUIRED",
    "AWARENESS_ONLY",
    "RECORD_ONLY",
    "NONE",
] as const;

export const COORDINATION_CROSS_LANE_SOURCE_ITEMS_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS coordination_cross_lane_source_items (
  id TEXT PRIMARY KEY CHECK(length(trim(id)) > 0),
  source_lane_id TEXT NOT NULL CHECK(length(trim(source_lane_id)) > 0),
  summary TEXT NOT NULL CHECK(length(trim(summary)) > 0),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY(source_lane_id) REFERENCES coordination_lanes(id) ON DELETE RESTRICT
);`;

export const COORDINATION_CROSS_LANE_SOURCE_ITEMS_PROJECT_INDEX_SQL = `
CREATE INDEX IF NOT EXISTS idx_coordination_cross_lane_source_items_source_lane
ON coordination_cross_lane_source_items(source_lane_id);`;

export const COORDINATION_CROSS_LANE_SOURCE_ITEMS_IDENTITY_TRIGGER_SQL = `
CREATE TRIGGER IF NOT EXISTS trg_coordination_cross_lane_source_items_identity_immutable
BEFORE UPDATE OF id, source_lane_id, summary ON coordination_cross_lane_source_items
FOR EACH ROW
BEGIN
  SELECT RAISE(ABORT, 'coordination cross-lane source item identity is immutable');
END;`;

export const COORDINATION_CROSS_LANE_SOURCE_ITEM_HISTORY_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS coordination_cross_lane_source_item_history (
  source_item_id TEXT NOT NULL,
  seq INTEGER NOT NULL CHECK(seq > 0),
  applicable INTEGER NOT NULL CHECK(applicable IN (0,1)),
  recorded_at TEXT NOT NULL DEFAULT (datetime('now')),
  source_provenance TEXT NOT NULL CHECK(length(trim(source_provenance)) > 0),
  PRIMARY KEY (source_item_id, seq),
  FOREIGN KEY(source_item_id) REFERENCES coordination_cross_lane_source_items(id) ON DELETE RESTRICT
);`;

export const COORDINATION_CROSS_LANE_SOURCE_ITEM_HISTORY_UPDATE_TRIGGER_SQL = `
CREATE TRIGGER IF NOT EXISTS trg_coordination_cross_lane_source_item_history_append_only_update
BEFORE UPDATE ON coordination_cross_lane_source_item_history
FOR EACH ROW
BEGIN
  SELECT RAISE(ABORT, 'coordination cross-lane source item history is append-only');
END;`;

export const COORDINATION_CROSS_LANE_SOURCE_ITEM_HISTORY_DELETE_TRIGGER_SQL = `
CREATE TRIGGER IF NOT EXISTS trg_coordination_cross_lane_source_item_history_append_only_delete
BEFORE DELETE ON coordination_cross_lane_source_item_history
FOR EACH ROW
BEGIN
  SELECT RAISE(ABORT, 'coordination cross-lane source item history is append-only');
END;`;

export const COORDINATION_CROSS_LANE_TARGET_RELATION_HISTORY_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS coordination_cross_lane_target_relation_history (
  source_item_id TEXT NOT NULL,
  target_lane_id TEXT NOT NULL CHECK(length(trim(target_lane_id)) > 0),
  seq INTEGER NOT NULL CHECK(seq > 0),
  impact_classification TEXT NOT NULL CHECK(
    length(trim(impact_classification)) > 0
    AND impact_classification IN ('ACTION_REQUIRED','AWARENESS_ONLY','RECORD_ONLY','NONE')
  ),
  applicable INTEGER NOT NULL CHECK(applicable IN (0,1)),
  recorded_at TEXT NOT NULL DEFAULT (datetime('now')),
  relation_provenance TEXT NOT NULL CHECK(length(trim(relation_provenance)) > 0),
  PRIMARY KEY (source_item_id, target_lane_id, seq),
  FOREIGN KEY(source_item_id) REFERENCES coordination_cross_lane_source_items(id) ON DELETE RESTRICT,
  FOREIGN KEY(target_lane_id) REFERENCES coordination_lanes(id) ON DELETE RESTRICT
);`;

export const COORDINATION_CROSS_LANE_TARGET_RELATION_HISTORY_UPDATE_TRIGGER_SQL = `
CREATE TRIGGER IF NOT EXISTS trg_coordination_cross_lane_target_relation_history_append_only_update
BEFORE UPDATE ON coordination_cross_lane_target_relation_history
FOR EACH ROW
BEGIN
  SELECT RAISE(ABORT, 'coordination cross-lane target relation history is append-only');
END;`;

export const COORDINATION_CROSS_LANE_TARGET_RELATION_HISTORY_DELETE_TRIGGER_SQL = `
CREATE TRIGGER IF NOT EXISTS trg_coordination_cross_lane_target_relation_history_append_only_delete
BEFORE DELETE ON coordination_cross_lane_target_relation_history
FOR EACH ROW
BEGIN
  SELECT RAISE(ABORT, 'coordination cross-lane target relation history is append-only');
END;`;

export const COORDINATION_CROSS_LANE_TARGET_RELATION_SAME_PROJECT_TRIGGER_SQL = `
CREATE TRIGGER IF NOT EXISTS trg_coordination_cross_lane_target_relation_same_project
BEFORE INSERT ON coordination_cross_lane_target_relation_history
FOR EACH ROW
WHEN NOT EXISTS (
  SELECT 1
  FROM coordination_cross_lane_source_items AS item
  JOIN coordination_lanes AS source_lane ON source_lane.id = item.source_lane_id
  JOIN coordination_lanes AS target_lane ON target_lane.id = NEW.target_lane_id
  WHERE item.id = NEW.source_item_id
    AND source_lane.project_id = target_lane.project_id
)
BEGIN
  SELECT RAISE(ABORT, 'coordination cross-lane target relation must reference a Lane in the same Project');
END;`;

export const COORDINATION_CROSS_LANE_TARGET_RELATION_NO_SELF_TRIGGER_SQL = `
CREATE TRIGGER IF NOT EXISTS trg_coordination_cross_lane_target_relation_no_self
BEFORE INSERT ON coordination_cross_lane_target_relation_history
FOR EACH ROW
WHEN NEW.target_lane_id = (
  SELECT source_lane_id
  FROM coordination_cross_lane_source_items
  WHERE id = NEW.source_item_id
)
BEGIN
  SELECT RAISE(ABORT, 'coordination cross-lane target relation must not reference its own source Lane');
END;`;

export const COORDINATION_CROSS_LANE_SCHEMA_SQL = `
${COORDINATION_CROSS_LANE_SOURCE_ITEMS_TABLE_SQL}
${COORDINATION_CROSS_LANE_SOURCE_ITEMS_PROJECT_INDEX_SQL}
${COORDINATION_CROSS_LANE_SOURCE_ITEMS_IDENTITY_TRIGGER_SQL}
${COORDINATION_CROSS_LANE_SOURCE_ITEM_HISTORY_TABLE_SQL}
${COORDINATION_CROSS_LANE_SOURCE_ITEM_HISTORY_UPDATE_TRIGGER_SQL}
${COORDINATION_CROSS_LANE_SOURCE_ITEM_HISTORY_DELETE_TRIGGER_SQL}
${COORDINATION_CROSS_LANE_TARGET_RELATION_HISTORY_TABLE_SQL}
${COORDINATION_CROSS_LANE_TARGET_RELATION_HISTORY_UPDATE_TRIGGER_SQL}
${COORDINATION_CROSS_LANE_TARGET_RELATION_HISTORY_DELETE_TRIGGER_SQL}
${COORDINATION_CROSS_LANE_TARGET_RELATION_SAME_PROJECT_TRIGGER_SQL}
${COORDINATION_CROSS_LANE_TARGET_RELATION_NO_SELF_TRIGGER_SQL}
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
        throw new CoordinationCrossLaneSchemaError(
            `${type} ${name} has an unsupported shape`,
        );
    }
}

function assertCoordinationCrossLaneSchema(db: Database.Database): void {
    const objects: Array<[SchemaObjectType, string, string]> = [
        [
            "table",
            "coordination_cross_lane_source_items",
            COORDINATION_CROSS_LANE_SOURCE_ITEMS_TABLE_SQL,
        ],
        [
            "index",
            "idx_coordination_cross_lane_source_items_source_lane",
            COORDINATION_CROSS_LANE_SOURCE_ITEMS_PROJECT_INDEX_SQL,
        ],
        [
            "trigger",
            "trg_coordination_cross_lane_source_items_identity_immutable",
            COORDINATION_CROSS_LANE_SOURCE_ITEMS_IDENTITY_TRIGGER_SQL,
        ],
        [
            "table",
            "coordination_cross_lane_source_item_history",
            COORDINATION_CROSS_LANE_SOURCE_ITEM_HISTORY_TABLE_SQL,
        ],
        [
            "trigger",
            "trg_coordination_cross_lane_source_item_history_append_only_update",
            COORDINATION_CROSS_LANE_SOURCE_ITEM_HISTORY_UPDATE_TRIGGER_SQL,
        ],
        [
            "trigger",
            "trg_coordination_cross_lane_source_item_history_append_only_delete",
            COORDINATION_CROSS_LANE_SOURCE_ITEM_HISTORY_DELETE_TRIGGER_SQL,
        ],
        [
            "table",
            "coordination_cross_lane_target_relation_history",
            COORDINATION_CROSS_LANE_TARGET_RELATION_HISTORY_TABLE_SQL,
        ],
        [
            "trigger",
            "trg_coordination_cross_lane_target_relation_history_append_only_update",
            COORDINATION_CROSS_LANE_TARGET_RELATION_HISTORY_UPDATE_TRIGGER_SQL,
        ],
        [
            "trigger",
            "trg_coordination_cross_lane_target_relation_history_append_only_delete",
            COORDINATION_CROSS_LANE_TARGET_RELATION_HISTORY_DELETE_TRIGGER_SQL,
        ],
        [
            "trigger",
            "trg_coordination_cross_lane_target_relation_same_project",
            COORDINATION_CROSS_LANE_TARGET_RELATION_SAME_PROJECT_TRIGGER_SQL,
        ],
        [
            "trigger",
            "trg_coordination_cross_lane_target_relation_no_self",
            COORDINATION_CROSS_LANE_TARGET_RELATION_NO_SELF_TRIGGER_SQL,
        ],
    ];
    for (const [type, name, sql] of objects) {
        assertSchemaObject(db, type, name, sql);
    }
}

export function ensureCoordinationCrossLaneSchema(
    db: Database.Database,
    log: (message: string) => void = console.log,
): void {
    const ensure = db.transaction(() => {
        const itemsExists = schemaObjectSql(
            db,
            "table",
            "coordination_cross_lane_source_items",
        );
        const itemHistoryExists = schemaObjectSql(
            db,
            "table",
            "coordination_cross_lane_source_item_history",
        );
        const relationHistoryExists = schemaObjectSql(
            db,
            "table",
            "coordination_cross_lane_target_relation_history",
        );
        if (itemsExists || itemHistoryExists || relationHistoryExists) {
            assertCoordinationCrossLaneSchema(db);
        } else {
            db.exec(COORDINATION_CROSS_LANE_SCHEMA_SQL);
            assertCoordinationCrossLaneSchema(db);
        }
    });

    ensure.immediate();
    log("Coordination cross-lane schema ensured");
}
