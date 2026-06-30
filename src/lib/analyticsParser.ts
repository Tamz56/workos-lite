// src/lib/analyticsParser.ts

export interface ParsedColumn {
    header: string;
    sampleValue: string;
    suggestedMapping: string; // e.g. "views", "reach", "unsupported"
    confidence: "High" | "Medium" | "Low" | "Manual";
    warning?: string;
}

export interface ParsedRow {
    rawLine: string;
    cells: string[];
    extractedData: Record<string, any>;
    rowType: "facebook_post" | "facebook_group_overview" | "summary" | "unknown";
    matchedProject?: {
        id: string;
        title: string;
        slug: string;
        method: "exact_url" | "slug" | "title" | "manual" | "manual_selection";
        confidence: "High" | "Medium" | "Low" | "Manual";
    };
}

export interface AnalyticsParseResult {
    sourceType: "GA4" | "Facebook" | "FacebookGroupDaily" | "Unknown";
    columns: ParsedColumn[];
    rows: ParsedRow[];
    warning?: string;
}

// Columns mapping configurations for GA4
const GA4_MAPPINGS: Record<string, string[]> = {
    views: ["views", "จำนวนการดู", "pageviews", "views count", "ยอดวิว"],
    activeUsers: ["active users", "ผู้ใช้ที่ใช้งานอยู่", "active user", "users", "ผู้ใช้"],
    events: ["event count", "events", "จำนวนเหตุการณ์", "event_count", "ยอดเหตุการณ์"],
    bounceRate: ["bounce rate", "อัตราตีกลับ", "bounce_rate"],
    averageEngagementTime: ["average engagement time", "เวลาในการมีส่วนร่วม", "เวลาในการมีส่วนร่วมเฉลี่ย", "engagement time", "avg engagement time"],
    pageTitle: ["page title", "ชื่อหน้าเว็บและคลาสหน้าจอ", "ชื่อหน้า", "page_title"],
    pagePath: ["page path and screen class", "page path", "url", "path", "เส้นทางหน้าเว็บ", "link", "ลิงก์"]
};

// Columns mapping configurations for Facebook
const FB_MAPPINGS: Record<string, string[]> = {
    postTitle: ["โพสต์", "ข้อความโพสต์", "เนื้อหาโพสต์", "post title", "post text", "message"],
    postCreator: ["ผู้โพสต์", "creator", "author"],
    postUrl: ["ลิงก์โพสต์", "post url", "post_url", "url", "ลิงก์", "link", "permalink"],
    reach: ["reach", "views", "impressions", "ดูแล้ว", "การเข้าถึง", "post reach", "ยอดเข้าถึง", "จำนวนคนที่เข้าถึง"],
    reactions: ["reactions", "ความรู้สึก", "reaction", "like", "likes", "ถูกใจ", "การตอบสนอง"],
    comments: ["comments", "ความคิดเห็น", "comment", "คอมเมนต์"],
    shares: ["shares", "การแชร์", "share", "แชร์"],
    linkClicks: ["link clicks", "ลิงก์คลิก", "จำนวนการคลิกลิงก์", "link_clicks", "clicks", "คลิก", "การคลิกลิงก์"],
    otherClicks: ["other clicks", "การคลิกอื่นๆ", "other_clicks"],
    photoViews: ["photo views", "photo_views", "ยอดดูรูปภาพ"],
    saves: ["saves", "บันทึก", "save"],
    date: ["date", "วันที่", "published date", "date published", "created time"]
};

