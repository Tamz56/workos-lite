import fs from "node:fs";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockOpenReadOnly, mockReadDirectory } = vi.hoisted(() => ({
    mockOpenReadOnly: vi.fn(),
    mockReadDirectory: vi.fn(),
}));

vi.mock("@/db/readOnlyDb", () => ({
    openReadOnlyWorkosDatabase: mockOpenReadOnly,
}));

vi.mock("@/lib/core-api/projectDirectory", () => ({
    readCoreProjectDirectory: mockReadDirectory,
}));

import { GET } from "@/app/api/core/projects/route";

const routePath = path.join(process.cwd(), "src/app/api/core/projects/route.ts");
const source = fs.readFileSync(routePath, "utf8");

describe("WorkOS Core API project-directory route contract", () => {
    beforeEach(() => {
        mockOpenReadOnly.mockReset();
        mockReadDirectory.mockReset();
    });

    it("is GET-only, no-store, and contains no direct mutation SQL", () => {
        expect(source).toContain("export async function GET");
        expect(source).not.toMatch(/export async function (POST|PUT|PATCH|DELETE)/);
        expect(source).toContain('"Cache-Control": "no-store"');
        expect(source).not.toMatch(/\b(INSERT|UPDATE|DELETE|REPLACE|ALTER|DROP|CREATE)\b/i);
    });

    it("uses the read-only DB boundary and closes the DB on success", async () => {
        const close = vi.fn();
        const db = { close };
        mockOpenReadOnly.mockReturnValue(db);
        mockReadDirectory.mockReturnValue({
            schemaVersion: "workos-core.v0.1",
            projects: [],
        });

        const response = await GET();
        expect(response.status).toBe(200);
        expect(response.headers.get("Cache-Control")).toBe("no-store");
        expect(mockReadDirectory).toHaveBeenCalledWith(db);
        expect(close).toHaveBeenCalledTimes(1);
    });

    it("fails closed with 503 and no-store when the read-only DB cannot be opened", async () => {
        mockOpenReadOnly.mockImplementation(() => {
            throw new Error("read unavailable");
        });

        const response = await GET();
        expect(response.status).toBe(503);
        expect(response.headers.get("Cache-Control")).toBe("no-store");
        expect(await response.json()).toEqual({
            schemaVersion: "workos-core.v0.1",
            error: "READ_UNAVAILABLE",
        });
        expect(mockReadDirectory).not.toHaveBeenCalled();
    });

    it("fails closed and still closes the DB when directory projection fails", async () => {
        const close = vi.fn();
        const db = { close };
        mockOpenReadOnly.mockReturnValue(db);
        mockReadDirectory.mockImplementation(() => {
            throw new Error("projection unavailable");
        });

        const response = await GET();
        expect(response.status).toBe(503);
        expect(response.headers.get("Cache-Control")).toBe("no-store");
        expect(close).toHaveBeenCalledTimes(1);
    });

    it("does not use the writable DB boundary", () => {
        expect(source).toContain('from "@/db/readOnlyDb"');
        expect(source).not.toMatch(/from ["']@\/db\/db["']/);
        expect(source).toContain("openReadOnlyWorkosDatabase()");
        expect(source).toContain("readCoreProjectDirectory(db)");
        expect(source).toContain("db?.close()");
    });
});
