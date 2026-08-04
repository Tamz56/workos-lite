import { describe, expect, it } from "vitest";
import Database from "better-sqlite3";
import { aiProviderExists } from "@/lib/planner/provider";

describe("Planner AI provider validation", () => {
    it("accepts null and existing provider references", () => { const db = new Database(":memory:"); db.exec("CREATE TABLE ai_resource_profiles (id TEXT PRIMARY KEY, provider_key TEXT UNIQUE); INSERT INTO ai_resource_profiles VALUES ('1','codex')"); expect(aiProviderExists(db, null)).toBe(true); expect(aiProviderExists(db, "codex")).toBe(true); db.close(); });
    it("rejects a missing provider reference for POST/PATCH validation", () => { const db = new Database(":memory:"); db.exec("CREATE TABLE ai_resource_profiles (id TEXT PRIMARY KEY, provider_key TEXT UNIQUE)"); expect(aiProviderExists(db, "missing")).toBe(false); db.close(); });
});
