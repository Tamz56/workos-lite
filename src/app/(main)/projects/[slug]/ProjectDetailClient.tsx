"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";

import { Project, ProjectItem, ProjectRegistryStatus, ProjectProgressStage, ProjectRegistryMetadata, Note, ProjectDocBlockType, ProjectDocumentationBlock, ProjectContentRoadmapStatus, ProjectContentType, ProjectContentLayer, ProjectContentRoadmapItem } from "@/lib/types";
import { 
    MoreVertical, Edit2, Archive, Trash2, ChevronLeft, Target, 
    Plus, CheckCircle2, Layout, Calendar, FileText, Info,
    BookOpen, Sparkles, Search, LayoutGrid, Table, FileCode, Check, ExternalLink, RefreshCw,
    Copy, Layers, Tv, Tag, PlusCircle, ArrowUp, ArrowDown
} from "lucide-react";
import { DeleteProjectDialog } from "@/components/DeleteProjectDialog";
import { Toast } from "@/components/ui/Toast";
import { Modal } from "@/components/ui/Modal";
import ConfirmDialog from "@/components/ConfirmDialog";
import { PageShell } from "@/components/layout/PageShell";
import { PageHeader } from "@/components/layout/PageHeader";

const STATUS_LABELS: Record<ProjectRegistryStatus, string> = {
    idea: "Idea",
    planning: "Planning",
    active: "Active",
    in_development: "In Dev",
    testing: "Testing",
    in_use: "In Use",
    maintenance: "Maintenance",
    paused: "Paused",
    completed: "Completed"
};

const STATUS_COLORS: Record<ProjectRegistryStatus, string> = {
    idea: "bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300",
    planning: "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300",
    active: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
    in_development: "bg-indigo-100 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300",
    testing: "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
    in_use: "bg-teal-100 text-teal-700 dark:bg-teal-950/40 dark:text-teal-300",
    maintenance: "bg-cyan-100 text-cyan-700 dark:bg-cyan-950/40 dark:text-cyan-300",
    paused: "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400",
    completed: "bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-300"
};

const PRIORITY_COLORS: Record<string, string> = {
    high: "bg-rose-100 text-rose-700 border border-rose-200 dark:bg-rose-950/30 dark:text-rose-300 dark:border-rose-900/30",
    medium: "bg-amber-100 text-amber-700 border border-amber-200 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-900/30",
    low: "bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700/50",
    none: "bg-neutral-50 text-neutral-400 dark:bg-neutral-900 dark:text-neutral-500"
};

const METADATA_KEY = "workos_projects_metadata_v1";
const DOCS_STORAGE_KEY = "workos_projects_docs_v1";

const BLOCK_TYPE_LABELS: Record<ProjectDocBlockType, string> = {
    brief: "Project Brief",
    process_note: "Process Note",
    sop: "SOP / Manual",
    structure: "System Structure",
    decision: "Decision Log",
    milestone: "Milestone",
    issue_fix: "Issue / Fix Log",
    publish: "Publish Log",
    qa_review: "QA / Review Log"
};

const BLOCK_TYPE_COLORS: Record<ProjectDocBlockType, string> = {
    brief: "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950/30 dark:text-blue-300 dark:border-blue-900/30",
    process_note: "bg-slate-100 text-slate-800 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700/50",
    sop: "bg-teal-100 text-teal-800 border-teal-200 dark:bg-teal-950/30 dark:text-teal-300 dark:border-teal-900/30",
    structure: "bg-cyan-100 text-cyan-800 border-cyan-200 dark:bg-cyan-950/30 dark:text-cyan-300 dark:border-cyan-900/30",
    decision: "bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-950/30 dark:text-purple-300 dark:border-purple-900/30",
    milestone: "bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-950/30 dark:text-orange-300 dark:border-orange-900/30",
    issue_fix: "bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-950/30 dark:text-rose-300 dark:border-rose-900/30",
    publish: "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-900/30",
    qa_review: "bg-indigo-100 text-indigo-800 border-indigo-200 dark:bg-indigo-950/30 dark:text-indigo-300 dark:border-indigo-900/30"
};

const DOC_TEMPLATES: Record<ProjectDocBlockType, { summary: string; details: string }> = {
    brief: {
        summary: "สรุปเป้าหมาย ขอบเขตงาน และแนวทางหลักของโครงการ",
        details: `## 1. Goal & Objectives
- [ระบุเป้าหมายของโครงการ]

## 2. Target Audience
- [ระบุกลุ่มเป้าหมายหรือผู้ใช้งาน]

## 3. Scope of Work (SOW)
- [ขอบเขตสิ่งที่ต้องทำ]

## 4. Key Metrics (KPIs)
- [ตัววัดความสำเร็จ]`
    },
    sop: {
        summary: "ขั้นตอนการทำงานมาตรฐาน (Standard Operating Procedure)",
        details: `## SOP: [ชื่อขั้นตอนการทำงาน]

### 1. Prerequisites (สิ่งที่ต้องเตรียม)
- [เครื่องมือ ซอฟต์แวร์ หรือสิทธิ์การเข้าถึง]

### 2. Step-by-Step Procedure
1. [ขั้นตอนที่ 1]
2. [ขั้นตอนที่ 2]
3. [ขั้นตอนที่ 3]

### 3. Verification & Troubleshooting
- [วิธีการตรวจสอบว่าทำงานถูกต้อง]
- [วิธีแก้ไขเมื่อเกิดปัญหาเบื้องต้น]`
    },
    decision: {
        summary: "บันทึกการตัดสินใจเชิงสถาปัตยกรรมและกลยุทธ์สำคัญ",
        details: `## Decision: [หัวข้อการตัดสินใจ]

### 1. Context (บริบทและปัญหา)
- [บริบท ปัญหา หรือสิ่งที่จำเป็นต้องเลือก]

### 2. Options Considered (ตัวเลือกที่พิจารณา)
- **Option A:** [ข้อดี / ข้อเสีย]
- **Option B:** [ข้อดี / ข้อเสีย]

### 3. Chosen Option & Rationale (ตัวเลือกที่เลือกและเหตุผล)
- **ตัวเลือกที่เลือก:** [ระบุตัวเลือก]
- **เหตุผล:** [ทำไมจึงเลือกตัวเลือกนี้]

### 4. Consequences (ผลที่ตามมา)
- [ผลกระทบ ข้อจำกัด หรือสิ่งที่ทีมต้องรู้หลังจากนี้]`
    },
    milestone: {
        summary: "ประวัติการบรรลุเป้าหมายสำคัญหรือเฟสหลักของโครงการ",
        details: `## Phase/Milestone: [ชื่อไมล์สโตน]

### 1. Key Deliverables (ผลงานหลัก)
- [ ] [ผลงาน 1]
- [ ] [ผลงาน 2]

### 2. Status & Sign-off
- **สถานะ:** [ ] Planning / [ ] In Progress / [ ] Completed`
    },
    issue_fix: {
        summary: "บันทึกการแก้ไขปัญหา บั๊ก หรือการบำรุงรักษาเชิงลึก",
        details: `## Issue: [หัวข้อปัญหาหรือบั๊กที่พบ]

### 1. Symptoms & Context (อาการและผลกระทบ)
- [อาการ ปัญหาที่เกิด และผลกระทบต่อผู้ใช้งาน]

### 2. Root Cause (สาเหตุของปัญหา)
- [ทำไมปัญหานี้ถึงเกิดขึ้น และชิ้นส่วนโค้ดที่เกี่ยวข้อง]

### 3. Solution (วิธีการแก้ไข)
- [แก้ไขโค้ดอย่างไร ไฟล์ใดบ้าง]

### 4. Verification Check
- [ ] ทำการทดสอบ Build ผ่านแล้ว
- [ ] ตรวจสอบว่าระบบทำงานได้ปกติ`
    },
    process_note: {
        summary: "บันทึกทั่วไป ข้อมูลความรู้ หรือข้อมูลดิบระหว่างการพัฒนา",
        details: `## Note: [หัวข้อบันทึก]
- [รายละเอียดบันทึกทั่วไปหรือข้อมูลที่ต้องการจดจำ]`
    },
    structure: {
        summary: "โครงสร้างระบบ ฐานข้อมูล หรือการออกแบบโมดูล",
        details: `## System Structure: [ชื่อโมดูล/ระบบ]

### 1. Architecture Overview
- [คำอธิบายการไหลของข้อมูลและโมดูล]

### 2. Component/Data Design
- [รายละเอียดโครงสร้างฐานข้อมูล หรือ Component Hierarchy]`
    },
    publish: {
        summary: "บันทึกการนำงานขึ้นระบบ สถิติการเผยแพร่ หรือการโปรโมท",
        details: `## Publish Log: [ชื่องาน/เนื้อหาที่เผยแพร่]

### 1. Publication Details
- **ช่องทาง:** [Facebook / YouTube / Website / Medium]
- **วันที่เผยแพร่:** [ระบุวันที่]
- **ลิงก์ปลายทาง:** [ระบุลิงก์]`
    },
    qa_review: {
        summary: "รายงานผลการทดสอบ สอบทานคุณภาพ หรือผลลัพธ์การรีวิว",
        details: `## QA Report: [หัวข้อการทดสอบ]

### 1. Test Scope (ขอบเขตการทดสอบ)
- [รายการของฟีเจอร์หรือโค้ดที่รันการทดสอบ]

### 2. Test Results (ผลการทดสอบ)
- [ ] Unit Tests: Pass/Fail
- [ ] Integration: Pass/Fail
- [ ] Lint & Build: Pass/Fail`
    }
};

function getStoredMetadata(): Record<string, ProjectRegistryMetadata> {
    if (typeof window === "undefined") return {};
    try {
        const data = localStorage.getItem(METADATA_KEY);
        return data ? JSON.parse(data) : {};
    } catch (e) {
        console.error("Failed to load metadata", e);
        return {};
    }
}

function saveStoredMetadata(metadata: Record<string, ProjectRegistryMetadata>) {
    if (typeof window === "undefined") return;
    try {
        localStorage.setItem(METADATA_KEY, JSON.stringify(metadata));
    } catch (e) {
        console.error("Failed to save metadata", e);
    }
}

function getStoredDocBlocks(): ProjectDocumentationBlock[] {
    if (typeof window === "undefined") return [];
    try {
        const data = localStorage.getItem(DOCS_STORAGE_KEY);
        return data ? JSON.parse(data) : [];
    } catch (e) {
        console.error("Failed to load doc blocks", e);
        return [];
    }
}

function saveStoredDocBlocks(blocks: ProjectDocumentationBlock[]) {
    if (typeof window === "undefined") return;
    try {
        localStorage.setItem(DOCS_STORAGE_KEY, JSON.stringify(blocks));
    } catch (e) {
        console.error("Failed to save doc blocks", e);
    }
}
const ROADMAP_STORAGE_KEY = "workos_project_content_roadmap_v1";

const ROADMAP_STATUS_LABELS: Record<ProjectContentRoadmapStatus, string> = {
    idea: "Idea",
    planned: "Planned",
    drafting: "Drafting",
    review: "Review",
    ready_to_publish: "Ready to Publish",
    published: "Published",
    tracking: "Tracking",
    needs_update: "Needs Update",
    paused: "Paused"
};

const ROADMAP_STATUS_COLORS: Record<ProjectContentRoadmapStatus, string> = {
    idea: "bg-purple-50 text-purple-700 dark:bg-purple-950/20 dark:text-purple-300",
    planned: "bg-blue-50 text-blue-700 dark:bg-blue-950/20 dark:text-blue-300",
    drafting: "bg-amber-50 text-amber-700 dark:bg-amber-950/20 dark:text-amber-300",
    review: "bg-cyan-50 text-cyan-700 dark:bg-cyan-950/20 dark:text-cyan-300",
    ready_to_publish: "bg-teal-50 text-teal-700 dark:bg-teal-950/20 dark:text-teal-300",
    published: "bg-green-50 text-green-700 dark:bg-green-950/20 dark:text-green-300",
    tracking: "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/20 dark:text-indigo-300",
    needs_update: "bg-rose-50 text-rose-700 dark:bg-rose-950/20 dark:text-rose-300",
    paused: "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400"
};

const CONTENT_TYPE_LABELS: Record<ProjectContentType, string> = {
    narrative_article: "Narrative Article",
    knowledge_article: "Knowledge Article",
    group_post: "Group Post",
    page_post: "Page Post",
    personal_post: "Personal Post",
    infographic: "Infographic",
    short_video: "Short Video",
    follow_up_post: "Follow-up Post",
    supporting_article: "Supporting Article",
    legacy_article: "Legacy Article"
};

const CONTENT_LAYER_LABELS: Record<ProjectContentLayer, string> = {
    core_episode: "Core Episode",
    supporting_article: "Supporting Article",
    social_post: "Social Post",
    performance_followup: "Performance Follow-up",
    visual_asset: "Visual Asset",
    video_asset: "Video Asset",
    legacy_shell: "Legacy Shell"
};

function getStoredRoadmapItems(): ProjectContentRoadmapItem[] {
    if (typeof window === "undefined") return [];
    try {
        const data = localStorage.getItem(ROADMAP_STORAGE_KEY);
        return data ? JSON.parse(data) : [];
    } catch (e) {
        console.error("Failed to load roadmap items", e);
        return [];
    }
}

function saveStoredRoadmapItems(items: ProjectContentRoadmapItem[]) {
    if (typeof window === "undefined") return;
    try {
        localStorage.setItem(ROADMAP_STORAGE_KEY, JSON.stringify(items));
    } catch (e) {
        console.error("Failed to save roadmap items", e);
    }
}

function parseRoadmapTextToItems(text: string, projectSlug: string): ProjectContentRoadmapItem[] {
    const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
    const items: ProjectContentRoadmapItem[] = [];
    const now = new Date().toISOString();
    const normalizeStatus = (value: string, fallback: ProjectContentRoadmapStatus): ProjectContentRoadmapStatus => {
        const normalized = value.trim().toLowerCase();
        if (normalized === "planned") return "planned";
        if (normalized === "idea") return "idea";
        if (normalized === "drafting") return "drafting";
        if (normalized === "review") return "review";
        return fallback;
    };
    const normalizeContentType = (value: string, fallback: ProjectContentType): ProjectContentType => {
        const normalized = value.trim().toLowerCase().replace(/[\s-]+/g, "_");
        if (normalized === "narrative_article") return "narrative_article";
        if (normalized === "knowledge_article") return "knowledge_article";
        if (normalized === "group_post") return "group_post";
        if (normalized === "page_post") return "page_post";
        if (normalized === "personal_post") return "personal_post";
        if (normalized === "infographic") return "infographic";
        if (normalized === "short_video") return "short_video";
        if (normalized === "follow_up_post") return "follow_up_post";
        if (normalized === "supporting_article") return "supporting_article";
        if (normalized === "legacy_article") return "legacy_article";
        return fallback;
    };
    const normalizeContentLayer = (value: string, fallback: ProjectContentLayer): ProjectContentLayer => {
        const normalized = value.trim().toLowerCase().replace(/[\s-]+/g, "_");
        if (normalized === "core_episode") return "core_episode";
        if (normalized === "supporting_article") return "supporting_article";
        if (normalized === "social_post") return "social_post";
        if (normalized === "performance_followup") return "performance_followup";
        if (normalized === "visual_asset") return "visual_asset";
        if (normalized === "video_asset") return "video_asset";
        if (normalized === "legacy_shell") return "legacy_shell";
        return fallback;
    };
    const normalizePriority = (value: string, fallback: "high" | "medium" | "low" | "none"): "high" | "medium" | "low" | "none" => {
        const normalized = value.trim().toLowerCase();
        if (normalized === "high") return "high";
        if (normalized === "medium") return "medium";
        if (normalized === "low") return "low";
        return fallback;
    };
    const inferParentEpisode = (episodeCode: string) => {
        const match = episodeCode.match(/^(EP[.\-_]?\d+)(?:[.\-_]\d+.*)?$/i);
        return match ? match[1] : "";
    };
    const createRoadmapItem = (line: string, item: {
        episodeCode: string;
        title: string;
        contentType: ProjectContentType;
        contentLayer: ProjectContentLayer;
        seriesOrTheme: string;
        status: ProjectContentRoadmapStatus;
        priority: "high" | "medium" | "low" | "none";
        targetChannel: string;
        relatedMainEpisode: string;
        nextAction: string;
        notes?: string;
    }): ProjectContentRoadmapItem => ({
        id: Math.random().toString(36).substring(2, 15) + Date.now().toString(36),
        projectSlug,
        episodeCode: item.episodeCode,
        title: item.title || `Draft Episode for ${item.episodeCode}`,
        contentType: item.contentType,
        contentLayer: item.contentLayer,
        seriesOrTheme: item.seriesOrTheme || "General",
        status: item.status,
        priority: item.priority,
        targetChannel: item.targetChannel,
        targetPublishDate: "",
        relatedMainEpisode: item.relatedMainEpisode,
        nextAction: item.nextAction,
        notes: item.notes || "นำเข้าข้อมูลจาก Arbor Assistant",
        createdAt: now,
        updatedAt: now,
        sourceText: line,
        sourceType: "arbor_parse"
    });

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const isPipeRow = line.includes("|");
        
        // Skip header line if it looks like one
        if (i === 0 && isPipeRow) {
            const firstCol = line.split("|")[0].trim().toLowerCase();
            const isHeader = ["episode_code", "title", "content_type"].includes(firstCol) || firstCol.includes("รหัส");
            const isEpCode = /^EP\.\d+(\.\d+)?$/i.test(firstCol);
            if (isHeader && !isEpCode) {
                continue;
            }
        } else if (i === 0 && (line.toLowerCase().includes("episode") || line.toLowerCase().includes("code") || line.toLowerCase().includes("title"))) {
            continue;
        }

        if (isPipeRow) {
            const cols = line.split("|").map(c => c.trim());
            const episodeCode = cols[0] || `EP.Draft.${i + 1}`;
            const relatedMainEpisode = cols[8] || inferParentEpisode(episodeCode);

            items.push(createRoadmapItem(line, {
                episodeCode,
                title: cols[1] || "",
                contentType: normalizeContentType(cols[2] || "", "knowledge_article"),
                contentLayer: normalizeContentLayer(cols[3] || "", "core_episode"),
                seriesOrTheme: cols[4] || "",
                priority: normalizePriority(cols[5] || "", "medium"),
                status: normalizeStatus(cols[6] || "", "planned"),
                targetChannel: cols[7] || "Facebook / Website",
                relatedMainEpisode,
                nextAction: cols[9] || "เตรียมยกร่างเนื้อหาตอน"
            }));
            continue;
        }

        // Try tab split first
        let cols = line.split("\t").map(c => c.trim());
        if (cols.length <= 1) {
            // Try comma split
            cols = line.split(",").map(c => c.trim());
        }

        let episodeCode = "";
        let title = "";
        let contentType: ProjectContentType = "knowledge_article";
        let contentLayer: ProjectContentLayer = "core_episode";
        let status: ProjectContentRoadmapStatus = "idea";
        let priority: "high" | "medium" | "low" | "none" = "medium";
        let relatedMainEpisode = "";
        const notes = "";
        let seriesOrTheme = "";
        let targetChannel = "Facebook / Website";
        let nextAction = "เตรียมยกร่างเนื้อหาตอน";

        // Heuristic detection based on columns
        if (cols.length >= 2) {
            // First column is likely episodeCode if it matches pattern
            const epMatch = cols[0].match(/^(EP[.\-_]?\d+[\w.\-_]*)/i);
            if (epMatch) {
                episodeCode = epMatch[1];
                title = cols[1];
            } else {
                // If first col doesn't look like code, first column might be title, second is code?
                const epMatchCol2 = cols[1].match(/^(EP[.\-_]?\d+[\w.\-_]*)/i);
                if (epMatchCol2) {
                    episodeCode = epMatchCol2[1];
                    title = cols[0];
                } else {
                    episodeCode = `EP.Draft.${i + 1}`;
                    title = cols[0];
                }
            }

            // Other columns heuristic scan
            for (let cidx = 2; cidx < cols.length; cidx++) {
                const colVal = cols[cidx].toLowerCase();
                if (!colVal) continue;

                // Match contentType
                if (colVal.includes("narrative")) contentType = "narrative_article";
                else if (colVal.includes("knowledge")) contentType = "knowledge_article";
                else if (colVal.includes("group")) contentType = "group_post";
                else if (colVal.includes("page_post") || (colVal.includes("page") && colVal.includes("post"))) contentType = "page_post";
                else if (colVal.includes("personal")) contentType = "personal_post";
                else if (colVal.includes("infographic") || colVal.includes("info")) contentType = "infographic";
                else if (colVal.includes("short_video") || colVal.includes("video")) contentType = "short_video";
                else if (colVal.includes("follow_up")) contentType = "follow_up_post";
                else if (colVal.includes("supporting")) contentType = "supporting_article";
                else if (colVal.includes("legacy")) contentType = "legacy_article";

                // Match contentLayer
                if (colVal.includes("core")) contentLayer = "core_episode";
                else if (colVal.includes("supporting")) contentLayer = "supporting_article";
                else if (colVal.includes("social")) contentLayer = "social_post";
                else if (colVal.includes("performance")) contentLayer = "performance_followup";
                else if (colVal.includes("visual")) contentLayer = "visual_asset";
                else if (colVal.includes("video_asset") || (colVal.includes("video") && colVal.includes("asset"))) contentLayer = "video_asset";
                else if (colVal.includes("legacy_shell")) contentLayer = "legacy_shell";

                // Match status
                if (colVal === "idea") status = "idea";
                else if (colVal.includes("plan")) status = "planned";
                else if (colVal.includes("draft")) status = "drafting";
                else if (colVal.includes("ready")) status = "ready_to_publish";
                else if (colVal.includes("published") || colVal === "publish") status = "published";
                else if (colVal.includes("tracking")) status = "tracking";
                else if (colVal.includes("needs_update") || colVal.includes("update")) status = "needs_update";
                else if (colVal === "paused") status = "paused";

                // Match priority
                if (colVal === "high") priority = "high";
                else if (colVal === "medium") priority = "medium";
                else if (colVal === "low") priority = "low";
                else if (colVal === "none") priority = "none";

                // If column has an EP pattern, it could be relatedMainEpisode
                const relEpMatch = cols[cidx].match(/^(EP[.\-_]?\d+(\.\d+)?)/i);
                if (relEpMatch && relEpMatch[1] !== episodeCode) {
                    relatedMainEpisode = relEpMatch[1];
                }
            }
        } else {
            // Simple line parsing
            const epMatch = line.match(/^(EP[.\-_]?\d+[\w.\-_]*)/i);
            if (epMatch) {
                episodeCode = epMatch[1];
                title = line.substring(epMatch[0].length).replace(/^[:\s\t\-,]*/, "").trim();
            } else {
                episodeCode = `EP.Draft.${i + 1}`;
                title = line;
            }

            // Heuristic detection from title text
            const lowerTitle = title.toLowerCase();
            if (lowerTitle.includes("narrative")) contentType = "narrative_article";
            else if (lowerTitle.includes("infographic") || lowerTitle.includes("info")) contentType = "infographic";
            else if (lowerTitle.includes("video")) contentType = "short_video";

            if (lowerTitle.includes("draft")) status = "drafting";
            else if (lowerTitle.includes("publish")) status = "published";
            else if (lowerTitle.includes("planned")) status = "planned";
        }

        // Clean values
        if (!title) {
            title = `Draft Episode for ${episodeCode}`;
        }

        // relatedMainEpisode fallback: if episodeCode is EP.10.3-S1, main is EP.10.3
        if (!relatedMainEpisode && episodeCode) {
            const mainMatch = episodeCode.match(/^(EP[.\-_]?\d+\.\d+)/i);
            if (mainMatch) {
                relatedMainEpisode = mainMatch[1];
            } else {
                const mainMatchSimple = episodeCode.match(/^(EP[.\-_]?\d+)/i);
                if (mainMatchSimple) {
                    relatedMainEpisode = mainMatchSimple[1];
                }
            }
        }

        items.push(createRoadmapItem(line, {
            episodeCode,
            title,
            contentType,
            contentLayer,
            seriesOrTheme,
            status,
            priority,
            targetChannel,
            relatedMainEpisode,
            nextAction,
            notes
        }));
    }

    return items;
}

