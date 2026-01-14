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
    tags?: string[];
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
    const rows = pickArray<TaskRow>(data);

    // Client-side Tag Parsing (No DB changes)
    return rows.map(t => {
        // Match "project:name" or "#tag"
        // Regex: start of string or whitespace, followed by project:... or #...
        const matches = t.title.match(/(?:^|\s)(project:[\w-]+|#[\w-]+)/g);
        const tags = matches ? matches.map(s => s.trim()) : [];
        return { ...t, tags };
    });
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
            hour12: false, month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit",
        });
    } catch {
        return iso;
    }
}

// --- Components ---

function Card(props: { title: string; right?: React.ReactNode; children: React.ReactNode; className?: string }) {
    return (
        <div className={`rounded-2xl border border-neutral-200/70 bg-white p-5 shadow-sm hover:shadow-md transition-shadow ${props.className || ""}`}>
            <div className="mb-4 flex items-center justify-between gap-3 border-b border-neutral-50 pb-2">
                <div className="text-sm font-semibold text-neutral-900 uppercase tracking-wide">{props.title}</div>
                {props.right}
            </div>
            {props.children}
        </div>
    );
}

function StatBadge(props: { value: number; label: string; colorClass: string; href?: string }) {
    const content = (
        <div className={`flex flex-col items-center justify-center p-2 rounded-xl border ${props.colorClass} transition-transform hover:scale-105`}>
            <div className="text-xl font-bold leading-none">{props.value}</div>
            <div className="text-[10px] font-bold uppercase tracking-wider opacity-80 mt-1">{props.label}</div>
        </div>
    );
    if (props.href) return <Link href={props.href} className="block">{content}</Link>;
    return content;
}

function WorkspaceCard(props: {
    workspace: Workspace;
    tasks: TaskRow[];
    onQuickAdd: (ws: Workspace) => void;
    todayYmd: string;
    className?: string;
}) {
    const { workspace, tasks, todayYmd } = props;

    const stats = useMemo(() => {
        const overdue = tasks.filter(t => t.scheduled_date && t.scheduled_date < todayYmd && t.status !== "done").length;
        const today = tasks.filter(t => t.scheduled_date === todayYmd && t.status !== "done").length;
        const inbox = tasks.filter(t => t.status === "inbox").length;
        return { overdue, today, inbox };
    }, [tasks, todayYmd]);

    const topTasks = useMemo(() => {
        return [...tasks]
            .filter(t => t.status !== 'done')
            .sort((a, b) => {
                const da = a.scheduled_date || '9999-99-99';
                const db = b.scheduled_date || '9999-99-99';
                return da.localeCompare(db);
            })
            .slice(0, 5);
    }, [tasks]);

    const title = workspaceLabel(workspace);
    const colorMap: Record<string, string> = {
        avacrm: "text-blue-600 bg-blue-50 border-blue-100",
        ops: "text-orange-600 bg-orange-50 border-orange-100",
        content: "text-purple-600 bg-purple-50 border-purple-100",
        default: "text-neutral-600 bg-neutral-50 border-neutral-100"
    };
    const theme = colorMap[workspace] || colorMap.default;

    return (
        <Card title={title} right={<button onClick={() => props.onQuickAdd(workspace)} className="text-[10px] bg-neutral-100 hover:bg-neutral-200 px-2 py-1 rounded font-medium text-neutral-600">+ Task</button>} className={props.className}>
            <div className="grid grid-cols-3 gap-2 mb-4">
                <StatBadge value={stats.overdue} label="Overdue" colorClass="bg-red-50 text-red-600 border-red-100" href={`/planner?filter=overdue&workspace=${workspace}`} />
                <StatBadge value={stats.today} label="Today" colorClass={theme} href={`/planner?workspace=${workspace}`} />
                <StatBadge value={stats.inbox} label="Inbox" colorClass="bg-neutral-50 text-neutral-600 border-neutral-100" href={`/inbox?workspace=${workspace}`} />
            </div>
            <div className="space-y-1">
                {topTasks.map(t => (
                    <div key={t.id} className="flex items-center gap-2 text-xs py-1.5 border-b border-neutral-50 last:border-0 hover:bg-neutral-50 px-1 -mx-1 rounded group">
                        <span className={`w-1.5 h-1.5 rounded-full ${t.scheduled_date && t.scheduled_date < todayYmd ? 'bg-red-500' : 'bg-neutral-300'}`} />
                        <span className="truncate flex-1 font-medium text-neutral-700 group-hover:text-black">{t.title}</span>
                        {t.scheduled_date && <span className="text-[9px] text-neutral-400">{t.scheduled_date.slice(5)}</span>}
                    </div>
                ))}
                {topTasks.length === 0 && <div className="text-center text-xs text-neutral-400 py-4 italic">No active tasks</div>}
            </div>
        </Card>
    );
}

