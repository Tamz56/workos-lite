"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
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
    TableCellsIcon,
    XMarkIcon
} from "@heroicons/react/24/outline";

const STORAGE_KEY = "workos.sidebar.collapsed";
const ADVANCED_KEY = "workos.sidebar.advanced.open";

// Helper for consistent Nav Items using Next.js Link
function NavItem(props: {
    href: string;
    icon: React.ReactNode;
    label: string;
    active?: boolean;
    isCollapsed?: boolean;
    isSubItem?: boolean;
}) {
    return (
        <Link
            href={props.href}
            title={props.isCollapsed ? props.label : ""}
            className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${props.active
                ? "bg-slate-800 text-white font-semibold shadow-sm"
                : "text-slate-300 hover:bg-slate-800/60 hover:text-white"
                } ${props.isCollapsed ? "justify-center px-0" : ""} ${props.isSubItem ? "py-1.5 text-xs text-slate-400" : ""}`}
        >
            <div className={`flex-shrink-0 ${props.isSubItem ? "w-4 h-4" : "w-5 h-5"}`}>{props.icon}</div>
            {!props.isCollapsed && <span className="truncate">{props.label}</span>}
        </Link>
    );
}

export function Sidebar() {
    const pathname = usePathname();
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
    const [isMobileOpen, setIsMobileOpen] = useState(false);

    const setMobileOpenState = (open: boolean) => {
        setIsMobileOpen(open);
        if (typeof window !== "undefined") {
            window.dispatchEvent(new CustomEvent("mobile-sidebar-state", { detail: open }));
        }
    };

    useEffect(() => {
        const savedCollapsed = localStorage.getItem(STORAGE_KEY);
        if (savedCollapsed !== null) {
            setIsCollapsed(savedCollapsed === "true");
        }
        const savedAdvanced = localStorage.getItem(ADVANCED_KEY);
        if (savedAdvanced !== null) {
            setIsAdvancedOpen(savedAdvanced === "true");
        }
        if (typeof window !== "undefined") {
            window.dispatchEvent(new CustomEvent("mobile-sidebar-state", { detail: false }));
        }
    }, []);

    useEffect(() => {
        const handleToggle = () => {
            setMobileOpenState(!isMobileOpen);
        };
        window.addEventListener("toggle-mobile-sidebar", handleToggle);
        return () => {
            window.removeEventListener("toggle-mobile-sidebar", handleToggle);
        };
    }, [isMobileOpen]);

    useEffect(() => {
        setMobileOpenState(false);
    }, [pathname]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape" && isMobileOpen) {
                setMobileOpenState(false);
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [isMobileOpen]);

    const toggleCollapse = () => {
        const next = !isCollapsed;
        setIsCollapsed(next);
        localStorage.setItem(STORAGE_KEY, String(next));
    };

    const toggleAdvanced = () => {
        const next = !isAdvancedOpen;
        setIsAdvancedOpen(next);
        localStorage.setItem(ADVANCED_KEY, String(next));
    };

    const isNutrientActive = pathname.startsWith("/workspaces/travel/rose-trial") || pathname.startsWith("/workspaces/travel/trial-lab");
    const isAstroActive = pathname.startsWith("/workspaces/astro-strategy");
    const isWritingActive = pathname.startsWith("/workspaces/content/writing-lab");
    const isPromptActive = pathname.startsWith("/workspaces/prompt-studio") || pathname.startsWith("/workspaces/prompt-lite");
    const isBaActive = pathname.endsWith("/classroom");
    const isGfHubActive = pathname.startsWith("/workspaces/content/gf-hub");

    return (
    <>
        {/* Mobile Backdrop */}
        {isMobileOpen && (
            <div
                onClick={() => setMobileOpenState(false)}
                className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden animate-fadeIn"
            />
        )}

        <aside
            className={`fixed md:sticky top-0 z-50 h-screen bg-slate-900 border-r border-slate-800 text-slate-200 flex flex-col transition-all duration-300 ease-in-out shadow-xl ${
                isCollapsed ? "w-16" : "w-64"
            } ${
                isMobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
            }`}
        >
            {/* Logo Header */}
            <div className={`h-16 flex items-center justify-between px-4 border-b border-slate-800/80 ${isCollapsed ? "justify-center px-0" : ""}`}>
                <Link href="/dashboard" className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-rose-500 to-indigo-600 flex items-center justify-center text-white font-black text-sm flex-shrink-0 shadow-md">
                        A
                    </div>
                    {!isCollapsed && (
                        <div className="flex flex-col leading-none min-w-0">
                            <span className="text-base font-bold text-white tracking-tight truncate">ArborDesk</span>
                            <span className="text-[10px] text-slate-400 font-medium tracking-wide mt-0.5">WorkOS-Lite</span>
                        </div>
                    )}
                </Link>

                {/* Mobile Close Button */}
                <button
                    onClick={() => setMobileOpenState(false)}
                    className="md:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
                >
                    <XMarkIcon className="w-5 h-5" />
                </button>
            </div>

            {/* Navigation Body */}
            <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-4 custom-scrollbar">
                {/* 1) Primary Navigation */}
                <div className="space-y-1">
                    <NavItem
                        href="/dashboard"
                        label="Home"
                        icon={<HomeIcon className="w-5 h-5" />}
                        active={pathname === "/dashboard"}
                        isCollapsed={isCollapsed}
                    />
                    <NavItem
                        href="/workspaces/content/writing-lab"
                        label="Write"
                        icon={<PencilSquareIcon className="w-5 h-5" />}
                        active={pathname === "/workspaces/content/writing-lab"}
                        isCollapsed={isCollapsed}
                    />
                    <NavItem
                        href="/workspaces/content/gf-hub"
                        label="GF Content Hub"
                        icon={<TableCellsIcon className="w-5 h-5" />}
                        active={isGfHubActive}
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
                        href="/inbox"
                        label="Tasks"
                        icon={<QueueListIcon className="w-5 h-5" />}
                        active={pathname === "/inbox"}
                        isCollapsed={isCollapsed}
                    />
                    <NavItem
                        href="/planner"
                        label="Planner"
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
                        active={pathname === "/arbor-inbox"}
                        isCollapsed={isCollapsed}
                    />
                </div>

                {/* 2) Active Workspaces */}
                <div className="pt-3 border-t border-slate-800/80 space-y-1">
                    {!isCollapsed && (
                        <div className="px-3 py-1 text-[9px] font-black uppercase tracking-widest text-slate-400">
                            Active Workspaces
                        </div>
                    )}
                    <NavItem
                        href="/workspaces/other/classroom"
                        label="ห้องเรียน BA"
                        icon={<InboxIcon className="w-5 h-5" />}
                        active={isBaActive}
                        isCollapsed={isCollapsed}
                    />
                    <NavItem
                        href="/workspaces/astro-strategy"
                        label="Astro-Strategy Lab"
                        icon={<SparklesIcon className="w-5 h-5 text-indigo-400" />}
                        active={isAstroActive}
                        isCollapsed={isCollapsed}
                    />
                    <NavItem
                        href="/workspaces/travel/rose-trial"
                        label="Nutrient Planner App"
                        icon={<TableCellsIcon className="w-5 h-5 text-rose-400" />}
                        active={isNutrientActive}
                        isCollapsed={isCollapsed}
                    />
                    <NavItem
                        href="/workspaces/content/writing-lab"
                        label="Writing Lab"
                        icon={<PencilSquareIcon className="w-5 h-5 text-amber-400" />}
                        active={isWritingActive}
                        isCollapsed={isCollapsed}
                    />
                    <NavItem
                        href="/workspaces/prompt-studio"
                        label="Prompt Studio"
                        icon={<SparklesIcon className="w-5 h-5 text-sky-400" />}
                        active={isPromptActive}
                        isCollapsed={isCollapsed}
                    />
                </div>

                {/* 3) Advanced Navigation Accordion */}
                <div className="pt-3 border-t border-slate-800/80">
                    <button
                        onClick={toggleAdvanced}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium text-slate-400 hover:bg-slate-800/60 hover:text-white transition-all duration-300 ${isCollapsed ? "justify-center px-0" : ""}`}
                        title={isCollapsed ? "Advanced" : ""}
                    >
                        <div className="flex items-center gap-3">
                            <Cog6ToothIcon className="w-5 h-5 flex-shrink-0" />
                            {!isCollapsed && <span className="truncate">Advanced</span>}
                        </div>
                        {!isCollapsed && (
                            <div className="w-3.5 h-3.5 flex-shrink-0 text-slate-400">
                                {isAdvancedOpen ? <ChevronUpIcon className="w-3.5 h-3.5" /> : <ChevronDownIcon className="w-3.5 h-3.5" />}
                            </div>
                        )}
                    </button>

                    {isAdvancedOpen && !isCollapsed && (
                        <div className="pl-3 mt-1 space-y-1 border-l border-slate-800 ml-5 animate-fadeIn">
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
                                active={pathname === "/workspaces"}
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
                                href="/settings/data"
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
            <div className={`p-3 border-t border-slate-800/80 space-y-1 ${isCollapsed ? "px-2" : "px-3"}`}>
                <NavItem
                    href="/settings/data"
                    label="Settings"
                    icon={<Cog6ToothIcon className="w-5 h-5" />}
                    active={pathname.startsWith("/settings")}
                    isCollapsed={isCollapsed}
                />

                {/* Collapse Toggle */}
                <button
                    onClick={toggleCollapse}
                    className={`w-full flex items-center ${isCollapsed ? "justify-center px-0" : "px-3"} py-2 rounded-lg text-sm font-medium text-slate-400 hover:bg-slate-800/60 hover:text-white transition-all duration-300 mt-1`}
                    title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
                >
                    <div className="w-5 h-5 flex-shrink-0">
                        {isCollapsed ? <ChevronRightIcon /> : <ChevronLeftIcon />}
                    </div>
                    {!isCollapsed && <span className="ml-3 truncate">Collapse</span>}
                </button>
            </div>
        </aside>
    </>
    );
}

export default Sidebar;
