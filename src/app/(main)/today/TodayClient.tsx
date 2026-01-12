"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ScheduleBucket, Task } from "@/lib/types";
import { listTasks, patchTask } from "@/lib/api";
import { useTaskEditor } from "@/hooks/useTaskEditor";
import TaskDetailDialog from "@/components/TaskDetailDialog";
import TaskTitleInlineEdit from "@/components/TaskTitleInlineEdit";
import TaskDeleteButton from "@/components/TaskDeleteButton";
import { toErrorMessage } from "@/lib/error";

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
    const [loading, setLoading] = useState(true);
    const [err, setErr] = useState<string | null>(null);
    const { editingTask, setEditingTask, initialTab, openEditor, closeEditor } = useTaskEditor();

    const date = todayISO();

    const refresh = useCallback(async () => {
        setLoading(true);
        setErr(null);
        try {
            const rows = await listTasks({ status: "planned", scheduled_date: date });
            setTasks(rows);
        } catch (e: unknown) {
            setErr(toErrorMessage(e));
        } finally {
            setLoading(false);
        }
    }, [date]);

    useEffect(() => {
        refresh();
    }, [refresh]);

    const grouped = useMemo(() => {
        const m = new Map<ScheduleBucket, Task[]>();
        for (const b of buckets) m.set(b.key, []);
        // "none" ให้ไป morning แบบอัตโนมัติ เพื่อไม่ให้หาย
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
        // optimistic
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
        <div className="space-y-5">
            <div className="flex items-end justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-semibold">Today</h1>
                    <p className="text-sm text-gray-500">
                        planned วันที่ <span className="font-medium text-gray-800">{date}</span>
                    </p>
                </div>
                <button
                    onClick={refresh}
                    className="rounded-md border bg-white px-3 py-2 text-sm hover:bg-gray-50"
                >
                    Refresh
                </button>
            </div>

            {err && <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{err}</div>}

            {/* Unbucketed Tasks Section */}
            {grouped.get("none") && grouped.get("none")!.length > 0 && (
                <section className="rounded-xl border border-amber-200 bg-amber-50">
                    <div className="border-b border-amber-200 px-4 py-2 flex justify-between items-center">
                        <div className="text-sm font-bold text-amber-800">⚠️ Unbucketed (ยังไม่ได้ระบุช่วงเวลา)</div>
                        <div className="text-xs text-amber-600">{grouped.get("none")!.length} tasks</div>
                    </div>
                    <div className="divide-y divide-amber-100">
                        {grouped.get("none")!.map((t) => (
                            <div
                                key={t.id}
                                onClick={() => openEditor(t)}
                                role="button"
                                tabIndex={0}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") openEditor(t);
                                }}
                                className="p-3 flex justify-between items-center bg-white/50 cursor-pointer hover:bg-white"
                            >
                                <div className="flex items-center gap-2">
                                    <TaskTitleInlineEdit
                                        id={t.id}
                                        title={t.title}
                                        onSaved={(next) => {
                                            setTasks((prev) => prev.map((x) => (x.id === t.id ? { ...x, title: next } : x)));
                                        }}
                                    />
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
                                        {t.doc_id && "📄"}
                                    </span>
                                </div>
                                <div
                                    className="flex gap-2"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                    }}
                                >
                                    <select
                                        value="none"
                                        onClick={(e) => e.stopPropagation()}
                                        onChange={(e) => moveBucket(t.id, e.target.value as ScheduleBucket)}
                                        className="rounded-md border px-2 py-1 text-xs bg-white"
                                    >
                                        <option value="none" disabled>ย้ายไปที่...</option>
                                        <option value="morning">morning</option>
                                        <option value="afternoon">afternoon</option>
                                        <option value="evening">evening</option>
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

            <div className="grid gap-4 md:grid-cols-3">
                {buckets.map((b) => {
                    const rows = grouped.get(b.key) ?? [];
                    return (
                        <section key={b.key} className="rounded-xl border bg-white">
                            <div className="border-b px-4 py-3">
                                <div className="text-sm font-semibold">{b.label}</div>
                                <div className="text-xs text-gray-500">{loading ? "Loading..." : `${rows.length} tasks`}</div>
                            </div>

                            <div className="divide-y relative min-h-[50px]">
                                {!loading && rows.length === 0 && (
                                    <div className="p-4 text-sm text-gray-500">ยังไม่มีงานในช่วงนี้</div>
                                )}

                                {rows.map((t) => (
                                    <div
                                        key={t.id}
                                        onClick={() => openEditor(t)}
                                        role="button"
                                        tabIndex={0}
                                        onKeyDown={(e) => {
                                            if (e.key === "Enter") openEditor(t);
                                        }}
                                        className="p-4 hover:bg-gray-50 group cursor-pointer"
                                    >
                                        <div className="flex justify-between items-start gap-2">
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
                                        </div>

                                        <div className="mt-1 text-xs text-gray-500">
                                            workspace: <span className="font-medium text-gray-700">{t.workspace}</span>
                                        </div>

                                        <div
                                            className="mt-3 flex flex-wrap gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                                            onClick={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                            }}
                                        >
                                            <select
                                                value={t.schedule_bucket ?? "none"}
                                                onClick={(e) => e.stopPropagation()}
                                                onChange={(e) => moveBucket(t.id, e.target.value as ScheduleBucket)}
                                                className="rounded-md border px-2 py-1 text-sm bg-white"
                                            >
                                                <option value="morning">morning</option>
                                                <option value="afternoon">afternoon</option>
                                                <option value="evening">evening</option>
                                            </select>

                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    markDone(t.id);
                                                }}
                                                className="rounded-md border px-3 py-1.5 text-sm hover:bg-gray-50 bg-white"
                                            >
                                                Done
                                            </button>

                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    backToInbox(t.id);
                                                }}
                                                className="rounded-md border px-3 py-1.5 text-sm hover:bg-gray-50 bg-white"
                                                title="Back to Inbox"
                                            >
                                                Inbox
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
                                ))}
                            </div>
                        </section>
                    );
                })}
            </div>

            <div className="rounded-xl border bg-white p-4 text-sm text-gray-600">
                หมายเหตุ: งานที่ `schedule_bucket = none` ถ้ามี จะไม่ถูกแสดงในคอลัมน์ (ตอนนี้เราแนะนำให้ Plan เป็น morning/afternoon/evening)
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
