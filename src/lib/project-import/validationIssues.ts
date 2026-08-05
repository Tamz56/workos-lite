// ---------------------------------------------------------------------------
// WorkOS Project Field Sheet v1 — Validation issue factory
// WORKOS-SHEET-GATE-2
// ---------------------------------------------------------------------------

import type { ImportIssueScope, ImportIssueSeverity, ImportValidationIssue } from "./types";

export function makeIssue(
    code: string,
    severity: ImportIssueSeverity,
    scope: ImportIssueScope,
    message: string,
    extra: Partial<Pick<ImportValidationIssue, "sheetName" | "rowNumber" | "columnName" | "rawValue">> = {},
): ImportValidationIssue {
    return {
        code,
        severity,
        scope,
        message,
        ...extra,
    };
}

export const ISSUE_CODES = {
    UNSUPPORTED_FILE_TYPE: "UNSUPPORTED_FILE_TYPE",
    FILE_TOO_LARGE: "FILE_TOO_LARGE",
    WORKBOOK_OPEN_FAILED: "WORKBOOK_OPEN_FAILED",
    UNSUPPORTED_SCHEMA_VERSION: "UNSUPPORTED_SCHEMA_VERSION",
    MISSING_REQUIRED_SHEET: "MISSING_REQUIRED_SHEET",
    UNKNOWN_WORKSHEET: "UNKNOWN_WORKSHEET",
    HIDDEN_WORKSHEET: "HIDDEN_WORKSHEET",
    HIDDEN_DATA_ROW: "HIDDEN_DATA_ROW",
    MERGED_CELL_IN_DATA_RANGE: "MERGED_CELL_IN_DATA_RANGE",
    FORMULA_IN_DATA_ROW: "FORMULA_IN_DATA_ROW",
    DUPLICATE_HEADER: "DUPLICATE_HEADER",
    UNKNOWN_HEADER: "UNKNOWN_HEADER",
    MISSING_REQUIRED_HEADER: "MISSING_REQUIRED_HEADER",
    SAMPLE_ROW_PRESENT: "SAMPLE_ROW_PRESENT",
    EMPTY_REQUIRED_FIELD: "EMPTY_REQUIRED_FIELD",
    INVALID_ENUM: "INVALID_ENUM",
    INVALID_DATE: "INVALID_DATE",
    INVALID_DATE_RANGE: "INVALID_DATE_RANGE",
    INVALID_BOOLEAN: "INVALID_BOOLEAN",
    INVALID_INTEGER: "INVALID_INTEGER",
    DUPLICATE_EXTERNAL_ROW_ID: "DUPLICATE_EXTERNAL_ROW_ID",
    DUPLICATE_LIST_ITEM: "DUPLICATE_LIST_ITEM",
    ROW_LIMIT_EXCEEDED: "ROW_LIMIT_EXCEEDED",
    CELL_SIZE_EXCEEDED: "CELL_SIZE_EXCEEDED",
    METADATA_PLACEHOLDER_VALUE: "METADATA_PLACEHOLDER_VALUE",
    MACRO_WORKBOOK: "MACRO_WORKBOOK",
    EXTERNAL_LINK: "EXTERNAL_LINK",
} as const;

export type IssueCode = (typeof ISSUE_CODES)[keyof typeof ISSUE_CODES];
