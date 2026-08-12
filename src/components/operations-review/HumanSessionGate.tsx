"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { fetchHumanSession } from "./api";
import type { HumanSession } from "./types";

const HumanSessionContext = createContext<HumanSession | null>(null);

export function useHumanSession(): HumanSession | null {
    return useContext(HumanSessionContext);
}

export function HumanSessionGate({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const [human, setHuman] = useState<HumanSession | null>(null);
    const [checking, setChecking] = useState(true);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            const result = await fetchHumanSession();
            if (cancelled) return;
            if (result.ok && result.data.authenticated === true) {
                setHuman(result.data.operator);
                setChecking(false);
            } else {
                setChecking(false);
                router.replace("/human/login");
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [router]);

    if (checking || !human) {
        return (
            <div className="p-6 text-sm text-neutral-400" role="status" aria-live="polite">
                Checking session…
            </div>
        );
    }

    return <HumanSessionContext.Provider value={human}>{children}</HumanSessionContext.Provider>;
}
