import { useEffect, useState } from "react";
import { ProjectItem } from "@/lib/types";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

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

    if (loading) return (
        <div className="p-12 text-center flex flex-col items-center gap-4">
            <div className="w-8 h-8 border-2 border-neutral-200 border-t-neutral-800 rounded-full animate-spin"></div>
            <div className="text-sm text-neutral-500 font-medium tracking-tight">Loading timeline...</div>
        </div>
    );

    return (
        <div className="p-6 max-w-7xl mx-auto w-full pb-20">
            <h1 className="text-2xl font-black mb-8 tracking-tight">Timeline</h1>

            {items.length === 0 ? (
                <div className="bg-white border border-neutral-200 rounded-3xl p-12 text-center">
                    <div className="text-neutral-300 text-3xl mb-3">⏳</div>
                    <div className="text-neutral-500 text-sm font-medium">No items found. Ensure projects have active timeline items.</div>
                </div>
            ) : (
                <>
                    {/* Desktop Gantt View (simplified) */}
                    <div className="hidden md:block overflow-hidden bg-white border border-neutral-200 rounded-3xl shadow-sm">
                        {workstreams.map(ws => (
                            <div key={ws} className="border-b border-neutral-100 last:border-0">
                                <div className="bg-neutral-50/50 px-6 py-3 font-black text-[10px] text-neutral-400 border-b border-neutral-100 uppercase tracking-widest">
                                    {ws}
                                </div>
                                <div className="p-4 space-y-4 relative">
                                    {items.filter(i => (i.workstream || "Uncategorized") === ws).map(item => (
                                        <div key={item.id} className="flex items-center text-sm group">
                                            <div className="w-1/3 pr-6">
                                                {item.project_slug ? (
                                                    <Link href={`/projects/${item.project_slug}`} className="block group/link">
                                                        <div className="text-xs text-neutral-400 mb-0.5 group-hover/link:text-neutral-900 transition-colors">
                                                            {item.project_name || item.project_slug}
                                                        </div>
                                                        <div className="font-bold text-neutral-800 group-hover:text-black transition-colors truncate">
                                                            {item.title}
                                                        </div>
                                                    </Link>
                                                ) : (
                                                    <div className="truncate font-bold text-neutral-800">
                                                        {item.title}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="w-2/3 flex items-center justify-between h-10 bg-neutral-50 border border-neutral-100/50 rounded-2xl px-4 relative group-hover:bg-neutral-100 transition-colors">
                                                <div className={`px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded-full border shadow-sm ${item.status === 'done' ? 'bg-green-50 border-green-200 text-green-700' : item.status === 'planned' ? 'bg-blue-50 border-blue-100 text-blue-600' : 'bg-white border-neutral-200 text-neutral-600'}`}>
                                                    {item.start_date || 'TBD'} &rarr; {item.end_date || 'TBD'}
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    {item.is_milestone === 1 && <span className="text-[10px] bg-purple-50 text-purple-700 border border-purple-100 px-2 py-0.5 rounded-full font-black uppercase tracking-widest shadow-sm">Milestone</span>}
                                                    {item.project_slug && <Link href={`/projects/${item.project_slug}`} className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-white rounded-lg"><ChevronRight className="w-4 h-4 text-neutral-400" /></Link>}
                                                </div>
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
                            <Link 
                                key={item.id} 
                                href={item.project_slug ? `/projects/${item.project_slug}` : '#'} 
                                className="block bg-white border border-neutral-200 rounded-3xl p-5 shadow-sm active:scale-[0.98] transition-all"
                            >
                                <div className="text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-2">{item.project_name} &bull; {item.workstream || "Uncategorized"}</div>
                                <h3 className="font-bold text-neutral-900 flex items-center gap-2">
                                    {item.title}
                                    {item.is_milestone === 1 && <span className="text-[9px] bg-purple-50 text-purple-700 border border-purple-100 px-1.5 py-0.5 rounded-full uppercase font-black tracking-widest">Milestone</span>}
                                </h3>
                                <div className="mt-4 flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                                    <span className={`px-2 py-1 rounded-lg border ${item.status === 'done' ? 'bg-green-50 border-green-100 text-green-700' : item.status === 'planned' ? 'bg-blue-50 border-blue-100 text-blue-700' : 'bg-neutral-50 border-neutral-200 text-neutral-600'}`}>
                                        {item.status}
                                    </span>
                                    <span className="text-neutral-400">
                                        {item.start_date || 'TBD'} &rarr; {item.end_date || 'TBD'}
                                    </span>
                                </div>
                            </Link>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}
