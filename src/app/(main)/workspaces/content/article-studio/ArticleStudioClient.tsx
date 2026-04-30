"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle2, Download, FileText, Loader2, PackagePlus, Sparkles } from "lucide-react";
import { PageShell } from "@/components/layout/PageShell";
import {
    ArticleStudioPreview,
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
        <div className="grid gap-1 border-b border-theme-border py-3 last:border-0 sm:grid-cols-[minmax(128px,180px)_1fr]">
            <div className="text-[11px] font-black uppercase tracking-wider text-theme-muted">{label}</div>
            <div className="min-w-0 break-words text-sm font-semibold text-theme-primary">{value || "-"}</div>
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
        <section>
            <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <h3 className="text-sm font-black text-theme-primary">Content Health</h3>
                <span className={`w-fit rounded-md border px-2.5 py-1 text-xs font-black ${healthTone(health.status)}`}>
                    {health.status}
                </span>
            </div>
            <div className="grid gap-2 text-sm font-semibold text-theme-secondary sm:grid-cols-2">
                <div>Required fields: {health.requiredComplete}/{health.requiredTotal}</div>
                <div>SEO fields: {health.seoComplete}/{health.seoTotal}</div>
                <div>Internal links: {health.internalLinksComplete}/{health.internalLinksTotal}</div>
                <div>Visual notes: {readinessLabel(health.visualNotes)}</div>
                <div>FAQ: {readinessLabel(health.faq)}</div>
                <div>References: {readinessLabel(health.references)}</div>
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
    title: string;
    items: ArticleStudioPreview["missingFieldGroups"]["required"];
    emptyLabel: string;
    tone: string;
}) {
    return (
        <div className="border-l-2 border-theme-border pl-3">
            <div className="mb-2 text-xs font-black uppercase tracking-wider text-theme-muted">{title}</div>
            {items.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                    {items.map((item) => (
                        <span key={item.field} className={`rounded-md border px-2.5 py-1 text-xs font-black ${tone}`}>
                            {item.label}
                        </span>
                    ))}
                </div>
            ) : (
                <div className="text-sm font-semibold text-theme-secondary">{emptyLabel}</div>
            )}
        </div>
    );
}

function MissingFieldsCard({ groups }: { groups: ArticleStudioPreview["missingFieldGroups"] }) {
    return (
        <section>
            <div className="mb-3">
                <h3 className="text-sm font-black text-theme-primary">Missing Fields</h3>
                <p className="mt-1 text-xs font-semibold leading-5 text-theme-muted">
                    Required blocks create package, recommended is warning, optional is informational.
                </p>
            </div>
            <div className="grid gap-3 lg:grid-cols-3">
                <MissingFieldGroup
                    title="Required / Blocking"
                    items={groups.required}
                    emptyLabel="พร้อมสร้าง"
                    tone="border-red-200 bg-red-50 text-red-700"
                />
                <MissingFieldGroup
                    title="Recommended / Warning"
                    items={groups.recommended}
                    emptyLabel="ครบสำหรับรีวิว"
                    tone="border-amber-200 bg-amber-50 text-amber-700"
                />
                <MissingFieldGroup
                    title="Optional / Info"
                    items={groups.optional}
                    emptyLabel="ครบแล้ว"
                    tone="border-blue-200 bg-blue-50 text-blue-700"
                />
            </div>
        </section>
    );
}

