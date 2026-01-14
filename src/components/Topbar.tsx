"use client";

import { usePathname } from "next/navigation";

export default function Topbar() {
    const pathname = usePathname();

    const getTitle = () => {
        if (pathname === "/dashboard") return "Dashboard";
        if (pathname === "/inbox") return "Inbox";
        if (pathname === "/today") return "Today";
        if (pathname === "/done") return "Done";
        if (pathname === "/planner") return "Planner";
        if (pathname.startsWith("/docs")) return "Docs";
        return "WorkOS";
    };

    return (
        <header className="sticky top-0 z-10 flex h-16 items-center border-b border-neutral-200 bg-white px-4 md:px-6 shadow-[0_1px_0_0_rgba(0,0,0,0.03)]">
            <h1 className="text-lg font-bold text-neutral-900">{getTitle()}</h1>
        </header>
    );
}
