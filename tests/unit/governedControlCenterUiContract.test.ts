import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const HOST_PATH = path.resolve(
    process.cwd(),
    "src/components/arbor-desk/CommandCenterPanel.tsx",
);
const VIEW_PATH = path.resolve(
    process.cwd(),
    "src/components/arbor-desk/GovernedControlCenterView.tsx",
);

const hostSource = readFileSync(HOST_PATH, "utf8");
const viewSource = readFileSync(VIEW_PATH, "utf8");

describe("ACC-P4 governed Control Center UI contract", () => {
    it("mounts the governed view inside the existing CommandCenterPanel host", () => {
        expect(hostSource).toContain(
            'import GovernedControlCenterView from "@/components/arbor-desk/GovernedControlCenterView"',
        );
        expect(hostSource).toContain("<GovernedControlCenterView />");
    });

    it("consumes only the governed P3 Control Center endpoint for the new view", () => {
        expect(viewSource).toContain(
            'fetch("/api/arbor-desk/control-center", { cache: "no-store" })',
        );
        expect(viewSource).not.toContain('/api/tasks?limit=300');
        expect(viewSource).not.toContain('/api/content/writing-lab/projects');
        expect(viewSource).not.toContain('/api/arbor-inbox');
    });

    it("does not introduce API mutation methods", () => {
        for (const method of ["POST", "PUT", "PATCH", "DELETE"]) {
            expect(viewSource).not.toMatch(
                new RegExp(`method\\s*:\\s*[\\\"']${method}[\\\"']`, "i"),
            );
        }
    });

    it("keeps Registry metadata separate from canonical state and authoritative next action", () => {
        expect(viewSource).toContain("registryMetadata");
        expect(viewSource).toContain("canonicalProjectState");
        expect(viewSource).toContain("nextAuthoritativeAction");
        expect(viewSource).toContain("Registry next action");
        expect(viewSource).toContain("Canonical Project State");
        expect(viewSource).toContain("Next Authoritative Action");
    });

    it("renders explicit source, authority, availability, and currentness disclosure", () => {
        expect(viewSource).toContain("Source:");
        expect(viewSource).toContain("Authority:");
        expect(viewSource).toContain("AVAILABLE");
        expect(viewSource).toContain("NOT_AVAILABLE");
        expect(viewSource).toContain("UNKNOWN");
        expect(viewSource).toContain("CURRENT_WITHIN_SOURCE");
        expect(viewSource).toContain("NOT_PROVEN");
    });

    it("uses explicit Planner status values for Now, Waiting, Blocked, and Review surfaces", () => {
        for (const status of ["doing", "ready", "waiting", "blocked", "review"]) {
            expect(viewSource).toContain(`"${status}"`);
        }
        expect(viewSource).toContain("is_main_task === 1");
        expect(viewSource).toContain("No Today state is inferred");
    });

    it("keeps unavailable execution and dependency evidence visible without inventing activity", () => {
        expect(viewSource).toContain("executionEvidence");
        expect(viewSource).toContain("Dedicated dependency projection");
        expect(viewSource).toContain("No governed execution activity is available in this projection.");
    });
});
