"use client";

import React, { useState, useEffect, useCallback } from "react";
import { 
    PenTool, 
    Save, 
    CheckCircle, 
    AlertCircle, 
    Loader2, 
    FileText, 
    Globe, 
    Sparkles, 
    Bold, 
    Italic, 
    ListOrdered, 
    Quote, 
    Minus,
    Copy,
    ArrowRight,
    Share2,
    Search,
    ChevronDown,
    Wand2
} from "lucide-react";
import { validatePayload } from "@/lib/arborInboxSchema";

interface WritingProject {
    id: string;
    topic_id: string | null;
    title: string;
    slug: string | null;
    story_set_id: string | null;
    episode_id: string | null;
    writing_mode: string;
    episode_role: string | null;
    journey_stage: string | null;
    status: string;
    summary: string | null;
    notes: string | null;
    meta_title: string | null;
    meta_description: string | null;
    keywords: string | null;
    excerpt: string | null;
    group_post_markdown: string | null;
    page_post_markdown: string | null;
    personal_post_markdown: string | null;
    social_caption: string | null;
    hashtags: string | null;
    narrative_body?: string | null;
    knowledge_body?: string | null;
    narrative_title?: string | null;
    narrative_slug?: string | null;
    narrative_hero_subtitle?: string | null;
    narrative_featured_image_url?: string | null;
    narrative_short_summary?: string | null;
    narrative_meta_title?: string | null;
    narrative_meta_description?: string | null;
    narrative_keywords?: string | null;
    narrative_schema_jsonld?: string | null;
    narrative_status?: string | null;
    narrative_editors_pick?: number | null;
    narrative_related_knowledge_article?: string | null;
    narrative_journey_stage?: string | null;
    knowledge_title?: string | null;
    knowledge_slug?: string | null;
    knowledge_hero_subtitle?: string | null;
    knowledge_featured_image_url?: string | null;
    knowledge_short_summary?: string | null;
    knowledge_meta_title?: string | null;
    knowledge_meta_description?: string | null;
    knowledge_keywords?: string | null;
    knowledge_schema_jsonld?: string | null;
    knowledge_status?: string | null;
    knowledge_editors_pick?: number | null;
    knowledge_related_narrative_article?: string | null;
    knowledge_primary_keyword?: string | null;
    knowledge_secondary_keywords?: string | null;
    knowledge_category?: string | null;
    updated_at: string;
}

interface WritingStudioTabProps {
    projectId: string | null;
    episodeId: string | null;
    projects: WritingProject[];
    storySets: any[];
    onCreateProject: () => void;
    onSelectProject: (id: string) => void;
    onSelectEpisode: (id: string) => void;
    onRefresh: () => void;
}

type SubTabKey = "narrative" | "knowledge" | "social" | "seo" | "utm" | "review";

