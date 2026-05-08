"use client";

import { useEffect, useMemo, useRef, useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { 
    ArrowLeft, 
    CheckCircle2, 
    Download, 
    FileText, 
    Loader2, 
    PackagePlus, 
    Sparkles,
    Search, 
    MessageSquare, 
    Layout, 
    Image, 
    Send, 
    Circle,
    Save,
    Trash2,
    FileEdit
} from "lucide-react";
import { PageShell } from "@/components/layout/PageShell";
import {
    ArticleStudioPreview,
    ArticleStudioMode,
    ArticleStudioStepRole,
    ARTICLE_STUDIO_STEPS,
    buildPublishPackJson,
    formatArticlePackageMarkdown,
    isInvalidTopicId,
    isPlaceholderValue,
    parseArborArticlePackage,
} from "@/lib/content/articleStudio";

// --- Helpers ---

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
            <h2 className="text-base font-black text-theme-primary">Preview Area</h2>
            <p className="mt-2 max-w-sm text-sm font-medium leading-6 text-theme-secondary">
                เลือกขั้นตอนและเริ่มเขียนเพื่อดู Preview และการตรวจสอบ Content Health
            </p>
        </div>
    );
}

function FieldRow({ label, value }: { label: string; value: string }) {
    return (
        <div className="grid gap-1 py-1.5 sm:grid-cols-[90px_1fr] group border-b border-theme-border/30 last:border-0 min-w-0">
            <div className="text-[9px] font-black uppercase tracking-widest text-theme-muted/80 group-hover:text-theme-secondary transition-colors shrink-0">{label}</div>
            <div className="min-w-0 break-words text-[11px] font-bold text-theme-primary leading-tight">{value || "—"}</div>
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
        <section className="bg-theme-card border border-theme-border rounded-[20px] p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
                <h3 className="text-[11px] font-black uppercase tracking-widest text-theme-muted">Content Health</h3>
                <span className={`w-fit rounded-full border px-3 py-0.5 text-[10px] font-black uppercase tracking-tight ${healthTone(health.status)}`}>
                    {health.status}
                </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-3 text-[11px] font-bold text-theme-secondary">
                <div className="flex flex-col gap-0.5"><span className="text-[9px] text-theme-muted uppercase tracking-tighter">Fields</span><span>{health.requiredComplete}/{health.requiredTotal}</span></div>
                <div className="flex flex-col gap-0.5"><span className="text-[9px] text-theme-muted uppercase tracking-tighter">SEO</span><span>{health.seoComplete}/{health.seoTotal}</span></div>
                <div className="flex flex-col gap-0.5"><span className="text-[9px] text-theme-muted uppercase tracking-tighter">Body</span><span className={health.body === 'ready' ? 'text-green-600' : 'text-amber-600'}>{readinessLabel(health.body)}</span></div>
                <div className="flex flex-col gap-0.5"><span className="text-[9px] text-theme-muted uppercase tracking-tighter">Internal</span><span className={health.internalLinks === 'ready' ? 'text-green-600' : 'text-amber-600'}>{readinessLabel(health.internalLinks)}</span></div>
                <div className="flex flex-col gap-0.5"><span className="text-[9px] text-theme-muted uppercase tracking-tighter">Visual</span><span className={health.visualNotes === 'ready' ? 'text-green-600' : 'text-amber-600'}>{readinessLabel(health.visualNotes)}</span></div>
                <div className="flex flex-col gap-0.5"><span className="text-[9px] text-theme-muted uppercase tracking-tighter">FAQ</span><span className={health.faq === 'ready' ? 'text-green-600' : 'text-amber-600'}>{readinessLabel(health.faq)}</span></div>
                <div className="flex flex-col gap-0.5"><span className="text-[9px] text-theme-muted uppercase tracking-tighter">Refs</span><span className={health.references === 'ready' ? 'text-green-600' : 'text-amber-600'}>{readinessLabel(health.references)}</span></div>
                <div className="flex flex-col gap-0.5"><span className="text-[9px] text-theme-muted uppercase tracking-tighter">Group</span><span className={health.groupPost === 'ready' ? 'text-green-600' : 'text-amber-600'}>{readinessLabel(health.groupPost)}</span></div>
                <div className="flex flex-col gap-0.5"><span className="text-[9px] text-theme-muted uppercase tracking-tighter">Page</span><span className={health.pagePost === 'ready' ? 'text-green-600' : 'text-amber-600'}>{readinessLabel(health.pagePost)}</span></div>
                <div className="flex flex-col gap-0.5"><span className="text-[9px] text-theme-muted uppercase tracking-tighter">Personal</span><span className={health.personalPost === 'ready' ? 'text-green-600' : 'text-amber-600'}>{readinessLabel(health.personalPost)}</span></div>
            </div>
        </section>
    );
}

function MissingFieldGroup({ title, items, emptyLabel, tone }: { title?: string; items: ArticleStudioPreview["missingFieldGroups"]["required"]; emptyLabel: string; tone: string; }) {
    return (
        <div className="flex flex-col gap-1.5">
            {title && <div className="text-[10px] font-black uppercase tracking-wider text-theme-muted">{title}</div>}
            {items.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                    {items.map((item) => (
                        <span key={item.field} className={`rounded px-2 py-0.5 text-[10px] font-bold border ${tone}`}>{item.label}</span>
                    ))}
                </div>
            ) : (
                <div className="text-[11px] font-bold text-theme-secondary opacity-60">{emptyLabel}</div>
            )}
        </div>
    );
}

function MissingFieldsCard({ groups }: { groups: ArticleStudioPreview["missingFieldGroups"], isPartial?: boolean }) {
    return (
        <section className="bg-theme-card border border-theme-border rounded-[20px] p-5 shadow-sm">
            <div className="space-y-5">
                <div>
                    <div className="mb-2.5"><h3 className="text-[10px] font-black uppercase tracking-widest text-red-600">1. Required</h3></div>
                    <MissingFieldGroup items={groups.required} emptyLabel="Ready" tone="border-red-100 bg-red-50 text-red-600" />
                </div>
                <div>
                    <div className="mb-2.5"><h3 className="text-[10px] font-black uppercase tracking-widest text-amber-600">2. GF Hub Sync</h3></div>
                    <MissingFieldGroup items={groups.recommended} emptyLabel="Synced" tone="border-amber-100 bg-amber-50 text-amber-600" />
                </div>
                <div>
                    <div className="mb-2.5"><h3 className="text-[10px] font-black uppercase tracking-widest text-theme-muted">3. Publish / SEO</h3></div>
                    <MissingFieldGroup items={groups.optional} emptyLabel="Ready" tone="border-theme-border bg-theme-input text-theme-secondary" />
                </div>
            </div>
        </section>
    );
}

