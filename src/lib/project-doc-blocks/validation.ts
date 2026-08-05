import { ProjectDocBlockType, DocBlockSourceType } from "@/lib/types";

const ALLOWED_BLOCK_TYPES: ProjectDocBlockType[] = [
    "brief",
    "process_note",
    "sop",
    "structure",
    "decision",
    "milestone",
    "issue_fix",
    "publish",
    "qa_review"
];

const ALLOWED_SOURCE_TYPES: DocBlockSourceType[] = [
    "manual_paste",
    "walkthrough",
    "commit_log",
    "qa_report",
    "publish_log",
    "chat_summary"
];

const ALLOWED_IMPORT_SOURCES = [
    "localstorage_recovery",
    "google_sheet",
    "manual",
    "arbor_summary"
];

const ALLOWED_STATUSES = ["active", "archived"];
const ROUTE_IDENTIFIER_PATTERN = /^[A-Za-z0-9_-]{1,128}$/;

/**
 * Validates if a value is a non-empty trimmed string.
 */
export function isNonEmptyString(val: unknown): val is string {
    return typeof val === "string" && val.trim().length > 0;
}

/**
 * Validates if the block type is allowed.
 */
export function isValidBlockType(val: unknown): val is ProjectDocBlockType {
    return typeof val === "string" && ALLOWED_BLOCK_TYPES.some(type => type === val);
}

/**
 * Validates if the status is allowed.
 */
export function isValidStatus(val: unknown): val is "active" | "archived" {
    return typeof val === "string" && ALLOWED_STATUSES.some(status => status === val);
}

/**
 * Accepts the URL-safe identifier format used by project and block IDs.
 */
export function isValidRouteIdentifier(val: unknown): val is string {
    return typeof val === "string" && ROUTE_IDENTIFIER_PATTERN.test(val);
}

/**
 * Validates if the source type is valid or null/undefined.
 */
export function isValidSourceType(val: unknown): val is DocBlockSourceType | null | undefined {
    if (val === null || val === undefined) return true;
    return typeof val === "string" && ALLOWED_SOURCE_TYPES.some(type => type === val);
}

/**
 * Validates if the import source is valid or null/undefined.
 */
export function isValidImportSource(val: unknown): boolean {
    if (val === null || val === undefined) return true;
    return typeof val === "string" && ALLOWED_IMPORT_SOURCES.some(source => source === val);
}

/**
 * Validates date format YYYY-MM-DD.
 */
export function isValidDateFormat(val: unknown): val is string {
    if (typeof val !== "string") return false;
    const regex = /^\d{4}-\d{2}-\d{2}$/;
    if (!regex.test(val)) return false;
    const d = new Date(val);
    return !isNaN(d.getTime()) && d.toISOString().startsWith(val);
}

/**
 * Validates ISO 8601 date-time format.
 */
export function isValidIsoDateTime(val: unknown): val is string {
    if (typeof val !== "string") return false;
    const d = new Date(val);
    return !isNaN(d.getTime());
}

/**
 * Validates if a value is an integer or null/undefined.
 */
export function isValidIntegerOrNull(val: unknown): val is number | null | undefined {
    if (val === null || val === undefined) return true;
    return Number.isInteger(val);
}

/**
 * Validates if a value is an array of strings.
 */
export function isStringArray(val: unknown): val is string[] {
    return Array.isArray(val) && val.every(item => typeof item === "string");
}

export function checkImmutableFields(payload: Record<string, unknown>): string[] {
    const immutable = [
        "id", "project_id", "projectId", "projectSlug", "created_at", "createdAt", "updated_at", "updatedAt",
        "importSource", "import_source", "importBatchId", "import_batch_id",
        "sourceRecordId", "source_record_id", "sourceRowNumber", "source_row_number",
        "legacyProjectSlug", "legacy_project_slug",
        "generatedBy", "generated_by"
    ];
    return Object.keys(payload).filter(k => immutable.includes(k));
}
