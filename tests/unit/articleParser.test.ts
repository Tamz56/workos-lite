import { describe, it, expect } from "vitest";
import { parseArticleMarkdown, generateUpdatePayload } from "@/lib/articleParser";
import { validatePayload } from "@/lib/arborInboxSchema";

describe("Article Parser - parseArticleMarkdown", () => {
    const mockMarkdown = `
# EP.10.3 — Cytokinin Plant Hormone

## Website Fields
### Title
ไซโตไคนิน (Cytokinin) เพื่อการเติบโต

### Slug
cytokinin-plant-hormone

### Hero Subtitle
ไซโตไคนินคืออะไร และสำคัญอย่างไรต่อพืช

### Short Summary
สรุปสั้นเกี่ยวกับไซโตไคนิน...

### Meta Title
ไซโตไคนิน ฮอร์โมนพืช | Green Fineness

### Meta Description
เรียนรู้เกี่ยวกับไซโตไคนิน...

### Category
ฮอร์โมนพืช

### Content Layer
Knowledge Article

### Journey Stage
Awareness

### Primary Keyword
ไซโตไคนิน

### Secondary Keywords
ฮอร์โมนพืช, การแบ่งเซลล์พืช, cytokinin

## Main Article Body
ไซโตไคนินเป็นฮอร์โมนพืชที่...
IMAGE_URL_01
คำอธิบายภาพที่ 1: การเติบโตของเซลล์พืช

รายละเอียดเพิ่มเติม...
IMAGE_URL_02

## Suggested References
1. Scholarly journal on Plant Hormones 2024
2. Green Fineness agronomy manual
`;

    it("should parse Website Fields, body, and suggested references correctly", () => {
        const result = parseArticleMarkdown(mockMarkdown);

        expect(result.fields.title).toBe("ไซโตไคนิน (Cytokinin) เพื่อการเติบโต");
        expect(result.fields.slug).toBe("cytokinin-plant-hormone");
        expect(result.fields.heroSubtitle).toBe("ไซโตไคนินคืออะไร และสำคัญอย่างไรต่อพืช");
        expect(result.fields.contentLayer).toBe("Knowledge Article");
        expect(result.fields.journeyStage).toBe("Awareness");
        expect(result.fields.primaryKeyword).toBe("ไซโตไคนิน");

        expect(result.fields.bodyContent).toContain("ไซโตไคนินเป็นฮอร์โมนพืชที่...");
        expect(result.fields.bodyContent).toContain("IMAGE_URL_01");
        expect(result.fields.bodyContent).toContain("IMAGE_URL_02");

        expect(result.fields.referencesContent).toContain("1. Scholarly journal on Plant Hormones 2024");
        expect(result.fields.referencesContent).toContain("2. Green Fineness agronomy manual");
    });

    it("should build image checklist and find missing placeholders", () => {
        const result = parseArticleMarkdown(mockMarkdown);

        expect(result.imageChecklist).toHaveLength(4);
        expect(result.imageChecklist[0].placeholder).toBe("IMAGE_URL_01");
        expect(result.imageChecklist[0].detected).toBe(true);
        expect(result.imageChecklist[1].placeholder).toBe("IMAGE_URL_02");
        expect(result.imageChecklist[1].detected).toBe(true);
        expect(result.imageChecklist[2].placeholder).toBe("IMAGE_URL_03");
        expect(result.imageChecklist[2].detected).toBe(false); // missing
        expect(result.imageChecklist[3].placeholder).toBe("IMAGE_URL_04");
        expect(result.imageChecklist[3].detected).toBe(false); // missing

        expect(result.warnings).toHaveLength(1);
        expect(result.warnings[0]).toContain("IMAGE_URL_03, IMAGE_URL_04");
    });

    it("should generate valid update-v0.1 payload for Knowledge Article content layer", () => {
        const parsed = parseArticleMarkdown(mockMarkdown);
        const payload = generateUpdatePayload(parsed, { id: "PROJ-123", slug: "cytokinin-plant-hormone" });

        expect(payload.schemaVersion).toBe("workos-writing-lab-update-v0.1");
        expect(payload.target.projectId).toBe("PROJ-123");
        expect(payload.fields.seo.knowledge_title).toBe("ไซโตไคนิน (Cytokinin) เพื่อการเติบโต");
        expect(payload.fields.seo.knowledge_body).toBeDefined();
        expect(payload.fields.seo.knowledge_body).toContain("ไซโตไคนินเป็นฮอร์โมนพืชที่...");
        expect(payload.fields.seo.references_notes).toBeDefined();
        expect(payload.fields.seo.references_notes).toContain("Scholarly journal on Plant Hormones 2024");

        // Validate the generated payload through schema validatePayload
        const validation = validatePayload(payload, []);
        expect(validation.valid).toBe(true);
        expect(validation.errors).toHaveLength(0);
    });

    it("should generate valid payload for Narrative Article content layer mapping to narrative_body", () => {
        const narrativeMarkdown = mockMarkdown.replace("Content Layer\nKnowledge Article", "Content Layer\nNarrative Article");
        const parsed = parseArticleMarkdown(narrativeMarkdown);
        const payload = generateUpdatePayload(parsed, { id: "PROJ-456", slug: "cytokinin-plant-hormone" });

        expect(payload.fields.seo.narrative_title).toBe("ไซโตไคนิน (Cytokinin) เพื่อการเติบโต");
        expect(payload.fields.seo.narrative_body).toBeDefined();
        expect(payload.fields.seo.narrative_body).toContain("ไซโตไคนินเป็นฮอร์โมนพืชที่...");
        expect(payload.fields.seo.knowledge_body).toBeUndefined();

        const validation = validatePayload(payload, []);
        expect(validation.valid).toBe(true);
    });
});
