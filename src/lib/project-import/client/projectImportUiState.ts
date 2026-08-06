// ---------------------------------------------------------------------------
// WorkOS Project Field Sheet v1 — Import UI state helpers
// WORKOS-SHEET-GATE-7B
// Pure helpers used by the workspace client. No server modules are imported.
// ---------------------------------------------------------------------------

import type {
    ImportEntityType,
    UiBatchDetail,
    UiBatchRowItem,
    UiDryRunEntitySummary,
    UiPaginated,
} from "./projectImportUiTypes";

export const ENTITY_LABELS: Record<ImportEntityType, string> = {
    project_documentation: "Project Documentation",
    backlog: "Backlog",
};

export const ENTITY_LABELS_THAI: Record<ImportEntityType, string> = {
    project_documentation: "Project Documentation",
    backlog: "Backlog",
};

export function entitySummary(detail: UiBatchDetail | null, entityType: ImportEntityType): UiDryRunEntitySummary | null {
    if (!detail) return null;
    const status =
        detail[entityType === "project_documentation" ? "projectDocumentationStatus" : "backlogStatus"] === "blocked"
            ? "blocked"
            : detail[entityType === "project_documentation" ? "projectDocumentationStatus" : "backlogStatus"] === "ready_with_warnings"
                ? "ready_with_warnings"
                : "ready";
    return {
        entityType,
        status,
        totalRows: detail.totals.totalRows,
        newRows: detail.totals.newRows,
        duplicateRows: detail.totals.duplicateRows,
        conflictRows: detail.totals.conflictRows,
        reviewRequiredRows: detail.totals.reviewRequiredRows,
        invalidRows: detail.totals.invalidRows,
        skippedRows: detail.totals.skippedRows,
    };
}

export function approvalForEntity(detail: UiBatchDetail | null, entityType: ImportEntityType) {
    return detail?.approvals.find((approval) => approval.entityType === entityType) ?? null;
}

export function isEntityExecuted(detail: UiBatchDetail | null, entityType: ImportEntityType): boolean {
    const status = detail?.[entityType === "project_documentation" ? "projectDocumentationStatus" : "backlogStatus"];
    return status === "executed";
}

export function isApprovalValid(approval: { effectiveStatus: string; isValidNow: boolean; expiresAt: string | null } | null): boolean {
    return Boolean(approval && approval.isValidNow && approval.effectiveStatus === "approved");
}

export function remainingTtlMinutes(approval: { expiresAt: string | null; validityAt: string } | null): number | null {
    if (!approval?.expiresAt) return null;
    const expires = Date.parse(approval.expiresAt);
    const now = Date.parse(approval.validityAt);
    if (Number.isNaN(expires) || Number.isNaN(now)) return null;
    return Math.max(0, Math.round((expires - now) / 60000));
}

export function classificationLabel(status: string): { label: string; tone: "ready" | "no-action" | "manual" | "blocked" } {
    switch (status) {
        case "new":
            return { label: "นำเข้า", tone: "ready" };
        case "duplicate":
            return { label: "ซ้ำ (ไม่ต้องดำเนินการ)", tone: "no-action" };
        case "skipped":
            return { label: "ข้าม", tone: "no-action" };
        case "conflict":
        case "review_required":
            return { label: "ต้องตรวจสอบ", tone: "manual" };
        case "invalid":
            return { label: "ไม่ถูกต้อง", tone: "blocked" };
        default:
            return { label: status, tone: "no-action" };
    }
}

export function executionStatusLabel(status: string): string {
    switch (status) {
        case "committed":
            return "นำเข้าแล้ว";
        case "attempted":
            return "พยายามนำเข้า";
        case "rolled_back":
            return "ย้อนกลับ";
        case "failed_before_write":
            return "ล้มเหลวก่อนเขียน";
        case "skipped":
            return "ข้าม";
        default:
            return "ยังไม่ดำเนินการ";
    }
}

export function formatDateTime(iso: string | null | undefined): string {
    if (!iso) return "-";
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return iso;
    return date.toLocaleString("th-TH", {
        dateStyle: "short",
        timeStyle: "short",
        timeZone: "Asia/Bangkok",
    });
}

/**
 * Eligible new rows for approval/execution, scoped to one entity's rows only.
 * Used by the approval confirmation modal and the approval/execute panels so
 * they never fall back to batch-global totals.
 */
export function countEligibleNewRows(rows: UiPaginated<UiBatchRowItem> | null): number {
    return rows?.items.filter((row) => row.dryRunStatus === "new" && row.proposedOperation === "insert").length ?? 0;
}
