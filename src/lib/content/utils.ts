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
