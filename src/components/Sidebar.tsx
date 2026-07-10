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
    PencilSquareIcon,
    SparklesIcon,
    ChevronDownIcon,
    ChevronUpIcon,
    TableCellsIcon
} from "@heroicons/react/24/outline";

const STORAGE_KEY = "workos.sidebar.collapsed";
const ADVANCED_KEY = "workos.sidebar.advanced.open";

// Helper for consistent Nav Items
function NavItem(props: { 
    href: string; 
    icon: React.ReactNode; 
    label: string; 
    active?: boolean;
    isCollapsed?: boolean;
    isSubItem?: boolean;
}) {
    return (
        <a
            href={props.href}
            title={props.isCollapsed ? props.label : ""}
            className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${props.active
                ? "bg-theme-nav-active text-white"
                : "text-white/70 hover:bg-theme-nav-hover hover:text-white"
                } ${props.isCollapsed ? "justify-center px-0" : ""} ${props.isSubItem ? "py-1.5 text-xs text-white/60" : ""}`}
        >
            <div className={`flex-shrink-0 ${props.isSubItem ? "w-4 h-4" : "w-5 h-5"}`}>{props.icon}</div>
            {!props.isCollapsed && <span className="truncate">{props.label}</span>}
        </a>
    );
}

export function Sidebar() {
    const pathname = usePathname();
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
    const [isHydrated, setIsHydrated] = useState(false);

    useEffect(() => {
        const savedCollapsed = localStorage.getItem(STORAGE_KEY);
        if (savedCollapsed !== null) {
            setIsCollapsed(savedCollapsed === "true");
        }
        const savedAdvanced = localStorage.getItem(ADVANCED_KEY);
        if (savedAdvanced !== null) {
            setIsAdvancedOpen(savedAdvanced === "true");
        }
        setIsHydrated(true);
    }, []);

    const toggleCollapse = () => {
        const newState = !isCollapsed;
        setIsCollapsed(newState);
        localStorage.setItem(STORAGE_KEY, String(newState));
    };

    const toggleAdvanced = () => {
        const newState = !isAdvancedOpen;
        setIsAdvancedOpen(newState);
        localStorage.setItem(ADVANCED_KEY, String(newState));
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
            <nav className={`flex-1 ${isCollapsed ? "px-2" : "px-4"} space-y-1 transition-all duration-300 overflow-y-auto custom-scrollbar`}>
                {/* 1) Main Navigation */}
                <div className="space-y-1">
                    <NavItem
                        href="/arbor-desk"
                        label="Home"
                        icon={<HomeIcon className="w-5 h-5" />}
                        active={pathname === "/arbor-desk"}
                        isCollapsed={isCollapsed}
                    />
                    <NavItem
                        href="/workspaces/content/writing-desk-lite"
                        label="Write"
                        icon={<PencilSquareIcon className="w-5 h-5" />}
                        active={pathname.startsWith("/workspaces/content/writing-desk-lite")}
                        isCollapsed={isCollapsed}
                    />
                    <NavItem
                        href="/workspaces/content/gf-hub"
                        label="Tables"
                        icon={<TableCellsIcon className="w-5 h-5" />}
                        active={pathname.startsWith("/workspaces/content/gf-hub")}
                        isCollapsed={isCollapsed}
                    />
                    <NavItem
                        href="/docs"
                        label="Docs"
                        icon={<FolderIcon className="w-5 h-5" />}
                        active={pathname.startsWith("/docs")}
                        isCollapsed={isCollapsed}
                    />
                    <NavItem
                        href="/planner"
                        label="Tasks"
                        icon={<CalendarIcon className="w-5 h-5" />}
                        active={pathname === "/planner"}
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
                        href="/arbor-inbox"
                        label="Arbor Inbox"
                        icon={<InboxIcon className="w-5 h-5" />}
                        active={pathname === "/arbor-inbox" || pathname.startsWith("/arbor-inbox")}
                        isCollapsed={isCollapsed}
                    />
                </div>

                {/* 2) Active Workspaces */}
                <div className="pt-2 border-t border-white/5 space-y-1">
                    {!isCollapsed && (
                        <div className="px-3 py-1 text-[9px] font-black uppercase tracking-widest text-white/40">
                            Active Workspaces
                        </div>
                    )}
                    <NavItem
                        href="/workspaces/other/classroom"
                        label="ห้องเรียน BA"
                        icon={<InboxIcon className="w-5 h-5" />}
                        active={pathname === "/workspaces/other/classroom"}
                        isCollapsed={isCollapsed}
                    />
                    <NavItem
                        href="/workspaces/astro-strategy"
                        label="Astro-Strategy Lab"
                        icon={<SparklesIcon className="w-5 h-5" />}
                        active={pathname.startsWith("/workspaces/astro-strategy")}
                        isCollapsed={isCollapsed}
                    />
                    <NavItem
                        href="/workspaces/travel/rose-trial"
                        label="Nutrient Planner App"
                        icon={<TableCellsIcon className="w-5 h-5" />}
                        active={pathname.startsWith("/workspaces/travel")}
                        isCollapsed={isCollapsed}
                    />
                    <NavItem
                        href="/workspaces/content/writing-lab"
                        label="Writing Lab"
                        icon={<PencilSquareIcon className="w-5 h-5" />}
                        active={pathname.startsWith("/workspaces/content/writing-lab")}
                        isCollapsed={isCollapsed}
                    />
                    <NavItem
                        href="/workspaces/prompt-studio"
                        label="Prompt Studio"
                        icon={<SparklesIcon className="w-5 h-5" />}
                        active={pathname.startsWith("/workspaces/prompt-studio")}
                        isCollapsed={isCollapsed}
                    />
                </div>

                {/* 3) Advanced / System */}
                <div className="pt-2 border-t border-white/5">
                    <button
                        onClick={toggleAdvanced}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium text-white/50 hover:bg-theme-nav-hover hover:text-white transition-all duration-300 ${isCollapsed ? "justify-center px-0" : ""}`}
                        title={isCollapsed ? "Advanced" : ""}
                    >
                        <div className="flex items-center gap-3">
                            <Cog6ToothIcon className="w-5 h-5 flex-shrink-0" />
                            {!isCollapsed && <span className="truncate">Advanced</span>}
                        </div>
                        {!isCollapsed && (
                            <div className="w-3 h-3 flex-shrink-0 text-white/40">
                                {isAdvancedOpen ? <ChevronUpIcon className="w-3.5 h-3.5" /> : <ChevronDownIcon className="w-3.5 h-3.5" />}
                            </div>
                        )}
                    </button>
                    
                    {isAdvancedOpen && !isCollapsed && (
                        <div className="pl-3 mt-1 space-y-1 border-l border-white/10 ml-5 animate-fadeIn">
                            <NavItem
                                href="/dashboard"
                                label="Legacy Dashboard"
                                icon={<HomeIcon className="w-4 h-4" />}
                                active={pathname === "/dashboard"}
                                isCollapsed={isCollapsed}
                                isSubItem={true}
                            />
                            <NavItem
                                href="/workspaces"
                                label="Areas / Workspaces เดิม"
                                icon={<ChartBarIcon className="w-4 h-4" />}
                                active={pathname === "/workspaces" || (pathname.startsWith("/workspaces") && !pathname.includes("/workspaces/content/")) && !pathname.startsWith("/workspaces/astro-strategy")}
                                isCollapsed={isCollapsed}
                                isSubItem={true}
                            />
                            <NavItem
                                href="/workspaces/content/article-studio"
                                label="Article Studio"
                                icon={<DocumentTextIcon className="w-4 h-4" />}
                                active={pathname.startsWith("/workspaces/content/article-studio")}
                                isCollapsed={isCollapsed}
                                isSubItem={true}
                            />
                            <NavItem
                                href="/timeline"
                                label="Timeline"
                                icon={<ClockIcon className="w-4 h-4" />}
                                active={pathname === "/timeline"}
                                isCollapsed={isCollapsed}
                                isSubItem={true}
                            />
                            <NavItem
                                href="/sprints"
                                label="Sprints"
                                icon={<QueueListIcon className="w-4 h-4" />}
                                active={pathname.startsWith("/sprints")}
                                isCollapsed={isCollapsed}
                                isSubItem={true}
                            />
                            <NavItem
                                href="/inbox"
                                label="Inbox"
                                icon={<InboxIcon className="w-4 h-4" />}
                                active={pathname === "/inbox"}
                                isCollapsed={isCollapsed}
                                isSubItem={true}
                            />
                            <NavItem
                                href="/settings"
                                label="Settings"
                                icon={<Cog6ToothIcon className="w-4 h-4" />}
                                active={pathname.startsWith("/settings")}
                                isCollapsed={isCollapsed}
                                isSubItem={true}
                            />
                        </div>
                    )}
                </div>
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
