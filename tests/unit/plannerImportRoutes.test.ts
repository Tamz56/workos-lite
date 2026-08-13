import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Database from "better-sqlite3";
import { NextRequest } from "next/server";
import { HUMAN_AUTH_SCHEMA_SQL } from "@/lib/human-auth/humanAuthSchema";
import {
    createTestH2Session,
    seedHumanOperator,
    TRUSTED_ORIGIN,
} from "../helpers/humanSession";

const { mockGetDb } = vi.hoisted(() => ({ mockGetDb: vi.fn() }));
vi.mock("@/db/db", () => ({ getDb: mockGetDb }));

import { POST as previewPost } from "@/app/api/planner-import/preview/route";
import { POST as executePost } from "@/app/api/planner-import/execute/route";
import { groupPlannerItems } from "@/components/arbor-planner/plannerUi";
import { computeImportedTaskFingerprint } from "@/lib/planner-import/parser";
import type { EnrichedPlannerItem } from "@/lib/planner/types";
import { CANONICAL_ROSE_TRIAL_SCHEDULE } from "../fixtures/plannerImportCanonical";

let db: Database.Database;
let sessionCookie: string;

function createSchema() {
    db.exec(`
        PRAGMA foreign_keys = ON;

        CREATE TABLE projects (
            id TEXT PRIMARY KEY,
            slug TEXT NOT NULL UNIQUE,
            name TEXT NOT NULL
        );

        CREATE TABLE project_items (
            id TEXT PRIMARY KEY,
            project_id TEXT NOT NULL,
            title TEXT NOT NULL,
            status TEXT NOT NULL,
            start_date TEXT NULL,
            dod_text TEXT NULL,
            notes TEXT NULL,
            import_fingerprint TEXT NULL,
            FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE
        );
        CREATE UNIQUE INDEX idx_project_items_import_fingerprint
            ON project_items(import_fingerprint)
            WHERE import_fingerprint IS NOT NULL;

        CREATE TABLE planner_days (
            id TEXT PRIMARY KEY,
            plan_date TEXT NOT NULL UNIQUE,
            main_outcome TEXT NULL,
            daily_capacity_minutes INTEGER NULL,
            energy_level TEXT NULL,
            status TEXT NOT NULL DEFAULT 'planning',
            updated_at TEXT NOT NULL DEFAULT (datetime('now'))
        );

        CREATE TABLE planner_items (
            id TEXT PRIMARY KEY,
            planner_day_id TEXT NOT NULL,
            source_type TEXT NOT NULL,
            source_id TEXT NOT NULL,
            work_mode TEXT NOT NULL,
            priority TEXT NOT NULL,
            scheduled_block TEXT NULL,
            planned_order INTEGER NOT NULL,
            planner_status TEXT NOT NULL,
            FOREIGN KEY(planner_day_id) REFERENCES planner_days(id) ON DELETE CASCADE,
            UNIQUE(planner_day_id, source_type, source_id)
        );

        CREATE TABLE planner_import_batches (
            id TEXT PRIMARY KEY,
            fingerprint TEXT NOT NULL UNIQUE,
            project_id TEXT NOT NULL,
            source_text_hash TEXT NOT NULL,
            conflict_policy TEXT NOT NULL CHECK (conflict_policy IN ('append','skip')),
            result_json TEXT NOT NULL,
            created_at TEXT NOT NULL DEFAULT (datetime('now'))
        );

        INSERT INTO projects (id, slug, name) VALUES
            ('P1', 'project-one', 'Project One'),
            ('P2', 'project-two', 'Project Two');
    `);
}

beforeEach(() => {
    db = new Database(":memory:");
    createSchema();
    db.exec(HUMAN_AUTH_SCHEMA_SQL);
    const operatorId = seedHumanOperator(db);
    sessionCookie = createTestH2Session(db, operatorId).cookieHeader;
    vi.stubEnv("WORKOS_TRUSTED_ORIGINS", TRUSTED_ORIGIN);
    mockGetDb.mockReturnValue(db);
});

afterEach(() => {
    vi.unstubAllEnvs();
    db.close();
});

