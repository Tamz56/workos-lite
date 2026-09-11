import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const ROUTE_PATH = path.resolve(
    process.cwd(),
    "src/app/api/arbor-desk/control-center/route.ts",
);

const source = readFileSync(ROUTE_PATH, "utf8");

describe("Control Center route contract", () => {
    it("exposes GET only with no mutation handlers", () => {
        expect(source).toContain("export async function GET");

        for (const method of ["POST", "PUT", "PATCH", "DELETE"]) {
            expect(source).not.toMatch(
                new RegExp(`export\\s+(?:async\\s+)?function\\s+${method}\\b`),
            );
        }
    });

    it("delegates projection construction to the governed read service", () => {
        expect(source).toContain(
            'import { buildControlCenterProjection } from "@/lib/arbor-desk/controlCenterProjection"',
        );
        expect(source).toContain(
            "buildControlCenterProjection(getDb(), date)",
        );
    });

    it("contains no direct database mutation SQL", () => {
        expect(source).not.toMatch(
            /\b(INSERT\s+INTO|UPDATE\s+\w+|DELETE\s+FROM|CREATE\s+TABLE|ALTER\s+TABLE|DROP\s+TABLE)\b/i,
        );
    });

    it("rejects malformed explicit dates and disables response caching", () => {
        expect(source).toContain(
            "Invalid date format. Expected YYYY-MM-DD.",
        );
        expect(source).toContain("{ status: 400 }");
        expect(source).toContain(
            '"Cache-Control": "no-store, max-age=0"',
        );
    });

    it("returns a bounded safe error instead of leaking internal errors", () => {
        expect(source).toContain(
            '{ error: "CONTROL_CENTER_READ_UNAVAILABLE" }',
        );
        expect(source).toContain("{ status: 500 }");
    });
});
