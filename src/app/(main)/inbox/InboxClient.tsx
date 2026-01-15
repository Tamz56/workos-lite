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

    // Smart Link: Focus Quick Add if ?newTask=1
    useEffect(() => {
        if (sp.get("newTask") === "1") {
            // Slight delay to ensure render
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
            await load();
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
            router.replace("/today");
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
            await load();
        } catch (e: unknown) {
            setErr(toErrorMessage(e));
        }
    }

    const count = useMemo(() => tasks.length, [tasks]);

    return (
        <PageShell>
            <PageHeader
                title="Inbox"
                subtitle="เก็บงานเข้า แล้วค่อย Plan ลง Today/Planner"
                actions={
                    <button
                        onClick={load}
                        className="rounded-full border border-neutral-200 px-4 py-2 text-sm font-medium hover:bg-neutral-50 transition-colors bg-white text-neutral-700"
                    >
                        Refresh
                    </button>
                }
            />

            {/* Quick Add */}
            <div style={{ marginTop: 0, border: "1px solid #e5e7eb", borderRadius: 12, padding: 16 }}>
                <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                    <div style={{ flex: 1, minWidth: 260 }}>
                        <div style={{ fontSize: 12, color: "#555", marginBottom: 6 }}>Quick Add</div>
                        <input
                            ref={inputRef}
                            value={title}
                            autoFocus={true}
                            onChange={(e) => setTitle(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && add()}
                            placeholder='เช่น "Test Inbox"'
                            className="w-full rounded-lg border border-neutral-200 px-3 py-2.5 text-sm focus:border-black focus:outline-none transition-all placeholder:text-neutral-400"
                        />
                    </div>

                    <div style={{ minWidth: 180 }}>
                        <div style={{ fontSize: 12, color: "#555", marginBottom: 6 }}>Workspace</div>
                        <select
                            value={workspace}
                            onChange={(e) => setWorkspace(e.target.value as Workspace)}
                            style={{ width: "100%", border: "1px solid #e5e7eb", borderRadius: 8, padding: "10px 12px" }}
                        >
                            {WORKSPACES_LIST.map((w) => (
                                <option key={w.id} value={w.id}>
                                    {w.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    <button
                        onClick={add}
                        className="rounded-lg bg-neutral-900 text-white px-4 py-2.5 text-sm font-medium hover:bg-black transition-colors mt-6"
                    >
                        Add
                    </button>
                </div>

                {err && <div style={{ marginTop: 10, color: "#dc2626" }}>{err}</div>}
            </div>

            {/* List */}
            <div style={{ marginTop: 24, border: "1px solid #e5e7eb", borderRadius: 12 }}>
                <div style={{ padding: 14, borderBottom: "1px solid #e5e7eb", backgroundColor: "#f9fafb", borderTopLeftRadius: 12, borderTopRightRadius: 12 }}>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>Tasks ({loading ? "…" : count})</div>
                </div>

                <div style={{ padding: 14, display: "flex", flexDirection: "column", gap: 12 }}>
                    {tasks.length === 0 ? (
                        <div className="text-center py-10 text-neutral-400 italic">Inbox ว่างแล้วครับ</div>
                    ) : (
                        tasks.map((t) => (
                            <div
                                key={t.id}
                                onClick={() => openEditor(t)}
                                role="button"
                                tabIndex={0}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") openEditor(t);
                                }}
                                style={{ border: "1px solid #e5e7eb", borderRadius: 10, padding: 12, display: "flex", justifyContent: "space-between", gap: 12, cursor: "pointer" }}
                                className="group hover:bg-neutral-50 hover:border-neutral-300 transition-all bg-white"
                            >
                                <div>
                                    <div className="flex items-center gap-2">
                                        <TaskTitleInlineEdit
                                            id={t.id}
                                            title={t.title}
                                            onSaved={(next) => {
                                                setTasks((prev) => prev.map((x) => (x.id === t.id ? { ...x, title: next } : x)));
                                            }}
                                        />
                                        {t.doc_id && (
                                            <span
                                                style={{ cursor: "pointer" }}
                                                className="hover:text-blue-600"
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    openEditor(t, "doc");
                                                }}
                                                title="Open task details"
                                            >
                                                📄
                                            </span>
                                        )}
                                    </div>
                                    <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 4 }}>workspace: {t.workspace}</div>
                                </div>

                                <div
                                    style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                    }}
                                >
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            planToday(t, "morning");
                                        }}
                                        disabled={planningIds.has(t.id)}
                                        className="rounded border border-neutral-200 px-2 py-1 text-xs hover:bg-neutral-100 text-neutral-600"
                                        style={{ opacity: planningIds.has(t.id) ? 0.5 : 1 }}
                                    >
                                        Morning
                                    </button>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            planToday(t, "afternoon");
                                        }}
                                        disabled={planningIds.has(t.id)}
                                        className="rounded border border-neutral-200 px-2 py-1 text-xs hover:bg-neutral-100 text-neutral-600"
                                        style={{ opacity: planningIds.has(t.id) ? 0.5 : 1 }}
                                    >
                                        Afternoon
                                    </button>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            planToday(t, "evening");
                                        }}
                                        disabled={planningIds.has(t.id)}
                                        className="rounded border border-neutral-200 px-2 py-1 text-xs hover:bg-neutral-100 text-neutral-600"
                                        style={{ opacity: planningIds.has(t.id) ? 0.5 : 1 }}
                                    >
                                        Evening
                                    </button>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            planToday(t, defaultBucketForWorkspace(t.workspace) ?? "afternoon");
                                        }}
                                        disabled={planningIds.has(t.id)}
                                        className="rounded border border-neutral-200 px-2 py-1 text-xs hover:bg-neutral-100 text-neutral-600 bg-neutral-50"
                                        style={{ opacity: planningIds.has(t.id) ? 0.5 : 1 }}
                                        title="ใช้ค่าเริ่มต้นตาม Workspace"
                                    >
                                        {planningIds.has(t.id) ? "..." : "Plan"}
                                    </button>
                                    <div style={{ width: 1, height: 16, background: "#ddd", margin: "0 4px" }} />
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            markDone(t);
                                        }}
                                        disabled={planningIds.has(t.id)}
                                        className="rounded border border-neutral-200 px-2 py-1 text-xs hover:bg-green-50 text-green-700 hover:border-green-200"
                                        style={{ opacity: planningIds.has(t.id) ? 0.5 : 1 }}
                                    >
                                        Done
                                    </button>
                                    <TaskDeleteButton
                                        taskId={t.id}
                                        taskTitle={t.title}
                                        disabled={planningIds.has(t.id)}
                                        onDeleted={() => {
                                            setTasks((prev) => prev.filter((x) => x.id !== t.id));
                                        }}
                                    />
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div >

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
        </PageShell >
    );
}
