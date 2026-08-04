export type ArticleStudioMode = "editorial" | "structured" | "partial";
export type ArticleStudioStepRole =
    | "mini_research_brief"
    | "research_raw"
    | "research_direction"
    | "brief"
    | "script_caption"
    | "outline_web_article"
    | "assets_canva"
    | "seo_schema"
    | "publish"
    | "general";
export type ArticleStudioStatus =
    | "idea"
    | "research"
    | "draft_bank"
    | "needs_human_insight"
    | "seo_ready"
    | "visual_needed"
    | "publish_ready"
    | "published";
export type ArticleStudioDifficulty = "beginner" | "intermediate" | "deep_dive";
export type ArticleStudioVisualStatus = "not_needed_yet" | "notes_ready" | "visual_needed" | "done";
export type ArticleStudioHealthStatus = "Incomplete" | "Draft Ready" | "Review Needed" | "Publish Ready";

export type ArticleStudioMissingItem = {
    field: string;
    label: string;
    state: "blocking" | "warning" | "info";
};

export type ArticleStudioContentHealth = {
    status: ArticleStudioHealthStatus;
    requiredComplete: number;
    requiredTotal: 3;
    seoComplete: number;
    seoTotal: 4;
    internalLinksComplete: number;
    internalLinksTotal: 3;
    visualNotes: "ready" | "missing";
    faq: "ready" | "missing";
    references: "ready" | "missing";
    body: "ready" | "missing";
    internalLinks: "ready" | "missing";
    groupPost: "ready" | "missing";
    pagePost: "ready" | "missing";
    personalPost: "ready" | "missing";
    socialExtras: "ready" | "missing";
};

export type ArticleStudioPackage = {
    mode: ArticleStudioMode;
    detectedStepRole?: ArticleStudioStepRole;
    topic_id: string;
    article_title: string;
    topic_title: string;
    season_id: string;
    episode_id: string;
    story_set: string;
    story_order: string;
    content_layer: string;
    article_type: string;
    article_role: string;
    narrative_status: string;
    current_step: string;
    article_status: string;
    title: string;
    meta_title: string;
    meta_description: string;
    keywords: string[];
    slug: string;
    internal_links_prerequisite: string[];
    internal_links_next_step: string[];
    internal_links_related: string[];
    schema_faq: unknown;
    schema_article: unknown;
    article_markdown: string;
    body_markdown: string;
    read_more_markdown: string;
    faq_markdown: string;
    references_markdown: string;
    group_post_markdown: string;
    page_post_markdown: string;
    personal_post_markdown: string;
    social_extras_markdown: string;
    group_post: string;
    page_post: string;
    visual_brief: string;
    references: string[];
    canva_url: string;
    published_url: string;
    status: ArticleStudioStatus;
    difficulty: ArticleStudioDifficulty;
    visual_status: ArticleStudioVisualStatus;
    primary_system: string;
    secondary_systems: string[];
    publish_pack_status: string;
    references_status: string;
    next_action: string;
    notes: string;
};

export type ArticleStudioSectionKey =
    | "research_direction"
    | "draft"
    | "seo_schema"
    | "visual_brief"
    | "publish_checklist";

export type ArticleStudioPreview = ArticleStudioPackage & {
    sections: Record<ArticleStudioSectionKey, string>;
    detectedHeadings: string[];
    missingFields: string[];
    validationMessages: string[];
    generatedFields: string[];
    missingFieldGroups: {
        required: ArticleStudioMissingItem[];
        recommended: ArticleStudioMissingItem[];
        optional: ArticleStudioMissingItem[];
    };
    contentHealth: ArticleStudioContentHealth;
};

const EMPTY_PACKAGE: ArticleStudioPackage = {
    mode: "editorial",
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
    narrative_status: "not_started",
    current_step: "0",
    article_status: "idea",
    title: "",
    meta_title: "",
    meta_description: "",
    keywords: [],
    slug: "",
    internal_links_prerequisite: [],
    internal_links_next_step: [],
    internal_links_related: [],
    schema_faq: [],
    schema_article: {},
    article_markdown: "",
    body_markdown: "",
    read_more_markdown: "",
    faq_markdown: "",
    references_markdown: "",
    group_post_markdown: "",
    page_post_markdown: "",
    personal_post_markdown: "",
    social_extras_markdown: "",
    group_post: "",
    page_post: "",
    visual_brief: "",
    references: [],
    canva_url: "",
    published_url: "",
    status: "needs_human_insight",
    difficulty: "intermediate",
    visual_status: "not_needed_yet",
    primary_system: "",
    secondary_systems: [],
    publish_pack_status: "not_started",
    references_status: "pending",
    next_action: "",
    notes: "",
};

