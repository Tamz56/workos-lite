import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const routePath = path.join(
    process.cwd(),
    "src/app/api/projects/[slug]/state/route.ts",
);
const source = fs.readFileSync(routePath, "utf8");

describe("Project-State route contract", () => {
    it("is GET-only and no-store", () => {
        expect(source).toContain("export async function GET");
        expect(source).not.toMatch(/export async function (POST|PUT|PATCH|DELETE)/);
        expect(source).toContain('"Cache-Control": "no-store"');
    });

    it("delegates canonical selection to the DB-injected read service", () => {
        expect(source).toContain("readCanonicalProjectStateBySlug(getDb(), slug)");
        expect(source).not.toContain("MAX(created_at)");
        expect(source).not.toContain("MAX(updated_at)");
    });

    it("contains no direct mutation SQL", () => {
        expect(source).not.toMatch(/\b(INSERT|UPDATE|DELETE|REPLACE|ALTER|DROP|CREATE)\b/i);
    });

    it("contains no Registry, Planner, Work Log, or Coordination fallback", () => {
        expect(source).not.toMatch(/registry/i);
        expect(source).not.toMatch(/planner/i);
        expect(source).not.toMatch(/project_doc_blocks/i);
        expect(source).not.toMatch(/coordination/i);
    });
});
