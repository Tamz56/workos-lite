// ---------------------------------------------------------------------------
// WorkOS Project Field Sheet v1 — Shared normalization helpers
// WORKOS-SHEET-GATE-2
// ---------------------------------------------------------------------------

import type { ImportValidationIssue } from "./types";
import { makeIssue } from "./validationIssues";

export function trimOrNull(value: unknown): string | null {
    if (value === null || value === undefined) return null;
    if (typeof value === "number" || typeof value === "boolean") return String(value).trim();
    if (typeof value !== "string") return null;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
}

export function isPlaceholderText(value: string): boolean {
    return value.includes("<") || value.includes(">") || /^<.+>$/.test(value);
}

export function normalizeDate(value: unknown, sheetName: string, rowNumber: number): { value: string | null; issues: ImportValidationIssue[] } {
    const issues: ImportValidationIssue[] = [];
    if (value === null || value === undefined) return { value: null, issues };
    if (value instanceof Date) {
        if (Number.isNaN(value.getTime())) {
            issues.push(makeIssue("INVALID_DATE", "error", "cell", "Invalid calendar date", { sheetName, rowNumber }));
            return { value: null, issues };
        }
        const y = value.getUTCFullYear();
        const m = String(value.getUTCMonth() + 1).padStart(2, "0");
        const d = String(value.getUTCDate()).padStart(2, "0");
        return { value: `${y}-${m}-${d}`, issues };
    }
    if (typeof value === "number") {
        // Excel serial dates are not supported without the workbook date base —
        // exceljs exposes real Date objects for date cells, so a bare number is ambiguous.
        issues.push(makeIssue("INVALID_DATE", "error", "cell", "Numeric date value is ambiguous; expected an Excel date cell or YYYY-MM-DD text", { sheetName, rowNumber, rawValue: value }));
        return { value: null, issues };
    }
    if (typeof value === "string") {
        const trimmed = value.trim();
        const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
        if (!match) {
            issues.push(makeIssue("INVALID_DATE", "error", "cell", "Date must be YYYY-MM-DD (canonical text or Excel date cell); timestamps and locale dates are rejected", { sheetName, rowNumber, rawValue: value }));
            return { value: null, issues };
        }
        const year = Number(match[1]);
        const month = Number(match[2]);
        const day = Number(match[3]);
        const date = new Date(Date.UTC(year, month - 1, day));
        if (
            date.getUTCFullYear() !== year ||
            date.getUTCMonth() !== month - 1 ||
            date.getUTCDate() !== day
        ) {
            issues.push(makeIssue("INVALID_DATE", "error", "cell", "Invalid calendar date", { sheetName, rowNumber, rawValue: value }));
            return { value: null, issues };
        }
        return { value: trimmed, issues };
    }
    issues.push(makeIssue("INVALID_DATE", "error", "cell", "Unsupported date cell type", { sheetName, rowNumber, rawValue: value }));
    return { value: null, issues };
}

export function normalizeBoolean(value: unknown, sheetName: string, rowNumber: number): { value: boolean | null; issues: ImportValidationIssue[] } {
    const issues: ImportValidationIssue[] = [];
    if (value === null || value === undefined || (typeof value === "string" && value.trim() === "")) {
        return { value: null, issues };
    }
    if (typeof value === "boolean") return { value, issues };
    if (typeof value === "string") {
        const normalized = value.trim().toLowerCase();
        if (normalized === "true") return { value: true, issues };
        if (normalized === "false") return { value: false, issues };
    }
    issues.push(makeIssue("INVALID_BOOLEAN", "error", "cell", "Boolean must be TRUE or FALSE (or a real boolean cell); yes/no, 1/0 and Thai alternatives are not accepted", { sheetName, rowNumber, rawValue: value }));
    return { value: null, issues };
}

export function normalizeInteger(value: unknown, sheetName: string, rowNumber: number, allowNegative: boolean): { value: number | null; issues: ImportValidationIssue[] } {
    const issues: ImportValidationIssue[] = [];
    if (value === null || value === undefined || (typeof value === "string" && value.trim() === "")) {
        return { value: null, issues };
    }
    let numberValue: number | null = null;
    if (typeof value === "number" && Number.isInteger(value)) {
        numberValue = value;
    } else if (typeof value === "string" && /^[+-]?\d+$/.test(value.trim())) {
        numberValue = Number(value.trim());
    } else {
        issues.push(makeIssue("INVALID_INTEGER", "error", "cell", "Value must be a whole number (integer cell or canonical integer text)", { sheetName, rowNumber, rawValue: value }));
        return { value: null, issues };
    }
    if (!allowNegative && numberValue < 0) {
        issues.push(makeIssue("INVALID_INTEGER", "error", "cell", "Negative values are not allowed", { sheetName, rowNumber, rawValue: value }));
        return { value: null, issues };
    }
    return { value: numberValue, issues };
}

export function splitMultilineList(value: string, sheetName: string, rowNumber: string): { items: string[]; issues: ImportValidationIssue[] } {
    const issues: ImportValidationIssue[] = [];
    const seen = new Set<string>();
    const items: string[] = [];
    for (const rawLine of value.split(/\r?\n/)) {
        const item = rawLine.trim();
        if (!item) continue;
        if (seen.has(item)) {
            issues.push(makeIssue("DUPLICATE_LIST_ITEM", "info", "cell", "Exact duplicate list item removed while preserving order", { sheetName, rowNumber: Number(rowNumber), columnName: "list" }));
            continue;
        }
        seen.add(item);
        items.push(item);
    }
    return { items, issues };
}
