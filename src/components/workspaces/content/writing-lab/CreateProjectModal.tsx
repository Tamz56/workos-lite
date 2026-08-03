"use client";

import React, { useState, useEffect } from "react";
import { Modal } from "@/components/ui/Modal";
import { WritingMode } from "@/lib/types/writing-lab";

interface CreateProjectModalProps {
    isOpen: boolean;
    onClose: () => void;
    storySets: any[];
    onSuccess: () => void;
}

const MODES: { value: WritingMode; label: string }[] = [
    { value: "knowledge_article", label: "Knowledge Article" },
    { value: "knowledge_journey_article", label: "Knowledge Journey Article" },
    { value: "documentary_chapter", label: "Documentary Chapter" },
    { value: "writers_journal", label: "Writer's Journal" },
    { value: "social_story_copy", label: "Social Story Copy" },
    { value: "journey_chapter", label: "Journey Chapter" },
];

export default function CreateProjectModal({ 
    isOpen, 
    onClose, 
    storySets,
    onSuccess,
    initialData
}: CreateProjectModalProps & { initialData?: any }) {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        title: "",
        topic_id: "",
        slug: "",
        story_set_id: "",
        episode_id: "",
        writing_mode: "knowledge_article" as WritingMode,
        episode_role: "",
        journey_stage: "",
        summary: "",
        notes: ""
    });

    useEffect(() => {
        if (initialData && isOpen) {
            setFormData(prev => ({
                ...prev,
                ...initialData
            }));
        }
    }, [initialData, isOpen]);

    // Auto-update fields when episode changes
    useEffect(() => {
        if (formData.episode_id && formData.story_set_id) {
            const ss = storySets.find(s => s.id === formData.story_set_id);
            const ep = ss?.episodes?.find((e: any) => e.id === formData.episode_id);
            if (ep) {
                setFormData(prev => ({
                    ...prev,
                    episode_role: ep.role,
                    journey_stage: ep.journey_stage || "",
                    title: prev.title || ep.title // Suggest title if empty
                }));
            }
        }
    }, [formData.episode_id, formData.story_set_id, storySets]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await fetch("/api/content/writing-lab/projects", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData),
            });
            if (res.ok) {
                onSuccess();
                onClose();
                setFormData({
                    title: "",
                    topic_id: "",
                    slug: "",
                    story_set_id: "",
                    episode_id: "",
                    writing_mode: "knowledge_article",
                    episode_role: "",
                    journey_stage: "",
                    summary: "",
                    notes: ""
                });
            }
        } catch (error) {
            console.error("Failed to create project", error);
        } finally {
            setLoading(false);
        }
    };

    const selectedStorySet = storySets.find(s => s.id === formData.story_set_id);

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Start New Writing Project">
            <form onSubmit={handleSubmit} className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-theme-muted mb-1.5 block">Project Title</label>
                        <input 
                            required
                            type="text" 
                            value={formData.title}
                            onChange={e => setFormData({ ...formData, title: e.target.value })}
                            className="w-full bg-theme-input border border-theme-border rounded-xl px-4 py-2.5 text-sm text-theme-primary focus:ring-2 focus:ring-theme-accent/5 outline-none placeholder:text-theme-muted"
                            placeholder="Enter project title..."
                        />
                    </div>
                    <div>
                        <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 dark:text-slate-500 mb-1.5 block">Topic ID</label>
                        <input 
                            type="text" 
                            value={formData.topic_id}
                            onChange={e => setFormData({ ...formData, topic_id: e.target.value })}
                            className="w-full bg-neutral-50 dark:bg-slate-950/40 border border-neutral-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-sm text-neutral-900 dark:text-slate-100 focus:ring-2 focus:ring-black/5 dark:focus:ring-white/5 outline-none placeholder:text-neutral-300 dark:placeholder:text-slate-700"
                            placeholder="e.g. T-101"
                        />
                    </div>
                    <div>
                        <label className="text-[10px] font-black uppercase tracking-widest text-theme-muted mb-1.5 block">Writing Mode</label>
                        <select 
                            value={formData.writing_mode}
                            onChange={e => setFormData({ ...formData, writing_mode: e.target.value as WritingMode })}
                            className="w-full bg-theme-input border border-theme-border rounded-xl px-4 py-2.5 text-sm text-theme-primary focus:ring-2 focus:ring-theme-accent/5 outline-none"
                        >
                            {MODES.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                        </select>
                    </div>

                    <div>
                        <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-1.5 block">Story Set</label>
                        <select 
                            value={formData.story_set_id}
                            onChange={e => setFormData({ ...formData, story_set_id: e.target.value, episode_id: "" })}
                            className="w-full bg-neutral-50 dark:bg-slate-950/40 border border-neutral-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-sm text-neutral-900 dark:text-slate-100 focus:ring-2 focus:ring-black/5 dark:focus:ring-white/5 outline-none"
                        >
                            <option value="">Select Story Set...</option>
                            {storySets.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="text-[10px] font-black uppercase tracking-widest text-theme-muted mb-1.5 block">Episode</label>
                        <select 
                            value={formData.episode_id}
                            onChange={e => setFormData({ ...formData, episode_id: e.target.value })}
                            className="w-full bg-theme-input border border-theme-border rounded-xl px-4 py-2.5 text-sm text-theme-primary focus:ring-2 focus:ring-theme-accent/5 outline-none"
                            disabled={!formData.story_set_id}
                        >
                            <option value="">Select Episode...</option>
                            {selectedStorySet?.episodes?.map((ep: any) => (
                                <option key={ep.id} value={ep.id}>{ep.title} ({ep.role})</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 dark:text-slate-500 mb-1.5 block">Slug</label>
                        <input 
                            type="text" 
                            value={formData.slug}
                            onChange={e => setFormData({ ...formData, slug: e.target.value })}
                            className="w-full bg-neutral-50 dark:bg-slate-950/40 border border-neutral-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-sm text-neutral-900 dark:text-slate-100 focus:ring-2 focus:ring-black/5 dark:focus:ring-white/5 outline-none font-mono placeholder:text-neutral-300 dark:placeholder:text-slate-700"
                            placeholder="e.g. soil-microbes"
                        />
                    </div>
                    <div>
                        <label className="text-[10px] font-black uppercase tracking-widest text-theme-muted mb-1.5 block">Notes</label>
                        <input 
                            type="text" 
                            value={formData.notes}
                            onChange={e => setFormData({ ...formData, notes: e.target.value })}
                            className="w-full bg-theme-input border border-theme-border rounded-xl px-4 py-2.5 text-sm text-theme-primary focus:ring-2 focus:ring-theme-accent/5 outline-none placeholder:text-theme-muted"
                            placeholder="Internal notes..."
                        />
                    </div>

                    <div className="col-span-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 dark:text-slate-500 mb-1.5 block">Summary / Goal</label>
                        <textarea 
                            value={formData.summary}
                            onChange={e => setFormData({ ...formData, summary: e.target.value })}
                            className="w-full bg-neutral-50 dark:bg-slate-950/40 border border-neutral-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-sm text-neutral-900 dark:text-slate-100 focus:ring-2 focus:ring-black/5 dark:focus:ring-white/5 outline-none min-h-[80px] placeholder:text-neutral-300 dark:placeholder:text-slate-700"
                            placeholder="What is this project about?"
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
                        {loading ? "Creating..." : "Create Project"}
                    </button>
                </div>
            </form>
        </Modal>
    );
}
