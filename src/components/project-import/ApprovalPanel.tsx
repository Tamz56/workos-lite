"use client";

import {
    isApprovalValid,
    remainingTtlMinutes,
    formatDateTime,
} from "@/lib/project-import/client/projectImportUiState";
import type { UiApprovalState } from "@/lib/project-import/client/projectImportUiTypes";
import { ImportStatusBadge } from "./ImportStatusBadge";

type Props = {
    entityLabel: string;
    summary: { newRows: number; duplicateRows: number; skippedRows: number; warningCount: number; errorCount: number } | null;
    approval: UiApprovalState | null;
    blockedReason: string | null;
    canApprove: boolean;
    busy: boolean;
    onApprove: () => void;
    onReject: () => void;
    onRevoke: () => void;
};

export function approvalStatusTone(status: string): "success" | "warning" | "blocked" | "muted" | "info" {
    switch (status) {
        case "approved":
            return "success";
        case "pending":
            return "info";
        case "expired":
        case "revoked":
        case "rejected":
            return "blocked";
        case "consumed":
            return "muted";
        default:
            return "muted";
    }
}

export function ApprovalPanel({
    entityLabel,
    summary,
    approval,
    blockedReason,
    canApprove,
    busy,
    onApprove,
    onReject,
    onRevoke,
}: Props) {
    const valid = isApprovalValid(approval);
    const ttl = remainingTtlMinutes(approval);

    return (
        <div className="rounded-2xl border border-neutral-200 bg-white p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm font-black text-neutral-900">การอนุมัติ — {entityLabel}</h3>
                {approval && (
                    <ImportStatusBadge label={approval.effectiveStatus} tone={approvalStatusTone(approval.effectiveStatus)} />
                )}
            </div>

            {approval && (
                <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                    <div>
                        <dt className="text-neutral-500">หมดอายุ</dt>
                        <dd className="font-semibold text-neutral-800">{formatDateTime(approval.expiresAt)}</dd>
                    </div>
                    <div>
                        <dt className="text-neutral-500">เวลาที่เหลือ (โดยประมาณ)</dt>
                        <dd className="font-semibold text-neutral-800">{ttl === null ? "-" : `${ttl} นาที`}</dd>
                    </div>
                    {approval.approvedBy && (
                        <div>
                            <dt className="text-neutral-500">ผู้อนุมัติ</dt>
                            <dd className="font-semibold text-neutral-800">{approval.approvedBy}</dd>
                        </div>
                    )}
                    {approval.approvalId && (
                        <div>
                            <dt className="text-neutral-500">Approval ID</dt>
                            <dd className="truncate font-mono text-neutral-700">{approval.approvalId.slice(0, 20)}...</dd>
                        </div>
                    )}
                </dl>
            )}

            {summary && (
                <p className="mt-3 text-xs text-neutral-600">
                    ครอบคลุมแถวใหม่ {summary.newRows} แถว · ซ้ำ {summary.duplicateRows} · ข้าม {summary.skippedRows} ·
                    คำเตือน {summary.warningCount} · ข้อผิดพลาด {summary.errorCount}
                </p>
            )}

            {blockedReason && (
                <p role="alert" className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                    {blockedReason}
                </p>
            )}

            <div className="mt-4 flex flex-wrap gap-2">
                <button
                    type="button"
                    disabled={!canApprove || valid || busy}
                    onClick={onApprove}
                    className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-neutral-200 disabled:text-neutral-400"
                >
                    อนุมัติ
                </button>
                <button
                    type="button"
                    disabled={busy || (!approval?.approvalId)}
                    onClick={onReject}
                    className="rounded-xl border border-neutral-200 px-4 py-2 text-xs font-bold text-neutral-700 hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                    ไม่อนุมัติ
                </button>
                <button
                    type="button"
                    disabled={busy || !valid}
                    onClick={onRevoke}
                    className="rounded-xl border border-red-200 px-4 py-2 text-xs font-bold text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                    เพิกถอนการอนุมัติ
                </button>
            </div>
        </div>
    );
}
