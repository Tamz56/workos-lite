"use client";

import React, { useCallback, useEffect, useMemo, useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { Task, Workspace, ScheduleBucket } from "@/lib/types";
import { getTasks, createTask, patchTask } from "@/lib/api";
import { todayISO, tomorrowISO, defaultBucketForWorkspace } from "@/lib/planning";
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
    const [projects, setProjects] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [err, setErr] = useState<string | null>(null);
    const [isCelebrating, setIsCelebrating] = useState(false);

    const { editingTask, setEditingTask, initialTab, openEditor, closeEditor } = useTaskEditor();
    const [planningIds, setPlanningIds] = useState<Set<string>>(new Set());
    const [focusedIndex, setFocusedIndex] = useState<number>(0);
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
            const [rows, projRows] = await Promise.all([
                getTasks({ status: "inbox", limit: 300 }),
                fetch("/api/projects").then(res => res.json())
            ]);
            setTasks(rows);
            setProjects(projRows);
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

    async function plan(task: Task, date: string | null, bucket?: ScheduleBucket) {
        setErr(null);
        if (planningIds.has(task.id)) return;
        const b = bucket ?? defaultBucketForWorkspace(task.workspace) ?? "afternoon";
        setPlanningIds((prev) => new Set(prev).add(task.id));
        
        // Optimistic UI
        setTasks((prev) => prev.filter((x) => x.id !== task.id));
        if (tasks.length === 1) setIsCelebrating(true);

        try {
            await patchTask(task.id, {
                status: date ? "planned" : "inbox",
                scheduled_date: date,
                schedule_bucket: date ? b : null,
            });
            router.refresh();
        } catch (e: unknown) {
            setTasks((prev) => [task, ...prev]);
            setIsCelebrating(false);
            setErr(toErrorMessage(e));
        } finally {
            setPlanningIds((prev) => {
                const next = new Set(prev);
                next.delete(task.id);
                return next;
            });
        }
    }

    async function setTaskProject(taskId: string, listId: string | null) {
        try {
            const updated = await patchTask(taskId, { list_id: listId });
            setTasks(prev => prev.map(t => t.id === taskId ? updated : t));
        } catch (e: any) {
            setErr(toErrorMessage(e));
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

    // Keyboard Navigation
    useEffect(() => {
        const handleKv = (e: KeyboardEvent) => {
            if (editingTask || isNewTaskOpen || isBulkOpen) return; // modals/editors open
            const target = e.target as HTMLElement;
            if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT") return;

            if (e.key === "j") { setFocusedIndex(prev => Math.min(prev + 1, tasks.length - 1)); }
            else if (e.key === "k") { setFocusedIndex(prev => Math.max(prev - 1, 0)); }
            else if (e.key === "t" && tasks[focusedIndex]) { plan(tasks[focusedIndex], todayISO()); }
            else if (e.key === "w" && tasks[focusedIndex]) { plan(tasks[focusedIndex], tomorrowISO()); }
            else if (e.key === "d" && tasks[focusedIndex]) { markDone(tasks[focusedIndex]); }
            else if (e.key === "x" || e.key === "Delete") { 
                const t = tasks[focusedIndex];
                if (t && confirm(`Delete "${t.title}"?`)) {
                    patchTask(t.id, { status: "done" }); // Simple way to clear it for now or use deleteTask
                    setTasks(prev => prev.filter(x => x.id !== t.id));
                }
            }
            else if (e.key === "Enter" && tasks[focusedIndex]) { openEditor(tasks[focusedIndex]); }
            else if (e.key === " ") { 
                e.preventDefault();
                const t = tasks[focusedIndex];
                if (t) {
                    setSelectedIds(prev => {
                        const next = new Set(prev);
                        if (next.has(t.id)) next.delete(t.id);
                        else next.add(t.id);
                        return next;
                    });
                }
            }
        };
        window.addEventListener("keydown", handleKv);
        return () => window.removeEventListener("keydown", handleKv);
    }, [tasks, focusedIndex, editingTask]);

    const isNewTaskOpen = sp.get("newTask") === "1"; // Mocking this for the check above
    const isBulkOpen = selectedCount > 0;

    return (
        <PageShell>
            <PageHeader
                title="Inbox"
                subtitle="Capture ideas, tasks, and notes here. Review and plan them when ready."
                actions={
                    <div className="flex items-center gap-3">
                        <div className="hidden md:flex items-center gap-4 mr-4 text-[10px] font-bold text-neutral-400 uppercase tracking-widest border-r border-neutral-200 pr-6">
                            <div className="flex items-center gap-1.5"><kbd className="px-1.5 py-0.5 rounded border border-neutral-200 bg-white">J/K</kbd> NAV</div>
                            <div className="flex items-center gap-1.5"><kbd className="px-1.5 py-0.5 rounded border border-neutral-200 bg-white">T</kbd> TODAY</div>
                            <div className="flex items-center gap-1.5"><kbd className="px-1.5 py-0.5 rounded border border-neutral-200 bg-white">W</kbd> TMW</div>
                            <div className="flex items-center gap-1.5"><kbd className="px-1.5 py-0.5 rounded border border-neutral-200 bg-white">↵</kbd> EDIT</div>
                            <div className="flex items-center gap-1.5"><kbd className="px-1.5 py-0.5 rounded border border-neutral-200 bg-white">SPACE</kbd> SELECT</div>
                        </div>
                        <button
                            onClick={load}
                            className="rounded-xl border border-neutral-200 px-4 py-2 text-sm font-bold hover:bg-neutral-50 transition-colors bg-white text-neutral-700 shadow-sm"
                        >
                            Refresh
                        </button>
                    </div>
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
                            <div className="p-20 text-center space-y-6 animate-in fade-in zoom-in duration-500">
                                <div className="relative inline-block">
                                    <div className="absolute inset-0 bg-emerald-400 blur-2xl opacity-20 animate-pulse" />
                                    <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto relative z-10" />
                                </div>
                                <div className="space-y-2">
                                    <h3 className="text-xl font-black text-neutral-900">Inbox Zero Achievement!</h3>
                                    <p className="text-neutral-400 font-medium max-w-sm mx-auto">Your mind is clear and your inbox is empty. Time to focus on executing your plan.</p>
                                </div>
                                <div className="pt-4">
                                    <button 
                                        onClick={() => router.push("/planner")}
                                        className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-black text-white text-sm font-black hover:bg-neutral-800 transition-all shadow-xl shadow-black/10 active:scale-95"
                                    >
                                        Go to Planner <ArrowRight className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        ) : (
                            tasks.map((t, idx) => (
                                <div
                                    key={t.id}
                                    onClick={() => openEditor(t)}
                                    onMouseEnter={() => setFocusedIndex(idx)}
                                    role="button"
                                    tabIndex={0}
                                    className={`p-5 flex items-center justify-between gap-4 group transition-all relative ${
                                        idx === focusedIndex ? "bg-neutral-50" : "hover:bg-neutral-50/50"
                                    }`}
                                >
                                    {/* Focus Indicator */}
                                    {idx === focusedIndex && (
                                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-black animate-in fade-in slide-in-from-left-1 duration-300" />
                                    )}
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

                                    <div className="flex items-center gap-3">
                                        <div className="flex flex-col items-end gap-1 px-4">
                                            <select 
                                                className="text-[10px] font-bold text-neutral-400 bg-transparent border-none outline-none focus:text-neutral-900 cursor-pointer text-right uppercase tracking-widest max-w-[120px] truncate"
                                                value={t.list_id || ""}
                                                onChange={(e) => {
                                                    e.stopPropagation();
                                                    setTaskProject(t.id, e.target.value || null);
                                                }}
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                <option value="">No Project</option>
                                                {projects.map(p => (
                                                    <option key={p.id} value={p.id}>{p.name}</option>
                                                ))}
                                            </select>
                                        </div>

                                        <div className="flex border border-neutral-200 rounded-xl overflow-hidden shadow-sm bg-white">
                                            <button
                                                onClick={(e) => { e.stopPropagation(); plan(t, todayISO()); }}
                                                className="px-3 py-1.5 text-[10px] font-black uppercase tracking-tighter hover:bg-neutral-50 border-r border-neutral-100 text-neutral-700 bg-emerald-50/50"
                                            >
                                                Today
                                            </button>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); plan(t, tomorrowISO()); }}
                                                className="px-3 py-1.5 text-[10px] font-black uppercase tracking-tighter hover:bg-neutral-50 border-r border-neutral-100 text-neutral-500"
                                            >
                                                Tomorrow
                                            </button>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); plan(t, null); }}
                                                className="px-3 py-1.5 text-[10px] font-black uppercase tracking-tighter hover:bg-neutral-50 text-neutral-400"
                                                title="Keep in Inbox"
                                            >
                                                Someday
                                            </button>
                                        </div>

                                        <div className="flex gap-1 pl-2 border-l border-neutral-100">
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); markDone(t); }}
                                                className="p-2 rounded-xl text-neutral-300 hover:text-green-600 hover:bg-green-50 transition-all"
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
