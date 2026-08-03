"use client";

import React, { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Layers, ListPlus, AlertCircle } from "lucide-react";

interface CreateLabResourceModalProps {
    isOpen: boolean;
    onClose: () => void;
    storySets: any[];
    onSuccess: (createdItem?: any, type?: "story-set" | "episode") => void;
}

export default function CreateLabResourceModal({
    isOpen,
    onClose,
    storySets,
    onSuccess
}: CreateLabResourceModalProps) {
    const [activeTab, setActiveTab] = useState<"story-set" | "episode">("story-set");
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    // Story Set Form
    const [storySetForm, setStorySetForm] = useState({
        title: "",
        description: "",
        status: "active"
    });

    // Episode Form
    const [episodeForm, setEpisodeForm] = useState({
        episode_code: "",
        title: "",
        story_set_id: storySets[0]?.id || "",
        role: "core_episode",
        status: "planned",
        journey_stage: "", // Plant Journey Stage
        content_flow: "Narrative Article → Knowledge Companion → Group/Page Post" // UI Default
    });

    const handleCreateStorySet = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setErrorMsg(null);
        try {
            const res = await fetch("/api/content/writing-lab/story-sets", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(storySetForm)
            });
            if (res.ok) {
                const data = await res.json();
                setStorySetForm({ title: "", description: "", status: "active" });
                onSuccess(data, "story-set");
                onClose();
            } else {
                const data = await res.json();
                setErrorMsg(data.error || "เกิดข้อผิดพลาดในการสร้าง Story Set");
            }
        } catch (err: any) {
            setErrorMsg(err.message || "เกิดข้อผิดพลาดในการสร้าง Story Set");
        } finally {
            setLoading(false);
        }
    };

    const handleCreateEpisode = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setErrorMsg(null);
        try {
            // Set plant journey stage to episode title if left blank
            const stage = episodeForm.journey_stage.trim() || episodeForm.title.trim();

            const res = await fetch("/api/content/writing-lab/episodes", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    episode_code: episodeForm.episode_code.trim(),
                    title: episodeForm.title.trim(),
                    story_set_id: episodeForm.story_set_id,
                    role: episodeForm.role,
                    status: episodeForm.status,
                    journey_stage: stage
                })
            });

            if (res.ok) {
                const data = await res.json();
                setEpisodeForm({
                    episode_code: "",
                    title: "",
                    story_set_id: storySets[0]?.id || "",
                    role: "core_episode",
                    status: "planned",
                    journey_stage: "",
                    content_flow: "Narrative Article → Knowledge Companion → Group/Page Post"
                });
                onSuccess(data, "episode");
                onClose();
            } else {
                const data = await res.json();
                if (res.status === 409) {
                    setErrorMsg(`รหัสตอน "${episodeForm.episode_code}" ซ้ำกับตอนที่มีอยู่แล้วในระบบ กรุณาป้อนรหัสอื่น`);
                } else {
                    setErrorMsg(data.error || "เกิดข้อผิดพลาดในการสร้าง Episode");
                }
            }
        } catch (err: any) {
            setErrorMsg(err.message || "เกิดข้อผิดพลาดในการสร้าง Episode");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal 
            isOpen={isOpen} 
            onClose={onClose} 
            title="Create New Writing Lab Resource"
            maxWidth="max-w-xl"
        >
            {/* Tabs Selector */}
            <div className="flex items-center gap-1 bg-neutral-200/50 dark:bg-theme-panel/60 p-1 rounded-xl w-full mb-6 border border-theme-border/40">
                <button
                    type="button"
                    onClick={() => {
                        setActiveTab("story-set");
                        setErrorMsg(null);
                    }}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === "story-set" ? "bg-white dark:bg-theme-card text-theme-primary shadow-sm" : "text-theme-muted hover:text-theme-primary"}`}
                >
                    <Layers className="w-3.5 h-3.5" />
                    New Story Set
                </button>
                <button
                    type="button"
                    onClick={() => {
                        setActiveTab("episode");
                        setErrorMsg(null);
                        if (!episodeForm.story_set_id && storySets.length > 0) {
                            setEpisodeForm(prev => ({ ...prev, story_set_id: storySets[0].id }));
                        }
                    }}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === "episode" ? "bg-white dark:bg-theme-card text-theme-primary shadow-sm" : "text-theme-muted hover:text-theme-primary"}`}
                >
                    <ListPlus className="w-3.5 h-3.5" />
                    New Episode
                </button>
            </div>

            {errorMsg && (
                <div className="mb-4 p-3.5 bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 text-rose-600 dark:text-rose-400 rounded-xl text-xs font-bold flex items-start gap-2 animate-fadeIn">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{errorMsg}</span>
                </div>
            )}

            {activeTab === "story-set" ? (
                <form onSubmit={handleCreateStorySet} className="space-y-4">
                    <div>
                        <label className="text-[10px] font-black uppercase tracking-widest text-theme-muted mb-1.5 block">Story Set Name (ชื่อชุดโครงเรื่อง)</label>
                        <input
                            required
                            type="text"
                            value={storySetForm.title}
                            onChange={e => setStorySetForm({ ...storySetForm, title: e.target.value })}
                            className="w-full bg-theme-input border border-theme-border rounded-xl px-4 py-2.5 text-sm text-theme-primary focus:ring-2 focus:ring-theme-accent/5 outline-none placeholder:text-theme-muted"
                            placeholder="เช่น โลกใต้พื้นดิน, ธาตุอาหารพืช..."
                        />
                    </div>

                    <div>
                        <label className="text-[10px] font-black uppercase tracking-widest text-theme-muted mb-1.5 block">Description (คำอธิบายชุดเนื้อหา)</label>
                        <textarea
                            value={storySetForm.description}
                            onChange={e => setStorySetForm({ ...storySetForm, description: e.target.value })}
                            className="w-full bg-theme-input border border-theme-border rounded-xl px-4 py-2.5 text-sm text-theme-primary focus:ring-2 focus:ring-theme-accent/5 outline-none min-h-[90px] placeholder:text-theme-muted"
                            placeholder="คำอธิบายสั้นๆ เกี่ยวกับซีรีส์เนื้อหานี้..."
                        />
                    </div>

                    <div>
                        <label className="text-[10px] font-black uppercase tracking-widest text-theme-muted mb-1.5 block">Status (สถานะ)</label>
                        <select
                            value={storySetForm.status}
                            onChange={e => setStorySetForm({ ...storySetForm, status: e.target.value })}
                            className="w-full bg-theme-input border border-theme-border rounded-xl px-4 py-2.5 text-sm text-theme-primary focus:ring-2 focus:ring-theme-accent/5 outline-none"
                        >
                            <option value="active">Active (ใช้งานปกติ)</option>
                            <option value="draft">Draft (ร่างเขียน)</option>
                            <option value="archived">Archived (เก็บถาวร)</option>
                        </select>
                    </div>

                    <div className="flex items-center justify-end gap-3 pt-6 border-t border-theme-border/20">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-6 py-2.5 text-xs font-black uppercase tracking-widest text-neutral-500 hover:text-neutral-900 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-8 py-2.5 bg-black dark:bg-slate-800 text-white dark:text-theme-primary border border-transparent dark:border-slate-700 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-neutral-800 dark:hover:bg-slate-700 transition-all shadow-md disabled:opacity-50"
                        >
                            {loading ? "Creating..." : "Create Story Set"}
                        </button>
                    </div>
                </form>
            ) : (
                <form onSubmit={handleCreateEpisode} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-[10px] font-black uppercase tracking-widest text-theme-muted mb-1.5 block">Episode Code (รหัสตอน)</label>
                            <input
                                required
                                type="text"
                                value={episodeForm.episode_code}
                                onChange={e => setEpisodeForm({ ...episodeForm, episode_code: e.target.value })}
                                className="w-full bg-theme-input border border-theme-border rounded-xl px-4 py-2.5 text-sm text-theme-primary focus:ring-2 focus:ring-theme-accent/5 outline-none placeholder:text-theme-muted font-mono"
                                placeholder="เช่น GF-S01-E07"
                            />
                        </div>

                        <div>
                            <label className="text-[10px] font-black uppercase tracking-widest text-theme-muted mb-1.5 block">Story Set (ชุดโครงเรื่องหลัก)</label>
                            <select
                                required
                                value={episodeForm.story_set_id}
                                onChange={e => setEpisodeForm({ ...episodeForm, story_set_id: e.target.value })}
                                className="w-full bg-theme-input border border-theme-border rounded-xl px-4 py-2.5 text-sm text-theme-primary focus:ring-2 focus:ring-theme-accent/5 outline-none"
                            >
                                <option value="">เลือกชุดโครงเรื่อง...</option>
                                {storySets.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
                            </select>
                        </div>

                        <div className="col-span-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-theme-muted mb-1.5 block">Episode Title (ชื่อตอน)</label>
                            <input
                                required
                                type="text"
                                value={episodeForm.title}
                                onChange={e => setEpisodeForm({ ...episodeForm, title: e.target.value })}
                                className="w-full bg-theme-input border border-theme-border rounded-xl px-4 py-2.5 text-sm text-theme-primary focus:ring-2 focus:ring-theme-accent/5 outline-none placeholder:text-theme-muted"
                                placeholder="เช่น เมื่อต้นอ่อนเริ่มสร้างลำต้นและใบ..."
                            />
                        </div>

                        <div>
                            <label className="text-[10px] font-black uppercase tracking-widest text-theme-muted mb-1.5 block">Role (บทบาทเนื้อหา)</label>
                            <select
                                value={episodeForm.role}
                                onChange={e => setEpisodeForm({ ...episodeForm, role: e.target.value })}
                                className="w-full bg-theme-input border border-theme-border rounded-xl px-4 py-2.5 text-sm text-theme-primary focus:ring-2 focus:ring-theme-accent/5 outline-none"
                            >
                                <option value="core_episode">Core Episode (ตอนหลัก)</option>
                                <option value="supporting_article">Knowledge Companion (บทความวิชาการสมทบ)</option>
                                <option value="social_only_piece">Social Pack (สรุปโซเชียล)</option>
                            </select>
                        </div>

                        <div>
                            <label className="text-[10px] font-black uppercase tracking-widest text-theme-muted mb-1.5 block">Status (สถานะการดำเนินงาน)</label>
                            <select
                                value={episodeForm.status}
                                onChange={e => setEpisodeForm({ ...episodeForm, status: e.target.value })}
                                className="w-full bg-theme-input border border-theme-border rounded-xl px-4 py-2.5 text-sm text-theme-primary focus:ring-2 focus:ring-theme-accent/5 outline-none"
                            >
                                <option value="planned">Planned (อยู่ในแผน)</option>
                                <option value="draft">Draft (กำลังเขียนร่าง)</option>
                                <option value="review">Review (อยู่ระหว่างรีวิว)</option>
                                <option value="published">Published (เผยแพร่แล้ว)</option>
                            </select>
                        </div>

                        <div className="col-span-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-theme-muted mb-1.5 block">Plant Journey Stage (ช่วงชีวิตของพืช)</label>
                            <input
                                type="text"
                                value={episodeForm.journey_stage}
                                onChange={e => setEpisodeForm({ ...episodeForm, journey_stage: e.target.value })}
                                className="w-full bg-theme-input border border-theme-border rounded-xl px-4 py-2.5 text-sm text-theme-primary focus:ring-2 focus:ring-theme-accent/5 outline-none placeholder:text-theme-muted"
                                placeholder="เช่น ต้นอ่อนเริ่มสร้างลำต้นและใบ (ปล่อยว่างเพื่อใช้ชื่อตอน)"
                            />
                        </div>

                        <div className="col-span-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-theme-muted mb-1.5 block">Content Flow Selector (UI workflow - ไม่บันทึกใน DB)</label>
                            <select
                                value={episodeForm.content_flow}
                                onChange={e => setEpisodeForm({ ...episodeForm, content_flow: e.target.value })}
                                className="w-full bg-theme-input border border-theme-border rounded-xl px-4 py-2.5 text-sm text-theme-primary focus:ring-2 focus:ring-theme-accent/5 outline-none"
                            >
                                <option value="Narrative Article → Knowledge Companion → Group/Page Post">Narrative Article → Knowledge Companion → Group/Page Post</option>
                                <option value="Knowledge Article → Narrative Article → Social Pack">Knowledge Article → Narrative Article → Social Pack</option>
                            </select>
                        </div>
                    </div>

                    <div className="flex items-center justify-end gap-3 pt-6 border-t border-theme-border/20">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-6 py-2.5 text-xs font-black uppercase tracking-widest text-neutral-500 hover:text-neutral-900 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-8 py-2.5 bg-black dark:bg-slate-800 text-white dark:text-theme-primary border border-transparent dark:border-slate-700 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-neutral-800 dark:hover:bg-slate-700 transition-all shadow-md disabled:opacity-50"
                        >
                            {loading ? "Creating..." : "Create Episode"}
                        </button>
                    </div>
                </form>
            )}
        </Modal>
    );
}
