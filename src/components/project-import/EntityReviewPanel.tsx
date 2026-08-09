"use client";

import { useRef, useState } from "react";
import {
    countEligibleNewRows,
    deriveEntityPresentation,
    hasUnresolvedBlockingRows,
    isApprovalValid,
    isEntityExecuted,
} from "@/lib/project-import/client/projectImportUiState";
import type { ImportEntityType, UiApprovalState, UiBatchDetail, UiPaginated, UiBatchRowItem } from "@/lib/project-import/client/projectImportUiTypes";
import { ImportRowsTable, type RowFilter } from "./ImportRowsTable";
import { ApprovalPanel } from "./ApprovalPanel";
import { ExecuteConfirmationModal } from "./ExecuteConfirmationModal";
import { ImportStatusBadge } from "./ImportStatusBadge";

type Props = {
    entityType: ImportEntityType;
    entityLabel: string;
    detail: UiBatchDetail | null;
    approval: UiApprovalState | null;
    rows: UiPaginated<UiBatchRowItem> | null;
    rowsLoading: boolean;
    rowsError: unknown;
    rowFilter: RowFilter;
    executing: boolean;
    busy: boolean;
    onRowFilterChange: (filter: RowFilter) => void;
    onRowPageChange: (page: number) => void;
    onRowsRetry: () => void;
    onApprove: () => void;
    onReject: () => void;
    onRevoke: () => void;
    onConfirmExecute: () => Promise<void>;
};

function blockedReasonFor(entityType: ImportEntityType, detail: UiBatchDetail | null): string | null {
    if (!detail) return null;
    const entityStatus = detail[entityType === "project_documentation" ? "projectDocumentationStatus" : "backlogStatus"];
    if (entityStatus === "blocked") return "Entity นี้มีแถวที่ต้องแก้ไข (ไม่ถูกต้อง / ขัดแย้ง / ต้องตรวจสอบ) กรุณาแก้ข้อมูลแล้วอัปโหลดใหม่";
    if (entityStatus === "executed") return "Entity นี้ถูกนำเข้าแล้ว ไม่สามารถนำเข้าซ้ำได้";
    if (entityStatus === "expired") return "การอนุมัติหมดอายุแล้ว โปรดอนุมัติใหม่";
    return null;
}

export function EntityReviewPanel({
    entityType,
    entityLabel,
    detail,
    approval,
    rows,
    rowsLoading,
    rowsError,
    rowFilter,
    executing,
    busy,
    onRowFilterChange,
    onRowPageChange,
    onRowsRetry,
    onApprove,
    onReject,
    onRevoke,
    onConfirmExecute,
}: Props) {
    const [confirmOpen, setConfirmOpen] = useState(false);
    const executeButtonRef = useRef<HTMLButtonElement>(null);
    const approvalValid = isApprovalValid(approval);
    const alreadyExecuted = isEntityExecuted(detail, entityType);
    // Entity-specific counts must come from this entity's rows, never from the
    // batch-global totals (the other entity would inflate them).
    const entityRows = rows?.items ?? [];
    const entityCounts = {
        newRows: countEligibleNewRows(rows),
        duplicateRows: entityRows.filter((row) => row.dryRunStatus === "duplicate").length,
        skippedRows: entityRows.filter((row) => row.dryRunStatus === "skipped").length,
        warningCount: entityRows.reduce((sum, row) => sum + row.warningCount, 0),
        errorCount: entityRows.reduce((sum, row) => sum + row.errorCount, 0),
    };
    const eligibleRowCount = countEligibleNewRows(rows);
    const blockedReason = blockedReasonFor(entityType, detail);
    const canApprove =
        Boolean(
            detail &&
                detail[entityType === "project_documentation" ? "projectDocumentationStatus" : "backlogStatus"] !==
                    "blocked",
        ) &&
        eligibleRowCount > 0 &&
        !hasUnresolvedBlockingRows(entityRows);

    const entityStatus = detail?.[entityType === "project_documentation" ? "projectDocumentationStatus" : "backlogStatus"];
    const entityPresentation = deriveEntityPresentation({
        entityStatus: entityStatus ?? null,
        eligibleRows: eligibleRowCount,
        duplicateRows: entityCounts.duplicateRows,
        warningCount: entityCounts.warningCount,
        rowStates: entityRows,
    });

    const handleConfirm = async () => {
        try {
            await onConfirmExecute();
        } finally {
            setConfirmOpen(false);
        }
    };

    return (
        <section className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h2 className="text-lg font-black text-neutral-900">{entityLabel}</h2>
                    <div className="mt-1 flex items-center gap-2">
                        <ImportStatusBadge label={entityPresentation.label} tone={entityPresentation.tone} />
                        {alreadyExecuted && <ImportStatusBadge label="นำเข้าแล้ว" tone="success" />}
                    </div>
                </div>
                <button
                    ref={executeButtonRef}
                    type="button"
                    disabled={!approvalValid || alreadyExecuted || busy || executing}
                    onClick={() => setConfirmOpen(true)}
                    className="rounded-xl bg-neutral-900 px-5 py-2.5 text-sm font-black text-white hover:bg-neutral-700 disabled:cursor-not-allowed disabled:bg-neutral-200 disabled:text-neutral-400"
                >
                    นำเข้าข้อมูล (Execute)
                </button>
            </div>

            <ApprovalPanel
                entityLabel={entityLabel}
                summary={rows ? entityCounts : null}
                approval={approval}
                blockedReason={blockedReason}
                canApprove={canApprove}
                busy={busy}
                onApprove={onApprove}
                onReject={onReject}
                onRevoke={onRevoke}
            />

            <ImportRowsTable
                data={rows}
                loading={rowsLoading}
                error={rowsError}
                filter={rowFilter}
                onFilterChange={onRowFilterChange}
                onPageChange={onRowPageChange}
                onRetry={onRowsRetry}
            />

            <ExecuteConfirmationModal
                open={confirmOpen}
                entityLabel={entityLabel}
                batchReference={detail?.batchReference ?? null}
                approval={approval}
                eligibleRowCount={eligibleRowCount}
                executing={executing}
                focusRestoreRef={executeButtonRef}
                onCancel={() => {
                    if (!executing) setConfirmOpen(false);
                }}
                onConfirm={() => void handleConfirm()}
            />
        </section>
    );
}
