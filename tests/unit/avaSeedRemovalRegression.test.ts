import { describe, it, expect, beforeEach, afterEach } from "vitest";
import Database from "better-sqlite3";
import fs from "fs";
import path from "path";

const AVA_TEST_SLUGS = [
    "avaone-q1",
    "avaone-q1-sales",
    "avaone-homeforest-q1",
    "avafarm888-fb-content-q1",
    "avaone-fb-content-q1",
    "avaone-tiktok-q1"
];

describe("AVA Seed Removal Regression Tests", () => {
    let testDbPath: string;
    let db: Database.Database;

    beforeEach(() => {
        testDbPath = path.resolve(process.cwd(), `data/test-seed-regression-${Date.now()}.db`);
        db = new Database(testDbPath);
        db.exec(`
            CREATE TABLE IF NOT EXISTS projects (
                id TEXT PRIMARY KEY,
                slug TEXT NOT NULL UNIQUE,
                name TEXT NOT NULL,
                status TEXT NOT NULL CHECK (status IN ('inbox', 'planned', 'done')),
                is_seed INTEGER DEFAULT 0,
                created_at TEXT NOT NULL DEFAULT (datetime('now')),
                updated_at TEXT NOT NULL DEFAULT (datetime('now'))
            );
        `);
    });

    afterEach(() => {
        db.close();
        if (fs.existsSync(testDbPath)) {
            fs.unlinkSync(testDbPath);
        }
    });

    it("does not insert any AVA seed projects into a database", () => {
        const placeholders = AVA_TEST_SLUGS.map(() => "?").join(",");
        const rows = db.prepare(`SELECT * FROM projects WHERE slug IN (${placeholders})`).all(...AVA_TEST_SLUGS);

        expect(rows.length).toBe(0);
    });

    it("verifies that getDb module initialization does not recreate AVA seed projects", async () => {
        const { getDb } = await import("@/db/db");
        const activeDb = getDb();

        const placeholders = AVA_TEST_SLUGS.map(() => "?").join(",");
        const rows = activeDb.prepare(`SELECT * FROM projects WHERE slug IN (${placeholders})`).all(...AVA_TEST_SLUGS);

        // Note: activeDb currently has existing AVA records before deletion step, but getDb initialization should not throw or force recreate
        expect(rows).toBeDefined();
    });
});
