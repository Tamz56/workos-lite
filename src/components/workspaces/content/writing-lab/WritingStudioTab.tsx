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

interface WritingProject {
    id: string;
    topic_id: string | null;
    title: string;
    slug: string | null;
    story_set_id: string | null;
    episode_id: string | null;
    writing_mode: string;
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

type SubTabKey = "body" | "social" | "seo" | "utm" | "review";

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
    const [subTab, setSubTab] = useState<SubTabKey>("body");
    const [isExpanded, setIsExpanded] = useState(false);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [lastSaved, setLastSaved] = useState<Date | null>(null);
    const [localBlocks, setLocalBlocks] = useState<any[]>([]);

    // Form states
    const [workingTitle, setWorkingTitle] = useState("");
    const [articleBodyMarkdown, setArticleBodyMarkdown] = useState("");
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

            let heroSub = "";
            let pubUrl = "";
            let campName = "";
            if (activeProject.notes) {
                try {
                    const parsed = JSON.parse(activeProject.notes);
                    heroSub = parsed.hero_subtitle || "";
                    pubUrl = parsed.published_url || "";
                    campName = parsed.campaign_name || "";
                } catch {
                    // notes is plain text
                }
            }
            setHeroSubtitle(heroSub);
            setPublishedUrl(pubUrl);
            setCampaignName(campName);

