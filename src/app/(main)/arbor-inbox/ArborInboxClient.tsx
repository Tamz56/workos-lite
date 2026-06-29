"use client";

import React, { useState, useEffect, useCallback } from "react";
import { 
    InboxIcon, 
    ArrowPathIcon, 
    CheckCircleIcon, 
    XCircleIcon, 
    ExclamationTriangleIcon,
    DocumentTextIcon, 
    FolderIcon, 
    ClipboardDocumentIcon,
    SparklesIcon,
    ArrowDownTrayIcon
} from "@heroicons/react/24/outline";
import { PreviewData, ImportPayload } from "@/lib/arborInboxSchema";
import { ImportLog } from "@/lib/arborInboxStore";

export default function ArborInboxClient() {
    const [payloadText, setPayloadText] = useState("");
    const [loading, setLoading] = useState(false);
    const [logs, setLogs] = useState<ImportLog[]>([]);
    const [logsLoading, setLogsLoading] = useState(true);

    // Validation & Preview state
    const [validationChecked, setValidationChecked] = useState(false);
    const [isValid, setIsValid] = useState(false);
    const [errors, setErrors] = useState<string[]>([]);
    const [warnings, setWarnings] = useState<string[]>([]);
    const [preview, setPreview] = useState<PreviewData | null>(null);
    const [parsedPayload, setParsedPayload] = useState<ImportPayload | null>(null);

    // Status message for import execution
    const [importing, setImporting] = useState(false);
    const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

    // Load import logs from API
    const loadLogs = useCallback(async () => {
        setLogsLoading(true);
        try {
            const res = await fetch("/api/arbor-inbox", { cache: "no-store" });
            if (res.ok) {
                const data = await res.json();
                setLogs(data);
            }
        } catch (err) {
            console.error("Failed to load import logs", err);
        } finally {
            setLogsLoading(false);
        }
    }, []);

    useEffect(() => {
        loadLogs();
    }, [loadLogs]);

    const handleClear = () => {
        setPayloadText("");
        setValidationChecked(false);
        setIsValid(false);
        setErrors([]);
        setWarnings([]);
        setPreview(null);
        setParsedPayload(null);
        setStatusMessage(null);
    };

    const handleValidate = async () => {
        if (!payloadText.trim()) return;

        setLoading(true);
        setStatusMessage(null);
        setValidationChecked(false);
        
        let parsed: any;
        try {
            parsed = JSON.parse(payloadText);
        } catch (e: any) {
            setErrors([`JSON Syntax Error: ${e.message}`]);
            setIsValid(false);
            setValidationChecked(true);
            setLoading(false);
            return;
        }

        try {
            const res = await fetch("/api/arbor-inbox", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "validate", payload: parsed })
            });

            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.error || "Failed to validate payload");
            }

            const data = await res.json();
            setIsValid(data.valid);
            setErrors(data.errors || []);
            setWarnings(data.warnings || []);
            setPreview(data.preview || null);
            setParsedPayload(parsed);
            setValidationChecked(true);
        } catch (err: any) {
            setErrors([`Validation request failed: ${err.message}`]);
            setIsValid(false);
            setValidationChecked(true);
        } finally {
            setLoading(false);
        }
    };

    const handleImport = async () => {
        if (!isValid || !parsedPayload) return;

        setImporting(true);
        setStatusMessage(null);

        try {
            const res = await fetch("/api/arbor-inbox", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "import", payload: parsedPayload })
            });

            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || "Failed to import items");
            }

            setStatusMessage({
                type: "success",
                text: `นำเข้าข้อมูลสำเร็จ! โครงการ: +${data.log.summary.projectsCreated}, โน้ต: +${data.log.summary.notesCreated}, งาน: +${data.log.summary.tasksCreated}, โน้ตบทความ: +${data.log.summary.articleNotesCreated} (ข้าม: ${data.log.summary.skipped})`
            });
            
            // Reload logs and clear input
            loadLogs();
            // Reset state
            setPayloadText("");
            setValidationChecked(false);
            setIsValid(false);
            setErrors([]);
            setWarnings([]);
            setPreview(null);
            setParsedPayload(null);
        } catch (err: any) {
            setStatusMessage({
                type: "error",
                text: `การนำเข้าข้อมูลล้มเหลว: ${err.message}`
            });
        } finally {
            setImporting(false);
        }
    };

    const handleLoadSample = () => {
        const samplePayload = {
            schemaVersion: "workos-arbor-import-v0.1",
            source: "ChatGPT / Arbor",
            importBatchTitle: "PORTFOLIO-001 — Master Project Registry",
            items: [
                {
                    type: "project",
                    title: "Portfolio Command Center",
                    status: "planned"
                },
                {
                    type: "note",
                    targetProject: "Portfolio Command Center",
                    title: "00 Portfolio Overview",
                    content: "This document provides a birds-eye view of all ongoing strategic projects."
                },
                {
                    type: "note",
                    targetProject: "Portfolio Command Center",
                    title: "01 Master Project Registry",
                    content: "Registry list and project mapping database overview."
                },
                {
                    type: "task",
                    targetProject: "Portfolio Command Center",
                    title: "WORKOS-QA-001 — Add Testing Foundation",
                    status: "planned",
                    workspace: "other"
                },
                {
                    type: "task",
                    targetProject: "Portfolio Command Center",
                    title: "GF-ANALYTICS-001 — Content Performance Dashboard MVP",
                    status: "planned",
                    workspace: "content"
                },
                {
                    type: "task",
                    targetProject: "Portfolio Command Center",
                    title: "GF-APP-015A — Convert Decision Algorithm to Product Spec",
                    status: "planned",
                    workspace: "content"
                },
                {
                    type: "article_note",
                    targetProject: "Portfolio Command Center",
                    title: "GFKVS-001 — Create Visual Bible v1",
                    status: "draft",
                    content: "Draft requirements for content brand guidelines.",
                    nextActions: ["Prepare asset pack", "Sync with lead designer"],
                    metadata: { author: "ChatGPT", reviewRound: 1 }
                }
            ]
        };
        setPayloadText(JSON.stringify(samplePayload, null, 2));
    };

    return (
        <div className="max-w-7xl mx-auto px-6 py-8 min-h-[calc(100vh-64px)] flex flex-col gap-8">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-black tracking-tight text-theme-primary flex items-center gap-3">
                        <InboxIcon className="w-8 h-8 text-blue-600" />
                        Arbor Inbox
                    </h1>
                    <p className="text-theme-secondary text-sm mt-1">
                        ระบบนำเข้าข้อมูลโครงสร้างความต้องการ (Structured JSON) จาก Arbor หรือ ChatGPT
                    </p>
                </div>
                <button
                    onClick={handleLoadSample}
                    className="flex items-center gap-1.5 px-4 py-2 bg-theme-input hover:bg-theme-border/50 text-theme-secondary hover:text-theme-primary rounded-xl text-xs font-black transition-all border border-theme-border"
                >
                    <ClipboardDocumentIcon className="w-4 h-4" />
                    Load Sample Payload
                </button>
            </div>

            {/* Status message */}
            {statusMessage && (
                <div className={`p-4 rounded-2xl flex items-start gap-3 border ${
                    statusMessage.type === "success" 
                        ? "bg-green-500/10 border-green-500/20 text-green-700 dark:text-green-400" 
                        : "bg-red-500/10 border-red-500/20 text-red-700 dark:text-red-400"
                }`}>
                    {statusMessage.type === "success" ? (
                        <CheckCircleIcon className="w-5 h-5 shrink-0 text-green-600" />
                    ) : (
                        <XCircleIcon className="w-5 h-5 shrink-0 text-red-600" />
                    )}
                    <span className="text-sm font-semibold">{statusMessage.text}</span>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                {/* Left panel: Input Area */}
                <div className="bg-theme-card border border-theme-border rounded-[32px] p-6 shadow-sm flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-sm font-black uppercase tracking-wider text-theme-secondary">JSON Payload</h2>
                        <div className="flex items-center gap-2">
                            {payloadText.trim() && (
                                <button
                                    onClick={handleClear}
                                    className="px-3 py-1 text-xs text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg transition-all font-bold"
                                    disabled={loading || importing}
                                >
                                    Clear
                                </button>
                            )}
                            <button
                                onClick={handleValidate}
                                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black transition-all disabled:bg-theme-border disabled:text-theme-muted flex items-center gap-1.5 shadow-md shadow-blue-600/15"
                                disabled={loading || importing || !payloadText.trim()}
                            >
                                {loading ? (
                                    <ArrowPathIcon className="w-4 h-4 animate-spin" />
                                ) : (
                                    <SparklesIcon className="w-4 h-4" />
                                )}
                                Parse & Validate
                            </button>
                        </div>
                    </div>

                    <textarea
                        value={payloadText}
                        onChange={(e) => setPayloadText(e.target.value)}
                        placeholder='วาง JSON payload ที่นี่... เช่น: {"schemaVersion": "workos-arbor-import-v0.1", "source": "ChatGPT", ...}'
                        className="w-full min-h-[350px] font-mono text-xs bg-theme-input border border-theme-border rounded-2xl p-4 outline-none focus:border-theme-border/80 transition-all resize-y text-theme-primary placeholder:text-theme-muted"
                        disabled={loading || importing}
                    />

                    {/* Validation Feedback Panel */}
                    {validationChecked && (
                        <div className={`p-4 rounded-2xl border ${
                            isValid 
                                ? "bg-green-500/5 border-green-500/10 text-green-700 dark:text-green-400" 
                                : "bg-red-500/5 border-red-500/10 text-red-700 dark:text-red-400"
                        }`}>
                            <div className="flex items-center gap-2 mb-2">
                                {isValid ? (
                                    <>
                                        <CheckCircleIcon className="w-5 h-5 text-green-600 shrink-0" />
                                        <span className="text-sm font-bold text-green-700 dark:text-green-400">ข้อมูลผ่านการตรวจสอบ (Valid Payload)</span>
                                    </>
                                ) : (
                                    <>
                                        <XCircleIcon className="w-5 h-5 text-red-600 shrink-0" />
                                        <span className="text-sm font-bold text-red-700 dark:text-red-400">พบข้อผิดพลาดในการตรวจสอบ (Validation Failed)</span>
                                    </>
                                )}
                            </div>

                            {/* Errors */}
                            {errors.length > 0 && (
                                <ul className="list-disc list-inside space-y-1.5 pl-1 mt-2 text-xs font-medium text-red-600 dark:text-red-400">
                                    {errors.map((err, i) => (
                                        <li key={i}>{err}</li>
                                    ))}
                                </ul>
                            )}

                            {/* Warnings */}
                            {warnings.length > 0 && (
                                <div className="mt-3 pt-3 border-t border-theme-border/20">
                                    <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 text-xs font-bold mb-1">
                                        <ExclamationTriangleIcon className="w-4 h-4" />
                                        คำเตือน (Warnings)
                                    </div>
                                    <ul className="list-disc list-inside space-y-1 pl-1 text-[11px] text-amber-600 dark:text-amber-400">
                                        {warnings.map((warn, i) => (
                                            <li key={i}>{warn}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Right panel: Preview & Confirm */}
                <div className="bg-theme-card border border-theme-border rounded-[32px] p-6 shadow-sm flex flex-col gap-6">
                    <div className="flex items-center justify-between">
                        <h2 className="text-sm font-black uppercase tracking-wider text-theme-secondary">Preview Area</h2>
                        {isValid && preview && (
                            <button
                                onClick={handleImport}
                                className="px-5 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl text-xs font-black transition-all disabled:bg-theme-border disabled:text-theme-muted shadow-md shadow-green-600/15 flex items-center gap-1.5 animate-pulse"
                                disabled={importing}
                            >
                                {importing ? (
                                    <ArrowPathIcon className="w-4 h-4 animate-spin" />
                                ) : (
                                    <CheckCircleIcon className="w-4 h-4" />
                                )}
                                Confirm Import
                            </button>
                        )}
                    </div>

                    {!preview ? (
                        <div className="py-20 flex flex-col items-center justify-center text-theme-muted italic text-xs font-bold gap-3">
                            <DocumentTextIcon className="w-12 h-12 text-theme-border" />
                            กด Parse & Validate เพื่อดูตัวอย่างข้อมูลนำเข้าที่นี่
                        </div>
                    ) : (
                        <div className="space-y-6 max-h-[600px] overflow-y-auto pr-1 custom-scrollbar">
                            {/* Projects to create */}
                            {preview.projects.length > 0 && (
                                <div className="space-y-2">
                                    <h3 className="text-xs font-bold uppercase text-theme-muted tracking-wider flex items-center gap-1.5">
                                        <FolderIcon className="w-4 h-4 text-blue-500" />
                                        Projects to Create ({preview.projects.length})
                                    </h3>
                                    <div className="space-y-2">
                                        {preview.projects.map((proj, i) => (
                                            <div key={i} className={`p-3 rounded-2xl border text-xs flex justify-between items-center ${
                                                proj.isDuplicate 
                                                    ? "bg-amber-500/5 border-amber-500/20 text-amber-700 dark:text-amber-400" 
                                                    : "bg-theme-input/40 border-theme-border"
                                            }`}>
                                                <div>
                                                    <span className="font-bold block text-theme-primary">{proj.title}</span>
                                                    <span className="text-[10px] text-theme-muted font-bold">Slug: {proj.slug}</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className="px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-tight bg-theme-border text-theme-secondary">
                                                        {proj.status}
                                                    </span>
                                                    {proj.isDuplicate && (
                                                        <span className="px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-tight bg-amber-500/10 text-amber-600 border border-amber-500/20">
                                                            Skip (Name repeat)
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Notes to create */}
                            {preview.notes.length > 0 && (
                                <div className="space-y-2">
                                    <h3 className="text-xs font-bold uppercase text-theme-muted tracking-wider flex items-center gap-1.5">
                                        <DocumentTextIcon className="w-4 h-4 text-teal-500" />
                                        Notes to Create ({preview.notes.length})
                                    </h3>
                                    <div className="space-y-2">
                                        {preview.notes.map((note, i) => (
                                            <div key={i} className="p-3 bg-theme-input/40 border border-theme-border rounded-2xl text-xs">
                                                <span className="font-bold block text-theme-primary">{note.title}</span>
                                                <span className="text-[10px] text-theme-muted font-bold block mt-1">
                                                    Target Project: <span className="text-theme-secondary">{note.targetProject}</span>
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Tasks to create */}
                            {preview.tasks.length > 0 && (
                                <div className="space-y-2">
                                    <h3 className="text-xs font-bold uppercase text-theme-muted tracking-wider flex items-center gap-1.5">
                                        <ArrowDownTrayIcon className="w-4 h-4 text-purple-500" />
                                        Tasks to Create ({preview.tasks.length})
                                    </h3>
                                    <div className="space-y-2">
                                        {preview.tasks.map((task, i) => (
                                            <div key={i} className="p-3 bg-theme-input/40 border border-theme-border rounded-2xl text-xs space-y-1.5">
                                                <div className="flex justify-between items-start gap-4">
                                                    <span className="font-bold text-theme-primary">{task.originalTitle}</span>
                                                    <span className="px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-tight bg-theme-border text-theme-secondary shrink-0">
                                                        {task.status}
                                                    </span>
                                                </div>
                                                <div className="text-[10px] text-theme-muted space-y-0.5">
                                                    <div className="font-bold">
                                                        Title in Database: <code className="text-blue-600 dark:text-blue-400 break-all">{task.title}</code>
                                                    </div>
                                                    <div>
                                                        Target Project: <span className="text-theme-secondary font-bold">{task.targetProject}</span> | Workspace: <span className="text-theme-secondary font-bold">{task.workspace}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Article Notes to create */}
                            {preview.articleNotes.length > 0 && (
                                <div className="space-y-2">
                                    <h3 className="text-xs font-bold uppercase text-theme-muted tracking-wider flex items-center gap-1.5">
                                        <SparklesIcon className="w-4 h-4 text-amber-500" />
                                        Article Notes to Create ({preview.articleNotes.length})
                                    </h3>
                                    <div className="space-y-2">
                                        {preview.articleNotes.map((art, i) => (
                                            <div key={i} className="p-3 bg-theme-input/40 border border-theme-border rounded-2xl text-xs space-y-1">
                                                <div className="flex justify-between items-center">
                                                    <span className="font-bold text-theme-primary">{art.title}</span>
                                                    <span className="px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-tight bg-theme-border text-theme-secondary shrink-0">
                                                        {art.status}
                                                    </span>
                                                </div>
                                                <div className="text-[10px] text-theme-muted font-bold">
                                                    Target Project: <span className="text-theme-secondary">{art.targetProject}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Bottom section: Import Log history */}
            <div className="bg-theme-card border border-theme-border rounded-[32px] p-6 shadow-sm flex flex-col gap-4">
                <div className="flex items-center justify-between border-b border-theme-border/40 pb-3">
                    <h2 className="text-lg font-black text-theme-primary flex items-center gap-2">
                        <InboxIcon className="w-5 h-5 text-theme-muted" />
                        Import History (ประวัติการนำเข้า)
                    </h2>
                    <button 
                        onClick={loadLogs}
                        className="p-1.5 rounded-xl hover:bg-theme-input text-theme-muted hover:text-theme-primary transition-all"
                        title="Reload logs"
                    >
                        <ArrowPathIcon className="w-4 h-4" />
                    </button>
                </div>

                {logsLoading ? (
                    <div className="py-12 text-center text-xs text-theme-muted font-bold flex items-center justify-center gap-2">
                        <ArrowPathIcon className="w-4 h-4 animate-spin text-blue-600" />
                        กำลังโหลดประวัติ...
                    </div>
                ) : logs.length === 0 ? (
                    <div className="py-12 text-center text-xs text-theme-muted font-bold italic">
                        ยังไม่มีประวัติการนำเข้าข้อมูล
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-xs">
                            <thead>
                                <tr className="border-b border-theme-border text-theme-muted font-black uppercase tracking-wider">
                                    <th className="py-3 px-4">Batch Title</th>
                                    <th className="py-3 px-4">Source</th>
                                    <th className="py-3 px-4">Date</th>
                                    <th className="py-3 px-4">Status</th>
                                    <th className="py-3 px-4 text-center">Summary Counts (P / N / T / A)</th>
                                    <th className="py-3 px-4">Skipped / Errors</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-theme-border/30 text-theme-secondary font-medium">
                                {logs.map((log) => (
                                    <tr key={log.id} className="hover:bg-theme-input/10 transition-colors">
                                        <td className="py-3.5 px-4 font-bold text-theme-primary max-w-xs truncate" title={log.importBatchTitle}>
                                            {log.importBatchTitle}
                                        </td>
                                        <td className="py-3.5 px-4 font-semibold">{log.source}</td>
                                        <td className="py-3.5 px-4 text-theme-muted font-bold">
                                            {new Date(log.createdAt).toLocaleString("th-TH", { timeZone: "Asia/Bangkok" })}
                                        </td>
                                        <td className="py-3.5 px-4">
                                            <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-tight ${
                                                log.status === "success" 
                                                    ? "bg-green-100 text-green-700 dark:bg-green-950/20 dark:text-green-400" 
                                                    : "bg-red-100 text-red-700 dark:bg-red-950/20 dark:text-red-400"
                                            }`}>
                                                {log.status}
                                            </span>
                                        </td>
                                        <td className="py-3.5 px-4 text-center font-bold">
                                            <span className="text-blue-600 dark:text-blue-400" title="Projects">{log.summary.projectsCreated}</span>
                                            <span className="text-theme-muted mx-1">/</span>
                                            <span className="text-teal-600 dark:text-teal-400" title="Notes">{log.summary.notesCreated}</span>
                                            <span className="text-theme-muted mx-1">/</span>
                                            <span className="text-purple-600 dark:text-purple-400" title="Tasks">{log.summary.tasksCreated}</span>
                                            <span className="text-theme-muted mx-1">/</span>
                                            <span className="text-amber-600 dark:text-amber-400" title="Article Notes">{log.summary.articleNotesCreated}</span>
                                        </td>
                                        <td className="py-3.5 px-4 text-theme-muted font-semibold max-w-xs truncate" title={log.summary.errors?.join(", ") || ""}>
                                            {log.summary.skipped > 0 && `Skipped Project: ${log.summary.skipped}`}
                                            {log.summary.errors && log.summary.errors.length > 0 && (
                                                <span className="text-red-500 font-bold block truncate">
                                                    Errors: {log.summary.errors.join("; ")}
                                                </span>
                                            )}
                                            {log.summary.skipped === 0 && (!log.summary.errors || log.summary.errors.length === 0) && "-"}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
