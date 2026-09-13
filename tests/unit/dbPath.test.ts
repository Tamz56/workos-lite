import path from "path";
import { describe, expect, it } from "vitest";
import { resolveWorkosDbPath } from "@/db/dbPath";

describe("resolveWorkosDbPath", () => {
    it("preserves the existing cwd/data/workos.db default", () => {
        expect(resolveWorkosDbPath("/tmp/workos", undefined)).toBe(
            path.resolve("/tmp/workos", "data/workos.db"),
        );
    });

    it("treats an empty or whitespace override as unset", () => {
        expect(resolveWorkosDbPath("/tmp/workos", "   ")).toBe(
            path.resolve("/tmp/workos", "data/workos.db"),
        );
    });

    it("accepts an explicit absolute DB path", () => {
        expect(
            resolveWorkosDbPath(
                "/tmp/workos",
                "/Users/tamz/projects/workos-lite/data/../data/workos.db",
            ),
        ).toBe("/Users/tamz/projects/workos-lite/data/workos.db");
    });

    it("rejects a relative override", () => {
        expect(() =>
            resolveWorkosDbPath("/tmp/workos", "data/workos.db"),
        ).toThrow("WORKOS_DB_PATH must be an absolute path");
    });
});
