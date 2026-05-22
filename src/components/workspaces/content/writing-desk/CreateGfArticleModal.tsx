"use client";

import React, { useState, useEffect } from "react";
import { Modal } from "@/components/ui/Modal";
import { GfArticleInput, buildGfArticleTaskSetPayloads, GfWorkflowPreset } from "@/lib/content/gfArticleTaskSet";

interface CreateGfArticleModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: (createdCount: number) => void;
}

type GroupOption = { id: string; title: string; type: 'list' | 'sprint' };

export default function CreateGfArticleModal({
    isOpen,
    onClose,
    onSuccess
}: CreateGfArticleModalProps) {
    const [groups, setGroups] = useState<GroupOption[]>([]);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'error' | 'success', text: string } | null>(null);
    const [workflowPreset, setWorkflowPreset] = useState<GfWorkflowPreset>('lean_v2');

    const [formData, setFormData] = useState<GfArticleInput>({
        topic_id: "",
        topic_title: "",
        target_group_id: "",
        target_group_type: "sprint",
        content_pillar: "",
        content_layer: "knowledge",
        article_format: "knowledge_explainer",
        journey_set: "",
        journey_stage: "",
        bridge_from: "",
        bridge_to: ""
    });

    useEffect(() => {
        if (isOpen) {
            setMessage(null);
            setWorkflowPreset('lean_v2');
            fetchGroups();
        }
    }, [isOpen]);

    useEffect(() => {
        if (workflowPreset === 'dual_v3') {
            setFormData(prev => ({
                ...prev,
                content_layer: 'dual',
                article_format: 'knowledge_plus_narrative'
            }));
        } else if (workflowPreset === 'lean_v2') {
            setFormData(prev => ({
                ...prev,
                content_layer: 'knowledge',
                article_format: 'knowledge_explainer'
            }));
        } else if (workflowPreset === 'legacy_v1') {
            setFormData(prev => ({
                ...prev,
                content_layer: 'knowledge',
                article_format: 'knowledge_explainer'
            }));
        }
    }, [workflowPreset]);

    const fetchGroups = async () => {
        try {
            const [listsRes, sprintsRes] = await Promise.all([
                fetch("/api/lists?workspace=content"),
                fetch("/api/sprints")
            ]);

            let fetchedGroups: GroupOption[] = [];

            if (sprintsRes.ok) {
                const sprintsData = await sprintsRes.json();
                fetchedGroups = [...fetchedGroups, ...sprintsData.map((s: any) => ({
                    id: s.id,
                    title: `[Sprint] ${s.name}`,
                    type: 'sprint' as const
                }))];
            }

            if (listsRes.ok) {
                const listsData = await listsRes.json();
                const actualLists = listsData.filter((l: any) => !/^(?:GF-[A-Z-]+-\d+|TOPIC-\d+)\b/i.test(l.title));
                fetchedGroups = [...fetchedGroups, ...actualLists.map((l: any) => ({
                    id: l.id,
                    title: `[List] ${l.title}`,
                    type: 'list' as const
                }))];
            }

            setGroups(fetchedGroups);
            if (!formData.target_group_id && fetchedGroups.length > 0) {
                setFormData(prev => ({ 
                    ...prev, 
                    target_group_id: fetchedGroups[0].id,
                    target_group_type: fetchedGroups[0].type
                }));
            }
        } catch (e) {
            console.error("Failed to fetch groups", e);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setMessage(null);

        try {
            // 1. Check for duplicates (topic_id + task_set)
            const targetTaskSet = workflowPreset === 'lean_v2' 
                ? 'green_fineness_lean_4_tasks' 
                : workflowPreset === 'dual_v3' 
                    ? 'green_fineness_dual_5_tasks' 
                    : 'green_fineness_legacy_8_tasks';
            const queryUrl = `/api/tasks?topic_id=${encodeURIComponent(formData.topic_id)}`;
            const checkRes = await fetch(queryUrl);
            if (checkRes.ok) {
                const existingTasks = await checkRes.json();
                const hasExistingSet = existingTasks.some((t: any) => t.notes?.includes(`task_set: ${targetTaskSet}`));
                
                if (hasExistingSet) {
                    setMessage({ 
                        type: 'error', 
                        text: `Task set (${targetTaskSet}) for ${formData.topic_id} already exists. No duplicate task was created.` 
                    });
                    setLoading(false);
                    return;
                }
            }

            // 2. Build payloads. (Deterministic ordering is handled by metadata + selector)
            const payloads = buildGfArticleTaskSetPayloads(formData, workflowPreset);
            let createdCount = 0;

            // 3. Create sequentially with a small delay to ensure distinct updated_at timestamps
            for (const payload of payloads) {
                const res = await fetch("/api/tasks", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload)
                });

                if (!res.ok) {
                    setMessage({ type: 'error', text: `Partial Created: ${createdCount} tasks. Failed at step: ${payload.title}` });
                    setLoading(false);
                    return;
                }
                createdCount++;
                // Small delay to avoid API race conditions
                await new Promise(resolve => setTimeout(resolve, 20));
            }

            // 4. Success
            setFormData({
                topic_id: "",
                topic_title: "",
                target_group_id: groups.length > 0 ? groups[0].id : "",
                target_group_type: groups.length > 0 ? groups[0].type : "sprint",
                content_pillar: "",
                content_layer: "knowledge",
                article_format: "knowledge_explainer",
                journey_set: "",
                journey_stage: "",
                bridge_from: "",
                bridge_to: ""
            });
            onSuccess(createdCount);
            onClose();

        } catch (err: any) {
            console.error("Failed to create GF article tasks", err);
            setMessage({ type: 'error', text: err.message || "An unexpected error occurred." });
        } finally {
            if (!message?.text.startsWith("Partial")) {
                setLoading(false);
            }
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Create GF Article Task Set">
            <form onSubmit={handleSubmit} className="space-y-4 py-4">
                {message && (
                    <div className={`p-3 rounded-lg text-xs font-bold ${message.type === 'error' ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
                        {message.text}
                    </div>
                )}
                
                <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-theme-muted mb-1.5 block">Workflow Preset</label>
                        <select
                            value={workflowPreset}
                            onChange={e => setWorkflowPreset(e.target.value as GfWorkflowPreset)}
                            className="w-full bg-theme-input border border-theme-border rounded-xl px-4 py-2.5 text-sm text-theme-primary focus:ring-2 focus:ring-theme-accent/5 outline-none font-bold"
                        >
                            <option value="lean_v2">Green Fineness Lean v2 — 4 Tasks</option>
                            <option value="dual_v3">Green Fineness Dual Article — 5 Tasks</option>
                            <option value="legacy_v1">Legacy GF Article — 8 Tasks</option>
                        </select>
                    </div>

                    <div className="col-span-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-theme-muted mb-1.5 block">Target Group</label>
                        {groups.length > 0 ? (
                            <select
                                required
                                value={`${formData.target_group_type}:${formData.target_group_id}`}
                                onChange={e => {
                                    const [type, id] = e.target.value.split(":");
                                    setFormData({ ...formData, target_group_id: id, target_group_type: type as 'list' | 'sprint' });
                                }}
                                className="w-full bg-theme-input border border-theme-border rounded-xl px-4 py-2.5 text-sm text-theme-primary focus:ring-2 focus:ring-theme-accent/5 outline-none"
                            >
                                <option value="">Select Target Group...</option>
                                {groups.map(group => (
                                    <option key={group.id} value={`${group.type}:${group.id}`}>{group.title}</option>
                                ))}
                            </select>
                        ) : (
                            <div className="w-full bg-theme-input border border-theme-border rounded-xl px-4 py-2.5 text-sm text-theme-muted italic">
                                No valid Sprints or Lists found. Please create one first.
                            </div>
                        )}
                    </div>

                    <div>
                        <label className="text-[10px] font-black uppercase tracking-widest text-theme-muted mb-1.5 block">Topic ID</label>
                        <input
                            required
                            type="text"
                            value={formData.topic_id}
                            onChange={e => setFormData({ ...formData, topic_id: e.target.value })}
                            className="w-full bg-theme-input border border-theme-border rounded-xl px-4 py-2.5 text-sm text-theme-primary focus:ring-2 focus:ring-theme-accent/5 outline-none font-mono"
                            placeholder="e.g. GF-STORY-01"
                        />
                    </div>
                    <div>
                        <label className="text-[10px] font-black uppercase tracking-widest text-theme-muted mb-1.5 block">Topic Title</label>
                        <input
                            required
                            type="text"
                            value={formData.topic_title}
                            onChange={e => setFormData({ ...formData, topic_title: e.target.value })}
                            className="w-full bg-theme-input border border-theme-border rounded-xl px-4 py-2.5 text-sm text-theme-primary focus:ring-2 focus:ring-theme-accent/5 outline-none"
                            placeholder="Article Title..."
                        />
                    </div>

                    <div>
                        <label className="text-[10px] font-black uppercase tracking-widest text-theme-muted mb-1.5 block">Content Pillar</label>
                        <input
                            required
                            type="text"
                            value={formData.content_pillar}
                            onChange={e => setFormData({ ...formData, content_pillar: e.target.value })}
                            className="w-full bg-theme-input border border-theme-border rounded-xl px-4 py-2.5 text-sm text-theme-primary focus:ring-2 focus:ring-theme-accent/5 outline-none"
                            placeholder="e.g. Plant Nutrition"
                        />
                    </div>
                    <div>
                        <label className="text-[10px] font-black uppercase tracking-widest text-theme-muted mb-1.5 block">Content Layer</label>
                        <input
                            required
                            type="text"
                            value={formData.content_layer}
                            onChange={e => setFormData({ ...formData, content_layer: e.target.value })}
                            className="w-full bg-theme-input border border-theme-border rounded-xl px-4 py-2.5 text-sm text-theme-primary focus:ring-2 focus:ring-theme-accent/5 outline-none"
                            placeholder="e.g. knowledge"
                        />
                    </div>

                    <div>
                        <label className="text-[10px] font-black uppercase tracking-widest text-theme-muted mb-1.5 block">Article Format</label>
                        <input
                            required
                            type="text"
                            value={formData.article_format}
                            onChange={e => setFormData({ ...formData, article_format: e.target.value })}
                            className="w-full bg-theme-input border border-theme-border rounded-xl px-4 py-2.5 text-sm text-theme-primary focus:ring-2 focus:ring-theme-accent/5 outline-none"
                            placeholder="e.g. knowledge_explainer"
                        />
                    </div>
                    <div>
                        <label className="text-[10px] font-black uppercase tracking-widest text-theme-muted mb-1.5 block">Journey Set</label>
                        <input
                            type="text"
                            value={formData.journey_set}
                            onChange={e => setFormData({ ...formData, journey_set: e.target.value })}
                            className="w-full bg-theme-input border border-theme-border rounded-xl px-4 py-2.5 text-sm text-theme-primary focus:ring-2 focus:ring-theme-accent/5 outline-none"
                            placeholder="Optional"
                        />
                    </div>

                    <div>
                        <label className="text-[10px] font-black uppercase tracking-widest text-theme-muted mb-1.5 block">Journey Stage</label>
                        <input
                            type="text"
                            value={formData.journey_stage}
                            onChange={e => setFormData({ ...formData, journey_stage: e.target.value })}
                            className="w-full bg-theme-input border border-theme-border rounded-xl px-4 py-2.5 text-sm text-theme-primary focus:ring-2 focus:ring-theme-accent/5 outline-none"
                            placeholder="Optional"
                        />
                    </div>
                    
                    <div className="col-span-2 grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-[10px] font-black uppercase tracking-widest text-theme-muted mb-1.5 block">Bridge From</label>
                            <input
                                type="text"
                                value={formData.bridge_from}
                                onChange={e => setFormData({ ...formData, bridge_from: e.target.value })}
                                className="w-full bg-theme-input border border-theme-border rounded-xl px-4 py-2.5 text-sm text-theme-primary focus:ring-2 focus:ring-theme-accent/5 outline-none"
                                placeholder="Previous Article..."
                            />
                        </div>
                        <div>
                            <label className="text-[10px] font-black uppercase tracking-widest text-theme-muted mb-1.5 block">Bridge To</label>
                            <input
                                type="text"
                                value={formData.bridge_to}
                                onChange={e => setFormData({ ...formData, bridge_to: e.target.value })}
                                className="w-full bg-theme-input border border-theme-border rounded-xl px-4 py-2.5 text-sm text-theme-primary focus:ring-2 focus:ring-theme-accent/5 outline-none"
                                placeholder="Next Article..."
                            />
                        </div>
                    </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-6 mt-6 border-t border-theme-border/50">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-6 py-2.5 text-sm font-bold text-theme-muted hover:text-theme-primary transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={loading || !formData.target_group_id || !formData.topic_id || !formData.topic_title}
                        className="px-8 py-2.5 bg-black dark:bg-theme-secondary text-white border border-transparent rounded-xl text-sm font-black hover:bg-neutral-800 transition-all shadow-lg shadow-black/10 disabled:opacity-50"
                    >
                        {loading ? "Creating Tasks..." : "Create Task Set"}
                    </button>
                </div>
            </form>
        </Modal>
    );
}

