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

import { PATCH } from "@/app/api/planner/[date]/items/[id]/route";

let db: Database.Database;
let sessionCookie: string;

beforeEach(() => {
    db = new Database(":memory:");
    db.exec(HUMAN_AUTH_SCHEMA_SQL);
    db.exec(`
        CREATE TABLE planner_days (
            id TEXT PRIMARY KEY,
            plan_date TEXT NOT NULL UNIQUE
        );
        CREATE TABLE planner_items (
            id TEXT PRIMARY KEY,
            planner_day_id TEXT NOT NULL,
            source_type TEXT NOT NULL,
            source_id TEXT NOT NULL,
            work_mode TEXT NOT NULL,
            priority TEXT NOT NULL,
            estimated_minutes INTEGER NULL,
            start_time TEXT NULL,
            end_time TEXT NULL,
            ai_provider_key TEXT NULL,
            energy_level TEXT NULL,
            scheduled_block TEXT NULL,
            planned_order INTEGER NOT NULL,
            planner_status TEXT NOT NULL,
            is_main_task INTEGER NOT NULL
        );
        INSERT INTO planner_days (id, plan_date) VALUES ('PD-1', '2026-07-13');
        INSERT INTO planner_items VALUES (
            'PI-1', 'PD-1', 'task', 'TASK-1', 'focus', 'normal', 45,
            NULL, NULL, NULL, NULL, 'morning_focus', 0, 'planned', 0
        );
    `);
    const operatorId = seedHumanOperator(db);
    sessionCookie = createTestH2Session(db, operatorId).cookieHeader;
    vi.stubEnv("WORKOS_TRUSTED_ORIGINS", TRUSTED_ORIGIN);
    mockGetDb.mockReturnValue(db);
});

afterEach(() => {
    vi.unstubAllEnvs();
    db.close();
});
afterAll(() => { vi.restoreAllMocks(); });

async function patch(body: object) {
    const response = await PATCH(
        new NextRequest("http://localhost/api/planner/2026-07-13/items/PI-1", {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json",
                cookie: sessionCookie,
                origin: TRUSTED_ORIGIN,
            },
            body: JSON.stringify(body),
        }),
        { params: Promise.resolve({ date: "2026-07-13", id: "PI-1" }) }
    );

    if (!response) {
        throw new Error("Expected planner PATCH response");
    }

    return response;
}

describe("Planner item exact-time PATCH route", () => {
    it("adds an exact range and overrides a conflicting estimated duration", async () => {
        const response = await patch({ start_time: "09:00", end_time: "11:00", estimated_minutes: 15 });

        expect(response.status).toBe(200);
        expect(db.prepare("SELECT start_time, end_time, estimated_minutes FROM planner_items WHERE id = 'PI-1'").get()).toEqual({
            start_time: "09:00",
            end_time: "11:00",
            estimated_minutes: 120,
        });
    });

    it("clears both exact times and preserves the saved duration for manual editing", async () => {
        db.prepare("UPDATE planner_items SET start_time = ?, end_time = ?, estimated_minutes = ? WHERE id = 'PI-1'")
            .run("13:30", "15:00", 90);

        const response = await patch({ start_time: null, end_time: null });

        expect(response.status).toBe(200);
        expect(db.prepare("SELECT start_time, end_time, estimated_minutes FROM planner_items WHERE id = 'PI-1'").get()).toEqual({
            start_time: null,
            end_time: null,
            estimated_minutes: 90,
        });
    });
});
