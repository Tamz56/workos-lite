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
        <header className="sticky top-0 z-10 flex h-14 items-center border-b bg-white px-4 md:px-6">
            <h1 className="text-lg font-semibold text-gray-900">{getTitle()}</h1>
        </header>
    );
}
