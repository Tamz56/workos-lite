import React, { useMemo, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Task } from "@/lib/types";
import { AreasViewState } from "./useAreasState";
import { selectGroupedTasks } from "./areasSelectors";
import TaskRow from "./TaskRow";
import QuickAddTask from "./QuickAddTask";
import { GroupedVirtuoso, VirtuosoHandle } from "react-virtuoso";
import PackageGroupHeader from "./PackageGroupHeader";
import { WORKSPACES_LIST } from "@/lib/workspaces";
import * as LucideIcons from "lucide-react";
import { Plus, LayoutGrid, Zap } from "lucide-react";

interface AreasTaskListProps {
    workspaceId: string;
    tasks: Task[];
    state: AreasViewState;
    onTaskClick: (task: Task) => void;
    onTaskUpdate: (taskId: string, updates: Partial<Task>) => Promise<void> | void;
    onQuickComplete?: (taskId: string) => void; // RC25
    onTaskCreated: (task: Task) => void;
    updateState: (updates: Partial<AreasViewState>) => void; // RC22
    highlightedTaskIds?: string[];
    refresh?: () => void; // RC24
}

export default function AreasTaskList({ 
    workspaceId, 
    tasks, 
    state, 
    onTaskClick, 
    onTaskUpdate, 
    onQuickComplete,
    onTaskCreated,
    updateState,
    highlightedTaskIds = [],
    refresh
}: AreasTaskListProps) {
    const router = useRouter();
    const virtuosoRef = useRef<VirtuosoHandle>(null);
    
    // Delegate complex logic to pure selector
    const grouped = useMemo(() => selectGroupedTasks(tasks, state), [tasks, state]);

    // RC22: Calculate group counts including collapse logic
    const groupCounts = useMemo(() => {
        return grouped.map(g => {
            const isCollapsed = g.topicId && state.collapsedTopicIds.includes(g.topicId);
            return isCollapsed ? 0 : g.tasks.length;
        });
    }, [grouped, state.collapsedTopicIds]);

    const flattenedTasks = useMemo(() => {
        return grouped.flatMap(g => {
            const isCollapsed = g.topicId && state.collapsedTopicIds.includes(g.topicId);
            return isCollapsed ? [] : g.tasks;
        });
    }, [grouped, state.collapsedTopicIds]);

    // Toggle Collapse Handler
    const handleToggleTopic = (topicId: string) => {
        const current = state.collapsedTopicIds;
        if (current.includes(topicId)) {
            updateState({ collapsedTopicIds: current.filter(id => id !== topicId) });
        } else {
            updateState({ collapsedTopicIds: [...current, topicId] });
        }
    };

    // RC37: Enhanced keyboard navigation (j, k, Arrows, Enter)
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Safety Guard: Check if user is typing
            const target = e.target as HTMLElement;
            if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT" || target.isContentEditable || target.closest('[role="combobox"]'))) {
                return;
            }

            // RC37 Constraint: Table Mode Row Navigation ONLY
            if (state.viewMode !== "list") return;

            const isNavKey = e.key === "ArrowUp" || e.key === "ArrowDown" || e.key === "j" || e.key === "k";
            const isEnter = e.key === "Enter";

            if (isNavKey) {
                if (flattenedTasks.length === 0) return;

                // 1. Auto-initialize selection if nothing is selected
                if (!state.selectedTaskId) {
                    onTaskClick(flattenedTasks[0]);
                    e.preventDefault();
                    return;
                }

                const currentIndex = flattenedTasks.findIndex(t => t.id === state.selectedTaskId);
                if (currentIndex === -1) return;

                let nextIndex = currentIndex;
                if ((e.key === "ArrowUp" || e.key === "k") && currentIndex > 0) nextIndex = currentIndex - 1;
                if ((e.key === "ArrowDown" || e.key === "j") && currentIndex < flattenedTasks.length - 1) nextIndex = currentIndex + 1;

                if (nextIndex !== currentIndex) {
                    e.preventDefault();
                    const nextTask = flattenedTasks[nextIndex];
                    onTaskClick(nextTask);
                    
                    // Virtualized scroll to index
                    virtuosoRef.current?.scrollToIndex({
                        index: nextIndex,
                        align: "center",
                        behavior: "smooth"
                    });
                }
            }

            if (isEnter && state.selectedTaskId) {
                const currentTask = flattenedTasks.find(t => t.id === state.selectedTaskId);
                if (currentTask) {
                    e.preventDefault();
                    onTaskClick(currentTask); // This triggers the drawer open logic via parent
                }
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [state.selectedTaskId, state.viewMode, flattenedTasks, onTaskClick]);

    // RC46: Viewport-aware Auto-Scroll
    useEffect(() => {
        if (state.selectedTaskId && state.isFlowMode) {
            const index = flattenedTasks.findIndex(t => t.id === state.selectedTaskId);
            if (index !== -1) {
                // Only scroll if we are in Flow Mode (system-led)
                // Virtuoso handles internal "is in viewport" checks if we use 'center' align,
                // but for specialized 'only if outside' behavior, we rely on Virtuoso's internal state.
                // For RC46, we'll perform a standard scroll with 'center' alignment to ensure focus.
                virtuosoRef.current?.scrollToIndex({
                    index,
                    align: "center",
                    behavior: "smooth"
                });
            }
        }
    }, [state.selectedTaskId, state.isFlowMode, flattenedTasks]);

    // RC45: Empty State Logic
    if (tasks.length === 0 && !state.isQuickAddOpen) {
        const wsConfig = WORKSPACES_LIST.find(w => w.id === workspaceId);
        const empty = wsConfig?.emptyState;
        const WsIcon = (LucideIcons as any)[wsConfig?.iconKey || "LayoutGrid"] || LayoutGrid;

        return (
            <div className="flex-1 flex flex-col items-center justify-center p-8 bg-neutral-50/30 min-h-[400px]">
                <div className="max-w-md w-full bg-white border border-neutral-200 rounded-[32px] p-10 text-center shadow-xl shadow-neutral-200/50 flex flex-col items-center animate-in fade-in zoom-in-95 duration-500">
                    <div className="w-20 h-20 bg-neutral-50 rounded-[24px] flex items-center justify-center mb-6 border border-neutral-100 shadow-inner group">
                        <WsIcon size={32} className="text-neutral-400 group-hover:scale-110 transition-transform duration-300" />
                    </div>
                    
                    <h2 className="text-2xl font-black text-neutral-900 tracking-tight mb-3">
                        {empty?.title || "No tasks found"}
                    </h2>
                    <p className="text-neutral-500 text-sm font-medium mb-10 leading-relaxed">
                        {empty?.description || "This workspace is currently empty. Start by adding your first task or using a template."}
                    </p>

                    <div className="w-full flex flex-col gap-3">
                        <button 
                            onClick={() => {
                                if (empty?.actionType === 'newPackage') updateState({ isPackageModalOpen: true });
                                else updateState({ isQuickAddOpen: true });
                            }}
                            className="w-full py-4 bg-black text-white rounded-2xl font-black text-sm hover:bg-neutral-800 transition-all active:scale-95 flex items-center justify-center gap-2 shadow-lg shadow-black/10"
                        >
                            <Plus size={18} />
                            {empty?.actionLabel || "Add Task"}
                        </button>
                        
                        <button 
                            onClick={() => router.push('/workspaces')}
                            className="w-full py-4 bg-white border border-neutral-200 text-neutral-500 rounded-2xl font-bold text-sm hover:bg-neutral-50 transition-all flex items-center justify-center gap-2"
                        >
                            <LayoutGrid size={16} />
                            Back to All Areas
                        </button>
                    </div>

                    <div className="mt-8 flex items-center gap-2 text-[10px] font-bold text-neutral-300 uppercase tracking-widest">
                        <Zap size={10} className="fill-current" />
                        Smart Workspace Engine Active
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-white overflow-hidden relative">
            {/* Field Headers (Fixed above the list) */}
            <div className="hidden sm:flex items-center py-2 px-4 border-b border-neutral-200 bg-neutral-50/80 text-[10px] uppercase font-bold text-neutral-400 tracking-wider z-20 backdrop-blur-sm shrink-0">
                <div className="flex-1 ml-5">Task Name</div>
                <div className="flex items-center gap-6 ml-4">
                    <div className="w-20">Status</div>
                    <div className="w-24">Date</div>
                    <div className="w-16">Priority</div>
                    <div className="hidden md:block w-32">List</div>
                    <div className="hidden lg:block w-20">Sprint</div>
                    <div className="w-16 text-right">Links</div>
                </div>
            </div>

            <div className="flex-1 overflow-hidden">
                <GroupedVirtuoso
                    ref={virtuosoRef}
                    groupCounts={groupCounts}
                    groupContent={(index) => {
                        const group = grouped[index];
                        // RC33: Minimal header for List Mode
                        if (state.viewMode === 'list') {
                            const isTodoGroup = group.key === "To-Do";
                            return (
                                <div className="flex flex-col">
                                    <div className="bg-neutral-50/80 backdrop-blur-sm py-1 px-4 border-b border-neutral-100 flex items-center justify-between">
                                        <h3 className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">{group.key}</h3>
                                        <span className="text-[9px] font-bold text-neutral-300">
                                            {group.tasks.length} {group.tasks.length === 1 ? 'task' : 'tasks'}
                                        </span>
                                    </div>
                                    
                                    {/* RC36: Table Mode Quick Add Row at top of To-Do */}
                                    {isTodoGroup && (
                                        <div className="bg-white border-b border-neutral-100">
                                            {state.isTableQuickAddOpen ? (
                                                <QuickAddTask 
                                                    workspaceId={workspaceId}
                                                    initialListId={group.tasks[0]?.list_id}
                                                    onCreated={onTaskCreated}
                                                    onCancel={() => updateState({ isTableQuickAddOpen: false })}
                                                    launchSource="table"
                                                    placeholder="Add a task to To-Do..."
                                                />
                                            ) : (
                                                <button 
                                                    onClick={() => updateState({ isTableQuickAddOpen: true })}
                                                    className="w-full text-left px-11 py-2 text-sm text-neutral-400 hover:text-neutral-600 hover:bg-neutral-50/50 transition-colors flex items-center gap-2 group"
                                                >
                                                    <span className="text-lg leading-none group-hover:scale-110 transition-transform">+</span>
                                                    <span className="font-medium">Add a task...</span>
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        }

                        if (group.isPackage && group.topicId) {
                            const isComposerOpen = state.inlineQuickAddTopicId === group.topicId;
                            return (
                                <div className="flex flex-col">
                                    <PackageGroupHeader 
                                        topicId={group.topicId}
                                        tasks={group.tasks}
                                        templateKey={group.templateKey}
                                        packageDone={group.packageDone}
                                        packageTotal={group.packageTotal}
                                        scheduledDate={group.scheduledDate}
                                        docId={group.docId}
                                        isCollapsed={state.collapsedTopicIds.includes(group.topicId)}
                                        isFullyComplete={group.isFullyComplete} // RC25
                                        readyToPublish={group.readyToPublish} // RC27
                                        publishedAt={group.publishedAt} // RC28
                                        channels={group.channels} // RC29
                                        isChannelsInconsistent={group.isChannelsInconsistent} // RC29
                                        onToggle={() => handleToggleTopic(group.topicId!)}
                                        onOpenNote={() => {
                                            if (group.docId) {
                                                window.location.hash = `#/notes/edit/${group.docId}`;
                                            }
                                        }}
                                        onCopyId={() => {
                                            if (group.topicId) {
                                                navigator.clipboard.writeText(group.topicId);
                                            }
                                        }}
                                        onFocus={() => {
                                            if (group.topicId) {
                                                updateState({ search: group.topicId });
                                            }
                                        }}
                                        onQuickAdd={() => updateState({ inlineQuickAddTopicId: group.topicId })} // RC36
                                        nextTaskId={group.nextTaskId}
                                        onNextStep={(taskId) => {
                                            const task = tasks.find(t => t.id === taskId);
                                            if (task) onTaskClick(task);
                                        }}
                                        onOpenWorkspace={() => {
                                            // 1. Open Note
                                            if (group.docId) {
                                                window.location.hash = `#/notes/edit/${group.docId}`;
                                            }
                                            // 2. Select next task if it exists
                                            if (group.nextTaskId) {
                                                const task = tasks.find(t => t.id === group.nextTaskId);
                                                if (task) onTaskClick(task);
                                            }
                                            // 3. Ensure group is expanded
                                            if (group.topicId && state.collapsedTopicIds.includes(group.topicId)) {
                                                handleToggleTopic(group.topicId);
                                            }
                                        }}
                                        onReschedule={async (newDate) => {
                                            if (!group.topicId) return;
                                            try {
                                                const res = await fetch("/api/tasks/batch", {
                                                    method: "PATCH",
                                                    headers: { "Content-Type": "application/json" },
                                                    body: JSON.stringify({
                                                        topicId: group.topicId,
                                                        newPublishDate: newDate
                                                    })
                                                });
                                                if (!res.ok) throw new Error("Batch update failed");
                                                
                                                // RC24: Use explicit refresh instead of state hack
                                                if (refresh) refresh();
                                                else updateState({ search: state.search }); // Fallback
                                            } catch (e) {
                                                console.error(e);
                                                alert("Failed to reschedule package.");
                                            }
                                        }}
                                        reviewStatus={group.reviewStatus} // RC26
                                        onUpdateReviewStatus={async (newStatus) => {
                                            if (!group.topicId) return;
                                            try {
                                                const res = await fetch("/api/tasks/batch", {
                                                    method: "PATCH",
                                                    headers: { "Content-Type": "application/json" },
                                                    body: JSON.stringify({
                                                        topicId: group.topicId,
                                                        newReviewStatus: newStatus
                                                    })
                                                });
                                                if (!res.ok) throw new Error("Status update failed");
                                                
                                                if (refresh) refresh();
                                                else updateState({ search: state.search });
                                            } catch (e) {
                                                console.error(e);
                                                alert("Failed to update package status.");
                                            }
                                        }}
                                        onPublish={async () => {
                                            if (!group.topicId) return;
                                            try {
                                                const res = await fetch("/api/tasks/batch", {
                                                    method: "PATCH",
                                                    headers: { "Content-Type": "application/json" },
                                                    body: JSON.stringify({
                                                        topicId: group.topicId,
                                                        isPublishing: true
                                                    })
                                                });
                                                if (!res.ok) throw new Error("Publishing failed");
                                                
                                                if (refresh) refresh();
                                                else updateState({ search: state.search });
                                            } catch (e) {
                                                console.error(e);
                                                alert("Failed to publish package.");
                                            }
                                        }}
                                        onUpdateChannels={async (newChannels) => {
                                            if (!group.topicId) return;
                                            try {
                                                const res = await fetch("/api/tasks/batch", {
                                                    method: "PATCH",
                                                    headers: { "Content-Type": "application/json" },
                                                    body: JSON.stringify({
                                                        topicId: group.topicId,
                                                        distributionChannels: newChannels
                                                    })
                                                });
                                                if (!res.ok) throw new Error("Channels update failed");
                                                
                                                if (refresh) refresh();
                                                else updateState({ search: state.search });
                                            } catch (e) {
                                                console.error(e);
                                                alert("Failed to update distribution channels.");
                                            }
                                        }}
                                        onUpdateMetrics={async (newMetrics) => {
                                            if (!group.topicId) return;
                                            try {
                                                const res = await fetch("/api/tasks/batch", {
                                                    method: "PATCH",
                                                    headers: { "Content-Type": "application/json" },
                                                    body: JSON.stringify({
                                                        topicId: group.topicId,
                                                        performanceMetrics: newMetrics
                                                    })
                                                });
                                                if (!res.ok) throw new Error("Metrics update failed");
                                                
                                                if (refresh) refresh();
                                                else updateState({ search: state.search });
                                            } catch (e) {
                                                console.error(e);
                                                alert("Failed to update performance metrics.");
                                            }
                                        }}
                                        isBestPerformer={group.isBestPerformer} // RC31
                                        bestChannelHint={group.bestChannelHint} // RC31
                                    />
                                    
                                    {/* RC36: Package Mode Quick Add Row directly below header */}
                                    {isComposerOpen && !state.collapsedTopicIds.includes(group.topicId!) && (
                                        <div className="bg-indigo-50/30 border-b border-indigo-100/50 py-1">
                                            <QuickAddTask 
                                                workspaceId={workspaceId}
                                                initialTopicId={group.topicId}
                                                onCreated={onTaskCreated}
                                                onCancel={() => updateState({ inlineQuickAddTopicId: null })}
                                                launchSource="package"
                                                placeholder={`Step for ${group.topicId}...`}
                                            />
                                        </div>
                                    )}
                                </div>
                            );
                        }
                        
                        return (
                            <div className="bg-white/95 backdrop-blur-md py-3 px-4 flex items-center gap-3 border-b border-neutral-100">
                                <h3 className="text-xs font-black text-neutral-800 uppercase tracking-tight">{group.key}</h3>
                                <span className="text-[10px] font-bold bg-neutral-100 text-neutral-500 px-2 py-0.5 rounded-full">
                                    {group.tasks.length}
                                </span>
                            </div>
                        );
                    }}
                    itemContent={(index) => {
                        const task = flattenedTasks[index];
                        // RC33: Pass mode='table' if in list mode
                        const groupForTask = state.viewMode === 'package' ? grouped.find(g => g.topicId === task.topic_id) : null;
                        const isNextStep = !!groupForTask?.nextTaskId && groupForTask.nextTaskId === task.id;

                        const isIndented = state.viewMode === 'package' && !!task.topic_id;

                        return (
                            <div className={isIndented ? "pl-2 border-l-2 border-neutral-100" : ""}>
                                <TaskRow 
                                    task={task} 
                                    onClick={() => onTaskClick(task)} 
                                    onStatusChange={(newStatus) => onTaskUpdate(task.id, { status: newStatus })}
                                    onQuickComplete={onQuickComplete ? () => onQuickComplete(task.id) : undefined}
                                    isSelected={state.selectedTaskId === task.id}
                                    isHighlighted={highlightedTaskIds.includes(task.id)}
                                    isNextStep={isNextStep}
                                    mode={state.viewMode === 'list' ? 'table' : 'package'}
                                    isFlowModeActive={state.isFlowMode}
                                    isCurrentlyWorking={state.selectedTaskId === task.id}
                                />
                            </div>
                        );
                    }}

                    components={{
                        Header: () => (
                            <div className="flex flex-col">
                                {/* Table Header (RC33) */}
                                {state.viewMode === 'list' && (
                                    <div className="grid grid-cols-[1fr_120px_120px_40px] px-4 py-2 border-b-2 border-neutral-100 bg-white sticky top-0 z-30 shadow-sm">
                                        <div className="text-[10px] font-black text-neutral-400 uppercase tracking-[0.2em] pl-7">Task Name</div>
                                        <div className="text-[10px] font-black text-neutral-400 uppercase tracking-[0.2em] text-center border-l border-neutral-100/50">Status</div>
                                        <div className="text-[10px] font-black text-neutral-400 uppercase tracking-[0.2em] px-4 border-l border-neutral-100/50">Scheduled</div>
                                        <div></div>
                                    </div>
                                )}

                                {/* Global Quick Add Composer (RC36) */}
                                {state.isQuickAddOpen && (
                                    <div className="border-b border-neutral-200 bg-blue-50/30 py-2">
                                        <QuickAddTask 
                                            workspaceId={workspaceId} 
                                            launchSource="global"
                                            onCreated={onTaskCreated} 
                                            onCancel={() => updateState({ isQuickAddOpen: false })}
                                            placeholder="Global capture: What needs to be done?"
                                        />
                                    </div>
                                )}
                            </div>
                        ),
                        Footer: () => <div className="h-32" /> // Extra space for better scrolling experience
                    }}

                    style={{ height: "100%" }}
                    className="custom-scrollbar"
                />
            </div>
        </div>
    );
}
