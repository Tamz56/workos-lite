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
    Filter,
    Archive,
    Globe,
    Send,
    Copy,
    Check,
    Clock,
    Share2,
    Calendar,
    AlertCircle,
    Trash2
} from "lucide-react";
import { Toast } from "@/components/ui/Toast";
import { buildGreenFinenessUtmUrl, extractGreenFinenessTopicId } from "@/lib/content/utm";

type TabKey = "strategy" | "backlog" | "production" | "draft_stock" | "publish_queue";

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

    const updateArticle = async (topicId: string | null | undefined, fields: any) => {
        if (!topicId) {
            console.error("updateArticle called with null/undefined topicId — skipping PATCH", fields);
            return null;
        }
        try {
            const res = await fetch(`/api/content/articles/${encodeURIComponent(topicId)}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(fields)
            });
            if (res.ok) {
                const data = await res.json();
                if (data.article) {
                    // Match by article_id from the response (handles newly-created or repaired rows)
                    setArticles(prev => {
                        const exists = prev.some(a => a.article_id === data.article.article_id);
                        if (exists) {
                            return prev.map(a => a.article_id === data.article.article_id ? data.article : a);
                        }
                        // If article was created fresh, also try matching by old null topic_id + title
                        return prev.map(a => a.topic_id === topicId || (a.topic_id === null && a.title === data.article.title) ? data.article : a);
                    });
                }
                return data.article ?? null;
            } else {
                const errData = await res.json().catch(() => ({}));
                console.error("PATCH failed:", res.status, errData);
                return null;
            }
        } catch (error) {
            console.error("Update failed", error);
            return null;
        }
    };

    const deleteArticle = async (articleId: string, title: string) => {
        if (!window.confirm(`Delete article "${title}"?\n\nThis only removes it from the articles table. Tasks will not be affected.`)) {
            return;
        }
        try {
            const res = await fetch(`/api/content/articles/by-id/${encodeURIComponent(articleId)}`, {
                method: "DELETE",
            });
            if (res.ok) {
                setArticles(prev => prev.filter(a => a.article_id !== articleId));
                setToast({ isVisible: true, message: `🗑 Deleted "${title}"` });
            } else {
                const err = await res.json().catch(() => ({}));
                setToast({ isVisible: true, message: `❌ Delete failed: ${err.error || res.status}` });
            }
        } catch (error) {
            console.error("Delete failed", error);
            setToast({ isVisible: true, message: "❌ Delete failed. See console." });
        }
    };

    return (
        <div className="min-h-screen bg-neutral-50/50 p-8">
            <header className="mb-10 flex items-center justify-between">
                <div>
                    <div className="flex items-center gap-3">
                        <h1 className="text-3xl font-black tracking-tight text-neutral-900">Green Fineness Content Hub</h1>
                        <span className="px-2.5 py-1 bg-indigo-50 text-indigo-600 rounded-lg text-[10px] font-black uppercase tracking-widest border border-indigo-100">Phase 2 Ready</span>
                    </div>
                    <p className="text-sm font-medium text-neutral-500 mt-1">Season → Episode → Article → Draft Stock → Publish Queue → UTM</p>
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
                <button 
                    onClick={() => setActiveTab("draft_stock")}
                    className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === "draft_stock" ? "bg-white text-black shadow-sm" : "text-neutral-500 hover:text-neutral-700"}`}
                >
                    <Globe className="w-4 h-4" />
                    Website Draft Stock
                </button>
                <button 
                    onClick={() => setActiveTab("publish_queue")}
                    className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === "publish_queue" ? "bg-white text-black shadow-sm" : "text-neutral-500 hover:text-neutral-700"}`}
                >
                    <Send className="w-4 h-4" />
                    Publish Queue
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
                            {articles.map(article => {
                                const resolvedTopicId = article.topic_id || extractGreenFinenessTopicId(article.title || "");
                                const isOrphan = !resolvedTopicId;
                                return (
                                <div key={article.article_id} className={`bg-white border rounded-2xl p-5 shadow-sm hover:border-neutral-900/20 transition-all flex items-center justify-between gap-6 group ${isOrphan ? 'border-amber-200 bg-amber-50/30' : 'border-neutral-200'}`}>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1.5">
                                            {isOrphan ? (
                                                <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded bg-amber-100 text-amber-600">
                                                    Missing topic_id
                                                </span>
                                            ) : (
                                                <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded bg-blue-50 text-blue-600">
                                                    {article.topic_id ? article.topic_id : (
                                                        <>Inferred: {resolvedTopicId}</>
                                                    )}
                                                </span>
                                            )}
                                            <span className="text-[9px] font-bold text-neutral-400 uppercase truncate">
                                                {article.season_title} / {article.episode_title}
                                            </span>
                                        </div>
                                        <h3 className="text-base font-black text-neutral-900 truncate" title={article.title}>{article.title}</h3>
                                        <div className="flex items-center gap-4 mt-2">
                                            <div className="flex items-center gap-1.5">
                                                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${isOrphan ? 'bg-amber-400' : 'bg-emerald-500'}`} />
                                                <span className="text-[10px] font-bold text-neutral-500 uppercase">{article.status}</span>
                                            </div>
                                            <div className="text-[10px] font-bold text-neutral-400 uppercase">
                                                Step {article.current_step} of 7
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        {article.website_url && (
                                            <a href={article.website_url} target="_blank" className="p-2.5 bg-neutral-50 text-neutral-400 hover:text-black rounded-xl transition-all border border-transparent hover:border-neutral-200">
                                                <ExternalLink className="w-4 h-4" />
                                            </a>
                                        )}
                                        <button
                                            disabled
                                            className="px-4 py-2 bg-neutral-100 text-neutral-400 rounded-xl text-[10px] font-black transition-all cursor-not-allowed"
                                        >
                                            Article Control — Phase 3
                                        </button>
                                        <button
                                            onClick={() => deleteArticle(article.article_id, article.title)}
                                            className={`p-2.5 rounded-xl transition-all border opacity-100 ${isOrphan ? 'bg-red-50 text-red-500 hover:bg-red-100 border-red-200' : 'bg-neutral-50 text-neutral-400 hover:text-red-500 hover:bg-red-50 border-neutral-200 hover:border-red-200'}`}
                                            title="Delete article row"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                                );
                            })}
                            {articles.length === 0 && (
                                <div className="py-20 text-center bg-white border border-neutral-200 rounded-3xl shadow-sm">
                                    <FileText className="w-12 h-12 text-neutral-300 mx-auto mb-4" />
                                    <p className="text-neutral-500 font-bold">No articles mapped yet.</p>
                                    <p className="text-xs text-neutral-400 mt-2">Open a content task and click <strong className="text-neutral-600">Map to Green Fineness</strong> to create an article mapping.</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {activeTab === "draft_stock" && (
                    <div className="space-y-4">
                        <p className="text-xs text-neutral-500 font-medium px-2">Use this view for articles already uploaded to the website but not yet published.</p>
                        <div className="bg-white border border-neutral-200 rounded-3xl overflow-hidden shadow-sm">
                            <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-neutral-50 border-b border-neutral-100">
                                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-neutral-400">Article</th>
                                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-neutral-400">Website Draft URL</th>
                                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-neutral-400">Pack Status</th>
                                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-neutral-400">Assets</th>
                                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-neutral-400">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-neutral-100">
                                {articles.filter(a => a.status === 'website_draft' || a.status === 'waiting_publish' || a.website_draft_url || a.publish_pack_status !== 'ready').map(article => {
                                    const resolvedTopicId = article.topic_id || extractGreenFinenessTopicId(article.title || "");
                                    return (
                                    <tr key={article.article_id} className="hover:bg-neutral-50/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="font-bold text-neutral-900">{article.title}</div>
                                            <div className="text-[10px] font-mono text-neutral-400">{resolvedTopicId || <span className="text-amber-500">NO-TOPIC</span>}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <input 
                                                    type="text"
                                                    value={article.website_draft_url || ""}
                                                    placeholder="Website Draft URL..."
                                                    className="bg-neutral-50 border border-neutral-100 rounded-lg px-3 py-1.5 text-xs w-48 focus:ring-1 focus:ring-black/5 outline-none"
                                                    onChange={(e) => setArticles(prev => prev.map(a => a.article_id === article.article_id ? { ...a, website_draft_url: e.target.value } : a))}
                                                    onBlur={(e) => updateArticle(resolvedTopicId, { website_draft_url: e.target.value })}
                                                />
                                                {article.website_draft_url && (
                                                    <a href={article.website_draft_url} target="_blank" className="p-1.5 text-neutral-400 hover:text-black transition-colors">
                                                        <ExternalLink className="w-3.5 h-3.5" />
                                                    </a>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <select 
                                                className="bg-neutral-50 border border-neutral-100 rounded-lg px-3 py-1.5 text-[10px] font-black uppercase"
                                                value={article.publish_pack_status}
                                                onChange={(e) => updateArticle(resolvedTopicId, { publish_pack_status: e.target.value })}
                                            >
                                                <option value="not_started">Not Started</option>
                                                <option value="needed">Needed</option>
                                                <option value="in_progress">In Progress</option>
                                                <option value="ready">Ready</option>
                                            </select>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex gap-2">
                                                <span className={`text-[9px] font-black px-2 py-0.5 rounded border ${article.seo_status === 'ready' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-neutral-50 text-neutral-400 border-neutral-100'}`}>SEO</span>
                                                <span className={`text-[9px] font-black px-2 py-0.5 rounded border ${article.schema_status === 'ready' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-neutral-50 text-neutral-400 border-neutral-100'}`}>SCHEMA</span>
                                                <span className={`text-[9px] font-black px-2 py-0.5 rounded border ${article.canva_status === 'ready' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-neutral-50 text-neutral-400 border-neutral-100'}`}>CANVA</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <button 
                                                onClick={() => updateArticle(resolvedTopicId, { status: 'waiting_publish', publish_status: 'publish_pack_ready' })}
                                                disabled={!resolvedTopicId}
                                                className="px-4 py-2 bg-black text-white rounded-xl text-[10px] font-black hover:bg-neutral-800 transition-all shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
                                            >
                                                To Queue
                                            </button>
                                        </td>
                                    </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                        {articles.filter(a => a.status === 'website_draft' || a.status === 'waiting_publish' || a.website_draft_url || a.publish_pack_status !== 'ready').length === 0 && (
                            <div className="py-20 text-center">
                                <Archive className="w-12 h-12 text-neutral-300 mx-auto mb-4" />
                                <p className="text-neutral-500 font-bold">No website drafts yet.</p>
                                <p className="text-xs text-neutral-400 mt-2">Add a Website Draft URL or set status to website_draft.</p>
                            </div>
                        )}
                    </div>
                </div>
                )}

                {activeTab === "publish_queue" && (
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 gap-6">
                            {articles.filter(a => ['waiting_url', 'needs_utm', 'publish_pack_ready', 'scheduled', 'website_published', 'group_posted', 'page_posted', 'personal_posted'].includes(a.publish_status) || a.publish_pack_status === 'ready' || a.ready_to_publish === 1).map(article => {
                            // Resolve effective topic_id — try to infer from title if column is null
                            const resolvedTopicId = article.topic_id || extractGreenFinenessTopicId(article.title || "");

                            // If still no topic_id, show a clear warning card instead of a broken PATCH
                            if (!resolvedTopicId) {
                                return (
                                    <div key={article.article_id} className="bg-amber-50 border border-amber-200 rounded-3xl p-6 flex items-start gap-4">
                                        <AlertCircle className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0" />
                                        <div>
                                            <p className="font-black text-amber-900 text-sm">{article.title || "Untitled Article"}</p>
                                            <p className="text-xs text-amber-700 mt-1">Missing topic_id. Please remap this article — the task title must contain a GF-CONTENT-### code.</p>
                                            <p className="text-[10px] font-mono text-amber-500 mt-1">Article ID: {article.article_id}</p>
                                        </div>
                                    </div>
                                );
                            }

                            return (
                                <div key={article.article_id} className="bg-white border border-neutral-200 rounded-3xl shadow-sm overflow-hidden">

                                    {/* ── Card Header ───────────────────────────── */}
                                    <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-100">
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className="w-10 h-10 bg-neutral-900 rounded-2xl flex items-center justify-center flex-shrink-0">
                                                <Clock className="w-5 h-5 text-white" />
                                            </div>
                                            <div className="min-w-0">
                                                <h3 className="text-base font-black text-neutral-900 leading-tight truncate">{article.title}</h3>
                                                <div className="flex items-center gap-2 mt-0.5">
                                                    <span className="text-[10px] font-mono text-neutral-400">{resolvedTopicId}</span>
                                                    <span className="w-1 h-1 rounded-full bg-neutral-200 flex-shrink-0" />
                                                    <span className="text-[10px] font-black uppercase text-neutral-400">{article.status}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <select
                                            className="ml-4 flex-shrink-0 bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-xs font-bold outline-none"
                                            value={article.publish_status || "waiting_url"}
                                            onChange={(e) => updateArticle(resolvedTopicId, { publish_status: e.target.value })}
                                        >
                                            <option value="waiting_url">Waiting URL</option>
                                            <option value="needs_utm">Needs UTM</option>
                                            <option value="publish_pack_ready">Pack Ready</option>
                                            <option value="scheduled">Scheduled</option>
                                            <option value="website_published">Published</option>
                                            <option value="complete">Complete</option>
                                        </select>
                                    </div>

                                    <div className="p-6 flex flex-col gap-6">

                                        {/* ── Final Website URL + Generate UTMs ──── */}
                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between">
                                                <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">Final Website URL</label>
                                                <span className="text-[10px] font-medium text-neutral-400">Generate UTMs only after the final public URL is confirmed.</span>
                                            </div>
                                            {!resolvedTopicId && (
                                                <p className="text-[10px] text-amber-600 font-bold px-1">⚠ Missing topic_id. Remap this article before saving.</p>
                                            )}
                                            <div className="flex items-center gap-3">
                                                <input
                                                    className="flex-1 bg-neutral-50 border border-neutral-100 rounded-xl px-4 py-2.5 text-sm font-medium outline-none focus:ring-2 focus:ring-black/5"
                                                    value={article.final_url || ""}
                                                    placeholder="https://greenfineness.com/..."
                                                    onChange={(e) => setArticles(prev => prev.map(a => a.article_id === article.article_id ? { ...a, final_url: e.target.value } : a))}
                                                    onBlur={(e) => updateArticle(resolvedTopicId, { final_url: e.target.value })}
                                                />
                                                {article.final_url && (
                                                    <a
                                                        href={article.final_url}
                                                        target="_blank"
                                                        className="p-2.5 bg-neutral-50 border border-neutral-200 text-neutral-400 hover:text-black hover:border-neutral-900 rounded-xl transition-all flex-shrink-0"
                                                    >
                                                        <ExternalLink className="w-4 h-4" />
                                                    </a>
                                                )}
                                                <button
                                                    onClick={async () => {
                                                        const g = buildGreenFinenessUtmUrl({ finalUrl: article.final_url, channel: "group", slug: article.slug, topicId: resolvedTopicId });
                                                        const p = buildGreenFinenessUtmUrl({ finalUrl: article.final_url, channel: "page", slug: article.slug, topicId: resolvedTopicId });
                                                        const per = buildGreenFinenessUtmUrl({ finalUrl: article.final_url, channel: "personal", slug: article.slug, topicId: resolvedTopicId });
                                                        // Optimistically update local state immediately so UTM rows appear right away
                                                        setArticles(prev => prev.map(a => a.article_id === article.article_id ? { ...a, utm_group: g, utm_page: p, utm_personal: per, publish_status: 'publish_pack_ready' } : a));
                                                        // Then persist to DB
                                                        const result = await updateArticle(resolvedTopicId, {
                                                            utm_group: g,
                                                            utm_page: p,
                                                            utm_personal: per,
                                                            publish_status: 'publish_pack_ready'
                                                        });
                                                        if (result) {
                                                            setToast({ isVisible: true, message: "🚀 UTM links generated & saved!" });
                                                        } else {
                                                            setToast({ isVisible: true, message: "❌ Failed to save UTMs. Please try again." });
                                                        }
                                                    }}
                                                    disabled={!article.final_url || !resolvedTopicId}
                                                    className="flex-shrink-0 px-5 py-2.5 bg-black text-white rounded-xl text-xs font-black hover:bg-neutral-800 transition-all shadow-md shadow-black/10 disabled:opacity-40 disabled:cursor-not-allowed"
                                                >
                                                    Generate UTMs
                                                </button>
                                            </div>
                                        </div>

                                        {/* ── UTM Links ─────────────────────────── */}
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">UTM Links</label>
                                            <div className="space-y-2">
                                                {[
                                                    { label: 'FB Group', key: 'utm_group' },
                                                    { label: 'FB Page', key: 'utm_page' },
                                                    { label: 'Personal', key: 'utm_personal' }
                                                ].map(utm => (
                                                    <div key={utm.key} className="flex items-center gap-2">
                                                        <span className="text-[9px] font-black text-neutral-400 uppercase w-14 flex-shrink-0">{utm.label}</span>
                                                        <div className="flex-1 bg-neutral-50 border border-neutral-100 rounded-xl px-4 py-2 text-[10px] font-mono text-neutral-600 truncate min-w-0">
                                                            {article[utm.key] || <span className="text-neutral-300 font-sans font-medium">No link generated</span>}
                                                        </div>
                                                        <button
                                                            disabled={!article[utm.key]}
                                                            onClick={() => {
                                                                navigator.clipboard.writeText(article[utm.key]);
                                                                setToast({ isVisible: true, message: `Copied ${utm.label} UTM!` });
                                                            }}
                                                            className="p-2 bg-white border border-neutral-200 text-neutral-400 hover:text-black hover:border-neutral-900 rounded-xl transition-all disabled:opacity-30 flex-shrink-0"
                                                        >
                                                            <Copy className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {/* ── Post Tracking ─────────────────────── */}
                                        <div className="space-y-2 pt-2 border-t border-neutral-100">
                                            <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">Post Tracking</label>
                                            <div className="grid grid-cols-3 gap-3">
                                                <div className="space-y-1">
                                                    <span className="text-[9px] font-black text-neutral-400 uppercase ml-1">FB Group</span>
                                                    <select
                                                        className="w-full bg-neutral-50 border border-neutral-100 rounded-xl px-3 py-2 text-xs font-bold outline-none"
                                                        value={article.group_post_status || "not_started"}
                                                        onChange={(e) => updateArticle(resolvedTopicId, { group_post_status: e.target.value })}
                                                    >
                                                        <option value="not_started">Not Started</option>
                                                        <option value="draft_needed">Draft Needed</option>
                                                        <option value="posted">Posted</option>
                                                    </select>
                                                </div>
                                                <div className="space-y-1">
                                                    <span className="text-[9px] font-black text-neutral-400 uppercase ml-1">FB Page</span>
                                                    <select
                                                        className="w-full bg-neutral-50 border border-neutral-100 rounded-xl px-3 py-2 text-xs font-bold outline-none"
                                                        value={article.page_post_status || "not_started"}
                                                        onChange={(e) => updateArticle(resolvedTopicId, { page_post_status: e.target.value })}
                                                    >
                                                        <option value="not_started">Not Started</option>
                                                        <option value="draft_needed">Draft Needed</option>
                                                        <option value="posted">Posted</option>
                                                    </select>
                                                </div>
                                                <div className="space-y-1">
                                                    <span className="text-[9px] font-black text-neutral-400 uppercase ml-1">Publish Date</span>
                                                    <input
                                                        type="date"
                                                        value={article.publish_date || ""}
                                                        onChange={(e) => updateArticle(resolvedTopicId, { publish_date: e.target.value })}
                                                        className="w-full bg-neutral-50 border border-neutral-100 rounded-xl px-3 py-2 text-xs font-bold outline-none"
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        {/* ── Footer ────────────────────────────── */}
                                        <div className="flex items-center justify-end pt-2 border-t border-neutral-50">
                                            <button
                                                onClick={() => updateArticle(resolvedTopicId, { publish_status: 'complete', status: 'published' })}
                                                className="flex items-center gap-2 px-6 py-2.5 bg-emerald-500 text-white rounded-xl text-xs font-black hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/20"
                                            >
                                                <Check className="w-4 h-4" />
                                                Complete Article
                                            </button>
                                        </div>

                                    </div>
                                </div>
                            );
                            })}
                            {articles.filter(a => ['waiting_url', 'needs_utm', 'publish_pack_ready', 'scheduled', 'website_published', 'group_posted', 'page_posted', 'personal_posted'].includes(a.publish_status) || a.publish_pack_status === 'ready' || a.ready_to_publish === 1).length === 0 && (
                                <div className="py-20 text-center bg-white border border-neutral-200 rounded-3xl shadow-sm">
                                    <Send className="w-12 h-12 text-neutral-300 mx-auto mb-4" />
                                    <p className="text-neutral-500 font-bold">No articles in the publish queue yet.</p>
                                    <p className="text-xs text-neutral-400 mt-2">Move an article from Draft Stock or set publish status to needs_utm.</p>
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
