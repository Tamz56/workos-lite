"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import { Task } from "@/lib/types";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock } from "lucide-react";
import { GlobalTaskDialogs } from "@/components/GlobalTaskDialogs";

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
    DragEndEvent,
    useDraggable,
    useDroppable,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

function getStartOfWeek(date: Date) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    d.setDate(diff);
    d.setHours(0,0,0,0);
    return d;
}

function addDays(date: Date, days: number) {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    return d;
}

function toYYYYMMDD(d: Date) {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

const DAYS_OF_WEEK = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

// --- Draggable Task Component ---
const TimelineTaskCard = React.memo(({ task, onClick, isDragging }: { task: Task; onClick: (id: string) => void; isDragging?: boolean }) => {
    const { attributes, listeners, setNodeRef, transform } = useDraggable({
        id: task.id,
        data: { task }
    });

    const style = {
        transform: CSS.Translate.toString(transform),
        opacity: isDragging ? 0.4 : 1,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...listeners}
            {...attributes}
            onClick={() => onClick(task.id)}
            className="text-left w-full group flex flex-col gap-2 p-3 bg-white border border-neutral-200 rounded-lg shadow-sm hover:shadow hover:border-blue-300 cursor-grab active:cursor-grabbing transition-all overflow-hidden"
        >
            <div className="font-semibold text-sm text-neutral-900 leading-tight group-hover:text-blue-600 transition-colors pointer-events-none">
                {task.title}
            </div>
            {(task.start_time || task.end_time) && (
                <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-neutral-500 bg-neutral-100/50 px-2 py-1 rounded w-max pointer-events-none">
                    <Clock className="w-3 h-3 text-neutral-400" />
                    {task.start_time || '--:--'} &rarr; {task.end_time || '--:--'}
                </div>
            )}
            <div className={`mt-1 text-[10px] uppercase tracking-wider font-bold max-w-max border px-1.5 py-0.5 rounded pointer-events-none ${task.status === 'done' ? 'text-green-700 bg-green-50 border-green-200' : task.status === 'in_progress' ? 'text-blue-700 bg-blue-50 border-blue-200' : 'text-neutral-500 border-neutral-200 bg-neutral-50'}`}>
                {task.status.replace('_', ' ')}
            </div>
        </div>
    );
});
TimelineTaskCard.displayName = "TimelineTaskCard";

// --- Droppable Column Component ---
const TimelineDayColumn = React.memo(({ dateStr, dayName, dayNum, monthName, isToday, tasks, onTaskClick, isOverAny }: { 
    dateStr: string; 
    dayName: string; 
    dayNum: number; 
    monthName: string; 
    isToday: boolean; 
    tasks: Task[]; 
    onTaskClick: (id: string) => void;
    isOverAny: boolean;
}) => {
    const { setNodeRef, isOver } = useDroppable({
        id: dateStr,
    });

    return (
        <div 
            ref={setNodeRef}
            className={`flex-1 min-w-[280px] flex flex-col transition-colors ${isOver ? 'bg-blue-100/50' : isToday ? 'bg-blue-50/30' : 'bg-white'}`}
        >
            <div className={`p-3 border-b border-neutral-100 flex items-center justify-between sticky top-0 bg-white/80 backdrop-blur-sm z-10 ${isToday ? 'bg-blue-50/80 shadow-sm border-blue-100' : ''}`}>
                <div className="flex flex-col">
                    <span className={`text-[10px] font-black uppercase tracking-widest ${isToday ? 'text-blue-600' : 'text-neutral-400'}`}>{dayName}</span>
                    <span className={`font-bold text-sm ${isToday ? 'text-blue-900' : 'text-neutral-900'}`}>{dayNum} {monthName}</span>
                </div>
                <div className="text-xs font-medium text-neutral-400">{tasks.length}</div>
            </div>
            <div className="p-3 overflow-y-auto flex-1 flex flex-col gap-3 custom-scrollbar">
                {tasks.map(task => (
                    <TimelineTaskCard key={task.id} task={task} onClick={onTaskClick} />
                ))}
                {tasks.length === 0 && (
                    <div className="flex-1 border-2 border-dashed border-neutral-100 rounded-lg flex items-center justify-center text-[10px] text-neutral-300 uppercase tracking-widest font-bold h-24">
                        {isOver ? "Drop here" : ""}
                    </div>
                )}
            </div>
        </div>
    );
});
TimelineDayColumn.displayName = "TimelineDayColumn";

