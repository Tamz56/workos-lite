// src/lib/arborInboxSchema.ts
import { nanoid } from "nanoid";

export const SUPPORTED_SCHEMA_VERSION = "workos-arbor-import-v0.1";
export const SUPPORTED_ITEM_TYPES = ["project", "note", "task", "article_note"] as const;

export type ItemType = (typeof SUPPORTED_ITEM_TYPES)[number];

export interface ImportProjectItem {
    type: "project";
    title: string;
    status: "inbox" | "planned" | "done";
}

export interface ImportNoteItem {
    type: "note";
    targetProject: string;
    title: string;
    content: string;
}

export interface ImportTaskItem {
    type: "task";
    targetProject: string;
    title: string;
    status: "inbox" | "planned" | "in_progress" | "review" | "done";
    workspace?: string;
}

export interface ImportArticleNoteItem {
    type: "article_note";
    targetProject: string;
    title: string;
    status: string;
    content: string;
    nextActions?: string[];
    metadata?: Record<string, any>;
}

export type ImportItem = ImportProjectItem | ImportNoteItem | ImportTaskItem | ImportArticleNoteItem;

export interface ImportPayload {
    schemaVersion: string;
    source: string;
    importBatchTitle: string;
    items: ImportItem[];
}

export interface ProjectLookup {
    name: string;
    slug: string;
}

export interface ValidationResult {
    valid: boolean;
    errors: string[];
    warnings: string[];
}

export interface TaskPreview {
    title: string;          // With project prefix
    originalTitle: string;  // Without prefix
    targetProject: string;
    status: string;
    workspace: string;
}

export interface PreviewData {
    projects: { title: string; status: string; slug: string; isDuplicate: boolean }[];
    notes: { title: string; targetProject: string }[];
    tasks: TaskPreview[];
    articleNotes: { title: string; targetProject: string; status: string }[];
}

/**
 * Normalizes title into a valid URL slug containing only lowercase a-z, 0-9, and hyphens.
 * If fallback is needed due to non-ASCII chars, generates project-xxxx.
 */
export function generateSlug(title: string): string {
    let s = title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");
    if (!s || !/^[a-z0-9-]+$/.test(s)) {
        s = `project-${nanoid(6).toLowerCase()}`;
    }
    return s;
}

/**
 * Validates the raw JSON payload against top-level and item-level rules.
 */
export function validatePayload(payload: any, existingProjects: ProjectLookup[]): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // 1. Top-Level Validation
    if (!payload || typeof payload !== "object") {
        errors.push("Top-level: Payload must be a JSON object");
        return { valid: false, errors, warnings };
    }

    if (payload.schemaVersion !== SUPPORTED_SCHEMA_VERSION) {
        errors.push(`Top-level: schemaVersion must be exactly "${SUPPORTED_SCHEMA_VERSION}"`);
    }

    if (typeof payload.source !== "string" || !payload.source.trim()) {
        errors.push('Top-level: Missing required field "source"');
    }

    if (typeof payload.importBatchTitle !== "string" || !payload.importBatchTitle.trim()) {
        errors.push('Top-level: Missing required field "importBatchTitle"');
    }

    if (!Array.isArray(payload.items)) {
        errors.push('Top-level: "items" must be a non-empty array');
        return { valid: false, errors, warnings };
    }

    if (payload.items.length === 0) {
        errors.push('Top-level: "items" array must not be empty');
        return { valid: false, errors, warnings };
    }

    // Prepare lookups for project presence
    const batchProjects = new Set<string>();
    const existingProjectNames = new Set(existingProjects.map(p => p.name.trim().toLowerCase()));
    const existingProjectSlugs = new Set(existingProjects.map(p => p.slug.trim().toLowerCase()));

    // Collect projects being created in this batch
    payload.items.forEach((item: any) => {
        if (item && item.type === "project" && typeof item.title === "string" && item.title.trim()) {
            batchProjects.add(item.title.trim().toLowerCase());
        }
    });

    // 2. Item-Level Validation
    payload.items.forEach((item: any, idx: number) => {
        const itemNum = idx + 1;

        if (!item || typeof item !== "object") {
            errors.push(`Item ${itemNum}: Item must be an object`);
            return;
        }

        if (typeof item.type !== "string") {
            errors.push(`Item ${itemNum}: Missing required field "type"`);
            return;
        }

        if (!SUPPORTED_ITEM_TYPES.includes(item.type)) {
            errors.push(`Item ${itemNum}: Unsupported type "${item.type}"`);
            return;
        }

        // Validate type constraints
        if (item.type === "project") {
            if (typeof item.title !== "string" || !item.title.trim()) {
                errors.push(`Item ${itemNum} (project): Missing required field "title"`);
            } else {
                const titleLower = item.title.trim().toLowerCase();
                const slug = generateSlug(item.title.trim());
                if (existingProjectNames.has(titleLower) || existingProjectSlugs.has(slug)) {
                    warnings.push(`Project "${item.title}" already exists. Notes/Tasks targeting this project will be appended, and project creation will be skipped.`);
                }
            }

            if (typeof item.status !== "string" || !["inbox", "planned", "done"].includes(item.status)) {
                errors.push(`Item ${itemNum} (project): Invalid status "${item.status}" (allowed: inbox, planned, done)`);
            }
        } else {
            // note, task, article_note require targetProject
            if (typeof item.targetProject !== "string" || !item.targetProject.trim()) {
                errors.push(`Item ${itemNum} (${item.type}): Missing required field "targetProject"`);
            } else {
                const targetLower = item.targetProject.trim().toLowerCase();
                const targetSlug = generateSlug(item.targetProject.trim());
                const isFound = existingProjectNames.has(targetLower) || 
                                existingProjectSlugs.has(targetLower) ||
                                existingProjectSlugs.has(targetSlug) ||
                                batchProjects.has(targetLower);
                
                if (!isFound) {
                    errors.push(`Item ${itemNum} (${item.type}): Target project "${item.targetProject}" does not exist in the database and is not being created in this batch`);
                }
            }

            if (typeof item.title !== "string" || !item.title.trim()) {
                errors.push(`Item ${itemNum} (${item.type}): Missing required field "title"`);
            }

            if (item.type === "note") {
                if (typeof item.content !== "string") {
                    errors.push(`Item ${itemNum} (note): Missing required field "content"`);
                }
            } else if (item.type === "task") {
                if (typeof item.status !== "string" || !["inbox", "planned", "in_progress", "review", "done"].includes(item.status)) {
                    errors.push(`Item ${itemNum} (task): Invalid status "${item.status}" (allowed: inbox, planned, in_progress, review, done)`);
                }
            } else if (item.type === "article_note") {
                if (typeof item.status !== "string" || !item.status.trim()) {
                    errors.push(`Item ${itemNum} (article_note): Missing required field "status"`);
                }
                if (typeof item.content !== "string") {
                    errors.push(`Item ${itemNum} (article_note): Missing required field "content"`);
                }
            }
        }
    });

    return {
        valid: errors.length === 0,
        errors,
        warnings,
    };
}

