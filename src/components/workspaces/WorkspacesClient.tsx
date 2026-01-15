"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { WORKSPACES_LIST } from "@/lib/workspaces";

type WorkspaceStat = {
    key: string;
    label: string;
    total: number;
    overdue: number;
    inbox: number;
    recent: { id: string; title: string; status: string; updated_at: string }[];
};

function WorkspaceCard({ stat }: { stat: WorkspaceStat }) {
    const router = useRouter();

    return (
        <div
            className="group flex flex-col bg-white border border-neutral-200 rounded-2xl p-5 hover:shadow-lg transition-all cursor-pointer h-full"
            onClick={() => router.push(`/workspaces/${stat.key}`)}
        >
            <div className="flex items-center justify-between mb-4">
                <div className="font-bold text-lg text-neutral-800">{stat.label}</div>
                <div className="text-xs font-bold text-neutral-400 uppercase tracking-widest">{stat.total} Active</div>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-5">
                <div className="bg-red-50 text-red-700 rounded-lg p-3 text-center border border-red-100">
                    <div className="text-lg font-bold leading-none">{stat.overdue}</div>
                    <div className="text-[10px] uppercase font-bold opacity-70 mt-1">Overdue</div>
                </div>
                <div className="bg-neutral-100 text-neutral-700 rounded-lg p-3 text-center border border-neutral-200">
                    <div className="text-lg font-bold leading-none">{stat.inbox}</div>
                    <div className="text-[10px] uppercase font-bold opacity-70 mt-1">Inbox</div>
                </div>
            </div>

            <div className="space-y-2 flex-1">
                {stat.recent.length === 0 && (
                    <div className="text-center text-xs text-neutral-400 italic py-4">No active tasks</div>
                )}
                {stat.recent.map(t => (
                    <div
                        key={t.id}
                        onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/workspaces?taskId=${t.id}`);
                        }}
                        className="flex items-center gap-2 text-xs py-1.5 border-b border-neutral-50 last:border-0 hover:bg-neutral-50 -mx-2 px-2 rounded cursor-pointer group/item"
                    >
                        <span className={`w-1.5 h-1.5 rounded-full ${t.status === 'inbox' ? 'bg-neutral-300' : 'bg-green-500'}`} />
                        <span className="truncate flex-1 text-neutral-600 group-hover/item:text-black transition-colors">{t.title}</span>
                    </div>
                ))}
            </div>

            <div className="mt-4 pt-3 border-t border-neutral-100 text-center">
                <span className="text-xs font-bold text-blue-600 group-hover:underline">Open Workspace →</span>
            </div>
        </div>
    );
}

export default function WorkspacesClient() {
    const [stats, setStats] = useState<WorkspaceStat[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch("/api/workspaces/summary")
            .then(res => res.json())
            .then(data => setStats(data))
            .finally(() => setLoading(false));
    }, []);

    if (loading) return <div className="p-10 flex justify-center text-neutral-400 animate-pulse">Loading workspaces...</div>;

    return (
        <div className="p-6 2xl:p-10 max-w-7xl mx-auto">
            <h1 className="text-3xl font-bold font-display tracking-tight text-neutral-900 mb-8">Workspaces</h1>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
                {stats.map(s => (
                    <WorkspaceCard key={s.key} stat={s} />
                ))}
            </div>
        </div>
    );
}
