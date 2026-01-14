"use client";
import { useSearchParams } from "next/navigation";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import type { ScheduleBucket, Task, Workspace } from "@/lib/types";
import { getTasks, patchTask, type GetTasksParams } from "@/lib/api";
import { useTaskEditor } from "@/hooks/useTaskEditor";
import TaskDetailDialog from "@/components/TaskDetailDialog";
import TaskTitleInlineEdit from "@/components/TaskTitleInlineEdit";
import TaskDeleteButton from "@/components/TaskDeleteButton";
import { toErrorMessage } from "@/lib/error";

type PlannerFilter = "overdue" | "upcoming" | null;

const buckets: { key: ScheduleBucket; label: string }[] = [
    { key: "morning", label: "Morning" },
    { key: "afternoon", label: "Afternoon" },
    { key: "evening", label: "Evening" },
];

function todayYYYYMMDD() {
    return new Date().toISOString().slice(0, 10);
}

function normalizeDateParam(v: string | null): string | null {
    if (!v) return null;
    if (v === "today") {
        const d = new Date();
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, "0");
        const dd = String(d.getDate()).padStart(2, "0");
        return `${yyyy}-${mm}-${dd}`;
    }
    // expect YYYY-MM-DD
    return v;
}

function normalizeBucketParam(v: string | null) {
    if (v === "morning" || v === "afternoon" || v === "evening") return v;
    return null;
}

