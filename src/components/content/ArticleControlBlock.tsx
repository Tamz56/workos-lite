"use client";

import React, { useState, useEffect, useCallback } from "react";
import { 
    Activity, 
    Link2, 
    Layout, 
    Share2, 
    Image as ImageIcon, 
    CheckCircle2, 
    Circle,
    Save,
    ChevronRight,
    MapPin,
    AlertCircle,
    Loader2,
    BookOpen,
    Plus,
    ExternalLink
} from "lucide-react";
import { extractGreenFinenessTopicId } from "@/lib/content/utm";

interface ArticleMapping {
    article_id: string;
    topic_id: string;
    season_id: string | null;
    episode_id: string | null;
    title: string;
    slug: string | null;
    website_url: string | null;
    website_draft_url: string | null;
    final_url: string | null;
    publish_status: string;
    publish_date: string | null;
    status: string;
    current_step: string;
    publish_pack_status: string;
    group_post_status: string;
    page_post_status: string;
    personal_post_status: string;
    canva_status: string;
    image_folder: string | null;
    references_status: string;
    seo_status: string;
    schema_status: string;
    ready_to_publish: number;
    next_action: string | null;
    notes: string | null;
}

const STEPS = [
    "Mini Research Brief",
    "Research Raw — NotebookLM",
    "Research Direction — Arbor Questions",
    "Brief",
    "Outline web article",
    "Script & Caption",
    "Assets / Canva",
    "SEO & Schema",
    "Publish"
];

const ARTICLE_STATUSES = [
    "idea", "planned", "selected", "mini_research", "research", 
    "research_direction", "brief", "outline", "article_draft", 
    "website_draft", "publish_pack_ready", "scheduled", 
    "published", "social_posted", "repurposed", "archived"
];

const PUBLISH_STATUSES = [
    "waiting_url", "needs_utm", "publish_pack_ready", "scheduled", 
    "website_published", "group_posted", "page_posted", "personal_posted", "complete"
];

const PUBLISH_PACK_STATUSES = ["not_started", "needed", "in_progress", "ready", "published", "complete"];
const SOCIAL_STATUSES = ["not_started", "draft_needed", "draft_ready", "posted", "skipped"];
const REF_STATUSES = ["pending", "ready", "checked", "published"];
const IMAGE_STATUSES = ["not_started", "brief_ready", "generated", "uploaded", "published"];

