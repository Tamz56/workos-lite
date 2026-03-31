"use client";
import React, { useEffect, useState, useCallback, useMemo } from "react";
import { Project, Sprint, Task, TaskStatus } from "@/lib/types";
import { GlobalTaskDialogs } from "@/components/GlobalTaskDialogs";
import { useRouter, useSearchParams } from "next/navigation";

// DnD Kit Imports
import {
    DndContext,
    DragOverlay,
    closestCorners,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragStartEvent,
    DragOverEvent,
    DragEndEvent,
    defaultDropAnimationSideEffects,
} from "@dnd-kit/core";
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

// Optional: basic icon mapping inline to keep things self-contained
const StatusIcon = React.memo(({ status }: { status: TaskStatus }) => {
    switch (status) {
        case "inbox": return <div className="w-2.5 h-2.5 rounded-full border border-neutral-400 bg-transparent shrink-0" />;
        case "planned": return <div className="w-2.5 h-2.5 rounded-full border border-neutral-400 bg-neutral-200 shrink-0" />;
        case "in_progress": return <div className="w-2.5 h-2.5 rounded-sm border-2 border-blue-500 bg-transparent shrink-0 animate-pulse" />;
        case "done": return <div className="w-2.5 h-2.5 rounded-full bg-neutral-800 shrink-0" />;
    }
    return null;
});
StatusIcon.displayName = "StatusIcon";

// --- Sortable Task Card Component ---
interface TaskCardProps {
    task: Task;
    onClick: (task: Task) => void;
    isDragging?: boolean;
}

const TaskCard = React.memo(({ task, onClick, isDragging }: TaskCardProps) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
    } = useSortable({ id: task.id, data: { task } });

    const style = {
        transform: CSS.Translate.toString(transform),
        transition,
        opacity: isDragging ? 0.3 : 1,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...attributes}
            {...listeners}
            onClick={() => onClick(task)}
            className="bg-white p-3 rounded-lg shadow-sm border border-neutral-200 cursor-grab active:cursor-grabbing hover:border-blue-300 hover:shadow-md transition-all group"
        >
            <div className="font-medium text-sm text-neutral-900 leading-snug group-hover:text-blue-700 transition-colors pointer-events-none">
                {task.title}
            </div>
            
            <div className="mt-3 flex items-center justify-between text-xs text-neutral-500 pointer-events-none">
                <div className="flex items-center gap-2">
                    <span className="px-1.5 py-0.5 bg-neutral-100 rounded text-[10px] uppercase font-bold tracking-wider">
                        {task.workspace}
                    </span>
                </div>
                {task.scheduled_date && (
                    <span className="text-[10px]">
                        {new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(new Date(task.scheduled_date))}
                    </span>
                )}
            </div>
        </div>
    );
});
TaskCard.displayName = "TaskCard";

// --- Column Component ---
interface StatusColumnProps {
    title: string;
    statusKey: TaskStatus;
    tasks: Task[];
    onTaskClick: (task: Task) => void;
}

const StatusColumn = React.memo(({ title, statusKey, tasks, onTaskClick }: StatusColumnProps) => {
    const items = useMemo(() => tasks.filter(i => i.status === statusKey), [tasks, statusKey]);

    const { setNodeRef } = useSortable({
        id: statusKey,
        data: { type: 'container' }
    });

    return (
        <div 
            ref={setNodeRef}
            className="flex-1 bg-neutral-50 rounded-lg p-3 sm:p-4 border border-neutral-200 min-h-[500px] flex flex-col min-w-[280px]"
        >
            <h3 className="font-bold text-neutral-800 mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <StatusIcon status={statusKey} />
                    <span className="text-sm">{title}</span>
                </div>
                <span className="text-neutral-500 font-medium text-xs bg-neutral-200 px-2 py-0.5 rounded-full">{items.length}</span>
            </h3>
            
            <SortableContext 
                id={statusKey} 
                items={items.map(t => t.id)} 
                strategy={verticalListSortingStrategy}
            >
                <div className="space-y-3 flex-1 overflow-y-auto pr-1 custom-scrollbar">
                    {items.map(task => (
                        <TaskCard 
                            key={task.id} 
                            task={task} 
                            onClick={onTaskClick} 
                        />
                    ))}
                    
                    {items.length === 0 && (
                        <div className="text-neutral-400 text-xs italic text-center mt-6 h-20 flex items-center justify-center border-2 border-dashed border-neutral-200 rounded-lg">
                            Drop tasks here
                        </div>
                    )}
                </div>
            </SortableContext>
        </div>
    );
});
StatusColumn.displayName = "StatusColumn";

