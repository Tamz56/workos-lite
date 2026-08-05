import { describe, expect, it } from "vitest";
import { parseWorkOSProjectFieldWorkbook } from "@/lib/project-import/workbookParser";
import type { ImportValidationIssue, WorkbookParseResult } from "@/lib/project-import/types";
import {
    unsupportedFileBytes,
    oversizedFileBytes,
    validWorkbook,
    workbookMissingSheet,
    workbookWithAmbiguousDate,
    workbookWithBlankRow,
    workbookWithDuplicateExternalRowId,
    workbookWithDuplicateHeader,
    workbookWithExternalLink,
    workbookWithFormulaInDataRow,
    workbookWithHiddenDataRow,
    workbookWithHiddenSheet,
    workbookWithInvalidBoolean,
    workbookWithInvalidDate,
    workbookWithInvalidEnum,
    workbookWithMacro,
    workbookWithMergedCellInDataRange,
    workbookWithMetadataPlaceholder,
    workbookWithMissingExternalRowId,
    workbookWithMissingProjectSlug,
    workbookWithMissingRequiredMetadata,
    workbookWithNegativeOrderIndex,
    workbookWithNonIntegerOrderIndex,
    workbookWithOverRowLimit,
    workbookWithOversizedDetails,
    workbookWithSampleRow,
    workbookWithSchemaVersion,
    workbookWithStartDateAfterEndDate,
    workbookWithUnknownHeader,
    workbookWithUnknownSheet,
} from "../fixtures/projectFieldSheetFixtures";

function allCodes(result: WorkbookParseResult): string[] {
    const issues: ImportValidationIssue[] = [
        ...result.workbookIssues,
        ...result.sheets.projectDocumentation.issues,
        ...result.sheets.backlog.issues,
        ...result.sheets.projectDocumentation.rows.flatMap((row) => row.issues),
        ...result.sheets.backlog.rows.flatMap((row) => row.issues),
    ];
    return issues.map((issue) => issue.code);
}

function hasCode(result: WorkbookParseResult, code: string): boolean {
    return allCodes(result).includes(code);
}

describe("Valid workbook", () => {
    it("parses metadata, both entity sheets and classifies rows as valid", async () => {
        const result = await parseWorkOSProjectFieldWorkbook(await validWorkbook());

        expect(result.ok).toBe(true);
        expect(result.fileHash).toMatch(/^[a-f0-9]{64}$/);
        expect(result.schemaVersion).toBe("workos-field-sheet-v1");
        expect(result.metadata?.workbookId).toBe("WB-TEST-001");
        expect(result.metadata?.batchReference).toBe("TEST-BATCH");
        expect(result.metadata?.sourceSystem).toBe("manual");
        expect(result.metadata?.exportTimestamp).toBe("2026-08-05T09:00:00+07:00");
        expect(result.metadata?.timezone).toBe("Asia/Bangkok");
        expect(result.metadata?.preparedBy).toBe("Arbor QA");
        expect(result.noWritePerformed).toBe(true);

        const doc = result.sheets.projectDocumentation;
        expect(doc.rows).toHaveLength(2);
        expect(doc.totalCandidateRows).toBe(2);
        expect(doc.rows.every((row) => row.classification === "valid")).toBe(true);

        const backlog = result.sheets.backlog;
        expect(backlog.rows).toHaveLength(2);
        expect(backlog.rows.every((row) => row.classification === "valid")).toBe(true);
    });

    it("normalizes Excel date cells, multiline details and link lists", async () => {
        const result = await parseWorkOSProjectFieldWorkbook(await validWorkbook());
        const first = result.sheets.projectDocumentation.rows[0];
        expect(first.data.date).toBe("2026-01-05");
        expect(first.data.details).toBe("Details line 1\nDetails line 2");
        expect(first.data.evidenceLinks).toEqual(["https://a.example", "https://b.example"]);
        expect(first.data.relatedFiles).toEqual(["file-a.txt"]);
        expect(first.data.reviewedByUser).toBe(true);
    });

    it("supports canonical text dates, default status active and blank optional values", async () => {
        const result = await parseWorkOSProjectFieldWorkbook(await validWorkbook());
        const second = result.sheets.projectDocumentation.rows[1];
        expect(second.data.date).toBe("2026-02-10");
        expect(second.data.status).toBe("active");
        expect(second.data.orderIndex).toBeNull();
        expect(second.data.sourceType).toBeNull();
        expect(second.data.reviewedByUser).toBe(false);

        const secondBacklog = result.sheets.backlog.rows[1];
        expect(secondBacklog.data.isMilestone).toBe(true);
        expect(secondBacklog.data.priority).toBeNull();
        expect(secondBacklog.data.scheduleBucket).toBe("none");
    });

    it("is deterministic for identical input bytes", async () => {
        const buffer = await validWorkbook();
        const first = await parseWorkOSProjectFieldWorkbook(buffer);
        const second = await parseWorkOSProjectFieldWorkbook(buffer);
        expect(second.fileHash).toBe(first.fileHash);
        expect(JSON.stringify(second.sheets)).toBe(JSON.stringify(first.sheets));
    });
});

