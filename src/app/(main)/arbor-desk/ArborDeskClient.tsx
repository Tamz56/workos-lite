"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
    PencilSquareIcon,
    DocumentTextIcon,
    FolderIcon,
    CalendarIcon,
    BriefcaseIcon,
    SparklesIcon,
    ArrowRightIcon,
    PlusIcon,
    CheckCircleIcon,
    TableCellsIcon,
    ArrowPathIcon
} from "@heroicons/react/24/outline";
import Link from "next/link";
import { workspaceLabel } from "@/lib/workspaces";
import CommandCenterPanel from "@/components/arbor-desk/CommandCenterPanel";
import LoopsCatalogue from "@/components/arbor-desk/LoopsCatalogue";

interface OverviewData {
    continueLastWork: {
        id: string;
        title: string;
        type: 'draft' | 'doc' | 'task';
        workspace: string;
        updated_at: string;
        excerpt: string;
    } | null;
    todayTasks: Array<{
        id: string;
        title: string;
        workspace: string;
        status: string;
        priority: number;
        scheduled_date: string;
        schedule_bucket: string | null;
    }>;
    recentDocuments: Array<{
        id: string;
        title: string;
        workspace: string | null;
        project_id: string | null;
        updated_at: string;
        attachment_count: number;
    }>;
    projects: Array<{
        id: string;
        name: string;
        slug: string;
        status: string;
    }>;
}

