"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import DangerIconButton from "@/components/ui/DangerIconButton";
import ConfirmDialog from "@/components/ConfirmDialog";
import { PageShell } from "@/components/layout/PageShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { toErrorMessage } from "@/lib/error";
import { type DocRow, isDraft } from "./types";
import { Plus, Book, FileText, Layout, RefreshCw, Trash2, Clock, Paperclip } from "lucide-react";

function formatDateTime(dt: string) {
    try {
        return new Date(dt).toLocaleString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric"
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

    const [q, setQ] = useState("");

    const [delOpen, setDelOpen] = useState(false);
    const [delTarget, setDelTarget] = useState<DocRow | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);

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

    const draftsCount = useMemo(() => docs.filter(isDraft).length, [docs]);

    const filteredDocs = useMemo(() => {
        const s = q.trim().toLowerCase();
        if (!s) return docs;
        return docs.filter((d) => {
            return (
                (d.title ?? "").toLowerCase().includes(s) ||
                (d.content_md ?? "").toLowerCase().includes(s)
            );
        });
    }, [docs, q]);

    // Categorization
    const recentDocs = useMemo(() => filteredDocs.slice(0, 5), [filteredDocs]);
    const projectDocs = useMemo(() => filteredDocs.filter(d => d.project_id), [filteredDocs]);
    const unlinkedDocs = useMemo(() => filteredDocs.filter(d => !d.project_id), [filteredDocs]);

    async function cleanupDrafts() {
        if (cleanupBusy) return;
        if (!confirm(`Are you sure you want to delete all ${draftsCount} drafts?`)) return;

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

    async function doDelete() {
        if (!delTarget) return;
        const docId = delTarget.id;
        setDeletingId(docId);

        try {
            const res = await fetch(`/api/docs/${docId}`, { method: "DELETE" });
            if (!res.ok) throw new Error("Delete failed");
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
                title="Docs & Knowledge"
                subtitle="Manage collective knowledge, notes, and documentation."
                actions={
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => void load()}
                            className="p-2.5 rounded-2xl bg-white border border-neutral-200 text-neutral-400 hover:text-neutral-900 hover:border-neutral-300 transition-all active:scale-95 shadow-sm"
                            title="Refresh"
                        >
                            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                        </button>
                        <button
                            className="p-2.5 rounded-2xl bg-white border border-neutral-200 text-neutral-400 hover:text-red-600 hover:border-red-200 hover:bg-red-50 transition-all disabled:opacity-50 shadow-sm"
                            disabled={cleanupBusy || draftsCount === 0}
                            onClick={() => void cleanupDrafts()}
                            title="Delete Drafts"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                        <button
                            onClick={createDoc}
                            className="bg-black text-white pr-6 pl-5 py-2.5 rounded-2xl text-sm font-black flex items-center gap-2 hover:bg-neutral-800 transition-all shadow-lg shadow-black/10 active:scale-95"
                        >
                            <Plus className="w-4 h-4" />
                            New Note
                        </button>
                    </div>
                }
            />

            <div className="max-w-5xl mx-auto space-y-10 mt-8">
                <div className="relative group">
                    <input
                        value={q}
                        onChange={(e) => setQ(e.target.value)}
                        placeholder="Search notes, knowledge, and documents..."
                        className="w-full bg-white border border-neutral-200 rounded-3xl pl-12 pr-4 py-4 text-base focus:border-neutral-400 focus:outline-none transition-all shadow-sm focus:shadow-md"
                    />
                    <FileText className="absolute left-4 top-4.5 w-5 h-5 text-neutral-400 group-focus-within:text-neutral-600 transition-colors" />
                </div>

                {loading ? (
                    <div className="text-center py-20 italic text-neutral-400 text-sm">Loading knowledge bank...</div>
                ) : filteredDocs.length === 0 ? (
                    <div className="text-center py-24 border border-dashed border-neutral-200 rounded-[2.5rem] bg-neutral-50/30 flex flex-col items-center justify-center">
                        <div className="w-16 h-16 bg-neutral-100 rounded-3xl flex items-center justify-center text-neutral-400 mb-4">
                            <Book className="w-8 h-8" />
                        </div>
                        <h3 className="text-lg font-bold text-neutral-900">No notes found</h3>
                        <p className="text-neutral-500 max-w-xs mx-auto mt-2 text-sm">
                            {q ? `We couldn&apos;t find any results for &quot;${q}&quot;.` : "Your knowledge base is waiting to be filled."}
                        </p>
                        {!q && (
                            <button 
                                onClick={createDoc}
                                className="mt-6 flex items-center gap-2 px-6 py-2.5 bg-emerald-600 text-white rounded-2xl text-sm font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/10 active:scale-95"
                            >
                                <Plus className="w-4 h-4" />
                                Create First Note
                            </button>
                        )}
                    </div>
                ) : (
                    <>
                        {!q && (
                            <section>
                                <div className="flex items-center gap-2 mb-4 px-2">
                                    <Clock className="w-4 h-4 text-orange-500" />
                                    <h2 className="text-xs font-black uppercase tracking-widest text-neutral-500">Recent Notes</h2>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {recentDocs.map(doc => (
                                        <DocCard key={doc.id} doc={doc} onClick={() => router.push(`/docs/${doc.id}`)} onDelete={() => { setDelTarget(doc); setDelOpen(true); }} />
                                    ))}
                                </div>
                            </section>
                        )}

                        {projectDocs.length > 0 && (
                            <section>
                                <div className="flex items-center gap-2 mb-4 px-2">
                                    <Layout className="w-4 h-4 text-blue-500" />
                                    <h2 className="text-xs font-black uppercase tracking-widest text-neutral-500">Project Related</h2>
                                </div>
                                <div className="space-y-3">
                                    {projectDocs.map(doc => (
                                        <DocListItem key={doc.id} doc={doc} onClick={() => router.push(`/docs/${doc.id}`)} />
                                    ))}
                                </div>
                            </section>
                        )}

                        {unlinkedDocs.length > 0 && (
                            <section>
                                <div className="flex items-center gap-2 mb-4 px-2">
                                    <Book className="w-4 h-4 text-green-500" />
                                    <h2 className="text-xs font-black uppercase tracking-widest text-neutral-500">General & Unlinked</h2>
                                </div>
                                <div className="space-y-2">
                                    {unlinkedDocs.map(doc => (
                                        <DocListItem key={doc.id} doc={doc} onClick={() => router.push(`/docs/${doc.id}`)} />
                                    ))}
                                </div>
                            </section>
                        )}
                    </>
                )}
            </div>

            <ConfirmDialog
                isOpen={delOpen}
                title="Delete Document"
                message={`Are you sure you want to delete "${(delTarget?.title ?? "Untitled")}"? This cannot be undone.`}
                confirmText={deletingId ? "Deleting..." : "Delete Permanently"}
                danger={true}
                onConfirm={doDelete}
                onCancel={() => { if (!deletingId) { setDelOpen(false); setDelTarget(null); } }}
            />
        </PageShell>
    );
}

function DocCard({ doc, onClick, onDelete }: { doc: DocRow, onClick: () => void, onDelete: () => void }) {
    return (
        <div 
            onClick={onClick}
            className="group bg-white border border-neutral-200 rounded-3xl p-5 hover:shadow-xl hover:border-neutral-300 transition-all cursor-pointer flex flex-col justify-between min-h-[140px]"
        >
            <div>
                <div className="flex justify-between items-start">
                    <div className="text-lg font-black tracking-tight text-neutral-900 group-hover:text-black line-clamp-2">
                        {doc.title || "Untitled"}
                    </div>
                    <button 
                        onClick={(e) => { e.stopPropagation(); onDelete(); }}
                        className="p-1.5 text-neutral-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
                <div className="text-xs text-neutral-400 mt-2 line-clamp-2 font-medium">
                    {doc.content_md || "No content yet..."}
                </div>
            </div>
            <div className="flex items-center justify-between mt-4">
                <div className="text-[10px] font-bold text-neutral-300 uppercase tracking-widest">
                    {formatDateTime(doc.updated_at)}
                </div>
                {(doc.attachment_count ?? 0) > 0 && (
                    <div className="flex items-center gap-1 text-[10px] font-black text-neutral-400">
                        <Paperclip className="w-3 h-3" />
                        {doc.attachment_count}
                    </div>
                )}
            </div>
        </div>
    );
}

function DocListItem({ doc, onClick }: { doc: DocRow, onClick: () => void }) {
    return (
        <div 
            onClick={onClick}
            className="group bg-white border border-neutral-200 rounded-2xl px-6 py-4 flex items-center justify-between hover:border-neutral-400 transition-all cursor-pointer hover:shadow-sm"
        >
            <div className="flex items-center gap-4 flex-1 truncate">
                <FileText className="w-4 h-4 text-neutral-400 group-hover:text-neutral-900" />
                <span className="font-bold text-neutral-900 truncate">{doc.title || "Untitled"}</span>
                {doc.workspace && (
                    <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-lg bg-neutral-100 text-neutral-500">
                        {doc.workspace}
                    </span>
                )}
                {(doc.attachment_count ?? 0) > 0 && (
                    <div className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-blue-50 text-blue-600 text-[9px] font-black">
                        <Paperclip className="w-3 h-3" />
                        {doc.attachment_count}
                    </div>
                )}
            </div>
            <span className="text-[10px] font-bold text-neutral-300 uppercase tracking-widest ml-4">
                {formatDateTime(doc.updated_at)}
            </span>
        </div>
    );
}
