"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle2, Download, FileText, Loader2, PackagePlus, Sparkles } from "lucide-react";
import { PageShell } from "@/components/layout/PageShell";
import {
    ArticleStudioPreview,
    ArticleStudioMode,
    buildPublishPackJson,
    formatArticlePackageMarkdown,
    parseArborArticlePackage,
} from "@/lib/content/articleStudio";

const EXAMPLE_PACKAGE = `{
  "topic_id": "GF-ARTICLE-001",
  "title": "จุลินทรีย์สังเคราะห์แสงช่วยดินอย่างไร",
  "meta_title": "จุลินทรีย์สังเคราะห์แสงช่วยดินอย่างไร | Green Fineness",
  "meta_description": "สรุปบทบาทของจุลินทรีย์สังเคราะห์แสงต่อดิน ราก และการจัดการแปลงแบบเข้าใจง่าย",
  "keywords": ["จุลินทรีย์สังเคราะห์แสง", "PNSB", "ดิน", "เกษตร"],
  "slug": "pnsb-soil-benefits",
  "internal_links_prerequisite": [],
  "internal_links_next_step": [],
  "internal_links_related": [],
  "schema_faq": [],
  "schema_article": {},
  "article_markdown": "## บทนำ\\n...",
  "group_post": "โพสต์สำหรับกลุ่ม...",
  "page_post": "โพสต์สำหรับเพจ...",
  "visual_brief": "ภาพรากพืช ดิน และจุลินทรีย์ในโทนสะอาด",
  "status": "Needs Review"
}`;

const STAGE_PREVIEW = [
    "Research Direction",
    "Draft",
    "SEO & Schema",
    "Visual Package",
    "Review / Publish",
];

function useDebouncedValue<T>(value: T, delayMs: number) {
    const [debouncedValue, setDebouncedValue] = useState(value);

    useEffect(() => {
        const timer = window.setTimeout(() => setDebouncedValue(value), delayMs);
        return () => window.clearTimeout(timer);
    }, [value, delayMs]);

    return debouncedValue;
}

function EmptyPreview() {
    return (
        <div className="flex h-full min-h-[420px] flex-col items-center justify-center rounded-lg border border-dashed border-theme-border bg-theme-card p-8 text-center">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                <Sparkles className="h-6 w-6" />
            </div>
            <h2 className="text-base font-black text-theme-primary">รอ Arbor Package</h2>
            <p className="mt-2 max-w-sm text-sm font-medium leading-6 text-theme-secondary">
                วาง JSON หรือ Markdown จาก Arbor แล้วระบบจะ parse headings, preview fields และเปิดปุ่มสร้าง Article Package
            </p>
        </div>
    );
}

function FieldRow({ label, value }: { label: string; value: string }) {
    return (
        <div className="grid gap-1 py-1.5 sm:grid-cols-[100px_1fr] group">
            <div className="text-[10px] font-black uppercase tracking-wider text-theme-muted group-hover:text-theme-secondary transition-colors">{label}</div>
            <div className="min-w-0 break-words text-xs font-bold text-theme-primary leading-tight">{value || "-"}</div>
        </div>
    );
}

function ListField({ label, value }: { label: string; value: string[] }) {
    return <FieldRow label={label} value={value.length ? value.join(", ") : "-"} />;
}

function healthTone(status: ArticleStudioPreview["contentHealth"]["status"]) {
    if (status === "Incomplete") return "border-red-200 bg-red-50 text-red-700";
    if (status === "Publish Ready") return "border-green-200 bg-green-50 text-green-700";
    if (status === "Review Needed") return "border-amber-200 bg-amber-50 text-amber-700";
    return "border-blue-200 bg-blue-50 text-blue-700";
}

function readinessLabel(value: "ready" | "missing") {
    return value === "ready" ? "ready" : "missing";
}

