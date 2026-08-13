"use client";

import { useState } from "react";
import { ArrowRightOnRectangleIcon } from "@heroicons/react/24/outline";
import { logoutAndRedirect } from "@/lib/human-auth/clientSession";

export function LogoutButton({ collapsed = false }: { collapsed?: boolean }) {
    const [busy, setBusy] = useState(false);

    const handleLogout = async () => {
        if (busy) return;
        setBusy(true);
        try {
            await logoutAndRedirect();
        } finally {
            setBusy(false);
        }
    };

    return (
        <button
            type="button"
            onClick={handleLogout}
            disabled={busy}
            title="Log out"
            className={`w-full flex items-center ${collapsed ? "justify-center px-0" : "px-3"} py-2 rounded-lg text-sm font-medium text-slate-400 hover:bg-slate-800/60 hover:text-white transition-all duration-300`}
        >
            <div className="w-5 h-5 flex-shrink-0">
                <ArrowRightOnRectangleIcon className="w-5 h-5" />
            </div>
            {!collapsed && <span className="ml-3 truncate">{busy ? "Logging out…" : "Log out"}</span>}
        </button>
    );
}
