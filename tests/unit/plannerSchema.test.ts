import Database from "better-sqlite3";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ensurePlannerSchema } from "@/lib/planner/schema";

let db: Database.Database;

beforeEach(() => {
  db = new Database(":memory:");
  db.pragma("foreign_keys = ON");
  ensurePlannerSchema(db);
});

afterEach(() => {
  db.close();
});

function tableNames(): string[] {
  return (db.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all() as Array<{ name: string }>).map(
    (row) => row.name,
  );
}

function columnNames(table: string): string[] {
  return (db.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>).map((row) => row.name);
}

function indexRows(): Array<{ name: string; sql: string }> {
  return db
    .prepare("SELECT name, sql FROM sqlite_master WHERE type = 'index' AND name LIKE 'idx_planner_%'")
    .all() as Array<{ name: string; sql: string }>;
}

function triggerRows(): Array<{ name: string; sql: string }> {
  return db
    .prepare("SELECT name, sql FROM sqlite_master WHERE type = 'trigger' AND name LIKE 'trg_planner_%'")
    .all() as Array<{ name: string; sql: string }>;
}

function insertDay(id: string, planDate: string, overrides: Record<string, unknown> = {}): void {
  db.prepare(`
    INSERT INTO planner_days (id, plan_date, main_outcome, daily_capacity_minutes, energy_level, status)
    VALUES (@id, @planDate, @main_outcome, @daily_capacity_minutes, @energy_level, @status)
  `).run({
    id,
    planDate,
    main_outcome: null,
    daily_capacity_minutes: null,
    energy_level: null,
    status: "planning",
    ...overrides,
  });
}

function insertItem(
  id: string,
  dayId: string,
  overrides: Record<string, unknown> = {},
  sourceType = "task",
  sourceId = "src-1",
): void {
  db.prepare(`
    INSERT INTO planner_items (
      id, planner_day_id, source_type, source_id, work_mode, priority,
      estimated_minutes, energy_level, scheduled_block, planned_order,
      planner_status, is_main_task
    )
    VALUES (
      @id, @planner_day_id, @source_type, @source_id, @work_mode, @priority,
      @estimated_minutes, @energy_level, @scheduled_block, @planned_order,
      @planner_status, @is_main_task
    )
  `).run({
    id,
    planner_day_id: dayId,
    source_type: sourceType,
    source_id: sourceId,
    work_mode: "focus",
    priority: "normal",
    estimated_minutes: null,
    energy_level: null,
    scheduled_block: null,
    planned_order: 0,
    planner_status: "planned",
    is_main_task: 0,
    ...overrides,
  });
}

function insertBatch(id: string, fingerprint: string, overrides: Record<string, unknown> = {}): void {
  db.prepare(`
    INSERT INTO planner_import_batches (id, fingerprint, project_id, source_text_hash, conflict_policy, result_json)
    VALUES (@id, @fingerprint, @project_id, @source_text_hash, @conflict_policy, @result_json)
  `).run({
    id,
    fingerprint,
    project_id: "proj-1",
    source_text_hash: "hash-1",
    conflict_policy: "append",
    result_json: "{}",
    ...overrides,
  });
}