const FIELD_ALIASES: Record<keyof ArticleStudioPackage, string[]> = {
    mode: ["mode", "article mode"],
    detectedStepRole: ["step_role", "detected_step", "stage"],
    topic_id: ["topic_id", "topic id", "topic-id"],
    article_title: ["article_title", "article title", "manual article title"],
    topic_title: ["topic_title", "topic title"],
    season_id: ["season_id", "season"],
    episode_id: ["episode_id", "episode"],
    story_set: ["story_set", "story set"],
    story_order: ["story_order", "story order"],
    content_layer: ["content_layer", "content layer", "layer"],
    article_type: ["article_type", "article type"],
    article_role: ["article_role", "article role", "role"],
    narrative_status: ["narrative_status", "narrative status"],
    current_step: ["current_step", "current step", "step"],
    article_status: ["article_status", "article status", "status"],
    title: ["title", "working title"],
    meta_title: ["meta_title", "meta title", "seo title"],
    meta_description: ["meta_description", "meta description", "seo description"],
    keywords: ["keywords", "keyword"],
    slug: ["slug", "url slug"],
    internal_links_prerequisite: ["internal_links_prerequisite", "prerequisite links", "prerequisite"],
    internal_links_next_step: ["internal_links_next_step", "next step links", "next step"],
    internal_links_related: ["internal_links_related", "related links", "related"],
    schema_faq: ["schema_faq", "faq schema", "schema faq"],
    schema_article: ["schema_article", "article schema", "schema article"],
    article_markdown: ["article_markdown", "article markdown", "draft", "article draft"],
    body_markdown: ["body_markdown", "body markdown", "article body"],
    read_more_markdown: ["read_more_markdown", "read more markdown", "read more", "internal links"],
    faq_markdown: ["faq_markdown", "faq markdown", "faq"],
    references_markdown: ["references_markdown", "references markdown", "reference section"],
    group_post_markdown: ["group_post_markdown", "group post markdown", "facebook group post"],
    page_post_markdown: ["page_post_markdown", "page post markdown", "facebook page post"],
    personal_post_markdown: ["personal_post_markdown", "personal post markdown", "personal post"],
    social_extras_markdown: ["social_extras_markdown", "social extras markdown", "social extras"],
    group_post: ["group_post", "group post"],
    page_post: ["page_post", "page post"],
    visual_brief: ["visual_brief", "visual brief"],
    references: ["references", "reference", "เอกสารอ้างอิง", "แหล่งอ้างอิง"],
    canva_url: ["canva_url", "canva url", "canva"],
    published_url: ["published_url", "published url", "publish url", "article url"],
    status: ["status"],
    difficulty: ["difficulty", "level"],
    visual_status: ["visual_status", "visual status"],
    primary_system: ["primary_system", "primary system", "system"],
    secondary_systems: ["secondary_systems", "secondary systems", "systems"],
    publish_pack_status: ["publish_pack_status", "publish pack status", "publish pack"],
    references_status: ["references_status", "references status"],
    next_action: ["next_action", "next action"],
    notes: ["notes", "internal notes"],
};

const VALID_MODES: ArticleStudioMode[] = ["editorial", "structured", "partial"];
const VALID_STATUSES: ArticleStudioStatus[] = [
    "idea",
    "research",
    "draft_bank",
    "needs_human_insight",
    "seo_ready",
    "visual_needed",
    "publish_ready",
    "published",
];
const VALID_DIFFICULTIES: ArticleStudioDifficulty[] = ["beginner", "intermediate", "deep_dive"];
const VALID_VISUAL_STATUSES: ArticleStudioVisualStatus[] = ["not_needed_yet", "notes_ready", "visual_needed", "done"];

const SECTION_ALIASES: Record<ArticleStudioSectionKey, string[]> = {
    research_direction: ["research direction", "research", "direction"],
    draft: [
        "draft",
        "article draft",
        "article_markdown",
        "article markdown",
        "article",
        "full article",
        "article markdown / draft",
        "article hub markdown",
        "เนื้อหาบทความ",
        "บทความ",
    ],
    seo_schema: ["seo & schema", "seo and schema", "seo schema", "seo", "schema"],
    visual_brief: ["visual brief", "visual package", "visual"],
    publish_checklist: ["publish checklist", "review / publish", "publish"],
};

export const ARTICLE_STUDIO_STEPS: Record<ArticleStudioStepRole, { title: string; instruction: string }> = {
    mini_research_brief: {
        title: "0. Mini Research Brief",
        instruction: "สรุปประเด็นสำคัญและทิศทางเบื้องต้นจากการรีเสิร์ชด่วน",
    },
    research_raw: {
        title: "1. Research Raw — NotebookLM",
        instruction: "วางข้อมูลดิบหรือสรุปจาก NotebookLM เพื่อใช้เป็นฐานข้อมูลในการเขียน",
    },
    research_direction: {
        title: "2. Research Direction — Arbor Questions",
        instruction: "ระบุแนวทางการวิจัยและคำถามสำคัญจาก Arbor เพื่อกำหนดทิศทางเนื้อหา",
    },
    brief: {
        title: "3. Brief",
        instruction: "สรุปบรีฟงาน (Goal, Target, Tone) ให้ชัดเจนก่อนเริ่มเขียน",
    },
    outline_web_article: {
        title: "4. Web Article Outline / Full Article",
        instruction: "ร่างโครงสร้างบทความ (Outline) หรือเขียนเนื้อหาฉบับเต็ม (Full Draft)",
    },
    script_caption: {
        title: "5. Script & Caption",
        instruction: "เขียนสคริปต์วิดีโอสั้นหรือแคปชั่นสำหรับ Social Media",
    },
    assets_canva: {
        title: "6. Assets / Canva",
        instruction: "ระบุรายละเอียดภาพประกอบ (Visual Brief) หรือ URL ของ Canva",
    },
    seo_schema: {
        title: "7. SEO & Schema",
        instruction: "ตรวจสอบ Meta Title, Description และ Schema Markup",
    },
    publish: {
        title: "8. Publish / Tracking",
        instruction: "ตรวจสอบความเรียบร้อยก่อนเผยแพร่และระบุช่องทางติดตามผล",
    },
    general: {
        title: "General Draft",
        instruction: "เนื้อหาทั่วไปที่ไม่ได้ระบุขั้นตอนเฉพาะ",
    },
};

