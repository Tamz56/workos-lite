import { beforeEach, afterEach, afterAll, describe, expect, it, vi } from "vitest";
import Database from "better-sqlite3";
import { NextRequest } from "next/server";

const { mockGetDb } = vi.hoisted(() => ({ mockGetDb: vi.fn() }));
vi.mock("@/db/db", () => ({ getDb: mockGetDb }));

import { GET } from "@/app/api/ai-resources/route";
import { PATCH } from "@/app/api/ai-resources/[id]/route";

let db: Database.Database;

beforeEach(() => {
    db = new Database(":memory:");
    db.exec(`CREATE TABLE ai_resource_profiles (id TEXT PRIMARY KEY, provider_key TEXT UNIQUE, display_name TEXT, availability TEXT, remaining_percent INTEGER, reset_at TEXT, cost_tier TEXT, notes TEXT, created_at TEXT, updated_at TEXT);
        INSERT INTO ai_resource_profiles VALUES ('AI-1','codex','Codex','high',80,NULL,'medium',NULL,datetime('now'),datetime('now'));`);
    mockGetDb.mockReturnValue(db);
});

afterAll(() => { vi.restoreAllMocks(); });
afterEach(() => { db.close(); });

function patch(body: object) {
    return PATCH(new NextRequest("http://localhost/api/ai-resources/AI-1", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }), { params: Promise.resolve({ id: "AI-1" }) });
}

describe("AI resource route regressions", () => {
    it("GET remains no-write", async () => { const before = db.prepare("SELECT * FROM ai_resource_profiles ORDER BY id").all(); const response = await GET(); expect(response.status).toBe(200); expect(db.prepare("SELECT * FROM ai_resource_profiles ORDER BY id").all()).toEqual(before); });
    it("PATCH notes only preserves availability", async () => { const response = await patch({ notes: "หมายเหตุใหม่" }); expect(response.status).toBe(200); const row = db.prepare("SELECT availability, notes FROM ai_resource_profiles WHERE id = 'AI-1'").get() as { availability: string; notes: string }; expect(row).toEqual({ availability: "high", notes: "หมายเหตุใหม่" }); });
    it("empty PATCH returns the unchanged profile", async () => { const before = db.prepare("SELECT * FROM ai_resource_profiles WHERE id = 'AI-1'").get(); const response = await patch({}); expect(response.status).toBe(200); expect(await response.json()).toEqual(before); expect(db.prepare("SELECT * FROM ai_resource_profiles WHERE id = 'AI-1'").get()).toEqual(before); });
    it("explicit availability PATCH updates the value", async () => { const response = await patch({ availability: "low" }); expect(response.status).toBe(200); expect((db.prepare("SELECT availability FROM ai_resource_profiles WHERE id = 'AI-1'").get() as { availability: string }).availability).toBe("low"); });
    it("PATCH rejects provider_key changes", async () => { const response = await patch({ provider_key: "gemini" }); expect(response.status).toBe(400); expect((db.prepare("SELECT provider_key FROM ai_resource_profiles WHERE id = 'AI-1'").get() as { provider_key: string }).provider_key).toBe("codex"); });
});
