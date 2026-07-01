import { describe, it, expect } from "vitest";
import { parseAnalyticsData, generateSnapshotPayload, parseGA4BackfillData, normalizeBounceRate } from "@/lib/analyticsParser";
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

describe("Analytics Parser - Facebook Insight Custom Mapping Patch", () => {
    it("should parse Facebook Thai group daily overview row correctly", () => {
        const raw = "วันที่,โพสต์,ความคิดเห็น,ความรู้สึก,เข้าร่วมแล้ว,โพสต์หรือแสดงความคิดเห็น,ดูแล้ว\n2026-07-01,12,85,120,40,150,1600";
        const result = parseAnalyticsData(raw);

        // Classified as FacebookGroupDaily because of headers like "เข้าร่วมแล้ว" or daily summary indicators, or headers score
        expect(result.sourceType).toBe("FacebookGroupDaily");
        expect(result.rows[0].rowType).toBe("facebook_group_overview");

        // "โพสต์" column has numeric value "12", so it must be mapped to unsupported (ignored posts count), not postTitle
        const postCol = result.columns.find(c => c.header === "โพสต์");
        expect(postCol?.suggestedMapping).toBe("unsupported");
        expect(result.rows[0].extractedData.postTitle).toBeUndefined();

        // Mapped metrics checks
        expect(result.rows[0].extractedData.reach).toBe(1600); // "ดูแล้ว" => reach
        expect(result.rows[0].extractedData.comments).toBe(85); // "ความคิดเห็น" => comments
        expect(result.rows[0].extractedData.reactions).toBe(120); // "ความรู้สึก" => reactions
    });

    it("should parse Facebook post-level row with text and postURL correctly", () => {
        const raw = "โพสต์,ผู้โพสต์,ความคิดเห็น,ความรู้สึก,ดูแล้ว,ลิงก์โพสต์\nEP.10.3 Cytokinin,ตั้ม,15,45,350,https://facebook.com/posts/123";
        const result = parseAnalyticsData(raw);

        expect(result.sourceType).toBe("Facebook");
        expect(result.rows[0].rowType).toBe("facebook_post");

        // "โพสต์" column has text "EP.10.3 Cytokinin", so it must be mapped to postTitle
        const postCol = result.columns.find(c => c.header === "โพสต์");
        expect(postCol?.suggestedMapping).toBe("postTitle");
        expect(result.rows[0].extractedData.postTitle).toBe("EP.10.3 Cytokinin");

        expect(result.rows[0].extractedData.postUrl).toBe("https://facebook.com/posts/123");
        expect(result.rows[0].extractedData.reach).toBe(350);
    });

    it("should detect Summary row correctly and flag rowType = summary", () => {
        const raw = "โพสต์,ผู้โพสต์,ความคิดเห็น,ความรู้สึก,ดูแล้ว,ลิงก์โพสต์\nEP.10.3,ตั้ม,15,45,350,https://facebook.com/123\nรวมทั้งหมด,,15,45,350,";
        const result = parseAnalyticsData(raw);

        expect(result.rows).toHaveLength(2);
        expect(result.rows[0].rowType).toBe("facebook_post");
        expect(result.rows[1].rowType).toBe("summary");
    });
});

