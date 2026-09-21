import { existsSync, mkdtempSync, readFileSync, rmSync, statSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import Database from "better-sqlite3";
import { afterEach, describe, expect, it } from "vitest";
import { openReadOnlyWorkosDatabase } from "@/db/readOnlyDb";

const tempDirs: string[] = [];

function makeTempDir() {
    const dir = mkdtempSync(path.join(os.tmpdir(), "workos-project-state-ro-"));
    tempDirs.push(dir);
    return dir;
}

afterEach(() => {
    for (const dir of tempDirs.splice(0)) {
        rmSync(dir, { recursive: true, force: true });
    }
});

describe("Project-State read-only database boundary", () => {
    it("opens an existing WorkOS database in read-only mode and can read a Project", () => {
        const dir = makeTempDir();
        const dbPath = path.join(dir, "workos.db");
        const writable = new Database(dbPath);
        writable.exec("CREATE TABLE projects (id TEXT PRIMARY KEY, slug TEXT NOT NULL UNIQUE)");
        writable.prepare("INSERT INTO projects (id, slug) VALUES (?, ?)").run("p-1", "astro-real-app");
        writable.close();

        const readonly = openReadOnlyWorkosDatabase(dir, dbPath);
        const row = readonly
            .prepare("SELECT id, slug FROM projects WHERE slug = ?")
            .get("astro-real-app");
        readonly.close();

        expect(row).toEqual({ id: "p-1", slug: "astro-real-app" });
    });

    it("rejects write attempts", () => {
        const dir = makeTempDir();
        const dbPath = path.join(dir, "workos.db");
        const writable = new Database(dbPath);
        writable.exec("CREATE TABLE projects (id TEXT PRIMARY KEY, slug TEXT NOT NULL UNIQUE)");
        writable.close();

        const readonly = openReadOnlyWorkosDatabase(dir, dbPath);
        expect(() =>
            readonly.prepare("INSERT INTO projects (id, slug) VALUES (?, ?)").run("p-2", "x"),
        ).toThrow(/readonly/i);
        readonly.close();
    });

    it("fails closed for a missing DB path and does not create a file", () => {
        const dir = makeTempDir();
        const missingPath = path.join(dir, "missing.db");

        expect(existsSync(missingPath)).toBe(false);
        expect(() => openReadOnlyWorkosDatabase(dir, missingPath)).toThrow();
        expect(existsSync(missingPath)).toBe(false);
    });

    it("does not change the database file size or mtime during a read", () => {
        const dir = makeTempDir();
        const dbPath = path.join(dir, "workos.db");
        const writable = new Database(dbPath);
        writable.exec("CREATE TABLE projects (id TEXT PRIMARY KEY, slug TEXT NOT NULL UNIQUE)");
        writable.prepare("INSERT INTO projects (id, slug) VALUES (?, ?)").run("p-1", "astro-real-app");
        writable.close();

        const before = statSync(dbPath);
        const readonly = openReadOnlyWorkosDatabase(dir, dbPath);
        readonly.prepare("SELECT id FROM projects WHERE slug = ?").get("astro-real-app");
        readonly.close();
        const after = statSync(dbPath);

        expect(after.size).toBe(before.size);
        expect(after.mtimeMs).toBe(before.mtimeMs);
    });

    it("has no dependency on the mutable application DB bootstrap", () => {
        const source = readFileSync(
            path.resolve(process.cwd(), "src/db/readOnlyDb.ts"),
            "utf8",
        );

        expect(source).not.toMatch(/from ["']@\/db\/db["']/);
        expect(source).toContain("readonly: true");
        expect(source).toContain("fileMustExist: true");
    });
});
