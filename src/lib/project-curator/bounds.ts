// ---------------------------------------------------------------------------
// WorkOS-Lite — Project Context Curator (CTX2-R1)
// Hard bounds + deterministic truncation
// ---------------------------------------------------------------------------
import type { ProjectContextSourceLimits } from "./contracts";

/**
 * Provider-neutral hard limits for Stage B selected full-content input.
 * These are specifically the selected-source bounds (NOT category caps).
 */
export const DEFAULT_CURATOR_LIMITS: ProjectContextSourceLimits = {
    maxSelectedSources: 12,
    maxCharsPerSource: 30_000,
    maxTotalChars: 120_000,
};

/**
 * Conservative Stage A safety cap per source kind. This bounds the metadata
 * index for very large projects and is intentionally distinct from the
 * selected-source (Stage B) bounds.
 */
export const MAX_INDEX_ENTRIES_PER_KIND = 500;

/** Suffix appended when the full truncation marker can fit within the cap. */
export const TRUNCATION_SUFFIX = "… [curator:truncated]";

/** Compact marker used when the cap is too small for the full suffix. */
const COMPACT_TRUNCATION_SUFFIX = "…";

/**
 * Merges caller overrides onto the default limits. Never mutates defaults.
 */
export function resolveCuratorLimits(
    overrides?: Partial<ProjectContextSourceLimits>,
): ProjectContextSourceLimits {
    return { ...DEFAULT_CURATOR_LIMITS, ...overrides };
}

/**
 * Deterministically truncates text to at most `maxChars` characters,
 * honoring the cap even when it is smaller than the full truncation suffix.
 * Returns whether truncation occurred.
 * An empty cap (0 or negative) yields an empty value with a truncation flag
 * set when the input was non-empty.
 */
export function truncateText(
    text: string,
    maxChars: number,
): { value: string; truncated: boolean } {
    if (maxChars <= 0) {
        return { value: "", truncated: text.length > 0 };
    }
    if (text.length <= maxChars) {
        return { value: text, truncated: false };
    }
    if (maxChars < TRUNCATION_SUFFIX.length) {
        const keep = Math.max(0, maxChars - COMPACT_TRUNCATION_SUFFIX.length);
        return {
            value: text.slice(0, keep) + COMPACT_TRUNCATION_SUFFIX,
            truncated: true,
        };
    }
    const keep = maxChars - TRUNCATION_SUFFIX.length;
    return { value: text.slice(0, keep) + TRUNCATION_SUFFIX, truncated: true };
}
