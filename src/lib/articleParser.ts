export interface ParsedArticleFields {
    title?: string;
    slug?: string;
    heroSubtitle?: string;
    shortSummary?: string;
    metaTitle?: string;
    metaDescription?: string;
    category?: string;
    contentLayer?: string;
    series?: string;
    journeyStage?: string;
    primaryKeyword?: string;
    secondaryKeywords?: string;
    bodyContent?: string;
    referencesContent?: string;
}

export interface ParseResult {
    fields: ParsedArticleFields;
    imageChecklist: {
        placeholder: string;
        detected: boolean;
    }[];
    warnings: string[];
    missingFields: string[];
}

export function parseArticleMarkdown(markdown: string): ParseResult {
    const lines = markdown.split("\n");
    const fields: ParsedArticleFields = {};
    const warnings: string[] = [];
    const missingFields: string[] = [];

    let currentSection: "none" | "website_fields" | "body" | "references" = "none";
    let currentField: keyof ParsedArticleFields | null = null;
    let currentContent: string[] = [];

    const flushField = () => {
        if (currentField) {
            const val = currentContent.join("\n").trim();
            fields[currentField] = val;
        }
        currentField = null;
        currentContent = [];
    };

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmed = line.trim();

        // 1. Detect ## headings (sections)
        if (trimmed.startsWith("## ")) {
            flushField();
            const secName = trimmed.substring(3).trim().toLowerCase();
            if (secName.includes("website fields")) {
                currentSection = "website_fields";
            } else if (secName.includes("body") || secName.includes("content")) {
                currentSection = "body";
                currentField = "bodyContent";
            } else if (secName.includes("references")) {
                currentSection = "references";
                currentField = "referencesContent";
            } else {
                currentSection = "none";
            }
            continue;
        }

        // 2. Detect ### headings (fields inside Website Fields)
        if (trimmed.startsWith("### ")) {
            flushField();
            if (currentSection === "website_fields") {
                const fieldName = trimmed.substring(4).trim().toLowerCase();
                if (fieldName === "title") currentField = "title";
                else if (fieldName === "slug") currentField = "slug";
                else if (fieldName === "hero subtitle" || fieldName === "herosubtitle") currentField = "heroSubtitle";
                else if (fieldName === "short summary" || fieldName === "shortsummary") currentField = "shortSummary";
                else if (fieldName === "meta title" || fieldName === "metatitle") currentField = "metaTitle";
                else if (fieldName === "meta description" || fieldName === "metadescription") currentField = "metaDescription";
                else if (fieldName === "category") currentField = "category";
                else if (fieldName === "content layer" || fieldName === "contentlayer") currentField = "contentLayer";
                else if (fieldName === "series") currentField = "series";
                else if (fieldName === "journey stage" || fieldName === "journeystage") currentField = "journeyStage";
                else if (fieldName === "primary keyword" || fieldName === "primarykeyword") currentField = "primaryKeyword";
                else if (fieldName === "secondary keywords" || fieldName === "secondarykeywords") currentField = "secondaryKeywords";
            }
            continue;
        }

        // 3. Accumulate content for active fields
        if (currentField) {
            // Clean separator frontmatter if inside bodyContent or referencesContent
            if ((currentField === "bodyContent" || currentField === "referencesContent") && trimmed === "---") {
                continue;
            }
            currentContent.push(line);
        } else {
            // Fallback: if no field is active but section is body or references
            if (currentSection === "body") {
                currentField = "bodyContent";
                currentContent.push(line);
            } else if (currentSection === "references") {
                currentField = "referencesContent";
                currentContent.push(line);
            }
        }
    }

    // Flush last field
    flushField();

    // 4. Validate presence and collect missing fields list
    const checkRequired = (key: keyof ParsedArticleFields, name: string) => {
        if (!fields[key]) {
            missingFields.push(name);
        }
    };
    checkRequired("title", "Title");
    checkRequired("slug", "Slug");
    checkRequired("contentLayer", "Content Layer");
    checkRequired("bodyContent", "Article Body Content");

    // 5. Image placeholders checklist
    const bodyStr = fields.bodyContent || "";
    const placeholders = ["IMAGE_URL_01", "IMAGE_URL_02", "IMAGE_URL_03", "IMAGE_URL_04"];
    const imageChecklist = placeholders.map(p => {
        const regex = new RegExp(p, "i");
        const detected = regex.test(bodyStr);
        return { placeholder: p, detected };
    });

    const missingImages = imageChecklist.filter(img => !img.detected);
    if (missingImages.length > 0) {
        warnings.push(`ไม่พบ Image Placeholders ในเนื้อหา: ${missingImages.map(img => img.placeholder).join(", ")}`);
    }

    // 6. Content Layer validation
    const layer = (fields.contentLayer || "").trim().toLowerCase();
    if (!layer) {
        warnings.push("ไม่พบช่องข้อมูล Content Layer กรุณาระบุชนิดบทความ");
    } else if (!layer.includes("knowledge") && !layer.includes("narrative")) {
        warnings.push(`ข้อมูล Content Layer "${fields.contentLayer}" ไม่ตรงกับ 'Knowledge Article' หรือ 'Narrative Article'`);
    }

    return {
        fields,
        imageChecklist,
        warnings,
        missingFields
    };
}

