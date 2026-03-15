"use client";

import TaskEditorDialog from "@/components/TaskDetailDialog";
import BulkTaskDialog from "@/components/BulkTaskDialog";
import Link from "next/link";
import { WORKSPACES, WORKSPACES_LIST, workspaceLabel, type Workspace } from "@/lib/workspaces";
import { INPUT_BASE, LABEL_BASE, BUTTON_PRIMARY, BUTTON_SECONDARY } from "@/lib/styles";
import { useEffect, useMemo, useState, useCallback, Suspense } from "react";
import { PageShell } from "@/components/layout/PageShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { 
    PlusSquare, FileText, CalendarPlus, Zap, LayoutGrid, LucideIcon, Bot, List, 
    MoreHorizontal, ChevronDown, CheckCircle2, Layout, Plus, Box, Target, 
    Activity, History, Folder, AlertCircle, Clock 
} from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import Topbar from "@/components/Topbar";
import { WorkBucketCard } from "@/components/dashboard/WorkBucketCard";
import { HomeFirstRunCard } from "@/components/dashboard/HomeFirstRunCard";
import WorkloadSummaryCard from "@/components/WorkloadSummaryCard";
import ProjectHealthGrid from "@/components/ProjectHealthGrid";
import KnowledgeActivityCard from "@/components/KnowledgeActivityCard";
import { ResetDemoDataDialog } from "@/components/ResetDemoDataDialog";
import { CreateProjectWizard } from "@/components/dashboard/CreateProjectWizard";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { Task, TaskStatus } from "@/lib/types";
import { STAGE_TAGS, ContentStage } from "@/lib/content/templates";
import { createContentTask } from "@/lib/content/createContentTask";

// --- Types ---

type ScheduleBucket = "morning" | "afternoon" | "evening";

type DashboardTask = Task & {
    tags: string[];
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
            // @ts-expect-error dynamic key access
            const maybe = v[k];
            if (Array.isArray(maybe)) return maybe as T[];
        }
    }
    return [];
}

async function fetchWithTimeout(url: string, init?: RequestInit, timeoutMs = 15000) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const response = await fetch(url, { ...init, signal: controller.signal });
        return response;
    } finally {
        clearTimeout(id);
    }
}

async function fetchTasks(params: Record<string, string>) {
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) sp.set(k, v);
    const res = await fetchWithTimeout(`/api/tasks?${sp.toString()}`, { cache: "no-store" });
    if (!res.ok) throw new Error(`tasks: HTTP ${res.status} `);
    const data: unknown = await res.json();
    const rows = pickArray<Task>(data);

    // Client-side Tag Parsing (No DB changes)
    return (rows as unknown as Task[]).map(t => {
        const matches = t.title.match(/(?:^|\s)(project:[\w-]+|#[\w-]+)/g);
        const tags = matches ? matches.map(s => s.trim()) : [];
        return { ...t, tags } as DashboardTask;
    });
}

type EventRow = Record<string, unknown>;

function mapEventRow(raw: EventRow): CalendarEvent {
    return {
        id: String(raw.id ?? ""),
        workspace: String(raw.workspace ?? ""),
        title: String(raw.title ?? ""),
        all_day: raw.all_day === 1 || raw.all_day === true,
        start_time: String(raw.start_time ?? ""),
        end_time: raw.end_time != null ? String(raw.end_time) : null,
        kind: raw.kind != null ? String(raw.kind) : null,
        description: raw.description != null ? String(raw.description) : null,
    };
}

async function fetchEvents(params: Record<string, string>) {
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) sp.set(k, v);
    const res = await fetchWithTimeout(`/api/events?${sp.toString()}`, { cache: "no-store" });
    if (!res.ok) throw new Error(`events: HTTP ${res.status} `);
    const raw: unknown = await res.json();
    return pickArray<unknown>(raw).map(r => mapEventRow((r ?? {}) as EventRow));
}

async function fetchDocs(params: Record<string, string>) {
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) sp.set(k, v);
    const res = await fetchWithTimeout(`/api/docs?${sp.toString()}`, { cache: "no-store" });
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
    if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`Create failed (${res.status}): ${text || res.statusText}`);
    }
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
        <div className={`rounded-2xl border border-neutral-200/70 bg-white p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col ${props.className || ""}`}>
            <div className="mb-4 flex items-center justify-between gap-3 border-b border-neutral-50 pb-2 flex-none">
                <div className="text-sm font-semibold text-neutral-900 uppercase tracking-wide">{props.title}</div>
                {props.right}
            </div>
            <div className="flex-1 min-h-0">
                {props.children}
            </div>
        </div>
    );
}

function StatBadge(props: { value: number; label: string; colorClass: string; href?: string; compact?: boolean }) {
    const content = (
        <div className={`flex flex-col items-center justify-center rounded-xl border ${props.colorClass} transition-transform hover:scale-105 ${props.compact ? 'p-1.5' : 'p-2'}`}>
            <div className={`${props.compact ? 'text-lg' : 'text-xl'} font-bold leading-none`}>{props.value}</div>
            <div className="text-[9px] font-bold uppercase tracking-wider opacity-80 mt-1">{props.label}</div>
        </div>
    );
    if (props.href) return <Link href={props.href} className="block">{content}</Link>;
    return content;
}

