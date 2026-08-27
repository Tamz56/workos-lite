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
  source_ref_kind TEXT NULL,
  source_ref_id TEXT NULL,
  evaluated_state_lane_id TEXT NULL,
  evaluated_state_seq INTEGER NULL,
  evaluated_baseline_kind TEXT NULL,
  evaluated_baseline_id TEXT NULL,
  evaluated_baseline_fingerprint TEXT NULL,
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

// Approved additive P1-G2B binding columns (all nullable, reference-only).
export const COORDINATION_LANE_STATE_HISTORY_CORE_COLUMNS = [
    "lane_id",
    "seq",
    "state",
    "recorded_at",
    "provenance",
] as const;

export const COORDINATION_LANE_STATE_BINDING_COLUMNS = [
    "source_ref_kind",
    "source_ref_id",
    "evaluated_state_lane_id",
    "evaluated_state_seq",
    "evaluated_baseline_kind",
    "evaluated_baseline_id",
    "evaluated_baseline_fingerprint",
] as const;

const COORDINATION_LANE_STATE_BINDING_COLUMN_DEFINITIONS: Record<
    (typeof COORDINATION_LANE_STATE_BINDING_COLUMNS)[number],
    string
> = {
    source_ref_kind: "TEXT NULL",
    source_ref_id: "TEXT NULL",
    evaluated_state_lane_id: "TEXT NULL",
    evaluated_state_seq: "INTEGER NULL",
    evaluated_baseline_kind: "TEXT NULL",
    evaluated_baseline_id: "TEXT NULL",
    evaluated_baseline_fingerprint: "TEXT NULL",
};

function hasHistoryColumn(db: Database.Database, column: string): boolean {
    const columns = db
        .prepare("PRAGMA table_info(coordination_lane_state_history)")
        .all() as Array<{ name: string }>;
    return columns.some((row) => row.name === column);
}

function isDuplicateColumnError(error: unknown): boolean {
    return error instanceof Error && /duplicate column name/i.test(error.message);
}

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
    // Triggers remain exact-shape asserted (no additive concern).
    assertSchemaObject(
        db,
        "trigger",
        "trg_coordination_lane_state_history_append_only_update",
        COORDINATION_LANE_STATE_APPEND_ONLY_UPDATE_TRIGGER_SQL,
    );
    assertSchemaObject(
        db,
        "trigger",
        "trg_coordination_lane_state_history_append_only_delete",
        COORDINATION_LANE_STATE_APPEND_ONLY_DELETE_TRIGGER_SQL,
    );

    // Table: equivalent-or-stronger per-invariant validation (never downgraded
    // to simple core-column containment). Every existing G2A invariant is
    // verified individually; only the approved additive binding columns are
    // tolerated, and unknown extra columns fail closed.
    const info = db
        .prepare("PRAGMA table_info(coordination_lane_state_history)")
        .all() as Array<{
        cid: number;
        name: string;
        type: string;
        notnull: number;
        dflt_value: unknown;
        pk: number;
    }>;
    const byName = new Map(info.map((column) => [column.name, column]));

    const allowed = new Set<string>([
        ...COORDINATION_LANE_STATE_HISTORY_CORE_COLUMNS,
        ...COORDINATION_LANE_STATE_BINDING_COLUMNS,
    ]);
    for (const column of info) {
        if (!allowed.has(column.name)) {
            throw new CoordinationLaneStateSchemaError(
                `table coordination_lane_state_history has unknown column ${column.name}`,
            );
        }
    }

    const pkColumns = info
        .filter((column) => column.pk > 0)
        .map((column) => column.name)
        .sort();
    if (pkColumns.length !== 2 || pkColumns[0] !== "lane_id" || pkColumns[1] !== "seq") {
        throw new CoordinationLaneStateSchemaError(
            "table coordination_lane_state_history must have composite PK (lane_id, seq)",
        );
    }

    const core: Array<{ name: string; type: string; pk?: number }> = [
        { name: "lane_id", type: "TEXT", pk: 1 },
        { name: "seq", type: "INTEGER", pk: 2 },
        { name: "state", type: "TEXT" },
        { name: "recorded_at", type: "TEXT" },
        { name: "provenance", type: "TEXT" },
    ];
    for (const expected of core) {
        const actual = byName.get(expected.name);
        if (!actual) {
            throw new CoordinationLaneStateSchemaError(
                `table coordination_lane_state_history is missing required column ${expected.name}`,
            );
        }
        if (actual.type !== expected.type) {
            throw new CoordinationLaneStateSchemaError(
                `column ${expected.name} must be ${expected.type}`,
            );
        }
        if (!actual.notnull) {
            throw new CoordinationLaneStateSchemaError(
                `column ${expected.name} must be NOT NULL`,
            );
        }
        if (expected.pk !== undefined && actual.pk !== expected.pk) {
            throw new CoordinationLaneStateSchemaError(
                `column ${expected.name} PK order must be ${expected.pk}`,
            );
        }
    }

    const fks = db
        .prepare("PRAGMA foreign_key_list(coordination_lane_state_history)")
        .all() as Array<{
        id: number;
        seq: number;
        table: string;
        from: string;
        to: string;
        on_update: string;
        on_delete: string;
        match: string;
    }>;
    const laneFk = fks.find(
        (fk) => fk.from === "lane_id" && fk.table === "coordination_lanes" && fk.to === "id",
    );
    if (!laneFk || laneFk.on_delete !== "RESTRICT") {
        throw new CoordinationLaneStateSchemaError(
            "table coordination_lane_state_history must have FK lane_id -> coordination_lanes(id) ON DELETE RESTRICT",
        );
    }

    const tableSql = normalizeSql(
        schemaObjectSql(db, "table", "coordination_lane_state_history") ?? "",
    );
    for (const fragment of [
        "check(seq > 0)",
        "check(length(trim(state)) > 0)",
        "check(length(trim(provenance)) > 0)",
    ]) {
        if (!tableSql.includes(fragment)) {
            throw new CoordinationLaneStateSchemaError(
                `table coordination_lane_state_history is missing CHECK invariant ${fragment}`,
            );
        }
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

/**
 * P1-G2B additive-column ensure (mirrors ensureProjectRegistryMetadataColumns
 * mechanics): adds only missing approved binding columns via
 * ALTER TABLE ... ADD COLUMN, idempotent, and race-tolerant for concurrent
 * workers (duplicate column name → re-verify → accept only if present).
 */
export function ensureCoordinationLaneStateBindingColumns(
    db: Database.Database,
    log: (message: string) => void = console.log,
): string[] {
    const added: string[] = [];
    for (const column of COORDINATION_LANE_STATE_BINDING_COLUMNS) {
        if (hasHistoryColumn(db, column)) continue;
        try {
            db.exec(
                `ALTER TABLE coordination_lane_state_history ADD COLUMN ${column} ${COORDINATION_LANE_STATE_BINDING_COLUMN_DEFINITIONS[column]}`,
            );
            added.push(column);
        } catch (error) {
            if (isDuplicateColumnError(error) && hasHistoryColumn(db, column)) {
                added.push(column);
            } else {
                throw error;
            }
        }
    }
    if (added.length > 0) {
        log(`Added Coordination Lane state binding columns: ${added.join(", ")}`);
    }
    return added;
}
