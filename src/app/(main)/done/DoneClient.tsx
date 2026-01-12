"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import type { Task, Workspace } from "@/lib/types";
import { getTasks, patchTask } from "@/lib/api";
import { todayISO, defaultBucketForWorkspace } from "@/lib/planning";
import { useTaskEditor } from "@/hooks/useTaskEditor";
import TaskDetailDialog from "@/components/TaskDetailDialog";
import TaskTitleInlineEdit from "@/components/TaskTitleInlineEdit";
import TaskDeleteButton from "@/components/TaskDeleteButton";
import { toErrorMessage } from "@/lib/error";


const WORKSPACES: { label: string; value: "all" | Workspace }[] = [
    { label: "All", value: "all" },
    { label: "avaCRM", value: "avacrm" },
    { label: "Ops", value: "ops" },
    { label: "Content", value: "content" },
];

export default function DoneClient() {
    const [workspace, setWorkspace] = useState<"all" | Workspace>("all");
    const [q, setQ] = useState("");
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(false);
    const [err, setErr] = useState<string | null>(null);

    const { editingTask, setEditingTask, initialTab, openEditor, closeEditor } = useTaskEditor();

    const load = useCallback(async () => {
        setLoading(true);
        setErr(null);
        try {
            const rows = await getTasks({ status: "done", workspace, q: q || undefined, limit: 100 });
            setTasks(rows);
        } catch (e: unknown) {
            setErr(toErrorMessage(e));
        } finally {
            setLoading(false);
        }
    }, [workspace, q]);

    useEffect(() => {
        load();
    }, [load]);

    // Use stats based on current tasks state (which is already filtered by getTasks if we used q, but we'll do client side for stats if needed)
    // Actually current logic above does fetch with q. So stats are for the *fetched* tasks. 
    // The previous implementation did client side filtering. 
    // Let's stick to client side filtering if we fetch all done tasks? 
    // Wait, getTasks logic in previous Done page was: fetch(status=done, workspace). Then filter by q locally.
    // The previous implementation used getTasks? No, it used raw fetch.
    // My new getTasks in lib/api supports q. I'll use that for efficiency?
    // But stats need to show breakdown.
    // Let's stick to fetching whatever the API gives.

    // Calculate stats from loaded tasks
    const stats = useMemo(() => {
        const total = tasks.length;
        const byWs = tasks.reduce(
            (acc, t) => {
                acc[t.workspace] = (acc[t.workspace] ?? 0) + 1;
                return acc;
            },
            {} as Record<Workspace, number>
        );
        return { total, byWs };
    }, [tasks]);

    const onReopen = async (t: Task) => {
        setErr(null);
        try {
            const updated = await patchTask(t.id, {
                status: "inbox",
                scheduled_date: null,
                schedule_bucket: "none",
                start_time: null,
                end_time: null,
            });
            setTasks((prev) => prev.filter((x) => x.id !== updated.id));
            setTasks((prev) => prev.filter((x) => x.id !== updated.id));
        } catch (e: unknown) {
            setErr(toErrorMessage(e));
        }
    };

    const onPlanToday = async (t: Task) => {
        setErr(null);
        try {
            const bucket = defaultBucketForWorkspace(t.workspace) ?? "afternoon";
            const updated = await patchTask(t.id, {
                status: "planned",
                scheduled_date: todayISO(),
                schedule_bucket: bucket,
            });
            // ออกจาก Done list เพราะ status ไม่ใช่ done แล้ว
            setTasks((prev) => prev.filter((x) => x.id !== updated.id));
            setTasks((prev) => prev.filter((x) => x.id !== updated.id));
        } catch (e: unknown) {
            setErr(toErrorMessage(e));
            await load(); // sync กลับถกถ้าพัง
        }
    };


    return (
        <div style={{ maxWidth: 980, margin: "0 auto", padding: "24px 20px" }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16 }}>
                <div>
                    <h1 style={{ fontSize: 40, margin: 0, lineHeight: 1.1 }}>Done</h1>
                    <div style={{ color: "#555", marginTop: 6 }}>
                        งานที่เสร็จแล้ว (status = done) — ใช้ Reopen/Plan เพื่อดึงกลับไปทำต่อ
                    </div>
                </div>

                <button
                    onClick={load}
                    disabled={loading}
                    style={{
                        border: "1px solid #111",
                        background: "#fff",
                        padding: "10px 14px",
                        borderRadius: 8,
                        cursor: loading ? "not-allowed" : "pointer",
                    }}
                >
                    {loading ? "Loading..." : "Refresh"}
                </button>
            </div>

            <div
                style={{
                    marginTop: 18,
                    border: "1px solid #111",
                    borderRadius: 12,
                    padding: 14,
                    display: "flex",
                    gap: 12,
                    alignItems: "center",
                    flexWrap: "wrap",
                }}
            >
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <div style={{ fontSize: 12, color: "#444" }}>Workspace</div>
                    <select
                        value={workspace}
                        onChange={(e) => setWorkspace(e.target.value as "all" | Workspace)}
                        style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid #111", minWidth: 160 }}
                    >
                        {WORKSPACES.map((w) => (
                            <option key={w.value} value={w.value}>
                                {w.label}
                            </option>
                        ))}
                    </select>
                </div>

                <div style={{ flex: 1, minWidth: 240, display: "flex", flexDirection: "column", gap: 6 }}>
                    <div style={{ fontSize: 12, color: "#444" }}>Search</div>
                    <input
                        value={q}
                        onChange={(e) => setQ(e.target.value)}
                        placeholder='ค้นหา title / workspace / id'
                        style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid #111" }}
                    />
                </div>

                <div style={{ marginLeft: "auto", display: "flex", gap: 10, flexWrap: "wrap" }}>
                    <div style={{ fontSize: 12, color: "#333", paddingTop: 22 }}>
                        Total: <b>{stats.total}</b>{" "}
                        <span style={{ color: "#666" }}>
                            (avaCRM {stats.byWs.avacrm ?? 0} / ops {stats.byWs.ops ?? 0} / content {stats.byWs.content ?? 0})
                        </span>
                    </div>
                </div>
            </div>

            {err && (
                <div
                    style={{
                        marginTop: 12,
                        border: "1px solid #b00020",
                        background: "#fff5f5",
                        color: "#b00020",
                        padding: 12,
                        borderRadius: 10,
                    }}
                >
                    {err}
                </div>
            )}

            <div style={{ marginTop: 16, border: "1px solid #111", borderRadius: 12, overflow: "hidden" }}>
                <div style={{ padding: 12, borderBottom: "1px solid #111", background: "#fff" }}>
                    <b>Tasks ({tasks.length})</b>
                </div>

                {tasks.length === 0 ? (
                    <div style={{ padding: 14, color: "#666" }}>ยังไม่มีงาน Done (หรือถูก filter ออก)</div>
                ) : (
                    <div style={{ display: "flex", flexDirection: "column" }}>
                        {tasks.map((t) => (
                            <div
                                key={t.id}
                                onClick={() => openEditor(t)}
                                role="button"
                                tabIndex={0}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") openEditor(t);
                                }}
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "space-between",
                                    gap: 12,
                                    padding: 14,
                                    borderTop: "1px solid #eee",
                                    cursor: "pointer",
                                }}
                                className="hover:bg-gray-50 transition-colors"
                            >
                                <div style={{ minWidth: 0 }}>
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
                                    <div style={{ fontSize: 12, color: "#666", marginTop: 4 }}>
                                        workspace: <b>{t.workspace}</b> • done_at: <span>{t.done_at ?? "-"}</span>
                                    </div>
                                </div>

                                <div
                                    style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                    }}
                                >
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onPlanToday(t);
                                        }}
                                        style={{
                                            border: "1px solid #111",
                                            background: "#fff",
                                            padding: "8px 10px",
                                            borderRadius: 8,
                                            cursor: "pointer",
                                        }}
                                        title={`ย้ายกลับไป planned วันนี้ช่วง ${defaultBucketForWorkspace(t.workspace)}`}
                                    >
                                        Plan Today
                                    </button>

                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onReopen(t);
                                        }}
                                        style={{
                                            border: "1px solid #111",
                                            background: "#fff",
                                            padding: "8px 10px",
                                            borderRadius: 8,
                                            cursor: "pointer",
                                        }}
                                        title="ดึงกลับไป Inbox"
                                    >
                                        Reopen
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
                )}
            </div>

            <div style={{ marginTop: 14, fontSize: 12, color: "#666" }}>
                ทิป: ถ้าจะให้ Done เป็น “Archive จริง ๆ” ต่อไปเราจะเพิ่ม filter by date range และทำ “Export/Restore batch” ได้ใน Sprint ถัดไป
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
