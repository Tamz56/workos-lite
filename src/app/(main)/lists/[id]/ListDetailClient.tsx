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

    const title = useMemo(() => list?.title ?? "List", [list?.title]);

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

                <button
                    className="px-3 py-2 rounded-md bg-neutral-900 text-white text-sm"
                    onClick={() => router.push(`/workspaces/${list.workspace}`)}
                >
                    Back to workspace
                </button>
            </div>

            <div className="border-t pt-4">
                <div className="text-sm font-semibold mb-2">Tasks in this list ({tasks.length})</div>
                {tasks.length === 0 ? (
                    <div className="text-sm text-neutral-500">No tasks yet</div>
                ) : (
                    <div className="space-y-2">
                        {tasks.map((t) => (
                            <div key={t.id} className="border rounded-lg p-3 flex items-center justify-between">
                                <div>
                                    <div className="text-sm font-medium">{t.title}</div>
                                    <div className="text-xs text-neutral-500">
                                        {t.status} • bucket:{t.schedule_bucket} • date:{t.scheduled_date ?? "-"}
                                    </div>
                                </div>
                                <div className="text-xs text-neutral-400 font-mono">{t.id}</div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
