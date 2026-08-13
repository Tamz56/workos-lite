import { describe, expect, it } from "vitest";
import { loginRedirectTarget } from "@/lib/human-auth/clientSession";

describe("Human login next redirect", () => {
    it("redirects to the requested internal page after login", () => {
        expect(loginRedirectTarget("/projects")).toBe("/projects");
        expect(loginRedirectTarget("/workspaces/content/writing-lab")).toBe(
            "/workspaces/content/writing-lab",
        );
    });

    it("preserves the /operations default when next is absent", () => {
        expect(loginRedirectTarget(undefined)).toBe("/operations");
    });

    it("never allows external or script redirect targets", () => {
        expect(loginRedirectTarget("https://evil.example")).toBe("/operations");
        expect(loginRedirectTarget("//evil.example")).toBe("/operations");
        expect(loginRedirectTarget("javascript:alert(1)")).toBe("/operations");
    });
});
