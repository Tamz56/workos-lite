"use client";

import Link from "next/link";
import { WORKSPACES, workspaceLabel, type Workspace } from "@/lib/workspaces";
import { useEffect, useMemo, useState, useCallback } from "react";
import { STAGE_TAGS, ContentStage } from "@/lib/content/templates";
import { getPipelineStage, listDocsByTaskId } from "@/lib/content/utils";
import { createContentTask, createMissingContentDocs } from "@/lib/content/createContentTask";

// --- Types ---

type ScheduleBucket = "morning" | "afternoon" | "evening";

type TaskRow = {
    id: string;
    title: string;
    workspace?: string | null;
    scheduled_date?: string | null;
    schedule_bucket?: ScheduleBucket | null;
    status?: string | null;
    tags?: string[]; // Added tags for pipeline
};

type CalendarEvent = {
    id: string;
    workspace: string;
    title: string;
    all_day: boolean;
    start_time: string;
    end_time: string | null;
    kind: string | null;
    description: string | null;
};

type DocRow = {
    id: string;
    title: string;
    created_at?: string;
    updated_at?: string;
};

// --- Helpers ---

function pad2(n: number) {
    return String(n).padStart(2, "0");
}

function toYmdLocal(d: Date) {
    return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function toUtcIso(d: Date) {
    return d.toISOString();
}

function pickArray<T>(v: unknown): T[] {
    if (Array.isArray(v)) return v as T[];
    if (typeof v === "object" && v !== null) {
        const candidates = ["events", "docs", "rows", "data", "items", "result", "tasks"];
        for (const k of candidates) {
            // @ts-ignore
            const maybe = v[k];
            if (Array.isArray(maybe)) return maybe as T[];
        }
    }
    return [];
}

async function fetchTasks(params: Record<string, string>) {
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) sp.set(k, v);
    const res = await fetch(`/api/tasks?${sp.toString()}`, { cache: "no-store" });
    if (!res.ok) throw new Error(`tasks: HTTP ${res.status} `);
    const data: unknown = await res.json();
    return pickArray<TaskRow>(data);
}

function mapEventRow(raw: any): CalendarEvent {
    return {
        id: String(raw.id || ""),
        workspace: String(raw.workspace || ""),
        title: String(raw.title || ""),
        all_day: raw.all_day === 1 || raw.all_day === true,
        start_time: String(raw.start_time || ""),
        end_time: raw.end_time ? String(raw.end_time) : null,
        kind: raw.kind ? String(raw.kind) : null,
        description: raw.description ? String(raw.description) : null,
    };
}

async function fetchEvents(params: Record<string, string>) {
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) sp.set(k, v);
    const res = await fetch(`/api/events?${sp.toString()}`, { cache: "no-store" });
    if (!res.ok) throw new Error(`events: HTTP ${res.status} `);
    const raw: unknown = await res.json();
    return pickArray<any>(raw).map(mapEventRow);
}

async function fetchDocs(params: Record<string, string>) {
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) sp.set(k, v);
    const res = await fetch(`/api/docs?${sp.toString()}`, { cache: "no-store" });
    if (!res.ok) throw new Error(`docs: HTTP ${res.status}`);
    const raw: unknown = await res.json();
    return pickArray<DocRow>(raw);
}

async function postJson<T>(url: string, payload: unknown): Promise<T> {
    const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(`POST ${url}: HTTP ${res.status}`);
    return (await res.json()) as T;
}

function fmtTimeLocal(iso: string) {
    try {
        return new Date(iso).toLocaleString("th-TH", {
            hour12: false,
            month: "short",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
        });
    } catch {
        return iso;
    }
}

// --- Components ---

function Card(props: { title: string; right?: React.ReactNode; children: React.ReactNode; className?: string }) {
    return (
        <div className={`rounded-2xl border bg-white/50 p-4 shadow-sm ${props.className || ""}`}>
            <div className="mb-3 flex items-center justify-between gap-3">
                <div className="text-sm font-semibold">{props.title}</div>
                {props.right}
            </div>
            {props.children}
        </div>
    );
}

