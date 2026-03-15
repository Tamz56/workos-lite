"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toErrorMessage } from "@/lib/error";
import { PageShell } from "@/components/layout/PageShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { RefreshCw, Trash2, ChevronLeft, Save, Printer, Layout, Briefcase } from "lucide-react";
import { WORKSPACES_LIST } from "@/lib/workspaces";
import { Project } from "@/lib/types";

type DocRow = {
    id: string;
    title: string;
    content_md: string;
    project_id: string | null;
    workspace: string | null;
    created_at: string;
    updated_at: string;
};

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

export default function DocClient({ id }: { id: string }) {
    const router = useRouter();

    const [doc, setDoc] = useState<DocRow | null>(null);
    const [projects, setProjects] = useState<Project[]>([]);
    const [err, setErr] = useState<string | null>(null);

    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [lastSaved, setLastSaved] = useState<string | null>(null);

    const tRef = useRef<number | null>(null);
    const pendingRef = useRef<Partial<DocRow>>({});
    const mountedRef = useRef(true);

    const load = useCallback(async () => {
        setErr(null);
        try {
            const [docRes, projectsRes] = await Promise.all([
                fetch(`/api/docs/${id}`, { cache: "no-store" }),
                fetch("/api/projects", { cache: "no-store" })
            ]);

            if (!docRes.ok) throw new Error("Load doc failed");
            const docData = await docRes.json();
            setDoc(docData.doc);

            if (projectsRes.ok) {
                const projectsData = await projectsRes.json();
                setProjects(projectsData);
            }
        } catch (e: unknown) {
            setErr(toErrorMessage(e));
        }
    }, [id]);

    async function patch(next: Partial<DocRow>) {
        setSaving(true);
        setSaved(false);
        setErr(null);

        try {
            const payload = { ...next };
            if (payload.title !== undefined) {
                payload.title = payload.title.trim() || "Untitled";
            }

            const res = await fetch(`/api/docs/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            if (!res.ok) throw new Error("Save failed");

            const data = await res.json();
            const updated = data.doc;
            if (!mountedRef.current) return;

            setDoc(updated);
            setLastSaved(new Date().toISOString());
            setSaved(true);
        } catch (e: unknown) {
            if (!mountedRef.current) return;
            setErr(toErrorMessage(e));
        } finally {
            if (!mountedRef.current) return;
            setSaving(false);
        }
    }

    function scheduleSave(next: Partial<DocRow>) {
        pendingRef.current = { ...pendingRef.current, ...next };

        if (tRef.current) window.clearTimeout(tRef.current);
        tRef.current = window.setTimeout(() => {
            const payload = pendingRef.current;
            pendingRef.current = {};
            patch(payload);
        }, 800);
    }

    async function flushPending() {
        const payload = pendingRef.current;
        if (Object.keys(payload).length === 0) return;
        pendingRef.current = {};
        if (tRef.current) window.clearTimeout(tRef.current);
        await patch(payload);
    }

    useEffect(() => {
        mountedRef.current = true;
        load();
        return () => {
            mountedRef.current = false;
            if (tRef.current) window.clearTimeout(tRef.current);
        };
    }, [load]);

    async function onDelete() {
        if (!confirm(`ลบเอกสาร "${doc?.title || 'Untitled'}" ถาวร?`)) return;
        try {
            const res = await fetch(`/api/docs/${id}`, { method: "DELETE" });
            if (!res.ok) throw new Error("Delete failed");
            router.push("/docs");
        } catch (e: unknown) {
            setErr(toErrorMessage(e));
        }
    }

    if (err) {
        return (
            <PageShell>
                <div className="p-20 text-center">
                    <div className="text-red-500 font-bold mb-4">{err}</div>
                    <button onClick={() => router.push("/docs")} className="text-sm font-bold underline">Back to Docs</button>
                </div>
            </PageShell>
        );
    }

    if (!doc) {
        return <PageShell><div className="p-20 text-center text-neutral-400 italic">Finding document...</div></PageShell>;
    }

    return (
        <PageShell>
            <div className="flex items-center gap-2 mb-6 text-neutral-400 hover:text-black transition-colors cursor-pointer group w-fit" onClick={() => router.push("/docs")}>
                <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                <span className="text-xs font-black uppercase tracking-widest">Docs & Knowledge</span>
            </div>

            <PageHeader
                title={doc.title || "Untitled"}
                subtitle={`Updated: ${formatThai(doc.updated_at)}`}
                actions={
                    <div className="flex items-center gap-2">
                        <div className="text-[10px] font-black uppercase tracking-widest text-neutral-400 mr-2">
                            {saving ? "Saving..." : saved ? "All changes saved" : ""}
                        </div>
                        <button
                            onClick={() => router.push(`/docs/${id}/print`)}
                            className="p-2.5 rounded-2xl bg-white border border-neutral-200 text-neutral-400 hover:text-neutral-900 hover:border-neutral-300 transition-all active:scale-95 shadow-sm"
                            title="Print"
                        >
                            <Printer className="w-4 h-4" />
                        </button>
                        <button
                            onClick={onDelete}
                            className="p-2.5 rounded-2xl bg-white border border-neutral-200 text-neutral-400 hover:text-red-600 hover:border-red-200 hover:bg-red-50 transition-all active:scale-95 shadow-sm"
                            title="Delete"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>
                }
            />

            <div className="max-w-5xl mx-auto mt-8 space-y-8 pb-20">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-white border border-neutral-200 rounded-3xl p-5 shadow-sm">
                        <div className="flex items-center gap-2 mb-3 px-1">
                            <Layout className="w-3.5 h-3.5 text-neutral-400" />
                            <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Linked Project</label>
                        </div>
                        <select
                            value={doc.project_id || ""}
                            onChange={(e) => {
                                const val = e.target.value || null;
                                setDoc(prev => prev ? { ...prev, project_id: val } : null);
                                scheduleSave({ project_id: val });
                            }}
                            className="w-full bg-neutral-50 border border-neutral-100 rounded-xl px-4 py-2 text-sm font-bold outline-none focus:bg-white focus:border-neutral-300 transition-all"
                        >
                            <option value="">None (Unlinked)</option>
                            {projects.map(p => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="bg-white border border-neutral-200 rounded-3xl p-5 shadow-sm">
                        <div className="flex items-center gap-2 mb-3 px-1">
                            <Briefcase className="w-3.5 h-3.5 text-neutral-400" />
                            <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Workspace Category</label>
                        </div>
                        <select
                            value={doc.workspace || ""}
                            onChange={(e) => {
                                const val = e.target.value || null;
                                setDoc(prev => prev ? { ...prev, workspace: val } : null);
                                scheduleSave({ workspace: val });
                            }}
                            className="w-full bg-neutral-50 border border-neutral-100 rounded-xl px-4 py-2 text-sm font-bold outline-none focus:bg-white focus:border-neutral-300 transition-all"
                        >
                            <option value="">None (General)</option>
                            {WORKSPACES_LIST.map(w => (
                                <option key={w.id} value={w.id}>{w.label}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="space-y-4">
                    <input
                        className="w-full bg-transparent border-none text-4xl font-black tracking-tight outline-none placeholder:text-neutral-100"
                        placeholder="Untitled Note"
                        value={doc.title}
                        onChange={(e) => {
                            const val = e.target.value;
                            setDoc(prev => prev ? { ...prev, title: val } : null);
                            scheduleSave({ title: val });
                        }}
                    />
                    
                    <textarea
                        className="w-full min-h-[600px] bg-white border border-neutral-200 rounded-3xl p-8 text-lg font-medium outline-none focus:shadow-xl transition-all shadow-sm leading-relaxed"
                        placeholder="Start writing your thoughts, documentation, or knowledge here..."
                        value={doc.content_md}
                        onChange={(e) => {
                            const val = e.target.value;
                            setDoc(prev => prev ? { ...prev, content_md: val } : null);
                            scheduleSave({ content_md: val });
                        }}
                    />
                </div>
            </div>
        </PageShell>
    );
}