// Check if raw text line is empty or comment
function parseLineToCells(line: string): string[] {
    if (line.includes("\t")) {
        return line.split("\t").map(c => c.trim().replace(/^["']|["']$/g, ""));
    }
    if (line.includes(";")) {
        return line.split(";").map(c => c.trim().replace(/^["']|["']$/g, ""));
    }
    if (line.includes(",")) {
        return line.split(",").map(c => c.trim().replace(/^["']|["']$/g, ""));
    }
    return line.split(/\s{2,}/).map(c => c.trim().replace(/^["']|["']$/g, ""));
}

export function parseAnalyticsData(rawText: string, writingProjects: any[] = []): AnalyticsParseResult {
    const result: AnalyticsParseResult = {
        sourceType: "Unknown",
        columns: [],
        rows: []
    };

    if (!rawText || !rawText.trim()) {
        return result;
    }

    const lines = rawText.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
    if (lines.length === 0) {
        return result;
    }

    // 1. Parse headers
    const headerLine = lines[0];
    const headers = parseLineToCells(headerLine);
    if (headers.length === 0) {
        return result;
    }

    // 2. Sample value line
    const sampleLine = lines.length > 1 ? lines[1] : "";
    const samples = sampleLine ? parseLineToCells(sampleLine) : [];

    // 3. Detect Source Type
    let ga4Score = 0;
    let fbScore = 0;
    let isFbGroupDaily = false;

    headers.forEach(h => {
        const lower = h.toLowerCase();
        
        if (lower.includes("daily active members") || 
            lower.includes("active members") || 
            lower.includes("total members") || 
            lower.includes("group members") ||
            lower.includes("เข้าร่วมแล้ว") ||
            lower.includes("โพสต์หรือแสดงความคิดเห็น")
        ) {
            isFbGroupDaily = true;
        }

        for (const list of Object.values(GA4_MAPPINGS)) {
            if (list.some(keyword => lower.includes(keyword.toLowerCase()))) {
                ga4Score++;
            }
        }

        for (const list of Object.values(FB_MAPPINGS)) {
            if (list.some(keyword => lower.includes(keyword.toLowerCase()))) {
                fbScore++;
            }
        }
    });

    if (isFbGroupDaily) {
        result.sourceType = "FacebookGroupDaily";
        result.warning = "นี่คือรายงานสรุปประจำวันระดับกลุ่ม (Group-level Daily Report) ไม่ใช่รายงานระดับโพสต์เป้าหมายโดยตรง จำเป็นต้องเลือกบทความที่จะบันทึกสถิติแบบแมนนวล";
    } else if (ga4Score > fbScore && ga4Score > 0) {
        result.sourceType = "GA4";
    } else if (fbScore > 0) {
        result.sourceType = "Facebook";
    }

    // Helper to scan non-empty sample value inside a column
    const getColumnSampleVal = (colIdx: number): string => {
        if (samples[colIdx]) return samples[colIdx].trim();
        for (let i = 1; i < lines.length; i++) {
            const cells = parseLineToCells(lines[i]);
            if (cells[colIdx]) return cells[colIdx].trim();
        }
        return "";
    };

    // 4. Map Columns
    const activeMappings = result.sourceType === "GA4" ? GA4_MAPPINGS : FB_MAPPINGS;

    headers.forEach((h, idx) => {
        const lowerHeader = h.toLowerCase();
        let suggestedMapping = "unsupported";
        let confidence: ParsedColumn["confidence"] = "Low";
        let warning: string | undefined = undefined;

        // Custom logic for "โพสต์" / "post"
        const sampleVal = getColumnSampleVal(idx);
        if (result.sourceType === "Facebook" || result.sourceType === "FacebookGroupDaily") {
            if (h === "โพสต์" || lowerHeader === "post") {
                if (/^\d+$/.test(sampleVal)) {
                    suggestedMapping = "unsupported";
                    confidence = "High";
                    warning = "หัวข้อ 'โพสต์' ในตารางนี้เป็นตัวเลขจำนวนโพสต์สะสม ไม่ใช่ข้อความเนื้อหาโพสต์ จึงถูกละเว้น";
                } else if (sampleVal.startsWith("http") || sampleVal.includes("facebook.com") || sampleVal.includes("/posts/")) {
                    suggestedMapping = "postUrl";
                    confidence = "High";
                } else {
                    suggestedMapping = "postTitle";
                    confidence = "High";
                }
            }
        }

        // Regular aliases mapping fallback
        if (suggestedMapping === "unsupported") {
            for (const [dbField, aliases] of Object.entries(activeMappings)) {
                // Skip matching for postTitle/postUrl if already handled above
                if ((dbField === "postTitle" || dbField === "postUrl") && (h === "โพสต์" || lowerHeader === "post")) {
                    continue;
                }

                if (aliases.some(alias => lowerHeader === alias.toLowerCase())) {
                    suggestedMapping = dbField;
                    confidence = "High";
                    break;
                } else if (aliases.some(alias => lowerHeader.includes(alias.toLowerCase()))) {
                    suggestedMapping = dbField;
                    confidence = "Medium";
                }
            }
        }

        if (suggestedMapping === "unsupported" && !warning) {
            warning = "คอลัมน์นี้ไม่ได้รับการรองรับในฐานข้อมูล จะถูกละเว้นขณะอัปเดต";
        }

        result.columns.push({
            header: h,
            sampleValue: sampleVal || samples[idx] || "",
            suggestedMapping,
            confidence,
            warning
        });
    });

    // Resolve duplicate column mapping collisions (keep the one with highest confidence)
    const mappingBestIdx: Record<string, { idx: number; confidenceScore: number }> = {};
    const confidenceScores = { High: 3, Medium: 2, Low: 1, Manual: 4 };

    result.columns.forEach((col, idx) => {
        if (col.suggestedMapping === "unsupported") return;
        const score = confidenceScores[col.confidence] || 1;
        const existing = mappingBestIdx[col.suggestedMapping];

        if (!existing) {
            mappingBestIdx[col.suggestedMapping] = { idx, confidenceScore: score };
        } else {
            if (score > existing.confidenceScore) {
                const prevCol = result.columns[existing.idx];
                prevCol.suggestedMapping = "unsupported";
                prevCol.confidence = "Low";
                prevCol.warning = `คอลัมน์นี้ถูกละเว้นเนื่องจากคอลัมน์อื่น (${col.header}) จับคู่กับฟิลด์เดียวกันด้วยความมั่นใจสูงกว่า`;
                
                mappingBestIdx[col.suggestedMapping] = { idx, confidenceScore: score };
            } else {
                col.suggestedMapping = "unsupported";
                col.confidence = "Low";
                col.warning = `คอลัมน์นี้ถูกละเว้นเนื่องจากคอลัมน์อื่น (${result.columns[existing.idx].header}) จับคู่กับฟิลด์เดียวกันด้วยความมั่นใจสูงกว่า`;
            }
        }
    });

    // 5. Parse Rows & Article Matching
    for (let i = 1; i < lines.length; i++) {
        const rowLine = lines[i];
        const cells = parseLineToCells(rowLine);
        if (cells.length === 0) continue;

        const extractedData: Record<string, any> = {};
        result.columns.forEach((col, idx) => {
            if (col.suggestedMapping !== "unsupported" && cells[idx] !== undefined) {
                const rawVal = cells[idx];
                if (["views", "activeUsers", "events", "reach", "reactions", "comments", "shares", "linkClicks", "saves", "otherClicks", "photoViews"].includes(col.suggestedMapping)) {
                    const parsedNum = parseInt(rawVal.replace(/,/g, ""), 10);
                    extractedData[col.suggestedMapping] = isNaN(parsedNum) ? 0 : parsedNum;
                } else {
                    extractedData[col.suggestedMapping] = rawVal;
                }
            }
        });

        // Row classification
        let rowType: ParsedRow["rowType"] = "unknown";
        if (result.sourceType === "GA4") {
            rowType = "unknown";
        } else if (result.sourceType === "Facebook" || result.sourceType === "FacebookGroupDaily") {
            rowType = result.sourceType === "FacebookGroupDaily" ? "facebook_group_overview" : "facebook_post";
        }

        // Summary row detection
        const isSummary = cells.some(cell => {
            const val = cell.trim().toLowerCase();
            return (
                val === "total" ||
                val === "summary" ||
                val === "รวม" ||
                val === "เฉลี่ย" ||
                val === "average" ||
                val === "ผลรวม" ||
                val.includes("รวมทั้งหมด") ||
                val.includes("ค่าเฉลี่ย")
            );
        });

        if (isSummary) {
            rowType = "summary";
        }

        // Article matching logic
        let matchedProj: ParsedRow["matchedProject"] = undefined;

        if (writingProjects.length > 0 && (rowType === "facebook_post" || result.sourceType === "GA4")) {
            let pathOrUrlCandidate = "";
            let titleCandidate = "";

            cells.forEach(cell => {
                const trimmed = cell.trim();
                if (trimmed.startsWith("/") || trimmed.includes("http") || trimmed.includes("www.")) {
                    pathOrUrlCandidate = trimmed;
                } else if (trimmed.length > 5 && !trimmed.match(/^\d+$/)) {
                    if (!titleCandidate || trimmed.length > titleCandidate.length) {
                        titleCandidate = trimmed;
                    }
                }
            });

            // 1. Exact URL Match
            if (pathOrUrlCandidate) {
                const found = writingProjects.find(p => {
                    const notes = parseNotesSafely(p.notes);
                    const pr = notes?.performanceFeedback?.publishingRecord || {};
                    return (
                        (p.published_url && normalizeUrl(p.published_url) === normalizeUrl(pathOrUrlCandidate)) ||
                        (pr.publishedUrl && normalizeUrl(pr.publishedUrl) === normalizeUrl(pathOrUrlCandidate))
                    );
                });
                if (found) {
                    matchedProj = {
                        id: found.id,
                        title: found.title,
                        slug: found.slug,
                        method: "exact_url",
                        confidence: "High"
                    };
                }
            }

            // 2. Slug Match
            if (!matchedProj && pathOrUrlCandidate) {
                const extractedSlug = extractSlugFromPath(pathOrUrlCandidate);
                if (extractedSlug) {
                    const found = writingProjects.find(p => p.slug && p.slug.toLowerCase() === extractedSlug.toLowerCase());
                    if (found) {
                        matchedProj = {
                            id: found.id,
                            title: found.title,
                            slug: found.slug,
                            method: "slug",
                            confidence: "High"
                        };
                    }
                }
            }

            // 3. Title Match
            if (!matchedProj && titleCandidate) {
                const found = writingProjects.find(p => p.title && p.title.toLowerCase().trim() === titleCandidate.toLowerCase().trim());
                if (found) {
                    matchedProj = {
                        id: found.id,
                        title: found.title,
                        slug: found.slug,
                        method: "title",
                        confidence: "Medium"
                    };
                }
            }
        }

        result.rows.push({
            rawLine: rowLine,
            cells,
            extractedData,
            rowType,
            matchedProject: matchedProj
        });
    }

    return result;
}

// Helpers
function parseNotesSafely(notesStr: string | null): any {
    if (!notesStr) return {};
    try {
        return JSON.parse(notesStr);
    } catch {
        return {};
    }
}

function normalizeUrl(url: string): string {
    return url.trim().toLowerCase().replace(/^(https?:\/\/)?(www\.)?/, "").replace(/\/$/, "");
}

function extractSlugFromPath(pathOrUrl: string): string {
    const normalized = pathOrUrl.trim().split("?")[0];
    const segments = normalized.split("/").filter(s => s.length > 0);
    if (segments.length === 0) return "";
    return segments[segments.length - 1];
}

export function generateSnapshotPayload(
    row: ParsedRow,
    metadata: {
        sourceFileName: string;
        sourceType: string;
        snapshotWindow: string;
        snapshotDate: string;
        importNote?: string;
    },
    rowIndex: number = 0
): any {
    const isGA4 = metadata.sourceType === "GA4";
    const windowKey = `snap${metadata.snapshotWindow}`;

    const isGroupOverview = row.rowType === "facebook_group_overview";
    const finalSourceType = isGroupOverview ? "facebook_group_overview" : metadata.sourceType;

    const performanceFeedback: any = {
        sourceMetadata: {
            ...metadata,
            sourceType: finalSourceType,
            matchedBy: row.matchedProject?.method || "manual_selection",
            matchConfidence: row.matchedProject?.confidence || "Low",
            rawSourceSummary: row.rawLine.substring(0, 150),
            rowType: row.rowType,
            rowIndex
        }
    };

    if (isGA4) {
        performanceFeedback.ga4Snapshots = {
            [windowKey]: {
                snapshotDate: metadata.snapshotDate,
                window: metadata.snapshotWindow,
                views: row.extractedData.views || 0,
                activeUsers: row.extractedData.activeUsers || 0,
                events: row.extractedData.events || 0,
                averageEngagementTime: row.extractedData.averageEngagementTime || 0,
                bounceRate: row.extractedData.bounceRate || "",
                sourceMedium: row.extractedData.pagePath || "",
                notes: metadata.importNote || ""
            }
        };
    } else {
        const platform = finalSourceType === "facebook_group_overview" 
            ? "facebook_group" 
            : (metadata.sourceType === "Facebook" ? "facebook_page" : "facebook_group");

        performanceFeedback.facebookSnapshots = {
            [windowKey]: {
                snapshotDate: metadata.snapshotDate,
                window: metadata.snapshotWindow,
                platform,
                postUrl: row.extractedData.postUrl || "",
                reach: row.extractedData.reach || 0,
                reactions: row.extractedData.reactions || 0,
                comments: row.extractedData.comments || 0,
                shares: row.extractedData.shares || 0,
                linkClicks: row.extractedData.linkClicks || 0,
                saves: row.extractedData.saves || 0,
                notes: isGroupOverview 
                    ? `Group Overview Import: ${metadata.importNote || ""}`.trim()
                    : (metadata.importNote || "")
            }
        };
    }

    return {
        schemaVersion: "workos-writing-lab-update-v0.1",
        source: "Arbor",
        importBatchTitle: `Analytics Import - ${finalSourceType} ${metadata.snapshotWindow}`,
        action: "apply_update",
        target: {
            type: "writing_lab_project",
            projectId: row.matchedProject?.id || "",
            projectSlug: row.matchedProject?.slug || ""
        },
        fields: {
            performanceFeedback
        }
    };
}
