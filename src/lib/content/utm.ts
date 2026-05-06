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

export function buildGreenFinenessUtmUrl(params: {
    finalUrl: string;
    channel: "group" | "page" | "personal";
    campaign?: string | null;
    slug?: string | null;
    topicId?: string | null;
}): string {
    const { finalUrl, channel, campaign, slug, topicId } = params;
    
    if (!finalUrl) return "";

    // Determine campaign name: campaign param > slug > topicId > default
    const campaignName = campaign || slug || topicId || "green-fineness";
    
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
