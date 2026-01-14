"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";

import { WORKSPACES, workspaceLabel, type Workspace } from "@/lib/workspaces";

// --- types (Zero Any Patch) ---

export type EventKind = "appointment" | "meeting" | "reminder";
export type EventWorkspace = Workspace;

type CalendarEvent = {
    id: string;
    workspace: string;       // เปลี่ยนเป็น string เพื่อความยืดหยุ่นตอนดึงจาก API
    title: string;
    all_day: boolean;        // หลัง map แล้วเป็น boolean เสมอ
    start_time: string;      // UTC ISO
    end_time: string | null; // UTC ISO | null
    kind: string | null;
    description: string | null;
    created_at?: string;
    updated_at?: string;
};

type CreateEventPayload = {
    workspace: EventWorkspace | null;
    title: string;
    description?: string | null;
    all_day: boolean;
    kind: EventKind;
    start_time: string;
    end_time: string | null;
};


function isObject(v: unknown): v is Record<string, unknown> {
    return typeof v === "object" && v !== null;
}

/**
 * utility for raw fetch error parsing
 */
async function readErrorMessage(res: Response): Promise<string> {
    try {
        const j: unknown = await res.json();
        if (isObject(j)) {
            const e = typeof j.error === "string" ? j.error : undefined;
            const m = typeof j.message === "string" ? j.message : undefined;
            return e ?? m ?? `HTTP ${res.status}`;
        }
        return `HTTP ${res.status}`;
    } catch {
        return `HTTP ${res.status}`;
    }
}

// --- Handler Wrappers (Zero Any Patch) ---

const onChangeText =
    (setter: (v: string) => void) =>
        (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
            setter(e.target.value);
        };

const onChangeCheckbox =
    (setter: (v: boolean) => void) =>
        (e: React.ChangeEvent<HTMLInputElement>) => {
            setter(e.target.checked);
        };


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

// --- Fetch Logic (Zero Any) ---

async function fetchEvents(params: {
    start?: string;
    end?: string;
    workspace?: string;
    q?: string;
    limit?: number;
}): Promise<CalendarEvent[]> {
    const sp = new URLSearchParams();
    if (params.start) sp.set("start", params.start);
    if (params.end) sp.set("end", params.end);
    if (params.workspace && params.workspace !== "all") sp.set("workspace", params.workspace);
    if (params.q) sp.set("q", params.q);
    if (params.limit) sp.set("limit", String(params.limit));

    const res = await fetch(`/api/events?${sp.toString()}`, { cache: "no-store" });
    if (!res.ok) throw new Error(await readErrorMessage(res));

    const j: unknown = await res.json();
    const arr = (isObject(j) && Array.isArray(j.events)) ? j.events : [];
    return arr.map(mapEventRow);
}

async function createEventApi(payload: CreateEventPayload): Promise<CalendarEvent> {
    const res = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
    });

    if (!res.ok) throw new Error(await readErrorMessage(res));

    const j: unknown = await res.json();
    if (isObject(j) && j.event) {
        return mapEventRow(j.event);
    }
    throw new Error("Invalid API response");
}

// --- UI Helpers ---

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

function pad2(n: number) {
    return String(n).padStart(2, "0");
}

function clampInt(v: string, min: number, max: number) {
    const n = Number(v);
    if (!Number.isFinite(n)) return min;
    return Math.min(Math.max(Math.trunc(n), min), max);
}

function normalizeTimeInput(hhmmRaw: string) {
    const s = (hhmmRaw ?? "").trim();
    const m1 = s.match(/^(\d{1,2})[:.](\d{2})$/);
    if (m1) {
        const hh = clampInt(m1[1], 0, 23);
        const mm = clampInt(m1[2], 0, 59);
        return `${pad2(hh)}:${pad2(mm)}`;
    }
    const m2 = s.match(/^(\d{3,4})$/);
    if (m2) {
        const digits = m2[1].padStart(4, "0");
        const hh = clampInt(digits.slice(0, 2), 0, 23);
        const mm = clampInt(digits.slice(2, 4), 0, 59);
        return `${pad2(hh)}:${pad2(mm)}`;
    }
    return "00:00";
}

