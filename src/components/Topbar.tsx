"use client";

import { usePathname, useRouter } from "next/navigation";
import { Plus, Layout, CheckCircle2, MoreHorizontal, ChevronDown, CalendarPlus, Zap, Bot, List, Search, Command } from "lucide-react";
import { useState } from "react";

export default function Topbar() {
    const pathname = usePathname();
    const router = useRouter();
    const [showMore, setShowMore] = useState(false);

    const getTitle = () => {
        if (pathname === "/dashboard") return "Dashboard";
        if (pathname === "/inbox") return "Inbox";
        if (pathname === "/today") return "Today";
        if (pathname === "/done") return "Done";
        if (pathname === "/planner") return "Today";
        if (pathname.startsWith("/docs")) return "Notes";
        if (pathname.startsWith("/projects")) return "Projects";
        if (pathname.startsWith("/timeline")) return "Timeline";
        if (pathname.startsWith("/sprints")) return "Sprints";
        if (pathname.startsWith("/workspaces")) return "Areas";
        return "WorkOS";
    };

    const renderActions = () => {
        // We move primary actions to the PageHeader of each page to avoid duplication and clutter.
        // Topbar stays minimal now.
        return null;
    };

    return (
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-neutral-200 bg-white/80 backdrop-blur-md px-4 md:px-6 shadow-[0_1px_0_0_rgba(0,0,0,0.03)]">
            <h1 className="text-lg font-bold text-neutral-900">{getTitle()}</h1>
            <div className="flex items-center gap-3">
                <button 
                    onClick={() => window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true }))}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-neutral-200 bg-neutral-50/50 hover:bg-white hover:border-neutral-300 transition-all text-neutral-500 hover:text-neutral-700 group"
                >
                    <div className="flex items-center gap-1.5">
                        <Search className="w-4 h-4 text-neutral-400 group-hover:text-neutral-500" />
                        <span className="text-sm font-medium">Search...</span>
                    </div>
                    <div className="flex items-center gap-1 px-1.5 py-0.5 rounded border border-neutral-200 bg-white text-[10px] font-bold">
                        <Command className="w-2.5 h-2.5" />
                        <span>K</span>
                    </div>
                </button>
                {renderActions()}
            </div>
        </header>
    );
}
