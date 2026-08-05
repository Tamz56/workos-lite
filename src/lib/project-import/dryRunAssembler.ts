// ---------------------------------------------------------------------------
// WorkOS Project Field Sheet v1 — Dry-run assembly service (read-only)
// WORKOS-SHEET-GATE-3
// ---------------------------------------------------------------------------

import { createHash } from "crypto";
import path from "path";
import type Database from "better-sqlite3";
import { SHEET_BACKLOG, SHEET_PROJECT_DOCUMENTATION } from "./constants";
import { parseWorkOSProjectFieldWorkbook } from "./workbookParser";
import { createDryRunReadAdapter, openReadOnlyWorkosDatabase } from "./readOnlyAdapter";
import { classifyProjectDocumentationRows } from "./projectDocumentationClassifier";
import { classifyBacklogRows } from "./backlogClassifier";
import { buildDryRunTotals } from "./dryRunSummary";
import { makeIssue } from "./validationIssues";
import {
    DRY_RUN_CONTRACT_VERSION,
    type DryRunEntityResult,
    type DryRunReadAdapter,
    type DryRunRowResult,
    type DryRunOptions,
    type RunWorkOSProjectFieldDryRunInput,
    type WorkOSProjectFieldDryRunResult,
} from "./dryRunTypes";
import type { ImportValidationIssue, NormalizedImportRow, ParsedEntitySheetResult, WorkbookParseResult } from "./types";

const STRUCTURAL_SHEET_ERROR_CODES = new Set([
    "MISSING_REQUIRED_HEADER",
    "DUPLICATE_HEADER",
    "UNKNOWN_HEADER",
    "MERGED_CELL_IN_DATA_RANGE",
    "ROW_LIMIT_EXCEEDED",
]);

function computeDryRunId(fileHash: string, schemaVersion: string | null, workbookId: string | null): string {
    const source = [DRY_RUN_CONTRACT_VERSION, fileHash, schemaVersion ?? "", workbookId ?? ""].join(":");
    return createHash("sha256").update(source, "utf8").digest("hex");
}

function workbookLevelBlock(parsed: WorkbookParseResult, sheetName: string): boolean {
    return parsed.workbookIssues.some(
        (issue) =>
            issue.severity === "error" &&
            (issue.scope === "file" || issue.scope === "workbook") &&
            !(issue.code === "MISSING_REQUIRED_SHEET" && !issue.message.includes(sheetName)),
    );
}

function fallbackRows(parsedSheet: ParsedEntitySheetResult, entityType: "project_documentation" | "backlog", blocker: ImportValidationIssue | null): DryRunRowResult[] {
    return parsedSheet.rows.map((row) => ({
        entityType,
        sheetName: row.worksheetName,
        sourceRowNumber: row.sourceRowNumber,
        externalRowId: row.externalRowId || null,
        projectSlug: row.projectSlug || null,
        projectId: null,
        parserStatus: row.classification,
        dryRunStatus: "invalid",
        proposedOperation: "none",
        normalizedData: row.data,
        issues: [...row.issues, ...(blocker ? [blocker] : [])],
    }));
}

type ClassifyFn = (
    rows: NormalizedImportRow[],
    adapter: DryRunReadAdapter,
) => { rowResults: DryRunRowResult[]; issues: ImportValidationIssue[]; dbError: boolean };

function assembleEntity(
    entityType: "project_documentation" | "backlog",
    sheetName: string,
    parsedSheet: ParsedEntitySheetResult,
    parsed: WorkbookParseResult,
    adapter: DryRunReadAdapter | null,
    dbErrorIssue: ImportValidationIssue | null,
    classify: ClassifyFn,
): DryRunEntityResult {
    const issues: ImportValidationIssue[] = [...parsedSheet.issues];
    const structuralError = parsedSheet.issues.some((issue) => issue.severity === "error" && STRUCTURAL_SHEET_ERROR_CODES.has(issue.code));
    const blocked = workbookLevelBlock(parsed, sheetName) || structuralError || dbErrorIssue !== null || adapter === null;

    if (blocked) {
        if (dbErrorIssue) issues.push(dbErrorIssue);
        issues.push(makeIssue("DRY_RUN_ENTITY_BLOCKED", "error", "workbook", `Dry run blocked for ${entityType}`, { sheetName }));
        const rows = fallbackRows(parsedSheet, entityType, dbErrorIssue);
        return {
            entityType,
            sheetName,
            status: "blocked",
            totalRows: parsedSheet.totalPhysicalRows,
            validRows: 0,
            newRows: 0,
            duplicateRows: 0,
            conflictRows: 0,
            reviewRequiredRows: 0,
            invalidRows: rows.length,
            skippedRows: parsedSheet.totalPhysicalRows - parsedSheet.totalCandidateRows,
            rows,
            issues,
        };
    }

    const classified = classify(parsedSheet.rows, adapter as DryRunReadAdapter);
    issues.push(...classified.issues);
    const rows = classified.rowResults;
    const anyRowIssue = rows.some((row) => row.issues.length > 0);
    const anyEntityWarning = issues.some((issue) => issue.severity === "warning");
    const status: DryRunEntityResult["status"] = anyRowIssue || anyEntityWarning ? "ready_with_warnings" : "ready";

    return {
        entityType,
        sheetName,
        status,
        totalRows: parsedSheet.totalPhysicalRows,
        validRows: rows.filter((row) => row.parserStatus === "valid" || row.parserStatus === "valid_with_warnings").length,
        newRows: rows.filter((row) => row.dryRunStatus === "new").length,
        duplicateRows: rows.filter((row) => row.dryRunStatus === "duplicate").length,
        conflictRows: rows.filter((row) => row.dryRunStatus === "conflict").length,
        reviewRequiredRows: rows.filter((row) => row.dryRunStatus === "review_required").length,
        invalidRows: rows.filter((row) => row.dryRunStatus === "invalid").length,
        skippedRows: parsedSheet.totalPhysicalRows - parsedSheet.totalCandidateRows,
        rows,
        issues,
    };
}

