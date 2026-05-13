"use client";

import React, { useState, useEffect, useCallback } from "react";
import { 
    Plus, 
    Save, 
    Trash2, 
    Search, 
    FileText, 
    Sparkles, 
    Download, 
    Copy, 
    Link as LinkIcon,
    ArrowLeft,
    CheckCircle2,
    AlertCircle,
    ChevronRight,
    Loader2,
    RefreshCw
} from "lucide-react";
import Link from "next/link";
import { PageShell } from "@/components/layout/PageShell";
import CreateGfArticleModal from "./CreateGfArticleModal";

type ContentType = 'group_post' | 'page_post' | 'personal_post' | 'web_article_section' | 'website_fields' | 'body_markdown' | 'reference_note' | 'schema_jsonld' | 'visual_brief' | 'publish_note' | 'research_raw' | 'research_direction' | 'brief' | 'outline_web_article' | 'script_caption' | 'assets_canva' | 'seo_schema';
type DraftStage = 'working' | 'reviewed' | 'ready_to_export' | 'exported' | 'archived';
type WritingMode = 'draft' | 'rewrite' | 'polish' | 'review' | 'voice_extract' | 'claim_check';
type SourceStep = 'research_raw' | 'research_direction' | 'brief' | 'script_caption' | 'assets_canva' | 'outline_web_article' | 'website_publish_pack' | 'publish';

interface Draft {
    id: string;
    topic_id: string | null;
    topic_title: string;
    content_type: ContentType;
    draft_stage: DraftStage;
    writing_mode: WritingMode;
    source_step: SourceStep | null;
    body: string;
    notes: string | null;
    linked_task_id: string | null;
    created_at: string;
    updated_at: string;
}

interface ReviewIssue {
    id: number;
    type: string;
    message: string;
    severity: 'low' | 'medium' | 'high';
}

interface ReviewPatch {
    id: number;
    original: string;
    replacement: string;
}

interface ArborReviewPayload {
    reviewedContentType: string;
    editorialSummary: string;
    contentStrength: string[];
    revisionPoints: string[];
    claimSafetyNotes: string[];
    toneNotes: string[];
    recommendedNextEdit: string;
    suggestedRevision?: string;
    
    // Actionable Suggestions
    suggestedHeadings?: string;
    suggestedRewrite?: string;
    claimSafetySuggestions?: string[];
    voiceToneSuggestions?: string[];
    nextEditChecklist?: string[];
}

interface ReviewResult {
    id: string;
    draft_id: string;
    review_mode: string;
    review_status: string;
    reviewed_content_type: ContentType | null;
    summary: string | null;
    issues_json: string | null; // JSON string of ReviewIssue[]
    patches_json: string | null; // JSON string of ReviewPatch[]
    next_step: string | null;
    structured_json: string | null; // JSON string of ArborReviewPayload
}

// --- Constants ---

const CONTENT_TYPES: ContentType[] = ['research_raw', 'research_direction', 'brief', 'outline_web_article', 'script_caption', 'assets_canva', 'seo_schema', 'publish_note', 'group_post', 'page_post', 'personal_post', 'web_article_section', 'website_fields', 'body_markdown', 'reference_note', 'schema_jsonld', 'visual_brief'];
const DRAFT_STAGES: DraftStage[] = ['working', 'reviewed', 'ready_to_export', 'exported', 'archived'];
const WRITING_MODES: WritingMode[] = ['draft', 'rewrite', 'polish', 'review', 'voice_extract', 'claim_check'];
const SOURCE_STEPS: SourceStep[] = ['research_raw', 'research_direction', 'brief', 'outline_web_article', 'script_caption', 'assets_canva', 'website_publish_pack', 'publish'];

const SOURCE_STEP_LABELS: Record<SourceStep, string> = {
    research_raw: 'Research Raw',
    research_direction: 'Research Direction',
    brief: 'Brief',
    outline_web_article: 'Outline Web Article',
    script_caption: 'Script & Caption',
    assets_canva: 'Assets / Canva',
    website_publish_pack: 'SEO & Schema',
    publish: 'Publish'
};

// Keywords to match existing GF workflow tasks by source_step
// Handles task naming conventions e.g. "Research Raw — NotebookLM"
const SOURCE_STEP_MATCH_KEYWORDS: Record<SourceStep, string[]> = {
    research_raw:        ['research raw'],
    research_direction:  ['research direction', 'arbor questions'],
    brief:               ['brief'],
    outline_web_article: ['outline web article', 'outline'],
    script_caption:      ['script & caption', 'script and caption', 'script caption'],
    assets_canva:        ['assets / canva', 'assets/canva', 'assets canva', 'visual package', 'visual brief'],
    website_publish_pack:['seo & schema', 'seo and schema', 'website publish pack'],
    publish:             ['publish']
};

const CONTENT_TYPE_LABELS: Record<ContentType, string> = {
    research_raw: 'Research Raw',
    research_direction: 'Research Direction',
    brief: 'Brief',
    outline_web_article: 'Outline Web Article',
    script_caption: 'Script & Caption',
    assets_canva: 'Assets / Canva',
    seo_schema: 'SEO & Schema',
    publish_note: 'Publish Note',
    group_post: 'Group Post',
    page_post: 'Page Post',
    personal_post: 'Personal Post',
    web_article_section: 'Web Article Section',
    website_fields: 'Website Fields',
    body_markdown: 'Body Markdown',
    reference_note: 'Reference Note',
    schema_jsonld: 'Schema Jsonld',
    visual_brief: 'Visual Brief'
};

const CONTENT_TYPE_TO_ROLE: Record<string, string> = {
    group_post: 'Script & Caption',
    page_post: 'Script & Caption',
    personal_post: 'Script & Caption',
    web_article_section: 'Outline web article',
    body_markdown: 'Outline web article',
    visual_brief: 'Assets / Canva',
    website_fields: 'SEO & Schema',
    schema_jsonld: 'SEO & Schema',
    reference_note: 'SEO & Schema',
    publish_note: 'Publish'
};

const normalizeTopicId = (topicId: string) => {
    let id = topicId.trim().toUpperCase().replace(/[\[\]]/g, '');
    if (id.startsWith('CONTENT-') && !id.startsWith('GF-')) {
        id = `GF-${id}`;
    }
    if (/^\d+$/.test(id)) {
        id = `GF-CONTENT-${id}`;
    }
    return id;
};

// --- Helper Components ---

