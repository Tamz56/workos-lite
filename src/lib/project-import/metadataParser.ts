// ---------------------------------------------------------------------------
// WorkOS Project Field Sheet v1 — Metadata parser
// WORKOS-SHEET-GATE-2
// ---------------------------------------------------------------------------

import type ExcelJS from "exceljs";
import {
    METADATA_KEYS,
    REQUIRED_METADATA_KEYS,
    SOURCE_SYSTEMS,
    WORKOS_FIELD_SHEET_SCHEMA_VERSION,
} from "./constants";
import type { ImportValidationIssue, ParsedWorkbookMetadata } from "./types";
import { isPlaceholderText, trimOrNull } from "./normalize";
import { makeIssue } from "./validationIssues";

export type ParsedMetadataResult = {
    metadata: ParsedWorkbookMetadata | null;
    issues: ImportValidationIssue[];
};

export function parseMetadataSheet(worksheet: ExcelJS.Worksheet): ParsedMetadataResult {
    const issues: ImportValidationIssue[] = [];
    const values: Record<string, string | null> = {};

    for (const key of METADATA_KEYS) {
        values[key] = null;
    }

    worksheet.eachRow({ includeEmpty: false }, (row) => {
        const keyCell = row.getCell(1).value;
        const valueCell = row.getCell(2).value;
        if (typeof keyCell !== "string") return;
        const key = keyCell.trim();
        if (!METADATA_KEYS.includes(key as (typeof METADATA_KEYS)[number])) return;

        const raw = valueCell === null || valueCell === undefined ? "" : String(valueCell);
        const trimmed = trimOrNull(raw) ?? "";

        if (isPlaceholderText(trimmed)) {
            issues.push(
                makeIssue("METADATA_PLACEHOLDER_VALUE", "error", "workbook", `Metadata "${key}" still contains a placeholder value and must be filled before import`, {
                    columnName: key,
                    rawValue: raw,
                }),
            );
        }
        values[key] = trimmed.length > 0 ? trimmed : null;
    });

    for (const key of REQUIRED_METADATA_KEYS) {
        if (!values[key]) {
            issues.push(makeIssue("EMPTY_REQUIRED_FIELD", "error", "workbook", `Required metadata "${key}" is missing or blank`, { columnName: key }));
        }
    }

    const sourceSystem = values.source_system ?? "";
    if (sourceSystem && !SOURCE_SYSTEMS.includes(sourceSystem as (typeof SOURCE_SYSTEMS)[number])) {
        issues.push(makeIssue("INVALID_ENUM", "error", "workbook", `source_system must be one of: ${SOURCE_SYSTEMS.join(", ")}`, { columnName: "source_system", rawValue: sourceSystem }));
    }

    const exportTimestamp = values.export_timestamp ?? "";
    if (exportTimestamp && Number.isNaN(Date.parse(exportTimestamp))) {
        issues.push(makeIssue("INVALID_DATE", "error", "workbook", "export_timestamp must be a valid ISO 8601 timestamp", { columnName: "export_timestamp", rawValue: exportTimestamp }));
    }

    const schemaVersion = values.schema_version ?? "";
    if (schemaVersion && schemaVersion !== WORKOS_FIELD_SHEET_SCHEMA_VERSION) {
        issues.push(
            makeIssue("UNSUPPORTED_SCHEMA_VERSION", "error", "workbook", `Unsupported schema version "${schemaVersion}"; expected "${WORKOS_FIELD_SHEET_SCHEMA_VERSION}"`, {
                columnName: "schema_version",
                rawValue: schemaVersion,
            }),
        );
    }

    const hasError = issues.some((issue) => issue.severity === "error");
    if (hasError) {
        return { metadata: null, issues };
    }

    const metadata: ParsedWorkbookMetadata = {
        schemaVersion,
        workbookId: values.workbook_id ?? "",
        batchReference: values.batch_reference ?? "",
        sourceSystem: values.source_system ?? "",
        exportTimestamp: values.export_timestamp ?? "",
        timezone: values.timezone ?? "",
        preparedBy: values.prepared_by,
        notes: values.notes,
    };

    return { metadata, issues };
}
