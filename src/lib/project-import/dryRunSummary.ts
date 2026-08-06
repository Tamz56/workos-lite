// ---------------------------------------------------------------------------
// WorkOS Project Field Sheet v1 — Dry-run totals and invariants
// WORKOS-SHEET-GATE-3
// ---------------------------------------------------------------------------

import type { DryRunEntityResult, DryRunTotals, WorkOSProjectFieldDryRunResult } from "./dryRunTypes";

export function buildDryRunTotals(doc: DryRunEntityResult, backlog: DryRunEntityResult): DryRunTotals {
    const rows = [...doc.rows, ...backlog.rows];
    const allIssues = [...doc.issues, ...backlog.issues, ...rows.flatMap((row) => row.issues)];

    return {
        totalPhysicalRows: doc.totalRows + backlog.totalRows,
        totalCandidateRows: doc.rows.length + backlog.rows.length,
        validParserRows: rows.filter((row) => row.parserStatus === "valid" || row.parserStatus === "valid_with_warnings").length,
        newRows: rows.filter((row) => row.dryRunStatus === "new").length,
        duplicateRows: rows.filter((row) => row.dryRunStatus === "duplicate").length,
        conflictRows: rows.filter((row) => row.dryRunStatus === "conflict").length,
        reviewRequiredRows: rows.filter((row) => row.dryRunStatus === "review_required").length,
        invalidRows: rows.filter((row) => row.dryRunStatus === "invalid").length,
        skippedRows: rows.filter((row) => row.dryRunStatus === "skipped").length,
        warningCount: allIssues.filter((issue) => issue.severity === "warning").length,
        errorCount: allIssues.filter((issue) => issue.severity === "error").length,
    };
}

export function dryRunInvariantViolations(result: WorkOSProjectFieldDryRunResult): string[] {
    const problems: string[] = [];
    const rows = [...result.entities.projectDocumentation.rows, ...result.entities.backlog.rows];
    const statusCounts = {
        new: rows.filter((row) => row.dryRunStatus === "new").length,
        duplicate: rows.filter((row) => row.dryRunStatus === "duplicate").length,
        conflict: rows.filter((row) => row.dryRunStatus === "conflict").length,
        reviewRequired: rows.filter((row) => row.dryRunStatus === "review_required").length,
        invalid: rows.filter((row) => row.dryRunStatus === "invalid").length,
        skipped: rows.filter((row) => row.dryRunStatus === "skipped").length,
    };
    const classifiedTotal = statusCounts.new + statusCounts.duplicate + statusCounts.conflict + statusCounts.reviewRequired + statusCounts.invalid + statusCounts.skipped;

    if (classifiedTotal !== rows.length) {
        problems.push(`Row classification counts (${classifiedTotal}) do not equal row result count (${rows.length})`);
    }
    const candidates = result.entities.projectDocumentation.rows.length + result.entities.backlog.rows.length;
    if (candidates !== rows.length) {
        problems.push(`totalCandidateRows (${candidates}) do not equal row result count (${rows.length})`);
    }
    if (result.totals.newRows !== statusCounts.new) problems.push("totals.newRows mismatch");
    if (result.totals.duplicateRows !== statusCounts.duplicate) problems.push("totals.duplicateRows mismatch");
    if (result.totals.conflictRows !== statusCounts.conflict) problems.push("totals.conflictRows mismatch");
    if (result.totals.reviewRequiredRows !== statusCounts.reviewRequired) problems.push("totals.reviewRequiredRows mismatch");
    if (result.totals.invalidRows !== statusCounts.invalid) problems.push("totals.invalidRows mismatch");
    return problems;
}