export default function PlannerClient() {
    const [date, setDate] = useState<string>(todayYYYYMMDD());
    const [workspace, setWorkspace] = useState<Workspace | "all">("all");
    const [q, setQ] = useState<string>("");

    const [planned, setPlanned] = useState<Task[]>([]);
    const [inbox, setInbox] = useState<Task[]>([]);
    const [loading, setLoading] = useState(false);
    const [err, setErr] = useState<string | null>(null);

    const { editingTask, setEditingTask, initialTab, openEditor, closeEditor } = useTaskEditor();

    const sp = useSearchParams();

    // Deep Link Params
    const filter = (sp.get("filter") as PlannerFilter) || null;
    const isSpecial = filter === "overdue" || filter === "upcoming";

    const deepDate = normalizeDateParam(sp.get("date"));
    const deepBucket = normalizeBucketParam(sp.get("bucket"));

    // Sync Date from Param
    useEffect(() => {
        if (!deepDate) return;
        setDate(deepDate);
    }, [deepDate]);

    const load = useCallback(async () => {
        setLoading(true);
        setErr(null);
        try {
            if (isSpecial) {
                // Special Mode: Just filter, ignore date/bucket
                const params: GetTasksParams = {
                    filter,
                    workspace,
                    q,
                    limit: 300,
                    cutoff_date: date, // use current date state as cutoff
                    // NEW: upcoming inclusive
                    inclusive: filter === "upcoming",
                };
                const rows = await getTasks(params);
                setPlanned(rows);
                setInbox([]);
                return;
            }

            // Normal Planner View
            const [plannedRows, inboxRows] = await Promise.all([
                getTasks({
                    status: "planned",
                    scheduled_date: date,
                    workspace,
                    q,
                    limit: 300,
                    schedule_bucket: deepBucket ? (deepBucket as ScheduleBucket) : undefined
                }),
                getTasks({
                    status: "inbox",
                    scheduled_date: "null",
                    workspace,
                    q,
                    limit: 200,
                }),
            ]);
            setPlanned(plannedRows);
            setInbox(inboxRows);

        } catch (e: unknown) {
            setErr(toErrorMessage(e));
        } finally {
            setLoading(false);
        }
    }, [date, workspace, q, filter, deepBucket, isSpecial]);

    useEffect(() => {
        load();
    }, [load]);

    const plannedByBucket = useMemo(() => {
        const map: Record<string, Task[]> = { morning: [], afternoon: [], evening: [], none: [] };
        for (const t of planned) {
            const k = (t.schedule_bucket ?? "none") as string;
            (map[k] ?? (map[k] = [])).push(t);
        }
        return map as Record<ScheduleBucket, Task[]>;
    }, [planned]);

    async function planFromInbox(task: Task, bucket: ScheduleBucket) {
        await patchTask(task.id, {
            status: "planned",
            scheduled_date: date,
            schedule_bucket: bucket,
        });
        await load();
    }

    async function movePlanned(task: Task, patch: Partial<Task>) {
        await patchTask(task.id, patch);
        await load();
    }

    async function markDone(task: Task) {
        await patchTask(task.id, { status: "done" });
        await load();
    }

    async function backToInbox(task: Task) {
        await patchTask(task.id, { status: "inbox", scheduled_date: null, schedule_bucket: "none" });
        await load();
    }


    return (
        <div style={{ padding: 24 }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16 }}>
                <div>
                    <h1 style={{ fontSize: 42, margin: 0 }}>Planner</h1>
                    <div style={{ marginTop: 6, color: "#555" }}>
                        เลือกวัน → ดึงจาก Inbox มาวาง → ย้าย bucket/ย้ายวัน → Done
                    </div>
                </div>

                <button
                    onClick={load}
                    style={{
                        border: "1px solid #111",
                        borderRadius: 8,
                        padding: "10px 16px",
                        background: "#fff",
                        cursor: "pointer",
                    }}
                >
                    Refresh
                </button>
            </div>

            {/* Controls */}
            <div
                style={{
                    marginTop: 18,
                    border: "1px solid #111",
                    borderRadius: 12,
                    padding: 16,
                    display: "flex",
                    gap: 12,
                    alignItems: "center",
                    flexWrap: "wrap",
                }}
            >
                <div>
                    <div style={{ fontSize: 12, color: "#555", marginBottom: 6 }}>
                        {isSpecial ? <span className="text-red-600 font-bold">Cutoff Date ({filter})</span> : "Date"}
                    </div>
                    <input
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        style={{
                            border: "1px solid #111",
                            borderRadius: 8,
                            padding: "8px 10px",
                        }}
                    />
                </div>

                <div>
                    <div style={{ fontSize: 12, color: "#555", marginBottom: 6 }}>Workspace</div>
                    <select
                        value={workspace}
                        onChange={(e) => setWorkspace(e.target.value as "all" | Workspace)}
                        style={{ border: "1px solid #111", borderRadius: 8, padding: "8px 10px", minWidth: 140 }}
                    >
                        <option value="all">All</option>
                        <option value="avacrm">avaCRM</option>
                        <option value="ops">ops</option>
                        <option value="content">content</option>
                    </select>
                </div>

                <div style={{ flex: 1, minWidth: 260 }}>
                    <div style={{ fontSize: 12, color: "#555", marginBottom: 6 }}>Search</div>
                    <input
                        value={q}
                        onChange={(e) => setQ(e.target.value)}
                        placeholder="ค้นหา title / workspace / id"
                        style={{ width: "100%", border: "1px solid #111", borderRadius: 8, padding: "8px 10px" }}
                    />
                </div>

                <button
                    onClick={load}
                    style={{
                        border: "1px solid #111",
                        borderRadius: 8,
                        padding: "10px 16px",
                        background: "#111827",
                        color: "#fff",
                        cursor: "pointer",
                    }}
                >
                    Apply
                </button>

                <div style={{ color: "#555", fontSize: 12 }}>
                    {loading ? "Loading..." : err ? `Error: ${err}` : `Planned: ${planned.length} | Inbox: ${inbox.length}`}
                </div>
            </div>

            {/* Unbucketed Alert */}
            {plannedByBucket.none && plannedByBucket.none.length > 0 && (
                <div style={{ marginTop: 16, padding: "12px 16px", borderRadius: 12, border: "1px solid #fcd34d", background: "#fffbeb", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ fontSize: 13, color: "#92400e" }}>
                        <b>⚠️ พบงานที่ยังไม่ได้ระบุช่วงเวลา ({plannedByBucket.none.length} รายการ):</b> กรุณาย้ายงานลง Bucket เพื่อให้แสดงในตารางแผนงาน
                    </div>
                    <div style={{ display: "flex", gap: 8, overflowX: "auto", maxWidth: "60%" }}>
                        {plannedByBucket.none.map(t => (
                            <div
                                key={t.id}
                                onClick={() => openEditor(t)}
                                role="button"
                                tabIndex={0}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") openEditor(t);
                                }}
                                className="cursor-pointer hover:bg-white"
                                style={{ padding: "4px 8px", background: "#fff", border: "1px solid #fcd34d", borderRadius: 6, fontSize: 11, whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 6 }}
                            >
                                <TaskTitleInlineEdit
                                    id={t.id}
                                    title={t.title}
                                    onSaved={(next) => {
                                        setPlanned((prev) => prev.map((x) => (x.id === t.id ? { ...x, title: next } : x)));
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
                                <div onClick={(e) => e.stopPropagation()}>
                                    <select
                                        value="none"
                                        onChange={(e) => movePlanned(t, { schedule_bucket: e.target.value as ScheduleBucket })}
                                        style={{ border: "none", fontSize: 10, background: "#f3f4f6", borderRadius: 4, cursor: "pointer" }}
                                    >
                                        <option value="none" disabled>ย้าย...</option>
                                        <option value="morning">Morning</option>
                                        <option value="afternoon">Afternoon</option>
                                        <option value="evening">Evening</option>
                                    </select>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Layout: Inbox pool + Day columns */}
            <div style={{ display: "grid", gridTemplateColumns: "420px 1fr", gap: 16, marginTop: 16 }}>
                {/* Inbox Pool */}
                <div style={{ border: "1px solid #111", borderRadius: 12, padding: 16 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                        <div style={{ fontWeight: 700 }}>Inbox Pool</div>
                        <div style={{ color: "#555", fontSize: 12 }}>({inbox.length})</div>
                    </div>

                    <div style={{ marginTop: 10, color: "#555", fontSize: 12 }}>
                        Tip: กด Plan (Morning/Afternoon/Evening) เพื่อวางลงวันที่เลือก
                    </div>

                    <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 10 }}>
                        {inbox.length === 0 ? (
                            <div style={{ color: "#777", padding: 12, border: "1px solid #ddd", borderRadius: 10 }}>
                                ไม่มีงานใน Inbox (หรือโดน filter)
                            </div>
                        ) : (
                            inbox.map((t) => (
                                <div
                                    key={t.id}
                                    onClick={() => openEditor(t)}
                                    role="button"
                                    tabIndex={0}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter") openEditor(t);
                                    }}
                                    style={{ border: "1px solid #ddd", borderRadius: 10, padding: 12, cursor: "pointer" }}
                                    className="hover:bg-gray-50 transition-colors"
                                >
                                    <div className="flex items-center gap-2">
                                        <TaskTitleInlineEdit
                                            id={t.id}
                                            title={t.title}
                                            onSaved={(next) => {
                                                setInbox((prev) => prev.map((x) => (x.id === t.id ? { ...x, title: next } : x)));
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
                                    <div style={{ fontSize: 12, color: "#555", marginTop: 4 }}>
                                        workspace: {t.workspace} • id: {t.id.slice(0, 8)}…
                                    </div>

                                    <div
                                        style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}
                                        onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                        }}
                                    >
                                        <button
                                            onClick={() => planFromInbox(t, "morning")}
                                            style={{ border: "1px solid #111", borderRadius: 8, padding: "6px 10px", cursor: "pointer", backgroundColor: "white" }}
                                        >
                                            Plan Morning
                                        </button>
                                        <button
                                            onClick={() => planFromInbox(t, "afternoon")}
                                            style={{ border: "1px solid #111", borderRadius: 8, padding: "6px 10px", cursor: "pointer", backgroundColor: "white" }}
                                        >
                                            Plan Afternoon
                                        </button>
                                        <button
                                            onClick={() => planFromInbox(t, "evening")}
                                            style={{ border: "1px solid #111", borderRadius: 8, padding: "6px 10px", cursor: "pointer", backgroundColor: "white" }}
                                        >
                                            Plan Evening
                                        </button>

                                        <TaskDeleteButton
                                            taskId={t.id}
                                            taskTitle={t.title}
                                            onDeleted={() => {
                                                setInbox((prev) => prev.filter((x) => x.id !== t.id));
                                            }}
                                        />
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Day plan columns */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
                    {buckets.map((b) => (
                        <div key={b.key} style={{ border: "1px solid #111", borderRadius: 12 }}>
                            <div style={{ padding: 14, borderBottom: "1px solid #111", display: "flex", justifyContent: "space-between" }}>
                                <div style={{ fontWeight: 700 }}>{b.label}</div>
                                <div style={{ color: "#555", fontSize: 12 }}>{plannedByBucket[b.key].length} tasks</div>
                            </div>

                            <div style={{ padding: 14, display: "flex", flexDirection: "column", gap: 12 }}>
                                {plannedByBucket[b.key].length === 0 ? (
                                    <div style={{ color: "#777", border: "1px solid #ddd", borderRadius: 10, padding: 12 }}>
                                        ยังไม่มีงานในช่วงนี้
                                    </div>
                                ) : (
                                    plannedByBucket[b.key].map((t) => (
                                        <div
                                            key={t.id}
                                            onClick={() => openEditor(t)}
                                            role="button"
                                            tabIndex={0}
                                            onKeyDown={(e) => {
                                                if (e.key === "Enter") openEditor(t);
                                            }}
                                            style={{ border: "1px solid #ddd", borderRadius: 10, padding: 12, cursor: "pointer" }}
                                            className="hover:bg-gray-50 transition-colors"
                                        >
                                            <div className="flex items-center gap-2">
                                                <TaskTitleInlineEdit
                                                    id={t.id}
                                                    title={t.title}
                                                    onSaved={(next) => {
                                                        setPlanned((prev) => prev.map((x) => (x.id === t.id ? { ...x, title: next } : x)));
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
                                            <div style={{ fontSize: 12, color: "#555", marginTop: 4 }}>
                                                workspace: {t.workspace}
                                            </div>

                                            <div
                                                style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap", alignItems: "center" }}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                }}
                                            >
                                                <select
                                                    value={t.schedule_bucket ?? "none"}
                                                    onClick={(e) => e.stopPropagation()}
                                                    onChange={(e) =>
                                                        movePlanned(t, { schedule_bucket: e.target.value as ScheduleBucket })
                                                    }
                                                    style={{ border: "1px solid #111", borderRadius: 8, padding: "6px 10px", backgroundColor: "white" }}
                                                >
                                                    <option value="morning">morning</option>
                                                    <option value="afternoon">afternoon</option>
                                                    <option value="evening">evening</option>
                                                    <option value="none">none</option>
                                                </select>

                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        markDone(t);
                                                    }}
                                                    style={{ border: "1px solid #111", borderRadius: 8, padding: "6px 10px", cursor: "pointer", backgroundColor: "white" }}
                                                >
                                                    Done
                                                </button>

                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        backToInbox(t);
                                                    }}
                                                    style={{ border: "1px solid #111", borderRadius: 8, padding: "6px 10px", cursor: "pointer", backgroundColor: "white" }}
                                                >
                                                    Inbox
                                                </button>

                                                <TaskDeleteButton
                                                    taskId={t.id}
                                                    taskTitle={t.title}
                                                    onDeleted={() => {
                                                        setPlanned((prev) => prev.filter((x) => x.id !== t.id));
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div style={{ marginTop: 14, color: "#555", fontSize: 12 }}>
                หมายเหตุ: Planner นี้ใช้แนวคิด “Inbox Pool → วางลงวัน + bucket” เพื่อให้วางงานข้ามวันได้จริง โดยไม่ต้องไปแก้ Inbox ให้ซับซ้อนก่อน
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
