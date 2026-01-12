"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { Task, Workspace, ScheduleBucket } from "@/lib/types";
import { getTasks, createTask, patchTask } from "@/lib/api";
import { todayISO, defaultBucketForWorkspace } from "@/lib/planning";
import { useTaskEditor } from "@/hooks/useTaskEditor";
import TaskDetailDialog from "@/components/TaskDetailDialog";
import TaskTitleInlineEdit from "@/components/TaskTitleInlineEdit";
import TaskDeleteButton from "@/components/TaskDeleteButton";
import { toErrorMessage } from "@/lib/error";


const WORKSPACES: { value: Workspace; label: string }[] = [
    { value: "avacrm", label: "avaCRM" },
    { value: "ops", label: "Ops" },
    { value: "content", label: "Content" },
];

export default function InboxClient() {
    const [title, setTitle] = useState("");
    const [workspace, setWorkspace] = useState<Workspace>("avacrm");

    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(false);
    const [err, setErr] = useState<string | null>(null);

    const { editingTask, setEditingTask, initialTab, openEditor, closeEditor } = useTaskEditor();
    const [planningIds, setPlanningIds] = useState<Set<string>>(new Set());
    const router = useRouter();

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
            // Optimistic update (Instant Refresh)
            setTasks(prev => [newTask, ...prev]);

            // Reload to ensure consistency
            await load();
        } catch (e: unknown) {
            setErr(`createTask failed: ${toErrorMessage(e)}`);
        }
    }

    async function planToday(task: Task, bucket?: ScheduleBucket) {
        setErr(null);

        // กันกดซ้ำ
        if (planningIds.has(task.id)) return;

        const b = bucket ?? defaultBucketForWorkspace(task.workspace) ?? "afternoon";

        // optimistic remove พร้อม snapshot rollback
        setPlanningIds((prev) => new Set(prev).add(task.id));
        setTasks((prev) => prev.filter((x) => x.id !== task.id));

        try {
            await patchTask(task.id, {
                status: "planned",
                scheduled_date: todayISO(),
                schedule_bucket: b,
            });

            // ถ้าต้องการไม่ให้ back แล้วกลับมาหน้า inbox แบบงง ๆ ใช้ replace
            router.replace("/today");
            router.refresh();
        } catch (e: unknown) {
            // rollback เฉพาะ task เดิมกลับเข้ารายการ (แทนการ load ทั้งหน้า)
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
        <div style={{ padding: 24 }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16 }}>
                <div>
                    <h1 style={{ fontSize: 42, margin: 0 }}>Inbox</h1>
                    <div style={{ marginTop: 6, color: "#555" }}>เก็บงานเข้า แล้วค่อย Plan ลง Today/Planner</div>
                </div>

                <button
                    onClick={load}
                    style={{ border: "1px solid #111", borderRadius: 8, padding: "10px 16px", background: "#fff", cursor: "pointer" }}
                >
                    Refresh
                </button>
            </div>

            {/* Quick Add */}
            <div style={{ marginTop: 18, border: "1px solid #111", borderRadius: 12, padding: 16 }}>
                <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                    <div style={{ flex: 1, minWidth: 260 }}>
                        <div style={{ fontSize: 12, color: "#555", marginBottom: 6 }}>Quick Add</div>
                        <input
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && add()}
                            placeholder='เช่น "Test Inbox"'
                            style={{ width: "100%", border: "1px solid #111", borderRadius: 8, padding: "10px 12px" }}
                        />
                    </div>

                    <div style={{ minWidth: 180 }}>
                        <div style={{ fontSize: 12, color: "#555", marginBottom: 6 }}>Workspace</div>
                        <select
                            value={workspace}
                            onChange={(e) => setWorkspace(e.target.value as Workspace)}
                            style={{ width: "100%", border: "1px solid #111", borderRadius: 8, padding: "10px 12px" }}
                        >
                            {WORKSPACES.map((w) => (
                                <option key={w.value} value={w.value}>
                                    {w.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    <button
                        onClick={add}
                        style={{ border: "1px solid #111", borderRadius: 8, padding: "10px 16px", background: "#111827", color: "#fff", cursor: "pointer", marginTop: 18 }}
                    >
                        Add
                    </button>
                </div>

                {err && <div style={{ marginTop: 10, color: "#dc2626" }}>{err}</div>}
            </div>

            {/* List */}
            <div style={{ marginTop: 14, border: "1px solid #111", borderRadius: 12 }}>
                <div style={{ padding: 14, borderBottom: "1px solid #111" }}>
                    <div style={{ fontWeight: 700 }}>Tasks ({loading ? "…" : count})</div>
                </div>

                <div style={{ padding: 14, display: "flex", flexDirection: "column", gap: 12 }}>
                    {tasks.length === 0 ? (
                        <div style={{ color: "#777", padding: 12, border: "1px solid #ddd", borderRadius: 10 }}>Inbox ว่างแล้วครับ</div>
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
                                style={{ border: "1px solid #ddd", borderRadius: 10, padding: 12, display: "flex", justifyContent: "space-between", gap: 12, cursor: "pointer" }}
                                className="hover:bg-gray-50 transition-colors"
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
                                    <div style={{ fontSize: 12, color: "#555", marginTop: 4 }}>workspace: {t.workspace}</div>
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
                                        style={{ border: "1px solid #111", borderRadius: 8, padding: "6px 8px", cursor: "pointer", fontSize: 11, opacity: planningIds.has(t.id) ? 0.5 : 1 }}
                                    >
                                        Morning
                                    </button>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            planToday(t, "afternoon");
                                        }}
                                        disabled={planningIds.has(t.id)}
                                        style={{ border: "1px solid #111", borderRadius: 8, padding: "6px 8px", cursor: "pointer", fontSize: 11, opacity: planningIds.has(t.id) ? 0.5 : 1 }}
                                    >
                                        Afternoon
                                    </button>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            planToday(t, "evening");
                                        }}
                                        disabled={planningIds.has(t.id)}
                                        style={{ border: "1px solid #111", borderRadius: 8, padding: "6px 8px", cursor: "pointer", fontSize: 11, opacity: planningIds.has(t.id) ? 0.5 : 1 }}
                                    >
                                        Evening
                                    </button>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            planToday(t, defaultBucketForWorkspace(t.workspace) ?? "afternoon");
                                        }}
                                        disabled={planningIds.has(t.id)}
                                        style={{ border: "1px solid #111", borderRadius: 8, padding: "6px 8px", cursor: "pointer", fontSize: 11, background: "#f3f4f6", opacity: planningIds.has(t.id) ? 0.5 : 1 }}
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
                                        style={{ border: "1px solid #111", borderRadius: 8, padding: "6px 10px", cursor: "pointer", fontSize: 11, opacity: planningIds.has(t.id) ? 0.5 : 1 }}
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
        </div>
    );
}
