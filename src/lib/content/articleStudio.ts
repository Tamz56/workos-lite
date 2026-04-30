export type ArticleStudioStatus = "Needs Review" | "Draft" | "Approved" | "Published";

export type ArticleStudioPackage = {
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
    status: ArticleStudioStatus;
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
};

const EMPTY_PACKAGE: ArticleStudioPackage = {
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
    status: "Needs Review",
};

const FIELD_ALIASES: Record<keyof ArticleStudioPackage, string[]> = {
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
    status: ["status"],
};

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

function keywordCandidates(title: string, article: string) {
    const source = `${title} ${stripMarkdown(article)}`.toLowerCase();
    const words = source
        .split(/[^a-z0-9ก-๙]+/i)
        .map((word) => word.trim())
        .filter((word) => word.length >= 3 && !["the", "and", "for", "with", "this", "that", "จาก", "และ", "หรือ", "การ", "ของ", "คือ"].includes(word));

    return Array.from(new Set(words)).slice(0, 8);
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

        if (field === "keywords" || field.startsWith("internal_links_")) {
            byField[field] = asStringArray(value) as never;
        } else if (field === "schema_faq") {
            byField[field] = safeJson(value, []) as never;
        } else if (field === "schema_article") {
            byField[field] = safeJson(value, {}) as never;
        } else if (field === "status") {
            byField[field] = (asString(value) || "Needs Review") as ArticleStudioStatus;
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

    if (!byField.article_markdown) byField.article_markdown = sections.draft || input.trim();
    if (!byField.visual_brief) byField.visual_brief = sections.visual_brief;
    if (!byField.title) byField.title = blocks[0]?.heading ?? "";

    return withPreviewMetadata(byField, sections, blocks.map((block) => block.heading));
}

function withPreviewMetadata(
    pkg: ArticleStudioPackage,
    sections: Record<ArticleStudioSectionKey, string>,
    detectedHeadings: string[]
): ArticleStudioPreview {
    const generatedFields: string[] = [];
    const title = pkg.title || detectedHeadings[0] || "Untitled Article";

    if (!pkg.meta_title && title) {
        pkg.meta_title = title.length > 58 ? title.slice(0, 55).trimEnd() + "..." : title;
        generatedFields.push("meta_title");
    }

    if (!pkg.meta_description && pkg.article_markdown) {
        pkg.meta_description = firstSentence(pkg.article_markdown);
        generatedFields.push("meta_description");
    }

    if (pkg.keywords.length === 0 && (title || pkg.article_markdown)) {
        pkg.keywords = keywordCandidates(title, pkg.article_markdown);
        if (pkg.keywords.length > 0) generatedFields.push("keywords");
    }

    if (!pkg.slug && title) {
        pkg.slug = slugify(title);
        generatedFields.push("slug");
    }

    if (!pkg.visual_brief && (title || pkg.article_markdown)) {
        pkg.visual_brief = [
            `ภาพหลักสำหรับบทความ "${title}"`,
            "โทนสะอาด น่าเชื่อถือ เหมาะกับ Green Fineness",
            "สื่อสารประเด็นหลักของบทความให้เข้าใจเร็ว และหลีกเลี่ยงภาพ stock ที่คลุมเครือ",
        ].join("\n");
        generatedFields.push("visual_brief");
    }

    const required: (keyof ArticleStudioPackage)[] = ["topic_id", "title", "slug", "article_markdown"];
    const missingFields = required.filter((field) => {
        const value = pkg[field];
        return Array.isArray(value) ? value.length === 0 : !asString(value);
    });

    const fieldLabels: Partial<Record<keyof ArticleStudioPackage, string>> = {
        topic_id: "Topic ID",
        title: "Title",
        slug: "Slug",
        article_markdown: "Article Markdown / Draft",
    };
    const validationMessages = missingFields.map((field) => `กรุณาเติม ${fieldLabels[field] ?? field} ก่อนสร้าง Article Package`);

    return {
        ...pkg,
        status: pkg.status || "Needs Review",
        sections,
        detectedHeadings,
        missingFields,
        validationMessages,
        generatedFields,
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
        const pkg: ArticleStudioPackage = {
            ...EMPTY_PACKAGE,
            ...jsonPackage,
            keywords: asStringArray(jsonPackage.keywords),
            internal_links_prerequisite: asStringArray(jsonPackage.internal_links_prerequisite),
            internal_links_next_step: asStringArray(jsonPackage.internal_links_next_step),
            internal_links_related: asStringArray(jsonPackage.internal_links_related),
            schema_faq: jsonPackage.schema_faq ?? [],
            schema_article: jsonPackage.schema_article ?? {},
            status: (jsonPackage.status as ArticleStudioStatus) || "Needs Review",
        };

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
- Status: ${pkg.status || "Needs Review"}

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
            topic_id: pkg.topic_id,
            title: pkg.title,
            slug: pkg.slug,
            status: pkg.status || "Needs Review",
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
        },
        markdown: formatArticlePackageMarkdown(pkg),
    };
}