export default function WritingStudioTab({ 
    projectId, 
    episodeId, 
    projects, 
    storySets,
    onCreateProject,
    onSelectProject,
    onSelectEpisode,
    onRefresh
}: WritingStudioTabProps) {
    const activeProject = projects.find(p => p.episode_id === episodeId || p.id === projectId);
    const resolvedEpisodeId = episodeId || activeProject?.episode_id;
    
    // Flatten episodes to find the current active episode details
    const activeEpisode = storySets
        .flatMap(set => (set.episodes || []).map((ep: any) => ({ ...ep, story_set_title: set.title })))
        .find(ep => ep.id === resolvedEpisodeId);

        // States
    const [subTab, setSubTab] = useState<SubTabKey>("narrative");
    const [isExpanded, setIsExpanded] = useState(false);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [lastSaved, setLastSaved] = useState<Date | null>(null);
    const [localBlocks, setLocalBlocks] = useState<any[]>([]);

    // Form states
    const [workingTitle, setWorkingTitle] = useState("");
    const [narrativeBody, setNarrativeBody] = useState("");
    const [knowledgeBody, setKnowledgeBody] = useState("");
    const [facebookGroupPost, setFacebookGroupPost] = useState("");
    const [facebookPagePost, setFacebookPagePost] = useState("");
    const [personalPost, setPersonalPost] = useState("");
    const [shortCaption, setShortCaption] = useState("");
    const [hashtags, setHashtags] = useState("");
    
    const [slug, setSlug] = useState("");
    const [heroSubtitle, setHeroSubtitle] = useState("");
    const [shortSummary, setShortSummary] = useState("");
    const [metaTitle, setMetaTitle] = useState("");
    const [metaDescription, setMetaDescription] = useState("");
    const [keywords, setKeywords] = useState("");

    // Horizontal tab selector
    const [seoMode, setSeoMode] = useState<"narrative" | "knowledge">("narrative");

    // Narrative SEO states
    const [narrativeTitle, setNarrativeTitle] = useState("");
    const [narrativeSlug, setNarrativeSlug] = useState("");
    const [narrativeHeroSubtitle, setNarrativeHeroSubtitle] = useState("");
    const [narrativeFeaturedImageUrl, setNarrativeFeaturedImageUrl] = useState("");
    const [narrativeShortSummary, setNarrativeShortSummary] = useState("");
    const [narrativeMetaTitle, setNarrativeMetaTitle] = useState("");
    const [narrativeMetaDescription, setNarrativeMetaDescription] = useState("");
    const [narrativeKeywords, setNarrativeKeywords] = useState("");
    const [narrativeSchemaJsonld, setNarrativeSchemaJsonld] = useState("");
    const [narrativeStatus, setNarrativeStatus] = useState("draft");
    const [narrativeEditorsPick, setNarrativeEditorsPick] = useState<number>(0);
    const [narrativeRelatedKnowledgeArticle, setNarrativeRelatedKnowledgeArticle] = useState("");
    const [narrativeJourneyStage, setNarrativeJourneyStage] = useState("");

    // Knowledge SEO states
    const [knowledgeTitle, setKnowledgeTitle] = useState("");
    const [knowledgeSlug, setKnowledgeSlug] = useState("");
    const [knowledgeHeroSubtitle, setKnowledgeHeroSubtitle] = useState("");
    const [knowledgeFeaturedImageUrl, setKnowledgeFeaturedImageUrl] = useState("");
    const [knowledgeShortSummary, setKnowledgeShortSummary] = useState("");
    const [knowledgeMetaTitle, setKnowledgeMetaTitle] = useState("");
    const [knowledgeMetaDescription, setKnowledgeMetaDescription] = useState("");
    const [knowledgeKeywords, setKnowledgeKeywords] = useState("");
    const [knowledgeSchemaJsonld, setKnowledgeSchemaJsonld] = useState("");
    const [knowledgeStatus, setKnowledgeStatus] = useState("draft");
    const [knowledgeEditorsPick, setKnowledgeEditorsPick] = useState<number>(0);
    const [knowledgeRelatedNarrativeArticle, setKnowledgeRelatedNarrativeArticle] = useState("");
    const [knowledgePrimaryKeyword, setKnowledgePrimaryKeyword] = useState("");
    const [knowledgeSecondaryKeywords, setKnowledgeSecondaryKeywords] = useState("");
    const [knowledgeCategory, setKnowledgeCategory] = useState("");

    const [publishedUrl, setPublishedUrl] = useState("");
    const [campaignName, setCampaignName] = useState("");

    // Generated UTMs
    const [groupUtm, setGroupUtm] = useState("");
    const [pageUtm, setPageUtm] = useState("");
    const [personalUtm, setPersonalUtm] = useState("");

    // Review Result
    const [reviewResult, setReviewResult] = useState<any>(null);
    const [isReviewing, setIsReviewing] = useState(false);
    const [copyStatus, setCopyStatus] = useState<string | null>(null);

    // WorkOS Handoff Package states
    const [isWorkOSModalOpen, setIsWorkOSModalOpen] = useState(false);
    const [generatedPackageText, setGeneratedPackageText] = useState("");
    const [copyPackageSuccess, setCopyPackageSuccess] = useState(false);
    const [validationErrors, setValidationErrors] = useState<string[]>([]);
    const [validationWarnings, setValidationWarnings] = useState<string[]>([]);
    const [isPackageValid, setIsPackageValid] = useState(true);

    // Sync state when activeProject changes
    useEffect(() => {
        if (activeProject) {
            setWorkingTitle(activeProject.title || "");
            setSlug(activeProject.slug || "");
            setShortSummary(activeProject.summary || "");
            setMetaTitle(activeProject.meta_title || "");
            setMetaDescription(activeProject.meta_description || "");
            setKeywords(activeProject.keywords || "");
            
            setFacebookGroupPost(activeProject.group_post_markdown || "");
            setFacebookPagePost(activeProject.page_post_markdown || "");
            setPersonalPost(activeProject.personal_post_markdown || "");
            setShortCaption(activeProject.social_caption || "");
            setHashtags(activeProject.hashtags || "");
            setNarrativeBody(activeProject.narrative_body || "");
            setKnowledgeBody(activeProject.knowledge_body || "");

            let legacyHeroSub = "";
            let pubUrl = "";
            let campName = "";
            if (activeProject.notes) {
                try {
                    const parsed = JSON.parse(activeProject.notes);
                    legacyHeroSub = parsed.hero_subtitle || "";
                    pubUrl = parsed.published_url || "";
                    campName = parsed.campaign_name || "";
                } catch {
                    // notes is plain text
                }
            }
            setHeroSubtitle(legacyHeroSub);
            setPublishedUrl(pubUrl);
            setCampaignName(campName);

            // Narrative fields fallback ONLY
            setNarrativeTitle(activeProject.narrative_title || activeProject.title || "");
            setNarrativeSlug(activeProject.narrative_slug || activeProject.slug || "");
            setNarrativeHeroSubtitle(activeProject.narrative_hero_subtitle || legacyHeroSub);
            setNarrativeFeaturedImageUrl(activeProject.narrative_featured_image_url || "");
            setNarrativeShortSummary(activeProject.narrative_short_summary || activeProject.summary || "");
            setNarrativeMetaTitle(activeProject.narrative_meta_title || activeProject.meta_title || "");
            setNarrativeMetaDescription(activeProject.narrative_meta_description || activeProject.meta_description || "");
            setNarrativeKeywords(activeProject.narrative_keywords || activeProject.keywords || "");
            setNarrativeSchemaJsonld(activeProject.narrative_schema_jsonld || "");
            setNarrativeStatus(activeProject.narrative_status || "draft");
            setNarrativeEditorsPick(activeProject.narrative_editors_pick || 0);
            setNarrativeRelatedKnowledgeArticle(activeProject.narrative_related_knowledge_article || "");
            setNarrativeJourneyStage(activeProject.narrative_journey_stage || activeProject.journey_stage || "");

            // Knowledge fields start empty unless explicit knowledge_* values exist
            setKnowledgeTitle(activeProject.knowledge_title || "");
            setKnowledgeSlug(activeProject.knowledge_slug || "");
            setKnowledgeHeroSubtitle(activeProject.knowledge_hero_subtitle || "");
            setKnowledgeFeaturedImageUrl(activeProject.knowledge_featured_image_url || "");
            setKnowledgeShortSummary(activeProject.knowledge_short_summary || "");
            setKnowledgeMetaTitle(activeProject.knowledge_meta_title || "");
            setKnowledgeMetaDescription(activeProject.knowledge_meta_description || "");
            setKnowledgeKeywords(activeProject.knowledge_keywords || "");
            setKnowledgeSchemaJsonld(activeProject.knowledge_schema_jsonld || "");
            setKnowledgeStatus(activeProject.knowledge_status || "draft");
            setKnowledgeEditorsPick(activeProject.knowledge_editors_pick || 0);
            setKnowledgeRelatedNarrativeArticle(activeProject.knowledge_related_narrative_article || "");
            setKnowledgePrimaryKeyword(activeProject.knowledge_primary_keyword || "");
            setKnowledgeSecondaryKeywords(activeProject.knowledge_secondary_keywords || "");
            setKnowledgeCategory(activeProject.knowledge_category || "");

            setGroupUtm("");
            setPageUtm("");
            setPersonalUtm("");
            setReviewResult(null);
            setIsExpanded(false);
            setSeoMode("narrative");
        }
    }, [activeProject]);

    // Fetch Blocks for body
    useEffect(() => {
        const fetchBlocks = async () => {
            if (!activeProject) return;
            setLoading(true);
            try {
                const res = await fetch(`/api/content/writing-lab/projects/${activeProject.id}/blocks`);
                if (res.ok) {
                    const data = await res.json();
                    if (Array.isArray(data) && data.length > 0) {
                        setLocalBlocks(data);
                        
                        let initialNarrative = activeProject.narrative_body || "";
                        let initialKnowledge = activeProject.knowledge_body || "";

                        // Backward compatibility fallbacks
                        if (!initialNarrative) {
                            initialNarrative = data[0]?.content_md || "";
                        }
                        if (!initialKnowledge) {
                            const knowledgeBlock = data.find((b: any) => b.label === "Knowledge Article");
                            if (knowledgeBlock) {
                                initialKnowledge = knowledgeBlock.content_md || "";
                            } else if (data.length > 1) {
                                initialKnowledge = data[1]?.content_md || "";
                            }
                        }

                        setNarrativeBody(initialNarrative);
                        setKnowledgeBody(initialKnowledge);
                    } else {
                        setNarrativeBody("");
                        setKnowledgeBody("");
                        setLocalBlocks([]);
                    }
                }
            } catch (error) {
                console.error("Failed to fetch blocks", error);
            } finally {
                setLoading(false);
            }
        };

        fetchBlocks();
    }, [activeProject]);

    const handleCreateProject = async () => {
        if (!resolvedEpisodeId || !activeEpisode) return;
        setSaving(true);
        try {
            const res = await fetch("/api/content/writing-lab/projects", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    title: activeEpisode.title,
                    episode_id: resolvedEpisodeId,
                    story_set_id: activeEpisode.story_set_id,
                    writing_mode: "journey_chapter",
                    status: "draft"
                })
            });
            if (res.ok) {
                const data = await res.json();
                // Initialize blocks
                await fetch(`/api/content/writing-lab/projects/${data.id}/blocks`, {
                    method: "POST"
                });
                onRefresh();
            }
        } catch (error) {
            console.error("Failed to create project", error);
        } finally {
            setSaving(false);
        }
    };

    const handleSave = async () => {
        if (!activeProject) return;
        setSaving(true);
        try {
            const extraNotes = JSON.stringify({
                hero_subtitle: heroSubtitle,
                published_url: publishedUrl,
                campaign_name: campaignName
            });

            // 1. Save metadata
            const metadataRes = await fetch(`/api/content/writing-lab/projects/${activeProject.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    title: workingTitle,
                    slug: slug,
                    summary: shortSummary,
                    meta_title: metaTitle,
                    meta_description: metaDescription,
                    keywords: keywords,
                    group_post_markdown: facebookGroupPost,
                    page_post_markdown: facebookPagePost,
                    personal_post_markdown: personalPost,
                    social_caption: shortCaption,
                    hashtags: hashtags,
                    notes: extraNotes,
                    status: activeProject.status,
                    narrative_body: narrativeBody,
                    knowledge_body: knowledgeBody,

                    // Narrative SEO
                    narrative_title: narrativeTitle,
                    narrative_slug: narrativeSlug,
                    narrative_hero_subtitle: narrativeHeroSubtitle,
                    narrative_featured_image_url: narrativeFeaturedImageUrl,
                    narrative_short_summary: narrativeShortSummary,
                    narrative_meta_title: narrativeMetaTitle,
                    narrative_meta_description: narrativeMetaDescription,
                    narrative_keywords: narrativeKeywords,
                    narrative_schema_jsonld: narrativeSchemaJsonld,
                    narrative_status: narrativeStatus,
                    narrative_editors_pick: narrativeEditorsPick,
                    narrative_related_knowledge_article: narrativeRelatedKnowledgeArticle,
                    narrative_journey_stage: narrativeJourneyStage,

                    // Knowledge SEO
                    knowledge_title: knowledgeTitle,
                    knowledge_slug: knowledgeSlug,
                    knowledge_hero_subtitle: knowledgeHeroSubtitle,
                    knowledge_featured_image_url: knowledgeFeaturedImageUrl,
                    knowledge_short_summary: knowledgeShortSummary,
                    knowledge_meta_title: knowledgeMetaTitle,
                    knowledge_meta_description: knowledgeMetaDescription,
                    knowledge_keywords: knowledgeKeywords,
                    knowledge_schema_jsonld: knowledgeSchemaJsonld,
                    knowledge_status: knowledgeStatus,
                    knowledge_editors_pick: knowledgeEditorsPick,
                    knowledge_related_narrative_article: knowledgeRelatedNarrativeArticle,
                    knowledge_primary_keyword: knowledgePrimaryKeyword,
                    knowledge_secondary_keywords: knowledgeSecondaryKeywords,
                    knowledge_category: knowledgeCategory
                })
            });

            // 2. Save blocks
            let blocksToSave = [...localBlocks];
            if (blocksToSave.length === 0) {
                const initRes = await fetch(`/api/content/writing-lab/projects/${activeProject.id}/blocks`, {
                    method: "POST"
                });
                if (initRes.ok) {
                    blocksToSave = await initRes.json();
                }
            }

            if (blocksToSave.length > 0) {
                const updatedBlocks = blocksToSave.map((b, idx) => {
                    if (idx === 0) {
                        return { ...b, content_md: narrativeBody };
                    } else if (idx === 1) {
                        return { ...b, content_md: knowledgeBody };
                    }
                    return b;
                });

                await fetch(`/api/content/writing-lab/projects/${activeProject.id}/blocks`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ blocks: updatedBlocks })
                });
            }

            if (metadataRes.ok) {
                setLastSaved(new Date());
                onRefresh();
            }
        } catch (error) {
            console.error("Failed to save project content", error);
        } finally {
            setSaving(false);
        }
    };

    // Helper for formatting Markdown utilities inside Article Body
    const applyMarkdown = (
        type: 'bold' | 'italic' | 'bullet' | 'number' | 'quote' | 'divider' | 'n_image' | 'source_note' | 'companion_links' | 'k_image' | 'references' | 'schema_notes',
        target: 'narrative' | 'knowledge'
    ) => {
        const id = target === 'narrative' ? "narrative-body-textarea" : "knowledge-body-textarea";
        const textarea = document.getElementById(id) as HTMLTextAreaElement;
        if (!textarea) return;

        textarea.focus();
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const text = textarea.value;
        const selection = text.substring(start, end);

        let replacement = "";

        switch (type) {
            case 'bold':
                replacement = `**${selection || "text"}**`;
                break;
            case 'italic':
                replacement = `*${selection || "text"}*`;
                break;
            case 'bullet':
                replacement = selection ? selection.split('\n').map(l => l.startsWith('- ') ? l : `- ${l}`).join('\n') : `- `;
                break;
            case 'number':
                replacement = selection ? selection.split('\n').map((l, i) => l.match(/^\d+\./) ? l : `${i + 1}. ${l}`).join('\n') : `1. `;
                break;
            case 'quote':
                replacement = selection ? selection.split('\n').map(l => l.startsWith('> ') ? l : `> ${l}`).join('\n') : `> `;
                break;
            case 'divider':
                replacement = selection ? `\n---\n${selection}` : `\n---\n`;
                break;
            case 'n_image': {
                const nMatches = text.match(/IMAGE_PLACEHOLDER: N0(\d)/g);
                const nextN = nMatches ? Math.min(4, nMatches.length + 1) : 1;
                replacement = `\n<!-- IMAGE_PLACEHOLDER: N0${nextN} [รายละเอียดภาพ] -->\n`;
                break;
            }
            case 'source_note':
                replacement = `\n> **บันทึกที่มา (Source Note):** [ระบุแหล่งที่มาและข้อมูลอ้างอิงตรงนี้]\n`;
                break;
            case 'companion_links':
                replacement = `\n*อ่านความรู้ประกอบ:* [ชื่อบทความ](https://greenfineness.com/library/slug)\n`;
                break;
            case 'k_image': {
                const kMatches = text.match(/IMAGE_PLACEHOLDER: K0(\d)/g);
                const nextK = kMatches ? Math.min(4, kMatches.length + 1) : 1;
                replacement = `\n<!-- IMAGE_PLACEHOLDER: K0${nextK} [รายละเอียดภาพ] -->\n`;
                break;
            }
            case 'references':
                replacement = `\n### เอกสารอ้างอิง (References)\n1. [ระบุแหล่งข้อมูลอ้างอิงหลักตรงนี้]\n`;
                break;
            case 'schema_notes':
                replacement = `\n### บันทึกโครงสร้างข้อมูล (Schema Notes)\n- [ระบุหมายเหตุโครงสร้างข้อมูล/ตารางประกอบตรงนี้]\n`;
                break;
        }

        const before = text.substring(0, start);
        const after = text.substring(end);
        
        if (target === 'narrative') {
            setNarrativeBody(before + replacement + after);
        } else {
            setKnowledgeBody(before + replacement + after);
        }

        setTimeout(() => {
            textarea.setSelectionRange(start + replacement.length, start + replacement.length);
        }, 0);
    };

    // Deterministic Generator from Article Body
    const handleGenerateSEO = () => {
        const isNarrative = seoMode === "narrative";
        const sourceText = isNarrative ? narrativeBody : knowledgeBody;
        
        if (!sourceText || sourceText.trim().length < 5) {
            alert(isNarrative 
                ? "เนื้อหา Narrative Article ยังว่างอยู่ ไม่สามารถใช้คำนวณฟิลด์อัตโนมัติได้" 
                : "เนื้อหา Knowledge Article ยังว่างอยู่ ไม่สามารถใช้คำนวณฟิลด์อัตโนมัติได้"
            );
            return;
        }

        // 1. Slug generator (lowercase Thai/English and hyphens)
        const cleanSlug = workingTitle
            .toLowerCase()
            .replace(/[^a-z0-9ก-๙\s-]/g, "")
            .trim()
            .replace(/\s+/g, "-");

        // 2. Meta Title: uses working title directly
        const metaTitleVal = workingTitle;

        // 3. Hero Subtitle: first sentence of body
        const firstSentence = sourceText.split(/[.!?\n]/).find(s => s.trim().length > 5) || "";
        const heroSubVal = firstSentence.trim();

        // 4. Short Summary: first 200 chars
        const summaryText = sourceText.replace(/[#*`>_-]/g, "").slice(0, 200);
        const shortSumVal = summaryText.trim() + (sourceText.length > 200 ? "..." : "");

        // 5. Meta Description: first 150 chars
        const descText = sourceText.replace(/[#*`>_-]/g, "").slice(0, 150);
        const metaDescVal = descText.trim() + (sourceText.length > 150 ? "..." : "");
        
        // 6. Keywords: check common content pillars
        const commonWords = ["ดิน", "ปุ๋ย", "พืช", "อินทรียวัตถุ", "จุลินทรีย์", "ธาตุอาหาร", "ผลผลิต", "เกษตร"];
        const matchedKeywords = commonWords.filter(w => sourceText.includes(w));
        const keywordsVal = matchedKeywords.join(", ") || "Green Fineness, เกษตรกรรม";

        if (isNarrative) {
            setNarrativeTitle(workingTitle);
            setNarrativeSlug(cleanSlug);
            setNarrativeMetaTitle(metaTitleVal);
            setNarrativeHeroSubtitle(heroSubVal);
            setNarrativeShortSummary(shortSumVal);
            setNarrativeMetaDescription(metaDescVal);
            setNarrativeKeywords(keywordsVal);
        } else {
            setKnowledgeTitle(workingTitle);
            setKnowledgeSlug(cleanSlug);
            setKnowledgeMetaTitle(metaTitleVal);
            setKnowledgeHeroSubtitle(heroSubVal);
            setKnowledgeShortSummary(shortSumVal);
            setKnowledgeMetaDescription(metaDescVal);
            setKnowledgeKeywords(keywordsVal);
        }
    };

    // Generate UTM parameters
    const handleGenerateUTM = () => {
        if (!publishedUrl || !campaignName) return;
        const group = `${publishedUrl}?utm_source=facebook&utm_medium=group&utm_campaign=${campaignName}&utm_content=group_post`;
        const page = `${publishedUrl}?utm_source=facebook&utm_medium=page&utm_campaign=${campaignName}&utm_content=page_post`;
        const personal = `${publishedUrl}?utm_source=facebook&utm_medium=personal&utm_campaign=${campaignName}&utm_content=personal_post`;
        setGroupUtm(group);
        setPageUtm(page);
        setPersonalUtm(personal);
    };

    // Local Review Engine matching standard rules
    const handleRunArborReview = () => {
        const combinedText = `${narrativeBody}\n\n${knowledgeBody}`.trim();
        if (!combinedText) return;
        setIsReviewing(true);
        setTimeout(() => {
            const hasPlaceholder = (text: string) => {
                const placeholders = ["HOOK TEST", "TEST 123", "TODO", "placeholder", "Lorem", "[ใส่ลิงก์บทความ]", "[ใส่", "xxx"];
                const lower = text.toLowerCase();
                return placeholders.some(p => lower.includes(p.toLowerCase()));
            };

            const getFirstLines = (text: string, count: number) => {
                return text.split('\n').map(l => l.trim()).filter(l => l.length > 0).slice(0, count).join(' ');
            };

            const lines = combinedText.split('\n');
            const h2Lines = lines.filter(l => l.trim().startsWith('## '));
            const hasHeadings = h2Lines.length > 0;
            const opening = getFirstLines(combinedText, 4);

            const weakOpeningPatterns = ['ในบทความนี้', 'บทความนี้จะ', 'เราจะมาพูดถึง', 'วันนี้เราจะ', 'ในเนื้อหาสี้'];
            const hasWeakOpening = weakOpeningPatterns.some(p => opening.includes(p));

            const riskyPhrases = ['100%', 'ทุกกรณี', 'รักษาได้', 'รักษาโรค', 'แน่นอน 100', 'ป้องกันได้ 100', 'ไม่มีผลข้างเคียง', 'เพิ่มผลผลิตได้ถึง', 'ลดโรคได้ถึง'];
            const foundRiskyClaims = riskyPhrases.filter(p => combinedText.includes(p));

            const FORBIDDEN_PHRASES = [
                'พูดง่ายๆ คือ', 'มันคือ', 'มันทำให้', 'มันไม่ได้', 'ไม่ได้แปลว่า',
                'ให้เราเห็นว่า', 'นั่นคือ', 'มองให้ลึกลงไป', 'ง่ายๆ คือ',
                'จะเห็นว่า', 'พูดถึง', 'นั่นก็คือ',
            ];
            const flaggedPhrases = FORBIDDEN_PHRASES.filter(p => combinedText.includes(p));

            const isPlc = hasPlaceholder(combinedText);

            const structured = {
                reviewedContentType: "web_article",
                editorialSummary: hasHeadings && !hasWeakOpening && flaggedPhrases.length === 0
                    ? "บทความมีโครงสร้างดีและน้ำเสียงชัดเจน พร้อมสำหรับการตรวจสอบเนื้อหาเชิงลึก"
                    : "บทความมีความลึก แต่ยังมีประเด็นที่ต้องปรับก่อน Review ขั้นถัดไป",
                contentStrength: [
                    "ข้อมูลแน่นและลึก",
                    "มีประโยชน์ต่อผู้อ่านที่ต้องการความรู้",
                    ...(hasHeadings && h2Lines.length >= 2 ? ["โครงสร้าง H2/H3 ครบถ้วนแล้ว"] : []),
                    ...(!hasWeakOpening ? ["ประโยคเปิดชัดเจน ไม่กว้างเกินไป"] : []),
                    ...(flaggedPhrases.length === 0 ? ["น้ำเสียงตรงกับ Green Fineness Voice"] : []),
                ],
                revisionPoints: [
                    ...(!hasHeadings ? ["ยังไม่มี H2/H3 Heading — ควรเพิ่มโครงสร้างบทความ"] : []),
                    ...(hasWeakOpening ? ["ประโยคเปิดยังกว้างเกินไป ควรเริ่มด้วย Hook หรือประโยคชี้จุดประสงค์"] : []),
                    ...(flaggedPhrases.length > 0 ? [`พบภาษาที่ไม่ตรงกับ Green Fineness Voice: ${flaggedPhrases.slice(0, 3).join(', ')}`] : []),
                    ...(foundRiskyClaims.length > 0 ? [`พบคำที่มีความเสี่ยงสูง: "${foundRiskyClaims.join('", "')}"`] : []),
                ],
                claimSafetyNotes: foundRiskyClaims.length > 0
                    ? [`⚠️ พบคำที่มีความเสี่ยง: "${foundRiskyClaims.join('", "')}" — ควรปรับให้อ่อนลง`, "ตรวจสอบแหล่งอ้างอิงของข้อมูล"]
                    : ["💡 Reminder: ตรวจสอบแหล่งอ้างอิงของข้อมูลเชิงวิชาการก่อน Publish"],
                toneNotes: ["Educational", "Authoritative", "Safe"],
                recommendedNextEdit: "",
                suggestedRevision: "",
                claimSafetySuggestions: [] as string[],
                voiceToneSuggestions: [] as string[],
                nextEditChecklist: [] as string[]
            };

            if (structured.revisionPoints.length === 0) {
                structured.revisionPoints = ["ไม่พบปัญหาหลักในรอบนี้"];
                structured.recommendedNextEdit = "✅ ไม่พบปัญหาหลัก — พร้อมสำหรับ Manual Review";
            } else if (!hasHeadings) {
                structured.recommendedNextEdit = "เพิ่ม H2/H3 Heading ก่อน แล้ว Review ใหม่อีกครั้ง";
            } else if (flaggedPhrases.length > 0) {
                structured.recommendedNextEdit = `แทนที่ภาษา Casual (${flaggedPhrases.slice(0, 2).join(', ')}) แล้ว Review ใหม่`;
            } else {
                structured.recommendedNextEdit = "ตรวจสอบแหล่งอ้างอิงและความถูกต้องของข้อมูลทางวิชาการ";
            }

            if (foundRiskyClaims.length > 0) {
                structured.claimSafetySuggestions = foundRiskyClaims.map(claim => {
                    const safer: Record<string, string> = {
                        '100%': `แทน "100%" ด้วย "ในสภาวะที่เหมาะสม" หรือ "ส่วนใหญ่"`,
                        'รักษาได้': `แทน "รักษาได้" ด้วย "ช่วยลดความรุนแรงของ..." หรือ "ช่วยสนับสนุนการฟื้นตัว"`,
                        'ป้องกันได้ 100': `แทน "ป้องกันได้ 100" ด้วย "ลดความเสี่ยงได้อย่างมีนัยสำคัญ"`,
                    };
                    return safer[claim] || `แทน "${claim}" ด้วยภาษาที่อ่อนลงและมีเงื่อนไขมากขึ้น`;
                });
            } else {
                structured.claimSafetySuggestions = [
                    `ตรวจสอบว่ามีประโยคที่ระบุตัวเลขผลผลิตหรืออัตราความสำเร็จโดยไม่มีแหล่งอ้างอิงหรือไม่`,
                    `ภาษาที่ปลอดภัยกว่า: ใช้ "มีแนวโน้ม", "ในสภาวะที่เหมาะสม", "ขึ้นอยู่กับ..." แทนการระบุผลแน่นอน`,
                ];
            }

            if (flaggedPhrases.length > 0) {
                structured.voiceToneSuggestions = flaggedPhrases.map(phrase => {
                    const fixes: Record<string, string> = {
                        'พูดง่ายๆ คือ': `"พูดง่ายๆ คือ" → ลบออก แล้วพูดตรงๆ เลย`,
                        'มันคือ': `"มันคือ" → แทนด้วยชื่อสิ่งนั้นโดยตรง`,
                        'มันทำให้': `"มันทำให้" → แทนด้วยประธานที่ชัดเจน เช่น "ไนโตรเจนทำให้..."`,
                        'นั่นคือ': `"นั่นคือ" → ลบออก แล้วอธิบายต่อเนื่องทันที`,
                        'ไม่ได้แปลว่า': `"ไม่ได้แปลว่า" → ปรับเป็น "แต่ไม่หมายความว่า..."`,
                        'ให้เราเห็นว่า': `"ให้เราเห็นว่า" → แทนด้วย "ผลคือ..." หรือ "ทำให้เห็นว่า..."`,
                        'มองให้ลึกลงไป': `"มองให้ลึกลงไป" → แทนด้วยประโยคที่บอกว่าลึกอย่างไร`,
                    };
                    return fixes[phrase] || `"${phrase}" → ปรับให้เป็นภาษาที่แม่นยำและเป็น Documentary Voice มากขึ้น`;
                });
            }

            structured.nextEditChecklist = [
                ...(!hasHeadings ? ["เพิ่ม H2 และ H3 Headings ให้ครบก่อน"] : []),
                ...(hasWeakOpening ? ["ปรับประโยคเปิดให้เป็น Hook ที่ดึงดูดความสนใจ"] : []),
                ...(flaggedPhrases.length > 0 ? [`แทนที่ภาษา Casual: ${flaggedPhrases.slice(0, 2).join(', ')}`] : []),
                ...(foundRiskyClaims.length > 0 ? ["ตรวจสอบและปรับ Claim ที่มีความเสี่ยงทางวิชาการ"] : []),
                "ตรวจสอบแหล่งอ้างอิงข้อมูลสำคัญ",
                "ตรวจความสม่ำเสมอของ Narrative Style ตลอดบทความ",
            ].slice(0, 5);

            if (isPlc) {
                structured.editorialSummary = `🚨 พบข้อความทดสอบหรือ Placeholder ในเนื้อหา\n${structured.editorialSummary}`;
                structured.revisionPoints.unshift("ลบข้อความทดสอบ (TODO, Lorem, xxx, หรือวงเล็บต่างๆ) ก่อนนำไปใช้งานจริง");
                structured.recommendedNextEdit = "ลบข้อความทดสอบและ Placeholder ออกก่อน";
                structured.suggestedRevision = "กรุณาลบข้อความทดสอบหรือ Placeholder (เช่น [ใส่ลิงก์], TODO, xxx, HOOK TEST) ออกจากเนื้อหาก่อนนำไปใช้งานจริง";
            }

            setReviewResult({
                summary: structured.editorialSummary,
                next_step: structured.recommendedNextEdit,
                strengths: structured.contentStrength,
                revisions: structured.revisionPoints,
                risks: structured.claimSafetyNotes,
                tone: structured.toneNotes,
                claimSuggestions: structured.claimSafetySuggestions,
                voiceSuggestions: structured.voiceToneSuggestions
            });
            setIsReviewing(false);
        }, 800);
    };

    const handleGenerateWorkOSPackage = () => {
        if (!activeProject) return;

        const activeBody = (subTab === "knowledge") ? knowledgeBody : narrativeBody;
        const currentSeoTitle = (seoMode === "knowledge") ? knowledgeTitle : narrativeTitle;
        const currentSeoSlug = (seoMode === "knowledge") ? knowledgeSlug : narrativeSlug;
        const currentMetaTitle = (seoMode === "knowledge") ? knowledgeMetaTitle : narrativeMetaTitle;
        const currentMetaDesc = (seoMode === "knowledge") ? knowledgeMetaDescription : narrativeMetaDescription;
        const currentKeywords = (seoMode === "knowledge") ? knowledgeKeywords : narrativeKeywords;

        // Combined content
        let combinedContent = `# ${workingTitle}\n`;
        combinedContent += `Episode Code: ${resolvedEpisodeId || "N/A"}\n`;
        combinedContent += `Writing Mode: ${activeProject.writing_mode || "N/A"}\n\n`;
        combinedContent += `${activeBody}\n\n`;
        combinedContent += `---\n## SEO & Metadata\n`;
        combinedContent += `- **Slug**: ${currentSeoSlug || "N/A"}\n`;
        combinedContent += `- **Meta Title**: ${currentMetaTitle || "N/A"}\n`;
        combinedContent += `- **Meta Description**: ${currentMetaDesc || "N/A"}\n`;
        combinedContent += `- **Keywords**: ${currentKeywords || "N/A"}\n\n`;
        combinedContent += `## Social Drafts\n`;
        combinedContent += `### Facebook Group\n${facebookGroupPost || "N/A"}\n\n`;
        combinedContent += `### Facebook Page\n${facebookPagePost || "N/A"}\n\n`;
        combinedContent += `### Personal Profile\n${personalPost || "N/A"}\n\n`;
        combinedContent += `### Caption & Hashtags\n${shortCaption || "N/A"}\n${hashtags || ""}\n\n`;
        combinedContent += `## UTM / Publish\n`;
        combinedContent += `- **Published URL**: ${publishedUrl || "N/A"}\n`;
        combinedContent += `- **Campaign Name**: ${campaignName || "N/A"}\n`;
        combinedContent += `- **Group UTM**: ${groupUtm || "N/A"}\n`;
        combinedContent += `- **Page UTM**: ${pageUtm || "N/A"}\n`;
        combinedContent += `- **Personal UTM**: ${personalUtm || "N/A"}\n\n`;
        if (reviewResult) {
            combinedContent += `## Arbor Review Notes\n`;
            combinedContent += `- **Summary**: ${reviewResult.summary || "N/A"}\n`;
            combinedContent += `- **Next Step**: ${reviewResult.next_step || "N/A"}\n`;
        }

        const payload = {
            schemaVersion: "workos-arbor-import-v0.1",
            source: "Arbor Writing Lab Handoff",
            importBatchTitle: `GF-ARTICLE — ${workingTitle}`,
            items: [
                {
                    type: "project",
                    title: "Green Fineness Content",
                    status: "planned"
                },
                {
                    type: "article_note",
                    targetProject: "Green Fineness Content",
                    title: workingTitle,
                    status: "draft",
                    content: combinedContent,
                    nextActions: [
                        `Claim Review: ${workingTitle}`,
                        `Image Brief: ${workingTitle}`,
                        `SEO Fields: ${workingTitle}`,
                        `Facebook Group Post: ${workingTitle}`,
                        `Facebook Page Post: ${workingTitle}`,
                        `Personal Post: ${workingTitle}`,
                        `Analytics Tracking: ${workingTitle}`
                    ],
                    metadata: {
                        topic_id: activeProject.topic_id || "",
                        author: "Arbor Content Bot",
                        episodeCode: resolvedEpisodeId || "",
                        journeyStage: activeProject.journey_stage || "",
                        seo: {
                            title: currentSeoTitle || "",
                            slug: currentSeoSlug || "",
                            metaTitle: currentMetaTitle || "",
                            metaDescription: currentMetaDesc || "",
                            keywords: currentKeywords || ""
                        },
                        socialDrafts: {
                            facebookGroup: facebookGroupPost || "",
                            facebookPage: facebookPagePost || "",
                            personal: personalPost || "",
                            caption: shortCaption || "",
                            hashtags: hashtags || ""
                        },
                        publish: {
                            url: publishedUrl || "",
                            campaignName: campaignName || ""
                        },
                        arborReview: reviewResult ? {
                            summary: reviewResult.summary || "",
                            next_step: reviewResult.next_step || "",
                            strengths: reviewResult.strengths || [],
                            revisions: reviewResult.revisions || [],
                            risks: reviewResult.risks || []
                        } : null
                    }
                },
                {
                    type: "task",
                    targetProject: "Green Fineness Content",
                    title: `GF Article — Claim Review: ${workingTitle}`,
                    status: "planned",
                    workspace: "content"
                },
                {
                    type: "task",
                    targetProject: "Green Fineness Content",
                    title: `GF Article — Image Brief: ${workingTitle}`,
                    status: "planned",
                    workspace: "content"
                },
                {
                    type: "task",
                    targetProject: "Green Fineness Content",
                    title: `GF Article — SEO Fields: ${workingTitle}`,
                    status: "planned",
                    workspace: "content"
                },
                {
                    type: "task",
                    targetProject: "Green Fineness Content",
                    title: `GF Article — Facebook Group Post: ${workingTitle}`,
                    status: "planned",
                    workspace: "content"
                },
                {
                    type: "task",
                    targetProject: "Green Fineness Content",
                    title: `GF Article — Facebook Page Post: ${workingTitle}`,
                    status: "planned",
                    workspace: "content"
                },
                {
                    type: "task",
                    targetProject: "Green Fineness Content",
                    title: `GF Article — Personal Post: ${workingTitle}`,
                    status: "planned",
                    workspace: "content"
                },
                {
                    type: "task",
                    targetProject: "Green Fineness Content",
                    title: `GF Article — Analytics Tracking: ${workingTitle}`,
                    status: "planned",
                    workspace: "content"
                }
            ]
        };

        // Run validation check in-browser
        const projectLookups = projects.map(p => ({ name: p.title, slug: p.slug || "" }));
        const result = validatePayload(payload, projectLookups);

        setIsPackageValid(result.valid);
        setValidationErrors(result.errors);
        setValidationWarnings(result.warnings);

        setGeneratedPackageText(JSON.stringify(payload, null, 2));
        setIsWorkOSModalOpen(true);
    };

    const handleCopyPackage = () => {
        navigator.clipboard.writeText(generatedPackageText);
        setCopyPackageSuccess(true);
        setTimeout(() => setCopyPackageSuccess(false), 2000);
    };

    const handleSendToInbox = () => {
        try {
            sessionStorage.setItem("workos.arborInbox.pendingPayload", generatedPackageText);
            window.location.href = "/arbor-inbox";
        } catch (err) {
            console.error("Failed to store handoff payload in sessionStorage", err);
            alert("ไม่สามารถส่งข้อมูลได้เนื่องจากระบบจัดเก็บข้อมูลเบราว์เซอร์ไม่ทำงาน");
        }
    };

    const handleCopyToClipboard = (text: string, label: string) => {
        navigator.clipboard.writeText(text);
        setCopyStatus(label);
        setTimeout(() => setCopyStatus(null), 2000);
    };

    // Flatten all episodes for selection drop down
    const allEpisodes = storySets.flatMap(set => 
        (set.episodes || []).map((ep: any) => ({
            id: ep.id,
            title: ep.title,
            story_set_title: set.title
        }))
    );

    return (
        <div className="space-y-6">
            {/* Header: Episode selector & metadata */}
            <div className="bg-theme-card border border-theme-border rounded-[28px] p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-3">
                        <span className="px-2.5 py-1 bg-neutral-100 dark:bg-slate-800 text-neutral-600 dark:text-theme-secondary rounded-lg text-[10px] font-black uppercase tracking-widest border border-theme-border/40 shrink-0">
                            {resolvedEpisodeId || "No Episode"}
                        </span>
                        
                        {activeProject ? (
                            <input 
                                type="text"
                                value={workingTitle}
                                onChange={(e) => setWorkingTitle(e.target.value)}
                                className="text-xl font-black text-theme-primary bg-transparent border-b border-transparent hover:border-theme-border/50 focus:border-theme-primary focus:outline-none py-0.5 outline-none w-full max-w-lg transition-all"
                                placeholder="Edit working title..."
                            />
                        ) : activeEpisode ? (
                            <h2 className="text-xl font-black text-theme-primary">{activeEpisode.title}</h2>
                        ) : (
                            <h2 className="text-xl font-black text-theme-primary italic">Select an episode to edit</h2>
                        )}

                        {activeProject && (
                            <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400 text-[10px] font-bold uppercase shrink-0">
                                {activeProject.status}
                            </span>
                        )}
                    </div>
                    {activeEpisode && (
                        <p className="text-xs text-theme-muted font-bold">
                            Original: {activeEpisode.title} · Story Set: {activeEpisode.story_set_title}
                        </p>
                    )}
                </div>

                <div className="flex items-center gap-3">
                    {/* Select episode dropdown */}
                    <div className="relative">
                        <select 
                            value={resolvedEpisodeId || ""}
                            onChange={(e) => onSelectEpisode(e.target.value)}
                            className="bg-theme-input border border-theme-border rounded-xl px-4 py-2.5 text-xs font-bold text-theme-primary appearance-none pr-8 outline-none focus:ring-2 focus:ring-theme-accent/10"
                        >
                            <option value="">Select Episode...</option>
                            {allEpisodes.map(ep => (
                                <option key={ep.id} value={ep.id}>{ep.title}</option>
                            ))}
                        </select>
                        <ChevronDown className="w-3.5 h-3.5 text-theme-muted absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>

                    {activeProject ? (
                        <button 
                            onClick={handleSave}
                            disabled={saving}
                            className="flex items-center gap-2 px-6 py-2.5 bg-black dark:bg-slate-800 text-white dark:text-theme-primary rounded-xl text-xs font-black hover:bg-neutral-800 dark:hover:bg-slate-700 transition-all shadow-md disabled:opacity-50"
                        >
                            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            {saving ? 'Saving...' : 'Save Content'}
                        </button>
                    ) : resolvedEpisodeId ? (
                        <button 
                            onClick={handleCreateProject}
                            disabled={saving}
                            className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 text-white rounded-xl text-xs font-black hover:bg-emerald-700 transition-all shadow-md disabled:opacity-50"
                        >
                            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <PenTool className="w-4 h-4" />}
                            Start Project / เริ่มเขียน
                        </button>
                    ) : null}
                </div>
            </div>

            {/* Main content pane */}
            {!resolvedEpisodeId ? (
                <div className="py-24 text-center bg-theme-card border border-theme-border rounded-[32px] space-y-4">
                    <div className="w-16 h-16 bg-theme-panel rounded-2xl flex items-center justify-center mx-auto">
                        <PenTool className="w-8 h-8 text-theme-muted" />
                    </div>
                    <div>
                        <h3 className="text-base font-black text-theme-primary">ยังไม่ได้เลือกตอน</h3>
                        <p className="text-xs text-theme-muted mt-1 font-bold">
                            กรุณาเลือกตอนจากปุ่มเมนูด้านขวา หรือกลับไปยังหน้า Story Map / Episode Backlog
                        </p>
                    </div>
                </div>
            ) : !activeProject && !loading ? (
                <div className="py-24 text-center bg-theme-card border border-theme-border rounded-[32px] space-y-4">
                    <div className="w-16 h-16 bg-theme-panel rounded-2xl flex items-center justify-center mx-auto">
                        <FileText className="w-8 h-8 text-theme-muted" />
                    </div>
                    <div>
                        <h3 className="text-base font-black text-theme-primary">ยังไม่มีโปรเจกต์เขียนร่างสำหรับตอนนี้</h3>
                        <p className="text-xs text-theme-muted mt-1 mb-4 font-bold">
                            ระบบจะบันทึกร่างของคุณเข้าสู่ Arbor Writing Lab โครงสร้างหลัก Green Fineness
                        </p>
                        <button 
                            onClick={handleCreateProject}
                            className="px-6 py-2.5 bg-emerald-600 text-white rounded-xl text-xs font-black hover:bg-emerald-700 transition-all shadow-md inline-flex items-center gap-2"
                        >
                            <PenTool className="w-4 h-4" />
                            เริ่มเขียนร่าง (Start Project)
                        </button>
                    </div>
                </div>
            ) : loading ? (
                <div className="py-24 text-center text-theme-muted">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
                    กำลังเตรียมโต๊ะทำงานของคุณ...
                </div>
            ) : (
                <div className="grid grid-cols-12 gap-8 items-start animate-fadeIn">
                    {/* Sub tabs navigation */}
                    {!(isExpanded && (subTab === "narrative" || subTab === "knowledge")) && (
                        <div className="col-span-12 md:col-span-3 space-y-2">
                        <div className="bg-theme-card border border-theme-border rounded-[24px] p-3 shadow-sm flex flex-col gap-1">
                            <button
                                onClick={() => setSubTab("narrative")}
                                className={`w-full text-left px-4 py-3 rounded-xl text-xs font-bold transition-all flex items-center justify-between ${
                                    subTab === "narrative" 
                                        ? "bg-black text-white dark:bg-slate-800 dark:text-theme-primary font-black" 
                                        : "text-theme-secondary hover:bg-theme-hover hover:text-theme-primary"
                                }`}
                            >
                                <span>Narrative Article</span>
                                <FileText className="w-3.5 h-3.5" />
                            </button>

                            <button
                                onClick={() => setSubTab("knowledge")}
                                className={`w-full text-left px-4 py-3 rounded-xl text-xs font-bold transition-all flex items-center justify-between ${
                                    subTab === "knowledge" 
                                        ? "bg-black text-white dark:bg-slate-800 dark:text-theme-primary font-black" 
                                        : "text-theme-secondary hover:bg-theme-hover hover:text-theme-primary"
                                }`}
                            >
                                <span>Knowledge Article</span>
                                <FileText className="w-3.5 h-3.5" />
                            </button>
                            
                            <button
                                onClick={() => setSubTab("social")}
                                className={`w-full text-left px-4 py-3 rounded-xl text-xs font-bold transition-all flex items-center justify-between ${
                                    subTab === "social" 
                                        ? "bg-black text-white dark:bg-slate-800 dark:text-theme-primary font-black" 
                                        : "text-theme-secondary hover:bg-theme-hover hover:text-theme-primary"
                                }`}
                            >
                                <span>Social Drafts</span>
                                <Share2 className="w-3.5 h-3.5" />
                            </button>
                            
                            <button
                                onClick={() => setSubTab("seo")}
                                className={`w-full text-left px-4 py-3 rounded-xl text-xs font-bold transition-all flex items-center justify-between ${
                                    subTab === "seo" 
                                        ? "bg-black text-white dark:bg-slate-800 dark:text-theme-primary font-black" 
                                        : "text-theme-secondary hover:bg-theme-hover hover:text-theme-primary"
                                }`}
                            >
                                <span>SEO & Website Fields</span>
                                <Globe className="w-3.5 h-3.5" />
                            </button>
                            
                            <button
                                onClick={() => setSubTab("utm")}
                                className={`w-full text-left px-4 py-3 rounded-xl text-xs font-bold transition-all flex items-center justify-between ${
                                    subTab === "utm" 
                                        ? "bg-black text-white dark:bg-slate-800 dark:text-theme-primary font-black" 
                                        : "text-theme-secondary hover:bg-theme-hover hover:text-theme-primary"
                                }`}
                            >
                                <span>UTM / Publish</span>
                                <ArrowRight className="w-3.5 h-3.5" />
                            </button>

                            <button
                                onClick={() => setSubTab("review")}
                                className={`w-full text-left px-4 py-3 rounded-xl text-xs font-bold transition-all flex items-center justify-between ${
                                    subTab === "review" 
                                        ? "bg-black text-white dark:bg-slate-800 dark:text-theme-primary font-black" 
                                        : "text-theme-secondary hover:bg-theme-hover hover:text-theme-primary"
                                }`}
                            >
                                <span>Arbor Review</span>
                                <Sparkles className="w-3.5 h-3.5" />
                            </button>
                        </div>

                        {lastSaved && (
                            <div className="px-4 py-2 text-[10px] text-theme-muted font-bold text-center">
                                บันทึกล่าสุด: {lastSaved.toLocaleTimeString('th-TH')}
                            </div>
                        )}

                        {activeProject && (
                            <div className="pt-3 border-t border-theme-border/60 px-1">
                                <button
                                    onClick={handleGenerateWorkOSPackage}
                                    className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 shadow-sm"
                                >
                                    <Sparkles className="w-3.5 h-3.5" />
                                    Generate WorkOS Package
                                </button>
                            </div>
                        )}
                        </div>
                    )}

                    {/* Tab panels (Editor fields) */}
                    <div className={`col-span-12 ${(isExpanded && (subTab === "narrative" || subTab === "knowledge")) ? "" : "md:col-span-9"} bg-theme-card border border-theme-border rounded-[32px] p-5 md:p-6 shadow-sm min-h-[500px] transition-all duration-300`}>
                        
                        {/* 1. Narrative Article Panel */}
                        {subTab === "narrative" && (
                            <div className="space-y-4 h-full flex flex-col">
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                                    <div>
                                        <h3 className="text-sm font-black text-theme-primary uppercase tracking-widest">Narrative Article</h3>
                                        <p className="text-[10px] font-bold text-theme-muted mt-0.5">Plant Journey / story-driven markdown body.</p>
                                    </div>
                                    {/* Formatting toolbar */}
                                    <div className="flex flex-wrap items-center gap-1.5 bg-theme-panel p-1 rounded-lg border border-theme-border/40">
                                        <button onClick={() => applyMarkdown('bold', 'narrative')} className="p-1.5 hover:bg-theme-hover text-theme-secondary rounded" title="Bold"><Bold size={13} /></button>
                                        <button onClick={() => applyMarkdown('italic', 'narrative')} className="p-1.5 hover:bg-theme-hover text-theme-secondary rounded" title="Italic"><Italic size={13} /></button>
                                        <button onClick={() => applyMarkdown('bullet', 'narrative')} className="p-1.5 hover:bg-theme-hover text-theme-secondary rounded" title="-"> - </button>
                                        <button onClick={() => applyMarkdown('number', 'narrative')} className="p-1.5 hover:bg-theme-hover text-theme-secondary rounded" title="Numbered List"><ListOrdered size={13} /></button>
                                        <button onClick={() => applyMarkdown('quote', 'narrative')} className="p-1.5 hover:bg-theme-hover text-theme-secondary rounded" title="Quote"><Quote size={13} /></button>
                                        <button onClick={() => applyMarkdown('divider', 'narrative')} className="p-1.5 hover:bg-theme-hover text-theme-secondary rounded" title="Divider"><Minus size={13} /></button>
                                        <div className="w-px h-4 bg-theme-border/60 mx-1" />
                                        <button onClick={() => applyMarkdown('n_image', 'narrative')} className="px-2 py-1 text-[9px] font-bold text-emerald-600 dark:text-emerald-400 hover:bg-theme-hover rounded border border-theme-border/30" title="Add N01-N04 placeholder">+ Image (N01-N04)</button>
                                        <button onClick={() => applyMarkdown('source_note', 'narrative')} className="px-2 py-1 text-[9px] font-bold text-emerald-600 dark:text-emerald-400 hover:bg-theme-hover rounded border border-theme-border/30" title="Add Source Note">+ Source Note</button>
                                        <button onClick={() => applyMarkdown('companion_links', 'narrative')} className="px-2 py-1 text-[9px] font-bold text-emerald-600 dark:text-emerald-400 hover:bg-theme-hover rounded border border-theme-border/30" title="Add Companion Link">+ Companion Link</button>
                                        <div className="w-px h-4 bg-theme-border/60 mx-1" />
                                        <button 
                                            type="button"
                                            onClick={() => setIsExpanded(!isExpanded)}
                                            className="px-2.5 py-1 text-[10px] font-black uppercase tracking-wider bg-black dark:bg-slate-800 text-white dark:text-theme-primary hover:bg-neutral-800 dark:hover:bg-slate-700 transition-all rounded-md flex items-center gap-1"
                                        >
                                            {isExpanded ? "Collapse" : "Expand"}
                                        </button>
                                    </div>
                                </div>
                                <textarea
                                    id="narrative-body-textarea"
                                    value={narrativeBody}
                                    onChange={(e) => setNarrativeBody(e.target.value)}
                                    placeholder="เขียนเนื้อหาตอนหลักในรูปแบบ Markdown ที่นี่..."
                                    className={`w-full ${isExpanded ? 'min-h-[75vh]' : 'min-h-[65vh]'} flex-1 bg-theme-input border border-theme-border rounded-2xl p-6 text-sm font-medium outline-none focus:border-theme-border/80 transition-all resize-y text-theme-primary leading-relaxed custom-scrollbar font-mono`}
                                />
                            </div>
                        )}

                        {/* 1.2 Knowledge Article Panel */}
                        {subTab === "knowledge" && (
                            <div className="space-y-4 h-full flex flex-col">
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                                    <div>
                                        <h3 className="text-sm font-black text-theme-primary uppercase tracking-widest">Knowledge Article</h3>
                                        <p className="text-[10px] font-bold text-theme-muted mt-0.5">Library / Knowledge Companion article body.</p>
                                    </div>
                                    {/* Formatting toolbar */}
                                    <div className="flex flex-wrap items-center gap-1.5 bg-theme-panel p-1 rounded-lg border border-theme-border/40">
                                        <button onClick={() => applyMarkdown('bold', 'knowledge')} className="p-1.5 hover:bg-theme-hover text-theme-secondary rounded" title="Bold"><Bold size={13} /></button>
                                        <button onClick={() => applyMarkdown('italic', 'knowledge')} className="p-1.5 hover:bg-theme-hover text-theme-secondary rounded" title="Italic"><Italic size={13} /></button>
                                        <button onClick={() => applyMarkdown('bullet', 'knowledge')} className="p-1.5 hover:bg-theme-hover text-theme-secondary rounded" title="-"> - </button>
                                        <button onClick={() => applyMarkdown('number', 'knowledge')} className="p-1.5 hover:bg-theme-hover text-theme-secondary rounded" title="Numbered List"><ListOrdered size={13} /></button>
                                        <button onClick={() => applyMarkdown('quote', 'knowledge')} className="p-1.5 hover:bg-theme-hover text-theme-secondary rounded" title="Quote"><Quote size={13} /></button>
                                        <button onClick={() => applyMarkdown('divider', 'knowledge')} className="p-1.5 hover:bg-theme-hover text-theme-secondary rounded" title="Divider"><Minus size={13} /></button>
                                        <div className="w-px h-4 bg-theme-border/60 mx-1" />
                                        <button onClick={() => applyMarkdown('k_image', 'knowledge')} className="px-2 py-1 text-[9px] font-bold text-blue-600 hover:bg-theme-hover rounded border border-theme-border/30" title="Add K01-K04 placeholder">+ Image (K01-K04)</button>
                                        <button onClick={() => applyMarkdown('references', 'knowledge')} className="px-2 py-1 text-[9px] font-bold text-blue-600 hover:bg-theme-hover rounded border border-theme-border/30" title="Add References">+ References</button>
                                        <button onClick={() => applyMarkdown('schema_notes', 'knowledge')} className="px-2 py-1 text-[9px] font-bold text-blue-600 hover:bg-theme-hover rounded border border-theme-border/30" title="Add Schema Notes">+ Schema Notes</button>
                                        <div className="w-px h-4 bg-theme-border/60 mx-1" />
                                        <button 
                                            type="button"
                                            onClick={() => setIsExpanded(!isExpanded)}
                                            className="px-2.5 py-1 text-[10px] font-black uppercase tracking-wider bg-black dark:bg-slate-800 text-white dark:text-theme-primary hover:bg-neutral-800 dark:hover:bg-slate-700 transition-all rounded-md flex items-center gap-1"
                                        >
                                            {isExpanded ? "Collapse" : "Expand"}
                                        </button>
                                    </div>
                                </div>
                                <textarea
                                    id="knowledge-body-textarea"
                                    value={knowledgeBody}
                                    onChange={(e) => setKnowledgeBody(e.target.value)}
                                    placeholder="เขียนเนื้อหาเชิงลึก/ความรู้ประกอบในรูปแบบ Markdown ที่นี่..."
                                    className={`w-full ${isExpanded ? 'min-h-[75vh]' : 'min-h-[65vh]'} flex-1 bg-theme-input border border-theme-border rounded-2xl p-6 text-sm font-medium outline-none focus:border-theme-border/80 transition-all resize-y text-theme-primary leading-relaxed custom-scrollbar font-mono`}
                                />
                            </div>
                        )}

                        {/* 2. Social Drafts Panel */}
                        {subTab === "social" && (
                            <div className="space-y-6">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-sm font-black text-theme-primary uppercase tracking-widest">Social Drafts</h3>
                                    {copyStatus && (
                                        <span className="text-[10px] font-bold text-green-600 animate-pulse">{copyStatus}!</span>
                                    )}
                                </div>

                                <div className="space-y-4">
                                    <div>
                                        <div className="flex items-center justify-between mb-1.5">
                                            <label className="text-[10px] font-black uppercase text-theme-muted tracking-wider">Facebook Group Post</label>
                                            <button 
                                                onClick={() => handleCopyToClipboard(facebookGroupPost, "Copied Group Post")}
                                                className="text-[9px] font-bold text-blue-600 hover:underline flex items-center gap-1"
                                            >
                                                <Copy className="w-3 h-3" /> Copy
                                            </button>
                                        </div>
                                        <textarea
                                            value={facebookGroupPost}
                                            onChange={(e) => setFacebookGroupPost(e.target.value)}
                                            placeholder="ย่อยสำหรับโพสต์ในคอมมูนิตี้ / กลุ่มเป้าหมาย..."
                                            className="w-full min-h-[100px] bg-theme-input border border-theme-border rounded-xl p-3.5 text-xs font-bold outline-none focus:border-theme-border/80 text-theme-primary placeholder:text-theme-muted"
                                        />
                                    </div>

                                    <div>
                                        <div className="flex items-center justify-between mb-1.5">
                                            <label className="text-[10px] font-black uppercase text-theme-muted tracking-wider">Facebook Page Post</label>
                                            <button 
                                                onClick={() => handleCopyToClipboard(facebookPagePost, "Copied Page Post")}
                                                className="text-[9px] font-bold text-blue-600 hover:underline flex items-center gap-1"
                                            >
                                                <Copy className="w-3 h-3" /> Copy
                                            </button>
                                        </div>
                                        <textarea
                                            value={facebookPagePost}
                                            onChange={(e) => setFacebookPagePost(e.target.value)}
                                            placeholder="โพสต์ประกาศสำหรับเพจหลักอย่างเป็นทางการ..."
                                            className="w-full min-h-[100px] bg-theme-input border border-theme-border rounded-xl p-3.5 text-xs font-bold outline-none focus:border-theme-border/80 text-theme-primary placeholder:text-theme-muted"
                                        />
                                    </div>

                                    <div>
                                        <div className="flex items-center justify-between mb-1.5">
                                            <label className="text-[10px] font-black uppercase text-theme-muted tracking-wider">Personal Profile Post</label>
                                            <button 
                                                onClick={() => handleCopyToClipboard(personalPost, "Copied Personal Post")}
                                                className="text-[9px] font-bold text-blue-600 hover:underline flex items-center gap-1"
                                            >
                                                <Copy className="w-3 h-3" /> Copy
                                            </button>
                                        </div>
                                        <textarea
                                            value={personalPost}
                                            onChange={(e) => setPersonalPost(e.target.value)}
                                            placeholder="บอกเล่าในโทนเสียงส่วนตัว / เล่าสู่กันฟัง..."
                                            className="w-full min-h-[100px] bg-theme-input border border-theme-border rounded-xl p-3.5 text-xs font-bold outline-none focus:border-theme-border/80 text-theme-primary placeholder:text-theme-muted"
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <div className="flex items-center justify-between mb-1.5">
                                                <label className="text-[10px] font-black uppercase text-theme-muted tracking-wider">Short Caption</label>
                                                <button 
                                                    onClick={() => handleCopyToClipboard(shortCaption, "Copied Caption")}
                                                    className="text-[9px] font-bold text-blue-600 hover:underline flex items-center gap-1"
                                                >
                                                    <Copy className="w-3 h-3" /> Copy
                                                </button>
                                            </div>
                                            <textarea
                                                value={shortCaption}
                                                onChange={(e) => setShortCaption(e.target.value)}
                                                placeholder="แคปชันสั้นชวนสะดุดสายตา..."
                                                className="w-full min-h-[80px] bg-theme-input border border-theme-border rounded-xl p-3.5 text-xs font-bold outline-none focus:border-theme-border/80 text-theme-primary placeholder:text-theme-muted"
                                            />
                                        </div>

                                        <div>
                                            <div className="flex items-center justify-between mb-1.5">
                                                <label className="text-[10px] font-black uppercase text-theme-muted tracking-wider">Hashtags</label>
                                                <button 
                                                    onClick={() => handleCopyToClipboard(hashtags, "Copied Hashtags")}
                                                    className="text-[9px] font-bold text-blue-600 hover:underline flex items-center gap-1"
                                                >
                                                    <Copy className="w-3 h-3" /> Copy
                                                </button>
                                            </div>
                                            <textarea
                                                value={hashtags}
                                                onChange={(e) => setHashtags(e.target.value)}
                                                placeholder="#tag1 #tag2..."
                                                className="w-full min-h-[80px] bg-theme-input border border-theme-border rounded-xl p-3.5 text-xs font-bold outline-none focus:border-theme-border/80 text-theme-primary placeholder:text-theme-muted"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* 3. SEO & Website Fields Panel */}
                        {subTab === "seo" && (
                            <div className="space-y-6">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-theme-border/40 pb-4">
                                    <div className="space-y-2">
                                        <h3 className="text-sm font-black text-theme-primary uppercase tracking-widest">SEO & Website Fields</h3>
                                        {/* Mode Selector horizontal tab */}
                                        <div className="flex items-center gap-1 bg-theme-panel p-1 rounded-xl border border-theme-border/40 w-fit">
                                            <button
                                                type="button"
                                                onClick={() => setSeoMode("narrative")}
                                                className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${
                                                    seoMode === "narrative" 
                                                        ? "bg-black text-white dark:bg-slate-800 dark:text-theme-primary shadow-sm" 
                                                        : "text-theme-secondary hover:bg-theme-hover"
                                                }`}
                                            >
                                                Narrative Article (เรื่องเล่า)
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setSeoMode("knowledge")}
                                                className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${
                                                    seoMode === "knowledge" 
                                                        ? "bg-black text-white dark:bg-slate-800 dark:text-theme-primary shadow-sm" 
                                                        : "text-theme-secondary hover:bg-theme-hover"
                                                }`}
                                            >
                                                Knowledge Article (ความรู้)
                                            </button>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={handleGenerateSEO}
                                        disabled={!(narrativeBody || knowledgeBody)}
                                        className="flex items-center gap-1.5 px-4 py-2 bg-neutral-100 hover:bg-neutral-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-theme-primary text-xs font-black uppercase tracking-widest rounded-xl transition-all disabled:opacity-50 h-fit"
                                    >
                                        <Wand2 className="w-3.5 h-3.5 text-blue-500" />
                                        Generate from Active Body
                                    </button>
                                </div>

                                <div className="space-y-4">
                                    {seoMode === "narrative" ? (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {/* Helper text */}
                                            <div className="col-span-12 md:col-span-2 bg-emerald-50/40 dark:bg-emerald-950/10 border border-emerald-100/30 p-3.5 rounded-2xl">
                                                <p className="text-[10px] font-bold text-emerald-800 dark:text-emerald-300">
                                                    💡 <strong>Narrative Mode:</strong> Plant Journey / story-driven article metadata (ดึงข้อมูลค่าเดิมเป็น Fallback เสมอ)
                                                </p>
                                            </div>

                                            <div className="col-span-1 md:col-span-2">
                                                <label className="text-[10px] font-black uppercase text-theme-muted tracking-wider ml-1">Article Title</label>
                                                <input
                                                    type="text"
                                                    value={narrativeTitle}
                                                    onChange={(e) => setNarrativeTitle(e.target.value)}
                                                    placeholder="ชื่อบทความเรื่องเล่า..."
                                                    className="w-full bg-theme-input border border-theme-border rounded-xl px-3 py-2 text-xs font-bold mt-1 text-theme-primary outline-none focus:border-theme-border/80"
                                                />
                                            </div>

                                            <div>
                                                <label className="text-[10px] font-black uppercase text-theme-muted tracking-wider ml-1">Slug</label>
                                                <input
                                                    type="text"
                                                    value={narrativeSlug}
                                                    onChange={(e) => setNarrativeSlug(e.target.value)}
                                                    placeholder="narrative-article-slug"
                                                    className="w-full bg-theme-input border border-theme-border rounded-xl px-3 py-2 text-xs font-bold mt-1 text-theme-primary outline-none focus:border-theme-border/80"
                                                />
                                            </div>

                                            <div>
                                                <label className="text-[10px] font-black uppercase text-theme-muted tracking-wider ml-1">Hero Subtitle</label>
                                                <input
                                                    type="text"
                                                    value={narrativeHeroSubtitle}
                                                    onChange={(e) => setNarrativeHeroSubtitle(e.target.value)}
                                                    placeholder="คำโปรยรองบนเว็บ..."
                                                    className="w-full bg-theme-input border border-theme-border rounded-xl px-3 py-2 text-xs font-bold mt-1 text-theme-primary outline-none focus:border-theme-border/80"
                                                />
                                            </div>

                                            <div>
                                                <label className="text-[10px] font-black uppercase text-theme-muted tracking-wider ml-1">Featured Image URL</label>
                                                <input
                                                    type="text"
                                                    value={narrativeFeaturedImageUrl}
                                                    onChange={(e) => setNarrativeFeaturedImageUrl(e.target.value)}
                                                    placeholder="https://greenfineness.com/images/..."
                                                    className="w-full bg-theme-input border border-theme-border rounded-xl px-3 py-2 text-xs font-bold mt-1 text-theme-primary outline-none focus:border-theme-border/80"
                                                />
                                            </div>

                                            <div>
                                                <label className="text-[10px] font-black uppercase text-theme-muted tracking-wider ml-1">Journey Stage</label>
                                                <select
                                                    value={narrativeJourneyStage}
                                                    onChange={(e) => setNarrativeJourneyStage(e.target.value)}
                                                    className="w-full bg-theme-input border border-theme-border rounded-xl px-3 py-2.5 text-xs font-bold mt-1 text-theme-primary outline-none focus:border-theme-border/80 appearance-none"
                                                >
                                                    <option value="">เลือก Journey Stage...</option>
                                                    <option value="เมล็ดและสารอาหารสะสม">เมล็ดและสารอาหารสะสม</option>
                                                    <option value="ต้นอ่อนเริ่มสร้างลำต้นและใบ">ต้นอ่อนเริ่มสร้างลำต้นและใบ</option>
                                                    <option value="ระบบรากและการหาอาหาร">ระบบรากและการหาอาหาร</option>
                                                    <option value="การเติบโตและการแตกกิ่งก้าน">การเติบโตและการแตกกิ่งก้าน</option>
                                                    <option value="การออกดอกและผสมเกสร">การออกดอกและผสมเกสร</option>
                                                    <option value="ผลผลิตและการสืบทอดสายพันธุ์">ผลผลิตและการสืบทอดสายพันธุ์</option>
                                                </select>
                                            </div>

                                            <div>
                                                <label className="text-[10px] font-black uppercase text-theme-muted tracking-wider ml-1">Related Companion Article</label>
                                                <select
                                                    value={narrativeRelatedKnowledgeArticle}
                                                    onChange={(e) => setNarrativeRelatedKnowledgeArticle(e.target.value)}
                                                    className="w-full bg-theme-input border border-theme-border rounded-xl px-3 py-2.5 text-xs font-bold mt-1 text-theme-primary outline-none focus:border-theme-border/80 appearance-none"
                                                >
                                                    <option value="">เลือกบทความความรู้ประกอบ...</option>
                                                    {allEpisodes.map(ep => (
                                                        <option key={ep.id} value={ep.id}>{ep.title}</option>
                                                    ))}
                                                </select>
                                            </div>

                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="text-[10px] font-black uppercase text-theme-muted tracking-wider ml-1">Status</label>
                                                    <select
                                                        value={narrativeStatus}
                                                        onChange={(e) => setNarrativeStatus(e.target.value)}
                                                        className="w-full bg-theme-input border border-theme-border rounded-xl px-3 py-2.5 text-xs font-bold mt-1 text-theme-primary outline-none focus:border-theme-border/80 appearance-none"
                                                    >
                                                        <option value="draft">Draft</option>
                                                        <option value="website_draft">Website Draft</option>
                                                        <option value="published">Published</option>
                                                        <option value="archived">Archived</option>
                                                    </select>
                                                </div>
                                                <div className="flex items-center gap-2 mt-6">
                                                    <input
                                                        type="checkbox"
                                                        id="narrative-editors-pick"
                                                        checked={narrativeEditorsPick === 1}
                                                        onChange={(e) => setNarrativeEditorsPick(e.target.checked ? 1 : 0)}
                                                        className="rounded border-theme-border text-blue-600 focus:ring-blue-500 w-4 h-4"
                                                    />
                                                    <label htmlFor="narrative-editors-pick" className="text-[10px] font-black uppercase text-theme-muted tracking-wider cursor-pointer select-none">Editor&apos;s Pick</label>
                                                </div>
                                            </div>

                                            <div className="col-span-1 md:col-span-2">
                                                <label className="text-[10px] font-black uppercase text-theme-muted tracking-wider ml-1">Short Summary</label>
                                                <textarea
                                                    value={narrativeShortSummary}
                                                    onChange={(e) => setNarrativeShortSummary(e.target.value)}
                                                    placeholder="บทคัดย่อการเดินทางของพืช..."
                                                    className="w-full min-h-[80px] bg-theme-input border border-theme-border rounded-xl p-3 text-xs font-bold mt-1 text-theme-primary outline-none focus:border-theme-border/80"
                                                />
                                            </div>

                                            <div>
                                                <label className="text-[10px] font-black uppercase text-theme-muted tracking-wider ml-1">Meta Title</label>
                                                <input
                                                    type="text"
                                                    value={narrativeMetaTitle}
                                                    onChange={(e) => setNarrativeMetaTitle(e.target.value)}
                                                    placeholder="SEO Meta Title..."
                                                    className="w-full bg-theme-input border border-theme-border rounded-xl px-3 py-2 text-xs font-bold mt-1 text-theme-primary outline-none focus:border-theme-border/80"
                                                />
                                            </div>

                                            <div>
                                                <label className="text-[10px] font-black uppercase text-theme-muted tracking-wider ml-1">Keywords</label>
                                                <input
                                                    type="text"
                                                    value={narrativeKeywords}
                                                    onChange={(e) => setNarrativeKeywords(e.target.value)}
                                                    placeholder="คำสำคัญ (แยกด้วยจุลภาค)..."
                                                    className="w-full bg-theme-input border border-theme-border rounded-xl px-3 py-2 text-xs font-bold mt-1 text-theme-primary outline-none focus:border-theme-border/80"
                                                />
                                            </div>

                                            <div className="col-span-1 md:col-span-2">
                                                <label className="text-[10px] font-black uppercase text-theme-muted tracking-wider ml-1">Meta Description</label>
                                                <textarea
                                                    value={narrativeMetaDescription}
                                                    onChange={(e) => setNarrativeMetaDescription(e.target.value)}
                                                    placeholder="SEO Meta Description..."
                                                    className="w-full min-h-[80px] bg-theme-input border border-theme-border rounded-xl p-3 text-xs font-bold mt-1 text-theme-primary outline-none focus:border-theme-border/80"
                                                />
                                            </div>

                                            <div className="col-span-1 md:col-span-2">
                                                <label className="text-[10px] font-black uppercase text-theme-muted tracking-wider ml-1 font-mono">Schema / Custom JSON-LD (Large Area)</label>
                                                <textarea
                                                    value={narrativeSchemaJsonld}
                                                    onChange={(e) => setNarrativeSchemaJsonld(e.target.value)}
                                                    placeholder='{ "@context": "https://schema.org", "@type": "TechArticle", ... }'
                                                    className="w-full min-h-[140px] bg-theme-input border border-theme-border rounded-xl p-3 text-xs font-mono mt-1 text-theme-primary outline-none focus:border-theme-border/80"
                                                />
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {/* Helper text */}
                                            <div className="col-span-12 md:col-span-2 bg-blue-50/40 dark:bg-blue-950/10 border border-blue-100/30 p-3.5 rounded-2xl">
                                                <p className="text-[10px] font-bold text-blue-800 dark:text-blue-300">
                                                    💡 <strong>Knowledge Mode:</strong> Library / Knowledge Companion article metadata (เริ่มว่างเป็นค่าตั้งต้น)
                                                </p>
                                            </div>

                                            <div className="col-span-1 md:col-span-2">
                                                <label className="text-[10px] font-black uppercase text-theme-muted tracking-wider ml-1">Article Title</label>
                                                <input
                                                    type="text"
                                                    value={knowledgeTitle}
                                                    onChange={(e) => setKnowledgeTitle(e.target.value)}
                                                    placeholder="ชื่อบทความวิชาการ/สาระความรู้..."
                                                    className="w-full bg-theme-input border border-theme-border rounded-xl px-3 py-2 text-xs font-bold mt-1 text-theme-primary outline-none focus:border-theme-border/80"
                                                />
                                            </div>

                                            <div>
                                                <label className="text-[10px] font-black uppercase text-theme-muted tracking-wider ml-1">Slug</label>
                                                <input
                                                    type="text"
                                                    value={knowledgeSlug}
                                                    onChange={(e) => setKnowledgeSlug(e.target.value)}
                                                    placeholder="knowledge-article-slug"
                                                    className="w-full bg-theme-input border border-theme-border rounded-xl px-3 py-2 text-xs font-bold mt-1 text-theme-primary outline-none focus:border-theme-border/80"
                                                />
                                            </div>

                                            <div>
                                                <label className="text-[10px] font-black uppercase text-theme-muted tracking-wider ml-1">Hero Subtitle</label>
                                                <input
                                                    type="text"
                                                    value={knowledgeHeroSubtitle}
                                                    onChange={(e) => setKnowledgeHeroSubtitle(e.target.value)}
                                                    placeholder="คำโปรยรองบทความความรู้..."
                                                    className="w-full bg-theme-input border border-theme-border rounded-xl px-3 py-2 text-xs font-bold mt-1 text-theme-primary outline-none focus:border-theme-border/80"
                                                />
                                            </div>

                                            <div>
                                                <label className="text-[10px] font-black uppercase text-theme-muted tracking-wider ml-1">Featured Image URL</label>
                                                <input
                                                    type="text"
                                                    value={knowledgeFeaturedImageUrl}
                                                    onChange={(e) => setKnowledgeFeaturedImageUrl(e.target.value)}
                                                    placeholder="https://greenfineness.com/images/..."
                                                    className="w-full bg-theme-input border border-theme-border rounded-xl px-3 py-2 text-xs font-bold mt-1 text-theme-primary outline-none focus:border-theme-border/80"
                                                />
                                            </div>

                                            <div>
                                                <label className="text-[10px] font-black uppercase text-theme-muted tracking-wider ml-1">Related Journey Chapter</label>
                                                <select
                                                    value={knowledgeRelatedNarrativeArticle}
                                                    onChange={(e) => setKnowledgeRelatedNarrativeArticle(e.target.value)}
                                                    className="w-full bg-theme-input border border-theme-border rounded-xl px-3 py-2.5 text-xs font-bold mt-1 text-theme-primary outline-none focus:border-theme-border/80 appearance-none"
                                                >
                                                    <option value="">เลือกบทความตอนหลัก (Journey Chapter)...</option>
                                                    {allEpisodes.map(ep => (
                                                        <option key={ep.id} value={ep.id}>{ep.title}</option>
                                                    ))}
                                                </select>
                                            </div>

                                            <div>
                                                <label className="text-[10px] font-black uppercase text-theme-muted tracking-wider ml-1">Primary Keyword</label>
                                                <input
                                                    type="text"
                                                    value={knowledgePrimaryKeyword}
                                                    onChange={(e) => setKnowledgePrimaryKeyword(e.target.value)}
                                                    placeholder="คีย์เวิร์ดหลัก..."
                                                    className="w-full bg-theme-input border border-theme-border rounded-xl px-3 py-2 text-xs font-bold mt-1 text-theme-primary outline-none focus:border-theme-border/80"
                                                />
                                            </div>

                                            <div>
                                                <label className="text-[10px] font-black uppercase text-theme-muted tracking-wider ml-1">Secondary Keywords</label>
                                                <input
                                                    type="text"
                                                    value={knowledgeSecondaryKeywords}
                                                    onChange={(e) => setKnowledgeSecondaryKeywords(e.target.value)}
                                                    placeholder="คีย์เวิร์ดรอง (แยกด้วยจุลภาค)..."
                                                    className="w-full bg-theme-input border border-theme-border rounded-xl px-3 py-2 text-xs font-bold mt-1 text-theme-primary outline-none focus:border-theme-border/80"
                                                />
                                            </div>

                                            <div>
                                                <label className="text-[10px] font-black uppercase text-theme-muted tracking-wider ml-1">Category</label>
                                                <input
                                                    type="text"
                                                    value={knowledgeCategory}
                                                    onChange={(e) => setKnowledgeCategory(e.target.value)}
                                                    placeholder="หมวดหมู่ความรู้..."
                                                    className="w-full bg-theme-input border border-theme-border rounded-xl px-3 py-2 text-xs font-bold mt-1 text-theme-primary outline-none focus:border-theme-border/80"
                                                />
                                            </div>

                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="text-[10px] font-black uppercase text-theme-muted tracking-wider ml-1">Status</label>
                                                    <select
                                                        value={knowledgeStatus}
                                                        onChange={(e) => setKnowledgeStatus(e.target.value)}
                                                        className="w-full bg-theme-input border border-theme-border rounded-xl px-3 py-2.5 text-xs font-bold mt-1 text-theme-primary outline-none focus:border-theme-border/80 appearance-none"
                                                    >
                                                        <option value="draft">Draft</option>
                                                        <option value="website_draft">Website Draft</option>
                                                        <option value="published">Published</option>
                                                        <option value="archived">Archived</option>
                                                    </select>
                                                </div>
                                                <div className="flex items-center gap-2 mt-6">
                                                    <input
                                                        type="checkbox"
                                                        id="knowledge-editors-pick"
                                                        checked={knowledgeEditorsPick === 1}
                                                        onChange={(e) => setKnowledgeEditorsPick(e.target.checked ? 1 : 0)}
                                                        className="rounded border-theme-border text-blue-600 focus:ring-blue-500 w-4 h-4"
                                                    />
                                                    <label htmlFor="knowledge-editors-pick" className="text-[10px] font-black uppercase text-theme-muted tracking-wider cursor-pointer select-none">Editor&apos;s Pick</label>
                                                </div>
                                            </div>

                                            <div className="col-span-1 md:col-span-2">
                                                <label className="text-[10px] font-black uppercase text-theme-muted tracking-wider ml-1">Short Summary</label>
                                                <textarea
                                                    value={knowledgeShortSummary}
                                                    onChange={(e) => setKnowledgeShortSummary(e.target.value)}
                                                    placeholder="สรุปย่อความรู้ประกอบ..."
                                                    className="w-full min-h-[80px] bg-theme-input border border-theme-border rounded-xl p-3 text-xs font-bold mt-1 text-theme-primary outline-none focus:border-theme-border/80"
                                                />
                                            </div>

                                            <div>
                                                <label className="text-[10px] font-black uppercase text-theme-muted tracking-wider ml-1">Meta Title</label>
                                                <input
                                                    type="text"
                                                    value={knowledgeMetaTitle}
                                                    onChange={(e) => setKnowledgeMetaTitle(e.target.value)}
                                                    placeholder="SEO Meta Title..."
                                                    className="w-full bg-theme-input border border-theme-border rounded-xl px-3 py-2 text-xs font-bold mt-1 text-theme-primary outline-none focus:border-theme-border/80"
                                                />
                                            </div>

                                            <div>
                                                <label className="text-[10px] font-black uppercase text-theme-muted tracking-wider ml-1">Keywords</label>
                                                <input
                                                    type="text"
                                                    value={knowledgeKeywords}
                                                    onChange={(e) => setKnowledgeKeywords(e.target.value)}
                                                    placeholder="คำสำคัญ (แยกด้วยจุลภาค)..."
                                                    className="w-full bg-theme-input border border-theme-border rounded-xl px-3 py-2 text-xs font-bold mt-1 text-theme-primary outline-none focus:border-theme-border/80"
                                                />
                                            </div>

                                            <div className="col-span-1 md:col-span-2">
                                                <label className="text-[10px] font-black uppercase text-theme-muted tracking-wider ml-1">Meta Description</label>
                                                <textarea
                                                    value={knowledgeMetaDescription}
                                                    onChange={(e) => setKnowledgeMetaDescription(e.target.value)}
                                                    placeholder="SEO Meta Description..."
                                                    className="w-full min-h-[80px] bg-theme-input border border-theme-border rounded-xl p-3 text-xs font-bold mt-1 text-theme-primary outline-none focus:border-theme-border/80"
                                                />
                                            </div>

                                            <div className="col-span-1 md:col-span-2">
                                                <label className="text-[10px] font-black uppercase text-theme-muted tracking-wider ml-1 font-mono">Schema / Custom JSON-LD (Large Area)</label>
                                                <textarea
                                                    value={knowledgeSchemaJsonld}
                                                    onChange={(e) => setKnowledgeSchemaJsonld(e.target.value)}
                                                    placeholder='{ "@context": "https://schema.org", "@type": "NewsArticle", ... }'
                                                    className="w-full min-h-[140px] bg-theme-input border border-theme-border rounded-xl p-3 text-xs font-mono mt-1 text-theme-primary outline-none focus:border-theme-border/80"
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* 4. UTM / Publish Panel */}
                        {subTab === "utm" && (
                            <div className="space-y-6">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-sm font-black text-theme-primary uppercase tracking-widest">UTM / Publish</h3>
                                    <button
                                        type="button"
                                        onClick={handleGenerateUTM}
                                        disabled={!publishedUrl || !campaignName}
                                        className="flex items-center gap-1.5 px-4 py-2 bg-neutral-100 hover:bg-neutral-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-theme-primary text-xs font-black uppercase tracking-widest rounded-xl transition-all disabled:opacity-50"
                                    >
                                        Generate UTM
                                    </button>
                                </div>

                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-[10px] font-black uppercase text-theme-muted tracking-wider ml-1">Published URL</label>
                                            <input
                                                type="text"
                                                value={publishedUrl}
                                                onChange={(e) => setPublishedUrl(e.target.value)}
                                                placeholder="https://greenfineness.com/library/..."
                                                className="w-full bg-theme-input border border-theme-border rounded-xl px-3 py-2.5 text-xs font-bold mt-1 text-theme-primary outline-none focus:border-theme-border/80"
                                            />
                                        </div>

                                        <div>
                                            <label className="text-[10px] font-black uppercase text-theme-muted tracking-wider ml-1">Campaign Name</label>
                                            <input
                                                type="text"
                                                value={campaignName}
                                                onChange={(e) => setCampaignName(e.target.value)}
                                                placeholder="campaign-name-slug"
                                                className="w-full bg-theme-input border border-theme-border rounded-xl px-3 py-2.5 text-xs font-bold mt-1 text-theme-primary outline-none focus:border-theme-border/80"
                                            />
                                        </div>
                                    </div>

                                    {/* UTM Output */}
                                    {groupUtm && (
                                        <div className="space-y-4 pt-4 border-t border-theme-border/40 animate-fadeIn">
                                            <div>
                                                <div className="flex justify-between text-[10px] font-bold text-neutral-400 mb-1">
                                                    <span>Facebook Group UTM URL</span>
                                                    <button onClick={() => handleCopyToClipboard(groupUtm, "Copied Group UTM")} className="text-blue-600 hover:underline">Copy Link</button>
                                                </div>
                                                <input readOnly value={groupUtm} className="w-full bg-theme-panel border border-theme-border rounded-lg p-2 font-mono text-[10px] text-theme-secondary" />
                                            </div>

                                            <div>
                                                <div className="flex justify-between text-[10px] font-bold text-neutral-400 mb-1">
                                                    <span>Facebook Page UTM URL</span>
                                                    <button onClick={() => handleCopyToClipboard(pageUtm, "Copied Page UTM")} className="text-blue-600 hover:underline">Copy Link</button>
                                                </div>
                                                <input readOnly value={pageUtm} className="w-full bg-theme-panel border border-theme-border rounded-lg p-2 font-mono text-[10px] text-theme-secondary" />
                                            </div>

                                            <div>
                                                <div className="flex justify-between text-[10px] font-bold text-neutral-400 mb-1">
                                                    <span>Personal Profile UTM URL</span>
                                                    <button onClick={() => handleCopyToClipboard(personalUtm, "Copied Personal UTM")} className="text-blue-600 hover:underline">Copy Link</button>
                                                </div>
                                                <input readOnly value={personalUtm} className="w-full bg-theme-panel border border-theme-border rounded-lg p-2 font-mono text-[10px] text-theme-secondary" />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* 5. Arbor Review Panel */}
                        {subTab === "review" && (
                            <div className="space-y-6">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-sm font-black text-theme-primary uppercase tracking-widest flex items-center gap-2">
                                        <Sparkles className="text-blue-600 w-4 h-4" />
                                        Arbor Review
                                    </h3>
                                    <button
                                        type="button"
                                        onClick={handleRunArborReview}
                                        disabled={isReviewing || !(narrativeBody || knowledgeBody)}
                                        className="bg-blue-600 text-white px-5 py-2.5 rounded-xl text-xs font-black flex items-center gap-2 hover:bg-blue-700 transition-all shadow-md shadow-blue-100 disabled:opacity-50"
                                    >
                                        {isReviewing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />} 
                                        {isReviewing ? 'Analyzing...' : 'Run Arbor Review'}
                                    </button>
                                </div>

                                {!reviewResult ? (
                                    <div className="py-16 text-center text-theme-muted font-bold italic space-y-2">
                                        <p>ยังไม่มีผลวิเคราะห์บทความเชิงลึก</p>
                                        <p className="text-[10px] uppercase font-bold text-neutral-300">คลิกปุ่ม Run Arbor Review เพื่อเริ่มตรวจคำศัพท์ โทน และความเสี่ยงทางลิขสิทธิ์ / วิชาการ</p>
                                    </div>
                                ) : (
                                    <div className="space-y-6 animate-fadeIn">
                                        {/* Editorial Summary */}
                                        <div className="p-5 bg-blue-50/40 dark:bg-blue-950/20 border border-blue-100/60 dark:border-blue-900/30 rounded-2xl">
                                            <h4 className="text-[10px] font-black uppercase tracking-widest text-blue-600 dark:text-blue-400 mb-2">Editorial Summary</h4>
                                            <p className="text-xs font-bold leading-relaxed text-theme-primary">{reviewResult.summary}</p>
                                            <div className="text-[9px] font-bold text-blue-500 mt-2">Recommended: {reviewResult.next_step}</div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            {/* Strengths (Keep) */}
                                            <div className="space-y-3">
                                                <h4 className="text-[10px] font-black uppercase tracking-widest text-emerald-600 border-b border-theme-border pb-1">Strengths (Keep)</h4>
                                                <ul className="space-y-2">
                                                    {reviewResult.strengths.map((str: string, i: number) => (
                                                        <li key={i} className="text-xs font-bold text-theme-primary flex items-start gap-2">
                                                            <span className="text-emerald-500 shrink-0">✓</span>
                                                            <span>{str}</span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>

                                            {/* Issues to Fix */}
                                            <div className="space-y-3">
                                                <h4 className="text-[10px] font-black uppercase tracking-widest text-amber-600 border-b border-theme-border pb-1">Issues to Fix</h4>
                                                <ul className="space-y-2">
                                                    {reviewResult.revisions.map((rev: string, i: number) => (
                                                        <li key={i} className="text-xs font-bold text-theme-primary flex items-start gap-2">
                                                            <span className="text-amber-500 shrink-0">!</span>
                                                            <span>{rev}</span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        </div>

                                        {/* Tone Notes */}
                                        <div className="space-y-3">
                                            <h4 className="text-[10px] font-black uppercase tracking-widest text-purple-600 border-b border-theme-border pb-1">Tone Analysis</h4>
                                            <div className="flex flex-wrap gap-2">
                                                {reviewResult.tone.map((tn: string, i: number) => (
                                                    <span key={i} className="px-3 py-1 rounded bg-purple-50 dark:bg-purple-950/20 text-purple-600 dark:text-purple-400 border border-purple-100/40 text-[9px] font-black uppercase tracking-widest">
                                                        {tn}
                                                    </span>
                                                ))}
                                            </div>
                                            {reviewResult.voiceSuggestions && reviewResult.voiceSuggestions.length > 0 && (
                                                <div className="mt-2 space-y-2.5">
                                                    {reviewResult.voiceSuggestions.map((vs: string, i: number) => (
                                                        <div key={i} className="text-xs text-theme-secondary bg-theme-panel p-2.5 rounded-xl border border-theme-border/40">
                                                            {vs}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                        {/* Claim safety & Risks */}
                                        <div className="space-y-3">
                                            <h4 className="text-[10px] font-black uppercase tracking-widest text-rose-600 border-b border-theme-border pb-1">Claim Safety & Risks</h4>
                                            <ul className="space-y-2">
                                                {reviewResult.risks.map((rk: string, i: number) => (
                                                    <li key={i} className="text-xs font-bold text-theme-primary flex items-start gap-2">
                                                        <span className="text-rose-500 shrink-0">⚠️</span>
                                                        <span>{rk}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                            {reviewResult.claimSuggestions && reviewResult.claimSuggestions.length > 0 && (
                                                <div className="mt-2 space-y-2 bg-rose-50/10 border border-rose-100/30 p-4 rounded-2xl">
                                                    <div className="text-[9px] font-black uppercase tracking-widest text-rose-500 mb-2">Claim Safety Suggestions</div>
                                                    {reviewResult.claimSuggestions.map((cs: string, i: number) => (
                                                        <div key={i} className="text-xs font-bold text-rose-800 dark:text-rose-300 leading-normal">
                                                            💡 {cs}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                    </div>
                </div>
            )}
            {/* Modal for WorkOS Package Handoff */}
            {isWorkOSModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-theme-card border border-theme-border rounded-[32px] max-w-3xl w-full max-h-[85vh] flex flex-col overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                        {/* Modal Header */}
                        <div className="p-6 border-b border-theme-border/60 flex items-center justify-between">
                            <div>
                                <h3 className="text-base font-black text-theme-primary flex items-center gap-2">
                                    <Sparkles className="w-5 h-5 text-blue-600 animate-pulse" />
                                    <span>WorkOS Import Package Generator</span>
                                </h3>
                                <p className="text-[10px] font-bold text-theme-muted mt-0.5">
                                    แพ็กเกจข้อมูลโครงสร้างมาตรฐาน workos-arbor-import-v0.1 สำหรับพร้อมนำเข้า Arbor Inbox
                                </p>
                            </div>
                            <button
                                onClick={() => setIsWorkOSModalOpen(false)}
                                className="w-8 h-8 rounded-full bg-theme-panel hover:bg-theme-hover flex items-center justify-center text-theme-secondary hover:text-theme-primary transition-all font-bold"
                            >
                                ✕
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="p-6 overflow-y-auto flex-1 space-y-4 text-left">
                            <div className="text-xs text-theme-secondary bg-blue-500/5 border border-blue-500/10 p-4 rounded-2xl leading-normal space-y-1">
                                <div className="font-bold text-blue-600 dark:text-blue-400">💡 การประมวลผลข้อมูลสำเร็จ:</div>
                                <p>แพ็กเกจนี้ประกอบด้วยโปรเจกต์ <strong>Green Fineness Content</strong>, บทความแบบระบุโครงสร้าง 1 รายการ และงานย่อย (Marketing/Editorial Tasks) 7 รายการเพื่อเริ่มขั้นตอนการทำงานทางเทคนิคและการตลาด</p>
                            </div>

                            {/* Validation Results in Modal */}
                            <div className="p-4 rounded-2xl border text-xs leading-normal space-y-2 bg-theme-panel/40 border-theme-border/60">
                                <div className="flex items-center gap-2">
                                    <span className={`w-2.5 h-2.5 rounded-full ${isPackageValid ? "bg-green-500 animate-pulse" : "bg-red-500 animate-pulse"}`} />
                                    <span className="font-black uppercase tracking-widest text-theme-primary">
                                        Validation Status: {isPackageValid ? "PASSED (ผ่านการตรวจสอบ)" : "FAILED (พบข้อผิดพลาด)"}
                                    </span>
                                </div>
                                
                                {validationErrors.length > 0 && (
                                    <div className="space-y-1">
                                        <div className="font-bold text-red-500">ข้อผิดพลาด (Errors):</div>
                                        {validationErrors.map((err, i) => (
                                            <div key={i} className="text-red-600 dark:text-red-400 pl-3 border-l-2 border-red-500">• {err}</div>
                                        ))}
                                    </div>
                                )}

                                {validationWarnings.length > 0 && (
                                    <div className="space-y-1">
                                        <div className="font-bold text-amber-500">ข้อควรระวัง (Warnings):</div>
                                        {validationWarnings.map((wrn, i) => (
                                            <div key={i} className="text-amber-600 dark:text-amber-400 pl-3 border-l-2 border-amber-500">• {wrn}</div>
                                        ))}
                                    </div>
                                )}

                                {isPackageValid && validationErrors.length === 0 && (
                                    <div className="text-green-600 dark:text-green-400 font-bold">✓ โครงสร้างข้อมูลสมบูรณ์ ปลอดภัย สามารถนำเข้า Arbor Inbox ได้ทันที</div>
                                )}
                            </div>

                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-theme-muted">JSON PAYLOAD PREVIEW</span>
                                    <span className="text-[9px] font-black text-blue-600 bg-blue-500/10 px-2 py-0.5 rounded">workos-arbor-import-v0.1</span>
                                </div>
                                <pre className="p-4 bg-theme-input dark:bg-zinc-950 border border-theme-border rounded-2xl text-xs font-mono overflow-auto max-h-[350px] leading-relaxed custom-scrollbar text-theme-primary select-all">
                                    {generatedPackageText}
                                </pre>
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="p-6 border-t border-theme-border/60 bg-theme-panel/40 flex flex-col sm:flex-row items-center justify-end gap-3">
                            <button
                                onClick={handleCopyPackage}
                                className="w-full sm:w-auto px-5 py-2.5 bg-white dark:bg-slate-800 border border-neutral-200 dark:border-slate-700/60 rounded-xl text-xs font-bold text-neutral-600 dark:text-theme-secondary hover:bg-neutral-50 dark:hover:bg-slate-700 transition-all flex items-center justify-center gap-2"
                            >
                                <Copy className="w-3.5 h-3.5" />
                                {copyPackageSuccess ? "คัดลอกสำเร็จ!" : "คัดลอก JSON (Copy JSON)"}
                            </button>
                            <button
                                onClick={handleSendToInbox}
                                className="w-full sm:w-auto px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 shadow-md hover:shadow-blue-500/10"
                            >
                                <Share2 className="w-3.5 h-3.5" />
                                ส่งไปยัง Arbor Inbox (Send to Inbox)
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
