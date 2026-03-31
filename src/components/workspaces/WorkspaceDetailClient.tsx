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
import { resolveNextTask } from "../../lib/smart/queue/resolveNextTask";
import { SingleFlowBar } from "./SingleFlowBar";
import { WorkspaceSwitcher } from "./WorkspaceSwitcher";
import { workspaceLabel } from "@/lib/workspaces";
import { ChevronRight, LayoutGrid } from "lucide-react";

export default function WorkspaceDetailClient({ workspaceId }: { workspaceId: string }) {
    const router = useRouter();
    const ws = WORKSPACES_LIST.find(w => w.id === workspaceId);
 
    const { state, updateState } = useAreasState(workspaceId);
    const [tasks, setTasks] = useState<Task[]>([]);
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
                    fetch(`/api/sprints`) // Sprints are cross-project but we can filter if needed. For now fetch all or simple.
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
            
            // RC8A: Pass multi-value filters to API
            if (state.statusFilter.length > 0) params.set("statuses", state.statusFilter.join(","));
            if (state.workspaceFilter.length > 0) params.set("workspaces", state.workspaceFilter.join(","));
            else params.set("workspace", workspaceId); // Default to current workspace if no specific filter
            
            if (state.listFilter.length > 0) params.set("list_ids", state.listFilter.join(","));
            if (state.sprintFilter.length > 0) params.set("sprint_ids", state.sprintFilter.join(","));
            
            // RC19/RC20: Content specific filters
            if (state.templateFilter.length > 0) params.set("template_keys", state.templateFilter.join(","));
            if (state.reviewStatusFilter.length > 0) params.set("review_statuses", state.reviewStatusFilter.join(",")); // RC26
            if (state.scheduleFilter !== "all") params.set("schedule_state", state.scheduleFilter);
            
            // RC20: Date Range
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
            // 1. Command Palette: Cmd/Ctrl + K
            if ((e.metaKey || e.ctrlKey) && e.key === "k") {
                e.preventDefault();
                lastActiveElement.current = document.activeElement as HTMLElement;
                setIsCommandPaletteOpen(true);
                return;
            }

            // Safety Guard: Check if user is typing in any input/textarea/editable
            const target = e.target as HTMLElement;
            const isTyping = 
                target.tagName === "INPUT" || 
                target.tagName === "TEXTAREA" || 
                target.tagName === "SELECT" || 
                target.isContentEditable ||
                target.closest('[role="combobox"]');

            if (isTyping && !isCommandPaletteOpen) return;

            // 1. Global Quick Add (RC37): n or /
            if (e.key === "n" || e.key === "/") {
                e.preventDefault();
                updateState({ isQuickAddOpen: true });
                return;
            }

            // 2. Esc: Layered closing (one at a time)
            if (e.key === "Escape") {
                // Priority 0: Command Palette (RC38)
                if (isCommandPaletteOpen) {
                    setIsCommandPaletteOpen(false);
                    lastActiveElement.current?.focus();
                    return;
                }

                // Priority A: Inline Popovers/Composers in Table/Package mode
                if (state.isTableQuickAddOpen || state.inlineQuickAddTopicId) {
                    updateState({ 
                        isTableQuickAddOpen: false, 
                        inlineQuickAddTopicId: null 
                    });
                    return;
                }

                // Priority B: Global Quick Add
                if (state.isQuickAddOpen) {
                    updateState({ isQuickAddOpen: false });
                    return;
                }

                // Priority C: Task Drawer
                // Task drawer is closed via removing taskId from URL or setting selectedTaskId
                const searchParams = new URLSearchParams(window.location.search);
                if (searchParams.has("taskId")) {
                    router.push(window.location.pathname);
                    return;
                }

                // Priority D: Flow Mode Exit
                if (state.isFlowMode) {
                    updateState({ isFlowMode: false });
                    return;
                }
            }

            // RC43: Switcher Shortcut (Cmd+Shift+W)
            if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === "w") {
                e.preventDefault();
                setIsSwitcherOpen(true);
                return;
            }

            // RC42: Flow Mode Shortcuts
            if (state.isFlowMode && (e.metaKey || e.ctrlKey)) {
                if (e.key === "Enter") {
                    e.preventDefault();
                    handleFlowDone();
                    return;
                }
                if (e.key === "ArrowRight") {
                    e.preventDefault();
                    handleFlowNext(true); // Skip
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

    // Initial fetch and fetch on filter change
    useEffect(() => {
        fetchTasks(false);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [workspaceId, state.statusFilter, state.workspaceFilter, state.listFilter, state.sprintFilter, state.templateFilter, state.reviewStatusFilter, state.scheduleFilter, state.dateRange.start, state.dateRange.end, state.search]);

    // Handle Task Update
    const handleTaskUpdate = useCallback(async (taskId: string, updates: Partial<Task>) => {
        // Optimistic Update
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
            // Sync with server response
            setTasks(prev => prev.map(t => t.id === taskId ? updatedFromServer : t));
        } catch (e) {
            console.error("Failed to update task", e);
            // Revert on error
            setTasks(prevTasks);
            alert("Failed to update status. Please try again.");
        }
    }, [tasks]);

    // RC42: Single Flow Logic
    const currentTask = useMemo(() => {
        return tasks.find(t => t.id === state.selectedTaskId) || null;
    }, [tasks, state.selectedTaskId]);

    const nextTask = useMemo(() => {
        return resolveNextTask(tasks, state.selectedTaskId);
    }, [tasks, state.selectedTaskId]);

    const handleFlowNext = useCallback((isSkip = false) => {
        if (nextTask) {
            updateState({ 
                selectedTaskId: nextTask.id,
                lastActiveTaskId: nextTask.id
            });
            // If skip, we might want a small transition here in the UI
        } else {
            // No more tasks
            setToast({ isVisible: true, message: "🎉 ทุกอย่างสำเร็จครบถ้วนแล้ว! (All tasks complete)" });
            updateState({ isFlowMode: false });
        }
    }, [nextTask, updateState]);

    const handleFlowDone = useCallback(async () => {
        if (!currentTask) return;
        await handleTaskUpdate(currentTask.id, { status: "done" });
        handleFlowNext(false); // Move to next
    }, [currentTask, handleTaskUpdate, handleFlowNext]);

    const handleWorkspaceSelect = useCallback((newId: string) => {
        setIsSwitcherOpen(false);
        if (newId === workspaceId) return;
        
        // Navigation triggers refetch and sticky task restore in Next.js
        router.push(`/workspaces/${newId}`);
    }, [workspaceId, router]);

    // Sync lastActiveTaskId to state.selectedTaskId on Load
    useEffect(() => {
        if (state.lastActiveTaskId && !state.selectedTaskId && tasks.length > 0) {
            // Validate if task exists and is not done
            const task = tasks.find(t => t.id === state.lastActiveTaskId);
            if (task && task.status !== 'done') {
                updateState({ selectedTaskId: task.id });
            } else {
                // Fallback to next best
                const fallback = resolveNextTask(tasks, null);
                if (fallback) {
                    updateState({ selectedTaskId: fallback.id, lastActiveTaskId: fallback.id });
                }
            }
        }
    }, [tasks.length, state.lastActiveTaskId, state.selectedTaskId, updateState]);

    // Update lastActiveTaskId when selection changes
    useEffect(() => {
        if (state.selectedTaskId && state.selectedTaskId !== state.lastActiveTaskId) {
            updateState({ lastActiveTaskId: state.selectedTaskId });
        }
    }, [state.selectedTaskId, state.lastActiveTaskId, updateState]);

    // RC25: Quick Complete with Auto-focus
    const handleQuickComplete = useCallback(async (taskId: string) => {
        const t = tasks.find(x => x.id === taskId);
        if (!t || t.status === "done") return;

        // 1. Update status to done
        await handleTaskUpdate(taskId, { status: "done" });

        // 2. Auto-focus next logic (only for packages)
        if (t.topic_id) {
            // We need the updated tasks to find the next one
            // Since setTasks is async, we use a timeout or calculate from the "would be" state
            setTimeout(() => {
                setTasks(currentTasks => {
                    const pkgTasks = currentTasks.filter(x => x.topic_id === t.topic_id);
                    const doneCount = pkgTasks.filter(x => x.status === "done").length;
                    const totalCount = pkgTasks.length;

                    // Success Feedback: Package Complete
                    if (doneCount === totalCount && totalCount > 0) {
                        setToast({
                            isVisible: true,
                            message: `🎉 แพ็กเกจ ${t.topic_id} สำเร็จครบถ้วนแล้ว!`,
                        });
                    } else {
                        // Success Feedback: Step Complete
                        setToast({
                            isVisible: true,
                            message: `✅ บันทึกความคืบหน้าของ ${t.topic_id} เรียบร้อย`,
                        });
                    }

                    // Auto-focus Next Step
                    const stepOrder = ["Brief Approved", "Script & Caption", "Assets / Canva", "Publish", "Archive"];
                    const remaining = pkgTasks.filter(x => x.status !== "done");
                    
                    if (remaining.length > 0) {
                        let bestTask = remaining[0];
                        let bestIdx = 99;
                        remaining.forEach(rt => {
                            const idx = stepOrder.findIndex(s => rt.title.toLowerCase().includes(s.toLowerCase()));
                            if (idx !== -1 && idx < bestIdx) {
                                bestIdx = idx;
                                bestTask = rt;
                            }
                        });
                        
                        // Select the next task
                        router.push(`?taskId=${bestTask.id}`);
                    }

                    return currentTasks;
                });
            }, 100);
        }
    }, [tasks, handleTaskUpdate, router]);

    // RC38: Dynamic Command Registry
    const commands = useMemo<CommandOption[]>(() => {
        const pool: CommandOption[] = [
            // Navigation
            { id: "nav-inbox", label: "Go to Inbox", action: () => router.push("/workspaces/inbox"), category: "navigation" },
            { id: "nav-content", label: "Go to Content Workspace", action: () => router.push("/workspaces/content"), category: "navigation" },
            { id: "nav-ops", label: "Go to Operations", action: () => router.push("/workspaces/ops"), category: "navigation" },
            { id: "nav-system", label: "Go to System", action: () => router.push("/workspaces/system"), category: "navigation" },
            
            // Actions
            { id: "act-new-task", label: "New Task", description: "Open global quick add", action: () => updateState({ isQuickAddOpen: true }), category: "actions" },
        ];

        // Context-aware Views
        if (state.viewMode === "package") {
            pool.push({ id: "view-table", label: "Switch to Table Mode", description: "Condensed execution view", action: () => updateState({ viewMode: "list" }), category: "view" });
        } else {
            pool.push({ id: "view-package", label: "Switch to Package View", description: "Structured grouping by topic", action: () => updateState({ viewMode: "package" }), category: "view" });
        }

        // Context-aware Selection
        if (state.selectedTaskId) {
            pool.push({ id: "act-open-task", label: "Open Selected Task", description: "Open task details in drawer", action: () => router.push(`?taskId=${state.selectedTaskId}`), category: "actions" });
        }

        // Context-aware Filters
        const hasFilters = state.statusFilter.length > 0 || state.scheduleFilter !== "all" || state.search;
        if (hasFilters) {
            pool.push({ 
                id: "filter-clear", 
                label: "Clear All Filters", 
                action: () => updateState({ statusFilter: [], scheduleFilter: "all", search: "", listFilter: [], sprintFilter: [] }),
                category: "filters" 
            });
        }
        
        if (!state.statusFilter.includes("done")) {
            pool.push({ id: "filter-done", label: "Show Completed Tasks", action: () => updateState({ statusFilter: ["done"] }), category: "filters" });
        }

        if (state.scheduleFilter !== "scheduled") {
            pool.push({ id: "filter-scheduled", label: "Show Scheduled This Week", action: () => updateState({ scheduleFilter: "scheduled" }), category: "filters" });
        }

        return pool;
    }, [state, router, updateState]);

    // RC39: Computed Suggested View
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
        setToast({
            isVisible: true,
            message: `Switched to ${mode} mode based on suggestion 🚀`,
        });
    };

    const handleDismissViewHint = () => {
        setViewHintDismissed(true);
        setViewHintMemory(workspaceId, { dismissed: true });
    };

    // RC39: Global Quick Add Defaults
    const creationDefaults = useMemo(() => {
        const ctx = buildCreationContext({
            workspaceId,
            workspaceType: ws?.type,
            mode: state.viewMode,
            launchSource: 'global',
        });
        return resolveSmartCreateDefaults(ctx);
    }, [workspaceId, ws?.type, state.viewMode]);

    const handleNewList = () => {
        const title = window.prompt("Enter new list title:");
        if (!title) return;
        const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
        fetch("/api/lists", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ workspace: workspaceId, title, slug })
        }).then(res => {
            if (!res.ok) alert("Failed to create list");
            else alert("List created!");
        });
    };

    // RC40A: Smart Queue Logic
    const smartQueueItems = useMemo(() => {
        if (isQueueDismissed || tasks.length === 0) return [];
        return resolveWorkspaceSmartQueue(tasks, feedbackStore);
    }, [tasks, isQueueDismissed, feedbackStore]);

    const handleQueueItemClick = (item: QueueItem) => {
        // RC41A: Record click
        recordQueueClick(item.identity);
        setFeedbackStore(getAllQueueFeedback()); // Refresh

        if (item.taskId) {
            router.push(`?taskId=${item.taskId}`);
            // If the task is likely in the current list, the router.push will handle highlighting via taskId query param
            // and AreasTaskList already reacts to router.query.taskId
        } else if (item.topicId) {
            // If it's a package cue, expand it
            if (state.collapsedTopicIds.includes(item.topicId)) {
                updateState({
                    collapsedTopicIds: state.collapsedTopicIds.filter(id => id !== item.topicId)
                });
            }
        }
    };

    const handleQueueItemShown = (identity: string) => {
        recordQueueShow(identity);
        // We don't refresh state here to avoid rerender loops while rendering the strip
    };

    if (!ws) return <div className="p-10 text-neutral-500 font-medium">Workspace not found</div>;

    return (
        <div className="flex h-screen flex-col overflow-hidden bg-gray-50/50">
            {/* Toolbar acts as Header */}
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

            {/* RC43A: Breadcrumb Bar */}
            {!isFocusMode && (
                <div className="bg-white px-6 py-2 border-b border-neutral-100 flex items-center gap-2 text-xs font-medium text-neutral-500 overflow-x-auto whitespace-nowrap">
                    <button 
                        onClick={() => router.push('/workspaces')}
                        className="hover:text-neutral-900 flex items-center gap-1 transition-colors"
                    >
                        <LayoutGrid size={12} className="text-neutral-400" />
                        Areas
                    </button>
                    <ChevronRight size={12} className="text-neutral-300" />
                    <button 
                        onClick={() => setIsSwitcherOpen(true)}
                        className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-md hover:bg-indigo-100 transition-all font-bold flex items-center gap-1.5 group"
                        title="คลิกเพื่อสลับ Workspace (Cmd+Shift+W)"
                    >
                        {ws.label}
                        <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 group-hover:scale-125 transition-transform" />
                    </button>
                </div>
            )}

            {/* Filters Row - Compact slightly in focus mode if needed, but keeping for now per constraints */}
            {!isFocusMode && !state.isFlowMode && (
                <AreasFilterBar
                    tasks={tasks}
                    lists={lists}
                    sprints={sprints}
                    state={state}
                    updateState={updateState}
                />
            )}

            {/* Main Content Area */}
            <div className="flex-1 overflow-hidden relative flex flex-col px-4">
                {smartQueueItems.length > 0 && (
                    <SmartQueueStrip 
                        items={smartQueueItems} 
                        onItemClick={handleQueueItemClick}
                        onItemShown={handleQueueItemShown}
                        onDismiss={() => setIsQueueDismissed(true)}
                    />
                )}

                {suggestedView && !isFocusMode && !state.isFlowMode && (
                    <div className="mt-4">
                        <SmartViewHint 
                            label={suggestedView.mode === 'package' ? 'Package View' : 'Table Mode'}
                            reason={suggestedView.reason}
                            confidence={scoreSuggestionConfidence({
                                workspaceType: ws?.type,
                                suggestedMode: suggestedView.mode
                            })}
                            onAccept={() => handleAcceptViewHint(suggestedView.mode)}
                            onDismiss={handleDismissViewHint}
                        />
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
                                        <QuickAddTask 
                                            workspaceId={workspaceId}
                                            initialStatus={creationDefaults.status}
                                            initialListId={creationDefaults.listId}
                                            initialPackageId={creationDefaults.packageId}
                                            initialTopicId={creationDefaults.topicId}
                                            initialStepKey={creationDefaults.packageStepKey}
                                            launchSource="global"
                                            onCreated={(task) => {
                                                // 1. Local update for immediate feedback
                                                setTasks(prev => [task, ...prev]);
                                                
                                                // 2. Select the new task immediately if in flow or if requested
                                                updateState({ 
                                                    isQuickAddOpen: false,
                                                    selectedTaskId: task.id,
                                                    lastActiveTaskId: task.id
                                                });

                                                // 3. Full Revalidation (RC42C)
                                                fetchTasks(false);

                                                setToast({
                                                    isVisible: true,
                                                    message: `Task created: ${task.title}`,
                                                });
                                            }}
                                            onCancel={() => updateState({ isQuickAddOpen: false })}
                                        />
                                    </div>
                                )}

                                <AreasTaskList
                                    workspaceId={workspaceId}
                                    tasks={tasks}
                                    state={state}
                                    onTaskClick={(t) => router.push(`?taskId=${t.id}`)}
                                    onTaskUpdate={handleTaskUpdate}
                                    onQuickComplete={handleQuickComplete}
                                    onTaskCreated={(newTask) => {
                                        setTasks(prev => [newTask, ...prev]);
                                        fetchTasks(false); // RC42C
                                    }}
                                    updateState={updateState}
                                    highlightedTaskIds={highlightedTaskIds}
                                    refresh={() => fetchTasks(false)}
                                />
                                
                                <Toast 
                                    isVisible={toast.isVisible}
                                    message={toast.message}
                                    action={toast.action}
                                    onClose={() => setToast({ ...toast, isVisible: false })}
                                />

                                <CreateContentPackageModal
                                    isOpen={state.isPackageModalOpen}
                                    onClose={() => updateState({ isPackageModalOpen: false })}
                                    onSuccess={(data) => {
                                        fetchTasks(false);
                                        setHighlightedTaskIds(data.taskIds);
                                        setToast({
                                            isVisible: true,
                                            message: `Created ${data.topicId} — 1 note + 5 tasks`,
                                            action: {
                                                label: "Open Note",
                                                onClick: () => router.push(`/notes/edit/${data.noteId}`)
                                            }
                                        });
                                        // Clear highlights after 5s
                                        setTimeout(() => setHighlightedTaskIds([]), 5000);
                                    }}
                                />

                                <CommandPalette 
                                    isOpen={isCommandPaletteOpen}
                                    onClose={() => {
                                        setIsCommandPaletteOpen(false);
                                        lastActiveElement.current?.focus();
                                    }}
                                    commands={commands}
                                />

                                {/* Load More Button */}
                                {hasMore && (
                                    <div className="p-8 flex justify-center pb-32">
                                        <button
                                            onClick={() => fetchTasks(true)}
                                            disabled={loadingTasks}
                                            className="px-6 py-2 bg-white border border-neutral-200 rounded-full text-sm font-bold text-neutral-600 hover:bg-neutral-50 hover:border-neutral-300 transition-all shadow-sm active:scale-95 disabled:opacity-50"
                                        >
                                            {loadingTasks ? "Loading..." : "Load More Tasks"}
                                        </button>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* RC42: Single Flow UI */}
            {state.isFlowMode && (
                <SingleFlowBar 
                    currentTask={currentTask}
                    nextTask={nextTask}
                    onDone={handleFlowDone}
                    onSkip={() => handleFlowNext(true)}
                    onOpenDetail={() => currentTask && router.push(`?taskId=${currentTask.id}`)}
                    onClose={() => updateState({ isFlowMode: false })}
                />
            )}

            {/* RC43B: Switcher Component */}
            <WorkspaceSwitcher
                isOpen={isSwitcherOpen}
                currentWorkspaceId={workspaceId}
                onClose={() => setIsSwitcherOpen(false)}
                onSelect={handleWorkspaceSelect}
            />
        </div>
    );
}