export default function TimelinePage() {
    const [weekStart, setWeekStart] = useState<Date>(() => getStartOfWeek(new Date()));
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTask, setActiveTask] = useState<Task | null>(null);

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    const weekDays = useMemo(() => Array.from({ length: 7 }).map((_, i) => addDays(weekStart, i)), [weekStart]);
    const startStr = toYYYYMMDD(weekDays[0]);
    const endStr = toYYYYMMDD(weekDays[6]);

    const fetchWeekTasks = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/tasks?start=${startStr}&end=${endStr}&limit=500`);
            if (res.ok) setTasks(await res.json());
        } catch (e) {
            console.error("Timeline tasks load failed", e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchWeekTasks();
    }, [startStr, endStr]);

    const handlePrev = () => setWeekStart(addDays(weekStart, -7));
    const handleNext = () => setWeekStart(addDays(weekStart, 7));
    const handleToday = () => setWeekStart(getStartOfWeek(new Date()));

    const openTask = useCallback((taskId: string) => {
        const url = new URL(window.location.href);
        url.searchParams.set("taskId", taskId);
        window.history.pushState(null, "", url.toString());
    }, []);

    const updateTaskDate = async (taskId: string, newDate: string, oldDate: string) => {
        // Optimistic Update
        setTasks(prev => prev.map(t => t.id === taskId ? { ...t, scheduled_date: newDate } : t));

        try {
            const res = await fetch(`/api/tasks/${taskId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ scheduled_date: newDate })
            });
            if (!res.ok) throw new Error("Sync failed");
        } catch (e) {
            console.error("Failed to reschedule task", e);
            // Rollback
            setTasks(prev => prev.map(t => t.id === taskId ? { ...t, scheduled_date: oldDate } : t));
        }
    };

    const handleDragStart = (event: DragStartEvent) => {
        const { active } = event;
        const task = tasks.find(t => t.id === active.id);
        if (task) setActiveTask(task);
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        setActiveTask(null);

        if (!over) return;

        const taskId = active.id as string;
        const newDate = over.id as string;
        const task = tasks.find(t => t.id === taskId);

        if (task && task.scheduled_date !== newDate) {
            updateTaskDate(taskId, newDate, task.scheduled_date || "");
        }
    };

    const formatter = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const headerTitle = `${formatter.format(weekDays[0])} - ${formatter.format(weekDays[6])}`;

    return (
        <div className="min-h-screen bg-white">
            <div className="p-4 sm:p-6 max-w-[1600px] mx-auto w-full h-[calc(100vh-4rem)] flex flex-col overflow-hidden">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Timeline Planner</h1>
                        <p className="text-sm font-medium text-neutral-500 mt-1">{headerTitle}</p>
                    </div>

                    <div className="flex items-center gap-2 bg-neutral-50 p-1.5 rounded-lg border border-neutral-200 shadow-sm">
                        <button onClick={handlePrev} className="p-1.5 hover:bg-neutral-200 rounded-md transition text-neutral-600">
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                        <button onClick={handleToday} className="px-3 py-1 text-sm font-semibold text-neutral-700 hover:bg-neutral-200 rounded-md transition flex items-center gap-2">
                            <CalendarIcon className="w-3.5 h-3.5" /> Today
                        </button>
                        <button onClick={handleNext} className="p-1.5 hover:bg-neutral-200 rounded-md transition text-neutral-600">
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCorners}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                >
                    <div className="flex-1 flex overflow-hidden border border-neutral-200 rounded-xl bg-neutral-50/50 shadow-sm">
                        {/* Desktop Horizontal View */}
                        <div className="hidden md:flex flex-1 overflow-x-auto divide-x divide-neutral-200">
                            {weekDays.map((date, i) => {
                                const dateStr = toYYYYMMDD(date);
                                const dayTasks = tasks.filter(t => t.scheduled_date === dateStr).sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
                                const isToday = dateStr === toYYYYMMDD(new Date());

                                return (
                                    <TimelineDayColumn
                                        key={dateStr}
                                        dateStr={dateStr}
                                        dayName={DAYS_OF_WEEK[i]}
                                        dayNum={date.getDate()}
                                        monthName={date.toLocaleString('default', { month: 'short' })}
                                        isToday={isToday}
                                        tasks={dayTasks}
                                        onTaskClick={openTask}
                                        isOverAny={!!activeTask}
                                    />
                                );
                            })}
                        </div>

                        {/* Mobile Agenda View (DND disabled for simple RC7B v1) */}
                        <div className="md:hidden flex-1 overflow-y-auto custom-scrollbar bg-neutral-50 p-4">
                            {weekDays.map(date => {
                                const dateStr = toYYYYMMDD(date);
                                const dayTasks = tasks.filter(t => t.scheduled_date === dateStr).sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
                                if (dayTasks.length === 0) return null;
                                const isToday = dateStr === toYYYYMMDD(new Date());

                                return (
                                    <div key={dateStr} className="mb-6 last:mb-0 relative">
                                        <div className="flex items-center gap-4 mb-3 sticky top-0 bg-neutral-50 p-1 z-10">
                                            <div className={`flex flex-col items-center justify-center w-12 h-12 rounded-xl shrink-0 border shadow-sm ${isToday ? 'bg-blue-600 border-blue-700 text-white' : 'bg-white border-neutral-200 text-neutral-600'}`}>
                                                <span className="text-[10px] font-black uppercase tracking-widest opacity-80">{date.toLocaleString('default', { weekday: 'short' })}</span>
                                                <span className="text-lg font-bold leading-none mt-0.5">{date.getDate()}</span>
                                            </div>
                                            <div className="h-[1px] bg-neutral-200 flex-1"></div>
                                        </div>
                                        <div className="space-y-3 pl-14">
                                            {dayTasks.map(task => (
                                                <button
                                                    key={task.id}
                                                    onClick={() => openTask(task.id)}
                                                    className="text-left w-full group flex flex-col gap-2 p-3.5 bg-white border border-neutral-200 rounded-xl shadow-sm hover:border-neutral-300 active:scale-[0.98] transition-all"
                                                >
                                                    <div className="font-semibold text-sm text-neutral-900 leading-snug">
                                                        {task.title}
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        {(task.start_time || task.end_time) && (
                                                            <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-neutral-500 bg-neutral-100/50 px-2 py-0.5 rounded w-max">
                                                                <Clock className="w-3 h-3 text-neutral-400" />
                                                                {task.start_time || '--:--'} &rarr; {task.end_time || '--:--'}
                                                            </div>
                                                        )}
                                                        <div className={`text-[10px] uppercase tracking-wider font-bold max-w-max border px-1.5 py-0.5 rounded ${task.status === 'done' ? 'text-green-700 bg-green-50 border-green-200' : task.status === 'in_progress' ? 'text-blue-700 bg-blue-50 border-blue-200' : 'text-neutral-500 border-neutral-200 bg-neutral-50'}`}>
                                                            {task.status.replace('_', ' ')}
                                                        </div>
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}
                            {tasks.length === 0 && (
                                <div className="h-full flex flex-col items-center justify-center text-center p-8 bg-white border border-neutral-200 border-dashed rounded-xl">
                                    <CalendarIcon className="w-8 h-8 text-neutral-300 mb-3" />
                                    <div className="text-neutral-900 font-semibold mb-1">No scheduled tasks</div>
                                    <div className="text-neutral-500 text-sm">There are no tasks explicitly dated for this week.</div>
                                </div>
                            )}
                        </div>
                    </div>

                    <DragOverlay>
                        {activeTask ? (
                            <div className="bg-white p-3 rounded-lg shadow-2xl border-2 border-blue-500 rotate-1 w-64 pointer-events-none opacity-90 scale-105 transition-transform">
                                <div className="font-semibold text-sm text-neutral-900 leading-tight">
                                    {activeTask.title}
                                </div>
                                <div className="mt-2 text-[10px] uppercase font-black text-neutral-400">
                                    Rescheduling...
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
