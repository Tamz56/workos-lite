"use client";

import React, { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { EpisodeRole, NarrativeStatus, EpisodeStatus } from "@/lib/types/writing-lab";

interface CreateEpisodeModalProps {
    isOpen: boolean;
    onClose: () => void;
    storySetId: string;
    storySetTitle: string;
    coreEpisodes: any[];
    onSuccess: () => void;
}

const ROLES: { value: EpisodeRole; label: string }[] = [
    { value: "core_episode", label: "Core Episode" },
    { value: "supporting_article", label: "Supporting Article" },
    { value: "bridge_article", label: "Bridge Article" },
    { value: "practical_guide", label: "Practical Guide" },
    { value: "journal_note", label: "Journal Note" },
    { value: "social_only_piece", label: "Social Only Piece" },
];

const NARRATIVE_STATUSES: { value: NarrativeStatus; label: string }[] = [
    { value: "unmapped", label: "Unmapped" },
    { value: "mapped", label: "Mapped" },
    { value: "needs_review", label: "Needs Review" },
    { value: "published", label: "Published" },
];

const STATUSES: { value: EpisodeStatus; label: string }[] = [
    { value: "idea", label: "Idea" },
    { value: "planned", label: "Planned" },
    { value: "drafting", label: "Drafting" },
    { value: "ready_for_article_studio", label: "Ready for Article Studio" },
    { value: "website_draft", label: "Website Draft" },
    { value: "published", label: "Published" },
    { value: "archived", label: "Archived" },
];

export default function CreateEpisodeModal({ 
    isOpen, 
    onClose, 
    storySetId, 
    storySetTitle,
    coreEpisodes,
    onSuccess 
}: CreateEpisodeModalProps) {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        title: "",
        slug: "",
        description: "",
        role: "core_episode" as EpisodeRole,
        journey_stage: "",
        attached_to_episode_id: "",
        sort_order: 0,
        narrative_status: "unmapped" as NarrativeStatus,
        status: "planned" as EpisodeStatus
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await fetch("/api/content/writing-lab/episodes", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ...formData, story_set_id: storySetId }),
            });
            if (res.ok) {
                onSuccess();
                onClose();
                setFormData({
                    title: "",
                    slug: "",
                    description: "",
                    role: "core_episode",
                    journey_stage: "",
                    attached_to_episode_id: "",
                    sort_order: 0,
                    narrative_status: "unmapped",
                    status: "planned"
                });
            }
        } catch (error) {
            console.error("Failed to create episode", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`New Episode for ${storySetTitle}`}>
            <form onSubmit={handleSubmit} className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-theme-muted mb-1.5 block">Title</label>
                        <input 
                            required
                            type="text" 
                            value={formData.title}
                            onChange={e => setFormData({ ...formData, title: e.target.value })}
                            className="w-full bg-theme-input border border-theme-border rounded-xl px-4 py-2.5 text-sm text-theme-primary focus:ring-2 focus:ring-theme-accent/5 outline-none placeholder:text-theme-muted"
                            placeholder="Episode title..."
                        />
                    </div>
                    <div>
                        <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 dark:text-slate-500 mb-1.5 block">Slug</label>
                        <input 
                            type="text" 
                            value={formData.slug}
                            onChange={e => setFormData({ ...formData, slug: e.target.value })}
                            className="w-full bg-neutral-50 dark:bg-slate-950/40 border border-neutral-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-sm text-neutral-900 dark:text-slate-100 focus:ring-2 focus:ring-black/5 dark:focus:ring-white/5 outline-none placeholder:text-neutral-300 dark:placeholder:text-slate-700"
                            placeholder="episode-slug..."
                        />
                    </div>
                    <div>
                        <label className="text-[10px] font-black uppercase tracking-widest text-theme-muted mb-1.5 block">Role</label>
                        <select 
                            value={formData.role}
                            onChange={e => setFormData({ ...formData, role: e.target.value as EpisodeRole })}
                            className="w-full bg-theme-input border border-theme-border rounded-xl px-4 py-2.5 text-sm text-theme-primary focus:ring-2 focus:ring-theme-accent/5 outline-none"
                        >
                            {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                        </select>
                    </div>
                    <div className="col-span-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 dark:text-slate-500 mb-1.5 block">Description</label>
                        <textarea 
                            value={formData.description}
                            onChange={e => setFormData({ ...formData, description: e.target.value })}
                            className="w-full bg-neutral-50 dark:bg-slate-950/40 border border-neutral-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-sm text-neutral-900 dark:text-slate-100 focus:ring-2 focus:ring-black/5 dark:focus:ring-white/5 outline-none min-h-[80px] placeholder:text-neutral-300 dark:placeholder:text-slate-700"
                            placeholder="Short description..."
                        />
                    </div>
                    <div>
                        <label className="text-[10px] font-black uppercase tracking-widest text-theme-muted mb-1.5 block">Status</label>
                        <select 
                            value={formData.status}
                            onChange={e => setFormData({ ...formData, status: e.target.value as EpisodeStatus })}
                            className="w-full bg-theme-input border border-theme-border rounded-xl px-4 py-2.5 text-sm text-theme-primary focus:ring-2 focus:ring-theme-accent/5 outline-none"
                        >
                            {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-1.5 block">Narrative Status</label>
                        <select 
                            value={formData.narrative_status}
                            onChange={e => setFormData({ ...formData, narrative_status: e.target.value as NarrativeStatus })}
                            className="w-full bg-neutral-50 dark:bg-slate-950/40 border border-neutral-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-sm text-neutral-900 dark:text-slate-100 focus:ring-2 focus:ring-black/5 dark:focus:ring-white/5 outline-none"
                        >
                            {NARRATIVE_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                        </select>
                    </div>
                    {formData.role !== "core_episode" && (
                        <div>
                            <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-1.5 block">Attach to Core</label>
                            <select 
                                value={formData.attached_to_episode_id}
                                onChange={e => setFormData({ ...formData, attached_to_episode_id: e.target.value })}
                                className="w-full bg-neutral-50 dark:bg-slate-950/40 border border-neutral-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-sm text-neutral-900 dark:text-slate-100 focus:ring-2 focus:ring-black/5 dark:focus:ring-white/5 outline-none"
                            >
                                <option value="">None</option>
                                {coreEpisodes.map(ep => <option key={ep.id} value={ep.id}>{ep.title}</option>)}
                            </select>
                        </div>
                    )}
                    <div>
                        <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 dark:text-slate-500 mb-1.5 block">Journey Stage</label>
                        <input 
                            type="text" 
                            value={formData.journey_stage}
                            onChange={e => setFormData({ ...formData, journey_stage: e.target.value })}
                            className="w-full bg-neutral-50 dark:bg-slate-950/40 border border-neutral-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-sm text-neutral-900 dark:text-slate-100 focus:ring-2 focus:ring-black/5 dark:focus:ring-white/5 outline-none placeholder:text-neutral-300 dark:placeholder:text-slate-700"
                            placeholder="e.g. Awareness"
                        />
                    </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-6 border-t border-neutral-100 dark:border-slate-800">
                    <button 
                        type="button" 
                        onClick={onClose}
                        className="px-6 py-2.5 text-sm font-bold text-neutral-500 dark:text-slate-400 hover:text-neutral-900 dark:hover:text-slate-100 transition-colors"
                    >
                        Cancel
                    </button>
                    <button 
                        type="submit" 
                        disabled={loading}
                        className="px-8 py-2.5 bg-black dark:bg-slate-800 text-white dark:text-theme-primary border border-transparent dark:border-slate-700 rounded-xl text-sm font-black hover:bg-neutral-800 dark:hover:bg-slate-700 transition-all shadow-lg shadow-black/10 disabled:opacity-50"
                    >
                        {loading ? "Creating..." : "Create Episode"}
                    </button>
                </div>
            </form>
        </Modal>
    );
}
