"use client";

import React, { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Loader2, PackagePlus, CalendarDays } from "lucide-react";
import { calculateContentSchedule, CONTENT_VARIANTS } from "@/lib/agent/templates";

interface CreateContentPackageModalProps {
// ... existing interface ...
// (Wait, I'll just use the full replacement for the whole file or large chunk to avoid errors)
    isOpen: boolean;
    onClose: () => void;
    onSuccess: (data: { topicId: string; topicTitle: string; noteId: string; taskIds: string[] }) => void;
}

export default function CreateContentPackageModal({ isOpen, onClose, onSuccess }: CreateContentPackageModalProps) {
    const [topicId, setTopicId] = useState("TOPIC-001");
    const [topicTitle, setTopicTitle] = useState("Untitled Topic");
    const [templateKey, setTemplateKey] = useState("generic_content");
    const [publishDate, setPublishDate] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError(null);

        try {
            const res = await fetch("/api/content/package", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ 
                    topicId: topicId.trim(), 
                    topicTitle: topicTitle.trim(),
                    templateKey,
                    publishDate: publishDate || undefined
                }),
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || "Failed to create package");
            }

            const data = await res.json();

            // Success!
            setTopicId("TOPIC-001");
            setTopicTitle("Untitled Topic");
            setTemplateKey("generic_content");
            setPublishDate("");
            onSuccess(data);
            onClose();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Modal isOpen={isOpen} title="New Content Package" onClose={onClose}>
            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="bg-neutral-50 border border-neutral-100 rounded-xl p-4 flex items-start gap-3">
                    <div className="mt-0.5 bg-blue-100 text-blue-600 p-2 rounded-lg">
                        <PackagePlus className="w-5 h-5" />
                    </div>
                    <div className="text-sm text-neutral-600 leading-relaxed">
                        This will automatically generate a **Content Hub note** and **5 checkpoint tasks** 
                        linked together. Optional: set a Publish Date to auto-schedule tasks.
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2">
                                Topic ID
                            </label>
                            <input
                                type="text"
                                required
                                className="w-full bg-neutral-100/50 border border-neutral-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-black focus:border-black focus:bg-white transition-all"
                                placeholder="e.g. TOPIC-015"
                                value={topicId}
                                onChange={(e) => setTopicId(e.target.value)}
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2">
                                Content Type
                            </label>
                            <select
                                className="w-full bg-neutral-100/50 border border-neutral-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-black focus:border-black focus:bg-white transition-all appearance-none"
                                value={templateKey}
                                onChange={(e) => setTemplateKey(e.target.value)}
                            >
                                <option value="article">Article</option>
                                <option value="short_video">Short Video</option>
                                <option value="carousel">Carousel</option>
                                <option value="generic_content">Generic Content</option>
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2">
                            Topic Title
                        </label>
                        <input
                            type="text"
                            required
                            className="w-full bg-neutral-100/50 border border-neutral-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-black focus:border-black focus:bg-white transition-all"
                            placeholder="e.g. Gardening Pro Tips"
                            value={topicTitle}
                            onChange={(e) => setTopicTitle(e.target.value)}
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2">
                            Publish Date (Optional)
                        </label>
                        <input
                            type="date"
                            className="w-full bg-neutral-100/50 border border-neutral-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-black focus:border-black focus:bg-white transition-all"
                            value={publishDate}
                            onChange={(e) => setPublishDate(e.target.value)}
                        />
                        
                        {publishDate && (
                            <div className="mt-4 p-4 bg-neutral-50 rounded-xl border border-neutral-200 animate-in fade-in slide-in-from-top-2 duration-200">
                                <div className="flex items-center gap-2 mb-3">
                                    <CalendarDays className="w-4 h-4 text-neutral-500" />
                                    <span className="text-xs font-bold text-neutral-600 uppercase tracking-tight">Schedule Preview</span>
                                </div>
                                <div className="space-y-2">
                                    {calculateContentSchedule(publishDate).map((date, idx) => {
                                        const variant = CONTENT_VARIANTS[templateKey] || CONTENT_VARIANTS.generic_content;
                                        const label = variant.taskPrefixes[idx];
                                        const isMain = idx === 3; // Publish task

                                        return (
                                            <div key={idx} className="flex items-center justify-between text-[11px]">
                                                <span className={`font-medium ${isMain ? 'text-black font-bold' : 'text-neutral-500'}`}>
                                                    {label}
                                                </span>
                                                <span className={`font-mono ${isMain ? 'text-blue-600 font-bold' : 'text-neutral-400'}`}>
                                                    {date}
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                        
                        {!publishDate && (
                            <p className="mt-1.5 text-[10px] text-neutral-400 italic">
                                Tasks will be scheduled relative to this date (T-4 to T+1).
                            </p>
                        )}
                    </div>
                </div>

                {error && (
                    <div className="text-sm text-red-600 bg-red-50 p-3 rounded-lg border border-red-100 animate-in fade-in slide-in-from-top-1">
                        {error}
                    </div>
                )}

                <div className="pt-2 flex items-center justify-end gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2.5 text-sm font-bold text-neutral-500 hover:text-black transition-colors"
                        disabled={isSubmitting}
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="bg-black text-white px-6 py-2.5 rounded-xl text-sm font-bold hover:bg-neutral-800 transition-all shadow-md active:scale-95 disabled:opacity-50 disabled:scale-100 flex items-center gap-2"
                    >
                        {isSubmitting ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Creating...
                            </>
                        ) : (
                            "Create Package"
                        )}
                    </button>
                </div>
            </form>
        </Modal>
    );
}
