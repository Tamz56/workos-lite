"use client";

import { Fragment, useState, useEffect, useMemo } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { XMarkIcon, ExclamationTriangleIcon } from "@heroicons/react/24/outline";
import { WORKSPACES, Workspace, workspaceLabel } from "@/lib/workspaces";
import { parseBulkTasks, ParsedTask } from "@/lib/bulkParser";

interface BulkTaskDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void; // Refresh dashboard
}

export default function BulkTaskDialog({ isOpen, onClose, onSuccess }: BulkTaskDialogProps) {
    const [rawText, setRawText] = useState("");
    const [defaultWorkspace, setDefaultWorkspace] = useState<Workspace>("other");
    type DefaultSchedule = "none" | "today" | "tomorrow" | "upcoming";
    const [defaultSchedule, setDefaultSchedule] = useState<DefaultSchedule>("none");
    const [createContentDocs, setCreateContentDocs] = useState(false);

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Live Parse
    const parsedTasks = useMemo(() => {
        return parseBulkTasks(rawText, {
            defaultWorkspace,
            defaultSchedule
        });
    }, [rawText, defaultWorkspace, defaultSchedule]);

    const hasValidationErrors = parsedTasks.some(t => !t.isValid || t.validationError);
    const hasContentTasks = parsedTasks.some(t => t.workspace === 'content');

    const handleCreate = async () => {
        if (hasValidationErrors) return;
        setIsSubmitting(true);
        setError(null);

        try {
            const res = await fetch("/api/tasks/batch", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    tasks: parsedTasks,
                    options: { createContentDocs }
                }),
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || "Failed to create tasks");
            }

            setRawText(""); // Reset
            onSuccess();
            onClose();
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : String(err);
            setError(msg);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Transition appear show={isOpen} as={Fragment}>
            <Dialog as="div" className="relative z-50" onClose={onClose}>
                <Transition.Child
                    as={Fragment}
                    enter="ease-out duration-300"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in duration-200"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <div className="fixed inset-0 bg-black/25 backdrop-blur-sm" />
                </Transition.Child>

                <div className="fixed inset-0 overflow-y-auto">
                    <div className="flex min-h-full items-center justify-center p-4">
                        <Transition.Child
                            as={Fragment}
                            enter="ease-out duration-300"
                            enterFrom="opacity-0 scale-95"
                            enterTo="opacity-100 scale-100"
                            leave="ease-in duration-200"
                            leaveFrom="opacity-100 scale-100"
                            leaveTo="opacity-0 scale-95"
                        >
                            <Dialog.Panel className="w-full max-w-4xl transform overflow-hidden rounded-2xl bg-white shadow-xl transition-all flex flex-col max-h-[90vh]">

                                {/* Header */}
                                <div className="flex items-center justify-between border-b border-neutral-100 px-6 py-4">
                                    <Dialog.Title as="h3" className="text-lg font-bold text-neutral-900">
                                        Bulk Paste Tasks ⚡
                                    </Dialog.Title>
                                    <button onClick={onClose} className="text-neutral-400 hover:text-neutral-500">
                                        <XMarkIcon className="h-6 w-6" />
                                    </button>
                                </div>

                                {/* Body */}
                                <div className="flex-1 overflow-auto p-6 space-y-6">

                                    {/* Controls */}
                                    <div className="flex flex-wrap gap-4 items-center bg-neutral-50 p-4 rounded-xl border border-neutral-100">
                                        <div className="flex flex-col gap-1">
                                            <label className="text-xs font-semibold text-neutral-500 uppercase">Default Workspace</label>
                                            <select
                                                className="text-sm border-neutral-300 rounded-md py-1"
                                                value={defaultWorkspace}
                                                onChange={(e) => setDefaultWorkspace(e.target.value as Workspace)}
                                            >
                                                {WORKSPACES.map(w => (
                                                    <option key={w} value={w}>{workspaceLabel(w)}</option>
                                                ))}
                                            </select>
                                        </div>

                                        <div className="flex flex-col gap-1">
                                            <label className="text-xs font-semibold text-neutral-500 uppercase">Default Schedule</label>
                                            <select
                                                className="text-sm border-neutral-300 rounded-md py-1"
                                                value={defaultSchedule}
                                                onChange={(e) => setDefaultSchedule(e.target.value as DefaultSchedule)}
                                            >
                                                <option value="none">None (Inbox)</option>
                                                <option value="today">Today</option>
                                            </select>
                                        </div>

                                        {hasContentTasks && (
                                            <div className="flex flex-col gap-1 ml-auto">
                                                <label className="text-xs font-semibold text-neutral-500 uppercase">Content Options</label>
                                                <label className="flex items-center gap-2 cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        checked={createContentDocs}
                                                        onChange={(e) => setCreateContentDocs(e.target.checked)}
                                                        className="rounded text-neutral-900 focus:ring-neutral-900"
                                                    />
                                                    <span className="text-sm font-medium text-purple-700">Auto-create 3 Docs 📄</span>
                                                </label>
                                            </div>
                                        )}
                                    </div>

                                    {/* Text Input */}
                                    <div>
                                        <textarea
                                            value={rawText}
                                            onChange={(e) => setRawText(e.target.value)}
                                            placeholder={`[crm] Call Client X | today | due:2026-01-20\n[ops] Check stock | #urgent\nType your tasks here...`}
                                            className="w-full h-40 p-4 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-neutral-900 focus:border-neutral-900 font-mono text-sm leading-relaxed"
                                        />
                                        <div className="mt-2 text-xs text-neutral-400">
                                            Tips: Use <code>|</code> to separate modifiers like <code>today</code>, <code>due:YYYY-MM-DD</code>, <code>project:xxx</code>.
                                        </div>
                                    </div>

                                    {/* Preview Table */}
                                    {parsedTasks.length > 0 && (
                                        <div className="border border-neutral-200 rounded-xl overflow-hidden">
                                            <table className="w-full text-sm text-left">
                                                <thead className="bg-neutral-50 text-neutral-500 font-semibold uppercase text-xs border-b border-neutral-200">
                                                    <tr>
                                                        <th className="px-4 py-2 w-24">Workspace</th>
                                                        <th className="px-4 py-2">Title</th>
                                                        <th className="px-4 py-2 w-32">Date</th>
                                                        <th className="px-4 py-2">Metadata/Tags</th>
                                                        <th className="px-4 py-2 w-10"></th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-neutral-100">
                                                    {parsedTasks.map((task, idx) => (
                                                        <tr key={idx} className={task.validationError ? "bg-red-50" : "hover:bg-neutral-50"}>
                                                            <td className="px-4 py-2 font-medium text-neutral-600">
                                                                <span className={`inline-block px-2 py-0.5 rounded text-[10px] uppercase tracking-wide border ${task.workspace === 'content' ? 'bg-purple-50 text-purple-700 border-purple-100' :
                                                                    task.workspace === 'avacrm' ? 'bg-blue-50 text-blue-700 border-blue-100' :
                                                                        'bg-neutral-100 text-neutral-600 border-neutral-200'
                                                                    }`}>
                                                                    {task.workspace}
                                                                </span>
                                                            </td>
                                                            <td className="px-4 py-2 font-medium text-neutral-900">{task.title}</td>
                                                            <td className="px-4 py-2 text-neutral-500 font-mono text-xs">
                                                                {task.scheduled_date || "-"}
                                                            </td>
                                                            <td className="px-4 py-2">
                                                                <div className="flex flex-wrap gap-1">
                                                                    {task.meta.project && <span className="px-1.5 py-0.5 rounded bg-orange-50 text-orange-700 text-[10px] border border-orange-100">Prj: {task.meta.project}</span>}
                                                                    {task.meta.stage && <span className="px-1.5 py-0.5 rounded bg-teal-50 text-teal-700 text-[10px] border border-teal-100">Stg: {task.meta.stage}</span>}
                                                                    {task.meta.tags.map(t => (
                                                                        <span key={t} className="px-1.5 py-0.5 rounded bg-neutral-100 text-neutral-600 text-[10px]">#{t.replace('#', '')}</span>
                                                                    ))}
                                                                </div>
                                                            </td>
                                                            <td className="px-4 py-2 text-center">
                                                                {task.validationError && (
                                                                    <div className="group relative">
                                                                        <ExclamationTriangleIcon className="w-5 h-5 text-red-500" />
                                                                        <div className="absolute right-0 top-full mt-1 w-48 bg-red-600 text-white text-[10px] p-2 rounded shadow-lg z-10 hidden group-hover:block">
                                                                            {task.validationError}
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}

                                    {error && (
                                        <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm border border-red-100 flex items-center gap-2">
                                            <ExclamationTriangleIcon className="w-4 h-4" />
                                            {error}
                                        </div>
                                    )}

                                </div>

                                {/* Footer */}
                                <div className="bg-neutral-50 px-6 py-4 flex items-center justify-between border-t border-neutral-100">
                                    <div className="text-xs text-neutral-500">
                                        Parsed <span className="font-bold text-neutral-900">{parsedTasks.length}</span> tasks.
                                    </div>
                                    <div className="flex gap-3">
                                        <button
                                            onClick={onClose}
                                            disabled={isSubmitting}
                                            className="px-4 py-2 text-sm font-medium text-neutral-600 hover:text-neutral-900"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={handleCreate}
                                            disabled={parsedTasks.length === 0 || hasValidationErrors || isSubmitting}
                                            className="px-6 py-2 bg-neutral-900 text-white rounded-lg text-sm font-bold hover:bg-black disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
                                        >
                                            {isSubmitting ? "Creating..." : `Create ${parsedTasks.length} Tasks`}
                                        </button>
                                    </div>
                                </div>

                            </Dialog.Panel>
                        </Transition.Child>
                    </div>
                </div>
            </Dialog>
        </Transition>
    );
}