describe("File and workbook level validation", () => {
    it("rejects non-zip bytes", async () => {
        const result = await parseWorkOSProjectFieldWorkbook(await unsupportedFileBytes());
        expect(result.ok).toBe(false);
        expect(hasCode(result, "UNSUPPORTED_FILE_TYPE")).toBe(true);
    });

    it("rejects oversized files", async () => {
        const result = await parseWorkOSProjectFieldWorkbook(await oversizedFileBytes());
        expect(hasCode(result, "FILE_TOO_LARGE")).toBe(true);
    });

    it("rejects macro-enabled workbooks", async () => {
        const result = await parseWorkOSProjectFieldWorkbook(await workbookWithMacro());
        expect(hasCode(result, "MACRO_WORKBOOK")).toBe(true);
        expect(result.ok).toBe(false);
    });

    it("rejects external workbook links", async () => {
        const result = await parseWorkOSProjectFieldWorkbook(await workbookWithExternalLink());
        expect(hasCode(result, "EXTERNAL_LINK")).toBe(true);
        expect(result.ok).toBe(false);
    });

    it("rejects a missing required sheet", async () => {
        const result = await parseWorkOSProjectFieldWorkbook(await workbookMissingSheet("01_Project_Documentation"));
        expect(hasCode(result, "MISSING_REQUIRED_SHEET")).toBe(true);
    });

    it("rejects an unknown extra sheet", async () => {
        const result = await parseWorkOSProjectFieldWorkbook(await workbookWithUnknownSheet());
        expect(hasCode(result, "UNKNOWN_WORKSHEET")).toBe(true);
        expect(result.ok).toBe(false);
    });

    it("rejects a hidden required sheet", async () => {
        const result = await parseWorkOSProjectFieldWorkbook(await workbookWithHiddenSheet());
        expect(hasCode(result, "HIDDEN_WORKSHEET")).toBe(true);
    });

    it("rejects an unsupported schema version", async () => {
        const result = await parseWorkOSProjectFieldWorkbook(await workbookWithSchemaVersion("workos-field-sheet-v2"));
        expect(hasCode(result, "UNSUPPORTED_SCHEMA_VERSION")).toBe(true);
        expect(result.ok).toBe(false);
    });

    it("rejects merged cells inside the data range", async () => {
        const result = await parseWorkOSProjectFieldWorkbook(await workbookWithMergedCellInDataRange());
        expect(hasCode(result, "MERGED_CELL_IN_DATA_RANGE")).toBe(true);
    });

    it("rejects formulas in data rows", async () => {
        const result = await parseWorkOSProjectFieldWorkbook(await workbookWithFormulaInDataRow());
        expect(hasCode(result, "FORMULA_IN_DATA_ROW")).toBe(true);
        expect(result.sheets.projectDocumentation.rows.some((row) => row.classification === "invalid")).toBe(true);
    });

    it("rejects duplicate and missing headers", async () => {
        const result = await parseWorkOSProjectFieldWorkbook(await workbookWithDuplicateHeader());
        expect(hasCode(result, "DUPLICATE_HEADER")).toBe(true);
        expect(hasCode(result, "MISSING_REQUIRED_HEADER")).toBe(true);
    });

    it("rejects unknown headers", async () => {
        const result = await parseWorkOSProjectFieldWorkbook(await workbookWithUnknownHeader());
        expect(hasCode(result, "UNKNOWN_HEADER")).toBe(true);
        expect(result.ok).toBe(false);
    });

    it("rejects metadata placeholder values", async () => {
        const result = await parseWorkOSProjectFieldWorkbook(await workbookWithMetadataPlaceholder());
        expect(hasCode(result, "METADATA_PLACEHOLDER_VALUE")).toBe(true);
    });

    it("rejects missing required metadata", async () => {
        const result = await parseWorkOSProjectFieldWorkbook(await workbookWithMissingRequiredMetadata());
        expect(hasCode(result, "EMPTY_REQUIRED_FIELD")).toBe(true);
        expect(result.ok).toBe(false);
    });
});

