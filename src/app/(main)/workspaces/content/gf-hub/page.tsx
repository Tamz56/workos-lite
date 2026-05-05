"use client";

import React, { useState, useEffect } from "react";
import { 
    Layers, 
    ListChecks, 
    FileText, 
    Plus, 
    RefreshCcw, 
    ExternalLink, 
    ChevronRight,
    Search,
    Filter
} from "lucide-react";
import { Toast } from "@/components/ui/Toast";

type TabKey = "strategy" | "backlog" | "production";

export default function GreenFinenessHub() {
    const [activeTab, setActiveTab] = useState<TabKey>("strategy");
    const [seasons, setSeasons] = useState<any[]>([]);
    const [episodes, setEpisodes] = useState<any[]>([]);
    const [articles, setArticles] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [seeding, setSeeding] = useState(false);
    const [toast, setToast] = useState<{ isVisible: boolean; message: string }>({ isVisible: false, message: "" });

    const fetchData = async () => {
        setLoading(true);
        try {
            const [sRes, eRes, aRes] = await Promise.all([
                fetch("/api/content/gf/seasons"),
                fetch("/api/content/gf/episodes"),
                fetch("/api/content/articles")
            ]);
            
            if (sRes.ok) setSeasons(await sRes.json());
            if (eRes.ok) setEpisodes(await eRes.json());
            if (aRes.ok) setArticles(await aRes.json());
        } catch (error) {
            console.error("Failed to fetch Hub data", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleSeed = async () => {
        setSeeding(true);
        try {
            const res = await fetch("/api/content/gf/seed", { method: "POST" });
            if (res.ok) {
                setToast({ isVisible: true, message: "🌱 Seeding Season 1 complete!" });
                fetchData();
            }
        } catch (error) {
            console.error("Seeding failed", error);
        } finally {
            setSeeding(false);
        }
    };

    return (
        <div className="min-h-screen bg-neutral-50/50 p-8">
            <header className="mb-10 flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-black tracking-tight text-neutral-900">Green Fineness</h1>
                    <p className="text-sm font-medium text-neutral-500 mt-1">Content Operating Model — Phase 1</p>
                </div>
                
                <div className="flex items-center gap-3">
                    <button 
                        onClick={handleSeed}
                        disabled={seeding}
                        className="flex items-center gap-2 px-5 py-2.5 bg-white border border-neutral-200 rounded-xl text-sm font-bold text-neutral-600 hover:bg-neutral-50 transition-all shadow-sm disabled:opacity-50"
                    >
                        <RefreshCcw className={`w-4 h-4 ${seeding ? 'animate-spin' : ''}`} />
                        {seeding ? 'Seeding...' : 'Seed Season 1'}
                    </button>
                    <button className="flex items-center gap-2 px-6 py-2.5 bg-black text-white rounded-xl text-sm font-black hover:bg-neutral-800 transition-all shadow-lg shadow-black/10">
                        <Plus className="w-4 h-4" />
                        New Season
                    </button>
                </div>
            </header>

            {/* Tabs */}
            <div className="flex items-center gap-1 bg-neutral-200/50 p-1.5 rounded-2xl w-fit mb-8">
                <button 
                    onClick={() => setActiveTab("strategy")}
                    className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === "strategy" ? "bg-white text-black shadow-sm" : "text-neutral-500 hover:text-neutral-700"}`}
                >
                    <Layers className="w-4 h-4" />
                    Season Strategy
                </button>
                <button 
                    onClick={() => setActiveTab("backlog")}
                    className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === "backlog" ? "bg-white text-black shadow-sm" : "text-neutral-500 hover:text-neutral-700"}`}
                >
                    <ListChecks className="w-4 h-4" />
                    Episode Backlog
                </button>
                <button 
                    onClick={() => setActiveTab("production")}
                    className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === "production" ? "bg-white text-black shadow-sm" : "text-neutral-500 hover:text-neutral-700"}`}
                >
                    <FileText className="w-4 h-4" />
                    Article Production
                </button>
            </div>

            {/* Content */}
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                {activeTab === "strategy" && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {seasons.map(season => (
                            <div key={season.season_id} className="bg-white border border-neutral-200 rounded-3xl p-6 shadow-sm hover:shadow-md transition-all group cursor-pointer">
                                <div className="flex items-center justify-between mb-4">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg">
                                        {season.status}
                                    </span>
                                    <ChevronRight className="w-5 h-5 text-neutral-300 group-hover:text-neutral-900 transition-colors" />
                                </div>
                                <h3 className="text-xl font-black text-neutral-900 mb-2">{season.season_title}</h3>
                                <p className="text-sm text-neutral-500 leading-relaxed line-clamp-2">
                                    {season.season_description || "No description provided."}
                                </p>
                                <div className="mt-6 pt-6 border-t border-neutral-100 flex items-center justify-between">
                                    <div className="flex -space-x-2">
                                        {[1, 2, 3].map(i => (
                                            <div key={i} className="w-8 h-8 rounded-full bg-neutral-100 border-2 border-white flex items-center justify-center text-[10px] font-bold text-neutral-400">
                                                {i}
                                            </div>
                                        ))}
                                    </div>
                                    <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-tight">12 Episodes</span>
                                </div>
                            </div>
                        ))}
                        {seasons.length === 0 && (
                            <div className="col-span-full py-20 text-center bg-white border-2 border-dashed border-neutral-200 rounded-3xl">
                                <Layers className="w-12 h-12 text-neutral-300 mx-auto mb-4" />
                                <p className="text-neutral-500 font-bold">No seasons found. Try seeding Season 1.</p>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === "backlog" && (
                    <div className="bg-white border border-neutral-200 rounded-3xl overflow-hidden shadow-sm">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-neutral-50 border-b border-neutral-100">
                                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-neutral-400">#</th>
                                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-neutral-400">Episode Title</th>
                                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-neutral-400">Status</th>
                                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-neutral-400">Journey Stage</th>
                                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-neutral-400">Priority</th>
                                    <th className="px-6 py-4"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-neutral-100">
                                {episodes.map(ep => (
                                    <tr key={ep.episode_id} className="hover:bg-neutral-50/50 transition-colors group">
                                        <td className="px-6 py-4 text-sm font-mono text-neutral-400">{ep.episode_no}</td>
                                        <td className="px-6 py-4">
                                            <div className="font-bold text-neutral-900">{ep.episode_title}</div>
                                            <div className="text-[10px] text-neutral-400 mt-0.5">{ep.episode_id}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-[9px] font-black uppercase tracking-tight px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-500 border border-neutral-200">
                                                {ep.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-neutral-600">{ep.journey_stage || "-"}</td>
                                        <td className="px-6 py-4">
                                            <div className="flex gap-0.5">
                                                {[1, 2, 3, 4].map(i => (
                                                    <div key={i} className={`w-1.5 h-1.5 rounded-full ${i <= (ep.priority || 2) ? 'bg-indigo-500' : 'bg-neutral-200'}`} />
                                                ))}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button className="p-2 text-neutral-300 hover:text-neutral-900 transition-colors">
                                                <ExternalLink className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {episodes.length === 0 && (
                            <div className="py-20 text-center">
                                <ListChecks className="w-12 h-12 text-neutral-300 mx-auto mb-4" />
                                <p className="text-neutral-500 font-bold">No episodes found.</p>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === "production" && (
                    <div className="space-y-6">
                        <div className="flex items-center gap-4 bg-white border border-neutral-200 rounded-2xl p-4 shadow-sm">
                            <div className="relative flex-1">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                                <input 
                                    type="text" 
                                    placeholder="Search articles by title or topic ID..."
                                    className="w-full bg-neutral-50 border-none rounded-xl pl-11 pr-4 py-2 text-sm focus:ring-2 focus:ring-black/5 transition-all outline-none"
                                />
                            </div>
                            <button className="flex items-center gap-2 px-4 py-2 bg-neutral-50 rounded-xl text-xs font-bold text-neutral-600 hover:bg-neutral-100 transition-all">
                                <Filter className="w-3.5 h-3.5" />
                                Filter
                            </button>
                        </div>

                        <div className="grid grid-cols-1 gap-4">
                            {articles.map(article => (
                                <div key={article.article_id} className="bg-white border border-neutral-200 rounded-2xl p-5 shadow-sm hover:border-neutral-900/20 transition-all flex items-center justify-between gap-6 group">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1.5">
                                            <span className="text-[9px] font-black uppercase tracking-widest text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                                                {article.topic_id || "NO-TOPIC"}
                                            </span>
                                            <span className="text-[9px] font-bold text-neutral-400 uppercase">
                                                {article.season_title} / {article.episode_title}
                                            </span>
                                        </div>
                                        <h3 className="text-base font-black text-neutral-900 truncate">{article.title}</h3>
                                        <div className="flex items-center gap-4 mt-2">
                                            <div className="flex items-center gap-1.5">
                                                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                                                <span className="text-[10px] font-bold text-neutral-500 uppercase">{article.status}</span>
                                            </div>
                                            <div className="text-[10px] font-bold text-neutral-400 uppercase">
                                                Step {article.current_step} of 7
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        {article.website_url && (
                                            <a href={article.website_url} target="_blank" className="p-2.5 bg-neutral-50 text-neutral-400 hover:text-black rounded-xl transition-all border border-transparent hover:border-neutral-200">
                                                <ExternalLink className="w-4 h-4" />
                                            </a>
                                        )}
                                        <button className="px-5 py-2.5 bg-black text-white rounded-xl text-xs font-black hover:bg-neutral-800 transition-all opacity-0 group-hover:opacity-100">
                                            Manage Article
                                        </button>
                                    </div>
                                </div>
                            ))}
                            {articles.length === 0 && (
                                <div className="py-20 text-center bg-white border border-neutral-200 rounded-3xl shadow-sm">
                                    <FileText className="w-12 h-12 text-neutral-300 mx-auto mb-4" />
                                    <p className="text-neutral-500 font-bold">No articles in production yet.</p>
                                    <p className="text-xs text-neutral-400 mt-2">Mapped articles will appear here.</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            <Toast 
                isVisible={toast.isVisible} 
                message={toast.message} 
                onClose={() => setToast({ ...toast, isVisible: false })} 
            />
        </div>
    );
}
