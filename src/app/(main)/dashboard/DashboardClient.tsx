"use client";

import Link from "next/link";
import { nanoid } from "nanoid";
import { WORKSPACES, workspaceLabel, type Workspace } from "@/lib/workspaces";
import { useEffect, useMemo, useState, useCallback } from "react";

type ScheduleBucket = "morning" | "afternoon" | "evening";

type TaskRow = {
    id: string;
    title: string;
    workspace?: string | null;
    scheduled_date?: string | null; // "YYYY-MM-DD" or null
    schedule_bucket?: ScheduleBucket | null;
    status?: string | null;
};

type CalendarEvent = {
    id: string;
    workspace: string;
    title: string;
    all_day: boolean;        // หลัง map แล้ว
    start_time: string;      // UTC ISO
    end_time: string | null; // UTC ISO | null
    kind: string | null;
    description: string | null;
    created_at?: string;
    updated_at?: string;
};

type DocRow = {
    id: string;
    title: string;
    created_at?: string;
    updated_at?: string;
};

function pad2(n: number) {
    return String(n).padStart(2, "0");
}

function toYmdLocal(d: Date) {
    return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function toUtcIso(d: Date) {
    return d.toISOString();
}

function isObject(v: unknown): v is Record<string, unknown> {
    return typeof v === "object" && v !== null;
}

function pickArray<T>(v: unknown): T[] {
    if (Array.isArray(v)) return v as T[];

    if (isObject(v)) {
        const candidates = ["events", "docs", "rows", "data", "items", "result", "tasks"];
        for (const k of candidates) {
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
        created_at: raw.created_at ? String(raw.created_at) : undefined,
        updated_at: raw.updated_at ? String(raw.updated_at) : undefined,
    };
}

async function fetchEvents(params: Record<string, string>) {
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) sp.set(k, v);

    const res = await fetch(`/api/events?${sp.toString()}`, { cache: "no-store" });
    if (!res.ok) throw new Error(`events: HTTP ${res.status} `);

    const raw: unknown = await res.json();
    const arr = pickArray<any>(raw);

    return arr.map(mapEventRow);
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

function normalizeHm(v: string) {
    const s = v.trim();
    if (/^\d{4}$/.test(s)) return `${s.slice(0, 2)}:${s.slice(2)}`;
    if (/^\d{1,2}:\d{2}$/.test(s)) {
        const [h, m] = s.split(":");
        return `${String(parseInt(h, 10)).padStart(2, "0")}:${m}`;
    }
    return s;
}

function localDateTimeToIso(dateYmd: string, timeHm: string) {
    const t = normalizeHm(timeHm);
    const d = new Date(`${dateYmd}T${t}:00`);
    if (Number.isNaN(d.getTime())) throw new Error("Invalid datetime");
    return d.toISOString();
}

function localDateMidnightToIso(dateYmd: string) {
    const d = new Date(`${dateYmd}T00:00:00`);
    if (Number.isNaN(d.getTime())) throw new Error("Invalid date");
    return d.toISOString();
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

function Card(props: { title: string; right?: React.ReactNode; children: React.ReactNode }) {
    return (
        <div className="rounded-2xl border bg-white/50 p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between gap-3">
                <div className="text-sm font-semibold">{props.title}</div>
                {props.right}
            </div>
            {props.children}
        </div>
    );
}

type QuickAddMode = "task" | "event" | "doc" | null;

export default function DashboardClient() {
    const todayYmd = useMemo(() => toYmdLocal(new Date()), []);
    const [loading, setLoading] = useState(true);
    const [quickAdd, setQuickAdd] = useState<QuickAddMode>(null);

    // -- Quick Add Form States --
    const [qaTitle, setQaTitle] = useState("");
    const [qaWorkspace, setQaWorkspace] = useState<Workspace>("avacrm");
    const [qaKind, setQaKind] = useState("meeting");
    const [qaDate, setQaDate] = useState(todayYmd);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [qaErr, setQaErr] = useState<string | null>(null);
    const [docTitle, setDocTitle] = useState("");

    // -- Task-specific States --
    const [taskAddToToday, setTaskAddToToday] = useState(true);
    const [taskBucket, setTaskBucket] = useState<"morning" | "afternoon" | "evening">("morning");

    // -- Event-specific States --
    const [evTitle, setEvTitle] = useState("");
    const [evWorkspace, setEvWorkspace] = useState<Workspace>("avacrm");
    const [evKind, setEvKind] = useState<"appointment" | "meeting" | "reminder">("meeting");
    const [evAllDay, setEvAllDay] = useState(false);
    const [evDate, setEvDate] = useState(todayYmd);
    const [evStartTime, setEvStartTime] = useState("09:00");
    const [evDurationMin, setEvDurationMin] = useState(60);
    const [evDesc, setEvDesc] = useState("");
    const [evShowMore, setEvShowMore] = useState(false);
    const [evErr, setEvErr] = useState<string | null>(null);
    const [evSaving, setEvSaving] = useState(false);

    const [morning, setMorning] = useState<TaskRow[]>([]);
    const [afternoon, setAfternoon] = useState<TaskRow[]>([]);
    const [evening, setEvening] = useState<TaskRow[]>([]);
    const [inboxCount, setInboxCount] = useState<number>(0);

    const [events, setEvents] = useState<CalendarEvent[]>([]);
    const [docs, setDocs] = useState<DocRow[]>([]);

    const [errTasks, setErrTasks] = useState<string | null>(null);
    const [errEvents, setErrEvents] = useState<string | null>(null);
    const [errDocs, setErrDocs] = useState<string | null>(null);

    const refreshAll = useCallback(async () => {
        setLoading(true);
        setErrTasks(null);
        setErrEvents(null);
        setErrDocs(null);

        try {
            const [m, a, e] = await Promise.all([
                fetchTasks({ scheduled_date: todayYmd, schedule_bucket: "morning" }),
                fetchTasks({ scheduled_date: todayYmd, schedule_bucket: "afternoon" }),
                fetchTasks({ scheduled_date: todayYmd, schedule_bucket: "evening" }),
            ]);
            setMorning(m);
            setAfternoon(a);
            setEvening(e);
        } catch (ex) {
            setErrTasks(ex instanceof Error ? ex.message : "tasks: unknown error");
        }

        try {
            const inbox = await fetchTasks({ scheduled_date: "null", limit: "200" });
            setInboxCount(inbox.length);
        } catch {
            setInboxCount(0);
        }

        try {
            const start = toUtcIso(new Date());
            const end = toUtcIso(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000));
            const ev = await fetchEvents({ start, end });
            setEvents(ev);
        } catch (ex) {
            setErrEvents(ex instanceof Error ? ex.message : "events: unknown error");
        }

        try {
            const d = await fetchDocs({ limit: "5" });
            setDocs(d);
        } catch (ex) {
            setErrDocs(ex instanceof Error ? ex.message : "docs: unknown error");
            setDocs([]);
        }

        setLoading(false);
    }, [todayYmd]);

    useEffect(() => {
        refreshAll();
    }, [refreshAll]);


    const buckets: Array<{ key: ScheduleBucket; label: string; items: TaskRow[] }> = [
        { key: "morning", label: "Morning", items: morning },
        { key: "afternoon", label: "Afternoon", items: afternoon },
        { key: "evening", label: "Evening", items: evening },
    ];

    const safeEvents = Array.isArray(events) ? events : [];

    if (loading) {
        return <div className="p-6">Loading...</div>;
    }

    return (
        <div className="p-6 space-y-6">
            <div className="flex items-end justify-between gap-3">
                <div>
                    <div className="text-xl font-semibold">ArborDesk</div>
                    <div className="text-xs text-neutral-500">Today: {todayYmd}</div>
                </div>

                <div className="flex gap-2">
                    <Link className="rounded-xl border px-3 py-2 text-sm hover:bg-neutral-50" href="/inbox">
                        Inbox
                    </Link>
                    <button
                        className="rounded-xl border px-3 py-2 text-sm hover:bg-neutral-50"
                        onClick={() => setQuickAdd("task")}
                    >
                        New Task
                    </button>
                    <button
                        className="rounded-xl border px-3 py-2 text-sm hover:bg-neutral-50"
                        onClick={() => setQuickAdd("event")}
                    >
                        New Event
                    </button>
                    <button
                        className="rounded-xl border px-3 py-2 text-sm hover:bg-neutral-50"
                        onClick={() => setQuickAdd("doc")}
                    >
                        New Doc
                    </button>
                </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
                <div className="lg:col-span-2 space-y-4">
                    <Card
                        title="Today Buckets"
                        right={
                            <div className="flex gap-2">
                                <Link className="text-xs underline text-neutral-600" href="/today">
                                    Open Today
                                </Link>
                                <Link className="text-xs underline text-neutral-600" href="/planner">
                                    Planner
                                </Link>
                            </div>
                        }
                    >
                        {errTasks ? (
                            <div className="text-sm text-red-600">{errTasks}</div>
                        ) : (
                            <div className="grid gap-3 md:grid-cols-3">
                                {buckets.map((b) => (
                                    <div key={b.key} className="rounded-2xl border p-3">
                                        <div className="mb-2 flex items-center justify-between">
                                            <div className="text-xs font-semibold">{b.label}</div>
                                            <div className="text-xs text-neutral-500">{b.items.length}</div>
                                        </div>
                                        <div className="space-y-2">
                                            {b.items.length === 0 ? (
                                                <div className="text-xs text-neutral-500">No tasks</div>
                                            ) : (
                                                b.items.slice(0, 6).map((t) => (
                                                    <div key={t.id} className="text-sm">
                                                        <div className="truncate">{t.title}</div>
                                                        {t.workspace ? (
                                                            <div className="text-xs text-neutral-500 truncate">{t.workspace}</div>
                                                        ) : null}
                                                    </div>
                                                ))
                                            )}
                                            {b.items.length > 6 ? (
                                                <div className="text-xs text-neutral-500">+{b.items.length - 6} more</div>
                                            ) : null}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </Card>

                    <Card
                        title="Upcoming Events (7 days)"
                        right={
                            <Link className="text-xs underline text-neutral-600" href="/calendar">
                                Open Calendar
                            </Link>
                        }
                    >
                        {errEvents ? (
                            <div className="text-sm text-red-600">{errEvents}</div>
                        ) : safeEvents.length === 0 ? (
                            <div className="text-sm text-neutral-500">No upcoming events</div>
                        ) : (
                            <div className="divide-y">
                                {safeEvents.slice(0, 8).map((ev) => (
                                    <div key={ev.id} className="py-2 flex items-start justify-between gap-3">
                                        <div className="min-w-0">
                                            <div className="text-sm font-medium truncate">{ev.title}</div>
                                            <div className="text-xs text-neutral-500 truncate">{ev.workspace}</div>
                                        </div>
                                        <div className="text-xs text-neutral-600 whitespace-nowrap">
                                            {ev.all_day ? "All day" : fmtTimeLocal(ev.start_time)}
                                        </div>
                                    </div>
                                ))}
                                {safeEvents.length > 8 ? (
                                    <div className="pt-2 text-xs text-neutral-500">+{safeEvents.length - 8} more</div>
                                ) : null}
                            </div>
                        )}
                    </Card>
                </div>

                <div className="space-y-4">
                    <Card
                        title="Inbox"
                        right={
                            <Link className="text-xs underline text-neutral-600" href="/inbox">
                                Open Inbox
                            </Link>
                        }
                    >
                        <div className="flex items-end justify-between">
                            <div>
                                <div className="text-2xl font-semibold">{inboxCount}</div>
                                <div className="text-xs text-neutral-500">Unplanned tasks</div>
                            </div>
                            <Link className="rounded-xl border px-3 py-2 text-sm hover:bg-neutral-50" href="/planner">
                                Plan Today
                            </Link>
                        </div>
                    </Card>

                    <Card
                        title="Recent Docs"
                        right={
                            <Link className="text-xs underline text-neutral-600" href="/docs">
                                Open Docs
                            </Link>
                        }
                    >
                        {errDocs ? (
                            <div className="text-xs text-neutral-500">
                                Docs API not ready ({errDocs}). You can still use the Docs page.
                            </div>
                        ) : docs.length === 0 ? (
                            <div className="text-sm text-neutral-500">No docs</div>
                        ) : (
                            <div className="space-y-2">
                                {docs.slice(0, 5).map((d) => (
                                    <Link
                                        key={d.id}
                                        href={`/docs/${d.id}`}
                                        className="block rounded-xl border px-3 py-2 hover:bg-neutral-50"
                                    >
                                        <div className="text-sm font-medium truncate">{d.title}</div>
                                        <div className="text-xs text-neutral-500 truncate">{d.updated_at ?? d.created_at ?? ""}</div>
                                    </Link>
                                ))}
                                {docs.length > 5 ? (
                                    <div className="pt-2 text-xs text-neutral-500">+{docs.length - 5} more</div>
                                ) : null}
                            </div>
                        )}
                    </Card>
                </div>
            </div>

            <Modal
                open={quickAdd === "task" || quickAdd === "doc"}
                title={quickAdd === "task" ? "Quick Add Task" : "New Doc"}
                onClose={() => {
                    setQuickAdd(null);
                    setQaErr(null);
                }}
            >
                {quickAdd === "doc" && (
                    <form
                        className="space-y-3"
                        onSubmit={async (e) => {
                            e.preventDefault();
                            const title = docTitle.trim() || "Untitled";
                            try {
                                setIsSubmitting(true);
                                setQaErr(null);
                                await postJson("/api/docs", { title, content_md: "" });

                                // refresh docs
                                const d = await fetchDocs({ limit: "5" });
                                setDocs(d);

                                setDocTitle("");
                                setQuickAdd(null);
                            } catch (err: any) {
                                setQaErr(err.message || "Failed to create doc");
                            } finally {
                                setIsSubmitting(false);
                            }
                        }}
                    >
                        <div className="space-y-1">
                            <div className="text-xs text-neutral-600">Title</div>
                            <input
                                className="w-full rounded-xl border px-3 py-2 text-sm focus:border-black focus:outline-none"
                                value={docTitle}
                                onChange={(e) => setDocTitle(e.target.value)}
                                placeholder="e.g., Meeting notes"
                                autoFocus
                            />
                        </div>

                        {qaErr && <div className="text-sm text-red-600">{qaErr}</div>}

                        <div className="flex justify-end gap-2">
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
                                className="rounded-xl border px-3 py-2 text-sm hover:bg-neutral-50 disabled:opacity-50"
                            >
                                {isSubmitting ? "Creating..." : "Create"}
                            </button>
                        </div>
                    </form>
                )}

                {quickAdd === "task" && (
                    <form
                        className="space-y-3"
                        onSubmit={async (e) => {
                            e.preventDefault();
                            const title = qaTitle.trim();
                            if (!title) {
                                setQaErr("Title is required");
                                return;
                            }
                            try {
                                setIsSubmitting(true);

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

                                // refresh tasks
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
                )}
            </Modal>

            <Modal open={quickAdd === "event"} title="Quick Add event" onClose={() => setQuickAdd(null)}>
                <form
                    className="space-y-3"
                    onSubmit={async (e) => {
                        e.preventDefault();
                        setEvErr(null);

                        const title = evTitle.trim();
                        if (!title) {
                            setEvErr("Title is required");
                            return;
                        }

                        try {
                            setEvSaving(true);

                            const startIso = evAllDay
                                ? localDateMidnightToIso(evDate)
                                : localDateTimeToIso(evDate, evStartTime);

                            const endIso = evAllDay
                                ? null
                                : new Date(new Date(startIso).getTime() + evDurationMin * 60 * 1000).toISOString();

                            await postJson("/api/events", {
                                title,
                                workspace: evWorkspace,
                                kind: evKind,
                                all_day: evAllDay,
                                start_time: startIso,
                                end_time: endIso,
                                description: evShowMore && evDesc.trim() ? evDesc.trim() : undefined,
                            });

                            // refresh events
                            const start = new Date().toISOString();
                            const end = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
                            setEvents(await fetchEvents({ start, end }));

                            // reset
                            setEvTitle("");
                            setEvAllDay(false);
                            setEvStartTime("09:00");
                            setEvDurationMin(60);
                            setEvDesc("");
                            setEvShowMore(false);

                            setQuickAdd(null);
                        } catch (ex) {
                            setEvErr(ex instanceof Error ? ex.message : "Create event failed");
                        } finally {
                            setEvSaving(false);
                        }
                    }}
                >
                    {evErr ? <div className="text-sm text-red-600">{evErr}</div> : null}

                    <div className="space-y-1">
                        <div className="text-xs text-neutral-600">Title</div>
                        <input
                            className="w-full rounded-xl border px-3 py-2 text-sm focus:border-black focus:outline-none"
                            value={evTitle}
                            onChange={(e) => setEvTitle(e.target.value)}
                            autoFocus
                        />
                    </div>

                    <div className="grid gap-3 md:grid-cols-2">
                        <div className="space-y-1">
                            <div className="text-xs text-neutral-600">Workspace</div>
                            <select
                                className="w-full rounded-xl border px-3 py-2 text-sm focus:border-black focus:outline-none bg-white font-medium"
                                value={evWorkspace}
                                onChange={(e) => setEvWorkspace(e.target.value as Workspace)}
                            >
                                {WORKSPACES.map((w) => (
                                    <option key={w} value={w}>
                                        {workspaceLabel(w)}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="space-y-1">
                            <div className="text-xs text-neutral-600">Kind</div>
                            <select
                                className="w-full rounded-xl border px-3 py-2 text-sm focus:border-black focus:outline-none bg-white font-medium"
                                value={evKind}
                                onChange={(e) => setEvKind(e.target.value as any)}
                            >
                                <option value="appointment">Appointment</option>
                                <option value="meeting">Meeting</option>
                                <option value="reminder">Reminder</option>
                            </select>
                        </div>
                    </div>

                    <div className="grid gap-3 md:grid-cols-2">
                        <div className="space-y-1">
                            <div className="text-xs text-neutral-600">Date</div>
                            <input
                                type="date"
                                className="w-full rounded-xl border px-3 py-2 text-sm focus:border-black focus:outline-none"
                                value={evDate}
                                onChange={(e) => setEvDate(e.target.value)}
                            />
                        </div>

                        <div className="space-y-1">
                            <div className="text-xs text-neutral-600">Start time (24h)</div>
                            <input
                                disabled={evAllDay}
                                className="w-full rounded-xl border px-3 py-2 text-sm focus:border-black focus:outline-none disabled:bg-neutral-50"
                                value={evStartTime}
                                onChange={(e) => setEvStartTime(e.target.value)}
                                placeholder="09:00"
                            />
                        </div>

                        <div className="space-y-1">
                            <div className="text-xs text-neutral-600">Duration</div>
                            <select
                                disabled={evAllDay}
                                className="w-full rounded-xl border px-3 py-2 text-sm focus:border-black focus:outline-none bg-white font-medium"
                                value={String(evDurationMin)}
                                onChange={(e) => setEvDurationMin(parseInt(e.target.value, 10))}
                            >
                                <option value="15">15 min</option>
                                <option value="30">30 min</option>
                                <option value="60">60 min</option>
                                <option value="90">90 min</option>
                                <option value="120">120 min</option>
                            </select>
                        </div>

                        <div className="space-y-1">
                            <div className="text-xs text-neutral-600">All day</div>
                            <label className="flex items-center gap-2 text-sm cursor-pointer">
                                <input type="checkbox" checked={evAllDay} onChange={(e) => setEvAllDay(e.target.checked)} />
                                <span>All day</span>
                            </label>
                        </div>
                    </div>

                    <button
                        type="button"
                        className="text-xs underline text-neutral-600"
                        onClick={() => setEvShowMore((v) => !v)}
                    >
                        {evShowMore ? "Hide options" : "More options"}
                    </button>

                    {evShowMore ? (
                        <div className="space-y-1">
                            <div className="text-xs text-neutral-600">Description (optional)</div>
                            <textarea
                                className="w-full rounded-xl border px-3 py-2 text-sm focus:border-black focus:outline-none"
                                rows={3}
                                value={evDesc}
                                onChange={(e) => setEvDesc(e.target.value)}
                            />
                            <div className="text-xs text-neutral-500">
                                Need full control? Use Calendar page. <a className="underline" href="/calendar">Open Calendar</a>
                            </div>
                        </div>
                    ) : (
                        <div className="text-xs text-neutral-500">
                            Need end date/time & advanced editing? <a className="underline" href="/calendar">Open Calendar</a>
                        </div>
                    )}

                    <div className="flex justify-end gap-2 pt-2">
                        <button
                            type="button"
                            className="rounded-xl border px-3 py-2 text-sm hover:bg-neutral-50"
                            onClick={() => setQuickAdd(null)}
                        >
                            Cancel
                        </button>
                        <button
                            disabled={evSaving}
                            type="submit"
                            className="rounded-xl bg-black px-6 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
                        >
                            {evSaving ? "Creating..." : "Create"}
                        </button>
                    </div>
                </form>
            </Modal>
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
