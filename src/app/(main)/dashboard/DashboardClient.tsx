"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Bucket = "morning" | "afternoon" | "evening" | "none";

type DashboardDTO = {
    today: {
        date: string;
        total: number;
        by_bucket: Record<Bucket, number>;
        unbucketed: number;
    };
    inbox: { total: number; by_workspace: Record<string, number> };
    done_today: { total: number };
    hygiene: { unscheduled: number };
    workspaces: Array<{
        workspace: string;
        inbox: number;
        today: number;
        done_today: number;
    }>;
    recent: Array<{
        id: string;
        title: string;
        workspace: string;
        status: string;
        updated_at: string;
    }>;
    unscheduled_tasks: Array<{
        id: string;
        title: string;
        workspace: string;
        status: string;
        updated_at: string;
    }>;
    unbucketed_today_tasks: Array<{
        id: string;
        title: string;
        workspace: string;
        status: string;
        updated_at: string;
    }>;
};

function toErrorMessage(e: unknown) {
    if (e instanceof Error) return e.message;
    return typeof e === "string" ? e : JSON.stringify(e);
}

function fmtThai(dt: string) {
    try {
        return new Date(dt).toLocaleString("th-TH", { hour12: false });
    } catch {
        return dt;
    }
}

function Card({
    title,
    value,
    hint,
    onClick,
}: {
    title: string;
    value: number | string;
    hint?: string;
    onClick?: () => void;
}) {
    const clickable = !!onClick;
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={!clickable}
            className={[
                "rounded-2xl border p-4 text-left shadow-sm",
                clickable ? "hover:bg-gray-50 active:bg-gray-100 cursor-pointer" : "opacity-80 cursor-default",
            ].join(" ")}
        >
            <div className="text-sm text-gray-600">{title}</div>
            <div className="mt-1 text-3xl font-semibold">{value}</div>
            {hint ? <div className="mt-2 text-xs text-gray-500">{hint}</div> : null}
        </button>
    );
}

