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

// ---------------------------------------------------------------------------
// Derived presentation semantics (POST-GATE-8-UX-001C)
//
// These helpers translate persisted audit/lifecycle statuses + counts into
// user-facing presentation states. They are derived UI state only:
// - never persisted
// - never added to audit vocabulary
// - actionability always comes from eligibleRows, never from a status string
// ---------------------------------------------------------------------------

export type EntityPresentationState =
    | "actionable_ready"
    | "actionable_with_warnings"
    | "duplicate_only_no_action"
    | "no_items"
    | "manual_review"
    | "blocked"
    | "historical_fallback";

export type PresentationTone = "ready" | "warning" | "blocked" | "muted" | "info";

export type EntityPresentation = {
    state: EntityPresentationState;
    label: string;
    tone: PresentationTone;
};

export type EntityPresentationInput = {
    entityStatus: string | null;
    eligibleRows: number;
    duplicateRows: number;
    warningCount: number;
    rowStates?: ReadonlyArray<{ dryRunStatus: string }>;
};

/**
 * Derive the user-facing presentation for one entity from persisted status +
 * entity-scoped counts/rows.
 *
 * Priority order:
 *   blocked / executed-like lifecycle statuses (raw fallback)
 *   > manual review / invalid rows (never hidden behind no-action)
 *   > actionable (eligibleRows > 0)
 *   > warning-only no-action
 *   > duplicate-only benign no-action
 *   > empty entity
 *   > historical fallback (raw status, safe rendering)
 */
export function deriveEntityPresentation(input: EntityPresentationInput): EntityPresentation {
    const { entityStatus, eligibleRows, duplicateRows, warningCount, rowStates = [] } = input;
    const hasInvalid = rowStates.some((row) => row.dryRunStatus === "invalid");
    const hasManualReview = rowStates.some(
        (row) => row.dryRunStatus === "conflict" || row.dryRunStatus === "review_required",
    );

    if (entityStatus === "blocked") {
        return { state: "blocked", label: "blocked", tone: "blocked" };
    }
    if (hasManualReview || hasInvalid) {
        return {
            state: "manual_review",
            label: hasInvalid ? "ไม่ถูกต้อง" : "ต้องตรวจสอบ",
            tone: hasInvalid ? "blocked" : "warning",
        };
    }
    if (eligibleRows > 0) {
        return warningCount > 0
            ? { state: "actionable_with_warnings", label: "พร้อมอนุมัติ — มีคำเตือน", tone: "warning" }
            : { state: "actionable_ready", label: "พร้อมอนุมัติ", tone: "info" };
    }
    if (warningCount > 0) {
        return { state: "manual_review", label: "มีคำเตือน — ต้องตรวจสอบ", tone: "warning" };
    }
    if (duplicateRows > 0 && entityStatus === "ready") {
        return { state: "duplicate_only_no_action", label: "ซ้ำทั้งหมด — ไม่ต้องดำเนินการ", tone: "muted" };
    }
    if (entityStatus === "ready") {
        return { state: "no_items", label: "ไม่มีรายการต้องนำเข้า", tone: "muted" };
    }
    // Historical/lifecycle statuses (e.g. ready_with_warnings + warningCount 0,
    // approved, executed, expired) render as raw status, never as no-action.
    return { state: "historical_fallback", label: entityStatus ?? "unknown", tone: "muted" };
}

export type BatchPresentation = {
    label: string;
    tone: PresentationTone;
};

export type BatchPresentationInput = {
    batchStatus: string;
    projectDocumentationStatus: string | null;
    backlogStatus: string | null;
    totals: {
        totalRows: number;
        newRows: number;
        duplicateRows: number;
        conflictRows: number;
        reviewRequiredRows: number;
        invalidRows: number;
        warningCount: number;
    };
};

// Batch presentation is derived only during the pre-approval lifecycle phase.
// Later phases (approved / executed / ...) keep their raw lifecycle display.
const ACTIONABLE_BATCH_LIFECYCLE = new Set(["dry_run_created", "ready_for_approval", "partially_ready"]);

export function deriveBatchPresentation(input: BatchPresentationInput): BatchPresentation | null {
    const { batchStatus, projectDocumentationStatus, backlogStatus, totals } = input;
    if (!ACTIONABLE_BATCH_LIFECYCLE.has(batchStatus)) return null;

    const anyBlocked = projectDocumentationStatus === "blocked" || backlogStatus === "blocked";
    if (anyBlocked) {
        return { label: "ต้องตรวจสอบ", tone: "blocked" };
    }
    const needsReview =
        totals.conflictRows > 0 || totals.reviewRequiredRows > 0 || totals.invalidRows > 0;
    if (needsReview) {
        return { label: "ต้องตรวจสอบ", tone: "warning" };
    }
    if (totals.newRows > 0) {
        return { label: "พร้อมอนุมัติ", tone: "info" };
    }
    const benignNoAction =
        totals.totalRows > 0 &&
        totals.duplicateRows === totals.totalRows &&
        totals.warningCount === 0;
    if (benignNoAction || totals.totalRows === 0) {
        return { label: "ไม่มีรายการต้องนำเข้า", tone: "muted" };
    }
    return null;
}
