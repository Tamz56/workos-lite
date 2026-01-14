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
        <div className={`rounded-2xl border border-neutral-200/70 bg-white p-5 md:p-6 shadow-sm hover:shadow-md transition-shadow ${props.className || ""}`}>
            <div className="mb-4 flex items-center justify-between gap-3">
                <div className="text-sm font-medium text-neutral-900">{props.title}</div>
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
            <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={props.onClose} />
            <div className="absolute left-1/2 top-1/2 w-[92vw] max-w-xl -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-neutral-200/70 bg-white p-6 shadow-xl">
                <div className="mb-4 flex items-center justify-between gap-3">
                    <div className="text-lg font-medium text-neutral-900">{props.title}</div>
                    <button className="rounded-lg px-2 py-1 text-sm text-neutral-500 hover:bg-neutral-50" onClick={props.onClose}>
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
        const missing = [
            !relatedDocs.some(d => d.title.includes("00-Brief")),
            !relatedDocs.some(d => d.title.includes("01-Script")),
            !relatedDocs.some(d => d.title.includes("02-Storyboard"))
        ].filter(Boolean).length;

        if (missing > 0) missingDocsMap[t.id] = missing;
    }

    return (
        <div className="mx-auto w-full max-w-screen-2xl px-4 md:px-6 lg:px-8 py-6 space-y-5">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-bold font-display tracking-tight text-neutral-900">Command Center</h1>
                    <div className="text-xs text-neutral-500 font-medium">Today: {todayYmd}</div>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => refreshAll()}
                        className="p-2 hover:bg-neutral-100 rounded-full text-neutral-500 hover:text-black transition-colors"
                        title="Refresh"
                    >
                        🔄
                    </button>
                    <Link href="/planner" className="rounded-xl bg-neutral-900 text-white px-4 py-2 text-sm font-medium hover:bg-black transition-colors shadow-sm">
                        Open Planner
                    </Link>
                </div>
            </div>

            {/* Grid Layout (4 Cards) */}
            <div className="grid gap-4 lg:gap-5 grid-cols-1 lg:grid-cols-2">

                {/* Card 1: Today Focus */}
                <Card
                    title="Today Focus"
                    right={<button onClick={() => setQuickAdd("task")} className="text-xs font-medium bg-neutral-100 px-2.5 py-1.5 rounded-lg hover:bg-neutral-200 text-neutral-600 transition-colors">+ Quick Task</button>}
                    className="h-full"
                >
                    <div className="grid grid-cols-3 gap-3 md:gap-4 text-center py-2">
                        {/* Refinement 5: Make overdue clickable */}
                        <Link href="/planner?filter=overdue" className="p-3 bg-red-50/50 border border-red-100 rounded-xl hover:bg-red-50 hover:border-red-200 transition-all block group">
                            <div className="text-2xl font-bold text-red-600 group-hover:scale-105 transition-transform">{overdueTasks.length}</div>
                            <div className="text-[10px] md:text-xs text-red-500 font-bold uppercase tracking-wide">Overdue</div>
                        </Link>
                        <Link href="/today" className="p-3 bg-blue-50/50 border border-blue-100 rounded-xl hover:bg-blue-50 hover:border-blue-200 transition-all block group">
                            <div className="text-2xl font-bold text-blue-600 group-hover:scale-105 transition-transform">{todayTasks.length}</div>
                            <div className="text-[10px] md:text-xs text-blue-500 font-bold uppercase tracking-wide">Today</div>
                        </Link>
                        <Link href="/inbox" className="p-3 bg-neutral-50 border border-neutral-100 rounded-xl hover:bg-neutral-100 hover:border-neutral-200 transition-all block group">
                            <div className="text-2xl font-bold text-neutral-600 group-hover:scale-105 transition-transform">{inboxCount}</div>
                            <div className="text-[10px] md:text-xs text-neutral-500 font-bold uppercase tracking-wide">Inbox</div>
                        </Link>
                    </div>
                    <div className="mt-5 space-y-0">
                        {todayTasks.length === 0 && overdueTasks.length > 0 ? (
                            <div className="text-sm text-neutral-500 text-center italic py-4 bg-neutral-50/50 rounded-xl border border-neutral-100">
                                You have {overdueTasks.length} overdue tasks!
                                <Link href="/planner?filter=overdue" className="ml-1 underline text-red-500 hover:text-red-700">View</Link>
                            </div>
                        ) : null}

                        {todayTasks.slice(0, 5).map(t => (
                            <Link key={t.id} href={`/planner`} className="flex items-center gap-3 text-sm border-b border-neutral-100 last:border-0 py-3 hover:bg-neutral-50 px-2 -mx-2 rounded-lg transition-colors group">
                                <span className={`w-2 h-2 rounded-full ring-2 ring-white shadow-sm ${t.workspace === 'personal' ? 'bg-purple-400' : 'bg-green-400'}`} />
                                <span className="truncate flex-1 font-medium text-neutral-700 group-hover:text-black transition-colors">{t.title}</span>
                            </Link>
                        ))}
                        {todayTasks.length === 0 && overdueTasks.length === 0 && <div className="text-sm text-neutral-400 text-center italic py-4">All caught up for today!</div>}
                    </div>
                </Card>

                {/* Card 2: Content Pipeline */}
                <Card
                    title="Content Pipeline"
                    right={
                        <button
                            onClick={() => setQuickAdd("template")}
                            className="flex items-center gap-1.5 text-xs bg-purple-50 text-purple-700 px-3 py-1.5 rounded-lg hover:bg-purple-100 font-medium transition-colors border border-purple-100"
                        >
                            <span>✨</span> New Template
                        </button>
                    }
                    className="h-full row-span-2 overflow-hidden flex flex-col"
                >
                    <div className="flex-1 overflow-y-auto space-y-6 pr-2 -mr-2">
                        {/* Render simple list grouped by stage */}
                        {pipelineStages.map(stage => {
                            const items = groupedContent[stage];
                            if (!items || items.length === 0) return null;
                            const stageLabel = stage.replace("stage:", "").toUpperCase();

                            // Refinement 4: Limit items per stage
                            const visibleItems = items.slice(0, 5);
                            const hasMore = items.length > 5;

                            return (
                                <div key={stage} className="space-y-3">
                                    <div className="flex items-center gap-3 text-[10px] font-bold text-neutral-400 uppercase tracking-widest">
                                        <div className="flex-1 h-px bg-neutral-100"></div>
                                        {stageLabel}
                                        <div className="flex-1 h-px bg-neutral-100"></div>
                                    </div>
                                    {visibleItems.map(t => (
                                        <div key={t.id} className="group rounded-xl border border-neutral-100 p-3 hover:border-purple-200 hover:shadow-sm transition-all bg-white relative">
                                            <div className="flex justify-between items-start gap-2">
                                                <div className="font-medium text-sm text-neutral-700 group-hover:text-black max-w-[85%]">{t.title}</div>
                                                <Link href={`/docs`} className="opacity-0 group-hover:opacity-100 text-[10px] bg-neutral-50 border border-neutral-100 px-2 py-1 rounded-md text-neutral-500 hover:bg-white hover:shadow-sm transition-all absolute top-3 right-3">
                                                    Docs
                                                </Link>
                                            </div>
                                            {/* Refinement 3: Logic fixed in utils.ts/loop above? Yes. Prefix check in loop */}
                                            {missingDocsMap[t.id] ? (
                                                <div className="mt-2.5 flex items-center gap-2">
                                                    <span className="text-[10px] bg-red-50 text-red-600 px-2 py-0.5 rounded-full font-medium border border-red-100 flex items-center gap-1">
                                                        📄 {3 - missingDocsMap[t.id]}/3 Docs
                                                    </span>
                                                    <button
                                                        onClick={() => handleRetryMissingDocs(t.id, t.title)}
                                                        className="text-[10px] font-medium text-neutral-400 hover:text-black hover:underline transition-colors"
                                                    >
                                                        Fix
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="mt-2.5 flex gap-1">
                                                    <span className="text-[10px] text-green-700 bg-green-50 border border-green-100 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                                                        ✅ 3/3 Docs
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                    {hasMore && (
                                        <div className="text-[10px] text-center text-neutral-400 hover:text-black cursor-pointer font-medium py-1">
                                            +{items.length - 5} more • <Link href="/today" className="underline decoration-neutral-300">View all</Link>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                        {Object.keys(groupedContent).length === 0 && (
                            <div className="text-center py-12">
                                <div className="text-4xl mb-3 opacity-20">📝</div>
                                <div className="text-neutral-900 font-medium text-sm">No content tasks yet</div>
                                <div className="text-neutral-500 text-xs mt-1">Start by creating a new template</div>
                            </div>
                        )}
                    </div>
                </Card>

                {/* Card 3: Next Up (Events) */}
                <Card title="Next Up (Events)" className="h-full">
                    <div className="space-y-3">
                        {events.slice(0, 3).map(ev => (
                            <div key={ev.id} className="flex items-start gap-4 p-2 rounded-xl hover:bg-neutral-50 transition-colors -mx-2">
                                <div className="flex flex-col items-center min-w-[3.5rem] p-1.5 bg-neutral-50 rounded-xl border border-neutral-100 shadow-sm">
                                    <span className="text-[10px] uppercase text-neutral-500 font-bold tracking-wider">
                                        {new Date(ev.start_time).toLocaleString('en-US', { month: 'short' })}
                                    </span>
                                    <span className="text-xl font-bold leading-none text-neutral-900 mt-0.5">
                                        {new Date(ev.start_time).getDate()}
                                    </span>
                                </div>
                                <div className="min-w-0 flex-1 pt-0.5">
                                    <div className="text-sm font-medium truncate text-neutral-800">{ev.title}</div>
                                    <div className="text-xs text-neutral-500 mt-0.5 flex items-center gap-1.5">
                                        <span className="bg-neutral-100 text-neutral-600 px-1.5 py-0.5 rounded text-[10px] font-medium">
                                            {ev.all_day ? "All Day" : fmtTimeLocal(ev.start_time)}
                                        </span>
                                        {ev.workspace && <span className="text-neutral-400">• {ev.workspace}</span>}
                                    </div>
                                </div>
                            </div>
                        ))}
                        {events.length === 0 && <div className="text-sm text-neutral-400 py-6 text-center italic">No upcoming events</div>}
                        <Link href="/calendar" className="block text-center text-xs font-medium text-neutral-500 hover:text-black mt-2 py-2 rounded-lg hover:bg-neutral-50 transition-colors">
                            View Calendar →
                        </Link>
                    </div>
                </Card>

                {/* Card 4: System Safety */}
                <Card title="System Safety" className="h-full border-l-4 border-l-neutral-200">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-2">
                            <span className={`relative flex h-3 w-3`}>
                                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${health?.ok ? "bg-green-400" : "bg-yellow-400"}`}></span>
                                <span className={`relative inline-flex rounded-full h-3 w-3 ${health?.ok ? "bg-green-500" : "bg-yellow-500"}`}></span>
                            </span>
                            <span className="text-sm font-medium text-neutral-700">{health?.status || "Checking..."}</span>
                        </div>
                        <div className="text-[10px] font-mono text-neutral-400 bg-neutral-50 px-2 py-1 rounded border border-neutral-100">v0.1.1</div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <Link href="/settings/data" className="flex flex-col items-center justify-center p-4 border border-neutral-200/60 rounded-xl hover:bg-neutral-50 hover:border-neutral-300 transition-all text-center gap-2 group bg-neutral-50/30">
                            <span className="text-2xl group-hover:scale-110 transition-transform duration-300">🛡️</span>
                            <span className="text-xs font-medium text-neutral-600 group-hover:text-black">Data Settings</span>
                        </Link>

                        <button
                            // Lock Point 6: Real download
                            onClick={() => window.location.href = "/api/export-zip"}
                            className="flex flex-col items-center justify-center p-4 border border-neutral-200/60 rounded-xl hover:bg-neutral-50 hover:border-neutral-300 transition-all text-center gap-2 group bg-neutral-50/30"
                        >
                            <span className="text-2xl group-hover:scale-110 transition-transform duration-300">💾</span>
                            <span className="text-xs font-medium text-neutral-600 group-hover:text-black">Quick Export</span>
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
                <form onSubmit={handleCreateContentTemplate} className="space-y-5">
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold uppercase tracking-wide text-neutral-500">Project Title</label>
                        <input
                            autoFocus
                            className="w-full rounded-xl border border-neutral-200 px-4 py-2.5 text-sm focus:border-purple-500 focus:ring-1 focus:ring-purple-500 focus:outline-none transition-all placeholder:text-neutral-400"
                            placeholder="e.g. iPhone 16 Review"
                            value={qaTitle}
                            onChange={(e) => setQaTitle(e.target.value)}
                        />
                        <p className="text-[10px] text-neutral-400 pl-1">
                            Updates "Content Pipeline". Creates Task + Brief/Script/Storyboard automatically.
                        </p>
                    </div>

                    {qaErr && <div className="text-sm text-red-600 bg-red-50 p-3 rounded-xl border border-red-100 flex items-center gap-2"><span>⚠️</span>{qaErr}</div>}

                    <div className="flex justify-end gap-3 pt-2">
                        <button
                            type="button"
                            className="rounded-xl border border-neutral-200 px-4 py-2 text-sm font-medium text-neutral-600 hover:bg-neutral-50 hover:text-black transition-colors"
                            onClick={() => setQuickAdd(null)}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="rounded-xl bg-purple-600 px-6 py-2 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-70 shadow-sm hover:shadow active:scale-95 transition-all flex items-center gap-2"
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
                    className="space-y-4"
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
                    <div className="space-y-1.5">
                        <div className="text-xs text-neutral-500 font-bold uppercase tracking-wide">Task Title</div>
                        <input
                            className="w-full rounded-xl border border-neutral-200 px-4 py-2.5 text-sm focus:border-black focus:ring-1 focus:ring-black focus:outline-none transition-all placeholder:text-neutral-400"
                            value={qaTitle}
                            onChange={(e) => setQaTitle(e.target.value)}
                            placeholder="e.g., Follow up with client"
                            autoFocus
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <div className="text-xs text-neutral-500 font-bold uppercase tracking-wide">Workspace</div>
                            <div className="relative">
                                <select
                                    className="w-full appearance-none rounded-xl border border-neutral-200 px-4 py-2.5 text-sm focus:border-black focus:outline-none bg-white font-medium"
                                    value={qaWorkspace}
                                    onChange={(e) => setQaWorkspace(e.target.value as Workspace)}
                                >
                                    {WORKSPACES.map((w) => (
                                        <option key={w} value={w}>
                                            {workspaceLabel(w)}
                                        </option>
                                    ))}
                                </select>
                                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-neutral-500">
                                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                                </div>
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <div className="text-xs text-neutral-500 font-bold uppercase tracking-wide">Schedule</div>
                            <label className="flex h-[42px] items-center gap-3 cursor-pointer text-sm font-medium border border-neutral-200 rounded-xl px-4 bg-white hover:border-neutral-300 transition-colors">
                                <input
                                    type="checkbox"
                                    className="rounded border-neutral-300 text-black focus:ring-black"
                                    checked={taskAddToToday}
                                    onChange={(e) => setTaskAddToToday(e.target.checked)}
                                />
                                Add to Today
                            </label>
                        </div>
                    </div>

                    {taskAddToToday && (
                        <div className="space-y-1.5">
                            <div className="text-xs text-neutral-500 font-bold uppercase tracking-wide">Time Slot</div>
                            <div className="relative">
                                <select
                                    className="w-full appearance-none rounded-xl border border-neutral-200 px-4 py-2.5 text-sm focus:border-black focus:outline-none bg-white font-medium"
                                    value={taskBucket}
                                    onChange={(e) => setTaskBucket(e.target.value as any)}
                                >
                                    <option value="morning">Morning</option>
                                    <option value="afternoon">Afternoon</option>
                                    <option value="evening">Evening</option>
                                </select>
                                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-neutral-500">
                                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                                </div>
                            </div>
                        </div>
                    )}

                    {qaErr && <div className="text-sm text-red-600 bg-red-50 p-3 rounded-xl border-red-100 border flex items-center gap-2"><span>⚠️</span>{qaErr}</div>}

                    <div className="flex justify-end gap-3 pt-3 border-t border-neutral-100">
                        <button
                            type="button"
                            className="rounded-xl border border-neutral-200 px-4 py-2 text-sm font-medium text-neutral-600 hover:bg-neutral-50 hover:text-black transition-colors"
                            onClick={() => setQuickAdd(null)}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="rounded-xl bg-black px-6 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-70 shadow-md hover:shadow-lg active:scale-95 transition-all"
                        >
                            {isSubmitting ? "Creating..." : "Create Task"}
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
