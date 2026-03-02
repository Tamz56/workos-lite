"use client";

import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { WORKSPACES_LIST, workspaceLabel, Workspace } from "@/lib/workspaces";
import { Task } from "@/lib/types";
import { List } from "@/lib/lists";

// Reusing styles from Dashboard
function TaskItem({ task }: { task: Task }) {
    const router = useRouter();
    return (
        <div
            onClick={() => router.push(`?taskId=${task.id}`)}
            className="group flex items-center gap-3 p-3 bg-white border border-neutral-200 rounded-xl hover:shadow-md hover:border-black/10 transition-all cursor-pointer mb-2"
        >
            {/* Status Dot */}
            <div className={`w-2 h-2 shrink-0 rounded-full ${task.status === 'done' ? 'bg-green-500' : task.status === 'inbox' ? 'bg-neutral-300' : 'bg-blue-500'}`} />

            <div className="flex-1 min-w-0">
                <div className={`text-sm font-medium truncate ${task.status === 'done' ? 'text-neutral-400 line-through' : 'text-neutral-900'}`}>{task.title}</div>
                <div className="flex items-center gap-2 mt-0.5">
                    {task.scheduled_date && (
                        <span className="text-[10px] bg-neutral-100 text-neutral-600 px-1.5 py-0.5 rounded font-mono">
                            {task.scheduled_date}
                        </span>
                    )}
                    <span className="text-[10px] text-neutral-400 uppercase tracking-wide">{task.status}</span>
                </div>
            </div>

            {/* Arrow */}
            <div className="text-neutral-300 group-hover:text-black transition-colors">
                →
            </div>
        </div>
    );
}