// --- Main Client Component ---
export default function SprintsClient() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const selectedTaskId = searchParams.get("taskId");

    const [sprints, setSprints] = useState<Sprint[]>([]);
    const [projects, setProjects] = useState<Project[]>([]);
    const [selectedSprint, setSelectedSprint] = useState<string | null>(null);
    const [sprintTasks, setSprintTasks] = useState<Task[]>([]);
    const [activeTask, setActiveTask] = useState<Task | null>(null);

    // Sensors for DND
    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    const [isCreating, setIsCreating] = useState(false);
    const [newSprintName, setNewSprintName] = useState("");
    const [selectedProjectId, setSelectedProjectId] = useState("");
    const [loading, setLoading] = useState(true);

    const loadData = async () => {
        setLoading(true);
        const [sRes, pRes] = await Promise.all([
            fetch("/api/sprints"),
            fetch("/api/projects")
        ]);
        if (sRes.ok) setSprints(await sRes.json());
        if (pRes.ok) {
            const allProjects = await pRes.json();
            setProjects(allProjects.filter((p: Project) => p.status !== "done"));
        }
        setLoading(false);
    };

    useEffect(() => {
        loadData();
    }, []);

    const fetchSprintTasks = async (sprintId: string) => {
        try {
            const res = await fetch(`/api/tasks?sprint_id=${sprintId}&limit=500`);
            if (res.ok) {
                const data = await res.json();
                setSprintTasks(data);
            }
        } catch (e) {
            console.error("Failed to load sprint tasks", e);
        }
    };

    useEffect(() => {
        if (!selectedSprint) {
            setSprintTasks([]);
            return;
        }
        fetchSprintTasks(selectedSprint);
    }, [selectedSprint, selectedTaskId]);

    const handleCreateSprint = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newSprintName || !selectedProjectId) return;
        const res = await fetch("/api/sprints", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: newSprintName, project_id: selectedProjectId, status: "planned" })
        });
        if (res.ok) {
            setNewSprintName("");
            setIsCreating(false);
            loadData();
        }
    };

    const handleTaskClick = useCallback((task: Task) => {
        const url = new URL(window.location.href);
        url.searchParams.set("taskId", task.id);
        window.history.pushState(null, "", url.toString());
    }, []);

    const updateTaskStatus = async (taskId: string, newStatus: TaskStatus, oldStatus: TaskStatus) => {
        // Optimistic UI Update
        setSprintTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t));

        try {
            const res = await fetch(`/api/tasks/${taskId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: newStatus })
            });

            if (!res.ok) throw new Error("Sync failed");
        } catch (e) {
            console.error("Failed to sync status, rolling back", e);
            // Rollback on failure
            setSprintTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: oldStatus } : t));
        }
    };

    // Metrics
    const totalTasks = sprintTasks.length;
    const doneTasks = sprintTasks.filter(t => t.status === "done").length;
    const progressPercent = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

    // --- DND Event Handlers ---
    const handleDragStart = (event: DragStartEvent) => {
        const { active } = event;
        const task = sprintTasks.find(t => t.id === active.id);
        if (task) setActiveTask(task);
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        setActiveTask(null);

        if (!over) return;

        const taskId = active.id as string;
        const newStatus = over.id as TaskStatus;
        const task = sprintTasks.find(t => t.id === taskId);

        if (task && task.status !== newStatus && ["inbox", "planned", "in_progress", "done"].includes(newStatus)) {
            updateTaskStatus(taskId, newStatus, task.status);
        }
    };

    if (loading) return <div className="p-6 text-sm text-neutral-500">Loading sprints...</div>;

    return (
        <div className="min-h-screen bg-white">
            <div className="p-4 sm:p-6 max-w-[1600px] mx-auto w-full h-[calc(100vh-4rem)] flex flex-col overflow-hidden">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-2xl font-bold tracking-tight">Active Sprints Board</h1>
                    <button
                        onClick={() => setIsCreating(!isCreating)}
                        className="bg-neutral-900 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-neutral-800 transition"
                    >
                        {isCreating ? "Cancel" : "New Sprint"}
                    </button>
                </div>

                {isCreating && (
                    <form onSubmit={handleCreateSprint} className="mb-6 bg-white p-4 rounded-lg border border-neutral-200 shadow-sm flex flex-col md:flex-row gap-4 items-end animate-in fade-in slide-in-from-top-2">
                        <div className="flex-1 w-full">
                            <label className="block text-xs font-medium text-neutral-600 mb-1">Project</label>
                            <select
                                className="w-full border border-neutral-300 rounded-md px-3 py-2 text-sm outline-none bg-white focus:border-neutral-900 transition"
                                value={selectedProjectId}
                                onChange={e => setSelectedProjectId(e.target.value)}
                                required
                            >
                                <option value="">Select Project...</option>
                                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>
                        </div>
                        <div className="flex-1 w-full">
                            <label className="block text-xs font-medium text-neutral-600 mb-1">Sprint Name</label>
                            <input
                                type="text"
                                className="w-full border border-neutral-300 rounded-md px-3 py-2 text-sm outline-none focus:border-neutral-900 transition"
                                value={newSprintName}
                                onChange={e => setNewSprintName(e.target.value)}
                                placeholder="e.g. Sprint 1 - Core Features"
                                required
                            />
                        </div>
                        <button type="submit" className="bg-neutral-900 text-white px-6 py-2 rounded-md font-medium text-sm h-[38px] w-full md:w-auto hover:bg-neutral-800 transition">
                            Create
                        </button>
                    </form>
                )}

                <div className="flex items-center justify-between gap-4 mb-6">
                    <div className="flex gap-2 overflow-x-auto pb-2 shrink-0 scrollbar-hide-until-hover">
                        {sprints.map(s => (
                            <button
                                key={s.id}
                                onClick={() => setSelectedSprint(s.id)}
                                className={`px-4 py-2 rounded-md text-sm font-semibold whitespace-nowrap transition-all border ${selectedSprint === s.id ? 'bg-blue-600 text-white border-blue-600 shadow-sm' : 'bg-white text-neutral-600 border-neutral-200 hover:bg-neutral-50'}`}
                            >
                                {s.name}
                            </button>
                        ))}
                        {sprints.length === 0 && <span className="text-sm text-neutral-500 py-2">No sprints created yet.</span>}
                    </div>

                    {selectedSprint && totalTasks > 0 && (
                        <div className="hidden sm:flex items-center gap-3 bg-neutral-50 px-4 py-2 rounded-lg border border-neutral-200">
                            <div className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Progress</div>
                            <div className="w-32 h-2.5 bg-neutral-200 rounded-full overflow-hidden">
                                <div 
                                    className="h-full bg-blue-500 transition-all duration-500" 
                                    style={{ width: `${progressPercent}%` }} 
                                />
                            </div>
                            <div className="text-xs font-bold text-neutral-700">{doneTasks}/{totalTasks}</div>
                        </div>
                    )}
                </div>

                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCorners}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                >
                    {selectedSprint ? (
                        <div className="flex-1 flex overflow-x-auto pb-4 custom-scrollbar">
                            <div className="flex gap-4 min-w-max h-full">
                                <StatusColumn title="Inbox" statusKey="inbox" tasks={sprintTasks} onTaskClick={handleTaskClick} />
                                <StatusColumn title="Planned" statusKey="planned" tasks={sprintTasks} onTaskClick={handleTaskClick} />
                                <StatusColumn title="In Progress" statusKey="in_progress" tasks={sprintTasks} onTaskClick={handleTaskClick} />
                                <StatusColumn title="Done" statusKey="done" tasks={sprintTasks} onTaskClick={handleTaskClick} />
                            </div>
                        </div>
                    ) : (
                        sprints.length > 0 && (
                            <div className="flex-1 flex items-center justify-center border-2 border-dashed border-neutral-200 rounded-2xl bg-neutral-50/50">
                                <div className="text-neutral-500 text-sm font-medium">Select a sprint above to view its Kanban board.</div>
                            </div>
                        )
                    )}

                    <DragOverlay>
                        {activeTask ? (
                            <div className="bg-white p-3 rounded-lg shadow-xl border-2 border-blue-400 rotate-2 w-72 pointer-events-none">
                                <div className="font-medium text-sm text-neutral-900 leading-snug">
                                    {activeTask.title}
                                </div>
                                <div className="mt-3 flex items-center justify-between text-xs text-neutral-500">
                                    <span className="px-1.5 py-0.5 bg-neutral-100 rounded text-[10px] uppercase font-bold tracking-wider">
                                        {activeTask.workspace}
                                    </span>
                                </div>
                            </div>
                        ) : null}
                    </DragOverlay>
                </DndContext>
            </div>

            <GlobalTaskDialogs />
        </div>
    );
}