function WorkspaceCard(props: {
    workspace: Workspace;
    tasks: DashboardTask[];
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
                // Priority: Overdue > Scheduled > Inbox
                const da = a.scheduled_date || '9999-99-99';
                const db = b.scheduled_date || '9999-99-99';
                return da.localeCompare(db);
            })
            .slice(0, 4); // Limit to 4 for compactness
    }, [tasks]);

    // Additional Density Logic
    const overdueList = useMemo(() => {
        return tasks.filter(t => t.scheduled_date && t.scheduled_date < todayYmd && t.status !== "done").slice(0, 3);
    }, [tasks, todayYmd]);

    const title = workspaceLabel(workspace);
    const colorMap: Record<string, string> = {
        avacrm: "text-blue-600 bg-blue-50 border-blue-100",
        ops: "text-orange-600 bg-orange-50 border-orange-100",
        content: "text-purple-600 bg-purple-50 border-purple-100",
        default: "text-neutral-600 bg-neutral-50 border-neutral-100"
    };
    const theme = colorMap[workspace] || colorMap.default;

    return (
        <Card title={title} className={props.className}>
            <div className="flex-none grid grid-cols-3 gap-2 mb-3">
                <StatBadge value={stats.overdue} label="Overdue" colorClass="bg-red-50 text-red-600 border-red-100" href={`/planner?filter=overdue&workspace=${workspace}`} compact />
                <StatBadge value={stats.today} label="Today" colorClass={theme} href={`/planner?workspace=${workspace}`} compact />
                <StatBadge value={stats.inbox} label="Inbox" colorClass="bg-neutral-50 text-neutral-600 border-neutral-100" href={`/inbox?workspace=${workspace}`} compact />
            </div>

            {/* Contextual Density: Show overdue list if overdue > 0, else show top tasks */}
            {stats.overdue > 0 ? (
                <div className="space-y-1">
                    <div className="text-[10px] font-bold text-red-500 uppercase tracking-widest mb-1.5 flex items-center gap-1">
                        <span>🔥 Attention Needed</span>
                    </div>
                    {overdueList.map(t => (
                        <Link key={t.id} href={`?taskId=${t.id}`} scroll={false} replace className="flex items-center gap-2 text-xs py-1.5 border-b border-neutral-50 last:border-0 hover:bg-red-50 px-1 -mx-1 rounded group">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                            <span className="truncate flex-1 font-medium text-neutral-800 group-hover:text-red-700">{t.title}</span>
                            <span className="text-[9px] text-red-400 font-mono">{t.scheduled_date?.slice(5)}</span>
                        </Link>
                    ))}
                    {topTasks.length > overdueList.length && (
                        <div className="pt-2 text-[10px] text-neutral-400 text-center">+ {topTasks.length - overdueList.length} more active tasks</div>
                    )}
                </div>
            ) : (
                <div className="space-y-1">
                    <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-1.5">Next Up</div>
                    {topTasks.map(t => (
                        <Link key={t.id} href={`?taskId=${t.id}`} scroll={false} replace className="flex items-center gap-2 text-xs py-1.5 border-b border-neutral-50 last:border-0 hover:bg-neutral-50 px-1 -mx-1 rounded group">
                            <span className={`w-1.5 h-1.5 rounded-full ${t.scheduled_date && t.scheduled_date === todayYmd ? 'bg-green-500' : 'bg-neutral-300'}`} />
                            <span className="truncate flex-1 font-medium text-neutral-700 group-hover:text-black">{t.title}</span>
                            {t.scheduled_date && <span className="text-[9px] text-neutral-400">{t.scheduled_date.slice(5)}</span>}
                        </Link>
                    ))}
                    {topTasks.length === 0 && <div className="text-center text-xs text-neutral-400 py-4 italic">All caught up! 🎉</div>}
                </div>
            )}
        </Card>
    );
}

// Helper for Tabbed Feed
function addDays(d: Date, days: number) {
    const x = new Date(d);
    x.setDate(x.getDate() + days);
    return x;
}

type CalendarFeedMode = "today" | "tomorrow" | "upcoming";

// --- New Components for PR 8.4 ---