export default function ArticleControlBlock({ topicId, defaultTitle }: { topicId: string, defaultTitle?: string }) {
    // Resolve the canonical GF topic_id:
    // 1. Try to extract from topicId itself (might already be GF-CONTENT-###)
    // 2. Try to extract from defaultTitle (task title often contains GF-CONTENT-###)
    // 3. Fall back to topicId as-is (e.g. task.id UUID — will show unmapped)
    const effectiveTopicId: string | null = (
        extractGreenFinenessTopicId(topicId) ||
        extractGreenFinenessTopicId(defaultTitle || "") ||
        (topicId && !topicId.match(/^[0-9a-f-]{36}$/i) ? topicId : null)
    );

    const [mapping, setMapping] = useState<ArticleMapping | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [seasons, setSeasons] = useState<any[]>([]);
    const [episodes, setEpisodes] = useState<any[]>([]);

    const fetchMapping = useCallback(async () => {
        if (!effectiveTopicId) {
            setLoading(false);
            return;
        }
        setLoading(true);
        try {
            const res = await fetch(`/api/content/articles/${encodeURIComponent(effectiveTopicId)}`);
            if (!res.ok) {
                setMapping(null);
                return;
            }
            const data = await res.json();
            if (data.found) {
                setMapping(data.article);
            } else {
                setMapping(null);
            }
        } catch (error) {
            console.error("Failed to fetch article mapping", error);
            setMapping(null);
        } finally {
            setLoading(false);
        }
    }, [effectiveTopicId]);

    const fetchGfData = async () => {
        try {
            const [sRes, eRes] = await Promise.all([
                fetch("/api/content/gf/seasons"),
                fetch("/api/content/gf/episodes")
            ]);
            if (sRes.ok) setSeasons(await sRes.json());
            if (eRes.ok) setEpisodes(await eRes.json());
        } catch (e) { console.error(e); }
    };

    useEffect(() => {
        fetchMapping();
        fetchGfData();
    }, [fetchMapping]);

    const handleCreateMapping = async () => {
        if (!effectiveTopicId) {
            console.error("Cannot create mapping: no valid GF topic_id resolved.", { topicId, defaultTitle });
            return;
        }
        setSaving(true);
        try {
            const res = await fetch(`/api/content/articles/${encodeURIComponent(effectiveTopicId)}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    title: defaultTitle || "Untitled Article",
                    status: "idea",
                    current_step: "0"
                })
            });
            if (res.ok) fetchMapping();
        } catch (error) {
            console.error("Failed to create mapping", error);
        } finally {
            setSaving(false);
        }
    };

    const updateField = async (field: keyof ArticleMapping, value: string) => {
        if (!mapping || !effectiveTopicId) return;
        setSaving(true);
        try {
            const res = await fetch(`/api/content/articles/${encodeURIComponent(effectiveTopicId)}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ [field]: value })
            });
            if (res.ok) {
                const data = await res.json();
                setMapping(data.article);
            }
        } catch (error) {
            console.error("Update failed", error);
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="p-8 text-center text-neutral-400 font-bold flex items-center justify-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Loading Content Model...</div>;

    // If we can't resolve a valid GF topic_id at all, show a clear warning
    if (!effectiveTopicId) {
        return (
            <div className="bg-amber-50 border border-amber-200 rounded-3xl p-6 flex items-start gap-4">
                <AlertCircle className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0" />
                <div>
                    <h4 className="font-black text-amber-900 text-sm">Cannot resolve Green Fineness Topic ID</h4>
                    <p className="text-xs text-amber-700 mt-1">This task title does not contain a recognizable GF-CONTENT-### code. Please rename the task to include the correct topic ID.</p>
                    <p className="text-[10px] font-mono text-amber-500 mt-2">Task ID: {topicId}</p>
                </div>
            </div>
        );
    }

    if (!mapping) {
        return (
            <div className="bg-neutral-50 border border-neutral-200 rounded-3xl p-8 text-center">
                <MapPin className="w-10 h-10 text-neutral-300 mx-auto mb-4" />
                <h4 className="text-lg font-black text-neutral-900 mb-2">Unmapped Topic</h4>
                <p className="text-sm text-neutral-500 mb-6">This task is not yet part of the Green Fineness Operating Model.</p>
                <button 
                    onClick={handleCreateMapping}
                    disabled={saving}
                    className="bg-black text-white px-8 py-3 rounded-2xl text-sm font-black hover:bg-neutral-800 transition-all flex items-center gap-2 mx-auto"
                >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                    Map to Green Fineness
                </button>
            </div>
        );
    }

    const currentStepIdx = parseInt(mapping.current_step || "0") || 0;

    return (
        <div className="bg-white border border-neutral-200 rounded-[2rem] overflow-hidden shadow-xl shadow-black/5 animate-in fade-in slide-in-from-top-4 duration-500">
            {/* Header */}
            <div className="bg-neutral-900 p-6 text-white flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-emerald-500 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
                        <Activity className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <div className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-400 mb-0.5">Article Control Block</div>
                        <h3 className="text-xl font-black truncate max-w-[400px]">{mapping.title}</h3>
                    </div>
                </div>
                
                <div className="flex items-center gap-3">
                    <div className="text-right mr-4 hidden md:block">
                        <div className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">Next Action</div>
                        <div className="text-sm font-bold text-neutral-200">{mapping.next_action || "None specified"}</div>
                    </div>
                    <div className="w-px h-8 bg-white/10 mx-2" />
                    {saving && <Loader2 className="w-5 h-5 animate-spin text-emerald-400" />}
                </div>
            </div>

            <div className="p-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Workflow Column */}
                <div className="lg:col-span-5 space-y-6">
                    <div>
                        <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-4 block px-1">Workflow Steps</label>
                        <div className="space-y-1">
                            {STEPS.map((step, idx) => {
                                const isDone = idx < currentStepIdx;
                                const isCurrent = idx === currentStepIdx;
                                return (
                                    <button 
                                        key={idx}
                                        onClick={() => updateField("current_step", idx.toString())}
                                        className={`w-full flex items-center gap-4 p-3 rounded-2xl transition-all group ${isCurrent ? 'bg-black text-white shadow-lg' : 'hover:bg-neutral-50 text-neutral-600'}`}
                                    >
                                        <div className={`w-6 h-6 rounded-lg flex items-center justify-center border-2 transition-colors ${isCurrent ? 'border-white text-white' : isDone ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-neutral-200 text-neutral-200 group-hover:border-neutral-400'}`}>
                                            {isDone ? <CheckCircle2 className="w-4 h-4" /> : <span className="text-[10px] font-black">{idx}</span>}
                                        </div>
                                        <span className={`text-sm font-bold ${isCurrent ? 'text-white' : 'text-neutral-700'}`}>{step}</span>
                                        {isCurrent && <ChevronRight className="w-4 h-4 ml-auto text-white/50" />}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Status Column */}
                <div className="lg:col-span-7 space-y-10">
                    {/* Primary Mapping */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest px-1">Season</label>
                            <select 
                                className="w-full bg-neutral-50 border border-neutral-100 rounded-xl px-4 py-2.5 text-sm font-bold focus:ring-2 focus:ring-black/5 outline-none transition-all"
                                value={mapping.season_id || ""}
                                onChange={(e) => updateField("season_id", e.target.value)}
                            >
                                <option value="">None</option>
                                {seasons.map(s => <option key={s.season_id} value={s.season_id}>{s.season_title}</option>)}
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest px-1">Episode</label>
                            <select 
                                className="w-full bg-neutral-50 border border-neutral-100 rounded-xl px-4 py-2.5 text-sm font-bold focus:ring-2 focus:ring-black/5 outline-none transition-all"
                                value={mapping.episode_id || ""}
                                onChange={(e) => updateField("episode_id", e.target.value)}
                            >
                                <option value="">None</option>
                                {(episodes || []).filter(e => e && e.season_id === mapping.season_id).map(e => <option key={e.episode_id} value={e.episode_id || ""}>{e.episode_title || "Untitled Episode"}</option>)}
                            </select>
                        </div>
                    </div>

                    {/* Status Grids */}
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest px-1">Article Status</label>
                            <select 
                                className="w-full bg-neutral-50 border border-neutral-100 rounded-xl px-4 py-2.5 text-xs font-bold focus:ring-2 focus:ring-black/5 outline-none"
                                value={mapping.status || "idea"}
                                onChange={(e) => updateField("status", e.target.value)}
                            >
                                {ARTICLE_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest px-1">Publish Pack</label>
                            <select 
                                className="w-full bg-neutral-50 border border-neutral-100 rounded-xl px-4 py-2.5 text-xs font-bold focus:ring-2 focus:ring-black/5 outline-none"
                                value={mapping.publish_pack_status || "not_started"}
                                onChange={(e) => updateField("publish_pack_status", e.target.value)}
                            >
                                {PUBLISH_PACK_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest px-1">References</label>
                            <select 
                                className="w-full bg-neutral-50 border border-neutral-100 rounded-xl px-4 py-2.5 text-xs font-bold focus:ring-2 focus:ring-black/5 outline-none"
                                value={mapping.references_status || "pending"}
                                onChange={(e) => updateField("references_status", e.target.value)}
                            >
                                {REF_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 gap-6 pt-4 border-t border-neutral-100">
                         <div className="space-y-2">
                            <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest px-1 flex items-center gap-1.5"><Share2 className="w-3 h-3" /> Group Post</label>
                            <select 
                                className="w-full bg-neutral-50 border border-neutral-100 rounded-xl px-4 py-2.5 text-xs font-bold focus:ring-2 focus:ring-black/5 outline-none"
                                value={mapping.group_post_status || "not_started"}
                                onChange={(e) => updateField("group_post_status", e.target.value)}
                            >
                                {SOCIAL_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest px-1 flex items-center gap-1.5"><Share2 className="w-3 h-3" /> Page Post</label>
                            <select 
                                className="w-full bg-neutral-50 border border-neutral-100 rounded-xl px-4 py-2.5 text-xs font-bold focus:ring-2 focus:ring-black/5 outline-none"
                                value={mapping.page_post_status || "not_started"}
                                onChange={(e) => updateField("page_post_status", e.target.value)}
                            >
                                {SOCIAL_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest px-1 flex items-center gap-1.5"><ImageIcon className="w-3 h-3" /> Canva/Image</label>
                            <select 
                                className="w-full bg-neutral-50 border border-neutral-100 rounded-xl px-4 py-2.5 text-xs font-bold focus:ring-2 focus:ring-black/5 outline-none"
                                value={mapping.canva_status || "not_started"}
                                onChange={(e) => updateField("canva_status", e.target.value)}
                            >
                                {IMAGE_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                    </div>

                    {/* Publishing & Distribution */}
                    <div className="space-y-4 pt-6 border-t border-neutral-100">
                        <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest px-1">Publishing & Distribution</label>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-neutral-400 uppercase px-1">Publish Status</label>
                                <select 
                                    className="w-full bg-neutral-50 border border-neutral-100 rounded-xl px-4 py-2 text-xs font-bold outline-none"
                                    value={mapping.publish_status || "waiting_url"}
                                    onChange={(e) => updateField("publish_status", e.target.value)}
                                >
                                    {PUBLISH_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-neutral-400 uppercase px-1">Publish Date</label>
                                <input 
                                    type="date"
                                    className="w-full bg-neutral-50 border border-neutral-100 rounded-xl px-4 py-2 text-xs font-bold outline-none"
                                    value={mapping.publish_date || ""}
                                    onChange={(e) => updateField("publish_date", e.target.value)}
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-neutral-400 uppercase px-1">Final Website URL</label>
                            <div className="flex items-center gap-2">
                                <input 
                                    className="flex-1 bg-neutral-50 border border-neutral-100 rounded-xl px-4 py-2 text-sm font-medium focus:ring-2 focus:ring-black/5 outline-none"
                                    value={mapping.final_url || ""}
                                    placeholder="https://greenfineness.com/..."
                                    onChange={(e) => setMapping({...mapping, final_url: e.target.value})}
                                    onBlur={(e) => updateField("final_url", e.target.value)}
                                />
                                {mapping.final_url && (
                                    <a href={mapping.final_url} target="_blank" className="p-2 bg-neutral-50 text-neutral-400 hover:text-black rounded-xl transition-all border border-transparent hover:border-neutral-200">
                                        <ExternalLink className="w-4 h-4" />
                                    </a>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* URLs */}
                    <div className="space-y-4 pt-6 border-t border-neutral-100">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest px-1 flex items-center gap-1.5"><Link2 className="w-3 h-3" /> Website Draft URL</label>
                            <div className="flex items-center gap-2">
                                <input 
                                    className="flex-1 bg-neutral-50 border border-neutral-100 rounded-xl px-4 py-2 text-sm font-medium focus:ring-2 focus:ring-black/5 outline-none"
                                    value={mapping.website_draft_url || ""}
                                    placeholder="https://..."
                                    onChange={(e) => setMapping({...mapping, website_draft_url: e.target.value})}
                                    onBlur={(e) => updateField("website_draft_url", e.target.value)}
                                />
                                {mapping.website_draft_url && (
                                    <a href={mapping.website_draft_url} target="_blank" className="p-2 bg-neutral-50 text-neutral-400 hover:text-black rounded-xl transition-all border border-transparent hover:border-neutral-200">
                                        <ExternalLink className="w-4 h-4" />
                                    </a>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Notes & Next Action */}
                    <div className="space-y-4 pt-4 border-t border-neutral-100">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest px-1">Next Action</label>
                            <input 
                                className="w-full bg-neutral-50 border border-neutral-100 rounded-xl px-4 py-2 text-sm font-black focus:ring-2 focus:ring-black/5 outline-none"
                                value={mapping.next_action || ""}
                                placeholder="What needs to happen next?"
                                onChange={(e) => setMapping({...mapping, next_action: e.target.value})}
                                onBlur={(e) => updateField("next_action", e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest px-1">Internal Notes</label>
                            <textarea 
                                className="w-full bg-neutral-50 border border-neutral-100 rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-black/5 outline-none min-h-[100px] resize-none"
                                value={mapping.notes || ""}
                                placeholder="Add context, status updates, or blockers..."
                                onChange={(e) => setMapping({...mapping, notes: e.target.value})}
                                onBlur={(e) => updateField("notes", e.target.value)}
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Footer Status */}
            <div className="bg-neutral-50 px-8 py-4 border-t border-neutral-100 flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-neutral-400">
                <div className="flex items-center gap-4">
                    <span>Topic ID: {mapping.topic_id}</span>
                    <span className="w-1 h-1 rounded-full bg-neutral-300" />
                    <span>Mapping ID: {mapping.article_id}</span>
                </div>
                <div className="flex items-center gap-2 text-emerald-600">
                    <CheckCircle2 className="w-3 h-3" />
                    Synced with Green Fineness Hub
                </div>
            </div>
        </div>
    );
}
