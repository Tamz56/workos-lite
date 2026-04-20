"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import * as LucideIcons from "lucide-react";
import { useRouter } from "next/navigation";
import type { Task, TaskStatus, Sprint } from "../lib/types";
import { patchTask, listAttachments } from "../lib/api";
import TaskDocPanel from "./TaskDocPanel";
import AttachmentsPanel from "./AttachmentsPanel";
import { List } from "../lib/lists";
import TaskRelatedNotes from "./TaskRelatedNotes";
import { INPUT_BASE as _OLD_INPUT_BASE, LABEL_BASE, BUTTON_PRIMARY, BUTTON_SECONDARY } from "../lib/styles";
import { 
    cleanTaskTitle, 
    parseProjectFromTitle, 
    parseStageFromTitle, 
    parsePlatformsFromTitle, 
    constructRawTitle,
    KNOWN_PLATFORMS 
} from "../lib/content/utils";

const INPUT_BASE = "w-full text-sm bg-neutral-50/50 hover:bg-neutral-100/80 border border-transparent focus:border-neutral-200 focus:bg-white rounded-xl px-3 py-2 outline-none transition-all placeholder:text-neutral-400 disabled:opacity-50 disabled:cursor-not-allowed";

// --- Helpers ---

function normalizeDate(d: string | null): string | null {
    if (!d) return null;
    const date = new Date(d);
    if (isNaN(date.getTime())) return null;
    // YYYY-MM-DD
    return date.toISOString().split('T')[0];
}


// Subtasks / Notes Parsing
// Format: 
// Description text...
// - [ ] Item 1
// - [x] Item 2
type Subtask = { id: string, text: string, done: boolean };

function parseNotes(raw: string) {
    const lines = (raw || "").split("\n");
    const descriptionLines: string[] = [];
    const subtasks: Subtask[] = [];

    let inSubtasks = false;

    lines.forEach((line, idx) => {
        const match = line.match(/^-\s\[([ xX])\]\s(.*)$/);
        if (match) {
            inSubtasks = true;
            subtasks.push({
                id: `st-${idx}`,
                done: match[1].toLowerCase() === "x",
                text: match[2]
            });
        } else {
            // Keep description lines. 
            // If we are already finding subtasks, maybe we should attach these to previous?
            // For MVP strictness: Non-checklist lines are Description.
            // But usually checklist is at bottom.
            descriptionLines.push(line);
        }
    });

    return { description: descriptionLines.join("\n").trim(), subtasks };
}

function serializeNotes(description: string, subtasks: Subtask[]) {
    let out = description.trim();
    if (subtasks.length > 0) {
        if (out) out += "\n\n";
        out += subtasks.map(s => `- [${s.done ? "x" : " "}] ${s.text}`).join("\n");
    }
    return out;
}

type TabKey = "details" | "content" | "subtasks" | "checklist" | "doc" | "files";

interface TaskDetailDialogProps {
    task: Task | null;
    isOpen: boolean;
    isLoading?: boolean;
    onClose: () => void;
    onUpdate: (updated?: Task) => void;
    initialTab?: TabKey;
    readOnly?: boolean;
}

export default function TaskDetailDialog(props: TaskDetailDialogProps) {
    const { isOpen, task } = props;
    if (!isOpen || !task?.id) return null;
    return <TaskDetailDialogInner key={task.id} {...props} task={task} />;
}

