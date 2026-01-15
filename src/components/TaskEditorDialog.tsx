"use client";

import React, { useState, useEffect } from "react";
import { WORKSPACES_LIST, Workspace } from "@/lib/workspaces";
import { INPUT_BASE, LABEL_BASE, BUTTON_PRIMARY, BUTTON_SECONDARY } from "@/lib/styles";
import { STAGE_TAGS, ContentStage } from "@/lib/content/templates";
import { Task, TaskStatus } from "@/lib/types";
import { postJson } from "@/lib/api"; // Need to ensure postJson is available or copy it
import { createMissingContentDocs } from "@/lib/content/createContentTask";

// Helper for Modal UI
function Modal(props: { open: boolean; title: string; onClose: () => void; children: React.ReactNode }) {
    if (!props.open) return null;
    return (
        <div className="fixed inset-0 z-[60]">
            <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={props.onClose} />
            <div className="absolute left-1/2 top-1/2 w-[92vw] max-w-xl -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-neutral-200/70 bg-white p-6 shadow-xl animate-in fade-in zoom-in-95 duration-200">
                <div className="mb-5 flex items-center justify-between gap-3">
                    <div className="text-lg font-medium text-neutral-900">{props.title}</div>
                    <button className="rounded-lg px-2 py-1 text-sm text-neutral-500 hover:bg-neutral-50 hover:text-black transition-colors" onClick={props.onClose}>
                        Close
                    </button>
                </div>
                {props.children}
            </div>
        </div>
    );
}

interface TaskEditorDialogProps {
    isOpen: boolean;
    onClose: () => void;
    task: Task; // Initial task state (id='new' for create)
    onUpdate: (task?: Task) => void;
}

export default function TaskEditorDialog({ isOpen, onClose, task, onUpdate }: TaskEditorDialogProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Form State
    const [title, setTitle] = useState(task.title || "");
    const [workspace, setWorkspace] = useState<Workspace>((task.workspace as Workspace) || "avacrm");
    const [status, setStatus] = useState<TaskStatus>(task.status === "planned" ? "planned" : "inbox");
    const [scheduledDate, setScheduledDate] = useState(task.scheduled_date || "");
    const [priority, setPriority] = useState(task.priority || 2);
    const [notes, setNotes] = useState(task.notes || "");

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
            setScheduledDate(task.scheduled_date || "");
            setPriority(task.priority || 2);
            setNotes(task.notes || "");

            // Reset Content
            setContentTab("details");
            setContentProject("");
            setContentStage(STAGE_TAGS[0]);
            setContentPlatforms([]);
        }
    }, [isOpen, task]);

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
        } catch (e) {
            console.error(e);
            alert("Failed to create task");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Modal open={isOpen} title="New Task" onClose={onClose}>
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
                    <button type="button" onClick={onClose} className={BUTTON_SECONDARY}>Cancel</button>
                    <button type="submit" disabled={isSubmitting} className={BUTTON_PRIMARY}>{isSubmitting ? 'Saving...' : 'Create Task'}</button>
                </div>
            </form>
        </Modal>
    );
}