export default function ProjectDetailClient() {
    const params = useParams();
    const router = useRouter();
    const searchParams = useSearchParams();
    const slug = params.slug as string;
    const isArborContext = searchParams?.get("arborContext") === "1";

    const [project, setProject] = useState<Project | null>(null);
    const [metadata, setMetadata] = useState<Record<string, ProjectRegistryMetadata>>({});
    const [items, setItems] = useState<ProjectItem[]>([]);
    const [newItemTitle, setNewItemTitle] = useState("");
    const [loading, setLoading] = useState(true);

    // Actions state
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const [isArchiveOpen, setIsArchiveOpen] = useState(false);
    const [isRegistryEditOpen, setIsRegistryEditOpen] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);
    const [showToast, setShowToast] = useState(false);
    const [toastMessage, setToastMessage] = useState("");

    // Editing states for registry metadata
    const [editName, setEditName] = useState("");
    const [editCategory, setEditCategory] = useState("");
    const [editStatus, setEditStatus] = useState<ProjectRegistryStatus>("planning");
    const [editPriority, setEditPriority] = useState<"high" | "medium" | "low" | "none">("medium");
    const [editCurrentGoal, setEditCurrentGoal] = useState("");
    const [editProgressStage, setEditProgressStage] = useState<ProjectProgressStage>("Concept");
    const [editNextAction, setEditNextAction] = useState("");
    const [editCadence, setEditCadence] = useState("Weekly");
    const [editRiskOrBlockedBy, setEditRiskOrBlockedBy] = useState("None");

    // --- Documentation Blocks State ---
    const [docBlocks, setDocBlocks] = useState<ProjectDocumentationBlock[]>([]);
    const [docSearch, setDocSearch] = useState("");
    const [docTypeFilter, setDocTypeFilter] = useState<string>("all");
    const [docViewMode, setDocViewMode] = useState<"card" | "table">("card");

    // Modal Forms control
    const [isDocModalOpen, setIsDocModalOpen] = useState(false);
    const [activeDocBlock, setActiveDocBlock] = useState<ProjectDocumentationBlock | null>(null);
    const [isDeleteDocOpen, setIsDeleteDocOpen] = useState(false);
    const [docToDelete, setDocToDelete] = useState<string | null>(null);

    // Form fields state
    const [formTitle, setFormTitle] = useState("");
    const [formDate, setFormDate] = useState("");
    const [formType, setFormType] = useState<ProjectDocBlockType>("brief");
    const [formSummary, setFormSummary] = useState("");
    const [formDetails, setFormDetails] = useState("");
    const [formEvidence, setFormEvidence] = useState(""); 
    const [formFiles, setFormFiles] = useState("");       
    const [formNextAction, setFormNextAction] = useState("");
    const [formStatus, setFormStatus] = useState("active");
    const [formOrderIndex, setFormOrderIndex] = useState("");

    // Arbor Assistant Dialog state
    const [isArborModalOpen, setIsArborModalOpen] = useState(false);
    const [arborSourceText, setArborSourceText] = useState("");
    const [arborSelectedType, setArborSelectedType] = useState<ProjectDocBlockType | "auto">("auto");
    const [arborDraftBlock, setArborDraftBlock] = useState<ProjectDocumentationBlock | null>(null);
    const [showArborPreview, setShowArborPreview] = useState(false);
    // OPS-002D: Project Context Summary state
    const [projectDocs, setProjectDocs] = useState<Note[]>([]);
    const [isContextSummaryOpen, setIsContextSummaryOpen] = useState(false);
    // --- Content Roadmap State ---
    const [roadmapItems, setRoadmapItems] = useState<ProjectContentRoadmapItem[]>([]);
    const [roadmapSearch, setRoadmapSearch] = useState("");
    const [roadmapStatusFilter, setRoadmapStatusFilter] = useState<string>("all");
    const [roadmapTypeFilter, setRoadmapTypeFilter] = useState<string>("all");
    const [roadmapPriorityFilter, setRoadmapPriorityFilter] = useState<string>("all");
    const [roadmapViewMode, setRoadmapViewMode] = useState<"table" | "card">("table");

    // Modal Control
    const [isRoadmapModalOpen, setIsRoadmapModalOpen] = useState(false);
    const [activeRoadmapItem, setActiveRoadmapItem] = useState<ProjectContentRoadmapItem | null>(null);
    const [isDeleteRoadmapOpen, setIsDeleteRoadmapOpen] = useState(false);
    const [roadmapToDelete, setRoadmapToDelete] = useState<string | null>(null);

    // Form fields state
    const [rmEpisodeCode, setRmEpisodeCode] = useState("");
    const [rmTitle, setRmTitle] = useState("");
    const [rmContentType, setRmContentType] = useState<ProjectContentType>("knowledge_article");
    const [rmContentLayer, setRmContentLayer] = useState<ProjectContentLayer>("core_episode");
    const [rmSeriesOrTheme, setRmSeriesOrTheme] = useState("General");
    const [rmStatus, setRmStatus] = useState<ProjectContentRoadmapStatus>("idea");
    const [rmPriority, setRmPriority] = useState<"high" | "medium" | "low" | "none">("medium");
    const [rmTargetChannel, setRmTargetChannel] = useState("");
    const [rmTargetPublishDate, setRmTargetPublishDate] = useState("");
    const [rmRelatedMainEpisode, setRmRelatedMainEpisode] = useState("");
    const [rmNextAction, setRmNextAction] = useState("");
    const [rmNotes, setRmNotes] = useState("");
    const [rmLinkedWritingProjectId, setRmLinkedWritingProjectId] = useState("");
    const [rmLinkedPublishedUrl, setRmLinkedPublishedUrl] = useState("");
    const [rmOrderIndex, setRmOrderIndex] = useState<number>(0);
    const [rmContentGoal, setRmContentGoal] = useState("");
    const [rmReviewNote, setRmReviewNote] = useState("");
    const [rmSourceText, setRmSourceText] = useState("");
    const [rmSourceType, setRmSourceType] = useState<"manual" | "sheet_paste" | "chat_paste" | "arbor_parse">("manual");

    // Arbor Roadmap Assistant Dialog state
    const [isArborRoadmapOpen, setIsArborRoadmapOpen] = useState(false);
    const [arborRoadmapText, setArborRoadmapText] = useState("");
    const [arborRoadmapDrafts, setArborRoadmapDrafts] = useState<ProjectContentRoadmapItem[]>([]);
    const [showArborRoadmapPreview, setShowArborRoadmapPreview] = useState(false);

    // --- Deliverable / Backlog Edit State ---
    const [isDelModalOpen, setIsDelModalOpen] = useState(false);
    const [activeDelItem, setActiveDelItem] = useState<ProjectItem | null>(null);
    const [delTitle, setDelTitle] = useState("");
    const [delStatus, setDelStatus] = useState<"inbox" | "planned" | "done">("inbox");
    const [delIsMilestone, setDelIsMilestone] = useState(false);
    const [delWorkstream, setDelWorkstream] = useState("");
    const [delScheduleBucket, setDelScheduleBucket] = useState<"morning" | "afternoon" | "evening" | "none">("none");
    const [delStartDate, setDelStartDate] = useState("");
    const [delEndDate, setDelEndDate] = useState("");
    const [delNotes, setDelNotes] = useState("");
    const [isDeleteDelOpen, setIsDeleteDelOpen] = useState(false);
    const [delToDelete, setDelToDelete] = useState<string | null>(null);
    // Default metadata helper
    const defaultMetadataForProject = useCallback((proj: Project): ProjectRegistryMetadata => {
        return {
            category: "Other",
            status: proj.status === "done" ? "completed" : "planning",
            priority: "medium",
            currentGoal: "โปรเจกต์เพื่อการติดตามงานส่วนบุคคล",
            progressStage: proj.status === "done" ? "In Use" : "Concept",
            nextAction: "วางแผนขั้นตอนถัดไป",
            cadence: "Weekly",
            riskOrBlockedBy: "ไม่มี",
            lastUpdated: proj.updated_at || new Date().toISOString()
        };
    }, []);

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const [projRes, itemsRes] = await Promise.all([
                fetch(`/api/projects/${slug}`),
                fetch(`/api/projects/${slug}/items`)
            ]);
            if (projRes.ok) {
                const projData: Project = await projRes.json();
                setProject(projData);
                
                // Load metadata from localStorage
                const storedMeta = getStoredMetadata();
                setMetadata(storedMeta);

                // OPS-002D: Load project-linked docs for context summary
                try {
                    const docsRes = await fetch(`/api/docs?project_id=${projData.id}`);
                    if (docsRes.ok) {
                        const docsData = await docsRes.json();
                        setProjectDocs(docsData.docs || []);
                    }
                } catch { /* ignore docs fetch failure */ }
            }
            if (itemsRes.ok) setItems(await itemsRes.json());
        } finally {
            setLoading(false);
        }
    }, [slug]);

    const loadDocBlocks = useCallback(() => {
        let allBlocks = getStoredDocBlocks();
        let modified = false;

        // 1. Rename block if found
        allBlocks = allBlocks.map(b => {
            if (
                b.projectSlug === "green-fineness-content" &&
                b.title === "Decision Log — Green Fineness Content Project Structure"
            ) {
                modified = true;
                return {
                    ...b,
                    title: "Decision Log — Project Structure and Data Ownership",
                    updatedAt: new Date().toISOString()
                };
            }
            return b;
        });

        // 2. Set default orderIndex for existing Green Fineness Content docs
        allBlocks = allBlocks.map(b => {
            if (b.projectSlug === "green-fineness-content" && (b.orderIndex === undefined || b.orderIndex === null)) {
                if (b.title.startsWith("System Structure — Green Fineness Content")) {
                    modified = true;
                    return { ...b, orderIndex: 10 };
                }
                if (b.title.startsWith("SOP — Green Fineness Content Production")) {
                    modified = true;
                    return { ...b, orderIndex: 20 };
                }
                if (b.title.startsWith("Process Note — Current Workflow")) {
                    modified = true;
                    return { ...b, orderIndex: 30 };
                }
                if (
                    b.title === "Decision Log — Project Structure and Data Ownership" ||
                    b.title === "Decision Log — Green Fineness Content Project Structure"
                ) {
                    modified = true;
                    return { ...b, orderIndex: 40 };
                }
            }
            return b;
        });

        if (modified) {
            saveStoredDocBlocks(allBlocks);
        }

        const projectBlocks = allBlocks.filter(b => b.projectSlug === slug);

        // Sort by orderIndex ascending if present, fallback to date descending, then createdAt descending
        projectBlocks.sort((a, b) => {
            const hasA = a.orderIndex !== undefined && a.orderIndex !== null;
            const hasB = b.orderIndex !== undefined && b.orderIndex !== null;
            if (hasA && hasB) {
                return (a.orderIndex || 0) - (b.orderIndex || 0);
            }
            if (hasA) return -1;
            if (hasB) return 1;

            const dateCompare = b.date.localeCompare(a.date);
            if (dateCompare !== 0) return dateCompare;
            return b.createdAt.localeCompare(a.createdAt);
        });

        setDocBlocks(projectBlocks);
    }, [slug]);

    const loadRoadmapItems = useCallback(() => {
        const allItems = getStoredRoadmapItems();
        const projectItems = allItems.filter(item => item.projectSlug === slug);
        // Sort by orderIndex ascending, then by createdAt ascending
        projectItems.sort((a, b) => {
            const orderCompare = (a.orderIndex || 0) - (b.orderIndex || 0);
            if (orderCompare !== 0) return orderCompare;
            return a.createdAt.localeCompare(b.createdAt);
        });
        setRoadmapItems(projectItems);
    }, [slug]);

    useEffect(() => {
        loadData();
        loadDocBlocks();
        loadRoadmapItems();
    }, [loadData, loadDocBlocks, loadRoadmapItems]);

    // --- Doc Blocks Helpers ---
    const handleOpenAddManual = () => {
        setActiveDocBlock(null);
        setFormTitle("");
        setFormDate(new Date().toISOString().split("T")[0]);
        setFormType("brief");
        setFormSummary("");
        setFormDetails("");
        setFormEvidence("");
        setFormFiles("");
        setFormNextAction("");
        setFormStatus("active");
        setFormOrderIndex("");
        setIsDocModalOpen(true);
    };

    const handleLoadTemplate = (type: ProjectDocBlockType) => {
        const template = DOC_TEMPLATES[type];
        if (template) {
            setFormSummary(template.summary);
            setFormDetails(template.details);
        }
    };

    const handleOpenEdit = (block: ProjectDocumentationBlock) => {
        setActiveDocBlock(block);
        setFormTitle(block.title);
        setFormDate(block.date);
        setFormType(block.type);
        setFormSummary(block.summary);
        setFormDetails(block.details);
        setFormEvidence(block.evidenceLinks ? block.evidenceLinks.join("\n") : "");
        setFormFiles(block.relatedFiles ? block.relatedFiles.join("\n") : "");
        setFormNextAction(block.nextAction || "");
        setFormStatus(block.status);
        setFormOrderIndex(block.orderIndex !== undefined && block.orderIndex !== null ? block.orderIndex.toString() : "");
        setIsDocModalOpen(true);
    };

    const handleSaveBlock = () => {
        if (!formTitle.trim()) {
            alert("กรุณากรอกหัวข้อ");
            return;
        }

        const evidenceLinks = formEvidence
            .split(/[\n,]/)
            .map(s => s.trim())
            .filter(Boolean);

        const relatedFiles = formFiles
            .split(/[\n,]/)
            .map(s => s.trim())
            .filter(Boolean);

        const allBlocks = getStoredDocBlocks();
        const now = new Date().toISOString();
        const parsedOrderVal = formOrderIndex.trim() ? parseInt(formOrderIndex.trim(), 10) : undefined;
        const orderIndex = (parsedOrderVal !== undefined && !isNaN(parsedOrderVal)) ? parsedOrderVal : undefined;

        if (activeDocBlock) {
            // Update
            const updated = allBlocks.map(b => {
                if (b.id === activeDocBlock.id) {
                    return {
                        ...b,
                        title: formTitle.trim(),
                        date: formDate,
                        type: formType,
                        summary: formSummary.trim(),
                        details: formDetails.trim(),
                        evidenceLinks,
                        relatedFiles,
                        nextAction: formNextAction.trim(),
                        status: formStatus,
                        orderIndex,
                        updatedAt: now
                    };
                }
                return b;
            });
            saveStoredDocBlocks(updated);
            setToastMessage("บันทึกการแก้ไขเอกสารเรียบร้อยแล้ว");
        } else {
            // Create
            const newId = Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
            const newBlock: ProjectDocumentationBlock = {
                id: newId,
                projectSlug: slug,
                type: formType,
                title: formTitle.trim(),
                date: formDate,
                summary: formSummary.trim(),
                details: formDetails.trim(),
                evidenceLinks,
                relatedFiles,
                nextAction: formNextAction.trim(),
                status: formStatus,
                orderIndex,
                createdAt: now,
                updatedAt: now
            };
            allBlocks.push(newBlock);
            saveStoredDocBlocks(allBlocks);
            setToastMessage("สร้างบล็อกเอกสารเรียบร้อยแล้ว");
        }

        setShowToast(true);
        setIsDocModalOpen(false);
        loadDocBlocks();
    };

    const handleTriggerDelete = (id: string) => {
        setDocToDelete(id);
        setIsDeleteDocOpen(true);
    };

    const handleConfirmDeleteBlock = () => {
        if (!docToDelete) return;
        const allBlocks = getStoredDocBlocks();
        const filtered = allBlocks.filter(b => b.id !== docToDelete);
        saveStoredDocBlocks(filtered);
        setToastMessage("ลบบล็อกเอกสารเรียบร้อยแล้ว");
        setShowToast(true);
        setIsDeleteDocOpen(false);
        setDocToDelete(null);
        loadDocBlocks();
    };

    // --- Arbor Assistant Parser Engine & Methods ---
    const handleOpenArbor = () => {
        setArborSourceText("");
        setArborSelectedType("auto");
        setArborDraftBlock(null);
        setShowArborPreview(false);
        setIsArborModalOpen(true);
    };

    const handleGenerateArborDraft = () => {
        if (!arborSourceText.trim()) {
            alert("กรุณาวางข้อความดิบ");
            return;
        }

        const cleanText = arborSourceText.trim();
        
        // 1. Detect Type
        let detectedType: ProjectDocBlockType = "process_note";
        if (arborSelectedType === "auto") {
            const lowerText = cleanText.toLowerCase();
            if (lowerText.includes("walkthrough") || lowerText.includes("fixed") || lowerText.includes("bug") || lowerText.includes("issue") || lowerText.includes("fix log") || lowerText.includes("error") || lowerText.includes("debug")) {
                detectedType = "issue_fix";
            } else if (lowerText.includes("publish") || lowerText.includes("deploy") || lowerText.includes("released") || lowerText.includes("live") || lowerText.includes("post log")) {
                detectedType = "publish";
            } else if (lowerText.includes("qa") || lowerText.includes("review") || lowerText.includes("lint") || lowerText.includes("test") || lowerText.includes("checklist")) {
                detectedType = "qa_review";
            } else if (lowerText.includes("decision") || lowerText.includes("decided") || lowerText.includes("chose") || lowerText.includes("architecture decision")) {
                detectedType = "decision";
            } else if (lowerText.includes("milestone") || lowerText.includes("phase") || lowerText.includes("milestones")) {
                detectedType = "milestone";
            } else if (lowerText.includes("sop") || lowerText.includes("manual") || lowerText.includes("guide") || lowerText.includes("how to")) {
                detectedType = "sop";
            } else if (lowerText.includes("structure") || lowerText.includes("schema") || lowerText.includes("db configuration")) {
                detectedType = "structure";
            } else if (lowerText.includes("brief") || lowerText.includes("scope") || lowerText.includes("objectives")) {
                detectedType = "brief";
            }
        } else {
            detectedType = arborSelectedType;
        }

        // 2. Extract Evidence Links
        const urlRegex = /https?:\/\/[^\s/$.?#].[^\s]*/gi;
        const urls = cleanText.match(urlRegex) || [];
        const hashRegex = /\b([a-f0-9]{40}|[a-f0-9]{7})\b/gi;
        const hashes = cleanText.match(hashRegex) || [];
        const evidenceLinks = Array.from(new Set([...urls, ...hashes.map(h => `commit: ${h}`)]));

        // 3. Extract Related Files
        const fileRegex = /\b([\w\-./]+\.(?:tsx|ts|sql|js|jsx|json|css|md|html))\b/gi;
        const rawFiles = cleanText.match(fileRegex) || [];
        const relatedFiles = Array.from(new Set(
            rawFiles
                .map(f => f.replace(/^file:\/\/\//, ""))
                .filter(f => !f.startsWith("http") && (f.includes("/") || f.includes("src/")))
        ));

        // 4. Extract Next Action
        let nextAction = "";
        const lines = cleanText.split("\n");
        const nextActionLine = lines.find(l => {
            const lowerLine = l.toLowerCase();
            return lowerLine.includes("todo") || 
                   lowerLine.includes("next step") || 
                   lowerLine.includes("next action") || 
                   lowerLine.includes("future work") ||
                   lowerLine.includes("todo list");
        });
        if (nextActionLine) {
            nextAction = nextActionLine.replace(/^[-\s*]*[Tt]odo:?/i, "")
                                      .replace(/^[-\s*]*[Nn]ext\s+[Ss]tep:?/i, "")
                                      .replace(/^[-\s*]*[Nn]ext\s+[Aa]ction:?/i, "")
                                      .trim();
        }

        // 5. Title
        let title = "";
        const firstLine = lines.find(l => l.trim().length > 0) || "";
        title = firstLine.replace(/^[#\s-]*/, "")
                         .replace(/^[Goal|Title|Brief|Walkthrough|Fixed|Issue|Bug|SOP]+:/i, "")
                         .trim();
        if (title.length > 80) {
            title = title.substring(0, 77) + "...";
        }
        if (!title) {
            title = `Arbor Auto-Draft: ${BLOCK_TYPE_LABELS[detectedType]}`;
        }

        // 6. Summary
        let summary = "";
        const firstFewLines = lines
            .filter(l => l.trim().length > 0 && !l.startsWith("#"))
            .slice(0, 3)
            .join(" ")
            .replace(/[*_`#]/g, "")
            .trim();
        if (firstFewLines.length > 150) {
            summary = firstFewLines.substring(0, 147) + "...";
        } else {
            summary = firstFewLines || `Auto-generated draft for ${BLOCK_TYPE_LABELS[detectedType]}`;
        }

        const now = new Date().toISOString();
        const draftId = activeDocBlock ? activeDocBlock.id : (Math.random().toString(36).substring(2, 15) + Date.now().toString(36));

        const draft: ProjectDocumentationBlock = {
            id: draftId,
            projectSlug: slug,
            type: detectedType,
            title,
            date: now.split("T")[0],
            summary,
            details: cleanText,
            evidenceLinks,
            relatedFiles,
            nextAction: nextAction || "ตรวจสอบความถูกต้องของฟีเจอร์",
            status: "active",
            createdAt: activeDocBlock ? activeDocBlock.createdAt : now,
            updatedAt: now,
            
            // source metadata
            sourceText: cleanText,
            sourceExcerpt: cleanText.length > 300 ? cleanText.substring(0, 297) + "..." : cleanText,
            sourceType: cleanText.toLowerCase().includes("walkthrough") ? "walkthrough" : 
                        cleanText.toLowerCase().includes("commit") ? "commit_log" : 
                        cleanText.toLowerCase().includes("qa") ? "qa_report" : "manual_paste",
            generatedBy: "arbor",
            reviewedByUser: true,
            appliedAt: now
        };

        setArborDraftBlock(draft);
        setShowArborPreview(true);
    };

    const handleApplyArborDraft = () => {
        if (!arborDraftBlock) return;
        
        const allBlocks = getStoredDocBlocks();
        
        if (activeDocBlock) {
            // Edit existing block
            const updated = allBlocks.map(b => {
                if (b.id === activeDocBlock.id) {
                    return arborDraftBlock;
                }
                return b;
            });
            saveStoredDocBlocks(updated);
            setToastMessage("อัปเดตบล็อกเอกสารด้วย Arbor สำเร็จ");
        } else {
            // New block
            allBlocks.push(arborDraftBlock);
            saveStoredDocBlocks(allBlocks);
            setToastMessage("สร้างบล็อกเอกสารด้วย Arbor สำเร็จ");
        }

        setShowToast(true);
        setIsArborModalOpen(false);
        setArborDraftBlock(null);
        setShowArborPreview(false);
        setActiveDocBlock(null);
        loadDocBlocks();
    };

    const generateArborContextMarkdown = () => {
        if (!project) return "";

        const activeMeta = (metadata[slug] || {}) as any;
        const cat = activeMeta.category || "N/A";
        const detStatus = activeMeta.status || "N/A";
        const prio = activeMeta.priority || "N/A";
        const goal = activeMeta.currentGoal || "N/A";
        const next = activeMeta.nextAction || "N/A";
        const cadence = activeMeta.cadence || "N/A";
        const risk = activeMeta.riskOrBlockedBy || "N/A";
        const updated = activeMeta.lastUpdated || "N/A";

        // Filter doc blocks
        const systemStructureBlock = docBlocks.find(b => b.type === "structure");
        const sopBlock = docBlocks.find(b => b.type === "sop");
        const decisionBlock = docBlocks.find(b => b.type === "decision");

        // Format system structure
        let systemStructureStr = "N/A";
        if (systemStructureBlock) {
            systemStructureStr = `### ${systemStructureBlock.title}\n${systemStructureBlock.details}`;
        }

        // Format SOP / Workflow
        let sopStr = "N/A";
        if (sopBlock) {
            sopStr = `### ${sopBlock.title}\n${sopBlock.details}`;
        }

        // Format active content roadmap (structured items from localStorage)
        let roadmapStr = "N/A";
        if (roadmapItems.length > 0) {
            roadmapStr = roadmapItems.map(item => {
                return `- **${item.episodeCode || "N/A"}**: ${item.title || "N/A"} | Type: ${item.contentType || "N/A"} | Layer: ${item.contentLayer || "N/A"} | Status: ${item.status || "N/A"}${item.targetPublishDate ? ` | Target: ${item.targetPublishDate}` : ""}`;
            }).join("\n");
        }

        // OPS-003D: Extract Content Roadmap doc and Publish Log doc from projectDocs
        const roadmapDoc = projectDocs.find(d => d.title?.includes("Content Roadmap"));
        const publishLogDoc = projectDocs.find(d => d.title?.includes("Publish Log"));

        const extractDocExcerpt = (doc: any, maxLines: number = 30): string => {
            if (!doc) return "N/A";
            const md = (doc as any).content_md;
            if (!md || typeof md !== "string") return `(Document exists: ${doc.title}, but content not loaded)`;
            const lines = md.split("\n").filter((l: string) => l.trim().length > 0);
            const excerpt = lines.slice(0, maxLines).join("\n");
            const truncated = lines.length > maxLines ? `\n... (${lines.length - maxLines} more lines)` : "";
            return excerpt + truncated;
        };

        let roadmapDocStr = "N/A";
        if (roadmapDoc) {
            roadmapDocStr = `- Document: **${roadmapDoc.title}**\n- Last Updated: ${new Date(roadmapDoc.updated_at).toLocaleDateString()}\n\n${extractDocExcerpt(roadmapDoc)}`;
        }

        let publishLogDocStr = "N/A";
        if (publishLogDoc) {
            publishLogDocStr = `- Document: **${publishLogDoc.title}**\n- Last Updated: ${new Date(publishLogDoc.updated_at).toLocaleDateString()}\n\n${extractDocExcerpt(publishLogDoc)}`;
        }

        // Recent publish notes / QA / performance
        const publishLogs = docBlocks.filter(b => b.type === "publish" || b.type === "qa_review");
        let publishLogsStr = "N/A";
        if (publishLogs.length > 0) {
            publishLogsStr = publishLogs.map(b => `- **${b.title}** (${b.date}): ${b.summary}\n${b.details}`).join("\n\n");
        }

        // Open questions
        const openQuestions = docBlocks.filter(b => b.type === "decision" && b.status?.toLowerCase().includes("open"));
        let openQuestionsStr = "N/A";
        if (openQuestions.length > 0) {
            openQuestionsStr = openQuestions.map(b => `- **${b.title}**: ${b.summary}`).join("\n");
        } else if (decisionBlock) {
            openQuestionsStr = `### Decision Logs & Context\n**${decisionBlock.title}**\nSummary: ${decisionBlock.summary}\n\nDetails:\n${decisionBlock.details}`;
        }

        // Suggested next actions (registry next action + blocks nextAction + items)
        const blockNextActions = docBlocks.map(b => b.nextAction ? `- [Block: ${b.title}] ${b.nextAction}` : "").filter(Boolean);
        const itemNextActions = items.map(it => it.status !== "done" ? `- [Backlog Item] ${it.title} (${it.status})` : "").filter(Boolean);
        let suggestedNextStr = `- [Registry Metadata] ${next}`;
        if (blockNextActions.length > 0) {
            suggestedNextStr += "\n" + blockNextActions.join("\n");
        }
        if (itemNextActions.length > 0) {
            suggestedNextStr += "\n" + itemNextActions.join("\n");
        }

        return `# Project
- Name: ${project.name}
- Slug: ${slug}
- Category: ${cat}
- Description: ${(project as any).description || "N/A"}

# Current Status
- Detailed Status: ${detStatus}
- Priority: ${prio}
- Cadence: ${cadence}
- Last Updated: ${updated}

# Current Goal
${goal}

# Next Action
${next}

# Risks / Blockers
${risk}

# System Structure
${systemStructureStr}

# Current SOP / Workflow
${sopStr}

# Structured Roadmap Board
Source: Roadmap UI Table / localStorage (${roadmapItems.length} items)
${roadmapStr}

# Content Roadmap Document
Source: Project Doc / SQLite
${roadmapDocStr}

# Publish Log Document
Source: Project Doc / SQLite
${publishLogDocStr}

# Recent Publish / Performance Notes (Doc Blocks)
${publishLogsStr}

# Open Questions
${openQuestionsStr}

# Related Notes & Knowledge (Project Docs)
${projectDocs.length > 0 ? projectDocs.map(d => `- **${d.title}** (updated: ${new Date(d.updated_at).toLocaleDateString()})`).join("\n") : "N/A"}

# Suggested Next Actions
${suggestedNextStr}

# Data Source Note
- Structured Roadmap Board (above) reads from localStorage — used for table/operation tracking in the Roadmap UI.
- Content Roadmap Document (above) reads from SQLite docs — used for editorial planning notes and long-form roadmap context.
- These two sources are not automatically synced yet.
- Use Arbor Roadmap Parser to import structured items into the Roadmap Board.
- Use the Doc Editor to update the Content Roadmap Document.`;
    };

    // Filter & Search computation
    const filteredDocBlocks = useMemo(() => {
        return docBlocks.filter(b => {
            const matchSearch = b.title.toLowerCase().includes(docSearch.toLowerCase()) || 
                                b.summary.toLowerCase().includes(docSearch.toLowerCase()) ||
                                b.details.toLowerCase().includes(docSearch.toLowerCase());
            const matchType = docTypeFilter === "all" || b.type === docTypeFilter;
            return matchSearch && matchType;
        });
    }, [docBlocks, docSearch, docTypeFilter]);

    // --- Content Roadmap Helpers ---
    const handleOpenAddRoadmap = () => {
        setActiveRoadmapItem(null);
        setRmEpisodeCode("");
        setRmTitle("");
        setRmContentType("knowledge_article");
        setRmContentLayer("core_episode");
        setRmSeriesOrTheme("General");
        setRmStatus("idea");
        setRmPriority("medium");
        setRmTargetChannel("Facebook / Website");
        setRmTargetPublishDate("");
        setRmRelatedMainEpisode("");
        setRmNextAction("เตรียมยกร่างเนื้อหาตอน");
        setRmNotes("");
        setRmLinkedWritingProjectId("");
        setRmLinkedPublishedUrl("");
        setRmOrderIndex(roadmapItems.length > 0 ? Math.max(...roadmapItems.map(r => r.orderIndex || 0)) + 10 : 10);
        setRmContentGoal("");
        setRmReviewNote("");
        setRmSourceText("");
        setRmSourceType("manual");
        setIsRoadmapModalOpen(true);
    };

    const handleOpenEditRoadmap = (item: ProjectContentRoadmapItem) => {
        setActiveRoadmapItem(item);
        setRmEpisodeCode(item.episodeCode);
        setRmTitle(item.title);
        setRmContentType(item.contentType);
        setRmContentLayer(item.contentLayer);
        setRmSeriesOrTheme(item.seriesOrTheme || "General");
        setRmStatus(item.status);
        setRmPriority(item.priority);
        setRmTargetChannel(item.targetChannel || "");
        setRmTargetPublishDate(item.targetPublishDate || "");
        setRmRelatedMainEpisode(item.relatedMainEpisode || "");
        setRmNextAction(item.nextAction || "");
        setRmNotes(item.notes || "");
        setRmLinkedWritingProjectId(item.linkedWritingProjectId || "");
        setRmLinkedPublishedUrl(item.linkedPublishedUrl || "");
        setRmOrderIndex(item.orderIndex || 0);
        setRmContentGoal(item.contentGoal || "");
        setRmReviewNote(item.reviewNote || "");
        setRmSourceText(item.sourceText || "");
        setRmSourceType(item.sourceType || "manual");
        setIsRoadmapModalOpen(true);
    };

    const handleSaveRoadmap = () => {
        if (!rmEpisodeCode.trim() || !rmTitle.trim()) {
            alert("กรุณากรอกรหัสตอนและหัวข้อคอนเทนต์");
            return;
        }

        const allItems = getStoredRoadmapItems();
        const now = new Date().toISOString();

        if (activeRoadmapItem) {
            // Update
            const updated = allItems.map(item => {
                if (item.id === activeRoadmapItem.id) {
                    return {
                        ...item,
                        episodeCode: rmEpisodeCode.trim(),
                        title: rmTitle.trim(),
                        contentType: rmContentType,
                        contentLayer: rmContentLayer,
                        seriesOrTheme: rmSeriesOrTheme.trim() || "General",
                        status: rmStatus,
                        priority: rmPriority,
                        targetChannel: rmTargetChannel.trim(),
                        targetPublishDate: rmTargetPublishDate,
                        relatedMainEpisode: rmRelatedMainEpisode.trim(),
                        nextAction: rmNextAction.trim(),
                        notes: rmNotes.trim(),
                        linkedWritingProjectId: rmLinkedWritingProjectId.trim(),
                        linkedPublishedUrl: rmLinkedPublishedUrl.trim(),
                        orderIndex: Number(rmOrderIndex),
                        contentGoal: rmContentGoal.trim(),
                        reviewNote: rmReviewNote.trim(),
                        updatedAt: now
                    };
                }
                return item;
            });
            saveStoredRoadmapItems(updated);
            setToastMessage("บันทึกการแก้ไขแผนงานคอนเทนต์เรียบร้อยแล้ว");
        } else {
            // Create
            const newId = Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
            const newItem: ProjectContentRoadmapItem = {
                id: newId,
                projectSlug: slug,
                episodeCode: rmEpisodeCode.trim(),
                title: rmTitle.trim(),
                contentType: rmContentType,
                contentLayer: rmContentLayer,
                seriesOrTheme: rmSeriesOrTheme.trim() || "General",
                status: rmStatus,
                priority: rmPriority,
                targetChannel: rmTargetChannel.trim(),
                targetPublishDate: rmTargetPublishDate,
                relatedMainEpisode: rmRelatedMainEpisode.trim(),
                nextAction: rmNextAction.trim(),
                notes: rmNotes.trim(),
                linkedWritingProjectId: rmLinkedWritingProjectId.trim(),
                linkedPublishedUrl: rmLinkedPublishedUrl.trim(),
                orderIndex: Number(rmOrderIndex),
                contentGoal: rmContentGoal.trim(),
                reviewNote: rmReviewNote.trim(),
                sourceText: rmSourceText,
                sourceType: rmSourceType,
                createdAt: now,
                updatedAt: now
            };
            allItems.push(newItem);
            saveStoredRoadmapItems(allItems);
            setToastMessage("เพิ่มแผนงานคอนเทนต์เรียบร้อยแล้ว");
        }

        setShowToast(true);
        setIsRoadmapModalOpen(false);
        loadRoadmapItems();
    };

    const handleDuplicateRoadmap = (item: ProjectContentRoadmapItem) => {
        const allItems = getStoredRoadmapItems();
        const now = new Date().toISOString();
        const newId = Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
        
        const newOrder = (item.orderIndex || 0) + 5;

        const clonedItem: ProjectContentRoadmapItem = {
            ...item,
            id: newId,
            episodeCode: `${item.episodeCode}-Copy`,
            title: `${item.title} (Copy)`,
            orderIndex: newOrder,
            createdAt: now,
            updatedAt: now,
            sourceType: "manual"
        };

        allItems.push(clonedItem);
        saveStoredRoadmapItems(allItems);
        setToastMessage(`คัดลอกแผนงาน ${item.episodeCode} สำเร็จ`);
        setShowToast(true);
        loadRoadmapItems();
    };

    const handleMarkAsPublished = (item: ProjectContentRoadmapItem) => {
        const allItems = getStoredRoadmapItems();
        const now = new Date().toISOString();
        const updated = allItems.map(r => {
            if (r.id === item.id) {
                return {
                    ...r,
                    status: "published" as const,
                    updatedAt: now
                };
            }
            return r;
        });
        saveStoredRoadmapItems(updated);
        setToastMessage(`เปลี่ยนสถานะเป็น Published สำหรับ ${item.episodeCode}`);
        setShowToast(true);
        loadRoadmapItems();
    };

    const handleMarkAsTracking = (item: ProjectContentRoadmapItem) => {
        const allItems = getStoredRoadmapItems();
        const now = new Date().toISOString();
        const updated = allItems.map(r => {
            if (r.id === item.id) {
                return {
                    ...r,
                    status: "tracking" as const,
                    updatedAt: now
                };
            }
            return r;
        });
        saveStoredRoadmapItems(updated);
        setToastMessage(`เปลี่ยนสถานะเป็น Tracking สำหรับ ${item.episodeCode}`);
        setShowToast(true);
        loadRoadmapItems();
    };

    const handleTriggerDeleteRoadmap = (id: string) => {
        setRoadmapToDelete(id);
        setIsDeleteRoadmapOpen(true);
    };

    const handleConfirmDeleteRoadmap = () => {
        if (!roadmapToDelete) return;
        const allItems = getStoredRoadmapItems();
        const filtered = allItems.filter(item => item.id !== roadmapToDelete);
        saveStoredRoadmapItems(filtered);
        setToastMessage("ลบรายการแผนคอนเทนต์เรียบร้อยแล้ว");
        setShowToast(true);
        setIsDeleteRoadmapOpen(false);
        setRoadmapToDelete(null);
        loadRoadmapItems();
    };

    const handleRoadmapItemClick = useCallback((item: ProjectContentRoadmapItem) => {
        if (item.linkedPublishedUrl) {
            const url = item.linkedPublishedUrl.trim();
            if (url.startsWith("http://") || url.startsWith("https://")) {
                window.open(url, "_blank", "noopener,noreferrer");
                return;
            }
        }

        if (item.linkedWritingProjectId) {
            const val = item.linkedWritingProjectId.trim();
            if (val.startsWith("http://") || val.startsWith("https://")) {
                window.open(val, "_blank", "noopener,noreferrer");
                return;
            }
            if (slug === "green-fineness-content") {
                router.push(`/workspaces/content/writing-desk-lite?draft_id=${val}`);
            } else {
                router.push(`/workspaces/content/writing-lab?project_id=${val}`);
            }
            return;
        }

        // Fallback: Open edit modal
        handleOpenEditRoadmap(item);
    }, [slug, router]);

    // --- Deliverable / Backlog Helpers ---
    const handleOpenEditDeliverable = (item: ProjectItem) => {
        setActiveDelItem(item);
        setDelTitle(item.title);
        setDelStatus(item.status as any);
        setDelIsMilestone(item.is_milestone === 1);
        setDelWorkstream(item.workstream || "");
        setDelScheduleBucket(item.schedule_bucket as any || "none");
        setDelStartDate(item.start_date || "");
        setDelEndDate(item.end_date || "");
        setDelNotes(item.notes || "");
        setIsDelModalOpen(true);
    };

    const handleSaveDeliverable = async () => {
        if (!activeDelItem) return;
        if (!delTitle.trim()) {
            alert("กรุณากรอกชื่อ Deliverable");
            return;
        }

        setActionLoading(true);
        try {
            const res = await fetch(`/api/project_items/${activeDelItem.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    title: delTitle.trim(),
                    status: delStatus,
                    is_milestone: delIsMilestone ? 1 : 0,
                    workstream: delWorkstream.trim() || null,
                    schedule_bucket: delScheduleBucket === "none" ? null : delScheduleBucket,
                    start_date: delStartDate || null,
                    end_date: delEndDate || null,
                    notes: delNotes.trim() || null
                })
            });

            if (res.ok) {
                setToastMessage("บันทึกการแก้ไข Deliverable เรียบร้อยแล้ว");
                setShowToast(true);
                setIsDelModalOpen(false);
                loadData();
            } else {
                setToastMessage("ไม่สามารถบันทึกข้อมูลได้");
                setShowToast(true);
            }
        } catch (e) {
            console.error("Error updating deliverable", e);
            setToastMessage("เกิดข้อผิดพลาดในการบันทึกข้อมูล");
            setShowToast(true);
        } finally {
            setActionLoading(false);
        }
    };

    const handleTriggerDeleteDeliverable = (id: string) => {
        setDelToDelete(id);
        setIsDeleteDelOpen(true);
    };

    const handleConfirmDeleteDeliverable = async () => {
        if (!delToDelete) return;
        setActionLoading(true);
        try {
            const res = await fetch(`/api/project_items/${delToDelete}`, {
                method: "DELETE"
            });
            if (res.ok) {
                setToastMessage("ลบ Deliverable เรียบร้อยแล้ว");
                setShowToast(true);
                setIsDeleteDelOpen(false);
                setDelToDelete(null);
                setIsDelModalOpen(false); // Close edit modal too just in case
                loadData();
            } else {
                setToastMessage("ไม่สามารถลบข้อมูลได้");
                setShowToast(true);
            }
        } catch (e) {
            console.error("Error deleting deliverable", e);
            setToastMessage("เกิดข้อผิดพลาดในการลบข้อมูล");
            setShowToast(true);
        } finally {
            setActionLoading(false);
        }
    };

    // --- Arbor Roadmap Importer ---
    const handleOpenArborRoadmap = () => {
        setArborRoadmapText("");
        setArborRoadmapDrafts([]);
        setShowArborRoadmapPreview(false);
        setIsArborRoadmapOpen(true);
    };

    const handleGenerateArborRoadmap = () => {
        if (!arborRoadmapText.trim()) {
            alert("กรุณาวางข้อความแผนงานคอนเทนต์");
            return;
        }

        const parsed = parseRoadmapTextToItems(arborRoadmapText, slug);
        setArborRoadmapDrafts(parsed);
        setShowArborRoadmapPreview(true);
    };

    const handleApplyArborRoadmap = () => {
        if (arborRoadmapDrafts.length === 0) return;
        const allItems = getStoredRoadmapItems();
        
        const merged = [...allItems, ...arborRoadmapDrafts];
        saveStoredRoadmapItems(merged);
        
        setToastMessage(`นำเข้าแผนงานคอนเทนต์สำเร็จ ${arborRoadmapDrafts.length} รายการ`);
        setShowToast(true);
        setIsArborRoadmapOpen(false);
        setArborRoadmapDrafts([]);
        setShowArborRoadmapPreview(false);
        loadRoadmapItems();
    };

    const handleUpdateDraftCell = (index: number, field: keyof ProjectContentRoadmapItem, value: any) => {
        setArborRoadmapDrafts(prev => {
            const copy = [...prev];
            copy[index] = {
                ...copy[index],
                [field]: value
            };
            return copy;
        });
    };

    const arborRoadmapPreviewSummary = useMemo(() => {
        const statusCounts: Record<string, number> = {};
        const priorityCounts: Record<string, number> = {};

        arborRoadmapDrafts.forEach(item => {
            statusCounts[item.status] = (statusCounts[item.status] || 0) + 1;
            priorityCounts[item.priority] = (priorityCounts[item.priority] || 0) + 1;
        });

        const formatDistribution = (counts: Record<string, number>, labels?: Record<string, string>) => {
            const entries = Object.entries(counts);
            if (entries.length === 0) return "None";
            return entries.map(([key, count]) => `${labels?.[key] || key}: ${count}`).join(" / ");
        };

        return {
            totalRows: arborRoadmapDrafts.length,
            missingEpisodeCode: arborRoadmapDrafts.filter(item => !item.episodeCode.trim()).length,
            missingTitle: arborRoadmapDrafts.filter(item => !item.title.trim()).length,
            missingParentEp: arborRoadmapDrafts.filter(item => !(item.relatedMainEpisode || "").trim()).length,
            statusDistribution: formatDistribution(statusCounts, ROADMAP_STATUS_LABELS),
            priorityDistribution: formatDistribution(priorityCounts, {
                high: "High",
                medium: "Medium",
                low: "Low",
                none: "None"
            })
        };
    }, [arborRoadmapDrafts]);

    // Filter & Search Roadmap Items
    const filteredRoadmapItems = useMemo(() => {
        return roadmapItems.filter(item => {
            const matchSearch = 
                item.episodeCode.toLowerCase().includes(roadmapSearch.toLowerCase()) ||
                item.title.toLowerCase().includes(roadmapSearch.toLowerCase()) ||
                (item.seriesOrTheme && item.seriesOrTheme.toLowerCase().includes(roadmapSearch.toLowerCase())) ||
                (item.notes && item.notes.toLowerCase().includes(roadmapSearch.toLowerCase()));
            
            const matchStatus = roadmapStatusFilter === "all" || item.status === roadmapStatusFilter;
            const matchType = roadmapTypeFilter === "all" || item.contentType === roadmapTypeFilter;
            const matchPriority = roadmapPriorityFilter === "all" || item.priority === roadmapPriorityFilter;

            return matchSearch && matchStatus && matchType && matchPriority;
        });
    }, [roadmapItems, roadmapSearch, roadmapStatusFilter, roadmapTypeFilter, roadmapPriorityFilter]);

    const activeMeta = useMemo(() => {
        if (!project) return null;
        return metadata[project.slug] || defaultMetadataForProject(project);
    }, [project, metadata, defaultMetadataForProject]);

    const handleArchive = async () => {
        if (!project) return;
        setActionLoading(true);
        try {
            const res = await fetch(`/api/projects/${slug}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: "done" })
            });
            if (res.ok) {
                // Update detailed status in local storage to completed
                const currentMeta = metadata[project.slug] || defaultMetadataForProject(project);
                const updatedMeta = {
                    ...metadata,
                    [project.slug]: {
                        ...currentMeta,
                        status: "completed" as const,
                        progressStage: "In Use" as const,
                        lastUpdated: new Date().toISOString()
                    }
                };
                setMetadata(updatedMeta);
                saveStoredMetadata(updatedMeta);

                setToastMessage(`Project "${project.name}" archived successfully`);
                setShowToast(true);
                setIsArchiveOpen(false);
                loadData();
            }
        } finally {
            setActionLoading(false);
        }
    };

    const openRegistryEdit = () => {
        if (!project || !activeMeta) return;
        setEditName(project.name);
        setEditCategory(activeMeta.category);
        setEditStatus(activeMeta.status);
        setEditPriority(activeMeta.priority);
        setEditCurrentGoal(activeMeta.currentGoal);
        setEditProgressStage(activeMeta.progressStage);
        setEditNextAction(activeMeta.nextAction);
        setEditCadence(activeMeta.cadence);
        setEditRiskOrBlockedBy(activeMeta.riskOrBlockedBy);
        setIsRegistryEditOpen(true);
    };

    const handleSaveRegistryMetadata = async () => {
        if (!project) return;
        setActionLoading(true);
        try {
            // Update name in DB if changed
            if (editName.trim() !== project.name) {
                await fetch(`/api/projects/${project.slug}`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ name: editName.trim() })
                });
            }

            // Sync with SQLite status
            let dbStatus: "inbox" | "planned" | "done" = "planned";
            if (editStatus === "completed") {
                dbStatus = "done";
            } else if (editStatus === "idea") {
                dbStatus = "inbox";
            }

            await fetch(`/api/projects/${project.slug}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: dbStatus })
            });

            // Update metadata store
            const newMeta: ProjectRegistryMetadata = {
                category: editCategory.trim() || "Other",
                status: editStatus,
                priority: editPriority,
                currentGoal: editCurrentGoal.trim(),
                progressStage: editProgressStage,
                nextAction: editNextAction.trim(),
                cadence: editCadence.trim() || "Weekly",
                riskOrBlockedBy: editRiskOrBlockedBy.trim() || "None",
                lastUpdated: new Date().toISOString()
            };

            const updatedMetadata = {
                ...metadata,
                [project.slug]: newMeta
            };

            setMetadata(updatedMetadata);
            saveStoredMetadata(updatedMetadata);

            setToastMessage("บันทึกการปรับปรุงโปรเจกต์สำเร็จ");
            setShowToast(true);
            setIsRegistryEditOpen(false);
            loadData();
        } catch (e) {
            console.error("Error updating project metadata:", e);
            setToastMessage("เกิดข้อผิดพลาดในการบันทึกข้อมูล");
            setShowToast(true);
        } finally {
            setActionLoading(false);
        }
    };

    const handleAddItem = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newItemTitle.trim()) return;

        const res = await fetch(`/api/projects/${slug}/items`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ title: newItemTitle, status: "inbox" })
        });

        if (res.ok) {
            setNewItemTitle("");
            loadData();
        }
    };

    if (loading) return <PageShell><div className="p-20 text-center text-neutral-400 italic font-medium">Loading project details...</div></PageShell>;
    if (!project) return <PageShell><div className="p-20 text-center text-red-500 font-bold">Project &quot;{slug}&quot; not found.</div></PageShell>;

    const milestones = items.filter(i => i.is_milestone === 1);
    const otherItems = items
        .filter(i => i.is_milestone === 0)
        .sort((a, b) => a.title.localeCompare(b.title, undefined, { numeric: true }));

    return (
        <PageShell>
            <div className="flex items-center gap-2 mb-6 text-neutral-400 hover:text-black dark:hover:text-white transition-colors cursor-pointer group w-fit" onClick={() => router.push("/projects")}>
                <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                <span className="text-xs font-black uppercase tracking-widest">Back to Project Registry</span>
            </div>

            {isArborContext && (
                <div className="mb-6 bg-purple-500/5 dark:bg-purple-950/10 border border-purple-500/20 rounded-2xl p-6 space-y-4 text-left">
                    <div className="flex items-center justify-between border-b border-purple-500/10 dark:border-purple-500/20 pb-3">
                        <div className="flex items-center gap-2">
                            <Sparkles className="w-5 h-5 text-purple-600 animate-pulse" />
                            <h2 className="text-sm font-black text-purple-950 dark:text-purple-300 uppercase tracking-widest">
                                Arbor Project Context View
                            </h2>
                        </div>
                        <button
                            onClick={() => {
                                navigator.clipboard.writeText(generateArborContextMarkdown());
                                alert("คัดลอก Arbor Project Context สำเร็จแล้ว! (Copied Arbor Context to clipboard)");
                            }}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-black transition-all active:scale-95 shadow-sm"
                        >
                            <Copy className="w-3.5 h-3.5" />
                            Copy Arbor Context
                        </button>
                    </div>
                    <div className="bg-neutral-50 dark:bg-neutral-900/60 border border-neutral-200 dark:border-neutral-800 rounded-xl p-4 max-h-96 overflow-y-auto font-mono text-[11px] leading-relaxed text-neutral-800 dark:text-neutral-300 whitespace-pre-wrap select-all">
                        {generateArborContextMarkdown()}
                    </div>
                </div>
            )}

            <PageHeader
                title={project.name}
                subtitle={`${slug} • ${project.status}`}
                rightMeta={
                    activeMeta && (
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">
                                {activeMeta.category}
                            </span>
                            <span className={`px-2.5 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider ${STATUS_COLORS[activeMeta.status]}`}>
                                {STATUS_LABELS[activeMeta.status]}
                            </span>
                            <span className={`px-2.5 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider ${PRIORITY_COLORS[activeMeta.priority]}`}>
                                {activeMeta.priority}
                            </span>
                        </div>
                    )
                }
                actions={
                    <div className="flex items-center gap-2">
                        <button 
                            onClick={openRegistryEdit}
                            className="flex items-center gap-1.5 px-4 py-2 bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900 rounded-xl text-xs font-black hover:opacity-90 transition-all shadow-sm active:scale-95"
                            title="Edit Project Registry Info"
                        >
                            <Edit2 className="w-3.5 h-3.5" />
                            แก้ไข Registry
                        </button>
                        <button 
                            onClick={() => setIsArchiveOpen(true)}
                            className={`p-2.5 rounded-xl bg-white border border-neutral-200 transition-all active:scale-95 shadow-sm dark:bg-neutral-900 dark:border-neutral-800 ${
                                project.status === 'done' ? "text-green-600 border-green-200 bg-green-50 dark:bg-green-950/20" : "text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
                            }`}
                            disabled={project.status === 'done'}
                            title="Archive Project"
                        >
                            <Archive className="w-4 h-4" />
                        </button>
                        <button 
                            onClick={() => setIsDeleteOpen(true)}
                            className="p-2.5 rounded-xl bg-white border border-neutral-200 text-neutral-400 hover:text-red-600 hover:border-red-200 hover:bg-red-50 dark:bg-neutral-900 dark:border-neutral-800 transition-all active:scale-95 shadow-sm"
                            title="Delete Project"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>
                }
            />

            {/* Main content grid */}
            <div className="w-full max-w-[1600px] mx-auto grid grid-cols-1 xl:grid-cols-12 gap-8 mt-8 pb-12">
                
                {/* Main Deliverables & Milestones (Left side) */}
                <div className="xl:col-span-9 space-y-10">
                    
                    {/* Project Items Form */}
                    <div className="bg-theme-panel p-4 rounded-3xl border border-neutral-200 shadow-sm focus-within:shadow-md transition-shadow">
                        <form onSubmit={handleAddItem} className="flex gap-2">
                            <div className="flex-1 relative">
                                <input
                                    type="text"
                                    value={newItemTitle}
                                    onChange={e => setNewItemTitle(e.target.value)}
                                    placeholder="Add a project deliverable or item..."
                                    className="w-full pl-10 pr-4 py-3 bg-theme-card border-transparent focus:bg-white focus:border-neutral-200 rounded-2xl text-base transition-all outline-none font-medium text-theme-primary"
                                />
                                <Plus className="absolute left-3.5 top-3.5 h-5 w-5 text-neutral-400" />
                            </div>
                            <button 
                                type="submit" 
                                disabled={!newItemTitle.trim()}
                                className="bg-black text-white dark:bg-white dark:text-black px-6 py-3 rounded-2xl text-sm font-black disabled:opacity-50 transition-all hover:bg-neutral-800 dark:hover:bg-neutral-200 shadow-lg active:scale-95"
                            >
                                Add Item
                            </button>
                        </form>
                    </div>

                    {milestones.length > 0 && (
                        <section>
                            <div className="flex items-center gap-2 mb-4 px-2">
                                <Target className="w-4 h-4 text-orange-500" />
                                <h2 className="text-xs font-black uppercase tracking-widest text-neutral-500">Major Milestones</h2>
                            </div>
                            <div className="space-y-3">
                                {milestones.map(item => (
                                    <ItemCard key={item.id} item={item} onEdit={handleOpenEditDeliverable} />
                                ))}
                            </div>
                        </section>
                    )}

                    <section>
                        <div className="flex items-center justify-between mb-4 px-2">
                            <div className="flex items-center gap-2">
                                <Layout className="w-4 h-4 text-neutral-400" />
                                <h2 className="text-xs font-black uppercase tracking-widest text-neutral-500">Project Backlog / Deliverables</h2>
                            </div>
                            <span className="text-[10px] font-black text-neutral-300 uppercase">{otherItems.length} Items</span>
                        </div>
                        
                        {otherItems.length === 0 ? (
                            <div className="text-center py-20 bg-neutral-50/50 dark:bg-neutral-900/10 rounded-3xl border border-dashed border-neutral-200">
                                <p className="text-neutral-400 font-medium italic text-sm">No items yet. Quick add above to start building.</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {otherItems.map(item => (
                                    <ItemCard key={item.id} item={item} onEdit={handleOpenEditDeliverable} />
                                ))}
                            </div>
                        )}
                    </section>

                    <RelatedNotesSection projectId={project.id} />

                    {/* Project Documentation Blocks Section */}
                    <section className="border-t border-neutral-200/60 dark:border-neutral-800/60 pt-10 space-y-6">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-2">
                            <div className="space-y-1">
                                <h2 className="text-lg font-black tracking-tight text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
                                    <BookOpen className="w-5 h-5 text-neutral-400" />
                                    Project Documentation & Logs
                                </h2>
                                <p className="text-xs text-neutral-400 font-medium">บันทึกขั้นตอนการทำงาน ประวัติการตัดสินใจ ข้อตกลง และประวัติระบบ</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={handleOpenAddManual}
                                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-neutral-200 text-xs font-black uppercase tracking-wider hover:border-neutral-900 hover:text-black dark:bg-neutral-900 dark:border-neutral-800 dark:text-neutral-300 dark:hover:text-white dark:hover:border-neutral-700 shadow-sm active:scale-95 transition-all"
                                >
                                    <Plus className="w-3.5 h-3.5" />
                                    Add Block
                                </button>
                                <button
                                    onClick={handleOpenArbor}
                                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-black text-white dark:bg-white dark:text-black text-xs font-black uppercase tracking-wider hover:opacity-90 shadow-lg active:scale-95 transition-all"
                                >
                                    <Sparkles className="w-3.5 h-3.5" />
                                    Arbor Assistant
                                </button>
                                <button
                                    onClick={() => setIsContextSummaryOpen(true)}
                                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-purple-600 text-white text-xs font-black uppercase tracking-wider hover:bg-purple-700 shadow-lg active:scale-95 transition-all"
                                >
                                    <Copy className="w-3.5 h-3.5" />
                                    Project Context
                                </button>
                            </div>
                        </div>

                        {/* Search and Filters Controls */}
                        <div className="flex flex-col md:flex-row gap-3 bg-neutral-50 dark:bg-neutral-900/40 p-3.5 rounded-2xl border border-neutral-200/80 dark:border-neutral-800/80">
                            <div className="flex-1 relative">
                                <input
                                    type="text"
                                    placeholder="ค้นหาในประวัติ/เอกสาร..."
                                    value={docSearch}
                                    onChange={e => setDocSearch(e.target.value)}
                                    className="w-full pl-9 pr-4 py-2 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl text-xs font-semibold outline-none focus:border-neutral-400"
                                />
                                <Search className="absolute left-3 top-2.5 h-4 w-4 text-neutral-400" />
                            </div>
                            <div className="flex gap-2">
                                <select
                                    value={docTypeFilter}
                                    onChange={e => setDocTypeFilter(e.target.value)}
                                    className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-neutral-400"
                                >
                                    <option value="all">ทุกประเภท (All types)</option>
                                    {Object.entries(BLOCK_TYPE_LABELS).map(([k, label]) => (
                                        <option key={k} value={k}>{label}</option>
                                    ))}
                                </select>
                                <div className="flex border border-neutral-200 dark:border-neutral-800 rounded-xl bg-white dark:bg-neutral-900 p-0.5 shadow-sm">
                                    <button
                                        onClick={() => setDocViewMode("card")}
                                        className={`p-1.5 rounded-lg transition-all ${docViewMode === "card" ? "bg-neutral-100 text-black dark:bg-neutral-800 dark:text-white" : "text-neutral-400 hover:text-neutral-600"}`}
                                        title="Card View"
                                    >
                                        <LayoutGrid className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                        onClick={() => setDocViewMode("table")}
                                        className={`p-1.5 rounded-lg transition-all ${docViewMode === "table" ? "bg-neutral-100 text-black dark:bg-neutral-800 dark:text-white" : "text-neutral-400 hover:text-neutral-600"}`}
                                        title="Table View"
                                    >
                                        <Table className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Blocks list */}
                        {filteredDocBlocks.length === 0 ? (
                            <div className="text-center py-16 bg-neutral-50/50 dark:bg-neutral-900/10 rounded-3xl border border-dashed border-neutral-200/80">
                                <BookOpen className="w-8 h-8 text-neutral-300 mx-auto mb-2.5" />
                                <p className="text-neutral-400 font-medium italic text-sm dark:text-neutral-500">
                                    {docSearch || docTypeFilter !== "all" 
                                        ? "ไม่พบบล็อกเอกสารที่สอดคล้องกับตัวกรอง"
                                        : "ยังไม่มีประวัติหรือบล็อกเอกสารใด ๆ เริ่มเพิ่มข้อมูลหรือให้ Arbor ช่วยถอดความ"}
                                </p>
                            </div>
                        ) : docViewMode === "card" ? (
                            <div className="grid grid-cols-1 gap-4">
                                {filteredDocBlocks.map(block => (
                                    <DocBlockCard key={block.id} block={block} onEdit={handleOpenEdit} onDelete={handleTriggerDelete} />
                                ))}
                            </div>
                        ) : (
                            <div className="bg-theme-card border border-neutral-200 rounded-3xl overflow-hidden shadow-sm dark:border-neutral-800">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse text-xs">
                                        <thead>
                                            <tr className="bg-neutral-50 dark:bg-neutral-900/60 border-b border-neutral-200 dark:border-neutral-800 text-neutral-400 font-bold uppercase tracking-wider">
                                                <th className="px-4 py-3">วันที่</th>
                                                <th className="px-4 py-3">ประเภท</th>
                                                <th className="px-4 py-3">หัวข้อ</th>
                                                <th className="px-4 py-3">สรุปย่อ</th>
                                                <th className="px-4 py-3">สถานะ</th>
                                                <th className="px-4 py-3 text-right">จัดการ</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-neutral-200/60 dark:divide-neutral-800/60">
                                            {filteredDocBlocks.map(block => (
                                                <tr key={block.id} className="hover:bg-neutral-50/50 dark:hover:bg-neutral-900/20 font-medium text-neutral-700 dark:text-neutral-300 transition-colors">
                                                    <td className="px-4 py-3 whitespace-nowrap text-neutral-400 font-semibold">{block.date}</td>
                                                    <td className="px-4 py-3 whitespace-nowrap">
                                                        <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider ${BLOCK_TYPE_COLORS[block.type]}`}>
                                                            {BLOCK_TYPE_LABELS[block.type]}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3 max-w-[200px] truncate">
                                                        <button 
                                                            type="button"
                                                            onClick={() => handleOpenEdit(block)} 
                                                            className="font-black text-neutral-900 dark:text-neutral-100 hover:text-black dark:hover:text-white hover:underline cursor-pointer transition-colors text-left outline-none focus:underline"
                                                            title={`ดู/แก้ไขเอกสาร ${block.title}`}
                                                        >
                                                            {block.title}
                                                        </button>
                                                    </td>
                                                    <td className="px-4 py-3 max-w-[250px] truncate text-neutral-500 dark:text-neutral-400">{block.summary}</td>
                                                    <td className="px-4 py-3 whitespace-nowrap">
                                                        <span className={`px-2 py-0.5 rounded-md text-[9px] font-bold uppercase ${block.status === "active" ? "bg-blue-50 text-blue-600 dark:bg-blue-950/20 dark:text-blue-400" : "bg-neutral-100 text-neutral-500 dark:bg-neutral-800"}`}>
                                                            {block.status}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3 whitespace-nowrap text-right space-x-2">
                                                        <button onClick={() => handleOpenEdit(block)} className="text-neutral-400 hover:text-black dark:hover:text-white inline-block p-1 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-md transition-colors" title="แก้ไข">
                                                            <Edit2 className="w-3.5 h-3.5" />
                                                        </button>
                                                        <button onClick={() => handleTriggerDelete(block.id)} className="text-neutral-400 hover:text-red-600 inline-block p-1 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-md transition-colors" title="ลบ">
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </section>

                    {/* Content Roadmap / Episode Plan Section */}
                    <section className="border-t border-neutral-200/60 dark:border-neutral-800/60 pt-10 space-y-6">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-2">
                            <div className="space-y-1">
                                <h2 className="text-lg font-black tracking-tight text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
                                    <Layers className="w-5 h-5 text-neutral-400" />
                                    Content Roadmap & Episode Plan
                                </h2>
                                <p className="text-xs text-neutral-400 font-medium">แผนการจัดทำตอนคอนเทนต์ บทความ ซีรีส์ และการติดตามสถานะการเผยแพร่</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={handleOpenAddRoadmap}
                                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-neutral-200 text-xs font-black uppercase tracking-wider hover:border-neutral-900 hover:text-black dark:bg-neutral-900 dark:border-neutral-800 dark:text-neutral-300 dark:hover:text-white dark:hover:border-neutral-700 shadow-sm active:scale-95 transition-all"
                                >
                                    <Plus className="w-3.5 h-3.5" />
                                    Add Item
                                </button>
                                <button
                                    onClick={handleOpenArborRoadmap}
                                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-black text-white dark:bg-white dark:text-black text-xs font-black uppercase tracking-wider hover:opacity-90 shadow-lg active:scale-95 transition-all"
                                >
                                    <Sparkles className="w-3.5 h-3.5" />
                                    Generate Roadmap
                                </button>
                            </div>
                        </div>

                        {/* Search and Filters Controls */}
                        <div className="flex flex-col md:flex-row gap-3 bg-neutral-50 dark:bg-neutral-900/40 p-3.5 rounded-2xl border border-neutral-200/80 dark:border-neutral-800/80">
                            <div className="flex-1 relative">
                                <input
                                    type="text"
                                    placeholder="ค้นหาตอน รหัสตอน ซีรีส์ หรือบันทึก..."
                                    value={roadmapSearch}
                                    onChange={e => setRoadmapSearch(e.target.value)}
                                    className="w-full pl-9 pr-4 py-2.5 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl text-xs font-semibold outline-none focus:border-neutral-400"
                                />
                                <Search className="absolute left-3 top-3 h-4 w-4 text-neutral-400" />
                            </div>
                            <div className="flex flex-wrap gap-2">
                                <select
                                    value={roadmapStatusFilter}
                                    onChange={e => setRoadmapStatusFilter(e.target.value)}
                                    className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl px-2.5 py-2 text-xs font-bold outline-none focus:border-neutral-400"
                                >
                                    <option value="all">ทุกสถานะ (All Status)</option>
                                    {Object.entries(ROADMAP_STATUS_LABELS).map(([k, label]) => (
                                        <option key={k} value={k}>{label}</option>
                                    ))}
                                </select>
                                <select
                                    value={roadmapTypeFilter}
                                    onChange={e => setRoadmapTypeFilter(e.target.value)}
                                    className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl px-2.5 py-2 text-xs font-bold outline-none focus:border-neutral-400"
                                >
                                    <option value="all">ทุกประเภทเนื้อหา (All Types)</option>
                                    {Object.entries(CONTENT_TYPE_LABELS).map(([k, label]) => (
                                        <option key={k} value={k}>{label}</option>
                                    ))}
                                </select>
                                <select
                                    value={roadmapPriorityFilter}
                                    onChange={e => setRoadmapPriorityFilter(e.target.value)}
                                    className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl px-2.5 py-2 text-xs font-bold outline-none focus:border-neutral-400"
                                >
                                    <option value="all">ทุกระดับสำคัญ (All Priority)</option>
                                    <option value="high">High</option>
                                    <option value="medium">Medium</option>
                                    <option value="low">Low</option>
                                    <option value="none">None</option>
                                </select>

                                <div className="flex border border-neutral-200 dark:border-neutral-800 rounded-xl bg-white dark:bg-neutral-900 p-0.5 shadow-sm">
                                    <button
                                        onClick={() => setRoadmapViewMode("table")}
                                        className={`p-1.5 rounded-lg transition-all ${roadmapViewMode === "table" ? "bg-neutral-100 text-black dark:bg-neutral-800 dark:text-white" : "text-neutral-400 hover:text-neutral-600"}`}
                                        title="Table View"
                                    >
                                        <Table className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                        onClick={() => setRoadmapViewMode("card")}
                                        className={`p-1.5 rounded-lg transition-all ${roadmapViewMode === "card" ? "bg-neutral-100 text-black dark:bg-neutral-800 dark:text-white" : "text-neutral-400 hover:text-neutral-600"}`}
                                        title="Card View"
                                    >
                                        <LayoutGrid className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Roadmap items list */}
                        {filteredRoadmapItems.length === 0 ? (
                            <div className="text-center py-16 bg-neutral-50/50 dark:bg-neutral-900/10 rounded-3xl border border-dashed border-neutral-200/80">
                                <Layers className="w-8 h-8 text-neutral-300 mx-auto mb-2.5" />
                                <p className="text-neutral-400 font-medium italic text-sm dark:text-neutral-500">
                                    {roadmapSearch || roadmapStatusFilter !== "all" || roadmapTypeFilter !== "all" || roadmapPriorityFilter !== "all"
                                        ? "ไม่พบแผนตอนคอนเทนต์ที่สอดคล้องกับตัวกรอง"
                                        : "ยังไม่มีรายการแผนคอนเทนต์ใด ๆ เริ่มเพิ่มตอนใหม่หรือใช้ Arbor เพื่อแปลงประวัติ"}
                                </p>
                            </div>
                        ) : roadmapViewMode === "table" ? (
                            <div className="bg-theme-card border border-neutral-200 rounded-3xl overflow-hidden shadow-sm dark:border-neutral-800">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse text-[11px] font-medium">
                                        <thead>
                                            <tr className="bg-neutral-50 dark:bg-neutral-900/60 border-b border-neutral-200 dark:border-neutral-800 text-neutral-400 font-bold uppercase tracking-wider text-[9px]">
                                                <th className="px-3.5 py-3 w-10 text-center">#</th>
                                                <th className="px-3.5 py-3">รหัส EP</th>
                                                <th className="px-3.5 py-3 min-w-[180px]">หัวข้อตอน / เป้าหมาย</th>
                                                <th className="px-3.5 py-3">ประเภทคอนเทนต์</th>
                                                <th className="px-3.5 py-3">สถานะ</th>
                                                <th className="px-3.5 py-3">ความสำคัญ</th>
                                                <th className="px-3.5 py-3">เผยแพร่</th>
                                                <th className="px-3.5 py-3 text-right min-w-[140px]">จัดการ</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-neutral-200/60 dark:divide-neutral-800/60 text-neutral-700 dark:text-neutral-300">
                                            {filteredRoadmapItems.map(item => (
                                                <tr key={item.id} className="hover:bg-neutral-50/50 dark:hover:bg-neutral-900/20 transition-colors">
                                                    <td className="px-3.5 py-3 text-center text-neutral-400 font-bold">{item.orderIndex || 0}</td>
                                                    <td className="px-3.5 py-3 whitespace-nowrap">
                                                        <button
                                                            type="button"
                                                            onClick={() => handleRoadmapItemClick(item)}
                                                            className="px-2 py-0.5 rounded bg-neutral-100 text-neutral-800 dark:bg-neutral-850 dark:text-neutral-200 font-black font-mono hover:bg-neutral-200 dark:hover:bg-neutral-750 transition-colors cursor-pointer outline-none"
                                                            title={`เข้าถึงงาน / แก้ไขตอน ${item.episodeCode}`}
                                                        >
                                                            {item.episodeCode}
                                                        </button>
                                                    </td>
                                                    <td className="px-3.5 py-3 space-y-1">
                                                        <div className="font-black text-neutral-900 dark:text-neutral-100 leading-snug">
                                                            <button
                                                                type="button"
                                                                onClick={() => handleRoadmapItemClick(item)}
                                                                className="hover:underline hover:text-black dark:hover:text-white transition-colors cursor-pointer text-left outline-none focus:underline font-black"
                                                                title={`เข้าถึงงาน / แก้ไขตอน ${item.title}`}
                                                            >
                                                                {item.title}
                                                            </button>
                                                        </div>
                                                        {item.contentGoal && (
                                                            <div className="text-[10px] text-neutral-400 font-medium leading-relaxed italic">
                                                                🎯 {item.contentGoal}
                                                            </div>
                                                        )}
                                                        {item.reviewNote && (
                                                            <div className="text-[9px] text-rose-500 font-semibold leading-relaxed">
                                                                ⚠️ ระวัง: {item.reviewNote}
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td className="px-3.5 py-3 space-y-0.5 whitespace-nowrap">
                                                        <div className="text-neutral-500 font-semibold flex items-center gap-1">
                                                            <Tag className="w-3 h-3 text-neutral-400" />
                                                            {CONTENT_TYPE_LABELS[item.contentType]}
                                                        </div>
                                                        <div className="text-[9px] text-neutral-400 flex items-center gap-1 font-mono">
                                                            <Layers className="w-2.5 h-2.5" />
                                                            {CONTENT_LAYER_LABELS[item.contentLayer]}
                                                        </div>
                                                    </td>
                                                    <td className="px-3.5 py-3 whitespace-nowrap">
                                                        <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider ${ROADMAP_STATUS_COLORS[item.status]}`}>
                                                            {ROADMAP_STATUS_LABELS[item.status]}
                                                        </span>
                                                    </td>
                                                    <td className="px-3.5 py-3 whitespace-nowrap">
                                                        <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider ${PRIORITY_COLORS[item.priority]}`}>
                                                            {item.priority}
                                                        </span>
                                                    </td>
                                                    <td className="px-3.5 py-3 whitespace-nowrap space-y-0.5 text-[10px] text-neutral-400">
                                                        {item.targetChannel && (
                                                            <div className="flex items-center gap-1">
                                                                <Tv className="w-2.5 h-2.5 text-neutral-400" />
                                                                {item.targetChannel}
                                                            </div>
                                                        )}
                                                        {item.targetPublishDate && (
                                                            <div className="font-semibold text-neutral-500">
                                                                📅 {item.targetPublishDate}
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td className="px-3.5 py-3 whitespace-nowrap text-right space-x-1.5">
                                                        <button 
                                                            onClick={() => handleDuplicateRoadmap(item)} 
                                                            className="text-neutral-400 hover:text-black dark:hover:text-white p-1 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-md transition-colors"
                                                            title="Duplicate"
                                                        >
                                                            <Copy className="w-3.5 h-3.5" />
                                                        </button>
                                                        {item.status !== "published" && item.status !== "tracking" && (
                                                            <button 
                                                                onClick={() => handleMarkAsPublished(item)} 
                                                                className="text-green-500 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-950/20 p-1 rounded-md transition-colors font-black text-[9px] border border-green-200 dark:border-green-900/30 uppercase tracking-widest px-1.5"
                                                                title="Mark as Published"
                                                            >
                                                                Publish
                                                            </button>
                                                        )}
                                                        {item.status === "published" && (
                                                            <button 
                                                                onClick={() => handleMarkAsTracking(item)} 
                                                                className="text-blue-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/20 p-1 rounded-md transition-colors font-black text-[9px] border border-blue-200 dark:border-blue-900/30 uppercase tracking-widest px-1.5"
                                                                title="Mark as Tracking"
                                                            >
                                                                Track
                                                            </button>
                                                        )}
                                                        <button 
                                                            onClick={() => handleOpenEditRoadmap(item)} 
                                                            className="text-neutral-400 hover:text-black dark:hover:text-white p-1 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-md transition-colors"
                                                            title="Edit"
                                                        >
                                                            <Edit2 className="w-3.5 h-3.5" />
                                                        </button>
                                                        <button 
                                                            onClick={() => handleTriggerDeleteRoadmap(item.id)} 
                                                            className="text-neutral-400 hover:text-red-650 p-1 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-md transition-colors"
                                                            title="Delete"
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {filteredRoadmapItems.map(item => (
                                    <div key={item.id} className="bg-theme-card border border-neutral-200 rounded-3xl p-5 hover:shadow-md transition-all dark:border-neutral-800 flex flex-col justify-between text-left">
                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between">
                                                <button
                                                    type="button"
                                                    onClick={() => handleRoadmapItemClick(item)}
                                                    className="px-2 py-0.5 rounded bg-neutral-100 text-neutral-800 dark:bg-neutral-850 dark:text-neutral-200 text-[10px] font-black font-mono hover:bg-neutral-200 dark:hover:bg-neutral-750 transition-colors cursor-pointer outline-none"
                                                    title={`เข้าถึงงาน / แก้ไขตอน ${item.episodeCode}`}
                                                >
                                                    {item.episodeCode}
                                                </button>
                                                <div className="flex items-center gap-1.5">
                                                    <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider ${ROADMAP_STATUS_COLORS[item.status]}`}>
                                                        {ROADMAP_STATUS_LABELS[item.status]}
                                                    </span>
                                                    <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider ${PRIORITY_COLORS[item.priority]}`}>
                                                        {item.priority}
                                                    </span>
                                                </div>
                                            </div>

                                            <div>
                                                <h3 className="font-black text-sm text-neutral-900 dark:text-neutral-100 leading-snug">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleRoadmapItemClick(item)}
                                                        className="hover:underline hover:text-black dark:hover:text-white transition-colors cursor-pointer text-left outline-none focus:underline font-black"
                                                        title={`เข้าถึงงาน / แก้ไขตอน ${item.title}`}
                                                    >
                                                        {item.title}
                                                    </button>
                                                </h3>
                                                {item.contentGoal && (
                                                    <p className="text-[10px] text-neutral-400 font-medium leading-relaxed italic mt-1">
                                                        🎯 {item.contentGoal}
                                                    </p>
                                                )}
                                                {item.reviewNote && (
                                                    <p className="text-[9px] text-rose-500 font-semibold leading-relaxed mt-1">
                                                        ⚠️ ระวัง: {item.reviewNote}
                                                    </p>
                                                )}
                                            </div>

                                            <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800 flex flex-wrap gap-2 text-[10px] text-neutral-500">
                                                <span className="flex items-center gap-0.5 font-bold">
                                                    <Tag className="w-3 h-3 text-neutral-400" />
                                                    {CONTENT_TYPE_LABELS[item.contentType]}
                                                </span>
                                                <span className="text-neutral-300">•</span>
                                                <span className="flex items-center gap-0.5 font-mono">
                                                    <Layers className="w-3 h-3" />
                                                    {CONTENT_LAYER_LABELS[item.contentLayer]}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="mt-4 pt-3 border-t border-neutral-100 dark:border-neutral-800 flex justify-between items-center">
                                            <span className="text-[10px] text-neutral-400">
                                                {item.targetPublishDate ? `📅 ${item.targetPublishDate}` : "ยังไม่ได้กําหนดวัน"}
                                            </span>
                                            <div className="flex items-center gap-1.5">
                                                <button onClick={() => handleDuplicateRoadmap(item)} className="p-1.5 text-neutral-400 hover:text-neutral-900 dark:hover:text-white rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-850" title="Duplicate"><Copy className="w-3.5 h-3.5" /></button>
                                                <button onClick={() => handleOpenEditRoadmap(item)} className="p-1.5 text-neutral-400 hover:text-neutral-900 dark:hover:text-white rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-850" title="Edit"><Edit2 className="w-3.5 h-3.5" /></button>
                                                <button onClick={() => handleTriggerDeleteRoadmap(item.id)} className="p-1.5 text-neutral-400 hover:text-red-650 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/20" title="Delete"><Trash2 className="w-3.5 h-3.5" /></button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </section>
                </div>

                {/* Project Registry Metadata side panel (Right side) */}
                <div className="xl:col-span-3 space-y-6">
                    {activeMeta && (
                        <div className="bg-theme-card border border-neutral-200 rounded-[32px] p-6 shadow-sm space-y-6">
                            <div className="flex justify-between items-center pb-4 border-b border-neutral-200/50">
                                <h3 className="font-black text-base text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
                                    <Info className="w-4 h-4 text-neutral-400" />
                                    Project Registry Info
                                </h3>
                                <button
                                    onClick={openRegistryEdit}
                                    className="p-1.5 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-950 text-neutral-400 hover:text-neutral-950 dark:hover:text-white transition-all"
                                    title="Edit Metadata"
                                >
                                    <Edit2 className="w-4 h-4" />
                                </button>
                            </div>

                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <div className="text-[10px] font-black uppercase text-neutral-400 tracking-wider">หมวดหมู่</div>
                                        <div className="text-xs font-bold text-neutral-800 dark:text-neutral-200">{activeMeta.category}</div>
                                    </div>
                                    <div className="space-y-1">
                                        <div className="text-[10px] font-black uppercase text-neutral-400 tracking-wider">อัปเดต (Cadence)</div>
                                        <div className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">{activeMeta.cadence}</div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <div className="text-[10px] font-black uppercase text-neutral-400 tracking-wider">ขั้นตอนการทำงาน</div>
                                        <div className="text-xs font-bold text-neutral-800 dark:text-neutral-200">{activeMeta.progressStage}</div>
                                    </div>
                                    <div className="space-y-1">
                                        <div className="text-[10px] font-black uppercase text-neutral-400 tracking-wider">ความสำคัญ (Priority)</div>
                                        <span className={`inline-block px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider ${PRIORITY_COLORS[activeMeta.priority]}`}>
                                            {activeMeta.priority}
                                        </span>
                                    </div>
                                </div>

                                <div className="space-y-1 pt-2 border-t border-neutral-100 dark:border-neutral-900/50">
                                    <div className="text-[10px] font-black uppercase text-neutral-400 tracking-wider">เป้าหมายโครงการปัจจุบัน</div>
                                    <div className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed bg-neutral-50 dark:bg-neutral-950/20 p-3 rounded-xl border border-neutral-100 dark:border-neutral-900/30">
                                        {activeMeta.currentGoal}
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <div className="text-[10px] font-black uppercase text-neutral-400 tracking-wider">Next Action</div>
                                    <div className="text-xs font-bold text-neutral-800 dark:text-neutral-200 leading-relaxed bg-blue-50/20 dark:bg-blue-950/10 p-3 rounded-xl border-l-4 border-blue-500">
                                        {activeMeta.nextAction}
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <div className="text-[10px] font-black uppercase text-neutral-400 tracking-wider">ความเสี่ยง / อุปสรรค</div>
                                    <div className={`text-xs p-3 rounded-xl border ${
                                        activeMeta.riskOrBlockedBy !== "None" && activeMeta.riskOrBlockedBy !== "ไม่มี"
                                            ? "bg-rose-50/30 border-rose-200 text-rose-700 dark:bg-rose-950/10 dark:border-rose-900/20 dark:text-rose-300"
                                            : "bg-neutral-50 dark:bg-neutral-950/20 border-neutral-100 dark:border-neutral-900/30 text-neutral-500"
                                    }`}>
                                        {activeMeta.riskOrBlockedBy}
                                    </div>
                                </div>

                                <div className="pt-2 border-t border-neutral-100 dark:border-neutral-900/50 flex justify-between items-center text-[9px] text-neutral-400 font-medium">
                                    <span>Last Updated:</span>
                                    <span>{new Date(activeMeta.lastUpdated).toLocaleString()}</span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Registry Edit Panel Modal */}
            <Modal isOpen={isRegistryEditOpen} onClose={() => setIsRegistryEditOpen(false)} title="แก้ไขข้อมูลโครงการ (Project Registry)">
                <div className="p-3 space-y-5 max-h-[82vh] overflow-y-auto">
                    
                    {/* Project Name */}
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-neutral-500 uppercase tracking-widest">ชื่อโครงการ (Project Name)</label>
                        <input
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="w-full bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl px-4 py-2.5 text-sm font-semibold outline-none focus:border-neutral-400"
                            placeholder="กรอกชื่อโครงการ..."
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        {/* Category */}
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-neutral-500 uppercase tracking-widest">หมวดหมู่ (Category)</label>
                            <input
                                type="text"
                                value={editCategory}
                                onChange={(e) => setEditCategory(e.target.value)}
                                className="w-full bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl px-4 py-2.5 text-sm font-semibold outline-none focus:border-neutral-400"
                                placeholder="Core, Green Fineness, Personal..."
                            />
                        </div>

                        {/* Cadence */}
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-neutral-500 uppercase tracking-widest">ความถี่การอัปเดต (Cadence)</label>
                            <input
                                type="text"
                                value={editCadence}
                                onChange={(e) => setEditCadence(e.target.value)}
                                className="w-full bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl px-4 py-2.5 text-sm font-semibold outline-none focus:border-neutral-400"
                                placeholder="Weekly, Bi-weekly, Monthly..."
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                        {/* Status */}
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-neutral-500 uppercase tracking-widest">สถานะละเอียด (Status)</label>
                            <select
                                className="w-full bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2.5 text-sm font-semibold outline-none focus:border-neutral-400"
                                value={editStatus}
                                onChange={(e) => setEditStatus(e.target.value as ProjectRegistryStatus)}
                            >
                                {Object.entries(STATUS_LABELS).map(([k, v]) => (
                                    <option key={k} value={k}>{v}</option>
                                ))}
                            </select>
                        </div>

                        {/* Progress Stage */}
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-neutral-500 uppercase tracking-widest">ขั้นตอนหลัก (Stage)</label>
                            <select
                                className="w-full bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2.5 text-sm font-semibold outline-none focus:border-neutral-400"
                                value={editProgressStage}
                                onChange={(e) => setEditProgressStage(e.target.value as ProjectProgressStage)}
                            >
                                <option value="Concept">Concept</option>
                                <option value="Spec Ready">Spec Ready</option>
                                <option value="Dev Ready">Dev Ready</option>
                                <option value="In Dev">In Dev</option>
                                <option value="QA">QA</option>
                                <option value="Committed">Committed</option>
                                <option value="In Use">In Use</option>
                                <option value="Needs Improvement">Needs Improvement</option>
                                <option value="Paused">Paused</option>
                            </select>
                        </div>

                        {/* Priority */}
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-neutral-500 uppercase tracking-widest">ความสำคัญ (Priority)</label>
                            <select
                                className="w-full bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2.5 text-sm font-semibold outline-none focus:border-neutral-400"
                                value={editPriority}
                                onChange={(e) => setEditPriority(e.target.value as "high" | "medium" | "low" | "none")}
                            >
                                <option value="high">High</option>
                                <option value="medium">Medium</option>
                                <option value="low">Low</option>
                                <option value="none">None</option>
                            </select>
                        </div>
                    </div>

                    {/* Current Goal */}
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-neutral-500 uppercase tracking-widest">เป้าหมายปัจจุบัน (Current Goal)</label>
                        <textarea
                            value={editCurrentGoal}
                            onChange={(e) => setEditCurrentGoal(e.target.value)}
                            rows={2}
                            className="w-full bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl px-4 py-2.5 text-sm font-semibold outline-none focus:border-neutral-400 resize-none"
                            placeholder="อธิบายสิ่งที่เป็นความพยายามหรือเป้าหมายหลักในเฟสนี้..."
                        />
                    </div>

                    {/* Next Action */}
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-neutral-500 uppercase tracking-widest">Next Action (สิ่งที่ต้องทำถัดไป)</label>
                        <textarea
                            value={editNextAction}
                            onChange={(e) => setEditNextAction(e.target.value)}
                            rows={2}
                            className="w-full bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl px-4 py-2.5 text-sm font-semibold outline-none focus:border-neutral-400 resize-none"
                            placeholder="การปฏิบัติที่เจาะจงที่จำเป็นเป็นลำดับถัดไป..."
                        />
                    </div>

                    {/* Risk or Blocked by */}
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-neutral-500 uppercase tracking-widest">ความเสี่ยง / อุปสรรค (Risks / Blocked By)</label>
                        <input
                            type="text"
                            value={editRiskOrBlockedBy}
                            onChange={(e) => setEditRiskOrBlockedBy(e.target.value)}
                            className="w-full bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl px-4 py-2.5 text-sm font-semibold outline-none focus:border-neutral-400"
                            placeholder="ระบุความเสี่ยง หรืออุปสรรคคอขวด (เช่น บล็อกเกอร์ หรือต้องการข้อมูลเพิ่ม)..."
                        />
                    </div>

                    {/* Buttons */}
                    <div className="flex gap-3 pt-3 border-t border-neutral-200 dark:border-neutral-800">
                        <button 
                            type="button" 
                            onClick={() => setIsRegistryEditOpen(false)} 
                            className="flex-1 px-4 py-2.5 rounded-xl border border-neutral-200 text-sm font-bold hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-all"
                        >
                            ยกเลิก
                        </button>
                        <button 
                            type="button" 
                            onClick={handleSaveRegistryMetadata} 
                            disabled={actionLoading || !editName.trim()}
                            className="flex-1 px-4 py-2.5 rounded-xl bg-black text-white dark:bg-white dark:text-black text-sm font-black hover:bg-neutral-800 dark:hover:bg-neutral-100 transition-all disabled:opacity-50 shadow-md"
                        >
                            {actionLoading ? "กำลังบันทึก..." : "บันทึกข้อมูล"}
                        </button>
                    </div>
                </div>
            </Modal>

            <DeleteProjectDialog
                isOpen={isDeleteOpen}
                onClose={() => setIsDeleteOpen(false)}
                onSuccess={() => router.push("/projects")}
                projectSlug={slug}
                projectName={project.name}
            />

            <ConfirmDialog
                isOpen={isArchiveOpen}
                title="Archive Project"
                message={`คุณแน่ใจหรือไม่ว่าต้องการจัดเก็บโปรเจกต์ "${project.name}"? โครงการจะถูกเปลี่ยนสถานะเป็น Completed และจัดเก็บลงแฟ้มเอกสารเก่า`}
                confirmText="จัดเก็บโครงการ"
                onConfirm={handleArchive}
                onCancel={() => setIsArchiveOpen(false)}
            />

            {/* Manual Add / Edit Block Modal */}
            <Modal
                isOpen={isDocModalOpen}
                onClose={() => setIsDocModalOpen(false)}
                title={activeDocBlock ? "แก้ไขบล็อกเอกสาร (Edit Block)" : "เพิ่มบล็อกเอกสาร (Add Block Manually)"}
            >
                <div className="space-y-4 text-left max-h-[80vh] overflow-y-auto pr-1">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-neutral-500 uppercase tracking-wider">ประเภทเอกสาร (Type)</label>
                            <select
                                value={formType}
                                onChange={e => {
                                    const val = e.target.value as ProjectDocBlockType;
                                    setFormType(val);
                                }}
                                className="w-full bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2.5 text-xs font-bold outline-none focus:border-neutral-400"
                            >
                                {Object.entries(BLOCK_TYPE_LABELS).map(([k, label]) => (
                                    <option key={k} value={k}>{label}</option>
                                ))}
                            </select>
                        </div>
                        <div className="space-y-1 flex items-end pb-0.5">
                            <button
                                type="button"
                                onClick={() => handleLoadTemplate(formType)}
                                className="px-3 py-2.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 border border-neutral-200 dark:border-neutral-800 dark:bg-neutral-900 dark:hover:bg-neutral-850 dark:text-neutral-300 rounded-xl text-xs font-bold w-full transition-all active:scale-95 flex items-center justify-center gap-1"
                            >
                                📋 โหลด Template โครงร่าง
                            </button>
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs font-bold text-neutral-500 uppercase tracking-wider">หัวข้อเอกสาร (Title)</label>
                        <input
                            type="text"
                            value={formTitle}
                            onChange={e => setFormTitle(e.target.value)}
                            placeholder="ระบุหัวข้อบล็อกเอกสาร เช่น Project Kickoff Brief, System Architecture"
                            className="w-full bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2.5 text-xs font-semibold outline-none focus:border-neutral-400"
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-neutral-500 uppercase tracking-wider">วันที่บันทึก (Date)</label>
                            <input
                                type="date"
                                value={formDate}
                                onChange={e => setFormDate(e.target.value)}
                                className="w-full bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-xs font-semibold outline-none focus:border-neutral-400"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-neutral-500 uppercase tracking-wider">สถานะ (Status)</label>
                            <input
                                type="text"
                                value={formStatus}
                                onChange={e => setFormStatus(e.target.value)}
                                placeholder="เช่น active, completed, archive"
                                className="w-full bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-xs font-semibold outline-none focus:border-neutral-400"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-neutral-500 uppercase tracking-wider">ลำดับการจัดเรียง (Order Index)</label>
                            <input
                                type="number"
                                value={formOrderIndex}
                                onChange={e => setFormOrderIndex(e.target.value)}
                                placeholder="เช่น 10, 20, 30"
                                className="w-full bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-xs font-semibold outline-none focus:border-neutral-400"
                            />
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs font-bold text-neutral-500 uppercase tracking-wider">สรุปย่อสั้น ๆ (Summary)</label>
                        <input
                            type="text"
                            value={formSummary}
                            onChange={e => setFormSummary(e.target.value)}
                            placeholder="สรุป 1-2 ประโยคสั้น ๆ สำหรับการแสดงผลแบบย่อ"
                            className="w-full bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-xs font-semibold outline-none focus:border-neutral-400"
                        />
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs font-bold text-neutral-500 uppercase tracking-wider">รายละเอียดเชิงลึก (Details - Markdown Supported)</label>
                        <textarea
                            value={formDetails}
                            onChange={e => setFormDetails(e.target.value)}
                            rows={8}
                            placeholder="กรอกเนื้อหา โครงสร้าง คู่มือ หรือคำอธิบายแบบสมบูรณ์"
                            className="w-full bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-xs font-semibold outline-none focus:border-neutral-400 font-mono"
                        />
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs font-bold text-neutral-500 uppercase tracking-wider">กิจกรรมถัดไป (Next Action)</label>
                        <input
                            type="text"
                            value={formNextAction}
                            onChange={e => setFormNextAction(e.target.value)}
                            placeholder="เช่น แก้ไขโมเดลข้อมูล, หรือทดสอบบน Staging"
                            className="w-full bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-xs font-semibold outline-none focus:border-neutral-400"
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-neutral-500 uppercase tracking-wider">ลิงก์หลักฐาน / Commits (แยกด้วยขึ้นบรรทัดใหม่)</label>
                            <textarea
                                value={formEvidence}
                                onChange={e => setFormEvidence(e.target.value)}
                                rows={2}
                                placeholder="วางลิงก์เว็บ หรือ commit hash (บรรทัดละ 1 ลิงก์)"
                                className="w-full bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-xs font-semibold outline-none focus:border-neutral-400 font-mono"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-neutral-500 uppercase tracking-wider">ไฟล์ที่เกี่ยวข้อง (แยกด้วยขึ้นบรรทัดใหม่)</label>
                            <textarea
                                value={formFiles}
                                onChange={e => setFormFiles(e.target.value)}
                                rows={2}
                                placeholder="เช่น src/app/projects/page.tsx (บรรทัดละ 1 ไฟล์)"
                                className="w-full bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-xs font-semibold outline-none focus:border-neutral-400 font-mono"
                            />
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-neutral-100 dark:border-neutral-800">
                        <button
                            type="button"
                            onClick={() => setIsDocModalOpen(false)}
                            className="px-4 py-2 border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-850 rounded-xl text-xs font-bold transition-all active:scale-95"
                        >
                            ยกเลิก
                        </button>
                        <button
                            type="button"
                            onClick={handleSaveBlock}
                            className="px-4 py-2 bg-black text-white dark:bg-white dark:text-black rounded-xl text-xs font-black transition-all active:scale-95 shadow-sm"
                        >
                            บันทึกบล็อก (Save Block)
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Arbor Assistant Modal */}
            <Modal
                isOpen={isArborModalOpen}
                onClose={() => setIsArborModalOpen(false)}
                title="✨ Arbor Documentation Assistant"
            >
                <div className="space-y-4 text-left max-h-[80vh] overflow-y-auto pr-1">
                    {!showArborPreview ? (
                        <>
                            <div className="p-3.5 bg-purple-50/50 dark:bg-purple-950/10 border border-purple-100 dark:border-purple-900/20 rounded-2xl space-y-1">
                                <span className="text-[10px] font-black uppercase text-purple-600 tracking-wider flex items-center gap-1">
                                    <Info className="w-3.5 h-3.5" />
                                    Arbor Auto-Parser
                                </span>
                                <p className="text-xs text-neutral-500 leading-normal font-medium dark:text-neutral-400">
                                    วางข้อความดิบของคุณ เช่น walkthrough รายละเอียด PRD, commit log, ผลการทดสอบ (QA) หรือบันทึกข้อตกลงเพื่อแปลงเป็นบล็อกเอกสารโครงการอย่างรวดเร็ว
                                </p>
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-bold text-neutral-500 uppercase tracking-wider">ประเภทเอกสารปลายทาง</label>
                                <select
                                    value={arborSelectedType}
                                    onChange={e => setArborSelectedType(e.target.value as any)}
                                    className="w-full bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2.5 text-xs font-bold outline-none focus:border-neutral-400"
                                >
                                    <option value="auto">ตรวจจับอัตโนมัติ (Auto Detect Type)</option>
                                    {Object.entries(BLOCK_TYPE_LABELS).map(([k, label]) => (
                                        <option key={k} value={k}>{label}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-bold text-neutral-500 uppercase tracking-wider">วางข้อความดิบ (Source Text)</label>
                                <textarea
                                    value={arborSourceText}
                                    onChange={e => setArborSourceText(e.target.value)}
                                    rows={12}
                                    placeholder="วางข้อความสำหรับวิเคราะห์ที่นี่..."
                                    className="w-full bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-xs font-semibold outline-none focus:border-neutral-400 font-mono"
                                />
                            </div>

                            <div className="flex justify-end gap-3 pt-2 border-t border-neutral-100 dark:border-neutral-800">
                                <button
                                    type="button"
                                    onClick={() => setIsArborModalOpen(false)}
                                    className="px-4 py-2 border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-850 rounded-xl text-xs font-bold transition-all active:scale-95"
                                >
                                    ยกเลิก
                                </button>
                                <button
                                    type="button"
                                    onClick={handleGenerateArborDraft}
                                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-black transition-all active:scale-95 shadow-md"
                                >
                                    วิเคราะห์ข้อความ (Generate Draft)
                                </button>
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="p-3.5 bg-emerald-50/50 dark:bg-emerald-950/10 border border-emerald-100 dark:border-emerald-900/20 rounded-2xl space-y-0.5">
                                <span className="text-[10px] font-black uppercase text-emerald-600 tracking-wider flex items-center gap-1">
                                    <Check className="w-3.5 h-3.5" />
                                    Draft Ready for Review
                                </span>
                                <p className="text-xs text-neutral-500 font-medium dark:text-neutral-400">
                                    ตรวจสอบผลการวิเคราะห์ข้อมูลและกดยืนยัน (Apply Draft) เพื่อบันทึกข้อมูล
                                </p>
                            </div>

                            {activeDocBlock ? (
                                <div className="space-y-3">
                                    <div className="text-xs font-bold text-neutral-400 uppercase tracking-wider pb-1 border-b border-neutral-200 dark:border-neutral-800">
                                        Old vs Proposed Comparison (เปรียบเทียบการแก้ไข)
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="bg-neutral-50/50 dark:bg-neutral-900/40 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-4 space-y-2">
                                            <span className="text-[9px] font-black text-red-500 uppercase tracking-widest block">ดั้งเดิม (Old)</span>
                                            <div className="font-black text-xs text-neutral-900 dark:text-neutral-100">{activeDocBlock.title}</div>
                                            <div className="text-[9px] font-bold text-neutral-400">{activeDocBlock.date} ({BLOCK_TYPE_LABELS[activeDocBlock.type]})</div>
                                            <p className="text-[11px] text-neutral-500 italic line-clamp-3 leading-relaxed mt-1">{activeDocBlock.summary}</p>
                                        </div>
                                        <div className="bg-emerald-50/20 dark:bg-emerald-950/5 border border-emerald-100/50 dark:border-emerald-900/25 rounded-2xl p-4 space-y-2">
                                            <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest block">นำเสนอ (Proposed)</span>
                                            <div className="font-black text-xs text-neutral-900 dark:text-neutral-100">{arborDraftBlock?.title}</div>
                                            <div className="text-[9px] font-bold text-neutral-400">{arborDraftBlock?.date} ({arborDraftBlock && BLOCK_TYPE_LABELS[arborDraftBlock.type]})</div>
                                            <p className="text-[11px] text-neutral-500 italic line-clamp-3 leading-relaxed mt-1">{arborDraftBlock?.summary}</p>
                                        </div>
                                    </div>
                                </div>
                            ) : null}

                            {arborDraftBlock && (
                                <div className="space-y-3.5 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-4 bg-neutral-50/20 dark:bg-neutral-900/10">
                                    <div className="flex items-center justify-between">
                                        <span className={`px-2.5 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider ${BLOCK_TYPE_COLORS[arborDraftBlock.type]}`}>
                                            {BLOCK_TYPE_LABELS[arborDraftBlock.type]}
                                        </span>
                                        <span className="text-[10px] font-bold text-neutral-400">{arborDraftBlock.date}</span>
                                    </div>
                                    <div className="space-y-1">
                                        <span className="text-[9px] font-black uppercase text-neutral-400 tracking-wider block">หัวข้อ (Title)</span>
                                        <input
                                            type="text"
                                            value={arborDraftBlock.title}
                                            onChange={e => setArborDraftBlock({ ...arborDraftBlock, title: e.target.value })}
                                            className="w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-xs font-semibold outline-none"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <span className="text-[9px] font-black uppercase text-neutral-400 tracking-wider block">สรุปย่อ (Summary)</span>
                                        <input
                                            type="text"
                                            value={arborDraftBlock.summary}
                                            onChange={e => setArborDraftBlock({ ...arborDraftBlock, summary: e.target.value })}
                                            className="w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-xs font-semibold outline-none"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <span className="text-[9px] font-black uppercase text-neutral-400 tracking-wider block">รายละเอียดเชิงลึก (Details)</span>
                                        <textarea
                                            value={arborDraftBlock.details}
                                            onChange={e => setArborDraftBlock({ ...arborDraftBlock, details: e.target.value })}
                                            rows={6}
                                            className="w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-xs font-semibold outline-none font-mono"
                                        />
                                    </div>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-medium">
                                        <div className="space-y-1">
                                            <span className="text-[9px] font-black uppercase text-neutral-400 tracking-wider block">Evidence Links (บรรทัดละ 1 ลิงก์)</span>
                                            <textarea
                                                value={arborDraftBlock.evidenceLinks.join("\n")}
                                                onChange={e => setArborDraftBlock({ 
                                                    ...arborDraftBlock, 
                                                    evidenceLinks: e.target.value.split("\n").map(s => s.trim()).filter(Boolean) 
                                                })}
                                                rows={2}
                                                className="w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-xs outline-none font-mono"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <span className="text-[9px] font-black uppercase text-neutral-400 tracking-wider block">Related Files (บรรทัดละ 1 ไฟล์)</span>
                                            <textarea
                                                value={arborDraftBlock.relatedFiles.join("\n")}
                                                onChange={e => setArborDraftBlock({ 
                                                    ...arborDraftBlock, 
                                                    relatedFiles: e.target.value.split("\n").map(s => s.trim()).filter(Boolean) 
                                                })}
                                                rows={2}
                                                className="w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-xs outline-none font-mono"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-1">
                                        <span className="text-[9px] font-black uppercase text-neutral-400 tracking-wider block">งานถัดไป (Next Action)</span>
                                        <input
                                            type="text"
                                            value={arborDraftBlock.nextAction}
                                            onChange={e => setArborDraftBlock({ ...arborDraftBlock, nextAction: e.target.value })}
                                            className="w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-xs font-semibold outline-none"
                                        />
                                    </div>
                                </div>
                            )}

                            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 pt-4 border-t border-neutral-100 dark:border-neutral-800">
                                <button
                                    type="button"
                                    onClick={() => setShowArborPreview(false)}
                                    className="px-4 py-2 border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-850 rounded-xl text-xs font-bold transition-all active:scale-95 flex items-center justify-center gap-1.5"
                                >
                                    <RefreshCw className="w-3.5 h-3.5" />
                                    ย้อนกลับไปแก้ไข Source
                                </button>
                                <div className="flex gap-2 justify-end">
                                    <button
                                        type="button"
                                        onClick={() => setIsArborModalOpen(false)}
                                        className="px-4 py-2 border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-850 rounded-xl text-xs font-bold transition-all active:scale-95"
                                    >
                                        ยกเลิก
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleApplyArborDraft}
                                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black transition-all active:scale-95 shadow-md flex items-center justify-center gap-1.5"
                                    >
                                        <Check className="w-4 h-4" />
                                        ยืนยันบันทึก (Apply Draft)
                                    </button>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </Modal>

            {/* Confirm Delete Doc Block Dialog */}
            <ConfirmDialog
                isOpen={isDeleteDocOpen}
                title="ลบบล็อกเอกสาร (Delete Block)"
                message="คุณแน่ใจหรือไม่ว่าต้องการลบบล็อกเอกสารนี้? การดำเนินการนี้จะไม่สามารถกู้คืนข้อมูลกลับมาได้"
                confirmText="ยืนยันการลบ"
                onConfirm={handleConfirmDeleteBlock}
                onCancel={() => {
                    setIsDeleteDocOpen(false);
                    setDocToDelete(null);
                }}
            />

            {/* Content Roadmap Add / Edit Modal */}
            <Modal
                isOpen={isRoadmapModalOpen}
                onClose={() => setIsRoadmapModalOpen(false)}
                title={activeRoadmapItem ? `แก้ไขแผนงานคอนเทนต์ (${rmEpisodeCode})` : "เพิ่มแผนงานคอนเทนต์ใหม่"}
            >
                <div className="space-y-4 text-left max-h-[85vh] overflow-y-auto pr-1">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-neutral-500 uppercase tracking-wider">รหัสตอน (Episode Code)*</label>
                            <input
                                type="text"
                                value={rmEpisodeCode}
                                onChange={e => setRmEpisodeCode(e.target.value)}
                                placeholder="เช่น EP.10.3-S1"
                                className="w-full bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-xs font-semibold outline-none focus:border-neutral-400 font-mono"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-neutral-500 uppercase tracking-wider">ลำดับการเรียง (Order Index)</label>
                            <input
                                type="number"
                                value={rmOrderIndex}
                                onChange={e => setRmOrderIndex(Number(e.target.value))}
                                className="w-full bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-xs font-semibold outline-none focus:border-neutral-400 font-mono"
                            />
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs font-bold text-neutral-500 uppercase tracking-wider">หัวข้อคอนเทนต์ / ชื่อตอน (Title)*</label>
                        <input
                            type="text"
                            value={rmTitle}
                            onChange={e => setRmTitle(e.target.value)}
                            placeholder="เช่น ทำไมตัดยอดแล้ว บางต้นแตกกิ่งดี แต่บางต้นไม่ค่อยแตก?"
                            className="w-full bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-xs font-semibold outline-none focus:border-neutral-400"
                        />
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs font-bold text-neutral-500 uppercase tracking-wider">เป้าหมายตอนนี้ (Content Goal)</label>
                        <textarea
                            value={rmContentGoal}
                            onChange={e => setRmContentGoal(e.target.value)}
                            rows={2}
                            placeholder="อธิบายความสัมพันธ์เพื่อแก้ปัญหาพฤติกรรมตาข้างพืช..."
                            className="w-full bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-xs font-semibold outline-none focus:border-neutral-400"
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-neutral-500 uppercase tracking-wider">ประเภทคอนเทนต์ (Content Type)</label>
                            <select
                                value={rmContentType}
                                onChange={e => setRmContentType(e.target.value as ProjectContentType)}
                                className="w-full bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-neutral-400"
                            >
                                {Object.entries(CONTENT_TYPE_LABELS).map(([k, label]) => (
                                    <option key={k} value={k}>{label}</option>
                                ))}
                            </select>
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-neutral-500 uppercase tracking-wider">ระดับชั้นของคอนเทนต์ (Content Layer)</label>
                            <select
                                value={rmContentLayer}
                                onChange={e => setRmContentLayer(e.target.value as ProjectContentLayer)}
                                className="w-full bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-neutral-400"
                            >
                                {Object.entries(CONTENT_LAYER_LABELS).map(([k, label]) => (
                                    <option key={k} value={k}>{label}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-neutral-500 uppercase tracking-wider">ซีรีส์ / ธีมหลัก (Theme/Series)</label>
                            <input
                                type="text"
                                value={rmSeriesOrTheme}
                                onChange={e => setRmSeriesOrTheme(e.target.value)}
                                className="w-full bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-xs font-semibold outline-none"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-neutral-500 uppercase tracking-wider">ระดับความสำคัญ (Priority)</label>
                            <select
                                value={rmPriority}
                                onChange={e => setRmPriority(e.target.value as any)}
                                className="w-full bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-xs font-bold outline-none"
                            >
                                <option value="high">High</option>
                                <option value="medium">Medium</option>
                                <option value="low">Low</option>
                                <option value="none">None</option>
                            </select>
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-neutral-500 uppercase tracking-wider">สถานะของแผน (Status)</label>
                            <select
                                value={rmStatus}
                                onChange={e => setRmStatus(e.target.value as ProjectContentRoadmapStatus)}
                                className="w-full bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-xs font-bold outline-none"
                            >
                                {Object.entries(ROADMAP_STATUS_LABELS).map(([k, label]) => (
                                    <option key={k} value={k}>{label}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-neutral-500 uppercase tracking-wider">เป้าหมายช่องทาง (Target Channel)</label>
                            <input
                                type="text"
                                value={rmTargetChannel}
                                onChange={e => setRmTargetChannel(e.target.value)}
                                placeholder="เช่น Facebook Page, YouTube"
                                className="w-full bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-xs font-semibold outline-none"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-neutral-500 uppercase tracking-wider">วันเผยแพร่เป้าหมาย (Publish Date)</label>
                            <input
                                type="date"
                                value={rmTargetPublishDate}
                                onChange={e => setRmTargetPublishDate(e.target.value)}
                                className="w-full bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-xs font-semibold outline-none"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-neutral-500 uppercase tracking-wider">ตอนหลักที่อ้างอิง (Parent EP)</label>
                            <input
                                type="text"
                                value={rmRelatedMainEpisode}
                                onChange={e => setRmRelatedMainEpisode(e.target.value)}
                                placeholder="เช่น EP.10.3"
                                className="w-full bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-xs font-semibold outline-none font-mono"
                            />
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs font-bold text-neutral-500 uppercase tracking-wider">บันทึกข้อควรระวัง / รีวิว (Review Note - เคลม ปุ๋ย ฮอร์โมน ฯลฯ)</label>
                        <input
                            type="text"
                            value={rmReviewNote}
                            onChange={e => setRmReviewNote(e.target.value)}
                            placeholder="เช่น ระวังเรื่องการโฆษณาเคลมฮอร์โมนเร่งรากเกินจริง..."
                            className="w-full bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-xs font-semibold outline-none focus:border-rose-450 text-rose-650"
                        />
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs font-bold text-neutral-500 uppercase tracking-wider">แผนงานขั้นถัดไป (Next Action)</label>
                        <input
                            type="text"
                            value={rmNextAction}
                            onChange={e => setRmNextAction(e.target.value)}
                            placeholder="เช่น จัดหาภาพประกอบ, ลงมือเขียนดราฟต์"
                            className="w-full bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-xs font-semibold outline-none"
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Writing Project ID / Slug (แมนนวล)</label>
                            <input
                                type="text"
                                value={rmLinkedWritingProjectId}
                                onChange={e => setRmLinkedWritingProjectId(e.target.value)}
                                placeholder="เช่น green-fineness-auxin-recomm"
                                className="w-full bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-xs font-semibold outline-none font-mono"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-neutral-500 uppercase tracking-wider">ลิงก์บทความที่เผยแพร่แล้ว (Published URL)</label>
                            <input
                                type="text"
                                value={rmLinkedPublishedUrl}
                                onChange={e => setRmLinkedPublishedUrl(e.target.value)}
                                placeholder="https://..."
                                className="w-full bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-xs font-semibold outline-none font-mono"
                            />
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs font-bold text-neutral-500 uppercase tracking-wider">บันทึกเพิ่มเติม (Notes)</label>
                        <textarea
                            value={rmNotes}
                            onChange={e => setRmNotes(e.target.value)}
                            rows={3}
                            placeholder="รายละเอียดสั้น ๆ เพิ่มเติมสำหรับแผนคอนเทนต์นี้"
                            className="w-full bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-xs font-semibold outline-none"
                        />
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-neutral-100 dark:border-neutral-800">
                        <button
                            type="button"
                            onClick={() => setIsRoadmapModalOpen(false)}
                            className="px-4 py-2 border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-850 rounded-xl text-xs font-bold transition-all active:scale-95"
                        >
                            ยกเลิก
                        </button>
                        <button
                            type="button"
                            onClick={handleSaveRoadmap}
                            className="px-4 py-2 bg-black text-white dark:bg-white dark:text-black rounded-xl text-xs font-black transition-all active:scale-95 shadow-sm"
                        >
                            บันทึกแผนงาน (Save Roadmap)
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Arbor Roadmap Assistant Modal */}
            <Modal
                isOpen={isArborRoadmapOpen}
                onClose={() => setIsArborRoadmapOpen(false)}
                title="✨ Arbor Content Roadmap Assistant"
                maxWidth={showArborRoadmapPreview ? "max-w-[min(1200px,95vw)]" : "max-w-2xl"}
            >
                <div className="space-y-4 text-left max-h-[85vh] overflow-y-auto pr-1">
                    {!showArborRoadmapPreview ? (
                        <>
                            <div className="p-3.5 bg-purple-50/50 dark:bg-purple-950/10 border border-purple-100 dark:border-purple-900/20 rounded-2xl space-y-1">
                                <span className="text-[10px] font-black uppercase text-purple-600 tracking-wider flex items-center gap-1">
                                    <Info className="w-3.5 h-3.5" />
                                    Arbor Roadmap Auto-Parser
                                </span>
                                <p className="text-xs text-neutral-500 leading-normal font-medium dark:text-neutral-400">
                                    วางข้อความดิบของคุณ เช่น รายละเอียดแผนงานคัดลอกจาก Google Sheets, บรรทัดสรุปแผนจากห้องแชท หรือ Markdown Roadmap เพื่อให้ผู้ช่วยดึงรายแถวและวิเคราะห์ประเภท ตอนเป้าหมาย และข้อมูลเบื้องต้น
                                </p>
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-bold text-neutral-500 uppercase tracking-wider">วางแถวข้อมูล (Source Rows - แยกตามบรรทัด)</label>
                                <textarea
                                    value={arborRoadmapText}
                                    onChange={e => setArborRoadmapText(e.target.value)}
                                    rows={14}
                                    placeholder="EP.10.3-S1   ตาข้างพืชและออกซิน   group_post   drafting&#10;EP.10.4-S1   เคล็ดลับการแตกยอด   infographic   planned"
                                    className="w-full bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-xs font-semibold outline-none focus:border-neutral-400 font-mono"
                                />
                            </div>

                            <div className="flex justify-end gap-3 pt-2 border-t border-neutral-100 dark:border-neutral-800">
                                <button
                                    type="button"
                                    onClick={() => setIsArborRoadmapOpen(false)}
                                    className="px-4 py-2 border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-850 rounded-xl text-xs font-bold transition-all active:scale-95"
                                >
                                    ยกเลิก
                                </button>
                                <button
                                    type="button"
                                    onClick={handleGenerateArborRoadmap}
                                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-black transition-all active:scale-95 shadow-md"
                                >
                                    วิเคราะห์แผนงาน (Generate Roadmap Draft)
                                </button>
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="p-3.5 bg-emerald-50/50 dark:bg-emerald-950/10 border border-emerald-100 dark:border-emerald-900/20 rounded-2xl space-y-0.5">
                                <span className="text-[10px] font-black uppercase text-emerald-600 tracking-wider flex items-center gap-1">
                                    <Check className="w-3.5 h-3.5" />
                                    Arbor Parse Roadmap Results ({arborRoadmapDrafts.length} แถว)
                                </span>
                                <p className="text-xs text-neutral-500 font-medium dark:text-neutral-400">
                                    ตรวจสอบผลการวิเคราะห์ข้อมูลและแก้ไขช่องต่าง ๆ ในตารางได้โดยตรงก่อนกดยืนยัน (Apply Roadmap)
                                </p>
                            </div>

                            <div className="grid grid-cols-2 lg:grid-cols-6 gap-2">
                                <div className="rounded-xl border border-neutral-200 bg-white px-3 py-2 dark:border-neutral-800 dark:bg-neutral-900">
                                    <div className="text-[9px] font-black uppercase tracking-wider text-neutral-400">Rows</div>
                                    <div className="text-sm font-black text-neutral-900 dark:text-white">{arborRoadmapPreviewSummary.totalRows}</div>
                                </div>
                                <div className="rounded-xl border border-neutral-200 bg-white px-3 py-2 dark:border-neutral-800 dark:bg-neutral-900">
                                    <div className="text-[9px] font-black uppercase tracking-wider text-neutral-400">Missing EP</div>
                                    <div className="text-sm font-black text-neutral-900 dark:text-white">{arborRoadmapPreviewSummary.missingEpisodeCode}</div>
                                </div>
                                <div className="rounded-xl border border-neutral-200 bg-white px-3 py-2 dark:border-neutral-800 dark:bg-neutral-900">
                                    <div className="text-[9px] font-black uppercase tracking-wider text-neutral-400">Missing Title</div>
                                    <div className="text-sm font-black text-neutral-900 dark:text-white">{arborRoadmapPreviewSummary.missingTitle}</div>
                                </div>
                                <div className="rounded-xl border border-neutral-200 bg-white px-3 py-2 dark:border-neutral-800 dark:bg-neutral-900">
                                    <div className="text-[9px] font-black uppercase tracking-wider text-neutral-400">Missing Parent</div>
                                    <div className="text-sm font-black text-neutral-900 dark:text-white">{arborRoadmapPreviewSummary.missingParentEp}</div>
                                </div>
                                <div className="rounded-xl border border-neutral-200 bg-white px-3 py-2 dark:border-neutral-800 dark:bg-neutral-900 lg:col-span-1">
                                    <div className="text-[9px] font-black uppercase tracking-wider text-neutral-400">Status</div>
                                    <div className="text-xs font-bold text-neutral-700 dark:text-neutral-300">{arborRoadmapPreviewSummary.statusDistribution}</div>
                                </div>
                                <div className="rounded-xl border border-neutral-200 bg-white px-3 py-2 dark:border-neutral-800 dark:bg-neutral-900 lg:col-span-1">
                                    <div className="text-[9px] font-black uppercase tracking-wider text-neutral-400">Priority</div>
                                    <div className="text-xs font-bold text-neutral-700 dark:text-neutral-300">{arborRoadmapPreviewSummary.priorityDistribution}</div>
                                </div>
                            </div>

                            <div className="border border-neutral-200 rounded-2xl overflow-hidden dark:border-neutral-800">
                                <div className="overflow-auto max-h-[520px]">
                                    <table className="min-w-[1680px] w-full text-left border-collapse text-[10px]">
                                        <thead className="sticky top-0 z-10">
                                            <tr className="bg-neutral-50 dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 text-neutral-400 font-bold uppercase tracking-wider">
                                                <th className="px-3 py-2 min-w-[110px]">รหัส EP</th>
                                                <th className="px-3 py-2 min-w-[360px]">หัวข้อ</th>
                                                <th className="px-3 py-2 min-w-[160px]">ประเภท</th>
                                                <th className="px-3 py-2 min-w-[160px]">ระดับชั้น</th>
                                                <th className="px-3 py-2 min-w-[180px]">Theme</th>
                                                <th className="px-3 py-2 min-w-[110px]">Priority</th>
                                                <th className="px-3 py-2 min-w-[130px]">สถานะ</th>
                                                <th className="px-3 py-2 min-w-[220px]">Channel</th>
                                                <th className="px-3 py-2 min-w-[110px]">Parent EP</th>
                                                <th className="px-3 py-2 min-w-[260px]">Next Action</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-neutral-200/60 dark:divide-neutral-800/60 text-neutral-700 dark:text-neutral-300">
                                            {arborRoadmapDrafts.map((draft, idx) => (
                                                <tr key={idx} className="hover:bg-neutral-50/30">
                                                    <td className="px-2 py-1.5">
                                                        <input
                                                            type="text"
                                                            value={draft.episodeCode}
                                                            onChange={e => handleUpdateDraftCell(idx, "episodeCode", e.target.value)}
                                                            className="w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded px-2 py-1.5 text-[10px] font-mono font-bold"
                                                        />
                                                    </td>
                                                    <td className="px-2 py-1.5">
                                                        <input
                                                            type="text"
                                                            value={draft.title}
                                                            onChange={e => handleUpdateDraftCell(idx, "title", e.target.value)}
                                                            className="w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded px-2 py-1.5 text-[10px]"
                                                        />
                                                    </td>
                                                    <td className="px-2 py-1.5">
                                                        <select
                                                            value={draft.contentType}
                                                            onChange={e => handleUpdateDraftCell(idx, "contentType", e.target.value)}
                                                            className="w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded px-2 py-1.5 text-[10px]"
                                                        >
                                                            {Object.entries(CONTENT_TYPE_LABELS).map(([k, label]) => (
                                                                <option key={k} value={k}>{label}</option>
                                                            ))}
                                                        </select>
                                                    </td>
                                                    <td className="px-2 py-1.5">
                                                        <select
                                                            value={draft.contentLayer}
                                                            onChange={e => handleUpdateDraftCell(idx, "contentLayer", e.target.value)}
                                                            className="w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded px-2 py-1.5 text-[10px]"
                                                        >
                                                            {Object.entries(CONTENT_LAYER_LABELS).map(([k, label]) => (
                                                                <option key={k} value={k}>{label}</option>
                                                            ))}
                                                        </select>
                                                    </td>
                                                    <td className="px-2 py-1.5">
                                                        <input
                                                            type="text"
                                                            value={draft.seriesOrTheme || ""}
                                                            onChange={e => handleUpdateDraftCell(idx, "seriesOrTheme", e.target.value)}
                                                            className="w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded px-2 py-1.5 text-[10px]"
                                                        />
                                                    </td>
                                                    <td className="px-2 py-1.5">
                                                        <select
                                                            value={draft.priority}
                                                            onChange={e => handleUpdateDraftCell(idx, "priority", e.target.value)}
                                                            className="w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded px-2 py-1.5 text-[10px]"
                                                        >
                                                            <option value="high">High</option>
                                                            <option value="medium">Medium</option>
                                                            <option value="low">Low</option>
                                                            <option value="none">None</option>
                                                        </select>
                                                    </td>
                                                    <td className="px-2 py-1.5">
                                                        <select
                                                            value={draft.status}
                                                            onChange={e => handleUpdateDraftCell(idx, "status", e.target.value)}
                                                            className="w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded px-2 py-1.5 text-[10px]"
                                                        >
                                                            {Object.entries(ROADMAP_STATUS_LABELS).map(([k, label]) => (
                                                                <option key={k} value={k}>{label}</option>
                                                            ))}
                                                        </select>
                                                    </td>
                                                    <td className="px-2 py-1.5">
                                                        <input
                                                            type="text"
                                                            value={draft.targetChannel || ""}
                                                            onChange={e => handleUpdateDraftCell(idx, "targetChannel", e.target.value)}
                                                            className="w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded px-2 py-1.5 text-[10px]"
                                                        />
                                                    </td>
                                                    <td className="px-2 py-1.5">
                                                        <input
                                                            type="text"
                                                            value={draft.relatedMainEpisode || ""}
                                                            onChange={e => handleUpdateDraftCell(idx, "relatedMainEpisode", e.target.value)}
                                                            className="w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded px-2 py-1.5 text-[10px] font-mono"
                                                            placeholder="EP.10.3"
                                                        />
                                                    </td>
                                                    <td className="px-2 py-1.5">
                                                        <input
                                                            type="text"
                                                            value={draft.nextAction || ""}
                                                            onChange={e => handleUpdateDraftCell(idx, "nextAction", e.target.value)}
                                                            className="w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded px-2 py-1.5 text-[10px]"
                                                        />
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 pt-4 border-t border-neutral-100 dark:border-neutral-800">
                                <button
                                    type="button"
                                    onClick={() => setShowArborRoadmapPreview(false)}
                                    className="px-4 py-2 border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-850 rounded-xl text-xs font-bold transition-all active:scale-95 flex items-center justify-center gap-1.5"
                                >
                                    <RefreshCw className="w-3.5 h-3.5" />
                                    ย้อนกลับไปแก้ไข Source Text
                                </button>
                                <div className="flex gap-2 justify-end">
                                    <button
                                        type="button"
                                        onClick={() => setIsArborRoadmapOpen(false)}
                                        className="px-4 py-2 border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-850 rounded-xl text-xs font-bold transition-all active:scale-95"
                                    >
                                        ยกเลิก
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleApplyArborRoadmap}
                                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black transition-all active:scale-95 shadow-md flex items-center justify-center gap-1.5"
                                    >
                                        <Check className="w-4 h-4" />
                                        ยืนยันบันทึก (Apply Roadmap)
                                    </button>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </Modal>

            {/* Confirm Delete Roadmap Dialog */}
            <ConfirmDialog
                isOpen={isDeleteRoadmapOpen}
                title="ลบรายการแผนคอนเทนต์ (Delete Roadmap Item)"
                message="คุณแน่ใจหรือไม่ว่าต้องการลบรายการแผนคอนเทนต์นี้? ข้อมูลจะไม่สามารถกู้คืนกลับมาได้"
                confirmText="ยืนยันการลบ"
                onConfirm={handleConfirmDeleteRoadmap}
                onCancel={() => {
                    setIsDeleteRoadmapOpen(false);
                    setRoadmapToDelete(null);
                }}
            />

            {/* Deliverable / Backlog Edit Modal */}
            <Modal 
                isOpen={isDelModalOpen} 
                onClose={() => setIsDelModalOpen(false)}
                title="แก้ไข Deliverable / Backlog Item"
            >
                <div className="p-6 space-y-6">
                    <div className="space-y-4">
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest block">หัวข้อภารกิจ (Title) *</label>
                            <input
                                type="text"
                                value={delTitle}
                                onChange={(e) => setDelTitle(e.target.value)}
                                className="w-full px-4 py-2.5 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/50 text-sm font-semibold outline-none focus:border-neutral-400 dark:focus:border-neutral-700 transition-all"
                                placeholder="เช่น พัฒนาหน้าลงทะเบียน..."
                                required
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest block">สถานะ (Status)</label>
                                <select
                                    value={delStatus}
                                    onChange={(e) => setDelStatus(e.target.value as any)}
                                    className="w-full px-4 py-2.5 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/50 text-sm font-semibold outline-none focus:border-neutral-400 dark:focus:border-neutral-700 transition-all"
                                >
                                    <option value="inbox">Inbox</option>
                                    <option value="planned">Planned</option>
                                    <option value="done">Completed</option>
                                </select>
                            </div>

                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest block">หมวดงาน (Workstream)</label>
                                <input
                                    type="text"
                                    value={delWorkstream}
                                    onChange={(e) => setDelWorkstream(e.target.value)}
                                    className="w-full px-4 py-2.5 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/50 text-sm font-semibold outline-none focus:border-neutral-400 dark:focus:border-neutral-700 transition-all"
                                    placeholder="เช่น UI/UX, Dev, Docs"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest block">ช่วงเวลาประจำวัน (Schedule Bucket)</label>
                                <select
                                    value={delScheduleBucket}
                                    onChange={(e) => setDelScheduleBucket(e.target.value as any)}
                                    className="w-full px-4 py-2.5 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/50 text-sm font-semibold outline-none focus:border-neutral-400 dark:focus:border-neutral-700 transition-all"
                                >
                                    <option value="none">None / ไม่ระบุ</option>
                                    <option value="morning">Morning (เช้า)</option>
                                    <option value="afternoon">Afternoon (บ่าย)</option>
                                    <option value="evening">Evening (เย็น)</option>
                                </select>
                            </div>

                            <div className="flex items-center pt-5">
                                <label className="flex items-center gap-2 cursor-pointer select-none">
                                    <input
                                        type="checkbox"
                                        checked={delIsMilestone}
                                        onChange={(e) => setDelIsMilestone(e.target.checked)}
                                        className="w-4 h-4 rounded border-neutral-300 text-neutral-900 focus:ring-neutral-900"
                                    />
                                    <span className="text-xs font-black uppercase text-neutral-500 tracking-wider">เป็น Milestone สำคัญ</span>
                                </label>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest block">วันที่เริ่มงาน (Start Date)</label>
                                <input
                                    type="date"
                                    value={delStartDate}
                                    onChange={(e) => setDelStartDate(e.target.value)}
                                    className="w-full px-4 py-2.5 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/50 text-sm font-semibold outline-none focus:border-neutral-400 dark:focus:border-neutral-700 transition-all"
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest block">วันที่สิ้นสุด (End Date)</label>
                                <input
                                    type="date"
                                    value={delEndDate}
                                    onChange={(e) => setDelEndDate(e.target.value)}
                                    className="w-full px-4 py-2.5 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/50 text-sm font-semibold outline-none focus:border-neutral-400 dark:focus:border-neutral-700 transition-all"
                                />
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest block">บันทึก / รายละเอียดเพิ่มเติม (Notes)</label>
                            <textarea
                                value={delNotes}
                                onChange={(e) => setDelNotes(e.target.value)}
                                rows={3}
                                className="w-full px-4 py-2.5 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/50 text-sm font-semibold outline-none focus:border-neutral-400 dark:focus:border-neutral-700 transition-all"
                                placeholder="รายละเอียด ขอบเขตงาน หรือลิงก์ที่เกี่ยวข้อง..."
                            />
                        </div>
                    </div>

                    <div className="flex justify-between items-center pt-4 border-t border-neutral-100 dark:border-neutral-800">
                        <div>
                            {activeDelItem && (
                                <button
                                    type="button"
                                    onClick={() => handleTriggerDeleteDeliverable(activeDelItem.id)}
                                    className="px-4 py-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-xl transition-all font-bold text-xs flex items-center gap-1 hover:underline"
                                    title="ลบรายการนี้"
                                >
                                    <Trash2 className="w-4 h-4" />
                                    ลบรายการ
                                </button>
                            )}
                        </div>
                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={() => setIsDelModalOpen(false)}
                                className="px-5 py-2.5 border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-850 rounded-xl text-xs font-bold transition-all active:scale-95"
                            >
                                ยกเลิก
                            </button>
                            <button
                                type="button"
                                onClick={handleSaveDeliverable}
                                disabled={actionLoading}
                                className="px-5 py-2.5 bg-neutral-900 hover:bg-black dark:bg-neutral-100 dark:hover:bg-white text-white dark:text-black rounded-xl text-xs font-black transition-all active:scale-95 shadow-md flex items-center justify-center gap-1.5"
                            >
                                {actionLoading ? "กำลังบันทึก..." : "บันทึกการแก้ไข"}
                            </button>
                        </div>
                    </div>
                </div>
            </Modal>

            {/* Confirm Delete Deliverable Dialog */}
            <ConfirmDialog
                isOpen={isDeleteDelOpen}
                title="ลบรายการ Deliverable"
                message="คุณแน่ใจหรือไม่ว่าต้องการลบ Deliverable รายการนี้? ข้อมูลทั้งหมดจะถูกลบจากประวัติและไม่สามารถกู้คืนได้"
                confirmText="ยืนยันการลบ"
                onConfirm={handleConfirmDeleteDeliverable}
                onCancel={() => {
                    setIsDeleteDelOpen(false);
                    setDelToDelete(null);
                }}
            />

            {/* Project Context Summary Modal */}
            <Modal
                isOpen={isContextSummaryOpen}
                onClose={() => setIsContextSummaryOpen(false)}
                title="✨ Project Context Summary"
            >
                <div className="space-y-4 text-left max-h-[80vh] overflow-y-auto pr-1">
                    <div className="p-3.5 bg-purple-50/50 dark:bg-purple-950/10 border border-purple-100 dark:border-purple-900/20 rounded-2xl space-y-1">
                        <span className="text-[10px] font-black uppercase text-purple-600 tracking-wider flex items-center gap-1">
                            <Sparkles className="w-3.5 h-3.5 animate-pulse" />
                            Arbor Project Context Reader
                        </span>
                        <p className="text-xs text-neutral-500 leading-normal font-medium dark:text-neutral-400">
                            นี่คือข้อมูลสรุปของโปรเจกต์ปัจจุบันสำหรับส่งต่อให้ Arbor นำไปใช้ทำงานต่อ (คัดลอกโดยปุ่มด้านล่าง)
                        </p>
                    </div>

                    <div className="relative">
                        <button
                            onClick={() => {
                                navigator.clipboard.writeText(generateArborContextMarkdown());
                                setToastMessage("คัดลอก Arbor Project Context สำเร็จแล้ว!");
                                setShowToast(true);
                            }}
                            className="absolute top-2 right-2 flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-[10px] font-black transition-all active:scale-95 shadow-sm"
                        >
                            <Copy className="w-3 h-3" />
                            Copy Context
                        </button>
                        <div className="bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-4 max-h-[50vh] overflow-y-auto font-mono text-[11px] leading-relaxed text-neutral-800 dark:text-neutral-300 whitespace-pre-wrap select-all">
                            {generateArborContextMarkdown()}
                        </div>
                    </div>

                    <div className="flex justify-end pt-2 border-t border-neutral-100 dark:border-neutral-800">
                        <button
                            type="button"
                            onClick={() => setIsContextSummaryOpen(false)}
                            className="px-4 py-2 border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-850 rounded-xl text-xs font-bold transition-all active:scale-95"
                        >
                            ปิดหน้าต่าง
                        </button>
                    </div>
                </div>
            </Modal>

            <Toast 
                isVisible={showToast} 
                message={toastMessage} 
                onClose={() => setShowToast(false)} 
            />
        </PageShell>
    );
}

function DocBlockCard({ 
    block, 
    onEdit, 
    onDelete 
}: { 
    block: ProjectDocumentationBlock; 
    onEdit: (b: ProjectDocumentationBlock) => void;
    onDelete: (id: string) => void;
}) {
    const [isExpanded, setIsExpanded] = useState(false);

    return (
        <div className="bg-theme-card border border-neutral-200 rounded-3xl p-5 hover:shadow-md transition-all dark:border-neutral-800 text-left">
            <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                        <span className={`px-2.5 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider ${BLOCK_TYPE_COLORS[block.type]}`}>
                            {BLOCK_TYPE_LABELS[block.type]}
                        </span>
                        <span className="text-[10px] font-bold text-neutral-400">{block.date}</span>
                        {block.generatedBy === "arbor" && (
                            <span className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-purple-50 dark:bg-purple-950/20 text-purple-600 dark:text-purple-300 text-[9px] font-black uppercase tracking-widest border border-purple-100/50 dark:border-purple-900/30">
                                <Sparkles className="w-2.5 h-2.5" />
                                Arbor Draft
                            </span>
                        )}
                        {block.status && (
                            <span className={`px-2 py-0.5 rounded-lg text-[9px] font-bold uppercase ${block.status === 'active' ? 'bg-neutral-50 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400' : 'bg-green-50 text-green-600'}`}>
                                {block.status}
                            </span>
                        )}
                    </div>
                    <h3 className="font-black text-base text-neutral-900 dark:text-neutral-100 tracking-tight pt-1">
                        <button 
                            type="button"
                            onClick={() => onEdit(block)} 
                            className="hover:underline hover:text-black dark:hover:text-white transition-colors text-left outline-none cursor-pointer focus:underline"
                            title={`ดู/แก้ไขเอกสาร ${block.title}`}
                        >
                            {block.title}
                        </button>
                    </h3>
                </div>

                <div className="flex items-center gap-1.5">
                    <button 
                        onClick={() => onEdit(block)}
                        className="p-2 rounded-xl text-neutral-400 hover:text-black hover:bg-neutral-50 dark:hover:bg-neutral-850 transition-all active:scale-95"
                        title="Edit Documentation Block"
                    >
                        <Edit2 className="w-4 h-4" />
                    </button>
                    <button 
                        onClick={() => onDelete(block.id)}
                        className="p-2 rounded-xl text-neutral-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 transition-all active:scale-95"
                        title="Delete Documentation Block"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
            </div>

            <p className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 mt-2 line-clamp-2 leading-relaxed">
                {block.summary}
            </p>

            {/* Expandable Details */}
            {isExpanded ? (
                <div className="mt-4 pt-4 border-t border-neutral-100 dark:border-neutral-800 space-y-4">
                    <div className="text-xs text-neutral-700 dark:text-neutral-300 leading-relaxed font-medium whitespace-pre-wrap font-mono bg-neutral-50/50 dark:bg-neutral-900/20 p-4 rounded-2xl border border-neutral-200/50 dark:border-neutral-800/50 max-h-[400px] overflow-y-auto">
                        {block.details}
                    </div>

                    {block.nextAction && (
                        <div className="p-3.5 bg-orange-50/30 dark:bg-orange-950/10 border border-orange-100 dark:border-orange-900/20 rounded-2xl">
                            <span className="text-[9px] font-black uppercase tracking-wider text-orange-600 dark:text-orange-400 block mb-0.5">Next Action</span>
                            <span className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">{block.nextAction}</span>
                        </div>
                    )}

                    {/* Metadata Lists */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-medium pt-2">
                        {block.evidenceLinks && block.evidenceLinks.length > 0 && (
                            <div className="space-y-1">
                                <span className="text-[10px] font-black uppercase text-neutral-400 tracking-wider flex items-center gap-1">
                                    <ExternalLink className="w-3 h-3" />
                                    Evidence Links / Commits
                                </span>
                                <div className="flex flex-wrap gap-1.5">
                                    {block.evidenceLinks.map((link, idx) => (
                                        <a 
                                            key={idx} 
                                            href={link.startsWith("http") ? link : undefined} 
                                            target={link.startsWith("http") ? "_blank" : undefined}
                                            rel="noopener noreferrer"
                                            className={`px-2 py-0.5 rounded-lg text-[10px] font-bold truncate max-w-[200px] ${link.startsWith("http") ? "bg-blue-50 text-blue-600 dark:bg-blue-950/20 dark:text-blue-400 hover:underline" : "bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400"}`}
                                            title={link}
                                        >
                                            {link.startsWith("http") ? (link.replace(/^https?:\/\/(www\.)?/, "").substring(0, 20) + "...") : link}
                                        </a>
                                    ))}
                                </div>
                            </div>
                        )}

                        {block.relatedFiles && block.relatedFiles.length > 0 && (
                            <div className="space-y-1">
                                <span className="text-[10px] font-black uppercase text-neutral-400 tracking-wider flex items-center gap-1">
                                    <FileCode className="w-3 h-3" />
                                    Related Files
                                </span>
                                <div className="flex flex-wrap gap-1.5">
                                    {block.relatedFiles.map((file, idx) => (
                                        <span 
                                            key={idx} 
                                            className="px-2 py-0.5 rounded-lg bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-[10px] text-neutral-600 dark:text-neutral-400 font-bold"
                                        >
                                            {file}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                    
                    {/* Source tracking details */}
                    {block.sourceType && (
                        <div className="text-[9px] font-semibold text-neutral-400 dark:text-neutral-500 pt-2 flex items-center gap-1 border-t border-neutral-100 dark:border-neutral-800/60 w-fit">
                            <span>Source: {block.sourceType}</span>
                            <span>•</span>
                            <span>Generated: {block.appliedAt ? new Date(block.appliedAt).toLocaleString() : block.updatedAt}</span>
                        </div>
                    )}
                </div>
            ) : null}

            <div className="mt-3 flex justify-end">
                <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="text-[10px] font-black uppercase tracking-widest text-neutral-400 hover:text-black dark:hover:text-white transition-all flex items-center gap-1"
                >
                    {isExpanded ? "Collapse Details" : "Expand Details"}
                </button>
            </div>
        </div>
    );
}

function ItemCard({ item, onEdit }: { item: ProjectItem; onEdit: (item: ProjectItem) => void }) {
    return (
        <div className="bg-theme-card border border-neutral-200 rounded-3xl p-5 flex justify-between items-center hover:shadow-xl hover:border-neutral-300 transition-all group active:scale-[0.99] cursor-default">
            <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-colors shadow-sm ${
                    item.status === 'done' ? 'bg-green-100 text-green-600' : 'bg-neutral-50 text-neutral-400 group-hover:bg-neutral-900 group-hover:text-white dark:bg-neutral-800 dark:text-neutral-500'
                }`}>
                    {item.status === 'done' ? <CheckCircle2 className="w-6 h-6" /> : <Layout className="w-5 h-5" />}
                </div>
                <div>
                    <div className={`font-black tracking-tight ${item.status === 'done' ? 'line-through text-neutral-400' : 'text-neutral-900 dark:text-neutral-100 text-lg'}`}>
                        <button
                            type="button"
                            onClick={() => onEdit(item)}
                            className="hover:underline hover:text-black dark:hover:text-white transition-colors text-left outline-none cursor-pointer focus:underline font-black"
                            title={`ดู/แก้ไข ${item.title}`}
                        >
                            {item.title}
                        </button>
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                        {item.workstream && (
                            <span className="text-[10px] font-black uppercase tracking-widest text-orange-600 bg-orange-50 dark:bg-orange-950/20 dark:text-orange-400 px-2 py-0.5 rounded-lg border border-orange-100 dark:border-orange-900/30">
                                {item.workstream}
                            </span>
                        )}
                        {item.schedule_bucket && item.schedule_bucket !== 'none' && (
                            <div className="flex items-center gap-1 text-[10px] font-bold text-neutral-400 uppercase tracking-widest">
                                <Calendar className="w-3 h-3" />
                                {item.schedule_bucket}
                            </div>
                        )}
                    </div>
                </div>
            </div>
            <div className="flex items-center gap-6">
                <div className="flex flex-col items-end">
                    <span className={`px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-widest ${
                        item.status === 'inbox' ? 'bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400' : 
                        item.status === 'planned' ? 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300' : 
                        'bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-300'
                    }`}>
                        {item.status}
                    </span>
                    {item.start_date && (
                        <span className="text-[10px] font-bold text-neutral-400 mt-1.5 uppercase tracking-tighter">
                             Starts {item.start_date}
                        </span>
                    )}
                </div>
                <button 
                    onClick={() => onEdit(item)}
                    className="p-2 rounded-xl text-neutral-400 hover:text-black hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-all opacity-0 group-hover:opacity-100 outline-none"
                    title="แก้ไข"
                >
                    <Edit2 className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
}

function RelatedNotesSection({ projectId }: { projectId: string }) {
    const router = useRouter();
    const [notes, setNotes] = useState<Note[]>([]);
    const [loading, setLoading] = useState(true);

    const loadNotes = useCallback(async () => {
        try {
            const res = await fetch(`/api/docs?project_id=${projectId}`);
            if (res.ok) {
                const data = await res.json();
                setNotes(data.docs || []);
            }
        } finally {
            setLoading(false);
        }
    }, [projectId]);

    useEffect(() => {
        loadNotes();
    }, [loadNotes]);

    async function handleCreateNote() {
        try {
            const res = await fetch("/api/docs", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ project_id: projectId, title: "New Project Note" })
            });
            if (res.ok) {
                const data = await res.json();
                router.push(`/docs/${data.doc.id}`);
            }
        } catch {
            alert("Failed to create note");
        }
    }

    return (
        <section>
            <div className="flex items-center justify-between mb-4 px-2">
                <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-neutral-400" />
                    <h2 className="text-xs font-black uppercase tracking-widest text-neutral-500">Related Notes & Knowledge</h2>
                </div>
                <button 
                    onClick={handleCreateNote}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-neutral-200 text-[10px] font-black uppercase tracking-widest hover:border-neutral-900 transition-all shadow-sm active:scale-95 dark:bg-neutral-900 dark:border-neutral-800 dark:hover:border-neutral-700"
                >
                    <Plus className="w-3 h-3" />
                    Create Note
                </button>
            </div>

            {loading ? (
                <div className="text-center py-10 text-neutral-400 italic text-xs font-medium">Loading related bytes...</div>
            ) : notes.length === 0 ? (
                <div className="text-center py-10 bg-neutral-50/50 dark:bg-neutral-900/10 rounded-3xl border border-dashed border-neutral-200">
                    <p className="text-neutral-400 font-medium italic text-xs">No linked notes. Document your process.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {notes.map(note => (
                        <div 
                            key={note.id} 
                            onClick={() => router.push(`/docs/${note.id}`)}
                            className="bg-theme-card border border-neutral-200 rounded-2xl p-4 hover:border-neutral-900 transition-all group cursor-pointer shadow-sm hover:shadow-md active:scale-[0.98] dark:border-neutral-800 dark:hover:border-neutral-700"
                        >
                            <div className="font-bold text-neutral-900 dark:text-neutral-100 line-clamp-1 group-hover:text-black dark:group-hover:text-white">{note.title || "Untitled"}</div>
                            <div className="text-[10px] font-bold text-neutral-300 uppercase tracking-widest mt-1">
                                Modified {new Date(note.updated_at).toLocaleDateString()}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </section>
    );
}
