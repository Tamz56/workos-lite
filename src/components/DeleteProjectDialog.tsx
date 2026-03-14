"use client";

import { useState, useEffect } from "react";
import { Modal } from "@/components/ui/Modal";
import { AlertTriangle, Loader2 } from "lucide-react";
import { BUTTON_PRIMARY, BUTTON_SECONDARY, INPUT_BASE } from "@/lib/styles";

interface DeleteProjectDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    projectSlug: string;
    projectName: string;
}

interface DryRunResult {
    project: number;
    lists: number;
    tasks: number;
    docs: number;
    is_seed: boolean;
    error?: string;
}

export function DeleteProjectDialog({ isOpen, onClose, onSuccess, projectSlug, projectName }: DeleteProjectDialogProps) {
    const [dryRun, setDryRun] = useState<DryRunResult | null>(null);
    const [confirmName, setConfirmName] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen && projectSlug) {
            setDryRun(null);
            setConfirmName("");
            setError(null);
            fetchDryRun();
        }
    }, [isOpen, projectSlug]);

    const fetchDryRun = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/projects/${projectSlug}/dry-run`);
            const data = await res.json();
            if (res.ok) {
                setDryRun(data);
            } else {
                setError(data.error || "Failed to load impact summary");
            }
        } catch (e) {
            setError("Connection error");
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if (confirmName !== projectName) return;
        
        setLoading(true);
        try {
            const res = await fetch(`/api/projects/${projectSlug}`, { method: "DELETE" });
            const data = await res.json();
            if (res.ok) {
                onSuccess();
                onClose();
            } else {
                setError(data.error || "Failed to delete project");
            }
        } catch (e) {
            setError("Connection error during deletion");
        } finally {
            setLoading(false);
        }
    };

    const isMatch = confirmName === projectName;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Delete Project">
            <div className="space-y-6">
                <div className="flex items-start gap-4 p-4 bg-red-50 rounded-2xl border border-red-100">
                    <AlertTriangle className="w-6 h-6 text-red-600 shrink-0 mt-0.5" />
                    <div>
                        <h4 className="text-sm font-bold text-red-900">High Risk Action</h4>
                        <p className="text-xs text-red-700 mt-1 leading-relaxed">
                            Deleting this project will permanently remove all associated lists and tasks. This action cannot be undone.
                        </p>
                    </div>
                </div>

                {loading && !dryRun ? (
                    <div className="flex justify-center py-8">
                        <Loader2 className="w-8 h-8 animate-spin text-neutral-400" />
                    </div>
                ) : error ? (
                    <div className="text-sm text-red-600 bg-red-50 p-3 rounded-xl border border-red-100">{error}</div>
                ) : dryRun && (
                    <div className="bg-neutral-50 rounded-2xl p-5 border border-neutral-100">
                        <h5 className="text-xs font-bold text-neutral-400 uppercase tracking-widest mb-4">Impact Summary</h5>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="flex flex-col">
                                <span className="text-2xl font-bold text-neutral-900">{dryRun.project}</span>
                                <span className="text-[10px] font-bold text-neutral-400 uppercase">Project</span>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-2xl font-bold text-neutral-900">{dryRun.lists}</span>
                                <span className="text-[10px] font-bold text-neutral-400 uppercase">Lists</span>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-2xl font-bold text-neutral-900">{dryRun.tasks}</span>
                                <span className="text-[10px] font-bold text-neutral-400 uppercase">Tasks</span>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-2xl font-bold text-neutral-900">{dryRun.docs}</span>
                                <span className="text-[10px] font-bold text-neutral-400 uppercase">Linked Docs</span>
                            </div>
                        </div>
                    </div>
                )}

                <div className="space-y-3">
                    <label className="text-sm font-bold text-neutral-700">
                        Type the project name <span className="text-black underline">"{projectName}"</span> to confirm:
                    </label>
                    <input
                        type="text"
                        value={confirmName}
                        onChange={(e) => setConfirmName(e.target.value)}
                        placeholder="Project name..."
                        className={INPUT_BASE}
                        disabled={loading || dryRun?.is_seed}
                    />
                </div>

                <div className="flex gap-3">
                    <button 
                        onClick={onClose} 
                        className={`${BUTTON_SECONDARY} flex-1`}
                        disabled={loading}
                    >
                        Cancel
                    </button>
                    <button 
                        onClick={handleDelete}
                        disabled={!isMatch || loading || dryRun?.is_seed}
                        className={`flex-1 px-6 py-3 rounded-2xl font-bold text-sm transition-all shadow-sm active:scale-95 ${
                            isMatch && !loading && !dryRun?.is_seed
                                ? "bg-red-600 text-white hover:bg-red-700"
                                : "bg-neutral-100 text-neutral-400 cursor-not-allowed"
                        }`}
                    >
                        {loading && confirmName === projectName ? (
                            <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                        ) : (
                            "Permanently Delete"
                        )}
                    </button>
                </div>
                
                {dryRun?.is_seed && (
                    <p className="text-[10px] text-center text-neutral-400 italic">
                        Seed/Demo projects cannot be deleted from individual UI actions.
                    </p>
                )}
            </div>
        </Modal>
    );
}