export default function WorkspaceDetailClient({ workspaceId }: { workspaceId: string }) {
    const router = useRouter();
    const ws = WORKSPACES_LIST.find(w => w.id === workspaceId);

    // Filters
    const [statusFilter, setStatusFilter] = useState("all");
    const [search, setSearch] = useState("");
    const [tasks, setTasks] = useState<Task[]>([]);
    const [lists, setLists] = useState<List[]>([]);
    const [loadingTasks, setLoadingTasks] = useState(true);
    const [loadingLists, setLoadingLists] = useState(true);

    // Fetch Lists
    useEffect(() => {
        let cancelled = false;
        async function run() {
            try {
                const res = await fetch(`/api/lists?workspace=${workspaceId}`);
                if (!res.ok) return;
                const data = await res.json() as List[];
                if (!cancelled) setLists(data);
            } catch (e) {
                console.error(e);
            } finally {
                if (!cancelled) setLoadingLists(false);
            }
        }
        run();
        return () => { cancelled = true; };
    }, [workspaceId]);

    // Fetch Unassigned Tasks Logic
    useEffect(() => {
        let cancelled = false;
        async function run() {
            setLoadingTasks(true);
            try {
                const params = new URLSearchParams();
                params.set("workspace", workspaceId);
                // ONLY fetch unassigned initially here to not spam
                params.set("list_id", "unassigned");
                params.set("limit", "100"); // Limit for performance
                if (statusFilter !== "all") params.set("status", statusFilter);
                if (search) params.set("q", search);

                const res = await fetch(`/api/tasks?${params.toString()}`);
                const data = (await res.json()) as Task[];

                if (!cancelled) setTasks(data);
            } catch {
                if (!cancelled) setTasks([]);
            } finally {
                if (!cancelled) setLoadingTasks(false);
            }
        }
        run();
        return () => { cancelled = true; };
    }, [workspaceId, statusFilter, search]);

    // Handle New Task
    const handleNewTask = () => {
        router.push(`?newTask=1&workspace=${workspaceId}`);
    };

    // Handle New List
    const handleNewList = async () => {
        const title = window.prompt("Enter new list title:");
        if (!title) return;
        const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

        try {
            const res = await fetch("/api/lists", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ workspace: workspaceId, title, slug })
            });
            if (res.ok) {
                const data = await res.json();
                setLists(prev => [data.list, ...prev]);
            } else {
                const err = await res.json();
                alert(`Failed to create list: ${err.error || 'Unknown'}`);
            }
        } catch (e) {
            alert("Error creating list");
        }
    };

    if (!ws) return <div className="p-10">Workspace not found</div>;

    return (
        <div className="flex h-screen flex-col overflow-hidden bg-gray-50/50">
            {/* Header */}
            <div className="px-6 py-4 bg-white border-b border-neutral-200 flex items-center justify-between shadow-sm z-10">
                <div className="flex items-center gap-2">
                    <Link href="/workspaces" className="text-sm font-bold text-neutral-400 hover:text-black transition-colors uppercase tracking-wide">
                        Workspaces
                    </Link>
                    <span className="text-neutral-300">/</span>
                    <h1 className="text-xl font-bold text-neutral-900">{ws.label}</h1>
                </div>
                <div>
                    <button
                        onClick={handleNewList}
                        className="bg-neutral-100 text-neutral-700 px-4 py-2 rounded-lg text-sm font-bold hover:bg-neutral-200 transition-colors flex items-center gap-2 mr-2 inline-flex"
                    >
                        + List
                    </button>
                    <button
                        onClick={handleNewTask}
                        className="bg-black text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-neutral-800 transition-colors items-center gap-2 inline-flex"
                    >
                        + Task
                    </button>
                </div>
            </div>

            {/* Toolbar */}
            <div className="px-6 py-3 border-b border-neutral-200 bg-white/50 flex items-center gap-4">
                <select
                    className="bg-white border border-neutral-300 text-sm rounded-lg px-3 py-1.5 focus:ring-black focus:border-black"
                    value={statusFilter}
                    onChange={e => setStatusFilter(e.target.value)}
                >
                    <option value="all">All Status</option>
                    <option value="inbox">Inbox</option>
                    <option value="planned">Planned</option>
                    <option value="done">Done</option>
                </select>

                <div className="relative flex-1 max-w-md">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400">🔍</span>
                    <input
                        className="w-full bg-white border border-neutral-300 text-sm rounded-lg pl-9 pr-3 py-1.5 focus:ring-black focus:border-black"
                        placeholder="Search tasks..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>
            </div>

            {/* Content Body */}
            <div className="flex-1 overflow-y-auto p-6 scrollbar-thin">
                <div className="max-w-4xl mx-auto space-y-8">

                    {/* Lists Section */}
                    <section>
                        <h2 className="text-sm font-bold text-neutral-400 uppercase tracking-wider mb-4">Lists</h2>
                        {loadingLists ? (
                            <div className="text-neutral-400 py-4 animate-pulse">Loading lists...</div>
                        ) : lists.length === 0 ? (
                            <div className="text-neutral-400 py-4 text-sm bg-neutral-100 border border-neutral-200 border-dashed rounded-xl px-4 inline-block">No lists found. Create one.</div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                                {lists.map(list => (
                                    <Link key={list.id} href={`/lists/${list.id}`} className="block group">
                                        <div className="p-4 bg-white border border-neutral-200 rounded-xl hover:shadow-md hover:border-black/20 transition-all h-full flex flex-col justify-between cursor-pointer">
                                            <div>
                                                <h3 className="font-bold text-neutral-900 group-hover:text-black">{list.title}</h3>
                                                {list.description && <p className="text-xs text-neutral-500 mt-1 line-clamp-2">{list.description}</p>}
                                            </div>
                                            <div className="mt-4 flex items-center justify-between text-[10px] text-neutral-400 font-mono">
                                                <span>{list.slug}</span>
                                                <span>→</span>
                                            </div>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        )}
                    </section>

                    {/* Unassigned Tasks Section */}
                    <section>
                        <h2 className="text-sm font-bold text-neutral-400 uppercase tracking-wider mb-4">Unassigned Tasks</h2>
                        {loadingTasks ? (
                            <div className="text-center text-neutral-400 py-10 animate-pulse">Loading tasks...</div>
                        ) : tasks.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-32 text-neutral-400 bg-neutral-100/50 border border-neutral-200 border-dashed rounded-xl">
                                <span className="opacity-50">No unassigned tasks</span>
                            </div>
                        ) : (
                            <div>
                                {tasks.map(t => (
                                    <TaskItem key={t.id} task={t} />
                                ))}
                            </div>
                        )}
                    </section>
                </div>
            </div>
        </div>
    );
}
