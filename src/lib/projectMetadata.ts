export interface ProjectMetadata {
    episodeCode?: string;
    canonicalTitle: string;
    displayTitle: string;
    assetType: "episode" | "knowledge_article" | "narrative_article" | "group_post" | "page_post" | "personal_post" | "social_image" | "ga4_snapshot" | "facebook_snapshot" | "legacy_shell" | "unknown";
    contentFamily?: string;
    contentLayer?: string;
    legacyId?: string;
    sourceLocation?: string;
    migrationStatus?: string;
    originalTitle?: string;
}

export const ASSET_TYPE_LABELS: Record<string, string> = {
    episode: "Episode",
    knowledge_article: "Knowledge Article",
    narrative_article: "Narrative Article",
    group_post: "Group Post",
    page_post: "Page Post",
    personal_post: "Personal Post",
    social_image: "Social Image",
    ga4_snapshot: "GA4 Snapshot",
    facebook_snapshot: "Facebook Snapshot",
    legacy_shell: "Legacy Shell",
    unknown: "Unknown"
};

export const ASSET_TYPE_COLORS: Record<string, string> = {
    episode: "bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20",
    knowledge_article: "bg-blue-50 text-blue-600 border-blue-100 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20",
    narrative_article: "bg-purple-50 text-purple-600 border-purple-100 dark:bg-purple-500/10 dark:text-purple-400 dark:border-purple-500/20",
    group_post: "bg-indigo-50 text-indigo-600 border-indigo-100 dark:bg-indigo-500/10 dark:text-indigo-400 dark:border-indigo-500/20",
    page_post: "bg-amber-50 text-amber-600 border-amber-100 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20",
    personal_post: "bg-rose-50 text-rose-600 border-rose-100 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20",
    social_image: "bg-teal-50 text-teal-600 border-teal-100 dark:bg-teal-500/10 dark:text-teal-400 dark:border-teal-500/20",
    ga4_snapshot: "bg-orange-50 text-orange-600 border-orange-100 dark:bg-orange-500/10 dark:text-orange-400 dark:border-orange-500/20",
    facebook_snapshot: "bg-sky-50 text-sky-600 border-sky-100 dark:bg-sky-500/10 dark:text-sky-400 dark:border-sky-500/20",
    legacy_shell: "bg-neutral-50 text-neutral-600 border-neutral-100 dark:bg-neutral-500/10 dark:text-neutral-400 dark:border-neutral-500/20",
    unknown: "bg-neutral-50 text-neutral-500 border-neutral-150 dark:bg-neutral-500/10 dark:text-neutral-400 dark:border-neutral-500/25"
};

export function getEpisodeCode(project: any): string | undefined {
    if (!project) return undefined;
    let notesData: any = {};
    if (project.notes) {
        try {
            notesData = JSON.parse(project.notes);
        } catch (e) {}
    }
    if (notesData.episodeCode) return notesData.episodeCode;

    const epId = project.episode_id || project.id;
    if (epId) {
        // Match short digits at the end (1 or 2 digits)
        const match = epId.match(/E0?(\d{1,2})$/i);
        if (match) {
            return `EP.${match[1]}`;
        }
    }
    return undefined;
}

export function getAssetType(project: any): "episode" | "knowledge_article" | "narrative_article" | "group_post" | "page_post" | "personal_post" | "social_image" | "ga4_snapshot" | "facebook_snapshot" | "legacy_shell" | "unknown" {
    if (!project) return "unknown";
    let notesData: any = {};
    if (project.notes) {
        try {
            notesData = JSON.parse(project.notes);
        } catch (e) {}
    }
    let assetType = notesData.assetType || "unknown";
    if (assetType === "unknown" || !assetType) {
        if (project.writing_mode === "knowledge_article") {
            assetType = "knowledge_article";
        } else if (project.writing_mode === "journey_chapter" || project.writing_mode === "knowledge_journey_article") {
            assetType = "narrative_article";
        } else if (project.writing_mode === "social_story_copy") {
            assetType = "group_post";
        }
    }
    if (notesData.legacySource) {
        assetType = "legacy_shell";
    }
    return assetType;
}

export function getCleanDisplayTitle(project: any): string {
    if (!project) return "";
    let notesData: any = {};
    if (project.notes) {
        try {
            notesData = JSON.parse(project.notes);
        } catch (e) {}
    }

    const prefixRegex = /^(\d+)\s*—\s*/;

    // 1. notes.displayTitle if it exists
    if (notesData.displayTitle) {
        return notesData.displayTitle.replace(prefixRegex, "");
    }

    // 2. notes.episodeCode + notes.canonicalTitle
    const epCode = getEpisodeCode(project);
    const rawTitle = project.title || "";
    let canonicalTitle = notesData.canonicalTitle || rawTitle;
    canonicalTitle = canonicalTitle.replace(prefixRegex, "");

    if (epCode) {
        return `${epCode} — ${canonicalTitle}`;
    }

    return canonicalTitle;
}
export function getLegacyId(project: any): string | undefined {
    if (!project) return undefined;
    let notesData: any = {};
    if (project.notes) {
        try {
            notesData = JSON.parse(project.notes);
        } catch (e) {}
    }
    if (notesData.legacyId) return notesData.legacyId;

    const epId = project.episode_id || project.id;
    if (epId) {
        // Match 3 or more digits at the end of the id
        const hashMatch = epId.match(/(?:EP-|E)(\d{3,})$/i) || epId.match(/(\d{4,})$/);
        if (hashMatch) {
            return hashMatch[1];
        }
    }
    return undefined;
}

export function parseProjectMetadata(project: any): ProjectMetadata {
    if (!project) {
        return {
            canonicalTitle: "",
            displayTitle: "",
            assetType: "unknown"
        };
    }

    let notesData: any = {};
    if (project.notes) {
        try {
            notesData = JSON.parse(project.notes);
        } catch (e) {
            // Notes is plain text or fallback
        }
    }

    const assetType = getAssetType(project);
    const episodeCode = getEpisodeCode(project);
    const displayTitle = getCleanDisplayTitle(project);

    const prefixRegex = /^(\d+)\s*—\s*/;
    const rawTitle = project.title || "";
    let canonicalTitle = notesData.canonicalTitle || rawTitle;
    canonicalTitle = canonicalTitle.replace(prefixRegex, "");

    let legacyId = getLegacyId(project);
    const matchPrefix = (notesData.canonicalTitle || rawTitle).match(prefixRegex);
    if (matchPrefix) {
        legacyId = legacyId || matchPrefix[1];
    }

    return {
        episodeCode,
        canonicalTitle,
        displayTitle,
        assetType,
        contentFamily: notesData.contentFamily,
        contentLayer: notesData.contentLayer || project.writing_mode,
        legacyId,
        sourceLocation: notesData.sourceLocation,
        migrationStatus: notesData.migrationStatus,
        originalTitle: notesData.originalTitle || project.title
    };
}