afterAll(() => {
    vi.restoreAllMocks();
});

function scheduleText({
    date = "23/07/2026",
    outcome = "ผลลัพธ์เดิม",
    capacity = "180",
    energy = "ปานกลาง",
    status = "Active",
    task = "ตรวจรายการอุปกรณ์"
}: Partial<{
    date: string;
    outcome: string;
    capacity: string;
    energy: string;
    status: string;
    task: string;
}> = {}) {
    return `## ${date}
Main Outcome:
${outcome}
Daily Capacity Minutes:
${capacity}
Energy Level:
${energy}
Planner Day Status:
${status}
งานหลัก:
1. ${task}`;
}

function request(url: string, body: object) {
    return new NextRequest(`http://localhost${url}`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            cookie: sessionCookie,
            origin: TRUSTED_ORIGIN,
        },
        body: JSON.stringify(body)
    });
}

function preview(body: object) {
    return previewPost(request("/api/planner-import/preview", body));
}

function execute(rawText: string, overrides: Record<string, unknown> = {}) {
    return executePost(request("/api/planner-import/execute", {
        raw_text: rawText,
        project_id: "P1",
        conflict_policy: "append",
        confirmed: true,
        ...overrides
    }));
}

function counts() {
    const count = (table: string) => (
        db.prepare(`SELECT COUNT(*) AS count FROM ${table}`).get() as { count: number }
    ).count;
    return {
        batches: count("planner_import_batches"),
        projectItems: count("project_items"),
        plannerDays: count("planner_days"),
        plannerItems: count("planner_items")
    };
}

describe("Planner import preview route", () => {
    it("rejects empty text", async () => {
        const response = await preview({ raw_text: "   " });
        expect(response.status).toBe(400);
        expect((await response.json()).error).toContain("กรุณากรอกข้อความ");
    });

    it("rejects text with zero parsed operational days", async () => {
        const response = await preview({ raw_text: "ข้อความทั่วไปที่ไม่มีหัววัน" });
        expect(response.status).toBe(400);
        expect((await response.json()).error).toContain("ไม่พบวันปฏิบัติงาน");
    });

    it("rejects a parsed day with zero tasks", async () => {
        const response = await preview({ raw_text: "## 23/07/2026\nMain Outcome:\nเตรียมงาน" });
        expect(response.status).toBe(400);
        expect((await response.json()).error).toContain("ไม่พบงาน");
    });

    it("rejects invalid numeric capacity metadata", async () => {
        const response = await preview({ raw_text: scheduleText({ capacity: "หนึ่งร้อยแปดสิบ" }) });
        expect(response.status).toBe(400);
        expect((await response.json()).error).toContain("Daily Capacity Minutes");
    });

    it("returns parser warnings and stats without import DML side effects", async () => {
        const before = counts();
        const response = await preview({ raw_text: scheduleText({ energy: "ต่ำถึงปานกลาง" }), project_id: "P1" });
        const payload = await response.json();

        expect(response.status).toBe(200);
        expect(payload.stats).toEqual({
            days_count: 1,
            project_items_count: 1,
            planner_items_count: 1,
            unresolved_range_count: 0,
            blocking_warning_count: 0
        });
        expect(payload.unresolved_warnings).toContain(
            "Unsupported Energy Level: \"ต่ำถึงปานกลาง\". Value preserved as raw metadata."
        );
        expect(counts()).toEqual(before);
    });

    it("maps กำลังปานกลาง to medium without returning an unsupported warning", async () => {
        const response = await preview({ raw_text: scheduleText({ energy: "กำลังปานกลาง" }) });
        const payload = await response.json();

        expect(response.status).toBe(200);
        expect(payload.schedule.days[0].energy_level).toBe("medium");
        expect(payload.unresolved_warnings).not.toContain(
            "Unsupported Energy Level: \"กำลังปานกลาง\". Value preserved as raw metadata."
        );
    });

    it("keeps the canonical split Schedule Period as metadata and returns 7 days with 50 tasks", async () => {
        const response = await preview({ raw_text: CANONICAL_ROSE_TRIAL_SCHEDULE });
        const payload = await response.json();

        expect(response.status).toBe(200);
        expect(payload.schedule.days.map((day: { date_text: string }) => day.date_text)).toEqual([
            "23/07/2026",
            "24/07/2026",
            "25/07/2026",
            "26/07/2026",
            "27/07/2026",
            "28/07/2026",
            "29/07/2026"
        ]);
        expect(payload.schedule.days.map((day: { tasks: unknown[] }) => day.tasks.length)).toEqual([
            7, 4, 5, 5, 6, 11, 12
        ]);
        expect(payload.schedule.total_days).toBe(7);
        expect(payload.schedule.total_tasks).toBe(50);
        expect(payload.stats).toEqual({
            days_count: 7,
            project_items_count: 50,
            planner_items_count: 50,
            unresolved_range_count: 0,
            blocking_warning_count: 0
        });
        expect(payload.schedule.overall_notes).toContain("Schedule Period:");
        expect(payload.schedule.overall_notes).toContain("23–29 กรกฎาคม 2569");
        expect(payload.schedule.days.some((day: { date_text: string }) => day.date_text.includes("23–29"))).toBe(false);
        expect(payload.schedule.days.flatMap((day: { tasks: Array<{ title: string }> }) => day.tasks)
            .some((task: { title: string }) => /^(Schedule Period|23–29 กรกฎาคม 2569)$/.test(task.title))).toBe(false);
    });
});

