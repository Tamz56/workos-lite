"use client";
import { useSearchParams } from "next/navigation";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { type ScheduleBucket, type Task } from "@/lib/types";
import { type Workspace, WORKSPACES } from "@/lib/workspaces";
import { getTasks, patchTask, type GetTasksParams } from "@/lib/api";
import { useTaskEditor } from "@/hooks/useTaskEditor";
import TaskDetailDialog from "@/components/TaskDetailDialog";
import TaskTitleInlineEdit from "@/components/TaskTitleInlineEdit";
import TaskDeleteButton from "@/components/TaskDeleteButton";
import { toErrorMessage } from "@/lib/error";
import { PageShell } from "@/components/layout/PageShell";
import { PageHeader } from "@/components/layout/PageHeader";

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
        <PageShell>
            <PageHeader
                title="Planner"
                subtitle="เลือกวัน → ดึงจาก Inbox มาวาง → ย้าย bucket/ย้ายวัน → Done"
                actions={
                    <button
                        onClick={load}
                        className="rounded-full border border-neutral-200 px-4 py-2 text-sm font-medium hover:bg-neutral-50 transition-colors bg-white text-neutral-700"
                    >
                        Refresh
                    </button>
                }
            />

            {/* Controls */}
            <div
                style={{
                    marginTop: 0,
                    border: "1px solid #e5e7eb",
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
                        className="border border-neutral-200 rounded-lg px-2 py-2 text-sm focus:outline-none focus:border-black transition-colors"
                    />
                </div>

                <div>
                    <div style={{ fontSize: 12, color: "#555", marginBottom: 6 }}>Workspace</div>
                    <select
                        value={workspace}
                        onChange={(e) => setWorkspace(e.target.value as "all" | Workspace)}
                        className="border border-neutral-200 rounded-lg px-2 py-2 text-sm focus:outline-none focus:border-black transition-colors min-w-[140px]"
                    >
                        <option value="all">All</option>
                        {WORKSPACES.map(w => (
                            <option key={w} value={w}>{w}</option>
                        ))}
                    </select>
                </div>

                <div style={{ flex: 1, minWidth: 260 }}>
                    <div style={{ fontSize: 12, color: "#555", marginBottom: 6 }}>Search</div>
                    <input
                        value={q}
                        onChange={(e) => setQ(e.target.value)}
                        placeholder="ค้นหา title / workspace / id"
                        className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-black transition-colors"
                    />
                </div>

                <button
                    onClick={load}
                    className="rounded-lg bg-neutral-900 text-white px-4 py-2 text-sm font-medium hover:bg-black transition-colors self-end mb-0.5"
                >
                    Apply
                </button>

                <div className="text-xs text-neutral-500 ml-auto self-end mb-2">
                    {loading ? "Loading..." : err ? `Error: ${err}` : `Planned: ${planned.length} | Inbox: ${inbox.length}`}
                </div>
            </div>

            {/* Unbucketed Alert */}
            {plannedByBucket.none && plannedByBucket.none.length > 0 && (
                <div className="mt-4 p-4 rounded-xl border border-yellow-200 bg-yellow-50 flex justify-between items-center text-yellow-800">
                    <div className="text-sm">
                        <b>⚠️ พบงานที่ยังไม่ได้ระบุช่วงเวลา ({plannedByBucket.none.length} รายการ):</b> กรุณาย้ายงานลง Bucket เพื่อให้แสดงในตารางแผนงาน
                    </div>
                    <div className="flex gap-2 overflow-x-auto max-w-[60%]">
                        {plannedByBucket.none.map(t => (
                            <div
                                key={t.id}
                                onClick={() => openEditor(t)}
                                role="button"
                                tabIndex={0}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") openEditor(t);
                                }}
                                className="cursor-pointer hover:bg-white bg-white/50 border border-yellow-300 rounded px-2 py-1 text-xs whitespace-nowrap flex items-center gap-2"
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
                                        className="border-none text-[10px] bg-neutral-100 rounded cursor-pointer"
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
            <div className="grid grid-cols-[420px_1fr] gap-4 mt-4">
                {/* Inbox Pool */}
                <div className="border border-neutral-200 rounded-xl p-4 bg-white">
                    <div className="flex justify-between items-baseline mb-2">
                        <div className="font-bold text-neutral-800">Inbox Pool</div>
                        <div className="text-xs text-neutral-500">({inbox.length})</div>
                    </div>

                    <div className="text-xs text-neutral-500 mb-3">
                        Tip: กด Plan (Morning/Afternoon/Evening) เพื่อวางลงวันที่เลือก
                    </div>

                    <div className="flex flex-col gap-2.5">
                        {inbox.length === 0 ? (
                            <div className="text-neutral-400 p-3 border border-neutral-100 rounded-lg text-sm italic text-center">
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
                                    className="border border-neutral-200 rounded-lg p-3 cursor-pointer hover:bg-neutral-50 transition-colors bg-white group"
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
                                    <div className="text-xs text-neutral-400 mt-1">
                                        workspace: {t.workspace} • id: {t.id.slice(0, 8)}…
                                    </div>

                                    <div
                                        className="flex gap-2 mt-2 flex-wrap"
                                        onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                        }}
                                    >
                                        <button
                                            onClick={() => planFromInbox(t, "morning")}
                                            className="border border-neutral-200 rounded px-2 py-1 text-xs hover:bg-neutral-100 bg-white text-neutral-600"
                                        >
                                            Plan Morning
                                        </button>
                                        <button
                                            onClick={() => planFromInbox(t, "afternoon")}
                                            className="border border-neutral-200 rounded px-2 py-1 text-xs hover:bg-neutral-100 bg-white text-neutral-600"
                                        >
                                            Plan Afternoon
                                        </button>
                                        <button
                                            onClick={() => planFromInbox(t, "evening")}
                                            className="border border-neutral-200 rounded px-2 py-1 text-xs hover:bg-neutral-100 bg-white text-neutral-600"
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
                <div className="grid grid-cols-3 gap-4">
                    {buckets.map((b) => (
                        <div key={b.key} className="border border-neutral-200 rounded-xl bg-white flex flex-col h-full">
                            <div className="p-3 border-b border-neutral-100 flex justify-between items-center bg-neutral-50 rounded-t-xl">
                                <div className="font-bold text-sm text-neutral-800">{b.label}</div>
                                <div className="text-xs text-neutral-500">{plannedByBucket[b.key].length} tasks</div>
                            </div>

                            <div className="p-3 flex flex-col gap-2.5 flex-1 min-h-0 overflow-y-auto">
                                {plannedByBucket[b.key].length === 0 ? (
                                    <div className="text-neutral-400 text-xs italic text-center py-4 border border-dashed border-neutral-100 rounded-lg">
                                        Empty
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
                                            className="border border-neutral-200 rounded-lg p-3 cursor-pointer hover:bg-neutral-50 transition-colors bg-white group shadow-sm"
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
                                            <div className="text-[10px] text-neutral-400 mt-1">
                                                {t.workspace}
                                            </div>

                                            <div
                                                className="flex gap-2 mt-2 flex-wrap items-center opacity-0 group-hover:opacity-100 transition-opacity"
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
                                                    className="border border-neutral-200 rounded px-1 py-0.5 text-[10px] bg-white text-neutral-600 focus:outline-none"
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
                                                    className="border border-neutral-200 rounded px-2 py-0.5 text-[10px] bg-white hover:bg-green-50 text-green-700 hover:border-green-200"
                                                >
                                                    Done
                                                </button>

                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        backToInbox(t);
                                                    }}
                                                    className="border border-neutral-200 rounded px-2 py-0.5 text-[10px] bg-white hover:bg-neutral-100 text-neutral-600"
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

            <div className="mt-6 text-neutral-400 text-xs text-center pb-8 border-t border-neutral-100 pt-4">
                Planner v2.0 • Drag and drop support coming soon maybe?
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
