"use client";

import React, { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import {
    CalendarIcon,
    ChartBarIcon,
    FolderIcon,
    HomeIcon,
    InboxIcon,
    Cog6ToothIcon,
    BriefcaseIcon,
    ClockIcon,
    QueueListIcon,
    ChevronLeftIcon,
    ChevronRightIcon,
    DocumentTextIcon,
    PencilSquareIcon
} from "@heroicons/react/24/outline";

const STORAGE_KEY = "workos.sidebar.collapsed";

// Helper for consistent Nav Items
function NavItem(props: { 
    href: string; 
    icon: React.ReactNode; 
    label: string; 
    active?: boolean;
    isCollapsed?: boolean;
}) {
    return (
        <a
            href={props.href}
            title={props.isCollapsed ? props.label : ""}
            className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${props.active
                ? "bg-theme-nav-active text-white"
                : "text-white/70 hover:bg-theme-nav-hover hover:text-white"
                } ${props.isCollapsed ? "justify-center px-0" : ""}`}
        >
            <div className="w-5 h-5 flex-shrink-0">{props.icon}</div>
            {!props.isCollapsed && <span className="truncate">{props.label}</span>}
        </a>
    );
}

export function Sidebar() {
    const pathname = usePathname();
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [isHydrated, setIsHydrated] = useState(false);

    useEffect(() => {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved !== null) {
            setIsCollapsed(saved === "true");
        }
        setIsHydrated(true);
    }, []);

    const toggleCollapse = () => {
        const newState = !isCollapsed;
        setIsCollapsed(newState);
        localStorage.setItem(STORAGE_KEY, String(newState));
    };

    // Avoid flash of expanded sidebar during hydration
    if (!isHydrated) {
        return <aside className="w-56 bg-theme-sidebar border-r border-white/10 h-screen sticky top-0 z-40" />;
    }

    return (
        <aside className={`${isCollapsed ? "w-18" : "w-56"} bg-theme-sidebar border-r border-white/10 shadow-[1px_0_0_rgba(0,0,0,0.03)] flex flex-col h-screen sticky top-0 z-40 transition-all duration-300 transition-theme overflow-hidden`}>
            {/* Logo */}
            <div className={`h-16 flex items-center ${isCollapsed ? "justify-center px-0" : "px-6"} border-b border-white/10 mb-4 transition-all duration-300`}>
                {isCollapsed ? (
                    <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center font-bold text-white text-xs">AD</div>
                ) : (
                    <div className="flex flex-col leading-none">
                        <span className="text-lg font-bold text-white">ArborDesk</span>
                        <span className="text-[10px] text-white/50 font-medium tracking-wide">WorkOS-Lite</span>
                    </div>
                )}
            </div>

            {/* Navigation */}
            <nav className={`flex-1 ${isCollapsed ? "px-2" : "px-4"} space-y-1 transition-all duration-300`}>
                <NavItem
                    href="/dashboard"
                    label="Home"
                    icon={<HomeIcon className="w-5 h-5" />}
                    active={pathname === "/dashboard"}
                    isCollapsed={isCollapsed}
                />
                <NavItem
                    href="/projects"
                    label="Projects"
                    icon={<BriefcaseIcon className="w-5 h-5" />}
                    active={pathname.startsWith("/projects")}
                    isCollapsed={isCollapsed}
                />
                <NavItem
                    href="/timeline"
                    label="Timeline"
                    icon={<ClockIcon className="w-5 h-5" />}
                    active={pathname === "/timeline"}
                    isCollapsed={isCollapsed}
                />
                <NavItem
                    href="/sprints"
                    label="Sprints"
                    icon={<QueueListIcon className="w-5 h-5" />}
                    active={pathname.startsWith("/sprints")}
                    isCollapsed={isCollapsed}
                />
                <NavItem
                    href="/planner"
                    label="Today"
                    icon={<CalendarIcon className="w-5 h-5" />}
                    active={pathname === "/planner"}
                    isCollapsed={isCollapsed}
                />
                <NavItem
                    href="/inbox"
                    label="Inbox"
                    icon={<InboxIcon className="w-5 h-5" />}
                    active={pathname === "/inbox"}
                    isCollapsed={isCollapsed}
                />
                <NavItem
                    href="/workspaces"
                    label="Areas"
                    icon={<ChartBarIcon className="w-5 h-5" />}
                    active={pathname.startsWith("/workspaces")}
                    isCollapsed={isCollapsed}
                />
                <NavItem
                    href="/notes"
                    label="Notes"
                    icon={<FolderIcon className="w-5 h-5" />}
                    active={pathname.startsWith("/notes")}
                    isCollapsed={isCollapsed}
                />
                <NavItem
                    href="/workspaces/content/gf-hub"
                    label="GF Content Hub"
                    icon={<BriefcaseIcon className="w-5 h-5" />}
                    active={pathname.startsWith("/workspaces/content/gf-hub")}
                    isCollapsed={isCollapsed}
                />
                <NavItem
                    href="/workspaces/content/article-studio"
                    label="Article Studio"
                    icon={<DocumentTextIcon className="w-5 h-5" />}
                    active={pathname.startsWith("/workspaces/content/article-studio")}
                    isCollapsed={isCollapsed}
                />
                <NavItem
                    href="/workspaces/content/writing-lab"
                    label="Writing Lab"
                    icon={<PencilSquareIcon className="w-5 h-5" />}
                    active={pathname.startsWith("/workspaces/content/writing-lab")}
                    isCollapsed={isCollapsed}
                />
            </nav>

            {/* Footer */}
            <div className={`p-4 border-t border-white/10 space-y-1 ${isCollapsed ? "px-2" : "px-4"}`}>
                <NavItem
                    href="/settings"
                    label="Settings"
                    icon={<Cog6ToothIcon className="w-5 h-5" />}
                    active={pathname.startsWith("/settings")}
                    isCollapsed={isCollapsed}
                />
                
                {/* Collapse Toggle */}
                <button
                    onClick={toggleCollapse}
                    className={`w-full flex items-center ${isCollapsed ? "justify-center px-0" : "px-3"} py-2 rounded-lg text-sm font-medium text-white/50 hover:bg-theme-nav-hover hover:text-white transition-all duration-300 mt-2`}
                    title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
                >
                    <div className="w-5 h-5 flex-shrink-0">
                        {isCollapsed ? <ChevronRightIcon /> : <ChevronLeftIcon />}
                    </div>
                    {!isCollapsed && <span className="ml-3 truncate">Collapse</span>}
                </button>
            </div>
        </aside>
    );
}

export default Sidebar;
