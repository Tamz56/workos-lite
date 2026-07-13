import { describe, expect, it } from "vitest";
import Database from "better-sqlite3";

function setup() { const db = new Database(":memory:"); db.exec(`CREATE TABLE planner_days (id TEXT PRIMARY KEY, plan_date TEXT UNIQUE); CREATE TABLE planner_items (id TEXT PRIMARY KEY, planner_day_id TEXT, source_id TEXT); INSERT INTO planner_days VALUES ('D1','2026-07-15'),('D2','2026-07-16'); INSERT INTO planner_items VALUES ('I1','D1','T1'),('I2','D2','T2');`); return db; }
describe("recommendation read semantics", () => {
    it("recommendation-style GET creates no records", () => { const db = setup(); const before = (db.prepare("SELECT COUNT(*) count FROM planner_items").get() as { count: number }).count; db.prepare("SELECT * FROM planner_items WHERE planner_day_id = ?").all("D1"); expect((db.prepare("SELECT COUNT(*) count FROM planner_items").get() as { count: number }).count).toBe(before); db.close(); });
    it("missing Planner Day returns no selected row", () => { const db = setup(); expect(db.prepare("SELECT * FROM planner_days WHERE plan_date = ?").get("2026-07-20")).toBeUndefined(); db.close(); });
    it("selected date only loads items from that Planner Day", () => { const db = setup(); const day = db.prepare("SELECT id FROM planner_days WHERE plan_date = ?").get("2026-07-15") as { id: string }; const rows = db.prepare("SELECT source_id FROM planner_items WHERE planner_day_id = ?").all(day.id) as { source_id: string }[]; expect(rows.map(row => row.source_id)).toEqual(["T1"]); db.close(); });
});
