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

export interface GA4BackfillRow {
    index: number;
    pageTitle: string;
    pagePath: string;
    views: number;
    activeUsers: number;
    eventCount: number;
    bounceRate: string;
    averageEngagementTime: number;
    sourceMedium: string;
    matchedProject?: {
        id: string;
        title: string;
        slug: string;
        confidence: "High" | "Medium" | "Low" | "Manual";
        method: "title" | "slug" | "partial_title" | "manual";
    };
    status: "Ready" | "Needs manual target" | "Excluded";
    rawLine: string;
}

export interface GA4BackfillParseResult {
    dateRangeStart: string;
    dateRangeEnd: string;
    snapshotDate: string;
    rows: GA4BackfillRow[];
}

export function normalizeBounceRate(raw: string): string {
    const trimmed = (raw || "").trim();
    if (!trimmed) return "";
    
    // Strip trailing % if there
    const clean = trimmed.endsWith("%") ? trimmed.slice(0, -1) : trimmed;
    const parsed = parseFloat(clean);
    if (isNaN(parsed)) return trimmed;
    
    // If raw = 0.9 or between 0 and 1, convert to 90.0%
    if (parsed > 0 && parsed < 1.0) {
        return `${(parsed * 100).toFixed(1)}%`;
    }
    
    // Format to 1 decimal place with %
    return `${parsed.toFixed(1)}%`;
}

function parseDateString(dateStr: string): string {
    const clean = dateStr.trim();
    if (clean.match(/^\d{4}-\d{2}-\d{2}$/)) {
        return clean;
    }
    if (clean.match(/^\d{8}$/)) {
        return `${clean.substring(0, 4)}-${clean.substring(4, 6)}-${clean.substring(6, 8)}`;
    }
    const slashMatch = clean.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (slashMatch) {
        const mm = slashMatch[2].padStart(2, "0");
        const dd = slashMatch[1].padStart(2, "0");
        return `${slashMatch[3]}-${mm}-${dd}`;
    }
    return clean;
}

function isArticleRow(pageTitle: string, pagePath: string, writingProjects: any[]): boolean {
    const title = (pageTitle || "").trim();
    const path = (pagePath || "").trim().toLowerCase();
    const titleLower = title.toLowerCase();

    // 1. Excludes
    if (path === "/" || path === "" || titleLower === "home" || title === "หน้าแรก" || titleLower === "green fineness") return false;
    if (path === "/library" || path === "/library/" || title === "คลังความรู้ | Green Fineness") return false;
    
    const exKeywords = [
        "page not found", "404", "ไม่พบหน้า", "about", "เกี่ยวกับเรา", "contact", "ติดต่อเรา",
        "admin", "ผู้ดูแลระบบ", "preview", "พรีวิว", "draft", "ร่าง", "/admin", "/draft", "/preview",
        "/about", "/contact", "/tag/", "/category/", "/author/", "/index"
    ];
    if (exKeywords.some(kw => titleLower.includes(kw) || path.includes(kw))) return false;

    // 2. Includes
    if (title.includes("คลังความรู้")) return true;
    if (titleLower.includes("plant journey")) return true;
    if (path.includes("/library/")) return true;

    // Matches any Writing Lab project title / slug
    if (writingProjects && writingProjects.length > 0) {
        const matchFound = writingProjects.some(p => {
            const pTitle = p.title.toLowerCase();
            const pSlug = p.slug?.toLowerCase();
            return (
                titleLower.includes(pTitle) ||
                pTitle.includes(titleLower) ||
                (pSlug && path.includes(pSlug))
            );
        });
        if (matchFound) return true;
    }

    return false;
}