function isHHMM(s: string) {
    return /^([01]\d|2[0-3]):([0-5]\d)$/.test(s);
}

function localDateTimeToIso(dateYmd: string, timeRaw: string) {
    const time = normalizeTimeInput(timeRaw);
    const [y, m, d] = dateYmd.split("-").map(Number);
    const [hh, mm] = time.split(":").map(Number);
    const dt = new Date(y, (m ?? 1) - 1, d ?? 1, hh ?? 0, mm ?? 0, 0, 0);
    return dt.toISOString();
}

function localDateMidnightToIso(dateYmd: string) {
    const [y, m, d] = dateYmd.split("-").map(Number);
    return new Date(y, (m ?? 1) - 1, d ?? 1, 0, 0, 0, 0).toISOString();
}

function compareLocalDateTime(startDate: string, startTimeRaw: string, endDate: string, endTimeRaw: string) {
    const sIso = localDateTimeToIso(startDate, startTimeRaw);
    const eIso = localDateTimeToIso(endDate, endTimeRaw);
    return sIso.localeCompare(eIso);
}

function addOneDayYmd(ymdStr: string) {
    const [y, m, d] = ymdStr.split("-").map(Number);
    const dt = new Date(y, (m ?? 1) - 1, d ?? 1);
    dt.setDate(dt.getDate() + 1);
    const yyyy = dt.getFullYear();
    const mm = String(dt.getMonth() + 1).padStart(2, "0");
    const dd = String(dt.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
}

function buildStartEndIso(params: {
    allDay: boolean;
    startDate: string;
    startTime: string;
    endDate: string;
    endTime: string;
    autoRollToNextDay?: boolean;
}) {
    const { allDay, startDate, startTime, endDate, endTime } = params;
    const autoRoll = params.autoRollToNextDay ?? true;
    const startIso = allDay
        ? localDateMidnightToIso(startDate)
        : localDateTimeToIso(startDate, startTime);
    if (allDay) return { startIso, endIso: null, endDateEffective: null };
    let endDateEff = endDate;
    if (autoRoll && endDate === startDate) {
        const cmp = compareLocalDateTime(startDate, startTime, endDate, endTime);
        if (cmp > 0) endDateEff = addOneDayYmd(endDate);
    }
    const endIso = localDateTimeToIso(endDateEff, endTime);
    return { startIso, endIso, endDateEffective: endDateEff };
}

function sanitizeTimeKeystroke(s: string) {
    return s.replace(/[^0-9:.\s]/g, "");
}

// --- Component ---

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
        (workspaceParam === "avacrm" || workspaceParam === "ops" || workspaceParam === "content")
            ? (workspaceParam as EventWorkspace)
            : "all"
    );
    const [q, setQ] = useState(qParam);

    const [rows, setRows] = useState<CalendarEvent[]>([]);
    const [loading, setLoading] = useState(false);
    const [err, setErr] = useState<string | null>(null);

    const [open, setOpen] = useState(false);
    const [title, setTitle] = useState("");
    const [kind, setKind] = useState<EventKind>("appointment");
    const [ws, setWs] = useState<EventWorkspace>("avacrm");
    const [allDay, setAllDay] = useState(false);

    const today = useMemo(() => ymd(new Date()), []);
    const [startDate, setStartDate] = useState<string>(today);
    const [endDate, setEndDate] = useState<string>(today);

    const now = new Date();
    const plus1h = new Date(Date.now() + 60 * 60000);
    const toHHmm = (d: Date) => `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;

    const [startTime, setStartTime] = useState<string>(toHHmm(now));
    const [endTime, setEndTime] = useState<string>(toHHmm(plus1h));
    const [desc, setDesc] = useState("");
    const [rolled, setRolled] = useState(false);

    async function load() {
        setLoading(true);
        setErr(null);
        try {
            const data = await fetchEvents({ start, end, workspace, q, limit: 300 });
            setRows(data);
        } catch (e: unknown) {
            if (e instanceof Error) setErr(e.message);
            else setErr("Load failed");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const grouped = useMemo(() => {
        const m = new Map<string, CalendarEvent[]>();
        for (const e of rows) {
            const day = ymd(new Date(e.start_time));
            if (!m.has(day)) m.set(day, []);
            m.get(day)!.push(e);
        }
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
        setErr(null);
        if (!title.trim()) return;
        const st = normalizeTimeInput(startTime);
        const et = normalizeTimeInput(endTime);
        if (!allDay) {
            if (!isHHMM(st) || !isHHMM(et)) {
                setErr("เวลาไม่ถูกต้อง (ใช้รูปแบบ 24 ชม. เช่น 00:30 หรือ 23:30)");
                return;
            }
            if (endDate < startDate) {
                setErr("วันสิ้นสุดต้องไม่อยู่ก่อนวันเริ่มต้น");
                return;
            }
        } else if (startDate > endDate) {
            setErr("วันสิ้นสุดต้องไม่อยู่ก่อนวันเริ่มต้น");
            return;
        }
        const { startIso, endIso } = buildStartEndIso({
            allDay,
            startDate,
            startTime: st,
            endDate,
            endTime: et,
            autoRollToNextDay: true
        });
        if (!allDay && endIso && endIso <= startIso) {
            setErr("เวลาสิ้นสุดต้องมากกว่าเวลาเริ่มต้น");
            return;
        }
        try {
            await createEventApi({
                title: title.trim(),
                start_time: startIso,
                end_time: allDay ? null : endIso,
                all_day: allDay,
                kind,
                workspace: ws,
                description: desc.trim() ? desc.trim() : null,
            });
            setOpen(false);
            setTitle("");
            setDesc("");
            await load();
        } catch (e: unknown) {
            if (e instanceof Error) setErr(e.message);
            else setErr("Failed to create event");
        }
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
                        <input className="border rounded-md px-2 py-1" type="date" value={start} onChange={onChangeText(setStart)} />
                    </div>
                    <div>
                        <div className="text-xs mb-1">End</div>
                        <input className="border rounded-md px-2 py-1" type="date" value={end} onChange={onChangeText(setEnd)} />
                    </div>
                    <div>
                        <div className="text-xs mb-1">Workspace</div>
                        <select
                            className="border rounded-md px-2 py-1"
                            value={workspace}
                            onChange={(e) => {
                                const v = e.target.value;
                                setWorkspace(v as any);
                            }}
                        >
                            <option value="all">All</option>
                            {WORKSPACES.map((w) => (
                                <option key={w} value={w}>
                                    {workspaceLabel(w)}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="flex-1 min-w-[240px]">
                        <div className="text-xs mb-1">Search</div>
                        <input className="border rounded-md px-2 py-1 w-full" value={q} onChange={onChangeText(setQ)} placeholder="ค้นหา title / description" />
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
                            <input className="border rounded-md px-3 py-2 w-full" value={title} onChange={onChangeText(setTitle)} placeholder="Title" />
                            <div className="flex gap-2">
                                <select className="border rounded-md px-2 py-2" value={kind} onChange={(e) => setKind(e.target.value as EventKind)}>
                                    <option value="appointment">appointment</option>
                                    <option value="meeting">meeting</option>
                                    <option value="reminder">reminder</option>
                                </select>
                                <select className="border rounded-md px-2 py-2" value={ws} onChange={(e) => setWs(e.target.value as Workspace)}>
                                    {WORKSPACES.map((w) => (
                                        <option key={w} value={w}>
                                            {workspaceLabel(w)}
                                        </option>
                                    ))}
                                </select>
                                <label className="flex items-center gap-2 text-sm">
                                    <input type="checkbox" checked={allDay} onChange={onChangeCheckbox(setAllDay)} />
                                    All day
                                </label>
                            </div>
                            <div className="flex gap-2">
                                <div className="flex-1">
                                    <div className="text-xs mb-1">Start date</div>
                                    <input className="border rounded-md px-2 py-2 w-full" type="date" value={startDate} onChange={onChangeText(setStartDate)} />
                                </div>
                                <div className="w-40">
                                    <div className="text-xs mb-1">Start time (24h)</div>
                                    <input
                                        className="border rounded-md px-2 py-2 w-full font-mono"
                                        type="text"
                                        inputMode="numeric"
                                        placeholder="HH:MM"
                                        value={startTime}
                                        onChange={(e) => setStartTime(sanitizeTimeKeystroke(e.target.value))}
                                        onBlur={() => {
                                            setStartTime(v => normalizeTimeInput(v));
                                            setEndDate(ed => {
                                                const st = normalizeTimeInput(startTime);
                                                const et = normalizeTimeInput(endTime);
                                                if (!allDay && ed === startDate) {
                                                    const sIso = localDateTimeToIso(startDate, st);
                                                    const eIso = localDateTimeToIso(ed, et);
                                                    if (eIso <= sIso) {
                                                        setRolled(true);
                                                        setTimeout(() => setRolled(false), 5000);
                                                        return addOneDayYmd(ed);
                                                    }
                                                }
                                                return ed;
                                            });
                                        }}
                                        disabled={allDay}
                                    />
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <div className="flex-1">
                                    <div className="text-xs mb-1">End date</div>
                                    <input className="border rounded-md px-2 py-2 w-full" type="date" value={endDate} onChange={onChangeText(setEndDate)} disabled={allDay} />
                                </div>
                                <div className="w-40">
                                    <div className="text-xs mb-1">End time (24h)</div>
                                    <input
                                        className="border rounded-md px-2 py-2 w-full font-mono"
                                        type="text"
                                        inputMode="numeric"
                                        placeholder="HH:MM"
                                        value={endTime}
                                        onChange={(e) => setEndTime(sanitizeTimeKeystroke(e.target.value))}
                                        onBlur={() => {
                                            setEndTime(v => normalizeTimeInput(v));
                                            setEndDate(ed => {
                                                const st = normalizeTimeInput(startTime);
                                                const et = normalizeTimeInput(endTime);
                                                if (!allDay && ed === startDate) {
                                                    const sIso = localDateTimeToIso(startDate, st);
                                                    const eIso = localDateTimeToIso(ed, et);
                                                    if (eIso <= sIso) {
                                                        setRolled(true);
                                                        setTimeout(() => setRolled(false), 5000);
                                                        return addOneDayYmd(ed);
                                                    }
                                                }
                                                return ed;
                                            });
                                        }}
                                        disabled={allDay}
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="text-[11px] opacity-70">
                            ตัวอย่าง: 00:30, 09:05, 23:30 (พิมพ์ 2330 ได้ ระบบจะแปลงเป็น 23:30)
                        </div>
                        {rolled && (
                            <div className="text-[11px] text-orange-700 mt-1">
                                End time น้อยกว่า/เท่ากับ Start time → ระบบเลื่อน End date เป็น “วันถัดไป” ให้อัตโนมัติ
                            </div>
                        )}
                        <textarea className="border rounded-md px-3 py-2 w-full" rows={3} value={desc} onChange={onChangeText(setDesc)} placeholder="Description (optional)" />
                        <button className="bg-black text-white rounded-lg px-4 py-2" onClick={onCreate}>
                            Create
                        </button>
                    </div>
                </div>
            ) : null}
        </div>
    );
}