function Modal(props: { open: boolean; title: string; onClose: () => void; children: React.ReactNode }) {
    if (!props.open) return null;
    return (
        <div className="fixed inset-0 z-50">
            <div className="absolute inset-0 bg-black/30" onClick={props.onClose} />
            <div className="absolute left-1/2 top-1/2 w-[92vw] max-w-xl -translate-x-1/2 -translate-y-1/2 rounded-2xl border bg-white p-4 shadow-lg">
                <div className="mb-3 flex items-center justify-between gap-3">
                    <div className="text-sm font-semibold">{props.title}</div>
                    <button className="rounded-lg border px-2 py-1 text-sm hover:bg-neutral-50" onClick={props.onClose}>
                        Close
                    </button>
                </div>
                {props.children}
            </div>
        </div>
    );
}

// --- Main Dashboard ---

export default function DashboardClient() {
    const todayYmd = useMemo(() => toYmdLocal(new Date()), []);
    const [loading, setLoading] = useState(true);

    // Data States
    const [tasks, setTasks] = useState<TaskRow[]>([]);
    const [inboxCount, setInboxCount] = useState(0);
    const [events, setEvents] = useState<CalendarEvent[]>([]);
    const [docs, setDocs] = useState<DocRow[]>([]); // All docs for linking
    const [health, setHealth] = useState<{ ok: boolean; status: string } | null>(null);

    // Filtered Data (Memoized)
    const todayTasks = useMemo(() => {
        // Refinement 5: "Today Focus" should show actual Today/Planned tasks properly
        // Logic: 
        // 1. Scheduled for today or before (overdue)
        // 2. OR Status = planned/doing
        return tasks.filter(t => {
            if (t.status === "done") return false;
            // Overdue is handled separately in counts, but for list we want actionable "Today"
            // Let's explicitly look for today's date
            if (t.scheduled_date === todayYmd) return true;
            // Also include things explicitly bucketed for today if we rely on buckets (legacy logic support)
            // But strict date is safer.
            return false;
        });
    }, [tasks, todayYmd]);

    const overdueTasks = useMemo(() => {
        return tasks.filter(t => t.scheduled_date && t.scheduled_date < todayYmd && t.status !== "done");
    }, [tasks, todayYmd]);

    // Refinement 1: Content Pipeline uses Workspace='content' strictly
    const contentTasks = useMemo(() => {
        return tasks.filter(t => t.workspace === "content" && t.status !== "done");
    }, [tasks]);

    // Quick Add States
    const [quickAdd, setQuickAdd] = useState<"task" | "template" | null>(null);
    const [qaTitle, setQaTitle] = useState("");
    const [qaErr, setQaErr] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Quick Add Task Specific States
    const [qaWorkspace, setQaWorkspace] = useState<Workspace>("content"); // Default to content? or personal? Let's say personal or first current.
    const [taskAddToToday, setTaskAddToToday] = useState(true);
    const [taskBucket, setTaskBucket] = useState<ScheduleBucket>("morning");

    // Helper: Refresh All Data
    const refreshAll = useCallback(async () => {
        setLoading(true);
        try {
            // 1. Fetch All Tasks (for Today, Overdue, Content) - Limit 500 for safety
            const allTasks = await fetchTasks({ limit: "500" });
            setTasks(allTasks);

            // Inbox count (separate mostly because logic might differ or plain count is cheaper)
            // But we can filter from allTasks if 'status=inbox' is there. 
            // Let's stick to API fetch to be safe if 'allTasks' limit truncates.
            // Actually, let's just use allTasks filter for simplicity if we trust limit 500 covers active work.
            const inbox = allTasks.filter(t => t.status === "inbox");
            setInboxCount(inbox.length);

            // 2. Fetch Events (Next 7 days)
            const start = toUtcIso(new Date());
            const end = toUtcIso(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000));
            const ev = await fetchEvents({ start, end });
            setEvents(ev);

            // 3. Fetch Docs (All/Recent for linking) - fetch more to ensure we find templates
            const d = await fetchDocs({ limit: "100" });
            setDocs(d);

            // 4. Health
            try {
                const hRes = await fetch("/api/health");
                if (hRes.ok) setHealth({ ok: true, status: "OK" });
                else setHealth({ ok: false, status: "Degraded" }); // Lock F4
            } catch {
                setHealth({ ok: false, status: "Degraded" });
            }

        } catch (e) {
            console.error("Dashboard refresh failed", e);
        } finally {
            setLoading(false);
        }
    }, [todayYmd]);

    useEffect(() => {
        refreshAll();
    }, [refreshAll]);

    // Actions
    const handleCreateContentTemplate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!qaTitle.trim()) return;
        if (isSubmitting) return; // Lock Point 1: Idempotency

        setIsSubmitting(true);
        setQaErr(null);

        try {
            // Lock Point 1, F1, F3, 5 executed in createContentTask
            const res = await createContentTask(qaTitle.trim());

            if (res.errors.length > 0) {
                console.warn("Some errors during template creation:", res.errors);
            }

            await refreshAll();
            setQuickAdd(null);
            setQaTitle("");
        } catch (err: any) {
            setQaErr(err.message || "Failed to create content task");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleRetryMissingDocs = async (taskId: string, taskTitle: string) => {
        if (!confirm(`Create missing templates for "${taskTitle}"?`)) return;
        try {
            setLoading(true);
            // Lock Point 2, 3, F2
            await createMissingContentDocs(taskId, taskTitle);
            await refreshAll();
        } catch (e) {
            alert("Failed to fix docs: " + String(e));
        } finally {
            setLoading(false);
        }
    };

    if (loading && tasks.length === 0) return <div className="p-6">Loading Command Center...</div>;

    // Pipeline Grouping
    const pipelineStages: ContentStage[] = ["stage:idea", "stage:script", "stage:storyboard", "stage:shoot", "stage:edit", "stage:ready", "stage:posted"];
    const groupedContent: Record<string, TaskRow[]> = {};
    const missingDocsMap: Record<string, number> = {}; // taskId -> count of missing

    // Simple header columns logic
    // We will just filter list by stage for simplicity, or show grouped list
    // Let's do a grouped list by stage
    for (const t of contentTasks) {
        const stage = getPipelineStage(t.tags) || "stage:idea"; // Lock Point 4 + F3 (UI default)

        // Refinement 4: UI Limit handled in rendering loop
        if (!groupedContent[stage]) groupedContent[stage] = [];
        groupedContent[stage].push(t);

        // Check missing docs
        const relatedDocs = listDocsByTaskId(docs, t.id);
        // Expect 3 standard ones. Check strictly? 
        // We look for 00-Brief, 01-Script, 02-Storyboard markers
        let missingCount = 0;
        if (!relatedDocs.some(d => d.title.includes("00-Brief"))) missingCount++;
        if (!relatedDocs.some(d => d.title.includes("01-Script"))) missingCount++;
        if (!relatedDocs.some(d => d.title.includes("02-Storyboard"))) missingCount++;
        if (missingCount > 0) missingDocsMap[t.id] = missingCount;
    }

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-bold font-display">Command Center</h1>
                    <div className="text-xs text-neutral-500">Today: {todayYmd}</div>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => refreshAll()}
                        className="p-2 hover:bg-neutral-100 rounded-full"
                        title="Refresh"
                    >
                        🔄
                    </button>
                    <Link href="/planner" className="rounded-xl bg-black text-white px-4 py-2 text-sm font-medium hover:bg-neutral-800 transition-colors">
                        Open Planner
                    </Link>
                </div>
            </div>

            {/* Grid Layout (4 Cards) */}
            <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">

                {/* Card 1: Today Focus */}
                <Card
                    title="Today Focus"
                    right={<button onClick={() => setQuickAdd("task")} className="text-xs bg-neutral-100 px-2 py-1 rounded hover:bg-neutral-200">+ Quick Task</button>}
                    className="h-full"
                >
                    <div className="grid grid-cols-3 gap-4 text-center py-4">
                        {/* Refinement 5: Make overdue clickable */}
                        <Link href="/planner?filter=overdue" className="p-3 bg-red-50 rounded-xl hover:bg-red-100 transition-colors block">
                            <div className="text-2xl font-bold text-red-600">{overdueTasks.length}</div>
                            <div className="text-xs text-red-500 font-medium uppercase tracking-wide">Overdue</div>
                        </Link>
                        <Link href="/today" className="p-3 bg-blue-50 rounded-xl hover:bg-blue-100 transition-colors block">
                            <div className="text-2xl font-bold text-blue-600">{todayTasks.length}</div>
                            <div className="text-xs text-blue-500 font-medium uppercase tracking-wide">Today</div>
                        </Link>
                        <Link href="/inbox" className="p-3 bg-neutral-50 rounded-xl hover:bg-neutral-100 transition-colors block">
                            <div className="text-2xl font-bold text-neutral-600">{inboxCount}</div>
                            <div className="text-xs text-neutral-500 font-medium uppercase tracking-wide">Inbox</div>
                        </Link>
                    </div>
                    <div className="mt-4 space-y-2">
                        {todayTasks.length === 0 && overdueTasks.length > 0 ? (
                            <div className="text-sm text-neutral-500 text-center italic py-2">
                                You have {overdueTasks.length} overdue tasks!
                                <Link href="/planner?filter=overdue" className="ml-1 underline text-red-500">View</Link>
                            </div>
                        ) : null}

                        {todayTasks.slice(0, 5).map(t => (
                            <Link key={t.id} href={`/planner`} className="flex items-center gap-2 text-sm border-b last:border-0 pb-2 hover:bg-neutral-50 rounded px-1 -mx-1">
                                <span className={`w-2 h-2 rounded-full ${t.workspace === 'personal' ? 'bg-purple-400' : 'bg-green-400'}`} />
                                <span className="truncate flex-1">{t.title}</span>
                            </Link>
                        ))}
                        {todayTasks.length === 0 && overdueTasks.length === 0 && <div className="text-sm text-neutral-400 text-center italic">All caught up for today!</div>}
                    </div>
                </Card>

                {/* Card 2: Content Pipeline */}
                <Card
                    title="Content Pipeline"
                    right={
                        <button
                            onClick={() => setQuickAdd("template")}
                            className="flex items-center gap-1 text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded hover:bg-purple-200 font-medium"
                        >
                            <span>✨</span> New Template
                        </button>
                    }
                    className="h-full row-span-2 overflow-hidden flex flex-col"
                >
                    <div className="flex-1 overflow-y-auto space-y-6 pr-2">
                        {/* Render simple list grouped by stage */}
                        {pipelineStages.map(stage => {
                            const items = groupedContent[stage];
                            if (!items || items.length === 0) return null;
                            const stageLabel = stage.replace("stage:", "").toUpperCase(); // Refinement 2: Mapped correctly enough? Yes (idea->IDEA, script->SCRIPT)

                            // Refinement 4: Limit items per stage
                            const visibleItems = items.slice(0, 5);
                            const hasMore = items.length > 5;

                            return (
                                <div key={stage} className="space-y-2">
                                    <div className="flex items-center gap-2 text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                                        <div className="flex-1 h-px bg-neutral-100"></div>
                                        {stageLabel}
                                        <div className="flex-1 h-px bg-neutral-100"></div>
                                    </div>
                                    {visibleItems.map(t => (
                                        <div key={t.id} className="group rounded-xl border p-3 hover:border-purple-300 transition-colors bg-white">
                                            <div className="flex justify-between items-start gap-2">
                                                <div className="font-medium text-sm text-neutral-800">{t.title}</div>
                                                <Link href={`/docs`} className="opacity-0 group-hover:opacity-100 text-[10px] bg-neutral-100 px-1.5 py-0.5 rounded text-neutral-500 hover:bg-neutral-200">
                                                    Docs
                                                </Link>
                                            </div>
                                            {/* Refinement 3: Logic fixed in utils.ts/loop above? Yes. Prefix check in loop */}
                                            {missingDocsMap[t.id] ? (
                                                <div className="mt-2 flex items-center gap-2">
                                                    <span className="text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded font-medium">
                                                        Missing {missingDocsMap[t.id]} docs
                                                    </span>
                                                    <button
                                                        onClick={() => handleRetryMissingDocs(t.id, t.title)}
                                                        className="text-[10px] underline text-neutral-500 hover:text-black"
                                                    >
                                                        Fix
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="mt-1 text-[10px] text-neutral-400 flex gap-1">
                                                    <span>📄 3/3 Docs Linked</span>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                    {hasMore && (
                                        <div className="text-[10px] text-center text-neutral-400 hover:text-neutral-600 cursor-pointer">
                                            +{items.length - 5} more • <Link href="/today" className="underline">View all</Link>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                        {Object.keys(groupedContent).length === 0 && (
                            <div className="text-center py-10 text-neutral-400 text-sm">
                                No content tasks. Start by creating one!
                            </div>
                        )}
                    </div>
                </Card>

                {/* Card 3: Next Up (Events) */}
                <Card title="Next Up (Events)" className="h-full">
                    <div className="space-y-3">
                        {events.slice(0, 3).map(ev => (
                            <div key={ev.id} className="flex items-start gap-3">
                                <div className="flex flex-col items-center min-w-[3rem] p-1 bg-neutral-50 rounded-lg border">
                                    <span className="text-[10px] uppercase text-neutral-500 font-bold">
                                        {new Date(ev.start_time).toLocaleString('en-US', { month: 'short' })}
                                    </span>
                                    <span className="text-lg font-bold leading-none">
                                        {new Date(ev.start_time).getDate()}
                                    </span>
                                </div>
                                <div className="min-w-0">
                                    <div className="text-sm font-medium truncate">{ev.title}</div>
                                    <div className="text-xs text-neutral-500">
                                        {ev.all_day ? "All Day" : fmtTimeLocal(ev.start_time)}
                                        {ev.workspace && ` • ${ev.workspace}`}
                                    </div>
                                </div>
                            </div>
                        ))}
                        {events.length === 0 && <div className="text-sm text-neutral-500 py-4">No upcoming events</div>}
                        <Link href="/calendar" className="block text-center text-xs text-neutral-400 hover:text-black mt-2">
                            View Calendar →
                        </Link>
                    </div>
                </Card>

                {/* Card 4: System Safety */}
                <Card title="System Safety" className="h-full border-l-4 border-l-neutral-200">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <span className={`w-3 h-3 rounded-full ${health?.ok ? "bg-green-500" : "bg-yellow-500"}`} />
                            <span className="text-sm font-medium">{health?.status || "Checking..."}</span>
                        </div>
                        <div className="text-xs text-neutral-400">v0.1.1</div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <Link href="/settings/data" className="flex flex-col items-center justify-center p-3 border rounded-xl hover:bg-neutral-50 transition-colors text-center gap-1">
                            <span className="text-xl">🛡️</span>
                            <span className="text-xs font-medium">Data Settings</span>
                        </Link>

                        <button
                            // Lock Point 6: Real download
                            onClick={() => window.location.href = "/api/export-zip"}
                            className="flex flex-col items-center justify-center p-3 border rounded-xl hover:bg-neutral-50 transition-colors text-center gap-1 group"
                        >
                            <span className="text-xl group-hover:scale-110 transition-transform">💾</span>
                            <span className="text-xs font-medium">Quick Export</span>
                        </button>
                    </div>
                </Card>

            </div>

            {/* Modals */}
            <Modal
                open={quickAdd === "template"}
                title="New Content Project"
                onClose={() => setQuickAdd(null)}
            >
                <form onSubmit={handleCreateContentTemplate} className="space-y-4">
                    <div className="space-y-1">
                        <label className="text-xs font-semibold uppercase text-neutral-600">Project Title</label>
                        <input
                            autoFocus
                            className="w-full rounded-xl border px-3 py-2 text-sm focus:border-purple-500 focus:outline-none"
                            placeholder="e.g. iPhone 16 Review"
                            value={qaTitle}
                            onChange={(e) => setQaTitle(e.target.value)}
                        />
                        <p className="text-[10px] text-neutral-400">
                            Updates "Content Pipeline". Creates Task + Brief/Script/Storyboard automatically.
                        </p>
                    </div>

                    {qaErr && <div className="text-sm text-red-600 bg-red-50 p-2 rounded">{qaErr}</div>}

                    <div className="flex justify-end gap-2 pt-2">
                        <button
                            type="button"
                            className="rounded-xl border px-3 py-2 text-sm hover:bg-neutral-50"
                            onClick={() => setQuickAdd(null)}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="rounded-xl bg-purple-600 px-6 py-2 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-50 flex items-center gap-2"
                        >
                            {isSubmitting ? "Generating..." : "Create Project"}
                        </button>
                    </div>
                </form>
            </Modal>

            <Modal
                open={quickAdd === "task"}
                title="Quick Add Task"
                onClose={() => setQuickAdd(null)}
            >
                <form
                    className="space-y-3"
                    onSubmit={async (e) => {
                        e.preventDefault();
                        const title = qaTitle.trim();
                        if (!title) {
                            setQaErr("Title is required");
                            return;
                        }
                        if (isSubmitting) return;

                        try {
                            setIsSubmitting(true);
                            setQaErr(null);

                            const payload: any = {
                                title: qaTitle,
                                workspace: qaWorkspace,
                            };

                            if (taskAddToToday) {
                                payload.status = "planned";
                                payload.scheduled_date = todayYmd;
                                payload.schedule_bucket = taskBucket;
                            } else {
                                payload.status = "inbox";
                            }

                            await postJson("/api/tasks", payload);
                            await refreshAll();
                            setQaTitle("");
                            setQuickAdd(null);
                        } catch (err: any) {
                            setQaErr(err.message || "Failed to create task");
                        } finally {
                            setIsSubmitting(false);
                        }
                    }}
                >
                    <div className="space-y-1">
                        <div className="text-xs text-neutral-600 font-semibold uppercase">Task Title</div>
                        <input
                            className="w-full rounded-xl border px-3 py-2 text-sm focus:border-black focus:outline-none"
                            value={qaTitle}
                            onChange={(e) => setQaTitle(e.target.value)}
                            placeholder="e.g., Follow up with client"
                            autoFocus
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                            <div className="text-xs text-neutral-600 font-semibold uppercase">Workspace</div>
                            <select
                                className="w-full rounded-xl border px-3 py-2 text-sm focus:border-black focus:outline-none bg-white font-medium"
                                value={qaWorkspace}
                                onChange={(e) => setQaWorkspace(e.target.value as Workspace)}
                            >
                                {WORKSPACES.map((w) => (
                                    <option key={w} value={w}>
                                        {workspaceLabel(w)}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="space-y-1">
                            <div className="text-xs text-neutral-600 font-semibold uppercase">Schedule</div>
                            <label className="flex h-[38px] items-center gap-2 cursor-pointer text-sm font-medium border rounded-xl px-3 bg-white">
                                <input
                                    type="checkbox"
                                    checked={taskAddToToday}
                                    onChange={(e) => setTaskAddToToday(e.target.checked)}
                                />
                                Add to Today
                            </label>
                        </div>
                    </div>

                    {taskAddToToday && (
                        <div className="space-y-1">
                            <div className="text-xs text-neutral-600 font-semibold uppercase">Time Slot</div>
                            <select
                                className="w-full rounded-xl border px-3 py-2 text-sm focus:border-black focus:outline-none bg-white font-medium"
                                value={taskBucket}
                                onChange={(e) => setTaskBucket(e.target.value as any)}
                            >
                                <option value="morning">Morning</option>
                                <option value="afternoon">Afternoon</option>
                                <option value="evening">Evening</option>
                            </select>
                        </div>
                    )}

                    {qaErr && <div className="text-sm text-red-600">{qaErr}</div>}

                    <div className="flex justify-end gap-2 pt-2">
                        <button
                            type="button"
                            className="rounded-xl border px-3 py-2 text-sm hover:bg-neutral-50"
                            onClick={() => setQuickAdd(null)}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="rounded-xl bg-black px-6 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
                        >
                            {isSubmitting ? "Creating..." : "Create Task"}
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