function AgendaCardBig(props: { events: CalendarEvent[]; className?: string; todayYmd: string }) {
    const [feedMode, setFeedMode] = useState<CalendarFeedMode>("today");

    const feedEvents = useMemo(() => {
        const today = new Date();
        const todayYmd = toYmdLocal(today);
        const tomorrowYmd = toYmdLocal(addDays(today, 1));
        const upcomingEnd = addDays(today, 30);
        const upcomingEndYmd = toYmdLocal(upcomingEnd);

        // Enrich with local YMD for safe comparison
        const all = props.events.map(e => ({
            ...e,
            _localYmd: toYmdLocal(new Date(e.start_time))
        }));

        let targetEvents = [];

        if (feedMode === "today") {
            targetEvents = all.filter(e => e._localYmd === todayYmd);
        } else if (feedMode === "tomorrow") {
            targetEvents = all.filter(e => e._localYmd === tomorrowYmd);
        } else {
            // Upcoming: Today -> 30 Days (Inclusive)
            targetEvents = all.filter(e => e._localYmd >= todayYmd && e._localYmd <= upcomingEndYmd);
        }

        return targetEvents.sort((a, b) => a.start_time.localeCompare(b.start_time));
    }, [props.events, feedMode]);

    return (
        <Card title="Agenda" className={`flex flex-col ${props.className || ""}`} right={
            <div className="flex items-center gap-1 bg-neutral-50 p-1 rounded-lg">
                {(["today", "tomorrow", "upcoming"] as const).map(mode => (
                    <button
                        key={mode}
                        onClick={() => setFeedMode(mode)}
                        className={`
                            px-3 py-1 text-[10px] font-bold uppercase tracking-wide rounded-md transition-all
                            ${feedMode === mode ? 'bg-white text-black shadow-sm ring-1 ring-black/5' : 'text-neutral-500 hover:text-neutral-700'}
                        `}
                    >
                        {mode}
                    </button>
                ))}
            </div>
        }>
            <div className="flex flex-col h-full overflow-hidden">
                <div className="text-xs text-neutral-400 mb-3 ml-1">
                    {feedMode === "today" ? "Today's Schedule" : feedMode === "tomorrow" ? "Tomorrow's Schedule" : "Next 30 Days"}
                </div>

                <div className="flex-1 overflow-y-auto min-h-0 pr-1 space-y-2 scrollbar-thin">
                    {feedEvents.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-neutral-400 py-10">
                            <div className="text-2xl mb-2 opacity-50">🏝️</div>
                            <div className="text-sm italic">No {feedMode} events</div>
                        </div>
                    ) : (
                        feedEvents.map((e) => (
                            <div key={e.id} className="py-3 flex items-start gap-4 p-3 rounded-xl border border-neutral-100 hover:border-neutral-200 hover:bg-neutral-50 transition-colors group">
                                <div className="w-12 shrink-0 rounded-lg border border-neutral-200 bg-white text-center py-2 group-hover:border-neutral-300 transition-colors">
                                    <div className="text-[9px] uppercase font-bold text-neutral-400 leading-none mb-0.5">
                                        {new Date(e.start_time).toLocaleString("en-US", { month: "short" })}
                                    </div>
                                    <div className="text-lg font-bold leading-none text-neutral-900">
                                        {new Date(e.start_time).getDate()}
                                    </div>
                                </div>

                                <div className="min-w-0 flex-1 pt-0.5">
                                    <div className="text-sm font-semibold truncate text-neutral-900 leading-tight">{e.title}</div>
                                    <div className="text-xs text-neutral-500 mt-1 flex items-center gap-2">
                                        <span className={`px-1.5 py-0.5 rounded text-[10px] uppercase tracking-wider font-bold ${e.all_day ? 'bg-blue-50 text-blue-600' : 'bg-neutral-100 text-neutral-600'}`}>
                                            {e.all_day ? "All Day" : fmtTimeLocal(e.start_time)}
                                        </span>
                                        {e.workspace && <span className="text-[10px] text-neutral-400">• {workspaceLabel(e.workspace as Workspace)}</span>}
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                <div className="mt-3 pt-3 border-t border-neutral-50 flex justify-end">
                    <Link href="/calendar" className="text-xs font-medium text-neutral-500 hover:text-neutral-900 flex items-center gap-1">
                        View Full Calendar <span>→</span>
                    </Link>
                </div>
            </div>
        </Card>
    );
}

function MiniMonthCard(props: { events: CalendarEvent[]; todayYmd: string; onOpenGCal?: () => void; className?: string }) {
    const [currentMonth, setCurrentMonth] = useState(new Date());

    // Group events for dots
    const eventsByDate = useMemo(() => {
        const map: Record<string, CalendarEvent[]> = {};
        props.events.forEach(e => {
            const ymd = e.start_time.slice(0, 10);
            if (!map[ymd]) map[ymd] = [];
            map[ymd].push(e);
        });
        return map;
    }, [props.events]);

    const calendarDays = useMemo(() => {
        const year = currentMonth.getFullYear();
        const month = currentMonth.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);

        const days = [];
        for (let i = 0; i < firstDay.getDay(); i++) days.push({ day: 0, date: '', inMonth: false });
        for (let i = 1; i <= lastDay.getDate(); i++) {
            const date = `${year}-${pad2(month + 1)}-${pad2(i)}`;
            days.push({ day: i, date: date, inMonth: true });
        }
        while (days.length % 7 !== 0) days.push({ day: 0, date: '', inMonth: false });
        return days;
    }, [currentMonth]);

    const changeMonth = (delta: number) => {
        const next = new Date(currentMonth);
        next.setMonth(currentMonth.getMonth() + delta);
        setCurrentMonth(next);
    };

    return (
        <Card title="Calendar" className={`flex flex-col ${props.className || ""}`} right={
            props.onOpenGCal ? (
                <button onClick={props.onOpenGCal} className="text-[10px] font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded hover:bg-blue-100 transition-colors flex items-center gap-1">
                    <span>📅</span> GCal
                </button>
            ) : null
        }>
            <div className="flex flex-col h-full">
                <div className="flex items-center justify-between mb-4 px-2">
                    <button onClick={() => changeMonth(-1)} className="p-1 hover:bg-neutral-100 rounded text-neutral-500">◀</button>
                    <span className="text-sm font-bold text-neutral-800">
                        {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                    </span>
                    <button onClick={() => changeMonth(1)} className="p-1 hover:bg-neutral-100 rounded text-neutral-500">▶</button>
                </div>

                <div className="grid grid-cols-7 text-center mb-2">
                    {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => <div key={d} className="text-[10px] font-bold text-neutral-400 py-1">{d}</div>)}
                </div>

                <div className="grid grid-cols-7 gap-1 flex-1 content-start">
                    {calendarDays.map((d, i) => {
                        if (!d.inMonth) return <div key={i} />;
                        const isToday = d.date === props.todayYmd;
                        const hasEvents = eventsByDate[d.date]?.length > 0;

                        return (
                            <div key={i}
                                className={`
                                    aspect-square rounded-lg flex flex-col items-center justify-center relative transition-all cursor-default
                                    ${isToday ? 'bg-neutral-900 text-white font-bold shadow-md' : 'text-neutral-700 hover:bg-neutral-50'}
                                `}
                            >
                                <span className="text-xs leading-none">{d.day}</span>
                                {hasEvents && !isToday && (
                                    <span className="absolute bottom-1.5 w-1 h-1 rounded-full bg-red-500" />
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </Card>
    );
}

function ProjectTimeline(props: { tasks: DashboardTask[]; todayYmd: string; className?: string }) {
    const projects = useMemo(() => {
        const map = new Map<string, DashboardTask[]>();
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

    // Summary if needed
    const totalProjects = projects.length;
    const totalScheduled = projects.reduce((acc, [_, items]) => acc + items.length, 0);

    if (projects.length === 0) return (
        <Card title="Project Timeline" className={`h-full min-h-[150px] flex items-center justify-center ${props.className || ""}`}>
            <div className="text-center">
                <div className="text-neutral-300 text-2xl mb-1">📊</div>
                <div className="text-xs text-neutral-400">No active projects (tag: <code>project:name</code>)</div>
            </div>
        </Card>
    );

    return (
        <Card title={`Project Timeline (14 Days)`} right={<span className="text-[10px] text-neutral-400 font-normal">{totalProjects} Projects, {totalScheduled} Tasks</span>} className={`h-full overflow-x-auto ${props.className || ""}`}>
            <div className="min-w-full">
                <div className="grid grid-cols-[100px_1fr] gap-3 mb-2 border-b border-neutral-100 pb-1">
                    <div className="text-[9px] uppercase font-bold text-neutral-400 self-end">Project</div>
                    <div className="grid grid-cols-14 gap-px">
                        {days.map(d => (
                            <div key={d} className="text-[8px] text-center text-neutral-400 font-medium overflow-hidden">
                                {d.slice(8)}
                            </div>
                        ))}
                    </div>
                </div>
                <div className="space-y-3">
                    {projects.map(([projName, items]) => (
                        <div key={projName} className="grid grid-cols-[100px_1fr] gap-3 items-center group">
                            <Link href={`/planner?q=project:${projName}`} className="text-xs font-semibold text-neutral-700 truncate hover:text-blue-600 hover:underline" title={projName}>
                                {projName}
                                <span className="block text-[8px] font-normal text-neutral-400">{items.length} tasks</span>
                            </Link>
                            <div className="grid grid-cols-14 gap-px h-5 bg-neutral-50 rounded p-px">
                                {days.map(d => {
                                    const tasksOnDay = items.filter(t => t.scheduled_date === d);
                                    if (tasksOnDay.length === 0) return <div key={d} className="h-full rounded-sm hover:bg-neutral-100 transition-colors" />;
                                    return (
                                        <div key={d} className="relative group/day h-full">
                                            <div className="w-full h-full rounded-sm bg-blue-400 hover:bg-blue-600 cursor-pointer shadow-sm transition-colors opacity-80 hover:opacity-100"></div>
                                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover/day:block bg-black text-white text-[9px] p-2 rounded whitespace-nowrap z-20 shadow-xl pointer-events-none">
                                                <div className="font-bold border-b border-white/20 pb-1 mb-1">{d}</div>
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

function OtherWorkspacesList(props: { tasks: DashboardTask[]; todayYmd: string; className?: string }) {
    const workspaces: Workspace[] = ['finance', 'travel', 'admin', 'personal', 'other'];

    const rows = workspaces.map(w => {
        const wsTasks = props.tasks.filter(t => t.workspace === w && t.status !== 'done');
        const activeCount = wsTasks.length;
        // Find next task: sort by scheduled_date (asc), then by id (pseudo-created)
        const nextTask = wsTasks.sort((a, b) => {
            const da = a.scheduled_date || '9999-99-99';
            const db = b.scheduled_date || '9999-99-99';
            return da.localeCompare(db);
        })[0];
        return { w, activeCount, nextTask };
    });

    return (
        <Card title="Other Workspaces" className={`flex flex-col ${props.className || ""}`}>
            <div className="flex-1 space-y-3 pt-1">
                {rows.map(({ w, activeCount, nextTask }) => (
                    <Link key={w} href={`/planner?workspace=${w}`} className="grid grid-cols-[80px_40px_1fr] gap-3 items-center group hover:bg-neutral-50 -mx-2 px-2 py-1.5 rounded-lg transition-colors">
                        <div className="text-xs font-bold text-neutral-600 uppercase tracking-wide group-hover:text-black">{workspaceLabel(w)}</div>
                        <div className="text-center">
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${activeCount > 0 ? 'bg-neutral-200 text-neutral-800' : 'bg-neutral-100 text-neutral-400'}`}>
                                {activeCount}
                            </span>
                        </div>
                        <div className="min-w-0">
                            {nextTask ? (
                                <div className="text-xs truncate text-neutral-500 group-hover:text-neutral-800">
                                    <span className="font-medium text-neutral-700">{nextTask.title}</span>
                                    {nextTask.scheduled_date && <span className="ml-1.5 opacity-60 text-[10px]">{nextTask.scheduled_date.slice(5)}</span>}
                                </div>
                            ) : (
                                <div className="text-[10px] text-neutral-300 italic">No active tasks</div>
                            )}
                        </div>
                    </Link>
                ))}
            </div>
            <div className="mt-auto pt-3 border-t border-neutral-100 text-center">
                <Link href="/planner" className="text-[10px] font-bold text-neutral-400 hover:text-black uppercase tracking-widest">
                    View All in Planner
                </Link>
            </div>
        </Card>
    );
}


// --- Main Dashboard ---

export default function DashboardClient() {
    console.log("DashboardClient WORKSPACES_LIST:", WORKSPACES_LIST.map(w => w.id).join(","));
    return <DashboardContent />;
}

function DashboardContent() {
    const todayYmd = useMemo(() => toYmdLocal(new Date()), []);
    const sp = useSearchParams();
    const router = useRouter();

    // Controlled Modals
    const [isBulkOpen, setIsBulkOpen] = useState(false);
    const [isNewEventOpen, setIsNewEventOpen] = useState(false);
    const [isNewTaskOpen, setIsNewTaskOpen] = useState(false);
    const [isResetOpen, setIsResetOpen] = useState(false);
    const [isWizardOpen, setIsWizardOpen] = useState(false);
    const [showSuccessToast, setShowSuccessToast] = useState(false);
    const [toastMessage, setToastMessage] = useState("Success!");
    const [isMoreOpen, setIsMoreOpen] = useState(false);

    useEffect(() => {
        if (sp.get("bulkPaste") === "1") {
            setIsBulkOpen(true);
            router.replace("/dashboard");
        }
        if (sp.get("newEvent") === "1") {
            setIsNewEventOpen(true);
            router.replace("/dashboard");
        }
        if (sp.get("newTask") === "1") {
            setIsNewTaskOpen(true);
            router.replace("/dashboard");
        }
        if (sp.get("resetDemo") === "1") {
            setIsResetOpen(true);
            router.replace("/dashboard");
        }
        if (sp.get("newProject") === "1") {
            setIsWizardOpen(true);
            router.replace("/dashboard");
        }
    }, [sp, router]);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [tasks, setTasks] = useState<DashboardTask[]>([]);
    const [events, setEvents] = useState<CalendarEvent[]>([]);
    const [docs, setDocs] = useState<DocRow[]>([]);
    const [analytics, setAnalytics] = useState<any>(null);
    const [health, setHealth] = useState<{ ok: boolean; status: string } | null>(null);

    const [quickAdd, setQuickAdd] = useState<"task" | "template" | null>(null);
    const [qaTitle, setQaTitle] = useState("");
    const [qaErr, setQaErr] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [qaWorkspace, setQaWorkspace] = useState<Workspace>("content");

    // New Event State
    const [newEventTitle, setNewEventTitle] = useState("");
    const [newEventDate, setNewEventDate] = useState(todayYmd);

    // New Task State Extended
    const [newTaskTitle, setNewTaskTitle] = useState("");
    const [newTaskWs, setNewTaskWs] = useState<Workspace>("avacrm");
    const [newTaskStatus, setNewTaskStatus] = useState<TaskStatus>("inbox");
    const [newTaskDate, setNewTaskDate] = useState(todayYmd);
    const [newTaskPriority, setNewTaskPriority] = useState(2);
    const [newTaskNotes, setNewTaskNotes] = useState("");
    const [newTaskError, setNewTaskError] = useState<string | null>(null);

    // Content Specific State
    const [contentTab, setContentTab] = useState<"details" | "content">("details");
    const [contentProject, setContentProject] = useState("");
    const [contentStage, setContentStage] = useState<ContentStage>(STAGE_TAGS[0]);
    const [contentPlatforms, setContentPlatforms] = useState<string[]>([]);

    const togglePlatform = (p: string) => {
        setContentPlatforms(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]);
    };

    // Active Task for Detail Modal (Link from WorkspaceCard)
    const taskIdParam = sp.get("taskId");
    const activeTask = useMemo(() => {
        if (!taskIdParam) return null;
        // Search in all loaded tasks
        return tasks.find(t => t.id === taskIdParam) || null;
    }, [tasks, taskIdParam]);

    const handleCloseTaskDetail = useCallback(() => {
        const params = new URLSearchParams(sp.toString());
        params.delete("taskId");
        router.replace(params.toString() ? `/dashboard?${params.toString()}` : "/dashboard", { scroll: false });
    }, [sp, router]);


    const refreshAll = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const [allTasks, allEvents, allDocs, summary, healthRes] = await Promise.all([
                fetchTasks({ limit: "1000" }),
                fetchEvents({ start: toUtcIso(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)), end: toUtcIso(new Date(Date.now() + 60 * 24 * 60 * 60 * 1000)) }),
                fetchDocs({ limit: "100" }),
                fetchWithTimeout("/api/analytics/summary").then(res => res.json()).catch(() => null),
                fetchWithTimeout("/api/health").then(res => ({ ok: res.ok })).catch(() => ({ ok: false }))
            ]);

            setTasks(allTasks);
            setEvents(allEvents);
            setDocs(allDocs);
            setAnalytics(summary);
            setHealth({ ok: healthRes.ok, status: healthRes.ok ? "OK" : "Degraded" });

        } catch (e: any) {
            console.error("Refresh failed", e);
            const msg = e?.name === "AbortError"
                ? "Request timed out (15s). Please retry."
                : (e?.message || "Failed to load dashboard data");
            setError(msg);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { refreshAll(); }, [refreshAll]);

    const wsTasks = useMemo(() => {
        const grouped: Record<string, DashboardTask[]> = {};
        WORKSPACES.forEach(w => grouped[w] = []);
        tasks.forEach(t => {
            if (t.workspace && grouped[t.workspace]) grouped[t.workspace].push(t);
            else if (grouped['other']) grouped['other'].push(t); // Fallback
        });
        return grouped;
    }, [tasks]);

    const handleQuickAddTask = (w: Workspace | undefined) => {
        if (w) setNewTaskWs(w);
        // Reset defaults
        setNewTaskStatus("inbox");
        setNewTaskDate(todayYmd);
        setNewTaskPriority(2);
        setNewTaskNotes("");

        // Reset Content defaults
        setContentTab("details");
        setContentProject("");
        setContentStage(STAGE_TAGS[0]);
        setContentPlatforms([]);

        // Open
        setIsNewTaskOpen(true);
    };

    const handleCreateTask = async (e: React.FormEvent) => {
        e.preventDefault();
        setNewTaskError(null);
        if (!newTaskTitle.trim() || isSubmitting) return;
        setIsSubmitting(true);
        try {
            let finalTitle = newTaskTitle.trim();

            // Compose Content Title
            if (newTaskWs === 'content') {
                const parts = [];
                if (contentProject.trim()) parts.push(`project:${contentProject.trim()}`);
                parts.push(finalTitle);
                if (contentStage && contentStage !== STAGE_TAGS[0]) parts.push(`#${contentStage}`); // contentStage is already like 'stage:script'
                contentPlatforms.forEach(p => parts.push(`#${p}`));
                finalTitle = parts.join(" ");
            }

            await postJson("/api/tasks", {
                title: finalTitle,
                workspace: newTaskWs,
                status: newTaskStatus,
                scheduled_date: newTaskStatus === 'planned' ? (newTaskDate || todayYmd) : null,
                priority: newTaskPriority,
                notes: newTaskNotes || null
            });
            await refreshAll();
            setIsNewTaskOpen(false);
            setNewTaskTitle("");
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : String(err);
            setNewTaskError(msg);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCreateEvent = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newEventTitle.trim()) return;
        setIsSubmitting(true);
        try {
            // Very basic event creation used for POC
            await fetch("/api/events", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    title: newEventTitle,
                    start_time: newEventDate + "T09:00:00Z",
                    end_time: newEventDate + "T10:00:00Z",
                    workspace: "personal"
                })
            });
            await refreshAll();
            setIsNewEventOpen(false);
            setNewEventTitle("");
        } catch (e) {
            alert("Failed to create event");
        } finally {
            setIsSubmitting(false);
        }
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
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : String(err);
            setQaErr(msg || "Failed");
        } finally {
            setIsSubmitting(false);
        }
    };

    // Check if gcal embed is available
    const hasGCalEmbed = !!process.env.NEXT_PUBLIC_GCAL_EMBED_URL;
    const openGCal = hasGCalEmbed ? () => window.open(process.env.NEXT_PUBLIC_GCAL_EMBED_URL, '_blank') : undefined;

    // First-run Detection
    // Show onboarding banner only when workspace is demo-only (no real user content).
    // Uses two signals:
    //   1. is_seed flag (deterministic, preferred): all non-empty tasks are seed data
    //   2. project tag cross-check: no task belongs to a user-created project
    const isFirstRun = useMemo(() => {
        if (tasks.length === 0) return true; // empty workspace = first run

        const seedSlugs = new Set(["avaone-q1", "avaone-q1-sales", "avaone-homeforest-q1", "avafarm888-fb-content-q1", "avaone-fb-content-q1", "avaone-tiktok-q1"]);

        const hasUserTask = (tasks as any[]).some((t: any) => {
            // Prefer is_seed flag if available
            if (typeof t.is_seed === "number") return t.is_seed === 0;
            // Fallback: check if task's project tag is not a known seed project
            const projTag = (t.tags as string[] | null)?.find((tag) => tag.startsWith("project:"));
            if (projTag) {
                const slug = projTag.replace("project:", "");
                return !seedSlugs.has(slug);
            }
            // Task with no project tag = user-created
            return true;
        });

        return !hasUserTask;
    }, [tasks]);

    // --- Dashboard Stats Calculations ---
    const stats = useMemo(() => {
        const now = todayYmd;
        let overdue = 0;
        let today = 0;
        let waiting = 0;

        tasks.forEach(task => {
            if (task.status === "done") return;
            
            // Heuristic for Waiting: title contains #waiting or #followup
            const isHeuristicWaiting = task.title.toLowerCase().includes('#waiting') || task.title.toLowerCase().includes('#followup');

            if (task.scheduled_date) {
                if (task.scheduled_date < now) overdue++;
                else if (task.scheduled_date === now) {
                    if (isHeuristicWaiting) waiting++;
                    else today++;
                }
            } else if (task.status === "planned" || isHeuristicWaiting) {
                waiting++;
            } else if (task.status === "inbox") {
                // optional: count inbox as waiting too if not scheduled?
                // for now, strict follow-up rule
            }
        });

        return { overdue, today, waiting };
    }, [tasks, todayYmd]);

    // --- Bucket Logic ---
    const buckets = useMemo(() => {
        const bucketMap = {
            "avaone": { title: "AVAONE / Brand / Content", description: "Marketing, CRM & Brand management", workspaces: ["content", "avacrm"] as Workspace[], tasks: [] as Task[] },
            "farm": { title: "Farm Operations", description: "Avafarm888 & OPS management", workspaces: ["ops"] as Workspace[], tasks: [] as Task[] },
            "nanagarden": { title: "Website (NanaGarden)", description: "Travel, Project & NanaGarden site", workspaces: ["marketing"] as Workspace[], tasks: [] as Task[] },
            "marketing": { title: "Marketing & Sales", description: "Marketing & General sales", workspaces: ["marketing"] as Workspace[], tasks: [] as Task[] },
            "other": { title: "Admin / Other", description: "Finance, Admin & Personal", workspaces: ["admin", "finance", "personal"] as Workspace[], tasks: [] as Task[] },
        };

        tasks.forEach(task => {
            if (task.status === "done") return;
            
            const ws = task.workspace as Workspace;
            const titleLower = task.title.toLowerCase();

            // 1. AVAONE: content/avacrm OR title match
            if (ws === 'content' || ws === 'avacrm' || titleLower.includes('avaone')) {
                bucketMap.avaone.tasks.push(task);
            } 
            // 2. Farm: ops
            else if (ws === 'ops') {
                bucketMap.farm.tasks.push(task);
            }
            // 3. Website: marketing + keyword
            else if (ws === 'marketing' && (titleLower.includes('nanagarden') || titleLower.includes('website'))) {
                bucketMap.nanagarden.tasks.push(task);
            }
            // 4. Marketing remaining
            else if (ws === 'marketing') {
                bucketMap.marketing.tasks.push(task);
            }
            // 5. Admin / Others
            else {
                bucketMap.other.tasks.push(task);
            }
        });

        const getBucketStats = (tks: Task[]) => {
            const now = todayYmd;
            let ovd = 0;
            let tdy = 0;
            let ibx = 0;
            tks.forEach(t => {
                if (t.scheduled_date) {
                    if (t.scheduled_date < now) ovd++;
                    else if (t.scheduled_date === now) tdy++;
                } else if (t.status === "inbox") {
                    ibx++;
                }
            });
            return { ovd, tdy, ibx };
        };

        return Object.entries(bucketMap).map(([id, b]) => ({
            id,
            ...b,
            stats: getBucketStats(b.tasks),
        })).filter(b => b.tasks.length > 0 || b.id !== "other"); // Keep main 5, hide empty "other"
    }, [tasks, todayYmd]);

    if (loading && tasks.length === 0) return <div className="p-10 flex justify-center items-center gap-3 text-neutral-400"><span className="animate-spin text-xl">⏳</span> Loading Home...</div>;

    if (error && tasks.length === 0) {
        return (
            <div className="w-full px-6 2xl:px-10 py-8 flex justify-center items-center min-h-[50vh]">
                <div className="rounded-2xl border border-red-200 bg-red-50 p-6 flex flex-col items-center justify-center text-center shadow-sm w-full max-w-md">
                    <span className="text-4xl mb-4">⚠️</span>
                    <h2 className="text-xl font-bold text-red-800 mb-2">Failed to load dashboard</h2>
                    <p className="text-sm text-red-600 mb-6">{error}</p>
                    <button onClick={() => refreshAll()} className="px-6 py-2 bg-red-600 text-white text-sm font-bold rounded-xl hover:bg-red-700 transition-colors shadow-sm active:scale-95">
                        Retry Connection
                    </button>
                </div>
            </div>
        );
    }


    return (
        <PageShell>
            <PageHeader
                title="Dashboard"
                subtitle="High-level overview of your active projects and upcoming commitments."
                actions={
                    <div className="flex gap-2">
                        <button
                            onClick={() => setIsWizardOpen(true)}
                            className="bg-black text-white px-4 py-2 rounded-xl text-xs font-black shadow-lg shadow-black/10 hover:bg-neutral-800 transition-all active:scale-95 flex items-center gap-2"
                        >
                            <Layout className="w-3.5 h-3.5" />
                            Create Project
                        </button>
                        <button
                            onClick={() => setIsNewTaskOpen(true)}
                            className="bg-neutral-100 text-neutral-900 px-4 py-2 rounded-xl text-xs font-black hover:bg-neutral-200 transition-all active:scale-95 flex items-center gap-2"
                        >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Quick Task
                        </button>
                        <button
                            onClick={() => router.push("/docs?newDoc=1")}
                            className="hidden md:flex bg-white border border-neutral-200 text-neutral-600 px-4 py-2 rounded-xl text-xs font-black hover:bg-neutral-50 transition-all active:scale-95 items-center gap-2"
                        >
                            <Plus className="w-3.5 h-3.5" />
                            New Note
                        </button>

                        <div className="relative">
                            <button
                                onClick={() => setIsMoreOpen(!isMoreOpen)}
                                className={`h-full px-3 rounded-xl border transition-all active:scale-95 flex items-center gap-1 ${isMoreOpen ? 'bg-neutral-100 border-neutral-300 text-black' : 'bg-white border-neutral-200 text-neutral-500 hover:bg-neutral-50'}`}
                            >
                                <MoreHorizontal className="w-4 h-4" />
                            </button>

                            {isMoreOpen && (
                                <>
                                    <div className="fixed inset-0 z-30" onClick={() => setIsMoreOpen(false)} />
                                    <div className="absolute right-0 mt-2 w-48 bg-white border border-neutral-200 rounded-2xl shadow-2xl py-2 z-40 animate-in fade-in zoom-in-95 duration-100 origin-top-right">
                                        <div className="px-3 py-1.5 text-[10px] font-black text-neutral-400 uppercase tracking-widest">Utilities</div>
                                        <Link href="/agent" className="flex items-center gap-3 px-4 py-2.5 text-xs font-bold text-neutral-700 hover:bg-neutral-50 transition-colors">
                                            <Bot className="w-4 h-4 text-purple-600" />
                                            Agent
                                        </Link>
                                        <Link href="/logs" className="flex items-center gap-3 px-4 py-2.5 text-xs font-bold text-neutral-700 hover:bg-neutral-50 transition-colors">
                                            <Activity className="w-4 h-4 text-blue-600" />
                                            System Logs
                                        </Link>
                                        <div className="h-px bg-neutral-100 my-1 mx-2" />
                                        <button 
                                            onClick={() => { setIsMoreOpen(false); setIsNewEventOpen(true); }}
                                            className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-bold text-neutral-700 hover:bg-neutral-50 transition-colors"
                                        >
                                            <CalendarPlus className="w-4 h-4 text-green-600" />
                                            New Event
                                        </button>
                                        <button 
                                            onClick={() => { setIsMoreOpen(false); setIsBulkOpen(true); }}
                                            className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-bold text-neutral-700 hover:bg-neutral-50 transition-colors"
                                        >
                                            <PlusSquare className="w-4 h-4 text-orange-600" />
                                            Bulk Paste
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                }
            />

            <div className="space-y-8 max-w-[1600px] mx-auto pb-24">
                {/* Onboarding Banner - shown inline for first-run, does NOT replace dashboard */}
                {isFirstRun && (
                    <div className="mb-6">
                        <HomeFirstRunCard
                            onCreateArea={() => router.push("/workspaces?newArea=1")}
                            onCreateProject={() => setIsWizardOpen(true)}
                            onResetDemo={() => setIsResetOpen(true)}
                        />
                    </div>
                )}

                {/* Decision Hub & Workload Summary */}
                <div className="space-y-6">
                    <WorkloadSummaryCard 
                        overdue={analytics?.kpis?.overdue || 0}
                        today={analytics?.kpis?.today || 0}
                        inbox={analytics?.kpis?.inbox || 0}
                        doneToday={analytics?.kpis?.doneToday || 0}
                        loading={loading && !analytics}
                    />

                    {/* Decision Signals (Heuristics) */}
                    {(analytics?.focus?.mostActiveWorkspace || analytics?.focus?.oldestInboxItemYmd) && (
                        <div className="flex flex-wrap gap-4">
                            {analytics.focus.mostActiveWorkspace && (
                                <div className="flex items-center gap-2 px-3 py-1.5 bg-neutral-900 text-white rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm">
                                    <Zap className="w-3 h-3 text-yellow-400" />
                                    Active: {analytics.focus.mostActiveWorkspace}
                                </div>
                            )}
                            {analytics.focus.oldestInboxItemYmd && (
                                <div className="flex items-center gap-2 px-3 py-1.5 bg-white border border-neutral-200 text-neutral-600 rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm">
                                    <Clock className="w-3 h-3 text-neutral-400" />
                                    Oldest Backlog: {analytics.focus.oldestInboxItemYmd}
                                </div>
                            )}
                        </div>
                    )}
                </div>

            {/* Main Grid Layout - Strict 12 Cols */}
            <div className="grid grid-cols-12 gap-6">

                {/* Row 1: Timeline (8) + Agenda (4) */}
                <div className="col-span-12 xl:col-span-8">
                    <ProjectTimeline tasks={tasks} todayYmd={todayYmd} className="h-full min-h-[360px]" />
                </div>
                <div className="col-span-12 xl:col-span-4">
                    <AgendaCardBig events={events} todayYmd={todayYmd} className="h-full min-h-[360px]" />
                </div>

                {/* Row 2: Work Buckets Grid (8) + Mini Month (4) */}
                <div className="col-span-12 xl:col-span-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {buckets.map(bucket => (
                            <WorkBucketCard 
                                key={bucket.id}
                                title={bucket.title}
                                description={bucket.description}
                                overdue={bucket.stats.ovd}
                                today={bucket.stats.tdy}
                                inbox={bucket.stats.ibx}
                                workspaces={bucket.workspaces}
                            />
                        ))}
                    </div>
                </div>
                <div className="col-span-12 xl:col-span-4">
                    <MiniMonthCard events={events} todayYmd={todayYmd} onOpenGCal={openGCal} className="h-full" />
                </div>

                {/* Row 3: Project Health (8) + Knowledge Activity (4) */}
                <div className="col-span-12 xl:col-span-8">
                    <ProjectHealthGrid projects={analytics?.projects || []} loading={loading && !analytics} />
                </div>
                <div className="col-span-12 xl:col-span-4">
                    <KnowledgeActivityCard notes={analytics?.knowledge || []} loading={loading && !analytics} />
                </div>

                {/* Row 4: Other items (8) + System Status (4) */}
                <div className="col-span-12 xl:col-span-8">
                    <div className="bg-neutral-50/30 rounded-3xl p-6 border border-dashed border-neutral-200">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-bold text-neutral-500 text-sm uppercase tracking-wider italic">Administrative Overview</h3>
                            {/* Hidden system info or extra links can go here */}
                        </div>
                        <OtherWorkspacesList tasks={tasks} todayYmd={todayYmd} className="flex flex-col" />
                    </div>
                </div>
                <div className="col-span-12 xl:col-span-4">
                    <Card title="System Status" className="bg-neutral-50/50 h-full flex flex-col">
                        <div className="flex items-center gap-3 mb-4">
                            <div className={`w-3 h-3 rounded-full ${health?.ok ? 'bg-green-500' : 'bg-red-500'}`} />
                            <div className="font-bold text-neutral-700">{health?.status || "Checking..."}</div>
                        </div>
                        <div className="text-xs text-neutral-500 mb-4">
                            Database & Services are {health?.ok ? 'operational' : 'degraded'}.
                        </div>
                        <button disabled className="w-full py-2 bg-neutral-900 text-white rounded-lg text-xs font-bold opacity-80 hover:opacity-100 flex items-center justify-center gap-2 mt-auto">
                            🔒 Backup
                        </button>
                        <div className="mt-2 text-[10px] text-center text-neutral-300">v2.2.0</div>
                    </Card>
                </div>

            </div>

            {/* Modals */}
            <BulkTaskDialog
                isOpen={isBulkOpen}
                onClose={() => setIsBulkOpen(false)}
                onSuccess={refreshAll}
            />

            {/* Quick Add Dialog */}
            {quickAdd === "task" && (
                <TaskEditorDialog
                    isOpen={true}
                    onClose={() => setQuickAdd(null)}
                    task={{ id: "new", title: "", workspace: qaWorkspace } as Task}
                    onUpdate={refreshAll}
                />
            )}

            <Modal isOpen={isNewEventOpen} title="New Event" onClose={() => setIsNewEventOpen(false)}>
                <form onSubmit={handleCreateEvent} className="space-y-4">
                    <div>
                        <label className={LABEL_BASE}>Event Title</label>
                        <input autoFocus className={INPUT_BASE} value={newEventTitle} onChange={e => setNewEventTitle(e.target.value)} placeholder="Meeting with..." />
                    </div>
                    <div>
                        <label className={LABEL_BASE}>Date</label>
                        <input type="date" className={INPUT_BASE} value={newEventDate} onChange={e => setNewEventDate(e.target.value)} />
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                        <button type="button" onClick={() => setIsNewEventOpen(false)} className={BUTTON_SECONDARY}>Cancel</button>
                        <button type="submit" disabled={isSubmitting} className={BUTTON_PRIMARY}>{isSubmitting ? 'Saving...' : 'Create Event'}</button>
                    </div>
                </form>
            </Modal>

            <Modal isOpen={isNewTaskOpen} title="New Task" onClose={() => setIsNewTaskOpen(false)}>
                <form onSubmit={handleCreateTask} className="space-y-4">

                    {newTaskWs === 'content' && (
                        <div className="flex border-b border-neutral-100 mb-4">
                            <button type="button" onClick={() => setContentTab("details")} className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${contentTab === 'details' ? 'border-neutral-900 text-neutral-900' : 'border-transparent text-neutral-500 hover:text-neutral-700'}`}>
                                Details
                            </button>
                            <button type="button" onClick={() => setContentTab("content")} className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${contentTab === 'content' ? 'border-purple-600 text-purple-700' : 'border-transparent text-neutral-500 hover:text-neutral-700'}`}>
                                Content Fields
                            </button>
                        </div>
                    )}

                    <div className={contentTab === 'content' ? 'hidden' : 'space-y-4'}>
                        <div>
                            <label className={LABEL_BASE}>Task Title</label>
                            <input
                                autoFocus
                                type="text"
                                placeholder="What needs to be done?"
                                className={INPUT_BASE}
                                value={newTaskTitle}
                                onChange={e => setNewTaskTitle(e.target.value)}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className={LABEL_BASE}>Workspace</label>
                                <select
                                    className={INPUT_BASE}
                                    value={newTaskWs}
                                    onChange={e => setNewTaskWs(e.target.value as Workspace)}
                                >
                                    {WORKSPACES_LIST.map(w => (
                                        <option key={w.id} value={w.id}>{w.label}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className={LABEL_BASE}>Status</label>
                                <select
                                    className={INPUT_BASE}
                                    value={newTaskStatus}
                                    onChange={e => setNewTaskStatus(e.target.value as TaskStatus)}
                                >
                                    <option value="inbox">Inbox</option>
                                    <option value="planned">Planned</option>
                                </select>
                            </div>
                        </div>

                        {newTaskStatus === "planned" && (
                            <div className="animate-in fade-in slide-in-from-top-1">
                                <label className={LABEL_BASE}>Scheduled Date</label>
                                <input
                                    type="date"
                                    className={INPUT_BASE}
                                    value={newTaskDate}
                                    onChange={e => setNewTaskDate(e.target.value)}
                                />
                            </div>
                        )}

                        <div>
                            <label className={LABEL_BASE}>Priority</label>
                            <select
                                className={INPUT_BASE}
                                value={newTaskPriority}
                                onChange={e => setNewTaskPriority(Number(e.target.value))}
                            >
                                <option value={1}>High</option>
                                <option value={2}>Medium</option>
                                <option value={3}>Low</option>
                            </select>
                        </div>

                        <div>
                            <label className={LABEL_BASE}>Notes</label>
                            <textarea
                                className={`${INPUT_BASE} min-h-[80px]`}
                                value={newTaskNotes}
                                onChange={e => setNewTaskNotes(e.target.value)}
                                placeholder="Add details..."
                            />
                        </div>
                    </div>

                    {/* Content Tab Content */}
                    {newTaskWs === 'content' && (
                        <div className={contentTab === 'content' ? 'space-y-4 animate-in fade-in slide-in-from-right-2' : 'hidden'}>
                            <div>
                                <label className={LABEL_BASE}>Project ID</label>
                                <input
                                    type="text"
                                    placeholder="e.g. Tech2024"
                                    className={INPUT_BASE}
                                    value={contentProject}
                                    onChange={e => setContentProject(e.target.value)}
                                />
                                <p className="text-[10px] text-neutral-400 mt-1">Will be prefixed as <code>project:ID</code></p>
                            </div>

                            <div>
                                <label className={LABEL_BASE}>Stage</label>
                                <select className={INPUT_BASE} value={contentStage} onChange={e => setContentStage(e.target.value as ContentStage)}>
                                    {STAGE_TAGS.map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                            </div>

                            <div>
                                <label className={LABEL_BASE}>Platforms</label>
                                <div className="flex gap-2 mt-1">
                                    {['fb', 'ig', 'yt', 'tk'].map(p => (
                                        <button
                                            key={p}
                                            type="button"
                                            onClick={() => togglePlatform(p)}
                                            className={`px-3 py-1.5 rounded-lg border text-xs font-bold uppercase tracking-wider transition-all ${contentPlatforms.includes(p)
                                                ? 'bg-purple-100 border-purple-200 text-purple-700'
                                                : 'bg-white border-neutral-200 text-neutral-500 hover:border-neutral-300'
                                                }`}
                                        >
                                            {p}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {newTaskError && (
                        <div className="text-sm font-medium text-red-600 bg-red-50 px-3 py-2 rounded-lg border border-red-100 mt-2">
                            {newTaskError}
                        </div>
                    )}
                    <div className="flex justify-end gap-2 pt-2 border-t border-neutral-50 mt-4">
                        <button type="button" onClick={() => setIsNewTaskOpen(false)} className={BUTTON_SECONDARY}>Cancel</button>
                        <button type="submit" disabled={isSubmitting} className={BUTTON_PRIMARY}>{isSubmitting ? 'Saving...' : 'Create Task'}</button>
                    </div>
                </form>
            </Modal>

            {/* Task Detail Modal (Controlled by ?taskId) */}
            <TaskEditorDialog
                isOpen={!!activeTask}
                onClose={handleCloseTaskDetail}
                task={activeTask}
                onUpdate={refreshAll}
            />

            <Modal isOpen={quickAdd === "template"} title="New Content Project" onClose={() => setQuickAdd(null)}>
                <form onSubmit={handleCreateContentTemplate} className="space-y-5">
                    <div className="space-y-1.5">
                        <label className={LABEL_BASE}>Project Title</label>
                        <input autoFocus className={INPUT_BASE} placeholder="e.g. iPhone 16 Review" value={qaTitle} onChange={(e) => setQaTitle(e.target.value)} />
                    </div>
                    {qaErr && <div className="text-sm text-red-600 bg-red-50 p-3 rounded-xl border border-red-100 flex items-center gap-2"><span>⚠️</span>{qaErr}</div>}
                    <div className="flex justify-end gap-3 pt-2">
                        <button type="button" className={BUTTON_SECONDARY} onClick={() => setQuickAdd(null)}>Cancel</button>
                        <button type="submit" disabled={isSubmitting} className={BUTTON_PRIMARY}>{isSubmitting ? "Generating..." : "Create Project"}</button>
                    </div>
                </form>
            </Modal>

            <ResetDemoDataDialog
                isOpen={isResetOpen}
                onClose={() => setIsResetOpen(false)}
                onSuccess={(mode) => {
                    setIsResetOpen(false);
                    setShowSuccessToast(true);
                    refreshAll();
                    setTimeout(() => setShowSuccessToast(false), 5000);
                }}
            />

            {showSuccessToast && (
                <div className="fixed bottom-6 right-6 z-50 animate-in fade-in slide-in-from-bottom-5 duration-300">
                    <div className="bg-green-600 text-white px-6 py-3 rounded-2xl shadow-xl flex items-center gap-3 font-bold">
                        <CheckCircle2 className="w-5 h-5" />
                        <span>{toastMessage}</span>
                    </div>
                </div>
            )}

            <CreateProjectWizard 
                isOpen={isWizardOpen}
                onClose={() => setIsWizardOpen(false)}
                onSuccess={() => {
                    setToastMessage("Project Created Successfully!");
                    setShowSuccessToast(true);
                    refreshAll();
                    setTimeout(() => setShowSuccessToast(false), 5000);
                }}
            />
            </div>
        </PageShell>
    );
}