function matchWritingProject(pageTitle: string, pagePath: string, writingProjects: any[]) {
    if (!writingProjects || writingProjects.length === 0) return null;

    const title = (pageTitle || "").trim().toLowerCase();
    const path = (pagePath || "").trim().toLowerCase();

    // Clean common prefixes
    let cleanRowTitle = title;
    if (cleanRowTitle.startsWith("คลังความรู้")) {
        cleanRowTitle = cleanRowTitle.replace(/^คลังความรู้\s*\|\s*/, "").replace(/^คลังความรู้\s*/, "").trim();
    }

    // 1. Exact Title Match
    let matched = writingProjects.find(p => p.title.trim().toLowerCase() === cleanRowTitle || p.title.trim().toLowerCase() === title);
    if (matched) {
        return { project: matched, confidence: "High" as const, method: "title" as const };
    }

    // 2. Exact Slug / Path match
    if (path) {
        const cleanPath = path.replace(/^\/|\/$/g, "");
        matched = writingProjects.find(p => p.slug && p.slug.trim().toLowerCase() === cleanPath);
        if (matched) {
            return { project: matched, confidence: "High" as const, method: "slug" as const };
        }
    }

    // 3. Partial Title match
    const partialTitleCandidates = writingProjects.filter(p => {
        const pTitle = p.title.trim().toLowerCase();
        return pTitle.length > 3 && (
            cleanRowTitle.includes(pTitle) ||
            pTitle.includes(cleanRowTitle) ||
            (pTitle.substring(0, 4) === cleanRowTitle.substring(0, 4))
        );
    });
    
    if (partialTitleCandidates.length === 1) {
        return { project: partialTitleCandidates[0], confidence: "Medium" as const, method: "partial_title" as const };
    } else if (partialTitleCandidates.length > 1) {
        return { project: partialTitleCandidates[0], confidence: "Low" as const, method: "partial_title" as const, ambiguous: true };
    }

    // 4. Partial path / slug match
    if (path) {
        const partialSlugCandidates = writingProjects.filter(p => p.slug && p.slug.length > 3 && path.includes(p.slug.trim().toLowerCase()));
        if (partialSlugCandidates.length === 1) {
            return { project: partialSlugCandidates[0], confidence: "Medium" as const, method: "slug" as const };
        } else if (partialSlugCandidates.length > 1) {
            return { project: partialSlugCandidates[0], confidence: "Low" as const, method: "slug" as const, ambiguous: true };
        }
    }

    return null;
}

