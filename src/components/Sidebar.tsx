"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    CalendarIcon,
    ChartBarIcon,
    FolderIcon,
    HomeIcon,
    InboxIcon, // Changed from ClipboardIcon to InboxIcon for Inbox
    Cog6ToothIcon, // Settings icon
    BriefcaseIcon,
    ClockIcon,
    QueueListIcon
} from "@heroicons/react/24/outline";

// Helper for consistent Nav Items
function NavItem(props: { href: string; icon: React.ReactNode; label: string; active?: boolean }) {
    return (
        <Link
            href={props.href}
            className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${props.active
                ? "bg-neutral-900 text-white"
                : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900"
                }`}
        >
            {props.icon}
            {props.label}
        </Link>
    );
}

export function Sidebar() {
    const pathname = usePathname();

    return (
        <aside className="w-64 bg-white border-r border-neutral-200 shadow-[1px_0_0_rgba(0,0,0,0.03)] flex flex-col h-screen sticky top-0 z-40">
            {/* Logo */}
            <div className="h-16 flex items-center px-6 border-b border-neutral-100 mb-4">
                <div className="flex flex-col leading-none">
                    <span className="text-lg font-bold text-neutral-900">ArborDesk</span>
                    <span className="text-[10px] text-neutral-400 font-medium tracking-wide">WorkOS-Lite</span>
                </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-4 space-y-1">
                <NavItem
                    href="/dashboard"
                    label="Command Center"
                    icon={<HomeIcon className="w-5 h-5" />}
                    active={pathname === "/dashboard"}
                />
                <NavItem
                    href="/projects"
                    label="Projects"
                    icon={<BriefcaseIcon className="w-5 h-5" />}
                    active={pathname.startsWith("/projects")}
                />
                <NavItem
                    href="/timeline"
                    label="Timeline"
                    icon={<ClockIcon className="w-5 h-5" />}
                    active={pathname === "/timeline"}
                />
                <NavItem
                    href="/sprints"
                    label="Sprints"
                    icon={<QueueListIcon className="w-5 h-5" />}
                    active={pathname.startsWith("/sprints")}
                />
                <NavItem
                    href="/planner"
                    label="Planner"
                    icon={<CalendarIcon className="w-5 h-5" />}
                    active={pathname === "/planner"}
                />
                <NavItem
                    href="/inbox"
                    label="Inbox"
                    icon={<InboxIcon className="w-5 h-5" />}
                    active={pathname === "/inbox"}
                />
                <NavItem
                    href="/workspaces"
                    label="Workspaces"
                    icon={<ChartBarIcon className="w-5 h-5" />}
                    active={pathname.startsWith("/workspaces")}
                />
                <NavItem
                    href="/docs"
                    label="Docs"
                    icon={<FolderIcon className="w-5 h-5" />}
                    active={pathname === "/docs"}
                />
            </nav>

            {/* Footer */}
            <div className="p-4 border-t border-neutral-100">
                <NavItem
                    href="/settings"
                    label="Settings"
                    icon={<Cog6ToothIcon className="w-5 h-5" />}
                    active={pathname.startsWith("/settings")}
                />
            </div>
        </aside>
    );
}

// Default export as well for flexibility
export default Sidebar;