describe("Analytics Parser - Manual Target Fallback & Snapshot Generation", () => {
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

    it("should generate valid package with manual selection fallback when auto match fails", () => {
        const raw = "โพสต์,ความรู้สึก,ดูแล้ว\nEP.10.3 Cytokinin,45,350";
        const result = parseAnalyticsData(raw, projects);

        // Auto match fails
        expect(result.rows[0].matchedProject).toBeUndefined();

        // Simulate manual project selection in frontend
        const selectedProj = projects[0];
        const rowWithManualTarget = {
            ...result.rows[0],
            matchedProject: {
                id: selectedProj.id,
                title: selectedProj.title,
                slug: selectedProj.slug,
                method: "manual" as const,
                confidence: "Manual" as const
            }
        };

        const metadata = {
            sourceFileName: "Pasted Text",
            sourceType: "Facebook",
            snapshotWindow: "7d",
            snapshotDate: "2026-07-02"
        };

        const payload = generateSnapshotPayload(rowWithManualTarget, metadata);

        expect(payload.target.projectId).toBe("proj_01");
        expect(payload.fields.performanceFeedback.sourceMetadata.matchedBy).toBe("manual");
        expect(payload.fields.performanceFeedback.sourceMetadata.matchConfidence).toBe("Manual");

        const validation = validatePayload(payload, []);
        expect(validation.valid).toBe(true);
    });

    it("should generate valid package for group overview row when manual target is supplied", () => {
        const raw = "วันที่,โพสต์,ความคิดเห็น,ความรู้สึก,เข้าร่วมแล้ว,ดูแล้ว\n2026-07-01,12,85,120,40,1600";
        const result = parseAnalyticsData(raw, projects);

        expect(result.rows[0].rowType).toBe("facebook_group_overview");

        const selectedProj = projects[0];
        const rowWithManualTarget = {
            ...result.rows[0],
            matchedProject: {
                id: selectedProj.id,
                title: selectedProj.title,
                slug: selectedProj.slug,
                method: "manual" as const,
                confidence: "Manual" as const
            }
        };

        const metadata = {
            sourceFileName: "Pasted Text",
            sourceType: "FacebookGroupDaily",
            snapshotWindow: "24h",
            snapshotDate: "2026-07-01"
        };

        const payload = generateSnapshotPayload(rowWithManualTarget, metadata);

        expect(payload.target.projectId).toBe("proj_01");
        expect(payload.fields.performanceFeedback.sourceMetadata.sourceType).toBe("facebook_group_overview");
        expect(payload.fields.performanceFeedback.sourceMetadata.matchedBy).toBe("manual");
        expect(payload.fields.performanceFeedback.sourceMetadata.matchConfidence).toBe("Manual");
        expect(payload.fields.performanceFeedback.sourceMetadata.rowType).toBe("facebook_group_overview");
        expect(payload.fields.performanceFeedback.facebookSnapshots.snap24h.notes).toContain("Group Overview Import:");

        const validation = validatePayload(payload, []);
        expect(validation.valid).toBe(true);
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

describe("Manual Quick Post Snapshot Payload Validation", () => {
    const SCHEMA_UPDATE_VERSION = "workos-writing-lab-update-v0.1";

    it("should validate a valid quick snapshot payload successfully", () => {
        const payload = {
            schemaVersion: SCHEMA_UPDATE_VERSION,
            source: "Arbor",
            importBatchTitle: "Manual Snapshot - Facebook Group 24h",
            action: "apply_update",
            target: {
                type: "writing_lab_project",
                projectId: "proj_01",
                projectSlug: "golden-pea"
            },
            fields: {
                performanceFeedback: {
                    facebookSnapshots: {
                        snap24h: {
                            snapshotDate: "2026-06-29",
                            window: "24h",
                            platform: "facebook_group",
                            postUrl: "https://facebook.com/groups/posts/123",
                            reach: 227,
                            reactions: 11,
                            comments: 0,
                            shares: 3,
                            linkClicks: 0,
                            engagement: 14,
                            notes: "Test quick snapshot"
                        }
                    },
                    sourceMetadata: {
                        sourceFileName: "Manual Input Form",
                        sourceType: "facebook_group_post",
                        snapshotWindow: "24h",
                        snapshotDate: "2026-06-29",
                        matchedBy: "manual",
                        matchConfidence: "Manual",
                        rowType: "manual_post_snapshot",
                        rawSourceSummary: "Manual Quick Post: Views/Reach=227, Reactions=11, Shares=3",
                        importNote: "Test quick snapshot"
                    }
                }
            }
        };

        const validation = validatePayload(payload, []);
        expect(validation.valid).toBe(true);
        expect(validation.errors).toHaveLength(0);
    });

    it("should fail validation if schema version is incorrect", () => {
        const payload = {
            schemaVersion: "invalid-version",
            source: "Arbor",
            target: {
                type: "writing_lab_project",
                projectId: "proj_01",
                projectSlug: "golden-pea"
            },
            fields: {
                performanceFeedback: {
                    sourceMetadata: {
                        rowType: "manual_post_snapshot"
                    }
                }
            }
        };

        const validation = validatePayload(payload, []);
        expect(validation.valid).toBe(false);
    });
});

describe("Screenshot-assisted Snapshot Payload Validation", () => {
    const SCHEMA_UPDATE_VERSION = "workos-writing-lab-update-v0.1";

    it("should validate a valid GA4 screenshot-assisted snapshot payload successfully", () => {
        const payload = {
            schemaVersion: SCHEMA_UPDATE_VERSION,
            source: "Arbor",
            importBatchTitle: "Screenshot Snapshot - GA4 24h",
            action: "apply_update",
            target: {
                type: "writing_lab_project",
                projectId: "proj_01",
                projectSlug: "golden-pea"
            },
            fields: {
                performanceFeedback: {
                    ga4Snapshots: {
                        snap24h: {
                            snapshotDate: "2026-06-29",
                            window: "24h",
                            publishedUrl: "/library/golden-pea-amino-acid-guide",
                            pageTitle: "EP.10.3 Cytokinin guide",
                            views: 350,
                            activeUsers: 310,
                            events: 480,
                            averageEngagementTime: 85,
                            bounceRate: "28.5",
                            sourceMedium: "organic / google",
                            notes: "Screenshot manual verify"
                        }
                    },
                    sourceMetadata: {
                        sourceFileName: "Screenshot Upload",
                        sourceType: "ga4_article",
                        snapshotWindow: "24h",
                        snapshotDate: "2026-06-29",
                        matchedBy: "manual",
                        matchConfidence: "Manual",
                        rowType: "screenshot_snapshot",
                        importMethod: "screenshot_assisted",
                        rawSourceSummary: "GA4 Screenshot: Views=350, Users=310, Events=480",
                        importNote: "Screenshot manual verify"
                    }
                }
            }
        };

        const validation = validatePayload(payload, []);
        expect(validation.valid).toBe(true);
        expect(validation.errors).toHaveLength(0);
    });

    it("should validate a valid Facebook screenshot-assisted snapshot payload successfully", () => {
        const payload = {
            schemaVersion: SCHEMA_UPDATE_VERSION,
            source: "Arbor",
            importBatchTitle: "Screenshot Snapshot - Facebook 7d",
            action: "apply_update",
            target: {
                type: "writing_lab_project",
                projectId: "proj_01",
                projectSlug: "golden-pea"
            },
            fields: {
                performanceFeedback: {
                    facebookSnapshots: {
                        snap7d: {
                            snapshotDate: "2026-06-29",
                            window: "7d",
                            platform: "facebook_group",
                            postUrl: "https://facebook.com/groups/posts/123",
                            reach: 227,
                            reactions: 11,
                            comments: 0,
                            shares: 3,
                            linkClicks: 5,
                            engagement: 14,
                            photoViews: 0,
                            otherClicks: 0,
                            publishedDate: "2026-06-22",
                            notes: "Screenshot verification note"
                        }
                    },
                    sourceMetadata: {
                        sourceFileName: "Screenshot Upload",
                        sourceType: "facebook_group_post",
                        snapshotWindow: "7d",
                        snapshotDate: "2026-06-29",
                        matchedBy: "manual",
                        matchConfidence: "Manual",
                        rowType: "screenshot_snapshot",
                        importMethod: "screenshot_assisted",
                        rawSourceSummary: "Facebook Screenshot: Views/Reach=227, Engagement=14, Reactions=11, Shares=3, LinkClicks=5",
                        importNote: "Screenshot verification note"
                    }
                }
            }
        };

        const validation = validatePayload(payload, []);
        expect(validation.valid).toBe(true);
        expect(validation.errors).toHaveLength(0);
    });

    describe("GA4 Article Backfill Parser", () => {
        const mockProjects = [
            { id: "proj_01", title: "ไซโตไคนินคืออะไร", slug: "cytokinin-guide" },
            { id: "proj_02", title: "Plant Journey เมล็ดพันธุ์", slug: "plant-journey-seeds" },
            { id: "proj_03", title: "การดูแลต้นไม้", slug: "tree-care" },
            { id: "proj_04", title: "ไซโตไคนินเพื่อการเติบโต", slug: "cytokinin-growth" }
        ];

        const rawReport = `
# GA4 Report Export
วันที่เริ่มต้น: 2026-06-01
วันที่สิ้นสุด: 2026-06-30
ผู้ใช้รวมทั้งเว็บ: 10,000

ชื่อหน้าเว็บและคลาสหน้าจอ	เส้นทางหน้าเว็บ	จำนวนการดู	ผู้ใช้ที่ใช้งานอยู่	จำนวนเหตุการณ์	อัตราตีกลับ	เวลาในการมีส่วนร่วมเฉลี่ย
คลังความรู้ | ไซโตไคนินคืออะไร	/library/cytokinin-guide	10	10	28	0.9	45
คลังความรู้ | Green Fineness	/library	4500	4000	9000	0.4	60
Home	/	5000	4500	8000	0.3	10
Page not found	/404	12	10	15	0.95	5
ติดต่อเรา | Green Fineness	/contact	25	22	40	0.5	30
Plant Journey เมล็ดพันธุ์พิเศษ	/library/plant-journey-seeds	15	12	35	28.5%	50
การดูแลพืชใบ	/library/tree-care-tips	8	8	16	0.8	40
ไซโตไคนินบทความย่อย	/library/cytokinin-sub	5	5	10	0.7	25
Total	รวมทั้งหมด	9570	8559	17128	0.45	35
`;

        it("should extract date range from metadata correctly", () => {
            const result = parseGA4BackfillData(rawReport, mockProjects);
            expect(result.dateRangeStart).toBe("2026-06-01");
            expect(result.dateRangeEnd).toBe("2026-06-30");
            expect(result.snapshotDate).toBe("2026-06-30");
        });

        it("should detect article table section and skip headers & summaries", () => {
            const result = parseGA4BackfillData(rawReport, mockProjects);
            expect(result.rows).toHaveLength(8);
        });

        it("should include only article-like rows and exclude home, index, admin, 404, about, contact pages", () => {
            const result = parseGA4BackfillData(rawReport, mockProjects);

            const homeRow = result.rows.find(r => r.pageTitle.includes("Home"));
            expect(homeRow?.status).toBe("Excluded");

            const libraryIndexRow = result.rows.find(r => r.pageTitle === "คลังความรู้ | Green Fineness");
            expect(libraryIndexRow?.status).toBe("Excluded");

            const notFoundRow = result.rows.find(r => r.pageTitle.includes("Page not found"));
            expect(notFoundRow?.status).toBe("Excluded");

            const contactRow = result.rows.find(r => r.pageTitle.includes("ติดต่อเรา"));
            expect(contactRow?.status).toBe("Excluded");

            const cytokininRow = result.rows.find(r => r.pageTitle.includes("ไซโตไคนินคืออะไร"));
            expect(cytokininRow?.status).toBe("Ready");
            expect(cytokininRow?.matchedProject?.id).toBe("proj_01");

            const plantJourneyRow = result.rows.find(r => r.pageTitle.includes("Plant Journey"));
            expect(plantJourneyRow?.status).toBe("Ready");
            expect(plantJourneyRow?.matchedProject?.id).toBe("proj_02");
        });

        it("should map Thai columns and normalize bounce rate correctly", () => {
            const result = parseGA4BackfillData(rawReport, mockProjects);
            const cytokininRow = result.rows.find(r => r.pageTitle.includes("ไซโตไคนินคืออะไร"));
            
            expect(cytokininRow).toBeDefined();
            expect(cytokininRow?.views).toBe(10);
            expect(cytokininRow?.activeUsers).toBe(10);
            expect(cytokininRow?.eventCount).toBe(28);
            expect(cytokininRow?.bounceRate).toBe("90.0%");
        });

        it("should mark low-confidence or ambiguous matches as Needs manual target", () => {
            const result = parseGA4BackfillData(rawReport, mockProjects);
            const cytokininSubRow = result.rows.find(r => r.pageTitle === "ไซโตไคนินบทความย่อย");
            expect(cytokininSubRow).toBeDefined();
            expect(cytokininSubRow?.status).toBe("Needs manual target");
            expect(cytokininSubRow?.matchedProject?.confidence).toBe("Low");
        });

        it("should correctly format bounce rates that are already formatted or percentage decimals", () => {
            expect(normalizeBounceRate("0.9")).toBe("90.0%");
            expect(normalizeBounceRate("28.5%")).toBe("28.5%");
            expect(normalizeBounceRate("28.5")).toBe("28.5%");
            expect(normalizeBounceRate("0.285")).toBe("28.5%");
        });
    });
});