export function generateUpdatePayload(
    parsedResult: ParseResult, 
    targetProject: { id?: string; slug?: string },
    importBatchTitle: string = "Markdown Import Draft"
) {
    const { fields } = parsedResult;
    const layer = (fields.contentLayer || "").trim().toLowerCase();
    const isKnowledge = layer.includes("knowledge");
    const isNarrative = layer.includes("narrative");

    const seo: Record<string, any> = {
        title: fields.title || "",
        slug: fields.slug || "",
        meta_title: fields.metaTitle || "",
        meta_description: fields.metaDescription || "",
        keywords: fields.secondaryKeywords || "",
        excerpt: fields.shortSummary || "",
        references_notes: fields.referencesContent || ""
    };

    if (isKnowledge) {
        seo.knowledge_title = fields.title || "";
        seo.knowledge_slug = fields.slug || "";
        seo.knowledge_hero_subtitle = fields.heroSubtitle || "";
        seo.knowledge_short_summary = fields.shortSummary || "";
        seo.knowledge_meta_title = fields.metaTitle || "";
        seo.knowledge_meta_description = fields.metaDescription || "";
        seo.knowledge_keywords = fields.secondaryKeywords || "";
        seo.knowledge_category = fields.category || "";
        seo.knowledge_primary_keyword = fields.primaryKeyword || "";
        seo.knowledge_secondary_keywords = fields.secondaryKeywords || "";
        seo.knowledge_body = fields.bodyContent || "";
        seo.knowledge_status = "draft";
        seo.journey_stage = fields.journeyStage || "";
    } else if (isNarrative) {
        seo.narrative_title = fields.title || "";
        seo.narrative_slug = fields.slug || "";
        seo.narrative_hero_subtitle = fields.heroSubtitle || "";
        seo.narrative_short_summary = fields.shortSummary || "";
        seo.narrative_meta_title = fields.metaTitle || "";
        seo.narrative_meta_description = fields.metaDescription || "";
        seo.narrative_keywords = fields.secondaryKeywords || "";
        seo.narrative_body = fields.bodyContent || "";
        seo.narrative_status = "draft";
        seo.narrative_journey_stage = fields.journeyStage || "";
    } else {
        // Fallback: Populate both so user gets full option, warnings were already triggered
        seo.knowledge_title = fields.title || "";
        seo.knowledge_body = fields.bodyContent || "";
        seo.narrative_title = fields.title || "";
        seo.narrative_body = fields.bodyContent || "";
    }

    return {
        schemaVersion: "workos-writing-lab-update-v0.1",
        source: "Arbor Inbox Markdown Parser",
        importBatchTitle,
        target: {
            type: "writing_lab_project",
            projectId: targetProject.id || "",
            projectSlug: targetProject.slug || ""
        },
        fields: {
            seo
        }
    };
}
