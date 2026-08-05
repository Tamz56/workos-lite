// ---------------------------------------------------------------------------
// WorkOS Project Field Sheet v1 — Parser constants
// WORKOS-SHEET-GATE-2
// ---------------------------------------------------------------------------

export const WORKOS_FIELD_SHEET_SCHEMA_VERSION = "workos-field-sheet-v1";

export const SHEET_METADATA = "00_Metadata";
export const SHEET_PROJECT_DOCUMENTATION = "01_Project_Documentation";
export const SHEET_BACKLOG = "02_Backlog";

export const REQUIRED_SHEETS = [
    SHEET_METADATA,
    SHEET_PROJECT_DOCUMENTATION,
    SHEET_BACKLOG,
] as const;

export const HEADER_ROW = 5;
export const DESCRIPTION_ROW = 6;
export const DATA_START_ROW = 7;

export const PROJECT_DOCUMENTATION_HEADERS = [
    "external_row_id",
    "project_slug",
    "block_type",
    "title",
    "date",
    "summary",
    "details",
    "evidence_links",
    "related_files",
    "next_action",
    "status",
    "order_index",
    "source_type",
    "reviewed_by_user",
] as const;

export const BACKLOG_HEADERS = [
    "external_row_id",
    "project_slug",
    "title",
    "status",
    "priority",
    "schedule_bucket",
    "start_date",
    "end_date",
    "is_milestone",
    "workstream",
    "dod_text",
    "notes",
] as const;

export const DOC_BLOCK_TYPES = [
    "brief",
    "process_note",
    "sop",
    "structure",
    "decision",
    "milestone",
    "issue_fix",
    "publish",
    "qa_review",
] as const;

export const DOC_STATUSES = ["active", "archived"] as const;

export const DOC_SOURCE_TYPES = [
    "manual_paste",
    "walkthrough",
    "commit_log",
    "qa_report",
    "publish_log",
    "chat_summary",
] as const;

export const BACKLOG_STATUSES = ["inbox", "planned", "done"] as const;

export const SCHEDULE_BUCKETS = ["none", "morning", "afternoon", "evening"] as const;

export const SOURCE_SYSTEMS = ["google_sheet", "manual"] as const;

export const METADATA_KEYS = [
    "schema_version",
    "workbook_id",
    "batch_reference",
    "source_system",
    "export_timestamp",
    "timezone",
    "prepared_by",
    "notes",
] as const;

export const REQUIRED_METADATA_KEYS = [
    "schema_version",
    "workbook_id",
    "batch_reference",
    "source_system",
    "export_timestamp",
    "timezone",
] as const;

export const OPTIONAL_METADATA_KEYS = ["prepared_by", "notes"] as const;

export const MAX_WORKBOOK_BYTES = 25 * 1024 * 1024; // 25 MB — matches src/lib/uploadRules.ts

export const DEFAULT_ROW_LIMIT = 5000;
export const DEFAULT_DETAILS_MAX_BYTES = 200 * 1024; // 200 KB

export const SAMPLE_EXTERNAL_ROW_ID = "EXAMPLE-DO-NOT-IMPORT";

// Display-only merges that remain valid even though their min row is >= 5.
export const ALLOWED_DISPLAY_MERGES: Record<string, readonly string[]> = {
    "00_Metadata": ["A14:F14"],
};
