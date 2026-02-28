"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function AgentLoginPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    // Default to /agent or the redirect target
    const [nextUrl, setNextUrl] = useState("/agent");

    useEffect(() => {
        const next = searchParams.get("next");
        if (next && next.startsWith("/")) {
            setNextUrl(next);
        }
    }, [searchParams]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!password.trim()) {
            setErrorMsg("Please enter a password.");
            return;
        }

        setLoading(true);
        setErrorMsg(null);

        try {
            const res = await fetch("/api/agent/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ password, next: nextUrl })
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || "Login failed");
            }

            // Successful login, router push
            router.push(data.redirect || "/agent");
            router.refresh();
        } catch (e: any) {
            setErrorMsg(e.message || "An unexpected error occurred.");
            setLoading(false);
        }
    };

    return (
        <div className="w-full min-h-[80vh] flex items-center justify-center p-6 bg-neutral-50/50">
            <div className="w-full max-w-sm bg-white border border-neutral-200/70 p-8 rounded-2xl shadow-sm">
                <div className="text-center mb-8">
                    <div className="w-12 h-12 bg-neutral-900 rounded-xl flex items-center justify-center text-white text-xl mx-auto mb-4 shadow-inner">
                        🔒
                    </div>
                    <h1 className="text-2xl font-bold font-display text-neutral-900 tracking-tight">Agent Access</h1>
                    <p className="text-sm text-neutral-500 mt-2">Protected environment</p>
                </div>

                {errorMsg && (
                    <div className="mb-6 p-3 bg-red-50 border border-red-100 rounded-lg text-xs text-red-800 font-medium text-center">
                        {errorMsg}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] uppercase font-bold tracking-wider text-neutral-500 ml-1">
                            Access Password
                        </label>
                        <input
                            type="password"
                            placeholder="Enter password..."
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="bg-neutral-50 border border-neutral-200 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-mono placeholder:font-sans"
                            autoFocus
                            autoComplete="current-password"
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={loading}
                        className="mt-2 w-full bg-neutral-900 hover:bg-neutral-800 text-white font-semibold py-2.5 rounded-lg text-sm transition-all shadow-sm active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none"
                    >
                        {loading ? "Verifying..." : "Unlock Access"}
                    </button>
                </form>
            </div>
        </div>
    );
}
