import { readFileSync, statSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";
import { parseWorkOSProjectFieldWorkbook } from "@/lib/project-import/workbookParser";
import { validWorkbook } from "../fixtures/projectFieldSheetFixtures";

const PARSER_MODULE_FILES = [
    "src/lib/project-import/workbookParser.ts",
    "src/lib/project-import/metadataParser.ts",
    "src/lib/project-import/projectDocumentationNormalizer.ts",
    "src/lib/project-import/backlogNormalizer.ts",
    "src/lib/project-import/normalize.ts",
    "src/lib/project-import/constants.ts",
    "src/lib/project-import/types.ts",
    "src/lib/project-import/validationIssues.ts",
];

describe("Gate 2 parser no-write guarantee", () => {
    it("returns noWritePerformed: true", async () => {
        const result = await parseWorkOSProjectFieldWorkbook(await validWorkbook());
        expect(result.noWritePerformed).toBe(true);
    });

    it("has no static dependency on the database, repository, or API layer", () => {
        for (const file of PARSER_MODULE_FILES) {
            const source = readFileSync(path.resolve(process.cwd(), file), "utf8");
            expect(source).not.toMatch(/from ["']@\/db\/db["']/);
            expect(source).not.toMatch(/from ["']@\/app\/api/);
            expect(source).not.toMatch(/project-doc-blocks\/repository/);
            expect(source).not.toMatch(/better-sqlite3/);
        }
    });

    it("does not touch data/workos.db while parsing", async () => {
        const dbPath = path.resolve(process.cwd(), "data/workos.db");
        const before = statSync(dbPath);
        await parseWorkOSProjectFieldWorkbook(await validWorkbook());
        const after = statSync(dbPath);
        expect(after.size).toBe(before.size);
        expect(after.mtimeMs).toBe(before.mtimeMs);
    });
});
