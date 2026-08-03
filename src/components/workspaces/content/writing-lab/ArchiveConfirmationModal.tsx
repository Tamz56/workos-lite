"use client";

import React, { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Archive, RotateCcw } from "lucide-react";

interface ArchiveConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    type: "episode" | "project";
    itemId: string;
    itemTitle: string;
    hasLinkedItem: boolean;
    linkedItemTitle?: string;
    actionType: "archive" | "restore";
    onSuccess: () => void;
}

export default function ArchiveConfirmationModal({
    isOpen,
    onClose,
    type,
    itemId,
    itemTitle,
    hasLinkedItem,
    linkedItemTitle,
    actionType,
    onSuccess
}: ArchiveConfirmationModalProps) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleConfirm = async (scope: "both" | "only") => {
        setLoading(true);
        setError(null);

        try {
            let res;
            if (type === "episode") {
                const targetStatus = actionType === "archive" ? "archived" : "idea";
                res = await fetch(`/api/content/writing-lab/episodes/${itemId}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        status: targetStatus,
                        archive_project: scope === "both" && actionType === "archive",
                        restore_project: scope === "both" && actionType === "restore"
                    })
                });
            } else {
                const targetStatus = actionType === "archive" ? "archived" : "draft";
                res = await fetch(`/api/content/writing-lab/projects/${itemId}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        status: targetStatus,
                        archive_episode: scope === "both" && actionType === "archive",
                        restore_episode: scope === "both" && actionType === "restore"
                    })
                });
            }

            if (res.ok) {
                let msg = "";
                if (isArchive) {
                    if (scope === "both") {
                        msg = type === "episode" 
                            ? "Archived both episode and writing project." 
                            : "Archived both writing project and source episode.";
                    } else {
                        msg = type === "episode"
                            ? "Archived episode only. Linked writing project is still active."
                            : "Archived writing project only. Source episode is still active.";
                    }
                } else {
                    if (scope === "both") {
                        msg = type === "episode"
                            ? "Restored both episode (to Idea) and writing project (to Draft)."
                            : "Restored both writing project (to Draft) and source episode (to Idea).";
                    } else {
                        msg = type === "episode"
                            ? "Restored episode only (to Idea). Linked writing project is still active/archived."
                            : "Restored writing project only (to Draft). Source episode is still active/archived.";
                    }
                }
                alert(msg);
                onSuccess();
                onClose();
            } else {
                const data = await res.json();
                setError(data.error || "Failed to update item status.");
            }
        } catch (err: any) {
            setError(err.message || "An error occurred.");
        } finally {
            setLoading(false);
        }
    };

    const isArchive = actionType === "archive";

    return (
        <Modal 
            isOpen={isOpen} 
            onClose={onClose} 
            title={isArchive ? "ยืนยันการเก็บถาวร (Archive Confirmation)" : "ยืนยันการคืนค่า (Restore Confirmation)"}
            maxWidth="max-w-md"
        >
            <div className="space-y-6 py-4">
                <div className="flex items-center gap-3">
                    <div className={`p-3 rounded-2xl ${isArchive ? 'bg-amber-50 dark:bg-amber-950/20 text-amber-600' : 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600'}`}>
                        {isArchive ? <Archive className="w-6 h-6" /> : <RotateCcw className="w-6 h-6" />}
                    </div>
                    <div>
                        <h4 className="text-sm font-black text-theme-primary">
                            ต้องการ{isArchive ? 'เก็บถาวร' : 'คืนค่า'}: &quot;{itemTitle}&quot;?
                        </h4>
                        <p className="text-[11px] text-theme-muted mt-0.5">
                            กรุณาเลือกรูปแบบที่ต้องการจัดการข้อมูลเชื่อมโยง
                        </p>
                    </div>
                </div>

                {error && (
                    <div className="p-3 bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 rounded-xl text-xs font-bold border border-rose-100 dark:border-rose-900/30">
                        {error}
                    </div>
                )}

                <div className="space-y-3">
                    {/* Option 1: Both (Only shown if linked item exists) */}
                    {hasLinkedItem && (
                        <button
                            type="button"
                            onClick={() => handleConfirm("both")}
                            disabled={loading}
                            className={`w-full text-left p-4 rounded-2xl border transition-all flex flex-col gap-1 cursor-pointer ${
                                isArchive 
                                    ? 'border-amber-300 dark:border-amber-800 bg-amber-500/5 dark:bg-amber-950/20 hover:bg-amber-500/10' 
                                    : 'border-theme-border/60 hover:border-theme-accent/30 bg-theme-panel/30 hover:bg-theme-hover'
                            }`}
                        >
                            <span className="text-xs font-black text-theme-primary">
                                {isArchive 
                                    ? `เก็บถาวรทั้งคู่ (Archive Both ${type === "episode" ? "Episode & Project" : "Project & Episode"})`
                                    : `คืนค่าทั้งคู่ (Restore Both ${type === "episode" ? "Episode & Project" : "Project & Episode"})`
                                }
                            </span>
                            <span className="text-[10px] text-theme-muted leading-relaxed">
                                {isArchive 
                                    ? (type === "project" 
                                        ? `“Archive Both” hides both the writing project and the source episode from all active Writing Lab views. (ซ่อนทั้งโปรเจกต์เขียนร่าง "${itemTitle}" และตอนเขียนหลัก "${linkedItemTitle}" ออกจากมุมมองทำงานทั้งหมดของ Writing Lab)`
                                        : `“Archive Both” hides both the episode and the writing project from all active Writing Lab views. (ซ่อนทั้งตอนเขียนหลัก "${itemTitle}" และโปรเจกต์เขียนร่าง "${linkedItemTitle}" ออกจากมุมมองทำงานทั้งหมดของ Writing Lab)`
                                      )
                                    : `แสดงตอน (${type === "episode" ? itemTitle : linkedItemTitle}) ในรายการหลัก และแสดงโปรเจกต์เขียนร่าง (${type === "project" ? itemTitle : linkedItemTitle}) ใน Content Library เป็นสถานะร่าง (Draft)`
                                }
                            </span>
                        </button>
                    )}

                    {/* Option 2: Only this item */}
                    <button
                        type="button"
                        onClick={() => handleConfirm("only")}
                        disabled={loading}
                        className={`w-full text-left p-4 rounded-2xl border transition-all flex flex-col gap-1 cursor-pointer ${
                            isArchive && !hasLinkedItem
                                ? 'border-amber-300 dark:border-amber-800 bg-amber-500/5 dark:bg-amber-950/20 hover:bg-amber-500/10'
                                : 'border-theme-border/60 hover:border-theme-accent/30 bg-theme-panel/30 hover:bg-theme-hover'
                        }`}
                    >
                        <span className="text-xs font-black text-theme-primary">
                            {isArchive
                                ? `เก็บถาวรเฉพาะ${type === "episode" ? "ตอน" : "โปรเจกต์"}นี้เท่านั้น (Archive ${type === "episode" ? "Episode" : "Project"} Only)`
                                : `คืนค่าเฉพาะ${type === "episode" ? "ตอน" : "โปรเจกต์"}นี้เท่านั้น (Restore ${type === "episode" ? "Episode" : "Project"} Only)`
                            }
                        </span>
                        <span className="text-[10px] text-theme-muted leading-relaxed">
                            {isArchive
                                ? (type === "episode"
                                    ? `ซ่อนเฉพาะตอนหลัก (${itemTitle}) จาก Story Map / Episode Backlog / Writing Studio แต่ยังคงเปิดใช้โปรเจกต์เขียนร่างที่เชื่อมอยู่`
                                    : `“Archive Project Only” hides this draft only from Content Library. The source episode will still appear in Story Map, Backlog, and Writing Studio. (ซ่อนเฉพาะโปรเจกต์เขียนร่าง "${itemTitle}" จาก Content Library เท่านั้น โดยตอนเขียนหลัก "${linkedItemTitle || ""}" จะยังคงแสดงให้เห็นอยู่ใน Story Map, Backlog, และ Writing Studio)`
                                  )
                                : (type === "episode"
                                    ? `แสดงเฉพาะตอนหลัก (${itemTitle}) ในรายการหลัก (สถานะ Idea) ส่วนโปรเจกต์เขียนร่างที่เชื่อมอยู่ยังคงสถานะเดิม`
                                    : `คืนค่าเฉพาะโปรเจกต์เขียนร่าง (${itemTitle}) เป็นสถานะร่าง (Draft) ส่วนตอนที่เชื่อมอยู่ยังคงสถานะเดิม`
                                  )
                            }
                        </span>
                    </button>
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-theme-border/30">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-5 py-2.5 bg-theme-panel hover:bg-theme-hover rounded-xl text-xs font-bold text-theme-secondary transition-all"
                        disabled={loading}
                    >
                        ยกเลิก (Cancel)
                    </button>
                </div>
            </div>
        </Modal>
    );
}