function isMeaningfulDraft(body: string) {
    if (!body) return false;
    const cleaned = body.trim();
    // Reject if body is mostly lists / headings / inline fields
    const lines = cleaned.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    if (lines.length === 0) return false;
    const nonListLines = lines.filter(l => !/^([-*+]\s|\d+\.|#{1,4}\s|\w+\s*:\s)/.test(l));
    if (nonListLines.length === 0) return false;

    if (cleaned.length < 80) {
        // If short, check for sentence-like content (contains punctuation or Thai sentence end)
        if (/[\.\!\?。]|\n\n/.test(cleaned)) return true;
        // Accept shorter content if it's reasonably long (covers short Thai sentences)
        if (cleaned.length >= 30) return true;
        return false;
    }

    // If any non-list line has substantial length, accept
    if (nonListLines.some(l => l.length > 40)) return true;

    // Otherwise, check for paragraph separators
    if (/\n\s*\n/.test(body)) return true;
    return false;
}

function normalizeKey(value: string) {
    return value.trim().toLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ");
}

function asString(value: unknown) {
    if (value === null || value === undefined) return "";
    if (typeof value === "string") return value.trim();
    return JSON.stringify(value, null, 2);
}

function asPlainString(value: unknown) {
    return typeof value === "string" ? value.trim() : "";
}

function asStringArray(value: unknown) {
    if (Array.isArray(value)) return value.map(asString).filter(Boolean);
    if (typeof value === "string") {
        return value
            .split(/\n|,/)
            .map((item) => item.replace(/^[-*]\s*/, "").trim())
            .filter(Boolean);
    }
    return [];
}

function compactWhitespace(value: string) {
    return value.replace(/\s+/g, " ").trim();
}

function stripMarkdown(value: string) {
    return compactWhitespace(
        value
            .replace(/```[\s\S]*?```/g, " ")
            .replace(/`([^`]+)`/g, "$1")
            .replace(/!\[[^\]]*]\([^)]*\)/g, " ")
            .replace(/\[([^\]]+)]\([^)]*\)/g, "$1")
            .replace(/[#>*_~|[\]-]+/g, " ")
    );
}

function firstSentence(value: string) {
    const text = stripMarkdown(value);
    const match = text.match(/^(.{60,160}?)([.!?。]|$)/);
    return compactWhitespace(match?.[1] || text.slice(0, 155));
}

function shortDescription(title: string, article: string) {
    const seed = compactWhitespace([title, firstSentence(article)].filter(Boolean).join(" - "));
    return seed.slice(0, 155).trim();
}

function keywordCandidates(title: string, article: string) {
    const source = `${title} ${stripMarkdown(article)}`.toLowerCase();
    const words = source
        .split(/[^a-z0-9ก-๙]+/i)
        .map((word) => word.trim())
        .filter((word) => word.length >= 3 && !["the", "and", "for", "with", "this", "that", "จาก", "และ", "หรือ", "การ", "ของ", "คือ"].includes(word));

    return Array.from(new Set(words)).slice(0, 8);
}

function hasArrayItems(value: unknown) {
    return Array.isArray(value) && value.length > 0;
}

function hasFaqContent(pkg: ArticleStudioPackage) {
    if (hasArrayItems(pkg.schema_faq)) return true;
    if (pkg.schema_faq && typeof pkg.schema_faq === "object" && !Array.isArray(pkg.schema_faq) && Object.keys(pkg.schema_faq).length > 0) return true;
    return /(^|\n)#{1,4}\s*(faq|คำถามที่พบบ่อย)\b/i.test(pkg.article_markdown);
}

function hasReferencesContent(pkg: ArticleStudioPackage) {
    if (pkg.references.length > 0) return true;
    return /(^|\n)#{1,4}\s*(เอกสารอ้างอิง|references|แหล่งอ้างอิง)\b/i.test(pkg.article_markdown);
}

function safeJson(value: unknown, fallback: unknown) {
    if (!value) return fallback;
    if (typeof value !== "string") return value;
    try {
        return JSON.parse(value);
    } catch {
        return value.trim();
    }
}

export function isPlaceholderValue(value: unknown) {
    if (typeof value !== "string") return false;
    const normalized = normalizeKey(value);
    if (!normalized) return true;
    if (normalized.includes("|")) return true;
    return [
        "mode",
        "status",
        "difficulty",
        "visual status",
        "topic id",
        "topic-id",
        "topic_id",
        "gf content xxx",
        "gf-content-xxx",
        "idea research draft bank needs human insight seo ready visual needed publish ready published",
        "beginner intermediate deep dive",
        "not needed yet notes ready visual needed done",
        "editorial structured",
    ].includes(normalized);
}

function normalizeEnumValue(value: unknown) {
    if (isPlaceholderValue(value)) return "";
    return asPlainString(value).toLowerCase().replace(/[\s-]+/g, "_").trim();
}

function normalizeMode(value: unknown): ArticleStudioMode {
    const normalized = normalizeEnumValue(value);
    return VALID_MODES.includes(normalized as ArticleStudioMode) ? normalized as ArticleStudioMode : "editorial";
}

function normalizeStatus(value: unknown, mode: ArticleStudioMode): ArticleStudioStatus {
    const normalized = normalizeEnumValue(value);
    if (VALID_STATUSES.includes(normalized as ArticleStudioStatus)) return normalized as ArticleStudioStatus;
    return mode === "structured" ? "draft_bank" : "needs_human_insight";
}

function normalizeDifficulty(value: unknown): ArticleStudioDifficulty {
    const normalized = normalizeEnumValue(value);
    return VALID_DIFFICULTIES.includes(normalized as ArticleStudioDifficulty) ? normalized as ArticleStudioDifficulty : "intermediate";
}

function normalizeVisualStatus(value: unknown): ArticleStudioVisualStatus {
    const normalized = normalizeEnumValue(value);
    return VALID_VISUAL_STATUSES.includes(normalized as ArticleStudioVisualStatus) ? normalized as ArticleStudioVisualStatus : "not_needed_yet";
}

function normalizeTopicId(value: unknown) {
    return isPlaceholderValue(value) ? "" : asPlainString(value);
}

export function isInvalidTopicId(value: string) {
    const normalized = value.trim().toUpperCase();
    return !normalized || normalized === "GF-CONTENT-XXX" || normalized === "TOPIC-ID";
}

function stripFence(input: string) {
    return input.trim().replace(/^```(?:json|markdown|md)?\s*/i, "").replace(/```$/i, "").trim();
}

function detectStepRole(headings: string[], body: string): ArticleStudioStepRole {
    const combined = [...headings, body.slice(0, 500)].join(" ").toLowerCase();

    // Check Mini Research Brief
    if (combined.includes("mini research brief") || combined.includes("สรุปรีเสิร์ช")) return "mini_research_brief";
    if (combined.includes("research raw") || combined.includes("ข้อมูลดิบ") || combined.includes("notebooklm")) return "research_raw";
    if (combined.includes("research direction") || combined.includes("แนวทางการวิจัย")) return "research_direction";
    if (combined.includes("brief") || combined.includes("บรีฟ")) return "brief";
    if (combined.includes("script & caption") || combined.includes("script") || combined.includes("caption")) return "script_caption";
    if (combined.includes("outline web article") || combined.includes("outline")) return "outline_web_article";
    if (combined.includes("assets") || combined.includes("canva")) return "assets_canva";
    if (combined.includes("seo & schema") || combined.includes("seo") || combined.includes("schema")) return "seo_schema";
    if (combined.includes("publish") || combined.includes("เผยแพร่")) return "publish";

    return "general";
}

function extractTopicId(input: string): string {
    // 1. YAML: topic_id: GF-CONTENT-010
    const yamlMatch = input.match(/topic_id:\s*(GF-CONTENT-\d+|GF-ARTICLE-\d+|TOPIC-\d+)/i);
    if (yamlMatch) return yamlMatch[1].toUpperCase();

    // 2. Thai: รหัส: GF-CONTENT-010
    const thaiMatch = input.match(/(?:รหัส|รหัสงาน|ID)\s*[:：]\s*(GF-CONTENT-\d+|GF-ARTICLE-\d+|TOPIC-\d+)/i);
    if (thaiMatch) return thaiMatch[1].toUpperCase();

    // 3. H1: # GF-CONTENT-010 — Title
    const h1Match = input.match(/^#\s+(GF-CONTENT-\d+|GF-ARTICLE-\d+|TOPIC-\d+)/m);
    if (h1Match) return h1Match[1].toUpperCase();

    return "";
}

function extractTopicTitle(input: string): string {
    // 1. YAML: topic_title: ... or title: ...
    const yamlMatch = input.match(/topic_title:\s*([^\n\r]+)/i) || input.match(/title:\s*([^\n\r]+)/i);
    if (yamlMatch) return yamlMatch[1].trim();

    // 2. H1 dash: # GF-CONTENT-010 — Title
    const h1DashMatch = input.match(/^#\s+(?:GF-CONTENT-\d+|GF-ARTICLE-\d+|TOPIC-\d+)\s*(?:—|-|:)\s*([^\n\r]+)/m);
    if (h1DashMatch) return h1DashMatch[1].trim();

    // 3. Plain H1
    const h1Match = input.match(/^#\s+(?!GF-CONTENT|GF-ARTICLE|TOPIC)([^\n\r]+)/m);
    if (h1Match) return h1Match[1].trim();

    return "";
}

function readJsonPackage(input: string): Partial<ArticleStudioPackage> | null {
    try {
        const parsed = JSON.parse(stripFence(input));
        if (parsed && typeof parsed === "object") {
            return (parsed as { articlePackage?: Partial<ArticleStudioPackage> }).articlePackage ?? parsed;
        }
    } catch {
        return null;
    }
    return null;
}

function headingBlocks(input: string) {
    const lines = input.replace(/\r\n/g, "\n").split("\n");
    const blocks: { heading: string; level: number; body: string }[] = [];
    let current: { heading: string; level: number; body: string[] } | null = null;

    for (const line of lines) {
        const match = line.match(/^(#{1,4})\s+(.+?)\s*$/);
        if (match) {
            if (current) {
                blocks.push({ heading: current.heading, level: current.level, body: current.body.join("\n").trim() });
            }
            current = { heading: match[2].trim(), level: match[1].length, body: [] };
        } else if (current) {
            current.body.push(line);
        }
    }

    if (current) {
        blocks.push({ heading: current.heading, level: current.level, body: current.body.join("\n").trim() });
    }

    return blocks;
}

function pickByAliases(blocks: { heading: string; body: string }[], aliases: string[]) {
    const normalizedAliases = aliases.map(normalizeKey);
    return blocks.find((block) => normalizedAliases.includes(normalizeKey(block.heading)))?.body ?? "";
}

function extractInlineField(input: string, aliases: string[]) {
    const normalizedAliases = aliases.map((alias) => alias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
    const pattern = new RegExp(`^(?:[-*]\\s*)?(?:\\*\\*)?(${normalizedAliases.join("|")})(?:\\*\\*)?\\s*[:：]\\s*(.+)$`, "im");
    const match = input.match(pattern);
    return match?.[2]?.trim() ?? "";
}

function buildMarkdownPackage(input: string): ArticleStudioPreview {
    const blocks = headingBlocks(input);
    const byField = { ...EMPTY_PACKAGE };

    (Object.keys(FIELD_ALIASES) as (keyof ArticleStudioPackage)[]).forEach((field) => {
        const blockValue = pickByAliases(blocks, FIELD_ALIASES[field]);
        const inlineValue = extractInlineField(input, FIELD_ALIASES[field]);
        const value = blockValue || inlineValue;

        if (field === "keywords" || field === "references" || field.startsWith("internal_links_")) {
            byField[field] = asStringArray(value) as never;
        } else if (field === "schema_faq") {
            byField[field] = safeJson(value, []) as never;
        } else if (field === "schema_article") {
            byField[field] = safeJson(value, {}) as never;
        } else if (field === "mode") {
            byField[field] = normalizeMode(value) as never;
        } else if (field === "status") {
            byField[field] = asPlainString(value) as never;
        } else if (field === "difficulty") {
            byField[field] = normalizeDifficulty(value) as never;
        } else if (field === "visual_status") {
            byField[field] = normalizeVisualStatus(value) as never;
        } else if (field === "topic_id") {
            byField[field] = normalizeTopicId(value) as never;
        } else if (field === "meta_description") {
            byField[field] = asPlainString(value) as never;
        } else if (field === "canva_url" || field === "published_url") {
            byField[field] = asPlainString(value) as never;
        } else {
            byField[field] = asString(value) as never;
        }
    });

    const sections = Object.fromEntries(
        (Object.keys(SECTION_ALIASES) as ArticleStudioSectionKey[]).map((key) => [
            key,
            pickByAliases(blocks, SECTION_ALIASES[key]),
        ])
    ) as Record<ArticleStudioSectionKey, string>;

    // Determine article/draft body robustly
    let draftCandidate = sections.draft || "";
    if (draftCandidate && !isMeaningfulDraft(draftCandidate)) {
        // If the explicit draft section exists but doesn't look like a full draft,
        // try to find any other heading block that contains meaningful body.
        const found = blocks.find((b) => isMeaningfulDraft(b.body));
        if (found) draftCandidate = found.body;
        else draftCandidate = "";
    }

    // If no explicit draft found, try to pick the first meaningful block body
    if (!draftCandidate) {
        const found = blocks.find((b) => isMeaningfulDraft(b.body));
        if (found) draftCandidate = found.body;
    }

    // Final fallback: if there are no headings and input looks like a body, use input
    if (!draftCandidate && blocks.length === 0) {
        draftCandidate = input.trim();
    }

    if (!byField.article_markdown) byField.article_markdown = draftCandidate || "";
    if (!byField.visual_brief) byField.visual_brief = sections.visual_brief;
    if (!byField.title) byField.title = blocks[0]?.heading ?? "";

    return withPreviewMetadata(byField, sections, blocks.map((block) => block.heading));
}

export function normalizeArticleStudioPackage(input: Partial<ArticleStudioPackage> & { draft?: unknown }): ArticleStudioPackage {
    const mode = normalizeMode(input.mode);
    const detectedStepRole = input.detectedStepRole;
    const title = isPlaceholderValue(input.title) ? "" : asPlainString(input.title);
    const articleMarkdown = asPlainString(input.article_markdown) || asPlainString(input.draft);
    const metaDescription = isPlaceholderValue(input.meta_description) ? "" : asPlainString(input.meta_description);

    return {
        ...EMPTY_PACKAGE,
        ...input,
        mode,
        detectedStepRole,
        topic_id: normalizeTopicId(input.topic_id),
        article_title: asPlainString(input.article_title),
        topic_title: asPlainString(input.topic_title),
        season_id: asPlainString(input.season_id),
        episode_id: asPlainString(input.episode_id),
        story_set: asPlainString(input.story_set),
        story_order: asPlainString(input.story_order),
        content_layer: asPlainString(input.content_layer) || "knowledge",
        article_type: asPlainString(input.article_type) || "knowledge_article",
        article_role: asPlainString(input.article_role),
        narrative_status: asPlainString(input.narrative_status) || "not_started",
        current_step: asPlainString(input.current_step),
        article_status: asPlainString(input.article_status),
        title,
        meta_title: isPlaceholderValue(input.meta_title) ? "" : asPlainString(input.meta_title),
        meta_description: metaDescription,
        keywords: asStringArray(input.keywords),
        slug: isPlaceholderValue(input.slug) ? "" : asPlainString(input.slug),
        internal_links_prerequisite: asStringArray(input.internal_links_prerequisite),
        internal_links_next_step: asStringArray(input.internal_links_next_step),
        internal_links_related: asStringArray(input.internal_links_related),
        schema_faq: input.schema_faq ?? [],
        schema_article: input.schema_article ?? {},
        article_markdown: articleMarkdown,
        body_markdown: asPlainString(input.body_markdown),
        read_more_markdown: asPlainString(input.read_more_markdown),
        faq_markdown: asPlainString(input.faq_markdown),
        references_markdown: asPlainString(input.references_markdown),
        group_post: asPlainString(input.group_post),
        page_post: asPlainString(input.page_post),
        visual_brief: asPlainString(input.visual_brief),
        references: asStringArray(input.references),
        canva_url: asPlainString(input.canva_url),
        published_url: asPlainString(input.published_url),
        status: normalizeStatus(input.status, mode),
        difficulty: normalizeDifficulty(input.difficulty),
        visual_status: normalizeVisualStatus(input.visual_status),
        primary_system: asPlainString(input.primary_system),
        secondary_systems: asStringArray(input.secondary_systems || (input as any).systems),
        publish_pack_status: asPlainString(input.publish_pack_status),
        references_status: asPlainString(input.references_status),
        next_action: asPlainString(input.next_action),
        notes: asPlainString(input.notes),
    };
}

export function validateArticleStudioPackage(pkg: ArticleStudioPackage) {
    const missingFields: string[] = [];
    const validationMessages: string[] = [];

    const isPartial = pkg.mode === "partial";

    if (isInvalidTopicId(pkg.topic_id)) {
        missingFields.push("topic_id");
        validationMessages.push("กรุณาเติม Topic ID จริง ห้ามใช้ค่าว่าง, GF-CONTENT-XXX หรือ TOPIC-ID");
    }

    // Title is required for Full Package, but optional (though recommended) for Partial Step
    if (!pkg.title && !isPartial) {
        missingFields.push("title");
        validationMessages.push("กรุณาเติม Title ก่อนดำเนินการต่อ");
    }

    if (!pkg.article_markdown && !pkg.body_markdown) {
        missingFields.push("body_markdown");
        validationMessages.push("กรุณาเติมเนื้อหา (Body / Draft) ก่อนดำเนินการต่อ");
    }

    return { missingFields, validationMessages };
}

export function resolveArticleStudioMissingGroups(pkg: ArticleStudioPackage): ArticleStudioPreview["missingFieldGroups"] {
    const validation = validateArticleStudioPackage(pkg);
    const isPartial = pkg.mode === "partial";

    const requiredLabels: Record<string, string> = {
        topic_id: "topic_id",
        article_title: "article_title",
        title: "title",
        body_markdown: "body_markdown / draft",
    };

    const required = validation.missingFields.map((field) => ({
        field,
        label: requiredLabels[field] ?? field,
        state: "blocking" as const,
    }));

    const recommended: ArticleStudioMissingItem[] = []; // GF Hub Sync
    const optional: ArticleStudioMissingItem[] = [];    // Publish / Tracking

    // Required for GF Hub Sync (Recommended)
    if (!pkg.season_id) recommended.push({ field: "season_id", label: "season_id", state: "warning" });
    if (!pkg.episode_id) recommended.push({ field: "episode_id", label: "episode_id", state: "warning" });
    if (!pkg.article_status || pkg.article_status === "idea") recommended.push({ field: "article_status", label: "article_status", state: "warning" });

    // Social Copy (Step 5) — recommended, not blocking
    if (!pkg.group_post_markdown && !pkg.group_post) recommended.push({ field: "group_post_markdown", label: "Group Post", state: "warning" });
    if (!pkg.page_post_markdown && !pkg.page_post) recommended.push({ field: "page_post_markdown", label: "Page Post", state: "warning" });

    // Required for Publish / SEO (Optional/Later)
    if (!pkg.published_url) optional.push({ field: "published_url", label: "final_url", state: "info" });
    if (!pkg.personal_post_markdown) optional.push({ field: "personal_post_markdown", label: "Personal Post", state: "info" });
    if (!pkg.social_extras_markdown) optional.push({ field: "social_extras_markdown", label: "Social Extras", state: "info" });
    if (!pkg.meta_description) optional.push({ field: "meta_description", label: "meta_description", state: "info" });
    if (pkg.keywords.length === 0) optional.push({ field: "keywords", label: "keywords", state: "info" });
    if (!pkg.visual_brief) optional.push({ field: "visual_brief", label: "visual_brief", state: "info" });

    return { required, recommended, optional };
}

export function resolveArticleStudioContentHealth(pkg: ArticleStudioPackage): ArticleStudioContentHealth {
    const validation = validateArticleStudioPackage(pkg);
    const requiredComplete = 3 - validation.missingFields.length;
    const seoComplete = [
        pkg.slug,
        pkg.meta_title,
        pkg.meta_description,
        pkg.keywords.length > 0 ? "keywords" : "",
    ].filter(Boolean).length;
    const internalLinksComplete = [
        pkg.internal_links_prerequisite.length > 0,
        pkg.internal_links_next_step.length > 0,
        pkg.internal_links_related.length > 0,
    ].filter(Boolean).length;
    const visualNotes = pkg.visual_brief || pkg.visual_status !== "not_needed_yet" ? "ready" : "missing";
    const body = pkg.body_markdown || pkg.article_markdown ? "ready" : "missing";
    const internalLinks = pkg.read_more_markdown || pkg.internal_links_related.length > 0 ? "ready" : "missing";
    const faq = pkg.faq_markdown || hasFaqContent(pkg) ? "ready" : "missing";
    const references = pkg.references_markdown || hasReferencesContent(pkg) ? "ready" : "missing";
    const groupPost = pkg.group_post_markdown || pkg.group_post ? "ready" : "missing";
    const pagePost = pkg.page_post_markdown || pkg.page_post ? "ready" : "missing";
    const personalPost: "ready" | "missing" = pkg.personal_post_markdown ? "ready" : "missing";
    const socialExtras: "ready" | "missing" = pkg.social_extras_markdown ? "ready" : "missing";

    const recommendedScore = [
        pkg.meta_description,
        pkg.keywords.length > 0 ? "keywords" : "",
        internalLinks === "ready" ? "internal_links" : "",
        visualNotes === "ready" ? "visual" : "",
        faq === "ready" ? "faq" : "",
        references === "ready" ? "references" : "",
    ].filter(Boolean).length;

    const hasMostRecommendedFields = recommendedScore >= 4;

    let status: ArticleStudioHealthStatus = "Draft Ready";
    if (requiredComplete < 3) {
        status = "Incomplete";
    } else if (pkg.status === "publish_ready" && hasMostRecommendedFields) {
        status = "Publish Ready";
    } else if (hasMostRecommendedFields && (pkg.mode === "editorial" || pkg.status === "needs_human_insight")) {
        status = "Review Needed";
    } else {
        status = "Draft Ready";
    }

    return {
        status,
        requiredComplete,
        requiredTotal: 3,
        seoComplete,
        seoTotal: 4,
        internalLinksComplete,
        internalLinksTotal: 3,
        visualNotes,
        faq,
        references,
        body,
        internalLinks,
        groupPost,
        pagePost,
        personalPost,
        socialExtras,
    };
}

function withPreviewMetadata(
    pkg: ArticleStudioPackage,
    sections: Record<ArticleStudioSectionKey, string>,
    detectedHeadings: string[]
): ArticleStudioPreview {
    const generatedFields: string[] = [];
    const normalizedPkg = normalizeArticleStudioPackage(pkg);

    // Title Resolution Priority: article_title > title > meta_title > topic_title > topic_id
    // But exclude invalid workflow/source labels
    const INVALID_TITLE_ROLES = [
        "NotebookLM", "Research Raw", "Research Direction", "Arbor Questions",
        "Brief", "Outline web article", "Script & Caption", "Assets / Canva",
        "SEO & Schema", "Publish", "Mini Research Brief"
    ].map(r => r.toLowerCase());

    const getCleanTitle = (candidate: string) => {
        if (!candidate) return "";
        const parts = candidate.split(/\s+[—–-]\s+/);
        const lastPart = parts[parts.length - 1].trim();
        if (INVALID_TITLE_ROLES.includes(lastPart.toLowerCase())) return "";
        return lastPart;
    };

    let resolvedTitle = normalizedPkg.article_title;
    if (!resolvedTitle) {
        resolvedTitle = getCleanTitle(normalizedPkg.title) || getCleanTitle(detectedHeadings[0]) || normalizedPkg.meta_title;
    }
    if (!resolvedTitle) {
        resolvedTitle = normalizedPkg.topic_id;
    }

    normalizedPkg.title = resolvedTitle;

    // SEO Guard: Auto-generated meta fields must NOT use topic_id, task metadata, or internal technical fields.
    // We achieve this by sanitizing the source text before generating.
    const sanitizeForSeo = (text: string) => {
        if (!text) return "";
        return text
            .replace(/GF-CONTENT-\d+/gi, "")
            .replace(/GF-ARTICLE-\d+/gi, "")
            .replace(/template_key:\s*\S+/gi, "")
            .replace(/stage:\s*\S+/gi, "")
            .replace(/task_role:\s*\S+/gi, "")
            .replace(/content_layer:\s*\S+/gi, "")
            .replace(/article_type:\s*\S+/gi, "")
            .replace(/systems:\s*\S+/gi, "")
            // Cleanup leftover colons/dashes from removed patterns
            .replace(/^\s*[:—–-]\s*/, "")
            .trim();
    };

    const seoTitleSource = sanitizeForSeo(resolvedTitle);

    if (normalizedPkg.meta_title) {
        normalizedPkg.meta_title = sanitizeForSeo(normalizedPkg.meta_title);
    } else if (seoTitleSource) {
        normalizedPkg.meta_title = seoTitleSource.length > 58 ? seoTitleSource.slice(0, 55).trimEnd() + "..." : seoTitleSource;
        generatedFields.push("meta_title");
    }

    if (normalizedPkg.meta_description) {
        normalizedPkg.meta_description = sanitizeForSeo(normalizedPkg.meta_description);
    } else if (normalizedPkg.article_markdown) {
        // Sanitize first few lines of markdown for description
        const cleanBody = sanitizeForSeo(normalizedPkg.article_markdown.slice(0, 1000));
        normalizedPkg.meta_description = shortDescription(seoTitleSource, cleanBody);
        generatedFields.push("meta_description");
    }

    if (normalizedPkg.keywords.length === 0 && (seoTitleSource || normalizedPkg.article_markdown)) {
        const cleanBody = sanitizeForSeo(normalizedPkg.article_markdown.slice(0, 1000));
        normalizedPkg.keywords = keywordCandidates(seoTitleSource, cleanBody);
        if (normalizedPkg.keywords.length > 0) generatedFields.push("keywords");
    }

    if (!normalizedPkg.slug && seoTitleSource) {
        normalizedPkg.slug = slugify(seoTitleSource);
        generatedFields.push("slug");
    }

    if (!normalizedPkg.visual_brief && (resolvedTitle || normalizedPkg.article_markdown)) {
        normalizedPkg.visual_brief = [
            `ภาพหลักสำหรับบทความ "${resolvedTitle}"`,
            "โทนสะอาด น่าเชื่อถือ เหมาะกับ Green Fineness",
            "สื่อสารประเด็นหลักของบทความให้เข้าใจเร็ว และหลีกเลี่ยงภาพ stock ที่คลุมเครือ",
        ].join("\n");
        generatedFields.push("visual_brief");
    }

    const { missingFields, validationMessages } = validateArticleStudioPackage(normalizedPkg);
    const missingFieldGroups = resolveArticleStudioMissingGroups(normalizedPkg);
    const contentHealth = resolveArticleStudioContentHealth(normalizedPkg);

    const detectedStepRole = detectStepRole(detectedHeadings, normalizedPkg.article_markdown);
    normalizedPkg.detectedStepRole = detectedStepRole;

    return {
        ...normalizedPkg,
        sections,
        detectedHeadings,
        missingFields,
        validationMessages,
        generatedFields,
        missingFieldGroups,
        contentHealth,
    };
}

export function slugify(value: string) {
    return value
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9ก-๙]+/gi, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 96);
}

export function parseArborArticlePackage(input: string, modeOverride?: ArticleStudioMode): ArticleStudioPreview {
    const jsonPackage = readJsonPackage(input);
    let preview: ArticleStudioPreview;

    if (jsonPackage) {
        const pkg = normalizeArticleStudioPackage(jsonPackage);
        preview = withPreviewMetadata(
            pkg,
            {
                research_direction: "",
                draft: pkg.article_markdown,
                seo_schema: [pkg.meta_title, pkg.meta_description].filter(Boolean).join("\n\n"),
                visual_brief: pkg.visual_brief,
                publish_checklist: "",
            },
            []
        );
    } else {
        preview = buildMarkdownPackage(input);
    }

    // Phase 3: Enhance detection for Partial mode
    if (modeOverride) {
        preview.mode = modeOverride;
    }

    if (preview.mode === "partial") {
        if (!preview.topic_id) preview.topic_id = extractTopicId(input);
        if (!preview.title) preview.title = extractTopicTitle(input);
    }

    // Re-resolve everything since topic_id/title/mode might have changed
    const validation = validateArticleStudioPackage(preview);
    preview.missingFields = validation.missingFields;
    preview.validationMessages = validation.validationMessages;
    preview.missingFieldGroups = resolveArticleStudioMissingGroups(preview);
    preview.contentHealth = resolveArticleStudioContentHealth(preview);

    return preview;
}

export function formatArticlePackageMarkdown(pkg: ArticleStudioPackage) {
    return `# ${pkg.title || "Untitled Article"}

## Research Direction
- Topic ID: ${pkg.topic_id || "-"}
- Mode: ${pkg.mode || "editorial"}
- Layer: ${pkg.content_layer || "knowledge"}
- Type: ${pkg.article_type || "knowledge_article"}
- Role: ${pkg.article_role || "-"}
- Status: ${pkg.status || "needs_human_insight"}
- Narrative: ${pkg.narrative_status || "not_started"}
- Difficulty: ${pkg.difficulty || "intermediate"}
- Visual Status: ${pkg.visual_status || "not_needed_yet"}

## Context
- Season: ${pkg.season_id || "-"}
- Episode: ${pkg.episode_id || "-"}
- Story Set: ${pkg.story_set || "-"}
- Story Order: ${pkg.story_order || "-"}

## Draft
${pkg.article_markdown || "_No draft provided._"}

## SEO & Schema
- Slug: ${pkg.slug || "-"}
- Meta Title: ${pkg.meta_title || "-"}
- Meta Description: ${pkg.meta_description || "-"}
- Keywords: ${pkg.keywords.join(", ") || "-"}

### Internal Links
- Prerequisite: ${pkg.internal_links_prerequisite.join(", ") || "-"}
- Next Step: ${pkg.internal_links_next_step.join(", ") || "-"}
- Related: ${pkg.internal_links_related.join(", ") || "-"}

### Schema FAQ
\`\`\`json
${JSON.stringify(pkg.schema_faq, null, 2)}
\`\`\`

### Schema Article
\`\`\`json
${JSON.stringify(pkg.schema_article, null, 2)}
\`\`\`

## Visual Brief
${pkg.visual_brief || "-"}

## Publish Checklist
- [ ] Review facts and claims
- [ ] Review SEO title and description
- [ ] Prepare visual package
- [ ] Publish article
- [ ] Post to group/page

## Distribution
### Group Post
${pkg.group_post_markdown || pkg.group_post || "-"}

### Page Post
${pkg.page_post_markdown || pkg.page_post || "-"}

### Personal Post
${pkg.personal_post_markdown || "-"}

### Social Extras
${pkg.social_extras_markdown || "-"}
`;
}

export function buildPublishPackJson(pkg: ArticleStudioPackage) {
    return {
        version: "article_studio_v1",
        exported_at: new Date().toISOString(),
        article: {
            mode: pkg.mode,
            topic_id: pkg.topic_id,
            title: pkg.title,
            slug: pkg.slug,
            content_layer: pkg.content_layer,
            article_type: pkg.article_type,
            article_role: pkg.article_role,
            season_id: pkg.season_id,
            episode_id: pkg.episode_id,
            story_set: pkg.story_set,
            story_order: pkg.story_order,
            status: pkg.status || "needs_human_insight",
            narrative_status: pkg.narrative_status,
            difficulty: pkg.difficulty || "intermediate",
            visual_status: pkg.visual_status || "not_needed_yet",
        },
        seo: {
            meta_title: pkg.meta_title,
            meta_description: pkg.meta_description,
            keywords: pkg.keywords,
            internal_links_prerequisite: pkg.internal_links_prerequisite,
            internal_links_next_step: pkg.internal_links_next_step,
            internal_links_related: pkg.internal_links_related,
            schema_faq: pkg.schema_faq,
            schema_article: pkg.schema_article,
        },
        content: {
            article_markdown: pkg.article_markdown,
            group_post_markdown: pkg.group_post_markdown,
            page_post_markdown: pkg.page_post_markdown,
            personal_post_markdown: pkg.personal_post_markdown,
            social_extras_markdown: pkg.social_extras_markdown,
            group_post: pkg.group_post,
            page_post: pkg.page_post,
            visual_brief: pkg.visual_brief,
            references: pkg.references,
            canva_url: pkg.canva_url,
            published_url: pkg.published_url,
        },
        markdown: formatArticlePackageMarkdown(pkg),
    };
}
