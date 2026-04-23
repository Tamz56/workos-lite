import React, { useState, useRef, useEffect } from "react";
import { Task } from "@/lib/types";
import { X, CornerDownLeft } from "lucide-react";

interface QuickAddTaskProps {
    workspaceId: string;
    initialStatus?: string;
    initialListId?: string | null;
    initialPackageId?: string | null;
    initialTopicId?: string | null;
    initialTopicTitle?: string | null;
    initialParentTaskId?: string | null;
    initialStepKey?: string | null;
    launchSource?: string;
    placeholder?: string;
    onCreated: (task: Task) => void;
    onCancel?: () => void;
}

export default function QuickAddTask({ 
    workspaceId, 
    initialStatus = "planned",
    initialListId,
    initialPackageId,
    initialTopicId,
    initialTopicTitle,
    initialParentTaskId,
    initialStepKey,
    launchSource,
    placeholder = "What needs to be done?", 
    onCreated, 
    onCancel 
}: QuickAddTaskProps) {
    const [title, setTitle] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        // Auto-focus when mounted
        if (inputRef.current) {
            inputRef.current.focus();
        }
    }, [initialTopicId, initialPackageId]); 

    const handleSubmit = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        const t = title.trim();
        if (!t || submitting) return;

        setSubmitting(true);
        try {
            const res = await fetch("/api/tasks", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    title: t,
                    workspace: workspaceId,
                    status: initialStatus,
                    list_id: initialListId || undefined,
                    topic_id: initialTopicId || undefined,
                    topic_title: initialTopicTitle || undefined,
                    parent_task_id: initialParentTaskId || undefined,
                    package_id: initialPackageId || undefined,
                    step_key: initialStepKey || undefined,
                })
            });

            if (res.ok) {
                const data = await res.json();
                onCreated(data.task);
                setTitle(""); // Reset for next quick-add
                
                // RC39: Remember last used list if created in table/list mode
                if (initialListId) {
                    const { setLastUsedList, recordCreationSignal } = await import("../../../lib/workspaceMemory/smartMemory");
                    setLastUsedList(workspaceId, initialListId);
                    
                    // RC40B: Record signal for learning
                    recordCreationSignal(workspaceId, launchSource || 'global', { 
                        listId: initialListId, 
                        status: initialStatus 
                    });
                } else {
                    const { recordCreationSignal } = await import("../../../lib/workspaceMemory/smartMemory");
                    recordCreationSignal(workspaceId, launchSource || 'global', { 
                        status: initialStatus 
                    });
                }
            } else {
                console.error("Failed to quick add task");
            }
        } catch (err) {
            console.error(err);
        } finally {
            setSubmitting(false);
            // Re-focus after submit to allow rapid entry
            if (inputRef.current) inputRef.current.focus();
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Escape" && onCancel) {
            e.preventDefault();
            e.stopPropagation();
            onCancel();
        }
    };

    return (
        <div className="group relative flex items-center bg-white border border-neutral-200 rounded-lg shadow-sm hover:shadow-md transition-all duration-200 focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500 mx-4 my-1">
            <form onSubmit={handleSubmit} className="flex-1 flex items-center px-3 py-2 gap-3 min-w-0">
                <div className={`w-2 h-2 shrink-0 rounded-full ${initialTopicId ? 'bg-indigo-500' : 'bg-blue-500'}`} />
                <input
                    ref={inputRef}
                    type="text"
                    className="flex-1 bg-transparent border-none focus:ring-0 text-sm font-medium placeholder:text-neutral-400 placeholder:font-normal min-w-0"
                    placeholder={placeholder}
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    onKeyDown={handleKeyDown}
                    disabled={submitting}
                />
                
                <div className="flex items-center gap-2 shrink-0">
                    {title.trim() && !submitting && (
                        <div className="flex items-center gap-1.5 px-1.5 py-1 rounded bg-neutral-100 text-neutral-400 animate-in fade-in zoom-in duration-200">
                             <span className="text-[10px] font-black uppercase tracking-tighter">Enter</span>
                             <CornerDownLeft size={10} />
                        </div>
                    )}
                    
                    {onCancel && (
                        <button
                            type="button"
                            onClick={onCancel}
                            className="p-1 rounded-md text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600 transition-colors"
                            title="Cancel (Esc)"
                        >
                            <X size={14} />
                        </button>
                    )}
                </div>
            </form>
        </div>
    );
}
