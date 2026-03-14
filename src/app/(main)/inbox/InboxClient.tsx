"use client";

import React, { useCallback, useEffect, useMemo, useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { Task, Workspace, ScheduleBucket } from "@/lib/types";
import { getTasks, createTask, patchTask } from "@/lib/api";
import { todayISO, defaultBucketForWorkspace } from "@/lib/planning";
import { useTaskEditor } from "@/hooks/useTaskEditor";
import TaskDetailDialog from "@/components/TaskDetailDialog";
import TaskTitleInlineEdit from "@/components/TaskTitleInlineEdit";
import TaskDeleteButton from "@/components/TaskDeleteButton";
import { toErrorMessage } from "@/lib/error";
import { PageShell } from "@/components/layout/PageShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { Inbox, CheckCircle2, Calendar, Target, Plus, Trash2, ArrowRight } from "lucide-react";

import { WORKSPACES_LIST } from "@/lib/workspaces";

export default function InboxClient() {
    const [title, setTitle] = useState("");
    const [workspace, setWorkspace] = useState<Workspace>("avacrm");

    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(false);
    const [err, setErr] = useState<string | null>(null);

    const { editingTask, setEditingTask, initialTab, openEditor, closeEditor } = useTaskEditor();
    const [planningIds, setPlanningIds] = useState<Set<string>>(new Set());
    const router = useRouter();
    const sp = useSearchParams();
    const inputRef = useRef<HTMLInputElement>(null);

    // Bulk selection state
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [bulkStatus, setBulkStatus] = useState<string>("");
    const [bulkBucket, setBulkBucket] = useState<string>("");
    const [bulkWorkspace, setBulkWorkspace] = useState<string>("");
    const [bulkTag, setBulkTag] = useState<string>("project:nanagarden-q1");
    const [bulkLoading, setBulkLoading] = useState(false);
    const [bulkError, setBulkError] = useState<string>("");

    const selectedCount = selectedIds.size;
    const clearSelection = () => setSelectedIds(new Set());
    const toggleOne = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    // Smart Link: Focus Quick Add if ?newTask=1
    useEffect(() => {
        if (sp.get("newTask") === "1") {
            setTimeout(() => {
                inputRef.current?.focus();
            }, 100);
        }
    }, [sp]);

    const load = useCallback(async () => {
        setLoading(true);
        setErr(null);
        try {
            const rows = await getTasks({ status: "inbox", scheduled_date: "null", limit: 300 });
            setTasks(rows);
        } catch (e: unknown) {
            setErr(toErrorMessage(e));
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    async function add() {
        const t = title.trim();
        if (!t) return;
        setErr(null);
        try {
            const newTask = await createTask({ title: t, workspace, status: "inbox" });
            setTitle("");
            setTasks(prev => [newTask, ...prev]);
        } catch (e: unknown) {
            setErr(`createTask failed: ${toErrorMessage(e)}`);
        }
    }

    async function planToday(task: Task, bucket?: ScheduleBucket) {
        setErr(null);
        if (planningIds.has(task.id)) return;
        const b = bucket ?? defaultBucketForWorkspace(task.workspace) ?? "afternoon";
        setPlanningIds((prev) => new Set(prev).add(task.id));
        setTasks((prev) => prev.filter((x) => x.id !== task.id));
        try {
            await patchTask(task.id, {
                status: "planned",
                scheduled_date: todayISO(),
                schedule_bucket: b,
            });
            // Don't auto-redirect, let user review more
            router.refresh();
        } catch (e: unknown) {
            setTasks((prev) => [task, ...prev]);
            setErr(toErrorMessage(e));
        } finally {
            setPlanningIds((prev) => {
                const next = new Set(prev);
                next.delete(task.id);
                return next;
            });
        }
    }

    async function markDone(task: Task) {
        try {
            await patchTask(task.id, { status: "done" });
            setTasks(prev => prev.filter(t => t.id !== task.id));
        } catch (e: unknown) {
            setErr(toErrorMessage(e));
        }
    }

    async function applyBulk() {
        setBulkLoading(true);
        setBulkError("");
        const ids = Array.from(selectedIds);
        const patch: any = {};
        if (bulkStatus) patch.status = bulkStatus;
        if (bulkBucket) patch.schedule_bucket = bulkBucket;
        if (bulkWorkspace) patch.workspace = bulkWorkspace;
        if (bulkTag?.trim()) patch.notes_append = `\n${bulkTag.trim()}\n`;

        try {
            const res = await fetch("/api/tasks/batch", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ ids, patch }),
            });
            if (!res.ok) throw new Error(await res.text() || "Batch update failed");
            clearSelection();
            await load();
        } catch (e: any) {
            setBulkError(e?.message || "Unknown error");
        } finally {
            setBulkLoading(false);
        }
    }

    const count = useMemo(() => tasks.length, [tasks]);
    const visibleIds = tasks.map(t => t.id);
    const allSelected = visibleIds.length > 0 && visibleIds.every(id => selectedIds.has(id));

    const toggleSelectAll = () => {
        if (allSelected) clearSelection();
        else setSelectedIds(new Set(visibleIds));
    };

    return (
        <PageShell>
            <PageHeader
                title="Inbox"
                subtitle="Capture ideas, tasks, and notes here. Review and plan them when ready."
                actions={
                    <button
                        onClick={load}
                        className="rounded-xl border border-neutral-200 px-4 py-2 text-sm font-bold hover:bg-neutral-50 transition-colors bg-white text-neutral-700 shadow-sm"
                    >
                        Refresh
                    </button>
                }
            />

            <div className="max-w-5xl mx-auto space-y-6 pt-6">
                {/* Quick Add Section */}
                <div className="bg-white p-4 rounded-2xl border border-neutral-200 shadow-sm space-y-4">
                    <div className="flex gap-2">
                        <div className="flex-1 relative">
                            <input
                                ref={inputRef}
                                type="text"
                                placeholder="Quick add to inbox..."
                                className="w-full pl-10 pr-4 py-3 bg-neutral-50 border-transparent focus:bg-white focus:border-neutral-200 rounded-xl text-base transition-all outline-none font-medium"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                onKeyDown={(e) => e.key === "Enter" && add()}
                            />
                            <Plus className="absolute left-3 top-3.5 h-5 w-5 text-neutral-400" />
                        </div>
                        <select 
                            value={workspace}
                            onChange={(e) => setWorkspace(e.target.value as Workspace)}
                            className="rounded-xl border border-neutral-200 bg-white px-4 py-2 text-sm font-bold outline-none shadow-sm focus:border-neutral-400"
                        >
                            {WORKSPACES_LIST.map(w => (
                                <option key={w.id} value={w.id}>{w.label}</option>
                            ))}
                        </select>
                        <button
                            onClick={add}
                            disabled={!title.trim()}
                            className="bg-black text-white px-6 py-3 rounded-xl text-sm font-black disabled:opacity-50 transition-all hover:bg-neutral-800 shadow-lg shadow-black/10 active:scale-95"
                        >
                            Add to Inbox
                        </button>
                    </div>
                </div>

                {/* Bulk Action Bar */}
                {selectedCount > 0 && (
                    <div className="sticky top-[80px] z-10 bg-neutral-900 border border-neutral-800 rounded-2xl p-4 shadow-2xl animate-in slide-in-from-top-4">
                        <div className="flex items-center gap-4 flex-wrap">
                            <div className="flex items-center gap-2 pr-4 border-r border-neutral-800">
                                <span className="bg-white text-black text-[10px] font-black px-2 py-0.5 rounded-full uppercase">{selectedCount}</span>
                                <span className="text-sm font-bold text-neutral-400">Selected</span>
                            </div>

                            <div className="flex gap-2 flex-wrap flex-1">
                                <select className="bg-neutral-800 border-none text-white rounded-lg px-3 py-1.5 text-xs font-bold outline-none" value={bulkStatus} onChange={(e) => setBulkStatus(e.target.value)}>
                                    <option value="">Status...</option>
                                    <option value="inbox">Inbox</option>
                                    <option value="planned">Planned</option>
                                    <option value="done">Done</option>
                                </select>

                                <select className="bg-neutral-800 border-none text-white rounded-lg px-3 py-1.5 text-xs font-bold outline-none" value={bulkBucket} onChange={(e) => setBulkBucket(e.target.value)}>
                                    <option value="">Bucket...</option>
                                    <option value="morning">Morning</option>
                                    <option value="afternoon">Afternoon</option>
                                    <option value="evening">Evening</option>
                                </select>

                                <select className="bg-neutral-800 border-none text-white rounded-lg px-3 py-1.5 text-xs font-bold outline-none" value={bulkWorkspace} onChange={(e) => setBulkWorkspace(e.target.value)}>
                                    <option value="">Workspace...</option>
                                    {WORKSPACES_LIST.map((w) => (
                                        <option key={w.id} value={w.id}>{w.label}</option>
                                    ))}
                                </select>

                                <button
                                    onClick={applyBulk}
                                    disabled={bulkLoading || (!bulkStatus && !bulkBucket && !bulkWorkspace)}
                                    className="bg-white text-black px-4 py-1.5 rounded-lg font-black text-xs hover:bg-neutral-200 transition-all disabled:opacity-50"
                                >
                                    {bulkLoading ? "Applying..." : "Apply Changes"}
                                </button>
                            </div>

                            <button onClick={clearSelection} className="text-xs font-bold text-neutral-500 hover:text-white transition-colors">
                                Cancel
                            </button>
                        </div>
                    </div>
                )}

                {/* Inbox List */}
                <div className="bg-white border border-neutral-200 rounded-3xl overflow-hidden shadow-sm">
                    <div className="bg-neutral-50 border-b border-neutral-100 px-6 py-4 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <input
                                type="checkbox"
                                checked={allSelected}
                                onChange={toggleSelectAll}
                                className="w-5 h-5 rounded-md border-neutral-300 text-black focus:ring-black cursor-pointer"
                            />
                            <div className="flex items-center gap-2">
                                <Inbox className="w-4 h-4 text-neutral-400" />
                                <span className="text-sm font-black uppercase tracking-widest text-neutral-600">Review Inbox</span>
                                <span className="text-xs font-bold px-2 py-0.5 bg-neutral-200 rounded-full text-neutral-500">{count}</span>
                            </div>
                        </div>
                    </div>

                    <div className="divide-y divide-neutral-100">
                        {loading ? (
                            <div className="p-20 text-center text-neutral-400 font-medium">Loading inbox...</div>
                        ) : tasks.length === 0 ? (
                            <div className="p-20 text-center space-y-3">
                                <CheckCircle2 className="w-10 h-10 text-neutral-200 mx-auto" />
                                <p className="text-neutral-400 font-medium italic">Inbox is clear! You are all caught up.</p>
                            </div>
                        ) : (
                            tasks.map((t) => (
                                <div
                                    key={t.id}
                                    onClick={() => openEditor(t)}
                                    role="button"
                                    tabIndex={0}
                                    className="p-5 flex items-center justify-between gap-4 hover:bg-neutral-50 group transition-all"
                                >
                                    <div className="flex items-start gap-4 flex-1">
                                        <div className="pt-1">
                                            <input
                                                type="checkbox"
                                                checked={selectedIds.has(t.id)}
                                                onChange={(e) => toggleOne(t.id, e as unknown as React.MouseEvent)}
                                                onClick={(e) => e.stopPropagation()}
                                                className="w-5 h-5 rounded-md border-neutral-300 text-black focus:ring-black cursor-pointer mb-1"
                                            />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <TaskTitleInlineEdit
                                                    id={t.id}
                                                    title={t.title}
                                                    onSaved={(next) => {
                                                        setTasks((prev) => prev.map((x) => (x.id === t.id ? { ...x, title: next } : x)));
                                                    }}
                                                />
                                                {t.doc_id && <span className="text-neutral-300">📄</span>}
                                            </div>
                                            <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mt-1">
                                                {t.workspace}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 translate-x-4 opacity-0 group-hover:translate-x-0 group-hover:opacity-100 transition-all" onClick={(e) => e.stopPropagation()}>
                                        <div className="flex border border-neutral-200 rounded-xl overflow-hidden shadow-sm mr-2 bg-white">
                                            <button
                                                onClick={() => planToday(t, "morning")}
                                                className="px-3 py-1.5 text-[10px] font-black uppercase tracking-tighter hover:bg-neutral-50 border-r border-neutral-100 text-neutral-500"
                                            >
                                                Morning
                                            </button>
                                            <button
                                                onClick={() => planToday(t, "afternoon")}
                                                className="px-3 py-1.5 text-[10px] font-black uppercase tracking-tighter hover:bg-neutral-50 border-r border-neutral-100 text-neutral-500"
                                            >
                                                Afternoon
                                            </button>
                                            <button
                                                onClick={() => planToday(t, "evening")}
                                                className="px-3 py-1.5 text-[10px] font-black uppercase tracking-tighter hover:bg-neutral-50 text-neutral-500"
                                            >
                                                Evening
                                            </button>
                                        </div>

                                        <button 
                                            onClick={() => markDone(t)}
                                            className="p-2 rounded-xl border border-green-100 bg-green-50 text-green-600 hover:bg-green-100 transition-all"
                                            title="Mark Done"
                                        >
                                            <CheckCircle2 className="w-4 h-4" />
                                        </button>
                                        
                                        <TaskDeleteButton
                                            taskId={t.id}
                                            taskTitle={t.title}
                                            onDeleted={() => {
                                                setTasks((prev) => prev.filter((x) => x.id !== t.id));
                                            }}
                                        />
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            <TaskDetailDialog
                key={editingTask?.id}
                task={editingTask}
                isOpen={!!editingTask}
                onClose={closeEditor}
                initialTab={initialTab}
                onUpdate={(updated) => {
                    if (updated) setEditingTask(updated);
                    load();
                }}
            />
        </PageShell>
    );
}
