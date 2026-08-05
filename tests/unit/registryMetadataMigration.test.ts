import { readFileSync } from "fs";
import path from "path";
import Database from "better-sqlite3";
import { describe, expect, it } from "vitest";
import { ensureProjectRegistryMetadataColumns } from "@/lib/projects/registryMetadata";

type EnsureDatabase = Parameters<typeof ensureProjectRegistryMetadataColumns>[0];

const REGISTRY_COLUMNS = [
    "category",
    "registry_status",
    "priority",
    "current_goal",
    "progress_stage",
    "next_action",
    "cadence",
    "risk_or_blocked_by",
    "metadata_updated_at",
];

function minimalProjectsTable(db: Database.Database): void {
    db.exec("CREATE TABLE projects (id TEXT PRIMARY KEY, slug TEXT NOT NULL UNIQUE, name TEXT NOT NULL, status TEXT NOT NULL)");
}

function tableColumns(db: Database.Database): string[] {
    return (db.prepare("PRAGMA table_info(projects)").all() as Array<{ name: string }>).map((row) => row.name);
}

describe("ensureProjectRegistryMetadataColumns", () => {
    it("adds all registry columns to an existing database missing them", () => {
        const db = new Database(":memory:");
        minimalProjectsTable(db);
        const added = ensureProjectRegistryMetadataColumns(db as unknown as EnsureDatabase);
        expect(added).toEqual(REGISTRY_COLUMNS);
        for (const column of REGISTRY_COLUMNS) {
            expect(tableColumns(db)).toContain(column);
        }
        db.close();
    });

    it("is a no-op when all columns already exist", () => {
        const db = new Database(":memory:");
        minimalProjectsTable(db);
        ensureProjectRegistryMetadataColumns(db as unknown as EnsureDatabase);
        const second = ensureProjectRegistryMetadataColumns(db as unknown as EnsureDatabase);
        expect(second).toEqual([]);
        db.close();
    });

    it("accepts a duplicate-column race only after re-verifying the column exists", () => {
        const present = new Set(["id", "slug"]);
        const execCalls: string[] = [];
        const database: EnsureDatabase = {
            prepare: (sql: string) => {
                if (sql.startsWith("PRAGMA table_info(projects)")) {
                    return { all: () => Array.from(present, (name) => ({ name })) };
                }
                throw new Error(`unexpected prepare: ${sql}`);
            },
            exec: (sql: string) => {
                execCalls.push(sql);
                if (sql.includes("progress_stage")) {
                    if (!present.has("progress_stage")) {
                        // Another worker wins the race between our check and our ALTER.
                        present.add("progress_stage");
                        throw new Error("SqliteError: duplicate column name: progress_stage");
                    }
                    return;
                }
                const match = /ADD COLUMN (\w+)/.exec(sql);
                if (match) present.add(match[1]);
            },
        };

        const added = ensureProjectRegistryMetadataColumns(database);
        expect(added).not.toContain("progress_stage");
        expect(added).toContain("category");
        expect(execCalls.some((sql) => sql.includes("progress_stage"))).toBe(true);
    });

    it("re-throws a duplicate-column error when the expected column is still absent", () => {
        const database: EnsureDatabase = {
            prepare: () => ({ all: () => [{ name: "id" }, { name: "slug" }] }),
            exec: () => {
                throw new Error("SqliteError: duplicate column name: progress_stage");
            },
        };
        expect(() => ensureProjectRegistryMetadataColumns(database)).toThrow(/duplicate column name/);
    });

    it("re-throws unrelated SQLite errors", () => {
        const database: EnsureDatabase = {
            prepare: () => ({ all: () => [{ name: "id" }] }),
            exec: () => {
                throw new Error("database is locked");
            },
        };
        expect(() => ensureProjectRegistryMetadataColumns(database)).toThrow(/database is locked/);
    });
});

describe("canonical schema", () => {
    it("includes all registry columns for newly created databases", () => {
        const db = new Database(":memory:");
        db.exec(readFileSync(path.resolve(process.cwd(), "src/db/schema.sql"), "utf8"));
        for (const column of REGISTRY_COLUMNS) {
            expect(tableColumns(db)).toContain(column);
        }
        db.close();
    });
});
