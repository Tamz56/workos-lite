"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toErrorMessage } from "@/lib/error";
import { PageShell } from "@/components/layout/PageShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { RefreshCw, Trash2, ChevronLeft, Save, Printer, Layout, Briefcase, ExternalLink, Box } from "lucide-react";
import { WORKSPACES_LIST, workspaceLabel } from "@/lib/workspaces";
import { Project } from "@/lib/types";
import AttachmentsPanel from "@/components/AttachmentsPanel";
import { MarkdownToolbar } from "@/components/editor/MarkdownToolbar";
import { Toast } from "@/components/ui/Toast";

type DocRow = {
    id: string;
    title: string;
    content_md: string;
    project_id: string | null;
    project_name?: string | null; // Added for UI display
    workspace: string | null;
    created_at: string;
    updated_at: string;
};

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

export default function DocClient({ id }: { id: string }) {
    const router = useRouter();

    const [doc, setDoc] = useState<DocRow | null>(null);
    const [projects, setProjects] = useState<Project[]>([]);
    const [err, setErr] = useState<string | null>(null);

    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [lastSaved, setLastSaved] = useState<string | null>(null);

    const [showToast, setShowToast] = useState(false);
    const [toastMsg, setToastMsg] = useState("");

    const tRef = useRef<number | null>(null);
    const pendingRef = useRef<Partial<DocRow>>({});
    const mountedRef = useRef(true);
    const contentTextareaRef = useRef<HTMLTextAreaElement>(null);

    const load = useCallback(async () => {
        setErr(null);
        try {
            const [docRes, projectsRes] = await Promise.all([
                fetch(`/api/docs/${id}`, { cache: "no-store" }),
                fetch("/api/projects", { cache: "no-store" })
            ]);

            if (!docRes.ok) throw new Error("Load doc failed");
            const docData = await docRes.json();
            const loadedDoc = docData.doc;

            if (projectsRes.ok) {
                const projectsData = await projectsRes.json();
                setProjects(projectsData);
                
                // Enrich doc with project name for the initial view
                if (loadedDoc.project_id) {
                    const p = (projectsData as Project[]).find(p => p.id === loadedDoc.project_id);
                    if (p) loadedDoc.project_name = p.name;
                }
            }
            
            setDoc(loadedDoc);
        } catch (e: unknown) {
            setErr(toErrorMessage(e));
        }
    }, [id]);

    async function patch(next: Partial<DocRow>, quiet = true) {
        setSaving(true);
        setSaved(false);
        setErr(null);

        try {
            const payload = { ...next };
            if (payload.title !== undefined) {
                payload.title = payload.title.trim();
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

            // Re-enrich with project name if project_id changed
            if (updated.project_id) {
                const p = projects.find(p => p.id === updated.project_id);
                if (p) updated.project_name = p.name;
            }

            setDoc(updated);
            setLastSaved(new Date().toISOString());
            setSaved(true);
            
            if (!quiet) {
                setToastMsg("Changes saved");
                setShowToast(true);
            }
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

    function handleContentChange(value: string) {
        setDoc(prev => prev ? { ...prev, content_md: value } : null);
        scheduleSave({ content_md: value });
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
            // Flush pending changes (like titles/content) before unmounting
            const payload = pendingRef.current;
            if (Object.keys(payload).length > 0) {
                // We use a sync-like approach or just trigger it. 
                // Since this is a client component moving to another page, 
                // a background fetch might still complete.
                fetch(`/api/docs/${id}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload),
                    keepalive: true // Important for unmount saves
                });
            }
            if (tRef.current) window.clearTimeout(tRef.current);
        };
    }, [load]);

    async function onDelete() {
        if (!confirm(`Delete document "${doc?.title || 'Untitled'}" permanently?`)) return;
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
        return <PageShell><div className="p-20 text-center text-theme-muted italic">Finding document...</div></PageShell>;
    }

    return (
        <PageShell>
            <div className="flex items-center gap-2 mb-6 text-theme-muted hover:text-theme-primary transition-colors cursor-pointer group w-fit" onClick={() => router.push("/docs")}>
                <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                <span className="text-xs font-black uppercase tracking-widest">Docs & Knowledge</span>
            </div>

            <PageHeader
                title={doc.title || "Untitled"}
                subtitle={`Updated: ${formatDateTime(doc.updated_at)}`}
                actions={
                    <div className="flex items-center gap-2">
                        <div className="text-[10px] font-black uppercase tracking-widest text-theme-muted mr-2">
                            {saving ? "Saving..." : saved ? "All changes saved" : ""}
                        </div>
                        <button
                            onClick={() => router.push(`/docs/${id}/print`)}
                            className="p-2.5 rounded-2xl bg-theme-card border border-theme-border text-theme-muted hover:text-theme-primary hover:border-theme-accent transition-all active:scale-95 shadow-sm"
                            title="Print"
                        >
                            <Printer className="w-4 h-4" />
                        </button>
                        <button
                            onClick={onDelete}
                            className="p-2.5 rounded-2xl bg-theme-card border border-theme-border text-theme-muted hover:text-red-500 hover:border-red-500/30 hover:bg-red-500/10 transition-all active:scale-95 shadow-sm"
                            title="Delete"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>
                }
            />

            <div className="max-w-5xl mx-auto mt-8 space-y-8 pb-20">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-theme-card border border-theme-border rounded-3xl p-5 shadow-sm">
                        <div className="flex items-center gap-2 mb-3 px-1">
                            <Layout className="w-3.5 h-3.5 text-theme-muted" />
                            <label className="text-[10px] font-black uppercase tracking-widest text-theme-muted">Linked Project</label>
                        </div>
                        <select
                            value={doc.project_id || ""}
                            onChange={(e) => {
                                const val = e.target.value || null;
                                setDoc(prev => prev ? { ...prev, project_id: val } : null);
                                patch({ project_id: val }); // Immediate save for metadata
                            }}
                            className="w-full bg-theme-input border border-theme-border rounded-xl px-4 py-2 text-sm font-bold outline-none focus:bg-theme-card focus:border-theme-accent transition-all text-theme-primary"
                        >
                            <option value="">None (Unlinked)</option>
                            {projects.map(p => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="bg-theme-card border border-theme-border rounded-3xl p-5 shadow-sm">
                        <div className="flex items-center gap-2 mb-3 px-1">
                            <Briefcase className="w-3.5 h-3.5 text-theme-muted" />
                            <label className="text-[10px] font-black uppercase tracking-widest text-theme-muted">Workspace Category</label>
                        </div>
                        <select
                            value={doc.workspace || ""}
                            onChange={(e) => {
                                const val = e.target.value || null;
                                setDoc(prev => prev ? { ...prev, workspace: val } : null);
                                patch({ workspace: val }); // Immediate save for metadata
                            }}
                            className="w-full bg-theme-input border border-theme-border rounded-xl px-4 py-2 text-sm font-bold outline-none focus:bg-theme-card focus:border-theme-accent transition-all text-theme-primary"
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
                        className="w-full bg-transparent border-none text-4xl font-black tracking-tight outline-none placeholder:text-theme-muted text-theme-primary"
                        placeholder="Untitled Note"
                        value={doc.title}
                        onChange={(e) => {
                            const val = e.target.value;
                            setDoc(prev => prev ? { ...prev, title: val } : null);
                            scheduleSave({ title: val });
                        }}
                    />
                    
                    <div className="overflow-hidden rounded-3xl border border-theme-border bg-theme-card shadow-sm transition-all focus-within:shadow-xl">
                        <MarkdownToolbar
                            value={doc.content_md}
                            onChange={handleContentChange}
                            textareaRef={contentTextareaRef}
                            className="rounded-none border-x-0 border-t-0"
                        />
                        <textarea
                            ref={contentTextareaRef}
                            className="w-full min-h-[600px] bg-transparent p-8 text-lg font-medium outline-none leading-relaxed text-theme-primary resize-y"
                            placeholder="Start writing your thoughts, documentation, or knowledge here..."
                            value={doc.content_md}
                            onChange={(e) => handleContentChange(e.target.value)}
                        />
                    </div>

                    <AttachmentsPanel kind="doc" entityId={id} />
                </div>
            </div>
        </PageShell>
    );
}