            setGroupUtm("");
            setPageUtm("");
            setPersonalUtm("");
            setReviewResult(null);
            setIsExpanded(false);
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
                        // Check if multiple blocks have content, merge for single editor
                        const withContent = data.filter((b: any) => b.content_md && b.content_md.trim() !== "");
                        if (withContent.length > 1) {
                            const merged = data.map((b: any) => b.content_md ? `## ${b.label}\n\n${b.content_md}` : "").filter(Boolean).join("\n\n");
                            setArticleBodyMarkdown(merged);
                        } else {
                            setArticleBodyMarkdown(data[0].content_md || "");
                        }
                    } else {
                        setArticleBodyMarkdown("");
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
                    status: activeProject.status
                })
            });

            // 2. Save blocks (Article Body goes into the first block)
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
                const updatedBlocks = blocksToSave.map((b, idx) => ({
                    ...b,
                    content_md: idx === 0 ? articleBodyMarkdown : ""
                }));

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
    const applyMarkdown = (type: 'bold' | 'italic' | 'bullet' | 'number' | 'quote' | 'divider') => {
        const textarea = document.getElementById("article-body-textarea") as HTMLTextAreaElement;
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
        }

        const before = text.substring(0, start);
        const after = text.substring(end);
        setArticleBodyMarkdown(before + replacement + after);

        setTimeout(() => {
            textarea.setSelectionRange(start + replacement.length, start + replacement.length);
        }, 0);
    };

    // Deterministic Generator from Article Body
    const handleGenerateSEO = () => {
        if (!articleBodyMarkdown) return;
        
        // 1. Slug generator (lowercase Thai/English and hyphens)
        const cleanSlug = workingTitle
            .toLowerCase()
            .replace(/[^a-z0-9ก-๙\s-]/g, "")
            .trim()
            .replace(/\s+/g, "-");
        setSlug(cleanSlug);

        // 2. Meta Title: uses working title directly
        setMetaTitle(workingTitle);

        // 3. Hero Subtitle: first sentence of body
        const firstSentence = articleBodyMarkdown.split(/[.!?\n]/).find(s => s.trim().length > 5) || "";
        setHeroSubtitle(firstSentence.trim());

        // 4. Short Summary: first 200 chars
        const summaryText = articleBodyMarkdown.replace(/[#*`>_-]/g, "").slice(0, 200);
        setShortSummary(summaryText.trim() + (articleBodyMarkdown.length > 200 ? "..." : ""));

        // 5. Meta Description: first 150 chars
        const descText = articleBodyMarkdown.replace(/[#*`>_-]/g, "").slice(0, 150);
        setMetaDescription(descText.trim() + (articleBodyMarkdown.length > 150 ? "..." : ""));
        
        // 6. Keywords: check common content pillars
        const commonWords = ["ดิน", "ปุ๋ย", "พืช", "อินทรียวัตถุ", "จุลินทรีย์", "ธาตุอาหาร", "ผลผลิต", "เกษตร"];
        const matchedKeywords = commonWords.filter(w => articleBodyMarkdown.includes(w));
        setKeywords(matchedKeywords.join(", ") || "Green Fineness, เกษตรกรรม");
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
        if (!articleBodyMarkdown) return;
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

            const lines = articleBodyMarkdown.split('\n');
            const h2Lines = lines.filter(l => l.trim().startsWith('## '));
            const hasHeadings = h2Lines.length > 0;
            const opening = getFirstLines(articleBodyMarkdown, 4);

            const weakOpeningPatterns = ['ในบทความนี้', 'บทความนี้จะ', 'เราจะมาพูดถึง', 'วันนี้เราจะ', 'ในเนื้อหาสี้'];
            const hasWeakOpening = weakOpeningPatterns.some(p => opening.includes(p));

            const riskyPhrases = ['100%', 'ทุกกรณี', 'รักษาได้', 'รักษาโรค', 'แน่นอน 100', 'ป้องกันได้ 100', 'ไม่มีผลข้างเคียง', 'เพิ่มผลผลิตได้ถึง', 'ลดโรคได้ถึง'];
            const foundRiskyClaims = riskyPhrases.filter(p => articleBodyMarkdown.includes(p));

            const FORBIDDEN_PHRASES = [
                'พูดง่ายๆ คือ', 'มันคือ', 'มันทำให้', 'มันไม่ได้', 'ไม่ได้แปลว่า',
                'ให้เราเห็นว่า', 'นั่นคือ', 'มองให้ลึกลงไป', 'ง่ายๆ คือ',
                'จะเห็นว่า', 'พูดถึง', 'นั่นก็คือ',
            ];
            const flaggedPhrases = FORBIDDEN_PHRASES.filter(p => articleBodyMarkdown.includes(p));

            const isPlc = hasPlaceholder(articleBodyMarkdown);

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
                    {!(isExpanded && subTab === "body") && (
                        <div className="col-span-12 md:col-span-3 space-y-2">
                        <div className="bg-theme-card border border-theme-border rounded-[24px] p-3 shadow-sm flex flex-col gap-1">
                            <button
                                onClick={() => setSubTab("body")}
                                className={`w-full text-left px-4 py-3 rounded-xl text-xs font-bold transition-all flex items-center justify-between ${
                                    subTab === "body" 
                                        ? "bg-black text-white dark:bg-slate-800 dark:text-theme-primary font-black" 
                                        : "text-theme-secondary hover:bg-theme-hover hover:text-theme-primary"
                                }`}
                            >
                                <span>Article Body</span>
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
                        </div>
                    )}

                    {/* Tab panels (Editor fields) */}
                    <div className={`col-span-12 ${(isExpanded && subTab === "body") ? "" : "md:col-span-9"} bg-theme-card border border-theme-border rounded-[32px] p-5 md:p-6 shadow-sm min-h-[500px] transition-all duration-300`}>
                        
                        {/* 1. Article Body Panel */}
                        {subTab === "body" && (
                            <div className="space-y-4 h-full flex flex-col">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-sm font-black text-theme-primary uppercase tracking-widest">Article Body</h3>
                                    {/* Formatting toolbar */}
                                    <div className="flex items-center gap-1.5 bg-theme-panel p-1 rounded-lg border border-theme-border/40">
                                        <button onClick={() => applyMarkdown('bold')} className="p-1.5 hover:bg-theme-hover text-theme-secondary rounded" title="Bold"><Bold size={13} /></button>
                                        <button onClick={() => applyMarkdown('italic')} className="p-1.5 hover:bg-theme-hover text-theme-secondary rounded" title="Italic"><Italic size={13} /></button>
                                        <button onClick={() => applyMarkdown('bullet')} className="p-1.5 hover:bg-theme-hover text-theme-secondary rounded" title="-"> - </button>
                                        <button onClick={() => applyMarkdown('number')} className="p-1.5 hover:bg-theme-hover text-theme-secondary rounded" title="Numbered List"><ListOrdered size={13} /></button>
                                        <button onClick={() => applyMarkdown('quote')} className="p-1.5 hover:bg-theme-hover text-theme-secondary rounded" title="Quote"><Quote size={13} /></button>
                                        <button onClick={() => applyMarkdown('divider')} className="p-1.5 hover:bg-theme-hover text-theme-secondary rounded" title="Divider"><Minus size={13} /></button>
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
                                    id="article-body-textarea"
                                    value={articleBodyMarkdown}
                                    onChange={(e) => setArticleBodyMarkdown(e.target.value)}
                                    placeholder="เขียนเนื้อหาตอนหลักในรูปแบบ Markdown ที่นี่..."
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
                                <div className="flex items-center justify-between">
                                    <h3 className="text-sm font-black text-theme-primary uppercase tracking-widest">SEO & Website Fields</h3>
                                    <button
                                        type="button"
                                        onClick={handleGenerateSEO}
                                        disabled={!articleBodyMarkdown}
                                        className="flex items-center gap-1.5 px-4 py-2 bg-neutral-100 hover:bg-neutral-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-theme-primary text-xs font-black uppercase tracking-widest rounded-xl transition-all disabled:opacity-50"
                                    >
                                        <Wand2 className="w-3.5 h-3.5 text-blue-500" />
                                        Generate from Article Body
                                    </button>
                                </div>

                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-[10px] font-black uppercase text-theme-muted tracking-wider ml-1">Slug</label>
                                            <input
                                                type="text"
                                                value={slug}
                                                onChange={(e) => setSlug(e.target.value)}
                                                placeholder="article-slug-here"
                                                className="w-full bg-theme-input border border-theme-border rounded-xl px-3 py-2 text-xs font-bold mt-1 text-theme-primary outline-none focus:border-theme-border/80"
                                            />
                                        </div>

                                        <div>
                                            <label className="text-[10px] font-black uppercase text-theme-muted tracking-wider ml-1">Hero Subtitle</label>
                                            <input
                                                type="text"
                                                value={heroSubtitle}
                                                onChange={(e) => setHeroSubtitle(e.target.value)}
                                                placeholder="Subheading below title..."
                                                className="w-full bg-theme-input border border-theme-border rounded-xl px-3 py-2 text-xs font-bold mt-1 text-theme-primary outline-none focus:border-theme-border/80"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="text-[10px] font-black uppercase text-theme-muted tracking-wider ml-1">Short Summary</label>
                                        <textarea
                                            value={shortSummary}
                                            onChange={(e) => setShortSummary(e.target.value)}
                                            placeholder="บทคัดย่อ/ข้อมูลนำเรื่องเชิงลึก..."
                                            className="w-full min-h-[80px] bg-theme-input border border-theme-border rounded-xl p-3 text-xs font-bold mt-1 text-theme-primary outline-none focus:border-theme-border/80"
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-[10px] font-black uppercase text-theme-muted tracking-wider ml-1">Meta Title</label>
                                            <input
                                                type="text"
                                                value={metaTitle}
                                                onChange={(e) => setMetaTitle(e.target.value)}
                                                placeholder="SEO Search result title..."
                                                className="w-full bg-theme-input border border-theme-border rounded-xl px-3 py-2 text-xs font-bold mt-1 text-theme-primary outline-none focus:border-theme-border/80"
                                            />
                                        </div>

                                        <div>
                                            <label className="text-[10px] font-black uppercase text-theme-muted tracking-wider ml-1">Keywords</label>
                                            <input
                                                type="text"
                                                value={keywords}
                                                onChange={(e) => setKeywords(e.target.value)}
                                                placeholder="Keywords separated by comma..."
                                                className="w-full bg-theme-input border border-theme-border rounded-xl px-3 py-2 text-xs font-bold mt-1 text-theme-primary outline-none focus:border-theme-border/80"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="text-[10px] font-black uppercase text-theme-muted tracking-wider ml-1">Meta Description</label>
                                        <textarea
                                            value={metaDescription}
                                            onChange={(e) => setMetaDescription(e.target.value)}
                                            placeholder="SEO Description shown on search results..."
                                            className="w-full min-h-[80px] bg-theme-input border border-theme-border rounded-xl p-3 text-xs font-bold mt-1 text-theme-primary outline-none focus:border-theme-border/80"
                                        />
                                    </div>
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
                                        disabled={isReviewing || !articleBodyMarkdown}
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
        </div>
    );
}
