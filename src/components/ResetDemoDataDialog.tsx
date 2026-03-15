"use client";

import { useState, useEffect } from "react";
import { Modal } from "@/components/ui/Modal";
import { BUTTON_PRIMARY, BUTTON_SECONDARY, BUTTON_DANGER, INPUT_BASE, LABEL_BASE } from "@/lib/styles";
import { AlertTriangle, RefreshCcw, Loader2 } from "lucide-react";

interface ResetStats {
    tasks: number;
    projects: number;
    lists: number;
    docs: number;
    events: number;
}

interface ResetDemoDataDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: (mode: string) => void;
}

export function ResetDemoDataDialog({ isOpen, onClose, onSuccess }: ResetDemoDataDialogProps) {
    const [mode, setMode] = useState<"clear_demo" | "clean_start">("clear_demo");
    const [confirmText, setConfirmText] = useState("");
    const [loading, setLoading] = useState(false);
    const [dryRunStats, setDryRunStats] = useState<ResetStats | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            handleDryRun();
        } else {
            setConfirmText("");
            setDryRunStats(null);
            setError(null);
        }
    }, [isOpen, mode]);

    const handleDryRun = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch("/api/admin/reset-demo-data", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ mode, dry_run: true }),
            });
            const data = await res.json();
            if (data.error) throw new Error(data.error);
            setDryRunStats(data.stats);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleReset = async () => {
        if (confirmText !== "RESET") return;
        setLoading(true);
        setError(null);
        try {
            const res = await fetch("/api/admin/reset-demo-data", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ mode, dry_run: false }),
            });
            const data = await res.json();
            if (data.error) throw new Error(data.error);
            onSuccess(mode);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    const isResetDisabled = confirmText !== "RESET" || loading;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
            <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                <div className="p-6 border-b border-neutral-100 flex items-center justify-between bg-red-50/50">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-red-100 rounded-xl text-red-600">
                            <AlertTriangle className="w-5 h-5" />
                        </div>
                        <h2 className="text-xl font-bold text-neutral-900">Reset Workspace</h2>
                    </div>
                </div>

                <div className="p-6 space-y-6">
                    <div className="flex bg-neutral-100 p-1 rounded-xl">
                        <button
                            onClick={() => setMode("clear_demo")}
                            className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${mode === 'clear_demo' ? 'bg-white shadow-sm text-neutral-900' : 'text-neutral-500 hover:text-neutral-700'}`}
                        >
                            Clear Demo
                        </button>
                        <button
                            onClick={() => setMode("clean_start")}
                            className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${mode === 'clean_start' ? 'bg-white shadow-sm text-red-600' : 'text-neutral-500 hover:text-neutral-700'}`}
                        >
                            Clean Start
                        </button>
                    </div>

                    <div className="p-4 bg-neutral-50 rounded-2xl border border-neutral-100">
                        <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-widest mb-3">Impact Summary</h3>
                        {loading && !dryRunStats ? (
                            <div className="flex items-center justify-center py-4">
                                <Loader2 className="w-5 h-5 animate-spin text-neutral-400" />
                            </div>
                        ) : error ? (
                            <p className="text-sm text-red-600">{error}</p>
                        ) : dryRunStats ? (
                            <div className="grid grid-cols-2 gap-3 text-sm">
                                <div className="flex justify-between p-2 rounded-lg bg-white border border-neutral-100">
                                    <span className="text-neutral-500">Tasks</span>
                                    <span className="font-bold">{dryRunStats.tasks}</span>
                                </div>
                                <div className="flex justify-between p-2 rounded-lg bg-white border border-neutral-100">
                                    <span className="text-neutral-500">Projects</span>
                                    <span className="font-bold">{dryRunStats.projects}</span>
                                </div>
                                <div className="flex justify-between p-2 rounded-lg bg-white border border-neutral-100">
                                    <span className="text-neutral-500">Lists</span>
                                    <span className="font-bold">{dryRunStats.lists}</span>
                                </div>
                                <div className="flex justify-between p-2 rounded-lg bg-white border border-neutral-100">
                                    <span className="text-neutral-500">Docs</span>
                                    <span className="font-bold">{dryRunStats.docs}</span>
                                </div>
                            </div>
                        ) : null}
                    </div>

                    <div className="space-y-3">
                        <p className="text-sm text-neutral-600 leading-relaxed">
                            {mode === "clear_demo" 
                                ? "This will remove all pre-loaded demo content. Your settings and custom data will remain."
                                : "WARNING: This will delete ALL data in the workspace, including custom projects and settings. Local development mode only."
                            }
                        </p>
                        <div className="p-3 bg-red-50 rounded-xl border border-red-100 text-[11px] text-red-700 font-medium">
                            This action cannot be undone.
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className={LABEL_BASE}>Type <span className="text-red-600 font-bold italic">RESET</span> to confirm</label>
                        <input
                            className={`${INPUT_BASE} ${confirmText === "RESET" ? 'border-red-500 focus:ring-red-500/10' : ''}`}
                            value={confirmText}
                            onChange={(e) => setConfirmText(e.target.value.toUpperCase())}
                            placeholder="RESET"
                        />
                    </div>
                </div>

                <div className="p-6 bg-neutral-50 border-t border-neutral-100 flex gap-3">
                    <button onClick={onClose} className="flex-1 py-3 px-4 rounded-xl border border-neutral-200 bg-white text-sm font-bold text-neutral-600 hover:bg-neutral-100 transition-all active:scale-95">
                        Cancel
                    </button>
                    <button 
                        onClick={handleReset} 
                        disabled={isResetDisabled}
                        className={`flex-1 py-3 px-4 rounded-xl flex items-center justify-center gap-2 text-sm font-bold text-white transition-all active:scale-95 ${isResetDisabled ? 'bg-neutral-300 cursor-not-allowed' : 'bg-red-600 hover:bg-red-700 shadow-md'}`}
                    >
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCcw className="w-4 h-4" />}
                        Execute Reset
                    </button>
                </div>
            </div>
        </div>
    );
}
