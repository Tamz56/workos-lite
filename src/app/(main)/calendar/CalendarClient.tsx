"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import type { Event, EventWorkspace, EventKind } from "@/lib/api";
import { getEvents, createEvent } from "@/lib/api";

function ymd(d: Date) {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
}

function formatTime(iso: string) {
    const d = new Date(iso);
    return d.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit", hour12: false });
}

export default function CalendarClient() {
    const sp = useSearchParams();
    const router = useRouter();

    const startParam = sp.get("start");
    const endParam = sp.get("end");
    const workspaceParam = sp.get("workspace");
    const qParam = sp.get("q") ?? "";

    const [start, setStart] = useState(startParam ?? ymd(new Date()));
    const [end, setEnd] = useState(endParam ?? ymd(new Date(Date.now() + 7 * 86400000)));
    const [workspace, setWorkspace] = useState<EventWorkspace | "all">(
        (workspaceParam as any) || "all"
    );
    const [q, setQ] = useState(qParam);

    const [rows, setRows] = useState<Event[]>([]);
    const [loading, setLoading] = useState(false);
    const [err, setErr] = useState<string | null>(null);

    // New Event form
    const [open, setOpen] = useState(false);
    const [title, setTitle] = useState("");
    const [kind, setKind] = useState<EventKind>("appointment");
    const [ws, setWs] = useState<EventWorkspace>("avacrm");
    const [allDay, setAllDay] = useState(false);
    const [startAt, setStartAt] = useState(() => new Date().toISOString().slice(0, 16)); // local input
    const [endAt, setEndAt] = useState(() => new Date(Date.now() + 60 * 60000).toISOString().slice(0, 16));
    const [desc, setDesc] = useState("");

    async function load() {
        setLoading(true);
        setErr(null);
        try {
            const data = await getEvents({ start, end, workspace, q, limit: 300 });
            setRows(data);
        } catch (e: any) {
            setErr(e?.message ?? "Load failed");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const grouped = useMemo(() => {
        const m = new Map<string, Event[]>();
        for (const e of rows) {
            const day = ymd(new Date(e.start_time));
            if (!m.has(day)) m.set(day, []);
            m.get(day)!.push(e);
        }
        // sort each day by start_time
        for (const [k, v] of m.entries()) {
            v.sort((a, b) => (a.start_time < b.start_time ? -1 : 1));
            m.set(k, v);
        }
        return Array.from(m.entries()).sort((a, b) => (a[0] < b[0] ? -1 : 1));
    }, [rows]);

    function applyFilters() {
        const next = new URLSearchParams();
        next.set("start", start);
        next.set("end", end);
        if (workspace !== "all") next.set("workspace", workspace);
        if (q.trim()) next.set("q", q.trim());
        router.push(`/calendar?${next.toString()}`);
        load();
    }

    async function onCreate() {
        if (!title.trim()) return;

        // convert local datetime-local to ISO
        const startIso = new Date(startAt).toISOString();
        const endIso = allDay ? null : new Date(endAt).toISOString();

        await createEvent({
            title: title.trim(),
            start_time: startIso,
            end_time: endIso,
            all_day: allDay,
            kind,
            workspace: ws,
            description: desc.trim() ? desc.trim() : null,
        });

        setOpen(false);
        setTitle("");
        setDesc("");
        await load();
    }

    return (
        <div className="p-6">
            <div className="flex items-center justify-between mb-4">
                <h1 className="text-2xl font-semibold">Calendar</h1>
                <button className="border rounded-lg px-3 py-2" onClick={() => setOpen(true)}>
                    New Event
                </button>
            </div>

            <div className="border rounded-xl p-4 mb-6">
                <div className="flex flex-wrap gap-3 items-end">
                    <div>
                        <div className="text-xs mb-1">Start</div>
                        <input className="border rounded-md px-2 py-1" type="date" value={start} onChange={(e) => setStart(e.target.value)} />
                    </div>
                    <div>
                        <div className="text-xs mb-1">End</div>
                        <input className="border rounded-md px-2 py-1" type="date" value={end} onChange={(e) => setEnd(e.target.value)} />
                    </div>
                    <div>
                        <div className="text-xs mb-1">Workspace</div>
                        <select className="border rounded-md px-2 py-1" value={workspace} onChange={(e) => setWorkspace(e.target.value as any)}>
                            <option value="all">All</option>
                            <option value="avacrm">avacrm</option>
                            <option value="ops">ops</option>
                            <option value="content">content</option>
                        </select>
                    </div>
                    <div className="flex-1 min-w-[240px]">
                        <div className="text-xs mb-1">Search</div>
                        <input className="border rounded-md px-2 py-1 w-full" value={q} onChange={(e) => setQ(e.target.value)} placeholder="ค้นหา title / description" />
                    </div>
                    <button className="bg-black text-white rounded-lg px-4 py-2" onClick={applyFilters}>
                        Apply
                    </button>
                </div>

                <div className="text-xs mt-2 opacity-70">
                    {loading ? "Loading..." : err ? `Error: ${err}` : `Events: ${rows.length}`}
                </div>
            </div>

            <div className="space-y-4">
                {grouped.length === 0 ? (
                    <div className="opacity-70">No events in this range.</div>
                ) : (
                    grouped.map(([day, items]) => (
                        <div key={day} className="border rounded-xl p-4">
                            <div className="font-semibold mb-3">{day}</div>
                            <div className="space-y-2">
                                {items.map((e) => (
                                    <div key={e.id} className="border rounded-lg p-3 flex items-center justify-between">
                                        <div>
                                            <div className="font-medium">{e.title}</div>
                                            <div className="text-xs opacity-70">
                                                {e.all_day ? "All day" : `${formatTime(e.start_time)}${e.end_time ? ` - ${formatTime(e.end_time)}` : ""}`}
                                                {" • "}
                                                {e.kind}
                                                {e.workspace ? ` • ${e.workspace}` : ""}
                                            </div>
                                            {e.description ? <div className="text-xs mt-1 opacity-80">{e.description}</div> : null}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))
                )}
            </div>

            {open ? (
                <div className="fixed inset-0 bg-black/30 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl p-4 w-full max-w-lg">
                        <div className="flex items-center justify-between mb-3">
                            <div className="font-semibold">New Event</div>
                            <button className="border rounded-md px-2 py-1" onClick={() => setOpen(false)}>Close</button>
                        </div>

                        <div className="space-y-3">
                            <input className="border rounded-md px-3 py-2 w-full" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" />

                            <div className="flex gap-2">
                                <select className="border rounded-md px-2 py-2" value={kind} onChange={(e) => setKind(e.target.value as EventKind)}>
                                    <option value="appointment">appointment</option>
                                    <option value="meeting">meeting</option>
                                    <option value="reminder">reminder</option>
                                </select>
                                <select className="border rounded-md px-2 py-2" value={ws} onChange={(e) => setWs(e.target.value as EventWorkspace)}>
                                    <option value="avacrm">avacrm</option>
                                    <option value="ops">ops</option>
                                    <option value="content">content</option>
                                </select>
                                <label className="flex items-center gap-2 text-sm">
                                    <input type="checkbox" checked={allDay} onChange={(e) => setAllDay(e.target.checked)} />
                                    All day
                                </label>
                            </div>

                            <div className="flex gap-2">
                                <div className="flex-1">
                                    <div className="text-xs mb-1">Start</div>
                                    <input className="border rounded-md px-2 py-2 w-full" type="datetime-local" value={startAt} onChange={(e) => setStartAt(e.target.value)} />
                                </div>
                                <div className="flex-1">
                                    <div className="text-xs mb-1">End</div>
                                    <input className="border rounded-md px-2 py-2 w-full" type="datetime-local" value={endAt} onChange={(e) => setEndAt(e.target.value)} disabled={allDay} />
                                </div>
                            </div>

                            <textarea className="border rounded-md px-3 py-2 w-full" rows={3} value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Description (optional)" />

                            <button className="bg-black text-white rounded-lg px-4 py-2" onClick={onCreate}>
                                Create
                            </button>
                        </div>
                    </div>
                </div>
            ) : null}
        </div>
    );
}
