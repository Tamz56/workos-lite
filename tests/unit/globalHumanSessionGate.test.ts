import { describe, expect, it } from "vitest";
import { resolveHumanGate } from "@/lib/human-auth/globalGate";

describe("resolveHumanGate", () => {
    it("shows checking state until the server session check completes", () => {
        expect(resolveHumanGate(false, false, "/dashboard")).toEqual({ kind: "checking" });
        expect(resolveHumanGate(false, true, "/dashboard")).toEqual({ kind: "checking" });
    });

    it("renders children for an authenticated session", () => {
        expect(resolveHumanGate(true, true, "/dashboard")).toEqual({ kind: "render" });
    });

    it("redirects unauthenticated users with the current path as next", () => {
        expect(resolveHumanGate(true, false, "/dashboard")).toEqual({
            kind: "redirect",
            to: "/human/login?next=%2Fdashboard",
        });
        expect(resolveHumanGate(true, false, "/projects/abc")).toEqual({
            kind: "redirect",
            to: "/human/login?next=%2Fprojects%2Fabc",
        });
    });

    it("uses the default target for the root path", () => {
        expect(resolveHumanGate(true, false, "/")).toEqual({
            kind: "redirect",
            to: "/human/login?next=%2Foperations",
        });
    });
});
