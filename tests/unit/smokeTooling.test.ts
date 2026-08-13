// P1E.2 / R1-I2 — H2-aware smoke tooling helper logic (deterministic,
// injected request impl; no live server, no live DB).

import { createRequire } from "node:module";
import { afterEach, describe, expect, it, vi } from "vitest";

const require = createRequire(import.meta.url);
const {
    defaultBaseUrl,
    defaultOrigin,
    requireHumanPassword,
    loginHuman,
    logoutHuman,
    h2Headers,
} = require("../../scripts/h2-smoke-client.cjs") as {
    defaultBaseUrl: () => string;
    defaultOrigin: () => string;
    requireHumanPassword: () => string;
    loginHuman: (opts?: Record<string, unknown>) => Promise<{
        baseUrl: string;
        origin: string;
        cookie: string;
    }>;
    logoutHuman: (ctx: { baseUrl: string; origin: string; cookie: string }, opts?: Record<string, unknown>) => Promise<void>;
    h2Headers: (ctx: { origin: string; cookie: string }) => { cookie: string; origin: string };
};

afterEach(() => {
    vi.unstubAllEnvs();
});

function okRequestImpl(): ReturnType<typeof vi.fn> {
    return vi.fn(async () => ({
        statusCode: 200,
        headers: { "set-cookie": ["workos_human_session=TOKEN; Path=/; HttpOnly"] },
        text: JSON.stringify({ ok: true }),
    }));
}

describe("h2-smoke-client loginHuman", () => {
    it("logs in with a real H2 contract and returns the session cookie", async () => {
        const requestImpl = okRequestImpl();
        const ctx = await loginHuman({
            baseUrl: "http://localhost:3000",
            origin: "http://localhost:3000",
            password: "correct-horse-battery-staple",
            requestImpl,
        });
        expect(ctx.cookie).toBe("workos_human_session=TOKEN");
        expect(ctx.origin).toBe("http://localhost:3000");
        const [url, options] = requestImpl.mock.calls[0];
        expect(String(url)).toContain("/api/human-auth/login");
        expect((options as { headers: Record<string, string> }).headers.origin).toBe(
            "http://localhost:3000",
        );
    });

    it("uses the configured origin and never prints the password", async () => {
        const requestImpl = okRequestImpl();
        const ctx = await loginHuman({
            baseUrl: "https://workos.example",
            origin: "https://workos.example",
            password: "secret-password",
            requestImpl,
        });
        expect(ctx.origin).toBe("https://workos.example");
        const [, options] = requestImpl.mock.calls[0];
        const body = (options as { body: string }).body;
        expect(body).toContain("secret-password");
        expect(JSON.stringify(requestImpl.mock.calls)).not.toContain("workos_human_session=TOKEN");
    });

    it("fails clearly on a non-200 login response", async () => {
        const requestImpl = vi.fn(async () => ({
            statusCode: 401,
            headers: {},
            text: JSON.stringify({ ok: false, error: { code: "HUMAN_AUTH_INVALID_CREDENTIALS", message: "Invalid credentials" } }),
        }));
        await expect(
            loginHuman({ baseUrl: "http://localhost:3000", password: "bad", requestImpl }),
        ).rejects.toThrow(/H2 login failed \(401\)/);
    });

    it("requires WORKOS_HUMAN_PASSWORD when not provided and fails with setup guidance", async () => {
        vi.stubEnv("WORKOS_HUMAN_PASSWORD", "");
        await expect(loginHuman({ baseUrl: "http://localhost:3000" })).rejects.toThrow(
            /WORKOS_HUMAN_PASSWORD is required/,
        );
    });
});

describe("h2-smoke-client helpers", () => {
    it("defaults to localhost and configurable env targets", () => {
        vi.stubEnv("WORKOS_SMOKE_BASE_URL", "https://workos.example");
        vi.stubEnv("WORKOS_SMOKE_ORIGIN", "https://workos.example");
        expect(defaultBaseUrl()).toBe("https://workos.example");
        expect(defaultOrigin()).toBe("https://workos.example");
    });

    it("requireHumanPassword fails without env", () => {
        vi.stubEnv("WORKOS_HUMAN_PASSWORD", "");
        expect(() => requireHumanPassword()).toThrow(/WORKOS_HUMAN_PASSWORD is required/);
    });

    it("h2Headers returns cookie + origin only", () => {
        expect(h2Headers({ cookie: "workos_human_session=TOKEN", origin: "http://localhost:3000" })).toEqual({
            cookie: "workos_human_session=TOKEN",
            origin: "http://localhost:3000",
        });
    });

    it("logoutHuman sends the session and swallows failures", async () => {
        const requestImpl = vi.fn(async () => ({ statusCode: 200, headers: {}, text: "{}" }));
        await logoutHuman(
            { baseUrl: "http://localhost:3000", origin: "http://localhost:3000", cookie: "workos_human_session=TOKEN" },
            { requestImpl },
        );
        expect(requestImpl).toHaveBeenCalledTimes(1);
        const [, options] = requestImpl.mock.calls[0];
        expect(String(options.headers.cookie)).toContain("workos_human_session=TOKEN");
    });
});
