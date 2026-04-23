"use client";

import React, { useState, useEffect } from "react";
import { WORKSPACES_LIST, Workspace } from "@/lib/workspaces";
import { INPUT_BASE, LABEL_BASE, BUTTON_PRIMARY, BUTTON_SECONDARY } from "@/lib/styles";
import { STAGE_TAGS, ContentStage } from "@/lib/content/templates";
import { Task, TaskStatus } from "@/lib/types";
import { List } from "@/lib/lists";
import { postJson } from "@/lib/api"; // Need to ensure postJson is available or copy it
import { createMissingContentDocs } from "@/lib/content/createContentTask";

import { Modal } from "@/components/ui/Modal";

interface TaskEditorDialogProps {
    isOpen: boolean;
    onClose: () => void;
    task: Task; // Initial task state (id='new' for create)
    onUpdate: (task?: Task) => void;
}

export default function TaskEditorDialog({ isOpen, onClose, task, onUpdate }: TaskEditorDialogProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);

    // Form State
    const [title, setTitle] = useState(task.title || "");
    const [workspace, setWorkspace] = useState<Workspace>((task.workspace as Workspace));
    const [status, setStatus] = useState<TaskStatus>(task.status === "planned" ? "planned" : "inbox");
    const [listId, setListId] = useState(task.list_id || "");
    const [scheduledDate, setScheduledDate] = useState(task.scheduled_date || "");
    const [priority, setPriority] = useState(task.priority || 2);
    const [notes, setNotes] = useState(task.notes || "");
    const [parentTaskId, setParentTaskId] = useState(task.parent_task_id || "");

    const [availableLists, setAvailableLists] = useState<List[]>([]);

    // Content Specific
    const [contentTab, setContentTab] = useState<"details" | "content">("details");
    const [contentProject, setContentProject] = useState("");
    const [contentStage, setContentStage] = useState<ContentStage>(STAGE_TAGS[0]);
    const [contentPlatforms, setContentPlatforms] = useState<string[]>([]);

    useEffect(() => {
        if (isOpen) {
            // Reset state when opening
            setTitle(task.title || "");
            setWorkspace((task.workspace as Workspace) || "avacrm");
            setStatus(task.status === "planned" ? "planned" : "inbox");
            setListId(task.list_id || "");
            setScheduledDate(task.scheduled_date || "");
            setPriority(task.priority || 2);
            setNotes(task.notes || "");
            setParentTaskId(task.parent_task_id || "");

            // Reset Content
            setContentTab("details");
            setContentProject("");
            setContentStage(STAGE_TAGS[0]);
            setContentPlatforms([]);
            setError(null);
            setShowDiscardConfirm(false);
        }
    }, [isOpen, task]);

    // Fetch lists when workspace changes
    useEffect(() => {
        if (!isOpen) return;
        let cancelled = false;
        async function run() {
            try {
                const res = await fetch(`/api/lists?workspace=${workspace}`);
                if (!res.ok) return;
                const data = await res.json();
                if (!cancelled) {
                    setAvailableLists(data);

                    // Auto-select list logic
                    if (data.length > 0) {
                        setListId(prev => {
                            // 1. If task opened with a specific list_id and it's in this workspace, use it.
                            if (task.list_id && data.some((l: List) => l.id === task.list_id)) return task.list_id;
                            // 2. If already chose a list and it's in this workspace, keep it.
                            if (prev && data.some((l: List) => l.id === prev)) return prev;
                            // 3. Otherwise default to the first list (no more "Unassigned" default if lists exist)
                            return data[0].id;
                        });
                    } else {
                        setListId("");
                    }
                }
            } catch (e) {
                console.error(e);
            }
        }
        run();
        return () => { cancelled = true; };
    }, [workspace, isOpen]);

    const togglePlatform = (p: string) => {
        if (contentPlatforms.includes(p)) {
            setContentPlatforms(contentPlatforms.filter(x => x !== p));
        } else {
            setContentPlatforms([...contentPlatforms, p]);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            // Logic adapted from DashboardClient
            if (workspace === 'content') {
                // REPLICATE DASHBOARD LOGIC for Content
                let finalTitle = title;
                const parts = [];
                if (contentProject.trim()) parts.push(`project:${contentProject.trim()}`);
                parts.push(finalTitle);
                if (contentStage && contentStage !== STAGE_TAGS[0]) parts.push(`#${contentStage}`);
                contentPlatforms.forEach(p => parts.push(`#${p}`));
                finalTitle = parts.join(" ");

                const res = await fetch("/api/tasks", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        title: finalTitle,
                        workspace,
                        list_id: listId || undefined,
                        parent_task_id: parentTaskId || undefined,
                        status,
                        scheduled_date: scheduledDate || undefined,
                        priority,
                        notes
                    })
                });
                if (!res.ok) throw new Error("Failed to create task");

                // Create associated docs if content task
                try {
                    const data = await res.json();
                    const task = data.task || data; // Handle potential API response shape diffs
                    if (task && task.id) {
                        await createMissingContentDocs(task.id, finalTitle);
                    }
                } catch (err) {
                    console.error("Task created but failed to create docs:", err);
                    // Non-blocking error for user
                }

            } else {
                // Standard Task
                const res = await fetch("/api/tasks", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        title,
                        workspace,
                        list_id: listId || undefined,
                        parent_task_id: parentTaskId || undefined,
                        status,
                        scheduled_date: scheduledDate || undefined, // Send undefined if empty string
                        priority,
                        notes
                    })
                });
                if (!res.ok) throw new Error("Failed to create task");
            }

            onUpdate();
            onClose();
        } catch (e: any) {
            console.error(e);
            setError(e.message || "Failed to create task");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleClose = () => {
        if (showDiscardConfirm) {
            setShowDiscardConfirm(false);
            return;
        }

        const isDirty = title.trim() || notes.trim() || contentProject.trim();
        if (isDirty) {
            setShowDiscardConfirm(true);
        } else {
            onClose();
        }
    };

    return (
        <Modal isOpen={isOpen} title="New Task" onClose={handleClose}>
            <div className="relative">
                {/* Discard Confirmation Overlay */}
                {showDiscardConfirm && (
                    <div className="absolute inset-0 z-[100] bg-white/90 backdrop-blur-sm flex items-center justify-center animate-in fade-in zoom-in-95 duration-200">
                        <div className="max-w-xs text-center space-y-6 p-6">
                            <div className="space-y-2">
                                <h3 className="text-lg font-black text-neutral-900">Discard Task?</h3>
                                <p className="text-sm text-neutral-500 font-medium leading-relaxed">
                                    You have unsaved changes in this draft. Are you sure you want to discard it?
                                </p>
                            </div>
                            <div className="flex flex-col gap-2">
                                <button 
                                    onClick={onClose}
                                    className="w-full py-3 bg-red-600 text-white rounded-xl font-bold text-sm hover:bg-red-700 transition-colors shadow-lg shadow-red-200"
                                >
                                    Discard Draft
                                </button>
                                <button 
                                    onClick={() => setShowDiscardConfirm(false)}
                                    className="w-full py-3 bg-neutral-100 text-neutral-600 rounded-xl font-bold text-sm hover:bg-neutral-200 transition-colors"
                                >
                                    Keep Editing
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {error && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-100 rounded-xl text-red-600 text-xs font-bold flex items-center justify-between">
                        <span>{error}</span>
                        <button onClick={() => setError(null)}>×</button>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                {workspace === 'content' && (
                    <div className="flex border-b border-neutral-100 mb-4">
                        <button type="button" onClick={() => setContentTab("details")} className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${contentTab === 'details' ? 'border-neutral-900 text-neutral-900' : 'border-transparent text-neutral-500 hover:text-neutral-700'}`}>
                            Details
                        </button>
                        <button type="button" onClick={() => setContentTab("content")} className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${contentTab === 'content' ? 'border-purple-600 text-purple-700' : 'border-transparent text-neutral-500 hover:text-neutral-700'}`}>
                            Content Fields
                        </button>
                    </div>
                )}

                <div className={contentTab === 'content' ? 'hidden' : 'space-y-4'}>
                    <div>
                        <label className={LABEL_BASE}>Task Title</label>
                        <input
                            autoFocus
                            type="text"
                            placeholder="What needs to be done?"
                            className={INPUT_BASE}
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className={LABEL_BASE}>Workspace</label>
                            <select
                                className={INPUT_BASE}
                                value={workspace}
                                onChange={e => setWorkspace(e.target.value as Workspace)}
                            >
                                {WORKSPACES_LIST.map(w => (
                                    <option key={w.id} value={w.id}>{w.label}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className={LABEL_BASE}>List</label>
                            <select
                                className={INPUT_BASE}
                                value={listId}
                                onChange={e => setListId(e.target.value)}
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
                                value={status}
                                onChange={e => setStatus(e.target.value as TaskStatus)}
                            >
                                <option value="inbox">Inbox</option>
                                <option value="planned">Planned</option>
                            </select>
                        </div>
                    </div>

                    {status === "planned" && (
                        <div className="animate-in fade-in slide-in-from-top-1">
                            <label className={LABEL_BASE}>Scheduled Date</label>
                            <input
                                type="date"
                                className={INPUT_BASE}
                                value={scheduledDate}
                                onChange={e => setScheduledDate(e.target.value)}
                            />
                        </div>
                    )}

                    <div>
                        <label className={LABEL_BASE}>Priority</label>
                        <select
                            className={INPUT_BASE}
                            value={priority}
                            onChange={e => setPriority(Number(e.target.value))}
                        >
                            <option value={1}>Low</option>
                            <option value={2}>Normal</option>
                            <option value={3}>High</option>
                            <option value={4}>Urgent</option>
                        </select>
                    </div>

                    <div>
                        <label className={LABEL_BASE}>Notes</label>
                        <textarea
                            className={`${INPUT_BASE} min-h-[80px]`}
                            value={notes}
                            onChange={e => setNotes(e.target.value)}
                            placeholder="Add details..."
                        />
                    </div>
                </div>

                {/* Content Tab Content */}
                {workspace === 'content' && (
                    <div className={contentTab === 'content' ? 'space-y-4 animate-in fade-in slide-in-from-right-2' : 'hidden'}>
                        <div>
                            <label className={LABEL_BASE}>Project ID</label>
                            <input
                                type="text"
                                placeholder="e.g. Tech2024"
                                className={INPUT_BASE}
                                value={contentProject}
                                onChange={e => setContentProject(e.target.value)}
                            />
                            <p className="text-[10px] text-neutral-400 mt-1">Will be prefixed as <code>project:ID</code></p>
                        </div>

                        <div>
                            <label className={LABEL_BASE}>Stage</label>
                            <select className={INPUT_BASE} value={contentStage} onChange={e => setContentStage(e.target.value as ContentStage)}>
                                {STAGE_TAGS.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>

                        <div>
                            <label className={LABEL_BASE}>Platforms</label>
                            <div className="flex gap-2 mt-1">
                                {['fb', 'ig', 'yt', 'tk'].map(p => (
                                    <button
                                        key={p}
                                        type="button"
                                        onClick={() => togglePlatform(p)}
                                        className={`px-3 py-1.5 rounded-lg border text-xs font-bold uppercase tracking-wider transition-all ${contentPlatforms.includes(p)
                                            ? 'bg-purple-100 border-purple-200 text-purple-700'
                                            : 'bg-white border-neutral-200 text-neutral-500 hover:border-neutral-300'
                                            }`}
                                    >
                                        {p}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                <div className="flex justify-end gap-2 pt-2 border-t border-neutral-50 mt-4">
                    <button type="button" onClick={handleClose} className={BUTTON_SECONDARY}>Cancel</button>
                    <button type="submit" disabled={isSubmitting} className={BUTTON_PRIMARY}>{isSubmitting ? 'Saving...' : 'Create Task'}</button>
                </div>
            </form>
        </div>
    </Modal>
    );
}