function TaskDetailDialogInner({ task, isLoading, readOnly, onUpdate, onClose, isOpen }: TaskDetailDialogProps & { task: Task }) {
    const router = useRouter();
    const [fileCount, setFileCount] = useState(0);

    // Consolidated Editable State
    // We keep individual states for ease of binding, but we'll bundle them for save
    const [titleRaw, setTitleRaw] = useState(task.title || "");
    const [project, setProject] = useState(parseProjectFromTitle(task.title || ""));
    const [stage, setStage] = useState(parseStageFromTitle(task.title || ""));
    const [platforms, setPlatforms] = useState<string[]>(parsePlatformsFromTitle(task.title || ""));

    const [status, setStatus] = useState<TaskStatus>((task.status?.toLowerCase() as TaskStatus) || "inbox");
    const [listId, setListId] = useState<string | null>(task.list_id || null);
    const [scheduledDate, setScheduledDate] = useState(normalizeDate(task.scheduled_date));
    const [startTime, setStartTime] = useState(task.start_time || "");
    const [endTime, setEndTime] = useState(task.end_time || "");
    const [priority, setPriority] = useState(task.priority ?? 2);

    const [availableLists, setAvailableLists] = useState<List[]>([]);
    const [availableSprints, setAvailableSprints] = useState<Sprint[]>([]);
    const [sprintId, setSprintId] = useState<string | null>(task.sprint_id || null);

    const parsed = parseNotes(task.notes || "");
    const [description, setDescription] = useState(parsed.description);
    const [checklistItems, setChecklistItems] = useState<Subtask[]>(parsed.subtasks);

    // REAL Subtasks
    const [realSubtasks, setRealSubtasks] = useState<Task[]>([]);
    const [loadingSubtasks, setLoadingSubtasks] = useState(false);

    const [agentEnabled, setAgentEnabled] = useState(task.agent_enabled === 1);
    const [agentMode, setAgentMode] = useState(task.agent_mode || "content_pack");
    const [sourceNoteId, setSourceNoteId] = useState(task.source_note_id || "");
    const [researchNoteId, setResearchNoteId] = useState(task.research_note_id || "");
    const [agentStatus, setAgentStatus] = useState(task.agent_status || "idle");
    const [lastRunAt, setLastRunAt] = useState(task.agent_last_run_at || "");
    const [lastResultNoteId, setLastResultNoteId] = useState(task.last_agent_result_note_id || "");
    const [lastError, setLastError] = useState(task.last_agent_error || "");

    // Save Status
    const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
    const dirtyRef = useRef(false);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    const isContentWs = task.workspace === "content" || task.workspace === "avacrm";

    // --- Save Logic ---
    // Maintain a ref with the latest data to avoid closure stale-state bugs within setTimeout
    const payloadRef = useRef<Partial<Task>>({});

    useEffect(() => {
        payloadRef.current = {
            title: constructRawTitle(cleanTaskTitle(titleRaw), project, stage, platforms),
            status,
            list_id: listId,
            sprint_id: sprintId,
            scheduled_date: scheduledDate,
            start_time: startTime || null,
            end_time: endTime || null,
            priority,
            notes: serializeNotes(description, checklistItems),
            agent_enabled: agentEnabled ? 1 : 0,
            agent_mode: agentMode,
            source_note_id: sourceNoteId,
            research_note_id: researchNoteId,
            agent_status: agentStatus,
            agent_last_run_at: lastRunAt,
            last_agent_result_note_id: lastResultNoteId,
            last_agent_error: lastError
        };
    }, [titleRaw, project, stage, platforms, status, listId, sprintId, scheduledDate, startTime, endTime, priority, description, checklistItems, agentEnabled, agentMode, sourceNoteId, researchNoteId, agentStatus, lastRunAt, lastResultNoteId, lastError]);

    const doSave = useCallback(async () => {
        if (!dirtyRef.current) return;
        setSaveStatus("saving");

        try {
            const updated = await patchTask(task.id, payloadRef.current);
            onUpdate(updated);
            setSaveStatus("saved");
            dirtyRef.current = false;
        } catch (e) {
            console.error(e);
            setSaveStatus("error");
        }
    }, [task.id, onUpdate]);

    // Debounce Trigger
    const triggerSave = useCallback(() => {
        dirtyRef.current = true;
        setSaveStatus("saving"); 
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => {
            doSave();
        }, 800);
    }, [doSave]);

    // Force save on unmount / close
    // We can't easily async await on unmount.
    // But ESC/Close triggers generic onClose.
    // We should try to save if dirty before closing.
    const handleClose = async () => {
        if (dirtyRef.current) {
            await doSave();
        }
        onClose();
    };

    // Keyboard Shortcuts
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            const target = e.target as HTMLElement;
            const isInput = target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT" || target.isContentEditable);

            if (e.key === "Escape" && !isInput) {
                handleClose();
            }
            if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
                doSave().then(() => onClose());
            }
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [handleClose, doSave, onClose]);


    // Attachments fetch
    useEffect(() => {
        listAttachments(task.id).then(files => setFileCount(files?.length || 0)).catch(() => { });
    }, [task.id]);

    useEffect(() => {
        let cancelled = false;
        if (!task.workspace) return;
        async function run() {
            try {
                const res = await fetch(`/api/lists?workspace=${task.workspace}`);
                if (!res.ok) return;
                const data = await res.json();
                if (!cancelled) setAvailableLists(data);
            } catch (e) {
                console.error(e);
            }
        }
        run();

        async function runSprints() {
            try {
                const res = await fetch(`/api/sprints`);
                if (!res.ok) return;
                const data = await res.json();
                if (!cancelled) setAvailableSprints(data);
            } catch (e) {
                console.error(e);
            }
        }
        runSprints();

        return () => { cancelled = true; };
    }, [task.workspace]);

    // Fetch REAL Subtasks immediately
    useEffect(() => {
        setLoadingSubtasks(true);
        fetch(`/api/tasks?parent_id=${task.id}`)
            .then(r => r.json())
            .then(data => {
                if (Array.isArray(data)) setRealSubtasks(data);
                setLoadingSubtasks(false);
            })
            .catch(() => setLoadingSubtasks(false));
    }, [task.id]);

    const [loadingRun, setLoadingRun] = useState(false);

    const handleRunAgent = async () => {
        if (loadingRun) return;
        setLoadingRun(true);
        setAgentStatus("running");
        triggerSave(); // Save current state first

        try {
            // Wait a bit for the auto-save to settle if needed, or just force save
            await doSave();

            const res = await fetch(`/api/tasks/${task.id}/run-agent`, { method: "POST" });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || "Failed to run agent");
            }
            const data = await res.json();
            
            if (data.task) {
                onUpdate(data.task);
                setAgentStatus(data.task.agent_status);
                setLastRunAt(data.task.agent_last_run_at);
                setLastResultNoteId(data.task.last_agent_result_note_id);
                setLastError(data.task.last_agent_error || "");
                setStatus(data.task.status);
            }
        } catch (e: any) {
            console.error(e);
            setAgentStatus("failed");
            setLastError(e.message || "Execution failed");
        } finally {
            setLoadingRun(false);
        }
    };

    const handleTitleChange = (val: string) => {
        setTitleRaw(constructRawTitle(val, project, stage, platforms)); 
        triggerSave();
    };

    const handleStatusChange = (val: string) => {
        const newStatus = val.toLowerCase() as TaskStatus;
        setStatus(newStatus);
        // Rules
        if (newStatus === "planned" && !scheduledDate) {
            setScheduledDate(new Date().toISOString().split("T")[0]); // Default Today
        } else if (newStatus === "inbox") {
            setScheduledDate(null);
        }
        triggerSave();
    };

    const handleAddChecklist = (text: string) => {
        if (!text.trim()) return;
        setChecklistItems([...checklistItems, { id: Date.now().toString(), text, done: false }]);
        triggerSave();
    };

    const toggleChecklist = (idx: number) => {
        const next = [...checklistItems];
        next[idx].done = !next[idx].done;
        setChecklistItems(next);
        triggerSave();
    };

    const removeChecklist = (idx: number) => {
        const next = [...checklistItems];
        next.splice(idx, 1);
        setChecklistItems(next);
        triggerSave();
    };

    const handleCreateSubtask = () => {
        // Build url logic to open TaskEditorDialog with parent_task_id
        // Preserve current taskId so TaskDetailDialog remains open underneath
        const qs = new URLSearchParams(window.location.search);
        qs.set("newTask", "1");
        qs.set("parent_task_id", task.id);
        qs.set("workspace", task.workspace);
        if (task.list_id) {
            qs.set("list_id", task.list_id);
        }
        router.replace(`?${qs.toString()}`, { scroll: false });
    };

    // Derived Checklist Stats
    const subtDone = checklistItems.filter(s => s.done).length;
    const subtTotal = checklistItems.length;
    const subtBadge = subtTotal > 0 ? `${subtDone}/${subtTotal}` : undefined;

    return (
        <div className="fixed inset-0 md:inset-y-0 md:left-auto md:right-0 z-50 flex justify-end w-full md:w-[60vw] md:min-w-[500px] lg:w-[50vw] max-w-4xl max-h-screen pointer-events-none">
            {/* Drawer Surface */}
            <div 
                className="w-full h-full bg-white shadow-[-20px_0_40px_rgba(0,0,0,0.06)] sm:border-l border-neutral-200 pointer-events-auto flex flex-col animate-in slide-in-from-right duration-300 overflow-hidden" 
                onClick={e => e.stopPropagation()}
                onKeyDown={e => {
                    // Prevent key events from bubbling up if the user is typing in the drawer
                    e.stopPropagation();
                }}
            >
                {isLoading ? (
                    <div className="flex-1 flex flex-col items-center justify-center space-y-4 text-neutral-300 animate-in fade-in duration-300">
                        <div className="w-6 h-6 rounded-full border-b-2 border-neutral-300 animate-spin" />
                    </div>
                ) : (
                    <div className="flex flex-col h-full animate-in fade-in duration-500">
                        {/* Header (Title) */}
                        <div className="flex items-start justify-between px-5 md:px-8 pt-6 pb-4 border-b border-neutral-100 gap-4 shrink-0 bg-white/95 backdrop-blur-md z-20">
                            <input
                                value={cleanTaskTitle(titleRaw)}
                                onChange={(e) => {
                                    setTitleRaw(constructRawTitle(e.target.value, project, stage, platforms));
                                    triggerSave();
                                }}
                                placeholder="Task Title"
                                className={`text-2xl font-bold font-display tracking-tight text-neutral-900 w-full border border-transparent focus:outline-none hover:bg-neutral-50 focus:bg-white focus:ring-2 focus:ring-neutral-100 transition-all rounded-lg px-2 -mx-2 py-0.5 -my-0.5 bg-transparent`}
                                autoFocus
                            />
                    <div className="flex items-center gap-4 shrink-0 mt-1">
                        {/* Saved Indicator */}
                        <div className="text-xs font-semibold min-w-[60px] text-right text-neutral-400">
                            {saveStatus === "saving" && <span className="animate-pulse">Saving...</span>}
                            {saveStatus === "saved" && <span className="text-emerald-600">Saved</span>}
                            {saveStatus === "error" && <span className="text-red-500">Error</span>}
                        </div>
                        <button onClick={handleClose} className="text-neutral-400 hover:text-black transition-colors">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                        </button>
                    </div>
                </div>

                {/* Body (Unified Scrolling View) */}
                <div className="px-5 md:px-8 py-6 overflow-y-auto flex-1 space-y-12 scrollbar-hide-until-hover pb-24">
                    
                    {/* OVERVIEW SECTION */}
                    <section className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
                        <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-widest">Overview</h3>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
                            <div>
                                <label className={LABEL_BASE}>Status</label>
                                <select
                                    className={INPUT_BASE}
                                    value={status?.toLowerCase() || 'inbox'}
                                    onChange={(e) => handleStatusChange(e.target.value)}
                                    disabled={readOnly}
                                >
                                    <option value="inbox">Inbox</option>
                                    <option value="planned">Planned</option>
                                    <option value="in_progress">In Progress</option>
                                    <option value="review">Review</option>
                                    <option value="done">Done</option>
                                </select>
                            </div>
                            <div>
                                <label className={LABEL_BASE}>Sprint</label>
                                <select
                                    className={INPUT_BASE}
                                    value={sprintId || ""}
                                    onChange={(e) => {
                                        setSprintId(e.target.value || null);
                                        triggerSave();
                                    }}
                                    disabled={readOnly}
                                >
                                    <option value="">(Backlog)</option>
                                    {availableSprints.map(s => (
                                        <option key={s.id} value={s.id}>{s.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className={LABEL_BASE}>List</label>
                                <select
                                    className={INPUT_BASE}
                                    value={listId || ""}
                                    onChange={(e) => {
                                        setListId(e.target.value || null);
                                        triggerSave();
                                    }}
                                    disabled={readOnly}
                                >
                                    <option value="">(Unassigned)</option>
                                    {availableLists.map(l => (
                                        <option key={l.id} value={l.id}>{l.title}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className={LABEL_BASE}>Priority</label>
                                <select
                                    className={INPUT_BASE}
                                    value={priority}
                                    onChange={(e) => {
                                        setPriority(Number(e.target.value));
                                        triggerSave();
                                    }}
                                    disabled={readOnly}
                                >
                                    <option value={1}>Low</option>
                                    <option value={2}>Normal</option>
                                    <option value={3}>High</option>
                                    <option value={4}>Urgent</option>
                                </select>
                            </div>
                            <div>
                                <label className={LABEL_BASE}>Workspace</label>
                                <div className="text-sm font-semibold text-neutral-700 flex items-center gap-2 capitalize h-10 px-3 bg-neutral-50 border border-neutral-100 rounded-lg">
                                    <span className="w-2 h-2 rounded-full bg-neutral-400" />
                                    {task.workspace}
                                </div>
                            </div>
                        </div>

                        <div>
                            <label className={LABEL_BASE}>Summary / Checkpoints</label>
                            <textarea
                                className={`${INPUT_BASE} min-h-[100px] font-mono text-sm leading-relaxed resize-y`}
                                value={description}
                                onChange={e => {
                                    setDescription(e.target.value);
                                    triggerSave();
                                }}
                                placeholder="Add highlights or execution steps here... (Main writing happens in Notes)"
                                readOnly={readOnly}
                            />
                        </div>
                    </section>

                    {/* SCHEDULE SECTION */}
                    <section className="space-y-4 pt-2 border-t border-neutral-100">
                        <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-widest pt-4">Schedule</h3>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div>
                                <label className={LABEL_BASE}>Scheduled Date</label>
                                <input
                                    type="date"
                                    className={`${INPUT_BASE} ${status === 'planned' && !scheduledDate ? 'border-red-300 ring-1 ring-red-100' : ''}`}
                                    value={scheduledDate || ""}
                                    onChange={(e) => {
                                        setScheduledDate(normalizeDate(e.target.value));
                                        triggerSave();
                                    }}
                                    disabled={readOnly}
                                />
                            </div>
                            <div>
                                <label className={LABEL_BASE}>Start Time</label>
                                <input
                                    type="time"
                                    className={INPUT_BASE}
                                    value={startTime}
                                    onChange={(e) => {
                                        setStartTime(e.target.value);
                                        triggerSave();
                                    }}
                                    disabled={readOnly}
                                />
                            </div>
                            <div>
                                <label className={LABEL_BASE}>End Time</label>
                                <input
                                    type="time"
                                    className={INPUT_BASE}
                                    value={endTime}
                                    onChange={(e) => {
                                        setEndTime(e.target.value);
                                        triggerSave();
                                    }}
                                    disabled={readOnly}
                                />
                            </div>
                        </div>
                    </section>

                    {/* CONTEXT SECTION */}
                    <section className="space-y-8 pt-2 border-t border-neutral-100">
                        <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-widest pt-4 mb-2">Context</h3>
                        
                        {isContentWs && (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div>
                                    <label className={LABEL_BASE}>Project ID</label>
                                    <input
                                        className={INPUT_BASE}
                                        placeholder="e.g. iPhone16"
                                        value={project}
                                        onChange={e => {
                                            setProject(e.target.value);
                                            setTitleRaw(constructRawTitle(cleanTaskTitle(titleRaw), e.target.value, stage, platforms));
                                            triggerSave();
                                        }}
                                        readOnly={readOnly}
                                    />
                                </div>
                                <div>
                                    <label className={LABEL_BASE}>Stage</label>
                                    <select
                                        className={INPUT_BASE}
                                        value={stage}
                                        onChange={e => {
                                            setStage(e.target.value);
                                            setTitleRaw(constructRawTitle(cleanTaskTitle(titleRaw), project, e.target.value, platforms));
                                            triggerSave();
                                        }}
                                        disabled={readOnly}
                                    >
                                        <option value="">-- None --</option>
                                        <option value="Idea">Idea</option>
                                        <option value="Brief">Brief</option>
                                        <option value="Script">Script</option>
                                        <option value="Filming">Filming</option>
                                        <option value="Editing">Editing</option>
                                        <option value="Review">Review</option>
                                        <option value="Final">Final</option>
                                    </select>
                                </div>
                                <div>
                                    <label className={LABEL_BASE}>Platforms</label>
                                    <div className="flex flex-wrap gap-2 pt-1">
                                        {KNOWN_PLATFORMS.map(p => {
                                            const isSel = platforms.includes(p);
                                            return (
                                                <label 
                                                    key={p} 
                                                    className={`flex items-center gap-2 cursor-pointer select-none px-3 py-1.5 rounded-full border text-xs font-bold uppercase transition-colors ${
                                                        isSel ? 'border-blue-200 bg-blue-50 text-blue-700' : 'border-neutral-200 bg-white text-neutral-500 hover:bg-neutral-50'
                                                    }`}
                                                >
                                                    <input
                                                        type="checkbox"
                                                        checked={isSel}
                                                        onChange={e => {
                                                            const next = e.target.checked
                                                                ? [...platforms, p]
                                                                : platforms.filter(x => x !== p);
                                                            setPlatforms(next);
                                                            setTitleRaw(constructRawTitle(cleanTaskTitle(titleRaw), project, stage, next));
                                                            triggerSave();
                                                        }}
                                                        className="hidden"
                                                    />
                                                    {p}
                                                </label>
                                            )
                                        })}
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
                            {/* Subtasks */}
                            <div>
                                <div className="flex justify-between items-center mb-4">
                                    <label className={LABEL_BASE + " !mb-0"}>Subtasks</label>
                                    <button onClick={handleCreateSubtask} className="text-[10px] uppercase font-bold tracking-wider text-blue-600 hover:text-blue-800 bg-blue-50 px-2.5 py-1 rounded-md transition-colors">
                                        + Add Subtask
                                    </button>
                                </div>
                                
                                <div className="space-y-2">
                                    {realSubtasks.map(s => (
                                        <div
                                            key={s.id}
                                            className="flex items-center gap-3 p-2.5 bg-white border border-neutral-100 rounded-xl hover:border-neutral-300 hover:shadow-sm cursor-pointer transition-all"
                                            onClick={() => {
                                                const qs = new URLSearchParams(window.location.search);
                                                qs.set("taskId", s.id);
                                                router.replace(`?${qs.toString()}`, { scroll: false });
                                            }}
                                        >
                                            <div className="font-medium text-sm text-neutral-800 flex-1 truncate">{s.title || "Untitled Subtask"}</div>
                                            <div className="text-[10px] px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-600 uppercase font-black tracking-wider">
                                                {s.status}
                                            </div>
                                        </div>
                                    ))}
                                    {realSubtasks.length === 0 && (
                                        <div className="text-center py-6 text-sm border border-dashed rounded-lg border-neutral-200 text-neutral-400">
                                            No subtasks created.
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Checklist */}
                            <div>
                                <label className={LABEL_BASE + " mb-4 block"}>Checklist</label>
                                <div className="space-y-1 mb-3">
                                    {checklistItems.map((s, idx) => (
                                        <div key={s.id} className="flex items-start gap-3 py-1.5 group">
                                            <input
                                                type="checkbox"
                                                checked={s.done}
                                                onChange={() => toggleChecklist(idx)}
                                                className="mt-0.5 w-4 h-4 rounded border-neutral-300 text-black focus:ring-black cursor-pointer shadow-sm transition-colors"
                                            />
                                            <span className={`flex-1 text-sm leading-tight transition-colors ${s.done ? "text-neutral-400 line-through" : "text-neutral-800"}`}>
                                                {s.text}
                                            </span>
                                            <button
                                                onClick={() => removeChecklist(idx)}
                                                className="opacity-0 group-hover:opacity-100 text-neutral-400 hover:text-red-500 transition-opacity"
                                            >
                                                &times;
                                            </button>
                                        </div>
                                    ))}
                                    {checklistItems.length === 0 && (
                                        <div className="text-center py-6 text-sm text-neutral-400 italic">
                                            No checklist items.
                                        </div>
                                    )}
                                </div>
                                <div className="flex gap-2">
                                    <input
                                        className={`${INPUT_BASE} !text-sm bg-neutral-50/50 border-neutral-100 hover:border-neutral-200 focus:bg-white`}
                                        placeholder="+ Add checklist item..."
                                        onKeyDown={e => {
                                            if (e.key === "Enter") {
                                                handleAddChecklist(e.currentTarget.value);
                                                e.currentTarget.value = "";
                                            }
                                        }}
                                    />
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* AGENT AUTOMATION SECTION */}
                    <section className={`space-y-6 pt-2 border-l-4 ${agentEnabled ? 'border-indigo-500 bg-indigo-50/20' : 'border-transparent'} -mx-5 px-5 py-6 transition-all`}>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <LucideIcons.Zap className={agentEnabled ? "text-indigo-600" : "text-neutral-400"} size={18} />
                                <h3 className="text-xs font-bold text-neutral-900 uppercase tracking-widest">Agent Automation</h3>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input 
                                    type="checkbox" 
                                    className="sr-only peer" 
                                    checked={agentEnabled}
                                    onChange={(e) => {
                                        setAgentEnabled(e.target.checked);
                                        triggerSave();
                                    }}
                                />
                                <div className="w-11 h-6 bg-neutral-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-100 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                            </label>
                        </div>

                        {agentEnabled && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-top-2 duration-300">
                                <div className="space-y-4">
                                    <div>
                                        <label className={LABEL_BASE}>Agent Mode</label>
                                        <select 
                                            className={INPUT_BASE}
                                            value={agentMode}
                                            onChange={(e) => {
                                                setAgentMode(e.target.value);
                                                triggerSave();
                                            }}
                                        >
                                            <option value="content_pack">Content Pack Agent</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className={LABEL_BASE}>Source Note ID</label>
                                        <input 
                                            className={INPUT_BASE}
                                            placeholder="Enter Source Note ID..."
                                            value={sourceNoteId}
                                            onChange={(e) => {
                                                setSourceNoteId(e.target.value);
                                                triggerSave();
                                            }}
                                        />
                                    </div>
                                    <div>
                                        <label className={LABEL_BASE}>Research Note ID</label>
                                        <input 
                                            className={INPUT_BASE}
                                            placeholder="Enter Research Summary ID..."
                                            value={researchNoteId}
                                            onChange={(e) => {
                                                setResearchNoteId(e.target.value);
                                                triggerSave();
                                            }}
                                        />
                                    </div>
                                </div>

                                <div className="flex flex-col justify-between p-4 bg-white rounded-2xl border border-neutral-100 shadow-sm">
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between">
                                            <span className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Status</span>
                                            <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                                                agentStatus === 'success' ? 'bg-emerald-50 text-emerald-600' :
                                                agentStatus === 'failed' ? 'bg-red-50 text-red-600' :
                                                agentStatus === 'running' ? 'bg-indigo-50 text-indigo-600 animate-pulse' :
                                                'bg-neutral-100 text-neutral-500'
                                            }`}>
                                                {agentStatus}
                                            </span>
                                        </div>
                                        {lastRunAt && (
                                            <div className="text-[10px] text-neutral-400">
                                                Last Run: <span className="font-bold text-neutral-600">{new Date(lastRunAt).toLocaleString()}</span>
                                            </div>
                                        )}
                                        {lastResultNoteId && (
                                            <div className="flex items-center gap-2 p-2 bg-indigo-50 rounded-lg">
                                                <LucideIcons.FileText size={14} className="text-indigo-600" />
                                                <span className="text-xs font-bold text-indigo-700 truncate flex-1">Result: {lastResultNoteId}</span>
                                                <button 
                                                    onClick={() => router.push(`/notes/${lastResultNoteId}`)}
                                                    className="text-[10px] bg-indigo-600 text-white px-2 py-0.5 rounded font-bold"
                                                >
                                                    View
                                                </button>
                                            </div>
                                        )}
                                        {lastError && (
                                            <div className="text-[10px] text-red-500 bg-red-50 p-2 rounded-lg border border-red-100">
                                                <span className="font-black">Error:</span> {lastError}
                                            </div>
                                        )}
                                    </div>

                                    <button 
                                        onClick={handleRunAgent}
                                        disabled={loadingRun || !sourceNoteId}
                                        className={`w-full mt-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2 ${
                                            loadingRun ? 'bg-neutral-100 text-neutral-400' : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-md active:scale-95'
                                        }`}
                                    >
                                        {loadingRun ? (
                                            <>
                                                <div className="w-3 h-3 border-2 border-neutral-300 border-t-neutral-600 rounded-full animate-spin" />
                                                Processing...
                                            </>
                                        ) : (
                                            <>
                                                <LucideIcons.Play size={14} className="fill-current" />
                                                Run Now
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        )}
                    </section>

                    {/* MATERIALS & CONTENT HUBS */}
                    <section className="space-y-8 pt-2 border-t border-neutral-100">
                        <div className="flex items-center justify-between pt-4">
                            <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-widest">Materials & Content Hubs</h3>
                            <div className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md uppercase tracking-tighter">
                                Workspace Integration
                            </div>
                        </div>
                        
                        <div className="grid grid-cols-1 gap-8 md:gap-12">
                            <div>
                                <label className={LABEL_BASE}>Primary Document</label>
                                <div className="mt-3 border border-neutral-200 rounded-[1.5rem] overflow-hidden bg-white transition-all shadow-sm hover:shadow-md ring-1 ring-neutral-50 min-h-[400px] flex flex-col p-5">
                                    <TaskDocPanel task={task} onUpdate={onUpdate} />
                                </div>
                            </div>

                            <div>
                                <label className={LABEL_BASE}>Related Notes</label>
                                <div className="mt-3 border border-neutral-100 rounded-[1.5rem] overflow-hidden p-6 bg-neutral-50/20">
                                    <TaskRelatedNotes taskId={task.id} workspace={task.workspace} />
                                </div>
                            </div>

                            <div>
                                <label className={LABEL_BASE}>Attachments <span className="text-neutral-400 font-normal">({fileCount})</span></label>
                                <div className="mt-2 border border-neutral-100 rounded-xl overflow-hidden p-6 bg-neutral-50/30">
                                    <AttachmentsPanel kind="task" entityId={task.id} onCountChange={setFileCount} />
                                </div>
                            </div>
                        </div>
                    </section>

                </div>
                    </div>
                )}
            </div>
        </div>
    );
}
