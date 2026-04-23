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
import { LABEL_BASE, BUTTON_PRIMARY, BUTTON_SECONDARY } from "../lib/styles";
import { 
    cleanTaskTitle, 
    parseProjectFromTitle, 
    parseStageFromTitle, 
    parsePlatformsFromTitle, 
    constructRawTitle,
    KNOWN_PLATFORMS 
} from "../lib/content/utils";
import { Modal } from "./ui/Modal";

const INPUT_BASE = "w-full text-sm bg-neutral-50/50 hover:bg-neutral-100/80 border border-transparent focus:border-neutral-200 focus:bg-white rounded-xl px-3 py-2 outline-none transition-all placeholder:text-neutral-400 disabled:opacity-50 disabled:cursor-not-allowed";

// --- Helpers ---

function normalizeDate(d: string | null): string | null {
    if (!d) return null;
    const date = new Date(d);
    if (isNaN(date.getTime())) return null;
    return date.toISOString().split('T')[0];
}

type Subtask = { id: string, text: string, done: boolean };

function parseNotes(raw: string) {
    const lines = (raw || "").split("\n");
    const descriptionLines: string[] = [];
    const subtasks: Subtask[] = [];

    lines.forEach((line, idx) => {
        const match = line.match(/^-\s\[([ xX])\]\s(.*)$/);
        if (match) {
            subtasks.push({
                id: `st-${idx}`,
                done: match[1].toLowerCase() === "x",
                text: match[2]
            });
        } else {
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

    const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
    const [isDismissing, setIsDismissing] = useState(false);
    const [dismissError, setDismissError] = useState<string | null>(null);
    const dirtyRef = useRef(false);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    const isContentWs = task.workspace === "content" || task.workspace === "avacrm";

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
        if (!dirtyRef.current) return true; // Success (nothing to do)
        setSaveStatus("saving");

        try {
            const updated = await patchTask(task.id, payloadRef.current);
            onUpdate(updated);
            setSaveStatus("saved");
            dirtyRef.current = false;
            return true;
        } catch (e) {
            console.error(e);
            setSaveStatus("error");
            return false;
        }
    }, [task.id, onUpdate]);

    const triggerSave = useCallback(() => {
        dirtyRef.current = true;
        setSaveStatus("saving"); 
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => {
            doSave();
        }, 800);
    }, [doSave]);

    const handleClose = async () => {
        setDismissError(null);
        
        // 1. Validation check (e.g., title shouldn't be empty)
        if (!cleanTaskTitle(titleRaw).trim()) {
            setSaveStatus("error");
            setDismissError("Task title cannot be empty.");
            return;
        }

        // 2. Immediate UI Feedback
        setIsDismissing(true);

        // 3. Save if dirty
        if (dirtyRef.current) {
            try {
                const success = await doSave();
                if (!success) {
                    setIsDismissing(false);
                    setDismissError("Failed to save changes. Please check your connection.");
                    return;
                }
            } catch (e) {
                setIsDismissing(false);
                setDismissError("An unexpected error occurred during save.");
                return;
            }
        }
        
        onClose();
    };

    // Keyboard Shortcuts (Standardized V5)
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
                e.preventDefault();
                doSave().then(() => onClose());
            }
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [doSave, onClose]);

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
            } catch (e) { console.error(e); }
        }
        run();

        async function runSprints() {
            try {
                const res = await fetch(`/api/sprints`);
                if (!res.ok) return;
                const data = await res.json();
                if (!cancelled) setAvailableSprints(data);
            } catch (e) { console.error(e); }
        }
        runSprints();

        return () => { cancelled = true; };
    }, [task.workspace]);

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
        triggerSave();

        try {
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

    const handleStatusChange = (val: string) => {
        const newStatus = val.toLowerCase() as TaskStatus;
        setStatus(newStatus);
        if (newStatus === "planned" && !scheduledDate) {
            setScheduledDate(new Date().toISOString().split("T")[0]);
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
        const qs = new URLSearchParams(window.location.search);
        qs.set("newTask", "1");
        qs.set("parent_task_id", task.id);
        qs.set("workspace", task.workspace);
        if (task.list_id) {
            qs.set("list_id", task.list_id);
        }
        if (task.topic_id) {
            qs.set("topic_id", task.topic_id);
        }
        if (task.package_id) {
            qs.set("package_id", task.package_id);
        }
        router.replace(`?${qs.toString()}`, { scroll: false });
    };

    return (
        <Modal isOpen={isOpen} title="Task Details" onClose={handleClose} maxWidth="max-w-5xl">
            <div className="flex flex-col h-full animate-in fade-in duration-500 relative">
                {/* Dismissal Overlay - Reactive UI feedback */}
                {isDismissing && (
                    <div className="absolute inset-0 z-[100] bg-white/60 backdrop-blur-sm flex items-center justify-center animate-in fade-in duration-200">
                        <div className="flex flex-col items-center gap-4">
                            <div className="w-12 h-12 border-4 border-neutral-200 border-t-black rounded-full animate-spin" />
                            <div className="text-sm font-black uppercase tracking-widest text-neutral-900">Saving & Closing...</div>
                        </div>
                    </div>
                )}
                {/* Inline Error (Replaces alerts) */}
                {dismissError && (
                    <div className="mb-4 p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center justify-between gap-4 animate-in slide-in-from-top-2 duration-300">
                        <div className="flex items-center gap-3 text-red-600">
                            <LucideIcons.AlertCircle size={18} />
                            <span className="text-sm font-bold">{dismissError}</span>
                        </div>
                        <button onClick={() => setDismissError(null)} className="text-red-400 hover:text-red-600 font-bold text-lg">×</button>
                    </div>
                )}

                {/* Header (Title) */}
                <div className="flex items-start justify-between pb-4 border-b border-neutral-100 gap-4 shrink-0 bg-white/95 backdrop-blur-md z-20">
                    <input
                        value={cleanTaskTitle(titleRaw)}
                        onChange={(e) => {
                            setTitleRaw(constructRawTitle(e.target.value, project, stage, platforms));
                            setDismissError(null);
                            triggerSave();
                        }}
                        placeholder="Task Title"
                        className={`text-2xl font-bold tracking-tight text-neutral-900 w-full border border-transparent focus:outline-none hover:bg-neutral-50 focus:bg-white transition-all rounded-lg px-2 -mx-2 bg-transparent`}
                        autoFocus
                    />
                    <div className="flex items-center gap-4 shrink-0 mt-1">
                        <div className="text-xs font-semibold min-w-[60px] text-right text-neutral-400">
                            {saveStatus === "saving" && <span className="animate-pulse">Saving...</span>}
                            {saveStatus === "saved" && <span className="text-emerald-600">Saved</span>}
                            {saveStatus === "error" && <span className="text-red-500">Error</span>}
                        </div>
                    </div>
                </div>

                {/* Body */}
                <div className="py-6 overflow-y-auto flex-1 space-y-12 scrollbar-hide-until-hover pb-24">
                    {/* OVERVIEW SECTION */}
                    <section className="space-y-6">
                        <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-widest">Overview</h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
                            <div>
                                <label className={LABEL_BASE}>Status</label>
                                <select className={INPUT_BASE} value={status?.toLowerCase() || 'inbox'} onChange={(e) => handleStatusChange(e.target.value)} disabled={readOnly}>
                                    <option value="inbox">Inbox</option>
                                    <option value="planned">Planned</option>
                                    <option value="in_progress">In Progress</option>
                                    <option value="review">Review</option>
                                    <option value="done">Done</option>
                                </select>
                            </div>
                            <div>
                                <label className={LABEL_BASE}>Sprint</label>
                                <select className={INPUT_BASE} value={sprintId || ""} onChange={(e) => { setSprintId(e.target.value || null); triggerSave(); }} disabled={readOnly}>
                                    <option value="">(Backlog)</option>
                                    {availableSprints.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className={LABEL_BASE}>List</label>
                                <select className={INPUT_BASE} value={listId || ""} onChange={(e) => { setListId(e.target.value || null); triggerSave(); }} disabled={readOnly}>
                                    <option value="">(Unassigned)</option>
                                    {availableLists.map(l => <option key={l.id} value={l.id}>{l.title}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className={LABEL_BASE}>Priority</label>
                                <select className={INPUT_BASE} value={priority} onChange={(e) => { setPriority(Number(e.target.value)); triggerSave(); }} disabled={readOnly}>
                                    <option value={1}>Low</option>
                                    <option value={2}>Normal</option>
                                    <option value={3}>High</option>
                                    <option value={4}>Urgent</option>
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className={LABEL_BASE}>Summary / Checkpoints</label>
                            <textarea
                                className={`${INPUT_BASE} min-h-[100px] font-mono text-sm leading-relaxed resize-y`}
                                value={description}
                                onChange={e => { setDescription(e.target.value); triggerSave(); }}
                                placeholder="Add highlights or execution steps here..."
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
                                <input type="date" className={INPUT_BASE} value={scheduledDate || ""} onChange={(e) => { setScheduledDate(normalizeDate(e.target.value)); triggerSave(); }} disabled={readOnly} />
                            </div>
                            <div>
                                <label className={LABEL_BASE}>Start Time</label>
                                <input type="time" className={INPUT_BASE} value={startTime} onChange={(e) => { setStartTime(e.target.value); triggerSave(); }} disabled={readOnly} />
                            </div>
                            <div>
                                <label className={LABEL_BASE}>End Time</label>
                                <input type="time" className={INPUT_BASE} value={endTime} onChange={(e) => { setEndTime(e.target.value); triggerSave(); }} disabled={readOnly} />
                            </div>
                        </div>
                    </section>

                    {/* CONTEXT SECTION */}
                    {isContentWs && (
                        <section className="space-y-8 pt-2 border-t border-neutral-100">
                            <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-widest pt-4 mb-2">Context</h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div>
                                    <label className={LABEL_BASE}>Project ID</label>
                                    <input className={INPUT_BASE} placeholder="e.g. iPhone16" value={project} onChange={e => { setProject(e.target.value); setTitleRaw(constructRawTitle(cleanTaskTitle(titleRaw), e.target.value, stage, platforms)); triggerSave(); }} readOnly={readOnly} />
                                </div>
                                <div>
                                    <label className={LABEL_BASE}>Stage</label>
                                    <select className={INPUT_BASE} value={stage} onChange={e => { setStage(e.target.value); setTitleRaw(constructRawTitle(cleanTaskTitle(titleRaw), project, e.target.value, platforms)); triggerSave(); }} disabled={readOnly}>
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
                                                <label key={p} className={`flex items-center gap-2 cursor-pointer select-none px-3 py-1.5 rounded-full border text-xs font-bold uppercase transition-colors ${isSel ? 'border-blue-200 bg-blue-50 text-blue-700' : 'border-neutral-200 bg-white text-neutral-500 hover:bg-neutral-50'}`}>
                                                    <input type="checkbox" checked={isSel} onChange={e => {
                                                        const next = e.target.checked ? [...platforms, p] : platforms.filter(x => x !== p);
                                                        setPlatforms(next);
                                                        setTitleRaw(constructRawTitle(cleanTaskTitle(titleRaw), project, stage, next));
                                                        triggerSave();
                                                    }} className="hidden" />
                                                    {p}
                                                </label>
                                            )
                                        })}
                                    </div>
                                </div>
                            </div>
                        </section>
                    )}

                    {/* SUBTASKS & CHECKLIST */}
                    <section className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 pt-2 border-t border-neutral-100">
                        <div>
                            <div className="flex justify-between items-center mb-4">
                                <label className={LABEL_BASE + " !mb-0"}>Subtasks</label>
                                <button onClick={handleCreateSubtask} className="text-[10px] uppercase font-bold tracking-wider text-blue-600 hover:text-blue-800 bg-blue-50 px-2.5 py-1 rounded-md transition-colors">
                                    + Add Subtask
                                </button>
                            </div>
                            <div className="space-y-2">
                                {realSubtasks.map(s => (
                                    <div key={s.id} className="flex items-center gap-3 p-2.5 bg-white border border-neutral-100 rounded-xl hover:border-neutral-300 cursor-pointer" onClick={() => { const qs = new URLSearchParams(window.location.search); qs.set("taskId", s.id); router.replace(`?${qs.toString()}`, { scroll: false }); }}>
                                        <div className="font-medium text-sm text-neutral-800 flex-1 truncate">{s.title || "Untitled Subtask"}</div>
                                        <div className="text-[10px] px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-600 uppercase font-black tracking-wider">{s.status}</div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div>
                            <label className={LABEL_BASE + " mb-4 block"}>Checklist</label>
                            <div className="space-y-1 mb-3">
                                {checklistItems.map((s, idx) => (
                                    <div key={s.id} className="flex items-start gap-3 py-1.5 group">
                                        <input type="checkbox" checked={s.done} onChange={() => toggleChecklist(idx)} className="mt-0.5 w-4 h-4 rounded border-neutral-300 text-black focus:ring-black cursor-pointer shadow-sm transition-colors" />
                                        <span className={`flex-1 text-sm leading-tight transition-colors ${s.done ? "text-neutral-400 line-through" : "text-neutral-800"}`}>{s.text}</span>
                                        <button onClick={() => removeChecklist(idx)} className="opacity-0 group-hover:opacity-100 text-neutral-400 hover:text-red-500 transition-opacity">&times;</button>
                                    </div>
                                ))}
                            </div>
                            <input className={INPUT_BASE} placeholder="+ Add checklist item..." onKeyDown={e => { if (e.key === "Enter") { handleAddChecklist(e.currentTarget.value); e.currentTarget.value = ""; } }} />
                        </div>
                    </section>

                    {/* AGENT AUTOMATION */}
                    <section className={`space-y-6 pt-6 border-l-4 ${agentEnabled ? 'border-indigo-500 bg-indigo-50/20' : 'border-transparent'} px-5 py-6 transition-all`}>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <LucideIcons.Zap className={agentEnabled ? "text-indigo-600" : "text-neutral-400"} size={18} />
                                <h3 className="text-xs font-bold text-neutral-900 uppercase tracking-widest">Agent Automation</h3>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" className="sr-only peer" checked={agentEnabled} onChange={(e) => { setAgentEnabled(e.target.checked); triggerSave(); }} />
                                <div className="w-11 h-6 bg-neutral-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-100 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                            </label>
                        </div>
                        {agentEnabled && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-4">
                                    <div><label className={LABEL_BASE}>Source Note ID</label><input className={INPUT_BASE} value={sourceNoteId} onChange={(e) => { setSourceNoteId(e.target.value); triggerSave(); }} /></div>
                                    <div><label className={LABEL_BASE}>Research Note ID</label><input className={INPUT_BASE} value={researchNoteId} onChange={(e) => { setResearchNoteId(e.target.value); triggerSave(); }} /></div>
                                </div>
                                <div className="flex flex-col justify-between p-4 bg-white rounded-2xl border border-neutral-100">
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between"><span className="text-[10px] font-black uppercase text-neutral-400">Status</span><span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-500">{agentStatus}</span></div>
                                        <button onClick={handleRunAgent} disabled={loadingRun || !sourceNoteId} className="w-full mt-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-[0.2em] bg-indigo-600 text-white hover:bg-indigo-700 transition-all">{loadingRun ? "Processing..." : "Run Automation"}</button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </section>
                    
                    {/* MATERIALS */}
                    <section className="space-y-8 pt-2 border-t border-neutral-100">
                        <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-widest pt-4">Materials</h3>
                        <div className="space-y-8">
                            <div><label className={LABEL_BASE}>Primary Document</label><div className="mt-3 border rounded-3xl p-5 min-h-[400px] bg-white"><TaskDocPanel task={task} onUpdate={onUpdate} /></div></div>
                            <div><label className={LABEL_BASE}>Related Notes</label><div className="mt-3 border rounded-3xl p-6 bg-neutral-50/20"><TaskRelatedNotes taskId={task.id} workspace={task.workspace} /></div></div>
                            <div><label className={LABEL_BASE}>Attachments</label><div className="mt-2 border rounded-xl p-6 bg-neutral-50/30"><AttachmentsPanel kind="task" entityId={task.id} onCountChange={setFileCount} /></div></div>
                        </div>
                    </section>
                </div>
            </div>
        </Modal>
    );
}
