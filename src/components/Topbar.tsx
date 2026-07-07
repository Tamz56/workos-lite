"use client";

import { usePathname } from "next/navigation";
import { Command, Search } from "lucide-react";

export default function Topbar() {
    const pathname = usePathname();

    const getTitle = () => {
        if (pathname === "/dashboard") return "Dashboard";
        if (pathname === "/inbox") return "Inbox";
        if (pathname === "/today") return "Today";
        if (pathname === "/done") return "Done";
        if (pathname === "/planner") return "Today";
        if (pathname.startsWith("/docs")) return "Docs";
        if (pathname.startsWith("/projects")) return "Projects";
        if (pathname.startsWith("/timeline")) return "Timeline";
        if (pathname.startsWith("/sprints")) return "Sprints";
        
        // Specific Content Routes
        if (pathname.startsWith("/workspaces/content/writing-desk-lite")) return "Writing Desk Lite";
        if (pathname.startsWith("/workspaces/content/gf-hub")) return "GF Content Hub";
        if (pathname.startsWith("/workspaces/content/article-studio")) return "Article Studio";
        if (pathname.startsWith("/workspaces/content/writing-lab")) return "Writing Lab";
        if (pathname.startsWith("/workspaces/astro-strategy")) return "Astro Strategy Lab";
        if (pathname.startsWith("/workspaces/prompt-studio")) return "Prompt Studio";
        
        if (pathname.startsWith("/workspaces")) return "Areas";
        if (pathname.startsWith("/settings")) return "Settings";
        return "WorkOS";
    };

    return (
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-white/10 bg-theme-topbar backdrop-blur-md px-4 md:px-6 shadow-[0_1px_0_0_rgba(0,0,0,0.03)] transition-theme">
            <h1 className="text-lg font-bold text-white">{getTitle()}</h1>
            <div className="flex items-center gap-3">
                <button 
                    onClick={() => window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true }))}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 transition-all text-white/60 hover:text-white group"
                >
                    <div className="flex items-center gap-1.5">
                        <Search className="w-4 h-4 text-white/60 group-hover:text-white" />
                        <span className="text-sm font-medium">Search...</span>
                    </div>
                    <div className="flex items-center gap-1 px-1.5 py-0.5 rounded border border-white/10 bg-white/5 text-[10px] font-bold text-white/60">
                        <Command className="w-2.5 h-2.5" />
                        <span>K</span>
                    </div>
                </button>
            </div>
        </header>
    );
}