describe("Planner import execute route safety", () => {
    it("rejects confirmed values other than true", async () => {
        const response = await execute(scheduleText(), { confirmed: false });
        expect(response.status).toBe(400);
        expect(counts().batches).toBe(0);
    });

    it("rejects an invalid conflict policy instead of falling back to append", async () => {
        const response = await execute(scheduleText(), { conflict_policy: "overwrite" });
        expect(response.status).toBe(400);
        expect(counts().batches).toBe(0);
    });

    it("rejects an invalid default Work Block", async () => {
        const response = await execute(scheduleText(), { default_scheduled_block: "unknown_block" });

        expect(response.status).toBe(400);
        expect((await response.json()).error).toContain("default_scheduled_block");
        expect(counts()).toEqual({ batches: 0, projectItems: 0, plannerDays: 0, plannerItems: 0 });
    });

    it("rejects an unknown project", async () => {
        const response = await execute(scheduleText(), { project_id: "missing" });
        expect(response.status).toBe(404);
        expect(counts().batches).toBe(0);
    });

    it("rejects unresolved date ranges", async () => {
        const rawText = "## 26–27 กรกฎาคม 2569 — Receiving\nงานหลัก:\n1. ตรวจรับพัสดุ";
        const response = await execute(rawText);
        expect(response.status).toBe(400);
        expect((await response.json()).error).toContain("unresolved");
        expect(counts().batches).toBe(0);
    });

    it("rejects schedules with zero tasks", async () => {
        const response = await execute("## 23/07/2026\nMain Outcome:\nเตรียมงาน");
        expect(response.status).toBe(400);
        expect(counts().batches).toBe(0);
    });

    it("rejects schedules with zero operational days", async () => {
        const response = await execute("ข้อความทั่วไปที่ไม่มีหัววัน");
        expect(response.status).toBe(400);
        expect(counts().batches).toBe(0);
    });

    it("rejects invalid parsed capacity metadata", async () => {
        const response = await execute(scheduleText({ capacity: "180 นาที" }));
        expect(response.status).toBe(400);
        expect(counts().batches).toBe(0);
    });

    it("creates Project Items before attaching Planner Items and maps new-day metadata", async () => {
        const response = await execute(scheduleText());
        const payload = await response.json();

        expect(response.status).toBe(200);
        expect(counts()).toEqual({ batches: 1, projectItems: 1, plannerDays: 1, plannerItems: 1 });
        expect(db.prepare(`
            SELECT main_outcome, daily_capacity_minutes, energy_level, status
            FROM planner_days WHERE plan_date = '2026-07-23'
        `).get()).toEqual({
            main_outcome: "ผลลัพธ์เดิม",
            daily_capacity_minutes: 180,
            energy_level: "medium",
            status: "active"
        });
        expect(payload.metadata_results[0].applied_fields).toEqual([
            "main_outcome",
            "daily_capacity_minutes",
            "energy_level",
            "status"
        ]);
        const importedItem = db.prepare(`
            SELECT id, scheduled_block FROM planner_items LIMIT 1
        `).get() as EnrichedPlannerItem;
        expect(importedItem.scheduled_block).toBe("morning_focus");
        expect(groupPlannerItems([importedItem]).morning_focus).toEqual([importedItem]);
        expect(db.prepare(`
            SELECT COUNT(*) AS count
            FROM planner_items
            WHERE scheduled_block IS NULL
        `).get()).toEqual({ count: 0 });
    });

    it("assigns an explicitly selected valid Work Block", async () => {
        const response = await execute(scheduleText(), { default_scheduled_block: "evening_ai" });
        const importedItem = db.prepare(`
            SELECT id, scheduled_block FROM planner_items LIMIT 1
        `).get() as EnrichedPlannerItem;

        expect(response.status).toBe(200);
        expect(importedItem.scheduled_block).toBe("evening_ai");
        expect(groupPlannerItems([importedItem]).evening_ai).toEqual([importedItem]);
    });

    it("uses the request capacity and safe status default when day metadata is absent", async () => {
        const rawText = `## 23/07/2026
Main Outcome: เตรียมงาน
งานหลัก:
1. ตรวจรายการ`;
        const response = await execute(rawText, { daily_capacity_minutes: 75 });

        expect(response.status).toBe(200);
        expect(db.prepare(`
            SELECT daily_capacity_minutes, energy_level, status
            FROM planner_days WHERE plan_date = '2026-07-23'
        `).get()).toEqual({
            daily_capacity_minutes: 75,
            energy_level: null,
            status: "planning"
        });
    });

    it("preserves populated metadata and fills only empty fields under append", async () => {
        db.prepare(`
            INSERT INTO planner_days (
                id, plan_date, main_outcome, daily_capacity_minutes, energy_level, status
            ) VALUES ('D1', '2026-07-23', 'Existing Outcome', NULL, NULL, 'planning')
        `).run();

        const response = await execute(scheduleText({ outcome: "Imported Outcome", capacity: "240", energy: "สูง", status: "Active" }));
        const payload = await response.json();

        expect(response.status).toBe(200);
        expect(db.prepare(`
            SELECT main_outcome, daily_capacity_minutes, energy_level, status
            FROM planner_days WHERE id = 'D1'
        `).get()).toEqual({
            main_outcome: "Existing Outcome",
            daily_capacity_minutes: 240,
            energy_level: "high",
            status: "planning"
        });
        expect(payload.metadata_results[0]).toEqual({
            plan_date: "2026-07-23",
            applied_fields: ["daily_capacity_minutes", "energy_level"],
            preserved_fields: ["main_outcome", "status"]
        });
    });

    it("does not duplicate unchanged tasks when only non-task metadata changes", async () => {
        const first = await execute(scheduleText({ outcome: "Outcome A" }));
        expect(first.status).toBe(200);

        const second = await execute(scheduleText({ outcome: "Outcome B", capacity: "240" }));
        const payload = await second.json();

        expect(second.status).toBe(200);
        expect(payload.duplicate).not.toBe(true);
        expect(payload.created_project_items).toEqual([]);
        expect(payload.created_planner_items).toEqual([]);
        expect(payload.skipped_planner_items).toBe(1);
        expect(counts()).toEqual({ batches: 2, projectItems: 1, plannerDays: 1, plannerItems: 1 });
    });

    it("reuses an existing imported Project Item and Planner Item under append", async () => {
        const taskTitle = "ตรวจรายการอุปกรณ์";
        const taskFingerprint = computeImportedTaskFingerprint("P1", "2026-07-23", taskTitle);
        db.prepare(`
            INSERT INTO project_items (
                id, project_id, title, status, start_date, import_fingerprint
            ) VALUES ('PI1', 'P1', ?, 'planned', '2026-07-23', ?)
        `).run(taskTitle, taskFingerprint);
        db.prepare(`
            INSERT INTO planner_days (id, plan_date, status)
            VALUES ('D1', '2026-07-23', 'planning')
        `).run();
        db.prepare(`
            INSERT INTO planner_items (
                id, planner_day_id, source_type, source_id, work_mode, priority, planned_order, planner_status
            ) VALUES ('PLI1', 'D1', 'project_item', 'PI1', 'production', 'normal', 1, 'planned')
        `).run();

        const response = await execute(scheduleText({ task: taskTitle }));
        const payload = await response.json();

        expect(response.status).toBe(200);
        expect(payload.created_project_items).toEqual([]);
        expect(payload.created_planner_items).toEqual([]);
        expect(payload.skipped_planner_items).toBe(1);
        expect(db.prepare("SELECT scheduled_block FROM planner_items WHERE id = 'PLI1'").get()).toEqual({
            scheduled_block: "morning_focus"
        });
        expect(counts()).toEqual({ batches: 1, projectItems: 1, plannerDays: 1, plannerItems: 1 });
    });

    it("skip creates no Project Items or Planner Items for an existing date", async () => {
        db.prepare("INSERT INTO planner_days (id, plan_date, status) VALUES ('D1', '2026-07-23', 'planning')").run();

        const response = await execute(scheduleText(), { conflict_policy: "skip" });
        const payload = await response.json();

        expect(response.status).toBe(200);
        expect(payload.skipped_days).toEqual(["2026-07-23"]);
        expect(counts()).toEqual({ batches: 1, projectItems: 0, plannerDays: 1, plannerItems: 0 });
    });

    it("returns the previous batch result for an identical schedule and policy without writes", async () => {
        const firstResponse = await execute(scheduleText());
        const firstPayload = await firstResponse.json();
        const beforeDuplicate = counts();

        const duplicateResponse = await execute(scheduleText());
        const duplicatePayload = await duplicateResponse.json();

        expect(duplicateResponse.status).toBe(200);
        expect(duplicatePayload.batch_id).toBe(firstPayload.batch_id);
        expect(duplicatePayload.duplicate).toBe(true);
        expect(duplicatePayload.message).toBe("ไม่ได้นำเข้าซ้ำ — แสดงผลการนำเข้าครั้งก่อน");
        expect(counts()).toEqual(beforeDuplicate);
    });

    it("rolls back the batch, Project Item, Planner Day, and Planner Item on failure", async () => {
        db.exec(`
            CREATE TRIGGER fail_planner_item_insert
            BEFORE INSERT ON planner_items
            BEGIN
                SELECT RAISE(ABORT, 'forced planner item failure');
            END;
        `);
        const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);

        const response = await execute(scheduleText());

        expect(response.status).toBe(500);
        expect(counts()).toEqual({ batches: 0, projectItems: 0, plannerDays: 0, plannerItems: 0 });
        errorSpy.mockRestore();
    });

    it("keeps the same task title distinct on different dates", async () => {
        const rawText = `${scheduleText({ date: "23/07/2026", task: "ตรวจรายการ" })}
---
${scheduleText({ date: "24/07/2026", task: "ตรวจรายการ" })}`;

        const response = await execute(rawText);

        expect(response.status).toBe(200);
        expect(counts()).toEqual({ batches: 1, projectItems: 2, plannerDays: 2, plannerItems: 2 });
        const fingerprints = db.prepare("SELECT import_fingerprint FROM project_items ORDER BY start_date").all();
        expect(new Set(fingerprints.map(row => (row as { import_fingerprint: string }).import_fingerprint)).size).toBe(2);
    });

    it("keeps the same task title distinct across projects", async () => {
        const rawText = scheduleText({ task: "ตรวจรายการ" });

        expect((await execute(rawText, { project_id: "P1" })).status).toBe(200);
        expect((await execute(rawText, { project_id: "P2" })).status).toBe(200);

        expect(counts()).toEqual({ batches: 2, projectItems: 2, plannerDays: 1, plannerItems: 2 });
        expect(db.prepare("SELECT COUNT(DISTINCT import_fingerprint) AS count FROM project_items").get()).toEqual({ count: 2 });
    });
});
