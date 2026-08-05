// ---------------------------------------------------------------------------
// WorkOS Project Field Sheet v1 — Project Documentation normalizer
// WORKOS-SHEET-GATE-2
// ---------------------------------------------------------------------------

import { DOC_BLOCK_TYPES, DOC_SOURCE_TYPES, DOC_STATUSES, SAMPLE_EXTERNAL_ROW_ID } from "./constants";
import type { ImportValidationIssue, NormalizedImportRow, ProjectDocumentationNormalizedData } from "./types";
import { makeIssue } from "./validationIssues";
import { normalizeBoolean, normalizeDate, normalizeInteger, splitMultilineList, trimOrNull } from "./normalize";

export type NormalizeDocumentationRowInput = {
    raw: Record<string, unknown>;
    rowNumber: number;
    sheetName: string;
    seenExternalIds: Set<string>;
    detailsMaxBytes: number;
};

export function normalizeProjectDocumentationRow(input: NormalizeDocumentationRowInput): NormalizedImportRow {
    const { raw, rowNumber, sheetName, seenExternalIds, detailsMaxBytes } = input;
    const issues: ImportValidationIssue[] = [];

    const externalRowId = trimOrNull(raw.external_row_id) ?? "";
    const projectSlug = trimOrNull(raw.project_slug) ?? "";
    const blockType = trimOrNull(raw.block_type) ?? "";
    const title = trimOrNull(raw.title) ?? "";
    const summary = trimOrNull(raw.summary) ?? "";
    const details = typeof raw.details === "string" ? raw.details : raw.details === null || raw.details === undefined ? "" : String(raw.details);

    if (!externalRowId) {
        issues.push(makeIssue("EMPTY_REQUIRED_FIELD", "error", "row", "external_row_id is required", { sheetName, rowNumber, columnName: "external_row_id" }));
    } else if (externalRowId === SAMPLE_EXTERNAL_ROW_ID) {
        issues.push(makeIssue("SAMPLE_ROW_PRESENT", "error", "row", "Sample row must be removed before import", { sheetName, rowNumber, columnName: "external_row_id", rawValue: externalRowId }));
    } else if (seenExternalIds.has(externalRowId)) {
        issues.push(makeIssue("DUPLICATE_EXTERNAL_ROW_ID", "error", "row", "Duplicate external_row_id within the same worksheet", { sheetName, rowNumber, columnName: "external_row_id", rawValue: externalRowId }));
    } else {
        seenExternalIds.add(externalRowId);
    }

    if (!projectSlug) {
        issues.push(makeIssue("EMPTY_REQUIRED_FIELD", "error", "row", "project_slug is required", { sheetName, rowNumber, columnName: "project_slug" }));
    }
    if (!blockType) {
        issues.push(makeIssue("EMPTY_REQUIRED_FIELD", "error", "row", "block_type is required", { sheetName, rowNumber, columnName: "block_type" }));
    } else if (!DOC_BLOCK_TYPES.includes(blockType as (typeof DOC_BLOCK_TYPES)[number])) {
        issues.push(makeIssue("INVALID_ENUM", "error", "cell", "block_type is not a supported value", { sheetName, rowNumber, columnName: "block_type", rawValue: blockType }));
    }
    if (!title) {
        issues.push(makeIssue("EMPTY_REQUIRED_FIELD", "error", "row", "title is required", { sheetName, rowNumber, columnName: "title" }));
    }
    if (!summary) {
        issues.push(makeIssue("EMPTY_REQUIRED_FIELD", "error", "row", "summary is required", { sheetName, rowNumber, columnName: "summary" }));
    }
    if (!details) {
        issues.push(makeIssue("EMPTY_REQUIRED_FIELD", "error", "row", "details is required", { sheetName, rowNumber, columnName: "details" }));
    } else if (Buffer.byteLength(details, "utf8") > detailsMaxBytes) {
        issues.push(makeIssue("CELL_SIZE_EXCEEDED", "error", "cell", `details exceeds the ${detailsMaxBytes} byte limit`, { sheetName, rowNumber, columnName: "details" }));
    }

    const dateResult = normalizeDate(raw.date, sheetName, rowNumber);
    issues.push(...dateResult.issues);

    const status = trimOrNull(raw.status) ?? "active";
    if (status && !DOC_STATUSES.includes(status as (typeof DOC_STATUSES)[number])) {
        issues.push(makeIssue("INVALID_ENUM", "error", "cell", "status must be active or archived", { sheetName, rowNumber, columnName: "status", rawValue: status }));
    }

    const sourceType = trimOrNull(raw.source_type);
    if (sourceType && !DOC_SOURCE_TYPES.includes(sourceType as (typeof DOC_SOURCE_TYPES)[number])) {
        issues.push(makeIssue("INVALID_ENUM", "error", "cell", "source_type is not a supported value", { sheetName, rowNumber, columnName: "source_type", rawValue: sourceType }));
    }

    const orderIndexResult = normalizeInteger(raw.order_index, sheetName, rowNumber, false);
    issues.push(...orderIndexResult.issues);

    const reviewedResult = normalizeBoolean(raw.reviewed_by_user, sheetName, rowNumber);
    issues.push(...reviewedResult.issues);

    const evidenceLinks = trimOrNull(raw.evidence_links);
    const relatedFiles = trimOrNull(raw.related_files);
    const evidenceListResult = evidenceLinks ? splitMultilineList(evidenceLinks, sheetName, String(rowNumber)) : { items: [], issues: [] as ImportValidationIssue[] };
    const relatedListResult = relatedFiles ? splitMultilineList(relatedFiles, sheetName, String(rowNumber)) : { items: [], issues: [] as ImportValidationIssue[] };
    issues.push(...evidenceListResult.issues, ...relatedListResult.issues);

    const hasErrors = issues.some((issue) => issue.severity === "error");
    const hasWarnings = issues.some((issue) => issue.severity === "warning");

    const data: ProjectDocumentationNormalizedData = {
        externalRowId,
        projectSlug,
        blockType,
        title,
        date: dateResult.value ?? "",
        summary,
        details,
        evidenceLinks: evidenceListResult.items,
        relatedFiles: relatedListResult.items,
        nextAction: trimOrNull(raw.next_action),
        status,
        orderIndex: orderIndexResult.value,
        sourceType,
        reviewedByUser: reviewedResult.value ?? false,
    };

    return {
        entityType: "project_documentation",
        worksheetName: sheetName,
        sourceRowNumber: rowNumber,
        externalRowId,
        projectSlug,
        data,
        rawValues: raw,
        issues,
        classification: hasErrors ? "invalid" : hasWarnings ? "valid_with_warnings" : "valid",
    };
}
