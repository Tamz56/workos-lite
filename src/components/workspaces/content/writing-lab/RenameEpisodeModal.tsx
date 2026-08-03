"use client";

import React, { useState, useEffect } from "react";
import { Modal } from "@/components/ui/Modal";

interface RenameEpisodeModalProps {
    isOpen: boolean;
    onClose: () => void;
    episodeId: string;
    currentTitle: string;
    hasLinkedProject: boolean;
    onSuccess: () => void;
}

export default function RenameEpisodeModal({
    isOpen,
    onClose,
    episodeId,
    currentTitle,
    hasLinkedProject,
    onSuccess
}: RenameEpisodeModalProps) {
    const [title, setTitle] = useState(currentTitle);
    const [syncProject, setSyncProject] = useState(true);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            setTitle(currentTitle);
            setSyncProject(true);
            setError(null);
        }
    }, [isOpen, currentTitle]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim()) {
            setError("Title cannot be empty.");
            return;
        }

        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`/api/content/writing-lab/episodes/${episodeId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    title: title.trim(),
                    sync_project_title: hasLinkedProject && syncProject
                })
            });

            if (res.ok) {
                onSuccess();
                onClose();
            } else {
                const data = await res.json();
                setError(data.error || "Failed to update title.");
            }
        } catch (err: any) {
            setError(err.message || "An error occurred.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="แก้ไขชื่อตอน (Rename Episode)">
            <form onSubmit={handleSubmit} className="space-y-6 py-4">
                {error && (
                    <div className="p-3 bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 rounded-xl text-xs font-bold border border-rose-100 dark:border-rose-900/30">
                        {error}
                    </div>
                )}

                <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-theme-muted mb-1.5 block">
                        Canonical Episode Title / ชื่อตอนหลัก
                    </label>
                    <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="w-full bg-theme-input border border-theme-border rounded-xl px-4 py-3 text-sm text-theme-primary outline-none focus:ring-2 focus:ring-theme-accent/5"
                        placeholder="ระบุชื่อตอน..."
                        disabled={loading}
                    />
                </div>

                {hasLinkedProject && (
                    <label className="flex items-start gap-3 p-3 bg-neutral-50 dark:bg-slate-800/40 rounded-xl border border-theme-border/30 cursor-pointer select-none">
                        <input
                            type="checkbox"
                            checked={syncProject}
                            onChange={(e) => setSyncProject(e.target.checked)}
                            className="mt-0.5 rounded text-theme-accent focus:ring-theme-accent/10 bg-theme-input border-theme-border"
                            disabled={loading}
                        />
                        <div className="flex flex-col">
                            <span className="text-xs font-bold text-theme-primary">
                                อัปเดตชื่อโปรเจกต์เขียนร่างตามไปด้วย (Update linked writing project title too)
                            </span>
                            <span className="text-[10px] text-theme-muted mt-0.5">
                                เปลี่ยนแปลงฟิลด์ชื่อของโปรเจกต์เขียนร่างให้สอดคล้องกัน โดยไม่ส่งผลกระทบต่อเนื้อหาบทความ (Article body, SEO, Social drafts)
                            </span>
                        </div>
                    </label>
                )}

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-theme-border/30">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-5 py-2.5 bg-theme-panel hover:bg-theme-hover rounded-xl text-xs font-bold text-theme-secondary transition-all"
                        disabled={loading}
                    >
                        ยกเลิก (Cancel)
                    </button>
                    <button
                        type="submit"
                        className="px-5 py-2.5 bg-black dark:bg-slate-800 text-white dark:text-theme-primary rounded-xl text-xs font-black hover:bg-neutral-800 dark:hover:bg-slate-700 transition-all shadow-md disabled:opacity-50"
                        disabled={loading}
                    >
                        {loading ? "กำลังบันทึก..." : "บันทึกชื่อตอน (Save Title)"}
                    </button>
                </div>
            </form>
        </Modal>
    );
}
