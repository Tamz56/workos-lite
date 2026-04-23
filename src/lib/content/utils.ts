import { STAGE_TAGS, ContentStage } from "./templates";

type SimpleDoc = {
    id: string;
    title: string;
    [key: string]: unknown;
};

/**
 * Filter docs linked to a specific task ID based on prefix convention
 * Convention: [task:<id>]
 * Regex: /^\[task:<exact_id>\]/
 */
export function listDocsByTaskId<T extends SimpleDoc>(docs: T[], taskId: string): T[] {
    if (!taskId) return [];

    // Escape taskId for regex safety just in case, though nanoid is usually safe
    const escapedId = taskId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`^\\[task:${escapedId}\\]`);

    return docs.filter(doc => regex.test(doc.title));
}

/**
 * Extract the first valid stage tag from a list of tags.
 * Defaults to "stage:idea" if none found (or whatever logic requires).
 * Note: Our plan says default create is stage:script, but this reader logic
 * determines what to show in UI. If "stage:script" is in tags, it returns that.
 */
export function getPipelineStage(tags: string[] = []): ContentStage | null {
    if (!tags || tags.length === 0) return null;

    for (const tag of tags) {
        if (STAGE_TAGS.includes(tag as ContentStage)) {
            return tag as ContentStage;
        }
    }

    return null;
}

// --- Presentation Helpers (RC52) ---

export const KNOWN_PLATFORMS = ["fb", "ig", "yt", "tk"];

/**
 * Clean title for display by removing metadata tags.
 * Preserves the raw string in database but makes UI readable.
 */
export function cleanTaskTitle(title: string): string {
    if (!title) return "";
    let t = title
        .replace(/\bproject:[^\s]+/g, "")
        .replace(/#stage:[^\s]+/g, "")
        .replace(/#priority:[^\s]+/g, "");

    KNOWN_PLATFORMS.forEach(p => {
        t = t.replace(new RegExp(`#${p}\\b`, "g"), "");
    });
    return t.trim().replace(/\s+/g, " ");
}

/**
 * Parse project slug from raw title
 */
export function parseProjectFromTitle(title: string): string {
    const match = (title || "").match(/project:([^\s]+)/);
    return match ? match[1] : "";
}

/**
 * Parse stage from raw title
 */
export function parseStageFromTitle(title: string): string {
    const match = (title || "").match(/#stage:([^\s]+)/);
    return match ? match[1] : "";
}

/**
 * Parse platforms from raw title
 */
export function parsePlatformsFromTitle(title: string): string[] {
    const regex = /#(fb|ig|yt|tk)\b/g;
    const matches = (title || "").match(regex);
    return matches ? matches.map(m => m.replace("#", "")) : [];
}

/**
 * Construct raw title with tags preserved
 */
export function constructRawTitle(base: string, project: string, stage: string, platforms: string[]): string {
    let t = cleanTaskTitle(base);
    const parts = [];
    if (project) parts.push(`project:${project}`);
    parts.push(t);
    if (stage) parts.push(`#stage:${stage}`);
    platforms.forEach(p => parts.push(`#${p}`));
    return parts.join(" ");
}