function ContentHealthCard({ health }: { health: ArticleStudioPreview["contentHealth"] }) {
    return (
        <section className="bg-theme-card/50 rounded-xl p-4 border border-theme-border/50">
            <div className="mb-3 flex items-center justify-between">
                <h3 className="text-[11px] font-black uppercase tracking-widest text-theme-muted">Content Health</h3>
                <span className={`w-fit rounded-full border px-3 py-0.5 text-[10px] font-black uppercase tracking-tight ${healthTone(health.status)}`}>
                    {health.status}
                </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-3 text-[11px] font-bold text-theme-secondary">
                <div className="flex flex-col gap-0.5">
                    <span className="text-[9px] text-theme-muted uppercase tracking-tighter">Fields</span>
                    <span>{health.requiredComplete}/{health.requiredTotal}</span>
                </div>
                <div className="flex flex-col gap-0.5">
                    <span className="text-[9px] text-theme-muted uppercase tracking-tighter">SEO</span>
                    <span>{health.seoComplete}/{health.seoTotal}</span>
                </div>
                <div className="flex flex-col gap-0.5">
                    <span className="text-[9px] text-theme-muted uppercase tracking-tighter">Internal</span>
                    <span>{health.internalLinksComplete}/{health.internalLinksTotal}</span>
                </div>
                <div className="flex flex-col gap-0.5">
                    <span className="text-[9px] text-theme-muted uppercase tracking-tighter">Visual</span>
                    <span className={health.visualNotes === 'ready' ? 'text-green-600' : 'text-amber-600'}>{readinessLabel(health.visualNotes)}</span>
                </div>
                <div className="flex flex-col gap-0.5">
                    <span className="text-[9px] text-theme-muted uppercase tracking-tighter">FAQ</span>
                    <span className={health.faq === 'ready' ? 'text-green-600' : 'text-amber-600'}>{readinessLabel(health.faq)}</span>
                </div>
                <div className="flex flex-col gap-0.5">
                    <span className="text-[9px] text-theme-muted uppercase tracking-tighter">Refs</span>
                    <span className={health.references === 'ready' ? 'text-green-600' : 'text-amber-600'}>{readinessLabel(health.references)}</span>
                </div>
            </div>
        </section>
    );
}

function MissingFieldGroup({
    title,
    items,
    emptyLabel,
    tone,
}: {
    title?: string;
    items: ArticleStudioPreview["missingFieldGroups"]["required"];
    emptyLabel: string;
    tone: string;
}) {
    return (
        <div className="flex flex-col gap-1.5">
            {title && <div className="text-[10px] font-black uppercase tracking-wider text-theme-muted">{title}</div>}
            {items.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                    {items.map((item) => (
                        <span key={item.field} className={`rounded px-2 py-0.5 text-[10px] font-bold border ${tone}`}>
                            {item.label}
                        </span>
                    ))}
                </div>
            ) : (
                <div className="text-[11px] font-bold text-theme-secondary opacity-60">{emptyLabel}</div>
            )}
        </div>
    );
}

function MissingFieldsCard({ groups, isPartial }: { groups: ArticleStudioPreview["missingFieldGroups"], isPartial?: boolean }) {
    if (isPartial) {
        return (
            <section className="bg-theme-card/50 rounded-xl p-4 border border-theme-border/50">
                <div className="space-y-6">
                    <div>
                        <div className="mb-3">
                            <h3 className="text-[11px] font-black uppercase tracking-widest text-red-600">Required Now / Blocking</h3>
                        </div>
                        <MissingFieldGroup
                            items={groups.required}
                            emptyLabel="Ready for Update"
                            tone="border-red-100 bg-red-50 text-red-600"
                        />
                    </div>
                    <div className="pt-4 border-t border-theme-border/50">
                        <div className="mb-3">
                            <h3 className="text-[11px] font-black uppercase tracking-widest text-theme-muted">Later Fields</h3>
                        </div>
                        <MissingFieldGroup
                            items={[...groups.recommended, ...groups.optional]}
                            emptyLabel="– none –"
                            tone="border-theme-border bg-theme-input text-theme-secondary"
                        />
                    </div>
                </div>
            </section>
        );
    }

    return (
        <section className="bg-theme-card/50 rounded-xl p-4 border border-theme-border/50">
            <div className="mb-4">
                <h3 className="text-[11px] font-black uppercase tracking-widest text-theme-muted">Missing Blocks</h3>
            </div>
            <div className="space-y-4">
                <MissingFieldGroup
                    title="Required"
                    items={groups.required}
                    emptyLabel="พร้อมสร้าง"
                    tone="border-red-100 bg-red-50 text-red-600"
                />
                <MissingFieldGroup
                    title="Recommended"
                    items={groups.recommended}
                    emptyLabel="– none –"
                    tone="border-amber-100 bg-amber-50 text-amber-600"
                />
            </div>
        </section>
    );
}

