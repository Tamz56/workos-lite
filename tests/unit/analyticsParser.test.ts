import { describe, it, expect } from "vitest";
import { parseAnalyticsData, generateSnapshotPayload } from "@/lib/analyticsParser";
import { validatePayload, SUPPORTED_SCHEMA_VERSION, SCHEMA_UPDATE_VERSION } from "@/lib/arborInboxSchema";
import { parseArticleMarkdown } from "@/lib/articleParser";

describe("Analytics CSV / Table Parser - Columns Detection", () => {
    it("should detect GA4 English columns and map fields correctly", () => {
        const raw = "Page path\tViews\tActive users\tAverage engagement time\tEvent count\n/library/golden-pea-amino-acid-guide\t320\t290\t140\t700";
        const result = parseAnalyticsData(raw);

        expect(result.sourceType).toBe("GA4");
        const viewsCol = result.columns.find(c => c.suggestedMapping === "views");
        expect(viewsCol).toBeDefined();
        expect(viewsCol?.confidence).toBe("High");
        expect(result.rows).toHaveLength(1);
        expect(result.rows[0].extractedData.views).toBe(320);
        expect(result.rows[0].extractedData.activeUsers).toBe(290);
    });

    it("should detect GA4 Thai columns and map fields correctly", () => {
        const raw = "เส้นทางหน้าเว็บ,จำนวนการดู,ผู้ใช้ที่ใช้งานอยู่,เวลาในการมีส่วนร่วมเฉลี่ย,จำนวนเหตุการณ์\n/library/golden-pea-amino-acid-guide,450,400,165,950";
        const result = parseAnalyticsData(raw);

        expect(result.sourceType).toBe("GA4");
        const viewsCol = result.columns.find(c => c.suggestedMapping === "views");
        expect(viewsCol).toBeDefined();
        expect(viewsCol?.header).toBe("จำนวนการดู");
        expect(result.rows).toHaveLength(1);
        expect(result.rows[0].extractedData.views).toBe(450);
        expect(result.rows[0].extractedData.activeUsers).toBe(400);
    });

    it("should detect Facebook post-level columns and map fields correctly", () => {
        const raw = "post url;reach;reactions;comments;shares;link clicks;saves\nhttps://facebook.com/123;1500;80;20;10;90;25";
        const result = parseAnalyticsData(raw);

        expect(result.sourceType).toBe("Facebook");
        expect(result.rows).toHaveLength(1);
        expect(result.rows[0].extractedData.reach).toBe(1500);
        expect(result.rows[0].extractedData.linkClicks).toBe(90);
        expect(result.rows[0].extractedData.postUrl).toBe("https://facebook.com/123");
    });

    it("should classify group-level daily summary reports and flag warning", () => {
        const raw = "Date\tDaily Active Members\tTotal Members\tDaily Posts\n2026-07-01\t450\t2500\t12";
        const result = parseAnalyticsData(raw);

        expect(result.sourceType).toBe("FacebookGroupDaily");
        expect(result.warning).toBeDefined();
        expect(result.warning).toContain("ระดับกลุ่ม (Group-level Daily Report)");
    });

    it("should ignore unknown columns and not crash", () => {
        const raw = "Page path\tViews\tRandom Unknown Column\n/some-path\t120\t9999";
        const result = parseAnalyticsData(raw);

        expect(result.sourceType).toBe("GA4");
        const unknownCol = result.columns.find(c => c.header === "Random Unknown Column");
        expect(unknownCol?.suggestedMapping).toBe("unsupported");
        expect(result.rows).toHaveLength(1);
        expect(result.rows[0].extractedData.views).toBe(120);
        expect(result.rows[0].extractedData.unsupported).toBeUndefined();
    });
});

