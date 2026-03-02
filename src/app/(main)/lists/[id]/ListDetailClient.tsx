"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type List = {
    id: string;
    workspace: string;
    slug: string;
    title: string;
    description: string | null;
    created_at: string;
    updated_at: string;
};

type Task = {
    id: string;
    title: string;
    workspace: string;
    status: "inbox" | "planned" | "done";
    scheduled_date: string | null;
    schedule_bucket: "none" | "morning" | "afternoon" | "evening";
    priority: number;
    notes: string;
    list_id: string | null;
    updated_at: string;
};

export default function ListDetailClient(props: { listId: string }) {
    const { listId } = props;
    const router = useRouter();

    const [list, setList] = useState<List | null>(null);
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);
    const [err, setErr] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<"all" | "inbox" | "planned" | "done">("all");

    const title = useMemo(() => list?.title ?? "List", [list?.title]);

    const filteredTasks = useMemo(() => {
        if (activeTab === "all") return tasks;
        return tasks.filter(t => t.status === activeTab);
    }, [tasks, activeTab]);

    useEffect(() => {
        let alive = true;

        async function run() {
            try {
                setLoading(true);
                setErr(null);

                const r1 = await fetch(`/api/lists/${encodeURIComponent(listId)}`, { cache: "no-store" });
                if (!r1.ok) throw new Error(`GET /api/lists/${listId} -> ${r1.status}`);
                const listJson = await r1.json();
                const l: List = listJson.list ?? listJson; // รองรับทั้ง {list:{...}} และ {...}

                const r2 = await fetch(
                    `/api/tasks?workspace=${encodeURIComponent(l.workspace)}&list_id=${encodeURIComponent(l.id)}`,
                    { cache: "no-store" }
                );
                if (!r2.ok) throw new Error(`GET /api/tasks(list) -> ${r2.status}`);
                const tasksJson = await r2.json();

                if (!alive) return;
                setList(l);
                setTasks(Array.isArray(tasksJson) ? tasksJson : tasksJson.tasks ?? []);
            } catch (e: any) {
                if (!alive) return;
                setErr(e?.message ?? "Unknown error");
            } finally {
                if (alive) setLoading(false);
            }
        }

        run();
        return () => {
            alive = false;
        };
    }, [listId]);

    if (loading) return <div className="p-6 text-sm text-neutral-500">Loading…</div>;
    if (err) return <div className="p-6 text-sm text-red-600">Error: {err}</div>;
    if (!list) return <div className="p-6 text-sm text-neutral-500">List not found</div>;

    return (
        <div className="p-6 space-y-4">
            <div className="flex items-start justify-between gap-3">
                <div>
                    <div className="text-xl font-semibold">{title}</div>
                    <div className="text-xs text-neutral-500">
                        workspace: <span className="font-mono">{list.workspace}</span> • slug:{" "}
                        <span className="font-mono">{list.slug}</span>
                    </div>
                    {list.description && <div className="mt-2 text-sm text-neutral-700">{list.description}</div>}
                </div>

                <div className="flex gap-2">
                    <button
                        className="px-3 py-2 rounded-md border border-neutral-300 bg-white text-neutral-700 text-sm hover:bg-neutral-50 transition-colors"
                        onClick={() => router.push(`/workspaces/${list.workspace}`)}
                    >
                        Back
                    </button>
                    <button
                        className="px-3 py-2 rounded-md bg-neutral-900 text-white text-sm hover:bg-black transition-colors"
                        onClick={() => router.push(`?newTask=1&workspace=${list.workspace}&list_id=${listId}`)}
                    >
                        + New Task
                    </button>
                </div>
            </div>

            <div className="border-t pt-4">
                <div className="flex gap-6 border-b mb-4">
                    {(["all", "inbox", "planned", "done"] as const).map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`pb-2 text-sm font-medium border-b-2 transition-colors ${activeTab === tab
                                    ? "border-neutral-900 text-neutral-900"
                                    : "border-transparent text-neutral-500 hover:text-neutral-700"
                                }`}
                        >
                            {tab.charAt(0).toUpperCase() + tab.slice(1)} <span className="text-xs text-neutral-400 ml-1">({tab === "all" ? tasks.length : tasks.filter(t => t.status === tab).length})</span>
                        </button>
                    ))}
                </div>

                {filteredTasks.length === 0 ? (
                    <div className="text-sm text-neutral-500 py-4">No tasks found in this view</div>
                ) : (
                    <div className="space-y-2">
                        {filteredTasks.map((t) => (
                            <div
                                key={t.id}
                                className="border rounded-lg p-3 flex items-center justify-between cursor-pointer hover:border-black/20 hover:shadow-sm transition-all group bg-white"
                                onClick={() => router.push(`?taskId=${t.id}`)}
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`w-2 h-2 shrink-0 rounded-full ${t.status === 'done' ? 'bg-green-500' : t.status === 'inbox' ? 'bg-neutral-300' : 'bg-blue-500'}`} />
                                    <div>
                                        <div className={`text-sm font-medium ${t.status === 'done' ? 'text-neutral-400 line-through' : 'text-neutral-900'}`}>{t.title}</div>
                                        <div className="text-xs text-neutral-500 mt-0.5">
                                            <span className="uppercase tracking-wide">{t.status}</span>
                                            {t.scheduled_date && <span className="ml-2 font-mono bg-neutral-100 px-1 py-0.5 rounded">{t.scheduled_date}</span>}
                                        </div>
                                    </div>
                                </div>
                                <div className="text-neutral-300 group-hover:text-black transition-colors">→</div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
