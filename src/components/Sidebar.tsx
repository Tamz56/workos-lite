"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const nav = [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/inbox", label: "Inbox" },
    { href: "/today", label: "Today" },
    { href: "/done", label: "Done" },
    { href: "/planner", label: "Planner" },
    { href: "/docs", label: "Docs" },
    { href: "/calendar", label: "Calendar" },
];

export function Sidebar() {
    const pathname = usePathname();

    return (
        <aside className="w-64 border-r bg-white">
            <div className="p-4">
                <div className="text-lg font-semibold leading-tight">ArborDesk</div>
                <div className="text-xs text-gray-500">WorkOS-Lite</div>
            </div>

            <nav className="px-2 pb-4">
                <ul className="space-y-1">
                    {nav.map((n) => {
                        const active = pathname === n.href || pathname.startsWith(n.href + "/");
                        return (
                            <li key={n.href}>
                                <Link
                                    href={n.href}
                                    className={[
                                        "block rounded-md px-3 py-2 text-sm transition",
                                        active ? "bg-gray-900 text-white" : "text-gray-700 hover:bg-gray-100",
                                    ].join(" ")}
                                >
                                    {n.label}
                                </Link>
                            </li>
                        );
                    })}
                </ul>

                <div className="mt-4 border-t pt-4 px-3">
                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">
                        Settings
                    </div>
                    <Link
                        href="/settings/data"
                        className={[
                            "block rounded-md px-3 py-2 text-sm transition",
                            pathname === "/settings/data" ? "bg-gray-900 text-white" : "text-gray-700 hover:bg-gray-100",
                        ].join(" ")}
                    >
                        Data Management
                    </Link>
                </div>
            </nav>
        </aside>
    );
}

