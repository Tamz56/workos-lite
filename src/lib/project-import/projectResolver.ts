// ---------------------------------------------------------------------------
// WorkOS Project Field Sheet v1 — Exact project slug resolution (read-only)
// WORKOS-SHEET-GATE-3
// ---------------------------------------------------------------------------

import type { DryRunReadAdapter } from "./dryRunTypes";
import type { ImportValidationIssue } from "./types";
import { makeIssue } from "./validationIssues";

export function resolveProjectSlug(
    adapter: DryRunReadAdapter,
    slug: string | null,
    sheetName: string,
    rowNumber: number,
): { projectId: string | null; issues: ImportValidationIssue[] } {
    const issues: ImportValidationIssue[] = [];
    const trimmed = slug?.trim() ?? "";

    if (!trimmed) {
        issues.push(makeIssue("PROJECT_SLUG_REQUIRED", "error", "row", "project_slug is required for dry-run classification", { sheetName, rowNumber, columnName: "project_slug", rawValue: slug }));
        return { projectId: null, issues };
    }

    let rows: Array<{ id: string; slug: string }> = [];
    try {
        rows = adapter.resolveProjectBySlug(trimmed);
    } catch {
        issues.push(makeIssue("DATABASE_READ_FAILED", "error", "row", "Failed to read the projects table", { sheetName, rowNumber }));
        return { projectId: null, issues };
    }

    if (rows.length === 0) {
        issues.push(makeIssue("PROJECT_NOT_FOUND", "error", "row", `Project slug "${trimmed}" does not exist`, { sheetName, rowNumber, columnName: "project_slug", rawValue: trimmed }));
        return { projectId: null, issues };
    }

    if (rows.length > 1) {
        issues.push(makeIssue("PROJECT_RESOLUTION_AMBIGUOUS", "error", "row", `Project slug "${trimmed}" matched multiple projects`, { sheetName, rowNumber, columnName: "project_slug", rawValue: trimmed }));
        issues.push(makeIssue("DATABASE_INTEGRITY_ANOMALY", "error", "row", "Multiple projects resolved for a single slug", { sheetName, rowNumber }));
        return { projectId: null, issues };
    }

    return { projectId: rows[0].id, issues };
}
