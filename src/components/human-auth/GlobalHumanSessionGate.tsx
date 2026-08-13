"use client";

import React, { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { fetchHumanSession } from "@/lib/human-auth/clientSession";
import { resolveHumanGate } from "@/lib/human-auth/globalGate";

/**
 * Global navigation/UX login boundary for ordinary WorkOS pages.
 *
 * The authoritative security boundary for API mutation routes is route-level
 * (P1E.1B / P1E.1C use requireHumanMutation). This gate only enforces that an
 * unauthenticated browser user is sent to /human/login?next=<path>; it never
 * treats cookie presence as authorization.
 */
export function GlobalHumanSessionGate({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const pathname = usePathname();
    const [sessionChecked, setSessionChecked] = useState(false);
    const [authenticated, setAuthenticated] = useState(false);

    useEffect(() => {
        let cancelled = false;
        void (async () => {
            const session = await fetchHumanSession();
            if (cancelled) return;
            setAuthenticated(session.authenticated);
            setSessionChecked(true);
        })();
        return () => {
            cancelled = true;
        };
    }, []);

    const state = resolveHumanGate(sessionChecked, authenticated, pathname ?? "");

    useEffect(() => {
        if (state.kind === "redirect") {
            router.replace(state.to);
        }
    }, [state, router]);

    if (state.kind === "checking" || state.kind === "redirect") {
        return (
            <div
                role="status"
                aria-live="polite"
                className="flex min-h-screen items-center justify-center bg-slate-950 text-sm text-slate-400"
            >
                {state.kind === "checking" ? "Checking session…" : "Redirecting to login…"}
            </div>
        );
    }

    return <>{children}</>;
}
