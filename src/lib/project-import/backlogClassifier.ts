// ---------------------------------------------------------------------------
// WorkOS Project Field Sheet v1 — Backlog dry-run classification
// WORKOS-SHEET-GATE-3
// ---------------------------------------------------------------------------

import type {
    DryRunBacklogItemRow,
    DryRunReadAdapter,
    DryRunRowResult,
} from "./dryRunTypes";
import type { BacklogNormalizedData, ImportValidationIssue, NormalizedImportRow } from "./types";
import { makeIssue } from "./validationIssues";
import { resolveProjectSlug } from "./projectResolver";

function normalizedBacklogKey(projectId: string, data: BacklogNormalizedData): string {
    return JSON.stringify({
        project_id: projectId,
        title: data.title.trim(),
        status: data.status,
        priority: data.priority ?? null,
        schedule_bucket: data.scheduleBucket ?? null,
        start_date: data.startDate ?? null,
        end_date: data.endDate ?? null,
        is_milestone: data.isMilestone,
        workstream: data.workstream ?? null,
        dod_text: data.dodText ?? null,
        notes: data.notes ?? null,
    });
}

function dbBacklogKey(row: DryRunBacklogItemRow): string {
    return JSON.stringify({
        project_id: row.project_id,
        title: (row.title ?? "").trim(),
        status: row.status,
        priority: row.priority ?? null,
        schedule_bucket: row.schedule_bucket ?? null,
        start_date: row.start_date ?? null,
        end_date: row.end_date ?? null,
        is_milestone: row.is_milestone === 1,
        workstream: (row.workstream ?? "").trim() || null,
        dod_text: (row.dod_text ?? "").trim() || null,
        notes: (row.notes ?? "").trim() || null,
    });
}

export function classifyBacklogRows(
    rows: NormalizedImportRow[],
    adapter: DryRunReadAdapter,
): { rowResults: DryRunRowResult[]; issues: ImportValidationIssue[]; dbError: boolean } {
    const rowResults: DryRunRowResult[] = [];
    const issues: ImportValidationIssue[] = [];
    let dbError = false;

    for (const row of rows) {
        const base: DryRunRowResult = {
            entityType: "backlog",
            sheetName: row.worksheetName,
            sourceRowNumber: row.sourceRowNumber,
            externalRowId: row.externalRowId || null,
            projectSlug: row.projectSlug || null,
            projectId: null,
            parserStatus: row.classification,
            dryRunStatus: "invalid",
            proposedOperation: "none",
            normalizedData: row.data,
            issues: [...row.issues],
        };

        if (row.classification === "invalid") {
            rowResults.push(base);
            continue;
        }

        const resolution = resolveProjectSlug(adapter, row.projectSlug, row.worksheetName, row.sourceRowNumber);
        base.issues.push(...resolution.issues);
        if (!resolution.projectId) {
            rowResults.push(base);
            continue;
        }
        base.projectId = resolution.projectId;

        let existingItems: DryRunBacklogItemRow[] = [];
        try {
            existingItems = adapter.findBacklogItemsByProject(resolution.projectId);
        } catch {
            const dbIssue = makeIssue("DATABASE_READ_FAILED", "error", "row", "Failed to read backlog items", { sheetName: row.worksheetName, rowNumber: row.sourceRowNumber });
            base.issues.push(dbIssue);
            issues.push(dbIssue);
            dbError = true;
            rowResults.push(base);
            continue;
        }

        const incomingKey = normalizedBacklogKey(resolution.projectId, row.data as BacklogNormalizedData);
        const exactMatch = existingItems.some((item) => dbBacklogKey(item) === incomingKey);

        if (exactMatch) {
            base.dryRunStatus = "duplicate";
            base.proposedOperation = "none";
            base.issues.push(makeIssue("BACKLOG_EXACT_DUPLICATE", "info", "row", "Existing backlog item with identical content", { sheetName: row.worksheetName, rowNumber: row.sourceRowNumber }));
        } else {
            // No persisted external identity in v1: exact-content match -> duplicate,
            // otherwise new. Conflict behavior is not invented without a source-backed identity.
            base.dryRunStatus = "new";
            base.proposedOperation = "insert";
        }
        rowResults.push(base);
    }

    return { rowResults, issues, dbError };
}
