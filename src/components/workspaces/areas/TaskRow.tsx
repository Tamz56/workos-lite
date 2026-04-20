import React from "react";
import { Task } from "@/lib/types";
import { Check, Paperclip, FileText, Calendar, Tag, Circle } from "lucide-react";
import { prefetchTaskDetail } from "@/components/GlobalTaskDialogs";
import QuickStatusPicker from "./QuickStatusPicker";
import { 
    cleanTaskTitle, 
    parseProjectFromTitle, 
    parseStageFromTitle, 
    parsePlatformsFromTitle 
} from "@/lib/content/utils";

interface TaskRowProps {
    task: Task;
    onClick: () => void;
    onStatusChange?: (newStatus: "inbox" | "planned" | "in_progress" | "review" | "done") => void;
    onQuickComplete?: () => void; // RC25
    isSelected?: boolean;
    isHighlighted?: boolean;
    isNextStep?: boolean; // RC25
    mode?: "package" | "table"; // RC33
    isFlowModeActive?: boolean; // RC46
    isCurrentlyWorking?: boolean; // RC46
}

export default function TaskRow({ 
    task, 
    onClick, 
    onStatusChange, 
    onQuickComplete,
    isSelected, 
    isHighlighted,
    isNextStep,
    mode = "package",
    isFlowModeActive,
    isCurrentlyWorking
}: TaskRowProps) {


    const isDone = task.status === "done";
    const today = new Date().toISOString().split("T")[0];
    const isOverdue = task.scheduled_date && task.scheduled_date < today && !isDone;
    
    // Quick indicator parsing
    const hasNotes = !!task.notes;
    // rudimentary check for links in notes
    const hasAttachments = task.notes?.includes("https://") || false; 
    
    const priorityLabels = ["Lowest", "Low", "Normal", "High", "Urgent"];
    const priorityColor = ["text-neutral-400", "text-blue-500", "text-neutral-600", "text-orange-500", "text-red-600"];
    const pIdx = task.priority ?? 2;

    // RC46: Execution Engine Visuals
    const isActiveExecution = isCurrentlyWorking && isFlowModeActive;
    const dimmingClass = (isFlowModeActive && !isCurrentlyWorking) ? "opacity-30 grayscale pointer-events-none scale-[0.98] blur-[0.5px]" : "opacity-100 grayscale-0 scale-100 blur-0";

    // RC25: Visual Priority Logic (Modified for RC32/RC46)
    const activeNextStep = mode === "package" && isNextStep;
    const rowClass = isSelected ? "bg-blue-50/40 border-blue-100 z-10" : 
                    isHighlighted ? "bg-blue-50 border-blue-200 z-10" : 
                    activeNextStep ? "bg-amber-50/40 border-amber-100/50" : 
                    "bg-white border-neutral-100";

    // Metadata Parsing
    const cleanTitle = cleanTaskTitle(task.title);
    const titleProject = parseProjectFromTitle(task.title);
    const titleStage = parseStageFromTitle(task.title);
    const titlePlatforms = parsePlatformsFromTitle(task.title);

    // RC33: Execution Table Mode (List View)
    if (mode === "table") {
        return (
            <div 
                id={`task-row-${task.id}`}
                onClick={onClick}
                onMouseEnter={() => prefetchTaskDetail(task.id)}
                className={`group grid grid-cols-[1fr_120px_120px_40px] items-center py-1.5 px-4 border-b hover:bg-indigo-50/30 transition-all duration-300 cursor-pointer ${
                    isSelected ? "bg-indigo-50/50 border-blue-100 ring-1 ring-blue-500/20 shadow-md z-10" : "bg-white border-neutral-100"
                } ${isDone ? "opacity-60" : ""} ${dimmingClass}`}
            >
                {/* Column 1: Task Name & Topic Cue */}
                <div className="flex items-center gap-3 min-w-0 pr-4">
                    {isActiveExecution ? (
                         <div className="w-5 h-5 flex items-center justify-center relative shrink-0">
                            <Circle size={10} className="text-blue-500 fill-blue-500 animate-pulse" />
                            <div className="absolute inset-0 bg-blue-500 rounded-full animate-ping opacity-20" />
                         </div>
                    ) : (
                        <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                            task.status === 'done' ? 'bg-emerald-500' : 
                            task.status === 'inbox' ? 'bg-neutral-300' : 
                            task.status === 'review' ? 'bg-indigo-500' :
                            'bg-blue-500'
                        }`} />
                    )}
                    <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className={`text-[12px] font-bold truncate leading-tight ${isDone ? 'line-through text-neutral-400' : 'text-neutral-900 group-hover:text-indigo-600'}`}>
                                {cleanTitle}
                            </span>
                            {isActiveExecution && (
                                <span className="text-[8px] bg-blue-600 text-white px-1.5 py-0.5 rounded-sm font-black uppercase tracking-widest whitespace-nowrap">Execution Mode</span>
                            )}
                            
                            {/* Metadata Badges in Table Mode */}
                            <div className="flex items-center gap-1.5">
                                {titleProject && (
                                    <span className="text-[9px] font-black px-1.5 py-0.5 rounded-sm bg-neutral-100 text-neutral-500 uppercase tracking-tighter">
                                        {titleProject}
                                    </span>
                                )}
                                {titleStage && (
                                    <span className="text-[9px] font-black px-1.5 py-0.5 rounded-sm bg-indigo-50 text-indigo-600 uppercase tracking-tighter border border-indigo-100">
                                        {titleStage}
                                    </span>
                                )}
                                {titlePlatforms.map(p => (
                                    <span key={p} className="text-[8px] font-black px-1 py-0.5 rounded-full bg-blue-50 text-blue-500 uppercase">
                                        #{p}
                                    </span>
                                ))}
                            </div>
                        </div>
                        {task.topic_id && (
                            <span className="text-[9px] font-black text-neutral-400 uppercase tracking-widest leading-none mt-0.5">
                                {task.topic_id}
                            </span>
                        )}
                    </div>
                </div>

                {/* Column 2: Status Pill (Inline Picker) */}
                <div className="px-2 border-l border-neutral-100/30 h-full flex items-center justify-center">
                    <QuickStatusPicker 
                        status={task.status as any} 
                        onStatusChange={onStatusChange || (() => {})} 
                    />
                </div>

                {/* Column 3: Date */}
                <div className={`px-4 border-l border-neutral-100/30 h-full flex items-center text-[10px] font-black tracking-tight ${
                    !task.scheduled_date ? 'text-neutral-300' : 
                    isOverdue ? 'text-red-500' : 'text-neutral-500'
                }`}>
                    <Calendar size={10} className="mr-2 shrink-0 opacity-40" />
                    {task.scheduled_date || "NO DATE"}
                </div>

                {/* Column 4: Indicators */}
                <div className="flex justify-end gap-2 text-neutral-300 opacity-60">
                    {task.doc_id && <Paperclip size={12} className="text-blue-400" />}
                </div>
            </div>
        );
    }


    return (
        <div 
            id={`task-row-${task.id}`}
            onClick={onClick}
            onMouseEnter={() => prefetchTaskDetail(task.id)}
            className={`relative group w-full flex flex-col sm:flex-row sm:items-center py-2 px-3 sm:px-4 border-b hover:bg-neutral-50 cursor-pointer transition-all duration-300 ${rowClass} ${
                isDone ? "opacity-60 hover:opacity-100" : ""
            } ${dimmingClass} ${isActiveExecution ? "ring-2 ring-blue-500/20 shadow-lg z-20 scale-[1.01] -mx-1 px-5 rounded-md" : ""}`}
        >

            {isSelected && <div className="absolute left-0 top-0 bottom-0 w-[4px] bg-blue-500 rounded-r-sm z-20" />}
            {isActiveExecution && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-[8px] font-black px-2 py-0.5 rounded-full shadow-lg z-30 uppercase tracking-[0.2em] whitespace-nowrap border-2 border-white">
                    Currently Working On
                </div>
            )}
            {activeNextStep && !isSelected && !isHighlighted && <div className="absolute left-0 top-0 bottom-0 w-[4px] bg-amber-400/60 rounded-r-sm z-20" />}
            
            {/* Mobile Top Row: Check/Status + Title */}
            <div className="flex items-start sm:items-center gap-3 flex-1 min-w-0">
                {/* RC25: Quick Complete Checkbox (Only for Package Tasks) */}
                {task.topic_id && onQuickComplete ? (
                    <button 
                        onClick={(e) => {
                            e.stopPropagation();
                            if (!isDone) onQuickComplete();
                        }}
                        className={`group/check shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                            isDone 
                                ? "bg-emerald-500 border-emerald-500 text-white" 
                                : "border-neutral-300 hover:border-emerald-500 text-transparent hover:text-emerald-500 bg-white"
                        }`}
                        title={isDone ? "เสร็จสมบูรณ์แล้ว" : "ทำเครื่องหมายว่าเสร็จสิ้น (Quick Complete)"}
                    >
                        <Check size={12} strokeWidth={4} />
                    </button>
                ) : (
                    /* Default Status Dot */
                    <div className={`w-2 h-2 mt-1.5 sm:mt-0 shrink-0 rounded-full flex-none ${
                        task.status === 'done' ? 'bg-green-500' : 
                        task.status === 'inbox' ? 'bg-neutral-300' : 
                        task.status === 'review' ? 'bg-indigo-500' :
                        'bg-blue-500'
                    }`} />
                )}
                
                {/* Title + Topic Signal */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-x-2 gap-y-1 flex-1 min-w-0">
                    <div className="flex flex-col">
                        <div className={`text-sm font-medium leading-tight sm:leading-normal sm:truncate ${isDone ? 'line-through text-neutral-400' : 'text-neutral-900 group-hover:text-black'}`}>
                            {cleanTitle}
                        </div>
                        
                        {/* Inline Metadata (for mobile/package view) */}
                        <div className="flex items-center gap-1.5 mt-0.5 sm:hidden">
                             {titleProject && (
                                <span className="text-[8px] font-black px-1 rounded bg-neutral-100 text-neutral-500 uppercase">{titleProject}</span>
                            )}
                            {titleStage && (
                                <span className="text-[8px] font-black px-1 rounded bg-indigo-50 text-indigo-600 uppercase">{titleStage}</span>
                            )}
                        </div>
                    </div>
                    <div className="flex items-center gap-1.5 pt-1 sm:pt-0 shrink-0">
                        {/* Topic/Package ID Badge */}
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-tight ${
                            activeNextStep && !isDone 
                                ? 'bg-amber-100 text-amber-700' 
                                : 'bg-neutral-100 text-neutral-500'
                        }`}>
                            {task.topic_id || titleProject || 'Untitled'}
                        </span>

                        {/* Stage Badge (Desktop) */}
                        {titleStage && (
                             <span className="hidden sm:inline-flex text-[9px] font-black px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-600 border border-indigo-100 uppercase tracking-tighter">
                                {titleStage}
                            </span>
                        )}

                        {task.package_total !== undefined && (
                            <span className="text-[10px] font-bold text-neutral-400">
                                {task.package_done}/{task.package_total}
                            </span>
                        )}
                    </div>


                </div>
            </div>


            {/* Metadata */}
            <div className="flex flex-wrap sm:flex-nowrap items-center gap-x-4 gap-y-2 sm:gap-x-6 mt-1.5 sm:mt-0 pl-5 sm:pl-0 sm:ml-4 text-[11px] sm:text-xs text-neutral-500 sm:shrink-0">
                
                {/* Status Badge */}
                <div className="hidden sm:block w-20 shrink-0">
                    <QuickStatusPicker 
                        status={task.status as any} 
                        onStatusChange={onStatusChange || (() => {})} 
                    />
                </div>

                {/* Date + Overdue Urgency */}
                <div className={`flex items-center gap-1.5 w-auto sm:w-28 shrink-0 font-medium ${
                    !task.scheduled_date ? 'text-neutral-300' : 
                    isOverdue ? 'text-red-500' : 'text-neutral-600'
                }`}>
                    <Calendar className="w-3 h-3" />
                    <span className="flex items-center gap-1">
                        {task.scheduled_date ? task.scheduled_date : "ไม่มีวันที่"}
                        {isOverdue && <span className="text-[9px] bg-red-50 px-1 rounded border border-red-100">เลยกำหนด</span>}
                    </span>
                </div>

                {/* Priority */}
                <div className={`w-auto sm:w-16 font-medium shrink-0 flex items-center gap-1 ${priorityColor[pIdx]}`}>
                    {priorityLabels[pIdx]}
                </div>

                {/* List / Workspace */}
                <div className="hidden md:flex items-center gap-1.5 w-32 truncate shrink-0">
                    <Tag className="w-3 h-3 text-neutral-300" />
                    <span className="truncate">{task.list_name || task.workspace || 'ยังไม่ระบุ'}</span>
                </div>

                {/* Content Template Badge */}
                <div className="hidden lg:flex w-24 items-center shrink-0">
                    {task.template_key && (
                        <div className={`px-2 py-0.5 rounded-md font-bold uppercase tracking-wider text-[9px] ${
                            task.template_key === 'article' ? 'bg-blue-50 text-blue-700' :
                            task.template_key === 'short_video' ? 'bg-red-50 text-red-700' :
                            task.template_key === 'carousel' ? 'bg-orange-50 text-orange-700' :
                            'bg-neutral-100 text-neutral-700'
                        }`}>
                            {task.template_key.replace('_', ' ')}
                        </div>
                    )}
                </div>

                {/* Indicators + Linked Notice */}
                <div className="flex items-center gap-3 w-auto sm:w-16 sm:justify-end shrink-0 text-neutral-400 ml-auto sm:ml-0">
                    {task.doc_id && <div title="เชื่อมกับ Hub Note"><Paperclip className="w-3.5 h-3.5 text-blue-500" /></div>}
                    {hasNotes && <div title="มีบันทึก"><FileText className="w-3.5 h-3.5" /></div>}
                    {!task.doc_id && hasAttachments && <div title="มีเอกสารแนบ"><Paperclip className="w-3.5 h-3.5" /></div>}
                </div>
            </div>
        </div>
    );
}