export default function ArborDeskClient() {
    const router = useRouter();
    const sp = useSearchParams();
    const [data, setData] = useState<OverviewData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Quick Note form state
    const [noteContent, setNoteContent] = useState("");
    const [savingNote, setSavingNote] = useState(false);
    const [noteMessage, setNoteMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const [recentImports, setRecentImports] = useState<any[]>([]);
    const [activeTab, setActiveTab] = useState<"home" | "loops">("home");

    const loadData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch("/api/arbor-desk/overview", { cache: "no-store" });
            if (!res.ok) throw new Error("Failed to load desk data");
            const json = await res.json();
            setData(json);

            // Fetch recent imports safely
            try {
                const logsRes = await fetch("/api/arbor-inbox", { cache: "no-store" });
                if (logsRes.ok) {
                    const logsJson = await logsRes.json();
                    setRecentImports(logsJson.slice(0, 3));
                }
            } catch (logsErr) {
                console.error("Failed to load recent imports on desk", logsErr);
            }
        } catch (err: any) {
            console.error("ArborDesk load error", err);
            setError(err?.message || "Failed to load dashboard data");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);

    // Refresh when a task-updated event occurs (like closing the GlobalTaskDialogs)
    useEffect(() => {
        const handleRefresh = () => {
            loadData();
        };
        window.addEventListener("task-updated", handleRefresh);
        return () => window.removeEventListener("task-updated", handleRefresh);
    }, [loadData]);

    const handleSaveQuickNote = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!noteContent.trim()) return;

        setSavingNote(true);
        setNoteMessage(null);

        const now = new Date();
        const dateStr = now.toLocaleDateString('th-TH', { year: 'numeric', month: 'numeric', day: 'numeric' });
        const timeStr = now.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
        const defaultTitle = `Quick Note — ${dateStr} ${timeStr}`;

        try {
            const res = await fetch("/api/docs", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    title: defaultTitle,
                    content_md: noteContent,
                    workspace: "personal" // Default workspace per guidelines
                })
            });

            if (!res.ok) throw new Error("บันทึกข้อมูลล้มเหลว");

            setNoteContent("");
            setNoteMessage({ type: 'success', text: "บันทึกโน้ตสำเร็จ!" });
            setTimeout(() => setNoteMessage(null), 3000);

            // Refresh dashboard data to reflect the new note in recent docs
            loadData();
        } catch (err: any) {
            setNoteMessage({ type: 'error', text: err?.message || "บันทึกข้อมูลล้มเหลว" });
        } finally {
            setSavingNote(false);
        }
    };

    const handleTaskCheck = async (taskId: string, currentStatus: string) => {
        const nextStatus = currentStatus === 'done' ? 'planned' : 'done';
        try {
            const res = await fetch(`/api/tasks/${taskId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: nextStatus })
            });
            if (res.ok) {
                // Instantly update local tasks status for quick feedback
                if (data) {
                    const updatedTasks = data.todayTasks.map(t =>
                        t.id === taskId ? { ...t, status: nextStatus } : t
                    );
                    setData({ ...data, todayTasks: updatedTasks });
                }

                // Dispatch event so other components refresh
                if (typeof window !== "undefined") {
                    window.dispatchEvent(new Event("task-updated"));
                }
            }
        } catch (err) {
            console.error("Failed to update task status", err);
        }
    };

    const formatTimeAgo = (dtStr: string) => {
        try {
            const d = new Date(dtStr);
            return d.toLocaleDateString('th-TH', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
        } catch {
            return dtStr;
        }
    };

    const getContinueLink = (item: OverviewData['continueLastWork']) => {
        if (!item) return "#";
        if (item.type === 'draft') return `/workspaces/content/writing-desk-lite?draft_id=${item.id}`;
        if (item.type === 'doc') return `/docs/${item.id}`;
        if (item.type === 'task') return `/arbor-desk?taskId=${item.id}`;
        return "#";
    };

    const mapStatusLabel = (status: string) => {
        // Mapping as specified: planned -> To Do, working/in_progress -> Doing, waiting/blocked -> Waiting, done/published -> Done, inbox -> Inbox
        switch (status) {
            case 'inbox': return { text: 'Inbox', cls: 'bg-neutral-100 text-neutral-600 dark:bg-zinc-800 dark:text-zinc-400' };
            case 'planned': return { text: 'To Do', cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' };
            case 'in_progress': return { text: 'Doing', cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' };
            case 'review': return { text: 'Waiting', cls: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' };
            case 'done': return { text: 'Done', cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' };
            default: return { text: status.toUpperCase(), cls: 'bg-neutral-100 text-neutral-700' };
        }
    };

    return (
        <div className="max-w-7xl mx-auto px-6 py-8 min-h-[calc(100vh-64px)] flex flex-col gap-8">
            {/* Header Greeting */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-black tracking-tight text-theme-primary">ArborDesk</h1>
                    <p className="text-theme-secondary text-sm mt-1">สวัสดีครับ วันนี้จะทำอะไรต่อ?</p>
                </div>
                <button
                    onClick={loadData}
                    className="p-2.5 rounded-2xl bg-theme-card border border-theme-border text-theme-muted hover:text-theme-primary transition-all active:scale-95 shadow-sm"
                    title="Refresh Data"
                >
                    <ArrowPathIcon className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                </button>
            </div>

            {/* Tab Navigation */}
            <div className="flex border-b border-theme-border/30">
                <button
                    onClick={() => setActiveTab("home")}
                    className={`px-6 py-3 text-sm font-black tracking-tight border-b-2 transition-all -mb-px ${
                        activeTab === "home"
                            ? "border-black dark:border-white text-theme-primary"
                            : "border-transparent text-theme-muted hover:text-theme-primary"
                    }`}
                >
                    Home
                </button>
                <button
                    onClick={() => setActiveTab("loops")}
                    className={`px-6 py-3 text-sm font-black tracking-tight border-b-2 transition-all -mb-px ${
                        activeTab === "loops"
                            ? "border-black dark:border-white text-theme-primary"
                            : "border-transparent text-theme-muted hover:text-theme-primary"
                    }`}
                >
                    Arbor Loops
                </button>
            </div>

            {activeTab === "loops" ? (
                <LoopsCatalogue />
            ) : (
                <>
                    <CommandCenterPanel />

                    {loading && !data ? (
                        <div className="flex-1 flex flex-col items-center justify-center py-20 gap-4">
                            <div className="w-10 h-10 border-4 border-theme-border border-t-blue-600 rounded-full animate-spin"></div>
                            <p className="text-theme-muted text-sm font-medium">กำลังเตรียมโต๊ะทำงานของคุณ...</p>
                        </div>
                    ) : error ? (
                        <div className="p-8 border border-red-200 bg-red-50/20 dark:bg-red-900/10 rounded-3xl text-center space-y-4">
                            <p className="text-red-600 font-bold">{error}</p>
                            <button
                                onClick={loadData}
                                className="px-6 py-2.5 bg-black text-white dark:bg-white dark:text-black rounded-2xl text-xs font-black"
                            >
                                ลองอีกครั้ง
                            </button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">

                            {/* Column Left & Mid (2/3 width) */}
                            <div className="lg:col-span-2 flex flex-col gap-8">

                                {/* 1. Continue Last Work */}
                                <section className="bg-theme-card border border-theme-border rounded-[32px] p-6 shadow-sm flex flex-col justify-between min-h-[200px] hover:border-theme-border/80 transition-all">
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between">
                                            <span className="text-[10px] font-black uppercase tracking-widest text-theme-muted">Continue Last Work (งานล่าสุด)</span>
                                            {data?.continueLastWork && (
                                                <span className="text-[9px] font-bold text-theme-muted">
                                                    แก้ไขเมื่อ {formatTimeAgo(data.continueLastWork.updated_at)}
                                                </span>
                                            )}
                                        </div>

                                        {data?.continueLastWork ? (
                                            <div className="space-y-3">
                                                <div className="flex items-center gap-3">
                                                    <span className="px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-tight bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400 border border-blue-100/55 dark:border-transparent">
                                                        {data.continueLastWork.type}
                                                    </span>
                                                    <span className="text-xs font-bold text-theme-secondary">
                                                        {data.continueLastWork.workspace}
                                                    </span>
                                                </div>
                                                <h3 className="text-xl font-bold text-theme-primary leading-snug">
                                                    {data.continueLastWork.title}
                                                </h3>
                                                {data.continueLastWork.excerpt && (
                                                    <p className="text-xs text-theme-secondary line-clamp-2 leading-relaxed italic">
                                                        &quot;{data.continueLastWork.excerpt}&quot;
                                                    </p>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="py-6 text-center text-xs text-theme-muted font-bold italic">
                                                ยังไม่มีงานล่าสุด เริ่มจากการเขียนงาน จดเร็ว หรือสร้าง Task ใหม่ได้เลย
                                            </div>
                                        )}
                                    </div>

                                    {data?.continueLastWork && (
                                        <div className="mt-6 pt-4 border-t border-theme-border/40 flex justify-end">
                                            <Link
                                                href={getContinueLink(data.continueLastWork)}
                                                className="bg-black text-white dark:bg-white dark:text-black hover:bg-neutral-800 dark:hover:bg-neutral-100 px-5 py-2.5 rounded-2xl text-xs font-black flex items-center gap-2 transition-all active:scale-95 shadow-md shadow-black/10 dark:shadow-none"
                                            >
                                                ทำต่อ
                                                <ArrowRightIcon className="w-4 h-4" />
                                            </Link>
                                        </div>
                                    )}
                                </section>

                                {/* 2. Quick Note Card */}
                                <section className="bg-theme-card border border-theme-border rounded-[32px] p-6 shadow-sm space-y-4">
                                    <div className="flex items-center justify-between">
                                        <h2 className="text-[10px] font-black uppercase tracking-widest text-theme-muted">Quick Note (จดโน้ตด่วน)</h2>
                                        {noteMessage && (
                                            <span className={`text-[10px] font-bold ${noteMessage.type === 'success' ? 'text-green-600' : 'text-red-500'}`}>
                                                {noteMessage.text}
                                            </span>
                                        )}
                                    </div>
                                    <form onSubmit={handleSaveQuickNote} className="space-y-4">
                                        <textarea
                                            value={noteContent}
                                            onChange={(e) => setNoteContent(e.target.value)}
                                            placeholder="จดบันทึกความคิดหรือไอเดียด่วนที่นี่... (จะเซฟเป็นเอกสารในหน้า Note อัตโนมัติ)"
                                            className="w-full min-h-[120px] bg-theme-input border border-theme-border rounded-2xl p-4 text-sm font-medium outline-none focus:border-theme-border/80 transition-all resize-none text-theme-primary placeholder:text-theme-muted"
                                            disabled={savingNote}
                                        />
                                        <div className="flex justify-end">
                                            <button
                                                type="submit"
                                                disabled={savingNote || !noteContent.trim()}
                                                className="bg-black text-white dark:bg-white dark:text-black hover:bg-neutral-800 dark:hover:bg-neutral-100 disabled:bg-theme-border disabled:text-theme-muted px-5 py-2.5 rounded-2xl text-xs font-black transition-all active:scale-95 shadow-md shadow-black/10 dark:shadow-none flex items-center gap-1.5"
                                            >
                                                {savingNote ? "Saving..." : "Save Note"}
                                            </button>
                                        </div>
                                    </form>
                                </section>

                                {/* 3. Today Tasks */}
                                <section className="bg-theme-card border border-theme-border rounded-[32px] p-6 shadow-sm space-y-4">
                                    <div className="flex items-center justify-between">
                                        <h2 className="text-[10px] font-black uppercase tracking-widest text-theme-muted">Today Tasks (งานวันนี้)</h2>
                                        <Link href="/planner" className="text-[10px] font-black text-blue-600 hover:underline flex items-center gap-1">
                                            Go to Planner
                                            <ArrowRightIcon className="w-3 h-3" />
                                        </Link>
                                    </div>

                                    {data?.todayTasks && data.todayTasks.length > 0 ? (
                                        <div className="divide-y divide-theme-border/30">
                                            {data.todayTasks.map(task => {
                                                const mapped = mapStatusLabel(task.status);
                                                return (
                                                    <div key={task.id} className="py-3.5 flex items-center justify-between gap-4 first:pt-0 last:pb-0 group">
                                                        <div className="flex items-center gap-3 min-w-0">
                                                            <button
                                                                onClick={() => handleTaskCheck(task.id, task.status)}
                                                                className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 transition-all ${
                                                                    task.status === 'done'
                                                                        ? 'border-emerald-600 bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20'
                                                                        : 'border-theme-border hover:border-theme-secondary text-transparent hover:text-theme-muted'
                                                                }`}
                                                                title={task.status === 'done' ? 'Mark Planned' : 'Mark Done'}
                                                            >
                                                                <CheckCircleIcon className="w-4 h-4" />
                                                            </button>
                                                            <div className="min-w-0">
                                                                <Link
                                                                    href={`/arbor-desk?taskId=${task.id}`}
                                                                    className={`text-sm font-bold text-theme-primary hover:text-blue-600 truncate block ${
                                                                        task.status === 'done' ? 'line-through text-theme-muted' : ''
                                                                    }`}
                                                                >
                                                                    {task.title}
                                                                </Link>
                                                                <span className="text-[9px] font-bold text-theme-muted uppercase mt-0.5 block">
                                                                    {task.workspace} {task.schedule_bucket ? `· ${task.schedule_bucket}` : ''}
                                                                </span>
                                                            </div>
                                                        </div>
                                                        <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-tight shrink-0 border border-transparent ${mapped.cls}`}>
                                                            {mapped.text}
                                                        </span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    ) : (
                                        <div className="py-8 text-center text-xs text-theme-muted font-bold italic">
                                            ไม่มีงานกำหนดส่งวันนี้ สบายใจได้ครับ!
                                        </div>
                                    )}
                                </section>
                            </div>

                            {/* Column Right (1/3 width) */}
                            <div className="flex flex-col gap-8">

                                {/* 4. Recent Documents */}
                                <section className="bg-theme-card border border-theme-border rounded-[32px] p-6 shadow-sm space-y-4">
                                    <div className="flex items-center justify-between">
                                        <h2 className="text-[10px] font-black uppercase tracking-widest text-theme-muted">Recent Documents</h2>
                                        <Link href="/docs" className="text-[10px] font-black text-blue-600 hover:underline">
                                            All Docs
                                        </Link>
                                    </div>

                                    {data?.recentDocuments && data.recentDocuments.length > 0 ? (
                                        <div className="space-y-3">
                                            {data.recentDocuments.map(doc => (
                                                <Link
                                                    key={doc.id}
                                                    href={`/docs/${doc.id}`}
                                                    className="block p-3 bg-theme-input/40 dark:bg-zinc-900/40 border border-theme-border rounded-2xl hover:border-theme-secondary/40 transition-all group"
                                                >
                                                    <div className="text-xs font-bold text-theme-primary group-hover:text-blue-600 truncate">
                                                        {doc.title || "Untitled Note"}
                                                    </div>
                                                    <div className="flex items-center justify-between mt-2">
                                                        <span className="text-[8px] font-bold text-theme-muted uppercase tracking-wider">
                                                            {doc.workspace ? workspaceLabel(doc.workspace as any) : 'Personal'}
                                                        </span>
                                                        <span className="text-[8px] font-bold text-theme-muted">
                                                            {formatTimeAgo(doc.updated_at)}
                                                        </span>
                                                    </div>
                                                </Link>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="py-6 text-center text-xs text-theme-muted font-bold italic">
                                            ยังไม่มีเอกสารในฐานข้อมูล
                                        </div>
                                    )}
                                </section>

                                {/* 5. Recent Tables */}
                                <section className="bg-theme-card border border-theme-border rounded-[32px] p-6 shadow-sm space-y-4">
                                    <div className="flex items-center justify-between">
                                        <h2 className="text-[10px] font-black uppercase tracking-widest text-theme-muted">Recent Tables</h2>
                                    </div>
                                    <div className="space-y-3">
                                        {[
                                            { name: "Content Calendar", slug: "calendar", desc: "ตารางแผนการโพสต์เนื้อหา Green Fineness" },
                                            { name: "Publish Log", slug: "publish-log", desc: "บันทึกประวัติการเผยแพร่บทความและค่าสถิติ" },
                                            { name: "Article Tracker", slug: "tracker", desc: "สถานะความคืบหน้าของบทความ backlog ทั้งหมด" }
                                        ].map((table, i) => (
                                            <Link
                                                key={i}
                                                href="/workspaces/content/gf-hub"
                                                className="block p-3.5 bg-theme-input/40 dark:bg-zinc-900/40 border border-theme-border rounded-2xl hover:border-theme-secondary/40 transition-all group text-left"
                                            >
                                                <div className="flex items-center gap-2 text-xs font-bold text-theme-primary group-hover:text-blue-600">
                                                    <TableCellsIcon className="w-4 h-4 text-theme-muted shrink-0 group-hover:text-blue-600" />
                                                    {table.name}
                                                </div>
                                                <div className="text-[9px] text-theme-muted font-bold mt-1">
                                                    {table.desc}
                                                </div>
                                            </Link>
                                        ))}
                                    </div>
                                </section>

                                {/* 6. Project Shortcuts */}
                                <section className="bg-theme-card border border-theme-border rounded-[32px] p-6 shadow-sm space-y-4">
                                    <div className="flex items-center justify-between">
                                        <h2 className="text-[10px] font-black uppercase tracking-widest text-theme-muted">Project Shortcuts</h2>
                                        <Link href="/projects" className="text-[10px] font-black text-blue-600 hover:underline">
                                            All Projects
                                        </Link>
                                    </div>

                                    {data?.projects && data.projects.length > 0 ? (
                                        <div className="grid grid-cols-2 gap-3">
                                            {data.projects.map(proj => (
                                                <Link
                                                    key={proj.id}
                                                    href={`/projects`}
                                                    className="p-3 bg-theme-input/40 dark:bg-zinc-900/40 border border-theme-border rounded-2xl hover:border-theme-secondary/40 text-center transition-all group"
                                                >
                                                    <div className="text-[10px] font-black text-theme-primary group-hover:text-blue-600 truncate">
                                                        {proj.name}
                                                    </div>
                                                    <div className="text-[8px] text-theme-muted uppercase font-bold tracking-tighter mt-1">
                                                        {proj.slug}
                                                    </div>
                                                </Link>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="py-6 text-center text-xs text-theme-muted font-bold italic">
                                            ไม่มีโครงการที่จะแสดง
                                        </div>
                                    )}
                                </section>

                                {/* 7. Recent Arbor Imports */}
                                <section className="bg-theme-card border border-theme-border rounded-[32px] p-6 shadow-sm space-y-4">
                                    <div className="flex items-center justify-between">
                                        <h2 className="text-[10px] font-black uppercase tracking-widest text-theme-muted">Recent Imports</h2>
                                        <Link href="/arbor-inbox" className="text-[10px] font-black text-blue-600 hover:underline">
                                            Arbor Inbox
                                        </Link>
                                    </div>

                                    {recentImports.length > 0 ? (
                                        <div className="space-y-3">
                                            {recentImports.map((imp) => {
                                                const totalCreated =
                                                    (imp.summary?.projectsCreated || 0) +
                                                    (imp.summary?.notesCreated || 0) +
                                                    (imp.summary?.tasksCreated || 0) +
                                                    (imp.summary?.articleNotesCreated || 0);
                                                const date = new Date(imp.createdAt).toLocaleDateString('th-TH', {
                                                    day: 'numeric',
                                                    month: 'short',
                                                    hour: '2-digit',
                                                    minute: '2-digit'
                                                });

                                                return (
                                                    <div
                                                        key={imp.id}
                                                        className="p-3 bg-theme-input/40 dark:bg-zinc-900/40 border border-theme-border rounded-2xl space-y-1 text-left"
                                                    >
                                                        <div className="flex items-center justify-between gap-2">
                                                            <span className="text-[10px] font-bold text-theme-primary truncate max-w-[150px]" title={imp.importBatchTitle}>
                                                                {imp.importBatchTitle}
                                                            </span>
                                                            <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-tighter ${
                                                                imp.status === "success"
                                                                    ? "bg-green-500/10 text-green-600 border border-green-500/10"
                                                                    : "bg-red-500/10 text-red-500 border border-red-500/10"
                                                            }`}>
                                                                {imp.status}
                                                            </span>
                                                        </div>
                                                        <div className="flex items-center justify-between text-[8px] text-theme-muted font-bold">
                                                            <span>{date}</span>
                                                            <span>
                                                                Created: +{totalCreated} | Skip: {imp.summary?.skipped || 0}
                                                            </span>
                                                        </div>
                                                        {imp.summary?.errors && imp.summary.errors.length > 0 && (
                                                            <div className="text-[8px] text-red-500 font-bold truncate">
                                                                Err: {imp.summary.errors.join(", ")}
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    ) : (
                                        <div className="py-4 text-center text-xs text-theme-muted font-bold italic">
                                            ไม่มีประวัติการนำเข้า
                                        </div>
                                    )}
                                </section>
                            </div>

                        </div>
                    )}
                </>
            )}
        </div>
    );
}
