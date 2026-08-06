"use client";

import { formatDateTime } from "@/lib/project-import/client/projectImportUiState";
import { uiErrorSummary } from "@/lib/project-import/client/projectImportUiErrors";
import type { UiBatchListItem, UiPaginated } from "@/lib/project-import/client/projectImportUiTypes";
import { ImportStatusBadge, batchStatusTone } from "./ImportStatusBadge";

type Props = {
    data: UiPaginated<UiBatchListItem> | null;
    loading: boolean;
    error: unknown;
    onOpen: (batchId: string) => void;
    onRefresh: () => void;
};

export function ImportHistoryList({ data, loading, error, onOpen, onRefresh }: Props) {
    return (
        <section className="rounded-2xl border border-neutral-200 bg-white p-5">
            <div className="flex items-center justify-between gap-3">
                <h2 className="text-base font-black text-neutral-900">ประวัติการนำเข้า</h2>
                <button
                    type="button"
                    onClick={onRefresh}
                    disabled={loading}
                    className="rounded-lg border border-neutral-200 px-3 py-1.5 text-xs font-bold text-neutral-600 hover:bg-neutral-50 disabled:opacity-50"
                >
                    รีเฟรช
                </button>
            </div>

            {loading && <div className="py-6 text-center text-sm text-neutral-500">กำลังโหลดประวัติ...</div>}

            {!loading && Boolean(error) && (
                <div role="alert" className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                    ไม่สามารถโหลดประวัติได้ ({uiErrorSummary(error).message})
                </div>
            )}

            {!loading && !error && (!data || data.items.length === 0) && (
                <div className="py-6 text-center text-sm text-neutral-500">ยังไม่มีประวัติการนำเข้า</div>
            )}

            {!loading && !error && data && data.items.length > 0 && (
                <ul className="mt-3 divide-y divide-neutral-100">
                    {data.items.map((batch) => (
                        <li key={batch.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                            <div className="min-w-0">
                                <button
                                    type="button"
                                    onClick={() => onOpen(batch.id)}
                                    className="truncate text-left text-sm font-bold text-neutral-900 hover:underline"
                                >
                                    {batch.sourceFilenameSanitized ?? batch.id}
                                </button>
                                <div className="mt-0.5 text-xs text-neutral-500">
                                    {formatDateTime(batch.createdAt)} · ใหม่ {batch.totals.newRows} · ข้อผิดพลาด {batch.totals.errorCount}
                                </div>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <ImportStatusBadge label={batch.projectDocumentationStatus ?? "-"} tone={batch.projectDocumentationStatus === "executed" ? "success" : batch.projectDocumentationStatus === "blocked" ? "blocked" : "muted"} />
                                <ImportStatusBadge label={batch.backlogStatus ?? "-"} tone={batch.backlogStatus === "executed" ? "success" : batch.backlogStatus === "blocked" ? "blocked" : "muted"} />
                                <ImportStatusBadge label={batch.batchStatus} tone={batchStatusTone(batch.batchStatus)} />
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </section>
    );
}