export function parseGA4BackfillData(rawText: string, writingProjects: any[] = []): GA4BackfillParseResult {
    const result: GA4BackfillParseResult = {
        dateRangeStart: "",
        dateRangeEnd: "",
        snapshotDate: "",
        rows: []
    };

    if (!rawText || !rawText.trim()) return result;

    const lines = rawText.split(/\r?\n/).map(l => l.trim());
    
    // 1. Extract Date Range from metadata/header rows
    lines.forEach(line => {
        const lower = line.toLowerCase();
        if (lower.includes("start date") || lower.includes("วันที่เริ่มต้น")) {
            const match = line.match(/\d{4}-\d{2}-\d{2}/) || line.match(/\d{8}/) || line.match(/\d{1,2}\/\d{1,2}\/\d{4}/);
            if (match) {
                result.dateRangeStart = parseDateString(match[0]);
            }
        }
        if (lower.includes("end date") || lower.includes("วันที่สิ้นสุด")) {
            const match = line.match(/\d{4}-\d{2}-\d{2}/) || line.match(/\d{8}/) || line.match(/\d{1,2}\/\d{1,2}\/\d{4}/);
            if (match) {
                result.dateRangeEnd = parseDateString(match[0]);
            }
        }
    });

    result.snapshotDate = result.dateRangeEnd || new Date().toISOString().split("T")[0];

    // 2. Locate Table Headers Row
    let headerIdx = -1;
    let detectedHeaders: string[] = [];

    const targetKeywords = [
        "ชื่อหน้าเว็บ", "page title", "หน้าจอ", "screen class", "เส้นทางหน้าเว็บ", "page path",
        "จำนวนการดู", "views", "ผู้ใช้ที่ใช้งานอยู่", "active users", "จำนวนเหตุการณ์", "event count", "อัตราตีกลับ", "bounce rate"
    ];

    for (let i = 0; i < lines.length; i++) {
        if (!lines[i]) continue;
        const cells = parseLineToCells(lines[i]);
        let matchCount = 0;
        cells.forEach(c => {
            const val = c.toLowerCase();
            if (targetKeywords.some(kw => val.includes(kw))) {
                matchCount++;
            }
        });

        if (matchCount >= 2) {
            headerIdx = i;
            detectedHeaders = cells;
            break;
        }
    }

    if (headerIdx === -1) return result;

    // 3. Map Columns
    const ga4Mappings = {
        pageTitle: ["ชื่อหน้าเว็บและคลาสหน้าจอ", "ชื่อหน้า", "page title", "page_title", "title"],
        pagePath: ["เส้นทางหน้าเว็บ", "page path", "url", "path", "ลิงก์", "link"],
        views: ["จำนวนการดู", "views", "pageviews", "ยอดวิว"],
        activeUsers: ["ผู้ใช้ที่ใช้งานอยู่", "active users", "users", "ผู้ใช้"],
        eventCount: ["จำนวนเหตุการณ์", "event count", "events", "event_count"],
        bounceRate: ["อัตราตีกลับ", "bounce rate", "bounce_rate"],
        averageEngagementTime: ["เวลาในการมีส่วนร่วมเฉลี่ย", "average engagement time", "avg engagement time"],
        sourceMedium: ["แหล่งที่มา", "source / medium", "source_medium", "source", "medium"]
    };

    const colMap: Record<string, number> = {};
    detectedHeaders.forEach((h, idx) => {
        const val = h.toLowerCase();
        for (const [field, aliases] of Object.entries(ga4Mappings)) {
            if (aliases.some(alias => val.includes(alias.toLowerCase()))) {
                if (colMap[field] === undefined) {
                    colMap[field] = idx;
                }
            }
        }
    });

    const parseVal = (val: string): number => {
        if (!val) return 0;
        const clean = val.replace(/,/g, "").trim();
        const parsed = parseFloat(clean);
        return isNaN(parsed) ? 0 : parsed;
    };

    // 4. Parse Data Rows
    for (let i = headerIdx + 1; i < lines.length; i++) {
        const rawLine = lines[i];
        if (!rawLine || rawLine.startsWith("#")) continue;

        const cells = parseLineToCells(rawLine);
        if (cells.length === 0 || cells.every(c => !c.trim())) continue;

        // Skip obvious summary lines
        const isSummary = cells.some(cell => {
            const val = cell.trim().toLowerCase();
            return (
                val === "total" || val === "summary" || val === "รวม" || 
                val === "เฉลี่ย" || val === "average" || val === "ผลรวม" ||
                val.includes("รวมทั้งหมด") || val.includes("ค่าเฉลี่ย")
            );
        });
        if (isSummary) continue;

        const pageTitle = colMap.pageTitle !== undefined ? (cells[colMap.pageTitle] || "") : "";
        const pagePath = colMap.pagePath !== undefined ? (cells[colMap.pagePath] || "") : "";

        if (!pageTitle && !pagePath) continue;

        const views = colMap.views !== undefined ? parseVal(cells[colMap.views]) : 0;
        const activeUsers = colMap.activeUsers !== undefined ? parseVal(cells[colMap.activeUsers]) : 0;
        const eventCount = colMap.eventCount !== undefined ? parseVal(cells[colMap.eventCount]) : 0;
        const bounceRateRaw = colMap.bounceRate !== undefined ? (cells[colMap.bounceRate] || "") : "";
        const bounceRate = normalizeBounceRate(bounceRateRaw);
        const averageEngagementTime = colMap.averageEngagementTime !== undefined ? parseVal(cells[colMap.averageEngagementTime]) : 0;
        const sourceMedium = colMap.sourceMedium !== undefined ? (cells[colMap.sourceMedium] || "") : "";

        const isArticle = isArticleRow(pageTitle, pagePath, writingProjects);
        const matchResult = matchWritingProject(pageTitle, pagePath, writingProjects);

        let status: GA4BackfillRow["status"] = "Excluded";
        if (isArticle) {
            if (matchResult && matchResult.confidence !== "Low") {
                status = "Ready";
            } else {
                status = "Needs manual target";
            }
        }

        const row: GA4BackfillRow = {
            index: i,
            pageTitle,
            pagePath,
            views,
            activeUsers,
            eventCount,
            bounceRate,
            averageEngagementTime,
            sourceMedium,
            status,
            rawLine
        };

        if (matchResult) {
            row.matchedProject = {
                id: matchResult.project.id,
                title: matchResult.project.title,
                slug: matchResult.project.slug || "",
                confidence: matchResult.confidence,
                method: matchResult.method
            };
        }

        result.rows.push(row);
    }

    return result;
}
