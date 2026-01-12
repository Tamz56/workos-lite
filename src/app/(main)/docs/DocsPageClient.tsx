"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import DocsClient from "./DocsClient";
import ConfirmDialog from "@/components/ConfirmDialog";
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

export default function DocsPageClient() {
    const router = useRouter();

    const [docs, setDocs] = useState<DocRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [cleanupBusy, setCleanupBusy] = useState(false);

    // Search State
    const [q, setQ] = useState("");

    // Delete State
    const [delOpen, setDelOpen] = useState(false);
    const [delTarget, setDelTarget] = useState<DocRow | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    async function load() {
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
    }

    useEffect(() => {
        void load();
    }, []);

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
        setDeletingId(docId); // Show loading state on specific item if supported, or generic

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
            // Fallback reload
            void load();
        } finally {
            setDeletingId(null);
        }
    }

    return (
        <div className="mx-auto w-full max-w-4xl px-6 py-10">
            <div className="flex items-start justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-4xl font-semibold tracking-tight">Docs</h1>
                    <p className="mt-2 text-sm text-neutral-600">
                        บันทึกความคิด/แผนงาน/สรุปงาน แบบเรียบง่าย
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        className="rounded-md border px-4 py-2 text-sm disabled:opacity-50 hover:bg-neutral-50"
                        disabled={cleanupBusy || draftsCount === 0}
                        onClick={() => void cleanupDrafts()}
                        title="ลบเอกสาร Draft (Untitled + ว่าง) ทั้งหมด"
                    >
                        {cleanupBusy ? "Cleaning..." : `Cleanup Drafts (${draftsCount})`}
                    </button>

                    <button
                        className="rounded-md border px-4 py-2 text-sm hover:bg-neutral-50"
                        onClick={() => void load()}
                    >
                        Refresh
                    </button>

                    <button
                        className="rounded-md bg-black px-4 py-2 text-sm text-white hover:bg-neutral-800"
                        onClick={() => void createDoc()}
                    >
                        New Doc
                    </button>
                </div>
            </div>

            <DocsClient
                docs={filteredDocs}
                loading={loading}
                q={q}
                onQChange={setQ}
                onOpen={(id) => router.push(`/docs/${id}`)}
                onDelete={handleAskDelete}
                deletingId={deletingId}
                formatThai={formatThai}
            />

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
        </div>
    );
}
