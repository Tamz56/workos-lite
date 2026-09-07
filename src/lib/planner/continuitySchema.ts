// ---------------------------------------------------------------------------
// WorkOS Project Continuity Planner V1 — Phase B continuity schema
//
// FROZEN Phase B contract (no design authority added here):
//   - project_plans                (planning-authority versions, ACCEPTED/SUPERSEDED)
//   - planner_item_lifecycle_events(append-only durable lifecycle history)
//   - project_items.project_plan_id   (nullable FK → project_plans.id)
//   - project_items.target_week_start (nullable YYYY-MM-DD, Bangkok Monday week)
//
// Week layer is DERIVED — no weeks table is created.
// planner_items.planner_status 'dropped' support lives in planner/schema.ts
// (ensurePlannerItemsDroppedStatus).
//
// This module is intentionally NOT wired into the startup ensure chain yet:
// Phase B forbids live DB mutation. It is executed against isolated/test DBs
// now; a later post-backup phase wires live activation explicitly.
// ---------------------------------------------------------------------------

import type Database from "better-sqlite3";

export const PROJECT_PLAN_SCHEMA_VERSION = "project-plan.v1" as const;

export const PROJECT_PLAN_STATUSES = ["ACCEPTED", "SUPERSEDED"] as const;
export type ProjectPlanStatus = (typeof PROJECT_PLAN_STATUSES)[number];

export const PLANNER_ITEM_LIFECYCLE_EVENT_TYPES = [
    "PLANNED",
    "COMPLETED",
    "CARRIED_FORWARD",
    "DROPPED",
] as const;
export type PlannerItemLifecycleEventType =
    (typeof PLANNER_ITEM_LIFECYCLE_EVENT_TYPES)[number];

export const PROJECT_PLANS_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS project_plans (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  schema_version TEXT NOT NULL,
  current_outcome TEXT NOT NULL,
  planned_next TEXT NULL,
  status TEXT NOT NULL CHECK (status IN ('ACCEPTED', 'SUPERSEDED')),
  supersedes_project_plan_id TEXT NULL,
  source_type TEXT NOT NULL,
  source_ref TEXT NULL,
  source_hash TEXT NOT NULL,
  accepted_at TEXT NOT NULL,
  accepted_by TEXT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (project_id) REFERENCES projects(id),
  FOREIGN KEY (supersedes_project_plan_id) REFERENCES project_plans(id)
);
CREATE INDEX IF NOT EXISTS idx_project_plans_project_status
  ON project_plans(project_id, status);
-- At most one ACCEPTED plan per Project (partial unique, existing convention).
CREATE UNIQUE INDEX IF NOT EXISTS uq_project_plans_one_accepted
  ON project_plans(project_id)
  WHERE status = 'ACCEPTED';
`;

export const PLANNER_ITEM_LIFECYCLE_EVENTS_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS planner_item_lifecycle_events (
  id TEXT PRIMARY KEY,
  planner_item_id TEXT NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('PLANNED', 'COMPLETED', 'CARRIED_FORWARD', 'DROPPED')),
  occurred_at TEXT NOT NULL,
  from_planner_day_id TEXT NULL,
  to_planner_day_id TEXT NULL,
  result_planner_item_id TEXT NULL,
  mutation_source TEXT NULL,
  actor_ref TEXT NULL,
  idempotency_key TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (planner_item_id) REFERENCES planner_items(id),
  FOREIGN KEY (from_planner_day_id) REFERENCES planner_days(id),
  FOREIGN KEY (to_planner_day_id) REFERENCES planner_days(id),
  FOREIGN KEY (result_planner_item_id) REFERENCES planner_items(id)
);
CREATE INDEX IF NOT EXISTS idx_planner_item_lifecycle_item_occurred
  ON planner_item_lifecycle_events(planner_item_id, occurred_at);
`;

// project_items additive columns (nullable; existing rows remain NULL).
const PROJECT_ITEMS_CONTINUITY_ADDITIVE_COLUMNS: Array<{ column: string; sqlDef: string }> = [
    { column: "project_plan_id", sqlDef: "TEXT NULL REFERENCES project_plans(id)" },
    { column: "target_week_start", sqlDef: "TEXT NULL" },
];

/**
 * Ensures the frozen Phase B continuity schema on the given DB.
 * Creates project_plans + planner_item_lifecycle_events, and additively adds
 * the nullable project_items columns. No weeks table is created.
 * Existing project_items rows are left untouched (NULL), no backfill.
 *
 * Phase B: call ONLY against isolated/test DBs.
 */
export function ensurePlannerContinuitySchema(
    db: Database.Database,
    log: (message: string) => void = console.log,
): void {
    const ensure = db.transaction(() => {
        db.exec(PROJECT_PLANS_TABLE_SQL);
        db.exec(PLANNER_ITEM_LIFECYCLE_EVENTS_TABLE_SQL);

        const columns = (db.prepare("PRAGMA table_info(project_items)").all() as Array<{ name: string }>).map(
            (row) => row.name,
        );
        for (const { column, sqlDef } of PROJECT_ITEMS_CONTINUITY_ADDITIVE_COLUMNS) {
            if (!columns.includes(column)) {
                db.exec(`ALTER TABLE project_items ADD COLUMN ${column} ${sqlDef}`);
            }
        }
    });
    ensure.immediate();
    log("Planner continuity schema ensured");
}