export default function DashboardClient() {
    const router = useRouter();
    const [data, setData] = useState<DashboardDTO | null>(null);
    const [err, setErr] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    async function load() {
        setLoading(true);
        setErr(null);
        try {
            const res = await fetch("/api/dashboard", { cache: "no-store" });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const json = (await res.json()) as DashboardDTO;
            setData(json);
        } catch (e: unknown) {
            setErr(toErrorMessage(e));
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        load();
    }, []);

    if (loading) {
        return (
            <div className="p-6">
                <div className="text-xl font-semibold">Dashboard</div>
                <div className="mt-2 text-sm text-gray-600">กำลังโหลดข้อมูล…</div>
            </div>
        );
    }

    if (err || !data) {
        return (
            <div className="p-6">
                <div className="text-xl font-semibold">Dashboard</div>
                <div className="mt-2 text-sm text-red-600">โหลดไม่สำเร็จ: {err ?? "unknown error"}</div>
                <button
                    className="mt-4 rounded-xl border px-4 py-2 hover:bg-gray-50"
                    onClick={() => load()}
                >
                    Retry
                </button>
            </div>
        );
    }

    const d = data.today.date;

    return (
        <div className="p-6 space-y-8">
            {/* Header */}
            <div className="flex items-start justify-between gap-4">
                <div>
                    <div className="text-xl font-semibold">Dashboard</div>
                    <div className="mt-1 text-sm text-gray-600">
                        ภาพรวมงานวันนี้ ({d}) และสุขภาพของระบบ
                    </div>
                </div>
                <button
                    className="rounded-xl border px-4 py-2 hover:bg-gray-50"
                    onClick={() => load()}
                    title="Refresh"
                >
                    Refresh
                </button>
            </div>

            {/* Section A: KPI Cards */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-6">
                <Card
                    title="Today Total"
                    value={data.today.total}
                    hint="งาน planned วันนี้"
                    onClick={() => router.push(`/today`)}
                />
                <Card
                    title="Today: Morning"
                    value={data.today.by_bucket.morning}
                    onClick={() => router.push(`/today?schedule_bucket=morning`)}
                />
                <Card
                    title="Today: Afternoon"
                    value={data.today.by_bucket.afternoon}
                    onClick={() => router.push(`/today?schedule_bucket=afternoon`)}
                />
                <Card
                    title="Today: Evening"
                    value={data.today.by_bucket.evening}
                    onClick={() => router.push(`/today?schedule_bucket=evening`)}
                />
                <Card
                    title="Unbucketed Today"
                    value={data.today.unbucketed}
                    hint="planned วันนี้ แต่ bucket = none หรือยังเป็น null"
                    onClick={() => router.push(`/today?schedule_bucket=none`)}
                />
                <Card
                    title="Inbox Backlog"
                    value={data.inbox.total}
                    onClick={() => router.push(`/inbox`)}
                />
                {/* ถ้าต้องการ 7 การ์ด (Done today) ให้ย้าย layout เป็น 7 columns หรือแถวใหม่ */}
            </div>

            {/* Optional small row for Done Today + Unscheduled */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <Card
                    title="Done Today"
                    value={data.done_today.total}
                    hint="สถานะ done และ done_at เป็นวันนี้"
                    onClick={() => router.push(`/done`)}
                />
                <Card
                    title="Unscheduled (Hygiene)"
                    value={data.hygiene.unscheduled}
                    hint="งานที่ยังไม่ได้กำหนดวัน (scheduled_date = null)"
                    onClick={() => router.push(`/inbox?scheduled_date=null`)}
                />
            </div>

            {/* Section B: Workload by Workspace */}
            <div className="rounded-2xl border p-4 shadow-sm">
                <div className="flex items-center justify-between">
                    <div className="text-base font-semibold">Workload by Workspace</div>
                    <div className="text-xs text-gray-500">คลิกแถวเพื่อเปิด Inbox ตาม workspace</div>
                </div>

                <div className="mt-3 overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="text-left text-gray-600">
                            <tr className="border-b">
                                <th className="py-2 pr-3">Workspace</th>
                                <th className="py-2 pr-3">Inbox</th>
                                <th className="py-2 pr-3">Today</th>
                                <th className="py-2 pr-3">Done Today</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.workspaces.map((w) => (
                                <tr
                                    key={w.workspace}
                                    className="border-b hover:bg-gray-50 cursor-pointer"
                                    onClick={() => router.push(`/inbox?workspace=${encodeURIComponent(w.workspace)}`)}
                                >
                                    <td className="py-2 pr-3 font-medium">{w.workspace}</td>
                                    <td className="py-2 pr-3">{w.inbox}</td>
                                    <td className="py-2 pr-3">{w.today}</td>
                                    <td className="py-2 pr-3">{w.done_today}</td>
                                </tr>
                            ))}
                            {data.workspaces.length === 0 ? (
                                <tr>
                                    <td className="py-3 text-gray-500" colSpan={4}>
                                        ยังไม่มีข้อมูล workspace
                                    </td>
                                </tr>
                            ) : null}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Section C: Alerts / Recent */}
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                {/* Alerts */}
                <div className="rounded-2xl border p-4 shadow-sm">
                    <div className="text-base font-semibold">Alerts / Hygiene</div>
                    <div className="mt-3 space-y-3 text-sm">
                        <div className="flex items-center justify-between">
                            <div className="text-gray-700">Unscheduled tasks</div>
                            <button
                                className="rounded-xl border px-3 py-1 hover:bg-gray-50"
                                onClick={() => router.push(`/inbox?scheduled_date=null`)}
                            >
                                {data.hygiene.unscheduled}
                            </button>
                        </div>

                        <div className="flex items-center justify-between">
                            <div className="text-gray-700">Inbox backlog</div>
                            <button
                                className="rounded-xl border px-3 py-1 hover:bg-gray-50"
                                onClick={() => router.push(`/inbox`)}
                            >
                                {data.inbox.total}
                            </button>
                        </div>

                        {/* Unscheduled (Top 5) */}
                        <div className="pt-2 border-t">
                            <div className="text-xs text-gray-500">Unscheduled (top 5)</div>
                            <div className="mt-2 space-y-2">
                                {data.unscheduled_tasks.length === 0 ? (
                                    <div className="text-sm text-gray-500">ไม่มีงานหลุดวัน</div>
                                ) : (
                                    data.unscheduled_tasks.map((t) => (
                                        <button
                                            key={t.id}
                                            className="w-full text-left rounded-lg border px-3 py-2 hover:bg-gray-50"
                                            onClick={() => router.push(`/inbox?scheduled_date=null`)}
                                            title="Open Inbox (unscheduled)"
                                        >
                                            <div className="text-sm font-medium line-clamp-1">{t.title}</div>
                                            <div className="mt-1 text-xs text-gray-600">
                                                ws: {t.workspace} · updated: {fmtThai(t.updated_at)}
                                            </div>
                                        </button>
                                    ))
                                )}
                            </div>
                        </div>

                        {/* Unbucketed Today (Top 5) */}
                        <div className="pt-2 border-t">
                            <div className="text-xs text-gray-500">Unbucketed Today (top 5)</div>
                            <div className="mt-2 space-y-2">
                                {data.unbucketed_today_tasks.length === 0 ? (
                                    <div className="text-sm text-gray-500">ไม่มีงานหลุด bucket วันนี้</div>
                                ) : (
                                    data.unbucketed_today_tasks.map((t) => (
                                        <button
                                            key={t.id}
                                            className="w-full text-left rounded-lg border px-3 py-2 hover:bg-gray-50"
                                            onClick={() => router.push(`/today?schedule_bucket=none`)}
                                            title="Open Today (bucket=none)"
                                        >
                                            <div className="text-sm font-medium line-clamp-1">{t.title}</div>
                                            <div className="mt-1 text-xs text-gray-600">
                                                ws: {t.workspace} · updated: {fmtThai(t.updated_at)}
                                            </div>
                                        </button>
                                    ))
                                )}
                            </div>
                        </div>

                        {/* Optional: แสดง top workspace in inbox */}
                        <div className="pt-2 border-t">
                            <div className="text-xs text-gray-500">Inbox by workspace (top)</div>
                            <div className="mt-2 space-y-2">
                                {Object.entries(data.inbox.by_workspace)
                                    .sort((a, b) => b[1] - a[1])
                                    .slice(0, 5)
                                    .map(([ws, c]) => (
                                        <div key={ws} className="flex items-center justify-between">
                                            <button
                                                className="text-left underline decoration-dotted text-gray-800 hover:text-black"
                                                onClick={() => router.push(`/inbox?workspace=${encodeURIComponent(ws)}`)}
                                            >
                                                {ws}
                                            </button>
                                            <div className="text-gray-700">{c}</div>
                                        </div>
                                    ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Recent */}
                <div className="rounded-2xl border p-4 shadow-sm">
                    <div className="text-base font-semibold">Recent activity</div>
                    <div className="mt-3 space-y-2">
                        {data.recent.map((t) => (
                            <div key={t.id} className="rounded-xl border p-3 hover:bg-gray-50">
                                <div className="text-sm font-medium line-clamp-1">{t.title}</div>
                                <div className="mt-1 text-xs text-gray-600 flex flex-wrap gap-x-3 gap-y-1">
                                    <span>ws: {t.workspace}</span>
                                    <span>status: {t.status}</span>
                                    <span>updated: {fmtThai(t.updated_at)}</span>
                                </div>
                            </div>
                        ))}
                        {data.recent.length === 0 ? (
                            <div className="text-sm text-gray-500">ยังไม่มี activity</div>
                        ) : null}
                    </div>
                </div>
            </div>
        </div>
    );
}