describe("Analytics Parser - Article Matching & Selection Fallback", () => {
    const projects = [
        { id: "proj_01", title: "Golden Pea Amino Acid Guide", slug: "golden-pea-amino-acid-guide", published_url: "https://greenfineness.com/library/golden-pea-amino-acid-guide" }
    ];

    it("should match article exact published_url with high confidence", () => {
        const raw = "Page path\tViews\nhttps://greenfineness.com/library/golden-pea-amino-acid-guide\t320";
        const result = parseAnalyticsData(raw, projects);

        expect(result.rows[0].matchedProject).toBeDefined();
        expect(result.rows[0].matchedProject?.id).toBe("proj_01");
        expect(result.rows[0].matchedProject?.confidence).toBe("High");
        expect(result.rows[0].matchedProject?.method).toBe("exact_url");
    });

    it("should match article slug from URL path segment with high confidence", () => {
        const raw = "Page path\tViews\n/library/golden-pea-amino-acid-guide\t320";
        const result = parseAnalyticsData(raw, projects);

        expect(result.rows[0].matchedProject).toBeDefined();
        expect(result.rows[0].matchedProject?.id).toBe("proj_01");
        expect(result.rows[0].matchedProject?.confidence).toBe("High");
        expect(result.rows[0].matchedProject?.method).toBe("slug");
    });

    it("should match article title with medium confidence", () => {
        const raw = "Page title\tViews\nGolden Pea Amino Acid Guide\t320";
        const result = parseAnalyticsData(raw, projects);

        expect(result.rows[0].matchedProject).toBeDefined();
        expect(result.rows[0].matchedProject?.id).toBe("proj_01");
        expect(result.rows[0].matchedProject?.confidence).toBe("Medium");
        expect(result.rows[0].matchedProject?.method).toBe("title");
    });

    it("should not match and remain undefined for unknown targets", () => {
        const raw = "Page path\tViews\n/library/unknown-slug-xyz\t320";
        const result = parseAnalyticsData(raw, projects);

        expect(result.rows[0].matchedProject).toBeUndefined();
    });
});

describe("Analytics Parser - Generated Payload Validation", () => {
    it("should generate valid schema payload update package", () => {
        const raw = "Page path\tViews\tActive users\n/library/golden-pea-amino-acid-guide\t320\t290";
        const result = parseAnalyticsData(raw, [
            { id: "proj_01", title: "Golden Pea Amino Acid Guide", slug: "golden-pea-amino-acid-guide" }
        ]);

        const metadata = {
            sourceFileName: "Pasted Text",
            sourceType: "GA4",
            snapshotWindow: "24h",
            snapshotDate: "2026-07-01",
            importNote: "Test import notes"
        };

        const payload = generateSnapshotPayload(result.rows[0], metadata);

        // Validate package layout
        expect(payload.schemaVersion).toBe(SCHEMA_UPDATE_VERSION);
        expect(payload.target.projectId).toBe("proj_01");
        expect(payload.fields.performanceFeedback.ga4Snapshots.snap24h.views).toBe(320);
        expect(payload.fields.performanceFeedback.sourceMetadata.snapshotWindow).toBe("24h");

        // Validate schema using library validatePayload
        const validation = validatePayload(payload, []);
        expect(validation.valid).toBe(true);
        expect(validation.errors).toHaveLength(0);
    });
});

describe("Regressions - Schema & Markdown Parsers", () => {
    it("should validate workos-arbor-import-v0.1 successfully", () => {
        const legacyPayload = {
            schemaVersion: SUPPORTED_SCHEMA_VERSION,
            source: "Arbor",
            importBatchTitle: "Batch 1",
            items: [
                {
                    type: "project",
                    title: "Golden Pea Guide",
                    status: "planned"
                }
            ]
        };

        const validation = validatePayload(legacyPayload, []);
        expect(validation.valid).toBe(true);
    });

    it("should validate workos-writing-lab-update-v0.1 successfully", () => {
        const updatePayload = {
            schemaVersion: SCHEMA_UPDATE_VERSION,
            source: "Arbor",
            importBatchTitle: "Update 1",
            target: {
                type: "writing_lab_project",
                projectId: "proj_01",
                projectSlug: "golden-pea"
            },
            fields: {
                seo: {
                    title: "Updated Title"
                }
            }
        };

        const validation = validatePayload(updatePayload, []);
        expect(validation.valid).toBe(true);
    });

    it("should parse markdown articles correctly", () => {
        const md = `## Website Fields\n### Title\nPea protein guide\n### Slug\npea-protein-guide\n### Content Layer\nKnowledge Article\n\n## Main Article Body\nMain body text here.`;
        const result = parseArticleMarkdown(md);
        expect(result.fields.title).toBe("Pea protein guide");
        expect(result.fields.slug).toBe("pea-protein-guide");
        expect(result.fields.contentLayer).toBe("Knowledge Article");
        expect(result.fields.bodyContent).toContain("Main body text here.");
    });
});
