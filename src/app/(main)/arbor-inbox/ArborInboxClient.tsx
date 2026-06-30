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
import { parseArticleMarkdown, generateUpdatePayload } from "@/lib/articleParser";
import { parseAnalyticsData, generateSnapshotPayload } from "@/lib/analyticsParser";

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

    // Markdown import mode states
    const [importMode, setImportMode] = useState<"json" | "markdown" | "analytics">("json");
    const [markdownText, setMarkdownText] = useState("");
    const [parsedResult, setParsedResult] = useState<any>(null);
    const [writingProjects, setWritingProjects] = useState<any[]>([]);
    const [selectedProjectId, setSelectedProjectId] = useState<string>("");
    const [manualProjectId, setManualProjectId] = useState<string>("");

    // Analytics import mode states
    const [analyticsText, setAnalyticsText] = useState("");
    const [analyticsWindow, setAnalyticsWindow] = useState("24h");
    const [analyticsSource, setAnalyticsSource] = useState("GA4");
    const [analyticsDate, setAnalyticsDate] = useState(() => new Date().toISOString().split("T")[0]);
    const [analyticsNote, setAnalyticsNote] = useState("");
    const [analyticsResult, setAnalyticsResult] = useState<any>(null);
    const [selectedRowIndex, setSelectedRowIndex] = useState<number>(0);

    const handleParseAnalytics = (textToParse: string) => {
        if (!textToParse.trim()) return;
        const result = parseAnalyticsData(textToParse, writingProjects);
        setAnalyticsResult(result);
        setSelectedRowIndex(0);
        setManualProjectId("");

        if (result.sourceType === "GA4") {
            setAnalyticsSource("GA4");
        } else if (result.sourceType === "Facebook") {
            setAnalyticsSource("Facebook");
        } else if (result.sourceType === "FacebookGroupDaily") {
            setAnalyticsSource("FacebookGroupDaily");
        }

        // Auto target matched project of the first row
        if (result.rows.length > 0 && result.rows[0].matchedProject) {
            setSelectedProjectId(result.rows[0].matchedProject.id);
        } else {
            setSelectedProjectId("");
        }
    };

    const handleGenerateAnalyticsPayload = () => {
        setStatusMessage(null);

        if (!analyticsResult || analyticsResult.rows.length === 0) {
            setStatusMessage({ type: "error", text: "Please select a data row first. (กรุณาเลือกแถวข้อมูลนำเข้าก่อน)" });
            return;
        }

        const row = analyticsResult.rows[selectedRowIndex];
        if (!row) {
            setStatusMessage({ type: "error", text: "Please select a data row first. (กรุณาเลือกแถวข้อมูลนำเข้าก่อน)" });
            return;
        }

        if (row.rowType === "summary") {
            setStatusMessage({ type: "error", text: "Selected row is a summary row and cannot be imported. (ไม่สามารถนำเข้าแถวที่เป็นสรุปผลรวมได้)" });
            return;
        }

        if (!analyticsWindow) {
            setStatusMessage({ type: "error", text: "Snapshot window is missing. (กรุณาระบุช่วงเวลาสถิติ)" });
            return;
        }

        if (!analyticsDate) {
            setStatusMessage({ type: "error", text: "Snapshot date is missing. (กรุณาระบุวันที่บันทึกสถิติ)" });
            return;
        }

        // Target project resolution priority:
        // 1. autoMatch with High/Medium confidence
        // 2. manualProjectId selected by user
        // 3. autoMatch with Low confidence
        let activeProjId = "";
        let isManual = false;

        const autoMatch = row.matchedProject;
        if (autoMatch && (autoMatch.confidence === "High" || autoMatch.confidence === "Medium")) {
            activeProjId = autoMatch.id;
            isManual = false;
        } else if (manualProjectId) {
            activeProjId = manualProjectId;
            isManual = true;
        } else if (autoMatch) {
            activeProjId = autoMatch.id;
            isManual = false;
        }

        if (!activeProjId) {
            setStatusMessage({ type: "error", text: "No target article matched. Please select Target Writing Project manually. (ไม่พบโครงการบทความเป้าหมาย กรุณาเลือกระบุโครงการปลายทางด้วยตนเอง)" });
            return;
        }

        // Facebook group overview requires manual target selection
        if (row.rowType === "facebook_group_overview" && !manualProjectId) {
            setStatusMessage({ type: "error", text: "Facebook Group Overview snapshot requires manual Target Writing Project selection. (ข้อมูลสรุปกลุ่มจำเป็นต้องเลือกระบุโครงการปลายทางด้วยตนเอง)" });
            return;
        }

        const hasMetrics = Object.keys(row.extractedData).some(key => {
            const val = row.extractedData[key];
            return typeof val === "number" && val > 0;
        });
        if (!hasMetrics) {
            setStatusMessage({ type: "error", text: "No usable metrics were detected from this row. (ตรวจไม่พบตัวชี้วัดประสิทธิภาพใดๆ ในแถวที่เลือกนี้)" });
            return;
        }

        const rowToPack = { ...row };
        const matched = writingProjects.find(p => p.id === activeProjId);
        if (matched) {
            rowToPack.matchedProject = {
                id: matched.id,
                title: matched.title,
                slug: matched.slug,
                method: isManual ? "manual" : (row.matchedProject?.method || "manual"),
                confidence: isManual ? "Manual" : (row.matchedProject?.confidence || "Manual")
            };
        }

        const metadata = {
            sourceFileName: "Pasted Text",
            sourceType: analyticsSource,
            snapshotWindow: analyticsWindow,
            snapshotDate: analyticsDate,
            importNote: isManual 
                ? `[Manual Target Selected] ${analyticsNote || ""}`.trim()
                : (analyticsNote || "")
        };

        const generatedPayload = generateSnapshotPayload(rowToPack, metadata, selectedRowIndex);
        setPayloadText(JSON.stringify(generatedPayload, null, 2));
        handleValidate(JSON.stringify(generatedPayload));
    };

    useEffect(() => {
        fetch("/api/content/writing-lab/projects")
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data)) {
                    setWritingProjects(data);
                }
            })
            .catch(err => console.error("Error loading writing projects:", err));
    }, []);

    const handleParseMarkdown = (textToParse: string, targetId?: string) => {
        const result = parseArticleMarkdown(textToParse);
        setParsedResult(result);

        const projId = targetId || selectedProjectId;
        let targetProject = writingProjects.find(p => p.id === projId);

        // Pre-select matching project if none selected yet
        if (!projId && result.fields.slug) {
            const matched = writingProjects.find(
                p => p.slug === result.fields.slug || p.title === result.fields.title
            );
            if (matched) {
                targetProject = matched;
                setSelectedProjectId(matched.id);
            }
        }

        const generatedPayload = generateUpdatePayload(
            result,
            { id: targetProject?.id || "", slug: targetProject?.slug || "" },
            `Markdown Import - ${result.fields.title || "Untitled"}`
        );

        setPayloadText(JSON.stringify(generatedPayload, null, 2));

        // Add internal warnings from parser to UI warnings state
        if (result.warnings.length > 0) {
            setWarnings(result.warnings);
        }

        // Validate generated JSON
        handleValidate(JSON.stringify(generatedPayload));
    };

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

    useEffect(() => {
        try {
            const handoff = sessionStorage.getItem("workos.arborInbox.pendingPayload");
            if (handoff) {
                setPayloadText(handoff);
                sessionStorage.removeItem("workos.arborInbox.pendingPayload");
                handleValidate(handoff);
            }
        } catch (err) {
            console.error("Failed to read handoff payload from sessionStorage", err);
        }
    }, []);

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

    const handleValidate = async (overrideText?: string) => {
        const textToValidate = overrideText !== undefined ? overrideText : payloadText;
        if (!textToValidate.trim()) return;

        setLoading(true);
        setStatusMessage(null);
        setValidationChecked(false);
        
        let parsed: any;
        try {
            parsed = JSON.parse(textToValidate);
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

        const isUpdate = parsedPayload.schemaVersion === "workos-writing-lab-update-v0.1";
        const action = isUpdate ? "apply_update" : "import";

        try {
            const res = await fetch("/api/arbor-inbox", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action, payload: parsedPayload })
            });

            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || "Failed to process items");
            }

            if (isUpdate) {
                setStatusMessage({
                    type: "success",
                    text: `อัปเดตข้อมูลบทความสำเร็จ! โปรเจกต์เป้าหมาย: "${data.log.summary.targetProject || 'N/A'}", จำนวนฟิลด์ที่อัปเดต: ${data.log.summary.fieldsUpdated}`
                });
            } else {
                setStatusMessage({
                    type: "success",
                    text: `นำเข้าข้อมูลสำเร็จ! โครงการ: +${data.log.summary.projectsCreated}, โน้ต: +${data.log.summary.notesCreated}, งาน: +${data.log.summary.tasksCreated}, โน้ตบทความ: +${data.log.summary.articleNotesCreated} (ข้าม: ${data.log.summary.skipped})`
                });
            }
            
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
                text: `การประมวลผลข้อมูลล้มเหลว: ${err.message}`
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
                    <div className="flex bg-theme-input rounded-2xl p-1 border border-theme-border/40 mb-2">
                        <button
                            onClick={() => setImportMode("json")}
                            className={`flex-1 py-1.5 text-xs font-black rounded-xl transition-all ${
                                importMode === "json"
                                    ? "bg-theme-card text-theme-primary shadow-sm border border-theme-border/10"
                                    : "text-theme-muted hover:text-theme-primary"
                            }`}
                        >
                            JSON Payload
                        </button>
                        <button
                            onClick={() => setImportMode("markdown")}
                            className={`flex-1 py-1.5 text-xs font-black rounded-xl transition-all ${
                                importMode === "markdown"
                                    ? "bg-theme-card text-theme-primary shadow-sm border border-theme-border/10"
                                    : "text-theme-muted hover:text-theme-primary"
                            }`}
                        >
                            Paste Article Markdown
                        </button>
                        <button
                            onClick={() => setImportMode("analytics")}
                            className={`flex-1 py-1.5 text-xs font-black rounded-xl transition-all ${
                                importMode === "analytics"
                                    ? "bg-theme-card text-theme-primary shadow-sm border border-theme-border/10"
                                    : "text-theme-muted hover:text-theme-primary"
                            }`}
                        >
                            Analytics CSV / Table
                        </button>
                    </div>

                    {importMode === "json" && (
                        <div className="space-y-4">
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
                                        onClick={() => handleValidate()}
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
                        </div>
                    )}

                    {importMode === "markdown" && (
                        <div className="space-y-4">
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-theme-secondary uppercase tracking-wider">
                                    Target Writing Project (โครงการเขียนร่างเป้าหมาย)
                                </label>
                                <select
                                    value={selectedProjectId}
                                    onChange={(e) => {
                                        const nextId = e.target.value;
                                        setSelectedProjectId(nextId);
                                        if (markdownText.trim()) {
                                            handleParseMarkdown(markdownText, nextId);
                                        }
                                    }}
                                    className="w-full bg-theme-input border border-theme-border rounded-2xl px-4 py-2.5 text-xs text-theme-primary font-bold focus:outline-none focus:border-theme-border/80 transition-all"
                                >
                                    <option value="">-- เลือกโครงการร่างเป้าหมาย --</option>
                                    {writingProjects.map((proj) => (
                                        <option key={proj.id} value={proj.id}>
                                            {proj.title} ({proj.slug || "no-slug"})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <textarea
                                value={markdownText}
                                onChange={(e) => setMarkdownText(e.target.value)}
                                placeholder="วางเนื้อหาร่างบทความ Markdown ที่นี่... (ต้องมีหัวข้อ ## Website Fields และ ## Suggested References)"
                                className="w-full min-h-[300px] font-mono text-xs bg-theme-input border border-theme-border rounded-2xl p-4 outline-none focus:border-theme-border/80 transition-all resize-y text-theme-primary placeholder:text-theme-muted"
                                disabled={loading || importing}
                            />

                            <button
                                onClick={() => handleParseMarkdown(markdownText)}
                                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-xs font-black transition-all flex items-center justify-center gap-1.5 shadow-md shadow-blue-600/15"
                                disabled={loading || importing || !markdownText.trim()}
                            >
                                <SparklesIcon className="w-4 h-4" />
                                Parse Markdown to Update Package
                            </button>

                            {parsedResult && (
                                <div className="space-y-4 border-t border-theme-border/30 pt-4">
                                    {/* Parsed Fields Summary */}
                                    <div className="bg-theme-input/30 p-4 border border-theme-border/60 rounded-2xl space-y-2">
                                        <h3 className="text-xs font-black uppercase text-theme-secondary tracking-wider">
                                            Parsed Fields Summary
                                        </h3>
                                        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                                            <div><span className="font-bold text-theme-muted">Title:</span> <span className="font-semibold text-theme-primary">{parsedResult.fields.title || "(Missing)"}</span></div>
                                            <div><span className="font-bold text-theme-muted">Slug:</span> <span className="font-semibold text-theme-primary">{parsedResult.fields.slug || "(Missing)"}</span></div>
                                            <div><span className="font-bold text-theme-muted">Content Layer:</span> <span className="font-semibold text-blue-600 dark:text-blue-400">{parsedResult.fields.contentLayer || "(Missing)"}</span></div>
                                            <div><span className="font-bold text-theme-muted">Category:</span> <span className="font-semibold text-theme-primary">{parsedResult.fields.category || "(None)"}</span></div>
                                            <div><span className="font-bold text-theme-muted">Journey Stage:</span> <span className="font-semibold text-theme-primary">{parsedResult.fields.journeyStage || "(None)"}</span></div>
                                            <div><span className="font-bold text-theme-muted">Primary Keyword:</span> <span className="font-semibold text-theme-primary">{parsedResult.fields.primaryKeyword || "(None)"}</span></div>
                                        </div>
                                    </div>

                                    {/* Missing Fields Warnings */}
                                    {parsedResult.missingFields.length > 0 && (
                                        <div className="p-3 bg-red-500/5 border border-red-500/10 rounded-2xl text-xs flex items-start gap-2 text-red-600 dark:text-red-400 font-semibold">
                                            <XCircleIcon className="w-4 h-4 shrink-0 mt-0.5" />
                                            <div>
                                                <span>พบฟิลด์บังคับขาดหาย: </span>
                                                <span className="font-black">{parsedResult.missingFields.join(", ")}</span>
                                            </div>
                                        </div>
                                    )}

                                    {/* Image Checklist */}
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-theme-secondary uppercase tracking-wider block">
                                            Image Placeholders Checklist
                                        </label>
                                        <div className="grid grid-cols-2 gap-2">
                                            {parsedResult.imageChecklist.map((img: any) => (
                                                <div key={img.placeholder} className={`p-2.5 border rounded-xl text-xs flex items-center justify-between font-bold ${
                                                    img.detected 
                                                        ? "bg-green-500/5 border-green-500/15 text-green-700 dark:text-green-400"
                                                        : "bg-amber-500/5 border-amber-500/15 text-amber-700 dark:text-amber-400"
                                                }`}>
                                                    <span>{img.placeholder}</span>
                                                    <span className="text-[10px] uppercase font-black">
                                                        {img.detected ? "✓ Found" : "⚠️ Missing"}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {importMode === "analytics" && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-theme-secondary uppercase tracking-wider block">
                                        Snapshot Window (ช่วงเวลาสถิติ)
                                    </label>
                                    <select
                                        value={analyticsWindow}
                                        onChange={(e) => setAnalyticsWindow(e.target.value)}
                                        className="w-full bg-theme-input border border-theme-border rounded-xl px-3 py-2.5 text-xs text-theme-primary font-bold focus:outline-none"
                                    >
                                        <option value="24h">24 Hours (24 ชม. แรก)</option>
                                        <option value="7d">7 Days (7 วันแรก)</option>
                                        <option value="30d">30 Days (30 วันแรก)</option>
                                        <option value="90d">90 Days (90 วันแรก)</option>
                                    </select>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-theme-secondary uppercase tracking-wider block">
                                        Data Source (แหล่งข้อมูลต้นทาง)
                                    </label>
                                    <select
                                        value={analyticsSource}
                                        onChange={(e) => setAnalyticsSource(e.target.value)}
                                        className="w-full bg-theme-input border border-theme-border rounded-xl px-3 py-2.5 text-xs text-theme-primary font-bold focus:outline-none"
                                    >
                                        <option value="GA4">Google Analytics 4 (GA4)</option>
                                        <option value="Facebook">Facebook Page</option>
                                        <option value="FacebookGroupDaily">Facebook Group Daily Report</option>
                                        <option value="PersonalProfile">Personal Profile Post</option>
                                    </select>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-theme-secondary uppercase tracking-wider block">
                                        Snapshot Date (วันที่บันทึกสถิติ)
                                    </label>
                                    <input
                                        type="date"
                                        value={analyticsDate}
                                        onChange={(e) => setAnalyticsDate(e.target.value)}
                                        className="w-full bg-theme-input border border-theme-border rounded-xl px-3 py-2 text-xs text-theme-primary font-bold focus:outline-none"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-theme-secondary uppercase tracking-wider block">
                                        Manual Target Selector (เลือกระบุโครงการร่างปลายทาง)
                                    </label>
                                    <select
                                        value={manualProjectId}
                                        onChange={(e) => setManualProjectId(e.target.value)}
                                        className="w-full bg-theme-input border border-theme-border rounded-xl px-3 py-2.5 text-xs text-theme-primary font-bold focus:outline-none"
                                    >
                                        <option value="">-- ไม่บังคับ (ใช้ค่าระบบเดาอัตโนมัติ) --</option>
                                        {writingProjects.map((proj) => (
                                            <option key={proj.id} value={proj.id}>
                                                {proj.title}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="space-y-1.5 col-span-2">
                                    <label className="text-[10px] font-black text-theme-secondary uppercase tracking-wider block">
                                        Import Note (หมายเหตุการนำเข้าสถิติ)
                                    </label>
                                    <input
                                        type="text"
                                        value={analyticsNote}
                                        onChange={(e) => setAnalyticsNote(e.target.value)}
                                        placeholder="เช่น ยอดแชร์คึกคักเป็นพิเศษเนื่องจากได้พาร์ทเนอร์ช่วยแชร์..."
                                        className="w-full bg-theme-input border border-theme-border rounded-xl px-3 py-2.5 text-xs text-theme-primary font-medium focus:outline-none"
                                    />
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-theme-secondary uppercase tracking-wider block">
                                    Paste CSV / Table Text (วางข้อความตารางสถิติดิบที่นี่)
                                </label>
                                <textarea
                                    value={analyticsText}
                                    onChange={(e) => setAnalyticsText(e.target.value)}
                                    placeholder="คัดลอกตารางจาก Google Sheets หรือ Excel แล้วนำมาวางที่นี่..."
                                    className="w-full min-h-[150px] font-mono text-xs bg-theme-input border border-theme-border rounded-2xl p-4 outline-none focus:border-theme-border/80 transition-all resize-y text-theme-primary placeholder:text-theme-muted"
                                />
                            </div>

                            <button
                                onClick={() => handleParseAnalytics(analyticsText)}
                                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-xs font-black transition-all flex items-center justify-center gap-1.5 shadow-md shadow-blue-600/15"
                                disabled={!analyticsText.trim()}
                            >
                                <SparklesIcon className="w-4 h-4" />
                                Parse & Review Mapping
                            </button>

                            {analyticsResult && (
                                <div className="space-y-4 border-t border-theme-border/30 pt-4">
                                    {/* Warnings if group report or unknown */}
                                    {analyticsResult.warning && (
                                        <div className="p-3 bg-amber-500/5 border border-amber-500/15 rounded-2xl text-[11px] flex items-start gap-2 text-amber-700 dark:text-amber-400 font-bold">
                                            <ExclamationTriangleIcon className="w-4 h-4 shrink-0 mt-0.5" />
                                            <span>{analyticsResult.warning}</span>
                                        </div>
                                    )}

                                    {/* Classification display */}
                                    <div className="flex items-center justify-between text-xs font-bold bg-theme-input/40 border border-theme-border rounded-xl p-3">
                                        <span className="text-theme-muted">Detected Report Type:</span>
                                        <span className="px-2 py-0.5 bg-blue-500/10 text-blue-600 border border-blue-500/20 rounded text-[10px] font-black uppercase">
                                            {analyticsResult.sourceType}
                                        </span>
                                    </div>

                                    {/* Column mappings list */}
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-theme-secondary uppercase tracking-wider block">
                                            Detected Columns & Mappings
                                        </label>
                                        <div className="max-h-[180px] overflow-y-auto space-y-1.5 border border-theme-border rounded-xl p-3 bg-theme-input/20">
                                            {analyticsResult.columns.map((col: any, idx: number) => (
                                                <div key={idx} className="flex justify-between items-center text-[11px] p-2 bg-theme-card border border-theme-border/60 rounded-lg">
                                                    <div>
                                                        <span className="font-bold text-theme-primary block">{col.header}</span>
                                                        <span className="text-[10px] text-theme-muted">Sample: "{col.sampleValue || "N/A"}"</span>
                                                    </div>
                                                    <div className="text-right">
                                                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase ${
                                                            col.suggestedMapping === "unsupported"
                                                                ? "bg-neutral-500/10 text-neutral-500 border border-neutral-500/20"
                                                                : "bg-green-500/10 text-green-600 border border-green-500/20"
                                                        }`}>
                                                            {col.suggestedMapping}
                                                        </span>
                                                        {col.warning && <span className="block text-[9px] text-amber-500 mt-0.5">{col.warning}</span>}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Rows matching & selection list */}
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-theme-secondary uppercase tracking-wider block">
                                            Select Row / Article to Import ({analyticsResult.rows.length} rows)
                                        </label>
                                        <div className="space-y-2 max-h-[220px] overflow-y-auto">
                                            {analyticsResult.rows.map((row: any, idx: number) => {
                                                const matched = row.matchedProject;
                                                const isSelected = selectedRowIndex === idx;
                                                const isSummaryRow = row.rowType === "summary";
                                                const isGroupOverviewRow = row.rowType === "facebook_group_overview";

                                                // Color styling for badges
                                                let badgeClass = "bg-neutral-500/10 text-neutral-500 border border-neutral-500/20";
                                                let badgeLabel = "Unknown";
                                                if (row.rowType === "facebook_post") {
                                                    badgeClass = "bg-green-500/10 text-green-600 border border-green-500/20";
                                                    badgeLabel = "Post";
                                                } else if (row.rowType === "facebook_group_overview") {
                                                    badgeClass = "bg-blue-500/10 text-blue-600 border border-blue-500/20";
                                                    badgeLabel = "Group Overview";
                                                } else if (isSummaryRow) {
                                                    badgeClass = "bg-amber-500/10 text-amber-600 border border-amber-500/20";
                                                    badgeLabel = "Summary";
                                                }

                                                return (
                                                    <div 
                                                        key={idx}
                                                        onClick={() => {
                                                            setSelectedRowIndex(idx);
                                                            setManualProjectId("");
                                                        }}
                                                        className={`p-3 border rounded-2xl text-xs cursor-pointer transition-all flex flex-col gap-2 ${
                                                            isSummaryRow 
                                                                ? "opacity-55 bg-neutral-100 dark:bg-neutral-900/40 border-neutral-200 dark:border-neutral-800"
                                                                : isSelected
                                                                    ? "bg-blue-500/5 border-blue-600 text-theme-primary font-bold shadow-sm"
                                                                    : "bg-theme-card border-theme-border hover:border-theme-border/80 text-theme-secondary"
                                                        }`}
                                                    >
                                                        <div className="flex justify-between items-start gap-3 w-full">
                                                            <div className="space-y-1 shrink-0 max-w-[65%]">
                                                                <div className="font-semibold truncate">Row {idx + 1}: {row.rawLine.substring(0, 80)}</div>
                                                                <div className="text-[10px] text-theme-muted">
                                                                    {Object.keys(row.extractedData).map(k => `${k}: ${row.extractedData[k]}`).join(" | ")}
                                                                </div>
                                                            </div>
                                                            <div className="text-right flex flex-col items-end gap-1">
                                                                <span className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase ${badgeClass}`}>
                                                                    {badgeLabel}
                                                                </span>
                                                                {matched ? (
                                                                    <>
                                                                        <span className="font-bold text-theme-primary truncate max-w-[120px] block">{matched.title}</span>
                                                                        <span className="text-[9px] px-1 bg-green-500/10 border border-green-500/20 text-green-600 rounded">
                                                                            Match: {matched.method} ({matched.confidence})
                                                                        </span>
                                                                    </>
                                                                ) : isSummaryRow ? (
                                                                    <span className="text-[9px] text-amber-500 font-bold">
                                                                        ⚠️ แถวสรุปผลรวม (ห้ามนำเข้า)
                                                                    </span>
                                                                ) : (
                                                                    <span className="text-[9px] px-1 bg-red-500/10 border border-red-500/20 text-red-600 rounded font-black">
                                                                        ⚠️ No Match (โปรดเลือกระบุโปรเจกต์เองด้านบน)
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>

                                                        {isGroupOverviewRow && (
                                                            <div className="px-2.5 py-1 bg-blue-500/10 text-blue-700 dark:text-blue-400 rounded-lg text-[10px] font-bold">
                                                                This appears to be group-level insight, not post-level performance. Manual target selection is required.
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* Generate package button */}
                                    <button
                                        onClick={handleGenerateAnalyticsPayload}
                                        className="w-full py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-2xl text-xs font-black transition-all flex items-center justify-center gap-1.5 shadow-md shadow-green-600/15"
                                    >
                                        <CheckCircleIcon className="w-4 h-4" />
                                        Generate Snapshot Update Package
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

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
                                {parsedPayload?.schemaVersion === "workos-writing-lab-update-v0.1" ? "Confirm Apply Updates" : "Confirm Import"}
                            </button>
                        )}
                    </div>

                    {!preview ? (
                        <div className="py-20 flex flex-col items-center justify-center text-theme-muted italic text-xs font-bold gap-3">
                            <DocumentTextIcon className="w-12 h-12 text-theme-border" />
                            กด Parse & Validate เพื่อดูตัวอย่างข้อมูลนำเข้าที่นี่
                        </div>
                    ) : (preview as any).schemaType === "writing_lab_update" ? (
                        <div className="space-y-6 max-h-[600px] overflow-y-auto pr-1 custom-scrollbar">
                            {/* Target Project Box */}
                            <div className="p-4 bg-blue-500/5 border border-blue-500/10 rounded-2xl space-y-2">
                                <h3 className="text-xs font-black uppercase text-blue-600 dark:text-blue-400 tracking-wider">
                                    Target Writing Project
                                </h3>
                                <div className="text-xs space-y-1">
                                    <div><span className="font-bold text-theme-muted">Title:</span> <span className="font-black text-theme-primary">{(preview as any).targetProject?.title || "Not Found"}</span></div>
                                    <div><span className="font-bold text-theme-muted">Slug:</span> <span className="font-bold text-theme-secondary">{(preview as any).targetProject?.slug || "N/A"}</span></div>
                                    <div><span className="font-bold text-theme-muted">ID:</span> <code className="text-[10px] bg-theme-input px-1 py-0.5 rounded text-theme-secondary">{(preview as any).targetProject?.id || "N/A"}</code></div>
                                </div>
                            </div>

                            {/* Duplicate Snapshot Overwrite Warnings */}
                            {warnings.some(w => w.includes("Snapshot สำหรับช่วงเวลา")) && (
                                <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl space-y-1 text-xs text-amber-700 dark:text-amber-400 font-bold">
                                    <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
                                        <ExclamationTriangleIcon className="w-5 h-5 shrink-0" />
                                        <span>คำเตือน: พบการเขียนทับ Snapshot เดิม</span>
                                    </div>
                                    <p className="text-[11px] font-medium leading-relaxed mt-1">
                                        ข้อมูลสถิติ Snapshot สำหรับแพลตฟอร์มและรอบเวลานี้มีข้อมูลในระบบอยู่ก่อนแล้ว การกดยืนยันปุ่มเขียวด้านบนจะเขียนทับข้อมูลชุดเดิมด้วยค่าสถิติใหม่นี้ทันที!
                                    </p>
                                </div>
                            )}

                            {/* Update Groups */}
                            {Object.keys((preview as any).groups).map((groupKey) => {
                                const groupItems = (preview as any).groups[groupKey];
                                if (!groupItems || groupItems.length === 0) return null;

                                return (
                                    <div key={groupKey} className="space-y-2.5">
                                        <h3 className="text-xs font-black uppercase text-theme-muted tracking-wider border-b border-theme-border/40 pb-1 flex justify-between items-center">
                                            <span>Group: {groupKey.toUpperCase()}</span>
                                            <span className="text-[10px] text-theme-muted font-bold">{groupItems.length} fields</span>
                                        </h3>
                                        
                                        <div className="space-y-2">
                                            {groupItems.map((item: any, idx: number) => (
                                                <div key={idx} className="p-3.5 bg-theme-input/40 border border-theme-border rounded-2xl text-xs space-y-2">
                                                    <div className="flex items-center justify-between">
                                                        <span className="font-black text-theme-primary">{item.key}</span>
                                                        <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${
                                                            item.impact === "overwrite_warning" 
                                                                ? "bg-amber-500/10 text-amber-600 border border-amber-500/20" 
                                                                : item.impact === "empty_to_filled"
                                                                ? "bg-green-500/10 text-green-600 border border-green-500/20"
                                                                : "bg-neutral-500/10 text-neutral-500 border border-neutral-500/20"
                                                        }`}>
                                                            {item.impact === "overwrite_warning" ? "⚠️ Overwrites content" : item.impact === "empty_to_filled" ? "+ Adds new value" : "Unchanged"}
                                                        </span>
                                                    </div>
                                                    
                                                    <div className="grid grid-cols-2 gap-3 text-[10px] leading-relaxed">
                                                        <div className="bg-red-500/5 p-2 rounded-xl border border-red-500/10">
                                                            <div className="font-bold text-red-500 uppercase text-[8px] tracking-wider mb-1">Old Value</div>
                                                            <div className="font-medium text-theme-secondary break-words line-clamp-3" title={item.prev}>
                                                                {item.prev || <span className="italic opacity-60">(Empty)</span>}
                                                            </div>
                                                        </div>
                                                        <div className="bg-green-500/5 p-2 rounded-xl border border-green-500/10">
                                                            <div className="font-bold text-green-600 uppercase text-[8px] tracking-wider mb-1">Proposed Value</div>
                                                            <div className="font-black text-theme-primary break-words line-clamp-3" title={item.new}>
                                                                {item.new || <span className="italic opacity-60">(Empty)</span>}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}
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
                                            {log.schemaVersion === "workos-writing-lab-update-v0.1" ? (
                                                <span className="text-indigo-600 dark:text-indigo-400" title="Fields Updated">
                                                    Updated: {(log.summary as any).fieldsUpdated || 0} fields
                                                </span>
                                            ) : (
                                                <>
                                                    <span className="text-blue-600 dark:text-blue-400" title="Projects">{log.summary.projectsCreated}</span>
                                                    <span className="text-theme-muted mx-1">/</span>
                                                    <span className="text-teal-600 dark:text-teal-400" title="Notes">{log.summary.notesCreated}</span>
                                                    <span className="text-theme-muted mx-1">/</span>
                                                    <span className="text-purple-600 dark:text-purple-400" title="Tasks">{log.summary.tasksCreated}</span>
                                                    <span className="text-theme-muted mx-1">/</span>
                                                    <span className="text-amber-600 dark:text-amber-400" title="Article Notes">{log.summary.articleNotesCreated}</span>
                                                </>
                                            )}
                                        </td>
                                        <td className="py-3.5 px-4 text-theme-muted font-semibold max-w-xs truncate" title={log.summary.errors?.join(", ") || ""}>
                                            {log.schemaVersion === "workos-writing-lab-update-v0.1" ? (
                                                <span>Target: {(log.summary as any).targetProject || "N/A"}</span>
                                            ) : (
                                                <>
                                                    {log.summary.skipped > 0 && `Skipped Project: ${log.summary.skipped}`}
                                                    {log.summary.errors && log.summary.errors.length > 0 && (
                                                        <span className="text-red-500 font-bold block truncate">
                                                            Errors: {log.summary.errors.join("; ")}
                                                        </span>
                                                    )}
                                                    {log.summary.skipped === 0 && (!log.summary.errors || log.summary.errors.length === 0) && "-"}
                                                </>
                                            )}
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
