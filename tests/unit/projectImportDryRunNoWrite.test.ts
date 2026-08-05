import { readFileSync, statSync, unlinkSync } from "fs";
import os from "os";
import path from "path";
import Database from "better-sqlite3";
import { afterEach, describe, expect, it } from "vitest";
import { runWorkOSProjectFieldDryRun } from "@/lib/project-import/dryRunAssembler";
import { createDryRunTestDatabase, seedProject } from "../fixtures/dryRunTestDb";
import { validWorkbook } from "../fixtures/projectFieldSheetFixtures";

const DRY_RUN_MODULE_FILES = [
    "src/lib/project-import/dryRunAssembler.ts",
    "src/lib/project-import/readOnlyAdapter.ts",
    "src/lib/project-import/projectResolver.ts",
    "src/lib/project-import/projectDocumentationClassifier.ts",
    "src/lib/project-import/backlogClassifier.ts",
    "src/lib/project-import/dryRunSummary.ts",
    "src/lib/project-import/dryRunTypes.ts",
];

const tempFiles: string[] = [];

afterEach(() => {
    for (const file of tempFiles.splice(0)) {
        try {
            unlinkSync(file);
        } catch {
            // ignore
        }
    }
});

describe("Gate 3 dry-run no-write guarantee", () => {
    it("has no static dependency on schema-mutating database modules or write SQL", () => {
        for (const file of DRY_RUN_MODULE_FILES) {
            const source = readFileSync(path.resolve(process.cwd(), file), "utf8");
            expect(source).not.toMatch(/from ["']@\/db\/db["']/);
            expect(source).not.toMatch(/from ["']@\/app\/api/);
            expect(source).not.toMatch(/INSERT INTO/);
            expect(source).not.toMatch(/UPDATE projects/);
            expect(source).not.toMatch(/DELETE FROM/);
            expect(source).not.toMatch(/CREATE TABLE/);
            expect(source).not.toMatch(/ALTER TABLE/);
        }
    });

    it("does not change business row counts or records in an isolated database", async () => {
        const db = createDryRunTestDatabase();
        seedProject(db, "p-example", "example-project-slug", "Example");

        const count = (table: string) => (db.prepare(`SELECT COUNT(*) AS c FROM ${table}`).get() as { c: number }).c;
        const before = {
            projects: count("projects"),
            docBlocks: count("project_doc_blocks"),
            items: count("project_items"),
        };
        const recordBefore = JSON.stringify(db.prepare("SELECT * FROM projects WHERE slug = ?").get("example-project-slug"));

        const workbook = await validWorkbook();
        const result = await runWorkOSProjectFieldDryRun({ workbook, sourceFilename: "fixture.xlsx" }, { db });

        expect(result.noWritePerformed).toBe(true);
        expect(count("projects")).toBe(before.projects);
        expect(count("project_doc_blocks")).toBe(before.docBlocks);
        expect(count("project_items")).toBe(before.items);
        expect(JSON.stringify(db.prepare("SELECT * FROM projects WHERE slug = ?").get("example-project-slug"))).toBe(recordBefore);
        db.close();
    });

    it("does not create import audit rows or other new tables", async () => {
        const db = createDryRunTestDatabase();
        seedProject(db, "p-example", "example-project-slug", "Example");
        await runWorkOSProjectFieldDryRun({ workbook: await validWorkbook() }, { db });
        const tables = (db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all() as Array<{ name: string }>).map((row) => row.name);
        expect(tables).not.toContain("import_batches");
        expect(tables).toEqual(["projects", "project_doc_blocks", "project_items"]);
        db.close();
    });

    it("does not mutate the fixture workbook bytes", async () => {
        const db = createDryRunTestDatabase();
        seedProject(db, "p-example", "example-project-slug", "Example");
        const workbook = await validWorkbook();
        const before = Buffer.from(workbook);
        await runWorkOSProjectFieldDryRun({ workbook }, { db });
        expect(workbook.equals(before)).toBe(true);
        db.close();
    });

    it("opens a truly read-only connection that rejects writes", async () => {
        const tempPath = path.join(os.tmpdir(), `workos-dryrun-ro-${Date.now()}.db`);
        tempFiles.push(tempPath);
        const writable = new Database(tempPath);
        writable.exec("CREATE TABLE projects (id TEXT PRIMARY KEY, slug TEXT UNIQUE, name TEXT NOT NULL)");
        writable.prepare("INSERT INTO projects (id, slug, name) VALUES (?, ?, ?)").run("p1", "example-project-slug", "Example");
        writable.close();

        const before = statSync(tempPath);
        const readonly = new Database(tempPath, { readonly: true, fileMustExist: true });
        const row = readonly.prepare("SELECT slug FROM projects WHERE slug = ?").get("example-project-slug");
        expect(row).toEqual({ slug: "example-project-slug" });
        expect(() => readonly.prepare("INSERT INTO projects (id, slug, name) VALUES (?, ?, ?)").run("p2", "x", "X")).toThrow(/readonly/i);
        readonly.close();
        const after = statSync(tempPath);
        expect(after.size).toBe(before.size);
        expect(after.mtimeMs).toBe(before.mtimeMs);
    });
});
