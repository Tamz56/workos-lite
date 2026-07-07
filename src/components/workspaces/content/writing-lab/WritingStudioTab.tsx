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
    Wand2,
    BarChart2
} from "lucide-react";
import { validatePayload } from "@/lib/arborInboxSchema";
import ArticleCommandPanel from "@/components/workspaces/content/writing-lab/ArticleCommandPanel";
import { parseProjectMetadata, ASSET_TYPE_LABELS, ASSET_TYPE_COLORS, getCleanDisplayTitle } from "@/lib/projectMetadata";

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

type SubTabKey = "narrative" | "knowledge" | "social" | "seo" | "work_checklist" | "utm" | "performance" | "review";
type ArticleMode = "narrative" | "knowledge";
type PackageTargetTab = "SEO & Website Fields" | "Social Drafts" | "UTM / Publish" | "Schema";

interface PackageFieldPreview {
    key: string;
    label: string;
    targetTab: PackageTargetTab;
    value: string;
    existingValue: string;
    willOverwrite: boolean;
}

interface PackageExtractionPreview {
    sourceMode: ArticleMode;
    fields: PackageFieldPreview[];
    cleanBody: string;
    removedSectionsCount: number;
}

const WORK_CHECKLIST_GROUPS = [
    {
        title: "Article Body",
        items: [
            "วางเนื้อหา Narrative Article หรือ Knowledge Article ให้ถูก tab",
            "ตรวจ heading, markdown image positions, captions และ references",
            "แยก SEO fields, schema, UTM และ social posts ออกจาก article body"
        ]
    },
    {
        title: "Website Fields",
        items: [
            "เติม Title, Slug, Hero Subtitle และ Short Summary",
            "เติม Meta Title, Meta Description, Keywords และ Cover Image URL",
            "ตรวจ Internal Links และสถานะบทความก่อนส่งขึ้นเว็บ"
        ]
    },
    {
        title: "Images",
        items: [
            "ใส่ตำแหน่งภาพใน markdown เช่น K01 / N01",
            "เติม caption และ image URL ให้ตรงกับบทความ",
            "ตรวจภาพว่าไม่สื่อสารเกินจริงหรือขัด Green Fineness tone"
        ]
    },
    {
        title: "Schema",
        items: [
            "เตรียม Schema / JSON-LD ใน Website Fields",
            "ตรวจชนิดบทความและข้อมูล author/source ให้ครบ",
            "หลีกเลี่ยง claim ที่แรงเกินหลักฐาน"
        ]
    },
    {
        title: "Social Drafts",
        items: [
            "เตรียม Facebook Group, Facebook Page และ Personal Post",
            "เติม Short Caption, Reference Note และ Hashtags ถ้าจำเป็น",
            "ปรับโทนให้เหมาะกับแต่ละช่องทาง"
        ]
    },
    {
        title: "UTM / Publish",
        items: [
            "เติม Published URL และ Campaign Name",
            "Generate / ตรวจ UTM links",
            "บันทึก publish status, publish log และ post URLs"
        ]
    },
    {
        title: "Performance / Feedback",
        items: [
            "เติม Facebook Snapshot และ GA4 note",
            "บันทึก reach, engagement, comments และ shares",
            "สรุป interpretation และ next decision"
        ]
    }
];

