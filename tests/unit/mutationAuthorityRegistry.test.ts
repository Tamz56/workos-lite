// P1E.1C Phase D — registry coverage guardrail.
// A new POST/PUT/PATCH/DELETE route without an explicit authority classification
// fails this test. The scan is test-time filesystem only; production runtime
// never depends on filesystem scanning.

import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { MUTATION_AUTHORITY_REGISTRY } from "@/lib/authority/mutationAuthorityRegistry";

const API_ROOT = path.resolve(__dirname, "../../src/app/api");
const MUTATION_RE = /export\s+(?:async\s+)?function\s+(POST|PUT|PATCH|DELETE)\s*\(/g;

function routeFiles(dir: string): string[] {
    const out: string[] = [];
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            out.push(...routeFiles(full));
        } else if (entry.name === "route.ts") {
            out.push(full);
        }
    }
    return out;
}

describe("mutation authority registry coverage", () => {
    it("classifies every mutation handler in src/app/api", () => {
        const scannedKeys = new Set<string>();

        for (const file of routeFiles(API_ROOT)) {
            const relDir = path.relative(API_ROOT, path.dirname(file)).split(path.sep).join("/");
            const source = fs.readFileSync(file, "utf8");
            let match: RegExpExecArray | null;
            MUTATION_RE.lastIndex = 0;
            while ((match = MUTATION_RE.exec(source)) !== null) {
                const method = match[1];
                const key = `${method} api/${relDir}`;
                scannedKeys.add(key);
            }
        }

        expect(scannedKeys.size).toBeGreaterThan(0);

        const registryKeys = Object.keys(MUTATION_AUTHORITY_REGISTRY);

        // Every scanned mutation handler must have exactly one explicit classification.
        const unclassified = [...scannedKeys].filter((key) => !MUTATION_AUTHORITY_REGISTRY[key]);
        expect(unclassified).toEqual([]);

        // No stale registry entries: registry must not describe routes that no longer exist.
        const extraRegistry = registryKeys.filter((key) => !scannedKeys.has(key));
        expect(extraRegistry).toEqual([]);

        // Registry and scanned inventory must be one-to-one.
        expect(registryKeys.length).toBe(scannedKeys.size);

        // Classification-count summary is generated from the registry itself:
        // the per-class counts must partition every entry exactly once.
        const counts: Record<string, number> = {};
        for (const cls of Object.values(MUTATION_AUTHORITY_REGISTRY)) {
            counts[cls] = (counts[cls] ?? 0) + 1;
        }
        const sum = Object.values(counts).reduce((a, b) => a + b, 0);
        expect(sum).toBe(registryKeys.length);
    });
});
