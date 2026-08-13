import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("/api/agent/proxy removal", () => {
    it("route file no longer exists", () => {
        const route = path.resolve(__dirname, "../../src/app/api/agent/proxy/route.ts");
        expect(fs.existsSync(route)).toBe(false);
    });

    it("proxy route is no longer protected by the middleware config", () => {
        const middleware = fs.readFileSync(path.resolve(__dirname, "../../src/proxy.ts"), "utf8");
        expect(middleware).not.toContain("/api/agent/proxy");
    });
});
