"use client";

import { useRef, useState, useCallback } from "react";
import { validateBackup, restoreBackup, formatFileSize, type RestoreRes } from "@/lib/api/backup";
import type { ValidateRes } from "@/lib/backup/types";

// ============================================================
// Types
// ============================================================

type UIState = "idle" | "validating" | "valid" | "invalid" | "restoring" | "done";

// ============================================================
// Badge Components
// ============================================================

function Badge({ children, variant = "default" }: { children: React.ReactNode; variant?: "default" | "warning" | "error" | "success" }) {
    const colors = {
        default: "bg-neutral-100 text-neutral-700",
        warning: "bg-amber-100 text-amber-800",
        error: "bg-red-100 text-red-700",
        success: "bg-emerald-100 text-emerald-700",
    };
    return (
        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${colors[variant]}`}>
            {children}
        </span>
    );
}

function FormatBadge({ kind, format }: { kind: ValidateRes["kind"]; format: ValidateRes["format"] }) {
    if (!kind || !format) return null;

    const label = kind === "zip"
        ? `ZIP / ${format}`
        : `JSON / ${format}`;

    return (
        <div className="flex flex-wrap gap-1.5">
            <Badge>{label}</Badge>
            {kind === "metadata" && (
                <Badge variant="warning">No attachments</Badge>
            )}
        </div>
    );
}

// ============================================================
// Summary Display
// ============================================================

function SummaryCard({ summary, label }: { summary: { tasks: number; events: number; docs: number; attachments: number }; label?: string }) {
    const items = [
        { label: "Tasks", value: summary.tasks },
        { label: "Events", value: summary.events },
        { label: "Docs", value: summary.docs },
        { label: "Attachments", value: summary.attachments },
    ];

    return (
        <div>
            {label && <div className="mb-2 text-xs font-semibold text-neutral-500 uppercase">{label}</div>}
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {items.map((item) => (
                    <div key={item.label} className="rounded-xl border bg-white p-3 text-center">
                        <div className="text-2xl font-semibold">{item.value}</div>
                        <div className="text-xs text-neutral-500">{item.label}</div>
                    </div>
                ))}
            </div>
        </div>
    );
}

// ============================================================
// Warnings/Errors Display
// ============================================================

function MessageList({ items, variant }: { items: string[]; variant: "warning" | "error" }) {
    if (items.length === 0) return null;

    const styles = {
        warning: "border-amber-200 bg-amber-50 text-amber-800",
        error: "border-red-200 bg-red-50 text-red-700",
    };

    return (
        <div className={`rounded-xl border p-3 ${styles[variant]}`}>
            <div className="mb-1 text-xs font-semibold uppercase">
                {variant === "warning" ? "Warnings" : "Errors"}
            </div>
            <ul className="space-y-1 text-sm">
                {items.map((msg, i) => (
                    <li key={i}>• {msg}</li>
                ))}
            </ul>
        </div>
    );
}

// ============================================================
// Main Component
// ============================================================

export default function BackupRestorePanel() {
    const inputRef = useRef<HTMLInputElement>(null);
    const abortRef = useRef<AbortController | null>(null);

    const [state, setState] = useState<UIState>("idle");
    const [file, setFile] = useState<File | null>(null);
    const [validateResult, setValidateResult] = useState<ValidateRes | null>(null);
    const [restoreResult, setRestoreResult] = useState<RestoreRes | null>(null);
    const [confirmed, setConfirmed] = useState(false);

    // Reset all state
    const reset = useCallback(() => {
        setState("idle");
        setFile(null);
        setValidateResult(null);
        setRestoreResult(null);
        setConfirmed(false);
    }, []);

    // Handle file selection
    const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];

        // Clear input value so same file can be re-selected
        e.target.value = "";

        if (!selectedFile) {
            reset();
            return;
        }

        // Abort any in-flight request
        if (abortRef.current) {
            abortRef.current.abort();
        }
        abortRef.current = new AbortController();

        // Reset state and start validating
        setFile(selectedFile);
        setValidateResult(null);
        setRestoreResult(null);
        setConfirmed(false);
        setState("validating");

        try {
            const res = await validateBackup(selectedFile, abortRef.current.signal);
            setValidateResult(res);
            setState(res.ok ? "valid" : "invalid");
        } catch (err) {
            if (err instanceof Error && err.name === "AbortError") return;
            setValidateResult({
                ok: false,
                kind: null,
                format: null,
                summary: null,
                warnings: [],
                errors: [err instanceof Error ? err.message : "Validation failed"],
            });
            setState("invalid");
        }
    }, [reset]);

    // Restore handler
    const handleRestore = useCallback(async () => {
        // Guards
        if (state !== "valid") return;
        if (!validateResult?.ok) return;
        if (!confirmed) return;
        if (validateResult.kind === "metadata") return;
        if (!file) return;

        setState("restoring");

        try {
            const res = await restoreBackup(file);
            setRestoreResult(res);
            setState("done");
        } catch (err) {
            setRestoreResult({
                ok: false,
                mode: "replace",
                kind: null,
                format: null,
                stage: null,
                restored: null,
                warnings: [],
                errors: [err instanceof Error ? err.message : "Restore failed"],
            });
            setState("done");
        }
    }, [state, validateResult, confirmed, file]);

    // Can restore?
    const canRestore =
        state === "valid" &&
        validateResult?.ok === true &&
        confirmed &&
        validateResult.kind !== "metadata";

    // Is panel disabled?
    const isDisabled = state === "restoring" || state === "done";

    return (
        <div className="space-y-4">
            {/* File Input (hidden) */}
            <input
                ref={inputRef}
                type="file"
                accept=".json,.zip"
                className="hidden"
                onChange={handleFileChange}
                disabled={isDisabled}
            />

            {/* Dropzone */}
            {state !== "done" && (
                <div
                    className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed p-8 transition-colors ${isDisabled
                        ? "cursor-not-allowed border-neutral-200 bg-neutral-100"
                        : "border-neutral-300 bg-neutral-50 hover:border-neutral-400 hover:bg-neutral-100"
                        }`}
                    onClick={() => !isDisabled && inputRef.current?.click()}
                    onDragOver={(e) => {
                        if (isDisabled) return;
                        e.preventDefault();
                        e.currentTarget.classList.add("border-blue-400", "bg-blue-50");
                    }}
                    onDragLeave={(e) => {
                        e.currentTarget.classList.remove("border-blue-400", "bg-blue-50");
                    }}
                    onDrop={(e) => {
                        if (isDisabled) return;
                        e.preventDefault();
                        e.currentTarget.classList.remove("border-blue-400", "bg-blue-50");
                        const droppedFile = e.dataTransfer.files[0];
                        if (droppedFile && inputRef.current) {
                            const dt = new DataTransfer();
                            dt.items.add(droppedFile);
                            inputRef.current.files = dt.files;
                            inputRef.current.dispatchEvent(new Event("change", { bubbles: true }));
                        }
                    }}
                >
                    <div className="text-3xl">{state === "restoring" ? "⏳" : "📁"}</div>
                    <div className="text-sm font-medium">
                        {state === "validating" && "Validating..."}
                        {state === "restoring" && "Restoring..."}
                        {(state === "idle" || state === "valid" || state === "invalid") && "Click or drag file to upload"}
                    </div>
                    <div className="text-xs text-neutral-500">
                        Supports .json and .zip (max 200MB)
                    </div>
                </div>
            )}

            {/* File Info */}
            {file && state !== "done" && (
                <div className="flex items-center justify-between rounded-xl border bg-white p-3">
                    <div className="min-w-0">
                        <div className="truncate text-sm font-medium">{file.name}</div>
                        <div className="text-xs text-neutral-500">{formatFileSize(file.size)}</div>
                    </div>
                    {!isDisabled && (
                        <button
                            onClick={reset}
                            className="rounded-lg px-2 py-1 text-xs text-neutral-500 hover:bg-neutral-100"
                        >
                            Clear
                        </button>
                    )}
                </div>
            )}

            {/* Validating Spinner */}
            {state === "validating" && (
                <div className="flex items-center justify-center gap-2 py-4">
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-neutral-300 border-t-neutral-600" />
                    <span className="text-sm text-neutral-600">Validating backup file...</span>
                </div>
            )}

            {/* Restoring Spinner */}
            {state === "restoring" && (
                <div className="flex items-center justify-center gap-2 py-4">
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-red-300 border-t-red-600" />
                    <span className="text-sm text-red-600">Restoring data... Do not close this page.</span>
                </div>
            )}

            {/* Validation Result (before restore) */}
            {validateResult && (state === "valid" || state === "invalid") && (
                <div className="space-y-3 rounded-2xl border bg-white p-4">
                    {/* Header with badges */}
                    <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                            {validateResult.ok ? (
                                <Badge variant="success">Valid</Badge>
                            ) : (
                                <Badge variant="error">Invalid</Badge>
                            )}
                            <FormatBadge kind={validateResult.kind} format={validateResult.format} />
                        </div>
                    </div>

                    {/* Summary */}
                    {validateResult.summary && <SummaryCard summary={validateResult.summary} />}

                    {/* Warnings */}
                    <MessageList items={validateResult.warnings} variant="warning" />

                    {/* Errors */}
                    <MessageList items={validateResult.errors} variant="error" />

                    {/* Metadata notice */}
                    {validateResult.kind === "metadata" && (
                        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                            <strong>ℹ️ Metadata Only:</strong> This file contains only task/doc metadata without attachments.
                            Full restore from metadata will be available in a future update.
                        </div>
                    )}

                    {/* Confirm checkbox */}
                    {validateResult.ok && validateResult.kind !== "metadata" && (
                        <label className="flex cursor-pointer items-start gap-3 rounded-xl border bg-neutral-50 p-3">
                            <input
                                type="checkbox"
                                checked={confirmed}
                                onChange={(e) => setConfirmed(e.target.checked)}
                                className="mt-0.5"
                            />
                            <div className="text-sm">
                                <div className="font-medium">I understand this will replace all existing data</div>
                                <div className="text-xs text-neutral-500">
                                    This action cannot be undone. Make sure to export a backup first.
                                </div>
                            </div>
                        </label>
                    )}

                    {/* Restore button */}
                    <button
                        onClick={handleRestore}
                        disabled={!canRestore}
                        className="w-full rounded-xl bg-red-600 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-neutral-200 disabled:text-neutral-400"
                    >
                        {validateResult.kind === "metadata"
                            ? "Restore (Not available for metadata)"
                            : "Restore (Replace All Data)"}
                    </button>
                </div>
            )}

            {/* Restore Result */}
            {state === "done" && restoreResult && (
                <div className={`space-y-3 rounded-2xl border p-4 ${restoreResult.ok ? "border-emerald-200 bg-emerald-50" : "border-red-200 bg-red-50"}`}>
                    <div className="flex items-center gap-2">
                        <Badge variant={restoreResult.ok ? "success" : "error"}>
                            {restoreResult.ok ? "Restore Complete" : "Restore Failed"}
                        </Badge>
                        {restoreResult.stage && !restoreResult.ok && (
                            <Badge variant="error">Stage: {restoreResult.stage}</Badge>
                        )}
                    </div>

                    {/* Success: Show restored counts */}
                    {restoreResult.ok && restoreResult.restored && (
                        <SummaryCard summary={restoreResult.restored} label="Restored" />
                    )}

                    {/* Warnings */}
                    <MessageList items={restoreResult.warnings} variant="warning" />

                    {/* Errors */}
                    <MessageList items={restoreResult.errors} variant="error" />

                    {/* Success message */}
                    {restoreResult.ok && (
                        <div className="text-sm text-emerald-700">
                            ✅ All data has been restored. Refresh the page to see the changes.
                        </div>
                    )}

                    {/* Fail message */}
                    {!restoreResult.ok && (
                        <div className="text-sm text-red-700">
                            ❌ Restore failed. Your data was not modified (rollback successful).
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2">
                        {restoreResult.ok && (
                            <button
                                onClick={() => window.location.reload()}
                                className="flex-1 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
                            >
                                Refresh Page
                            </button>
                        )}
                        <button
                            onClick={reset}
                            className="flex-1 rounded-xl border bg-white px-4 py-2 text-sm font-medium hover:bg-neutral-50"
                        >
                            {restoreResult.ok ? "Done" : "Try Again"}
                        </button>
                    </div>
                </div>
            )
            }
        </div >
    );
}
