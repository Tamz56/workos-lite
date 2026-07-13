"use client";

import React, { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { Command, Search, Menu } from "lucide-react";

export default function Topbar() {
    const pathname = usePathname();
    const [sidebarOpen, setSidebarOpen] = useState(false);

    useEffect(() => {
        const handleState = (e: Event) => {
            const customEvent = e as CustomEvent<boolean>;
            setSidebarOpen(customEvent.detail);
        };
        window.addEventListener("mobile-sidebar-state", handleState);
        return () => {
            window.removeEventListener("mobile-sidebar-state", handleState);
        };
    }, []);

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
        <header className="sticky top-0 z-30 flex h-16 min-w-0 items-center justify-between border-b border-white/10 bg-theme-topbar backdrop-blur-md px-4 md:px-6 shadow-[0_1px_0_0_rgba(0,0,0,0.03)] transition-theme">
            <div className="flex items-center gap-3 min-w-0">
                {/* Hamburger menu button for mobile */}
                <button
                    onClick={() => window.dispatchEvent(new CustomEvent("toggle-mobile-sidebar"))}
                    aria-expanded={sidebarOpen}
                    aria-controls="mobile-sidebar"
                    className="md:hidden p-1.5 rounded-md text-white/70 hover:text-white hover:bg-white/10 focus:outline-none flex items-center justify-center flex-shrink-0"
                    aria-label="Open menu"
                >
                    <Menu className="w-5 h-5" />
                </button>
                <h1 className="min-w-0 truncate text-lg font-bold text-white leading-none mt-0.5">{getTitle()}</h1>
            </div>

            <div className="flex min-w-0 shrink-0 items-center gap-3">
                <button 
                    onClick={() => window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true }))}
                    className="flex min-w-0 items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-white/60 transition-all hover:bg-white/10 hover:text-white group sm:px-3"
                >
                    <div className="flex min-w-0 items-center gap-1.5">
                        <Search className="w-4 h-4 text-white/60 group-hover:text-white" />
                        <span className="hidden text-sm font-medium sm:inline">Search...</span>
                    </div>
                    <div className="hidden items-center gap-1 px-1.5 py-0.5 rounded border border-white/10 bg-white/5 text-[10px] font-bold text-white/60 sm:flex">
                        <Command className="w-2.5 h-2.5" />
                        <span>K</span>
                    </div>
                </button>
            </div>
        </header>
    );
}
