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
import { parseAnalyticsData, generateSnapshotPayload, parseGA4BackfillData, parseLegacyRegistryData } from "@/lib/analyticsParser";

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
    const [importMode, setImportMode] = useState<"json" | "markdown" | "analytics" | "manual_snapshot" | "screenshot" | "ga4_backfill" | "legacy_registry">("json");
    const [legacyRawText, setLegacyRawText] = useState("");
    const [legacyResult, setLegacyResult] = useState<any>(null);
    const [showExcludedLegacy, setShowExcludedLegacy] = useState(false);
    const [batchLegacyProgress, setBatchLegacyProgress] = useState<{ current: number; total: number; active: boolean; log: string[] } | null>(null);
    const [markdownText, setMarkdownText] = useState("");
    const [parsedResult, setParsedResult] = useState<any>(null);
    const [writingProjects, setWritingProjects] = useState<any[]>([]);
    const [selectedProjectId, setSelectedProjectId] = useState<string>("");
    const [manualProjectId, setManualProjectId] = useState<string>("");

    // Screenshot Snapshot states
    const [screenshotPreviewUrl, setScreenshotPreviewUrl] = useState("");
    const [screenshotType, setScreenshotType] = useState("facebook_page_post");
    const [ssProjectId, setSsProjectId] = useState("");
    const [ssWindow, setSsWindow] = useState("24h");
    const [ssDate, setSsDate] = useState(() => new Date().toISOString().split("T")[0]);
    const [ssPublishedDate, setSsPublishedDate] = useState("");
    const [ssImportNote, setSsImportNote] = useState("");
    const [ssAnalyzing, setSsAnalyzing] = useState(false);
    // GA4 fields
    const [ssGa4Title, setSsGa4Title] = useState("");
    const [ssGa4Path, setSsGa4Path] = useState("");
    const [ssGa4Views, setSsGa4Views] = useState("");
    const [ssGa4Users, setSsGa4Users] = useState("");
    const [ssGa4EngTime, setSsGa4EngTime] = useState("");
    const [ssGa4Events, setSsGa4Events] = useState("");
    const [ssGa4Bounce, setSsGa4Bounce] = useState("");
    const [ssGa4SrcMed, setSsGa4SrcMed] = useState("");
    // Facebook fields
    const [ssFbTitle, setSsFbTitle] = useState("");
    const [ssFbUrl, setSsFbUrl] = useState("");
    const [ssFbViewsReach, setSsFbViewsReach] = useState("");
    const [ssFbEngagement, setSsFbEngagement] = useState("");
    const [ssFbReactions, setSsFbReactions] = useState("");
    const [ssFbComments, setSsFbComments] = useState("");
    const [ssFbShares, setSsFbShares] = useState("");
    const [ssFbClicks, setSsFbClicks] = useState("");
    const [ssFbPhotoViews, setSsFbPhotoViews] = useState("");
    const [ssFbOtherClicks, setSsFbOtherClicks] = useState("");

    // Manual Quick Post Snapshot states
    const [quickProjectId, setQuickProjectId] = useState("");
    const [quickSourceType, setQuickSourceType] = useState("Facebook Page");
    const [quickWindow, setQuickWindow] = useState("24h");
    const [quickDate, setQuickDate] = useState(() => new Date().toISOString().split("T")[0]);
    const [quickViewsReach, setQuickViewsReach] = useState("");
    const [quickPostTitle, setQuickPostTitle] = useState("");
    const [quickPostUrl, setQuickPostUrl] = useState("");
    const [quickPublishedDate, setQuickPublishedDate] = useState("");
    const [quickEngagement, setQuickEngagement] = useState("");
    const [quickReactions, setQuickReactions] = useState("");
    const [quickComments, setQuickComments] = useState("");
    const [quickShares, setQuickShares] = useState("");
    const [quickLinkClicks, setQuickLinkClicks] = useState("");
    const [quickPhotoViews, setQuickPhotoViews] = useState("");
    const [quickOtherClicks, setQuickOtherClicks] = useState("");
    const [quickNote, setQuickNote] = useState("");

    // GA4 Backfill states
    const [backfillRawText, setBackfillRawText] = useState("");
    const [backfillResult, setBackfillResult] = useState<any>(null);
    const [backfillWindow, setBackfillWindow] = useState("CustomRange");
    const [backfillDate, setBackfillDate] = useState(() => new Date().toISOString().split("T")[0]);
    const [backfillRowMappings, setBackfillRowMappings] = useState<Record<number, string>>({}); // rowIndex -> projectId
    const [showExcludedRows, setShowExcludedRows] = useState(false);
    const [batchApplyProgress, setBatchApplyProgress] = useState<{ current: number; total: number; active: boolean; log: string[] } | null>(null);

    // Analytics import mode states
    const [analyticsText, setAnalyticsText] = useState("");
    const [analyticsWindow, setAnalyticsWindow] = useState("24h");
    const [analyticsSource, setAnalyticsSource] = useState("GA4");
    const [analyticsDate, setAnalyticsDate] = useState(() => new Date().toISOString().split("T")[0]);
    const [analyticsNote, setAnalyticsNote] = useState("");
    const [analyticsResult, setAnalyticsResult] = useState<any>(null);
    const [selectedRowIndex, setSelectedRowIndex] = useState<number>(0);

    // Draft persistence states
    const [restoredModes, setRestoredModes] = useState<string[]>([]);

    // On mount: Restore draft state from localStorage
    useEffect(() => {
        if (typeof window === "undefined") return;

        const restoredList: string[] = [];

        try {
            // Restore active importMode preference
            const savedMode = localStorage.getItem("workos.arborInbox.importMode");
            if (savedMode) {
                setImportMode(savedMode as any);
            }

            // JSON
            const jsonDraft = localStorage.getItem("workos.arborInbox.draft.json");
            if (jsonDraft) {
                const parsed = JSON.parse(jsonDraft);
                if (parsed.payloadText) {
                    setPayloadText(parsed.payloadText);
                    restoredList.push("JSON");
                }
            }

            // Markdown
            const mdDraft = localStorage.getItem("workos.arborInbox.draft.markdown");
            if (mdDraft) {
                const parsed = JSON.parse(mdDraft);
                if (parsed.markdownText) {
                    setMarkdownText(parsed.markdownText);
                    restoredList.push("Markdown");
                }
                if (parsed.selectedProjectId) {
                    setSelectedProjectId(parsed.selectedProjectId);
                }
            }

            // Analytics
            const anDraft = localStorage.getItem("workos.arborInbox.draft.analytics");
            if (anDraft) {
                const parsed = JSON.parse(anDraft);
                if (parsed.analyticsText) {
                    setAnalyticsText(parsed.analyticsText);
                    restoredList.push("Analytics");
                }
                if (parsed.analyticsSource) setAnalyticsSource(parsed.analyticsSource);
                if (parsed.analyticsWindow) setAnalyticsWindow(parsed.analyticsWindow);
                if (parsed.analyticsDate) setAnalyticsDate(parsed.analyticsDate);
                if (parsed.analyticsNote) setAnalyticsNote(parsed.analyticsNote);
                if (parsed.selectedProjectId) setSelectedProjectId(parsed.selectedProjectId);
            }

            // Quick Post Snapshot
            const qDraft = localStorage.getItem("workos.arborInbox.draft.quickSnapshot");
            if (qDraft) {
                const parsed = JSON.parse(qDraft);
                if (parsed.quickPostTitle || parsed.quickPostUrl || parsed.quickViewsReach) {
                    if (parsed.quickProjectId) setQuickProjectId(parsed.quickProjectId);
                    if (parsed.quickSourceType) setQuickSourceType(parsed.quickSourceType);
                    if (parsed.quickWindow) setQuickWindow(parsed.quickWindow);
                    if (parsed.quickDate) setQuickDate(parsed.quickDate);
                    if (parsed.quickViewsReach) setQuickViewsReach(parsed.quickViewsReach);
                    if (parsed.quickPostTitle) setQuickPostTitle(parsed.quickPostTitle);
                    if (parsed.quickPostUrl) setQuickPostUrl(parsed.quickPostUrl);
                    if (parsed.quickPublishedDate) setQuickPublishedDate(parsed.quickPublishedDate);
                    if (parsed.quickEngagement) setQuickEngagement(parsed.quickEngagement);
                    if (parsed.quickReactions) setQuickReactions(parsed.quickReactions);
                    if (parsed.quickComments) setQuickComments(parsed.quickComments);
                    if (parsed.quickShares) setQuickShares(parsed.quickShares);
                    if (parsed.quickLinkClicks) setQuickLinkClicks(parsed.quickLinkClicks);
                    if (parsed.quickPhotoViews) setQuickPhotoViews(parsed.quickPhotoViews);
                    if (parsed.quickOtherClicks) setQuickOtherClicks(parsed.quickOtherClicks);
                    if (parsed.quickNote) setQuickNote(parsed.quickNote);
                    restoredList.push("Quick Snapshot");
                }
            }

            // Screenshot Snapshot
            const ssDraft = localStorage.getItem("workos.arborInbox.draft.screenshot");
            if (ssDraft) {
                const parsed = JSON.parse(ssDraft);
                if (parsed.ssGa4Title || parsed.ssFbTitle || parsed.ssProjectId) {
                    if (parsed.ssProjectId) setSsProjectId(parsed.ssProjectId);
                    if (parsed.screenshotType) setScreenshotType(parsed.screenshotType);
                    if (parsed.ssWindow) setSsWindow(parsed.ssWindow);
                    if (parsed.ssDate) setSsDate(parsed.ssDate);
                    if (parsed.ssPublishedDate) setSsPublishedDate(parsed.ssPublishedDate);
                    if (parsed.ssImportNote) setSsImportNote(parsed.ssImportNote);
                    if (parsed.ssGa4Title) setSsGa4Title(parsed.ssGa4Title);
                    if (parsed.ssGa4Path) setSsGa4Path(parsed.ssGa4Path);
                    if (parsed.ssGa4Views) setSsGa4Views(parsed.ssGa4Views);
                    if (parsed.ssGa4Users) setSsGa4Users(parsed.ssGa4Users);
                    if (parsed.ssGa4EngTime) setSsGa4EngTime(parsed.ssGa4EngTime);
                    if (parsed.ssGa4Events) setSsGa4Events(parsed.ssGa4Events);
                    if (parsed.ssGa4Bounce) setSsGa4Bounce(parsed.ssGa4Bounce);
                    if (parsed.ssGa4SrcMed) setSsGa4SrcMed(parsed.ssGa4SrcMed);
                    if (parsed.ssFbTitle) setSsFbTitle(parsed.ssFbTitle);
                    if (parsed.ssFbUrl) setSsFbUrl(parsed.ssFbUrl);
                    if (parsed.ssFbViewsReach) setSsFbViewsReach(parsed.ssFbViewsReach);
                    if (parsed.ssFbEngagement) setSsFbEngagement(parsed.ssFbEngagement);
                    if (parsed.ssFbReactions) setSsFbReactions(parsed.ssFbReactions);
                    if (parsed.ssFbComments) setSsFbComments(parsed.ssFbComments);
                    if (parsed.ssFbShares) setSsFbShares(parsed.ssFbShares);
                    if (parsed.ssFbClicks) setSsFbClicks(parsed.ssFbClicks);
                    if (parsed.ssFbPhotoViews) setSsFbPhotoViews(parsed.ssFbPhotoViews);
                    if (parsed.ssFbOtherClicks) setSsFbOtherClicks(parsed.ssFbOtherClicks);
                    restoredList.push("Screenshot");
                }
            }

            // GA4 Backfill
            const bfDraft = localStorage.getItem("workos.arborInbox.draft.ga4Backfill");
            if (bfDraft) {
                const parsed = JSON.parse(bfDraft);
                if (parsed.backfillRawText) {
                    setBackfillRawText(parsed.backfillRawText);
                    if (parsed.backfillWindow) setBackfillWindow(parsed.backfillWindow);
                    if (parsed.backfillDate) setBackfillDate(parsed.backfillDate);
                    if (parsed.backfillRowMappings) setBackfillRowMappings(parsed.backfillRowMappings);
                    if (parsed.showExcludedRows !== undefined) setShowExcludedRows(parsed.showExcludedRows);
                    restoredList.push("GA4 Backfill");
                }
            }

            // Legacy Registry
            const lrDraft = localStorage.getItem("workos.arborInbox.draft.legacyRegistry");
            if (lrDraft) {
                const parsed = JSON.parse(lrDraft);
                if (parsed.legacyRawText) {
                    setLegacyRawText(parsed.legacyRawText);
                    if (parsed.showExcludedLegacy !== undefined) setShowExcludedLegacy(parsed.showExcludedLegacy);
                    restoredList.push("Legacy Registry");
                }
            }

            if (restoredList.length > 0) {
                setRestoredModes(restoredList);
            }
        } catch (err) {
            console.error("Failed to restore drafts", err);
        }
    }, []);

    // Auto-save active Import Mode
    useEffect(() => {
        if (typeof window !== "undefined") {
            localStorage.setItem("workos.arborInbox.importMode", importMode);
        }
    }, [importMode]);

    // JSON auto-save
    useEffect(() => {
        if (typeof window !== "undefined") {
            if (payloadText) {
                localStorage.setItem("workos.arborInbox.draft.json", JSON.stringify({ payloadText }));
            } else {
                localStorage.removeItem("workos.arborInbox.draft.json");
            }
        }
    }, [payloadText]);

    // Markdown auto-save
    useEffect(() => {
        if (typeof window !== "undefined") {
            if (markdownText) {
                localStorage.setItem("workos.arborInbox.draft.markdown", JSON.stringify({ markdownText, selectedProjectId }));
            } else {
                localStorage.removeItem("workos.arborInbox.draft.markdown");
            }
        }
    }, [markdownText, selectedProjectId]);

    // Analytics auto-save
    useEffect(() => {
        if (typeof window !== "undefined") {
            if (analyticsText) {
                localStorage.setItem("workos.arborInbox.draft.analytics", JSON.stringify({
                    analyticsText, analyticsSource, analyticsWindow, analyticsDate, analyticsNote, selectedProjectId
                }));
            } else {
                localStorage.removeItem("workos.arborInbox.draft.analytics");
            }
        }
    }, [analyticsText, analyticsSource, analyticsWindow, analyticsDate, analyticsNote, selectedProjectId]);

    // Quick Snapshot auto-save
    useEffect(() => {
        if (typeof window !== "undefined") {
            if (quickPostTitle || quickViewsReach || quickPostUrl) {
                localStorage.setItem("workos.arborInbox.draft.quickSnapshot", JSON.stringify({
                    quickProjectId, quickSourceType, quickWindow, quickDate, quickViewsReach,
                    quickPostTitle, quickPostUrl, quickPublishedDate, quickEngagement,
                    quickReactions, quickComments, quickShares, quickLinkClicks, quickPhotoViews,
                    quickOtherClicks, quickNote
                }));
            } else {
                localStorage.removeItem("workos.arborInbox.draft.quickSnapshot");
            }
        }
    }, [
        quickProjectId, quickSourceType, quickWindow, quickDate, quickViewsReach,
        quickPostTitle, quickPostUrl, quickPublishedDate, quickEngagement,
        quickReactions, quickComments, quickShares, quickLinkClicks, quickPhotoViews,
        quickOtherClicks, quickNote
    ]);

    // Screenshot Snapshot auto-save
    useEffect(() => {
        if (typeof window !== "undefined") {
            if (ssGa4Title || ssFbTitle || ssProjectId) {
                localStorage.setItem("workos.arborInbox.draft.screenshot", JSON.stringify({
                    ssProjectId, screenshotType, ssWindow, ssDate, ssPublishedDate, ssImportNote,
                    ssGa4Title, ssGa4Path, ssGa4Views, ssGa4Users, ssGa4EngTime, ssGa4Events, ssGa4Bounce, ssGa4SrcMed,
                    ssFbTitle, ssFbUrl, ssFbViewsReach, ssFbEngagement, ssFbReactions, ssFbComments, ssFbShares,
                    ssFbClicks, ssFbPhotoViews, ssFbOtherClicks
                }));
            } else {
                localStorage.removeItem("workos.arborInbox.draft.screenshot");
            }
        }
    }, [
        ssProjectId, screenshotType, ssWindow, ssDate, ssPublishedDate, ssImportNote,
        ssGa4Title, ssGa4Path, ssGa4Views, ssGa4Users, ssGa4EngTime, ssGa4Events, ssGa4Bounce, ssGa4SrcMed,
        ssFbTitle, ssFbUrl, ssFbViewsReach, ssFbEngagement, ssFbReactions, ssFbComments, ssFbShares,
        ssFbClicks, ssFbPhotoViews, ssFbOtherClicks
    ]);

    // GA4 Backfill auto-save
    useEffect(() => {
        if (typeof window !== "undefined") {
            if (backfillRawText) {
                localStorage.setItem("workos.arborInbox.draft.ga4Backfill", JSON.stringify({
                    backfillRawText, backfillWindow, backfillDate, backfillRowMappings, showExcludedRows
                }));
            } else {
                localStorage.removeItem("workos.arborInbox.draft.ga4Backfill");
            }
        }
    }, [backfillRawText, backfillWindow, backfillDate, backfillRowMappings, showExcludedRows]);

    // Legacy Registry auto-save
    useEffect(() => {
        if (typeof window !== "undefined") {
            if (legacyRawText) {
                localStorage.setItem("workos.arborInbox.draft.legacyRegistry", JSON.stringify({
                    legacyRawText, showExcludedLegacy
                }));
            } else {
                localStorage.removeItem("workos.arborInbox.draft.legacyRegistry");
            }
        }
    }, [legacyRawText, showExcludedLegacy]);

    const handleClearActiveDraft = () => {
        const confirmClear = window.confirm(`คุณต้องการล้างข้อมูลร่าง (Draft) สำหรับโหมดนำเข้า "${importMode}" ใช่หรือไม่?`);
        if (!confirmClear) return;

        if (importMode === "json") {
            setPayloadText("");
            localStorage.removeItem("workos.arborInbox.draft.json");
        } else if (importMode === "markdown") {
            setMarkdownText("");
            setSelectedProjectId("");
            setParsedResult(null);
            localStorage.removeItem("workos.arborInbox.draft.markdown");
        } else if (importMode === "analytics") {
            setAnalyticsText("");
            setAnalyticsNote("");
            setAnalyticsResult(null);
            setSelectedProjectId("");
            localStorage.removeItem("workos.arborInbox.draft.analytics");
        } else if (importMode === "manual_snapshot") {
            setQuickProjectId("");
            setQuickSourceType("Facebook Page");
            setQuickWindow("24h");
            setQuickDate(new Date().toISOString().split("T")[0]);
            setQuickViewsReach("");
            setQuickPostTitle("");
            setQuickPostUrl("");
            setQuickPublishedDate("");
            setQuickEngagement("");
            setQuickReactions("");
            setQuickComments("");
            setQuickShares("");
            setQuickLinkClicks("");
            setQuickPhotoViews("");
            setQuickOtherClicks("");
            setQuickNote("");
            localStorage.removeItem("workos.arborInbox.draft.quickSnapshot");
        } else if (importMode === "screenshot") {
            setSsProjectId("");
            setScreenshotType("facebook_page_post");
            setSsWindow("24h");
            setSsDate(new Date().toISOString().split("T")[0]);
            setSsPublishedDate("");
            setSsImportNote("");
            setSsGa4Title("");
            setSsGa4Path("");
            setSsGa4Views("");
            setSsGa4Users("");
            setSsGa4EngTime("");
            setSsGa4Events("");
            setSsGa4Bounce("");
            setSsGa4SrcMed("");
            setSsFbTitle("");
            setSsFbUrl("");
            setSsFbViewsReach("");
            setSsFbEngagement("");
            setSsFbReactions("");
            setSsFbComments("");
            setSsFbShares("");
            setSsFbClicks("");
            setSsFbPhotoViews("");
            setSsFbOtherClicks("");
            setScreenshotPreviewUrl("");
            localStorage.removeItem("workos.arborInbox.draft.screenshot");
        } else if (importMode === "ga4_backfill") {
            setBackfillRawText("");
            setBackfillResult(null);
            setBackfillRowMappings({});
            localStorage.removeItem("workos.arborInbox.draft.ga4Backfill");
        } else if (importMode === "legacy_registry") {
            setLegacyRawText("");
            setLegacyResult(null);
            localStorage.removeItem("workos.arborInbox.draft.legacyRegistry");
        }

        // Remove from restored list if present
        setRestoredModes(prev => prev.filter(m => {
            if (importMode === "json" && m === "JSON") return false;
            if (importMode === "markdown" && m === "Markdown") return false;
            if (importMode === "analytics" && m === "Analytics") return false;
            if (importMode === "manual_snapshot" && m === "Quick Snapshot") return false;
            if (importMode === "screenshot" && m === "Screenshot") return false;
            if (importMode === "ga4_backfill" && m === "GA4 Backfill") return false;
            if (importMode === "legacy_registry" && m === "Legacy Registry") return false;
            return true;
        }));

        setStatusMessage({
            type: "success",
            text: `ล้างข้อมูลร่างโหมด "${importMode}" เรียบร้อยแล้ว`
        });
    };

    const handleReParseDraft = () => {
        if (importMode === "json") {
            if (payloadText.trim()) {
                handleValidate(payloadText);
                setStatusMessage({ type: "success", text: "ตรวจวิเคราะห์ข้อมูล JSON เรียบร้อย" });
            } else {
                setStatusMessage({ type: "error", text: "ไม่มีข้อความ JSON ให้แสกน" });
            }
        } else if (importMode === "markdown") {
            if (markdownText.trim()) {
                handleParseMarkdown(markdownText);
                setStatusMessage({ type: "success", text: "วิเคราะห์ข้อมูลร่างบทความเรียบร้อย" });
            } else {
                setStatusMessage({ type: "error", text: "ไม่มีข้อมูลร่างบทความ Markdown ให้แสกน" });
            }
        } else if (importMode === "analytics") {
            if (analyticsText.trim()) {
                handleParseAnalytics(analyticsText);
                setStatusMessage({ type: "success", text: "วิเคราะห์ข้อมูลสถิติ CSV/Table เรียบร้อย" });
            } else {
                setStatusMessage({ type: "error", text: "ไม่มีข้อมูลสถิติ CSV/Table ให้แสกน" });
            }
        } else if (importMode === "ga4_backfill") {
            if (backfillRawText.trim()) {
                handleParseGA4Backfill(backfillRawText);
                setStatusMessage({ type: "success", text: "วิเคราะห์ตารางรายงานบทความ GA4 เรียบร้อย" });
            } else {
                setStatusMessage({ type: "error", text: "ไม่มีข้อมูลรายงาน GA4 ให้แสกน" });
            }
        } else if (importMode === "legacy_registry") {
            if (legacyRawText.trim()) {
                handleParseLegacyRegistry(legacyRawText);
                setStatusMessage({ type: "success", text: "วิเคราะห์รายการบทความเก่าเรียบร้อย" });
            } else {
                setStatusMessage({ type: "error", text: "ไม่มีข้อมูลรายการบทความเก่าให้แสกน" });
            }
        } else {
            setStatusMessage({
                type: "success",
                text: "โหมดนี้ไม่มีขั้นตอน re-parse"
            });
        }
    };

    const handleParseLegacyRegistry = (textToParse: string) => {
        if (!textToParse.trim()) return;
        const result = parseLegacyRegistryData(textToParse, writingProjects);
        setLegacyResult(result);
        setStatusMessage({
            type: "success",
            text: `สแกนพบแถวบทความเก่า ${result.rows.length} รายการ (พร้อมนำเข้า: ${result.rows.filter(r => r.suggestedAction === "Create Shell").length} รายการ)`
        });
    };

    const handleCreateLegacyShell = async (row: any) => {
        if (row.suggestedAction === "Already exists") {
            setStatusMessage({ type: "error", text: "บทความนี้มีอยู่ในระบบแล้ว" });
            return false;
        }

        setLoading(true);
        setStatusMessage(null);

        const notesObj = {
            legacySource: true,
            migrationStatus: "shell_created",
            sourceLocation: "website",
            originalSlug: row.slug,
            originalPublishedUrl: row.publishedUrl,
            bodyMigrationStatus: "not_migrated",
            published_url: row.publishedUrl,
            performanceFeedback: {
                publishingRecord: {
                    publishedUrl: row.publishedUrl,
                    publishedDate: row.publishedDate || new Date().toISOString().split("T")[0]
                }
            }
        };

        const postBody: Record<string, any> = {
            title: row.title,
            slug: row.slug,
            writing_mode: "knowledge_article",
            status: "legacy_published",
            notes: JSON.stringify(notesObj)
        };

        if (row.contentType === "knowledge") {
            postBody.knowledge_title = row.title;
            postBody.knowledge_slug = row.slug;
            postBody.knowledge_status = "legacy_published";
        } else if (row.contentType === "narrative") {
            postBody.narrative_title = row.title;
            postBody.narrative_slug = row.slug;
            postBody.narrative_status = "legacy_published";
        } else {
            postBody.knowledge_title = row.title;
            postBody.knowledge_slug = row.slug;
            postBody.knowledge_status = "legacy_published";
        }

        try {
            const res = await fetch("/api/content/writing-lab/projects", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(postBody)
            });

            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || "Failed to create legacy shell project");
            }

            const updatedProjects = await fetch("/api/content/writing-lab/projects").then(r => r.json());
            if (Array.isArray(updatedProjects)) {
                setWritingProjects(updatedProjects);
            }

            setLegacyResult((prev: any) => {
                if (!prev) return null;
                const nextRows = prev.rows.map((r: any) => {
                    if (r.index === row.index) {
                        return {
                            ...r,
                            suggestedAction: "Already exists",
                            matchedProjectId: data.id
                        };
                    }
                    return r;
                });
                const remaining = nextRows.filter((r: any) => r.suggestedAction === "Create Shell").length;
                if (remaining === 0) {
                    setLegacyRawText("");
                    if (typeof window !== "undefined") {
                        localStorage.removeItem("workos.arborInbox.draft.legacyRegistry");
                    }
                }
                return {
                    ...prev,
                    rows: nextRows
                };
            });

            setStatusMessage({
                type: "success",
                text: `สร้าง Shell Project สำหรับ "${row.title}" สำเร็จ! ID: ${data.id}`
            });
            return true;
        } catch (err: any) {
            setStatusMessage({
                type: "error",
                text: `เกิดข้อผิดพลาดในการสร้าง Shell: ${err.message}`
            });
            return false;
        } finally {
            setLoading(false);
        }
    };

    const handleBatchCreateLegacyShells = async () => {
        if (!legacyResult || legacyResult.rows.length === 0) return;

        const rowsToCreate = legacyResult.rows.filter((row: any) => row.suggestedAction === "Create Shell");
        if (rowsToCreate.length === 0) {
            setStatusMessage({
                type: "error",
                text: "ไม่มีบทความสถานะ Create Shell ในขณะนี้"
            });
            return;
        }

        setBatchLegacyProgress({
            current: 0,
            total: rowsToCreate.length,
            active: true,
            log: ["เริ่มการสร้าง Shell Projects แบบกลุ่ม..."]
        });

        setStatusMessage(null);
        let successCount = 0;
        let failCount = 0;

        for (let i = 0; i < rowsToCreate.length; i++) {
            const row = rowsToCreate[i];
            
            const notesObj = {
                legacySource: true,
                migrationStatus: "shell_created",
                sourceLocation: "website",
                originalSlug: row.slug,
                originalPublishedUrl: row.publishedUrl,
                bodyMigrationStatus: "not_migrated",
                published_url: row.publishedUrl,
                performanceFeedback: {
                    publishingRecord: {
                        publishedUrl: row.publishedUrl,
                        publishedDate: row.publishedDate || new Date().toISOString().split("T")[0]
                    }
                }
            };

            const postBody: Record<string, any> = {
                title: row.title,
                slug: row.slug,
                writing_mode: "knowledge_article",
                status: "legacy_published",
                notes: JSON.stringify(notesObj)
            };

            if (row.contentType === "knowledge") {
                postBody.knowledge_title = row.title;
                postBody.knowledge_slug = row.slug;
                postBody.knowledge_status = "legacy_published";
            } else if (row.contentType === "narrative") {
                postBody.narrative_title = row.title;
                postBody.narrative_slug = row.slug;
                postBody.narrative_status = "legacy_published";
            } else {
                postBody.knowledge_title = row.title;
                postBody.knowledge_slug = row.slug;
                postBody.knowledge_status = "legacy_published";
            }

            try {
                const res = await fetch("/api/content/writing-lab/projects", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(postBody)
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error || "Failed");

                successCount++;
                setBatchLegacyProgress(prev => prev ? {
                    ...prev,
                    current: i + 1,
                    log: [...prev.log, `✅ สร้าง Shell "${row.title}" สำเร็จ`]
                } : null);

                setLegacyResult((prev: any) => {
                    if (!prev) return null;
                    return {
                        ...prev,
                        rows: prev.rows.map((r: any) => {
                            if (r.index === row.index) {
                                return {
                                    ...r,
                                    suggestedAction: "Already exists",
                                    matchedProjectId: data.id
                                };
                            }
                            return r;
                        })
                    };
                });
            } catch (err: any) {
                failCount++;
                setBatchLegacyProgress(prev => prev ? {
                    ...prev,
                    current: i + 1,
                    log: [...prev.log, `❌ สร้าง Shell "${row.title}" ล้มเหลว (${err.message})`]
                } : null);
            }
        }

        setBatchLegacyProgress(prev => prev ? {
            ...prev,
            active: false,
            log: [...prev.log, `🎉 เสร็จสิ้นการสร้างแบบกลุ่ม: สำเร็จ ${successCount} รายการ, ล้มเหลว ${failCount} รายการ`]
        } : null);

        const updatedProjects = await fetch("/api/content/writing-lab/projects").then(r => r.json());
        if (Array.isArray(updatedProjects)) {
            setWritingProjects(updatedProjects);
        }

        setStatusMessage({
            type: successCount > 0 ? "success" : "error",
            text: `ดำเนินการสร้าง Shell สำเร็จ ${successCount} รายการ, ล้มเหลว ${failCount} รายการ`
        });

        if (successCount === rowsToCreate.length) {
            setLegacyRawText("");
            setLegacyResult(null);
            if (typeof window !== "undefined") {
                localStorage.removeItem("workos.arborInbox.draft.legacyRegistry");
            }
            setRestoredModes(prev => prev.filter(m => m !== "Legacy Registry"));
        }
    };

    const handleParseGA4Backfill = (textToParse: string) => {
        if (!textToParse.trim()) return;
        const result = parseGA4BackfillData(textToParse, writingProjects);
        setBackfillResult(result);
        if (result.snapshotDate) {
            setBackfillDate(result.snapshotDate);
        }
        
        // Setup initial mappings
        const initialMappings: Record<number, string> = {};
        result.rows.forEach(row => {
            if (row.matchedProject?.id) {
                initialMappings[row.index] = row.matchedProject.id;
            }
        });
        setBackfillRowMappings(initialMappings);
        setStatusMessage({
            type: "success",
            text: `สแกนพบแถวข้อมูล ${result.rows.length} แถว (ตรวจพบช่วงเวลาสถิติ: ${result.dateRangeStart || "ไม่ระบุ"} ถึง ${result.dateRangeEnd || "ไม่ระบุ"})`
        });
    };

    const handleGenerateBackfillRowPayload = (row: any, overrideProjectId?: string) => {
        setStatusMessage(null);
        
        const finalProjectId = overrideProjectId || backfillRowMappings[row.index] || row.matchedProject?.id;
        if (!finalProjectId) {
            setStatusMessage({
                type: "error",
                text: `กรุณาระบุ Target Writing Project สำหรับหน้า "${row.pageTitle || row.pagePath}"`
            });
            return null;
        }

        const matched = writingProjects.find(p => p.id === finalProjectId);
        if (!matched) {
            setStatusMessage({ type: "error", text: "ไม่พบโครงการเป้าหมายในระบบ" });
            return null;
        }

        const windowKey = `snap${backfillWindow}`;
        
        const sourceMetadata = {
            sourceFileName: "GA4 Sheet Backfill",
            sourceType: "ga4_article",
            snapshotWindow: backfillWindow,
            snapshotDate: backfillDate,
            matchedBy: overrideProjectId ? "manual" : (row.matchedProject?.method || "manual"),
            matchConfidence: overrideProjectId ? "Manual" : (row.matchedProject?.confidence || "Manual"),
            rowType: "ga4_backfill_row",
            importMethod: "ga4_sheet_backfill",
            dateRangeStart: backfillResult?.dateRangeStart || "",
            dateRangeEnd: backfillResult?.dateRangeEnd || "",
            rawSourceSummary: `GA4 Backfill Row: Views=${row.views}, Users=${row.activeUsers}, Events=${row.eventCount}`,
            importNote: `GA4 backfill import for range ${backfillResult?.dateRangeStart || ""} - ${backfillResult?.dateRangeEnd || ""}`
        };

        const ga4Snapshots = {
            [windowKey]: {
                snapshotDate: backfillDate,
                window: backfillWindow,
                publishedUrl: row.pagePath || "",
                pageTitle: row.pageTitle || "",
                views: row.views,
                activeUsers: row.activeUsers,
                events: row.eventCount,
                averageEngagementTime: row.averageEngagementTime,
                bounceRate: row.bounceRate || "",
                sourceMedium: row.sourceMedium || "",
                notes: `GA4 Backfill Range: ${backfillResult?.dateRangeStart || ""} to ${backfillResult?.dateRangeEnd || ""}`
            }
        };

        const payload = {
            schemaVersion: "workos-writing-lab-update-v0.1",
            source: "Arbor",
            importBatchTitle: `GA4 Backfill - ${matched.title} (${backfillWindow})`,
            action: "apply_update",
            target: {
                type: "writing_lab_project",
                projectId: matched.id,
                projectSlug: matched.slug || ""
            },
            fields: {
                performanceFeedback: {
                    ga4Snapshots,
                    sourceMetadata
                }
            }
        };

        return payload;
    };

    const handleBatchApplyBackfill = async () => {
        if (!backfillResult || backfillResult.rows.length === 0) return;

        const rowsToApply = backfillResult.rows.filter((row: any) => {
            const pId = backfillRowMappings[row.index] || row.matchedProject?.id;
            return row.status !== "Excluded" && pId;
        });

        if (rowsToApply.length === 0) {
            setStatusMessage({
                type: "error",
                text: "ไม่มีบทความในสถานะพร้อม (Ready) สำหรับการนำเข้าแบบกลุ่ม"
            });
            return;
        }

        // Show duplicate warnings
        const duplicateRows = rowsToApply.filter((row: any) => {
            const pId = backfillRowMappings[row.index] || row.matchedProject?.id;
            const proj = writingProjects.find(p => p.id === pId);
            if (proj && proj.notes) {
                try {
                    const parsed = JSON.parse(proj.notes);
                    const snapKey = `snap${backfillWindow}`;
                    return !!(parsed?.performanceFeedback?.ga4Snapshots?.[snapKey]);
                } catch {
                    return false;
                }
            }
            return false;
        });

        if (duplicateRows.length > 0) {
            const confirmBatch = window.confirm(
                `คำเตือน: ตรวจพบสถิติซ้ำในรอบช่วงเวลา ${backfillWindow} จำนวน ${duplicateRows.length} รายการ\nการกดดำเนินการต่อจะเขียนทับข้อมูลเดิมที่บันทึกไว้ ท่านต้องการยืนยันการนำเข้าทับข้อมูลหรือไม่?`
            );
            if (!confirmBatch) return;
        }

        setBatchApplyProgress({
            current: 0,
            total: rowsToApply.length,
            active: true,
            log: ["เริ่มการนำเข้าข้อมูลสถิติย้อนหลังแบบกลุ่ม..."]
        });

        setStatusMessage(null);
        let successCount = 0;
        let failCount = 0;

        for (let i = 0; i < rowsToApply.length; i++) {
            const row = rowsToApply[i];
            const pId = backfillRowMappings[row.index] || row.matchedProject?.id;
            const payload = handleGenerateBackfillRowPayload(row, pId);
            const proj = writingProjects.find(p => p.id === pId);

            if (!payload) {
                failCount++;
                setBatchApplyProgress(prev => prev ? {
                    ...prev,
                    current: i + 1,
                    log: [...prev.log, `❌ แถวที่ ${row.index}: ดึงตัวแมตช์ล้มเหลว`]
                } : null);
                continue;
            }

            try {
                const res = await fetch("/api/arbor-inbox", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ action: "apply_update", payload })
                });

                const data = await res.json();
                if (!res.ok) {
                    throw new Error(data.error || "API failure");
                }

                successCount++;
                setBatchApplyProgress(prev => prev ? {
                    ...prev,
                    current: i + 1,
                    log: [...prev.log, `✅ แถวที่ ${row.index}: อัปเดต "${proj?.title || 'N/A'}" สำเร็จ`]
                } : null);
            } catch (err: any) {
                failCount++;
                setBatchApplyProgress(prev => prev ? {
                    ...prev,
                    current: i + 1,
                    log: [...prev.log, `❌ แถวที่ ${row.index}: อัปเดต "${proj?.title || 'N/A'}" ล้มเหลว (${err.message})`]
                } : null);
            }
        }

        setBatchApplyProgress(prev => prev ? {
            ...prev,
            active: false,
            log: [...prev.log, `🎉 นำเข้าเสร็จสิ้น: สำเร็จ ${successCount} รายการ, ล้มเหลว ${failCount} รายการ`]
        } : null);

        // Reload writing projects
        fetch("/api/content/writing-lab/projects")
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data)) setWritingProjects(data);
            });
        
        loadLogs();
        
        if (successCount === rowsToApply.length) {
            setBackfillRawText("");
            setBackfillRowMappings({});
            setBackfillResult(null);
            if (typeof window !== "undefined") {
                localStorage.removeItem("workos.arborInbox.draft.ga4Backfill");
            }
            setRestoredModes(prev => prev.filter(m => m !== "GA4 Backfill"));
        }

        setStatusMessage({
            type: successCount > 0 ? "success" : "error",
            text: `ทำรายการ Backfill สำเร็จ ${successCount} รายการ, ล้มเหลว ${failCount} รายการ`
        });
    };

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

    const handleGenerateQuickSnapshot = () => {
        setStatusMessage(null);

        if (!quickProjectId) {
            setStatusMessage({ type: "error", text: "Target Writing Project is required. (กรุณาเลือกโครงการเขียนร่างเป้าหมาย)" });
            return;
        }
        if (!quickWindow) {
            setStatusMessage({ type: "error", text: "Snapshot Window is required. (กรุณาระบุรอบช่วงเวลาสถิติ)" });
            return;
        }
        if (!quickDate) {
            setStatusMessage({ type: "error", text: "Snapshot Date is required. (กรุณาระบุวันที่บันทึกสถิติ)" });
            return;
        }

        const parseVal = (val: string): number => {
            if (!val.trim()) return 0;
            const parsed = parseInt(val, 10);
            return isNaN(parsed) ? 0 : parsed;
        };

        const reach = parseVal(quickViewsReach);
        const engagement = parseVal(quickEngagement);
        const reactions = parseVal(quickReactions);
        const comments = parseVal(quickComments);
        const shares = parseVal(quickShares);
        const linkClicks = parseVal(quickLinkClicks);
        const photoViews = parseVal(quickPhotoViews);
        const otherClicks = parseVal(quickOtherClicks);

        // Required: at least one metric must be > 0
        if (reach <= 0 && engagement <= 0 && reactions <= 0 && comments <= 0 && shares <= 0 && linkClicks <= 0) {
            setStatusMessage({ type: "error", text: "At least one metric (Views/Reach, Engagement, Reactions, Comments, Shares, or Link Clicks) must be greater than 0. (กรุณากรอกตัวชี้วัดประสิทธิภาพหลักอย่างน้อยหนึ่งฟิลด์)" });
            return;
        }

        // Validate no negative values
        if (reach < 0 || engagement < 0 || reactions < 0 || comments < 0 || shares < 0 || linkClicks < 0 || photoViews < 0 || otherClicks < 0) {
            setStatusMessage({ type: "error", text: "Metrics cannot be negative. (ตัวเลขสถิติตัวชี้วัดห้ามเป็นค่าติดลบ)" });
            return;
        }

        const matched = writingProjects.find(p => p.id === quickProjectId);
        if (!matched) {
            setStatusMessage({ type: "error", text: "Target project not found. (ไม่พบโครงการที่ระบุ)" });
            return;
        }

        let platform = "facebook_page";
        let sourceType = "facebook_page_post";
        if (quickSourceType === "Facebook Group") {
            platform = "facebook_group";
            sourceType = "facebook_group_post";
        } else if (quickSourceType === "Personal Profile") {
            platform = "facebook_personal";
            sourceType = "personal_profile_post";
        }

        const windowKey = `snap${quickWindow}`;

        const facebookSnapshots = {
            [windowKey]: {
                snapshotDate: quickDate,
                window: quickWindow,
                platform,
                postUrl: quickPostUrl || "",
                reach,
                reactions,
                comments,
                shares,
                linkClicks,
                engagement,
                photoViews,
                otherClicks,
                publishedDate: quickPublishedDate || "",
                notes: quickNote || ""
            }
        };

        const rawSummaryParts = [
            `Views/Reach=${reach}`,
            engagement > 0 ? `Engagement=${engagement}` : null,
            reactions > 0 ? `Reactions=${reactions}` : null,
            comments > 0 ? `Comments=${comments}` : null,
            shares > 0 ? `Shares=${shares}` : null,
            linkClicks > 0 ? `LinkClicks=${linkClicks}` : null
        ].filter(Boolean);

        const sourceMetadata = {
            sourceFileName: "Manual Input Form",
            sourceType,
            snapshotWindow: quickWindow,
            snapshotDate: quickDate,
            matchedBy: "manual",
            matchConfidence: "Manual",
            rowType: "manual_post_snapshot",
            rawSourceSummary: `Manual Quick Post: ${rawSummaryParts.join(", ")}`,
            importNote: quickNote || ""
        };

        const generatedPayload = {
            schemaVersion: "workos-writing-lab-update-v0.1",
            source: "Arbor",
            importBatchTitle: `Manual Snapshot - ${quickSourceType} ${quickWindow}`,
            action: "apply_update",
            target: {
                type: "writing_lab_project",
                projectId: matched.id,
                projectSlug: matched.slug
            },
            fields: {
                performanceFeedback: {
                    facebookSnapshots,
                    sourceMetadata
                }
            }
        };

        setPayloadText(JSON.stringify(generatedPayload, null, 2));
        handleValidate(JSON.stringify(generatedPayload));
    };

    const handleScreenshotChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                setScreenshotPreviewUrl(event.target?.result as string);
                handleSimulateScreenshotExtraction(screenshotType);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleScreenshotPaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
        const item = e.clipboardData.items[0];
        if (item && item.type.indexOf("image") !== -1) {
            const file = item.getAsFile();
            if (file) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    setScreenshotPreviewUrl(event.target?.result as string);
                    handleSimulateScreenshotExtraction(screenshotType);
                };
                reader.readAsDataURL(file);
            }
        }
    };

    const handleScreenshotTypeChange = (newType: string) => {
        setScreenshotType(newType);
        // Clear unrelated fields to prevent bleed
        if (newType === "ga4_article") {
            setSsFbTitle("");
            setSsFbUrl("");
            setSsFbViewsReach("");
            setSsFbEngagement("");
            setSsFbReactions("");
            setSsFbComments("");
            setSsFbShares("");
            setSsFbClicks("");
            setSsFbPhotoViews("");
            setSsFbOtherClicks("");
            setSsPublishedDate("");
        } else {
            setSsGa4Title("");
            setSsGa4Path("");
            setSsGa4Views("");
            setSsGa4Users("");
            setSsGa4EngTime("");
            setSsGa4Events("");
            setSsGa4Bounce("");
            setSsGa4SrcMed("");
        }

        if (screenshotPreviewUrl) {
            handleSimulateScreenshotExtraction(newType);
        }
    };

    const handleSimulateScreenshotExtraction = (typeSelected: string) => {
        setSsAnalyzing(true);
        setTimeout(() => {
            if (typeSelected === "ga4_article") {
                setSsGa4Title("EP.10.3 Cytokinin guide - Green Fineness");
                setSsGa4Path("/library/cytokinin-guide");
                setSsGa4Views("350");
                setSsGa4Users("310");
                setSsGa4EngTime("85");
                setSsGa4Events("480");
                setSsGa4Bounce("28.5");
                setSsGa4SrcMed("organic / google");
            } else {
                setSsFbTitle("EP.10.3 Cytokinin - ความสำคัญต่อการเจริญเติบโตของพืช");
                setSsFbUrl("https://facebook.com/posts/cytokinin-103");
                setSsFbViewsReach("227");
                setSsFbEngagement("14");
                setSsFbReactions("11");
                setSsFbComments("0");
                setSsFbShares("3");
                setSsFbClicks("5");
                setSsFbPhotoViews("0");
                setSsFbOtherClicks("0");
                setSsPublishedDate("2026-06-22");
            }
            setSsAnalyzing(false);
            setStatusMessage({
                type: "success",
                text: "วิเคราะห์ภาพสถิติเบื้องต้นสำเร็จ (กรุณาตรวจและแก้ไขค่าด้วยตนเองเพื่อความถูกต้องก่อนนำเข้า)"
            });
        }, 800);
    };

    const handleGenerateScreenshotSnapshot = () => {
        setStatusMessage(null);

        if (!ssProjectId) {
            setStatusMessage({ type: "error", text: "Target Writing Project is required. (กรุณาเลือกโครงการเขียนร่างเป้าหมาย)" });
            return;
        }
        if (!ssWindow) {
            setStatusMessage({ type: "error", text: "Snapshot Window is required. (กรุณาระบุรอบช่วงเวลาสถิติ)" });
            return;
        }
        if (!ssDate) {
            setStatusMessage({ type: "error", text: "Snapshot Date is required. (กรุณาระบุวันที่บันทึกสถิติ)" });
            return;
        }

        const parseVal = (val: string): number => {
            if (!val || !val.trim()) return 0;
            const parsed = parseFloat(val);
            return isNaN(parsed) ? 0 : parsed;
        };

        const matched = writingProjects.find(p => p.id === ssProjectId);
        if (!matched) {
            setStatusMessage({ type: "error", text: "Target project not found. (ไม่พบโครงการที่ระบุ)" });
            return;
        }

        let generatedPayload: any = null;

        if (screenshotType === "ga4_article") {
            const views = parseVal(ssGa4Views);
            const activeUsers = parseVal(ssGa4Users);
            const averageEngagementTime = parseVal(ssGa4EngTime);
            const events = parseVal(ssGa4Events);
            const bounceRate = parseVal(ssGa4Bounce);

            if (views <= 0 && activeUsers <= 0 && events <= 0) {
                setStatusMessage({ type: "error", text: "At least one GA4 metric (Views, Active Users, or Event Count) must be greater than 0. (กรุณากรอกตัวชี้วัดประสิทธิภาพหลักของ GA4 อย่างน้อยหนึ่งฟิลด์ เช่น จำนวนการดู, ผู้ใช้, หรือจำนวนเหตุการณ์)" });
                return;
            }

            if (views < 0 || activeUsers < 0 || averageEngagementTime < 0 || events < 0) {
                setStatusMessage({ type: "error", text: "Metrics cannot be negative. (ตัวเลขสถิติตัวชี้วัดห้ามเป็นค่าติดลบ)" });
                return;
            }

            if (!ssGa4Title.trim() && !ssGa4Path.trim()) {
                setStatusMessage({ type: "error", text: "GA4 snapshots require a page title or path to target a specific article. (กรุณากรอกชื่อหัวข้อหรือที่อยู่ลิงก์บทความ GA4)" });
                return;
            }

            const windowKey = `snap${ssWindow}`;
            const ga4Snapshots = {
                [windowKey]: {
                    snapshotDate: ssDate,
                    window: ssWindow,
                    publishedUrl: ssGa4Path || "",
                    pageTitle: ssGa4Title || "",
                    views,
                    activeUsers,
                    events,
                    averageEngagementTime,
                    bounceRate: ssGa4Bounce || "",
                    sourceMedium: ssGa4SrcMed || "",
                    notes: ssImportNote || ""
                }
            };

            const rawSummaryParts = [
                `Views=${views}`,
                activeUsers > 0 ? `Users=${activeUsers}` : null,
                events > 0 ? `Events=${events}` : null
            ].filter(Boolean);

            const sourceMetadata = {
                sourceFileName: "Screenshot Upload",
                sourceType: "ga4_article",
                snapshotWindow: ssWindow,
                snapshotDate: ssDate,
                matchedBy: "manual",
                matchConfidence: "Manual",
                rowType: "screenshot_snapshot",
                importMethod: "screenshot_assisted",
                rawSourceSummary: `GA4 Screenshot: ${rawSummaryParts.join(", ")}`,
                importNote: ssImportNote || ""
            };

            generatedPayload = {
                schemaVersion: "workos-writing-lab-update-v0.1",
                source: "Arbor",
                importBatchTitle: `Screenshot Snapshot - GA4 ${ssWindow}`,
                action: "apply_update",
                target: {
                    type: "writing_lab_project",
                    projectId: matched.id,
                    projectSlug: matched.slug
                },
                fields: {
                    performanceFeedback: {
                        ga4Snapshots,
                        sourceMetadata
                    }
                }
            };
        } else {
            const reach = parseVal(ssFbViewsReach);
            const engagement = parseVal(ssFbEngagement);
            const reactions = parseVal(ssFbReactions);
            const comments = parseVal(ssFbComments);
            const shares = parseVal(ssFbShares);
            const linkClicks = parseVal(ssFbClicks);
            const photoViews = parseVal(ssFbPhotoViews);
            const otherClicks = parseVal(ssFbOtherClicks);

            if (reach <= 0 && engagement <= 0 && reactions <= 0 && comments <= 0 && shares <= 0 && linkClicks <= 0 && photoViews <= 0 && otherClicks <= 0) {
                setStatusMessage({ type: "error", text: "At least one Facebook metric must be greater than 0. (กรุณากรอกตัวชี้วัดประสิทธิภาพของ Facebook อย่างน้อยหนึ่งฟิลด์)" });
                return;
            }

            if (reach < 0 || engagement < 0 || reactions < 0 || comments < 0 || shares < 0 || linkClicks < 0 || photoViews < 0 || otherClicks < 0) {
                setStatusMessage({ type: "error", text: "Metrics cannot be negative. (ตัวเลขสถิติตัวชี้วัดห้ามเป็นค่าติดลบ)" });
                return;
            }

            let platform = "facebook_page";
            let sourceType = "facebook_page_post";
            if (screenshotType === "facebook_group_post") {
                platform = "facebook_group";
                sourceType = "facebook_group_post";
            } else if (screenshotType === "personal_profile_post") {
                platform = "facebook_personal";
                sourceType = "personal_profile_post";
            }

            const windowKey = `snap${ssWindow}`;
            const facebookSnapshots = {
                [windowKey]: {
                    snapshotDate: ssDate,
                    window: ssWindow,
                    platform,
                    postUrl: ssFbUrl || "",
                    reach,
                    reactions,
                    comments,
                    shares,
                    linkClicks,
                    engagement,
                    photoViews,
                    otherClicks,
                    publishedDate: ssPublishedDate || "",
                    notes: ssImportNote || ""
                }
            };

            const rawSummaryParts = [
                `Views/Reach=${reach}`,
                engagement > 0 ? `Engagement=${engagement}` : null,
                reactions > 0 ? `Reactions=${reactions}` : null,
                comments > 0 ? `Comments=${comments}` : null,
                shares > 0 ? `Shares=${shares}` : null,
                linkClicks > 0 ? `LinkClicks=${linkClicks}` : null
            ].filter(Boolean);

            const sourceMetadata = {
                sourceFileName: "Screenshot Upload",
                sourceType,
                snapshotWindow: ssWindow,
                snapshotDate: ssDate,
                matchedBy: "manual",
                matchConfidence: "Manual",
                rowType: "screenshot_snapshot",
                importMethod: "screenshot_assisted",
                rawSourceSummary: `Facebook Screenshot: ${rawSummaryParts.join(", ")}`,
                importNote: ssImportNote || ""
            };

            generatedPayload = {
                schemaVersion: "workos-writing-lab-update-v0.1",
                source: "Arbor",
                importBatchTitle: `Screenshot Snapshot - Facebook ${ssWindow}`,
                action: "apply_update",
                target: {
                    type: "writing_lab_project",
                    projectId: matched.id,
                    projectSlug: matched.slug
                },
                fields: {
                    performanceFeedback: {
                        facebookSnapshots,
                        sourceMetadata
                    }
                }
            };
        }

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
            
            const fetchedWarnings = data.warnings || [];
            if (parsed && parsed.fields?.performanceFeedback?.sourceMetadata?.rowType === "manual_post_snapshot") {
                const fbSnaps = parsed.fields.performanceFeedback.facebookSnapshots || {};
                const activeWin = Object.keys(fbSnaps)[0];
                if (activeWin && fbSnaps[activeWin]) {
                    const snap = fbSnaps[activeWin];
                    if (!snap.reach || snap.reach <= 0) {
                        fetchedWarnings.push("Views/Reach ว่างหรือเป็น 0 สำหรับการนำเข้ารอบเวลานี้ (Views/Reach is empty or zero for this snapshot)");
                    }
                }
            }

            setWarnings(fetchedWarnings);
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
            
            // Clear current active importMode draft from localStorage and state
            if (importMode === "json") {
                setPayloadText("");
                localStorage.removeItem("workos.arborInbox.draft.json");
            } else if (importMode === "markdown") {
                setMarkdownText("");
                setSelectedProjectId("");
                setParsedResult(null);
                localStorage.removeItem("workos.arborInbox.draft.markdown");
            } else if (importMode === "analytics") {
                setAnalyticsText("");
                setAnalyticsNote("");
                setAnalyticsResult(null);
                setSelectedProjectId("");
                localStorage.removeItem("workos.arborInbox.draft.analytics");
            } else if (importMode === "manual_snapshot") {
                setQuickProjectId("");
                setQuickSourceType("Facebook Page");
                setQuickWindow("24h");
                setQuickDate(new Date().toISOString().split("T")[0]);
                setQuickViewsReach("");
                setQuickPostTitle("");
                setQuickPostUrl("");
                setQuickPublishedDate("");
                setQuickEngagement("");
                setQuickReactions("");
                setQuickComments("");
                setQuickShares("");
                setQuickLinkClicks("");
                setQuickPhotoViews("");
                setQuickOtherClicks("");
                setQuickNote("");
                localStorage.removeItem("workos.arborInbox.draft.quickSnapshot");
            } else if (importMode === "screenshot") {
                setSsProjectId("");
                setScreenshotType("facebook_page_post");
                setSsWindow("24h");
                setSsDate(new Date().toISOString().split("T")[0]);
                setSsPublishedDate("");
                setSsImportNote("");
                setSsGa4Title("");
                setSsGa4Path("");
                setSsGa4Views("");
                setSsGa4Users("");
                setSsGa4EngTime("");
                setSsGa4Events("");
                setSsGa4Bounce("");
                setSsGa4SrcMed("");
                setSsFbTitle("");
                setSsFbUrl("");
                setSsFbViewsReach("");
                setSsFbEngagement("");
                setSsFbReactions("");
                setSsFbComments("");
                setSsFbShares("");
                setSsFbClicks("");
                setSsFbPhotoViews("");
                setSsFbOtherClicks("");
                setScreenshotPreviewUrl("");
                localStorage.removeItem("workos.arborInbox.draft.screenshot");
            }

            // Remove from restored list if present
            setRestoredModes(prev => prev.filter(m => {
                if (importMode === "json" && m === "JSON") return false;
                if (importMode === "markdown" && m === "Markdown") return false;
                if (importMode === "analytics" && m === "Analytics") return false;
                if (importMode === "manual_snapshot" && m === "Quick Snapshot") return false;
                if (importMode === "screenshot" && m === "Screenshot") return false;
                return true;
            }));

            // Reset state
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
        <div className="max-w-[1800px] w-full mx-auto px-6 py-8 min-h-[calc(100vh-64px)] flex flex-col gap-8">
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

            <div className="grid grid-cols-1 xl:grid-cols-[minmax(520px,_1.1fr)_minmax(460px,_0.9fr)] gap-8 items-start">
                {/* Left panel: Input Area */}
                <div className="bg-theme-card border border-theme-border rounded-[32px] p-6 shadow-sm flex flex-col gap-4">
                    <div className="flex flex-wrap bg-theme-input rounded-2xl p-1 border border-theme-border/40 mb-2 gap-1">
                        <button
                            onClick={() => setImportMode("json")}
                            className={`flex-1 min-w-[80px] py-1.5 text-xs font-black rounded-xl transition-all ${
                                importMode === "json"
                                    ? "bg-theme-card text-theme-primary shadow-sm border border-theme-border/10"
                                    : "text-theme-muted hover:text-theme-primary"
                            }`}
                        >
                            JSON Payload
                        </button>
                        <button
                            onClick={() => setImportMode("markdown")}
                            className={`flex-1 min-w-[130px] py-1.5 text-xs font-black rounded-xl transition-all ${
                                importMode === "markdown"
                                    ? "bg-theme-card text-theme-primary shadow-sm border border-theme-border/10"
                                    : "text-theme-muted hover:text-theme-primary"
                            }`}
                        >
                            Paste Article Markdown
                        </button>
                        <button
                            onClick={() => setImportMode("analytics")}
                            className={`flex-1 min-w-[110px] py-1.5 text-xs font-black rounded-xl transition-all ${
                                importMode === "analytics"
                                    ? "bg-theme-card text-theme-primary shadow-sm border border-theme-border/10"
                                    : "text-theme-muted hover:text-theme-primary"
                            }`}
                        >
                            Analytics CSV / Table
                        </button>
                        <button
                            onClick={() => setImportMode("manual_snapshot")}
                            className={`flex-1 min-w-[110px] py-1.5 text-xs font-black rounded-xl transition-all ${
                                importMode === "manual_snapshot"
                                    ? "bg-theme-card text-theme-primary shadow-sm border border-theme-border/10"
                                    : "text-theme-muted hover:text-theme-primary"
                            }`}
                        >
                            Quick Post Snapshot
                        </button>
                        <button
                            onClick={() => setImportMode("screenshot")}
                            className={`flex-1 min-w-[110px] py-1.5 text-xs font-black rounded-xl transition-all ${
                                importMode === "screenshot"
                                    ? "bg-theme-card text-theme-primary shadow-sm border border-theme-border/10"
                                    : "text-theme-muted hover:text-theme-primary"
                            }`}
                        >
                            Screenshot Snapshot
                        </button>
                        <button
                            onClick={() => setImportMode("ga4_backfill")}
                            className={`flex-1 min-w-[90px] py-1.5 text-xs font-black rounded-xl transition-all ${
                                importMode === "ga4_backfill"
                                    ? "bg-theme-card text-theme-primary shadow-sm border border-theme-border/10"
                                    : "text-theme-muted hover:text-theme-primary"
                            }`}
                        >
                            GA4 Backfill
                        </button>
                        <button
                            onClick={() => setImportMode("legacy_registry")}
                            className={`flex-1 min-w-[120px] py-1.5 text-xs font-black rounded-xl transition-all ${
                                importMode === "legacy_registry"
                                    ? "bg-theme-card text-theme-primary shadow-sm border border-theme-border/10"
                                    : "text-theme-muted hover:text-theme-primary"
                            }`}
                        >
                            Legacy Registry
                        </button>
                    </div>

                    {/* Draft Notice Banner */}
                    <div className="bg-theme-input/50 border border-theme-border/60 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs">
                        <div className="space-y-1">
                            <div className="flex items-center gap-1.5 font-black text-theme-primary">
                                <span className="relative flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                                </span>
                                Browser Draft Active
                            </div>
                            <p className="text-theme-muted font-medium text-[11px]">
                                ⚠️ Draft นี้ยังไม่ได้บันทึกจริง จนกว่าจะกด Create / Apply ด้านล่าง
                            </p>
                            {restoredModes.length > 0 && (
                                <p className="text-green-600 dark:text-green-400 font-bold text-[10px]">
                                    ✨ Restored {restoredModes.join(", ")} draft{restoredModes.length > 1 ? "s" : ""} from this browser
                                </p>
                            )}
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={handleReParseDraft}
                                className="px-3 py-1.5 bg-theme-input border border-theme-border/80 hover:bg-theme-border/40 text-theme-secondary hover:text-theme-primary font-black rounded-xl transition-all text-[10px]"
                                title="Re-parse the active draft text inputs"
                            >
                                Re-parse Draft
                            </button>
                            <button
                                onClick={handleClearActiveDraft}
                                className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 font-black rounded-xl transition-all text-[10px]"
                                title="Clear current input draft fields"
                            >
                                Clear Draft
                            </button>
                        </div>
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

                    {importMode === "manual_snapshot" && (
                        <div className="space-y-4">
                            <div className="p-3 bg-blue-500/5 border border-blue-500/10 rounded-2xl text-[11px] text-blue-700 dark:text-blue-400 font-bold">
                                ℹ️ ใช้สำหรับกรอกข้อมูลจากภาพ Screenshot หรือหน้า Facebook Insight แบบรวดเร็ว
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5 col-span-2">
                                    <label className="text-[10px] font-black text-theme-secondary uppercase tracking-wider block">
                                        Target Writing Project (โครงการเขียนร่างเป้าหมาย) <span className="text-red-500">*</span>
                                    </label>
                                    <select
                                        value={quickProjectId}
                                        onChange={(e) => setQuickProjectId(e.target.value)}
                                        className="w-full bg-theme-input border border-theme-border rounded-xl px-3 py-2.5 text-xs text-theme-primary font-bold focus:outline-none"
                                    >
                                        <option value="">-- เลือกโครงการร่างเป้าหมาย --</option>
                                        {writingProjects.map((proj) => (
                                            <option key={proj.id} value={proj.id}>
                                                {proj.title}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-theme-secondary uppercase tracking-wider block">
                                        Data Source (แหล่งข้อมูลต้นทาง) <span className="text-red-500">*</span>
                                    </label>
                                    <select
                                        value={quickSourceType}
                                        onChange={(e) => setQuickSourceType(e.target.value)}
                                        className="w-full bg-theme-input border border-theme-border rounded-xl px-3 py-2.5 text-xs text-theme-primary font-bold focus:outline-none"
                                    >
                                        <option value="Facebook Page">Facebook Page</option>
                                        <option value="Facebook Group">Facebook Group</option>
                                        <option value="Personal Profile">Personal Profile</option>
                                    </select>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-theme-secondary uppercase tracking-wider block">
                                        Snapshot Window (ช่วงเวลาสถิติ) <span className="text-red-500">*</span>
                                    </label>
                                    <select
                                        value={quickWindow}
                                        onChange={(e) => setQuickWindow(e.target.value)}
                                        className="w-full bg-theme-input border border-theme-border rounded-xl px-3 py-2.5 text-xs text-theme-primary font-bold focus:outline-none"
                                    >
                                        <option value="24h">24 Hours (24 ชม. แรก)</option>
                                        <option value="7d">7 Days (7 วันแรก)</option>
                                        <option value="30d">30 Days (30 วันแรก)</option>
                                        <option value="90d">90 Days (90 วันแรก)</option>
                                    </select>
                                </div>

                                <div className="space-y-1.5 col-span-2">
                                    <label className="text-[10px] font-black text-theme-secondary uppercase tracking-wider block">
                                        Snapshot Date (วันที่บันทึกสถิติ) <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="date"
                                        value={quickDate}
                                        onChange={(e) => setQuickDate(e.target.value)}
                                        className="w-full bg-theme-input border border-theme-border rounded-xl px-3 py-2 text-xs text-theme-primary font-bold focus:outline-none"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-theme-secondary uppercase tracking-wider block">
                                        Views / Reach (จำนวนคนเข้าถึง) <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="number"
                                        min="0"
                                        placeholder="0"
                                        value={quickViewsReach}
                                        onChange={(e) => setQuickViewsReach(e.target.value)}
                                        className="w-full bg-theme-input border border-theme-border rounded-xl px-3 py-2.5 text-xs text-theme-primary font-medium focus:outline-none"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-theme-secondary uppercase tracking-wider block">
                                        Reactions (ยอดความรู้สึก)
                                    </label>
                                    <input
                                        type="number"
                                        min="0"
                                        placeholder="0"
                                        value={quickReactions}
                                        onChange={(e) => setQuickReactions(e.target.value)}
                                        className="w-full bg-theme-input border border-theme-border rounded-xl px-3 py-2.5 text-xs text-theme-primary font-medium focus:outline-none"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-theme-secondary uppercase tracking-wider block">
                                        Comments (ยอดความคิดเห็น)
                                    </label>
                                    <input
                                        type="number"
                                        min="0"
                                        placeholder="0"
                                        value={quickComments}
                                        onChange={(e) => setQuickComments(e.target.value)}
                                        className="w-full bg-theme-input border border-theme-border rounded-xl px-3 py-2.5 text-xs text-theme-primary font-medium focus:outline-none"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-theme-secondary uppercase tracking-wider block">
                                        Shares (ยอดแชร์)
                                    </label>
                                    <input
                                        type="number"
                                        min="0"
                                        placeholder="0"
                                        value={quickShares}
                                        onChange={(e) => setQuickShares(e.target.value)}
                                        className="w-full bg-theme-input border border-theme-border rounded-xl px-3 py-2.5 text-xs text-theme-primary font-medium focus:outline-none"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-theme-secondary uppercase tracking-wider block">
                                        Link Clicks (จำนวนคลิกลิงก์)
                                    </label>
                                    <input
                                        type="number"
                                        min="0"
                                        placeholder="0"
                                        value={quickLinkClicks}
                                        onChange={(e) => setQuickLinkClicks(e.target.value)}
                                        className="w-full bg-theme-input border border-theme-border rounded-xl px-3 py-2.5 text-xs text-theme-primary font-medium focus:outline-none"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-theme-secondary uppercase tracking-wider block">
                                        Engagement (การตอบสนองรวม)
                                    </label>
                                    <input
                                        type="number"
                                        min="0"
                                        placeholder="0"
                                        value={quickEngagement}
                                        onChange={(e) => setQuickEngagement(e.target.value)}
                                        className="w-full bg-theme-input border border-theme-border rounded-xl px-3 py-2.5 text-xs text-theme-primary font-medium focus:outline-none"
                                    />
                                </div>

                                <div className="space-y-1.5 col-span-2 border-t border-theme-border/40 pt-3">
                                    <h4 className="text-[11px] font-black text-theme-primary uppercase tracking-wider">
                                        Post Details (รายละเอียดเพิ่มเติมของโพสต์)
                                    </h4>
                                </div>

                                <div className="space-y-1.5 col-span-2">
                                    <label className="text-[10px] font-black text-theme-secondary uppercase tracking-wider block">
                                        Post Title / Text (หัวข้อโพสต์หรือข้อความสรุป)
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="หัวข้อโพสต์สั้นๆ..."
                                        value={quickPostTitle}
                                        onChange={(e) => setQuickPostTitle(e.target.value)}
                                        className="w-full bg-theme-input border border-theme-border rounded-xl px-3 py-2.5 text-xs text-theme-primary font-medium focus:outline-none"
                                    />
                                </div>

                                <div className="space-y-1.5 col-span-2">
                                    <label className="text-[10px] font-black text-theme-secondary uppercase tracking-wider block">
                                        Post URL / Link (ที่อยู่ลิงก์โพสต์เฟซบุ๊ก)
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="https://facebook.com/groups/posts/..."
                                        value={quickPostUrl}
                                        onChange={(e) => setQuickPostUrl(e.target.value)}
                                        className="w-full bg-theme-input border border-theme-border rounded-xl px-3 py-2.5 text-xs text-theme-primary font-medium focus:outline-none"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-theme-secondary uppercase tracking-wider block">
                                        Published Date (วันที่เริ่มโพสต์จริง)
                                    </label>
                                    <input
                                        type="date"
                                        value={quickPublishedDate}
                                        onChange={(e) => setQuickPublishedDate(e.target.value)}
                                        className="w-full bg-theme-input border border-theme-border rounded-xl px-3 py-2 text-xs text-theme-primary font-bold focus:outline-none"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-theme-secondary uppercase tracking-wider block">
                                        Photo Views (ยอดดูรูปภาพ)
                                    </label>
                                    <input
                                        type="number"
                                        min="0"
                                        placeholder="0"
                                        value={quickPhotoViews}
                                        onChange={(e) => setQuickPhotoViews(e.target.value)}
                                        className="w-full bg-theme-input border border-theme-border rounded-xl px-3 py-2.5 text-xs text-theme-primary font-medium focus:outline-none"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-theme-secondary uppercase tracking-wider block">
                                        Other Clicks (จำนวนคลิกจุดอื่น)
                                    </label>
                                    <input
                                        type="number"
                                        min="0"
                                        placeholder="0"
                                        value={quickOtherClicks}
                                        onChange={(e) => setQuickOtherClicks(e.target.value)}
                                        className="w-full bg-theme-input border border-theme-border rounded-xl px-3 py-2.5 text-xs text-theme-primary font-medium focus:outline-none"
                                    />
                                </div>

                                <div className="space-y-1.5 col-span-2">
                                    <label className="text-[10px] font-black text-theme-secondary uppercase tracking-wider block">
                                        Import Note (หมายเหตุการนำเข้าสถิติ)
                                    </label>
                                    <input
                                        type="text"
                                        value={quickNote}
                                        onChange={(e) => setQuickNote(e.target.value)}
                                        placeholder="ระบุข้อความบันทึกความจำสั้น..."
                                        className="w-full bg-theme-input border border-theme-border rounded-xl px-3 py-2.5 text-xs text-theme-primary font-medium focus:outline-none"
                                    />
                                </div>
                            </div>

                            <button
                                onClick={handleGenerateQuickSnapshot}
                                className="w-full py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-2xl text-xs font-black transition-all flex items-center justify-center gap-1.5 shadow-md shadow-green-600/15"
                            >
                                <CheckCircleIcon className="w-4 h-4" />
                                Generate Quick Snapshot Package
                            </button>
                        </div>
                    )}

                    {importMode === "screenshot" && (
                        <div className="space-y-4">
                            <div className="p-3 bg-blue-500/5 border border-blue-500/10 rounded-2xl text-[11px] text-blue-700 dark:text-blue-400 font-bold space-y-1">
                                <div>ℹ️ แนบภาพ Screenshot และตรวจสอบป้อนตัวเลขสถิติเพื่อความรวดเร็ว (Screenshot-assisted entry)</div>
                                <div className="text-[10px] text-theme-muted font-medium">คำชี้แจง: ระบบจะจำลองตัวเลขอ้างอิงเบื้องต้นให้เป็นตัวอย่างหลังจากอัปโหลด กรุณาตรวจสอบและกรอก/แก้ไขค่าด้วยตนเองเพื่อรับรองความถูกต้อง</div>
                            </div>

                            {/* Drop/Upload Area and Form side by side */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                {/* Left Side: Upload / Paste Area */}
                                <div className="space-y-4">
                                    <label className="text-[10px] font-black text-theme-secondary uppercase tracking-wider block">
                                        Attach Screenshot (แนบภาพสกรีนช็อตรองรับลากวาง/วางไฟล์ภาพ)
                                    </label>
                                    
                                    <div 
                                        onPaste={handleScreenshotPaste}
                                        className="border-2 border-dashed border-theme-border/60 hover:border-theme-primary/40 transition-all rounded-3xl p-5 text-center flex flex-col items-center justify-center gap-3 bg-theme-panel/10 min-h-[220px] relative overflow-hidden group cursor-pointer"
                                    >
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={handleScreenshotChange}
                                            className="absolute inset-0 opacity-0 cursor-pointer"
                                        />
                                        {screenshotPreviewUrl ? (
                                            <div className="w-full h-full flex flex-col items-center justify-center relative">
                                                <img 
                                                    src={screenshotPreviewUrl} 
                                                    alt="Screenshot preview" 
                                                    className="max-h-[180px] rounded-xl object-contain shadow-md border border-theme-border/40"
                                                />
                                                <div className="mt-2 text-[10px] text-theme-muted group-hover:text-theme-primary font-bold">คลิกหรือลากวางภาพใหม่เพื่อเปลี่ยนแปลง</div>
                                            </div>
                                        ) : (
                                            <>
                                                <span className="w-12 h-12 rounded-full bg-theme-input flex items-center justify-center text-theme-muted border border-theme-border/30 group-hover:text-theme-primary group-hover:scale-105 transition-all">📸</span>
                                                <div>
                                                    <span className="text-xs font-black text-theme-primary block">ลากรูปภาพมาวางที่นี่ หรือคลิกเพื่อเลือกไฟล์ หรือกดวางภาพ (Ctrl+V)</span>
                                                    <span className="text-[10px] text-theme-muted block mt-1">สกรีนช็อตของสถิติ GA4 หรือ Facebook Insight</span>
                                                </div>
                                            </>
                                        )}
                                        {ssAnalyzing && (
                                            <div className="absolute inset-0 bg-theme-card/90 flex flex-col items-center justify-center gap-2 transition-all">
                                                <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                                                <span className="text-[10px] font-black text-blue-600 uppercase tracking-wider animate-pulse">Analyzing Screenshot...</span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Right Side: General details & Screenshot Type */}
                                <div className="space-y-4">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-theme-secondary uppercase tracking-wider block">
                                            Screenshot Type (ประเภทภาพหน้าจอ) <span className="text-red-500">*</span>
                                        </label>
                                        <select
                                            value={screenshotType}
                                            onChange={(e) => handleScreenshotTypeChange(e.target.value)}
                                            className="w-full bg-theme-input border border-theme-border rounded-xl px-3 py-2.5 text-xs text-theme-primary font-bold focus:outline-none"
                                        >
                                            <option value="ga4_article">GA4 Article</option>
                                            <option value="facebook_page_post">Facebook Page Post</option>
                                            <option value="facebook_group_post">Facebook Group Post</option>
                                            <option value="personal_profile_post">Personal Profile Post</option>
                                        </select>
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-theme-secondary uppercase tracking-wider block">
                                            Target Writing Project (โครงการเขียนร่างเป้าหมาย) <span className="text-red-500">*</span>
                                        </label>
                                        <select
                                            value={ssProjectId}
                                            onChange={(e) => setSsProjectId(e.target.value)}
                                            className="w-full bg-theme-input border border-theme-border rounded-xl px-3 py-2.5 text-xs text-theme-primary font-bold focus:outline-none"
                                        >
                                            <option value="">-- เลือกโครงการร่างเป้าหมาย --</option>
                                            {writingProjects.map((proj) => (
                                                <option key={proj.id} value={proj.id}>
                                                    {proj.title}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black text-theme-secondary uppercase tracking-wider block">
                                                Snapshot Window (รอบช่วงเวลาสถิติ) <span className="text-red-500">*</span>
                                            </label>
                                            <select
                                                value={ssWindow}
                                                onChange={(e) => setSsWindow(e.target.value)}
                                                className="w-full bg-theme-input border border-theme-border rounded-xl px-3 py-2.5 text-xs text-theme-primary font-bold focus:outline-none"
                                            >
                                                <option value="12h">12 Hours (12 ชม.)</option>
                                                <option value="24h">24 Hours (24 ชม. แรก)</option>
                                                <option value="3d">3 Days (3 วันแรก)</option>
                                                <option value="7d">7 Days (7 วันแรก)</option>
                                                <option value="15d">15 Days (15 วันแรก)</option>
                                                <option value="30d">30 Days (30 วันแรก)</option>
                                                <option value="SincePublished">Since Published (ตั้งแต่เผยแพร่)</option>
                                                <option value="CustomRange">Custom Range (ช่วงเวลาอื่น/กำหนดเอง)</option>
                                            </select>
                                        </div>

                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black text-theme-secondary uppercase tracking-wider block">
                                                Snapshot Date (วันที่บันทึกสถิติ) <span className="text-red-500">*</span>
                                            </label>
                                            <input
                                                type="date"
                                                value={ssDate}
                                                onChange={(e) => setSsDate(e.target.value)}
                                                className="w-full bg-theme-input border border-theme-border rounded-xl px-3 py-2 text-xs text-theme-primary font-bold focus:outline-none"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Section: Metrics Input Fields */}
                            <div className="bg-theme-panel/30 border border-theme-border/60 p-5 rounded-3xl space-y-4 mt-3">
                                <div className="flex items-center justify-between border-b border-theme-border/40 pb-2">
                                    <h4 className="text-[11px] font-black uppercase tracking-wider text-theme-primary">
                                        {screenshotType === "ga4_article" ? "Verify & Edit GA4 Article Metrics" : "Verify & Edit Facebook Post Metrics"}
                                    </h4>
                                    <span className="text-[9px] font-bold text-yellow-600 bg-yellow-500/10 px-2 py-0.5 rounded-full border border-yellow-500/10 uppercase">
                                        Check required
                                    </span>
                                </div>

                                {screenshotType === "ga4_article" ? (
                                    <div className="grid grid-cols-1 xl:grid-cols-[minmax(520px,_1.1fr)_minmax(460px,_0.9fr)] gap-8 items-start">
                                        <div className="space-y-4">
                                            <div className="space-y-1">
                                                <label className="text-[9px] font-black text-theme-muted uppercase">Page Title (หัวข้อโพสต์/เพจ)</label>
                                                <input
                                                    type="text"
                                                    value={ssGa4Title}
                                                    onChange={(e) => setSsGa4Title(e.target.value)}
                                                    placeholder="เช่น EP.10.3 Cytokinin guide"
                                                    className="w-full bg-theme-input border border-theme-border rounded-xl px-3 py-2 text-xs font-bold text-theme-primary outline-none"
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[9px] font-black text-theme-muted uppercase">Page Path / URL (ลิงก์บทความ)</label>
                                                <input
                                                    type="text"
                                                    value={ssGa4Path}
                                                    onChange={(e) => setSsGa4Path(e.target.value)}
                                                    placeholder="/library/..."
                                                    className="w-full bg-theme-input border border-theme-border rounded-xl px-3 py-2 text-xs font-bold text-theme-primary outline-none"
                                                />
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4 text-xs">
                                            <div className="space-y-1">
                                                <label className="text-[9px] font-black text-theme-muted uppercase">Views</label>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    value={ssGa4Views}
                                                    onChange={(e) => setSsGa4Views(e.target.value)}
                                                    className="w-full bg-theme-input border border-theme-border rounded-xl px-3 py-2.5 text-xs text-theme-primary font-medium focus:outline-none"
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[9px] font-black text-theme-muted uppercase">Active Users</label>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    value={ssGa4Users}
                                                    onChange={(e) => setSsGa4Users(e.target.value)}
                                                    className="w-full bg-theme-input border border-theme-border rounded-xl px-3 py-2.5 text-xs text-theme-primary font-medium focus:outline-none"
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[9px] font-black text-theme-muted uppercase">Avg Engagement Time</label>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    step="any"
                                                    value={ssGa4EngTime}
                                                    onChange={(e) => setSsGa4EngTime(e.target.value)}
                                                    className="w-full bg-theme-input border border-theme-border rounded-xl px-3 py-2.5 text-xs text-theme-primary font-medium focus:outline-none"
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[9px] font-black text-theme-muted uppercase">Event Count</label>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    value={ssGa4Events}
                                                    onChange={(e) => setSsGa4Events(e.target.value)}
                                                    className="w-full bg-theme-input border border-theme-border rounded-xl px-3 py-2.5 text-xs text-theme-primary font-medium focus:outline-none"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                                        <div className="space-y-1 col-span-2">
                                            <label className="text-[9px] font-black text-theme-muted uppercase">Post Title (หัวข้อโพสต์)</label>
                                            <input
                                                type="text"
                                                value={ssFbTitle}
                                                onChange={(e) => setSsFbTitle(e.target.value)}
                                                className="w-full bg-theme-input border border-theme-border rounded-xl px-3 py-2 text-xs font-bold text-theme-primary outline-none"
                                            />
                                        </div>
                                        <div className="space-y-1 col-span-2">
                                            <label className="text-[9px] font-black text-theme-muted uppercase">Post URL (ที่อยู่โพสต์เฟซบุ๊ก)</label>
                                            <input
                                                type="text"
                                                value={ssFbUrl}
                                                onChange={(e) => setSsFbUrl(e.target.value)}
                                                className="w-full bg-theme-input border border-theme-border rounded-xl px-3 py-2 text-xs font-bold text-theme-primary outline-none"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[9px] font-black text-theme-muted uppercase">Reach / Views</label>
                                            <input
                                                type="number"
                                                min="0"
                                                value={ssFbViewsReach}
                                                onChange={(e) => setSsFbViewsReach(e.target.value)}
                                                className="w-full bg-theme-input border border-theme-border rounded-xl px-3 py-2.5 text-xs text-theme-primary font-medium focus:outline-none"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[9px] font-black text-theme-muted uppercase">Engagement</label>
                                            <input
                                                type="number"
                                                min="0"
                                                value={ssFbEngagement}
                                                onChange={(e) => setSsFbEngagement(e.target.value)}
                                                className="w-full bg-theme-input border border-theme-border rounded-xl px-3 py-2.5 text-xs text-theme-primary font-medium focus:outline-none"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[9px] font-black text-theme-muted uppercase">Reactions</label>
                                            <input
                                                type="number"
                                                min="0"
                                                value={ssFbReactions}
                                                onChange={(e) => setSsFbReactions(e.target.value)}
                                                className="w-full bg-theme-input border border-theme-border rounded-xl px-3 py-2.5 text-xs text-theme-primary font-medium focus:outline-none"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[9px] font-black text-theme-muted uppercase">Comments</label>
                                            <input
                                                type="number"
                                                min="0"
                                                value={ssFbComments}
                                                onChange={(e) => setSsFbComments(e.target.value)}
                                                className="w-full bg-theme-input border border-theme-border rounded-xl px-3 py-2.5 text-xs text-theme-primary font-medium focus:outline-none"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[9px] font-black text-theme-muted uppercase">Shares</label>
                                            <input
                                                type="number"
                                                min="0"
                                                value={ssFbShares}
                                                onChange={(e) => setSsFbShares(e.target.value)}
                                                className="w-full bg-theme-input border border-theme-border rounded-xl px-3 py-2.5 text-xs text-theme-primary font-medium focus:outline-none"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[9px] font-black text-theme-muted uppercase">Link Clicks</label>
                                            <input
                                                type="number"
                                                min="0"
                                                value={ssFbClicks}
                                                onChange={(e) => setSsFbClicks(e.target.value)}
                                                className="w-full bg-theme-input border border-theme-border rounded-xl px-3 py-2.5 text-xs text-theme-primary font-medium focus:outline-none"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[9px] font-black text-theme-muted uppercase">Photo Views</label>
                                            <input
                                                type="number"
                                                min="0"
                                                value={ssFbPhotoViews}
                                                onChange={(e) => setSsFbPhotoViews(e.target.value)}
                                                className="w-full bg-theme-input border border-theme-border rounded-xl px-3 py-2.5 text-xs text-theme-primary font-medium focus:outline-none"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[9px] font-black text-theme-muted uppercase">Other Clicks</label>
                                            <input
                                                type="number"
                                                min="0"
                                                value={ssFbOtherClicks}
                                                onChange={(e) => setSsFbOtherClicks(e.target.value)}
                                                className="w-full bg-theme-input border border-theme-border rounded-xl px-3 py-2.5 text-xs text-theme-primary font-medium focus:outline-none"
                                            />
                                        </div>
                                        <div className="space-y-1 col-span-2">
                                            <label className="text-[9px] font-black text-theme-muted uppercase">Published Date</label>
                                            <input
                                                type="date"
                                                value={ssPublishedDate}
                                                onChange={(e) => setSsPublishedDate(e.target.value)}
                                                className="w-full bg-theme-input border border-theme-border rounded-xl px-3 py-2 text-xs text-theme-primary font-bold focus:outline-none"
                                            />
                                        </div>
                                    </div>
                                )}

                                <div className="space-y-1.5 col-span-4 border-t border-theme-border/20 pt-3">
                                    <label className="text-[10px] font-black text-theme-secondary uppercase tracking-wider block">
                                        Import Note (หมายเหตุการนำเข้าสถิติ)
                                    </label>
                                    <input
                                        type="text"
                                        value={ssImportNote}
                                        onChange={(e) => setSsImportNote(e.target.value)}
                                        placeholder="ระบุข้อความบันทึกความจำสั้น..."
                                        className="w-full bg-theme-input border border-theme-border rounded-xl px-3 py-2.5 text-xs text-theme-primary font-medium focus:outline-none"
                                    />
                                </div>
                            </div>

                            <button
                                onClick={handleGenerateScreenshotSnapshot}
                                className="w-full py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-2xl text-xs font-black transition-all flex items-center justify-center gap-1.5 shadow-md shadow-green-600/15"
                            >
                                <CheckCircleIcon className="w-4 h-4" />
                                Generate Snapshot Package
                            </button>
                        </div>
                    )}

                    {importMode === "ga4_backfill" && (
                        <div className="space-y-4">
                            <div className="p-3 bg-blue-500/5 border border-blue-500/10 rounded-2xl text-[11px] text-blue-700 dark:text-blue-400 font-bold space-y-1">
                                <div>ℹ️ GA4 Article-level Backfill Tool</div>
                                <div className="text-[10px] text-theme-muted font-medium">
                                    ใช้สำหรับนำเข้า GA4 article-level data เท่านั้น ไม่ใช่ภาพรวมทั้งเว็บไซต์
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-theme-secondary uppercase tracking-wider block">
                                    Pasted Report Table / TSV (วางตารางรายงาน GA4 ที่นี่) <span className="text-red-500">*</span>
                                </label>
                                <textarea
                                    value={backfillRawText}
                                    onChange={(e) => setBackfillRawText(e.target.value)}
                                    rows={8}
                                    placeholder="วางข้อมูลตารางรายงานจาก GA4..."
                                    className="w-full bg-theme-input border border-theme-border rounded-2xl p-4 text-xs font-mono text-theme-primary outline-none focus:border-theme-primary/30 transition-all resize-y"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-theme-secondary uppercase tracking-wider block">
                                        Snapshot Window (รอบช่วงเวลาสถิติ) <span className="text-red-500">*</span>
                                    </label>
                                    <select
                                        value={backfillWindow}
                                        onChange={(e) => setBackfillWindow(e.target.value)}
                                        className="w-full bg-theme-input border border-theme-border rounded-xl px-3 py-2.5 text-xs text-theme-primary font-bold focus:outline-none"
                                    >
                                        <option value="SincePublished">Since Published (ตั้งแต่เผยแพร่)</option>
                                        <option value="CustomRange">Custom Range (รอบเวลาอื่น/กำหนดเอง)</option>
                                        <option value="15d">15 Days (15 วันแรก)</option>
                                        <option value="30d">30 Days (30 วันแรก)</option>
                                        <option value="90d">90 Days (90 วันแรก)</option>
                                        <option value="24h">24 Hours (24 ชม. แรก)</option>
                                        <option value="7d">7 Days (7 วันแรก)</option>
                                    </select>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-theme-secondary uppercase tracking-wider block">
                                        Snapshot Date (วันที่บันทึกสถิติ) <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="date"
                                        value={backfillDate}
                                        onChange={(e) => setBackfillDate(e.target.value)}
                                        className="w-full bg-theme-input border border-theme-border rounded-xl px-3 py-2 text-xs text-theme-primary font-bold focus:outline-none"
                                    />
                                </div>
                            </div>

                            <button
                                onClick={() => handleParseGA4Backfill(backfillRawText)}
                                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-xs font-black transition-all flex items-center justify-center gap-1.5 shadow-md shadow-blue-600/15"
                            >
                                <ArrowPathIcon className="w-4 h-4" />
                                Parse & Preview GA4 Report
                            </button>
                        </div>
                    )}

                    {importMode === "legacy_registry" && (
                        <div className="space-y-4">
                            <div className="p-3 bg-blue-500/5 border border-blue-500/10 rounded-2xl text-[11px] text-blue-700 dark:text-blue-400 font-bold space-y-1">
                                <div>ℹ️ Legacy Article Registry</div>
                                <div className="text-[10px] text-theme-muted font-medium">
                                    ใช้สำหรับขึ้นทะเบียนรายการบทความเดิมในระบบ เพื่อปูทางสร้าง Shell Projects ไว้จับคู่รายงานประสิทธิภาพ
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-theme-secondary uppercase tracking-wider block">
                                    Pasted Articles list (วางหัวเรื่อง / URL / CSV ที่นี่) <span className="text-red-500">*</span>
                                </label>
                                <textarea
                                    value={legacyRawText}
                                    onChange={(e) => setLegacyRawText(e.target.value)}
                                    rows={8}
                                    placeholder="ตัวอย่าง:&#10;/library/plant-cytokinin-guide&#10;หรือในรูปแบบ CSV:&#10;ไซโตไคนินคืออะไร,/library/plant-cytokinin-guide,knowledge,2026-06-01"
                                    className="w-full bg-theme-input border border-theme-border rounded-2xl p-4 text-xs font-mono text-theme-primary outline-none focus:border-theme-primary/30 transition-all resize-y"
                                />
                            </div>

                            <button
                                onClick={() => handleParseLegacyRegistry(legacyRawText)}
                                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-xs font-black transition-all flex items-center justify-center gap-1.5 shadow-md shadow-blue-600/15"
                            >
                                <ArrowPathIcon className="w-4 h-4" />
                                Parse & Preview Legacy Articles
                            </button>
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
                <div className="bg-theme-card border border-theme-border rounded-[32px] p-6 shadow-sm flex flex-col gap-6 xl:sticky xl:top-8">
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

            {importMode === "ga4_backfill" && backfillResult && (
                <div className="bg-theme-card border border-theme-border rounded-[32px] p-6 shadow-sm flex flex-col gap-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-theme-border/40 pb-4">
                        <div>
                            <h2 className="text-lg font-black text-theme-primary">
                                รายชื่อหน้าบทความที่ตรวจพบ (GA4 Backfill Row Preview)
                            </h2>
                            <p className="text-xs text-theme-muted mt-1">
                                ช่วงเวลาข้อมูล: {backfillResult.dateRangeStart || "ไม่ระบุ"} ถึง {backfillResult.dateRangeEnd || "ไม่ระบุ"} (Snapshot Date: {backfillDate})
                            </p>
                            <p className="text-xs text-blue-600 dark:text-blue-400 font-bold mt-1.5 flex items-center gap-1">
                                💡 Tip: หากพบแถวขึ้นเตือน "Needs Target" เป็นจำนวนมาก แนะนำให้ลงทะเบียนบทความเก่าในเมนู <strong>Legacy Registry</strong> ก่อนนำเข้าสถิติ
                            </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-4">
                            <label className="flex items-center gap-2 text-xs font-bold text-theme-secondary cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={showExcludedRows}
                                    onChange={(e) => setShowExcludedRows(e.target.checked)}
                                    className="rounded border-theme-border text-blue-600 focus:ring-blue-500 w-4 h-4"
                                />
                                Show Excluded Rows (แสดงบรรทัดที่ข้าม)
                            </label>
                            
                            <button
                                onClick={handleBatchApplyBackfill}
                                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black transition-all flex items-center gap-1.5 shadow-md shadow-blue-600/15"
                                disabled={batchApplyProgress?.active}
                            >
                                <CheckCircleIcon className="w-4 h-4" />
                                Batch Apply Selected
                            </button>
                        </div>
                    </div>

                    {/* Batch Progress Log UI */}
                    {batchApplyProgress && (
                        <div className="p-4 bg-theme-input border border-theme-border rounded-2xl space-y-3">
                            <div className="flex items-center justify-between text-xs font-bold">
                                <span className="text-theme-secondary">
                                    {batchApplyProgress.active ? "กำลังดำเนินการ..." : "ดำเนินการเสร็จสิ้น"}
                                </span>
                                <span className="text-theme-primary">
                                    {batchApplyProgress.current} / {batchApplyProgress.total} รายการ
                                </span>
                            </div>
                            <div className="w-full bg-theme-border/30 rounded-full h-2 overflow-hidden">
                                <div 
                                    className="bg-blue-600 h-full transition-all duration-300"
                                    style={{ width: `${(batchApplyProgress.current / batchApplyProgress.total) * 100}%` }}
                                />
                            </div>
                            <div className="bg-theme-card/60 rounded-xl p-3 text-[10px] font-mono text-theme-muted max-h-32 overflow-y-auto space-y-1 border border-theme-border/40">
                                {batchApplyProgress.log.map((logLine, idx) => (
                                    <div key={idx}>{logLine}</div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="overflow-x-auto">
                        <table className="w-full border-collapse text-left text-xs">
                            <thead>
                                <tr className="border-b border-theme-border text-theme-muted font-bold text-[10px] uppercase">
                                    <th className="py-2.5 px-3">Status</th>
                                    <th className="py-2.5 px-3">Page Title / Path</th>
                                    <th className="py-2.5 px-3 text-right">Views</th>
                                    <th className="py-2.5 px-3 text-right">Active Users</th>
                                    <th className="py-2.5 px-3 text-right">Events</th>
                                    <th className="py-2.5 px-3 text-right">Bounce Rate</th>
                                    <th className="py-2.5 px-3">Target Writing Project</th>
                                    <th className="py-2.5 px-3">Confidence</th>
                                    <th className="py-2.5 px-3 text-center">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {backfillResult.rows
                                    .filter((row: any) => showExcludedRows || row.status !== "Excluded")
                                    .map((row: any) => {
                                        const pId = backfillRowMappings[row.index] || "";
                                        const status = row.status;
                                        
                                        // Check duplicate warning
                                        let hasDuplicate = false;
                                        if (pId) {
                                            const proj = writingProjects.find(p => p.id === pId);
                                            if (proj && proj.notes) {
                                                try {
                                                    const parsed = JSON.parse(proj.notes);
                                                    const snapKey = `snap${backfillWindow}`;
                                                    hasDuplicate = !!(parsed?.performanceFeedback?.ga4Snapshots?.[snapKey]);
                                                } catch {}
                                            }
                                        }

                                        return (
                                            <tr 
                                                key={row.index} 
                                                className={`border-b border-theme-border/40 hover:bg-theme-input/40 transition-colors ${
                                                    status === "Excluded" ? "opacity-50" : ""
                                                }`}
                                            >
                                                {/* Status Column */}
                                                <td className="py-3 px-3">
                                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                                        status === "Ready" 
                                                            ? "bg-green-500/10 text-green-600" 
                                                            : status === "Needs manual target" 
                                                            ? "bg-amber-500/10 text-amber-600" 
                                                            : "bg-theme-border text-theme-muted"
                                                    }`}>
                                                        {status === "Ready" ? "Ready" : status === "Needs manual target" ? "Needs Target" : "Excluded"}
                                                    </span>
                                                </td>

                                                {/* Page Title & Path Column */}
                                                <td className="py-3 px-3 max-w-[280px]">
                                                    <div className="font-bold text-theme-primary truncate" title={row.pageTitle}>
                                                        {row.pageTitle || "Untitled"}
                                                    </div>
                                                    <div className="text-[10px] text-theme-muted truncate" title={row.pagePath}>
                                                        {row.pagePath}
                                                    </div>
                                                </td>

                                                {/* Metrics Columns */}
                                                <td className="py-3 px-3 text-right font-bold text-theme-primary">
                                                    {row.views.toLocaleString()}
                                                </td>
                                                <td className="py-3 px-3 text-right text-theme-secondary">
                                                    {row.activeUsers.toLocaleString()}
                                                </td>
                                                <td className="py-3 px-3 text-right text-theme-muted">
                                                    {row.eventCount.toLocaleString()}
                                                </td>
                                                <td className="py-3 px-3 text-right text-theme-muted">
                                                    {row.bounceRate || "-"}
                                                </td>

                                                {/* Project Match Target Dropdown */}
                                                <td className="py-3 px-3">
                                                    <select
                                                        value={pId}
                                                        onChange={(e) => {
                                                            const newProjectId = e.target.value;
                                                            setBackfillRowMappings(prev => ({
                                                                ...prev,
                                                                [row.index]: newProjectId
                                                            }));
                                                            
                                                            // Dynamically recalculate row status
                                                            if (newProjectId) {
                                                                row.status = "Ready";
                                                            } else if (row.status !== "Excluded") {
                                                                row.status = "Needs manual target";
                                                            }
                                                        }}
                                                        className="w-full bg-theme-input border border-theme-border rounded-lg px-2 py-1 text-xs text-theme-primary focus:outline-none"
                                                        disabled={status === "Excluded" && !showExcludedRows}
                                                    >
                                                        <option value="">-- Select Project --</option>
                                                        {writingProjects.map((p) => (
                                                            <option key={p.id} value={p.id}>
                                                                {p.title}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </td>

                                                {/* Confidence Column */}
                                                <td className="py-3 px-3">
                                                    {row.matchedProject && (
                                                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-black ${
                                                            row.matchedProject.confidence === "High"
                                                                ? "bg-green-500/10 text-green-600"
                                                                : row.matchedProject.confidence === "Medium"
                                                                ? "bg-blue-500/10 text-blue-600"
                                                                : "bg-amber-500/10 text-amber-600"
                                                        }`}>
                                                            {row.matchedProject.confidence}
                                                        </span>
                                                    )}
                                                </td>

                                                {/* Action buttons Column */}
                                                <td className="py-3 px-3 text-center">
                                                    <div className="flex items-center justify-center gap-2">
                                                        {hasDuplicate && (
                                                            <span 
                                                                className="text-amber-500 hover:text-amber-600 cursor-help"
                                                                title="สถิติรอบเวลานี้มีข้อมูลอยู่แล้ว การกดนำเข้าจะเขียนทับข้อมูลเดิม"
                                                            >
                                                                <ExclamationTriangleIcon className="w-4 h-4 shrink-0" />
                                                            </span>
                                                        )}
                                                        <button
                                                            onClick={() => {
                                                                const payload = handleGenerateBackfillRowPayload(row, pId);
                                                                if (payload) {
                                                                    setPayloadText(JSON.stringify(payload, null, 2));
                                                                    handleValidate(JSON.stringify(payload));
                                                                }
                                                            }}
                                                            className="px-2 py-1 bg-theme-input hover:bg-theme-border/40 text-theme-secondary hover:text-theme-primary font-bold rounded-lg transition-colors text-[10px]"
                                                            disabled={!pId}
                                                            title="Preview payload for this row"
                                                        >
                                                            Preview
                                                        </button>
                                                        <button
                                                            onClick={async () => {
                                                                const payload = handleGenerateBackfillRowPayload(row, pId);
                                                                if (!payload) return;
                                                                
                                                                if (hasDuplicate) {
                                                                    const confirmSingle = window.confirm(
                                                                        "คำเตือน: ข้อมูลรอบเวลานี้มีอยู่แล้ว คุณต้องการยืนยันการนำเขียนทับหรือไม่?"
                                                                    );
                                                                    if (!confirmSingle) return;
                                                                }

                                                                setLoading(true);
                                                                try {
                                                                    const res = await fetch("/api/arbor-inbox", {
                                                                        method: "POST",
                                                                        headers: { "Content-Type": "application/json" },
                                                                        body: JSON.stringify({ action: "apply_update", payload })
                                                                    });
                                                                    const data = await res.json();
                                                                    if (!res.ok) throw new Error(data.error || "Failed to update");
                                                                    
                                                                    setStatusMessage({
                                                                        type: "success",
                                                                        text: `นำเข้าข้อมูลสำหรับ "${row.pageTitle || row.pagePath}" สำเร็จ!`
                                                                    });

                                                                    // Update mappings: remove this row index mapping
                                                                    setBackfillRowMappings(prev => {
                                                                        const next = { ...prev };
                                                                        delete next[row.index];
                                                                        
                                                                        // Check if no more active rows remain in backfillResult
                                                                        const activeRows = backfillResult?.rows.filter((r: any) => r.status !== "Excluded") || [];
                                                                        const remainingRows = activeRows.filter((r: any) => r.index !== row.index);
                                                                        if (remainingRows.length === 0) {
                                                                            setBackfillRawText("");
                                                                            setBackfillResult(null);
                                                                            if (typeof window !== "undefined") {
                                                                                localStorage.removeItem("workos.arborInbox.draft.ga4Backfill");
                                                                            }
                                                                            setRestoredModes(prevRestored => prevRestored.filter(m => m !== "GA4 Backfill"));
                                                                        }
                                                                        return next;
                                                                    });

                                                                    loadLogs();
                                                                    
                                                                    // Reload writing projects to update local copy notes state
                                                                    fetch("/api/content/writing-lab/projects")
                                                                        .then(res => res.json())
                                                                        .then(data => {
                                                                            if (Array.isArray(data)) setWritingProjects(data);
                                                                        });
                                                                } catch (err: any) {
                                                                    setStatusMessage({
                                                                        type: "error",
                                                                        text: `อัปเดตล้มเหลว: ${err.message}`
                                                                    });
                                                                } finally {
                                                                    setLoading(false);
                                                                }
                                                            }}
                                                            className="px-2 py-1 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg transition-colors text-[10px]"
                                                            disabled={!pId}
                                                            title="Apply update for this row"
                                                        >
                                                            Apply
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {importMode === "legacy_registry" && legacyResult && (
                <div className="bg-theme-card border border-theme-border rounded-[32px] p-6 shadow-sm flex flex-col gap-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-theme-border/40 pb-4">
                        <div>
                            <h2 className="text-lg font-black text-theme-primary">
                                รายชื่อบทความเดิมเตรียมขึ้นทะเบียน (Legacy Article Registry Preview)
                            </h2>
                            <p className="text-xs text-theme-muted mt-1">
                                ตรวจพบทั้งหมด {legacyResult.rows.length} รายการ (พร้อมลงทะเบียนสร้าง Shell: {legacyResult.rows.filter((r: any) => r.suggestedAction === "Create Shell").length} รายการ)
                            </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-4">
                            <label className="flex items-center gap-2 text-xs font-bold text-theme-secondary cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={showExcludedLegacy}
                                    onChange={(e) => setShowExcludedLegacy(e.target.checked)}
                                    className="rounded border-theme-border text-blue-600 focus:ring-blue-500 w-4 h-4"
                                />
                                Show Excluded / Already Exists (แสดงส่วนที่ข้าม/มีอยู่แล้ว)
                            </label>
                            
                            <button
                                onClick={handleBatchCreateLegacyShells}
                                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black transition-all flex items-center gap-1.5 shadow-md shadow-blue-600/15"
                                disabled={batchLegacyProgress?.active}
                            >
                                <CheckCircleIcon className="w-4 h-4" />
                                Batch Create Shells (สร้าง Shell ทั้งหมดที่เลือก)
                            </button>
                        </div>
                    </div>

                    {/* Batch Legacy Import Progress Bar Console */}
                    {batchLegacyProgress && (
                        <div className="p-4 bg-theme-input/40 border border-theme-border rounded-2xl space-y-3 font-mono text-xs">
                            <div className="flex items-center justify-between font-bold">
                                <span className={batchLegacyProgress.active ? "text-blue-500 animate-pulse" : "text-green-500"}>
                                    {batchLegacyProgress.active ? "กำลังสร้าง Shell Projects..." : "ดำเนินการเสร็จสิ้น"}
                                </span>
                                <span>{batchLegacyProgress.current} / {batchLegacyProgress.total}</span>
                            </div>
                            <div className="w-full bg-theme-border/40 h-2.5 rounded-full overflow-hidden">
                                <div 
                                    className="bg-blue-600 h-full rounded-full transition-all duration-300"
                                    style={{ width: `${(batchLegacyProgress.current / batchLegacyProgress.total) * 100}%` }}
                                />
                            </div>
                            <div className="max-h-[150px] overflow-y-auto bg-theme-card border border-theme-border p-3.5 rounded-xl space-y-1.5 custom-scrollbar text-[11px] font-mono leading-relaxed font-bold">
                                {batchLegacyProgress.log.map((logLine: string, idx: number) => (
                                    <div key={idx} className={logLine.startsWith("❌") ? "text-red-500" : logLine.startsWith("✅") ? "text-green-500" : "text-theme-secondary"}>
                                        {logLine}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="overflow-x-auto select-none max-w-full">
                        <table className="w-full text-left border-collapse text-xs">
                            <thead>
                                <tr className="border-b border-theme-border text-theme-muted font-black uppercase tracking-wider">
                                    <th className="py-3 px-3">Title (หัวเรื่อง)</th>
                                    <th className="py-3 px-3">Slug (สลักบทความ)</th>
                                    <th className="py-3 px-3">Published URL (ลิงก์เผยแพร่)</th>
                                    <th className="py-3 px-3">Content Type (ประเภท)</th>
                                    <th className="py-3 px-3">Suggested Action</th>
                                    <th className="py-3 px-3 text-center">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-theme-border/30 text-theme-secondary font-medium">
                                {legacyResult.rows
                                    .filter((row: any) => {
                                        if (showExcludedLegacy) return true;
                                        return row.suggestedAction === "Create Shell" || row.suggestedAction === "Needs review";
                                    })
                                    .map((row: any) => {
                                        const actionColor = 
                                            row.suggestedAction === "Already exists"
                                                ? "bg-green-500/10 text-green-600 border border-green-500/20"
                                                : row.suggestedAction === "Create Shell"
                                                ? "bg-blue-500/10 text-blue-600 border border-blue-500/20"
                                                : row.suggestedAction === "Needs review"
                                                ? "bg-amber-500/10 text-amber-600 border border-amber-500/20"
                                                : "bg-neutral-500/10 text-neutral-500 border border-neutral-500/20";

                                        return (
                                            <tr key={row.index} className="hover:bg-theme-input/10 transition-colors">
                                                <td className="py-3 px-3 font-bold text-theme-primary max-w-xs truncate" title={row.title}>
                                                    {row.title || <span className="italic text-theme-muted">(ไม่มีหัวข้อ)</span>}
                                                </td>
                                                <td className="py-3 px-3 font-mono text-[11px] truncate max-w-[200px]" title={row.slug}>
                                                    {row.slug || <span className="italic text-theme-muted">(ไม่มี slug)</span>}
                                                </td>
                                                <td className="py-3 px-3 font-mono text-[11px] text-theme-muted truncate max-w-[250px]" title={row.publishedUrl}>
                                                    {row.publishedUrl}
                                                </td>
                                                <td className="py-3 px-3">
                                                    <span className="px-2 py-0.5 rounded-lg border border-theme-border bg-theme-input/50 text-[10px] font-bold text-theme-secondary uppercase">
                                                        {row.contentType}
                                                    </span>
                                                </td>
                                                <td className="py-3 px-3">
                                                    <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase ${actionColor}`}>
                                                        {row.suggestedAction}
                                                    </span>
                                                </td>
                                                <td className="py-3 px-3 text-center">
                                                    <button
                                                        onClick={() => handleCreateLegacyShell(row)}
                                                        className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-colors text-[10px] disabled:bg-theme-border disabled:text-theme-muted"
                                                        disabled={row.suggestedAction !== "Create Shell" || loading}
                                                    >
                                                        Create Shell
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

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
