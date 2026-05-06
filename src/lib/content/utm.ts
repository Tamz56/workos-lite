/**
 * UTM Generator for Green Fineness articles.
 * Centralizes the logic for creating channel-specific links.
 */

/**
 * Extracts a Green Fineness topic_id (e.g. "GF-CONTENT-011") from any string.
 * Matches patterns like GF-CONTENT-001, GF-S01-E01, GF-SEASON-01, etc.
 * Returns null if no match found.
 */
export function extractGreenFinenessTopicId(text: string): string | null {
    if (!text) return null;
    // Match GF-CONTENT-### (primary content package IDs)
    const contentMatch = text.match(/GF-CONTENT-\d+/i);
    if (contentMatch) return contentMatch[0].toUpperCase();
    // Match GF-S##-E## (episode-scoped IDs)
    const episodeMatch = text.match(/GF-S\d+-E\d+/i);
    if (episodeMatch) return episodeMatch[0].toUpperCase();
    // Match GF-SEASON-## (season IDs)
    const seasonMatch = text.match(/GF-SEASON-\d+/i);
    if (seasonMatch) return seasonMatch[0].toUpperCase();
    return null;
}

const INVALID_WORKFLOW_ROLES = [
    "notebooklm",
    "research raw",
    "research direction",
    "arbor questions",
    "brief",
    "outline web article",
    "script & caption",
    "assets / canva",
    "seo & schema",
    "publish",
    "mini research brief"
];

/**
 * Extracts the clean article title by splitting on em/en dashes.
 * Usually the title is the last segment, but ignores workflow roles.
 */
export function extractGreenFinenessArticleTitle(text: string): string {
    if (!text) return "";
    const parts = text.split(/\s+[—–]\s+/);
    if (parts.length > 1) {
        for (let i = parts.length - 1; i >= 0; i--) {
            const part = parts[i].trim();
            if (INVALID_WORKFLOW_ROLES.some(role => role === part.toLowerCase())) continue;
            if (/^\[GF-[A-Z0-9-]+\]$/i.test(part) || /^GF-[A-Z0-9-]+$/i.test(part)) continue;
            return part;
        }
    }
    
    // Fallback if everything was filtered out or no dashes found
    const lastPart = parts[parts.length - 1].trim();
    if (INVALID_WORKFLOW_ROLES.some(role => role === lastPart.toLowerCase())) return "";
    
    return lastPart;
}

/**
 * Extracts the task role from the raw title by splitting on em/en dashes.
 * Usually the role is the first segment, excluding any [TOPIC_ID] prefix.
 */
export function extractGreenFinenessTaskRole(text: string): string | null {
    if (!text) return null;
    const parts = text.split(/\s+[—–]\s+/);
    if (parts.length > 1) {
        let role = parts[0].trim();
        // Remove optional [GF-CONTENT-###] or similar prefix from the role
        role = role.replace(/^\[GF-[A-Z0-9-]+\]\s*/i, '');
        return role.trim();
    }
    return null;
}

export function buildGreenFinenessUtmUrl(params: {
    finalUrl: string;
    channel: "group" | "page" | "personal";
    campaign?: string | null;
    slug?: string | null;
    topicId?: string | null;
}): string {
    const { finalUrl, channel, campaign, slug, topicId } = params;
    
    if (!finalUrl) return "";

    // Determine campaign name: topicId > campaign param > slug > default
    const campaignName = topicId || campaign || slug || "green-fineness";
    
    // Map channel to UTM medium and content
    const medium = channel; // group, page, personal
    const content = `${channel}_post`;

    try {
        const url = new URL(finalUrl);
        
        // Add UTM parameters
        url.searchParams.set("utm_source", "facebook");
        url.searchParams.set("utm_medium", medium);
        url.searchParams.set("utm_campaign", campaignName);
        url.searchParams.set("utm_content", content);
        
        return url.toString();
    } catch (_e) {
        // Fallback for invalid URLs or non-absolute URLs
        const separator = finalUrl.includes("?") ? "&" : "?";
        const utms = `utm_source=facebook&utm_medium=${medium}&utm_campaign=${encodeURIComponent(campaignName)}&utm_content=${content}`;
        return `${finalUrl}${separator}${utms}`;
    }
}