function ProjectTimeline(props: { tasks: TaskRow[]; todayYmd: string }) {
    const projects = useMemo(() => {
        const map = new Map<string, TaskRow[]>();
        props.tasks.forEach(t => {
            if (t.status === 'done') return;
            const projTag = t.tags?.find(tag => tag.startsWith("project:"));
            if (projTag) {
                const key = projTag.replace("project:", "");
                if (!map.has(key)) map.set(key, []);
                map.get(key)!.push(t);
            }
        });
        return Array.from(map.entries());
    }, [props.tasks]);

    const days = useMemo(() => {
        const d = [];
        const start = new Date(props.todayYmd);
        for (let i = 0; i < 14; i++) {
            const curr = new Date(start);
            curr.setDate(start.getDate() + i);
            d.push(toYmdLocal(curr));
        }
        return d;
    }, [props.todayYmd]);

    if (projects.length === 0) return (
        <Card title="Project Timeline (14 Days)" className="h-full min-h-[200px] flex items-center justify-center">
            <div className="text-center">
                <div className="text-neutral-300 text-4xl mb-2">📊</div>
                <div className="text-sm text-neutral-500">No active projects found</div>
                <div className="text-xs text-neutral-400 mt-1">Tag tasks with <code>project:name</code> to see them here</div>
            </div>
        </Card>
    );

    return (
        <Card title="Project Timeline (14 Days)" className="h-full overflow-x-auto">
            <div className="min-w-[600px]">
                <div className="grid grid-cols-[120px_1fr] gap-4 mb-3 border-b border-neutral-100 pb-2">
                    <div className="text-[10px] uppercase font-bold text-neutral-400 self-end">Project</div>
                    <div className="grid grid-cols-14 gap-0.5">
                        {days.map(d => (
                            <div key={d} className="text-[9px] text-center text-neutral-400 font-medium">
                                {d.slice(8)} <br /> <span className="opacity-50">{new Date(d).toLocaleDateString('en-US', { weekday: 'narrow' })}</span>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="space-y-4">
                    {projects.map(([projName, items]) => (
                        <div key={projName} className="grid grid-cols-[120px_1fr] gap-4 items-center group">
                            <Link href={`/planner?q=project:${projName}`} className="text-xs font-semibold text-neutral-700 truncate hover:text-blue-600 hover:underline" title={projName}>
                                {projName}
                                <span className="block text-[9px] font-normal text-neutral-400">{items.length} tasks</span>
                            </Link>
                            <div className="grid grid-cols-14 gap-0.5 h-6 bg-neutral-50 rounded-md p-0.5">
                                {days.map(d => {
                                    const tasksOnDay = items.filter(t => t.scheduled_date === d);
                                    if (tasksOnDay.length === 0) return <div key={d} className="h-full rounded hover:bg-neutral-100 transition-colors" />;
                                    return (
                                        <div key={d} className="relative group/day h-full">
                                            <div className="w-full h-full rounded bg-blue-400 hover:bg-blue-600 cursor-pointer shadow-sm transition-colors border border-blue-500/50"></div>
                                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover/day:block bg-black text-white text-[10px] p-2 rounded whitespace-nowrap z-20 shadow-xl">
                                                <div className="font-bold">{d}</div>
                                                {tasksOnDay.map(t => <div key={t.id} className="truncate max-w-[150px]">• {t.title}</div>)}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </Card>
    );
}

function WorkStrip(props: { workspaces: Workspace[]; tasks: TaskRow[]; todayYmd: string }) {
    return (
        <div className="flex gap-4 overflow-x-auto pb-4 pt-1 scrollbar-hide">
            {props.workspaces.map(w => {
                const count = props.tasks.filter(t => t.workspace === w && t.status !== 'done').length;
                const overdue = props.tasks.filter(t => t.workspace === w && t.scheduled_date && t.scheduled_date < props.todayYmd && t.status !== 'done').length;
                return (
                    <Link key={w} href={`/planner?workspace=${w}`} className="flex-none min-w-[140px] p-4 bg-white rounded-xl border border-neutral-200/70 shadow-sm hover:shadow-md hover:border-neutral-300 transition-all group flex flex-col justify-between h-[100px]">
                        <div className="flex items-center justify-between mb-1">
                            <span className="text-[10px] uppercase font-bold text-neutral-500 group-hover:text-black transition-colors">{workspaceLabel(w)}</span>
                            {overdue > 0 && <span className="text-[9px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full font-bold">{overdue} !</span>}
                        </div>
                        <div>
                            <div className="text-3xl font-bold text-neutral-700 group-hover:text-black transition-colors">{count}</div>
                            <div className="text-[10px] text-neutral-400">Total active tasks</div>
                        </div>
                    </Link>
                );
            })}
        </div>
    );
}

function Modal(props: { open: boolean; title: string; onClose: () => void; children: React.ReactNode }) {
    if (!props.open) return null;
    return (
        <div className="fixed inset-0 z-50">
            <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={props.onClose} />
            <div className="absolute left-1/2 top-1/2 w-[92vw] max-w-xl -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-neutral-200/70 bg-white p-6 shadow-xl animate-in fade-in zoom-in-95 duration-200">
                <div className="mb-5 flex items-center justify-between gap-3">
                    <div className="text-lg font-medium text-neutral-900">{props.title}</div>
                    <button className="rounded-lg px-2 py-1 text-sm text-neutral-500 hover:bg-neutral-50 hover:text-black transition-colors" onClick={props.onClose}>
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

    const [tasks, setTasks] = useState<TaskRow[]>([]);
    const [events, setEvents] = useState<CalendarEvent[]>([]);
    const [docs, setDocs] = useState<DocRow[]>([]);
    const [health, setHealth] = useState<{ ok: boolean; status: string } | null>(null);

    const [quickAdd, setQuickAdd] = useState<"task" | "template" | null>(null);
    const [qaTitle, setQaTitle] = useState("");
    const [qaErr, setQaErr] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [qaWorkspace, setQaWorkspace] = useState<Workspace>("content");
    const [taskAddToToday, setTaskAddToToday] = useState(true);
    const [taskBucket, setTaskBucket] = useState<ScheduleBucket>("morning");

    const refreshAll = useCallback(async () => {
        setLoading(true);
        try {
            const [allTasks, allEvents, allDocs, healthRes] = await Promise.all([
                fetchTasks({ limit: "1000" }),
                fetchEvents({ start: toUtcIso(new Date()), end: toUtcIso(new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)) }),
                fetchDocs({ limit: "100" }),
                fetch("/api/health").catch(() => ({ ok: false }))
            ]);

            setTasks(allTasks);
            setEvents(allEvents);
            setDocs(allDocs);
            setHealth({ ok: (healthRes as Response).ok, status: (healthRes as Response).ok ? "OK" : "Degraded" });

        } catch (e) {
            console.error("Refresh failed", e);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { refreshAll(); }, [refreshAll]);

    const wsTasks = useMemo(() => {
        const grouped: Record<string, TaskRow[]> = {};
        WORKSPACES.forEach(w => grouped[w] = []);
        tasks.forEach(t => {
            if (t.workspace && grouped[t.workspace]) grouped[t.workspace].push(t);
            else if (grouped['other']) grouped['other'].push(t); // Fallback
        });
        return grouped;
    }, [tasks]);

    const handleQuickAddTask = (w: Workspace) => {
        setQaWorkspace(w);
        setQuickAdd("task");
        setQaTitle("");
        setQaErr(null);
    };

    const handleCreateContentTemplate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!qaTitle.trim() || isSubmitting) return;
        setIsSubmitting(true);
        try {
            const res = await createContentTask(qaTitle.trim());
            if (res.errors.length > 0) console.warn("Template errors:", res.errors);
            await refreshAll();
            setQuickAdd(null);
            setQaTitle("");
        } catch (err: any) {
            setQaErr(err.message || "Failed");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (loading && tasks.length === 0) return <div className="p-10 flex justify-center items-center gap-3 text-neutral-400"><span className="animate-spin text-xl">⏳</span> Loading Command Center...</div>;

    const gcalUrl = process.env.NEXT_PUBLIC_GCAL_EMBED_URL;

    return (
        <div className="mx-auto w-full max-w-screen-2xl px-4 md:px-6 lg:px-8 py-8 space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold font-display tracking-tight text-neutral-900">Dashboard v2</h1>
                    <div className="text-sm text-neutral-500 font-medium mt-1">
                        Overview for {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </div>
                </div>
                <div className="flex gap-2">
                    <button onClick={() => refreshAll()} className="p-2.5 bg-white border border-neutral-200 hover:bg-neutral-50 rounded-xl text-neutral-500 hover:text-black transition-colors shadow-sm" title="Refresh">🔄</button>
                    <Link href="/planner" className="rounded-xl bg-neutral-900 text-white px-5 py-2.5 text-sm font-medium hover:bg-black shadow-lg hover:-translate-y-0.5 transition-all">
                        Open Planner
                    </Link>
                </div>
            </div>

            {/* Row 1: Workspace Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <WorkspaceCard workspace="avacrm" tasks={wsTasks['avacrm']} onQuickAdd={handleQuickAddTask} todayYmd={todayYmd} className="h-full" />
                <WorkspaceCard workspace="ops" tasks={wsTasks['ops']} onQuickAdd={handleQuickAddTask} todayYmd={todayYmd} className="h-full" />
                <WorkspaceCard workspace="content" tasks={wsTasks['content']} onQuickAdd={handleQuickAddTask} todayYmd={todayYmd} className="h-full" />
            </div>

            {/* Row 2: Timeline & Calendar */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 h-auto lg:h-[320px]">
                <div className="lg:col-span-2 h-full">
                    <ProjectTimeline tasks={tasks} todayYmd={todayYmd} />
                </div>
                <div className="lg:col-span-1 h-full flex flex-col">
                    <Card title="Calendar" className="flex-1 flex flex-col h-full overflow-hidden">
                        {gcalUrl ? (
                            <div className="flex-1 rounded-lg overflow-hidden border border-neutral-100 bg-neutral-50">
                                <iframe src={gcalUrl} className="w-full h-full border-0" frameBorder="0" scrolling="no"></iframe>
                            </div>
                        ) : (
                            <div className="flex-1 flex flex-col overflow-hidden">
                                <div className="flex-1 overflow-y-auto pr-1 space-y-2">
                                    {events.slice(0, 10).map(ev => (
                                        <div key={ev.id} className="flex gap-3 items-center p-2 hover:bg-neutral-50 rounded-lg transition-colors border border-transparent hover:border-neutral-100">
                                            <div className="flex-none text-center min-w-[40px] bg-neutral-50 border border-neutral-100 rounded-lg p-1">
                                                <div className="text-[9px] uppercase font-bold text-neutral-500">{new Date(ev.start_time).toLocaleDateString('en-US', { month: 'short' })}</div>
                                                <div className="text-lg font-bold leading-none text-neutral-900">{new Date(ev.start_time).getDate()}</div>
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <div className="text-sm font-medium truncate text-neutral-800">{ev.title}</div>
                                                <div className="text-xs text-neutral-500 flex items-center gap-1">
                                                    {ev.all_day ? "All Day" : fmtTimeLocal(ev.start_time)}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                    {events.length === 0 && <div className="text-center text-sm text-neutral-400 py-10 italic">No upcoming events found</div>}
                                </div>
                                <div className="pt-3 mt-2 border-t border-neutral-100">
                                    <Link href="/calendar" className="block text-center text-xs text-neutral-500 hover:text-black font-medium py-1 rounded hover:bg-neutral-50 transition-colors">
                                        Open Full Calendar →
                                    </Link>
                                </div>
                            </div>
                        )}
                    </Card>
                </div>
            </div>

            {/* Row 3: Work Strip */}
            <div>
                <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-widest mb-3 ml-1">More Workspaces</h3>
                <WorkStrip workspaces={['finance', 'travel', 'admin', 'personal', 'other']} tasks={tasks} todayYmd={todayYmd} />
            </div>

            {/* Row 4: Email & System */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <Card title="Quick Links" className="h-full bg-gradient-to-br from-white to-neutral-50/50">
                    <div className="grid grid-cols-4 gap-4">
                        <a href="https://gmail.com" target="_blank" className="aspect-square flex flex-col items-center justify-center p-2 rounded-xl border border-neutral-200 bg-white hover:border-red-200 hover:shadow-md transition-all group">
                            <span className="text-3xl mb-2 group-hover:scale-110 transition-transform">📧</span>
                            <span className="text-[10px] font-bold text-neutral-600 uppercase tracking-wide">Gmail</span>
                        </a>
                        <a href="https://calendar.google.com" target="_blank" className="aspect-square flex flex-col items-center justify-center p-2 rounded-xl border border-neutral-200 bg-white hover:border-blue-200 hover:shadow-md transition-all group">
                            <span className="text-3xl mb-2 group-hover:scale-110 transition-transform">📅</span>
                            <span className="text-[10px] font-bold text-neutral-600 uppercase tracking-wide">Calendar</span>
                        </a>
                        <button disabled className="aspect-square flex flex-col items-center justify-center p-2 rounded-xl border border-neutral-100 bg-neutral-50 opacity-60 cursor-not-allowed">
                            <span className="text-3xl mb-2 grayscale">💬</span>
                            <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wide">Chat</span>
                        </button>
                    </div>
                </Card>

                <Card title="System Health" className="h-full border-l-4 border-l-green-500">
                    <div className="flex items-center gap-4 mb-4">
                        <div className={`text-3xl ${health?.ok ? 'text-green-500' : 'text-red-500'}`}>{health?.ok ? '✅' : '⚠️'}</div>
                        <div>
                            <div className="text-base font-bold text-neutral-900">{health?.status || "Checking..."}</div>
                            <div className="text-xs text-neutral-500">Database & API Status</div>
                        </div>
                        <div className="ml-auto text-xs font-mono bg-neutral-100 px-2.5 py-1 rounded text-neutral-500">v2.0.0</div>
                    </div>
                    <div className="flex gap-3">
                        <button onClick={() => window.location.href = "/api/export-zip"} className="flex-1 py-2.5 px-4 rounded-xl bg-neutral-900 text-white text-sm font-medium hover:bg-black hover:shadow-lg transition-all flex items-center justify-center gap-2">
                            <span>💾</span> Backup Data
                        </button>
                        <Link href="/settings/data" className="flex-1 py-2.5 px-4 rounded-xl border border-neutral-200 text-neutral-700 text-sm font-medium hover:bg-neutral-50 transition-colors flex items-center justify-center gap-2">
                            <span>⚙️</span> Settings
                        </Link>
                    </div>
                </Card>
            </div>

            {/* Quick Add Modals */}
            <Modal open={quickAdd === "template"} title="New Content Project" onClose={() => setQuickAdd(null)}>
                <form onSubmit={handleCreateContentTemplate} className="space-y-5">
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold uppercase tracking-wide text-neutral-500">Project Title</label>
                        <input autoFocus className="w-full rounded-xl border border-neutral-200 px-4 py-2.5 text-sm focus:border-purple-500 focus:outline-none transition-all placeholder:text-neutral-400" placeholder="e.g. iPhone 16 Review" value={qaTitle} onChange={(e) => setQaTitle(e.target.value)} />
                    </div>
                    {qaErr && <div className="text-sm text-red-600 bg-red-50 p-3 rounded-xl border border-red-100 flex items-center gap-2"><span>⚠️</span>{qaErr}</div>}
                    <div className="flex justify-end gap-3 pt-2">
                        <button type="button" className="rounded-xl border border-neutral-200 px-4 py-2 text-sm font-medium text-neutral-600 hover:bg-neutral-50" onClick={() => setQuickAdd(null)}>Cancel</button>
                        <button type="submit" disabled={isSubmitting} className="rounded-xl bg-purple-600 px-6 py-2 text-sm font-medium text-white hover:bg-purple-700 shadow-sm transition-all">{isSubmitting ? "Generating..." : "Create Project"}</button>
                    </div>
                </form>
            </Modal>

            <Modal open={quickAdd === "task"} title={`New Task: ${workspaceLabel(qaWorkspace)}`} onClose={() => setQuickAdd(null)}>
                <form className="space-y-4" onSubmit={async (e) => {
                    e.preventDefault();
                    if (!qaTitle.trim() || isSubmitting) return;
                    setIsSubmitting(true);
                    setQaErr(null);
                    try {
                        const payload: any = { title: qaTitle, workspace: qaWorkspace };
                        if (taskAddToToday) { payload.status = "planned"; payload.scheduled_date = todayYmd; payload.schedule_bucket = taskBucket; }
                        else { payload.status = "inbox"; }
                        await postJson("/api/tasks", payload);
                        await refreshAll();
                        setQaTitle("");
                        setQuickAdd(null);
                    } catch (err: any) { setQaErr(err.message || "Failed"); } finally { setIsSubmitting(false); }
                }}>
                    <div className="space-y-1.5">
                        <div className="text-xs text-neutral-500 font-bold uppercase tracking-wide">Task Title</div>
                        <input className="w-full rounded-xl border border-neutral-200 px-4 py-2.5 text-sm focus:border-black focus:outline-none placeholder:text-neutral-400" value={qaTitle} onChange={(e) => setQaTitle(e.target.value)} placeholder="e.g., Follow up with client" autoFocus />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <div className="text-xs text-neutral-500 font-bold uppercase tracking-wide">Workspace</div>
                            <select className="w-full rounded-xl border border-neutral-200 px-4 py-2.5 text-sm focus:border-black focus:outline-none bg-white" value={qaWorkspace} onChange={(e) => setQaWorkspace(e.target.value as Workspace)}>
                                {WORKSPACES.map((w) => <option key={w} value={w}>{workspaceLabel(w)}</option>)}
                            </select>
                        </div>
                        <div className="space-y-1.5">
                            <div className="text-xs text-neutral-500 font-bold uppercase tracking-wide">Schedule</div>
                            <label className="flex h-[42px] items-center gap-3 cursor-pointer text-sm font-medium border border-neutral-200 rounded-xl px-4 bg-white hover:border-neutral-300 transition-colors">
                                <input type="checkbox" className="rounded border-neutral-300 text-black focus:ring-black" checked={taskAddToToday} onChange={(e) => setTaskAddToToday(e.target.checked)} /> Add to Today
                            </label>
                        </div>
                    </div>
                    {taskAddToToday && (
                        <div className="space-y-1.5">
                            <div className="text-xs text-neutral-500 font-bold uppercase tracking-wide">Time Slot</div>
                            <select className="w-full rounded-xl border border-neutral-200 px-4 py-2.5 text-sm focus:border-black focus:outline-none bg-white" value={taskBucket} onChange={(e) => setTaskBucket(e.target.value as any)}>
                                <option value="morning">Morning</option>
                                <option value="afternoon">Afternoon</option>
                                <option value="evening">Evening</option>
                            </select>
                        </div>
                    )}
                    {qaErr && <div className="text-sm text-red-600 bg-red-50 p-3 rounded-xl border-red-100 flex items-center gap-2"><span>⚠️</span>{qaErr}</div>}
                    <div className="flex justify-end gap-3 pt-3 border-t border-neutral-100">
                        <button type="button" className="rounded-xl border border-neutral-200 px-4 py-2 text-sm font-medium text-neutral-600 hover:bg-neutral-50" onClick={() => setQuickAdd(null)}>Cancel</button>
                        <button type="submit" disabled={isSubmitting} className="rounded-xl bg-black px-6 py-2 text-sm font-medium text-white hover:bg-neutral-800 shadow-md hover:shadow-lg transition-all">{isSubmitting ? "Creating..." : "Create Task"}</button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
