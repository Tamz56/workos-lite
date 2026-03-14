"use client";

import { usePathname, useRouter } from "next/navigation";
import { Plus, Layout, CheckCircle2, MoreHorizontal, ChevronDown, CalendarPlus, Zap, Bot, List } from "lucide-react";
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
        const isDashboard = pathname === "/dashboard";
        const isProjects = pathname.startsWith("/projects") && pathname.split('/').length === 2; // Only /projects, skip /projects/[slug]
        const isToday = pathname === "/today" || pathname === "/planner" || pathname === "/inbox";
        const isNotes = pathname.startsWith("/docs");

        if (isDashboard) {
            return (
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => router.push("/dashboard?newProject=1")}
                        className="inline-flex items-center gap-2 rounded-lg bg-black px-3 py-1.5 text-xs font-bold text-white shadow-sm hover:opacity-90 transition-all active:scale-95"
                    >
                        <Layout className="h-3.5 w-3.5" />
                        <span>Create Project</span>
                    </button>

                    <button
                        onClick={() => router.push("/dashboard?newTask=1")}
                        className="inline-flex items-center gap-2 rounded-lg bg-black px-3 py-1.5 text-xs font-bold text-white shadow-sm hover:opacity-90 transition-all active:scale-95"
                    >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        <span>Quick Task</span>
                    </button>

                    <button
                        onClick={() => router.push("/docs?newDoc=1")}
                        className="hidden md:inline-flex items-center gap-2 rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-xs font-bold text-neutral-600 hover:bg-neutral-50 shadow-sm transition-all active:scale-95"
                    >
                        <Plus className="h-3.5 w-3.5" />
                        <span>New Note</span>
                    </button>

                    <div className="relative">
                        <button
                            onClick={() => setShowMore(!showMore)}
                            className="inline-flex items-center gap-1 rounded-lg border border-neutral-200 bg-white px-2 py-1.5 text-xs font-bold text-neutral-600 hover:bg-neutral-50 shadow-sm transition-all active:scale-95"
                        >
                            <MoreHorizontal className="h-3.5 w-3.5" />
                            <ChevronDown className={`h-3 w-3 transition-transform ${showMore ? 'rotate-180' : ''}`} />
                        </button>

                        {showMore && (
                            <>
                                <div className="fixed inset-0 z-30" onClick={() => setShowMore(false)} />
                                <div className="absolute right-0 mt-2 w-48 rounded-xl border border-neutral-100 bg-white p-1.5 shadow-xl z-40 animate-in fade-in slide-in-from-top-1">
                                    <button onClick={() => { router.push("/dashboard?newEvent=1"); setShowMore(false); }} className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-xs text-neutral-600 hover:bg-neutral-50 hover:text-black transition-colors">
                                        <CalendarPlus className="h-3.5 w-3.5" />
                                        <span>New Event</span>
                                    </button>
                                    <button onClick={() => { router.push("/dashboard?bulkPaste=1"); setShowMore(false); }} className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-xs text-neutral-600 hover:bg-neutral-50 hover:text-black transition-colors">
                                        <Zap className="h-3.5 w-3.5" />
                                        <span>Bulk Paste</span>
                                    </button>
                                    <div className="my-1 border-t border-neutral-50" />
                                    <button onClick={() => { router.push("/agent"); setShowMore(false); }} className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-xs text-neutral-600 hover:bg-neutral-50 hover:text-black transition-colors">
                                        <Bot className="h-3.5 w-3.5" />
                                        <span>Agent</span>
                                    </button>
                                    <button onClick={() => { router.push("/agent/logs"); setShowMore(false); }} className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-xs text-neutral-600 hover:bg-neutral-50 hover:text-black transition-colors">
                                        <List className="h-3.5 w-3.5" />
                                        <span>Logs</span>
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            );
        }

        if (isProjects) {
            return (
                <button
                    onClick={() => router.push("/projects?newProject=1")}
                    className="inline-flex items-center gap-2 rounded-lg bg-black px-3 py-1.5 text-xs font-bold text-white shadow-sm hover:opacity-90 transition-all active:scale-95"
                >
                    <Layout className="h-3.5 w-3.5" />
                    <span>New Project</span>
                </button>
            );
        }

        if (isToday) {
            return (
                <button
                    onClick={() => router.push(`${pathname}?newTask=1`)}
                    className="inline-flex items-center gap-2 rounded-lg bg-black px-3 py-1.5 text-xs font-bold text-white shadow-sm hover:opacity-90 transition-all active:scale-95"
                >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>Quick Task</span>
                </button>
            );
        }

        if (isNotes) {
            return (
                <button
                    onClick={() => router.push("/docs?newDoc=1")}
                    className="inline-flex items-center gap-2 rounded-lg bg-black px-3 py-1.5 text-xs font-bold text-white shadow-sm hover:opacity-90 transition-all active:scale-95"
                >
                    <Plus className="h-3.5 w-3.5" />
                    <span>New Note</span>
                </button>
            );
        }

        return null;
    };

    return (
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-neutral-200 bg-white/80 backdrop-blur-md px-4 md:px-6 shadow-[0_1px_0_0_rgba(0,0,0,0.03)]">
            <h1 className="text-lg font-bold text-neutral-900">{getTitle()}</h1>
            <div className="flex items-center gap-2">
                {renderActions()}
            </div>
        </header>
    );
}