function PreviewPanel({ preview }: { preview: ArticleStudioPreview }) {
    const isPartial = preview.mode === "partial";
    const markdown = isPartial ? preview.article_markdown : formatArticlePackageMarkdown(preview);
    return (
        <div className="space-y-6 min-w-0">
            <div className="rounded-[24px] border border-theme-border bg-theme-card p-6 shadow-theme-soft min-w-0">
                <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between min-w-0">
                    <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                            <div className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border shrink-0 ${preview.mode === 'partial' ? 'bg-purple-50 border-purple-200 text-purple-600' : 'bg-blue-50 border-blue-200 text-blue-600'}`}>
                                {preview.mode === 'partial' ? 'Partial Step' : 'Full Package'}
                            </div>
                            {preview.detectedStepRole && preview.detectedStepRole !== 'general' && (
                                <div className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-theme-input border border-theme-border text-theme-secondary shrink-0">
                                    {getStepLabel(preview.detectedStepRole)}
                                </div>
                            )}
                        </div>
                        <h2 className="mt-3 break-words text-lg font-black tracking-tight text-theme-primary sm:text-xl line-clamp-3 leading-tight">{preview.title || "Untitled Article"}</h2>
                    </div>
                    <div className="flex flex-wrap gap-2 shrink-0 items-start">
                        {preview.status === "needs_human_insight" && <span className="w-fit rounded-md border border-amber-200 bg-amber-50 px-2.5 py-1 text-[10px] font-black text-amber-700 uppercase tracking-tight">Human Insight</span>}
                        <span className="w-fit rounded-md border border-amber-200 bg-amber-50 px-2.5 py-1 text-[10px] font-black text-amber-700 uppercase tracking-tight">{preview.status || "needs_human_insight"}</span>
                    </div>
                </div>
                {preview.validationMessages.length > 0 && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-semibold leading-6 text-red-700">{preview.validationMessages.map((message) => <div key={message}>{message}</div>)}</div>}
                {preview.generatedFields.length > 0 && <div className="mb-6 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm font-semibold leading-6 text-blue-700">Auto-generated fields: {preview.generatedFields.join(", ")}</div>}
                <div className="mb-6 flex flex-col gap-4 border-y border-theme-border/50 py-6 min-w-0">
                    <ContentHealthCard health={preview.contentHealth} />
                    <MissingFieldsCard groups={preview.missingFieldGroups} isPartial={preview.mode === 'partial'} />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 min-w-0">
                    <FieldRow label="layer" value={preview.content_layer} />
                    <FieldRow label="type" value={preview.article_type} />
                    <FieldRow label="role" value={preview.article_role} />
                    <FieldRow label="narrative" value={preview.narrative_status} />
                    <FieldRow label="season" value={preview.season_id} />
                    <FieldRow label="episode" value={preview.episode_id} />
                    <FieldRow label="story set" value={preview.story_set} />
                    <FieldRow label="order" value={preview.story_order} />
                    <FieldRow label="topic_id" value={preview.topic_id} />
                    <FieldRow label="status" value={preview.status} />
                    <FieldRow label="primary system" value={preview.primary_system} />
                    <ListField label="systems" value={preview.secondary_systems} />
                    <FieldRow label="publish pack" value={preview.publish_pack_status} />
                    <FieldRow label="references" value={preview.references_status} />
                    <FieldRow label="next action" value={preview.next_action} />
                    <FieldRow label="slug" value={preview.slug} />
                    <div className="sm:col-span-2 min-w-0"><FieldRow label="meta_title" value={preview.meta_title} /></div>
                    <div className="sm:col-span-2 min-w-0"><FieldRow label="meta_desc" value={preview.meta_description} /></div>
                </div>
                <div className="mt-2 pt-2 border-t border-theme-border/50 space-y-1 min-w-0">
                    <ListField label="keywords" value={preview.keywords} />
                </div>
            </div>
            <div className="grid gap-6 lg:grid-cols-2 min-w-0">
                <section className="rounded-xl border border-theme-border bg-theme-card p-6 shadow-sm min-w-0">
                    <h3 className="text-xs font-black uppercase tracking-widest text-theme-muted mb-4">Sections</h3>
                    <div className="grid gap-2.5 min-w-0">{STAGE_PREVIEW.map((stage) => <div key={stage} className="flex items-center gap-2.5 rounded-lg border border-theme-border bg-theme-input/50 px-3.5 py-2.5 min-w-0"><CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" /><span className="text-sm font-bold text-theme-primary truncate">{stage}</span></div>)}</div>
                </section>
                <section className="rounded-xl border border-theme-border bg-theme-card p-6 shadow-sm min-w-0">
                    <h3 className="text-xs font-black uppercase tracking-widest text-theme-muted mb-4">Headings Detected</h3>
                    <div className="flex flex-wrap gap-2.5 min-w-0">{preview.detectedHeadings.length ? preview.detectedHeadings.map((heading, idx) => <span key={`${heading}-${idx}`} className="rounded-lg border border-theme-border bg-theme-input/50 px-3 py-1.5 text-xs font-bold text-theme-secondary truncate max-w-full">{heading}</span>) : <span className="text-sm font-medium text-theme-muted italic">JSON package detected</span>}</div>
                </section>
            </div>
            <section className="rounded-[24px] border border-theme-border bg-theme-card p-6 shadow-theme-soft min-w-0">
                <div className="mb-4 flex items-center gap-2.5 min-w-0"><FileText className="h-4 w-4 text-blue-600 shrink-0" /><h3 className="text-sm font-black text-theme-primary uppercase tracking-widest">Markdown Preview</h3></div>
                <pre className="max-h-[400px] overflow-auto whitespace-pre-wrap break-words rounded-xl border border-theme-border bg-theme-input/30 p-5 text-xs leading-7 text-theme-secondary custom-scrollbar font-mono min-w-0">{markdown || <span className="text-theme-muted italic">No content yet.</span>}</pre>
            </section>
        </div>
    );
}

function getStepLabel(role: string) {
    const labels: Record<string, string> = { 
        mini_research_brief: "0. Mini Research Brief",
        research_raw: "1. Research Raw — NotebookLM", 
        research_direction: "2. Research Direction — Arbor Questions", 
        brief: "3. Brief", 
        outline_web_article: "4. Web Article Outline / Full Article",
        script_caption: "5. Script & Caption", 
        assets_canva: "6. Assets / Canva", 
        seo_schema: "7. SEO & Schema", 
        publish: "8. Publish / Tracking" 
    };
    return labels[role] || role.replace('_', ' ');
}

// --- Constants ---

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

const STAGE_PREVIEW = [ "Research Direction", "Draft", "SEO & Schema", "Visual Package", "Review / Publish" ];

const STEP_ICONS: Record<ArticleStudioStepRole, any> = {
    mini_research_brief: Search,
    research_raw: Search,
    research_direction: MessageSquare,
    brief: FileText,
    outline_web_article: Layout,
    script_caption: MessageSquare,
    assets_canva: Image,
    seo_schema: Search,
    publish: Send,
    general: FileEdit
};

// --- Main Components ---

function GuidedStepNavigator({ 
    activeStep, 
    onStepSelect,
    stepContents,
    savedSteps
}: { 
    activeStep: ArticleStudioStepRole; 
    onStepSelect: (step: ArticleStudioStepRole) => void;
    stepContents: Record<string, string>;
    savedSteps: Set<string>;
}) {
    const roles: ArticleStudioStepRole[] = [
        "mini_research_brief",
        "research_raw",
        "research_direction",
        "brief",
        "outline_web_article",
        "script_caption",
        "assets_canva",
        "seo_schema",
        "publish"
    ];

    return (
        <nav className="flex flex-col gap-1">
            {roles.map((role) => {
                const Icon = STEP_ICONS[role] || Circle;
                const isActive = activeStep === role;
                const hasContent = !!stepContents[role]?.trim();
                const isSaved = savedSteps.has(role);

                return (
                    <button
                        key={role}
                        onClick={() => onStepSelect(role)}
                        className={`flex items-center gap-2 px-2.5 py-2 rounded-xl transition-all text-left ${isActive ? "bg-theme-card border border-theme-border shadow-sm" : "hover:bg-theme-hover border border-transparent"}`}
                    >
                        <div className={`p-1.5 rounded-lg ${isActive ? "bg-blue-50 text-blue-600" : "bg-theme-input text-theme-secondary/70"}`}>
                            <Icon className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className={`text-xs font-black truncate ${isActive ? "text-theme-primary" : "text-theme-secondary"}`}>
                                {ARTICLE_STUDIO_STEPS[role].title.split(" — ")[0]}
                            </div>
                            <div className="flex items-center gap-1.5 mt-0.5">
                                <div className={`w-1.5 h-1.5 rounded-full ${isSaved ? "bg-green-500" : hasContent ? "bg-amber-500" : "bg-theme-border"}`} />
                                <span className="text-[10px] font-bold uppercase tracking-widest text-theme-muted">
                                    {isSaved ? "Saved" : hasContent ? "Draft" : "Empty"}
                                </span>
                            </div>
                        </div>
                    </button>
                );
            })}
        </nav>
    );
}

export default function ArticleStudioClient() {
    const router = useRouter();
    
    // --- State: View Mode ---
    const [viewMode, setViewMode] = useState<"guided" | "advanced">("guided");
    
    // --- State: Topic Context ---
    const [topicContext, setTopicContext] = useState({ 
        topic_id: "", 
        article_title: "", 
        topic_title: "",
        season_id: "", 
        episode_id: "",
        story_set: "",
        story_order: "",
        content_layer: "knowledge",
        article_type: "knowledge_article",
        article_role: "",
        body_markdown: "",
        read_more_markdown: "",
        faq_markdown: "",
        references_markdown: "",
        group_post_markdown: "",
        page_post_markdown: "",
        personal_post_markdown: "",
        social_extras_markdown: "",
        primary_system: "",
        systems: [] as string[],
        narrative_status: "not_started",
        article_status: "idea",
        publish_pack_status: "not_started",
        references_status: "pending",
        next_action: "",
        notes: "",
        meta_title: "",
        meta_description: "",
        slug: "",
        keywords: [] as string[]
    });
    
    // --- State: Guided Flow ---
    const [activeStep, setActiveStep] = useState<ArticleStudioStepRole>("mini_research_brief");
    const [stepContents, setStepContents] = useState<Record<string, string>>({});
    const [savedSteps, setSavedSteps] = useState<Set<string>>(new Set());

    // --- State: Advanced Import ---
    const [rawInput, setRawInput] = useState("");
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [importMode, setImportMode] = useState<ArticleStudioMode>("editorial");
    const [isManualMode, setIsManualMode] = useState(false);
    
    const searchParams = useSearchParams();
    const urlTopicId = searchParams.get("topic");

    useEffect(() => {
        if (urlTopicId && urlTopicId !== topicContext.topic_id) {
            setTopicContext(prev => ({ ...prev, topic_id: urlTopicId }));
        }
    }, [urlTopicId]);

    const prevRawInput = useRef(rawInput);
    const previewInput = useDebouncedValue(viewMode === 'advanced' ? rawInput : (stepContents[activeStep] || ""), 250);

    // Fetch existing article metadata when topic_id changes
    useEffect(() => {
        if (!topicContext.topic_id || topicContext.topic_id.length < 5) return;

        const timer = setTimeout(async () => {
            try {
                const res = await fetch(`/api/content/articles/${encodeURIComponent(topicContext.topic_id)}`);
                const data = await res.json();
                if (data.found && data.article) {
                    const a = data.article;
                    setTopicContext(prev => ({
                        ...prev,
                        article_title: a.article_title || a.title || prev.article_title,
                        topic_title: a.topic_title || prev.topic_title,
                        season_id: a.season_id || prev.season_id,
                        episode_id: a.episode_id || prev.episode_id,
                        story_set: a.story_set || prev.story_set,
                        story_order: a.story_order || prev.story_order,
                        content_layer: a.content_layer || prev.content_layer,
                        article_type: a.article_type || prev.article_type,
                        article_role: a.article_role || prev.article_role,
                        body_markdown: a.body_markdown || prev.body_markdown,
                        read_more_markdown: a.read_more_markdown || prev.read_more_markdown,
                        faq_markdown: a.faq_markdown || prev.faq_markdown,
                        references_markdown: a.references_markdown || prev.references_markdown,
                        group_post_markdown: a.group_post_markdown || prev.group_post_markdown,
                        page_post_markdown: a.page_post_markdown || prev.page_post_markdown,
                        personal_post_markdown: a.personal_post_markdown || prev.personal_post_markdown,
                        social_extras_markdown: a.social_extras_markdown || prev.social_extras_markdown,
                        primary_system: a.primary_system || prev.primary_system,
                        systems: a.secondary_systems ? (typeof a.secondary_systems === 'string' ? a.secondary_systems.split(',') : a.secondary_systems) : prev.systems,
                        narrative_status: a.narrative_status || prev.narrative_status,
                        article_status: a.status || prev.article_status,
                        publish_pack_status: a.publish_pack_status || prev.publish_pack_status,
                        references_status: a.references_status || prev.references_status,
                        next_action: a.next_action || prev.next_action,
                        notes: a.notes || prev.notes,
                        meta_title: a.meta_title || prev.meta_title,
                        meta_description: a.meta_description || prev.meta_description,
                        slug: a.slug || prev.slug,
                        keywords: a.keywords ? (typeof a.keywords === 'string' ? a.keywords.split(',') : a.keywords) : prev.keywords,
                    }));
                }
            } catch (err) {
                console.error("Failed to fetch article metadata:", err);
            }
        }, 500);

        return () => clearTimeout(timer);
    }, [topicContext.topic_id]);

    useEffect(() => {
        if (viewMode === 'advanced') {
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
        }
    }, [rawInput, isManualMode, viewMode]);

    const preview = useMemo(() => {
        try {
            if (viewMode === 'advanced') {
                return parseArborArticlePackage(previewInput, importMode);
            } else {
                // Construct a virtual preview for the active step in guided mode
                let finalMarkdown = previewInput;
                if (activeStep === 'outline_web_article') {
                    // Combine sections for Step 4 preview
                    finalMarkdown = [
                        topicContext.body_markdown,
                        topicContext.read_more_markdown,
                        topicContext.faq_markdown,
                        topicContext.references_markdown
                    ].filter(Boolean).join("\n\n");
                    
                    // Fallback to legacy if everything is empty
                    if (!finalMarkdown.trim()) {
                        finalMarkdown = previewInput;
                    }
                }

                const pkg = {
                    mode: "partial" as ArticleStudioMode,
                    detectedStepRole: activeStep,
                    ...topicContext,
                    title: topicContext.article_title,
                    article_markdown: finalMarkdown,
                };
                return parseArborArticlePackage(JSON.stringify(pkg), "partial");
            }
        } catch {
            return null;
        }
    }, [previewInput, importMode, viewMode, activeStep, topicContext]);

    const canSave = viewMode === 'advanced' 
        ? (!!preview && preview.missingFields.length === 0 && !isSaving)
        : (!!topicContext.topic_id && (activeStep === 'outline_web_article' ? !!topicContext.body_markdown.trim() : !!previewInput.trim()) && !isSaving);

    const canSendToWebsiteDraft = useMemo(() => {
        if (!topicContext.topic_id || isInvalidTopicId(topicContext.topic_id)) return false;
        if (isPlaceholderValue(topicContext.article_title) && isPlaceholderValue(topicContext.topic_title)) return false;
        
        const hasContent = (topicContext.body_markdown?.trim() || preview?.article_markdown?.trim());
        if (!hasContent) return false;

        if ((preview?.missingFieldGroups?.required?.length || 0) > 0) return false;
        return !isSaving;
    }, [topicContext, preview, isSaving]);

    async function handleSaveStep() {
        if (isSaving) return;
        setIsSaving(true);
        setError(null);
        setSuccess(null);

        const payload = viewMode === 'advanced' ? { articlePackage: preview } : {
            articlePackage: {
                mode: "partial",
                detectedStepRole: activeStep,
                ...topicContext,
                title: topicContext.article_title,
                article_markdown: activeStep === 'outline_web_article' 
                    ? [topicContext.body_markdown, topicContext.read_more_markdown, topicContext.faq_markdown, topicContext.references_markdown].filter(Boolean).join("\n\n")
                    : (stepContents[activeStep] || ""),
            }
        };

        try {
            const res = await fetch("/api/content/package", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Save failed");

            setSuccess(`Saved ${ARTICLE_STUDIO_STEPS[activeStep]?.title || 'Step'} successfully`);
            
            // Sync local state with what was just saved to prevent "disappearing" data
            if (data.article) {
                const a = data.article;
                setTopicContext(prev => ({
                    ...prev,
                    article_title: a.article_title || a.title || prev.article_title,
                    topic_title: a.topic_title || prev.topic_title,
                    season_id: a.season_id || prev.season_id,
                    episode_id: a.episode_id || prev.episode_id,
                    story_set: a.story_set || prev.story_set,
                    story_order: a.story_order || prev.story_order,
                    content_layer: a.content_layer || prev.content_layer,
                    article_type: a.article_type || prev.article_type,
                    article_role: a.article_role || prev.article_role,
                    body_markdown: a.body_markdown || prev.body_markdown,
                    read_more_markdown: a.read_more_markdown || prev.read_more_markdown,
                    faq_markdown: a.faq_markdown || prev.faq_markdown,
                    references_markdown: a.references_markdown || prev.references_markdown,
                    primary_system: a.primary_system || prev.primary_system,
                    systems: a.secondary_systems ? (typeof a.secondary_systems === 'string' ? a.secondary_systems.split(',') : a.secondary_systems) : prev.systems,
                    narrative_status: a.narrative_status || prev.narrative_status,
                    article_status: a.status || prev.article_status,
                    publish_pack_status: a.publish_pack_status || prev.publish_pack_status,
                    references_status: a.references_status || prev.references_status,
                    next_action: a.next_action || prev.next_action,
                    notes: a.notes || prev.notes,
                    meta_title: a.meta_title || prev.meta_title,
                    meta_description: a.meta_description || prev.meta_description,
                    slug: a.slug || prev.slug,
                    keywords: a.keywords ? (typeof a.keywords === 'string' ? a.keywords.split(',') : a.keywords) : prev.keywords,
                }));
            }

            if (viewMode === 'guided') {
                setSavedSteps(prev => new Set(prev).add(activeStep));
            }
            window.dispatchEvent(new Event("task-updated"));
            router.refresh();
        } catch (err) {
            setError(err instanceof Error ? err.message : String(err));
        } finally {
            setIsSaving(false);
        }
    }

    async function handleSyncStatus(status: string) {
        if (isSaving || !topicContext.topic_id) return;
        setIsSaving(true);
        setError(null);
        setSuccess(null);

        try {
            const res = await fetch(`/api/content/articles/${encodeURIComponent(topicContext.topic_id)}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ 
                    status, 
                    article_title: topicContext.article_title,
                    topic_title: topicContext.topic_title,
                    season_id: topicContext.season_id,
                    episode_id: topicContext.episode_id,
                    content_layer: topicContext.content_layer,
                    article_type: topicContext.article_type,
                    article_role: topicContext.article_role,
                    narrative_status: topicContext.narrative_status,
                    story_set: topicContext.story_set,
                    story_order: topicContext.story_order,
                    meta_title: topicContext.meta_title,
                    meta_description: topicContext.meta_description,
                    slug: topicContext.slug,
                    keywords: topicContext.keywords
                }),
            });

            if (!res.ok) throw new Error("Sync failed");
            setSuccess(`Article metadata synced and marked as ${status}`);
            setTopicContext(prev => ({ ...prev, article_status: status }));
        } catch (err) {
            setError(err instanceof Error ? err.message : String(err));
        } finally {
            setIsSaving(false);
        }
    }

    function handleClearDraft() {
        if (viewMode === 'guided') {
            setStepContents(prev => ({ ...prev, [activeStep]: "" }));
            setSavedSteps(prev => {
                const next = new Set(prev);
                next.delete(activeStep);
                return next;
            });
        } else {
            setRawInput("");
        }
    }

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

    return (
        <PageShell className="max-w-[1820px] mx-auto px-6 2xl:px-8 overflow-x-hidden">
            {/* Header */}
            <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-3">
                        <Link href="/workspaces/content" className="p-2 -ml-2 rounded-full hover:bg-theme-hover transition-colors text-theme-secondary">
                            <ArrowLeft className="h-5 w-5" />
                        </Link>
                        <h1 className="text-2xl font-black tracking-tight text-theme-primary">Article Studio</h1>
                        <div className="flex p-1 bg-theme-input rounded-xl border border-theme-border/50 ml-4">
                            <button
                                onClick={() => setViewMode("guided")}
                                className={`px-4 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${viewMode === "guided" ? "bg-theme-card text-theme-primary shadow-sm" : "text-theme-muted hover:text-theme-secondary"}`}
                            >
                                Guided Flow
                            </button>
                            <button
                                onClick={() => setViewMode("advanced")}
                                className={`px-4 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${viewMode === "advanced" ? "bg-theme-card text-theme-primary shadow-sm" : "text-theme-muted hover:text-theme-secondary"}`}
                            >
                                Advanced Import
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div className={viewMode === 'guided' 
                ? "grid w-full gap-6 lg:grid-cols-[260px_minmax(0,1fr)_minmax(0,1fr)] items-stretch"
                : "grid w-full gap-6 lg:grid-cols-2 items-stretch"
            }>
                {/* 1. Sidebar Navigator (Guided Only) */}
                <aside className={`min-w-0 ${viewMode === 'guided' ? 'block' : 'hidden'}`}>
                    <div className="sticky top-6">
                        <h2 className="text-[10px] font-black uppercase tracking-widest text-theme-muted mb-4 px-4">Steps</h2>
                        <GuidedStepNavigator 
                            activeStep={activeStep} 
                            onStepSelect={setActiveStep} 
                            stepContents={stepContents}
                            savedSteps={savedSteps}
                        />
                    </div>
                </aside>

                {/* 2. Main Workspace */}
                <main className={`flex flex-col min-w-0 h-full ${viewMode === 'advanced' ? 'lg:col-span-1' : ''}`}>
                    <section className="flex flex-col h-full min-w-0 rounded-[24px] border border-theme-border bg-theme-card shadow-theme-soft overflow-visible">
                        {/* Editor Header */}
                        <div className="px-6 py-3 border-b border-theme-border/50 flex flex-col gap-3 bg-theme-card">
                            {viewMode === 'guided' ? (
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h2 className="text-[11px] font-black text-theme-primary uppercase tracking-widest leading-none">{ARTICLE_STUDIO_STEPS[activeStep]?.title}</h2>
                                            <p className="text-[9px] font-bold text-theme-muted uppercase tracking-tighter mt-0.5">{ARTICLE_STUDIO_STEPS[activeStep]?.instruction}</p>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 xl:grid-cols-4 gap-2 min-w-0">
                                        <div className="space-y-1 min-w-0">
                                            <label className="text-[8px] font-black uppercase tracking-widest text-theme-muted ml-1">Topic ID</label>
                                            <input 
                                                type="text"
                                                value={topicContext.topic_id}
                                                onChange={(e) => setTopicContext(prev => ({ ...prev, topic_id: e.target.value.toUpperCase() }))}
                                                placeholder="GF-CONTENT-XXX"
                                                className="w-full px-3 py-1.5 rounded-lg bg-theme-input border border-theme-border text-[11px] font-bold text-theme-primary placeholder:text-theme-muted outline-none focus:ring-1 focus:ring-blue-500/20"
                                            />
                                        </div>
                                        <div className="space-y-1 min-w-0">
                                            <label className="text-[8px] font-black uppercase tracking-widest text-theme-muted ml-1">Article Title</label>
                                            <input 
                                                type="text"
                                                value={topicContext.article_title}
                                                onChange={(e) => setTopicContext(prev => ({ ...prev, article_title: e.target.value }))}
                                                placeholder="ชื่อบทความ..."
                                                className="w-full px-3 py-1.5 rounded-lg bg-theme-input border border-theme-border text-[11px] font-bold text-theme-primary placeholder:text-theme-muted outline-none focus:ring-1 focus:ring-blue-500/20"
                                            />
                                        </div>
                                        <div className="space-y-1 min-w-0">
                                            <label className="text-[8px] font-black uppercase tracking-widest text-theme-muted ml-1">Topic Title</label>
                                            <input 
                                                type="text"
                                                value={topicContext.topic_title}
                                                onChange={(e) => setTopicContext(prev => ({ ...prev, topic_title: e.target.value }))}
                                                placeholder="หัวข้อหลัก..."
                                                className="w-full px-3 py-1.5 rounded-lg bg-theme-input border border-theme-border text-[11px] font-bold text-theme-primary placeholder:text-theme-muted outline-none focus:ring-1 focus:ring-blue-500/20"
                                            />
                                        </div>
                                        <div className="space-y-1 min-w-0">
                                            <label className="text-[8px] font-black uppercase tracking-widest text-theme-muted ml-1">Article Role</label>
                                            <input 
                                                type="text"
                                                value={topicContext.article_role}
                                                onChange={(e) => setTopicContext(prev => ({ ...prev, article_role: e.target.value }))}
                                                placeholder="Role..."
                                                className="w-full px-3 py-1.5 rounded-lg bg-theme-input border border-theme-border text-[11px] font-bold text-theme-primary placeholder:text-theme-muted outline-none focus:ring-1 focus:ring-blue-500/20"
                                            />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 xl:grid-cols-4 gap-2 min-w-0">
                                        <div className="space-y-1 min-w-0">
                                            <label className="text-[8px] font-black uppercase tracking-widest text-theme-muted ml-1">Season ID</label>
                                            <input 
                                                type="text"
                                                value={topicContext.season_id}
                                                onChange={(e) => setTopicContext(prev => ({ ...prev, season_id: e.target.value }))}
                                                placeholder="GF-SEASON-XX"
                                                className="w-full px-3 py-1.5 rounded-lg bg-theme-input border border-theme-border text-[11px] font-bold text-theme-primary placeholder:text-theme-muted outline-none focus:ring-1 focus:ring-blue-500/20"
                                            />
                                        </div>
                                        <div className="space-y-1 min-w-0">
                                            <label className="text-[8px] font-black uppercase tracking-widest text-theme-muted ml-1">Episode ID</label>
                                            <input 
                                                type="text"
                                                value={topicContext.episode_id}
                                                onChange={(e) => setTopicContext(prev => ({ ...prev, episode_id: e.target.value }))}
                                                placeholder="GF-SXX-EXX"
                                                className="w-full px-3 py-1.5 rounded-lg bg-theme-input border border-theme-border text-[11px] font-bold text-theme-primary placeholder:text-theme-muted outline-none focus:ring-1 focus:ring-blue-500/20"
                                            />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 xl:grid-cols-4 gap-2 min-w-0">
                                        <div className="space-y-1 min-w-0">
                                            <label className="text-[8px] font-black uppercase tracking-widest text-theme-muted ml-1">Story Set</label>
                                            <input 
                                                type="text"
                                                value={topicContext.story_set}
                                                onChange={(e) => setTopicContext(prev => ({ ...prev, story_set: e.target.value }))}
                                                placeholder="Story Set..."
                                                className="w-full px-3 py-1.5 rounded-lg bg-theme-input border border-theme-border text-[11px] font-bold text-theme-primary placeholder:text-theme-muted outline-none focus:ring-1 focus:ring-blue-500/20"
                                            />
                                        </div>
                                        <div className="space-y-1 min-w-0">
                                            <label className="text-[8px] font-black uppercase tracking-widest text-theme-muted ml-1">Order</label>
                                            <input 
                                                type="text"
                                                value={topicContext.story_order}
                                                onChange={(e) => setTopicContext(prev => ({ ...prev, story_order: e.target.value }))}
                                                placeholder="00"
                                                className="w-full px-3 py-1.5 rounded-lg bg-theme-input border border-theme-border text-[11px] font-bold text-theme-primary placeholder:text-theme-muted outline-none focus:ring-1 focus:ring-blue-500/20"
                                            />
                                        </div>
                                        <div className="space-y-1 min-w-0">
                                            <label className="text-[8px] font-black uppercase tracking-widest text-theme-muted ml-1">Layer</label>
                                            <select
                                                value={topicContext.content_layer}
                                                onChange={(e) => setTopicContext(prev => ({ ...prev, content_layer: e.target.value }))}
                                                className="w-full px-3 py-1.5 rounded-lg bg-theme-input border border-theme-border text-[11px] font-bold text-theme-primary outline-none focus:ring-1 focus:ring-blue-500/20"
                                            >
                                                <option value="knowledge">Knowledge</option>
                                                <option value="narrative">Narrative</option>
                                            </select>
                                        </div>
                                        <div className="space-y-1 min-w-0">
                                            <label className="text-[8px] font-black uppercase tracking-widest text-theme-muted ml-1">Step</label>
                                            <input 
                                                type="text"
                                                value={activeStep}
                                                disabled
                                                className="w-full px-3 py-1.5 rounded-lg bg-theme-input/50 border border-theme-border text-[11px] font-bold text-theme-muted outline-none"
                                            />
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-4">
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
                                            onClick={() => { setImportMode("editorial"); setIsManualMode(true); }}
                                            className={`flex-1 px-3 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${importMode !== "partial" ? "bg-theme-card text-theme-primary shadow-sm" : "text-theme-muted hover:text-theme-secondary"}`}
                                        >
                                            Full Package
                                        </button>
                                        <button
                                            onClick={() => { setImportMode("partial"); setIsManualMode(true); }}
                                            className={`flex-1 px-3 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${importMode === "partial" ? "bg-theme-card text-theme-primary shadow-sm" : "text-theme-muted hover:text-theme-secondary"}`}
                                        >
                                            Partial Step
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Textarea Area */}
                        <div className="flex-1 relative min-w-0 bg-theme-input/5">
                            {viewMode === 'guided' && activeStep === 'outline_web_article' ? (
                                    <div className="p-6 lg:p-8 space-y-12">
                                        <div className="space-y-3">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-theme-muted flex items-center gap-2">
                                                <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                                                Body Content
                                            </label>
                                            <textarea
                                                value={topicContext.body_markdown}
                                                onChange={(e) => setTopicContext(prev => ({ ...prev, body_markdown: e.target.value }))}
                                                className="w-full min-h-[620px] xl:min-h-[680px] p-8 font-mono text-[14px] leading-[1.8] text-theme-primary bg-theme-card border border-theme-border rounded-2xl outline-none focus:ring-2 focus:ring-blue-500/10 resize-y overflow-y-auto custom-scrollbar shadow-sm"
                                                placeholder="Write main article body here..."
                                            />
                                        </div>

                                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-theme-muted flex items-center gap-2">
                                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                                Read More / Internal Links
                                            </label>
                                            <textarea
                                                value={topicContext.read_more_markdown}
                                                onChange={(e) => setTopicContext(prev => ({ ...prev, read_more_markdown: e.target.value }))}
                                                className="w-full min-h-[200px] p-6 font-mono text-[14px] leading-[1.8] text-theme-primary bg-theme-card border border-theme-border rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500/10 resize-none"
                                                placeholder="## อ่านต่อ / บทความที่เกี่ยวข้อง..."
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-theme-muted flex items-center gap-2">
                                                <div className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                                                FAQ
                                            </label>
                                            <textarea
                                                value={topicContext.faq_markdown}
                                                onChange={(e) => setTopicContext(prev => ({ ...prev, faq_markdown: e.target.value }))}
                                                className="w-full min-h-[200px] p-6 font-mono text-[14px] leading-[1.8] text-theme-primary bg-theme-card border border-theme-border rounded-2xl outline-none focus:ring-2 focus:ring-purple-500/10 resize-none"
                                                placeholder="## คำถามที่พบบ่อย..."
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-theme-muted flex items-center gap-2">
                                            <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                                            References
                                        </label>
                                        <textarea
                                            value={topicContext.references_markdown}
                                            onChange={(e) => setTopicContext(prev => ({ ...prev, references_markdown: e.target.value }))}
                                            className="w-full min-h-[180px] p-6 font-mono text-[14px] leading-[1.8] text-theme-primary bg-theme-card border border-theme-border rounded-2xl outline-none focus:ring-2 focus:ring-amber-500/10 resize-none"
                                            placeholder="## เอกสารอ้างอิง..."
                                        />
                                    </div>
                                </div>
                            ) : viewMode === 'guided' && activeStep === 'script_caption' ? (
                                <div className="p-6 lg:p-8 space-y-8">
                                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                                        {/* Facebook Group Post */}
                                        <div className="space-y-3">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-theme-muted flex items-center gap-2">
                                                <div className="w-1.5 h-1.5 rounded-full bg-blue-600" />
                                                Facebook Group Post
                                            </label>
                                            <textarea
                                                value={topicContext.group_post_markdown}
                                                onChange={(e) => setTopicContext(prev => ({ ...prev, group_post_markdown: e.target.value }))}
                                                className="w-full min-h-[420px] p-6 font-mono text-[14px] leading-[1.8] text-theme-primary bg-theme-card border border-theme-border rounded-2xl outline-none focus:ring-2 focus:ring-blue-500/10 resize-y overflow-y-auto custom-scrollbar shadow-sm"
                                                placeholder="เขียนโพสต์สำหรับกลุ่ม FB — เนื้อหาเชิงความรู้ยาวขึ้น..."
                                            />
                                        </div>
                                        {/* Facebook Page Post */}
                                        <div className="space-y-3">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-theme-muted flex items-center gap-2">
                                                <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                                                Facebook Page Post
                                            </label>
                                            <textarea
                                                value={topicContext.page_post_markdown}
                                                onChange={(e) => setTopicContext(prev => ({ ...prev, page_post_markdown: e.target.value }))}
                                                className="w-full min-h-[320px] p-6 font-mono text-[14px] leading-[1.8] text-theme-primary bg-theme-card border border-theme-border rounded-2xl outline-none focus:ring-2 focus:ring-blue-500/10 resize-y overflow-y-auto custom-scrollbar shadow-sm"
                                                placeholder="เขียนโพสต์สำหรับเพจ — สั้น กระชับ เสียงแบรนด์..."
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                                        {/* Personal Post */}
                                        <div className="space-y-3">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-theme-muted flex items-center gap-2">
                                                <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                                                Personal Post
                                            </label>
                                            <textarea
                                                value={topicContext.personal_post_markdown}
                                                onChange={(e) => setTopicContext(prev => ({ ...prev, personal_post_markdown: e.target.value }))}
                                                className="w-full min-h-[280px] p-6 font-mono text-[14px] leading-[1.8] text-theme-primary bg-theme-card border border-theme-border rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500/10 resize-y overflow-y-auto custom-scrollbar shadow-sm"
                                                placeholder="เขียนโพสต์ส่วนตัว — เสียงมนุษย์ มุมมองผู้ก่อตั้ง..."
                                            />
                                        </div>
                                        {/* Social Extras */}
                                        <div className="space-y-3">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-theme-muted flex items-center gap-2">
                                                <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                                                Social Extras
                                            </label>
                                            <textarea
                                                value={topicContext.social_extras_markdown}
                                                onChange={(e) => setTopicContext(prev => ({ ...prev, social_extras_markdown: e.target.value }))}
                                                className="w-full min-h-[280px] p-6 font-mono text-[14px] leading-[1.8] text-theme-primary bg-theme-card border border-theme-border rounded-2xl outline-none focus:ring-2 focus:ring-amber-500/10 resize-y overflow-y-auto custom-scrollbar shadow-sm"
                                                placeholder="## Hook Options\n1. ...\n\n## Hashtags\n#GreenFineness #ดินมีชีวิต"
                                            />
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <textarea
                                    value={viewMode === 'guided' ? (stepContents[activeStep] || "") : rawInput}
                                    onChange={(event) => {
                                        if (viewMode === 'guided') {
                                            setStepContents(prev => ({ ...prev, [activeStep]: event.target.value }));
                                        } else {
                                            setRawInput(event.target.value);
                                        }
                                        setError(null);
                                        setSuccess(null);
                                    }}
                                    className="absolute inset-0 w-full h-full p-8 lg:p-12 font-mono text-[14px] leading-[1.8] text-theme-primary bg-transparent outline-none transition-theme placeholder:text-theme-muted resize-none custom-scrollbar"
                                    placeholder={viewMode === 'guided' ? `Write ${ARTICLE_STUDIO_STEPS[activeStep]?.title} here...` : "Paste Arbor Package content here..."}
                                />
                            )}
                        </div>
                        {/* Action Bar */}
                        <div className="mt-auto sticky bottom-0 p-6 bg-theme-card border-t border-theme-border/50 z-20 flex-none rounded-b-[24px]">
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

                            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={handleClearDraft}
                                        className="h-11 flex items-center justify-center gap-2 rounded-xl border border-theme-border bg-theme-card px-4 text-[10px] font-black uppercase tracking-widest text-theme-secondary shadow-sm hover:bg-theme-hover hover:text-theme-primary transition-all active:scale-95"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                        Clear
                                    </button>
                                    {viewMode === 'advanced' && (
                                        <button
                                            type="button"
                                            disabled={!preview}
                                            onClick={handleExportPublishPack}
                                            className="h-11 flex items-center justify-center gap-2 rounded-xl border border-theme-border bg-theme-card px-4 text-[10px] font-black uppercase tracking-widest text-theme-secondary shadow-sm hover:bg-theme-hover hover:text-theme-primary disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-95"
                                        >
                                            <Download className="h-4 w-4" />
                                            Export
                                        </button>
                                    )}
                                </div>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 flex-1 md:max-w-[700px] lg:max-w-[850px]">
                                    <button
                                        type="button"
                                        disabled={!topicContext.topic_id || isInvalidTopicId(topicContext.topic_id) || isSaving}
                                        onClick={() => handleSyncStatus("draft")}
                                        className="h-11 flex items-center justify-center gap-2 rounded-xl border border-theme-border bg-theme-card px-3 text-[10px] font-black uppercase tracking-widest text-theme-secondary shadow-sm hover:bg-theme-hover hover:text-theme-primary disabled:opacity-40 transition-all active:scale-95"
                                    >
                                        Mark as Draft
                                    </button>
                                    <button
                                        type="button"
                                        disabled={!topicContext.topic_id || isInvalidTopicId(topicContext.topic_id) || !preview?.article_markdown?.trim() || isSaving}
                                        onClick={() => handleSyncStatus("seo_ready")}
                                        className="h-11 flex items-center justify-center gap-2 rounded-xl border border-theme-border bg-theme-card px-3 text-[10px] font-black uppercase tracking-widest text-theme-secondary shadow-sm hover:bg-theme-hover hover:text-theme-primary disabled:opacity-40 transition-all active:scale-95"
                                    >
                                        SEO Ready
                                    </button>
                                    <button
                                        type="button"
                                        disabled={!canSendToWebsiteDraft}
                                        onClick={() => handleSyncStatus("website_draft")}
                                        className="h-11 flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-3 text-[10px] font-black uppercase tracking-widest text-white shadow-lg shadow-emerald-500/10 hover:bg-emerald-700 disabled:opacity-40 disabled:grayscale transition-all active:scale-95"
                                    >
                                        Website Draft
                                    </button>
                                    <button
                                        type="button"
                                        disabled={!canSave}
                                        onClick={handleSaveStep}
                                        className="h-11 flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 text-[10px] font-black uppercase tracking-widest text-white shadow-lg shadow-blue-500/10 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-95"
                                    >
                                        {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                                        {viewMode === 'guided' ? 'Save Step' : (preview?.mode === 'partial' ? 'Update' : 'Create')}
                                    </button>
                                </div>
                            </div>

                            {/* Validation & Helper Row */}
                            <div className="mt-4 pt-4 border-t border-theme-border/30 flex items-center justify-between gap-4">
                                <div className="flex-1 min-w-0">
                                    {!canSendToWebsiteDraft && !isSaving && (
                                        <div className="flex items-center gap-2 text-red-500">
                                            <div className="w-1 h-1 rounded-full bg-red-500 shrink-0" />
                                            <span className="text-[10px] font-bold uppercase tracking-tight truncate">
                                                {!topicContext.topic_id || isInvalidTopicId(topicContext.topic_id) 
                                                    ? "Topic ID Required (e.g. GF-CONTENT-012, no placeholders)" 
                                                    : !preview?.article_markdown?.trim() 
                                                        ? "Add article draft content before sending to Website Draft" 
                                                        : preview?.missingFieldGroups?.required?.length > 0 
                                                            ? "Resolve required fields in Content Health first" 
                                                            : "Complete metadata first"}
                                            </span>
                                        </div>
                                    )}
                                </div>
                                {viewMode === 'advanced' && (
                                    <p className="text-[9px] font-bold text-theme-muted uppercase tracking-widest whitespace-nowrap">
                                        {preview?.mode === 'partial' ? "Partial mode active" : "Full mode active"}
                                    </p>
                                )}
                            </div>
                        </div>
                    </section>
                </main>

                {/* 3. Preview Panel */}
                <section className="flex-1 min-w-0">
                    {preview ? <PreviewPanel preview={preview} /> : <EmptyPreview />}
                </section>
            </div>
        </PageShell>
    );
}
