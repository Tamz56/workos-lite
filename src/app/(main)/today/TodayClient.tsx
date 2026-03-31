"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ScheduleBucket, Task } from "@/lib/types";
import { createTask, listTasks, patchTask } from "@/lib/api";
import { useTaskEditor } from "@/hooks/useTaskEditor";
import TaskDetailDialog from "@/components/TaskDetailDialog";
import TaskTitleInlineEdit from "@/components/TaskTitleInlineEdit";
import TaskDeleteButton from "@/components/TaskDeleteButton";
import { toErrorMessage } from "@/lib/error";
import { Plus, AlertCircle, Calendar } from "lucide-react";

function todayISO() {
    return new Date().toISOString().slice(0, 10);
}

const buckets: { key: ScheduleBucket; label: string }[] = [
    { key: "morning", label: "Morning" },
    { key: "afternoon", label: "Afternoon" },
    { key: "evening", label: "Evening" },
];

export default function TodayClient() {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [overdueTasks, setOverdueTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);
    const [err, setErr] = useState<string | null>(null);
    const [inlineTitle, setInlineTitle] = useState("");
    const [isAdding, setIsAdding] = useState(false);
    
    const { editingTask, setEditingTask, initialTab, openEditor, closeEditor } = useTaskEditor();

    const date = todayISO();

    const refresh = useCallback(async () => {
        setLoading(true);
        setErr(null);
        try {
            const [todayRows, overdueRows] = await Promise.all([
                listTasks({ status: "planned", scheduled_date: date }),
                listTasks({ status: "planned", cutoff_date: date, filter: "overdue" })
            ]);
            setTasks(todayRows);
            setOverdueTasks(overdueRows);
        } catch (e: unknown) {
            setErr(toErrorMessage(e));
        } finally {
            setLoading(false);
        }
    }, [date]);

    useEffect(() => {
        refresh();
        const onTaskUpdated = () => refresh();
        window.addEventListener("task-updated", onTaskUpdated);
        return () => window.removeEventListener("task-updated", onTaskUpdated);
    }, [refresh]);

    const grouped = useMemo(() => {
        const m = new Map<ScheduleBucket, Task[]>();
        for (const b of buckets) m.set(b.key, []);
        m.set("none", []);

        for (const t of tasks) {
            const k = t.schedule_bucket ?? "none";
            (m.get(k) ?? m.get("none")!)?.push(t);
        }

        for (const k of m.keys()) {
            m.set(
                k,
                (m.get(k) ?? []).sort((a, b) => a.created_at.localeCompare(b.created_at))
            );
        }

        return m;
    }, [tasks]);

    async function moveBucket(id: string, bucket: ScheduleBucket) {
        setErr(null);
        setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, schedule_bucket: bucket } : t)));
        try {
            await patchTask(id, { schedule_bucket: bucket });
        } catch (e: unknown) {
            setErr(toErrorMessage(e));
            refresh();
        }
    }

    async function markDone(id: string) {
        setErr(null);
        setTasks((prev) => prev.filter((t) => t.id !== id));
        try {
            await patchTask(id, { status: "done" });
        } catch (e: unknown) {
            setErr(toErrorMessage(e));
            refresh();
        }
    }

    async function backToInbox(id: string) {
        setErr(null);
        setTasks((prev) => prev.filter((t) => t.id !== id));
        try {
            await patchTask(id, { status: "inbox", scheduled_date: null, schedule_bucket: "none" });
        } catch (e: unknown) {
            setErr(toErrorMessage(e));
            refresh();
        }
    }

    return (
        <div className="space-y-6 max-w-6xl mx-auto p-4">
            <div className="flex items-end justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-neutral-900 tracking-tight">Today</h1>
                    <p className="text-sm font-bold text-neutral-400 uppercase tracking-widest mt-1">
                        Focus for <span className="text-neutral-900">{date}</span>
                    </p>
                </div>
                <button
                    onClick={refresh}
                    className="rounded-xl border border-neutral-200 bg-white px-4 py-2 text-sm font-bold shadow-sm hover:shadow-md transition-all active:scale-95"
                >
                    Refresh
                </button>
            </div>

            {/* Quick Add Inline */}
            <form 
                onSubmit={async (e) => {
                    e.preventDefault();
                    if (!inlineTitle.trim()) return;
                    setIsAdding(true);
                    try {
                        const newTask = await createTask({ 
                            title: inlineTitle, 
                            workspace: "avacrm", 
                            status: "planned",
                        });
                        await patchTask(newTask.id, { 
                            status: "planned", 
                            scheduled_date: date,
                            schedule_bucket: "morning"
                        });
                        setInlineTitle("");
                        refresh();
                    } catch (err) {
                        setErr(toErrorMessage(err));
                    } finally {
                        setIsAdding(false);
                    }
                }}
                className="flex gap-2 bg-white p-3 rounded-2xl border border-neutral-200 shadow-sm focus-within:border-neutral-400 transition-all"
            >
                <div className="flex-1 relative">
                    <input
                        type="text"
                        placeholder="What's the main thing today?"
                        className="w-full pl-10 pr-4 py-3 bg-neutral-50/50 border-transparent focus:bg-white rounded-xl text-base transition-all outline-none font-medium"
                        value={inlineTitle}
                        onChange={(e) => setInlineTitle(e.target.value)}
                        disabled={isAdding}
                    />
                    <Plus className="absolute left-3 top-3.5 h-5 w-5 text-neutral-400" />
                </div>
                <button 
                    type="submit" 
                    disabled={isAdding || !inlineTitle.trim()}
                    className="bg-black text-white px-6 py-3 rounded-xl text-sm font-black disabled:opacity-50 transition-all active:scale-95 hover:bg-neutral-800 shadow-lg shadow-black/10"
                >
                    {isAdding ? "Adding..." : "Add Task"}
                </button>
            </form>

            {err && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 font-medium flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    {err}
                </div>
            )}

            {/* Overdue Section */}
            {overdueTasks.length > 0 && (
                <section className="rounded-2xl border border-red-100 bg-red-50/20 overflow-hidden shadow-sm">
                    <div className="px-4 py-3 flex justify-between items-center border-b border-red-100/50 bg-red-50/50">
                        <div className="flex items-center gap-2 text-red-700 font-black text-xs uppercase tracking-widest">
                            <AlertCircle className="w-4 h-4" />
                            <span>Overdue (ยังไม่ได้ทำให้เสร็จ)</span>
                        </div>
                        <div className="text-[10px] font-black bg-red-100 text-red-700 px-2 py-0.5 rounded-full uppercase">
                            {overdueTasks.length} Delayed
                        </div>
                    </div>
                    <div className="divide-y divide-red-50">
                        {overdueTasks.map((t) => (
                            <div
                                key={t.id}
                                onClick={() => openEditor(t)}
                                role="button"
                                tabIndex={0}
                                className="p-4 flex justify-between items-center hover:bg-white transition-colors cursor-pointer group bg-white/40"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-1.5 h-1.5 rounded-full bg-red-400 group-hover:scale-150 transition-transform" />
                                    <div className="flex flex-col">
                                        <TaskTitleInlineEdit
                                            id={t.id}
                                            title={t.title}
                                            onSaved={(next) => {
                                                setOverdueTasks((prev) => prev.map((x) => (x.id === t.id ? { ...x, title: next } : x)));
                                            }}
                                        />
                                        <div className="text-[10px] text-red-400 font-bold uppercase tracking-tight mt-1 flex items-center gap-1">
                                            <Calendar className="w-3 h-3" />
                                            {t.scheduled_date}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button 
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            patchTask(t.id, { scheduled_date: date, schedule_bucket: "morning" }).then(() => refresh());
                                        }}
                                        className="text-[10px] font-black bg-white border border-red-100 text-red-600 px-3 py-1.5 rounded-xl hover:bg-red-50 transition-all active:scale-95 shadow-sm"
                                    >
                                        Move to Today
                                    </button>
                                    <TaskDeleteButton
                                        taskId={t.id}
                                        taskTitle={t.title}
                                        onDeleted={() => {
                                            setOverdueTasks((prev) => prev.filter((x) => x.id !== t.id));
                                        }}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {/* Unbucketed Tasks Section */}
            {grouped.get("none") && grouped.get("none")!.length > 0 && (
                <section className="rounded-2xl border border-amber-200 bg-amber-50/30 overflow-hidden shadow-sm">
                    <div className="border-b border-amber-200 px-4 py-3 flex justify-between items-center bg-amber-50/50">
                        <div className="text-xs font-black text-amber-800 uppercase tracking-widest flex items-center gap-2">
                            <Calendar className="w-4 h-4" />
                            <span>Unscheduled (รอระบุเวลา)</span>
                        </div>
                        <div className="text-[10px] font-black bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">
                            {grouped.get("none")!.length} tasks
                        </div>
                    </div>
                    <div className="divide-y divide-amber-100">
                        {grouped.get("none")!.map((t) => (
                            <div
                                key={t.id}
                                onClick={() => openEditor(t)}
                                role="button"
                                tabIndex={0}
                                className="p-4 flex justify-between items-center bg-white/40 cursor-pointer hover:bg-white transition-colors"
                            >
                                <div className="flex items-center gap-3">
                                    <TaskTitleInlineEdit
                                        id={t.id}
                                        title={t.title}
                                        onSaved={(next) => {
                                            setTasks((prev) => prev.map((x) => (x.id === t.id ? { ...x, title: next } : x)));
                                        }}
                                    />
                                    {t.doc_id && "📄"}
                                </div>
                                <div className="flex gap-2">
                                    <select
                                        value="none"
                                        onClick={(e) => e.stopPropagation()}
                                        onChange={(e) => moveBucket(t.id, e.target.value as ScheduleBucket)}
                                        className="rounded-xl border border-neutral-200 bg-white px-3 py-1.5 text-xs font-bold outline-none shadow-sm focus:border-neutral-400"
                                    >
                                        <option value="none" disabled>Plan...</option>
                                        <option value="morning">Morning</option>
                                        <option value="afternoon">Afternoon</option>
                                        <option value="evening">Evening</option>
                                    </select>
                                    <TaskDeleteButton
                                        taskId={t.id}
                                        taskTitle={t.title}
                                        onDeleted={() => {
                                            setTasks((prev) => prev.filter((x) => x.id !== t.id));
                                        }}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            )}

            <div className="grid gap-6 md:grid-cols-3">
                {buckets.map((b) => {
                    const rows = grouped.get(b.key) ?? [];
                    return (
                        <section key={b.key} className="rounded-3xl border border-neutral-200 bg-white shadow-sm hover:shadow-md transition-all flex flex-col h-full overflow-hidden">
                            <div className="border-b border-neutral-100 px-5 py-4 bg-neutral-50/50">
                                <div className="text-xs font-black text-neutral-900 uppercase tracking-widest">{b.label}</div>
                                <div className="text-[10px] font-bold text-neutral-400 mt-0.5">{loading ? "..." : `${rows.length} tasks`}</div>
                            </div>

                            <div className="divide-y divide-neutral-50 flex-1">
                                {!loading && rows.length === 0 && (
                                    <div className="p-8 text-center">
                                        <div className="text-sm font-medium text-neutral-300 italic">No tasks planned</div>
                                    </div>
                                )}

                                {rows.map((t) => (
                                    <div
                                        key={t.id}
                                        onClick={() => openEditor(t)}
                                        role="button"
                                        tabIndex={0}
                                        className="p-5 hover:bg-neutral-50 group cursor-pointer transition-colors"
                                    >
                                        <div className="flex justify-between items-start gap-3">
                                            <div className="flex flex-col gap-1 w-full">
                                                <TaskTitleInlineEdit
                                                    id={t.id}
                                                    title={t.title}
                                                    onSaved={(next) => {
                                                        setTasks((prev) => prev.map((x) => (x.id === t.id ? { ...x, title: next } : x)));
                                                    }}
                                                />
                                                <div className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">
                                                    {t.workspace}
                                                </div>
                                            </div>
                                            {t.doc_id && (
                                                <span className="text-neutral-300 group-hover:text-blue-500 transition-colors">📄</span>
                                            )}
                                        </div>

                                        <div
                                            className="mt-4 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-all translate-y-2 group-hover:translate-y-0"
                                            onClick={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                            }}
                                        >
                                            <div className="grid grid-cols-2 gap-2">
                                                <select
                                                    value={t.schedule_bucket ?? "none"}
                                                    onClick={(e) => e.stopPropagation()}
                                                    onChange={(e) => moveBucket(t.id, e.target.value as ScheduleBucket)}
                                                    className="rounded-xl border border-neutral-200 bg-white px-3 py-2 text-xs font-bold outline-none shadow-sm"
                                                >
                                                    <option value="morning">Morning</option>
                                                    <option value="afternoon">Afternoon</option>
                                                    <option value="evening">Evening</option>
                                                </select>

                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        markDone(t.id);
                                                    }}
                                                    className="rounded-xl border border-green-100 bg-green-50 text-green-700 font-bold px-3 py-2 text-xs hover:bg-green-100 transition-all shadow-sm"
                                                >
                                                    Done
                                                </button>
                                            </div>

                                            <div className="flex gap-2">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        backToInbox(t.id);
                                                    }}
                                                    className="flex-1 rounded-xl border border-neutral-200 px-3 py-2 text-xs font-bold hover:bg-neutral-100 transition-all shadow-sm"
                                                >
                                                    To Inbox
                                                </button>
                                                <div className="w-10">
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
                                    </div>
                                ))}
                            </div>
                        </section>
                    );
                })}
            </div>

            <TaskDetailDialog
                key={editingTask?.id}
                task={editingTask}
                isOpen={!!editingTask}
                onClose={closeEditor}
                initialTab={initialTab}
                onUpdate={(updated) => {
                    if (updated) setEditingTask(updated);
                    refresh();
                }}
            />
        </div>
    );
}
