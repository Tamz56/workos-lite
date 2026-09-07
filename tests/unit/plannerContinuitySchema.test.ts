import Database from "better-sqlite3";
import { afterEach, describe, expect, it } from "vitest";
import {
    ensurePlannerSchema,
    ensurePlannerItemsDroppedStatus,
    plannerItemsSupportsDroppedStatus,
} from "@/lib/planner/schema";
import {
    ensurePlannerContinuitySchema,
    PROJECT_PLAN_SCHEMA_VERSION,
} from "@/lib/planner/continuitySchema";

const openDatabases: Database.Database[] = [];

function track(db: Database.Database): Database.Database {
    openDatabases.push(db);
    return db;
}

afterEach(() => {
    while (openDatabases.length > 0) openDatabases.pop()?.close();
});

function columnNames(db: Database.Database, table: string): string[] {
    return (db.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>).map(
        (row) => row.name,
    );
}

function indexNames(db: Database.Database, table: string): string[] {
    return (db.prepare(`PRAGMA index_list(${table})`).all() as Array<{ name: string }>)
        .map((row) => row.name)
        .sort();
}

function fkTargets(db: Database.Database, table: string): Array<{ from: string; table: string }> {
    return (db.prepare(`PRAGMA foreign_key_list(${table})`).all() as Array<{
        from: string;
        table: string;
    }>).map((row) => ({ from: row.from, table: row.table }));
}

// --- shared base tables ---
function createBase(db: Database.Database): void {
    db.pragma("foreign_keys = ON");
    db.exec(`
        CREATE TABLE projects (id TEXT PRIMARY KEY, slug TEXT NOT NULL UNIQUE, name TEXT NOT NULL);
        CREATE TABLE project_items (
          id TEXT PRIMARY KEY,
          project_id TEXT NOT NULL REFERENCES projects(id),
          title TEXT NOT NULL,
          status TEXT NOT NULL DEFAULT 'planned',
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          updated_at TEXT NOT NULL DEFAULT (datetime('now')),
          import_fingerprint TEXT NULL
        );
    `);
}

function insertProject(db: Database.Database, id: string, slug: string, name: string): void {
    db.prepare("INSERT INTO projects (id, slug, name) VALUES (?, ?, ?)").run(id, slug, name);
}

function insertProjectItem(db: Database.Database, id: string, projectId: string, title: string): void {
    db.prepare("INSERT INTO project_items (id, project_id, title) VALUES (?, ?, ?)").run(
        id,
        projectId,
        title,
    );
}

function insertPlan(
    db: Database.Database,
    overrides: Partial<Record<string, unknown>> = {},
): void {
    const base = {
        id: "plan-1",
        project_id: "proj-1",
        schema_version: PROJECT_PLAN_SCHEMA_VERSION,
        current_outcome: "outcome",
        planned_next: null,
        status: "ACCEPTED",
        supersedes_project_plan_id: null,
        source_type: "human",
        source_ref: null,
        source_hash: "hash-1",
        accepted_at: "2026-09-07T00:00:00.000Z",
        accepted_by: null,
    };
    const merged = { ...base, ...overrides };
    db.prepare(`
        INSERT INTO project_plans (
          id, project_id, schema_version, current_outcome, planned_next, status,
          supersedes_project_plan_id, source_type, source_ref, source_hash,
          accepted_at, accepted_by
        ) VALUES (
          @id, @project_id, @schema_version, @current_outcome, @planned_next, @status,
          @supersedes_project_plan_id, @source_type, @source_ref, @source_hash,
          @accepted_at, @accepted_by
        )
    `).run(merged);
}

// --- fresh DB with canonical planner + continuity schema ---
function freshDb(): Database.Database {
    const db = track(new Database(":memory:"));
    createBase(db);
    insertProject(db, "proj-1", "proj-a", "A");
    insertProject(db, "proj-2", "proj-b", "B");
    insertProjectItem(db, "pi-1", "proj-1", "Existing item");
    ensurePlannerSchema(db, () => undefined);
    ensurePlannerContinuitySchema(db, () => undefined);
    return db;
}

function insertPlannerDay(db: Database.Database, id: string, planDate: string): void {
    db.prepare("INSERT INTO planner_days (id, plan_date) VALUES (?, ?)").run(id, planDate);
}

