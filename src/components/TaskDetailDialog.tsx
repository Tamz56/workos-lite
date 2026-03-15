"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import type { Task, TaskStatus } from "../lib/types";
import { patchTask, listAttachments } from "../lib/api";
import TaskDocPanel from "./TaskDocPanel";
import AttachmentsPanel from "./AttachmentsPanel";
import { List } from "../lib/lists";
import { INPUT_BASE, LABEL_BASE, BUTTON_PRIMARY, BUTTON_SECONDARY } from "../lib/styles";

// --- Helpers ---

function normalizeDate(d: string | null): string | null {
    if (!d) return null;
    const date = new Date(d);
    if (isNaN(date.getTime())) return null;
    // YYYY-MM-DD
    return date.toISOString().split('T')[0];
}

// Parse "project:Name"
function parseProject(title: string): string {
    const match = title.match(/project:([^\s]+)/);
    return match ? match[1] : "";
}

// Parse "#stage:Name"
function parseStage(title: string): string {
    const match = title.match(/#stage:([^\s]+)/);
    return match ? match[1] : "";
}

// Parse platforms (#fb, #ig, #yt, #tk)
const KNOWN_PLATFORMS = ["fb", "ig", "yt", "tk"];
function parsePlatforms(title: string): string[] {
    const regex = /#(fb|ig|yt|tk)\b/g;
    const matches = title.match(regex);
    return matches ? matches.map(m => m.replace("#", "")) : [];
}

// Clean title for display (remove project:..., #stage:..., #platform)
function cleanTitle(title: string): string {
    let t = title || ""
        .replace(/project:[^\s]+/, "")
        .replace(/#stage:[^\s]+/, "")
        .replace(/#priority:[^\s]+/, "");

    KNOWN_PLATFORMS.forEach(p => {
        t = t.replace(new RegExp(`#${p}\\b`, "g"), "");
    });
    return t.trim();
}

// Construct title
function constructTitle(base: string, project: string, stage: string, platforms: string[]) {
    let t = base || "";
    // Strip all first
    t = t.replace(/project:[^\s]+/, "")
        .replace(/#stage:[^\s]+/, "")
        .replace(/#priority:[^\s]+/, ""); // We don't write priority to title anymore (using DB col), but strip if exists

    KNOWN_PLATFORMS.forEach(p => {
        t = t.replace(new RegExp(`#${p}\\b`, "g"), "");
    });
    t = t.trim();

    const parts = [];
    if (project) parts.push(`project:${project}`);
    parts.push(t);
    if (stage) parts.push(`#stage:${stage}`);
    platforms.forEach(p => parts.push(`#${p}`));

    return parts.join(" ");
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

function TaskDetailDialogInner({
    task,
    onClose,
    onUpdate,
    initialTab,
    readOnly,
}: TaskDetailDialogProps & { task: Task }) {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<TabKey>(initialTab || "details");
    const [fileCount, setFileCount] = useState(0);

    // Consolidated Editable State
    // We keep individual states for ease of binding, but we'll bundle them for save
    const [titleRaw, setTitleRaw] = useState(task.title || "");
    const [project, setProject] = useState(parseProject(task.title || ""));
    const [stage, setStage] = useState(parseStage(task.title || ""));
    const [platforms, setPlatforms] = useState<string[]>(parsePlatforms(task.title || ""));

    const [status, setStatus] = useState<TaskStatus>((task.status?.toLowerCase() as TaskStatus) || "inbox");
    const [listId, setListId] = useState<string | null>(task.list_id || null);
    const [scheduledDate, setScheduledDate] = useState(normalizeDate(task.scheduled_date));
    const [priority, setPriority] = useState(task.priority ?? 2);

    const [availableLists, setAvailableLists] = useState<List[]>([]);

    const parsed = parseNotes(task.notes || "");
    const [description, setDescription] = useState(parsed.description);
    const [checklistItems, setChecklistItems] = useState<Subtask[]>(parsed.subtasks);

    // REAL Subtasks
    const [realSubtasks, setRealSubtasks] = useState<Task[]>([]);
    const [loadingSubtasks, setLoadingSubtasks] = useState(false);

    // Save Status
    const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
    const dirtyRef = useRef(false);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    const isContentWs = task.workspace === "content" || task.workspace === "avacrm";

    // --- Save Logic ---
    const doSave = useCallback(async () => {
        if (!dirtyRef.current) return;
        setSaveStatus("saving");

        // Reconstruct Title
        const cleanT = cleanTitle(titleRaw);
        const finalTitle = constructTitle(cleanT, project, stage, platforms);

        // Reconstruct Notes
        const finalNotes = serializeNotes(description, checklistItems);

        try {
            const updates: Partial<Task> = {
                title: finalTitle,
                status,
                list_id: listId,
                scheduled_date: scheduledDate,
                priority,
                notes: finalNotes
            };
            const updated = await patchTask(task.id, updates);
            onUpdate(updated);
            setSaveStatus("saved");
            dirtyRef.current = false;

            // Re-sync raw title if format changed? No, keep user input to avoid jumps.
            // But we should sync internal specific states if they changed externally?
            // Here we are the source of truth.
        } catch (e) {
            console.error(e);
            setSaveStatus("error");
        }
    }, [task.id, titleRaw, project, stage, platforms, status, listId, scheduledDate, priority, description, checklistItems, onUpdate]);

    // Debounce Trigger
    const triggerSave = useCallback(() => {
        dirtyRef.current = true;
        setSaveStatus("saving"); // Optimistic "Saving..." text immediately (or "Waiting...")? 
        // User asked for "Saving...", usually implies in progress.
        // Let's show "..."
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
            if (e.key === "Escape") {
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
        return () => { cancelled = true; };
    }, [task.workspace]);

    // Fetch REAL Subtasks whenever tab is active
    useEffect(() => {
        if (activeTab === "subtasks") {
            setLoadingSubtasks(true);
            fetch(`/api/tasks?parent_id=${task.id}`)
                .then(r => r.json())
                .then(data => {
                    if (Array.isArray(data)) setRealSubtasks(data);
                    setLoadingSubtasks(false);
                })
                .catch(() => setLoadingSubtasks(false));
        }
    }, [activeTab, task.id]);

    // --- Handlers ---

    const handleTitleChange = (val: string) => {
        setTitleRaw(constructTitle(val, project, stage, platforms)); // Update raw immediately?
        // Actually, we bind the INPUT to cleanTitle, but setTitleRaw stores the full constructed one?
        // Re-flow: 
        // Input shows cleanTitle(titleRaw)
        // User edits -> calls setRawTitle(constructTitle(newVal...))
        // That seems circular but correct for maintaining prefix/suffix.
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={handleClose}>
            <div className="w-full max-w-4xl bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>

                {/* Header (Title) */}
                <div className="flex items-center justify-between p-4 border-b gap-4">
                    <input
                        value={cleanTitle(titleRaw)}
                        onChange={(e) => {
                            setTitleRaw(constructTitle(e.target.value, project, stage, platforms));
                            triggerSave();
                        }}
                        placeholder="Task Title"
                        className={`text-xl font-bold w-full border-b border-transparent focus:outline-none hover:border-neutral-300 focus:border-black bg-transparent`}
                        autoFocus
                    />
                    <div className="flex items-center gap-3 shrink-0">
                        {/* Saved Indicator */}
                        <div className="text-xs font-medium min-w-[60px] text-right text-gray-400">
                            {saveStatus === "saving" && <span className="animate-pulse">Saving...</span>}
                            {saveStatus === "saved" && <span className="text-green-600">Saved</span>}
                            {saveStatus === "error" && <span className="text-red-500">Error</span>}
                        </div>
                        <button onClick={handleClose} className="text-neutral-400 hover:text-neutral-600 text-2xl leading-none">&times;</button>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex border-b bg-neutral-50 px-2 overflow-x-auto">
                    <TabBtn id="details" label="Details" active={activeTab} onClick={setActiveTab} />
                    {isContentWs && <TabBtn id="content" label="Content" active={activeTab} onClick={setActiveTab} />}
                    <TabBtn id="subtasks" label="Subtasks" active={activeTab} onClick={setActiveTab} badge={realSubtasks.length > 0 ? realSubtasks.length : undefined} badgeColor="blue" />
                    <TabBtn id="checklist" label="Checklist" active={activeTab} onClick={setActiveTab} badge={subtBadge} />
                    <TabBtn id="doc" label="Doc" active={activeTab} onClick={setActiveTab} badge={task.doc_id ? "OK" : undefined} badgeColor="green" />
                    <TabBtn id="files" label="Files" active={activeTab} onClick={setActiveTab} badge={fileCount > 0 ? fileCount : undefined} badgeColor="blue" />
                </div>

                {/* Body */}
                <div className="p-6 overflow-y-auto flex-1">
                    {activeTab === "details" && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
                            <div className="grid grid-cols-2 gap-6 bg-neutral-50 p-5 rounded-xl border border-neutral-100">
                                <div>
                                    <label className={LABEL_BASE}>Workspace</label>
                                    <div className="text-sm font-semibold text-neutral-700 flex items-center gap-2 capitalize">
                                        <span className={`w-2.5 h-2.5 rounded-full bg-neutral-400`} />
                                        {task.workspace}
                                    </div>
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
                                    <label className={LABEL_BASE}>Status</label>
                                    <select
                                        className={INPUT_BASE}
                                        value={status?.toLowerCase() || 'inbox'}
                                        onChange={(e) => handleStatusChange(e.target.value)}
                                        disabled={readOnly}
                                    >
                                        <option value="inbox">Inbox</option>
                                        <option value="planned">Planned</option>
                                        <option value="done">Done</option>
                                    </select>
                                </div>
                                <div>
                                    <label className={LABEL_BASE}>Scheduled Date</label>
                                    <input
                                        type="date"
                                        className={`${INPUT_BASE} ${status === 'planned' && !scheduledDate ? 'border-red-300 ring-1 ring-red-200' : ''}`}
                                        value={scheduledDate || ""}
                                        onChange={(e) => {
                                            setScheduledDate(normalizeDate(e.target.value));
                                            triggerSave();
                                        }}
                                        disabled={readOnly}
                                    />
                                    {status === 'planned' && !scheduledDate && <div className="text-[10px] text-red-500 mt-1 font-medium">Required for Planned tasks</div>}
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
                            </div>

                            <div>
                                <label className={LABEL_BASE}>Notes / Description</label>
                                <textarea
                                    className={`${INPUT_BASE} min-h-[120px] font-mono text-sm`}
                                    value={description}
                                    onChange={e => {
                                        setDescription(e.target.value);
                                        triggerSave();
                                    }}
                                    placeholder="Add details..."
                                    readOnly={readOnly}
                                />
                                <div className="text-xs text-neutral-400 mt-2 flex justify-between">
                                    <span>Tip: Use Subtasks tab for checklists</span>
                                    <span>MD Supported</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === "content" && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className={LABEL_BASE}>Project ID</label>
                                    <input
                                        className={INPUT_BASE}
                                        placeholder="e.g. iPhone16"
                                        value={project}
                                        onChange={e => {
                                            setProject(e.target.value);
                                            setTitleRaw(constructTitle(cleanTitle(titleRaw), e.target.value, stage, platforms));
                                            triggerSave();
                                        }}
                                        readOnly={readOnly}
                                    />
                                    <p className="text-xs text-neutral-400 mt-1">Saved as prefix &apos;project:XXX&apos;</p>
                                </div>
                                <div>
                                    <label className={LABEL_BASE}>Stage</label>
                                    <select
                                        className={INPUT_BASE}
                                        value={stage}
                                        onChange={e => {
                                            setStage(e.target.value);
                                            setTitleRaw(constructTitle(cleanTitle(titleRaw), project, e.target.value, platforms));
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
                            </div>

                            <div>
                                <label className={LABEL_BASE}>Platforms</label>
                                <div className="flex gap-4 p-3 border rounded-xl bg-neutral-50">
                                    {KNOWN_PLATFORMS.map(p => {
                                        const isSel = platforms.includes(p);
                                        return (
                                            <label key={p} className="flex items-center gap-2 cursor-pointer select-none">
                                                <input
                                                    type="checkbox"
                                                    checked={isSel}
                                                    onChange={e => {
                                                        const next = e.target.checked
                                                            ? [...platforms, p]
                                                            : platforms.filter(x => x !== p);
                                                        setPlatforms(next);
                                                        setTitleRaw(constructTitle(cleanTitle(titleRaw), project, stage, next));
                                                        triggerSave();
                                                    }}
                                                    className="w-4 h-4 rounded border-gray-300 text-black focus:ring-black"
                                                />
                                                <span className="uppercase font-bold text-sm text-neutral-600">{p}</span>
                                            </label>
                                        )
                                    })}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* REAL SUBTASKS TAB */}
                    {activeTab === "subtasks" && (
                        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
                            <div className="flex justify-between items-center mb-4">
                                <div>
                                    <h3 className="font-bold text-lg text-neutral-800">Child Tasks</h3>
                                    <p className="text-sm text-neutral-500">Tasks that belong to this task</p>
                                </div>
                                <button onClick={handleCreateSubtask} className={BUTTON_PRIMARY}>
                                    + Subtask
                                </button>
                            </div>

                            {loadingSubtasks ? (
                                <div className="text-center py-10 text-neutral-400">Loading subtasks...</div>
                            ) : (
                                <div className="space-y-2">
                                    {realSubtasks.map(s => (
                                        <div
                                            key={s.id}
                                            className="flex items-center gap-3 p-3 bg-white border border-neutral-100 rounded-xl hover:border-black cursor-pointer shadow-sm group transition-all"
                                            onClick={() => {
                                                const qs = new URLSearchParams(window.location.search);
                                                qs.set("taskId", s.id);
                                                router.replace(`?${qs.toString()}`, { scroll: false });
                                            }}
                                        >
                                            <div className="font-medium text-neutral-800 flex-1">{s.title || "Untitled Subtask"}</div>
                                            <div className="text-xs px-2 py-1 rounded bg-neutral-100 text-neutral-600 capitalize">
                                                {s.status}
                                            </div>
                                            <div className="text-neutral-400 text-xl font-bold p-1 rounded hover:bg-neutral-100">&rsaquo;</div>
                                        </div>
                                    ))}
                                    {realSubtasks.length === 0 && (
                                        <div className="text-center py-10 border border-dashed rounded-xl border-neutral-200">
                                            <div className="text-neutral-400 mb-2">No subtasks yet</div>
                                            <button onClick={handleCreateSubtask} className="text-sm border py-1.5 px-3 rounded text-black font-semibold shadow-sm">
                                                Add Subtask
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {/* OLD CHECKLIST TAB */}
                    {activeTab === "checklist" && (
                        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">

                            <div className="flex gap-2">
                                <input
                                    className={INPUT_BASE}
                                    placeholder="Add checklist item..."
                                    onKeyDown={e => {
                                        if (e.key === "Enter") {
                                            handleAddChecklist(e.currentTarget.value);
                                            e.currentTarget.value = "";
                                        }
                                    }}
                                />
                            </div>

                            <div className="space-y-2">
                                {checklistItems.map((s, idx) => (
                                    <div key={s.id} className="flex items-center gap-3 p-3 bg-white border border-neutral-100 rounded-xl hover:border-neutral-200 transition-all group">
                                        <input
                                            type="checkbox"
                                            checked={s.done}
                                            onChange={() => toggleChecklist(idx)}
                                            className="w-5 h-5 rounded-md border-gray-300 text-black focus:ring-black cursor-pointer"
                                        />
                                        <span className={`flex-1 text-sm ${s.done ? "text-gray-400 line-through" : "text-gray-800"}`}>
                                            {s.text}
                                        </span>
                                        <button
                                            onClick={() => removeChecklist(idx)}
                                            className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 px-2"
                                        >
                                            &times;
                                        </button>
                                    </div>
                                ))}
                                {checklistItems.length === 0 && (
                                    <div className="text-center text-neutral-400 py-10">
                                        No checklist items yet. Add one above!
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {activeTab === "doc" && <TaskDocPanel task={task} onUpdate={onUpdate} />}
                    {activeTab === "files" && <AttachmentsPanel kind="task" entityId={task.id} onCountChange={setFileCount} />}
                </div>
            </div>
        </div>
    );
}

function TabBtn({ id, label, active, onClick, badge, badgeColor }: { id: TabKey; label: string; active: TabKey; onClick: (id: TabKey) => void; badge?: number | string; badgeColor?: string }) {
    const isActive = active === id;
    let bColor = "bg-neutral-100 text-neutral-600";
    if (badgeColor === "green") bColor = "bg-green-100 text-green-700";
    if (badgeColor === "blue") bColor = "bg-blue-100 text-blue-700";
    if (active === id && !badgeColor) bColor = "bg-black text-white";

    return (
        <button
            onClick={() => onClick(id)}
            className={`px-4 py-3 text-sm font-medium transition-all border-b-2 flex items-center gap-2 ${isActive ? "border-black text-black" : "border-transparent text-neutral-500 hover:text-neutral-700"}`}
        >
            {label}
            {badge && (
                <span className={`px-1.5 py-0.5 text-[10px] font-bold rounded-md ${bColor}`}>
                    {badge}
                </span>
            )}
        </button>
    )
}
