"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { postHumanLogout } from "./api";

export function SignOutButton() {
    const router = useRouter();
    const [submitting, setSubmitting] = useState(false);

    const handleSignOut = async () => {
        if (submitting) return;
        setSubmitting(true);
        await postHumanLogout();
        router.replace("/human/login");
        router.refresh();
    };

    return (
        <button
            type="button"
            onClick={handleSignOut}
            disabled={submitting}
            className="rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-xs font-semibold text-neutral-600 shadow-sm transition-colors hover:bg-neutral-50 disabled:opacity-50"
        >
            {submitting ? "Signing out…" : "Sign out"}
        </button>
    );
}