describe("Row level validation", () => {
    it("rejects a retained sample row", async () => {
        const result = await parseWorkOSProjectFieldWorkbook(await workbookWithSampleRow());
        expect(hasCode(result, "SAMPLE_ROW_PRESENT")).toBe(true);
        expect(result.ok).toBe(false);
    });

    it("rejects a missing external row id", async () => {
        const result = await parseWorkOSProjectFieldWorkbook(await workbookWithMissingExternalRowId());
        expect(hasCode(result, "EMPTY_REQUIRED_FIELD")).toBe(true);
    });

    it("rejects a missing project slug", async () => {
        const result = await parseWorkOSProjectFieldWorkbook(await workbookWithMissingProjectSlug());
        expect(hasCode(result, "EMPTY_REQUIRED_FIELD")).toBe(true);
    });

    it("rejects an invalid enum", async () => {
        const result = await parseWorkOSProjectFieldWorkbook(await workbookWithInvalidEnum());
        expect(hasCode(result, "INVALID_ENUM")).toBe(true);
    });

    it("rejects an invalid calendar date", async () => {
        const result = await parseWorkOSProjectFieldWorkbook(await workbookWithInvalidDate());
        expect(hasCode(result, "INVALID_DATE")).toBe(true);
    });

    it("rejects an ambiguous locale date", async () => {
        const result = await parseWorkOSProjectFieldWorkbook(await workbookWithAmbiguousDate());
        expect(hasCode(result, "INVALID_DATE")).toBe(true);
    });

    it("rejects an invalid boolean", async () => {
        const result = await parseWorkOSProjectFieldWorkbook(await workbookWithInvalidBoolean());
        expect(hasCode(result, "INVALID_BOOLEAN")).toBe(true);
    });

    it("rejects duplicate external row ids inside a worksheet", async () => {
        const result = await parseWorkOSProjectFieldWorkbook(await workbookWithDuplicateExternalRowId());
        expect(hasCode(result, "DUPLICATE_EXTERNAL_ROW_ID")).toBe(true);
    });

    it("rejects a negative order index", async () => {
        const result = await parseWorkOSProjectFieldWorkbook(await workbookWithNegativeOrderIndex());
        expect(hasCode(result, "INVALID_INTEGER")).toBe(true);
    });

    it("rejects a non-integer order index", async () => {
        const result = await parseWorkOSProjectFieldWorkbook(await workbookWithNonIntegerOrderIndex());
        expect(hasCode(result, "INVALID_INTEGER")).toBe(true);
    });

    it("rejects start date after end date", async () => {
        const result = await parseWorkOSProjectFieldWorkbook(await workbookWithStartDateAfterEndDate());
        expect(hasCode(result, "INVALID_DATE_RANGE")).toBe(true);
    });

    it("rejects details over the 200 KB limit", async () => {
        const result = await parseWorkOSProjectFieldWorkbook(await workbookWithOversizedDetails());
        expect(hasCode(result, "CELL_SIZE_EXCEEDED")).toBe(true);
    });

    it("rejects worksheets over the row limit", async () => {
        const result = await parseWorkOSProjectFieldWorkbook(await workbookWithOverRowLimit(3), { rowLimit: 3 });
        expect(hasCode(result, "ROW_LIMIT_EXCEEDED")).toBe(true);
        expect(result.ok).toBe(false);
    });

    it("rejects hidden data rows", async () => {
        const result = await parseWorkOSProjectFieldWorkbook(await workbookWithHiddenDataRow());
        expect(hasCode(result, "HIDDEN_DATA_ROW")).toBe(true);
        expect(result.ok).toBe(false);
    });
});

describe("Blank row handling", () => {
    it("skips fully blank rows without error and keeps later rows", async () => {
        const result = await parseWorkOSProjectFieldWorkbook(await workbookWithBlankRow());
        expect(result.ok).toBe(true);
        expect(result.sheets.projectDocumentation.blankRowsSkipped).toBeGreaterThanOrEqual(1);
        expect(result.sheets.projectDocumentation.rows).toHaveLength(2);
    });
});
