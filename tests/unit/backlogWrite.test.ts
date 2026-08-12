import Database from "better-sqlite3";
import { describe, expect, it } from "vitest";
import { CreateProjectItemSchema } from "@/lib/projects/backlogCreateSchema";
import { insertProjectItem } from "@/lib/projects/backlogWrite";

function createDb(): Database.Database {
    const db = new Database(":memory:");
    db.pragma("foreign_keys = ON");
    db.exec(`
        CREATE TABLE projects (
            id TEXT PRIMARY KEY,
            slug TEXT NOT NULL UNIQUE,
            name TEXT NOT NULL,
            status TEXT NOT NULL,
            created_at TEXT,
            updated_at TEXT
        );
        CREATE TABLE project_items (
            id TEXT PRIMARY KEY,
            project_id TEXT NOT NULL,
            title TEXT NOT NULL,
            status TEXT NOT NULL CHECK (status IN ('inbox', 'planned', 'done')),
            priority INTEGER NULL,
            schedule_bucket TEXT NULL CHECK (schedule_bucket IN ('morning', 'afternoon', 'evening', 'none') OR schedule_bucket IS NULL),
            start_date TEXT NULL,
            end_date TEXT NULL,
            is_milestone INTEGER NOT NULL DEFAULT 0,
            workstream TEXT NULL,
            dod_text TEXT NULL,
            notes TEXT NULL,
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            updated_at TEXT NOT NULL DEFAULT (datetime('now')),
            FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE
        );
    `);
    db.prepare("INSERT INTO projects (id, slug, name, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)")
        .run("p1", "project-a", "Project A", "planned", "2026-01-01", "2026-01-01");
    return db;
}

function row(db: Database.Database, id: string) {
    return db.prepare("SELECT * FROM project_items WHERE id = ?").get(id) as Record<string, unknown>;
}

describe("insertProjectItem — minimal payload", () => {
    it("persists canonical defaults for a minimal parsed payload", () => {
        const db = createDb();
        const parsed = CreateProjectItemSchema.parse({ title: "Canonical Task" });
        const id = insertProjectItem(db, "p1", parsed);
        const item = row(db, id);
        expect(item.title).toBe("Canonical Task");
        expect(item.status).toBe("planned");
        expect(item.priority).toBeNull();
        expect(item.schedule_bucket).toBeNull();
        expect(item.start_date).toBeNull();
        expect(item.end_date).toBeNull();
        expect(item.is_milestone).toBe(0);
        expect(item.workstream).toBeNull();
        expect(item.dod_text).toBeNull();
        expect(item.notes).toBeNull();
        expect(item.project_id).toBe("p1");
        db.close();
    });
});

describe("insertProjectItem — full payload", () => {
    it("persists every canonical field exactly", () => {
        const db = createDb();
        const parsed = CreateProjectItemSchema.parse({
            title: "Full Task",
            status: "done",
            priority: 3,
            schedule_bucket: "afternoon",
            start_date: "2026-08-01",
            end_date: "2026-08-31",
            is_milestone: true,
            workstream: "gf-trial",
            dod_text: "done when shipped",
            notes: "note body",
        });
        const id = insertProjectItem(db, "p1", parsed);
        const item = row(db, id);
        expect(item.title).toBe("Full Task");
        expect(item.status).toBe("done");
        expect(item.priority).toBe(3);
        expect(item.schedule_bucket).toBe("afternoon");
        expect(item.start_date).toBe("2026-08-01");
        expect(item.end_date).toBe("2026-08-31");
        expect(item.is_milestone).toBe(1);
        expect(item.workstream).toBe("gf-trial");
        expect(item.dod_text).toBe("done when shipped");
        expect(item.notes).toBe("note body");
        expect(item.project_id).toBe("p1");
        db.close();
    });
});

describe("insertProjectItem — identity and timestamps", () => {
    it("returns the persisted id and generates distinct ids per insert", () => {
        const db = createDb();
        const parsed = CreateProjectItemSchema.parse({ title: "Task" });
        const id1 = insertProjectItem(db, "p1", parsed);
        const id2 = insertProjectItem(db, "p1", parsed);
        expect(id1).toBeTruthy();
        expect(row(db, id1).id).toBe(id1);
        expect(id2).toBeTruthy();
        expect(id2).not.toBe(id1);
        db.close();
    });

    it("receives non-null created_at/updated_at from DB defaults", () => {
        const db = createDb();
        const parsed = CreateProjectItemSchema.parse({ title: "Task" });
        const id = insertProjectItem(db, "p1", parsed);
        const item = row(db, id);
        expect(item.created_at).toBeTruthy();
        expect(item.updated_at).toBeTruthy();
        db.close();
    });
});

describe("insertProjectItem — integration and separation", () => {
    it("strips unknown schema keys before persistence", () => {
        const db = createDb();
        const parsed = CreateProjectItemSchema.parse({
            title: "Unknown Field Test",
            unexpected_field: "must-not-persist",
        });
        expect("unexpected_field" in parsed).toBe(false);
        const id = insertProjectItem(db, "p1", parsed);
        const item = row(db, id);
        expect(item.title).toBe("Unknown Field Test");
        expect(item.status).toBe("planned");
        expect("unexpected_field" in item).toBe(false);
        db.close();
    });

    it("relies on FK enforcement rather than resolving the project itself", () => {
        const db = createDb();
        const parsed = CreateProjectItemSchema.parse({ title: "Task" });
        expect(() => insertProjectItem(db, "missing-project", parsed)).toThrow();
        db.close();
    });

    it("works inside a caller-owned transaction and rolls back with it", () => {
        const db = createDb();
        const parsed = CreateProjectItemSchema.parse({ title: "Rollback Task" });
        const tx = db.transaction(() => insertProjectItem(db, "p1", parsed));
        const committedId = tx();
        expect(row(db, committedId).title).toBe("Rollback Task");

        const failingTx = db.transaction(() => {
            insertProjectItem(db, "p1", parsed);
            throw new Error("boom");
        });
        expect(() => failingTx()).toThrow("boom");
        const count = db.prepare("SELECT COUNT(*) AS c FROM project_items").get() as { c: number };
        expect(count.c).toBe(1);
        db.close();
    });
});
