"use client";

import { useEffect, useState } from "react";
import type { Task } from "../lib/types";
import { patchTask, listAttachments } from "../lib/api";
import TaskDocPanel from "./TaskDocPanel";
import TaskAttachmentsPanel from "./TaskAttachmentsPanel";

type TabKey = "details" | "doc" | "files";

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

    // KEY REMOUNT PATTERN:
    // By using key={task.id}, we force React to unmount the old Inner component
    // and mount a new one when the task changes.
    // This allows us to init state from props cleanly (useState(task.title))
    // without needing useEffect synchronization or setFileCount(0) resets.
    return (
        <TaskDetailDialogInner key={task.id} {...props} task={task} />
    );
}

function TaskDetailDialogInner({
    task,
    onClose,
    onUpdate,
    initialTab,
    readOnly,
}: TaskDetailDialogProps & { task: Task }) {
    const [activeTab, setActiveTab] = useState<TabKey>(initialTab || "details");
    const [fileCount, setFileCount] = useState(0);

    // Initial state from props is safe because of key remounting
    const [titleDraft, setTitleDraft] = useState(task.title || "");

    // Fetch attachment count on mount only (equivalent to "on change" because of key remount)
    useEffect(() => {
        let cancelled = false;
        listAttachments(task.id)
            .then((files) => {
                if (!cancelled) {
                    setFileCount(Array.isArray(files) ? files.length : 0);
                }
            })
            .catch(() => {
                if (!cancelled) setFileCount(0);
            });

        return () => {
            cancelled = true;
        };
    }, [task.id]);

    // ESC to close
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [onClose]);

    async function handleTitleBlur() {
        if (!task || readOnly) return;

        const next = titleDraft.trim();
        const current = (task.title || "").trim();

        if (!next || next === current) {
            setTitleDraft(task.title || "");
            return;
        }

        try {
            const updated = await patchTask(task.id, { title: next });
            onUpdate(updated);
            setTitleDraft(updated?.title ?? next);
        } catch (e) {
            console.error("Failed to update title", e);
            setTitleDraft(task.title || "");
        }
    }

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            onClick={onClose}
            role="dialog"
            aria-modal="true"
        >
            <div
                className="w-full max-w-4xl bg-white rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b">
                    <input
                        value={titleDraft}
                        onChange={(e) => setTitleDraft(e.target.value)}
                        onBlur={handleTitleBlur}
                        readOnly={readOnly}
                        className={`text-xl font-bold w-full mr-4 border-b border-transparent focus:outline-none ${readOnly
                            ? "bg-transparent cursor-default"
                            : "hover:border-gray-300 focus:border-blue-500"
                            }`}
                    />
                    <button
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            onClose();
                        }}
                        className="text-gray-500 hover:text-gray-700 text-2xl leading-none"
                        aria-label="Close"
                        title="Close"
                    >
                        &times;
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b bg-gray-50">
                    <button
                        onClick={() => setActiveTab("details")}
                        className={`px-6 py-3 text-sm font-medium ${activeTab === "details"
                            ? "bg-white border-t-2 border-blue-600 text-blue-600"
                            : "text-gray-600 hover:bg-gray-100"
                            }`}
                    >
                        Details
                    </button>

                    <button
                        onClick={() => setActiveTab("doc")}
                        className={`px-6 py-3 text-sm font-medium transition-all flex items-center gap-2 ${activeTab === "doc"
                            ? "bg-white border-t-2 border-blue-600 text-blue-600"
                            : "text-gray-600 hover:bg-gray-100"
                            }`}
                    >
                        <span>Doc</span>
                        {task.doc_id && (
                            <span className="px-1.5 py-0.5 bg-green-100 text-green-700 text-[10px] font-bold rounded-md animate-pulse">
                                OK
                            </span>
                        )}
                    </button>

                    <button
                        onClick={() => setActiveTab("files")}
                        className={`px-6 py-3 text-sm font-medium transition-all flex items-center gap-2 ${activeTab === "files"
                            ? "bg-white border-t-2 border-blue-600 text-blue-600"
                            : "text-gray-600 hover:bg-gray-100"
                            }`}
                    >
                        <span>Files</span>
                        {fileCount > 0 && (
                            <span className="px-2 py-0.5 bg-blue-600 text-white text-[10px] font-bold rounded-full shadow-sm">
                                {fileCount}
                            </span>
                        )}
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto flex-1">
                    {activeTab === "details" && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
                            <div className="grid grid-cols-2 gap-6 bg-gray-50 p-5 rounded-xl border border-gray-100">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                        Workspace
                                    </label>
                                    <div className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                                        <span className="w-2 h-2 rounded-full bg-blue-400" />
                                        {task.workspace}
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                        Status
                                    </label>
                                    <div className="inline-flex items-center px-2 py-0.5 bg-white border border-gray-200 rounded-md text-xs font-medium text-gray-600">
                                        {task.status}
                                    </div>
                                </div>
                                <div className="col-span-2 space-y-1 border-t pt-4">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                        Scheduled For
                                    </label>
                                    <div className="text-sm text-gray-600 flex items-center gap-2">
                                        <span className="text-lg">📅</span>
                                        {task.scheduled_date
                                            ? `${task.scheduled_date} • ${task.schedule_bucket}`
                                            : "No schedule set"}
                                    </div>
                                </div>
                            </div>

                            {!readOnly && (
                                <div className="p-4 bg-blue-50 rounded text-sm text-blue-800">
                                    Tip: Manage status and schedule via Planner/Inbox views. This dialog focuses on content.
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === "doc" && <TaskDocPanel task={task} onUpdate={onUpdate} />}

                    {activeTab === "files" && (
                        <TaskAttachmentsPanel taskId={task.id} onCountChange={setFileCount} />
                    )}
                </div>
            </div>
        </div>
    );
}
