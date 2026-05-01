export type ArticleStudioMode = "editorial" | "structured";
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
};

export type ArticleStudioPackage = {
    mode: ArticleStudioMode;
    topic_id: string;
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
    group_post: string;
    page_post: string;
    visual_brief: string;
    references: string[];
    canva_url: string;
    published_url: string;
    status: ArticleStudioStatus;
    difficulty: ArticleStudioDifficulty;
    visual_status: ArticleStudioVisualStatus;
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
    group_post: "",
    page_post: "",
    visual_brief: "",
    references: [],
    canva_url: "",
    published_url: "",
    status: "needs_human_insight",
    difficulty: "intermediate",
    visual_status: "not_needed_yet",
};

const FIELD_ALIASES: Record<keyof ArticleStudioPackage, string[]> = {
    mode: ["mode", "article mode"],
    topic_id: ["topic_id", "topic id", "topic-id"],
    title: ["title", "article title", "working title"],
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
    group_post: ["group_post", "group post"],
    page_post: ["page_post", "page post"],
    visual_brief: ["visual_brief", "visual brief"],
    references: ["references", "reference", "เอกสารอ้างอิง", "แหล่งอ้างอิง"],
    canva_url: ["canva_url", "canva url", "canva"],
    published_url: ["published_url", "published url", "publish url", "article url"],
    status: ["status"],
    difficulty: ["difficulty", "level"],
    visual_status: ["visual_status", "visual status"],
};

const VALID_MODES: ArticleStudioMode[] = ["editorial", "structured"];
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
    draft: ["draft", "article draft", "article_markdown", "article markdown"],
    seo_schema: ["seo & schema", "seo and schema", "seo schema", "seo", "schema"],
    visual_brief: ["visual brief", "visual package", "visual"],
    publish_checklist: ["publish checklist", "review / publish", "publish"],
};

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

