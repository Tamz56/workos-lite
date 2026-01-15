"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import DangerIconButton from "@/components/ui/DangerIconButton";
import ConfirmDialog from "@/components/ConfirmDialog";
import { PageShell } from "@/components/layout/PageShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { toErrorMessage } from "@/lib/error";
import { type DocRow, isDraft } from "./types";

function formatThai(dt: string) {
    try {
        return new Date(dt).toLocaleString("th-TH", {
            year: "numeric",
            month: "numeric",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    } catch {
        return dt;
    }
}

export default function DocsClient() {
    const router = useRouter();
    const sp = useSearchParams();

    const [docs, setDocs] = useState<DocRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [cleanupBusy, setCleanupBusy] = useState(false);

    // Search State
    const [q, setQ] = useState("");

    // Delete State
    const [delOpen, setDelOpen] = useState(false);
    const [delTarget, setDelTarget] = useState<DocRow | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    async function createDoc() {
        try {
            const res = await fetch("/api/docs", { method: "POST" });
            if (!res.ok) throw new Error("Create failed");
            const data = await res.json();
            const doc = data.doc ?? data;
            router.push(`/docs/${doc.id}`);
        } catch (e: unknown) {
            alert(toErrorMessage(e));
        }
    }

    // Smart Link: Create Doc if ?newDoc=1
    useEffect(() => {
        if (sp.get("newDoc") === "1") {
            createDoc();
        }
    }, [sp]);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/docs", { cache: "no-store" });
            if (!res.ok) throw new Error(`Load docs failed (${res.status})`);
            const data = await res.json();
            const list: DocRow[] = Array.isArray(data) ? data : (data.docs ?? []);
            setDocs(list);
        } catch (e: unknown) {
            console.error("Load failed", e);
            alert(toErrorMessage(e));
            setDocs([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void load();
    }, [load]);

    const draftsCount = useMemo(() => docs.filter(isDraft).length, [docs]);

    const filteredDocs = useMemo(() => {
        const s = q.trim().toLowerCase();
        if (!s) return docs;
        return docs.filter((d) => {
            return (
                (d.title ?? "").toLowerCase().includes(s) ||
                d.content_md?.toLowerCase().includes(s) ||
                false
            );
        });
    }, [docs, q]);

    async function cleanupDrafts() {
        if (cleanupBusy) return;
        if (!confirm(`ยืนยันลบ Draft ทั้งหมด ${draftsCount} รายการ?`)) return;

        setCleanupBusy(true);
        try {
            const res = await fetch(`/api/docs?mode=drafts&all=1`, { method: "DELETE" });
            if (!res.ok) throw new Error("Cleanup failed");
            await load();
        } catch (e) {
            console.error(e);
            alert("Cleanup failed");
        } finally {
            setCleanupBusy(false);
        }
    }

    // Ask to delete (opens dialog)
    function handleAskDelete(doc: DocRow) {
        setDelTarget(doc);
        setDelOpen(true);
    }

    // Confirm delete (API call)
    async function doDelete() {
        if (!delTarget) return;
        const docId = delTarget.id;
        setDeletingId(docId);

        try {
            const res = await fetch(`/api/docs/${docId}`, { method: "DELETE" });
            if (!res.ok) throw new Error("Delete failed");
            // Optimistic update
            setDocs((prev) => prev.filter((d) => d.id !== docId));
            setDelOpen(false);
            setDelTarget(null);
        } catch (e) {
            console.error(e);
            alert("Delete failed");
            void load();
        } finally {
            setDeletingId(null);
        }
    }

    return (
        <PageShell>
            <PageHeader
                title="Docs"
                subtitle="บันทึกความคิด/แผนงาน/สรุปงาน แบบเรียบง่าย"
                actions={
                    <>
                        <button
                            className="rounded-full border border-neutral-200 px-4 py-2 text-sm font-medium hover:bg-neutral-50 transition-colors bg-white text-neutral-700 disabled:opacity-50"
                            disabled={cleanupBusy || draftsCount === 0}
                            onClick={() => void cleanupDrafts()}
                            title="ลบเอกสาร Draft (Untitled + ว่าง) ทั้งหมด"
                        >
                            {cleanupBusy ? "Cleaning..." : `Cleanup Drafts (${draftsCount})`}
                        </button>
                        <button
                            onClick={() => void load()}
                            className="rounded-full border border-neutral-200 px-4 py-2 text-sm font-medium hover:bg-neutral-50 transition-colors bg-white text-neutral-700"
                        >
                            Refresh
                        </button>
                        <div className="w-px h-6 bg-neutral-200 mx-1" />
                        <button
                            onClick={() => void createDoc()}
                            className="rounded-full bg-neutral-900 text-white px-4 py-2 text-sm font-medium hover:bg-black shadow-sm transition-all"
                        >
                            New Doc
                        </button>
                    </>
                }
            />

            <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="ค้นหาเอกสาร..."
                className="w-full border border-neutral-200 rounded-xl px-4 py-3 text-sm focus:border-neutral-400 focus:outline-none transition-all shadow-sm"
            />

            <div className="mt-6 space-y-4">
                {loading ? (
                    <div className="text-sm text-neutral-500 italic text-center py-10">Loading...</div>
                ) : filteredDocs.length === 0 ? (
                    <div className="text-sm text-neutral-500 italic text-center py-10 border border-dashed border-neutral-200 rounded-xl">ยังไม่มีเอกสาร หรือไม่พบเอกสารที่ค้นหา</div>
                ) : (
                    filteredDocs.map((d) => (
                        <div
                            key={d.id}
                            className="group relative border border-neutral-200 rounded-xl p-6 bg-white hover:bg-neutral-50 transition-all cursor-pointer hover:shadow-sm hover:border-neutral-300"
                            onClick={() => router.push(`/docs/${d.id}`)}
                        >
                            <div className="text-lg font-semibold truncate text-neutral-900">{d.title || "Untitled"}</div>
                            <div className="text-xs text-neutral-500 mt-2 font-medium">อัปเดต: {formatThai(d.updated_at)}</div>

                            {/* Delete icon: โผล่เมื่อ hover (พรีเมียม + ไม่รก) */}
                            <DangerIconButton
                                className="absolute right-5 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity"
                                title="Delete"
                                disabled={deletingId === d.id}
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    handleAskDelete(d);
                                }}
                            />
                        </div>
                    ))
                )}
            </div>

            <ConfirmDialog
                isOpen={delOpen}
                title="Delete Doc"
                message={`Are you sure you want to delete this doc?\n\n${(delTarget?.title ?? "Untitled").trim() || "Untitled"}\n\nThis cannot be undone.`}
                confirmText={deletingId ? "Deleting..." : "Delete"}
                danger={true}
                onConfirm={doDelete}
                onCancel={() => {
                    if (deletingId) return; // Prevent cancel while deleting
                    setDelOpen(false);
                    setDelTarget(null);
                }}
            />
        </PageShell>
    );
}
