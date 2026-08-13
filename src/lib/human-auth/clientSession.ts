// ---------------------------------------------------------------------------
// WorkOS-Lite shared human-session client helpers (browser-safe)
// AUTOMATION-001-P1E.1A
// Shared 401 behavior for ordinary H1 human mutation clients. The authoritative
// decision remains server-side (getAuthenticatedHuman + assertTrustedHumanOrigin);
// these helpers only centralize redirect / UX behavior and never re-authenticate.
// ---------------------------------------------------------------------------

import { safeNextPath } from "@/lib/navigation/safeNextPath";

export const HUMAN_LOGIN_PATH = "/human/login";
export const HUMAN_LOGIN_DEFAULT_NEXT = "/operations";

export type HumanSessionResponse = {
    authenticated: boolean;
    operator?: { id: string; displayName: string; actorType: "human" };
};

export function humanLoginUrl(next?: string | null): string {
    const target = safeNextPath(next, HUMAN_LOGIN_DEFAULT_NEXT);
    return `${HUMAN_LOGIN_PATH}?next=${encodeURIComponent(target)}`;
}

export function loginRedirectTarget(next?: string | null): string {
    return safeNextPath(next, HUMAN_LOGIN_DEFAULT_NEXT);
}

export async function fetchHumanSession(): Promise<HumanSessionResponse> {
    try {
        const res = await fetch("/api/human-auth/session", {
            credentials: "same-origin",
            cache: "no-store",
        });
        if (!res.ok) return { authenticated: false };
        const body = (await res.json().catch(() => null)) as HumanSessionResponse | null;
        if (body?.authenticated === true) {
            return { authenticated: true, operator: body.operator };
        }
        return { authenticated: false };
    } catch {
        return { authenticated: false };
    }
}

export async function postHumanLogout(): Promise<{ ok: boolean }> {
    try {
        const res = await fetch("/api/human-auth/logout", {
            method: "POST",
            credentials: "same-origin",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({}),
        });
        return { ok: res.ok };
    } catch {
        return { ok: false };
    }
}

export function isHumanSessionExpiredError(body: unknown): boolean {
    if (body === null || typeof body !== "object") return false;
    const error = (body as { error?: { code?: unknown } }).error;
    if (error === null || typeof error !== "object") return false;
    return (error as { code?: unknown }).code === "HUMAN_AUTH_SESSION_INVALID";
}

export async function logoutAndRedirect(): Promise<void> {
    await postHumanLogout();
    if (typeof window !== "undefined") {
        window.location.assign(humanLoginUrl());
    }
}

/**
 * Shared fetch wrapper for H1 human-session mutation requests.
 * On 401 HUMAN_AUTH_SESSION_INVALID it redirects to login with the current path
 * as `next`. It NEVER retries or duplicates the mutation: the caller receives
 * the original response, and navigation happens instead of an automatic retry.
 * Unrelated 401 codes (other auth domains) are left untouched.
 */
export async function humanMutationFetch(
    input: RequestInfo | URL,
    init?: RequestInit,
): Promise<Response> {
    const res = await fetch(input, { credentials: "same-origin", ...init });
    if (res.status === 401 && typeof window !== "undefined") {
        const body = await res.clone().json().catch(() => null);
        if (isHumanSessionExpiredError(body)) {
            const next = window.location.pathname + window.location.search;
            window.location.assign(humanLoginUrl(next));
        }
    }
    return res;
}