/**
 * Builds the Preview Data to be displayed before user imports the payload.
 */
export function buildPreview(payload: ImportPayload, existingProjects: ProjectLookup[]): PreviewData {
    const projects: PreviewData["projects"] = [];
    const notes: PreviewData["notes"] = [];
    const tasks: PreviewData["tasks"] = [];
    const articleNotes: PreviewData["articleNotes"] = [];

    const existingProjectNames = new Set(existingProjects.map(p => p.name.trim().toLowerCase()));
    const existingProjectSlugs = new Set(existingProjects.map(p => p.slug.trim().toLowerCase()));

    // Find or generate project slugs
    const getProjectSlug = (targetProject: string): string => {
        const targetLower = targetProject.trim().toLowerCase();
        const found = existingProjects.find(p => p.name.toLowerCase() === targetLower || p.slug.toLowerCase() === targetLower);
        if (found) return found.slug;
        return generateSlug(targetProject);
    };

    payload.items.forEach((item) => {
        if (item.type === "project") {
            const titleLower = item.title.trim().toLowerCase();
            const slug = generateSlug(item.title);
            const isDuplicate = existingProjectNames.has(titleLower) || existingProjectSlugs.has(slug);
            projects.push({
                title: item.title,
                status: item.status,
                slug,
                isDuplicate,
            });
        } else if (item.type === "note") {
            notes.push({
                title: item.title,
                targetProject: item.targetProject,
            });
        } else if (item.type === "task") {
            const slug = getProjectSlug(item.targetProject);
            const titleWithPrefix = `project:${slug} ${item.title}`;
            tasks.push({
                title: titleWithPrefix,
                originalTitle: item.title,
                targetProject: item.targetProject,
                status: item.status,
                workspace: item.workspace || "personal",
            });
        } else if (item.type === "article_note") {
            articleNotes.push({
                title: item.title,
                targetProject: item.targetProject,
                status: item.status,
            });
        }
    });

    return { projects, notes, tasks, articleNotes };
}

/**
 * Escape HTML utilities for rendering note content safely
 */
function escapeHtml(text: string): string {
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

/**
 * Builds note HTML and Tiptap compatible JSON content from plain text.
 */
export function buildNoteContent(plainText: string): { content_html: string; content_json: string } {
    const paragraphs = plainText.split("\n");
    const contentHtml = paragraphs.map(p => `<p>${escapeHtml(p)}</p>`).join("");
    const contentJsonObj = {
        type: "doc",
        content: paragraphs.map(p => ({
            type: "paragraph",
            content: p ? [{ type: "text", text: p }] : []
        }))
    };
    return {
        content_html: contentHtml,
        content_json: JSON.stringify(contentJsonObj)
    };
}