function isPlaceholderValue(value: unknown) {
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

function isInvalidTopicId(value: string) {
    const normalized = value.trim().toUpperCase();
    return !normalized || normalized === "GF-CONTENT-XXX" || normalized === "TOPIC-ID";
}

function stripFence(input: string) {
    return input.trim().replace(/^```(?:json|markdown|md)?\s*/i, "").replace(/```$/i, "").trim();
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

    if (!byField.article_markdown) byField.article_markdown = sections.draft || (blocks.length === 0 ? input.trim() : "");
    if (!byField.visual_brief) byField.visual_brief = sections.visual_brief;
    if (!byField.title) byField.title = blocks[0]?.heading ?? "";

    return withPreviewMetadata(byField, sections, blocks.map((block) => block.heading));
}

export function normalizeArticleStudioPackage(input: Partial<ArticleStudioPackage> & { draft?: unknown }): ArticleStudioPackage {
    const mode = normalizeMode(input.mode);
    const title = isPlaceholderValue(input.title) ? "" : asPlainString(input.title);
    const articleMarkdown = asPlainString(input.article_markdown) || asPlainString(input.draft);
    const metaDescription = isPlaceholderValue(input.meta_description) ? "" : asPlainString(input.meta_description);

    return {
        ...EMPTY_PACKAGE,
        ...input,
        mode,
        topic_id: normalizeTopicId(input.topic_id),
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
        group_post: asPlainString(input.group_post),
        page_post: asPlainString(input.page_post),
        visual_brief: asPlainString(input.visual_brief),
        references: asStringArray(input.references),
        canva_url: asPlainString(input.canva_url),
        published_url: asPlainString(input.published_url),
        status: normalizeStatus(input.status, mode),
        difficulty: normalizeDifficulty(input.difficulty),
        visual_status: normalizeVisualStatus(input.visual_status),
    };
}

export function validateArticleStudioPackage(pkg: ArticleStudioPackage) {
    const missingFields: string[] = [];
    const validationMessages: string[] = [];

    if (isInvalidTopicId(pkg.topic_id)) {
        missingFields.push("topic_id");
        validationMessages.push("กรุณาเติม Topic ID จริง ห้ามใช้ค่าว่าง, GF-CONTENT-XXX หรือ TOPIC-ID");
    }
    if (!pkg.title) {
        missingFields.push("title");
        validationMessages.push("กรุณาเติม Title ก่อนสร้าง Article Package");
    }
    if (!pkg.article_markdown) {
        missingFields.push("article_markdown");
        validationMessages.push("กรุณาเติม Article Markdown / Draft ก่อนสร้าง Article Package");
    }

    return { missingFields, validationMessages };
}

export function resolveArticleStudioMissingGroups(pkg: ArticleStudioPackage): ArticleStudioPreview["missingFieldGroups"] {
    const validation = validateArticleStudioPackage(pkg);
    const requiredLabels: Record<string, string> = {
        topic_id: "topic_id",
        title: "title",
        article_markdown: "article_markdown / draft",
    };

    const required = validation.missingFields.map((field) => ({
        field,
        label: requiredLabels[field] ?? field,
        state: "blocking" as const,
    }));

    const recommended: ArticleStudioMissingItem[] = [];
    if (!pkg.meta_description) recommended.push({ field: "meta_description", label: "meta_description", state: "warning" });
    if (pkg.keywords.length === 0) recommended.push({ field: "keywords", label: "keywords", state: "warning" });
    if (
        pkg.internal_links_prerequisite.length === 0 ||
        pkg.internal_links_next_step.length === 0 ||
        pkg.internal_links_related.length === 0
    ) {
        recommended.push({ field: "internal_links", label: "internal_links", state: "warning" });
    }
    if (!pkg.visual_brief && pkg.visual_status === "not_needed_yet") recommended.push({ field: "visual_brief", label: "visual_brief", state: "warning" });
    if (!hasFaqContent(pkg)) recommended.push({ field: "schema_faq", label: "faq / schema_faq", state: "warning" });
    if (!hasReferencesContent(pkg)) recommended.push({ field: "references", label: "references", state: "warning" });

    const optional: ArticleStudioMissingItem[] = [];
    if (!pkg.group_post) optional.push({ field: "group_post", label: "group_post", state: "info" });
    if (!pkg.page_post) optional.push({ field: "page_post", label: "page_post", state: "info" });
    if (!pkg.canva_url) optional.push({ field: "canva_url", label: "canva_url", state: "info" });
    if (!pkg.published_url) optional.push({ field: "published_url", label: "published_url", state: "info" });

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
    const faq = hasFaqContent(pkg) ? "ready" : "missing";
    const references = hasReferencesContent(pkg) ? "ready" : "missing";

    const recommendedScore = [
        pkg.meta_description,
        pkg.keywords.length > 0 ? "keywords" : "",
        internalLinksComplete === 3 ? "internal_links" : "",
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
    };
}

function withPreviewMetadata(
    pkg: ArticleStudioPackage,
    sections: Record<ArticleStudioSectionKey, string>,
    detectedHeadings: string[]
): ArticleStudioPreview {
    const generatedFields: string[] = [];
    const normalizedPkg = normalizeArticleStudioPackage(pkg);
    const title = normalizedPkg.title || detectedHeadings[0] || "";

    if (!normalizedPkg.meta_title && title) {
        normalizedPkg.meta_title = title.length > 58 ? title.slice(0, 55).trimEnd() + "..." : title;
        generatedFields.push("meta_title");
    }

    if (!normalizedPkg.meta_description && normalizedPkg.article_markdown) {
        normalizedPkg.meta_description = shortDescription(title, normalizedPkg.article_markdown);
        generatedFields.push("meta_description");
    }

    if (normalizedPkg.keywords.length === 0 && (title || normalizedPkg.article_markdown)) {
        normalizedPkg.keywords = keywordCandidates(title, normalizedPkg.article_markdown);
        if (normalizedPkg.keywords.length > 0) generatedFields.push("keywords");
    }

    if (!normalizedPkg.slug && title) {
        normalizedPkg.slug = slugify(title);
        generatedFields.push("slug");
    }

    if (!normalizedPkg.visual_brief && (title || normalizedPkg.article_markdown)) {
        normalizedPkg.visual_brief = [
            `ภาพหลักสำหรับบทความ "${title}"`,
            "โทนสะอาด น่าเชื่อถือ เหมาะกับ Green Fineness",
            "สื่อสารประเด็นหลักของบทความให้เข้าใจเร็ว และหลีกเลี่ยงภาพ stock ที่คลุมเครือ",
        ].join("\n");
        generatedFields.push("visual_brief");
    }

    const { missingFields, validationMessages } = validateArticleStudioPackage(normalizedPkg);
    const missingFieldGroups = resolveArticleStudioMissingGroups(normalizedPkg);
    const contentHealth = resolveArticleStudioContentHealth(normalizedPkg);

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

export function parseArborArticlePackage(input: string): ArticleStudioPreview {
    const jsonPackage = readJsonPackage(input);
    if (jsonPackage) {
        const pkg = normalizeArticleStudioPackage(jsonPackage);

        return withPreviewMetadata(
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
    }

    return buildMarkdownPackage(input);
}

export function formatArticlePackageMarkdown(pkg: ArticleStudioPackage) {
    return `# ${pkg.title || "Untitled Article"}

## Research Direction
- Topic ID: ${pkg.topic_id || "-"}
- Mode: ${pkg.mode || "editorial"}
- Status: ${pkg.status || "needs_human_insight"}
- Difficulty: ${pkg.difficulty || "intermediate"}
- Visual Status: ${pkg.visual_status || "not_needed_yet"}

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
${pkg.group_post || "-"}

### Page Post
${pkg.page_post || "-"}
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
            status: pkg.status || "needs_human_insight",
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