function PreviewPanel({ preview }: { preview: ArticleStudioPreview }) {
    const markdown = formatArticlePackageMarkdown(preview);

    return (
        <div className="space-y-5">
            <div className="rounded-lg border border-theme-border bg-theme-card-elevated p-5 shadow-theme-soft">
                <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                        <div className="text-[11px] font-black uppercase tracking-widest text-blue-600">Preview Required</div>
                        <h2 className="mt-1 break-words text-lg font-black tracking-tight text-theme-primary sm:text-xl">{preview.title || "Untitled Article"}</h2>
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

                <div className="mb-4 grid gap-4 border-y border-theme-border py-4 xl:grid-cols-[0.9fr_1.1fr]">
                    <ContentHealthCard health={preview.contentHealth} />
                    <MissingFieldsCard groups={preview.missingFieldGroups} />
                </div>

                <FieldRow label="mode" value={preview.mode} />
                <FieldRow label="status" value={preview.status} />
                <FieldRow label="difficulty" value={preview.difficulty} />
                <FieldRow label="visual_status" value={preview.visual_status} />
                <FieldRow label="topic_id" value={preview.topic_id} />
                <FieldRow label="slug" value={preview.slug} />
                <FieldRow label="meta_title" value={preview.meta_title} />
                <FieldRow label="meta_description" value={preview.meta_description} />
                <ListField label="keywords" value={preview.keywords} />
                <ListField label="prerequisite links" value={preview.internal_links_prerequisite} />
                <ListField label="next step links" value={preview.internal_links_next_step} />
                <ListField label="related links" value={preview.internal_links_related} />
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
                        {preview.detectedHeadings.length ? preview.detectedHeadings.map((heading) => (
                            <span key={heading} className="rounded-md border border-theme-border bg-theme-card px-2.5 py-1 text-xs font-bold text-theme-secondary">
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
                    <h3 className="text-sm font-black text-theme-primary">Article Hub Markdown</h3>
                </div>
                <pre className="max-h-[360px] overflow-auto whitespace-pre-wrap break-words rounded-lg border border-theme-border bg-theme-input p-4 text-xs leading-6 text-theme-secondary custom-scrollbar">
                    {markdown}
                </pre>
            </section>
        </div>
    );
}

export default function ArticleStudioClient() {
    const router = useRouter();
    const [rawInput, setRawInput] = useState("");
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const preview = useMemo(() => {
        if (!rawInput.trim()) return null;
        try {
            return parseArborArticlePackage(rawInput);
        } catch {
            return null;
        }
    }, [rawInput]);

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

            setSuccess(`สร้าง Article Package แล้ว: ${data.topicTitle}`);
            window.dispatchEvent(new Event("task-updated"));
            router.refresh();
        } catch (err) {
            setError(err instanceof Error ? err.message : String(err));
        } finally {
            setIsSaving(false);
        }
    }

    return (
        <PageShell className="max-w-7xl px-4 sm:px-6 2xl:px-10">
            <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                        <h1 className="text-2xl font-bold tracking-tight text-theme-primary">Article Studio</h1>
                        <span className="rounded-md border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-black uppercase tracking-wider text-blue-700">
                            v1
                        </span>
                    </div>
                    <p className="mt-1 max-w-2xl text-sm font-medium leading-6 text-theme-secondary">
                        Arbor Import Mode สำหรับสร้าง Article Package ของ Green Fineness แบบ preview ก่อน save
                    </p>
                </div>
                <div className="flex shrink-0">
                    <Link
                        href="/workspaces/content"
                        className="inline-flex items-center gap-2 rounded-lg border border-theme-border bg-theme-card px-3 py-2 text-sm font-bold text-theme-secondary transition-theme hover:bg-theme-hover hover:text-theme-primary"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        กลับ Content
                    </Link>
                </div>
            </div>

            <div className="grid gap-6 xl:grid-cols-[minmax(360px,0.9fr)_minmax(520px,1.1fr)]">
                <section className="rounded-lg border border-theme-border bg-theme-card-elevated p-5 shadow-theme-soft">
                    <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                            <h2 className="text-base font-black text-theme-primary">Arbor Import Box</h2>
                            <p className="mt-1 text-sm font-medium leading-6 text-theme-secondary">
                                วาง Markdown หรือ JSON จาก Arbor แล้วตรวจ preview ก่อนสร้าง package
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={() => setRawInput(EXAMPLE_PACKAGE)}
                            className="rounded-lg border border-theme-border bg-theme-card px-3 py-2 text-xs font-black text-theme-secondary transition-theme hover:bg-theme-hover hover:text-theme-primary"
                        >
                            เติมตัวอย่าง
                        </button>
                    </div>

                    <textarea
                        value={rawInput}
                        onChange={(event) => {
                            setRawInput(event.target.value);
                            setError(null);
                            setSuccess(null);
                        }}
                        className="min-h-[360px] w-full resize-y rounded-lg border border-theme-input-border bg-theme-input p-4 font-mono text-sm leading-6 text-theme-primary outline-none transition-theme placeholder:text-theme-muted focus:border-theme-accent focus:ring-4 focus:ring-theme-ring sm:min-h-[520px]"
                        placeholder="Paste Arbor Package JSON หรือ Markdown ที่มี headings เช่น Research Direction, Draft, SEO & Schema, Visual Brief, Publish Checklist"
                    />

                    <div className="mt-4 flex flex-col gap-3 border-t border-theme-border pt-4">
                        <div className="text-xs font-semibold text-theme-muted">
                            Save จะเปิดได้เมื่อ preview ผ่าน field หลักครบ ส่วน SEO และ Visual Brief จะเติมให้อัตโนมัติถ้าว่าง
                        </div>
                        <div className="grid gap-2 sm:flex sm:justify-end">
                            <button
                                type="button"
                                disabled={!preview}
                                onClick={handleExportPublishPack}
                                className="inline-flex items-center justify-center gap-2 rounded-lg border border-theme-border bg-theme-card px-5 py-3 text-sm font-black text-theme-secondary shadow-theme-soft transition-theme hover:bg-theme-hover hover:text-theme-primary disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                <Download className="h-4 w-4" />
                                Export Publish Pack
                            </button>
                            <button
                                type="button"
                                disabled={!canSave}
                                onClick={handleCreatePackage}
                                className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 py-3 text-sm font-black text-white shadow-theme-soft transition-theme hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <PackagePlus className="h-4 w-4" />}
                                Create Article Package
                            </button>
                        </div>
                    </div>

                    {error && (
                        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-700">
                            {error}
                        </div>
                    )}
                    {success && (
                        <div className="mt-4 rounded-lg border border-green-200 bg-green-50 p-3 text-sm font-bold text-green-700">
                            {success}
                        </div>
                    )}
                </section>

                <section>
                    {preview ? <PreviewPanel preview={preview} /> : <EmptyPreview />}
                </section>
            </div>
        </PageShell>
    );
}
