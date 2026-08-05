// ---------------------------------------------------------------------------
// WorkOS Project Field Sheet v1 — Workbook parser entry point
// WORKOS-SHEET-GATE-2
// ---------------------------------------------------------------------------

import { createHash } from "crypto";
import ExcelJS from "exceljs";
import yauzl from "yauzl";
import {
    ALLOWED_DISPLAY_MERGES,
    BACKLOG_HEADERS,
    DATA_START_ROW,
    DEFAULT_DETAILS_MAX_BYTES,
    DEFAULT_ROW_LIMIT,
    HEADER_ROW,
    MAX_WORKBOOK_BYTES,
    PROJECT_DOCUMENTATION_HEADERS,
    REQUIRED_SHEETS,
    SHEET_BACKLOG,
    SHEET_METADATA,
    SHEET_PROJECT_DOCUMENTATION,
} from "./constants";
import { parseMetadataSheet } from "./metadataParser";
import { normalizeBacklogRow } from "./backlogNormalizer";
import { normalizeProjectDocumentationRow } from "./projectDocumentationNormalizer";
import { makeIssue } from "./validationIssues";
import type {
    ImportValidationIssue,
    NormalizedImportRow,
    ParsedEntitySheetResult,
    ParserOptions,
    WorkbookParseResult,
} from "./types";

function readZipEntryNames(buffer: Buffer): Promise<string[]> {
    return new Promise((resolve, reject) => {
        yauzl.fromBuffer(buffer, { lazyEntries: false }, (err, zipfile) => {
            if (err || !zipfile) {
                reject(err ?? new Error("Failed to open zip buffer"));
                return;
            }
            const names: string[] = [];
            zipfile.on("entry", (entry: yauzl.Entry) => names.push(entry.fileName));
            zipfile.on("end", () => resolve(names));
            zipfile.on("error", reject);
        });
    });
}

function rawCellValue(cell: ExcelJS.Cell): unknown {
    const value = cell.value;
    if (value !== null && typeof value === "object" && "formula" in value) {
        return (value as { result?: unknown }).result ?? value;
    }
    return value;
}

function isBlankRawValue(value: unknown): boolean {
    return value === null || value === undefined || (typeof value === "string" && value.trim() === "");
}

function parseRangeMinRow(range: string): number | null {
    const match = /^([A-Z]+)(\d+):([A-Z]+)(\d+)$/.exec(range);
    if (!match) return null;
    return Number(match[2]);
}

function validateHeaders(
    worksheet: ExcelJS.Worksheet,
    expectedHeaders: readonly string[],
): { headerIndex: Map<string, string>; issues: ImportValidationIssue[] } {
    const issues: ImportValidationIssue[] = [];
    const headerIndex = new Map<string, string>();
    const seen = new Set<string>();
    const headerRow = worksheet.getRow(HEADER_ROW);

    headerRow.eachCell({ includeEmpty: false }, (cell) => {
        const header = rawCellValue(cell);
        if (typeof header !== "string" || !header.trim()) return;
        const normalized = header.trim();
        if (!expectedHeaders.includes(normalized)) {
            issues.push(makeIssue("UNKNOWN_HEADER", "error", "sheet", `Unknown header "${normalized}" at column ${cell.address}`, { sheetName: worksheet.name, columnName: normalized, rawValue: header }));
            return;
        }
        if (seen.has(normalized)) {
            issues.push(makeIssue("DUPLICATE_HEADER", "error", "sheet", `Duplicate header "${normalized}"`, { sheetName: worksheet.name, columnName: normalized, rawValue: header }));
            return;
        }
        seen.add(normalized);
        headerIndex.set(normalized, cell.col);
    });

    for (const header of expectedHeaders) {
        if (!headerIndex.has(header)) {
            issues.push(makeIssue("MISSING_REQUIRED_HEADER", "error", "sheet", `Missing required header "${header}"`, { sheetName: worksheet.name, columnName: header }));
        }
    }

    return { headerIndex, issues };
}

function checkMergedCells(worksheet: ExcelJS.Worksheet): ImportValidationIssue[] {
    const issues: ImportValidationIssue[] = [];
    const merges = ((worksheet.model as { merges?: unknown[] }).merges ?? []) as unknown[];
    for (const merge of merges) {
        if (typeof merge !== "string") continue;
        const minRow = parseRangeMinRow(merge);
        if (minRow === null || minRow < HEADER_ROW) continue;
        const allowed = ALLOWED_DISPLAY_MERGES[worksheet.name] ?? [];
        if (allowed.includes(merge.toUpperCase())) continue;
        issues.push(makeIssue("MERGED_CELL_IN_DATA_RANGE", "error", "sheet", `Merged cell ${merge} is inside the canonical data range (row ${minRow})`, { sheetName: worksheet.name, rowNumber: minRow, rawValue: merge }));
    }
    return issues;
}