export async function runWorkOSProjectFieldDryRun(
    input: RunWorkOSProjectFieldDryRunInput,
    options: DryRunOptions = {},
): Promise<WorkOSProjectFieldDryRunResult> {
    const generatedAt = new Date().toISOString();

    let parsed: WorkbookParseResult;
    try {
        parsed = await parseWorkOSProjectFieldWorkbook(input.workbook);
    } catch {
        parsed = {
            ok: false,
            fileHash: createHash("sha256").update(input.workbook).digest("hex"),
            schemaVersion: null,
            metadata: null,
            sheets: {
                projectDocumentation: { sheetName: SHEET_PROJECT_DOCUMENTATION, totalPhysicalRows: 0, totalCandidateRows: 0, blankRowsSkipped: 0, rows: [], issues: [] },
                backlog: { sheetName: SHEET_BACKLOG, totalPhysicalRows: 0, totalCandidateRows: 0, blankRowsSkipped: 0, rows: [], issues: [] },
            },
            workbookIssues: [makeIssue("WORKBOOK_OPEN_FAILED", "error", "file", "Workbook could not be parsed")],
            noWritePerformed: true,
        };
    }

    let adapter: DryRunReadAdapter | null = null;
    let dbErrorIssue: ImportValidationIssue | null = null;
    try {
        const db: Database.Database = options.db ?? openReadOnlyWorkosDatabase(path.resolve(process.cwd(), "data/workos.db"));
        adapter = createDryRunReadAdapter(db);
    } catch {
        dbErrorIssue = makeIssue("DATABASE_READ_FAILED", "error", "workbook", "Could not open a read-only database connection");
    }

    const projectDocumentation = assembleEntity(
        "project_documentation",
        SHEET_PROJECT_DOCUMENTATION,
        parsed.sheets.projectDocumentation,
        parsed,
        adapter,
        dbErrorIssue,
        classifyProjectDocumentationRows,
    );
    const backlog = assembleEntity(
        "backlog",
        SHEET_BACKLOG,
        parsed.sheets.backlog,
        parsed,
        adapter,
        dbErrorIssue,
        classifyBacklogRows,
    );

    const allIssues = [
        ...parsed.workbookIssues,
        ...projectDocumentation.issues,
        ...backlog.issues,
        ...projectDocumentation.rows.flatMap((row) => row.issues),
        ...backlog.rows.flatMap((row) => row.issues),
    ];
    const hasError = allIssues.some((issue) => issue.severity === "error");
    const hasWarning = allIssues.some((issue) => issue.severity === "warning");
    const workbookStatus: WorkOSProjectFieldDryRunResult["workbookStatus"] = hasError ? "invalid" : hasWarning ? "valid_with_warnings" : "valid";

    const totals = buildDryRunTotals(projectDocumentation, backlog);
    const dryRunId = computeDryRunId(parsed.fileHash, parsed.schemaVersion, parsed.metadata?.workbookId ?? null);

    return {
        dryRunId,
        generatedAt,
        fileHash: parsed.fileHash,
        sourceFilename: input.sourceFilename ?? null,
        schemaVersion: parsed.schemaVersion,
        metadata: parsed.metadata,
        workbookStatus,
        entities: { projectDocumentation, backlog },
        workbookIssues: parsed.workbookIssues,
        totals,
        noWritePerformed: true,
    };
}
