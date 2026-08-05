// ---------------------------------------------------------------------------
// WorkOS Project Field Sheet v1 — Backlog normalizer
// WORKOS-SHEET-GATE-2
// ---------------------------------------------------------------------------

import { BACKLOG_STATUSES, SAMPLE_EXTERNAL_ROW_ID, SCHEDULE_BUCKETS } from "./constants";
import type { BacklogNormalizedData, ImportValidationIssue, NormalizedImportRow } from "./types";
import { makeIssue } from "./validationIssues";
import { normalizeBoolean, normalizeDate, normalizeInteger, trimOrNull } from "./normalize";

export type NormalizeBacklogRowInput = {
    raw: Record<string, unknown>;
    rowNumber: number;
    sheetName: string;
    seenExternalIds: Set<string>;
};

export function normalizeBacklogRow(input: NormalizeBacklogRowInput): NormalizedImportRow {
    const { raw, rowNumber, sheetName, seenExternalIds } = input;
    const issues: ImportValidationIssue[] = [];

    const externalRowId = trimOrNull(raw.external_row_id) ?? "";
    const projectSlug = trimOrNull(raw.project_slug) ?? "";
    const title = trimOrNull(raw.title) ?? "";
    const status = trimOrNull(raw.status) ?? "";

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
    if (!title) {
        issues.push(makeIssue("EMPTY_REQUIRED_FIELD", "error", "row", "title is required", { sheetName, rowNumber, columnName: "title" }));
    }
    if (!status) {
        issues.push(makeIssue("EMPTY_REQUIRED_FIELD", "error", "row", "status is required", { sheetName, rowNumber, columnName: "status" }));
    } else if (!BACKLOG_STATUSES.includes(status as (typeof BACKLOG_STATUSES)[number])) {
        issues.push(makeIssue("INVALID_ENUM", "error", "cell", "status must be inbox, planned or done", { sheetName, rowNumber, columnName: "status", rawValue: status }));
    }

    const scheduleBucket = trimOrNull(raw.schedule_bucket);
    if (scheduleBucket && !SCHEDULE_BUCKETS.includes(scheduleBucket as (typeof SCHEDULE_BUCKETS)[number])) {
        issues.push(makeIssue("INVALID_ENUM", "error", "cell", "schedule_bucket must be none, morning, afternoon or evening", { sheetName, rowNumber, columnName: "schedule_bucket", rawValue: scheduleBucket }));
    }

    const priorityResult = normalizeInteger(raw.priority, sheetName, rowNumber, false);
    issues.push(...priorityResult.issues);

    const startDateResult = normalizeDate(raw.start_date, sheetName, rowNumber);
    const endDateResult = normalizeDate(raw.end_date, sheetName, rowNumber);
    issues.push(...startDateResult.issues, ...endDateResult.issues);
    if (startDateResult.value && endDateResult.value && startDateResult.value > endDateResult.value) {
        issues.push(makeIssue("INVALID_DATE_RANGE", "error", "cell", "start_date must not be after end_date", { sheetName, rowNumber, columnName: "start_date" }));
    }

    const milestoneResult = normalizeBoolean(raw.is_milestone, sheetName, rowNumber);
    issues.push(...milestoneResult.issues);

    const hasErrors = issues.some((issue) => issue.severity === "error");
    const hasWarnings = issues.some((issue) => issue.severity === "warning");

    const data: BacklogNormalizedData = {
        externalRowId,
        projectSlug,
        title,
        status,
        priority: priorityResult.value,
        scheduleBucket,
        startDate: startDateResult.value,
        endDate: endDateResult.value,
        isMilestone: milestoneResult.value ?? false,
        workstream: trimOrNull(raw.workstream),
        dodText: trimOrNull(raw.dod_text),
        notes: trimOrNull(raw.notes),
    };

    return {
        entityType: "backlog",
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