function parseEntitySheet(
    worksheet: ExcelJS.Worksheet,
    headers: readonly string[],
    entityType: "project_documentation" | "backlog",
    rowLimit: number,
    detailsMaxBytes: number,
): ParsedEntitySheetResult {
    const issues: ImportValidationIssue[] = [];
    const rows: NormalizedImportRow[] = [];

    const headerResult = validateHeaders(worksheet, headers);
    issues.push(...headerResult.issues);

    issues.push(...checkMergedCells(worksheet));

    let blankRowsSkipped = 0;
    let candidateRows = 0;
    let physicalRows = 0;
    const seenExternalIds = new Set<string>();
    const rowFormulaIssues: ImportValidationIssue[] = [];
    const lastRow = worksheet.lastRow?.number ?? DATA_START_ROW - 1;

    for (let rowNumber = DATA_START_ROW; rowNumber <= lastRow; rowNumber++) {
        physicalRows++;
        const row = worksheet.getRow(rowNumber);

        if (row.hidden) {
            issues.push(makeIssue("HIDDEN_DATA_ROW", "error", "row", "Hidden data row is not allowed", { sheetName: worksheet.name, rowNumber }));
            continue;
        }

        let formulaDetected = false;
        row.eachCell({ includeEmpty: false }, (cell) => {
            const value = cell.value;
            if (value !== null && typeof value === "object" && "formula" in value) {
                formulaDetected = true;
            }
        });
        if (formulaDetected) {
            const formulaIssue = makeIssue("FORMULA_IN_DATA_ROW", "error", "row", "Formulas are not allowed in data rows", { sheetName: worksheet.name, rowNumber });
            issues.push(formulaIssue);
            rowFormulaIssues.push(formulaIssue);
        }

        const raw: Record<string, unknown> = {};
        let allBlank = true;
        for (const header of headers) {
            const column = headerResult.headerIndex.get(header);
            const value = column ? rawCellValue(row.getCell(column)) : null;
            raw[header] = value;
            if (!isBlankRawValue(value)) allBlank = false;
        }

        if (allBlank) {
            blankRowsSkipped++;
            continue;
        }

        candidateRows++;
        if (candidateRows > rowLimit) {
            issues.push(makeIssue("ROW_LIMIT_EXCEEDED", "error", "sheet", `Worksheet exceeds the ${rowLimit} candidate row limit`, { sheetName: worksheet.name, rowNumber }));
            break;
        }

        const normalized =
            entityType === "project_documentation"
                ? normalizeProjectDocumentationRow({ raw, rowNumber, sheetName: worksheet.name, seenExternalIds, detailsMaxBytes })
                : normalizeBacklogRow({ raw, rowNumber, sheetName: worksheet.name, seenExternalIds });
        for (const formulaIssue of rowFormulaIssues) {
            normalized.issues.push(formulaIssue);
            if (normalized.classification !== "invalid") {
                normalized.classification = "invalid";
            }
        }
        rows.push(normalized);
    }

    return {
        sheetName: worksheet.name,
        totalPhysicalRows: physicalRows,
        totalCandidateRows: candidateRows,
        blankRowsSkipped,
        rows,
        issues,
    };
}

