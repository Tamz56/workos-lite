"use client";

import { useState, useEffect } from "react";
import { Modal } from "./ui/Modal";
import { AlertTriangle, Loader2, Trash2 } from "lucide-react";
import { BUTTON_PRIMARY, BUTTON_SECONDARY, INPUT_BASE } from "@/lib/styles";

interface DeleteProjectDialogProps {
    isOpen: boolean;
    onClose: () => void;
    projectSlug: string | null;
    projectName: string | null;
    onSuccess: () => void;
}

interface DryRunResult {
    slug: string;
    name: string;
    is_seed: boolean;
    impact: {
        tasks: number;
        lists: number;
        docs: number;
    };
}

export function DeleteProjectDialog({ isOpen, onClose, projectSlug, projectName, onSuccess }: DeleteProjectDialogProps) {
    const [summary, setSummary] = useState<DryRunResult | null>(null);
    const [loading, setLoading] = useState(false);
    const [confirmName, setConfirmName] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [deleting, setDeleting] = useState(false);

    useEffect(() => {
        if (isOpen && projectSlug) {
            fetchSummary();
        } else {
            setSummary(null);
            setConfirmName("");
            setError(null);
        }
    }, [isOpen, projectSlug]);

    const fetchSummary = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`/api/projects/${projectSlug}/dry-run`);
            if (!res.ok) throw new Error("Failed to fetch project summary");
            const data = await res.json();
            setSummary(data);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!projectSlug || !summary) return;
        if (confirmName !== summary.name) {
            setError("Project name mismatch. Please type the exact name to confirm.");
            return;
        }

        setDeleting(true);
        setError(null);
        try {
            const res = await fetch(`/api/projects/${projectSlug}/execute`, { method: "DELETE" });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || "Failed to delete project");
            }
            onSuccess();
            onClose();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setDeleting(false);
        }
    };

    const isMatch = summary && confirmName === summary.name;

    return (
        <Modal isOpen={isOpen} title="Delete Project" onClose={onClose}>
            <div className="space-y-6">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-10 gap-3 text-neutral-400">
                        <Loader2 className="w-8 h-8 animate-spin" />
                        <span className="text-sm font-medium">Calculating impact...</span>
                    </div>
                ) : error ? (
                    <div className="p-4 rounded-xl bg-red-50 border border-red-100 text-red-700 text-sm flex items-start gap-3">
                        <AlertTriangle className="w-5 h-5 shrink-0" />
                        <div>{error}</div>
                    </div>
                ) : summary ? (
                    <>
                        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-100 space-y-3">
                            <div className="flex items-center gap-2 text-amber-800">
                                <AlertTriangle className="w-5 h-5" />
                                <span className="font-bold">Caution: High Impact Action</span>
                            </div>
                            <p className="text-sm text-amber-700 leading-relaxed">
                                You are about to delete <span className="font-bold text-amber-900">&quot;{summary.name}&quot;</span>. 
                                This operation cannot be undone. The following items will be permanently removed:
                            </p>
                            <div className="grid grid-cols-2 gap-3 pt-2">
                                <div className="bg-white/60 p-3 rounded-xl border border-amber-200/50">
                                    <div className="text-sm font-bold text-amber-900">{summary.impact.tasks}</div>
                                    <div className="text-[10px] uppercase font-bold text-amber-600 tracking-wider">Tasks & Subtasks</div>
                                </div>
                                <div className="bg-white/60 p-3 rounded-xl border border-amber-200/50">
                                    <div className="text-sm font-bold text-amber-900">{summary.impact.lists}</div>
                                    <div className="text-[10px] uppercase font-bold text-amber-600 tracking-wider">Task Lists</div>
                                </div>
                            </div>
                        </div>

                        {summary.is_seed ? (
                            <div className="p-4 rounded-xl bg-neutral-100 text-neutral-500 text-sm italic py-8 text-center border-dashed border-2 border-neutral-200">
                                This is a system-protected project and cannot be deleted from the UI.
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div className="space-y-1.5">
                                    <label className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider">
                                        Type <span className="text-neutral-900">&quot;{summary.name}&quot;</span> to confirm
                                    </label>
                                    <input
                                        className={INPUT_BASE}
                                        placeholder="Project name"
                                        value={confirmName}
                                        onChange={(e) => setConfirmName(e.target.value)}
                                        autoFocus
                                    />
                                </div>

                                <div className="flex justify-end gap-3 pt-4 border-t border-neutral-100">
                                    <button onClick={onClose} className={BUTTON_SECONDARY}>Cancel</button>
                                    <button 
                                        disabled={!isMatch || deleting}
                                        onClick={handleDelete}
                                        className={`${BUTTON_PRIMARY} bg-red-600 hover:bg-red-700 disabled:opacity-30 flex items-center gap-2`}
                                    >
                                        {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                        Permanently Delete Project
                                    </button>
                                </div>
                            </div>
                        )}
                    </>
                ) : null}
            </div>
        </Modal>
    );
}
