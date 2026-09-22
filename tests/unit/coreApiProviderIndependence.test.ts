import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const SOURCE_PATHS = [
    "src/lib/core-api/types.ts",
    "src/lib/core-api/projectDirectory.ts",
    "src/app/api/core/projects/route.ts",
] as const;

const BANNED_IMPORT_PATH = /(?:openai|anthropic|deepseek|mcp|model[-_/]?routing|worker[-_/]?gateway|execution[-_/]?provider|ai[-_/]?provider)/i;

function importSpecifiers(source: string): string[] {
    return [...source.matchAll(/from\s+["']([^"']+)["']/g)].map((match) => match[1]);
}

describe("WorkOS Core API provider independence", () => {
    it.each(SOURCE_PATHS)("contains no AI/execution-provider, MCP, or model-routing import: %s", (relativePath) => {
        const source = fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");
        expect(importSpecifiers(source).filter((specifier) => BANNED_IMPORT_PATH.test(specifier))).toEqual([]);
    });
});
