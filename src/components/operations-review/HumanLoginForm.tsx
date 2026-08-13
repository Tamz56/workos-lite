"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { fetchHumanSession, postHumanLogin } from "./api";
import { loginRedirectTarget } from "@/lib/human-auth/clientSession";

type LoginState = "idle" | "submitting";
type LoginError = "invalid" | "network" | "internal" | null;

export function HumanLoginForm({ next }: { next?: string | null }) {
    const router = useRouter();
    const [password, setPassword] = useState("");
    const [state, setState] = useState<LoginState>("idle");
    const [error, setError] = useState<LoginError>(null);
    const [checking, setChecking] = useState(true);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            const result = await fetchHumanSession();
            if (cancelled) return;
            if (result.ok && result.data.authenticated === true) {
                router.replace(loginRedirectTarget(next));
            } else {
                setChecking(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [router, next]);

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        if (state === "submitting") return;
        if (!password) {
            setError("invalid");
            return;
        }
        setState("submitting");
        setError(null);

        const result = await postHumanLogin(password);
        if (result.ok) {
            router.replace(loginRedirectTarget(next));
            router.refresh();
            return;
        }
        if (result.status === 0) {
            setError("network");
        } else {
            setError("invalid");
        }
        setState("idle");
    };

    if (checking) {
        return (
            <div className="w-full min-h-[80vh] flex items-center justify-center text-sm text-neutral-500">
                Checking session…
            </div>
        );
    }

    const errorText =
        error === "network"
            ? "Unable to connect. Please try again."
            : error === "invalid"
              ? "Sign-in failed. Please check your password and try again."
              : null;

    return (
        <div className="w-full min-h-[80vh] flex items-center justify-center p-6 bg-neutral-50/50">
            <div className="w-full max-w-sm bg-white border border-neutral-200/70 p-8 rounded-2xl shadow-sm">
                <div className="text-center mb-8">
                    <div className="w-12 h-12 bg-neutral-900 rounded-xl flex items-center justify-center text-white text-xl mx-auto mb-4 shadow-inner">
                        A
                    </div>
                    <h1 className="text-2xl font-bold text-neutral-900 tracking-tight">WorkOS-Lite</h1>
                    <p className="text-sm text-neutral-500 mt-2">Human Operator Access</p>
                </div>

                {errorText && (
                    <div
                        role="alert"
                        className="mb-6 p-3 bg-red-50 border border-red-100 rounded-lg text-xs text-red-800 font-medium text-center"
                    >
                        {errorText}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    <div className="flex flex-col gap-1.5">
                        <label
                            htmlFor="human-password"
                            className="text-[10px] uppercase font-bold tracking-wider text-neutral-500 ml-1"
                        >
                            Password
                        </label>
                        <input
                            id="human-password"
                            type="password"
                            autoComplete="current-password"
                            placeholder="Enter password..."
                            value={password}
                            onChange={(event) => setPassword(event.target.value)}
                            autoFocus
                            className="bg-neutral-50 border border-neutral-200 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={state === "submitting"}
                        className="mt-2 w-full bg-neutral-900 hover:bg-neutral-800 text-white font-semibold py-2.5 rounded-lg text-sm transition-all shadow-sm active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none"
                    >
                        {state === "submitting" ? "Signing in…" : "Sign In"}
                    </button>
                </form>
            </div>
        </div>
    );
}
