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
    onTasksDelete?: (ids: string[]) => Promise<void> | void; // RC65
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
    refresh,
    onTasksDelete
}: AreasTaskListProps) {
    const router = useRouter();
    const virtuosoRef = useRef<VirtuosoHandle>(null);
    
    // Delegate complex logic to pure selector
    const grouped = useMemo(() => selectGroupedTasks(tasks, state, workspaceId), [tasks, state, workspaceId]);

    const flattenedTasksExtended = useMemo(() => {
        const result: { task: Task, isFirst: boolean, isLast: boolean, groupId: string | null }[] = [];
        const legacyKey = "Legacy / Needs Topic Mapping";
        
        grouped.forEach(g => {
            const collapseKey = g.listId || g.topicId || g.key;
            
            // RC55: Auto-collapse Legacy for Content Workspace by default
            let isCollapsed = collapseKey && state.collapsedTopicIds.includes(collapseKey);
            if (workspaceId === 'content' && collapseKey === legacyKey && !state.collapsedTopicIds.includes(collapseKey) && !state.selectedTaskId?.startsWith('legacy')) {
                // If it's legacy and not explicitly collapsed, we still treat it as collapsed 
                // UNLESS the user has a selected task inside it (which shouldn't happen by default)
                // Actually, let's just use the state. If it's not in state, and it's content, we hide it.
                // But we need a way for the user to UNHIDE it.
                // handleToggleTopic will add it to the list.
                // So if it's NOT in state, we treat it as collapsed for Content.
                isCollapsed = true;
            }

            if (!isCollapsed) {
                g.tasks.forEach((t, i) => {
                    result.push({
                        task: t,
                        isFirst: i === 0,
                        isLast: i === g.tasks.length - 1,
                        groupId: collapseKey
                    });
                });
            }
        });
        return result;
    }, [grouped, state.collapsedTopicIds, workspaceId, state.selectedTaskId]);
    
    // RC55: Helper for legacy compatibility in hooks
    const flattenedTasks = useMemo(() => flattenedTasksExtended.map(item => item.task), [flattenedTasksExtended]);

    const groupCounts = useMemo(() => {
        const legacyKey = "Legacy / Needs Topic Mapping";
        return grouped.map(g => {
            const collapseKey = g.listId || g.topicId || g.key;
            
            // RC55: Auto-collapse Legacy for Content Workspace by default
            let isCollapsed = collapseKey && state.collapsedTopicIds.includes(collapseKey);
            if (workspaceId === 'content' && collapseKey === legacyKey && !state.collapsedTopicIds.includes(collapseKey) && !state.selectedTaskId?.startsWith('legacy')) {
                isCollapsed = true;
            }
            
            return isCollapsed ? 0 : g.tasks.length;
        });
    }, [grouped, state.collapsedTopicIds, workspaceId, state.selectedTaskId]);

    // Toggle Collapse Handler
    const handleToggleTopic = (id: string) => {
        const current = state.collapsedTopicIds;
        if (current.includes(id)) {
            updateState({ collapsedTopicIds: current.filter(cid => cid !== id) });
        } else {
            updateState({ collapsedTopicIds: [...current, id] });
        }
    };

    // RC65: Selection Handlers
    const handleSelectAll = (checked: boolean) => {
        if (checked) {
            updateState({ selectedTaskIds: tasks.map(t => t.id) });
        } else {
            updateState({ selectedTaskIds: [] });
        }
    };

    const handleSelectTask = (taskId: string, checked: boolean) => {
        const current = state.selectedTaskIds;
        if (checked) {
            updateState({ selectedTaskIds: [...current, taskId] });
        } else {
            updateState({ selectedTaskIds: current.filter(id => id !== taskId) });
        }
    };

    const [isBulkDeleteConfirming, setIsBulkDeleteConfirming] = React.useState(false);
    const handleBulkDelete = async () => {
        if (isBulkDeleteConfirming) {
            if (onTasksDelete) {
                await onTasksDelete(state.selectedTaskIds);
                updateState({ selectedTaskIds: [] });
            }
            setIsBulkDeleteConfirming(false);
        } else {
            setIsBulkDeleteConfirming(true);
            setTimeout(() => setIsBulkDeleteConfirming(false), 5000);
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

            if (e.key === "Escape" && state.selectedTaskIds.length > 0) {
                e.preventDefault();
                updateState({ selectedTaskIds: [] });
                return;
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
        <div className="flex flex-col h-full min-h-0 bg-white overflow-hidden relative">
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

            <div className="flex-1 min-h-0 overflow-hidden">
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

                        if (group.isPackage) {
                            const collapseKey = group.listId || group.topicId || group.key;
                            const isComposerOpen = state.inlineQuickAddTopicId === collapseKey;
                            return (
                                <div className="flex flex-col">
                                    <PackageGroupHeader 
                                        topicId={group.topicId!}
                                        title={group.title}
                                        tasks={group.tasks}
                                        templateKey={group.templateKey}
                                        packageDone={group.packageDone}
                                        packageTotal={group.packageTotal}
                                        scheduledDate={group.scheduledDate}
                                        docId={group.docId}
                                        isCollapsed={state.collapsedTopicIds.includes(collapseKey)}
                                        isFullyComplete={group.isFullyComplete} // RC25
                                        readyToPublish={group.readyToPublish} // RC27
                                        publishedAt={group.publishedAt} // RC28
                                        channels={group.channels} // RC29
                                        isChannelsInconsistent={group.isChannelsInconsistent} // RC29
                                        onToggle={() => handleToggleTopic(collapseKey)}
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
                                        onQuickAdd={(tid, tTitle) => updateState({ inlineQuickAddTopicId: tid, inlineQuickAddTopicTitle: tTitle, isQuickAddOpen: true })} // RC36
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
                        const row = flattenedTasksExtended[index];
                        if (!row) return null;
                        
                        const { task, isFirst, isLast } = row;
                        // RC33: Pass mode='table' if in list mode
                        const groupForTask = state.viewMode === 'package' ? grouped.find(g => g.topicId === task.topic_id) : null;
                        const isNextStep = !!groupForTask?.nextTaskId && groupForTask.nextTaskId === task.id;

                        const isGrouped = state.viewMode === 'package' && (!!task.topic_id || !!task.list_id);

                        const isStructuredTopic = !!task.topic_id && task.topic_id.startsWith('TOPIC-');

                        return (
                            <div className="border-b border-neutral-100 bg-white">
                                <div className={`${isStructuredTopic ? 'pl-4 sm:pl-10 relative' : ''}`}>
                                    {isStructuredTopic && (
                                        <div className="absolute left-3 sm:left-6 top-0 bottom-0 w-px bg-neutral-100" />
                                    )}
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
                                        isMultiSelected={state.selectedTaskIds.includes(task.id)}
                                        onMultiSelect={(checked) => handleSelectTask(task.id, checked)}
                                        onDelete={() => onTasksDelete?.([task.id])}
                                    />
                                </div>
                            </div>
                        );
                    }}

                    components={{
                        Header: () => {
                            const hasBulkActions = state.selectedTaskIds.length > 0;
                            const hasTableHeader = state.viewMode === 'list';
                            const hasGlobalQuickAdd = state.isQuickAddOpen;

                            if (!hasBulkActions && !hasTableHeader && !hasGlobalQuickAdd) return null;

                            return (
                                <div className="flex flex-col">
                                    {/* Bulk Action Bar (RC65) */}
                                    {hasBulkActions && (
                                        <div className="bg-indigo-600 text-white px-6 py-3 flex items-center justify-between animate-in slide-in-from-top duration-300 z-[40]">
                                            <div className="flex items-center gap-4">
                                                <button 
                                                    onClick={() => handleSelectAll(false)}
                                                    className="p-1 hover:bg-white/20 rounded transition-colors"
                                                >
                                                    <LucideIcons.X size={18} />
                                                </button>
                                                <span className="text-sm font-black uppercase tracking-widest leading-none">
                                                    {state.selectedTaskIds.length} items selected
                                                </span>
                                            </div>

                                            <div className="flex items-center gap-2">
                                                <button 
                                                    onClick={handleBulkDelete}
                                                    className={`flex items-center gap-2 px-4 py-1.5 rounded-lg font-black text-xs uppercase tracking-widest transition-all ${
                                                        isBulkDeleteConfirming 
                                                            ? "bg-red-500 text-white animate-pulse" 
                                                            : "bg-white/10 hover:bg-white/20 text-white"
                                                    }`}
                                                >
                                                    {isBulkDeleteConfirming ? (
                                                        <>
                                                            <LucideIcons.AlertTriangle size={14} />
                                                            <span>Confirm Delete</span>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <LucideIcons.Trash2 size={14} />
                                                            <span>Delete Selection</span>
                                                        </>
                                                    )}
                                                </button>
                                                
                                                <button 
                                                    onClick={() => updateState({ selectedTaskIds: [] })}
                                                    className="text-[10px] font-bold opacity-60 hover:opacity-100 px-2"
                                                >
                                                    CLEAR
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {/* Table Header (RC33) */}
                                    {hasTableHeader && (
                                        <div className="grid grid-cols-[1fr_120px_120px_40px] px-4 py-1.5 border-b border-neutral-100 bg-white sticky top-0 z-30 shadow-sm">
                                            <div className="text-[10px] font-black text-neutral-400 uppercase tracking-[0.2em] pl-7">Task Name</div>
                                            <div className="text-[10px] font-black text-neutral-400 uppercase tracking-[0.2em] text-center border-l border-neutral-100/50">Status</div>
                                            <div className="text-[10px] font-black text-neutral-400 uppercase tracking-[0.2em] px-4 border-l border-neutral-100/50">Scheduled</div>
                                            <div></div>
                                        </div>
                                    )}

                                    {/* Global Quick Add Composer (RC36) */}
                                    {hasGlobalQuickAdd && (
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
                            );
                        },
                        Footer: () => <div className="h-32" /> // Extra space for better scrolling experience
                    }}

                    style={{ height: "100%" }}
                    className="custom-scrollbar"
                />
            </div>
        </div>
    );
}