const PASTE_GUIDANCE: Record<SubTabKey, { title: string; body: string; items: string[] }> = {
    narrative: {
        title: "What to paste here",
        body: "วางเฉพาะเนื้อหา narrative/story article body markdown ที่นี่ และเก็บ website fields, schema, UTM, social posts ไว้ใน tab แยก",
        items: [
            "Narrative article body",
            "Markdown image positions",
            "Captions",
            "Story references / source notes"
        ]
    },
    knowledge: {
        title: "What to paste here",
        body: "วางเฉพาะ article body markdown ที่นี่ ห้ามปะปน SEO fields, schema, UTM หรือ social posts",
        items: [
            "Article body",
            "Markdown image positions",
            "Captions",
            "References"
        ]
    },
    social: {
        title: "What to paste here",
        body: "วาง draft สำหรับ social distribution แยกตามช่องทาง เพื่อให้ copy/publish ต่อได้ง่าย",
        items: [
            "Facebook Group Post",
            "Facebook Page Post",
            "Personal Post",
            "Short Caption",
            "Reference Note",
            "Hashtags if needed"
        ]
    },
    seo: {
        title: "What to paste here",
        body: "วางข้อมูลหน้าเว็บและ SEO metadata เท่านั้น ไม่ต้องใส่ body article หรือ social posts",
        items: [
            "Title",
            "Slug",
            "Hero Subtitle",
            "Short Summary",
            "Meta Title",
            "Meta Description",
            "Keywords",
            "Cover Image URL",
            "Internal Links"
        ]
    },
    work_checklist: {
        title: "How to use this checklist",
        body: "ใช้ tab นี้เป็นจุดตรวจงานของ article package ปัจจุบัน ก่อนส่งต่อ review หรือ publish",
        items: [
            "เช็กว่าแต่ละส่วนถูกวางใน tab ที่ถูกต้อง",
            "ไล่ทำจาก Article Body ไปจนถึง Performance / Feedback",
            "กลับไปเติม tab ที่ยังขาดก่อนกด Save หรือ Review"
        ]
    },
    utm: {
        title: "What to paste here",
        body: "วางข้อมูลการเผยแพร่จริงและลิงก์ติดตามผล หลังบทความหรือโพสต์พร้อม publish",
        items: [
            "Published URL",
            "UTM links",
            "Publish status",
            "Publish log",
            "Post URLs",
            "Initial performance note"
        ]
    },
    performance: {
        title: "What to paste here",
        body: "วางข้อมูลผลลัพธ์หลังเผยแพร่ เพื่อให้ตัดสินใจต่อยอดคอนเทนต์ได้แม่นขึ้น",
        items: [
            "Facebook Snapshot",
            "GA4 note",
            "reach / engagement / comments / shares",
            "interpretation",
            "next decision"
        ]
    },
    review: {
        title: "What to check here",
        body: "ใช้ส่วนนี้ตรวจความพร้อมและความเสี่ยงก่อนเผยแพร่หรือก่อนส่งงานต่อ",
        items: [
            "claim risk",
            "tone",
            "image placement",
            "SEO completeness",
            "schema readiness",
            "social readiness"
        ]
    }
};

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

    // Standard Metadata states
    const [episodeCode, setEpisodeCode] = useState("");
    const [canonicalTitle, setCanonicalTitle] = useState("");
    const [assetType, setAssetType] = useState<string>("unknown");
    const [contentFamily, setContentFamily] = useState("");
    const [contentLayer, setContentLayer] = useState("");
    const [legacyId, setLegacyId] = useState("");
    const [sourceLocation, setSourceLocation] = useState("");
    const [migrationStatus, setMigrationStatus] = useState("");

    // Horizontal tab selector
    const [seoMode, setSeoMode] = useState<"narrative" | "knowledge" | "metadata">("narrative");

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

    // 1. Publishing Record
    const [publishedDate, setPublishedDate] = useState("");
    const [facebookGroupUrl, setFacebookGroupUrl] = useState("");
    const [facebookPageUrl, setFacebookPageUrl] = useState("");
    const [personalPostUrl, setPersonalPostUrl] = useState("");
    const [utmCampaign, setUtmCampaign] = useState("");
    const [publishStatus, setPublishStatus] = useState("Draft");

    const createEmptyFacebookSnapshot = (windowKey: string) => ({
        snapshotDate: "",
        window: windowKey,
        platform: "facebook_page",
        postUrl: "",
        publishedDate: "",
        reach: "",
        reactions: "",
        comments: "",
        shares: "",
        linkClicks: "",
        saves: "",
        notableComments: "",
        audienceQuestions: "",
        confusion: "",
        audienceLanguage: "",
        notes: "",
        isMistake: false,
        correctedAt: "",
        correctionNote: "",
        isFallback: false,
        fallbackWindow: ""
    });

    const createEmptyGA4Snapshot = (windowKey: string) => ({
        snapshotDate: "",
        window: windowKey,
        publishedUrl: "",
        pageTitle: "",
        views: "",
        activeUsers: "",
        events: "",
        averageEngagementTime: "",
        bounceRate: "",
        sourceMedium: "",
        organicUsers: "",
        referralUsers: "",
        notes: "",
        isFallback: false,
        fallbackWindow: ""
    });

    // 2. Feedback Snapshots
    const createEmptySnapshot = () => ({
        snapshotDate: "",
        views: "",
        users: "",
        events: "",
        engagementTime: "",
        sourceMedium: "",
        fbReach: "",
        fbReactions: "",
        fbComments: "",
        fbShares: "",
        fbClicks: "",
        notes: ""
    });
    const [snapshot24h, setSnapshot24h] = useState(createEmptySnapshot());
    const [snapshot7d, setSnapshot7d] = useState(createEmptySnapshot());
    const [snapshot30d, setSnapshot30d] = useState(createEmptySnapshot());

    const [fbActiveSnap, setFbActiveSnap] = useState<"12h" | "24h" | "7d" | "30d" | "90d">("12h");
    const [ga4ActiveSnap, setGa4ActiveSnap] = useState<"12h" | "24h" | "7d" | "30d" | "90d">("12h");

    // New Facebook Snapshots
    const [fbSnap12h, setFbSnap12h] = useState(createEmptyFacebookSnapshot("12h"));
    const [fbSnap24h, setFbSnap24h] = useState(createEmptyFacebookSnapshot("24h"));
    const [fbSnap7d, setFbSnap7d] = useState(createEmptyFacebookSnapshot("7d"));
    const [fbSnap30d, setFbSnap30d] = useState(createEmptyFacebookSnapshot("30d"));
    const [fbSnap90d, setFbSnap90d] = useState(createEmptyFacebookSnapshot("90d"));
    const [fbSourceMetadata, setFbSourceMetadata] = useState<any>({});

    // New GA4 Snapshots
    const [ga4Snap12h, setGa4Snap12h] = useState(createEmptyGA4Snapshot("12h"));
    const [ga4Snap24h, setGa4Snap24h] = useState(createEmptyGA4Snapshot("24h"));
    const [ga4Snap7d, setGa4Snap7d] = useState(createEmptyGA4Snapshot("7d"));
    const [ga4Snap30d, setGa4Snap30d] = useState(createEmptyGA4Snapshot("30d"));
    const [ga4Snap90d, setGa4Snap90d] = useState(createEmptyGA4Snapshot("90d"));

    // Combined Analysis additional states
    const [performanceSummary, setPerformanceSummary] = useState("");
    const [distributionSignal, setDistributionSignal] = useState("");
    const [websiteSignal, setWebsiteSignal] = useState("");
    const [hookSignal, setHookSignal] = useState("");
    const [imageSignal, setImageSignal] = useState("");
    const [ctaSignal, setCtaSignal] = useState("");
    const [seoSignal, setSeoSignal] = useState("");
    const [commentSignal, setCommentSignal] = useState("");

    // 3. Notable Feedback
    const [notableComments, setNotableComments] = useState("");
    const [audienceQuestions, setAudienceQuestions] = useState("");
    const [misunderstanding, setMisunderstanding] = useState("");
    const [userLanguage, setUserLanguage] = useState("");
    const [followupTopic, setFollowupTopic] = useState("");

    // 4. Arbor Insight
    const [whatWorked, setWhatWorked] = useState("");
    const [whatDidNotWork, setWhatDidNotWork] = useState("");
    const [topicSignal, setTopicSignal] = useState("");
    const [trafficSignal, setTrafficSignal] = useState("");
    const [engagementSignal, setEngagementSignal] = useState("");
    const [repostPotential, setRepostPotential] = useState("");
    const [followupPotential, setFollowupPotential] = useState("");
    const [recommendedAction, setRecommendedAction] = useState("");

    // 5. Next Content Decision
    const [decision, setDecision] = useState("No action");
    const [decisionPriority, setDecisionPriority] = useState("Medium");
    const [decisionTargetDate, setDecisionTargetDate] = useState("");
    const [decisionNotes, setDecisionNotes] = useState("");

    // Handoff states
    const [copyPromptSuccess, setCopyPromptSuccess] = useState(false);
    const [copyGFAdminSuccess, setCopyGFAdminSuccess] = useState(false);

    // WorkOS Handoff Package states
    const [isWorkOSModalOpen, setIsWorkOSModalOpen] = useState(false);
    const [generatedPackageText, setGeneratedPackageText] = useState("");
    const [copyPackageSuccess, setCopyPackageSuccess] = useState(false);
    const [validationErrors, setValidationErrors] = useState<string[]>([]);
    const [validationWarnings, setValidationWarnings] = useState<string[]>([]);
    const [isPackageValid, setIsPackageValid] = useState(true);
    const [packagePreview, setPackagePreview] = useState<PackageExtractionPreview | null>(null);
    const [shouldCleanExtractedBody, setShouldCleanExtractedBody] = useState(true);

    // Sync state when activeProject changes
    useEffect(() => {
        if (activeProject) {
            const meta = parseProjectMetadata(activeProject);
            setWorkingTitle(meta.canonicalTitle || activeProject.title || "");
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

            setEpisodeCode(meta.episodeCode || "");
            setCanonicalTitle(meta.canonicalTitle || meta.originalTitle || "");
            setAssetType(meta.assetType || "unknown");
            setContentFamily(meta.contentFamily || "");
            setContentLayer(meta.contentLayer || "");
            setLegacyId(meta.legacyId || "");
            setSourceLocation(meta.sourceLocation || "");
            setMigrationStatus(meta.migrationStatus || "");

            let legacyHeroSub = "";
            let pubUrl = "";
            let campName = "";

            let pubDate = "";
            let fbGroupUrl = "";
            let fbPageUrl = "";
            let personalUrl = "";
            let utmCamp = "";
            let pubStatus = "Draft";

            let s24 = { snapshotDate: "", views: "", users: "", events: "", engagementTime: "", sourceMedium: "", fbReach: "", fbReactions: "", fbComments: "", fbShares: "", fbClicks: "", notes: "" };
            let s7 = { snapshotDate: "", views: "", users: "", events: "", engagementTime: "", sourceMedium: "", fbReach: "", fbReactions: "", fbComments: "", fbShares: "", fbClicks: "", notes: "" };
            let s30 = { snapshotDate: "", views: "", users: "", events: "", engagementTime: "", sourceMedium: "", fbReach: "", fbReactions: "", fbComments: "", fbShares: "", fbClicks: "", notes: "" };
            let notable = { comments: "", questions: "", confusion: "", language: "", followupTopic: "" };
            let insight = { whatWorked: "", whatDidNotWork: "", topicSignal: "", trafficSignal: "", engagementSignal: "", repostPotential: "", followupPotential: "", recommendedAction: "" };
            let nextDec = { decision: "No action", priority: "Medium", targetDate: "", notes: "" };
            let reviewRes: any = null;

            let fb12 = createEmptyFacebookSnapshot("12h");
            let fb24 = createEmptyFacebookSnapshot("24h");
            let fb7 = createEmptyFacebookSnapshot("7d");
            let fb30 = createEmptyFacebookSnapshot("30d");
            let fb90 = createEmptyFacebookSnapshot("90d");
            let ga12 = createEmptyGA4Snapshot("12h");
            let ga24 = createEmptyGA4Snapshot("24h");
            let ga7 = createEmptyGA4Snapshot("7d");
            let ga30 = createEmptyGA4Snapshot("30d");
            let ga90 = createEmptyGA4Snapshot("90d");

            let combSummary = "", combDistSig = "", combWebSig = "", combHookSig = "", combImgSig = "", combCtaSig = "", combSeoSig = "", combCommSig = "";

            if (activeProject.notes) {
                try {
                    const parsed = JSON.parse(activeProject.notes);
                    legacyHeroSub = parsed.hero_subtitle || "";
                    pubUrl = parsed.published_url || "";
                    campName = parsed.campaign_name || "";
                    const pf = parsed.performanceFeedback;
                    if (pf) {
                        const pr = pf.publishingRecord || {};
                        pubDate = pr.publishedDate || "";
                        fbGroupUrl = pr.facebookGroupUrl || "";
                        fbPageUrl = pr.facebookPageUrl || "";
                        personalUrl = pr.personalPostUrl || "";
                        utmCamp = pr.utmCampaign || "";
                        pubStatus = pr.publishStatus || "Draft";

                        const snaps = pf.snapshots || {};
                        if (snaps.snap24h) s24 = { ...s24, ...snaps.snap24h };
                        if (snaps.snap7d) s7 = { ...s7, ...snaps.snap7d };
                        if (snaps.snap30d) s30 = { ...s30, ...snaps.snap30d };
                        if (pf.notableFeedback) notable = { ...notable, ...pf.notableFeedback };
                        if (pf.arborInsight) insight = { ...insight, ...pf.arborInsight };
                        if (pf.nextDecision) nextDec = { ...nextDec, ...pf.nextDecision };
                        if (pf.arborReview) reviewRes = pf.arborReview;

                        const fbSnaps = pf.facebookSnapshots || {};
                        
                        // Resolve latest Facebook snapshot as a fallback
                        let latestFbFallback: any = null;
                        let latestFbDate = "";
                        Object.keys(fbSnaps).forEach(k => {
                            const snap = fbSnaps[k];
                            if (snap && snap.snapshotDate && (!latestFbDate || snap.snapshotDate > latestFbDate)) {
                                latestFbDate = snap.snapshotDate;
                                latestFbFallback = snap;
                            }
                        });
                        if (!latestFbFallback && snaps) {
                            Object.keys(snaps).forEach(k => {
                                const snap = snaps[k];
                                if (snap && snap.snapshotDate && (!latestFbDate || snap.snapshotDate > latestFbDate)) {
                                    latestFbDate = snap.snapshotDate;
                                    latestFbFallback = {
                                        snapshotDate: snap.snapshotDate,
                                        platform: snap.platform || "facebook_page",
                                        reach: snap.fbReach,
                                        reactions: snap.fbReactions,
                                        comments: snap.fbComments,
                                        shares: snap.fbShares,
                                        linkClicks: snap.fbClicks,
                                        notes: snap.notes
                                    };
                                }
                            });
                        }

                        const getFb = (w: string, leg: any) => {
                            const c = fbSnaps[w];
                            const hasExact = !!c && (c.reach !== undefined || c.reactions !== undefined || c.comments !== undefined || c.shares !== undefined);
                            const source = hasExact ? c : (latestFbFallback || {});
                            return {
                                snapshotDate: source.snapshotDate || leg.snapshotDate || "", 
                                window: w.replace("snap", ""),
                                platform: source.platform || "facebook_page", 
                                postUrl: source.postUrl || fbPageUrl || "",
                                publishedDate: source.publishedDate || pubDate || "", 
                                reach: source.reach ?? leg.fbReach ?? "",
                                reactions: source.reactions ?? leg.fbReactions ?? "", 
                                comments: source.comments ?? leg.fbComments ?? "",
                                shares: source.shares ?? leg.fbShares ?? "", 
                                linkClicks: source.linkClicks ?? leg.fbClicks ?? "",
                                saves: source.saves || "", 
                                notableComments: source.notableComments || "", 
                                audienceQuestions: source.audienceQuestions || "",
                                confusion: source.confusion || "", 
                                audienceLanguage: source.audienceLanguage || "", 
                                notes: source.notes || leg.notes || "",
                                isMistake: source.isMistake ?? false,
                                correctedAt: source.correctedAt || "",
                                correctionNote: source.correctionNote || "",
                                isFallback: !hasExact && !!latestFbFallback,
                                fallbackWindow: !hasExact && latestFbFallback ? (latestFbFallback.window || "") : ""
                            };
                        };

                        setFbSourceMetadata(pf.sourceMetadata || {});
                        fb12 = getFb("snap12h", snaps.snap12h || {});
                        fb24 = getFb("snap24h", snaps.snap24h || {});
                        fb7 = getFb("snap7d", snaps.snap7d || {});
                        fb30 = getFb("snap30d", snaps.snap30d || {});
                        fb90 = getFb("snap90d", {});

                        const ga4Snaps = pf.ga4Snapshots || {};
                        
                        // Resolve latest GA4 snapshot as a fallback
                        let latestGa4Fallback: any = null;
                        let latestGa4Date = "";
                        Object.keys(ga4Snaps).forEach(k => {
                            const snap = ga4Snaps[k];
                            if (snap && snap.snapshotDate && (!latestGa4Date || snap.snapshotDate > latestGa4Date)) {
                                latestGa4Date = snap.snapshotDate;
                                latestGa4Fallback = snap;
                            }
                        });
                        if (!latestGa4Fallback && snaps) {
                            Object.keys(snaps).forEach(k => {
                                const snap = snaps[k];
                                if (snap && snap.snapshotDate && (!latestGa4Date || snap.snapshotDate > latestGa4Date)) {
                                    latestGa4Date = snap.snapshotDate;
                                    latestGa4Fallback = {
                                        snapshotDate: snap.snapshotDate,
                                        views: snap.views,
                                        activeUsers: snap.users,
                                        events: snap.events,
                                        averageEngagementTime: snap.engagementTime,
                                        sourceMedium: snap.sourceMedium,
                                        notes: snap.notes
                                    };
                                }
                            });
                        }

                        const getGa4 = (w: string, leg: any) => {
                            const c = ga4Snaps[w];
                            const hasExact = !!c && (c.views !== undefined || c.activeUsers !== undefined || c.events !== undefined || c.averageEngagementTime !== undefined);
                            const source = hasExact ? c : (latestGa4Fallback || {});
                            return {
                                snapshotDate: source.snapshotDate || leg.snapshotDate || "", 
                                window: w.replace("snap", ""),
                                publishedUrl: source.publishedUrl || pubUrl || "", 
                                pageTitle: source.pageTitle || activeProject.title || "",
                                views: source.views ?? leg.views ?? "", 
                                activeUsers: source.activeUsers ?? leg.users ?? "",
                                events: source.events ?? leg.events ?? "", 
                                averageEngagementTime: source.averageEngagementTime ?? leg.engagementTime ?? "",
                                bounceRate: source.bounceRate || "", 
                                sourceMedium: source.sourceMedium || leg.sourceMedium || "",
                                organicUsers: source.organicUsers || "", 
                                referralUsers: source.referralUsers || "", 
                                notes: source.notes || leg.notes || "",
                                isFallback: !hasExact && !!latestGa4Fallback,
                                fallbackWindow: !hasExact && latestGa4Fallback ? (latestGa4Fallback.window || "") : ""
                            };
                        };

                        ga12 = getGa4("snap12h", snaps.snap12h || {});
                        ga24 = getGa4("snap24h", snaps.snap24h || {});
                        ga7 = getGa4("snap7d", snaps.snap7d || {});
                        ga30 = getGa4("snap30d", snaps.snap30d || {});
                        ga90 = getGa4("snap90d", {});

                        const comb = pf.combinedAnalysis || {};
                        combSummary = comb.performanceSummary || "";
                        combDistSig = comb.distributionSignal || "";
                        combWebSig = comb.websiteSignal || "";
                        combHookSig = comb.hookSignal || "";
                        combImgSig = comb.imageSignal || "";
                        combCtaSig = comb.ctaSignal || "";
                        combSeoSig = comb.seoSignal || "";
                        combCommSig = comb.commentSignal || "";

                        if (comb.topicSignal) insight.topicSignal = comb.topicSignal;
                        if (comb.whatWorked) insight.whatWorked = comb.whatWorked;
                        if (comb.whatDidNotWork) insight.whatDidNotWork = comb.whatDidNotWork;
                        if (comb.recommendedAction) insight.recommendedAction = comb.recommendedAction;
                        if (comb.nextDecision) nextDec = { ...nextDec, ...comb.nextDecision };
                    }
                } catch {}
            }
            setHeroSubtitle(legacyHeroSub);
            setPublishedUrl(pubUrl);
            setCampaignName(campName);
            setPublishedDate(pubDate);
            setFacebookGroupUrl(fbGroupUrl);
            setFacebookPageUrl(fbPageUrl);
            setPersonalPostUrl(personalUrl);
            setUtmCampaign(utmCamp);
            setPublishStatus(pubStatus);

            setSnapshot24h(s24);
            setSnapshot7d(s7);
            setSnapshot30d(s30);

            setFbSnap12h(fb12);
            setFbSnap24h(fb24);
            setFbSnap7d(fb7);
            setFbSnap30d(fb30);
            setFbSnap90d(fb90);

            setGa4Snap12h(ga12);
            setGa4Snap24h(ga24);
            setGa4Snap7d(ga7);
            setGa4Snap30d(ga30);
            setGa4Snap90d(ga90);

            setPerformanceSummary(combSummary);
            setDistributionSignal(combDistSig);
            setWebsiteSignal(combWebSig);
            setHookSignal(combHookSig);
            setImageSignal(combImgSig);
            setCtaSignal(combCtaSig);
            setSeoSignal(combSeoSig);
            setCommentSignal(combCommSig);

            setNotableComments(notable.comments);
            setAudienceQuestions(notable.questions);
            setMisunderstanding(notable.confusion);
            setUserLanguage(notable.language);
            setFollowupTopic(notable.followupTopic);

            setWhatWorked(insight.whatWorked);
            setWhatDidNotWork(insight.whatDidNotWork);
            setTopicSignal(insight.topicSignal);
            setTrafficSignal(insight.trafficSignal);
            setEngagementSignal(insight.engagementSignal);
            setRepostPotential(insight.repostPotential);
            setFollowupPotential(insight.followupPotential);
            setRecommendedAction(insight.recommendedAction);

            setDecision(nextDec.decision);
            setDecisionPriority(nextDec.priority);
            setDecisionTargetDate(nextDec.targetDate);
            setDecisionNotes(nextDec.notes);
            setReviewResult(reviewRes);

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
            // Parse existing notes to preserve other keys
            let parsedExistingNotes: any = {};
            if (activeProject.notes) {
                try {
                    parsedExistingNotes = JSON.parse(activeProject.notes);
                } catch {
                    // Fallback to preserve legacy plain text
                    parsedExistingNotes = {
                        legacyNotesText: activeProject.notes
                    };
                }
            }

            const extraNotes = JSON.stringify({
                ...parsedExistingNotes,
                hero_subtitle: heroSubtitle,
                published_url: publishedUrl,
                campaign_name: campaignName,
                episodeCode: episodeCode || undefined,
                canonicalTitle: canonicalTitle || undefined,
                assetType: assetType || undefined,
                contentFamily: contentFamily || undefined,
                contentLayer: contentLayer || undefined,
                legacyId: legacyId || undefined,
                sourceLocation: sourceLocation || undefined,
                migrationStatus: migrationStatus || undefined,
                
                performanceFeedback: {
                    publishingRecord: {
                        publishedUrl: publishedUrl,
                        publishedDate: publishedDate,
                        facebookGroupUrl: facebookGroupUrl,
                        facebookPageUrl: facebookPageUrl,
                        personalPostUrl: personalPostUrl,
                        utmCampaign: utmCampaign,
                        publishStatus: publishStatus
                    },
                    snapshots: {
                        snap12h: {
                            snapshotDate: ga4Snap12h.snapshotDate || fbSnap12h.snapshotDate || "",
                            views: ga4Snap12h.views || "",
                            users: ga4Snap12h.activeUsers || "",
                            events: ga4Snap12h.events || "",
                            engagementTime: ga4Snap12h.averageEngagementTime || "",
                            sourceMedium: ga4Snap12h.sourceMedium || "",
                            fbReach: fbSnap12h.reach || "",
                            fbReactions: fbSnap12h.reactions || "",
                            fbComments: fbSnap12h.comments || "",
                            fbShares: fbSnap12h.shares || "",
                            fbClicks: fbSnap12h.linkClicks || "",
                            notes: ga4Snap12h.notes || fbSnap12h.notes || ""
                        },
                        snap24h: {
                            snapshotDate: ga4Snap24h.snapshotDate || fbSnap24h.snapshotDate || "",
                            views: ga4Snap24h.views || "",
                            users: ga4Snap24h.activeUsers || "",
                            events: ga4Snap24h.events || "",
                            engagementTime: ga4Snap24h.averageEngagementTime || "",
                            sourceMedium: ga4Snap24h.sourceMedium || "",
                            fbReach: fbSnap24h.reach || "",
                            fbReactions: fbSnap24h.reactions || "",
                            fbComments: fbSnap24h.comments || "",
                            fbShares: fbSnap24h.shares || "",
                            fbClicks: fbSnap24h.linkClicks || "",
                            notes: ga4Snap24h.notes || fbSnap24h.notes || ""
                        },
                        snap7d: {
                            snapshotDate: ga4Snap7d.snapshotDate || fbSnap7d.snapshotDate || "",
                            views: ga4Snap7d.views || "",
                            users: ga4Snap7d.activeUsers || "",
                            events: ga4Snap7d.events || "",
                            engagementTime: ga4Snap7d.averageEngagementTime || "",
                            sourceMedium: ga4Snap7d.sourceMedium || "",
                            fbReach: fbSnap7d.reach || "",
                            fbReactions: fbSnap7d.reactions || "",
                            fbComments: fbSnap7d.comments || "",
                            fbShares: fbSnap7d.shares || "",
                            fbClicks: fbSnap7d.linkClicks || "",
                            notes: ga4Snap7d.notes || fbSnap7d.notes || ""
                        },
                        snap30d: {
                            snapshotDate: ga4Snap30d.snapshotDate || fbSnap30d.snapshotDate || "",
                            views: ga4Snap30d.views || "",
                            users: ga4Snap30d.activeUsers || "",
                            events: ga4Snap30d.events || "",
                            engagementTime: ga4Snap30d.averageEngagementTime || "",
                            sourceMedium: ga4Snap30d.sourceMedium || "",
                            fbReach: fbSnap30d.reach || "",
                            fbReactions: fbSnap30d.reactions || "",
                            fbComments: fbSnap30d.comments || "",
                            fbShares: fbSnap30d.shares || "",
                            fbClicks: fbSnap30d.linkClicks || "",
                            notes: ga4Snap30d.notes || fbSnap30d.notes || ""
                        }
                    },
                    facebookSnapshots: {
                        ...(parsedExistingNotes.performanceFeedback?.facebookSnapshots || {}),
                        snap12h: fbSnap12h,
                        snap24h: fbSnap24h,
                        snap7d: fbSnap7d,
                        snap30d: fbSnap30d,
                        snap90d: fbSnap90d
                    },
                    ga4Snapshots: {
                        ...(parsedExistingNotes.performanceFeedback?.ga4Snapshots || {}),
                        snap12h: ga4Snap12h,
                        snap24h: ga4Snap24h,
                        snap7d: ga4Snap7d,
                        snap30d: ga4Snap30d,
                        snap90d: ga4Snap90d
                    },
                    notableFeedback: {
                        comments: notableComments,
                        questions: audienceQuestions,
                        confusion: misunderstanding,
                        language: userLanguage,
                        followupTopic: followupTopic
                    },
                    arborInsight: {
                        whatWorked: whatWorked,
                        whatDidNotWork: whatDidNotWork,
                        topicSignal: topicSignal,
                        trafficSignal: trafficSignal,
                        engagementSignal: engagementSignal,
                        repostPotential: repostPotential,
                        followupPotential: followupPotential,
                        recommendedAction: recommendedAction
                    },
                    combinedAnalysis: {
                        performanceSummary: performanceSummary,
                        distributionSignal: distributionSignal,
                        websiteSignal: websiteSignal,
                        topicSignal: topicSignal,
                        hookSignal: hookSignal,
                        imageSignal: imageSignal,
                        ctaSignal: ctaSignal,
                        seoSignal: seoSignal,
                        commentSignal: commentSignal,
                        whatWorked: whatWorked,
                        whatDidNotWork: whatDidNotWork,
                        recommendedAction: recommendedAction,
                        nextDecision: {
                            decision: decision,
                            priority: decisionPriority,
                            targetDate: decisionTargetDate,
                            notes: decisionNotes
                        }
                    },
                    nextDecision: {
                        decision: decision,
                        priority: decisionPriority,
                        targetDate: decisionTargetDate,
                        notes: decisionNotes
                    },
                    arborReview: reviewResult,
                    sourceMetadata: fbSourceMetadata
                }
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

    const normalizeHeading = (value: string) => value
        .toLowerCase()
        .replace(/[`*_()[\]:]/g, "")
        .replace(/\s*\/\s*/g, " / ")
        .replace(/\s+/g, " ")
        .trim();

    const normalizeKeywordField = (value: string) => {
        const withKeywordSeparators = value
            .replace(/\r\n/g, "\n")
            .replace(/(^|\n)\s*[-*•]\s+/g, "$1, ")
            .replace(/([^\s])\s*[-*•]\s+/g, "$1, ");

        const seen = new Set<string>();
        return withKeywordSeparators
            .split(/[,\n]+/)
            .map(item => item.trim())
            .filter(Boolean)
            .filter(item => {
                const key = item.toLowerCase();
                if (seen.has(key)) return false;
                seen.add(key);
                return true;
            })
            .join(", ");
    };

    const cleanPackageFieldValue = (value: string) => {
        const trimmed = value.trim();
        return /^\[(blank|empty|none|n\/a)\]$/i.test(trimmed) ? "" : trimmed;
    };

    const parsePackageFieldValues = (markdown: string) => {
        const supportedLabels = [
            "Article Title",
            "Title",
            "Slug",
            "Hero Subtitle",
            "Featured Image URL",
            "Primary Keyword",
            "Secondary Keywords",
            "Category",
            "Short Summary",
            "Short Summary / Excerpt",
            "Excerpt",
            "Meta Title",
            "SEO Meta Title",
            "Meta Description",
            "SEO Meta Description",
            "Keywords",
            "Internal Links",
            "Status",
            "Content Layer",
            "Series",
            "Episode",
            "Journey Stage",
            "Article Status",
            "Facebook Group Post",
            "Facebook Page Post",
            "Personal Post",
            "Short Caption",
            "Hashtags",
            "Published URL",
            "UTM Group",
            "UTM Page",
            "UTM Personal",
            "Publish Status",
            "Publish Log Note",
            "Schema / Custom JSON-LD",
            "Schema Notes"
        ];
        const labelKeys = new Map(supportedLabels.map(label => [normalizeHeading(label), label]));
        const lines = markdown.split(/\r?\n/);
        const sectionMap = new Map<string, string>();
        let currentLabel: string | null = null;
        let currentLines: string[] = [];

        const commitCurrent = () => {
            if (!currentLabel) return;
            const key = normalizeHeading(currentLabel);
            if (!sectionMap.has(key)) {
                sectionMap.set(key, cleanPackageFieldValue(currentLines.join("\n")));
            }
        };

        lines.forEach(line => {
            const headingMatch = line.match(/^(#{1,6})\s+(.+?)\s*$/);
            const candidateText = headingMatch ? headingMatch[2].trim() : line.trim();
            const matchedLabel = labelKeys.get(normalizeHeading(candidateText));

            if (matchedLabel) {
                commitCurrent();
                currentLabel = matchedLabel;
                currentLines = [];
                return;
            }

            if (headingMatch) {
                commitCurrent();
                currentLabel = null;
                currentLines = [];
                return;
            }

            if (currentLabel) {
                currentLines.push(line);
            }
        });

        commitCurrent();
        return sectionMap;
    };

    const parseMarkdownHeadingBlocks = (markdown: string) => {
        const lines = markdown.split(/\r?\n/);
        const blocks: { level: number; title: string; content: string; start: number; end: number }[] = [];
        let current: { level: number; title: string; start: number; contentLines: string[] } | null = null;

        for (let index = 0; index < lines.length; index += 1) {
            const line = lines[index];
            const match = line.match(/^(#{1,2})\s+(.+?)\s*$/);
            if (match) {
                if (current) {
                    blocks.push({
                        level: current.level,
                        title: current.title,
                        content: current.contentLines.join("\n").trim(),
                        start: current.start,
                        end: index - 1
                    });
                }
                current = {
                    level: match[1].length,
                    title: match[2].trim(),
                    start: index,
                    contentLines: []
                };
            } else if (current) {
                current.contentLines.push(line);
            }
        }

        if (current) {
            blocks.push({
                level: current.level,
                title: current.title,
                content: current.contentLines.join("\n").trim(),
                start: current.start,
                end: lines.length - 1
            });
        }

        return { lines, blocks };
    };

    const cleanExtractedPackageSections = (markdown: string) => {
        const { lines, blocks } = parseMarkdownHeadingBlocks(markdown);
        const packageSectionNames = new Set([
            "seo & website fields",
            "social drafts",
            "utm / publish",
            "schema / custom json-ld",
            "schema notes"
        ]);
        const removeRanges = blocks
            .filter(block => block.level === 1 && packageSectionNames.has(normalizeHeading(block.title)))
            .map(block => {
                const nextH1 = blocks.find(candidate => candidate.level === 1 && candidate.start > block.start);
                return {
                    start: block.start,
                    end: nextH1 ? nextH1.start - 1 : lines.length - 1
                };
            });

        if (removeRanges.length === 0) {
            return { cleanBody: markdown, removedSectionsCount: 0 };
        }

        const cleanBody = lines
            .filter((_, index) => !removeRanges.some(range => index >= range.start && index <= range.end))
            .join("\n")
            .replace(/\n{3,}/g, "\n\n")
            .trim();

        return { cleanBody, removedSectionsCount: removeRanges.length };
    };

    const cleanGeneratedSeoMetadataSection = (markdown: string) => {
        const { lines, blocks } = parseMarkdownHeadingBlocks(markdown);
        const metadataSectionNames = new Set([
            "seo & website fields",
            "clean field values — manual fill",
            "clean field values - manual fill"
        ]);
        const finalPackNames = new Set([
            "final article pack v1"
        ]);
        const articleBodyMarkers = new Set([
            "knowledge article body",
            "narrative article body",
            "article body"
        ]);

        const removeRanges = blocks
            .filter(block => {
                const normalizedTitle = normalizeHeading(block.title);
                if (block.level === 1 && metadataSectionNames.has(normalizedTitle)) return true;
                if (block.level !== 1 || !finalPackNames.has(normalizedTitle)) return false;

                const contentLabels = parsePackageFieldValues(block.content);
                if (contentLabels.size === 0) return false;

                return !block.content
                    .split(/\r?\n/)
                    .some(line => articleBodyMarkers.has(normalizeHeading(line.replace(/^#{1,6}\s+/, ""))));
            })
            .map(block => {
                const nextH1 = blocks.find(candidate => candidate.level === 1 && candidate.start > block.start);
                return {
                    start: block.start,
                    end: nextH1 ? nextH1.start - 1 : lines.length - 1
                };
            });

        if (removeRanges.length === 0) {
            return { cleanBody: markdown, removedSectionsCount: 0 };
        }

        const cleanBody = lines
            .filter((_, index) => !removeRanges.some(range => index >= range.start && index <= range.end))
            .join("\n")
            .replace(/\n{3,}/g, "\n\n")
            .trim();

        return { cleanBody, removedSectionsCount: removeRanges.length };
    };

    const buildPackageExtractionPreview = (sourceMode: ArticleMode): PackageExtractionPreview | null => {
        const sourceText = sourceMode === "narrative" ? narrativeBody : knowledgeBody;
        if (!sourceText.trim()) return null;

        const sectionMap = parsePackageFieldValues(sourceText);

        const getSection = (...names: string[]) => {
            for (const name of names) {
                const value = sectionMap.get(normalizeHeading(name));
                if (typeof value === "string") return value;
            }
            return "";
        };

        const selectedTitle = sourceMode === "narrative" ? narrativeTitle : knowledgeTitle;
        const selectedSlug = sourceMode === "narrative" ? narrativeSlug : knowledgeSlug;
        const selectedHeroSubtitle = sourceMode === "narrative" ? narrativeHeroSubtitle : knowledgeHeroSubtitle;
        const selectedFeaturedImageUrl = sourceMode === "narrative" ? narrativeFeaturedImageUrl : knowledgeFeaturedImageUrl;
        const selectedShortSummary = sourceMode === "narrative" ? narrativeShortSummary : knowledgeShortSummary;
        const selectedMetaTitle = sourceMode === "narrative" ? narrativeMetaTitle : knowledgeMetaTitle;
        const selectedMetaDescription = sourceMode === "narrative" ? narrativeMetaDescription : knowledgeMetaDescription;
        const selectedKeywords = sourceMode === "narrative" ? narrativeKeywords : knowledgeKeywords;
        const selectedSchema = sourceMode === "narrative" ? narrativeSchemaJsonld : knowledgeSchemaJsonld;
        const selectedStatus = sourceMode === "narrative" ? narrativeStatus : knowledgeStatus;
        const extractedKeywords = getSection("Keywords") || [getSection("Primary Keyword"), getSection("Secondary Keywords")]
            .filter(Boolean)
            .join(", ");

        const candidates: Array<Omit<PackageFieldPreview, "willOverwrite">> = [
            { key: "articleTitle", label: "Title", targetTab: "SEO & Website Fields", value: getSection("Article Title", "Title"), existingValue: selectedTitle },
            { key: "articleSlug", label: "Slug", targetTab: "SEO & Website Fields", value: getSection("Slug"), existingValue: selectedSlug },
            { key: "heroSubtitle", label: "Hero Subtitle", targetTab: "SEO & Website Fields", value: getSection("Hero Subtitle"), existingValue: selectedHeroSubtitle },
            { key: "featuredImageUrl", label: "Featured Image URL", targetTab: "SEO & Website Fields", value: getSection("Featured Image URL"), existingValue: selectedFeaturedImageUrl },
            { key: "shortSummary", label: "Short Summary / Excerpt", targetTab: "SEO & Website Fields", value: getSection("Short Summary / Excerpt", "Short Summary", "Excerpt"), existingValue: selectedShortSummary },
            { key: "metaTitle", label: "Meta Title", targetTab: "SEO & Website Fields", value: getSection("SEO Meta Title", "Meta Title"), existingValue: selectedMetaTitle },
            { key: "metaDescription", label: "Meta Description", targetTab: "SEO & Website Fields", value: getSection("SEO Meta Description", "Meta Description"), existingValue: selectedMetaDescription },
            { key: "keywords", label: "Keywords", targetTab: "SEO & Website Fields", value: extractedKeywords, existingValue: selectedKeywords },
            { key: "knowledgePrimaryKeyword", label: "Primary Keyword", targetTab: "SEO & Website Fields", value: getSection("Primary Keyword"), existingValue: sourceMode === "knowledge" ? knowledgePrimaryKeyword : "" },
            { key: "knowledgeSecondaryKeywords", label: "Secondary Keywords", targetTab: "SEO & Website Fields", value: getSection("Secondary Keywords"), existingValue: sourceMode === "knowledge" ? knowledgeSecondaryKeywords : "" },
            { key: "knowledgeCategory", label: "Category", targetTab: "SEO & Website Fields", value: getSection("Category"), existingValue: sourceMode === "knowledge" ? knowledgeCategory : "" },
            { key: "contentLayer", label: "Content Layer", targetTab: "SEO & Website Fields", value: getSection("Content Layer"), existingValue: contentLayer },
            { key: "contentFamily", label: "Series", targetTab: "SEO & Website Fields", value: getSection("Series"), existingValue: contentFamily },
            { key: "episodeCode", label: "Episode", targetTab: "SEO & Website Fields", value: getSection("Episode"), existingValue: episodeCode },
            { key: "journeyStage", label: "Journey Stage", targetTab: "SEO & Website Fields", value: getSection("Journey Stage"), existingValue: sourceMode === "narrative" ? narrativeJourneyStage : "" },
            { key: "articleStatus", label: "Article Status", targetTab: "SEO & Website Fields", value: getSection("Article Status", "Status"), existingValue: selectedStatus },
            { key: "facebookGroupPost", label: "Facebook Group Post", targetTab: "Social Drafts", value: getSection("Facebook Group Post"), existingValue: facebookGroupPost },
            { key: "facebookPagePost", label: "Facebook Page Post", targetTab: "Social Drafts", value: getSection("Facebook Page Post"), existingValue: facebookPagePost },
            { key: "personalPost", label: "Personal Post", targetTab: "Social Drafts", value: getSection("Personal Post"), existingValue: personalPost },
            { key: "shortCaption", label: "Short Caption", targetTab: "Social Drafts", value: getSection("Short Caption"), existingValue: shortCaption },
            { key: "hashtags", label: "Hashtags", targetTab: "Social Drafts", value: getSection("Hashtags"), existingValue: hashtags },
            { key: "publishedUrl", label: "Published URL", targetTab: "UTM / Publish", value: getSection("Published URL"), existingValue: publishedUrl },
            { key: "groupUtm", label: "UTM Group", targetTab: "UTM / Publish", value: getSection("UTM Group"), existingValue: groupUtm },
            { key: "pageUtm", label: "UTM Page", targetTab: "UTM / Publish", value: getSection("UTM Page"), existingValue: pageUtm },
            { key: "personalUtm", label: "UTM Personal", targetTab: "UTM / Publish", value: getSection("UTM Personal"), existingValue: personalUtm },
            { key: "publishStatus", label: "Publish Status", targetTab: "UTM / Publish", value: getSection("Publish Status"), existingValue: publishStatus },
            { key: "performanceSummary", label: "Publish Log Note", targetTab: "UTM / Publish", value: getSection("Publish Log Note"), existingValue: performanceSummary },
            { key: "schemaJsonld", label: "Schema / Custom JSON-LD", targetTab: "Schema", value: getSection("Schema / Custom JSON-LD", "Schema Notes"), existingValue: selectedSchema }
        ];

        const keywordFieldKeys = new Set(["keywords", "knowledgePrimaryKeyword", "knowledgeSecondaryKeywords", "hashtags"]);
        const fields = candidates
            .filter(field => field.value.trim())
            .filter(field => sourceMode === "knowledge" || !["knowledgePrimaryKeyword", "knowledgeSecondaryKeywords", "knowledgeCategory"].includes(field.key))
            .filter(field => sourceMode === "narrative" || field.key !== "journeyStage")
            .map(field => {
                const value = keywordFieldKeys.has(field.key)
                    ? normalizeKeywordField(field.value)
                    : field.value.trim();
                return {
                    ...field,
                    value,
                    willOverwrite: !!field.existingValue.trim() && field.existingValue.trim() !== value
                };
            });

        const { cleanBody, removedSectionsCount } = cleanExtractedPackageSections(sourceText);
        return { sourceMode, fields, cleanBody, removedSectionsCount };
    };

    const handleExtractPackageFields = () => {
        const sourceMode: ArticleMode = subTab === "narrative"
            ? "narrative"
            : subTab === "knowledge"
                ? "knowledge"
                : seoMode === "narrative"
                    ? "narrative"
                    : "knowledge";
        const preview = buildPackageExtractionPreview(sourceMode);
        if (!preview || preview.fields.length === 0) {
            alert("ยังไม่พบ section ที่รองรับใน article package นี้");
            return;
        }
        setPackagePreview(preview);
        setShouldCleanExtractedBody(preview.removedSectionsCount > 0);
    };

    const applyPackageField = (field: PackageFieldPreview, sourceMode: ArticleMode) => {
        const value = field.value;
        switch (field.key) {
            case "articleTitle":
                sourceMode === "narrative" ? setNarrativeTitle(value) : setKnowledgeTitle(value);
                break;
            case "articleSlug":
                sourceMode === "narrative" ? setNarrativeSlug(value) : setKnowledgeSlug(value);
                break;
            case "heroSubtitle":
                sourceMode === "narrative" ? setNarrativeHeroSubtitle(value) : setKnowledgeHeroSubtitle(value);
                break;
            case "featuredImageUrl":
                if (sourceMode === "narrative") {
                    setNarrativeFeaturedImageUrl(value);
                } else {
                    setKnowledgeFeaturedImageUrl(value);
                }
                break;
            case "shortSummary":
                sourceMode === "narrative" ? setNarrativeShortSummary(value) : setKnowledgeShortSummary(value);
                break;
            case "metaTitle":
                sourceMode === "narrative" ? setNarrativeMetaTitle(value) : setKnowledgeMetaTitle(value);
                break;
            case "metaDescription":
                sourceMode === "narrative" ? setNarrativeMetaDescription(value) : setKnowledgeMetaDescription(value);
                break;
            case "keywords":
                sourceMode === "narrative" ? setNarrativeKeywords(value) : setKnowledgeKeywords(value);
                break;
            case "knowledgePrimaryKeyword":
                setKnowledgePrimaryKeyword(value);
                break;
            case "knowledgeSecondaryKeywords":
                setKnowledgeSecondaryKeywords(value);
                break;
            case "knowledgeCategory":
                setKnowledgeCategory(value);
                break;
            case "contentLayer":
                setContentLayer(value);
                break;
            case "contentFamily":
                setContentFamily(value);
                break;
            case "episodeCode":
                setEpisodeCode(value);
                break;
            case "journeyStage":
                setNarrativeJourneyStage(value);
                break;
            case "articleStatus":
                sourceMode === "narrative" ? setNarrativeStatus(value) : setKnowledgeStatus(value);
                break;
            case "facebookGroupPost":
                setFacebookGroupPost(value);
                break;
            case "facebookPagePost":
                setFacebookPagePost(value);
                break;
            case "personalPost":
                setPersonalPost(value);
                break;
            case "shortCaption":
                setShortCaption(value);
                break;
            case "hashtags":
                setHashtags(value);
                break;
            case "publishedUrl":
                setPublishedUrl(value);
                break;
            case "groupUtm":
                setGroupUtm(value);
                break;
            case "pageUtm":
                setPageUtm(value);
                break;
            case "personalUtm":
                setPersonalUtm(value);
                break;
            case "publishStatus":
                setPublishStatus(value);
                break;
            case "performanceSummary":
                setPerformanceSummary(value);
                break;
            case "schemaJsonld":
                sourceMode === "narrative" ? setNarrativeSchemaJsonld(value) : setKnowledgeSchemaJsonld(value);
                break;
        }
    };

    const handleApplyPackageFields = () => {
        if (!packagePreview) return;
        packagePreview.fields.forEach(field => applyPackageField(field, packagePreview.sourceMode));
        if (shouldCleanExtractedBody) {
            if (packagePreview.sourceMode === "narrative") {
                setNarrativeBody(packagePreview.cleanBody);
            } else {
                setKnowledgeBody(packagePreview.cleanBody);
            }
        }
        setPackagePreview(null);
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

        const parsedSeoFields = parsePackageFieldValues(sourceText);
        const getParsedSeoField = (...names: string[]) => {
            for (const name of names) {
                const value = parsedSeoFields.get(normalizeHeading(name));
                if (typeof value === "string") return value;
            }
            return "";
        };
        const hasParsedSeoFields = [
            "Article Title",
            "Title",
            "Slug",
            "Hero Subtitle",
            "Featured Image URL",
            "Primary Keyword",
            "Secondary Keywords",
            "Category",
            "Short Summary",
            "Short Summary / Excerpt",
            "Excerpt",
            "Meta Title",
            "SEO Meta Title",
            "Meta Description",
            "SEO Meta Description",
            "Keywords",
            "Status"
        ].some(label => parsedSeoFields.has(normalizeHeading(label)));

        if (hasParsedSeoFields) {
            const parsedTitle = getParsedSeoField("Article Title", "Title");
            const parsedSlug = getParsedSeoField("Slug");
            const parsedHeroSubtitle = getParsedSeoField("Hero Subtitle");
            const parsedFeaturedImageUrl = getParsedSeoField("Featured Image URL");
            const parsedShortSummary = getParsedSeoField("Short Summary / Excerpt", "Short Summary", "Excerpt");
            const parsedMetaTitle = getParsedSeoField("SEO Meta Title", "Meta Title");
            const parsedMetaDescription = getParsedSeoField("SEO Meta Description", "Meta Description");
            const parsedPrimaryKeyword = getParsedSeoField("Primary Keyword");
            const parsedSecondaryKeywords = getParsedSeoField("Secondary Keywords");
            const parsedKeywords = getParsedSeoField("Keywords") || [parsedPrimaryKeyword, parsedSecondaryKeywords].filter(Boolean).join(", ");
            const parsedStatus = getParsedSeoField("Status", "Article Status");
            const normalizedKeywords = normalizeKeywordField(parsedKeywords);

            if (isNarrative) {
                if (parsedTitle) setNarrativeTitle(parsedTitle);
                if (parsedSlug) setNarrativeSlug(parsedSlug);
                if (parsedHeroSubtitle) setNarrativeHeroSubtitle(parsedHeroSubtitle);
                if (parsedFeaturedImageUrl) setNarrativeFeaturedImageUrl(parsedFeaturedImageUrl);
                if (parsedShortSummary) setNarrativeShortSummary(parsedShortSummary);
                if (parsedMetaTitle) setNarrativeMetaTitle(parsedMetaTitle);
                if (parsedMetaDescription) setNarrativeMetaDescription(parsedMetaDescription);
                if (normalizedKeywords) setNarrativeKeywords(normalizedKeywords);
                if (parsedStatus) setNarrativeStatus(parsedStatus);
            } else {
                if (parsedTitle) setKnowledgeTitle(parsedTitle);
                if (parsedSlug) setKnowledgeSlug(parsedSlug);
                if (parsedHeroSubtitle) setKnowledgeHeroSubtitle(parsedHeroSubtitle);
                if (parsedFeaturedImageUrl) setKnowledgeFeaturedImageUrl(parsedFeaturedImageUrl);
                if (parsedShortSummary) setKnowledgeShortSummary(parsedShortSummary);
                if (parsedMetaTitle) setKnowledgeMetaTitle(parsedMetaTitle);
                if (parsedMetaDescription) setKnowledgeMetaDescription(parsedMetaDescription);
                if (normalizedKeywords) setKnowledgeKeywords(normalizedKeywords);
                if (parsedPrimaryKeyword) setKnowledgePrimaryKeyword(normalizeKeywordField(parsedPrimaryKeyword));
                if (parsedSecondaryKeywords) setKnowledgeSecondaryKeywords(normalizeKeywordField(parsedSecondaryKeywords));
                const parsedCategory = getParsedSeoField("Category");
                if (parsedCategory) setKnowledgeCategory(parsedCategory);
                if (parsedStatus) setKnowledgeStatus(parsedStatus);
            }

            const { cleanBody, removedSectionsCount } = cleanGeneratedSeoMetadataSection(sourceText);
            if (removedSectionsCount > 0 && cleanBody !== sourceText) {
                const shouldRemoveSeoBlock = window.confirm("SEO fields were generated. Remove the extracted SEO block from the article body?");
                if (shouldRemoveSeoBlock) {
                    if (isNarrative) {
                        setNarrativeBody(cleanBody);
                    } else {
                        setKnowledgeBody(cleanBody);
                    }
                }
            }
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

    const handleCopyGFAdminFields = () => {
        if (!activeProject) return;

        const hasKnowledgeData = !!(knowledgeTitle || knowledgeBody || activeProject.knowledge_title || activeProject.knowledge_body);
        const hasNarrativeData = !!(narrativeTitle || narrativeBody || activeProject.narrative_title || activeProject.narrative_body);
        const isKnowledgeOnly = hasKnowledgeData && !hasNarrativeData;

        // Map content type category
        let gfCategory = "บทความ";
        const mode = activeProject.writing_mode;
        const isKnowledgeCompanionOrOnly = (mode === "knowledge_article" || mode === "knowledge_journey_article") || hasKnowledgeData;
        
        if (isKnowledgeCompanionOrOnly) {
            gfCategory = "บทความ";
        } else if (mode === "journey_chapter") {
            gfCategory = "บันทึกต้นไม้";
        } else if (mode === "documentary_chapter") {
            gfCategory = "บันทึกภาคสนาม";
        } else if (mode === "writers_journal") {
            gfCategory = "ข้อคิดและการพินิจ";
        } else {
            gfCategory = "บทความ";
        }

        // topic เดิมที่ WorkOS ใช้ใน CATEGORY ให้ย้ายไปเป็น primary_topic
        const primary_topic = knowledgeCategory || activeProject.knowledge_category || "";

        // Map status (default = Draft)
        const rawStatus = knowledgeStatus || narrativeStatus || activeProject.knowledge_status || activeProject.narrative_status || activeProject.status || "draft";
        const status = rawStatus.toLowerCase() === "published" ? "Published" : "Draft";

        // Prioritize body selection
        const isPrioritizeKnowledge = (mode === "knowledge_article" || mode === "knowledge_journey_article") || isKnowledgeOnly || hasKnowledgeData;
        const body_content = isPrioritizeKnowledge
            ? (knowledgeBody || narrativeBody || activeProject.knowledge_body || activeProject.narrative_body || "")
            : (narrativeBody || knowledgeBody || activeProject.narrative_body || activeProject.knowledge_body || "");

        // Resolve slug (must be English URL-safe, not Thai title)
        const isRealSlug = (s: any): boolean => {
            if (!s || typeof s !== "string") return false;
            if (/[\u0e00-\u0e7f]/.test(s)) return false;
            return /^[a-zA-Z0-9-_]+$/.test(s.trim());
        };

        const resolvedSlug = [
            knowledgeSlug,
            narrativeSlug,
            activeProject.knowledge_slug,
            activeProject.narrative_slug,
            activeProject.slug,
            slug
        ].map(s => s || "").find(isRealSlug) || "";

        const adminFields = {
            article_title: knowledgeTitle || narrativeTitle || workingTitle || activeProject.knowledge_title || activeProject.narrative_title || activeProject.title || "",
            slug: resolvedSlug,
            category: gfCategory,
            primary_topic: primary_topic,
            status: status,
            hero_subtitle: knowledgeHeroSubtitle || narrativeHeroSubtitle || heroSubtitle || activeProject.knowledge_hero_subtitle || activeProject.narrative_hero_subtitle || "",
            featured_image_url: knowledgeFeaturedImageUrl || narrativeFeaturedImageUrl || activeProject.knowledge_featured_image_url || activeProject.narrative_featured_image_url || "",
            short_summary: knowledgeShortSummary || narrativeShortSummary || shortSummary || activeProject.knowledge_short_summary || activeProject.narrative_short_summary || activeProject.summary || "",
            body_content: body_content,
            meta_title: knowledgeMetaTitle || narrativeMetaTitle || metaTitle || activeProject.knowledge_meta_title || activeProject.narrative_meta_title || activeProject.meta_title || "",
            meta_description: knowledgeMetaDescription || narrativeMetaDescription || metaDescription || activeProject.knowledge_meta_description || activeProject.narrative_meta_description || activeProject.meta_description || "",
            primary_keyword: knowledgePrimaryKeyword || activeProject.knowledge_primary_keyword || "",
            secondary_keywords: knowledgeSecondaryKeywords || activeProject.knowledge_secondary_keywords || "",
            seo_keywords: knowledgeKeywords || narrativeKeywords || keywords || activeProject.knowledge_keywords || activeProject.narrative_keywords || activeProject.keywords || "",
            custom_json_ld: knowledgeSchemaJsonld || narrativeSchemaJsonld || activeProject.knowledge_schema_jsonld || activeProject.narrative_schema_jsonld || ""
        };

        const jsonString = JSON.stringify(adminFields, null, 2);
        navigator.clipboard.writeText(jsonString);

        setCopyGFAdminSuccess(true);
        setTimeout(() => setCopyGFAdminSuccess(false), 2000);
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

    const handleCopyInsightPrompt = () => {
        if (!activeProject) return;
        let prompt = `คุณคือ Arbor Insight Analyzer หน้าที่ของคุณคือการวิเคราะห์ประสิทธิภาพบทความ Green Fineness เพื่อสรุปข้อมูลและกำหนดทิศทางเนื้อหาถัดไป\n\n`;
        prompt += `หัวข้อบทความ: ${workingTitle}\n`;
        prompt += `Project ID หรือ Slug ของระบบ: ${activeProject.id} หรือ ${activeProject.slug || "N/A"}\n`;
        prompt += `ลิงก์ที่เผยแพร่:\n`;
        prompt += `- Website: ${publishedUrl || "N/A"}\n`;
        prompt += `- FB Group: ${facebookGroupUrl || "N/A"}\n`;
        prompt += `- FB Page: ${facebookPageUrl || "N/A"}\n`;
        prompt += `- Personal Profile: ${personalPostUrl || "N/A"}\n\n`;
        
        prompt += `--- สรุปตัวชี้วัดปัจจุบัน (Current Metrics Summary) ---\n`;
        prompt += `[Facebook Snapshots]\n`;
        prompt += `- 12h: Reach ${fbSnap12h.reach || 0} | Reactions ${fbSnap12h.reactions || 0} | Comments ${fbSnap12h.comments || 0} | Clicks ${fbSnap12h.linkClicks || 0}\n`;
        prompt += `- 24h: Reach ${fbSnap24h.reach || 0} | Reactions ${fbSnap24h.reactions || 0} | Comments ${fbSnap24h.comments || 0} | Clicks ${fbSnap24h.linkClicks || 0}\n`;
        prompt += `- 7d: Reach ${fbSnap7d.reach || 0} | Reactions ${fbSnap7d.reactions || 0} | Comments ${fbSnap7d.comments || 0} | Clicks ${fbSnap7d.linkClicks || 0}\n`;
        prompt += `- 30d: Reach ${fbSnap30d.reach || 0} | Reactions ${fbSnap30d.reactions || 0} | Comments ${fbSnap30d.comments || 0} | Clicks ${fbSnap30d.linkClicks || 0}\n`;
        prompt += `- 90d: Reach ${fbSnap90d.reach || 0} | Reactions ${fbSnap90d.reactions || 0} | Comments ${fbSnap90d.comments || 0} | Clicks ${fbSnap90d.linkClicks || 0}\n\n`;
        
        prompt += `[GA4 Snapshots]\n`;
        prompt += `- 12h: Views ${ga4Snap12h.views || 0} | Users ${ga4Snap12h.activeUsers || 0} | Avg Time ${ga4Snap12h.averageEngagementTime || 0}s\n`;
        prompt += `- 24h: Views ${ga4Snap24h.views || 0} | Users ${ga4Snap24h.activeUsers || 0} | Avg Time ${ga4Snap24h.averageEngagementTime || 0}s\n`;
        prompt += `- 7d: Views ${ga4Snap7d.views || 0} | Users ${ga4Snap7d.activeUsers || 0} | Avg Time ${ga4Snap7d.averageEngagementTime || 0}s\n`;
        prompt += `- 30d: Views ${ga4Snap30d.views || 0} | Users ${ga4Snap30d.activeUsers || 0} | Avg Time ${ga4Snap30d.averageEngagementTime || 0}s\n`;
        prompt += `- 90d: Views ${ga4Snap90d.views || 0} | Users ${ga4Snap90d.activeUsers || 0} | Avg Time ${ga4Snap90d.averageEngagementTime || 0}s\n\n`;
        
        prompt += `--- คำถาม/ความคิดเห็นสะสมจากผู้อ่าน (Audience Feedback) ---\n`;
        prompt += `- ความคิดเห็นสำคัญ: ${notableComments || "ไม่มี"}\n`;
        prompt += `- คำถามจากทางบ้าน: ${audienceQuestions || "ไม่มี"}\n`;
        prompt += `- จุดที่เข้าใจผิด/สับสน: ${misunderstanding || "ไม่มี"}\n`;
        prompt += `- ภาษา/คำพูดที่น่าสนใจ: ${userLanguage || "ไม่มี"}\n\n`;
        
        prompt += `--- คำขอร้องวิเคราะห์ (Request for Analysis) ---\n`;
        prompt += `ช่วยนำข้อมูลสถิติและ Feedback ด้านบนไปวิเคราะห์ร่วมกับผลตอบรับจริง แล้วตอบกลับโดยจัดทำชุดข้อมูลในรูปแบบ JSON ตามสกีมา "workos-writing-lab-update-v0.1" นี้เท่านั้น:\n\n`;
        prompt += `\`\`\`json\n`;
        prompt += `{\n`;
        prompt += `  "schemaVersion": "workos-writing-lab-update-v0.1",\n`;
        prompt += `  "action": "apply_update",\n`;
        prompt += `  "target": {\n`;
        prompt += `    "type": "writing_lab_project",\n`;
        prompt += `    "projectId": "${activeProject.id}",\n`;
        prompt += `    "projectSlug": "${activeProject.slug || ""}"\n`;
        prompt += `  },\n`;
        prompt += `  "fields": {\n`;
        prompt += `    "performanceFeedback": {\n`;
        prompt += `      "combinedAnalysis": {\n`;
        prompt += `        "performanceSummary": "วิเคราะห์รวม...",\n`;
        prompt += `        "distributionSignal": "การกระจาย...",\n`;
        prompt += `        "websiteSignal": "บนเว็บไซต์...",\n`;
        prompt += `        "topicSignal": "ความสนใจหัวข้อ...",\n`;
        prompt += `        "hookSignal": "สัญญาณ Hook...",\n`;
        prompt += `        "imageSignal": "สัญญาณภาพประกอบ...",\n`;
        prompt += `        "ctaSignal": "สัญญาณ CTA...",\n`;
        prompt += `        "seoSignal": "สัญญาณ SEO...",\n`;
        prompt += `        "commentSignal": "สัญญาณความคิดเห็น...",\n`;
        prompt += `        "whatWorked": "อะไรที่ทำได้ดี...",\n`;
        prompt += `        "whatDidNotWork": "อะไรที่ควรแก้...",\n`;
        prompt += `        "recommendedAction": "ก้าวถัดไป..."\n`;
        prompt += `      },\n`;
        prompt += `      "nextDecision": {\n`;
        prompt += `        "decision": "Repost later / Make infographic / Write follow-up article / Keep as evergreen",\n`;
        prompt += `        "priority": "High / Medium / Low",\n`;
        prompt += `        "targetDate": "YYYY-MM-DD",\n`;
        prompt += `        "notes": "เหตุผลการตัดสินใจ..."\n`;
        prompt += `      }\n`;
        prompt += `    }\n`;
        prompt += `  }\n`;
        prompt += `}\n`;
        prompt += `\`\`\`\n\n`;
        prompt += `ให้ตอบเฉพาะบล็อก JSON ที่มีข้อมูลวิเคราะห์ที่สมบูรณ์เท่านั้น เพื่อความรวดเร็วในการคัดลอกไปอัปเดตระบบครับ`;

        navigator.clipboard.writeText(prompt);
        setCopyPromptSuccess(true);
        setTimeout(() => setCopyPromptSuccess(false), 2000);
    };

    const handleMarkReviewed = () => {
        setPublishStatus("Reviewed");
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

    const renderPasteGuidance = (key: SubTabKey) => {
        const guidance = PASTE_GUIDANCE[key];

        return (
            <div className="bg-amber-50/50 dark:bg-amber-950/10 border border-amber-200/50 dark:border-amber-900/30 rounded-2xl p-4 space-y-2">
                <div>
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-amber-800 dark:text-amber-300">
                        {guidance.title}
                    </h4>
                    <p className="text-[11px] font-bold leading-relaxed text-amber-900/80 dark:text-amber-200/80 mt-1">
                        {guidance.body}
                    </p>
                </div>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {guidance.items.map((item) => (
                        <li key={item} className="flex items-start gap-2 text-[10px] font-bold text-amber-900/80 dark:text-amber-100/80">
                            <CheckCircle className="w-3 h-3 mt-0.5 text-amber-600 dark:text-amber-400 shrink-0" />
                            <span>{item}</span>
                        </li>
                    ))}
                </ul>
            </div>
        );
    };

    return (
        <div className="space-y-6">
            {/* Header: Episode selector & metadata */}
            <div className="bg-theme-card border border-theme-border rounded-[28px] p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-3">
                        <span className="px-2.5 py-1 bg-neutral-100 dark:bg-slate-800 text-neutral-600 dark:text-theme-secondary rounded-lg text-[10px] font-black uppercase tracking-widest border border-theme-border/40 shrink-0">
                            {resolvedEpisodeId || "No Episode"}
                        </span>
                        
                        {episodeCode && (
                            <span className="px-2.5 py-1 bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400 rounded-lg text-[10px] font-black uppercase tracking-widest border border-blue-100/30 shrink-0">
                                {episodeCode}
                            </span>
                        )}

                        {assetType && assetType !== "unknown" && (
                            <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border shrink-0 ${ASSET_TYPE_COLORS[assetType] || "bg-neutral-50 text-neutral-500 border-neutral-150"}`}>
                                {ASSET_TYPE_LABELS[assetType] || assetType}
                            </span>
                        )}
                        
                        {activeProject ? (
                            <input 
                                type="text"
                                value={workingTitle}
                                onChange={(e) => setWorkingTitle(e.target.value)}
                                className="text-xl font-black text-theme-primary bg-transparent border-b border-transparent hover:border-theme-border/50 focus:border-theme-primary focus:outline-none py-0.5 outline-none w-full max-w-lg transition-all"
                                placeholder="Edit working title..."
                            />
                        ) : activeEpisode ? (
                            <h2 className="text-xl font-black text-theme-primary">{getCleanDisplayTitle(activeEpisode)}</h2>
                        ) : (
                            <h2 className="text-xl font-black text-theme-primary italic">Select an episode to edit</h2>
                        )}

                        {activeProject && (
                            <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400 text-[10px] font-bold uppercase shrink-0">
                                {activeProject.status}
                            </span>
                        )}
                    </div>
                    {activeProject && (
                        <p className="text-[10px] text-theme-muted font-mono font-bold mt-1">
                            Project ID: {activeProject.id} {legacyId && `· Legacy ID: ${legacyId}`} {sourceLocation && `· Source: ${sourceLocation}`}
                        </p>
                    )}
                    {activeEpisode && !activeProject && (
                        <p className="text-xs text-theme-muted font-bold mt-1">
                            Original: {getCleanDisplayTitle(activeEpisode)} · Story Set: {activeEpisode.story_set_title}
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
                                <option key={ep.id} value={ep.id}>{getCleanDisplayTitle(ep)}</option>
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
                                onClick={() => setSubTab("work_checklist")}
                                className={`w-full text-left px-4 py-3 rounded-xl text-xs font-bold transition-all flex items-center justify-between ${
                                    subTab === "work_checklist" 
                                        ? "bg-black text-white dark:bg-slate-800 dark:text-theme-primary font-black" 
                                        : "text-theme-secondary hover:bg-theme-hover hover:text-theme-primary"
                                }`}
                            >
                                <span>Work Checklist</span>
                                <CheckCircle className="w-3.5 h-3.5" />
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
                                onClick={() => setSubTab("performance")}
                                className={`w-full text-left px-4 py-3 rounded-xl text-xs font-bold transition-all flex items-center justify-between ${
                                    subTab === "performance" 
                                        ? "bg-black text-white dark:bg-slate-800 dark:text-theme-primary font-black" 
                                        : "text-theme-secondary hover:bg-theme-hover hover:text-theme-primary"
                                }`}
                            >
                                <span>Performance / Feedback</span>
                                <BarChart2 className="w-3.5 h-3.5" />
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
                            <div className="pt-3 border-t border-theme-border/60 px-1 space-y-3">
                                <button
                                    onClick={handleGenerateWorkOSPackage}
                                    className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 shadow-sm"
                                >
                                    <Sparkles className="w-3.5 h-3.5" />
                                    Generate WorkOS Package
                                </button>
                                
                                <ArticleCommandPanel
                                    activeProject={activeProject}
                                    saving={saving}
                                    onSave={handleSave}
                                    onGeneratePackage={handleGenerateWorkOSPackage}
                                    generatedPackageText={generatedPackageText}
                                    onSendToInbox={handleSendToInbox}
                                    onCopyInsightPrompt={handleCopyInsightPrompt}
                                    
                                    workingTitle={workingTitle}
                                    slug={slug}
                                    narrativeSlug={narrativeSlug}
                                    knowledgeSlug={knowledgeSlug}
                                    heroSubtitle={heroSubtitle}
                                    narrativeHeroSubtitle={narrativeHeroSubtitle}
                                    knowledgeHeroSubtitle={knowledgeHeroSubtitle}
                                    shortSummary={shortSummary}
                                    narrativeShortSummary={narrativeShortSummary}
                                    knowledgeShortSummary={knowledgeShortSummary}
                                    metaTitle={metaTitle}
                                    narrativeMetaTitle={narrativeMetaTitle}
                                    knowledgeMetaTitle={knowledgeMetaTitle}
                                    metaDescription={metaDescription}
                                    narrativeMetaDescription={narrativeMetaDescription}
                                    knowledgeMetaDescription={knowledgeMetaDescription}
                                    narrativeBody={narrativeBody}
                                    knowledgeBody={knowledgeBody}
                                    shortCaption={shortCaption}
                                    facebookGroupPost={facebookGroupPost}
                                    facebookPagePost={facebookPagePost}
                                    personalPost={personalPost}
                                    campaignName={campaignName}
                                    publishStatus={publishStatus}
                                    decision={decision}
                                    onCopyGFAdminFields={handleCopyGFAdminFields}
                                    copyGFAdminSuccess={copyGFAdminSuccess}
                                />
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
                                {renderPasteGuidance("narrative")}
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
                                {renderPasteGuidance("knowledge")}
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
                                {renderPasteGuidance("social")}

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
                                            <button
                                                type="button"
                                                onClick={() => setSeoMode("metadata")}
                                                className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${
                                                    seoMode === "metadata" 
                                                        ? "bg-black text-white dark:bg-slate-800 dark:text-theme-primary shadow-sm" 
                                                        : "text-theme-secondary hover:bg-theme-hover"
                                                }`}
                                            >
                                                Asset Metadata (ข้อมูลมาตรฐาน)
                                            </button>
                                        </div>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={handleExtractPackageFields}
                                            disabled={!(narrativeBody || knowledgeBody)}
                                            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-700 dark:text-emerald-300 text-xs font-black uppercase tracking-widest rounded-xl transition-all disabled:opacity-50 h-fit border border-emerald-500/20"
                                        >
                                            <FileText className="w-3.5 h-3.5" />
                                            Extract Package Fields
                                        </button>
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
                                </div>
                                {renderPasteGuidance("seo")}

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
                                    ) : seoMode === "knowledge" ? (
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
                                    ) : (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="col-span-12 md:col-span-2 bg-indigo-50/40 dark:bg-indigo-950/10 border border-indigo-100/30 p-3.5 rounded-2xl">
                                                <p className="text-[10px] font-bold text-indigo-800 dark:text-indigo-300">
                                                    💡 <strong>Asset Metadata Mode:</strong> กำหนดและแก้ไขข้อมูลระบุเอกลักษณ์ของชิ้นงานตามมาตรฐาน Content Naming
                                                </p>
                                            </div>

                                            <div>
                                                <label className="text-[10px] font-black uppercase text-theme-muted tracking-wider ml-1">Episode Code</label>
                                                <input
                                                    type="text"
                                                    value={episodeCode}
                                                    onChange={(e) => setEpisodeCode(e.target.value)}
                                                    placeholder="e.g. EP.9.2"
                                                    className="w-full bg-theme-input border border-theme-border rounded-xl px-3 py-2 text-xs font-bold mt-1 text-theme-primary outline-none focus:border-theme-border/80"
                                                />
                                            </div>

                                            <div>
                                                <label className="text-[10px] font-black uppercase text-theme-muted tracking-wider ml-1">Canonical Title</label>
                                                <input
                                                    type="text"
                                                    value={canonicalTitle}
                                                    onChange={(e) => setCanonicalTitle(e.target.value)}
                                                    placeholder="ชื่อชิ้นงานหลัก (Clean Title)..."
                                                    className="w-full bg-theme-input border border-theme-border rounded-xl px-3 py-2 text-xs font-bold mt-1 text-theme-primary outline-none focus:border-theme-border/80"
                                                />
                                            </div>

                                            <div>
                                                <label className="text-[10px] font-black uppercase text-theme-muted tracking-wider ml-1">Asset Type</label>
                                                <select
                                                    value={assetType}
                                                    onChange={(e) => setAssetType(e.target.value)}
                                                    className="w-full bg-theme-input border border-theme-border rounded-xl px-3 py-2.5 text-xs font-bold mt-1 text-theme-primary outline-none focus:border-theme-border/80 appearance-none font-sans"
                                                >
                                                    <option value="unknown">Unknown</option>
                                                    <option value="episode">Episode</option>
                                                    <option value="knowledge_article">Knowledge Article (บทความเว็บ)</option>
                                                    <option value="narrative_article">Narrative Article (เรื่องเล่า)</option>
                                                    <option value="group_post">Group Post (โพสต์กลุ่ม)</option>
                                                    <option value="page_post">Page Post (โพสต์เพจ)</option>
                                                    <option value="personal_post">Personal Post (โพสต์ส่วนตัว)</option>
                                                    <option value="social_image">Social Image (รูปภาพโซเชียล)</option>
                                                    <option value="ga4_snapshot">GA4 Snapshot (สถิติ GA4)</option>
                                                    <option value="facebook_snapshot">Facebook Snapshot (สถิติ Facebook)</option>
                                                    <option value="legacy_shell">Legacy Shell (โครงร่างเก่า)</option>
                                                </select>
                                            </div>

                                            <div>
                                                <label className="text-[10px] font-black uppercase text-theme-muted tracking-wider ml-1">Content Family</label>
                                                <input
                                                    type="text"
                                                    value={contentFamily}
                                                    onChange={(e) => setContentFamily(e.target.value)}
                                                    placeholder="e.g. GF Content Hub, ArborDesk"
                                                    className="w-full bg-theme-input border border-theme-border rounded-xl px-3 py-2 text-xs font-bold mt-1 text-theme-primary outline-none focus:border-theme-border/80"
                                                />
                                            </div>

                                            <div>
                                                <label className="text-[10px] font-black uppercase text-theme-muted tracking-wider ml-1">Content Layer</label>
                                                <input
                                                    type="text"
                                                    value={contentLayer}
                                                    onChange={(e) => setContentLayer(e.target.value)}
                                                    placeholder="e.g. knowledge_article, narrative_article"
                                                    className="w-full bg-theme-input border border-theme-border rounded-xl px-3 py-2 text-xs font-bold mt-1 text-theme-primary outline-none focus:border-theme-border/80"
                                                />
                                            </div>

                                            <div>
                                                <label className="text-[10px] font-black uppercase text-theme-muted tracking-wider ml-1">Legacy ID</label>
                                                <input
                                                    type="text"
                                                    value={legacyId}
                                                    onChange={(e) => setLegacyId(e.target.value)}
                                                    placeholder="e.g. 07090, 5773"
                                                    className="w-full bg-theme-input border border-theme-border rounded-xl px-3 py-2 text-xs font-bold mt-1 text-theme-primary outline-none focus:border-theme-border/80"
                                                />
                                            </div>

                                            <div>
                                                <label className="text-[10px] font-black uppercase text-theme-muted tracking-wider ml-1">Source Location</label>
                                                <input
                                                    type="text"
                                                    value={sourceLocation}
                                                    onChange={(e) => setSourceLocation(e.target.value)}
                                                    placeholder="e.g. Google Sheets, csv-upload"
                                                    className="w-full bg-theme-input border border-theme-border rounded-xl px-3 py-2 text-xs font-bold mt-1 text-theme-primary outline-none focus:border-theme-border/80"
                                                />
                                            </div>

                                            <div>
                                                <label className="text-[10px] font-black uppercase text-theme-muted tracking-wider ml-1">Migration Status</label>
                                                <input
                                                    type="text"
                                                    value={migrationStatus}
                                                    onChange={(e) => setMigrationStatus(e.target.value)}
                                                    placeholder="e.g. shell_created, migrated"
                                                    className="w-full bg-theme-input border border-theme-border rounded-xl px-3 py-2 text-xs font-bold mt-1 text-theme-primary outline-none focus:border-theme-border/80"
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Work Checklist Panel */}
                        {subTab === "work_checklist" && (
                            <div className="space-y-6">
                                <div className="space-y-2 border-b border-theme-border/40 pb-4">
                                    <h3 className="text-sm font-black text-theme-primary uppercase tracking-widest flex items-center gap-2">
                                        <CheckCircle className="text-emerald-600 w-4 h-4" />
                                        Work Checklist
                                    </h3>
                                    <p className="text-[10px] font-bold text-theme-muted leading-relaxed">
                                        เช็กงานของ article package ปัจจุบันแบบเรียบง่าย ก่อนส่งต่อ Website, Publish หรือ Arbor Review
                                    </p>
                                </div>

                                {renderPasteGuidance("work_checklist")}

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {WORK_CHECKLIST_GROUPS.map((group) => (
                                        <div key={group.title} className="bg-theme-panel/30 border border-theme-border/60 rounded-2xl p-4 space-y-3">
                                            <h4 className="text-[11px] font-black uppercase tracking-wider text-theme-primary">
                                                {group.title}
                                            </h4>
                                            <ul className="space-y-2">
                                                {group.items.map((item) => (
                                                    <li key={item} className="flex items-start gap-2 text-xs font-bold leading-relaxed text-theme-secondary">
                                                        <span className="mt-0.5 w-3.5 h-3.5 rounded border border-theme-border bg-theme-card shrink-0" />
                                                        <span>{item}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    ))}
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
                                {renderPasteGuidance("utm")}

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

                        {/* 6. Performance / Feedback Panel */}
                        {subTab === "performance" && (
                            <div className="space-y-6 animate-in fade-in-50 duration-200">
                                <div className="flex items-center justify-between border-b border-theme-border/60 pb-3">
                                    <div>
                                        <h3 className="text-sm font-black text-theme-primary uppercase tracking-widest flex items-center gap-2">
                                            <BarChart2 className="text-blue-600 w-4 h-4" />
                                            Performance & Feedback Review
                                        </h3>
                                        <p className="text-[10px] font-bold text-theme-muted mt-0.5">ติดตามผลลัพธ์หลังการเผยแพร่ วิเคราะห์ผลตอบรับ และสรุปแนวทางการต่อยอดบทความ</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button 
                                            type="button"
                                            onClick={handleCopyInsightPrompt}
                                            className="px-4 py-2 bg-purple-600/10 text-purple-600 dark:text-purple-400 hover:bg-purple-600/20 rounded-xl text-xs font-black transition-all border border-purple-500/10 flex items-center gap-1.5 shadow-sm"
                                        >
                                            <Copy size={13} />
                                            {copyPromptSuccess ? "คัดลอก Prompt สำเร็จ!" : "Copy Arbor Insight Prompt"}
                                        </button>
                                        {publishStatus !== "Reviewed" && (
                                            <button 
                                                type="button"
                                                onClick={handleMarkReviewed}
                                                className="px-4 py-2 bg-emerald-600/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-600/20 rounded-xl text-xs font-black transition-all border border-emerald-500/10 flex items-center gap-1.5 shadow-sm"
                                            >
                                                <CheckCircle size={13} />
                                                Mark Reviewed
                                            </button>
                                        )}
                                    </div>
                                </div>
                                {renderPasteGuidance("performance")}

                                {/* Publishing Record */}
                                <div className="bg-theme-panel/30 border border-theme-border/60 p-5 rounded-2xl space-y-4">
                                    <h4 className="text-[11px] font-black uppercase tracking-wider text-theme-primary border-b border-theme-border/40 pb-1.5">Publishing Record (ประวัติการเผยแพร่)</h4>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black text-theme-muted uppercase tracking-wider">Publish Status (สถานะการเผยแพร่)</label>
                                            <select 
                                                value={publishStatus}
                                                onChange={(e) => setPublishStatus(e.target.value)}
                                                className="w-full bg-theme-input border border-theme-border rounded-xl px-3 py-2 text-xs font-bold text-theme-primary outline-none"
                                            >
                                                <option value="Draft">Draft</option>
                                                <option value="Ready for Website">Ready for Website</option>
                                                <option value="Published">Published</option>
                                                <option value="Posted to Facebook Group">Posted to Facebook Group</option>
                                                <option value="Posted to Facebook Page">Posted to Facebook Page</option>
                                                <option value="Feedback Pending">Feedback Pending</option>
                                                <option value="Reviewed">Reviewed</option>
                                            </select>
                                        </div>

                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black text-theme-muted uppercase tracking-wider">Published Date (วันที่เผยแพร่)</label>
                                            <input 
                                                type="date"
                                                value={publishedDate}
                                                onChange={(e) => setPublishedDate(e.target.value)}
                                                className="w-full bg-theme-input border border-theme-border rounded-xl px-3 py-2 text-xs font-bold text-theme-primary outline-none"
                                            />
                                        </div>

                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black text-theme-muted uppercase tracking-wider">Published URL (Website)</label>
                                            <input 
                                                type="text"
                                                value={publishedUrl}
                                                onChange={(e) => setPublishedUrl(e.target.value)}
                                                placeholder="https://greenfineness.com/..."
                                                className="w-full bg-theme-input border border-theme-border rounded-xl px-3 py-2 text-xs font-bold text-theme-primary outline-none"
                                            />
                                        </div>

                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black text-theme-muted uppercase tracking-wider">UTM Campaign</label>
                                            <input 
                                                type="text"
                                                value={campaignName}
                                                onChange={(e) => setCampaignName(e.target.value)}
                                                placeholder="e.g. golden-pea-launch-2026"
                                                className="w-full bg-theme-input border border-theme-border rounded-xl px-3 py-2 text-xs font-bold text-theme-primary outline-none"
                                            />
                                        </div>

                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black text-theme-muted uppercase tracking-wider">Facebook Group Post URL</label>
                                            <input 
                                                type="text"
                                                value={facebookGroupUrl}
                                                onChange={(e) => setFacebookGroupUrl(e.target.value)}
                                                placeholder="https://facebook.com/groups/..."
                                                className="w-full bg-theme-input border border-theme-border rounded-xl px-3 py-2 text-xs font-bold text-theme-primary outline-none"
                                            />
                                        </div>

                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black text-theme-muted uppercase tracking-wider">Facebook Page Post URL</label>
                                            <input 
                                                type="text"
                                                value={facebookPageUrl}
                                                onChange={(e) => setFacebookPageUrl(e.target.value)}
                                                placeholder="https://facebook.com/page/..."
                                                className="w-full bg-theme-input border border-theme-border rounded-xl px-3 py-2 text-xs font-bold text-theme-primary outline-none"
                                            />
                                        </div>

                                        <div className="space-y-1 md:col-span-2">
                                            <label className="text-[10px] font-black text-theme-muted uppercase tracking-wider">Personal Post URL</label>
                                            <input 
                                                type="text"
                                                value={personalPostUrl}
                                                onChange={(e) => setPersonalPostUrl(e.target.value)}
                                                placeholder="https://facebook.com/personal/..."
                                                className="w-full bg-theme-input border border-theme-border rounded-xl px-3 py-2 text-xs font-bold text-theme-primary outline-none"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Facebook Snapshots */}
                                <div className="bg-theme-panel/30 border border-theme-border/60 p-5 rounded-2xl space-y-4">
                                    <div className="flex items-center justify-between border-b border-theme-border/40 pb-2">
                                        <h4 className="text-[11px] font-black uppercase tracking-wider text-theme-primary">
                                            Facebook Snapshots (Post-Level Distribution)
                                        </h4>
                                        <div className="flex bg-theme-input rounded-lg p-0.5 border border-theme-border/30">
                                            {(["12h", "24h", "7d", "30d", "90d"] as const).map((w) => {
                                                const isWinMistake = (() => {
                                                    if (w === "12h") return fbSnap12h.isMistake;
                                                    if (w === "24h") return fbSnap24h.isMistake;
                                                    if (w === "7d") return fbSnap7d.isMistake;
                                                    if (w === "30d") return fbSnap30d.isMistake;
                                                    return fbSnap90d.isMistake;
                                                })();

                                                return (
                                                    <button
                                                        key={w}
                                                        type="button"
                                                        onClick={() => setFbActiveSnap(w)}
                                                        className={`px-2 py-1 text-[10px] font-black rounded-md transition-all flex items-center gap-1.5 ${
                                                            fbActiveSnap === w
                                                                ? "bg-theme-card text-blue-600 shadow-sm border border-theme-border/10"
                                                                : isWinMistake
                                                                    ? "text-red-500 hover:text-red-600 font-bold"
                                                                    : "text-theme-muted hover:text-theme-primary"
                                                        }`}
                                                    >
                                                        {isWinMistake && <span className="w-1.5 h-1.5 bg-red-500 rounded-full inline-block shrink-0 animate-pulse" />}
                                                        {w}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {(() => {
                                        const activeFb = fbActiveSnap === "12h" ? fbSnap12h : fbActiveSnap === "24h" ? fbSnap24h : fbActiveSnap === "7d" ? fbSnap7d : fbActiveSnap === "30d" ? fbSnap30d : fbSnap90d;
                                        const activeFbSetter: any = fbActiveSnap === "12h" ? setFbSnap12h : fbActiveSnap === "24h" ? setFbSnap24h : fbActiveSnap === "7d" ? setFbSnap7d : fbActiveSnap === "30d" ? setFbSnap30d : setFbSnap90d;

                                        return (
                                            <div className="space-y-4">
                                                {/* Fallback Warning Notice */}
                                                {activeFb.isFallback && (
                                                    <div className="p-2.5 bg-blue-500/5 dark:bg-blue-950/10 border border-blue-500/20 rounded-2xl text-[10px] text-blue-700 dark:text-blue-400 font-semibold flex items-center gap-2">
                                                        <span className="px-1.5 py-0.5 bg-blue-600 text-white rounded text-[8px] font-black uppercase">Fallback</span>
                                                        <span>ระบบไม่พบข้อมูลสถิติ {fbActiveSnap} จึงนำสถิติล่าสุด ณ ช่วงเวลา {activeFb.fallbackWindow} มาแสดงให้เห็นก่อนชั่วคราว (สถิตินี้จะไม่บันทึกทับจนกว่าคุณจะกด Save)</span>
                                                    </div>
                                                )}
                                                {/* Mistake Alert Banner */}
                                                {activeFb.isMistake && (
                                                    <div className="p-3.5 bg-red-500/10 border border-red-500/20 rounded-2xl text-[11px] text-red-700 dark:text-red-400 font-bold space-y-1">
                                                        <div className="flex items-center gap-1.5">
                                                            <span className="px-1.5 py-0.5 bg-red-600 text-white rounded text-[9px] font-black uppercase">MISTAKE</span>
                                                            <span>สถิตินี้ถูกทำเครื่องหมายว่าผิดพลาด (Marked as Mistake)</span>
                                                        </div>
                                                        {activeFb.correctionNote && (
                                                            <div><span className="text-theme-muted font-bold">สาเหตุ:</span> {activeFb.correctionNote}</div>
                                                        )}
                                                        {activeFb.correctedAt && (
                                                            <div className="text-[10px] text-theme-muted font-medium">แก้ไขเมื่อ: {new Date(activeFb.correctedAt).toLocaleString("th-TH")}</div>
                                                        )}
                                                    </div>
                                                )}

                                                {/* Quick Action Buttons Row */}
                                                <div className="flex flex-wrap items-center gap-2 p-3 bg-theme-input/40 border border-theme-border rounded-2xl">
                                                    <span className="text-[10px] font-black text-theme-secondary uppercase tracking-wider mr-2">Snapshot Quick Actions:</span>
                                                     
                                                    {/* Correct Platform Quick Actions */}
                                                    {(activeFb.platform === "facebook_page" || !activeFb.platform) && (
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                activeFbSetter({ ...activeFb, platform: "facebook_group" });
                                                                setFbSourceMetadata({ ...fbSourceMetadata, sourceType: "facebook_group_post" });
                                                            }}
                                                            className="px-2.5 py-1.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 border border-blue-500/20 rounded-xl text-[10px] font-black transition-all"
                                                        >
                                                            Switch to Group
                                                        </button>
                                                    )}

                                                    {activeFb.platform === "facebook_group" && (
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                activeFbSetter({ ...activeFb, platform: "facebook_page" });
                                                                setFbSourceMetadata({ ...fbSourceMetadata, sourceType: "facebook_page_post" });
                                                            }}
                                                            className="px-2.5 py-1.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 border border-blue-500/20 rounded-xl text-[10px] font-black transition-all"
                                                        >
                                                            Switch to Page
                                                        </button>
                                                    )}

                                                    {(activeFb.platform === "facebook_personal" || activeFb.platform === "personal_profile") && (
                                                        <>
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    activeFbSetter({ ...activeFb, platform: "facebook_group" });
                                                                    setFbSourceMetadata({ ...fbSourceMetadata, sourceType: "facebook_group_post" });
                                                                }}
                                                                className="px-2.5 py-1.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 border border-blue-500/20 rounded-xl text-[10px] font-black transition-all"
                                                            >
                                                                Switch to Group
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    activeFbSetter({ ...activeFb, platform: "facebook_page" });
                                                                    setFbSourceMetadata({ ...fbSourceMetadata, sourceType: "facebook_page_post" });
                                                                }}
                                                                className="px-2.5 py-1.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 border border-blue-500/20 rounded-xl text-[10px] font-black transition-all"
                                                            >
                                                                Switch to Page
                                                            </button>
                                                        </>
                                                    )}

                                                    {/* Mark as Mistake Action */}
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            if (activeFb.isMistake) {
                                                                activeFbSetter({
                                                                    ...activeFb,
                                                                    isMistake: false,
                                                                    correctedAt: "",
                                                                    correctionNote: ""
                                                                });
                                                            } else {
                                                                    const note = window.prompt("กรุณาระบุสาเหตุหรือบันทึกการแก้ไข (Correction Note):", "กรอกประเภทช่องทางผิดพลาด");
                                                                    if (note !== null) {
                                                                        activeFbSetter({
                                                                            ...activeFb,
                                                                            isMistake: true,
                                                                            correctedAt: new Date().toISOString(),
                                                                            correctionNote: note
                                                                        });
                                                                    }
                                                            }
                                                        }}
                                                        className={`px-2.5 py-1.5 border rounded-xl text-[10px] font-black transition-all ${
                                                            activeFb.isMistake
                                                                ? "bg-green-500/10 hover:bg-green-500/20 text-green-600 border-green-500/20"
                                                                : "bg-red-500/10 hover:bg-red-500/20 text-red-600 border-red-500/20"
                                                        }`}
                                                    >
                                                        {activeFb.isMistake ? "Unmark Mistake" : "Mark as Mistake"}
                                                    </button>

                                                    {/* Delete Snapshot Action */}
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            const ok = window.confirm("คุณต้องการลบข้อมูลสถิติ Snapshot ช่วงเวลานี้หรือไม่? ข้อมูลสถิติของช่วงเวลานี้จะถูกเคลียร์ออก");
                                                            if (ok) {
                                                                activeFbSetter({
                                                                    snapshotDate: "",
                                                                    window: fbActiveSnap.replace("snap", ""),
                                                                    platform: "facebook_page",
                                                                    postUrl: "",
                                                                    publishedDate: "",
                                                                    reach: "",
                                                                    reactions: "",
                                                                    comments: "",
                                                                    shares: "",
                                                                    linkClicks: "",
                                                                    saves: "",
                                                                    notableComments: "",
                                                                    audienceQuestions: "",
                                                                    confusion: "",
                                                                    audienceLanguage: "",
                                                                    notes: "",
                                                                    isMistake: false,
                                                                    correctedAt: "",
                                                                    correctionNote: ""
                                                                });
                                                            }
                                                        }}
                                                        className="px-2.5 py-1.5 bg-neutral-500/10 hover:bg-neutral-500/20 text-neutral-600 border border-neutral-500/20 rounded-xl text-[10px] font-black transition-all ml-auto"
                                                    >
                                                        Delete Snapshot
                                                    </button>
                                                </div>

                                                <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
                                                <div className="space-y-1">
                                                    <label className="text-[9px] font-black text-theme-muted uppercase">Snapshot Date</label>
                                                    <input
                                                        type="date"
                                                        value={activeFb.snapshotDate || ""}
                                                        onChange={(e) => activeFbSetter({ ...activeFb, snapshotDate: e.target.value })}
                                                        className="w-full bg-theme-input border border-theme-border rounded-xl px-2.5 py-1.5 font-medium text-theme-primary outline-none"
                                                    />
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-[9px] font-black text-theme-muted uppercase">Platform</label>
                                                    <select
                                                        value={activeFb.platform || "facebook_page"}
                                                        onChange={(e) => activeFbSetter({ ...activeFb, platform: e.target.value })}
                                                        className="w-full bg-theme-input border border-theme-border rounded-xl px-2.5 py-1.5 font-bold text-theme-primary outline-none"
                                                    >
                                                        <option value="facebook_page">Facebook Page</option>
                                                        <option value="facebook_group">Facebook Group</option>
                                                        <option value="personal_profile">Personal Profile</option>
                                                    </select>
                                                </div>
                                                <div className="space-y-1 col-span-2">
                                                    <label className="text-[9px] font-black text-theme-muted uppercase">Post URL</label>
                                                    <input
                                                        type="text"
                                                        value={activeFb.postUrl || ""}
                                                        onChange={(e) => activeFbSetter({ ...activeFb, postUrl: e.target.value })}
                                                        placeholder="https://facebook.com/..."
                                                        className="w-full bg-theme-input border border-theme-border rounded-xl px-2.5 py-1.5 font-medium text-theme-primary outline-none"
                                                    />
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-[9px] font-black text-theme-muted uppercase">Published Date</label>
                                                    <input
                                                        type="date"
                                                        value={activeFb.publishedDate || ""}
                                                        onChange={(e) => activeFbSetter({ ...activeFb, publishedDate: e.target.value })}
                                                        className="w-full bg-theme-input border border-theme-border rounded-xl px-2.5 py-1.5 font-medium text-theme-primary outline-none"
                                                    />
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-[9px] font-black text-theme-muted uppercase">Reach / Views</label>
                                                    <input
                                                        type="number"
                                                        value={activeFb.reach !== undefined ? activeFb.reach : ""}
                                                        onChange={(e) => activeFbSetter({ ...activeFb, reach: e.target.value })}
                                                        placeholder="0"
                                                        className="w-full bg-theme-input border border-theme-border rounded-xl px-2.5 py-1.5 font-medium text-theme-primary outline-none"
                                                    />
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-[9px] font-black text-theme-muted uppercase">Reactions</label>
                                                    <input
                                                        type="number"
                                                        value={activeFb.reactions !== undefined ? activeFb.reactions : ""}
                                                        onChange={(e) => activeFbSetter({ ...activeFb, reactions: e.target.value })}
                                                        placeholder="0"
                                                        className="w-full bg-theme-input border border-theme-border rounded-xl px-2.5 py-1.5 font-medium text-theme-primary outline-none"
                                                    />
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-[9px] font-black text-theme-muted uppercase">Comments</label>
                                                    <input
                                                        type="number"
                                                        value={activeFb.comments !== undefined ? activeFb.comments : ""}
                                                        onChange={(e) => activeFbSetter({ ...activeFb, comments: e.target.value })}
                                                        placeholder="0"
                                                        className="w-full bg-theme-input border border-theme-border rounded-xl px-2.5 py-1.5 font-medium text-theme-primary outline-none"
                                                    />
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-[9px] font-black text-theme-muted uppercase">Shares</label>
                                                    <input
                                                        type="number"
                                                        value={activeFb.shares !== undefined ? activeFb.shares : ""}
                                                        onChange={(e) => activeFbSetter({ ...activeFb, shares: e.target.value })}
                                                        placeholder="0"
                                                        className="w-full bg-theme-input border border-theme-border rounded-xl px-2.5 py-1.5 font-medium text-theme-primary outline-none"
                                                    />
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-[9px] font-black text-theme-muted uppercase">Link Clicks</label>
                                                    <input
                                                        type="number"
                                                        value={activeFb.linkClicks !== undefined ? activeFb.linkClicks : ""}
                                                        onChange={(e) => activeFbSetter({ ...activeFb, linkClicks: e.target.value })}
                                                        placeholder="0"
                                                        className="w-full bg-theme-input border border-theme-border rounded-xl px-2.5 py-1.5 font-medium text-theme-primary outline-none"
                                                    />
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-[9px] font-black text-theme-muted uppercase">Saves</label>
                                                    <input
                                                        type="number"
                                                        value={activeFb.saves !== undefined ? activeFb.saves : ""}
                                                        onChange={(e) => activeFbSetter({ ...activeFb, saves: e.target.value })}
                                                        placeholder="0"
                                                        className="w-full bg-theme-input border border-theme-border rounded-xl px-2.5 py-1.5 font-medium text-theme-primary outline-none"
                                                    />
                                                </div>
                                                <div className="col-span-1 md:col-span-4 grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-theme-border/20">
                                                    <div className="space-y-1">
                                                        <label className="text-[9px] font-black text-theme-muted uppercase">Notable Comments</label>
                                                        <textarea
                                                            value={activeFb.notableComments || ""}
                                                            onChange={(e) => activeFbSetter({ ...activeFb, notableComments: e.target.value })}
                                                            placeholder="ความคิดเห็นที่น่าสังเกต..."
                                                            className="w-full bg-theme-input border border-theme-border rounded-xl p-2.5 text-xs font-medium text-theme-primary outline-none h-16 resize-y"
                                                        />
                                                    </div>
                                                    <div className="space-y-1">
                                                        <label className="text-[9px] font-black text-theme-muted uppercase">Audience Questions</label>
                                                        <textarea
                                                            value={activeFb.audienceQuestions || ""}
                                                            onChange={(e) => activeFbSetter({ ...activeFb, audienceQuestions: e.target.value })}
                                                            placeholder="คำถามจากทางบ้าน..."
                                                            className="w-full bg-theme-input border border-theme-border rounded-xl p-2.5 text-xs font-medium text-theme-primary outline-none h-16 resize-y"
                                                        />
                                                    </div>
                                                    <div className="space-y-1">
                                                        <label className="text-[9px] font-black text-theme-muted uppercase">Confusion / Misunderstanding</label>
                                                        <textarea
                                                            value={activeFb.confusion || ""}
                                                            onChange={(e) => activeFbSetter({ ...activeFb, confusion: e.target.value })}
                                                            placeholder="จุดที่ลูกค้างงหรือสับสน..."
                                                            className="w-full bg-theme-input border border-theme-border rounded-xl p-2.5 text-xs font-medium text-theme-primary outline-none h-16 resize-y"
                                                        />
                                                    </div>
                                                    <div className="space-y-1">
                                                        <label className="text-[9px] font-black text-theme-muted uppercase">Audience Language / Vocabulary</label>
                                                        <textarea
                                                            value={activeFb.audienceLanguage || ""}
                                                            onChange={(e) => activeFbSetter({ ...activeFb, audienceLanguage: e.target.value })}
                                                            placeholder="คำพูดเด่นของลูกค้า..."
                                                            className="w-full bg-theme-input border border-theme-border rounded-xl p-2.5 text-xs font-medium text-theme-primary outline-none h-16 resize-y"
                                                        />
                                                    </div>
                                                </div>
                                                <div className="space-y-1 col-span-4">
                                                    <label className="text-[9px] font-black text-theme-muted uppercase">Notes</label>
                                                    <textarea
                                                        value={activeFb.notes || ""}
                                                        onChange={(e) => activeFbSetter({ ...activeFb, notes: e.target.value })}
                                                        placeholder="ข้อสังเกตเพิ่มเติมสำหรับ Facebook Snapshot Window นี้..."
                                                        className="w-full bg-theme-input border border-theme-border rounded-xl p-2.5 text-xs font-medium text-theme-primary outline-none h-16 resize-y"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                        );
                                    })()}
                                </div>

                                {/* GA4 Snapshots */}
                                <div className="bg-theme-panel/30 border border-theme-border/60 p-5 rounded-2xl space-y-4">
                                    <div className="flex items-center justify-between border-b border-theme-border/40 pb-2">
                                        <h4 className="text-[11px] font-black uppercase tracking-wider text-theme-primary">
                                            GA4 Snapshots (Article-Level Website Metrics)
                                        </h4>
                                        <div className="flex bg-theme-input rounded-lg p-0.5 border border-theme-border/30">
                                            {(["12h", "24h", "7d", "30d", "90d"] as const).map((w) => (
                                                <button
                                                    key={w}
                                                    type="button"
                                                    onClick={() => setGa4ActiveSnap(w)}
                                                    className={`px-2 py-1 text-[10px] font-black rounded-md transition-all ${
                                                        ga4ActiveSnap === w
                                                            ? "bg-theme-card text-blue-600 shadow-sm border border-theme-border/10"
                                                            : "text-theme-muted hover:text-theme-primary"
                                                    }`}
                                                >
                                                    {w}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {(() => {
                                        const activeGa4 = ga4ActiveSnap === "12h" ? ga4Snap12h : ga4ActiveSnap === "24h" ? ga4Snap24h : ga4ActiveSnap === "7d" ? ga4Snap7d : ga4ActiveSnap === "30d" ? ga4Snap30d : ga4Snap90d;
                                        const activeGa4Setter: any = ga4ActiveSnap === "12h" ? setGa4Snap12h : ga4ActiveSnap === "24h" ? setGa4Snap24h : ga4ActiveSnap === "7d" ? setGa4Snap7d : ga4ActiveSnap === "30d" ? setGa4Snap30d : setGa4Snap90d;

                                        return (
                                            <div className="space-y-4">
                                                {/* Fallback Warning Notice */}
                                                {activeGa4.isFallback && (
                                                    <div className="p-2.5 bg-blue-500/5 dark:bg-blue-950/10 border border-blue-500/20 rounded-2xl text-[10px] text-blue-700 dark:text-blue-400 font-semibold flex items-center gap-2">
                                                        <span className="px-1.5 py-0.5 bg-blue-600 text-white rounded text-[8px] font-black uppercase">Fallback</span>
                                                        <span>ระบบไม่พบข้อมูล GA4 {ga4ActiveSnap} จึงนำสถิติล่าสุด ณ ช่วงเวลา {activeGa4.fallbackWindow} มาแสดงให้เห็นก่อนชั่วคราว (สถิตินี้จะไม่บันทึกทับจนกว่าคุณจะกด Save)</span>
                                                    </div>
                                                )}
                                                <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
                                                <div className="space-y-1">
                                                    <label className="text-[9px] font-black text-theme-muted uppercase">Snapshot Date</label>
                                                    <input
                                                        type="date"
                                                        value={activeGa4.snapshotDate || ""}
                                                        onChange={(e) => activeGa4Setter({ ...activeGa4, snapshotDate: e.target.value })}
                                                        className="w-full bg-theme-input border border-theme-border rounded-xl px-2.5 py-1.5 font-medium text-theme-primary outline-none"
                                                    />
                                                </div>
                                                <div className="space-y-1 col-span-3">
                                                    <label className="text-[9px] font-black text-theme-muted uppercase">Published URL</label>
                                                    <input
                                                        type="text"
                                                        value={activeGa4.publishedUrl || ""}
                                                        onChange={(e) => activeGa4Setter({ ...activeGa4, publishedUrl: e.target.value })}
                                                        placeholder="https://greenfineness.com/library/..."
                                                        className="w-full bg-theme-input border border-theme-border rounded-xl px-2.5 py-1.5 font-medium text-theme-primary outline-none"
                                                    />
                                                </div>
                                                <div className="space-y-1 col-span-2">
                                                    <label className="text-[9px] font-black text-theme-muted uppercase">Page Title</label>
                                                    <input
                                                        type="text"
                                                        value={activeGa4.pageTitle || ""}
                                                        onChange={(e) => activeGa4Setter({ ...activeGa4, pageTitle: e.target.value })}
                                                        className="w-full bg-theme-input border border-theme-border rounded-xl px-2.5 py-1.5 font-medium text-theme-primary outline-none"
                                                    />
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-[9px] font-black text-theme-muted uppercase">GA4 Page Views</label>
                                                    <input
                                                        type="number"
                                                        value={activeGa4.views !== undefined ? activeGa4.views : ""}
                                                        onChange={(e) => activeGa4Setter({ ...activeGa4, views: e.target.value })}
                                                        placeholder="0"
                                                        className="w-full bg-theme-input border border-theme-border rounded-xl px-2.5 py-1.5 font-medium text-theme-primary outline-none"
                                                    />
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-[9px] font-black text-theme-muted uppercase">Active Users</label>
                                                    <input
                                                        type="number"
                                                        value={activeGa4.activeUsers !== undefined ? activeGa4.activeUsers : ""}
                                                        onChange={(e) => activeGa4Setter({ ...activeGa4, activeUsers: e.target.value })}
                                                        placeholder="0"
                                                        className="w-full bg-theme-input border border-theme-border rounded-xl px-2.5 py-1.5 font-medium text-theme-primary outline-none"
                                                    />
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-[9px] font-black text-theme-muted uppercase">Events Count</label>
                                                    <input
                                                        type="number"
                                                        value={activeGa4.events !== undefined ? activeGa4.events : ""}
                                                        onChange={(e) => activeGa4Setter({ ...activeGa4, events: e.target.value })}
                                                        placeholder="0"
                                                        className="w-full bg-theme-input border border-theme-border rounded-xl px-2.5 py-1.5 font-medium text-theme-primary outline-none"
                                                    />
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-[9px] font-black text-theme-muted uppercase">Avg Engagement Time (s)</label>
                                                    <input
                                                        type="number"
                                                        value={activeGa4.averageEngagementTime !== undefined ? activeGa4.averageEngagementTime : ""}
                                                        onChange={(e) => activeGa4Setter({ ...activeGa4, averageEngagementTime: e.target.value })}
                                                        placeholder="0"
                                                        className="w-full bg-theme-input border border-theme-border rounded-xl px-2.5 py-1.5 font-medium text-theme-primary outline-none"
                                                    />
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-[9px] font-black text-theme-muted uppercase">Bounce Rate (%)</label>
                                                    <input
                                                        type="text"
                                                        value={activeGa4.bounceRate || ""}
                                                        onChange={(e) => activeGa4Setter({ ...activeGa4, bounceRate: e.target.value })}
                                                        placeholder="e.g. 45"
                                                        className="w-full bg-theme-input border border-theme-border rounded-xl px-2.5 py-1.5 font-medium text-theme-primary outline-none"
                                                    />
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-[9px] font-black text-theme-muted uppercase">Top Source / Medium</label>
                                                    <input
                                                        type="text"
                                                        value={activeGa4.sourceMedium || ""}
                                                        onChange={(e) => activeGa4Setter({ ...activeGa4, sourceMedium: e.target.value })}
                                                        placeholder="e.g. fb / post"
                                                        className="w-full bg-theme-input border border-theme-border rounded-xl px-2.5 py-1.5 font-medium text-theme-primary outline-none"
                                                    />
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-[9px] font-black text-theme-muted uppercase">Organic Users</label>
                                                    <input
                                                        type="number"
                                                        value={activeGa4.organicUsers !== undefined ? activeGa4.organicUsers : ""}
                                                        onChange={(e) => activeGa4Setter({ ...activeGa4, organicUsers: e.target.value })}
                                                        placeholder="0"
                                                        className="w-full bg-theme-input border border-theme-border rounded-xl px-2.5 py-1.5 font-medium text-theme-primary outline-none"
                                                    />
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-[9px] font-black text-theme-muted uppercase">Referral Users</label>
                                                    <input
                                                        type="number"
                                                        value={activeGa4.referralUsers !== undefined ? activeGa4.referralUsers : ""}
                                                        onChange={(e) => activeGa4Setter({ ...activeGa4, referralUsers: e.target.value })}
                                                        placeholder="0"
                                                        className="w-full bg-theme-input border border-theme-border rounded-xl px-2.5 py-1.5 font-medium text-theme-primary outline-none"
                                                    />
                                                </div>
                                                <div className="space-y-1 col-span-4">
                                                    <label className="text-[9px] font-black text-theme-muted uppercase">Notes</label>
                                                    <textarea
                                                        value={activeGa4.notes || ""}
                                                        onChange={(e) => activeGa4Setter({ ...activeGa4, notes: e.target.value })}
                                                        placeholder="ข้อสังเกตเพิ่มเติมสำหรับ GA4 Snapshot Window นี้..."
                                                        className="w-full bg-theme-input border border-theme-border rounded-xl p-2.5 text-xs font-medium text-theme-primary outline-none h-16 resize-y"
                                                    />
                                                </div>
                                                </div>
                                            </div>
                                        );
                                    })()}
                                </div>
                                {/* Audience Feedback */}
                                <div className="bg-theme-panel/30 border border-theme-border/60 p-5 rounded-2xl space-y-4">
                                    <h4 className="text-[11px] font-black uppercase tracking-wider text-theme-primary border-b border-theme-border/40 pb-1.5">Audience Feedback (คำตอบรับและคำติชมเชิงลึก)</h4>
                                    
                                    <div className="space-y-3">
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black text-theme-muted uppercase font-black">Notable Comments (ความคิดเห็นเด่น)</label>
                                            <textarea 
                                                value={notableComments}
                                                onChange={(e) => setNotableComments(e.target.value)}
                                                placeholder="ความคิดเห็นเด่นจากกลุ่มเป้าหมาย..."
                                                className="w-full bg-theme-input border border-theme-border rounded-xl p-3 text-xs font-medium text-theme-primary outline-none h-16 resize-y"
                                            />
                                        </div>

                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black text-theme-muted uppercase font-black">Audience Questions (คำถามที่พบบ่อย)</label>
                                            <textarea 
                                                value={audienceQuestions}
                                                onChange={(e) => setAudienceQuestions(e.target.value)}
                                                placeholder="คำถามจากทางบ้าน..."
                                                className="w-full bg-theme-input border border-theme-border rounded-xl p-3 text-xs font-medium text-theme-primary outline-none h-16 resize-y"
                                            />
                                        </div>

                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black text-theme-muted uppercase font-black">Misunderstanding / Confusion (จุดที่ผู้อ่านสับสน)</label>
                                            <textarea 
                                                value={misunderstanding}
                                                onChange={(e) => setMisunderstanding(e.target.value)}
                                                placeholder="จุดที่ผู้อ่านแสดงความเข้าใจผิดหรือสับสน..."
                                                className="w-full bg-theme-input border border-theme-border rounded-xl p-3 text-xs font-medium text-theme-primary outline-none h-16 resize-y"
                                            />
                                        </div>

                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black text-theme-muted uppercase font-black">Interesting User Language (ภาษาที่ลูกค้าใช้พูดคุย)</label>
                                            <textarea 
                                                value={userLanguage}
                                                onChange={(e) => setUserLanguage(e.target.value)}
                                                placeholder="คำพูดเด่นของลูกค้า..."
                                                className="w-full bg-theme-input border border-theme-border rounded-xl p-3 text-xs font-medium text-theme-primary outline-none h-16 resize-y"
                                            />
                                        </div>

                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black text-theme-muted uppercase font-black">Potential Follow-up Topic (หัวข้อต่อยอด)</label>
                                            <textarea 
                                                value={followupTopic}
                                                onChange={(e) => setFollowupTopic(e.target.value)}
                                                placeholder="แนวทางหัวข้อบทความใหม่สำหรับการต่อยอด..."
                                                className="w-full bg-theme-input border border-theme-border rounded-xl p-3 text-xs font-medium text-theme-primary outline-none h-16 resize-y"
                                            />
                                        </div>
                                    </div>
                                </div>
                                {/* Combined Analysis */}
                                <div className="bg-theme-panel/30 border border-theme-border/60 p-5 rounded-2xl space-y-4">
                                    <h4 className="text-[11px] font-black uppercase tracking-wider text-theme-primary border-b border-theme-border/40 pb-1.5">Combined Analysis (สรุปบทวิเคราะห์รวม)</h4>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-1 col-span-2">
                                            <label className="text-[10px] font-black text-theme-muted uppercase font-black">Performance Summary (บทวิเคราะห์ผลลัพธ์การเผยแพร่ภาพรวม)</label>
                                            <textarea 
                                                value={performanceSummary}
                                                onChange={(e) => setPerformanceSummary(e.target.value)}
                                                placeholder="วิเคราะห์ประสิทธิภาพและสรุปสัญญาณตอบรับทางกลยุทธ์..."
                                                className="w-full bg-theme-input border border-theme-border rounded-xl p-3 text-xs font-medium text-theme-primary outline-none h-16 resize-y"
                                            />
                                        </div>

                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black text-theme-muted uppercase font-black">Distribution Signal (สัญญาณการกระจายโพสต์)</label>
                                            <input 
                                                type="text"
                                                value={distributionSignal}
                                                onChange={(e) => setDistributionSignal(e.target.value)}
                                                placeholder="e.g. Strong reach in group, poor engagement page"
                                                className="w-full bg-theme-input border border-theme-border rounded-xl px-3 py-2 text-xs font-medium text-theme-primary outline-none"
                                            />
                                        </div>

                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black text-theme-muted uppercase font-black">Website Signal (สัญญาณพฤติกรรมบนเว็บ)</label>
                                            <input 
                                                type="text"
                                                value={websiteSignal}
                                                onChange={(e) => setWebsiteSignal(e.target.value)}
                                                placeholder="e.g. High average engagement time, low bounce rate"
                                                className="w-full bg-theme-input border border-theme-border rounded-xl px-3 py-2 text-xs font-medium text-theme-primary outline-none"
                                            />
                                        </div>

                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black text-theme-muted uppercase font-black">Topic Signal (สัญญาณหัวข้อ)</label>
                                            <input 
                                                type="text"
                                                value={topicSignal}
                                                onChange={(e) => setTopicSignal(e.target.value)}
                                                placeholder="e.g. High interest on Plant Hormones"
                                                className="w-full bg-theme-input border border-theme-border rounded-xl px-3 py-2 text-xs font-medium text-theme-primary outline-none"
                                            />
                                        </div>

                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black text-theme-muted uppercase font-black">Hook Signal (สัญญาณประโยคเปิดหัว)</label>
                                            <input 
                                                type="text"
                                                value={hookSignal}
                                                onChange={(e) => setHookSignal(e.target.value)}
                                                placeholder="e.g. Cytokinin split test hook A won B by 2x"
                                                className="w-full bg-theme-input border border-theme-border rounded-xl px-3 py-2 text-xs font-medium text-theme-primary outline-none"
                                            />
                                        </div>

                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black text-theme-muted uppercase font-black">Image Signal (สัญญาณภาพประกอบ)</label>
                                            <input 
                                                type="text"
                                                value={imageSignal}
                                                onChange={(e) => setImageSignal(e.target.value)}
                                                placeholder="e.g. Clean infographics had 3x more shares"
                                                className="w-full bg-theme-input border border-theme-border rounded-xl px-3 py-2 text-xs font-medium text-theme-primary outline-none"
                                            />
                                        </div>

                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black text-theme-muted uppercase font-black">CTA Signal (สัญญาณปุ่มกด/Call to Action)</label>
                                            <input 
                                                type="text"
                                                value={ctaSignal}
                                                onChange={(e) => setCtaSignal(e.target.value)}
                                                placeholder="e.g. Link to amino acid product was active"
                                                className="w-full bg-theme-input border border-theme-border rounded-xl px-3 py-2 text-xs font-medium text-theme-primary outline-none"
                                            />
                                        </div>

                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black text-theme-muted uppercase font-black">SEO Signal (สัญญาณดัชนีเว็บ)</label>
                                            <input 
                                                type="text"
                                                value={seoSignal}
                                                onChange={(e) => setSeoSignal(e.target.value)}
                                                placeholder="e.g. Primary keyword ranking page 2 already"
                                                className="w-full bg-theme-input border border-theme-border rounded-xl px-3 py-2 text-xs font-medium text-theme-primary outline-none"
                                            />
                                        </div>

                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black text-theme-muted uppercase font-black">Comment Signal (สัญญาณความคิดเห็น)</label>
                                            <input 
                                                type="text"
                                                value={commentSignal}
                                                onChange={(e) => setCommentSignal(e.target.value)}
                                                placeholder="e.g. Professional tone inquiries on dosage"
                                                className="w-full bg-theme-input border border-theme-border rounded-xl px-3 py-2 text-xs font-medium text-theme-primary outline-none"
                                            />
                                        </div>

                                        <div className="space-y-1 col-span-2">
                                            <label className="text-[10px] font-black text-theme-muted uppercase font-black">What Worked (จุดที่สำเร็จด้วยดี)</label>
                                            <textarea 
                                                value={whatWorked}
                                                onChange={(e) => setWhatWorked(e.target.value)}
                                                placeholder="หัวข้อ/ภาพ/ข้อความส่วนที่ดึงดูดใจผู้คนสำเร็จ..."
                                                className="w-full bg-theme-input border border-theme-border rounded-xl p-3 text-xs font-medium text-theme-primary outline-none h-16 resize-y"
                                            />
                                        </div>

                                        <div className="space-y-1 col-span-2">
                                            <label className="text-[10px] font-black text-theme-muted uppercase font-black">What Did Not Work (จุดที่ควรปรับปรุง)</label>
                                            <textarea 
                                                value={whatDidNotWork}
                                                onChange={(e) => setWhatDidNotWork(e.target.value)}
                                                placeholder="ส่วนที่ได้ผลลัพธ์ต่ำกว่าเป้าหมาย..."
                                                className="w-full bg-theme-input border border-theme-border rounded-xl p-3 text-xs font-medium text-theme-primary outline-none h-16 resize-y"
                                            />
                                        </div>

                                        <div className="space-y-1 col-span-2">
                                            <label className="text-[10px] font-black text-theme-muted uppercase font-black">Recommended Next Action (ก้าวถัดไปที่ควรทำ)</label>
                                            <textarea 
                                                value={recommendedAction}
                                                onChange={(e) => setRecommendedAction(e.target.value)}
                                                placeholder="ข้อเสนอแนะสำหรับการต่อยอดในอนาคต..."
                                                className="w-full bg-theme-input border border-theme-border rounded-xl p-3 text-xs font-medium text-theme-primary outline-none h-16 resize-y"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Next Content Decision */}
                                <div className="bg-theme-panel/30 border border-theme-border/60 p-5 rounded-2xl space-y-4">
                                    <h4 className="text-[11px] font-black uppercase tracking-wider text-theme-primary border-b border-theme-border/40 pb-1.5">Next Content Decision (การตัดสินใจทางกลยุทธ์คอนเทนต์)</h4>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black text-theme-muted uppercase">Decision (ผลลัพธ์การตัดสินใจ)</label>
                                            <select 
                                                value={decision}
                                                onChange={(e) => setDecision(e.target.value)}
                                                className="w-full bg-theme-input border border-theme-border rounded-xl px-3 py-2 text-xs font-bold text-theme-primary outline-none"
                                            >
                                                <option value="Keep as evergreen">Keep as evergreen</option>
                                                <option value="Repost later">Repost later</option>
                                                <option value="Make infographic">Make infographic</option>
                                                <option value="Write follow-up article">Write follow-up article</option>
                                                <option value="Improve headline">Improve headline</option>
                                                <option value="Improve image">Improve image</option>
                                                <option value="Add internal links">Add internal links</option>
                                                <option value="Update article">Update article</option>
                                                <option value="Create short explainer">Create short explainer</option>
                                                <option value="Create video script">Create video script</option>
                                                <option value="No action">No action</option>
                                                <option value="Review later">Review later</option>
                                            </select>
                                        </div>

                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black text-theme-muted uppercase">Priority (ระดับความสำคัญ)</label>
                                            <select 
                                                value={decisionPriority}
                                                onChange={(e) => setDecisionPriority(e.target.value)}
                                                className="w-full bg-theme-input border border-theme-border rounded-xl px-3 py-2 text-xs font-bold text-theme-primary outline-none"
                                            >
                                                <option value="Low">Low</option>
                                                <option value="Medium">Medium</option>
                                                <option value="High">High</option>
                                            </select>
                                        </div>

                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black text-theme-muted uppercase">Target Date (วันเป้าหมายงาน)</label>
                                            <input 
                                                type="date"
                                                value={decisionTargetDate}
                                                onChange={(e) => setDecisionTargetDate(e.target.value)}
                                                className="w-full bg-theme-input border border-theme-border rounded-xl px-3 py-2 text-xs font-bold text-theme-primary outline-none"
                                            />
                                        </div>

                                        <div className="space-y-1 md:col-span-3">
                                            <label className="text-[10px] font-black text-theme-muted uppercase">Decision Notes / Details (ข้อความการวิเคราะห์/หมายเหตุ)</label>
                                            <textarea 
                                                value={decisionNotes}
                                                onChange={(e) => setDecisionNotes(e.target.value)}
                                                placeholder="สรุปแนวทางการประมวลผลต่อยอดคอนเทนต์..."
                                                className="w-full bg-theme-input border border-theme-border rounded-xl p-3 text-xs font-medium text-theme-primary outline-none h-20 resize-y"
                                            />
                                        </div>
                                    </div>
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
                                {renderPasteGuidance("review")}

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
            {/* Modal for Package Field Extraction Preview */}
            {packagePreview && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-theme-card border border-theme-border rounded-[32px] max-w-4xl w-full max-h-[85vh] flex flex-col overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-theme-border/60 flex items-center justify-between gap-4">
                            <div>
                                <h3 className="text-base font-black text-theme-primary flex items-center gap-2">
                                    <FileText className="w-5 h-5 text-emerald-600" />
                                    <span>Extract Package Fields Preview</span>
                                </h3>
                                <p className="text-[10px] font-bold text-theme-muted mt-0.5">
                                    ตรวจ fields ที่พบจาก {packagePreview.sourceMode === "knowledge" ? "Knowledge Article" : "Narrative Article"} ก่อนนำไปเติมใน tab ที่ถูกต้อง
                                </p>
                            </div>
                            <button
                                onClick={() => setPackagePreview(null)}
                                className="w-8 h-8 rounded-full bg-theme-panel hover:bg-theme-hover flex items-center justify-center text-theme-secondary hover:text-theme-primary transition-all font-bold shrink-0"
                            >
                                x
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto flex-1 space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <div className="bg-theme-panel/50 border border-theme-border rounded-2xl p-4">
                                    <div className="text-[9px] font-black uppercase tracking-widest text-theme-muted">Fields Detected</div>
                                    <div className="text-2xl font-black text-theme-primary mt-1">{packagePreview.fields.length}</div>
                                </div>
                                <div className="bg-theme-panel/50 border border-theme-border rounded-2xl p-4">
                                    <div className="text-[9px] font-black uppercase tracking-widest text-theme-muted">Overwrites</div>
                                    <div className="text-2xl font-black text-amber-600 mt-1">
                                        {packagePreview.fields.filter(field => field.willOverwrite).length}
                                    </div>
                                </div>
                                <div className="bg-theme-panel/50 border border-theme-border rounded-2xl p-4">
                                    <div className="text-[9px] font-black uppercase tracking-widest text-theme-muted">Extracted Sections</div>
                                    <div className="text-2xl font-black text-theme-primary mt-1">{packagePreview.removedSectionsCount}</div>
                                </div>
                            </div>

                            <div className="border border-theme-border rounded-2xl overflow-hidden">
                                <div className="grid grid-cols-12 gap-0 bg-theme-panel/60 border-b border-theme-border text-[9px] font-black uppercase tracking-widest text-theme-muted">
                                    <div className="col-span-3 px-3 py-2">Field</div>
                                    <div className="col-span-2 px-3 py-2">Target Tab</div>
                                    <div className="col-span-5 px-3 py-2">Detected Value</div>
                                    <div className="col-span-2 px-3 py-2">Existing</div>
                                </div>
                                <div className="divide-y divide-theme-border max-h-[360px] overflow-y-auto custom-scrollbar">
                                    {packagePreview.fields.map((field) => (
                                        <div key={`${field.key}-${field.targetTab}`} className="grid grid-cols-12 gap-0 text-xs">
                                            <div className="col-span-3 px-3 py-3 font-black text-theme-primary">
                                                {field.label}
                                                {field.willOverwrite && (
                                                    <div className="mt-1 text-[9px] text-amber-600 font-black uppercase">Will overwrite</div>
                                                )}
                                            </div>
                                            <div className="col-span-2 px-3 py-3 text-theme-secondary font-bold">{field.targetTab}</div>
                                            <div className="col-span-5 px-3 py-3 text-theme-primary whitespace-pre-wrap break-words max-h-24 overflow-hidden">
                                                {field.value}
                                            </div>
                                            <div className="col-span-2 px-3 py-3 text-theme-muted whitespace-pre-wrap break-words max-h-24 overflow-hidden">
                                                {field.existingValue || "Empty"}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <label className={`flex items-start gap-3 p-4 rounded-2xl border text-xs font-bold ${
                                packagePreview.removedSectionsCount > 0
                                    ? "bg-emerald-500/5 border-emerald-500/20 text-emerald-700 dark:text-emerald-300"
                                    : "bg-theme-panel/40 border-theme-border text-theme-muted"
                            }`}>
                                <input
                                    type="checkbox"
                                    checked={shouldCleanExtractedBody}
                                    disabled={packagePreview.removedSectionsCount === 0}
                                    onChange={(e) => setShouldCleanExtractedBody(e.target.checked)}
                                    className="mt-0.5 rounded border-theme-border text-emerald-600 focus:ring-emerald-500"
                                />
                                <span>
                                    ลบ extracted sections ออกจาก article body หลัง apply
                                    <span className="block text-[10px] font-medium mt-0.5 opacity-80">
                                        จะเก็บเฉพาะเนื้อหา article body ให้สะอาด และย้าย fields ไปยัง tab ที่เหมาะสม
                                    </span>
                                </span>
                            </label>
                        </div>

                        <div className="p-6 border-t border-theme-border/60 bg-theme-panel/40 flex flex-col sm:flex-row items-center justify-end gap-3">
                            <button
                                onClick={() => setPackagePreview(null)}
                                className="w-full sm:w-auto px-5 py-2.5 bg-white dark:bg-slate-800 border border-neutral-200 dark:border-slate-700/60 rounded-xl text-xs font-bold text-neutral-600 dark:text-theme-secondary hover:bg-neutral-50 dark:hover:bg-slate-700 transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleApplyPackageFields}
                                className="w-full sm:w-auto px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black transition-all shadow-md"
                            >
                                Apply Detected Fields
                            </button>
                        </div>
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
                                onClick={handleCopyGFAdminFields}
                                className="w-full sm:w-auto px-5 py-2.5 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/30 rounded-xl text-xs font-bold text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-all flex items-center justify-center gap-2 shadow-sm"
                            >
                                <Copy className="w-3.5 h-3.5" />
                                {copyGFAdminSuccess ? "คัดลอก GF Fields สำเร็จ!" : "Copy GF Admin Fields"}
                            </button>
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
