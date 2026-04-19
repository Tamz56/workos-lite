"use client";

import React, { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { WORKSPACES_LIST } from "@/lib/workspaces";
import { Task } from "@/lib/types";

// New Areas Components
import { useAreasState } from "./areas/useAreasState";
import AreasToolbar from "./areas/AreasToolbar";
import AreasFilterBar from "./areas/AreasFilterBar";
import AreasTaskList from "./areas/AreasTaskList";
import CreateContentPackageModal from "./areas/CreateContentPackageModal";
import CommandPalette, { CommandOption } from "./areas/CommandPalette";
import QuickAddTask from "./areas/QuickAddTask";
import { Toast } from "../ui/Toast";

// RC39: Smart Suggestions
import { SmartViewHint } from "./SmartViewHint";
import { SmartQueueStrip } from "./SmartQueueStrip";
import { resolveWorkspaceSmartQueue, QueueItem } from "../../lib/smart/queue/resolveWorkspaceSmartQueue";
import { getAllQueueFeedback, recordQueueShow, recordQueueClick, FeedbackStore } from "../../lib/smart/queue/queueFeedbackMemory";
import { buildCreationContext } from "../../lib/smart/context/buildCreationContext";
import { resolveSmartCreateDefaults } from "../../lib/smart/defaults/resolveSmartCreateDefaults";
import { resolveSuggestedView } from "../../lib/smart/view/resolveSuggestedView";
import { scoreSuggestionConfidence } from "../../lib/smart/confidence/scoreSuggestionConfidence";
import { getViewHintMemory, setViewHintMemory, setLastUsedList } from "../../lib/workspaceMemory/smartMemory";
// import { resolveNextTask } from "../../lib/smart/queue/resolveNextTask";
import { SingleFlowBar } from "./SingleFlowBar";
import { WorkspaceSwitcher } from "./WorkspaceSwitcher";
import { workspaceLabel } from "@/lib/workspaces";
import { getWorkspaceColor } from "@/lib/workspaces";
import * as LucideIcons from "lucide-react";
import { ChevronRight, LayoutGrid, X, Play, ArrowRight, CheckCircle2, Clock, List, Zap } from "lucide-react";

// RC47: Intelligence Layer
import { 
    resolveBestNextTask, 
    IntelligenceContext, 
    scoreTask, 
    RecommendationMode, 
    TuningPreferences, 
    FeedbackSignal 
} from "../../lib/smart/intelligence/nextTaskEngine";
import { calculateWorkspaceUrgency, UrgencySignal } from "../../lib/smart/intelligence/workspaceUrgency";

// RC50: Learning imports
import { recordEvent, getEvents, clearEvents } from "../../lib/smart/learning/behaviorTracker";
import { generateInsights, deriveAdaptiveNudges } from "../../lib/smart/learning/insightEngine";
import { deriveSuggestedActions, deriveMicroInsights, recordActionDismissal } from "../../lib/smart/learning/actionEngine";
import { InsightReport, LearningNudges, SuggestedAction, MicroInsight } from "../../lib/smart/learning/types";
import { InsightSummaryModal } from "./InsightSummaryModal";

const DEFAULT_PREFERENCES: TuningPreferences = {
    preferOverdue: false,
    preferContinuity: true,
    reduceResurfacing: false,
    conservative: true
};

export default function WorkspaceDetailClient({ workspaceId }: { workspaceId: string }) {
    const router = useRouter();
    const ws = WORKSPACES_LIST.find(w => w.id === workspaceId);
    const wsColor = ws ? getWorkspaceColor(ws.colorKey) : getWorkspaceColor("neutral");
    const WsIcon = (LucideIcons as any)[ws?.iconKey || "LayoutGrid"] || LayoutGrid;
    
    const { state, updateState } = useAreasState(workspaceId);
    const [tasks, setTasks] = useState<Task[]>([]);
    
    // RC49: Mode & Preferences state with Persistence
    const [mode, setMode] = useState<RecommendationMode>('balanced');
    const [preferences, setPreferences] = useState<TuningPreferences>(DEFAULT_PREFERENCES);
    const [pinnedTaskId, setPinnedTaskId] = useState<string | null>(null);
    
    // RC47/RC48/RC49: Intelligence State (Granular)
    const [skips, setSkips] = useState<Record<string, number>>({});
    const [viewed, setViewed] = useState<string[]>([]);
    const [overrides, setOverrides] = useState<string[]>([]);
    const [feedback, setFeedback] = useState<Record<string, FeedbackSignal>>({});
    const [lastCompletedTaskId, setLastCompletedTaskId] = useState<string | null>(null);

    // RC50/51: Learning State
    const [events, setEvents] = useState<any[]>([]);
    const [report, setReport] = useState<InsightReport | null>(null);
    const [nudges, setNudges] = useState<LearningNudges | null>(null);
    const [suggestions, setSuggestions] = useState<SuggestedAction[]>([]);
    const [microInsight, setMicroInsight] = useState<MicroInsight | null>(null);
    const [isInsightModalOpen, setIsInsightModalOpen] = useState(false);

    const intelligence: IntelligenceContext = useMemo(() => ({
        skips,
        viewed,
        lastCompletedTaskId: lastCompletedTaskId || state.lastActiveTaskId || null,
        overrides,
        mode,
        preferences,
        feedback,
        learningNudges: nudges || undefined
    }), [skips, viewed, lastCompletedTaskId, state.lastActiveTaskId, overrides, mode, preferences, feedback, nudges]);

    // Load/Save Preferences
    useEffect(() => {
        if (typeof window !== 'undefined' && workspaceId) {
            const saved = localStorage.getItem(`ws_prefs_${workspaceId}`);
            if (saved) {
                try {
                    const parsed = JSON.parse(saved);
                    if (parsed.mode) setMode(parsed.mode);
                    if (parsed.preferences) setPreferences(parsed.preferences);
                } catch (e) {
                    console.error("Failed to parse prefs", e);
                }
            }
        }
    }, [workspaceId]);

    useEffect(() => {
        if (typeof window !== 'undefined' && workspaceId) {
            localStorage.setItem(`ws_prefs_${workspaceId}`, JSON.stringify({ mode, preferences }));
        }
    }, [workspaceId, mode, preferences]);

    // Track recently viewed & Initialize Learning
    useEffect(() => {
        if (state.selectedTaskId && !viewed.includes(state.selectedTaskId)) {
            setViewed(prev => [...prev, state.selectedTaskId as string]);
        }
    }, [state.selectedTaskId, viewed]);

    useEffect(() => {
        if (typeof window !== 'undefined' && workspaceId) {
            const evs = getEvents(workspaceId);
            setEvents(evs);
            const rep = generateInsights(evs);
            setReport(rep);
            setNudges(deriveAdaptiveNudges(evs));
            setMicroInsight(deriveMicroInsights(evs));
        }
    }, [workspaceId]);

    const handleResetLearning = useCallback(() => {
        if (workspaceId) {
            clearEvents(workspaceId);
            setEvents([]);
            setReport(null);
            setNudges(null);
            setToast({ isVisible: true, message: "🧹 รีเซ็ตข้อมูลการเรียนรู้เรียบร้อยแล้ว" });
        }
    }, [workspaceId]);

    // RC48B: Selection tracking for stability
    const lastRecommendedId = useRef<string | null>(null);
    const isSystemSelecting = useRef(false);

    // RC47A/C/RC48/RC49: Upgraded Intelligence Resolver
    const smartRecommendation = useMemo(() => {
        return resolveBestNextTask(tasks, null, intelligence, lastRecommendedId.current);
    }, [tasks, intelligence]);

    const headerTaskResult = useMemo(() => {
        // Priority 1: Manual selection (if not done)
        const current = tasks.find(t => t.id === state.selectedTaskId);
        if (current && current.status !== 'done') {
            return scoreTask(current, intelligence, tasks);
        }
        
        // Priority 2: Pinned recommendation
        if (pinnedTaskId) {
            const pinned = tasks.find(t => t.id === pinnedTaskId);
            if (pinned && pinned.status !== 'done') {
                return scoreTask(pinned, intelligence, tasks);
            }
            // Auto-unpin if invalid/done
            setPinnedTaskId(null);
        }

        return smartRecommendation;
    }, [tasks, state.selectedTaskId, intelligence, smartRecommendation, pinnedTaskId]);

    const headerTask = headerTaskResult?.task || null;

    // Track recommendation for stability & overrides
    useEffect(() => {
        if (smartRecommendation?.task.id) {
            lastRecommendedId.current = smartRecommendation.task.id;
        }
    }, [smartRecommendation]);

    // RC49 Handlers
    const handleFeedback = useCallback((taskId: string, signal: FeedbackSignal) => {
        setFeedback(prev => ({ ...prev, [taskId]: signal }));
        recordEvent(workspaceId, 'feedback_given', taskId, { signal });
    }, [workspaceId]);

    const handleModeChange = useCallback((newMode: RecommendationMode) => {
        const prevMode = mode;
        setMode(newMode);
        recordEvent(workspaceId, 'mode_changed', undefined, { fromMode: prevMode, toMode: newMode });
    }, [workspaceId, mode]);

    const handleTogglePreference = useCallback((key: keyof TuningPreferences) => {
        setPreferences(prev => ({ ...prev, [key]: !prev[key] }));
    }, []);

    const handleSkipTask = useCallback((taskId: string) => {
        setSkips(prev => ({ ...prev, [taskId]: (prev[taskId] || 0) + 1 }));
        recordEvent(workspaceId, 'task_skipped', taskId, { activeMode: mode });
    }, [workspaceId, mode]);

    // RC50: Tracking manual overrides
    useEffect(() => {
        if (state.selectedTaskId && !isSystemSelecting.current) {
            const recommendedId = lastRecommendedId.current;
            if (recommendedId && state.selectedTaskId !== recommendedId) {
                if (!overrides.includes(recommendedId)) {
                    setOverrides(prev => [...prev, recommendedId]);
                    recordEvent(workspaceId, 'task_override', recommendedId, { chosenId: state.selectedTaskId });
                }
            }
        }
        isSystemSelecting.current = false;
    }, [state.selectedTaskId, overrides, workspaceId, state.isFlowMode]);

    const handlePinTask = useCallback((taskId: string) => {
        setPinnedTaskId(taskId);
        setToast({ isVisible: true, message: "📌 ปักหมุดงานแนะนำเรียบร้อยแล้ว" });
    }, []);

    // RC51: Action Execution
    const handleSuggestedAction = useCallback((action: SuggestedAction) => {
        if (action.type === 'switch_mode' && action.payload.mode) {
            handleModeChange(action.payload.mode);
        } else if (action.type === 'toggle_pref' && action.payload.preferenceKey) {
            handleTogglePreference(action.payload.preferenceKey);
        } else if (action.type === 'pin_task' && action.payload.taskId) {
            handlePinTask(action.payload.taskId);
        }
        
        recordActionDismissal(action.id);
    }, [handleModeChange, handleTogglePreference, handlePinTask]);

    // RC51: Suggestion Refresh
    useEffect(() => {
        if (report) {
            setSuggestions(deriveSuggestedActions(report, mode, preferences, smartRecommendation?.task.id));
        }
    }, [report, mode, preferences, smartRecommendation?.task.id]);

    // RC47D: Urgency Signal
    const urgencySignal = useMemo(() => calculateWorkspaceUrgency(tasks), [tasks]);

    // RC45: Calculated Stats
    const todoTasks = useMemo(() => tasks.filter(t => t.status !== 'done'), [tasks]);
    const doneTasks = useMemo(() => tasks.filter(t => t.status === 'done'), [tasks]);
    const todoCount = todoTasks.length;
    const inProgressCount = useMemo(() => tasks.filter(t => t.status === 'in_progress').length, [tasks]);

    // RC46: Execution Engine Helpers
    const ensureTaskVisible = useCallback((taskId: string) => {
        const task = tasks.find(t => t.id === taskId);
        if (task?.package_id && state.collapsedTopicIds.includes(task.package_id)) {
            updateState({ 
                collapsedTopicIds: state.collapsedTopicIds.filter(id => id !== task.package_id) 
            });
        }
    }, [tasks, state.collapsedTopicIds, updateState]);

    const handleResumeWork = useCallback(() => {
        isSystemSelecting.current = true;
        const currentSelected = tasks.find(t => t.id === state.selectedTaskId);
        const lastActive = tasks.find(t => t.id === state.lastActiveTaskId);
        
        const bestNext = smartRecommendation?.task;

        const toResume = (lastActive && lastActive.status !== 'done' && tasks.some(tx => tx.id === lastActive.id))
            ? lastActive
            : (currentSelected && currentSelected.status !== 'done')
                ? currentSelected
                : bestNext;
        
        if (toResume) {
            ensureTaskVisible(toResume.id);
            updateState({ 
                selectedTaskId: toResume.id,
                isFlowMode: true 
            });
            router.push(`?taskId=${toResume.id}`);
            setToast({ isVisible: true, message: `🚀 กลับเข้าสู่การทำงาน: ${toResume.title}` });
        } else {
            setToast({ isVisible: true, message: "ไม่มีงานค้างที่ต้องการ Resume ในขณะนี้" });
        }
    }, [tasks, state.lastActiveTaskId, state.selectedTaskId, updateState, ensureTaskVisible, router, smartRecommendation]);

    const handleOpenNextTask = useCallback(() => {
        isSystemSelecting.current = true;
        const next = smartRecommendation?.task;
        if (next) {
            ensureTaskVisible(next.id);
            updateState({ selectedTaskId: next.id });
            router.push(`?taskId=${next.id}`);
            setToast({ isVisible: true, message: `เปิดงานถัดไป: ${next.title}` });
        } else {
            setToast({ isVisible: true, message: "คุณเคลียร์งานทั้งหมดเรียบร้อยแล้ว!" });
        }
    }, [updateState, ensureTaskVisible, router, smartRecommendation]);

    const [isSwitcherOpen, setIsSwitcherOpen] = useState(false);
    const [loadingTasks, setLoadingTasks] = useState(true);
    const [offset, setOffset] = useState(0);
    const [hasMore, setHasMore] = useState(true);
    const [lists, setLists] = useState<any[]>([]);
    const [sprints, setSprints] = useState<any[]>([]);
    const LIMIT = 50;

    // Feedback state for RC16
    const [toast, setToast] = useState<{
        isVisible: boolean;
        message: string;
        action?: { label: string; onClick: () => void };
    }>({ isVisible: false, message: "" });
    const [highlightedTaskIds, setHighlightedTaskIds] = useState<string[]>([]);

    // RC38: Command Palette State
    const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
    const lastActiveElement = useRef<HTMLElement | null>(null);

    // RC40A: Smart Queue State
    const [isQueueDismissed, setIsQueueDismissed] = useState(false);

    // RC39: View Hint State
    const [viewHintDismissed, setViewHintDismissed] = useState(false);
    const [viewHintAccepted, setViewHintAccepted] = useState(false);

    // RC41: Feedback & Focus
    const [feedbackStore, setFeedbackStore] = useState<FeedbackStore>({});
    const [isFocusMode, setIsFocusMode] = useState(false);
    const toggleFocusMode = () => setIsFocusMode(!isFocusMode);

    useEffect(() => {
        if (typeof window !== 'undefined' && workspaceId) {
            const memory = getViewHintMemory(workspaceId);
            if (memory.dismissed) setViewHintDismissed(true);
            if (memory.accepted) setViewHintAccepted(true);
            setFeedbackStore(getAllQueueFeedback());
        }
    }, [workspaceId]);

    // Fetch Metadata (Lists/Sprints) once for the workspace
    useEffect(() => {
        async function fetchMetadata() {
            try {
                const [lRes, sRes] = await Promise.all([
                    fetch(`/api/lists?workspace=${workspaceId}`),
                    fetch(`/api/sprints`) 
                ]);
                const lData = await lRes.json();
                const sData = await sRes.json();
                setLists(lData);
                setSprints(sData);
            } catch (e) {
                console.error("Failed to fetch metadata", e);
            }
        }
        fetchMetadata();
    }, [workspaceId]);

    // Fetch Tasks with Server-side Filtering & Pagination
    const fetchTasks = useCallback(async (isLoadMore = false) => {
        const currentOffset = isLoadMore ? offset + LIMIT : 0;
        if (!isLoadMore) setLoadingTasks(true);

        try {
            const params = new URLSearchParams();
            if (state.statusFilter.length > 0) params.set("statuses", state.statusFilter.join(","));
            if (state.workspaceFilter.length > 0) params.set("workspaces", state.workspaceFilter.join(","));
            else params.set("workspace", workspaceId); 
            
            if (state.listFilter.length > 0) params.set("list_ids", state.listFilter.join(","));
            if (state.sprintFilter.length > 0) params.set("sprint_ids", state.sprintFilter.join(","));
            if (state.templateFilter.length > 0) params.set("template_keys", state.templateFilter.join(","));
            if (state.reviewStatusFilter.length > 0) params.set("review_statuses", state.reviewStatusFilter.join(",")); 
            if (state.scheduleFilter !== "all") params.set("schedule_state", state.scheduleFilter);
            if (state.dateRange.start) params.set("start", state.dateRange.start);
            if (state.dateRange.end) params.set("end", state.dateRange.end);
            if (state.search) params.set("q", state.search);
            
            params.set("limit", LIMIT.toString());
            params.set("offset", currentOffset.toString());

            const res = await fetch(`/api/tasks?${params.toString()}`);
            const data = (await res.json()) as Task[];

            if (isLoadMore) {
                setTasks(prev => [...prev, ...data]);
            } else {
                setTasks(data);
            }
            
            setOffset(currentOffset);
            setHasMore(data.length === LIMIT);
        } catch (e) {
            console.error("Failed to fetch tasks", e);
        } finally {
            setLoadingTasks(false);
        }
    }, [workspaceId, state.statusFilter, state.workspaceFilter, state.listFilter, state.sprintFilter, state.templateFilter, state.reviewStatusFilter, state.scheduleFilter, state.dateRange.start, state.dateRange.end, state.search, offset]);

    // RC37: Keyboard-First Flow
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "k") {
                e.preventDefault();
                lastActiveElement.current = document.activeElement as HTMLElement;
                setIsCommandPaletteOpen(true);
                return;
            }

            const target = e.target as HTMLElement;
            const isTyping = 
                target.tagName === "INPUT" || 
                target.tagName === "TEXTAREA" || 
                target.tagName === "SELECT" || 
                target.isContentEditable ||
                target.closest('[role="combobox"]');

            if (isTyping && !isCommandPaletteOpen) return;

            if (e.key === "n" || e.key === "/") {
                e.preventDefault();
                updateState({ isQuickAddOpen: true });
                return;
            }

            if (e.key === "Escape") {
                if (isCommandPaletteOpen) {
                    setIsCommandPaletteOpen(false);
                    lastActiveElement.current?.focus();
                    return;
                }
                if (state.isTableQuickAddOpen || state.inlineQuickAddTopicId) {
                    updateState({ 
                        isTableQuickAddOpen: false, 
                        inlineQuickAddTopicId: null 
                    });
                    return;
                }
                if (state.isQuickAddOpen) {
                    updateState({ isQuickAddOpen: false });
                    return;
                }
                const searchParams = new URLSearchParams(window.location.search);
                if (searchParams.has("taskId")) {
                    router.push(window.location.pathname);
                    return;
                }
                if (state.isFlowMode) {
                    updateState({ isFlowMode: false });
                    return;
                }
            }

            if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === "j") {
                e.preventDefault();
                setIsSwitcherOpen(true);
                return;
            }

            if (state.isFlowMode && (e.metaKey || e.ctrlKey)) {
                if (e.key === "Enter") {
                    e.preventDefault();
                    handleFlowDone();
                    return;
                }
                if (e.key === "ArrowRight") {
                    e.preventDefault();
                    handleFlowNext(true); 
                    return;
                }
                if (e.key === "o") {
                    e.preventDefault();
                    if (state.selectedTaskId) router.push(`?taskId=${state.selectedTaskId}`);
                    return;
                }
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [isCommandPaletteOpen, state.isQuickAddOpen, state.isTableQuickAddOpen, state.inlineQuickAddTopicId, state.isFlowMode, state.selectedTaskId, updateState, router]);

    useEffect(() => {
        fetchTasks(false);
    }, [workspaceId, state.statusFilter, state.workspaceFilter, state.listFilter, state.sprintFilter, state.templateFilter, state.reviewStatusFilter, state.scheduleFilter, state.dateRange.start, state.dateRange.end, state.search, fetchTasks]);

    const handleTaskUpdate = useCallback(async (taskId: string, updates: Partial<Task>) => {
        const prevTasks = [...tasks];
        setTasks(prev => prev.map(t => t.id === taskId ? { ...t, ...updates } : t));

        try {
            const res = await fetch(`/api/tasks/${taskId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(updates),
            });
            if (!res.ok) throw new Error("Update failed");
            
            const { task: updatedFromServer } = await res.json();
            setTasks(prev => prev.map(t => t.id === taskId ? updatedFromServer : t));

            if (updates.status === 'done') {
                setLastCompletedTaskId(taskId);
                recordEvent(workspaceId, 'task_completed', taskId, { activeMode: mode });

                const isFlow = state.isFlowMode;
                const nextResult = resolveBestNextTask(tasks, taskId, intelligence);
                const next = nextResult?.task;

                if (isFlow) {
                    if (next) {
                        handleFlowNext(false, taskId); 
                    } else {
                        setToast({ 
                            isVisible: true, 
                            message: "🎊 ยอดเยี่ยม! คุณเคลียร์งานทั้งหมดใน Workspace นี้เรียบร้อยแล้ว",
                        });
                        updateState({ isFlowMode: false });
                    }
                } else if (next) {
                    setToast({
                        isVisible: true,
                        message: `งานเสร็จเรียบร้อย! ขั้นตอนถัดไป: ${next.title}`,
                        action: {
                            label: "เริ่มทำเลย",
                            onClick: () => {
                                ensureTaskVisible(next.id);
                                updateState({ selectedTaskId: next.id });
                                router.push(`?taskId=${next.id}`);
                            }
                        }
                    });
                }
            }
        } catch (e) {
            console.error("Failed to update task", e);
            setTasks(prevTasks);
        }
    }, [tasks, state.isFlowMode, updateState, router, ensureTaskVisible, intelligence]);

    const currentTask = useMemo(() => {
        return tasks.find(t => t.id === state.selectedTaskId) || null;
    }, [tasks, state.selectedTaskId]);

    const nextTask = useMemo(() => {
        const result = resolveBestNextTask(tasks, state.selectedTaskId, intelligence);
        return result?.task || null;
    }, [tasks, state.selectedTaskId, intelligence]);

    const handleFlowNext = useCallback((isSkip = false, currentId?: string) => {
        const activeId = currentId || state.selectedTaskId;
        
        if (isSkip && activeId) {
            handleSkipTask(activeId);
        }

        const nextResult = resolveBestNextTask(tasks, activeId, intelligence);
        const next = nextResult?.task;

        if (next) {
            ensureTaskVisible(next.id);
            updateState({ 
                selectedTaskId: next.id,
                lastActiveTaskId: next.id
            });
            router.push(`?taskId=${next.id}`);
            if (isSkip) {
                setToast({ isVisible: true, message: `ข้ามไปที่: ${next.title}` });
            }
        } else {
            setToast({ isVisible: true, message: "🎉 ทุกอย่างสำเร็จครบถ้วนแล้ว! (All tasks complete)" });
            updateState({ isFlowMode: false });
        }
    }, [tasks, state.selectedTaskId, updateState, ensureTaskVisible, router, intelligence, handleSkipTask]);

    const handleFlowDone = useCallback(async () => {
        if (!currentTask) return;
        await handleTaskUpdate(currentTask.id, { status: "done" });
    }, [currentTask, handleTaskUpdate]);

    const handleWorkspaceSelect = useCallback((newId: string) => {
        setIsSwitcherOpen(false);
        if (newId === workspaceId) return;
        router.push(`/workspaces/${newId}`);
    }, [workspaceId, router]);

    useEffect(() => {
        if (state.lastActiveTaskId && !state.selectedTaskId && tasks.length > 0) {
            const task = tasks.find(t => t.id === state.lastActiveTaskId);
            if (task && task.status !== 'done') {
                ensureTaskVisible(task.id);
                updateState({ selectedTaskId: task.id });
            } else {
                const fallbackResult = resolveBestNextTask(tasks, null, intelligence);
                const fallback = fallbackResult?.task;
                if (fallback) {
                    ensureTaskVisible(fallback.id);
                    updateState({ selectedTaskId: fallback.id, lastActiveTaskId: fallback.id });
                }
            }
        }
    }, [tasks.length, state.lastActiveTaskId, state.selectedTaskId, updateState, ensureTaskVisible, tasks, intelligence]);

    useEffect(() => {
        if (state.selectedTaskId && state.selectedTaskId !== state.lastActiveTaskId) {
            updateState({ lastActiveTaskId: state.selectedTaskId });
        }
    }, [state.selectedTaskId, state.lastActiveTaskId, updateState]);

    const handleQuickComplete = useCallback(async (taskId: string) => {
        const t = tasks.find(x => x.id === taskId);
        if (!t || t.status === "done") return;
        await handleTaskUpdate(taskId, { status: "done" });
        if (t.topic_id) {
            setTimeout(() => {
                setTasks(currentTasks => {
                    const pkgTasks = currentTasks.filter(x => x.topic_id === t.topic_id);
                    const doneCount = pkgTasks.filter(x => x.status === "done").length;
                    const totalCount = pkgTasks.length;
                    if (doneCount === totalCount && totalCount > 0) {
                        setToast({ isVisible: true, message: `🎉 แพ็กเกจ ${t.topic_id} สำเร็จครบถ้วนแล้ว!` });
                    } else {
                        setToast({ isVisible: true, message: `✅ บันทึกความคืบหน้าของ ${t.topic_id} เรียบร้อย` });
                    }
                    const remaining = pkgTasks.filter(x => x.status !== "done");
                    if (remaining.length > 0) {
                        const stepOrder = ["Brief Approved", "Script & Caption", "Assets / Canva", "Publish", "Archive"];
                        let bestTask = remaining[0];
                        let bestIdx = 99;
                        remaining.forEach(rt => {
                            const idx = stepOrder.findIndex(s => rt.title.toLowerCase().includes(s.toLowerCase()));
                            if (idx !== -1 && idx < bestIdx) {
                                bestIdx = idx;
                                bestTask = rt;
                            }
                        });
                        router.push(`?taskId=${bestTask.id}`);
                    }
                    return currentTasks;
                });
            }, 100);
        }
    }, [tasks, handleTaskUpdate, router]);

    const commands = useMemo<CommandOption[]>(() => {
        const pool: CommandOption[] = [
            { id: "nav-inbox", label: "Go to Inbox", action: () => router.push("/workspaces/inbox"), category: "navigation" },
            { id: "nav-content", label: "Go to Content Workspace", action: () => router.push("/workspaces/content"), category: "navigation" },
            { id: "nav-ops", label: "Go to Operations", action: () => router.push("/workspaces/ops"), category: "navigation" },
            { id: "nav-system", label: "Go to System", action: () => router.push("/workspaces/system"), category: "navigation" },
            { id: "act-new-task", label: "New Task", description: "Open global quick add", action: () => updateState({ isQuickAddOpen: true }), category: "actions" },
        ];
        if (state.viewMode === "package") {
            pool.push({ id: "view-table", label: "Switch to Table Mode", action: () => updateState({ viewMode: "list" }), category: "view" });
        } else {
            pool.push({ id: "view-package", label: "Switch to Package View", action: () => updateState({ viewMode: "package" }), category: "view" });
        }
        if (state.selectedTaskId) {
            pool.push({ id: "act-open-task", label: "Open Selected Task", action: () => router.push(`?taskId=${state.selectedTaskId}`), category: "actions" });
        }
        return pool;
    }, [state, router, updateState]);

    const suggestedView = useMemo(() => {
        if (viewHintDismissed || viewHintAccepted) return null;
        return resolveSuggestedView({
            workspaceId,
            workspaceType: ws?.type,
            currentMode: state.viewMode,
            hasAnyTasks: tasks.length > 0,
            packageLinkedTaskCount: tasks.filter(t => t.package_id).length,
        });
    }, [workspaceId, ws?.type, state.viewMode, tasks, viewHintDismissed, viewHintAccepted]);

    const handleAcceptViewHint = (mode: 'package' | 'list') => {
        updateState({ viewMode: mode });
        setViewHintAccepted(true);
        setViewHintMemory(workspaceId, { accepted: true });
    };

    const handleDismissViewHint = () => {
        setViewHintDismissed(true);
        setViewHintMemory(workspaceId, { dismissed: true });
    };

    const creationDefaults = useMemo(() => {
        const ctx = buildCreationContext({ workspaceId, workspaceType: ws?.type, mode: state.viewMode, launchSource: 'global' });
        return resolveSmartCreateDefaults(ctx);
    }, [workspaceId, ws?.type, state.viewMode]);

    const handleNewList = () => {
        const title = window.prompt("Enter new list title:");
        if (!title) return;
        fetch("/api/lists", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ workspace: workspaceId, title, slug: title.toLowerCase().replace(/ /g, '-') })
        });
    };

    const smartQueueItems = useMemo(() => {
        if (isQueueDismissed || tasks.length === 0) return [];
        return resolveWorkspaceSmartQueue(tasks, feedbackStore);
    }, [tasks, isQueueDismissed, feedbackStore]);

    const handleQueueItemClick = (item: QueueItem) => {
        recordQueueClick(item.identity);
        setFeedbackStore(getAllQueueFeedback());
        if (item.taskId) router.push(`?taskId=${item.taskId}`);
        else if (item.topicId && state.collapsedTopicIds.includes(item.topicId)) {
            updateState({ collapsedTopicIds: state.collapsedTopicIds.filter(id => id !== item.topicId) });
        }
    };

    const handleQueueItemShown = (identity: string) => recordQueueShow(identity);

    if (!ws) return null;

    return (
        <div className="flex h-screen flex-col overflow-hidden bg-gray-50/50">
            <AreasToolbar
                title={ws.label}
                state={state}
                updateState={updateState}
                onNewList={handleNewList}
                workspaceId={workspaceId}
                onNewPackage={() => updateState({ isPackageModalOpen: true })}
                isFocusMode={isFocusMode}
                onToggleFocusMode={toggleFocusMode}
            />

            <div className={`bg-white border-b border-neutral-100 flex flex-col md:flex-row items-stretch md:items-center justify-between z-20 shadow-sm transition-all duration-300 ${isFocusMode ? 'py-1 opacity-90' : 'py-2 md:py-3'}`}>
                <div className="flex items-center gap-2 px-6 border-b md:border-b-0 md:border-r border-neutral-100 py-2 md:py-0">
                    <button onClick={() => router.push('/workspaces')} className="p-1.5 hover:bg-neutral-100 rounded-lg text-neutral-400 hover:text-neutral-600 transition-colors">
                        <LayoutGrid size={18} />
                    </button>
                    <ChevronRight size={14} className="text-neutral-300" />
                    <button onClick={() => setIsSwitcherOpen(true)} className={`flex items-center gap-2.5 px-3 py-1.5 rounded-xl border transition-all active:scale-95 group ${wsColor.border} ${wsColor.light}`}>
                        <div className={`w-6 h-6 rounded-lg ${wsColor.bg} text-white flex items-center justify-center shadow-sm`}>
                            <WsIcon size={14} />
                        </div>
                        <span className={`text-sm font-black tracking-tight ${wsColor.text}`}>{ws.label}</span>
                        <div className={`w-1.5 h-1.5 rounded-full ${wsColor.dot} animate-pulse`} />
                    </button>

                    <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg ${urgencySignal.bgColor} border border-neutral-100/50 shadow-sm`}>
                        <div className={`w-2 h-2 rounded-full ${urgencySignal.dotColor} ${urgencySignal.status === 'critical' ? 'animate-ping' : ''}`} />
                        <span className={`text-[10px] font-black uppercase tracking-wider ${urgencySignal.color}`}>
                            {urgencySignal.label}
                        </span>
                    </div>
                </div>

                <div className="flex-1 flex flex-col sm:flex-row items-center gap-4 md:gap-8 px-6 py-2 md:py-0 overflow-hidden">
                    <div className="flex items-center gap-5 shrink-0">
                        <div className="flex flex-col">
                            <span className="text-[9px] font-black text-neutral-400 uppercase tracking-widest">Tasks</span>
                            <div className="flex items-center gap-1.5">
                                <span className="text-sm font-black text-neutral-900">{todoCount}</span>
                                <span className="text-[10px] font-bold text-neutral-400">/ {tasks.length}</span>
                            </div>
                        </div>
                        <div className="w-px h-6 bg-neutral-100 hidden sm:block" />
                        <div className="flex flex-col">
                            <span className="text-[9px] font-black text-neutral-400 uppercase tracking-widest">In Progress</span>
                            <div className="flex items-center gap-1.5 text-amber-600">
                                <Clock size={12} className="shrink-0" />
                                <span className="text-sm font-black">{inProgressCount}</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex-1 flex items-center gap-3 bg-neutral-50/80 px-4 py-2 rounded-2xl border border-neutral-100/50 max-w-lg overflow-hidden group hover:bg-white hover:border-neutral-200 transition-all cursor-default shadow-sm hover:shadow-md">
                        <div className="p-1.5 bg-white rounded-xl shadow-sm border border-neutral-100 text-neutral-400 group-hover:text-black transition-colors shrink-0">
                            <ArrowRight size={14} />
                        </div>
                        
                        <div className="flex flex-col min-w-0 flex-1">
                            {headerTaskResult && (
                                <div className="flex items-center gap-2 mb-0.5">
                                    <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-lg border shadow-sm ${
                                        headerTaskResult.confidence === 'high' ? 'bg-green-50 text-green-700 border-green-100' :
                                        headerTaskResult.confidence === 'medium' ? 'bg-amber-50 text-amber-700 border-amber-100' :
                                        'bg-neutral-100 text-neutral-600 border-neutral-200'
                                    }`}>
                                        {headerTaskResult.confidence}
                                    </span>
                                    <span className="text-[10px] font-bold text-neutral-400 truncate italic bg-white/50 px-1.5 rounded-md">
                                        {headerTaskResult.explanation}
                                    </span>
                                    {headerTaskResult.nudgeReason && (
                                        <span className="text-[9px] font-black text-amber-500/80 bg-amber-50 px-1.5 rounded-md border border-amber-100 flex items-center gap-1">
                                            <Zap size={8} className="fill-current" /> {headerTaskResult.nudgeReason}
                                        </span>
                                    )}
                                    {microInsight && (
                                        <span className={`text-[9px] font-bold px-1.5 rounded-md border animate-in slide-in-from-left-2 duration-500 ${
                                            microInsight.type === 'success' ? 'text-green-600 bg-green-50 border-green-100' : 
                                            microInsight.type === 'nudge' ? 'text-amber-600 bg-amber-50 border-amber-100' :
                                            'text-blue-600 bg-blue-50 border-blue-100'
                                        }`}>
                                            {microInsight.message}
                                        </span>
                                    )}
                                    <button 
                                        onClick={() => setIsInsightModalOpen(true)}
                                        className="ml-1 p-1 bg-white text-amber-500 rounded-md border border-neutral-100 shadow-sm hover:scale-110 transition-transform"
                                        title="View Insights"
                                    >
                                        <Zap size={10} className="fill-current" />
                                    </button>
                                </div>
                            )}
                            <div className="flex items-center gap-2">
                                {pinnedTaskId === headerTask?.id && <LucideIcons.Pin size={10} className="text-amber-500 fill-amber-500 shrink-0" />}
                                <span className={`text-xs font-black truncate ${pinnedTaskId === headerTask?.id ? 'text-amber-700' : 'text-neutral-800'}`}>
                                    {headerTask?.title || "คุณเคลียร์งานทั้งหมดเรียบร้อยแล้ว!"}
                                </span>
                            </div>
                        </div>

                        {headerTask && (
                            <div className="flex items-center gap-1.5 ml-2 border-l border-neutral-100 pl-3">
                                <div className="flex items-center bg-white/50 rounded-lg border border-neutral-100/50 p-0.5 shadow-sm">
                                    <button onClick={() => { handleFeedback(headerTask.id, 'good'); setToast({ isVisible: true, message: "🙌 ขอบคุณครับ ทีมงานจะแนะนำงานแบบนี้ให้บ่อยขึ้น" }); }} className={`p-1.5 rounded-md transition-all hover:bg-green-50 hover:text-green-600 ${feedback[headerTask.id] === 'good' ? 'text-green-600 bg-green-50' : 'text-neutral-300'}`}>
                                        <LucideIcons.ThumbsUp size={12} />
                                    </button>
                                    <button onClick={() => { handleFeedback(headerTask.id, 'not_now'); setToast({ isVisible: true, message: "⏳ เข้าใจครับ ไว้เราค่อยกลับมาดูงานนี้ใหม่" }); }} className={`p-1.5 rounded-md transition-all hover:bg-amber-50 hover:text-amber-600 ${feedback[headerTask.id] === 'not_now' ? 'text-amber-600 bg-amber-50' : 'text-neutral-300'}`}>
                                        <LucideIcons.Calendar size={12} />
                                    </button>
                                    <button onClick={() => { handleFeedback(headerTask.id, 'wrong_context'); setToast({ isVisible: true, message: "🚫 รับทราบครับ จะลดลำดับความสำคัญของงานนี้ลง" }); }} className={`p-1.5 rounded-md transition-all hover:bg-red-50 hover:text-red-600 ${feedback[headerTask.id] === 'wrong_context' ? 'text-red-600 bg-red-50' : 'text-neutral-300'}`}>
                                        <LucideIcons.AlertCircle size={12} />
                                    </button>
                                </div>

                                <button onClick={() => setPinnedTaskId(pinnedTaskId === headerTask.id ? null : headerTask.id)} className={`p-2 rounded-xl border transition-all shadow-sm ${pinnedTaskId === headerTask.id ? 'bg-amber-500 border-amber-600 text-white' : 'bg-white border-neutral-200 text-neutral-400 hover:border-amber-500 hover:text-amber-500'}`}>
                                    <LucideIcons.Pin size={12} className={pinnedTaskId === headerTask.id ? "fill-current" : ""} />
                                </button>

                                <div className="relative group/tuning">
                                    <button className="p-2 bg-white border border-neutral-200 text-neutral-400 rounded-xl hover:bg-neutral-50 hover:text-black transition-all shadow-sm">
                                        <LucideIcons.Settings2 size={12} />
                                    </button>
                                    <div className="absolute top-full right-0 mt-2 w-56 bg-white rounded-2xl border border-neutral-200 shadow-2xl p-4 invisible group-hover/tuning:visible opacity-0 group-hover/tuning:opacity-100 transition-all z-50">
                                        <h4 className="text-[10px] font-black uppercase text-neutral-400 tracking-widest mb-3 px-1">Reco Settings</h4>
                                        <div className="space-y-1 mb-4 border-b border-neutral-50 pb-4">
                                            {(['balanced', 'urgency', 'focus', 'momentum'] as RecommendationMode[]).map(m => (
                                                <button key={m} onClick={() => handleModeChange(m)} className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-between ${mode === m ? 'bg-black text-white' : 'hover:bg-neutral-50 text-neutral-600'}`}>
                                                    <span className="capitalize">{m}</span>
                                                    {mode === m && <CheckCircle2 size={10} />}
                                                </button>
                                            ))}
                                        </div>
                                        <div className="space-y-3">
                                            {Object.entries(preferences).map(([key, val]) => (
                                                <div key={key} className="flex items-center justify-between px-1">
                                                    <span className="text-[10px] font-bold text-neutral-500 capitalize">{key.replace(/([A-Z])/g, ' $1')}</span>
                                                    <button onClick={() => handleTogglePreference(key as keyof TuningPreferences)} className={`w-8 h-4 rounded-full transition-all relative ${val ? 'bg-black' : 'bg-neutral-200'}`}>
                                                        <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all ${val ? 'left-4.5' : 'left-0.5'}`} />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-2 px-6 py-2 md:py-0 border-t md:border-t-0 md:border-l border-neutral-100">
                    <button onClick={handleResumeWork} disabled={loadingTasks || !todoCount} className={`group flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-black transition-all active:scale-95 disabled:opacity-50 disabled:grayscale disabled:scale-100 ${wsColor.bg} text-white shadow-lg ${wsColor.ring} hover:brightness-110`}>
                        <Play size={14} className="fill-current" /> Resume
                    </button>
                    <button onClick={handleOpenNextTask} disabled={loadingTasks || !headerTask} className="flex items-center gap-2 px-4 py-2 bg-white border border-neutral-200 text-neutral-700 rounded-xl text-sm font-black hover:bg-neutral-50 hover:border-neutral-300 transition-all active:scale-95 disabled:opacity-50">
                        Go <ArrowRight size={14} />
                    </button>
                </div>
            </div>

            {!isFocusMode && !state.isFlowMode && (
                <AreasFilterBar tasks={tasks} lists={lists} sprints={sprints} state={state} updateState={updateState} />
            )}

            <div className="flex-1 overflow-hidden relative flex flex-col px-4">
                {smartQueueItems.length > 0 && (
                    <SmartQueueStrip items={smartQueueItems} onItemClick={handleQueueItemClick} onItemShown={handleQueueItemShown} onDismiss={() => setIsQueueDismissed(true)} />
                )}
                {suggestedView && !isFocusMode && !state.isFlowMode && (
                    <div className="mt-4">
                        <SmartViewHint label={suggestedView.mode === 'package' ? 'Package View' : 'Table Mode'} reason={suggestedView.reason} confidence={scoreSuggestionConfidence({ workspaceType: ws?.type, suggestedMode: suggestedView.mode })} onAccept={() => handleAcceptViewHint(suggestedView.mode)} onDismiss={handleDismissViewHint} />
                    </div>
                )}
                <div className="flex-1 overflow-hidden relative flex flex-col">
                    <div className="flex-1 overflow-y-auto relative custom-scrollbar">
                        {loadingTasks && tasks.length === 0 ? (
                            <div className="absolute inset-0 flex items-center justify-center">
                                <div className="text-neutral-400 font-bold uppercase tracking-widest text-sm animate-pulse flex items-center gap-3">
                                    <span className="animate-spin text-xl">⌛</span> Syncing Workspace...
                                </div>
                            </div>
                        ) : (
                            <>
                                {state.isQuickAddOpen && (
                                    <div className="max-w-4xl mx-auto w-full py-4 animate-in slide-in-from-top-4 duration-300">
                                        <QuickAddTask workspaceId={workspaceId} initialStatus={creationDefaults.status} initialListId={creationDefaults.listId} initialPackageId={creationDefaults.packageId} initialTopicId={creationDefaults.topicId} initialStepKey={creationDefaults.packageStepKey} launchSource="global" onCreated={(task) => { setTasks(prev => [task, ...prev]); updateState({ isQuickAddOpen: false, selectedTaskId: task.id, lastActiveTaskId: task.id }); fetchTasks(false); }} onCancel={() => updateState({ isQuickAddOpen: false })} />
                                    </div>
                                )}
                                <AreasTaskList workspaceId={workspaceId} tasks={tasks} state={state} onTaskClick={(t: Task) => router.push(`?taskId=${t.id}`)} onTaskUpdate={handleTaskUpdate} onQuickComplete={handleQuickComplete} onTaskCreated={(newTask: Task) => { setTasks(prev => [newTask, ...prev]); fetchTasks(false); }} updateState={updateState} highlightedTaskIds={highlightedTaskIds} refresh={() => fetchTasks(false)} />
                                <Toast isVisible={toast.isVisible} message={toast.message} action={toast.action} onClose={() => setToast({ ...toast, isVisible: false })} />
                                <CreateContentPackageModal isOpen={state.isPackageModalOpen} onClose={() => updateState({ isPackageModalOpen: false })} onSuccess={(data) => { fetchTasks(false); setHighlightedTaskIds(data.taskIds); setTimeout(() => setHighlightedTaskIds([]), 5000); }} />
                                <CommandPalette isOpen={isCommandPaletteOpen} onClose={() => { setIsCommandPaletteOpen(false); lastActiveElement.current?.focus(); }} commands={commands} />
                                {hasMore && (
                                    <div className="p-8 flex justify-center pb-32">
                                        <button onClick={() => fetchTasks(true)} disabled={loadingTasks} className="px-6 py-2 bg-white border border-neutral-200 rounded-full text-sm font-bold text-neutral-600 hover:bg-neutral-50 hover:border-neutral-300 transition-all shadow-sm active:scale-95 disabled:opacity-50">
                                            {loadingTasks ? "Loading..." : "Load More Tasks"}
                                        </button>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </div>

            {state.isFlowMode && (
                <SingleFlowBar currentTask={currentTask} nextTask={nextTask} onDone={handleFlowDone} onSkip={() => handleFlowNext(true)} onOpenDetail={() => currentTask && router.push(`?taskId=${currentTask.id}`)} onClose={() => updateState({ isFlowMode: false })} />
            )}

            <WorkspaceSwitcher isOpen={isSwitcherOpen} currentWorkspaceId={workspaceId} onClose={() => setIsSwitcherOpen(false)} onSelect={handleWorkspaceSelect} />

            <InsightSummaryModal 
                isOpen={isInsightModalOpen} 
                onClose={() => setIsInsightModalOpen(false)} 
                report={report}
                suggestions={suggestions}
                onReset={handleResetLearning}
                onAction={handleSuggestedAction}
            />
        </div>
    );
}