describe("Planner canonical schema", () => {
  it("creates all three planner tables", () => {
    expect(tableNames()).toEqual(
      expect.arrayContaining(["planner_days", "planner_items", "planner_import_batches"]),
    );
  });

  it("creates the expected planner_days columns", () => {
    expect(columnNames("planner_days")).toEqual(
      expect.arrayContaining([
        "id",
        "plan_date",
        "main_outcome",
        "daily_capacity_minutes",
        "energy_level",
        "status",
        "created_at",
        "updated_at",
      ]),
    );
  });

  it("creates the expected planner_items columns including historical additive columns", () => {
    expect(columnNames("planner_items")).toEqual(
      expect.arrayContaining([
        "id",
        "planner_day_id",
        "source_type",
        "source_id",
        "work_mode",
        "priority",
        "estimated_minutes",
        "energy_level",
        "scheduled_block",
        "planned_order",
        "planner_status",
        "is_main_task",
        "created_at",
        "updated_at",
        "start_time",
        "end_time",
        "ai_provider_key",
      ]),
    );
  });

  it("creates the expected planner_import_batches columns", () => {
    expect(columnNames("planner_import_batches")).toEqual(
      expect.arrayContaining([
        "id",
        "fingerprint",
        "project_id",
        "source_text_hash",
        "conflict_policy",
        "result_json",
        "created_at",
      ]),
    );
  });

  it("rejects invalid energy levels", () => {
    insertDay("d1", "2026-08-01");
    expect(() => insertDay("d2", "2026-08-02", { energy_level: "extreme" })).toThrow(/CHECK/);
  });

  it("rejects invalid planner_days status", () => {
    expect(() => insertDay("d1", "2026-08-01", { status: "archived" })).toThrow(/CHECK/);
  });

  it("rejects invalid work modes", () => {
    insertDay("d1", "2026-08-01");
    expect(() => insertItem("i1", "d1", { work_mode: "zzz" })).toThrow(/CHECK/);
  });

  it("rejects invalid priorities", () => {
    insertDay("d1", "2026-08-01");
    expect(() => insertItem("i1", "d1", { priority: "urgent" })).toThrow(/CHECK/);
  });

  it("rejects invalid planner item energy levels", () => {
    insertDay("d1", "2026-08-01");
    expect(() => insertItem("i1", "d1", { energy_level: "extreme" })).toThrow(/CHECK/);
  });

  it("rejects invalid planner statuses", () => {
    insertDay("d1", "2026-08-01");
    expect(() => insertItem("i1", "d1", { planner_status: "deleted" })).toThrow(/CHECK/);
  });

  it("rejects invalid scheduled blocks", () => {
    insertDay("d1", "2026-08-01");
    expect(() => insertItem("i1", "d1", { scheduled_block: "zzz" })).toThrow(/CHECK/);
  });

  it("rejects invalid conflict policies", () => {
    expect(() => insertBatch("b1", "fp-1", { conflict_policy: "merge" })).toThrow(/CHECK/);
  });

  it("enforces planner_days plan_date uniqueness", () => {
    insertDay("d1", "2026-08-01");
    expect(() => insertDay("d2", "2026-08-01")).toThrow(/UNIQUE/);
  });

  it("enforces planner_import_batches fingerprint uniqueness", () => {
    insertBatch("b1", "fp-1");
    expect(() => insertBatch("b2", "fp-1")).toThrow(/UNIQUE/);
  });

  it("enforces idx_planner_items_no_dup uniqueness", () => {
    insertDay("d1", "2026-08-01");
    insertItem("i1", "d1");
    expect(() => insertItem("i2", "d1")).toThrow(/UNIQUE/);
  });

  it("enforces planner_items FK to planner_days", () => {
    expect(() => insertItem("i1", "missing-day")).toThrow(/FOREIGN KEY/);
  });

  it("applies ON DELETE CASCADE from planner_days to planner_items", () => {
    insertDay("d1", "2026-08-01");
    insertItem("i1", "d1");
    db.prepare("DELETE FROM planner_days WHERE id = 'd1'").run();
    expect((db.prepare("SELECT COUNT(*) AS c FROM planner_items").get() as { c: number }).c).toBe(0);
  });

  it("creates the required planner indexes including the unique no-dup index", () => {
    const indexes = indexRows();
    expect(indexes.map((row) => row.name)).toEqual(
      expect.arrayContaining([
        "idx_planner_days_plan_date",
        "idx_planner_days_status",
        "idx_planner_items_source",
        "idx_planner_items_day_order",
        "idx_planner_items_no_dup",
      ]),
    );
    const noDup = indexes.find((row) => row.name === "idx_planner_items_no_dup");
    expect(noDup?.sql).toMatch(/^CREATE UNIQUE INDEX/i);
  });

  it("creates the required planner updated_at triggers", () => {
    const triggers = triggerRows();
    expect(triggers.map((row) => row.name)).toEqual(
      expect.arrayContaining(["trg_planner_days_updated_at", "trg_planner_items_updated_at"]),
    );
    for (const trigger of triggers) {
      expect(trigger.sql).toContain("WHEN NEW.updated_at = OLD.updated_at");
    }
  });

  it("is idempotent when run repeatedly", () => {
    insertDay("d1", "2026-08-01");
    insertItem("i1", "d1");
    expect(() => ensurePlannerSchema(db)).not.toThrow();
    expect(() => ensurePlannerSchema(db)).not.toThrow();
    expect((db.prepare("SELECT COUNT(*) AS c FROM planner_days").get() as { c: number }).c).toBe(1);
    expect((db.prepare("SELECT COUNT(*) AS c FROM planner_items").get() as { c: number }).c).toBe(1);
  });

  it("converges a partial historical planner_items table by adding additive columns without dropping rows", () => {
    const partial = new Database(":memory:");
    partial.exec(`
      PRAGMA foreign_keys = ON;
      CREATE TABLE planner_days (
        id TEXT PRIMARY KEY,
        plan_date TEXT NOT NULL UNIQUE,
        main_outcome TEXT NULL,
        daily_capacity_minutes INTEGER NULL,
        energy_level TEXT NULL,
        status TEXT NOT NULL DEFAULT 'planning',
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE TABLE planner_items (
        id TEXT PRIMARY KEY,
        planner_day_id TEXT NOT NULL,
        source_type TEXT NOT NULL,
        source_id TEXT NOT NULL,
        work_mode TEXT NOT NULL,
        priority TEXT NOT NULL DEFAULT 'normal',
        estimated_minutes INTEGER NULL,
        energy_level TEXT NULL,
        scheduled_block TEXT NULL,
        planned_order INTEGER NOT NULL DEFAULT 0,
        planner_status TEXT NOT NULL DEFAULT 'planned',
        is_main_task INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      INSERT INTO planner_days (id, plan_date) VALUES ('legacy-day', '2026-08-01');
      INSERT INTO planner_items (id, planner_day_id, source_type, source_id, work_mode)
      VALUES ('legacy-item', 'legacy-day', 'task', 'src-legacy', 'focus');
    `);

    ensurePlannerSchema(partial);

    const cols = (partial.prepare("PRAGMA table_info(planner_items)").all() as Array<{ name: string }>).map(
      (row) => row.name,
    );
    expect(cols).toEqual(expect.arrayContaining(["start_time", "end_time", "ai_provider_key"]));
    expect((partial.prepare("SELECT COUNT(*) AS c FROM planner_items").get() as { c: number }).c).toBe(1);
    expect((partial.prepare("SELECT id FROM planner_items").get() as { id: string }).id).toBe("legacy-item");
    partial.close();
  });

  it("bumps updated_at via trigger when an UPDATE does not supply a new value", () => {
    db.prepare(`
      INSERT INTO planner_days (id, plan_date, main_outcome, status, created_at, updated_at)
      VALUES ('t1', '2026-08-01', NULL, 'planning', '2000-01-01 00:00:00', '2000-01-01 00:00:00')
    `).run();

    db.prepare("UPDATE planner_days SET main_outcome = 'updated' WHERE id = 't1'").run();

    const row = db.prepare("SELECT updated_at FROM planner_days WHERE id = 't1'").get() as { updated_at: string };
    expect(row.updated_at).not.toBe("2000-01-01 00:00:00");
  });
});