function Badge({ children, color = "blue" }: { children: React.ReactNode, color?: string }) {
    const colors: Record<string, string> = {
        blue: "bg-blue-50 text-blue-700 border-blue-100",
        green: "bg-green-50 text-green-700 border-green-100",
        amber: "bg-amber-50 text-amber-700 border-amber-100",
        purple: "bg-purple-50 text-purple-700 border-purple-100",
        slate: "bg-slate-50 text-slate-700 border-slate-100",
    };
    return (
        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-tight border ${colors[color] || colors.slate}`}>
            {children}
        </span>
    );
}

// --- Main Component ---

export default function WritingDeskLiteClient() {
    const [drafts, setDrafts] = useState<Draft[]>([]);
    const [activeDraft, setActiveDraft] = useState<Draft | null>(null);
    const [review, setReview] = useState<ReviewResult | null>(null);
    
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved');
    const [pendingDeleteDraftId, setPendingDeleteDraftId] = useState<string | null>(null);
    const [isReviewing, setIsReviewing] = useState(false);
    const [isLinking, setIsLinking] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    const [suggestedTasks, setSuggestedTasks] = useState<any[]>([]);
    const [isTaskSearchOpen, setIsTaskSearchOpen] = useState(false);
    const [isCreateGfModalOpen, setIsCreateGfModalOpen] = useState(false);

    // Fetch Drafts
    const fetchDrafts = useCallback(async () => {
        setIsLoading(true);
        try {
            const res = await fetch("/api/content/writing-desk/drafts");
            const data = await res.json();
            setDrafts(data);
        } catch (err) {
            console.error("Failed to fetch drafts", err);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchDrafts();
    }, [fetchDrafts]);

    // Auto-generate Draft Title based on Topic ID + Source Step
    useEffect(() => {
        if (!activeDraft) return;
        if (activeDraft.topic_id && activeDraft.source_step) {
            const stepLabel = SOURCE_STEP_LABELS[activeDraft.source_step];
            const autoGeneratedTitle = `${activeDraft.topic_id} — ${stepLabel}`;
            
            // Overwrite if it's currently Untitled Draft or matches another auto-generated pattern
            const isDefault = activeDraft.topic_title === "Untitled Draft";
            const isOldAutoGenerated = SOURCE_STEPS.some(step => activeDraft.topic_title === `${activeDraft.topic_id} — ${SOURCE_STEP_LABELS[step]}`);

            if ((isDefault || isOldAutoGenerated) && activeDraft.topic_title !== autoGeneratedTitle) {
                setActiveDraft({ ...activeDraft, topic_title: autoGeneratedTitle });
                setSaveStatus('unsaved');
            }
        }
    }, [activeDraft?.topic_id, activeDraft?.source_step]);

    // Fetch Review for active draft
    const fetchReview = useCallback(async (draftId: string) => {
        try {
            const res = await fetch(`/api/content/writing-desk/review?draft_id=${draftId}`);
            const data = await res.json();
            setReview(data);
        } catch (err) {
            console.error("Failed to fetch review", err);
        }
    }, []);

    useEffect(() => {
        if (activeDraft?.id) {
            fetchReview(activeDraft.id);
        } else {
            setReview(null);
        }
    }, [activeDraft?.id, fetchReview]);

    // Autosave effect
    useEffect(() => {
        if (!activeDraft) return;
        
        const timer = setTimeout(() => {
            if (saveStatus === 'unsaved') {
                handleSave();
            }
        }, 2000); // 2 seconds debounce

        return () => clearTimeout(timer);
    }, [activeDraft, saveStatus]);

    // Save Draft
    const handleSave = async () => {
        if (!activeDraft) return;
        setIsSaving(true);
        setSaveStatus('saving');
        try {
            const res = await fetch(`/api/content/writing-desk/drafts/${activeDraft.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(activeDraft)
            });
            const updated = await res.json();
            setDrafts(prev => prev.map(d => d.id === updated.id ? updated : d));
            setSaveStatus('saved');
            // Don't show toast for autosave to keep it quiet
        } catch {
            setSaveStatus('unsaved');
            setMessage({ type: 'error', text: "Failed to save draft" });
        } finally {
            setIsSaving(false);
        }
    };

    // Create New Draft
    const handleNewDraft = async () => {
        const payload = {
            topic_title: "Untitled Draft",
            content_type: "body_markdown",
            draft_stage: "working",
            writing_mode: "draft",
            body: ""
        };
        try {
            const res = await fetch("/api/content/writing-desk/drafts", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });
            const created = await res.json();
            setDrafts(prev => [created, ...prev]);
            setActiveDraft(created);
            setReview(null);
        } catch (err) {
            console.error("Failed to create draft", err);
        }
    };

    // Delete Draft Flow
    const initiateDelete = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setPendingDeleteDraftId(id);
    };

    const cancelDelete = (e: React.MouseEvent) => {
        e.stopPropagation();
        setPendingDeleteDraftId(null);
    };

    const confirmDelete = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setIsSaving(true);
        try {
            const res = await fetch(`/api/content/writing-desk/drafts/${id}`, {
                method: "DELETE"
            });
            
            if (res.ok) {
                const nextDrafts = drafts.filter(d => d.id !== id);
                
                // If active draft was deleted, pick next or null
                if (activeDraft?.id === id) {
                    if (nextDrafts.length > 0) {
                        setActiveDraft(nextDrafts[0]);
                    } else {
                        setActiveDraft(null);
                        setReview(null);
                    }
                }
                
                setDrafts(nextDrafts);
                setPendingDeleteDraftId(null);
                setMessage({ type: 'success', text: "Draft deleted" });
                setTimeout(() => setMessage(null), 2000);
            }
        } catch (err) {
            setMessage({ type: 'error', text: "Failed to delete draft" });
        } finally {
            setIsSaving(false);
        }
    };

    // Run Arbor Review
    const handleRunReview = async () => {
        if (!activeDraft) return;
        setIsReviewing(true);
        try {
            // Force-save full current draft state before running review
            // This ensures all metadata (content_type, topic_id, etc.) are in sync with the API
            await handleSave();
 
            const res = await fetch("/api/content/writing-desk/review", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ draft_id: activeDraft.id })
            });
            const result = await res.json();
 
            // Immediately replace local review state with the returned result
            setReview(result);
        } catch (err) {
            console.error("Failed to run review", err);
        } finally {
            setIsReviewing(false);
        }
    };

    const formatDraftToMarkdown = (draft: Draft, reviewResult: ReviewResult | null) => {
        let markdown = `# Writing Desk Export\n\n`;
        
        markdown += `## Metadata\n\n`;
        markdown += `- Topic ID: ${draft.topic_id || 'N/A'}\n`;
        markdown += `- Topic Title: ${draft.topic_title}\n`;
        markdown += `- Content Type: ${draft.content_type}\n`;
        markdown += `- Draft Stage: ${draft.draft_stage}\n`;
        markdown += `- Writing Mode: ${draft.writing_mode}\n`;
        markdown += `- Source Step: ${draft.source_step || 'N/A'}\n`;
        if (reviewResult) {
            markdown += `- Reviewed as: ${reviewResult.reviewed_content_type || 'N/A'}\n`;
        }
        markdown += `\n---\n\n`;

        markdown += `## Draft Content\n\n${draft.body}\n\n`;
        
        if (reviewResult) {
            markdown += `---\n\n## Arbor Review\n\n`;
            
            if (reviewResult.structured_json) {
                const s = JSON.parse(reviewResult.structured_json) as ArborReviewPayload;
                markdown += `### Summary\n${s.editorialSummary}\n\n`;
                markdown += `### Keep\n${s.contentStrength.map(i => `- ${i}`).join('\n')}\n\n`;
                markdown += `### Fix\n${s.revisionPoints.map(i => `- ${i}`).join('\n')}\n\n`;
                markdown += `### Risk\n${s.claimSafetyNotes.map(i => `- ${i}`).join('\n')}\n\n`;
                markdown += `### Tone\n${s.toneNotes.join(', ')}\n\n`;
                markdown += `### Next Action\n${s.recommendedNextEdit}\n\n`;
            } else {
                markdown += `### Summary\n${reviewResult.summary}\n\n`;
                markdown += `### Next Action\n${reviewResult.next_step}\n\n`;
            }
        }
        
        return markdown;
    };

    // Export Logic
    const handleExportMarkdown = () => {
        if (!activeDraft) return;
        
        const markdown = formatDraftToMarkdown(activeDraft, review);

        const blob = new Blob([markdown], { type: "text/markdown" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${activeDraft.topic_id || 'draft'}-${activeDraft.content_type}.md`;
        document.body.appendChild(a);
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleCopyClean = () => {
        if (!activeDraft) return;
        navigator.clipboard.writeText(activeDraft.body);
        setMessage({ type: 'success', text: "Clean version copied!" });
        setTimeout(() => setMessage(null), 2000);
    };

    const handleSearchTasks = async () => {
        if (!activeDraft?.topic_id) return;
        setIsLinking(true);
        try {
            const res = await fetch(`/api/tasks?q=${activeDraft.topic_id}`);
            const data = await res.json();

            const sorted = [...data].sort((a: any, b: any) => {
                const getScore = (task: any) => {
                    const title = task.title.toLowerCase();
                    const step = activeDraft.source_step as SourceStep | null;

                    // Priority 1: match by source_step keywords (highest confidence)
                    if (step && SOURCE_STEP_MATCH_KEYWORDS[step]) {
                        const matched = SOURCE_STEP_MATCH_KEYWORDS[step].some(kw => title.includes(kw));
                        if (matched) return 200;
                    }

                    // Priority 2: fallback content_type matching (legacy)
                    const ct = activeDraft.content_type;
                    if (ct === 'group_post' && title.includes('group post')) return 100;
                    if (ct === 'page_post' && title.includes('page post')) return 100;
                    if (ct === 'personal_post' && title.includes('personal post')) return 100;
                    if ((ct === 'web_article_section' || ct === 'body_markdown') && title.includes('outline web article')) return 100;
                    if (ct === 'visual_brief' && title.includes('visual package')) return 100;
                    if (['website_fields', 'schema_jsonld', 'reference_note'].includes(ct) && (title.includes('website publish pack') || title.includes('seo & schema'))) return 100;
                    if (ct === 'publish_note' && (title.includes('review') || title.includes('publish'))) return 100;
                    if (['group_post', 'page_post', 'personal_post'].includes(ct) && title.includes('script & caption')) return 50;

                    return 0;
                };
                return getScore(b) - getScore(a);
            });

            setSuggestedTasks(sorted);
            setIsTaskSearchOpen(true);
        } catch (err) {
            console.error("Failed to search tasks", err);
        } finally {
            setIsLinking(false);
        }
    };

    const handleLinkTask = (taskId: string) => {
        if (!activeDraft) return;
        setActiveDraft({ ...activeDraft, linked_task_id: taskId });
        setIsTaskSearchOpen(false);
        setMessage({ type: 'success', text: `Linked to task ${taskId}` });
        setTimeout(() => setMessage(null), 2000);
    };

    const getRecommendedTaskTitle = (topicId: string, topicTitle: string, contentType: ContentType) => {
        const role = CONTENT_TYPE_TO_ROLE[contentType] || 'Working Doc';
        const id = normalizeTopicId(topicId);
        return `[${id}] ${role} — ${topicTitle}`;
    };

    const handleCreateAndLinkTask = async () => {
        if (!activeDraft || !activeDraft.topic_id) return;
        
        const normalizedId = normalizeTopicId(activeDraft.topic_id);
        const recommendedTitle = getRecommendedTaskTitle(normalizedId, activeDraft.topic_title, activeDraft.content_type);
        const targetRole = CONTENT_TYPE_TO_ROLE[activeDraft.content_type];
        
        // Duplicate guard: check if it already exists in suggestedTasks by checking exact ID and role
        const exactId = `[${normalizedId}]`.toLowerCase();
        const exactRole = targetRole.toLowerCase();

        const existing = suggestedTasks.find((t: any) => {
            const title = t.title.toLowerCase();
            return title.includes(exactId) && title.includes(exactRole);
        });
        
        if (existing) {
            handleLinkTask(existing.id);
            return;
        }

        setIsLinking(true);
        try {
            // Find context from existing tasks to inherit workspace/list/sprint
            const contextTask = suggestedTasks[0];
            const payload = {
                title: recommendedTitle,
                workspace: contextTask?.workspace || 'content',
                status: 'planned',
                review_status: 'draft',
                list_id: contextTask?.list_id || null,
                sprint_id: contextTask?.sprint_id || null,
                topic_id: normalizedId,
                topic_title: activeDraft.topic_title,
                notes: `Created via Writing Desk Lite for ${activeDraft.content_type}`
            };

            const res = await fetch("/api/tasks", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });
            const data = await res.json();
            
            if (data.task) {
                handleLinkTask(data.task.id);
                setMessage({ type: 'success', text: `Created and linked: ${recommendedTitle}` });
            } else {
                throw new Error("Failed to create task");
            }
        } catch (err) {
            console.error("Failed to create task", err);
            setMessage({ type: 'error', text: "Failed to create task" });
        } finally {
            setIsLinking(false);
            setTimeout(() => setMessage(null), 3000);
        }
    };

    const handleAppendToTask = async () => {
        if (!activeDraft || !activeDraft.linked_task_id) return;
        setIsSaving(true);
        try {
            // Fetch existing task
            // NOTE: GET /api/tasks/[id] returns { task: {...} } — unwrap correctly
            const taskRes = await fetch(`/api/tasks/${activeDraft.linked_task_id}`);
            const taskJson = await taskRes.json();
            const existingNotes: string = taskJson?.task?.notes || taskJson?.notes || "";

            let finalExistingNotes = existingNotes;
            if (!existingNotes.trim().startsWith("---")) {
                const taskTitle = taskJson?.task?.title || taskJson?.title || "";
                
                let fallbackTopicId = "";
                const gfMatch = taskTitle.match(/GF-[A-Z]+-\d+/i);
                if (gfMatch) fallbackTopicId = gfMatch[0].toUpperCase();
                else {
                    const topicMatch = taskTitle.match(/TOPIC-\d+/i);
                    if (topicMatch) fallbackTopicId = topicMatch[0].toUpperCase();
                }

                const topicId = activeDraft.topic_id || fallbackTopicId;
                const topicTitle = activeDraft.topic_title || taskTitle;
                const stepRole = activeDraft.source_step || CONTENT_TYPE_TO_ROLE[activeDraft.content_type] || activeDraft.content_type;
                
                const generatedFrontmatter = `---
topic_id: ${topicId}
topic_title: ${topicTitle}
step_role: ${stepRole}
content_pillar: 
content_type: ${activeDraft.content_type}
content_layer: 
article_format: 
narrative_style: 
narrative_status: 
journey_set: 
journey_stage: 
bridge_from: 
bridge_to: 
status: research
priority: medium
---

`;
                finalExistingNotes = generatedFrontmatter + existingNotes;
            }

            // Derive the step label for the append header
            const stepLabel = activeDraft.source_step
                ? SOURCE_STEP_LABELS[activeDraft.source_step]
                : (CONTENT_TYPE_TO_ROLE[activeDraft.content_type] || "Working Doc");

            let appendBlock = "";
            if (stepLabel === 'Script & Caption') {
                appendBlock = `\n\n---\n\n## Arbor Output — Step 5 Script & Caption — Draft\n\n` +
                `### Group Post\n\n### Page Post\n\n### Personal Post\n\n` +
                `### Website Bridge Copy\n\n### Short Caption\n\n### Hook Options\n\n` +
                `### Closing Line Options\n\n### Reference Note\n\n### Hashtags\n\n`;
            } else {
                appendBlock = `\n\n---\n\n## Arbor Output — ${stepLabel} — Draft\n\n`;
            }

            const markdown = formatDraftToMarkdown(activeDraft, review);
            const newNotes = finalExistingNotes + (finalExistingNotes && !finalExistingNotes.endsWith('\n\n') ? '\n\n' : '') + appendBlock.trimStart() + markdown;

            await fetch(`/api/tasks/${activeDraft.linked_task_id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ 
                    notes: newNotes,
                    status: 'in_progress',
                    review_status: 'in_review'
                })
            });

            setMessage({ type: 'success', text: "Appended to task notes!" });
            setTimeout(() => setMessage(null), 3000);
        } catch (err) {
            console.error("Failed to append to task", err);
            setMessage({ type: 'error', text: "Failed to append to task notes" });
            setTimeout(() => setMessage(null), 3000);
        } finally {
            setIsSaving(false);
        }
    };

    const handleReplaceTaskNotes = async () => {
        if (!activeDraft || !activeDraft.linked_task_id) return;
        
        const confirmed = window.confirm("Are you sure you want to replace the linked task's notes? This will overwrite the current content in the task with a clean version of this draft.");
        if (!confirmed) return;

        setIsSaving(true);
        try {
            // Fetch existing task to preserve/merge metadata
            const taskRes = await fetch(`/api/tasks/${activeDraft.linked_task_id}`);
            const taskJson = await taskRes.json();
            const existingNotes: string = taskJson?.task?.notes || taskJson?.notes || "";
            const taskTitle = taskJson?.task?.title || taskJson?.title || "";

            // 1. Parse existing frontmatter from task
            const existingMeta: Record<string, string> = {};
            if (existingNotes.trim().startsWith("---")) {
                const endIdx = existingNotes.indexOf("---", 3);
                if (endIdx !== -1) {
                    const frontmatter = existingNotes.substring(3, endIdx);
                    frontmatter.split('\n').forEach(line => {
                        const match = line.match(/^([a-z_]+):\s*(.*)$/);
                        if (match) existingMeta[match[1]] = match[2].trim();
                    });
                }
            }

            // 2. Parse metadata from draft body (priority)
            const bodyMeta: Record<string, string> = {};
            const bodyLines = activeDraft.body.split('\n').slice(0, 50); // Look at first 50 lines
            bodyLines.forEach(line => {
                const match = line.match(/^([a-z_]+):\s*(.*)$/);
                if (match) {
                    const key = match[1];
                    const val = match[2].trim();
                    if (['topic_id', 'topic_title', 'journey_set', 'journey_stage', 'content_layer', 'article_format', 'narrative_style', 'bridge_from', 'bridge_to', 'status', 'content_pillar'].includes(key)) {
                        bodyMeta[key] = val;
                    }
                }
            });

            // 3. Determine normalized values with priority: Body > Draft Object > Existing Meta > Fallbacks
            let fallbackTopicId = "";
            const gfMatch = taskTitle.match(/GF-[A-Z]+-\d+/i);
            if (gfMatch) fallbackTopicId = gfMatch[0].toUpperCase();
            else {
                const topicMatch = taskTitle.match(/TOPIC-\d+/i);
                if (topicMatch) fallbackTopicId = topicMatch[0].toUpperCase();
            }

            const topicId = bodyMeta.topic_id || activeDraft.topic_id || existingMeta.topic_id || fallbackTopicId;
            let topicTitle = bodyMeta.topic_title || activeDraft.topic_title || existingMeta.topic_title || taskTitle;
            
            // Clean up topic title if it's the shortened version
            if (topicId === 'GF-STORY-01' && topicTitle.includes('เมล็ด — Brief')) {
                topicTitle = 'GF-STORY-01 — เมล็ด: จุดเริ่มต้นของชีวิตพืช';
            }

            const stepRole = activeDraft.source_step || existingMeta.step_role || CONTENT_TYPE_TO_ROLE[activeDraft.content_type] || activeDraft.content_type;
            
            // 4. Determine Step-specific Status
            let taskStatus = bodyMeta.status || existingMeta.status || 'research';
            if (activeDraft.source_step === 'brief') {
                taskStatus = 'brief_updated_ready_for_review';
            } else if (activeDraft.source_step === 'publish') {
                taskStatus = 'ready_to_publish';
            }

            // 5. Narrative & Bridge Fallbacks for GF-STORY-01
            let narrativeStyle = bodyMeta.narrative_style || existingMeta.narrative_style || '';
            if (!narrativeStyle && activeDraft.body.toLowerCase().includes('documentary')) {
                narrativeStyle = 'documentary';
            }

            let bridgeFrom = bodyMeta.bridge_from || existingMeta.bridge_from || '';
            if (!bridgeFrom && topicId === 'GF-STORY-01') {
                bridgeFrom = 'จุดเริ่มต้นของซีรีส์';
            }

            let bridgeTo = bodyMeta.bridge_to || existingMeta.bridge_to || '';
            if (!bridgeTo && topicId === 'GF-STORY-01') {
                bridgeTo = 'GF-STORY-02 — เมล็ดงอก: เมื่อเงื่อนไขเหมาะสม ชีวิตจึงเริ่มต้น';
            }

            // 6. Construct Clean Normalized Frontmatter
            const finalFrontmatter = `---
topic_id: ${topicId}
topic_title: ${topicTitle}
step_role: ${stepRole}
content_pillar: ${bodyMeta.content_pillar || existingMeta.content_pillar || 'Nature & Plant Life'}
content_type: ${activeDraft.content_type}
content_layer: ${bodyMeta.content_layer || existingMeta.content_layer || 'knowledge'}
article_format: ${bodyMeta.article_format || existingMeta.article_format || 'knowledge_journey'}
narrative_style: ${narrativeStyle}
narrative_status: ${existingMeta.narrative_status || 'mapped'}
journey_set: ${bodyMeta.journey_set || existingMeta.journey_set || 'ชีวิตของพืชหนึ่งต้น'}
journey_stage: ${bodyMeta.journey_stage || existingMeta.journey_stage || '01 — เมล็ด'}
bridge_from: ${bridgeFrom}
bridge_to: ${bridgeTo}
status: ${taskStatus}
priority: ${existingMeta.priority || 'medium'}
---`;

            // 7. Construct Clean Body (No export wrapper)
            let cleanBody = activeDraft.body;
            
            // If body contains its own frontmatter, we might want to strip it to avoid double frontmatter
            // But usually the body starts with the title or content.
            if (cleanBody.trim().startsWith("---")) {
                const secondDashes = cleanBody.indexOf("---", 3);
                if (secondDashes !== -1) {
                    cleanBody = cleanBody.substring(secondDashes + 3).trim();
                }
            }

            if (review) {
                cleanBody += `\n\n---\n\n## Arbor Review\n\n`;
                if (review.structured_json) {
                    const s = JSON.parse(review.structured_json) as ArborReviewPayload;
                    cleanBody += `### Summary\n${s.editorialSummary}\n\n`;
                    cleanBody += `### Next Action\n${s.recommendedNextEdit}\n\n`;
                } else {
                    cleanBody += `### Summary\n${review.summary}\n\n`;
                }
            }

            const newNotes = finalFrontmatter + "\n\n" + cleanBody;

            await fetch(`/api/tasks/${activeDraft.linked_task_id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ 
                    notes: newNotes,
                    status: 'in_progress', // WorkOS task status
                    review_status: 'in_review'
                })
            });

            setMessage({ type: 'success', text: "Task notes replaced and normalized!" });
            setTimeout(() => setMessage(null), 3000);
        } catch (err) {
            console.error("Failed to replace task notes", err);
            setMessage({ type: 'error', text: "Failed to replace task notes" });
            setTimeout(() => setMessage(null), 3000);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <PageShell className="max-w-[1920px] mx-auto px-6 overflow-hidden flex flex-col h-[calc(100vh-64px)]">
            {/* Header */}
            <div className="flex items-center justify-between mb-4 shrink-0">
                        <div className="flex items-center gap-4">
                            <Link href="/workspaces/content" className="p-2 hover:bg-theme-hover rounded-full text-theme-secondary">
                                <ArrowLeft size={20} />
                            </Link>
                            <div>
                                <h1 className="text-xl font-black tracking-tight text-theme-primary">Writing Desk Lite</h1>
                                <p className="text-[10px] font-bold text-theme-muted uppercase tracking-widest">Phase 1: Workflow Foundation</p>
                            </div>
                        </div>
                        {activeDraft && (
                            <div className="flex items-center gap-2 px-3 py-1 bg-theme-input rounded-full border border-theme-border">
                                {saveStatus === 'saving' ? (
                                    <Loader2 className="w-3 h-3 animate-spin text-blue-600" />
                                ) : saveStatus === 'unsaved' ? (
                                    <div className="w-2 h-2 rounded-full bg-amber-500" />
                                ) : (
                                    <CheckCircle2 className="w-3 h-3 text-green-600" />
                                )}
                                <span className="text-[9px] font-black uppercase tracking-widest text-theme-secondary">
                                    {saveStatus === 'saving' ? 'Saving...' : saveStatus === 'unsaved' ? 'Unsaved' : 'Saved'}
                                </span>
                            </div>
                        )}
                <div className="flex items-center gap-2">
                    {message && (
                        <div className={`text-xs font-bold px-3 py-1.5 rounded-lg ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                            {message.text}
                        </div>
                    )}
                    <button
                        onClick={() => setIsCreateGfModalOpen(true)}
                        className="bg-black/5 dark:bg-white/5 text-theme-primary px-4 py-2 rounded-xl text-sm font-black flex items-center gap-2 hover:bg-black/10 dark:hover:bg-white/10 transition-all active:scale-95 border border-theme-border"
                    >
                        <Sparkles size={16} /> New GF Article
                    </button>
                    <button 
                        onClick={handleNewDraft}
                        className="bg-black text-white px-4 py-2 rounded-xl text-sm font-black flex items-center gap-2 hover:bg-neutral-800 transition-all active:scale-95"
                    >
                        <Plus size={16} /> New Draft
                    </button>
                </div>
            </div>

            {/* 3-Column Layout */}
            <div className="flex-1 grid grid-cols-[300px_1fr_350px] gap-6 min-h-0 pb-6">
                
                {/* Column 1: Drafts & Context */}
                <aside className="flex flex-col gap-4 min-h-0">
                    <div className="bg-theme-card border border-theme-border rounded-[24px] flex flex-col min-h-0 shadow-sm overflow-hidden">
                        <div className="p-4 border-b border-theme-border/50">
                            <h2 className="text-[10px] font-black uppercase tracking-widest text-theme-muted mb-3">Draft List</h2>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-theme-muted" size={14} />
                                <input 
                                    className="w-full bg-theme-input border border-theme-border rounded-lg pl-9 pr-3 py-2 text-xs font-bold"
                                    placeholder="Search drafts..."
                                />
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
                            {isLoading ? (
                                <div className="flex justify-center p-8"><Loader2 className="animate-spin text-theme-muted" /></div>
                            ) : drafts.length === 0 ? (
                                <div className="text-center p-12 space-y-3">
                                    <div className="w-10 h-10 bg-theme-input rounded-xl flex items-center justify-center mx-auto text-theme-muted">
                                        <FileText size={20} />
                                    </div>
                                    <div className="space-y-1">
                                        <div className="text-[11px] font-black text-theme-primary">ยังไม่มี Draft</div>
                                        <div className="text-[10px] font-bold text-theme-muted">กด New Draft เพื่อเริ่มร่างงานเขียน</div>
                                    </div>
                                </div>
                            ) : (
                                drafts.map(d => (
                                <div 
                                    key={d.id}
                                    onClick={() => { if (pendingDeleteDraftId !== d.id) setActiveDraft(d); }}
                                    className={`w-full text-left p-3 rounded-xl transition-all group flex flex-col gap-2 ${pendingDeleteDraftId === d.id ? 'bg-red-50 border border-red-200' : activeDraft?.id === d.id ? 'bg-blue-50 border border-blue-200 shadow-sm' : 'hover:bg-theme-hover border border-transparent'} cursor-pointer`}
                                >
                                    {pendingDeleteDraftId === d.id ? (
                                        <div className="space-y-2 py-1">
                                            <div className="text-[10px] font-black text-red-700 uppercase tracking-tight">ลบ Draft นี้หรือไม่?</div>
                                            <div className="flex gap-2">
                                                <button 
                                                    onClick={(e) => confirmDelete(d.id, e)}
                                                    disabled={isSaving}
                                                    className="flex-1 py-1.5 bg-red-600 text-white text-[9px] font-black uppercase rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                                                >
                                                    {isSaving ? 'Deleting...' : 'ยืนยันลบ'}
                                                </button>
                                                <button 
                                                    onClick={cancelDelete}
                                                    disabled={isSaving}
                                                    className="flex-1 py-1.5 bg-theme-input text-theme-primary text-[9px] font-black uppercase rounded-lg hover:bg-theme-border transition-colors disabled:opacity-50"
                                                >
                                                    ยกเลิก
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="flex-1 min-w-0">
                                                <div className="text-[11px] font-black text-theme-primary truncate mb-1">{d.topic_title}</div>
                                                <div className="flex items-center gap-2">
                                                    {d.topic_id && (
                                                        <span className="text-[9px] font-black text-theme-muted">{d.topic_id} ·</span>
                                                    )}
                                                    <span className="text-[9px] font-bold text-theme-muted uppercase tracking-tighter truncate">
                                                        {d.source_step ? `${SOURCE_STEP_LABELS[d.source_step]} · ` : ''}{d.content_type}
                                                    </span>
                                                </div>
                                            </div>
                                            <button 
                                                onClick={(e) => initiateDelete(d.id, e)}
                                                disabled={isSaving}
                                                className={`p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all shrink-0 ${isSaving ? 'text-theme-muted cursor-not-allowed' : 'text-theme-muted hover:text-red-600 hover:bg-red-50'}`}
                                                title="Delete Draft"
                                            >
                                                <Trash2 size={12} />
                                            </button>
                                        </div>
                                    )}
                                </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Context Panel (Active Draft Only) */}
                    {activeDraft && (
                        <div className="bg-theme-card border border-theme-border rounded-[24px] p-5 shadow-sm space-y-4 shrink-0 overflow-y-auto custom-scrollbar max-h-[400px]">
                            <h2 className="text-[10px] font-black uppercase tracking-widest text-theme-muted">Context</h2>
                            <div className="space-y-3">
                                <div>
                                    <label className="text-[9px] font-black uppercase text-theme-muted ml-1">Topic ID</label>
                                    <input 
                                        value={activeDraft.topic_id || ""}
                                        onChange={e => {
                                            setActiveDraft({...activeDraft, topic_id: e.target.value.toUpperCase()});
                                            setSaveStatus('unsaved');
                                        }}
                                        className="w-full bg-theme-input border border-theme-border rounded-lg px-3 py-1.5 text-xs font-bold mt-1"
                                        placeholder="e.g. GF-STORY-01 / GF-CONTENT-012"
                                    />
                                </div>
                                <div>
                                    <label className="text-[9px] font-black uppercase text-theme-muted ml-1">Content Type</label>
                                    <select 
                                        value={activeDraft.content_type}
                                        onChange={e => {
                                            setActiveDraft({...activeDraft, content_type: e.target.value as ContentType});
                                            setSaveStatus('unsaved');
                                        }}
                                        className="w-full bg-theme-input border border-theme-border rounded-lg px-2 py-1.5 text-xs font-bold mt-1 outline-none"
                                    >
                                        {CONTENT_TYPES.map(t => (
                                            <option key={t} value={t}>
                                                {CONTENT_TYPE_LABELS[t]}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[9px] font-black uppercase text-theme-muted ml-1">Draft Stage</label>
                                    <select 
                                        value={activeDraft.draft_stage}
                                        onChange={e => {
                                            setActiveDraft({...activeDraft, draft_stage: e.target.value as DraftStage});
                                            setSaveStatus('unsaved');
                                        }}
                                        className="w-full bg-theme-input border border-theme-border rounded-lg px-2 py-1.5 text-xs font-bold mt-1 outline-none"
                                    >
                                        {DRAFT_STAGES.map(t => (
                                            <option key={t} value={t}>
                                                {t.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[9px] font-black uppercase text-theme-muted ml-1">Writing Mode</label>
                                    <select 
                                        value={activeDraft.writing_mode}
                                        onChange={e => {
                                            setActiveDraft({...activeDraft, writing_mode: e.target.value as WritingMode});
                                            setSaveStatus('unsaved');
                                        }}
                                        className="w-full bg-theme-input border border-theme-border rounded-lg px-2 py-1.5 text-xs font-bold mt-1 outline-none"
                                    >
                                        {WRITING_MODES.map(t => (
                                            <option key={t} value={t}>
                                                {t.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[9px] font-black uppercase text-theme-muted ml-1">Source Step</label>
                                    <select 
                                        value={activeDraft.source_step || ""}
                                        onChange={e => {
                                            setActiveDraft({...activeDraft, source_step: (e.target.value || null) as SourceStep | null});
                                            setSaveStatus('unsaved');
                                        }}
                                        className="w-full bg-theme-input border border-theme-border rounded-lg px-2 py-1.5 text-xs font-bold mt-1 outline-none"
                                    >
                                        <option value="">(None)</option>
                                        {SOURCE_STEPS.map(t => (
                                            <option key={t} value={t}>
                                                {SOURCE_STEP_LABELS[t]}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>
                    )}
                </aside>

                {/* Column 2: Editor */}
                <main className="flex flex-col min-h-0">
                    <div className="flex-1 bg-white border border-theme-border rounded-[24px] shadow-theme-soft flex flex-col overflow-hidden">
                        <div className="px-6 py-4 border-b border-theme-border/50 flex items-center justify-between shrink-0">
                            <input 
                                value={activeDraft?.topic_title || ""}
                                onChange={e => activeDraft && setActiveDraft({...activeDraft, topic_title: e.target.value})}
                                className="text-lg font-black tracking-tight text-theme-primary outline-none bg-transparent placeholder:text-theme-muted w-full max-w-xl"
                                placeholder="Draft Title..."
                                disabled={!activeDraft}
                            />
                            <div className="flex items-center gap-2">
                                <button 
                                    onClick={handleSave}
                                    disabled={!activeDraft || isSaving}
                                    className="p-2 hover:bg-theme-hover rounded-xl text-theme-secondary transition-all disabled:opacity-50"
                                    title="Save Draft"
                                >
                                    {isSaving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                                </button>
                            </div>
                        </div>
                        <div className="flex-1 min-h-0 relative">
                            {!activeDraft ? (
                                <div className="absolute inset-0 flex items-center justify-center bg-theme-input/20">
                                    <div className="text-center space-y-4">
                                        <div className="w-16 h-16 bg-theme-card rounded-2xl border border-theme-border flex items-center justify-center mx-auto shadow-sm">
                                            <FileText className="text-theme-muted" size={32} />
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-black text-theme-primary">Select a draft to start writing</h3>
                                            <p className="text-xs text-theme-muted mt-1 font-bold">Or create a new one from the top right button.</p>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <textarea 
                                    value={activeDraft.body}
                                    onChange={e => {
                                        setActiveDraft({...activeDraft, body: e.target.value});
                                        setSaveStatus('unsaved');
                                    }}
                                    className="w-full h-full p-8 outline-none resize-none text-theme-primary leading-relaxed font-medium text-base custom-scrollbar"
                                    placeholder="เริ่มร่างเนื้อหาของคุณที่นี่..."
                                />
                            )}
                        </div>
                        
                        {/* Actions Bar (Bottom) */}
                        {activeDraft && (
                            <div className="px-6 py-4 border-t border-theme-border/50 bg-theme-card flex items-center justify-between shrink-0">
                                <div className="flex items-center gap-4">
                                    <button 
                                        onClick={handleRunReview}
                                        disabled={isReviewing || !activeDraft.body}
                                        className="bg-blue-600 text-white px-4 py-2 rounded-xl text-xs font-black flex items-center gap-2 hover:bg-blue-700 transition-all shadow-md shadow-blue-100 disabled:opacity-50"
                                    >
                                        {isReviewing ? <Loader2 className="animate-spin" size={16} /> : <Sparkles size={16} />} 
                                        Run Arbor Review
                                    </button>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button 
                                        onClick={handleCopyClean}
                                        className="px-3 py-2 hover:bg-theme-hover rounded-xl text-theme-secondary text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 transition-all"
                                    >
                                        <Copy size={14} /> Copy Clean
                                    </button>
                                    <button 
                                        onClick={handleExportMarkdown}
                                        className="px-3 py-2 hover:bg-theme-hover rounded-xl text-theme-secondary text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 transition-all"
                                    >
                                        <Download size={14} /> Export MD
                                    </button>
                                    <div className="h-4 w-[1px] bg-theme-border mx-1" />
                                    <button 
                                        onClick={handleSearchTasks}
                                        disabled={isLinking || !activeDraft.topic_id}
                                        className={`px-3 py-2 hover:bg-theme-hover rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 transition-all ${activeDraft.linked_task_id ? 'text-green-600' : 'text-theme-secondary'}`}
                                    >
                                        <LinkIcon size={14} /> {activeDraft.linked_task_id ? 'Linked' : 'Link to Task'}
                                    </button>
                                    {activeDraft.linked_task_id && (
                                        <div className="flex flex-col items-end gap-2 mt-2">
                                            <div className="flex items-center gap-2">
                                                <button 
                                                    onClick={handleAppendToTask}
                                                    className="px-4 py-2 bg-theme-border/50 text-theme-primary hover:text-white rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 transition-all hover:bg-theme-muted shadow-sm"
                                                >
                                                    <Plus size={14} /> Append
                                                </button>
                                                <button 
                                                    onClick={handleReplaceTaskNotes}
                                                    className="px-4 py-2 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 transition-all hover:bg-blue-700 shadow-sm"
                                                >
                                                    <RefreshCw size={14} /> Replace Task Notes
                                                </button>
                                            </div>
                                            <span className="text-[8px] font-bold text-theme-muted uppercase tracking-tighter mr-1 max-w-[250px] text-right">
                                                Workflow tasks (Brief, Outline, etc.) use <span className="text-blue-500">Replace</span>. Log outputs use <span className="text-theme-secondary">Append</span>.
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </main>

                {/* Task Link Modal (Simple Overlay) */}
                {isTaskSearchOpen && (
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-6">
                        <div className="bg-theme-card border border-theme-border rounded-[32px] w-full max-w-md overflow-hidden shadow-2xl">
                            <div className="p-6 border-b border-theme-border/50 flex items-center justify-between">
                                <h3 className="text-sm font-black uppercase tracking-widest text-theme-primary">Link to WorkOS Task</h3>
                                <button onClick={() => setIsTaskSearchOpen(false)} className="text-theme-muted hover:text-theme-primary">
                                    <Plus className="rotate-45" size={20} />
                                </button>
                            </div>
                            <div className="p-4 max-h-[400px] overflow-y-auto custom-scrollbar">
                                {suggestedTasks.length === 0 ? (
                                    <div className="p-8 text-center text-xs text-theme-muted font-bold italic">No tasks found for this topic ID.</div>
                                ) : (
                                    <div className="space-y-6">
                                        {(() => {
                                            const normalizedId = activeDraft?.topic_id ? normalizeTopicId(activeDraft.topic_id) : '';
                                            const step = activeDraft?.source_step as SourceStep | null;
                                            const targetRole = activeDraft ? CONTENT_TYPE_TO_ROLE[activeDraft.content_type] : '';
                                            const recommendedTitle = activeDraft ? getRecommendedTaskTitle(normalizedId, activeDraft.topic_title, activeDraft.content_type) : '';

                                            // Match by source_step keywords first (primary), then fallback to content_type role
                                            const recommendedTasks = suggestedTasks.filter((t: any) => {
                                                const title = t.title.toLowerCase();
                                                const hasId = normalizedId && title.includes(`[${normalizedId}]`.toLowerCase());
                                                if (!hasId) return false;

                                                // Source step match (higher confidence)
                                                if (step && SOURCE_STEP_MATCH_KEYWORDS[step]) {
                                                    if (SOURCE_STEP_MATCH_KEYWORDS[step].some(kw => title.includes(kw))) return true;
                                                }

                                                // Fallback: content_type role match
                                                return targetRole && title.includes(targetRole.toLowerCase());
                                            });
                                            const otherTasks = suggestedTasks.filter((t: any) => !recommendedTasks.find(rt => rt.id === t.id));
                                            
                                            return (
                                                <>
                                                    {/* Recommended Section */}
                                                    {recommendedTasks.length > 0 && (
                                                        <section className="space-y-2">
                                                            <h4 className="text-[10px] font-black uppercase tracking-widest text-blue-600 px-2">Recommended Task</h4>
                                                            <div className="space-y-2">
                                                                {recommendedTasks.map((t: any) => (
                                                                    <button 
                                                                        key={t.id}
                                                                        onClick={() => handleLinkTask(t.id)}
                                                                        className="w-full text-left p-4 rounded-2xl border border-blue-400 bg-blue-50/50 hover:bg-blue-50 transition-all group"
                                                                    >
                                                                        <div className="flex items-center justify-between mb-1">
                                                                            <div className="text-xs font-black text-blue-700 group-hover:text-blue-800">{t.title}</div>
                                                                            <span className="text-[8px] font-black uppercase tracking-widest px-2 py-0.5 bg-blue-600 text-white rounded-full">Recommended</span>
                                                                        </div>
                                                                        <div className="flex items-center gap-3">
                                                                            <Badge color={t.status === 'done' ? 'green' : 'slate'}>{t.status}</Badge>
                                                                            <span className="text-[10px] font-mono text-theme-muted">ID: {t.id}</span>
                                                                        </div>
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        </section>
                                                    )}

                                                    {/* Create Section */}
                                                    {recommendedTasks.length === 0 && (
                                                        <section className="space-y-3 p-5 bg-amber-50/50 border border-amber-200 rounded-2xl">
                                                            <div>
                                                                <div className="text-[10px] font-black uppercase tracking-widest text-amber-600 mb-1">Arbor Suggestion</div>
                                                                <p className="text-[11px] font-bold text-amber-800 leading-normal">
                                                                    ไม่พบ Task เฉพาะสำหรับ {activeDraft?.content_type.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}<br/>
                                                                    ควรแยก Task เป็น <span className="font-black">“{recommendedTitle.split('] ')[1]}”</span> เพื่อให้เก็บข้อมูลแยกกันอย่างเป็นระเบียบ
                                                                </p>
                                                            </div>
                                                            <button 
                                                                onClick={handleCreateAndLinkTask}
                                                                disabled={isLinking}
                                                                className="w-full py-3 bg-black text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-zinc-800 transition-all flex items-center justify-center gap-2"
                                                            >
                                                                {isLinking ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                                                                Create & Link Task
                                                            </button>
                                                            <div className="text-[9px] font-bold text-amber-600 text-center italic">
                                                                ชื่อ Task: {recommendedTitle}
                                                            </div>
                                                        </section>
                                                    )}

                                                    {/* Other Tasks Section */}
                                                    {otherTasks.length > 0 && (
                                                        <section className="space-y-2">
                                                            <h4 className="text-[10px] font-black uppercase tracking-widest text-theme-muted px-2">Other Related Tasks</h4>
                                                            <div className="space-y-2">
                                                                {otherTasks.map((t: any) => (
                                                                    <button 
                                                                        key={t.id}
                                                                        onClick={() => handleLinkTask(t.id)}
                                                                        className="w-full text-left p-4 rounded-2xl border border-theme-border hover:border-blue-300 hover:bg-blue-50/30 transition-all group"
                                                                    >
                                                                        <div className="text-xs font-black text-theme-primary group-hover:text-blue-700 mb-1">{t.title}</div>
                                                                        <div className="flex items-center gap-3">
                                                                            <Badge color={t.status === 'done' ? 'green' : 'slate'}>{t.status}</Badge>
                                                                            <span className="text-[10px] font-mono text-theme-muted">ID: {t.id}</span>
                                                                        </div>
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        </section>
                                                    )}
                                                </>
                                            );
                                        })()}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Column 3: Arbor Review Panel */}
                <aside className="bg-theme-card border border-theme-border rounded-[24px] shadow-sm flex flex-col min-h-0 overflow-hidden">
                    <div className="px-5 py-4 border-b border-theme-border/50 flex items-center justify-between shrink-0">
                        <div className="flex items-center gap-2">
                            <Sparkles className="text-blue-600" size={16} />
                            <h2 className="text-[10px] font-black uppercase tracking-widest text-theme-primary">Arbor Review</h2>
                        </div>
                        {review && <Badge color="green">Ready</Badge>}
                    </div>

                    {!review ? (
                        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-4 opacity-70">
                            <div className="p-4 bg-theme-input rounded-2xl">
                                <Sparkles className="text-blue-600" size={24} />
                            </div>
                            <div className="space-y-1">
                                <div className="text-[11px] font-black text-theme-primary">ยังไม่มีผล Review</div>
                                <div className="text-[10px] font-bold text-theme-muted leading-relaxed">เลือก review mode แล้วกด Run Arbor Review</div>
                            </div>
                        </div>
                    ) : (
                        <div className="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-6">
                            {/* Structured Review Sections */}
                            {review.structured_json ? (() => {
                                const s = JSON.parse(review.structured_json) as ArborReviewPayload;
                                return (
                                    <>
                                        <section className="space-y-2">
                                            <div className="flex items-center justify-between">
                                                <h3 className="text-[9px] font-black uppercase tracking-widest text-theme-muted">Summary</h3>
                                                <div className="text-[8px] font-bold px-1.5 py-0.5 bg-theme-input rounded text-theme-secondary border border-theme-border/50">
                                                    Reviewed as: {s.reviewedContentType.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                                                </div>
                                            </div>

                                            {activeDraft?.content_type !== review.reviewed_content_type && (
                                                <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 flex items-start gap-2.5">
                                                    <AlertCircle size={14} className="text-amber-600 mt-0.5 shrink-0" />
                                                    <div className="text-[10px] font-bold text-amber-800 leading-tight">
                                                        Review outdated — content type changed. Please run Arbor Review again.
                                                    </div>
                                                </div>
                                            )}

                                            <div className="text-xs font-bold text-theme-primary leading-relaxed bg-blue-50/50 p-4 rounded-2xl border border-blue-100">
                                                {s.editorialSummary}
                                            </div>
                                        </section>

                                        <div className="grid grid-cols-2 gap-4">
                                            <section className="space-y-2">
                                                <h3 className="text-[9px] font-black uppercase tracking-widest text-theme-muted">Keep</h3>
                                                <div className="space-y-1.5">
                                                    {s.contentStrength.map((text, idx) => (
                                                        <div key={idx} className="flex gap-2 p-2 bg-green-50/50 rounded-lg border border-green-100/50">
                                                            <div className="w-1 h-1 rounded-full bg-green-500 mt-1.5 shrink-0" />
                                                            <div className="text-[10px] font-bold text-green-800">{text}</div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </section>
                                            <section className="space-y-2">
                                                <h3 className="text-[9px] font-black uppercase tracking-widest text-theme-muted">Fix</h3>
                                                <div className="space-y-1.5">
                                                    {s.revisionPoints.map((text, idx) => (
                                                        <div key={idx} className="flex gap-2 p-2 bg-red-50/50 rounded-lg border border-red-100/50">
                                                            <div className="w-1 h-1 rounded-full bg-red-500 mt-1.5 shrink-0" />
                                                            <div className="text-[10px] font-bold text-red-800">{text}</div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </section>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <section className="space-y-2">
                                                <h3 className="text-[9px] font-black uppercase tracking-widest text-theme-muted">Risk</h3>
                                                <div className="space-y-1.5">
                                                    {s.claimSafetyNotes.map((text, idx) => (
                                                        <div key={idx} className="flex gap-2 p-2 bg-amber-50/50 rounded-lg border border-amber-100/50">
                                                            <AlertCircle size={10} className="text-amber-600 mt-0.5 shrink-0" />
                                                            <div className="text-[10px] font-bold text-amber-800">{text}</div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </section>
                                            <section className="space-y-2">
                                                <h3 className="text-[9px] font-black uppercase tracking-widest text-theme-muted">Tone</h3>
                                                <div className="flex flex-wrap gap-1.5">
                                                    {s.toneNotes.map((tone, idx) => (
                                                        <span key={idx} className="px-2 py-1 bg-theme-input rounded-md text-[9px] font-black text-theme-secondary border border-theme-border/50">
                                                            {tone}
                                                        </span>
                                                    ))}
                                                </div>
                                            </section>
                                        </div>

                                        {s.suggestedRevision && (
                                            <section className="pt-4 border-t border-theme-border/50 space-y-2">
                                                <h3 className="text-[9px] font-black uppercase tracking-widest text-theme-muted">Suggested Revision</h3>
                                                <div className="bg-amber-50/50 border border-amber-200/50 rounded-2xl p-4 space-y-3">
                                                    <p className="text-xs font-bold text-amber-900 leading-relaxed italic">
                                                        “{s.suggestedRevision}”
                                                    </p>
                                                    <button 
                                                        onClick={() => {
                                                            navigator.clipboard.writeText(s.suggestedRevision!);
                                                            setMessage({ type: 'success', text: "Suggestion copied!" });
                                                            setTimeout(() => setMessage(null), 2000);
                                                        }}
                                                        className="w-full py-2 bg-white border border-amber-200 text-amber-700 text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-theme-100 transition-all flex items-center justify-center gap-2 shadow-sm"
                                                    >
                                                        <Copy size={12} /> Copy Suggestion
                                                    </button>
                                                </div>
                                            </section>
                                        )}

                                        {/* NEW: Actionable Suggestion Sections */}
                                        {s.suggestedHeadings && (
                                            <section className="pt-4 border-t border-theme-border/50 space-y-2">
                                                <h3 className="text-[9px] font-black uppercase tracking-widest text-theme-muted">Suggested Heading Structure</h3>
                                                <div className="bg-theme-input/30 border border-theme-border/50 rounded-2xl p-4 space-y-3">
                                                    <pre className="text-[11px] font-mono text-theme-secondary whitespace-pre-wrap leading-relaxed">
                                                        {s.suggestedHeadings}
                                                    </pre>
                                                    <button 
                                                        onClick={() => {
                                                            navigator.clipboard.writeText(s.suggestedHeadings!);
                                                            setMessage({ type: 'success', text: "Headings copied!" });
                                                            setTimeout(() => setMessage(null), 2000);
                                                        }}
                                                        className="w-full py-2 bg-theme-input border border-theme-border text-theme-secondary text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-theme-hover transition-all flex items-center justify-center gap-2 shadow-sm"
                                                    >
                                                        <Copy size={12} /> Copy Markdown
                                                    </button>
                                                </div>
                                            </section>
                                        )}

                                        {s.suggestedRewrite && (
                                            <section className="pt-4 border-t border-theme-border/50 space-y-2">
                                                <h3 className="text-[9px] font-black uppercase tracking-widest text-theme-muted">Suggested Rewrite</h3>
                                                <div className="bg-blue-50/30 border border-blue-100 rounded-2xl p-4 space-y-3">
                                                    <div className="text-xs font-bold text-theme-primary leading-relaxed whitespace-pre-wrap">
                                                        {s.suggestedRewrite}
                                                    </div>
                                                    <button 
                                                        onClick={() => {
                                                            navigator.clipboard.writeText(s.suggestedRewrite!);
                                                            setMessage({ type: 'success', text: "Rewrite copied!" });
                                                            setTimeout(() => setMessage(null), 2000);
                                                        }}
                                                        className="w-full py-2 bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-blue-700 transition-all flex items-center justify-center gap-2 shadow-sm"
                                                    >
                                                        <Copy size={12} /> Copy Markdown
                                                    </button>
                                                </div>
                                            </section>
                                        )}

                                        {(s.claimSafetySuggestions && s.claimSafetySuggestions.length > 0) && (
                                            <section className="pt-4 border-t border-theme-border/50 space-y-2">
                                                <h3 className="text-[9px] font-black uppercase tracking-widest text-theme-muted">Claim Safety Suggestions</h3>
                                                <div className="space-y-2">
                                                    {s.claimSafetySuggestions.map((text, idx) => (
                                                        <div key={idx} className="p-3 bg-amber-50/50 border border-amber-100 rounded-xl space-y-2">
                                                            <div className="text-[10px] font-bold text-amber-900 leading-tight">{text}</div>
                                                            <button 
                                                                onClick={() => {
                                                                    navigator.clipboard.writeText(text);
                                                                    setMessage({ type: 'success', text: "Copied!" });
                                                                    setTimeout(() => setMessage(null), 2000);
                                                                }}
                                                                className="text-[9px] font-black uppercase tracking-tighter text-amber-700 hover:underline flex items-center gap-1"
                                                            >
                                                                <Copy size={10} /> Copy Wording
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>
                                            </section>
                                        )}

                                        {(s.voiceToneSuggestions && s.voiceToneSuggestions.length > 0) && (
                                            <section className="pt-4 border-t border-theme-border/50 space-y-2">
                                                <h3 className="text-[9px] font-black uppercase tracking-widest text-theme-muted">Voice & Tone Suggestions</h3>
                                                <div className="space-y-2">
                                                    {s.voiceToneSuggestions.map((text, idx) => (
                                                        <div key={idx} className="p-3 bg-purple-50/50 border border-purple-100 rounded-xl flex items-start justify-between gap-3">
                                                            <div className="text-[10px] font-bold text-purple-900 leading-tight">{text}</div>
                                                            <button 
                                                                onClick={() => {
                                                                    navigator.clipboard.writeText(text);
                                                                    setMessage({ type: 'success', text: "Copied!" });
                                                                    setTimeout(() => setMessage(null), 2000);
                                                                }}
                                                                className="shrink-0 p-1.5 hover:bg-purple-100 rounded-lg text-purple-700"
                                                            >
                                                                <Copy size={12} />
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>
                                            </section>
                                        )}

                                        {(s.nextEditChecklist && s.nextEditChecklist.length > 0) && (
                                            <section className="pt-4 border-t border-theme-border/50 space-y-2">
                                                <h3 className="text-[9px] font-black uppercase tracking-widest text-theme-muted">Next Edit Checklist</h3>
                                                <div className="bg-theme-card border border-theme-border/50 rounded-2xl p-4 space-y-3">
                                                    <div className="space-y-2">
                                                        {s.nextEditChecklist.map((item, idx) => (
                                                            <div key={idx} className="flex gap-2.5 items-start">
                                                                <div className="w-4 h-4 rounded-md border border-theme-border flex items-center justify-center shrink-0 mt-0.5">
                                                                    <div className="w-2 h-2 rounded-sm bg-theme-border/50" />
                                                                </div>
                                                                <div className="text-[11px] font-bold text-theme-primary leading-tight">{item}</div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            </section>
                                        )}

                                        <section className="pt-4 border-t border-theme-border/50">
                                            <h3 className="text-[9px] font-black uppercase tracking-widest text-theme-muted mb-2">Next Action</h3>
                                            <div className="flex items-center gap-3 p-3 bg-black text-white rounded-xl shadow-lg">
                                                <ChevronRight size={16} className="text-blue-400 shrink-0" />
                                                <div className="text-[11px] font-black leading-tight">{s.recommendedNextEdit}</div>
                                            </div>
                                        </section>
                                    </>
                                );
                            })() : (
                                <>
                                    {/* Legacy Review Format fallback */}
                                    <section className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <h3 className="text-[9px] font-black uppercase tracking-widest text-theme-muted">Summary</h3>
                                            {review.reviewed_content_type && (
                                                <div className="text-[8px] font-bold px-1.5 py-0.5 bg-theme-input rounded text-theme-secondary border border-theme-border/50">
                                                    Reviewed as: {review.reviewed_content_type.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                                                </div>
                                            )}
                                        </div>

                                        {activeDraft?.content_type !== review.reviewed_content_type && (
                                            <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 flex items-start gap-2.5">
                                                <AlertCircle size={14} className="text-amber-600 mt-0.5 shrink-0" />
                                                <div className="text-[10px] font-bold text-amber-800 leading-tight">
                                                    Review outdated — content type changed. Please run Arbor Review again.
                                                </div>
                                            </div>
                                        )}

                                        <div className="text-xs font-bold text-theme-primary leading-relaxed bg-blue-50/50 p-4 rounded-2xl border border-blue-100">
                                            {review.summary}
                                        </div>
                                    </section>

                                    {/* Issues & Patches (Legacy) */}
                                    {review.issues_json && (
                                        <section>
                                            <h3 className="text-[9px] font-black uppercase tracking-widest text-theme-muted mb-2">Detected Issues</h3>
                                            <div className="space-y-2">
                                                {(JSON.parse(review.issues_json) as ReviewIssue[]).map((issue) => (
                                                    <div key={issue.id} className="p-3 bg-theme-input/50 rounded-xl border border-theme-border flex gap-3 items-start group">
                                                        <div className={`mt-0.5 shrink-0 w-2 h-2 rounded-full ${issue.severity === 'high' ? 'bg-red-500' : 'bg-blue-500'}`} />
                                                        <div className="text-[11px] font-bold text-theme-secondary">{issue.message}</div>
                                                    </div>
                                                ))}
                                            </div>
                                        </section>
                                    )}

                                    <section className="pt-4 border-t border-theme-border/50">
                                        <h3 className="text-[9px] font-black uppercase tracking-widest text-theme-muted mb-2">Next Step</h3>
                                        <div className="flex items-center gap-3 p-3 bg-black text-white rounded-xl shadow-lg">
                                            <ChevronRight size={16} className="text-blue-400" />
                                            <div className="text-[11px] font-black">{review.next_step}</div>
                                        </div>
                                    </section>
                                </>
                            )}
                        </div>
                    )}
                </aside>
            </div>
            <CreateGfArticleModal
                isOpen={isCreateGfModalOpen}
                onClose={() => setIsCreateGfModalOpen(false)}
                onSuccess={(count) => {
                    setMessage({ type: 'success', text: `Successfully created ${count} tasks for the GF Article.` });
                    setTimeout(() => setMessage(null), 3000);
                }}
            />

        </PageShell>
    );
}
