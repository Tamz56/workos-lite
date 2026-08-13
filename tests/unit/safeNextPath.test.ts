import { describe, expect, it } from "vitest";
import { safeNextPath } from "@/lib/navigation/safeNextPath";

const FALLBACK = "/operations";

describe("safeNextPath", () => {
    it("accepts internal absolute paths", () => {
        expect(safeNextPath("/projects", FALLBACK)).toBe("/projects");
        expect(safeNextPath("/tasks?filter=today", FALLBACK)).toBe("/tasks?filter=today");
        expect(safeNextPath("/", FALLBACK)).toBe("/");
        expect(safeNextPath("/operations", FALLBACK)).toBe("/operations");
    });

    it("falls back for null / undefined / empty", () => {
        expect(safeNextPath(null, FALLBACK)).toBe(FALLBACK);
        expect(safeNextPath(undefined, FALLBACK)).toBe(FALLBACK);
        expect(safeNextPath("", FALLBACK)).toBe(FALLBACK);
        expect(safeNextPath("   ", FALLBACK)).toBe(FALLBACK);
    });

    it("rejects absolute external URLs", () => {
        expect(safeNextPath("https://evil.example", FALLBACK)).toBe(FALLBACK);
        expect(safeNextPath("http://evil.example/path", FALLBACK)).toBe(FALLBACK);
    });

    it("rejects protocol-relative URLs", () => {
        expect(safeNextPath("//evil.example", FALLBACK)).toBe(FALLBACK);
        expect(safeNextPath("//evil.example/path", FALLBACK)).toBe(FALLBACK);
    });

    it("rejects backslash and mixed separators", () => {
        expect(safeNextPath("/\\evil.example", FALLBACK)).toBe(FALLBACK);
        expect(safeNextPath("\\evil.example", FALLBACK)).toBe(FALLBACK);
    });

    it("rejects script / data schemes", () => {
        expect(safeNextPath("javascript:alert(1)", FALLBACK)).toBe(FALLBACK);
        expect(safeNextPath("data:text/html,<script>1</script>", FALLBACK)).toBe(FALLBACK);
    });

    it("rejects control characters", () => {
        expect(safeNextPath("/projects\u0000", FALLBACK)).toBe(FALLBACK);
    });
});
