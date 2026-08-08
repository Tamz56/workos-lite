"use client";

import { deriveBatchPresentation, formatDateTime } from "@/lib/project-import/client/projectImportUiState";
import type { UiBatchDetail } from "@/lib/project-import/client/projectImportUiTypes";
import { ImportStatusBadge, batchStatusTone } from "./ImportStatusBadge";

export function ImportBatchDetail({ detail, onBack }: { detail: UiBatchDetail; onBack: () => void }) {
    const batchPresentation = deriveBatchPresentation({
        batchStatus: detail.batchStatus,
        projectDocumentationStatus: detail.projectDocumentationStatus,
        backlogStatus: detail.backlogStatus,
        totals: detail.totals,
    });
    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h2 className="text-lg font-black text-neutral-900">Batch {detail.id.slice(0, 24)}...</h2>
                    <p className="mt-0.5 text-xs text-neutral-500">Dry Run {detail.dryRunId.slice(0, 24)}... · สร้าง {formatDateTime(detail.createdAt)}</p>
                </div>
                <div className="flex items-center gap-2">
                    <ImportStatusBadge
                        label={batchPresentation?.label ?? detail.batchStatus}
                        tone={batchPresentation?.tone ?? batchStatusTone(detail.batchStatus)}
                    />
                    <button
                        type="button"
                        onClick={onBack}
                        className="rounded-xl border border-neutral-200 px-4 py-2 text-xs font-bold text-neutral-700 hover:bg-neutral-50"
                    >
                        กลับ
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {detail.approvals.map((approval) => (
                    <div key={approval.entityType} className="rounded-2xl border border-neutral-200 bg-white p-4">
                        <div className="flex items-center justify-between">
                            <div className="text-sm font-black text-neutral-900">
                                {approval.entityType === "project_documentation" ? "Project Documentation" : "Backlog"}
                            </div>
                            <ImportStatusBadge label={approval.effectiveStatus} tone={approval.effectiveStatus === "approved" ? "success" : approval.effectiveStatus === "expired" || approval.effectiveStatus === "revoked" || approval.effectiveStatus === "rejected" ? "blocked" : "muted"} />
                        </div>
                        <dl className="mt-2 space-y-1 text-xs text-neutral-600">
                            <div className="flex justify-between">
                                <dt>อนุมัติ</dt>
                                <dd className="font-semibold">{approval.approvedAt ? formatDateTime(approval.approvedAt) : "-"}</dd>
                            </div>
                            <div className="flex justify-between">
                                <dt>หมดอายุ</dt>
                                <dd className="font-semibold">{approval.expiresAt ? formatDateTime(approval.expiresAt) : "-"}</dd>
                            </div>
                            <div className="flex justify-between">
                                <dt>ถูกใช้</dt>
                                <dd className="font-semibold">{approval.consumedAt ? formatDateTime(approval.consumedAt) : "-"}</dd>
                            </div>
                        </dl>
                    </div>
                ))}
            </div>

            <div className="rounded-2xl border border-neutral-200 bg-white p-4 text-xs text-neutral-600">
                <div className="font-black text-neutral-900">Execution Attempts</div>
                <div className="mt-1">
                    ทั้งหมด {detail.executionAttempts.count} ครั้ง · {Object.entries(detail.executionAttempts.byStatus).map(([status, count]) => `${status}: ${count}`).join(" · ")}
                </div>
            </div>
        </div>
    );
}
