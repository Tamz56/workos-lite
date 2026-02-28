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

    async function sendSelectedToNanagardenBacklog() {
        setBulkLoading(true);
        setBulkError("");
        const ids = Array.from(selectedIds);
        const patch = {
            status: "planned",
            schedule_bucket: "none",
            workspace: "ops",
            notes_append: `\n${bulkTag.trim() || 'project:nanagarden-q1'}\n`
        };
        try {
            const res = await fetch("/api/tasks/batch", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ ids, patch }),
            });
            if (!res.ok) throw new Error(await res.text() || "Batch update failed");
            clearSelection();
            setBulkStatus("planned");
            setBulkBucket("none");
            setBulkWorkspace("ops");

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

            {/* Sticky Bulk Action Bar */}
            {selectedCount > 0 && (
                <div className="sticky top-[68px] z-10 bg-white border border-neutral-200 rounded-lg p-3 mt-6 shadow-sm">
                    <div className="flex items-center gap-3 flex-wrap">
                        <div className="text-sm font-medium text-neutral-800 pr-2 border-r border-neutral-200">
                            {selectedCount} selected
                        </div>

                        <select className="border border-neutral-200 bg-neutral-50 rounded px-2 py-1.5 text-sm outline-none" value={bulkStatus} onChange={(e) => setBulkStatus(e.target.value)}>
                            <option value="">Set Status…</option>
                            <option value="inbox">inbox</option>
                            <option value="planned">planned</option>
                            <option value="done">done</option>
                        </select>

                        <select className="border border-neutral-200 bg-neutral-50 rounded px-2 py-1.5 text-sm outline-none" value={bulkBucket} onChange={(e) => setBulkBucket(e.target.value)}>
                            <option value="">Set Bucket…</option>
                            <option value="none">none</option>
                            <option value="morning">morning</option>
                            <option value="afternoon">afternoon</option>
                            <option value="evening">evening</option>
                        </select>

                        <select className="border border-neutral-200 bg-neutral-50 rounded px-2 py-1.5 text-sm outline-none" value={bulkWorkspace} onChange={(e) => setBulkWorkspace(e.target.value)}>
                            <option value="">Move Workspace…</option>
                            {WORKSPACES_LIST.map((w) => (
                                <option key={w.id} value={w.id}>{w.label}</option>
                            ))}
                        </select>

                        <input
                            value={bulkTag}
                            onChange={(e) => setBulkTag(e.target.value)}
                            placeholder="Append tag (e.g. project:x)"
                            className="border border-neutral-200 rounded px-2 py-1 text-sm outline-none bg-neutral-50"
                        />

                        <button
                            onClick={applyBulk}
                            disabled={bulkLoading || (!bulkStatus && !bulkBucket && !bulkWorkspace && !bulkTag.trim())}
                            className={`px-4 py-1.5 rounded-md text-white font-medium text-sm transition ${bulkLoading || (!bulkStatus && !bulkBucket && !bulkWorkspace && !bulkTag.trim()) ? 'bg-neutral-300 cursor-not-allowed' : 'bg-neutral-900 hover:bg-neutral-800'}`}
                        >
                            {bulkLoading ? "Applying..." : "Apply"}
                        </button>

                        <button
                            onClick={sendSelectedToNanagardenBacklog}
                            disabled={bulkLoading}
                            title="planned + no bucket + ops workspace + tag"
                            className="px-4 py-1.5 rounded-md bg-emerald-600 text-white font-medium text-sm hover:bg-emerald-700 transition ml-2"
                        >
                            Send &rarr; NanaGarden Backlog
                        </button>

                        <button onClick={clearSelection} className="ml-auto px-3 py-1.5 text-sm text-neutral-500 hover:text-neutral-900 underline">
                            Clear
                        </button>
                    </div>

                    {bulkError && <div className="text-sm font-medium text-red-600 mt-3">{bulkError}</div>}
                </div>
            )}

            {/* List */}
            <div style={{ marginTop: 24, border: "1px solid #e5e7eb", borderRadius: 12 }}>
                <div style={{ padding: 14, borderBottom: "1px solid #e5e7eb", backgroundColor: "#f9fafb", borderTopLeftRadius: 12, borderTopRightRadius: 12, display: "flex", gap: "12px", alignItems: "center" }}>
                    <input
                        type="checkbox"
                        checked={allSelected}
                        onChange={toggleSelectAll}
                        style={{ cursor: "pointer", width: 16, height: 16 }}
                        className="cursor-pointer"
                    />
                    <div style={{ fontWeight: 600, fontSize: 14 }}>
                        Tasks ({loading ? "…" : count}) {selectedCount > 0 && <span className="text-neutral-500 font-normal ml-2">— {selectedCount} selected</span>}
                    </div>
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
                                <div className="flex gap-4 items-start w-full">
                                    <div className="pt-1">
                                        <input
                                            type="checkbox"
                                            checked={selectedIds.has(t.id)}
                                            onChange={(e) => toggleOne(t.id, e as unknown as React.MouseEvent)}
                                            onClick={(e) => e.stopPropagation()}
                                            style={{ cursor: "pointer", width: 16, height: 16 }}
                                            className="cursor-pointer"
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
                                    </div></div>

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
