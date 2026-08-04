"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
    Activity,
    CheckSquare,
    Layers,
    HelpCircle,
    Send,
    TrendingUp,
    BarChart2,
    Wand2,
    Inbox,
    AlertCircle,
    Calendar,
    ArrowRight,
    ExternalLink,
    Clock,
    FileText,
    CheckCircle
} from "lucide-react";
import Link from "next/link";

export default function CommandCenterPanel() {
    const [tasks, setTasks] = useState<any[]>([]);
    const [projects, setProjects] = useState<any[]>([]);
    const [imports, setImports] = useState<any[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    const loadCommandData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const [tasksRes, projectsRes, importsRes] = await Promise.all([
                fetch("/api/tasks?limit=300", { cache: "no-store" }),
                fetch("/api/content/writing-lab/projects", { cache: "no-store" }),
                fetch("/api/arbor-inbox", { cache: "no-store" })
            ]);

            if (!tasksRes.ok || !projectsRes.ok || !importsRes.ok) {
                throw new Error("Failed to load command center sources");
            }

            setTasks(await tasksRes.json());
            setProjects(await projectsRes.json());
            setImports(await importsRes.json());
        } catch (err: any) {
            console.error("CommandCenter loading error:", err);
            setError(err?.message || "Failed to load command center");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadCommandData();

        // Listen to global task update events to keep data in sync
        const handleRefresh = () => {
            loadCommandData();
        };
        window.addEventListener("task-updated", handleRefresh);
        return () => window.removeEventListener("task-updated", handleRefresh);
    }, [loadCommandData]);

    // Safe parsed projects filter helper
    const parsedProjects = projects.map(p => {
        if (!p.notes) return null;
        try {
            const parsed = JSON.parse(p.notes);
            if (parsed && parsed.performanceFeedback) {
                return {
                    ...p,
                    parsedNotes: parsed,
                    pf: parsed.performanceFeedback
                };
            }
        } catch {
            // ignore malformed/legacy plain text
        }
        return null;
    }).filter((p): p is any => p !== null);

    // 1. Today Focus logic
    const focusKeywords = ["Review", "Claim", "SEO", "Publish", "Analytics", "Feedback", "Follow-up", "Infographic", "Repost"];
    const matchesFocusKeyword = (title: string, notes: string) => {
        const text = `${title} ${notes || ""}`.toLowerCase();
        return focusKeywords.some(kw => text.includes(kw.toLowerCase()));
    };

    const todayFocusItems = tasks
        .filter(t => {
            const isNotDone = t.status !== "done";
            const isTargetWorkspace = t.workspace === "content" || t.workspace === "other";
            const matchesKeyword = matchesFocusKeyword(t.title || "", t.notes || "");
            return isNotDone && isTargetWorkspace && matchesKeyword;
        })
        .slice(0, 7);

    // 2. This Week Overview status categories count
    const plannedCount = tasks.filter(t => t.status === "planned").length;
    const progressCount = tasks.filter(t => t.status === "in_progress" || t.status === "working").length;
    const reviewTasksCount = tasks.filter(t => t.status === "review" || t.status === "in_review").length;

    const feedbackPendingCount = parsedProjects.filter(p => p.pf.publishingRecord?.publishStatus === "Feedback Pending").length;
    const reviewedProjectsCount = parsedProjects.filter(p => p.pf.publishingRecord?.publishStatus === "Reviewed").length;

    // 3. Content Follow-ups list
    const validFollowupDecisions = [
        "Repost later",
        "Make infographic",
        "Write follow-up article",
        "Create short explainer",
        "Create video script",
        "Improve headline",
        "Improve image",
        "Add internal links",
        "Update article",
        "Review later"
    ];

    const contentFollowups = parsedProjects.filter(p =>
        p.pf.nextDecision?.decision && validFollowupDecisions.includes(p.pf.nextDecision.decision)
    );

    // 4. Optimizer Candidates count grouping
    const repostCandsCount = parsedProjects.filter(p => p.pf.nextDecision?.decision === "Repost later").length;
    const followupCandsCount = parsedProjects.filter(p => p.pf.nextDecision?.decision === "Write follow-up article").length;
    const infographicCandsCount = parsedProjects.filter(p => p.pf.nextDecision?.decision === "Make infographic").length;
    const needsReviewCandsCount = parsedProjects.filter(p => !p.pf.nextDecision?.decision || p.pf.nextDecision.decision === "" || p.pf.nextDecision.decision === "Review later").length;

    // 5. Recent Arbor Imports limit 3
    const recentImportsList = imports.slice(0, 3);

    // 6. Review / Waiting Queue logic
    // - Tasks matching Claim Review, SEO Fields, Image Brief, Facebook Group Post, Analytics Tracking
    // - Projects in Feedback Pending
    // - Projects in Needs Review
    const reviewQueueTasks = tasks.filter(t => {
        if (t.status === "done") return false;
        const text = `${t.title} ${t.notes || ""}`.toLowerCase();
        const keywords = ["claim review", "seo fields", "image brief", "facebook group post", "analytics tracking"];
        return keywords.some(k => text.includes(k));
    }).map(t => ({
        id: t.id,
        title: t.title,
        source: "Task",
        type: t.workspace,
        link: `/arbor-desk?taskId=${t.id}`
    }));

    const reviewQueueFeedbackPending = parsedProjects
        .filter(p => p.pf.publishingRecord?.publishStatus === "Feedback Pending")
        .map(p => ({
            id: p.id,
            title: p.title,
            source: "Content Hub",
            type: "Feedback Pending",
            link: `/workspaces/content/writing-lab?project_id=${p.id}`
        }));

    const reviewQueueNeedsReview = parsedProjects
        .filter(p => !p.pf.nextDecision?.decision || p.pf.nextDecision.decision === "" || p.pf.nextDecision.decision === "Review later")
        .map(p => ({
            id: p.id,
            title: p.title,
            source: "Content Hub",
            type: "Needs Decision",
            link: `/workspaces/content/writing-lab?project_id=${p.id}`
        }));

    const unifiedReviewQueue = [
        ...reviewQueueTasks,
        ...reviewQueueFeedbackPending,
        ...reviewQueueNeedsReview
    ].slice(0, 6);

    // Summary counts for cards
    const totalWeeklyTasks = tasks.filter(t => t.status !== "done").length;

    if (loading) {
        return (
            <div className="bg-theme-card border border-theme-border rounded-[32px] p-6 shadow-sm flex items-center justify-center py-10 gap-2">
                <Clock className="w-4 h-4 text-theme-muted animate-spin" />
                <span className="text-xs text-theme-muted font-bold">กำลังอัปเดตข้อมูล Command Center...</span>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-theme-card border border-red-200 dark:border-red-900/30 p-6 rounded-[32px] shadow-sm text-center">
                <p className="text-xs text-red-500 font-bold">{error}</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header / Title */}
            <div>
                <h2 className="text-xs font-black text-theme-primary uppercase tracking-wider flex items-center gap-1.5">
                    <Activity size={16} className="text-indigo-500 animate-pulse" />
                    Today / This Week Command Center
                </h2>
                <p className="text-[10px] font-bold text-theme-muted mt-0.5">บอร์ดควบคุมและสนับสนุนการตัดสินใจแผนงานรายสัปดาห์</p>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                <div className="bg-theme-card border border-theme-border p-4 rounded-2xl shadow-sm space-y-1">
                    <div className="text-[9px] font-black text-theme-muted uppercase tracking-wider">Today Focus</div>
                    <div className="text-xl font-black text-theme-primary">{todayFocusItems.length}</div>
                    <div className="text-[8px] font-bold text-theme-muted">งานเร่งด่วนวันนี้</div>
                </div>

                <div className="bg-theme-card border border-theme-border p-4 rounded-2xl shadow-sm space-y-1">
                    <div className="text-[9px] font-black text-indigo-500 dark:text-indigo-400 uppercase tracking-wider">This Week Tasks</div>
                    <div className="text-xl font-black text-indigo-600 dark:text-indigo-400">{totalWeeklyTasks}</div>
                    <div className="text-[8px] font-bold text-theme-muted">งานที่ยังไม่ได้ทำ</div>
                </div>

                <div className="bg-theme-card border border-theme-border p-4 rounded-2xl shadow-sm space-y-1">
                    <div className="text-[9px] font-black text-purple-500 dark:text-purple-400 uppercase tracking-wider">Review Queue</div>
                    <div className="text-xl font-black text-purple-600 dark:text-purple-400">{unifiedReviewQueue.length}</div>
                    <div className="text-[8px] font-bold text-theme-muted">งานรอประเมิน</div>
                </div>

                <div className="bg-theme-card border border-theme-border p-4 rounded-2xl shadow-sm space-y-1">
                    <div className="text-[9px] font-black text-emerald-500 uppercase tracking-wider">Content Follow-ups</div>
                    <div className="text-xl font-black text-emerald-600">{contentFollowups.length}</div>
                    <div className="text-[8px] font-bold text-theme-muted">บทความแผนต่อยอด</div>
                </div>

                <div className="bg-theme-card border border-theme-border p-4 rounded-2xl shadow-sm space-y-1">
                    <div className="text-[9px] font-black text-amber-500 uppercase tracking-wider">Optimizer Cands</div>
                    <div className="text-xl font-black text-amber-600">{repostCandsCount + followupCandsCount + infographicCandsCount}</div>
                    <div className="text-[8px] font-bold text-theme-muted">พร้อมแชร์/เขียนต่อ</div>
                </div>

                <div className="bg-theme-card border border-theme-border p-4 rounded-2xl shadow-sm space-y-1">
                    <div className="text-[9px] font-black text-blue-500 uppercase tracking-wider">Recent Imports</div>
                    <div className="text-xl font-black text-blue-600">{imports.slice(0, 5).length}</div>
                    <div className="text-[8px] font-bold text-theme-muted">นำเข้าล่าสุด</div>
                </div>
            </div>

            {/* Split layout for Today Focus & Review Queue vs Content Follow-ups */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Column Left/Mid (2/3 width) - Today Focus, Review Queue & Week Overview */}
                <div className="lg:col-span-2 space-y-6">

                    {/* Today Focus List */}
                    <div className="bg-theme-card border border-theme-border p-5 rounded-[24px] shadow-sm space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-xs font-black text-theme-primary uppercase tracking-wider flex items-center gap-1">
                                <CheckSquare size={14} className="text-emerald-500" />
                                Today Focus Items
                            </h3>
                            <Link href="/planner" className="text-[9px] font-black text-blue-600 hover:underline flex items-center gap-0.5">
                                Go to Planner
                                <ArrowRight size={10} />
                            </Link>
                        </div>

                        {todayFocusItems.length === 0 ? (
                            <div className="py-6 text-center text-xs text-theme-muted font-bold italic bg-theme-input/20 rounded-xl">
                                ไม่มีงานเร่งด่วนวันนี้ สบายใจได้ครับ!
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {todayFocusItems.map((task) => (
                                    <div key={task.id} className="p-3 bg-theme-input/40 dark:bg-zinc-900/40 border border-theme-border rounded-xl flex items-center justify-between gap-4">
                                        <div className="min-w-0">
                                            <Link
                                                href={`/arbor-desk?taskId=${task.id}`}
                                                className="text-xs font-bold text-theme-primary hover:text-blue-600 truncate block"
                                            >
                                                {task.title}
                                            </Link>
                                            <span className="text-[8px] font-black text-theme-muted uppercase tracking-wider mt-0.5 block">
                                                {task.workspace} {task.scheduled_date ? `· ${task.scheduled_date}` : ""}
                                            </span>
                                        </div>
                                        <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase ${
                                            task.priority === 3 ? "bg-red-50 text-red-600 border border-red-100" : "bg-neutral-50 text-neutral-600 border border-neutral-100"
                                        }`}>
                                            {task.priority === 3 ? "High" : "Normal"}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Unified Review Queue */}
                    <div className="bg-theme-card border border-theme-border p-5 rounded-[24px] shadow-sm space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-xs font-black text-theme-primary uppercase tracking-wider flex items-center gap-1">
                                <AlertCircle size={14} className="text-purple-500" />
                                Review & Waiting Queue
                            </h3>
                        </div>

                        {unifiedReviewQueue.length === 0 ? (
                            <div className="py-6 text-center text-xs text-theme-muted font-bold italic bg-theme-input/20 rounded-xl">
                                ไม่มีบทความหรือตัวงานที่ต้องประเมินตรวจสอบ
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {unifiedReviewQueue.map((item, idx) => (
                                    <div key={idx} className="p-3 bg-theme-input/40 dark:bg-zinc-900/40 border border-theme-border rounded-xl flex items-center justify-between gap-4">
                                        <div className="min-w-0">
                                            <Link
                                                href={item.link}
                                                className="text-xs font-bold text-theme-primary hover:text-blue-600 truncate block"
                                            >
                                                {item.title}
                                            </Link>
                                            <span className="text-[8px] font-black text-theme-muted uppercase mt-0.5 block">
                                                Source: {item.source}
                                            </span>
                                        </div>
                                        <span className="px-2 py-0.5 rounded bg-purple-50 text-purple-600 text-[8px] font-black border border-purple-100 uppercase shrink-0">
                                            {item.type}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* This Week Status Overview */}
                    <div className="bg-theme-card border border-theme-border p-5 rounded-[24px] shadow-sm space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-xs font-black text-theme-primary uppercase tracking-wider flex items-center gap-1">
                                <Calendar size={14} className="text-indigo-500" />
                                Weekly Status Overview
                            </h3>
                        </div>

                        <div className="grid grid-cols-5 gap-3">
                            <div className="p-3 bg-theme-input/20 rounded-xl border border-theme-border/50 text-center">
                                <div className="text-[8px] font-black text-theme-muted uppercase">Planned</div>
                                <div className="text-base font-black text-theme-primary mt-1">{plannedCount}</div>
                            </div>
                            <div className="p-3 bg-theme-input/20 rounded-xl border border-theme-border/50 text-center">
                                <div className="text-[8px] font-black text-theme-muted uppercase">In Progress</div>
                                <div className="text-base font-black text-theme-primary mt-1">{progressCount}</div>
                            </div>
                            <div className="p-3 bg-theme-input/20 rounded-xl border border-theme-border/50 text-center">
                                <div className="text-[8px] font-black text-theme-muted uppercase">In Review</div>
                                <div className="text-base font-black text-theme-primary mt-1">{reviewTasksCount}</div>
                            </div>
                            <div className="p-3 bg-theme-input/20 rounded-xl border border-theme-border/50 text-center">
                                <div className="text-[8px] font-black text-theme-muted uppercase">Feedback Pending</div>
                                <div className="text-base font-black text-theme-primary mt-1">{feedbackPendingCount}</div>
                            </div>
                            <div className="p-3 bg-theme-input/20 rounded-xl border border-theme-border/50 text-center">
                                <div className="text-[8px] font-black text-theme-muted uppercase">Reviewed</div>
                                <div className="text-base font-black text-theme-primary mt-1">{reviewedProjectsCount}</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Column Right (1/3 width) - Content Follow-ups & Optimizer Candidates */}
                <div className="space-y-6">

                    {/* Content Follow-ups */}
                    <div className="bg-theme-card border border-theme-border p-5 rounded-[24px] shadow-sm space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-xs font-black text-theme-primary uppercase tracking-wider flex items-center gap-1">
                                <Send size={14} className="text-purple-500" />
                                Content Follow-ups
                            </h3>
                            <Link href="/workspaces/content/gf-hub?tab=analytics" className="text-[9px] font-black text-blue-600 hover:underline">
                                Analytics
                            </Link>
                        </div>

                        {contentFollowups.length === 0 ? (
                            <div className="py-6 text-center text-xs text-theme-muted font-bold italic bg-theme-input/20 rounded-xl">
                                ไม่มีประวัติแผนการต่อยอดบทความ
                            </div>
                        ) : (
                            <div className="space-y-3 max-h-[220px] overflow-y-auto">
                                {contentFollowups.slice(0, 4).map((project) => (
                                    <div key={project.id} className="p-3 bg-theme-input/40 dark:bg-zinc-900/40 border border-theme-border rounded-xl space-y-1">
                                        <Link
                                            href={`/workspaces/content/writing-lab?project_id=${project.id}`}
                                            className="text-xs font-bold text-theme-primary hover:text-blue-600 truncate block"
                                        >
                                            {project.title}
                                        </Link>
                                        <div className="flex items-center justify-between">
                                            <span className="text-[8px] font-black text-indigo-600">
                                                {project.pf.nextDecision.decision}
                                            </span>
                                            <span className={`text-[8px] font-black uppercase ${
                                                project.pf.nextDecision.priority === "High" ? "text-red-500" : "text-neutral-400"
                                            }`}>
                                                {project.pf.nextDecision.priority || "Normal"}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Optimizer Candidates Summary */}
                    <div className="bg-theme-card border border-theme-border p-5 rounded-[24px] shadow-sm space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-xs font-black text-theme-primary uppercase tracking-wider flex items-center gap-1">
                                <Wand2 size={14} className="text-amber-500" />
                                Optimizer Candidates
                            </h3>
                            <Link href="/workspaces/content/gf-hub?tab=optimizer" className="text-[9px] font-black text-blue-600 hover:underline">
                                Go to Optimizer
                            </Link>
                        </div>

                        <div className="space-y-2 text-xs">
                            <div className="flex items-center justify-between py-1.5 border-b border-theme-border/20">
                                <span className="font-bold text-theme-secondary">Repost Candidates</span>
                                <span className="font-black text-theme-primary">{repostCandsCount} ตอน</span>
                            </div>
                            <div className="flex items-center justify-between py-1.5 border-b border-theme-border/20">
                                <span className="font-bold text-theme-secondary">Follow-up Candidates</span>
                                <span className="font-black text-theme-primary">{followupCandsCount} ตอน</span>
                            </div>
                            <div className="flex items-center justify-between py-1.5 border-b border-theme-border/20">
                                <span className="font-bold text-theme-secondary">Infographic Candidates</span>
                                <span className="font-black text-theme-primary">{infographicCandsCount} ตอน</span>
                            </div>
                            <div className="flex items-center justify-between py-1.5">
                                <span className="font-bold text-theme-secondary">Needs Review</span>
                                <span className="font-black text-theme-primary">{needsReviewCandsCount} ตอน</span>
                            </div>
                        </div>
                    </div>

                    {/* Recent Imports Log preview */}
                    <div className="bg-theme-card border border-theme-border p-5 rounded-[24px] shadow-sm space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-xs font-black text-theme-primary uppercase tracking-wider flex items-center gap-1">
                                <Inbox size={14} className="text-blue-500" />
                                Recent Arbor Imports
                            </h3>
                            <Link href="/arbor-inbox" className="text-[9px] font-black text-blue-600 hover:underline">
                                Inbox
                            </Link>
                        </div>

                        {recentImportsList.length === 0 ? (
                            <div className="py-4 text-center text-xs text-theme-muted font-bold italic bg-theme-input/20 rounded-xl">
                                ไม่มีประวัติการนำเข้า
                            </div>
                        ) : (
                            <div className="space-y-2.5">
                                {recentImportsList.map((imp) => {
                                    const total = (imp.summary?.projectsCreated || 0) + (imp.summary?.notesCreated || 0) + (imp.summary?.tasksCreated || 0) + (imp.summary?.articleNotesCreated || 0);
                                    return (
                                        <div key={imp.id} className="text-xs border-b border-theme-border/20 pb-2 last:border-0 last:pb-0">
                                            <div className="flex items-center justify-between gap-1.5">
                                                <span className="font-bold text-theme-primary truncate max-w-[130px]">{imp.importBatchTitle}</span>
                                                <span className={`px-1 rounded text-[8px] font-black uppercase ${
                                                    imp.status === "success" ? "bg-green-50 text-green-600" : "bg-red-50 text-red-500"
                                                }`}>
                                                    {imp.status}
                                                </span>
                                            </div>
                                            <div className="flex justify-between items-center text-[9px] text-theme-muted font-bold mt-1">
                                                <span>{new Date(imp.createdAt).toLocaleDateString('th-TH', { month: 'short', day: 'numeric' })}</span>
                                                <span>Imported: +{total}</span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
