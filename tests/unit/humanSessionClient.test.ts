import { afterEach, describe, expect, it, vi } from "vitest";
import {
    humanLoginUrl,
    isHumanSessionExpiredError,
    loginRedirectTarget,
    postHumanLogout,
    humanMutationFetch,
} from "@/lib/human-auth/clientSession";

afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
});

describe("humanLoginUrl", () => {
    it("defaults to /operations when next is absent", () => {
        expect(humanLoginUrl()).toBe("/human/login?next=%2Foperations");
        expect(humanLoginUrl(null)).toBe("/human/login?next=%2Foperations");
    });

    it("encodes internal next paths", () => {
        expect(humanLoginUrl("/projects")).toBe("/human/login?next=%2Fprojects");
    });

    it("normalizes unsafe next values to the default", () => {
        expect(humanLoginUrl("https://evil.example")).toBe("/human/login?next=%2Foperations");
        expect(humanLoginUrl("//evil.example")).toBe("/human/login?next=%2Foperations");
        expect(humanLoginUrl("javascript:alert(1)")).toBe("/human/login?next=%2Foperations");
    });
});

describe("loginRedirectTarget", () => {
    it("keeps /operations compatibility as the default", () => {
        expect(loginRedirectTarget(undefined)).toBe("/operations");
        expect(loginRedirectTarget(null)).toBe("/operations");
        expect(loginRedirectTarget("/operations")).toBe("/operations");
    });

    it("returns the internal path when provided", () => {
        expect(loginRedirectTarget("/projects")).toBe("/projects");
    });

    it("never returns an external target", () => {
        expect(loginRedirectTarget("//evil.example")).toBe("/operations");
        expect(loginRedirectTarget("https://evil.example")).toBe("/operations");
    });
});

describe("isHumanSessionExpiredError", () => {
    it("detects HUMAN_AUTH_SESSION_INVALID", () => {
        expect(
            isHumanSessionExpiredError({
                ok: false,
                error: { code: "HUMAN_AUTH_SESSION_INVALID", message: "Human authentication required", status: 401 },
            }),
        ).toBe(true);
    });

    it("ignores unrelated 401 codes and non-error bodies", () => {
        expect(
            isHumanSessionExpiredError({
                ok: false,
                error: { code: "OPS_APPROVAL_AUTH_REQUIRED", message: "x", status: 401 },
            }),
        ).toBe(false);
        expect(isHumanSessionExpiredError(null)).toBe(false);
        expect(isHumanSessionExpiredError("nope")).toBe(false);
    });
});

describe("postHumanLogout", () => {
    it("returns ok on 2xx", async () => {
        vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 200 })));
        await expect(postHumanLogout()).resolves.toEqual({ ok: true });
    });

    it("returns not-ok on failure", async () => {
        vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network")));
        await expect(postHumanLogout()).resolves.toEqual({ ok: false });
    });
});

describe("humanMutationFetch", () => {
    it("redirects to login with current path on HUMAN_AUTH_SESSION_INVALID 401", async () => {
        const assign = vi.fn();
        vi.stubGlobal("window", { location: { assign, pathname: "/projects", search: "" } });
        vi.stubGlobal(
            "fetch",
            vi.fn().mockResolvedValue(
                new Response(JSON.stringify({ ok: false, error: { code: "HUMAN_AUTH_SESSION_INVALID" } }), {
                    status: 401,
                    headers: { "Content-Type": "application/json" },
                }),
            ),
        );

        const res = await humanMutationFetch("/api/tasks", { method: "POST" });
        expect(res.status).toBe(401);
        expect(assign).toHaveBeenCalledWith("/human/login?next=%2Fprojects");
    });

    it("does not redirect for unrelated 401 codes", async () => {
        const assign = vi.fn();
        vi.stubGlobal("window", { location: { assign, pathname: "/projects", search: "" } });
        vi.stubGlobal(
            "fetch",
            vi.fn().mockResolvedValue(
                new Response(JSON.stringify({ ok: false, error: { code: "AGENT_AUTH_REQUIRED" } }), {
                    status: 401,
                    headers: { "Content-Type": "application/json" },
                }),
            ),
        );

        const res = await humanMutationFetch("/api/operations", { method: "POST" });
        expect(res.status).toBe(401);
        expect(assign).not.toHaveBeenCalled();
    });

    it("does not redirect on success", async () => {
        const assign = vi.fn();
        vi.stubGlobal("window", { location: { assign, pathname: "/projects", search: "" } });
        vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 200 })));

        const res = await humanMutationFetch("/api/tasks", { method: "POST" });
        expect(res.status).toBe(200);
        expect(assign).not.toHaveBeenCalled();
    });
});