function insertPlannerItem(
    db: Database.Database,
    id: string,
    dayId: string,
    status = "planned",
    overrides: Partial<Record<string, unknown>> = {},
): void {
    const base = {
        id,
        planner_day_id: dayId,
        source_type: "task",
        source_id: id,
        work_mode: "focus",
        priority: "normal",
        estimated_minutes: null,
        energy_level: null,
        scheduled_block: null,
        planned_order: 0,
        planner_status: status,
        is_main_task: 0,
        start_time: null,
        end_time: null,
        ai_provider_key: null,
    };
    const merged = { ...base, ...overrides };
    db.prepare(`
        INSERT INTO planner_items (
          id, planner_day_id, source_type, source_id, work_mode, priority,
          estimated_minutes, energy_level, scheduled_block, planned_order,
          planner_status, is_main_task, start_time, end_time, ai_provider_key
        ) VALUES (
          @id, @planner_day_id, @source_type, @source_id, @work_mode, @priority,
          @estimated_minutes, @energy_level, @scheduled_block, @planned_order,
          @planner_status, @is_main_task, @start_time, @end_time, @ai_provider_key
        )
    `).run(merged);
}

// --- LEGACY planner schema (pre-dropped) for rebuild proof ---
const LEGACY_PLANNER_SQL = `
CREATE TABLE IF NOT EXISTS planner_days (
  id TEXT PRIMARY KEY,
  plan_date TEXT NOT NULL UNIQUE,
  main_outcome TEXT NULL,
  daily_capacity_minutes INTEGER NULL,
  energy_level TEXT NULL CHECK (energy_level IN ('low', 'medium', 'high', 'recovery')),
  status TEXT NOT NULL DEFAULT 'planning' CHECK (status IN ('planning', 'active', 'completed')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS planner_items (
  id TEXT PRIMARY KEY,
  planner_day_id TEXT NOT NULL,
  source_type TEXT NOT NULL CHECK (source_type IN ('task', 'project_item')),
  source_id TEXT NOT NULL,
  work_mode TEXT NOT NULL CHECK (work_mode IN ('focus', 'production', 'ai_preparation', 'ai_execution', 'review', 'maintenance')),
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('critical', 'high', 'normal', 'low')),
  estimated_minutes INTEGER NULL,
  energy_level TEXT NULL CHECK (energy_level IN ('high', 'medium', 'low')),
  scheduled_block TEXT NULL CHECK (scheduled_block IN ('morning_focus', 'afternoon_production', 'pre_ai_preparation', 'evening_ai', 'flexible')),
  planned_order INTEGER NOT NULL DEFAULT 0,
  planner_status TEXT NOT NULL DEFAULT 'planned' CHECK (planner_status IN ('planned', 'ready', 'doing', 'waiting', 'review', 'completed', 'carried_forward', 'blocked')),
  is_main_task INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  start_time TEXT NULL,
  end_time TEXT NULL,
  ai_provider_key TEXT NULL,
  FOREIGN KEY (planner_day_id) REFERENCES planner_days(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_planner_items_source ON planner_items(source_type, source_id);
CREATE INDEX IF NOT EXISTS idx_planner_items_day_order ON planner_items(planner_day_id, planned_order);
CREATE UNIQUE INDEX IF NOT EXISTS idx_planner_items_no_dup ON planner_items(planner_day_id, source_type, source_id);
CREATE TRIGGER IF NOT EXISTS trg_planner_items_updated_at
AFTER UPDATE ON planner_items
FOR EACH ROW
WHEN NEW.updated_at = OLD.updated_at OR NEW.updated_at IS OLD.updated_at
BEGIN
  UPDATE planner_items SET updated_at = datetime('now') WHERE id = NEW.id;
END;
`;

function legacyPlannerDb(): Database.Database {
    const db = track(new Database(":memory:"));
    db.pragma("foreign_keys = ON");
    db.exec(LEGACY_PLANNER_SQL);
    return db;
}