function PreviewPanel({ preview }: { preview: ArticleStudioPreview }) {
    const isPartial = preview.mode === "partial";
    const markdown = isPartial ? preview.article_markdown : formatArticlePackageMarkdown(preview);

    return (
        <div className="space-y-5">
            <div className="rounded-lg border border-theme-border bg-theme-card-elevated p-5 shadow-theme-soft">
                <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                        <div className="flex items-center gap-2">
                            <div className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border ${preview.mode === 'partial' ? 'bg-purple-50 border-purple-200 text-purple-600' : 'bg-blue-50 border-blue-200 text-blue-600'}`}>
                                {preview.mode === 'partial' ? 'Partial Step' : 'Full Package'}
                            </div>
                            {preview.detectedStepRole && preview.detectedStepRole !== 'general' && (
                                <div className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-theme-input border border-theme-border text-theme-secondary">
                                    {getStepLabel(preview.detectedStepRole)}
                                </div>
                            )}
                        </div>
                        <h2 className="mt-2 break-words text-lg font-black tracking-tight text-theme-primary sm:text-xl">{preview.title || "Untitled Article"}</h2>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {preview.status === "needs_human_insight" && (
                            <span className="w-fit rounded-md border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-black text-amber-700">
                                Human Insight
                            </span>
                        )}
                        <span className="w-fit rounded-md border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-black text-amber-700">
                            {preview.status || "needs_human_insight"}
                        </span>
                    </div>
                </div>

                {preview.validationMessages.length > 0 && (
                    <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-semibold leading-6 text-red-700">
                        {preview.validationMessages.map((message) => (
                            <div key={message}>{message}</div>
                        ))}
                    </div>
                )}

                {preview.generatedFields.length > 0 && (
                    <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm font-semibold leading-6 text-blue-700">
                        Auto-generated fields: {preview.generatedFields.join(", ")}
                    </div>
                )}

                <div className="mb-4 grid gap-3 border-y border-theme-border py-4 lg:grid-cols-2">
                    <ContentHealthCard health={preview.contentHealth} />
                    <MissingFieldsCard groups={preview.missingFieldGroups} isPartial={preview.mode === 'partial'} />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-1">
                    <FieldRow label="mode" value={preview.mode} />
                    <FieldRow label="status" value={preview.status} />
                    <FieldRow label="difficulty" value={preview.difficulty} />
                    <FieldRow label="visual" value={preview.visual_status} />
                    <FieldRow label="topic_id" value={preview.topic_id} />
                    <FieldRow label="slug" value={preview.slug} />
                    <div className="md:col-span-2">
                        <FieldRow label="meta_title" value={preview.meta_title} />
                    </div>
                    <div className="md:col-span-2">
                        <FieldRow label="meta_desc" value={preview.meta_description} />
                    </div>
                </div>

                <div className="mt-2 pt-2 border-t border-theme-border/50 space-y-1">
                    <ListField label="keywords" value={preview.keywords} />
                    <ListField label="internal" value={[...preview.internal_links_prerequisite, ...preview.internal_links_next_step, ...preview.internal_links_related]} />
                </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
                <section className="rounded-lg border border-theme-border bg-theme-card-elevated p-5 shadow-theme-soft">
                    <h3 className="text-sm font-black text-theme-primary">Sections</h3>
                    <div className="mt-4 grid gap-2">
                        {STAGE_PREVIEW.map((stage) => (
                            <div key={stage} className="flex items-center gap-2 rounded-md border border-theme-border bg-theme-card px-3 py-2">
                                <CheckCircle2 className="h-4 w-4 text-blue-600" />
                                <span className="text-sm font-bold text-theme-primary">{stage}</span>
                            </div>
                        ))}
                    </div>
                </section>

                <section className="rounded-lg border border-theme-border bg-theme-card-elevated p-5 shadow-theme-soft">
                    <h3 className="text-sm font-black text-theme-primary">Detected Headings</h3>
                    <div className="mt-4 flex flex-wrap gap-2">
                        {preview.detectedHeadings.length ? preview.detectedHeadings.map((heading, idx) => (
                            <span key={`${heading}-${idx}`} className="rounded-md border border-theme-border bg-theme-card px-2.5 py-1 text-xs font-bold text-theme-secondary">
                                {heading}
                            </span>
                        )) : (
                            <span className="text-sm font-medium text-theme-muted">JSON package detected</span>
                        )}
                    </div>
                </section>
            </div>

            <section className="rounded-lg border border-theme-border bg-theme-card-elevated p-5 shadow-theme-soft">
                <div className="mb-3 flex items-center gap-2">
                    <FileText className="h-4 w-4 text-blue-600" />
                    <h3 className="text-sm font-black text-theme-primary">{isPartial ? "Partial Step Markdown" : "Article Hub Markdown"}</h3>
                </div>
                <pre className="max-h-[360px] overflow-auto whitespace-pre-wrap break-words rounded-lg border border-theme-border bg-theme-input p-4 text-xs leading-6 text-theme-secondary custom-scrollbar">
                    {markdown || <span className="text-theme-muted italic">No content yet.</span>}
                </pre>
            </section>
        </div>
    );
}

function getStepLabel(role: string) {
    const labels: Record<string, string> = {
        research_raw: "Research Raw — NotebookLM",
        research_direction: "Research Direction — Arbor Questions",
        brief: "Brief",
        script_caption: "Script & Caption",
        outline_web_article: "Outline Web Article",
        assets_canva: "Assets / Canva",
        seo_schema: "SEO & Schema",
        publish: "Publish",
    };
    return labels[role] || role.replace('_', ' ');
}

export default function ArticleStudioClient() {
    const router = useRouter();
    const [rawInput, setRawInput] = useState("");
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [importMode, setImportMode] = useState<ArticleStudioMode>("editorial");
    const [isManualMode, setIsManualMode] = useState(false);
    const prevRawInput = useRef(rawInput);
    const previewInput = useDebouncedValue(rawInput, 250);

    useEffect(() => {
        const isClearingInput = rawInput.trim() === "" && prevRawInput.current.trim() !== "";
        prevRawInput.current = rawInput;

        if (isClearingInput) {
            setImportMode("editorial");
            setIsManualMode(false);
            return;
        }

        if (!isManualMode && rawInput.trim() !== "") {
            const hasPartialKeywords = /step_role|Research Raw|Research Direction|Brief|Script & Caption|Assets \/ Canva|SEO & Schema|Publish/i.test(rawInput);
            if (hasPartialKeywords) {
                setImportMode("partial");
            }
        }
    }, [rawInput, isManualMode]);

    const preview = useMemo(() => {
        try {
            return parseArborArticlePackage(previewInput, importMode);
        } catch {
            return null;
        }
    }, [previewInput, importMode]);

    const canSave = !!preview && preview.missingFields.length === 0 && !isSaving;

    function handleExportPublishPack() {
        if (!preview) return;
        const publishPack = buildPublishPackJson(preview);
        const blob = new Blob([JSON.stringify(publishPack, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${preview.slug || preview.topic_id || "article"}-publish-pack.json`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
    }

    async function handleCreatePackage() {
        if (!preview) return;
        setIsSaving(true);
        setError(null);
        setSuccess(null);

        try {
            const res = await fetch("/api/content/package", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ articlePackage: preview }),
            });

            const data = await res.json();
            if (!res.ok) {
                const detailText = Array.isArray(data.details) ? `\n${data.details.join("\n")}` : "";
                const duplicateText = Array.isArray(data.duplicates) && data.duplicates.length > 0
                    ? `\nรายการที่พบ: ${data.duplicates.map((item: { type: string; title: string }) => `${item.type}: ${item.title}`).join(" | ")}`
                    : "";
                throw new Error(`${data.error || "Create package failed"}${detailText}${duplicateText}`);
            }

            const warningText = Array.isArray(data.warnings) && data.warnings.length > 0
                ? `\nWarning: ${data.warnings.join(" | ")}`
                : "";
            const reuseText = data.reusedList ? " (reuse list เดิม)" : "";
            setSuccess(`สร้าง Article Package แล้ว: ${data.topicTitle}${reuseText}${warningText}`);
            window.dispatchEvent(new Event("task-updated"));
            router.refresh();
        } catch (err) {
            setError(err instanceof Error ? err.message : String(err));
        } finally {
            setIsSaving(false);
        }
    }

    return (
        <PageShell className="max-w-none px-6 2xl:px-8">
            <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-3">
                        <Link
                            href="/workspaces/content"
                            className="p-2 -ml-2 rounded-full hover:bg-theme-hover transition-colors text-theme-secondary"
                        >
                            <ArrowLeft className="h-5 w-5" />
                        </Link>
                        <h1 className="text-2xl font-black tracking-tight text-theme-primary">Article Studio</h1>
                        <span className="rounded-full border border-blue-200 bg-blue-50 px-3 py-0.5 text-[10px] font-black uppercase tracking-wider text-blue-700">
                            v1.1
                        </span>
                    </div>
                </div>
                <p className="hidden md:block max-w-md text-right text-xs font-bold leading-5 text-theme-muted uppercase tracking-wider">
                    Arbor Import Mode & Editorial Preview
                </p>
            </div>

            <div className="grid gap-6 lg:grid-cols-[420px_1fr] xl:grid-cols-[480px_1fr] 2xl:grid-cols-[540px_1fr]">
                {/* Left Panel: Writing Workspace (Fixed-ish width but responsive) */}
                <div className="relative flex flex-col">
                    <section className="sticky top-6 flex flex-col h-[calc(100vh-140px)] rounded-[24px] border border-theme-border bg-theme-card shadow-theme-soft overflow-hidden">
                        <div className="px-6 py-5 border-b border-theme-border/50 flex flex-col gap-4 bg-theme-card">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h2 className="text-sm font-black text-theme-primary uppercase tracking-widest">Arbor Editor</h2>
                                    <p className="text-[10px] font-bold text-theme-muted uppercase tracking-tighter mt-0.5">Markdown or JSON Input</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setRawInput(EXAMPLE_PACKAGE)}
                                    className="px-3 py-1.5 rounded-full bg-theme-input text-[10px] font-black uppercase tracking-widest text-theme-secondary hover:bg-theme-hover transition-colors border border-theme-border"
                                >
                                    Load Example
                                </button>
                            </div>

                            <div className="flex p-1 bg-theme-input rounded-xl border border-theme-border/50">
                                <button
                                    onClick={() => {
                                        setImportMode("editorial");
                                        setIsManualMode(true);
                                    }}
                                    className={`flex-1 px-3 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${importMode !== "partial" ? "bg-theme-card text-theme-primary shadow-sm" : "text-theme-muted hover:text-theme-secondary"}`}
                                >
                                    Full Package
                                </button>
                                <button
                                    onClick={() => {
                                        setImportMode("partial");
                                        setIsManualMode(true);
                                    }}
                                    className={`flex-1 px-3 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${importMode === "partial" ? "bg-theme-card text-theme-primary shadow-sm" : "text-theme-muted hover:text-theme-secondary"}`}
                                >
                                    Partial Step
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 relative group">
                            <textarea
                                value={rawInput}
                                onChange={(event) => {
                                    setRawInput(event.target.value);
                                    setError(null);
                                    setSuccess(null);
                                }}
                                className="absolute inset-0 w-full h-full p-8 font-mono text-[13px] leading-[1.8] text-theme-primary bg-theme-input/20 outline-none transition-theme placeholder:text-theme-muted resize-none custom-scrollbar"
                                placeholder="Paste Arbor Package content here..."
                            />
                        </div>

                        {/* Sticky Action Bar */}
                        <div className="p-6 bg-theme-card border-t border-theme-border/50">
                            {error && (
                                <div className="mb-4 rounded-xl border border-red-100 bg-red-50 p-3 text-xs font-bold text-red-600 flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                                    {error}
                                </div>
                            )}
                            {success && (
                                <div className="mb-4 rounded-xl border border-green-100 bg-green-50 p-3 text-xs font-bold text-green-600 flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                                    {success}
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    type="button"
                                    disabled={!preview}
                                    onClick={handleExportPublishPack}
                                    className="flex items-center justify-center gap-2 rounded-xl border border-theme-border bg-theme-card px-4 py-3.5 text-[11px] font-black uppercase tracking-widest text-theme-secondary shadow-sm hover:bg-theme-hover hover:text-theme-primary disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-95"
                                >
                                    <Download className="h-4 w-4" />
                                    Export
                                </button>
                                <button
                                    type="button"
                                    disabled={!canSave}
                                    onClick={handleCreatePackage}
                                    className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3.5 text-[11px] font-black uppercase tracking-widest text-white shadow-lg shadow-blue-500/20 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-95"
                                >
                                    {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <PackagePlus className="h-4 w-4" />}
                                    {preview?.mode === 'partial' ? 'Update Package' : 'Create Package'}
                                </button>
                            </div>
                            <p className="mt-4 text-[9px] text-center font-bold text-theme-muted uppercase tracking-widest leading-relaxed">
                                {preview?.mode === 'partial' 
                                    ? "Partial mode: topic_id and content are required. SEO, FAQ, references, visuals, and social posts can be added later."
                                    : "Full mode: All required fields must be satisfied to enable package creation."}
                            </p>
                        </div>
                    </section>
                </div>

                {/* Right Panel: Editorial Preview */}
                <section className="flex-1 min-w-0">
                    {preview ? <PreviewPanel preview={preview} /> : <EmptyPreview />}
                </section>
            </div>
        </PageShell>
    );
}
