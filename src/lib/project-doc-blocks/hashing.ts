import crypto from "crypto";

const INTEGRITY_HASH_KEYS = [
    "appliedAt",
    "createdAt",
    "date",
    "details",
    "evidenceLinks",
    "generatedBy",
    "id",
    "nextAction",
    "orderIndex",
    "projectSlug",
    "relatedFiles",
    "reviewedByUser",
    "sourceExcerpt",
    "sourceText",
    "sourceType",
    "status",
    "summary",
    "title",
    "type",
    "updatedAt"
] as const;

const CONTENT_HASH_KEYS = [
    "date",
    "details",
    "evidenceLinks",
    "nextAction",
    "orderIndex",
    "projectSlug",
    "relatedFiles",
    "status",
    "summary",
    "title",
    "type"
] as const;

type IntegrityHashInput = Partial<Record<(typeof INTEGRITY_HASH_KEYS)[number], unknown>>;
type ContentHashInput = Partial<Record<(typeof CONTENT_HASH_KEYS)[number], unknown>>;

/**
 * Computes a SHA-256 integrity hash for verifying structural correctness.
 * Preserves the original whitespace (no trimming of details/markdown),
 * array order, and Thai characters/fences.
 */
export function computeRecordIntegrityHash(block: IntegrityHashInput): string {
    const keys = [...INTEGRITY_HASH_KEYS].sort();
    const canonicalObj: Record<string, unknown> = {};

    keys.forEach(k => {
        let val = block[k];
        if (val === undefined || val === null) return;

        if (typeof val === "string") {
            // Newline normalization only - no trimming
            val = val.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
        } else if (Array.isArray(val)) {
            // Preserve original array order, just stringify/trim members
            val = [...val].map(s => String(s));
        } else if (typeof val === "boolean") {
            val = val;
        } else if (typeof val === "number") {
            val = val;
        }
        canonicalObj[k] = val;
    });

    const serialized = JSON.stringify(canonicalObj);
    return crypto.createHash("sha256").update(serialized, "utf8").digest("hex");
}

/**
 * Computes a SHA-256 duplicate content hash.
 * Normalizes title (trim and lowercase) and metadata strings,
 * sorts links/files arrays to detect logical matches,
 * but preserves markdown block formatting.
 */
export function computeContentDuplicateHash(block: ContentHashInput): string {
    const keys = [...CONTENT_HASH_KEYS].sort();
    const canonicalObj: Record<string, unknown> = {};

    keys.forEach(k => {
        let val = block[k];
        if (val === undefined || val === null) return;

        if (k === "details" && typeof val === "string") {
            // Newline normalization only for markdown body - DO NOT trim details
            val = val.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
        } else if (typeof val === "string") {
            const normalized = val.replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim();
            val = k === "title" ? normalized.toLowerCase() : normalized;
        } else if (Array.isArray(val)) {
            // Sort array contents to detect structural equivalents
            val = [...val].map(s => String(s).trim()).sort();
        } else if (typeof val === "number") {
            val = val;
        }
        canonicalObj[k] = val;
    });

    const serialized = JSON.stringify(canonicalObj);
    return crypto.createHash("sha256").update(serialized, "utf8").digest("hex");
}