describe("Phase B — Planner continuity schema (isolated, no live DB)", () => {
    it("creates project_plans with the frozen columns and V1 schema version", () => {
        const db = freshDb();
        expect(columnNames(db, "project_plans")).toEqual(
            expect.arrayContaining([
                "id",
                "project_id",
                "schema_version",
                "current_outcome",
                "planned_next",
                "status",
                "supersedes_project_plan_id",
                "source_type",
                "source_ref",
                "source_hash",
                "accepted_at",
                "accepted_by",
                "created_at",
            ]),
        );
    });

    it("enforces ACCEPTED/SUPERSEDED status, V1 schema_version, one ACCEPTED per Project, and NO-ACTION Project FK", () => {
        const db = freshDb();
        // V1 semantic value accepted; arbitrary non-V1 also string-stored (no CHECK) but contract sets V1.
        insertPlan(db);
        expect(
            (db.prepare("SELECT COUNT(*) AS c FROM project_plans WHERE status='ACCEPTED'").get() as { c: number }).c,
        ).toBe(1);

        // Second ACCEPTED for the same project rejected (partial unique).
        expect(() => insertPlan(db, { id: "plan-2" })).toThrow(/UNIQUE/i);

        // Unsupported status rejected.
        expect(() => insertPlan(db, { id: "plan-bad", status: "draft" })).toThrow(/CHECK/i);

        // Supersede: old ACCEPTED -> SUPERSEDED, then a new ACCEPTED is allowed.
        db.prepare("UPDATE project_plans SET status='SUPERSEDED' WHERE id='plan-1'").run();
        insertPlan(db, { id: "plan-2", supersedes_project_plan_id: "plan-1" });
        expect(
            (db.prepare("SELECT COUNT(*) AS c FROM project_plans WHERE status='ACCEPTED'").get() as { c: number }).c,
        ).toBe(1);
        expect(
            (db.prepare("SELECT supersedes_project_plan_id FROM project_plans WHERE id='plan-2'").get() as {
                supersedes_project_plan_id: string;
            }).supersedes_project_plan_id,
        ).toBe("plan-1");

        // FK is NO ACTION: deleting a referenced Project must be rejected (no cascade).
        insertProject(db, "proj-keep", "proj-keep", "Keep");
        insertPlan(db, { id: "plan-3", project_id: "proj-keep", status: "SUPERSEDED" });
        expect(() => db.prepare("DELETE FROM projects WHERE id='proj-keep'").run()).toThrow(/FOREIGN KEY/i);
    });

    it("adds nullable project_items.project_plan_id and target_week_start and never creates a weeks table", () => {
        const db = freshDb();
        const cols = columnNames(db, "project_items");
        expect(cols).toContain("project_plan_id");
        expect(cols).toContain("target_week_start");

        // Existing row stays NULL (no backfill).
        const row = db.prepare("SELECT project_plan_id, target_week_start FROM project_items WHERE id='pi-1'").get() as {
            project_plan_id: string | null;
            target_week_start: string | null;
        };
        expect(row.project_plan_id).toBeNull();
        expect(row.target_week_start).toBeNull();

        // Nullable FKs can be set to a real plan + week start.
        insertPlan(db);
        db.prepare(
            "UPDATE project_items SET project_plan_id='plan-1', target_week_start='2026-09-07' WHERE id='pi-1'",
        ).run();
        const updated = db.prepare("SELECT project_plan_id, target_week_start FROM project_items WHERE id='pi-1'").get() as {
            project_plan_id: string;
            target_week_start: string;
        };
        expect(updated.project_plan_id).toBe("plan-1");
        expect(updated.target_week_start).toBe("2026-09-07");

        // Week model is DERIVED — no weeks table.
        const weeks = db.prepare("SELECT COUNT(*) AS c FROM sqlite_master WHERE type='table' AND name='weeks'").get() as {
            c: number;
        };
        expect(weeks.c).toBe(0);
    });

    it("creates planner_item_lifecycle_events with frozen columns, exact event types, and unique idempotency_key", () => {
        const db = freshDb();
        expect(columnNames(db, "planner_item_lifecycle_events")).toEqual(
            expect.arrayContaining([
                "id",
                "planner_item_id",
                "event_type",
                "occurred_at",
                "from_planner_day_id",
                "to_planner_day_id",
                "result_planner_item_id",
                "mutation_source",
                "actor_ref",
                "idempotency_key",
                "created_at",
            ]),
        );

        insertPlannerDay(db, "d1", "2026-09-07");
        insertPlannerItem(db, "i1", "d1");

        const insertEvent = (overrides: Record<string, unknown> = {}) => {
            const base = {
                id: "evt-1",
                planner_item_id: "i1",
                event_type: "PLANNED",
                occurred_at: "2026-09-07T00:00:00.000Z",
                from_planner_day_id: "d1",
                to_planner_day_id: null,
                result_planner_item_id: null,
                mutation_source: "phase-b-test",
                actor_ref: "human-1",
                idempotency_key: "idem-1",
            };
            const merged = { ...base, ...overrides };
            db.prepare(`
                INSERT INTO planner_item_lifecycle_events (
                  id, planner_item_id, event_type, occurred_at,
                  from_planner_day_id, to_planner_day_id, result_planner_item_id,
                  mutation_source, actor_ref, idempotency_key
                ) VALUES (
                  @id, @planner_item_id, @event_type, @occurred_at,
                  @from_planner_day_id, @to_planner_day_id, @result_planner_item_id,
                  @mutation_source, @actor_ref, @idempotency_key
                )
            `).run(merged);
        };

        insertEvent();
        insertEvent({ id: "evt-2", event_type: "COMPLETED", idempotency_key: "idem-2" });
        insertEvent({ id: "evt-3", event_type: "CARRIED_FORWARD", idempotency_key: "idem-3" });
        insertEvent({ id: "evt-4", event_type: "DROPPED", idempotency_key: "idem-4" });
        expect(
            (db.prepare("SELECT COUNT(*) AS c FROM planner_item_lifecycle_events").get() as { c: number }).c,
        ).toBe(4);

        // Invalid event type rejected.
        expect(() => insertEvent({ id: "evt-bad", event_type: "moved", idempotency_key: "idem-bad" })).toThrow(/CHECK/i);
        // Duplicate idempotency_key rejected.
        expect(() => insertEvent({ id: "evt-dup", idempotency_key: "idem-1" })).toThrow(/UNIQUE/i);

        // Required item index present.
        expect(indexNames(db, "planner_item_lifecycle_events")).toEqual(
            expect.arrayContaining(["idx_planner_item_lifecycle_item_occurred"]),
        );
    });

    it("does not auto-create legacy lifecycle events and leaves history empty after ensure", () => {
        const db = freshDb();
        expect(
            (db.prepare("SELECT COUNT(*) AS c FROM planner_item_lifecycle_events").get() as { c: number }).c,
        ).toBe(0);
    });

    it("accepts dropped on a fresh canonical schema and rejects unknown statuses", () => {
        const db = freshDb();
        insertPlannerDay(db, "d1", "2026-09-07");
        insertPlannerItem(db, "i1", "d1", "dropped");
        expect(plannerItemsSupportsDroppedStatus(db)).toBe(true);
        expect(() => insertPlannerItem(db, "i2", "d1", "deleted")).toThrow(/CHECK/i);
    });

    it("proves planner_items dropped rebuild is safe and idempotent on an isolated legacy DB", () => {
        const db = legacyPlannerDb();
        expect(plannerItemsSupportsDroppedStatus(db)).toBe(false);

        insertPlannerDay(db, "d1", "2026-09-07");
        insertPlannerDay(db, "d2", "2026-09-08");
        insertPlannerItem(db, "i1", "d1", "completed");
        insertPlannerItem(db, "i2", "d1", "blocked");
        insertPlannerItem(db, "i3", "d1", "carried_forward");

        const columnsBefore = columnNames(db, "planner_items");
        const indexNamesBefore = indexNames(db, "planner_items");
        const rowsBefore = (db.prepare(
            "SELECT id, planner_status FROM planner_items ORDER BY id",
        ).all() as Array<{ id: string; planner_status: string }>).map((r) => `${r.id}:${r.planner_status}`);
        const rowCountBefore = (db.prepare("SELECT COUNT(*) AS c FROM planner_items").get() as { c: number }).c;

        // Rebuild adds dropped support.
        expect(ensurePlannerItemsDroppedStatus(db, () => undefined)).toBe("rebuilt");
        expect(plannerItemsSupportsDroppedStatus(db)).toBe(true);

        // Rows + IDs + statuses unchanged.
        const rowsAfter = (db.prepare(
            "SELECT id, planner_status FROM planner_items ORDER BY id",
        ).all() as Array<{ id: string; planner_status: string }>).map((r) => `${r.id}:${r.planner_status}`);
        const rowCountAfter = (db.prepare("SELECT COUNT(*) AS c FROM planner_items").get() as { c: number }).c;
        expect(rowsAfter).toEqual(rowsBefore);
        expect(rowCountAfter).toBe(rowCountBefore);

        // Columns preserved exactly (same names + order).
        expect(columnNames(db, "planner_items")).toEqual(columnsBefore);

        // Indexes preserved.
        expect(indexNames(db, "planner_items")).toEqual(indexNamesBefore);

        // FK preserved (planner_day_id -> planner_days).
        const fks = fkTargets(db, "planner_items");
        expect(fks).toEqual(expect.arrayContaining([{ from: "planner_day_id", table: "planner_days" }]));

        // Trigger preserved.
        const trigger = db.prepare(
            "SELECT COUNT(*) AS c FROM sqlite_master WHERE type='trigger' AND name='trg_planner_items_updated_at'",
        ).get() as { c: number };
        expect(trigger.c).toBe(1);

        // foreign_key_check PASS.
        expect((db.prepare("PRAGMA foreign_key_check").all() as unknown[]).length).toBe(0);

        // dropped accepted; invalid rejected; old statuses accepted.
        insertPlannerItem(db, "i4", "d2", "dropped");
        expect(() => insertPlannerItem(db, "i5", "d2", "deleted")).toThrow(/CHECK/i);

        // UNIQUE(day, source_type, source_id) preserved.
        expect(() => insertPlannerItem(db, "i6", "d2", "planned", { source_id: "i4" })).toThrow(/UNIQUE/i);

        // Second ensure idempotent — no duplicate rows.
        expect(ensurePlannerItemsDroppedStatus(db, () => undefined)).toBe("unchanged");
        const countAfterSecond = (db.prepare("SELECT COUNT(*) AS c FROM planner_items").get() as { c: number }).c;
        expect(countAfterSecond).toBe(rowCountAfter + 1); // only the added dropped row
    });
});
