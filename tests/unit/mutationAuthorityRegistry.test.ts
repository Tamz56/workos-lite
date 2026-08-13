// P1E.1C Phase D — registry coverage guardrail.
// A new POST/PUT/PATCH/DELETE route without an explicit authority classification
// fails this test. The scan is test-time filesystem only; production runtime
// never depends on filesystem scanning.

import path from "node:path";
import { describe, expect, it } from "vitest";
import { MUTATION_AUTHORITY_REGISTRY } from "@/lib/authority/mutationAuthorityRegistry";
import { findServerActionFiles, scanRouteFiles } from "../helpers/routeScanner";

const API_ROOT = path.resolve(__dirname, "../../src/app/api");
const SRC_ROOT = path.resolve(__dirname, "../../src");

describe("mutation authority registry coverage", () => {
    it("classifies every mutation handler in src/app/api", () => {
        const scannedKeys = new Set<string>();

        for (const [relDir, methods] of scanRouteFiles(API_ROOT)) {
            for (const method of methods) {
                scannedKeys.add(`${method} api/${relDir}`);
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

    it("fails if any Server Action appears in application source (explicit authority review required)", () => {
        const serverActions = findServerActionFiles(SRC_ROOT);
        expect(
            serverActions,
            `Server Actions found outside the route-method registry — explicit authority review required before adoption:\n${serverActions.join("\n")}`,
        ).toEqual([]);
    });
});
