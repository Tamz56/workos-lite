// P1E-C.1 — smoke tooling operational closure (P1EC-L1/L2) guardrails.

import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { ALLOWED_EXTENSIONS } from "@/lib/uploadRules";

const REPO = path.resolve(__dirname, "../..");

describe("P1E-C.1 smoke tooling closure", () => {
    it("package.json smoke scripts reference .cjs entrypoints", () => {
        const pkg = JSON.parse(fs.readFileSync(path.join(REPO, "package.json"), "utf8"));
        expect(pkg.scripts["smoke:tasks"]).toBe("node scripts/smoke_tasks.cjs");
        expect(pkg.scripts["smoke:events"]).toBe("node scripts/smoke_events.cjs");
        expect(pkg.scripts["smoke:backup"]).toBe("node scripts/smoke_backup.cjs");
    });

    it("committed .cjs entrypoints exist and require the .cjs base helper", () => {
        for (const file of [
            "scripts/smoke_tasks.cjs",
            "scripts/smoke_events.cjs",
            "scripts/smoke_base.cjs",
            "scripts/smoke_backup.cjs",
        ]) {
            expect(fs.existsSync(path.join(REPO, file))).toBe(true);
        }
        const backup = fs.readFileSync(path.join(REPO, "scripts/smoke_backup.cjs"), "utf8");
        expect(backup).toContain("require('./smoke_base.cjs')");
        const tasks = fs.readFileSync(path.join(REPO, "scripts/smoke_tasks.cjs"), "utf8");
        expect(tasks).toContain("require('./smoke_base.cjs')");
        expect(tasks).not.toContain("require('./smoke_base')");
        expect(tasks).toContain("require('./h2-smoke-client.cjs')");
    });

    it("no stale runnable references to the old .js names remain in package.json", () => {
        const pkg = fs.readFileSync(path.join(REPO, "package.json"), "utf8");
        expect(pkg).not.toContain("smoke_tasks.js");
        expect(pkg).not.toContain("smoke_events.js");
        expect(pkg).not.toContain("smoke_backup.js");
    });

    it("sprint4 uses an env-configurable base URL and an allowed png fixture", () => {
        const src = fs.readFileSync(path.join(REPO, "scripts/test_sprint4_api.mjs"), "utf8");
        expect(src).toContain("process.env.WORKOS_SMOKE_BASE_URL");
        expect(src).toContain("test_upload.png");
        // Source of truth: src/lib/uploadRules.ts ALLOWED_EXTENSIONS.
        expect(ALLOWED_EXTENSIONS.has("png")).toBe(true);
    });
});