export async function parseWorkOSProjectFieldWorkbook(
    input: Buffer,
    options: ParserOptions = {},
): Promise<WorkbookParseResult> {
    const rowLimit = options.rowLimit ?? DEFAULT_ROW_LIMIT;
    const detailsMaxBytes = options.detailsMaxBytes ?? DEFAULT_DETAILS_MAX_BYTES;
    const workbookIssues: ImportValidationIssue[] = [];
    const fileHash = createHash("sha256").update(input).digest("hex");

    const isZip = input.length >= 4 && input[0] === 0x50 && input[1] === 0x4b && input[2] === 0x03 && input[3] === 0x04;
    if (!isZip) {
        workbookIssues.push(makeIssue("UNSUPPORTED_FILE_TYPE", "error", "file", "Only .xlsx workbooks are supported"));
    } else {
        if (input.byteLength > MAX_WORKBOOK_BYTES) {
            workbookIssues.push(makeIssue("FILE_TOO_LARGE", "error", "file", `Workbook exceeds the ${MAX_WORKBOOK_BYTES} byte limit`));
        }

        let entryNames: string[] = [];
        try {
            entryNames = await readZipEntryNames(input);
        } catch {
            workbookIssues.push(makeIssue("WORKBOOK_OPEN_FAILED", "error", "file", "Workbook could not be opened as a valid zip archive"));
        }
        if (entryNames.some((name) => name.startsWith("xl/vbaProject.bin"))) {
            workbookIssues.push(makeIssue("MACRO_WORKBOOK", "error", "file", "Macro-enabled workbooks are not supported"));
        }
        if (entryNames.some((name) => name.startsWith("xl/externalLinks/"))) {
            workbookIssues.push(makeIssue("EXTERNAL_LINK", "error", "file", "External workbook links are not allowed"));
        }
    }

    let workbook: ExcelJS.Workbook | null = null;
    if (isZip && input.byteLength <= MAX_WORKBOOK_BYTES) {
        try {
            workbook = new ExcelJS.Workbook();
            await workbook.xlsx.load(input as unknown as Parameters<typeof workbook.xlsx.load>[0]);
        } catch {
            workbookIssues.push(makeIssue("WORKBOOK_OPEN_FAILED", "error", "file", "Workbook could not be parsed"));
        }
    }

    if (!workbook) {
        return {
            ok: false,
            fileHash,
            schemaVersion: null,
            metadata: null,
            sheets: {
                projectDocumentation: { sheetName: SHEET_PROJECT_DOCUMENTATION, totalPhysicalRows: 0, totalCandidateRows: 0, blankRowsSkipped: 0, rows: [], issues: [] },
                backlog: { sheetName: SHEET_BACKLOG, totalPhysicalRows: 0, totalCandidateRows: 0, blankRowsSkipped: 0, rows: [], issues: [] },
            },
            workbookIssues,
            noWritePerformed: true,
        };
    }

    const sheetNames = workbook.worksheets.map((worksheet) => worksheet.name);
    for (const required of REQUIRED_SHEETS) {
        if (!sheetNames.includes(required)) {
            workbookIssues.push(makeIssue("MISSING_REQUIRED_SHEET", "error", "workbook", `Required worksheet "${required}" is missing`));
        }
    }
    for (const worksheet of workbook.worksheets) {
        if (!REQUIRED_SHEETS.includes(worksheet.name as (typeof REQUIRED_SHEETS)[number])) {
            workbookIssues.push(makeIssue("UNKNOWN_WORKSHEET", "error", "workbook", `Unexpected worksheet "${worksheet.name}" is not part of the contract`, { sheetName: worksheet.name }));
        } else if (worksheet.state !== "visible") {
            workbookIssues.push(makeIssue("HIDDEN_WORKSHEET", "error", "workbook", `Worksheet "${worksheet.name}" is hidden`, { sheetName: worksheet.name }));
        }
    }

    let metadata: WorkbookParseResult["metadata"] = null;
    const metadataSheet = workbook.getWorksheet(SHEET_METADATA);
    if (metadataSheet) {
        const metadataResult = parseMetadataSheet(metadataSheet);
        workbookIssues.push(...metadataResult.issues);
        metadata = metadataResult.metadata;
    }
    const schemaVersion = metadata?.schemaVersion ?? null;

    const emptySheet = (sheetName: string): ParsedEntitySheetResult => ({
        sheetName,
        totalPhysicalRows: 0,
        totalCandidateRows: 0,
        blankRowsSkipped: 0,
        rows: [],
        issues: [],
    });

    const projectDocumentationSheet = workbook.getWorksheet(SHEET_PROJECT_DOCUMENTATION);
    const projectDocumentation = projectDocumentationSheet
        ? parseEntitySheet(projectDocumentationSheet, PROJECT_DOCUMENTATION_HEADERS, "project_documentation", rowLimit, detailsMaxBytes)
        : emptySheet(SHEET_PROJECT_DOCUMENTATION);

    const backlogSheet = workbook.getWorksheet(SHEET_BACKLOG);
    const backlog = backlogSheet
        ? parseEntitySheet(backlogSheet, BACKLOG_HEADERS, "backlog", rowLimit, detailsMaxBytes)
        : emptySheet(SHEET_BACKLOG);

    const allIssues = [
        ...workbookIssues,
        ...projectDocumentation.issues,
        ...backlog.issues,
        ...projectDocumentation.rows.flatMap((row) => row.issues),
        ...backlog.rows.flatMap((row) => row.issues),
    ];
    const ok = !allIssues.some((issue) => issue.severity === "error");

    return {
        ok,
        fileHash,
        schemaVersion,
        metadata,
        sheets: { projectDocumentation, backlog },
        workbookIssues,
        noWritePerformed: true,
    };
}
