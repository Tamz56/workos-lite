"use client";

import React, { useState, useEffect } from "react";
import { Modal } from "@/components/ui/Modal";
import { Save, Loader2, Info } from "lucide-react";

interface ToneModalProps {
    isOpen: boolean;
    onClose: () => void;
    projectId: string;
    initialData: {
        tone_profile: string | null;
        web_voice_guideline: string | null;
        group_voice_guideline: string | null;
        page_voice_guideline: string | null;
        personal_voice_guideline: string | null;
        claim_guardrail_note: string | null;
    };
    onSuccess: () => void;
}

export default function ToneModal({ 
    isOpen, 
    onClose, 
    projectId,
    initialData,
    onSuccess 
}: ToneModalProps) {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        tone_profile: "",
        web_voice_guideline: "",
        group_voice_guideline: "",
        page_voice_guideline: "",
        personal_voice_guideline: "",
        claim_guardrail_note: ""
    });

    useEffect(() => {
        if (isOpen) {
            setFormData({
                tone_profile: initialData.tone_profile || "",
                web_voice_guideline: initialData.web_voice_guideline || "",
                group_voice_guideline: initialData.group_voice_guideline || "",
                page_voice_guideline: initialData.page_voice_guideline || "",
                personal_voice_guideline: initialData.personal_voice_guideline || "",
                claim_guardrail_note: initialData.claim_guardrail_note || ""
            });
        }
    }, [isOpen, initialData]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await fetch(`/api/content/writing-lab/projects/${projectId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData),
            });
            if (res.ok) {
                onSuccess();
                onClose();
            } else {
                const err = await res.json();
                alert(`Failed to save tone: ${err.error}`);
            }
        } catch (error) {
            console.error("Failed to save tone", error);
            alert("Failed to save tone. Check console.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Tone / Voice Guideline">
            <form onSubmit={handleSubmit} className="space-y-6 py-4">
                <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 flex gap-3">
                    <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <p className="text-[11px] text-amber-800 leading-relaxed">
                        Define the writing DNA for this project. These guidelines help maintain consistency across all chapters and social posts.
                    </p>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-1.5 block">Tone Profile Name</label>
                        <input 
                            type="text" 
                            value={formData.tone_profile}
                            onChange={e => setFormData({ ...formData, tone_profile: e.target.value })}
                            className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-2.5 text-sm font-bold focus:ring-2 focus:ring-black/5 outline-none"
                            placeholder="e.g. GF-WRITING-DNA / คุณตั้ม Voice"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-1.5 block">Web Journey Voice</label>
                            <textarea 
                                value={formData.web_voice_guideline}
                                onChange={e => setFormData({ ...formData, web_voice_guideline: e.target.value })}
                                className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-2.5 text-xs focus:ring-2 focus:ring-black/5 outline-none h-24 resize-none"
                                placeholder="Guideline for long-form articles..."
                            />
                        </div>
                        <div>
                            <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-1.5 block">Facebook Group Voice</label>
                            <textarea 
                                value={formData.group_voice_guideline}
                                onChange={e => setFormData({ ...formData, group_voice_guideline: e.target.value })}
                                className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-2.5 text-xs focus:ring-2 focus:ring-black/5 outline-none h-24 resize-none"
                                placeholder="Guideline for community posts..."
                            />
                        </div>
                        <div>
                            <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-1.5 block">Editorial Page Voice</label>
                            <textarea 
                                value={formData.page_voice_guideline}
                                onChange={e => setFormData({ ...formData, page_voice_guideline: e.target.value })}
                                className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-2.5 text-xs focus:ring-2 focus:ring-black/5 outline-none h-24 resize-none"
                                placeholder="Guideline for broad reach posts..."
                            />
                        </div>
                        <div>
                            <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-1.5 block">Founder Reflection Voice</label>
                            <textarea 
                                value={formData.personal_voice_guideline}
                                onChange={e => setFormData({ ...formData, personal_voice_guideline: e.target.value })}
                                className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-2.5 text-xs focus:ring-2 focus:ring-black/5 outline-none h-24 resize-none"
                                placeholder="Guideline for personal connection..."
                            />
                        </div>
                    </div>

                    <div>
                        <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-1.5 block">Claim Guardrail / Caution</label>
                        <textarea 
                            value={formData.claim_guardrail_note}
                            onChange={e => setFormData({ ...formData, claim_guardrail_note: e.target.value })}
                            className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-2.5 text-xs focus:ring-2 focus:ring-black/5 outline-none h-20 resize-none"
                            placeholder="What to avoid claiming or how to handle sensitive scientific topics..."
                        />
                    </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-6 border-t border-neutral-100">
                    <button 
                        type="button" 
                        onClick={onClose}
                        className="px-6 py-2.5 text-sm font-bold text-neutral-500 hover:text-neutral-900 transition-colors"
                    >
                        Cancel
                    </button>
                    <button 
                        type="submit" 
                        disabled={loading}
                        className="px-8 py-2.5 bg-black text-white rounded-xl text-sm font-black hover:bg-neutral-800 transition-all shadow-lg shadow-black/10 disabled:opacity-50 flex items-center gap-2"
                    >
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        {loading ? "Saving..." : "Save Guideline"}
                    </button>
                </div>
            </form>
        </Modal>
    );
}
