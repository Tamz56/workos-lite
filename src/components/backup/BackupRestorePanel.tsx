"use client";

import { useRef, useState, useCallback } from "react";
import { validateBackup, formatFileSize } from "@/lib/api/backup";
import type { ValidateRes, RestoreState } from "@/lib/backup/types";

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

function SummaryCard({ summary }: { summary: NonNullable<ValidateRes["summary"]> }) {
    const items = [
        { label: "Tasks", value: summary.tasks },
        { label: "Events", value: summary.events },
        { label: "Docs", value: summary.docs },
        { label: "Attachments", value: summary.attachments },
    ];

    if (summary.clips !== undefined) {
        items.push({ label: "Clips", value: summary.clips });
    }

    return (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {items.map((item) => (
                <div key={item.label} className="rounded-xl border bg-white p-3 text-center">
                    <div className="text-2xl font-semibold">{item.value}</div>
                    <div className="text-xs text-neutral-500">{item.label}</div>
                </div>
            ))}
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

    const [state, setState] = useState<RestoreState>("idle");
    const [file, setFile] = useState<File | null>(null);
    const [result, setResult] = useState<ValidateRes | null>(null);
    const [confirmed, setConfirmed] = useState(false);

    // Reset all state
    const reset = useCallback(() => {
        setState("idle");
        setFile(null);
        setResult(null);
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
        setResult(null);
        setConfirmed(false); // Always reset confirm on new file
        setState("validating");

        try {
            const res = await validateBackup(selectedFile, abortRef.current.signal);
            setResult(res);
            setState(res.ok ? "valid" : "invalid");
        } catch (err) {
            // Aborted - ignore
            if (err instanceof Error && err.name === "AbortError") {
                return;
            }
            setResult({
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

    // Restore handler (stub for PR4)
    const handleRestore = useCallback(() => {
        // Guards
        if (state !== "valid") return;
        if (!result?.ok) return;
        if (!confirmed) return;
        if (result.kind === "metadata") return; // Metadata restore not supported yet

        // TODO PR4: Call /api/backup/restore
        alert("Restore will be implemented in PR4");
    }, [state, result, confirmed]);

    // Can restore?
    const canRestore =
        state === "valid" &&
        result?.ok === true &&
        confirmed &&
        result.kind !== "metadata";

    return (
        <div className="space-y-4">
            {/* File Input (hidden) */}
            <input
                ref={inputRef}
                type="file"
                accept=".json,.zip"
                className="hidden"
                onChange={handleFileChange}
            />

            {/* Dropzone */}
            <div
                className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-neutral-300 bg-neutral-50 p-8 transition-colors hover:border-neutral-400 hover:bg-neutral-100"
                onClick={() => inputRef.current?.click()}
                onDragOver={(e) => {
                    e.preventDefault();
                    e.currentTarget.classList.add("border-blue-400", "bg-blue-50");
                }}
                onDragLeave={(e) => {
                    e.currentTarget.classList.remove("border-blue-400", "bg-blue-50");
                }}
                onDrop={(e) => {
                    e.preventDefault();
                    e.currentTarget.classList.remove("border-blue-400", "bg-blue-50");
                    const droppedFile = e.dataTransfer.files[0];
                    if (droppedFile && inputRef.current) {
                        // Create a DataTransfer to set files
                        const dt = new DataTransfer();
                        dt.items.add(droppedFile);
                        inputRef.current.files = dt.files;
                        inputRef.current.dispatchEvent(new Event("change", { bubbles: true }));
                    }
                }}
            >
                <div className="text-3xl">📁</div>
                <div className="text-sm font-medium">
                    {state === "validating" ? "Validating..." : "Click or drag file to upload"}
                </div>
                <div className="text-xs text-neutral-500">
                    Supports .json and .zip (max 200MB)
                </div>
            </div>

            {/* File Info */}
            {file && (
                <div className="flex items-center justify-between rounded-xl border bg-white p-3">
                    <div className="min-w-0">
                        <div className="truncate text-sm font-medium">{file.name}</div>
                        <div className="text-xs text-neutral-500">{formatFileSize(file.size)}</div>
                    </div>
                    <button
                        onClick={reset}
                        className="rounded-lg px-2 py-1 text-xs text-neutral-500 hover:bg-neutral-100"
                    >
                        Clear
                    </button>
                </div>
            )}

            {/* Validating Spinner */}
            {state === "validating" && (
                <div className="flex items-center justify-center gap-2 py-4">
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-neutral-300 border-t-neutral-600" />
                    <span className="text-sm text-neutral-600">Validating backup file...</span>
                </div>
            )}

            {/* Validation Result */}
            {result && state !== "validating" && (
                <div className="space-y-3 rounded-2xl border bg-white p-4">
                    {/* Header with badges */}
                    <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                            {result.ok ? (
                                <Badge variant="success">Valid</Badge>
                            ) : (
                                <Badge variant="error">Invalid</Badge>
                            )}
                            <FormatBadge kind={result.kind} format={result.format} />
                        </div>
                    </div>

                    {/* Summary */}
                    {result.summary && <SummaryCard summary={result.summary} />}

                    {/* Warnings */}
                    <MessageList items={result.warnings} variant="warning" />

                    {/* Errors */}
                    <MessageList items={result.errors} variant="error" />

                    {/* Metadata notice */}
                    {result.kind === "metadata" && (
                        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                            <strong>ℹ️ Metadata Only:</strong> This file contains only task/doc metadata without attachments.
                            Full restore from metadata will be available in a future update.
                        </div>
                    )}

                    {/* Confirm checkbox */}
                    {result.ok && result.kind !== "metadata" && (
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
                        {result.kind === "metadata"
                            ? "Restore (Not available for metadata)"
                            : "Restore (Replace All Data)"}
                    </button>
                </div>
            )}
        </div>
    );
}
