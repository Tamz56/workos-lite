"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { getTasks } from "@/lib/api";
import type { Task } from "@/lib/types";

type DocSubset = { id: string; title: string; updated_at: string };

function toYYYYMMDD(d: Date) {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

export default function DashboardClient() {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Metrics
    const [inboxCount, setInboxCount] = useState(0);
    const [todayCount, setTodayCount] = useState(0);
    const [overdueCount, setOverdueCount] = useState(0);
    const [upcomingCount, setUpcomingCount] = useState(0);
    const [doneCount, setDoneCount] = useState(0);

    // Lists
    const [morningTasks, setMorningTasks] = useState<Task[]>([]);
    const [afternoonTasks, setAfternoonTasks] = useState<Task[]>([]);
    const [eveningTasks, setEveningTasks] = useState<Task[]>([]);
    const [recentDocs, setRecentDocs] = useState<DocSubset[]>([]);

    // Stable today string
    const todayStr = useMemo(() => toYYYYMMDD(new Date()), []);

    useEffect(() => {
        async function load() {
            setLoading(true);
            setError(null);
            try {
                // 1. Parallel Fetching
                const [
                    inboxUnplanned,
                    plannedAll,
                    doneAll,
                    morning,
                    afternoon,
                    evening,
                    docsRes
                ] = await Promise.all([
                    // Inbox: status=inbox, date=null
                    getTasks({ status: "inbox", scheduled_date: "null", limit: 500 }),
                    // Planned: status=planned (fetch all, filter client-side)
                    getTasks({ status: "planned", limit: 500 }),
                    // Done: status=done
                    getTasks({ status: "done", limit: 500 }),
                    // Today Buckets (specific queries as per plan)
                    getTasks({ status: "planned", scheduled_date: todayStr, schedule_bucket: "morning", limit: 5 }),
                    getTasks({ status: "planned", scheduled_date: todayStr, schedule_bucket: "afternoon", limit: 5 }),
                    getTasks({ status: "planned", scheduled_date: todayStr, schedule_bucket: "evening", limit: 5 }),
                    // Recent Docs (raw fetch)
                    fetch("/api/docs").then(res => res.json())
                ]);

                // 2. Compute Counts
                setInboxCount(inboxUnplanned.length);
                setDoneCount(doneAll.length);

                // Derived from plannedAll
                const todayDerived = plannedAll.filter(t => t.scheduled_date === todayStr);
                const upcomingDerived = plannedAll.filter(t => t.scheduled_date && t.scheduled_date > todayStr);
                const overdueDerived = plannedAll.filter(t => t.scheduled_date && t.scheduled_date < todayStr);

                setTodayCount(todayDerived.length);
                setUpcomingCount(upcomingDerived.length);
                setOverdueCount(overdueDerived.length);

                // 3. Set Lists
                setMorningTasks(morning);
                setAfternoonTasks(afternoon);
                setEveningTasks(evening);

                // Docs (client-side slice)
                if (docsRes && Array.isArray(docsRes.docs)) {
                    setRecentDocs(docsRes.docs.slice(0, 5));
                } else {
                    setRecentDocs([]);
                }

            } catch (e) {
                console.error(e);
                setError("Failed to load dashboard data.");
            } finally {
                setLoading(false);
            }
        }

        void load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // todayStr is stable

    if (loading) {
        return <div className="p-8 text-center text-gray-500">Loading dashboard...</div>;
    }

    if (error) {
        return <div className="p-8 text-center text-red-500">{error}</div>;
    }

    return (
        <div className="space-y-8">
            {/* Overview Cards */}
            <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
                <DashboardCard title="Overdue" count={overdueCount} href="/planner" color="red" />
                <DashboardCard title="Inbox" count={inboxCount} href="/inbox" color="blue" />
                <DashboardCard title="Today" count={todayCount} href="/today" color="green" />
                <DashboardCard title="Upcoming" count={upcomingCount} href="/planner" color="indigo" />
                <DashboardCard title="Done" count={doneCount} href="/done" color="gray" />
            </div>

            <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
                {/* Left: Today Buckets (2 cols wide on large screens?) No, usually 3 cols for buckets? 
                    Plan says: "Today Buckets Section (3 cols/stack)". 
                    Let's make a grid for buckets. */}
                <div className="lg:col-span-2 space-y-6">
                    <h2 className="text-xl font-semibold text-gray-800">Today&apos;s Focus</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <BucketColumn title="Morning" tasks={morningTasks} emptyText="No morning tasks" />
                        <BucketColumn title="Afternoon" tasks={afternoonTasks} emptyText="No afternoon tasks" />
                        <BucketColumn title="Evening" tasks={eveningTasks} emptyText="No evening tasks" />
                    </div>
                </div>

                {/* Right: Recent Docs */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-semibold text-gray-800">Recent Docs</h2>
                        <Link href="/docs" className="text-sm text-blue-600 hover:underline">View all</Link>
                    </div>
                    <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
                        {recentDocs.length === 0 ? (
                            <div className="p-4 text-center text-sm text-gray-400">No recent docs</div>
                        ) : (
                            <ul className="divide-y">
                                {recentDocs.map(d => (
                                    <li key={d.id} className="group hover:bg-gray-50 transition">
                                        <Link href={`/docs/${d.id}`} className="block p-3">
                                            <div className="text-sm font-medium text-gray-900 group-hover:text-blue-600 truncate">
                                                {d.title || "Untitled"}
                                            </div>
                                            <div className="text-xs text-gray-400 mt-1">
                                                {new Date(d.updated_at).toLocaleDateString("th-TH")}
                                            </div>
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

function DashboardCard({ title, count, href, color }: { title: string; count: number; href: string; color: "blue" | "green" | "indigo" | "gray" | "red" }) {
    const colorClasses = {
        blue: "bg-blue-50 text-blue-700 border-blue-100 hover:border-blue-300",
        green: "bg-green-50 text-green-700 border-green-100 hover:border-green-300",
        indigo: "bg-indigo-50 text-indigo-700 border-indigo-100 hover:border-indigo-300",
        gray: "bg-gray-50 text-gray-700 border-gray-100 hover:border-gray-300",
        red: "bg-red-50 text-red-700 border-red-100 hover:border-red-300",
    };

    return (
        <Link href={href} className={`block rounded-xl border p-5 transition text-center ${colorClasses[color]}`}>
            <div className="text-3xl font-bold mb-1">{count}</div>
            <div className="text-sm font-medium opacity-80">{title}</div>
        </Link>
    );
}

function BucketColumn({ title, tasks, emptyText }: { title: string; tasks: Task[]; emptyText: string }) {
    return (
        <div className="bg-gray-50 rounded-xl border p-4 flex flex-col h-full">
            <h3 className="font-medium text-gray-700 mb-3 text-sm uppercase tracking-wide border-b pb-2">{title}</h3>
            {tasks.length === 0 ? (
                <div className="text-sm text-gray-400 italic py-2">{emptyText}</div>
            ) : (
                <ul className="space-y-2">
                    {tasks.map(t => (
                        <li key={t.id} className="bg-white px-3 py-2 rounded-lg border shadow-sm text-sm">
                            <div className="truncate text-gray-800">{t.title}</div>
                            {t.workspace !== "avacrm" && (
                                <span className="inline-block mt-1 text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 font-medium">
                                    {t.workspace}
                                </span>
                            )}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
