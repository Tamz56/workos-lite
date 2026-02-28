"use client";

import { useEffect, useState } from "react";
import { ProjectItem } from "@/lib/types";

export default function TimelineClient() {
    const [items, setItems] = useState<ProjectItem[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchTimeline = async () => {
            setLoading(true);
            try {
                // Fetch recent timeline items across all projects
                const res = await fetch("/api/timeline");
                if (res.ok) setItems(await res.json());
            } finally {
                setLoading(false);
            }
        };
        fetchTimeline();
    }, []);

    // Group by workstream
    const workstreams = Array.from(new Set(items.map(i => i.workstream || "Uncategorized")));

    if (loading) return <div className="p-6 text-sm text-neutral-500">Loading timeline...</div>;

    return (
        <div className="p-6 max-w-7xl mx-auto w-full">
            <h1 className="text-2xl font-bold mb-6">Timeline</h1>

            {items.length === 0 ? (
                <div className="text-neutral-500 text-sm">No items found. Ensure projects have project items.</div>
            ) : (
                <>
                    {/* Desktop Gantt View (simplified) */}
                    <div className="hidden md:block overflow-x-auto bg-white border border-neutral-200 rounded-lg">
                        {workstreams.map(ws => (
                            <div key={ws} className="border-b border-neutral-100 last:border-0">
                                <div className="bg-neutral-50 px-4 py-2 font-medium text-sm text-neutral-700 border-b border-neutral-100 uppercase tracking-wider">
                                    {ws}
                                </div>
                                <div className="p-4 space-y-3 relative">
                                    {items.filter(i => (i.workstream || "Uncategorized") === ws).map(item => (
                                        <div key={item.id} className="flex items-center text-sm group">
                                            <div className="w-1/3 truncate font-medium text-neutral-800 pr-4">
                                                {item.project_name && <span className="text-neutral-400 mr-2 font-normal">[{item.project_name}]</span>}
                                                {item.title}
                                            </div>
                                            <div className="w-2/3 flex items-center h-8 bg-neutral-50 border border-neutral-100 rounded-md px-2 relative">
                                                <div className={`px-3 py-1 text-xs rounded-full border shadow-sm ${item.status === 'done' ? 'bg-green-100 border-green-200 text-green-700' : item.status === 'planned' ? 'bg-blue-100 border-blue-200 text-blue-700' : 'bg-neutral-100 border-neutral-200 text-neutral-700'}`}>
                                                    {item.start_date || 'TBD'} &rarr; {item.end_date || 'TBD'}
                                                </div>
                                                {item.is_milestone === 1 && <span className="ml-3 text-xs bg-purple-100 text-purple-700 border border-purple-200 px-2 py-0.5 rounded-full font-medium shadow-sm z-10">Milestone</span>}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Mobile List View */}
                    <div className="md:hidden space-y-4">
                        {items.map(item => (
                            <div key={item.id} className="bg-white border border-neutral-200 rounded-lg p-4 shadow-sm">
                                <div className="text-xs text-neutral-500 mb-1">{item.project_name} &bull; {item.workstream || "Uncategorized"}</div>
                                <h3 className="font-semibold text-neutral-900">
                                    {item.title}
                                    {item.is_milestone === 1 && <span className="ml-2 text-[10px] bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">Milestone</span>}
                                </h3>
                                <div className="mt-3 flex justify-between items-center text-xs">
                                    <span className={`px-2 py-1 rounded font-medium ${item.status === 'done' ? 'bg-green-100 text-green-700' : item.status === 'planned' ? 'bg-blue-100 text-blue-700' : 'bg-neutral-100 text-neutral-700'}`}>
                                        {item.status.toUpperCase()}
                                    </span>
                                    <span className="text-neutral-600 font-medium">
                                        {item.start_date || 'TBD'} &rarr; {item.end_date || 'TBD'}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}
