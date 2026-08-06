"use client";

import { classificationLabel, executionStatusLabel } from "@/lib/project-import/client/projectImportUiState";
import { uiErrorSummary } from "@/lib/project-import/client/projectImportUiErrors";
import type { UiBatchRowItem, UiPaginated } from "@/lib/project-import/client/projectImportUiTypes";
import { ImportStatusBadge, classificationTone } from "./ImportStatusBadge";

export type RowFilter = {
    entityType?: "project_documentation" | "backlog";
    dryRunStatus?: string;
    parserStatus?: string;
    hasErrors?: boolean;
    hasWarnings?: boolean;
};

type Props = {
    data: UiPaginated<UiBatchRowItem> | null;
    loading: boolean;
    error: unknown;
    filter: RowFilter;
    onFilterChange: (filter: RowFilter) => void;
    onPageChange: (page: number) => void;
    onRetry: () => void;
};

export function ImportRowsTable({ data, loading, error, filter, onFilterChange, onPageChange, onRetry }: Props) {
    return (
        <div className="rounded-2xl border border-neutral-200 bg-white p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="text-sm font-black text-neutral-900">แถวข้อมูลที่นำเข้า</h3>
                <div className="flex flex-wrap items-center gap-2 text-xs">
                    <label className="flex items-center gap-1">
                        <span className="text-neutral-500">สถานะ</span>
                        <select
                            value={filter.dryRunStatus ?? ""}
                            onChange={(event) => onFilterChange({ ...filter, dryRunStatus: event.target.value || undefined })}
                            className="rounded-lg border border-neutral-200 bg-white px-2 py-1.5 text-xs"
                        >
                            <option value="">ทั้งหมด</option>
                            <option value="new">ใหม่</option>
                            <option value="duplicate">ซ้ำ</option>
                            <option value="conflict">ขัดแย้ง</option>
                            <option value="review_required">ต้องตรวจสอบ</option>
                            <option value="invalid">ไม่ถูกต้อง</option>
                            <option value="skipped">ข้าม</option>
                        </select>
                    </label>
                    <label className="flex items-center gap-1 text-neutral-600">
                        <input
                            type="checkbox"
                            checked={filter.hasErrors ?? false}
                            onChange={(event) => onFilterChange({ ...filter, hasErrors: event.target.checked || undefined })}
                        />
                        เฉพาะที่มีข้อผิดพลาด
                    </label>
                </div>
            </div>

            {loading && <div className="py-8 text-center text-sm text-neutral-500">กำลังโหลดแถวข้อมูล...</div>}

            {!loading && Boolean(error) && (
                <div role="alert" className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                    ไม่สามารถโหลดแถวข้อมูลได้ ({uiErrorSummary(error).message})
                    <button type="button" onClick={onRetry} className="ml-3 font-bold underline">
                        ลองใหม่
                    </button>
                </div>
            )}

            {!loading && !error && (!data || data.items.length === 0) && (
                <div className="py-8 text-center text-sm text-neutral-500">ไม่มีแถวข้อมูล</div>
            )}

            {!loading && !error && data && data.items.length > 0 && (
                <>
                    <div className="mt-3 overflow-x-auto">
                        <table className="w-full min-w-[720px] border-collapse text-left text-xs">
                            <thead>
                                <tr className="border-b border-neutral-200 text-neutral-500">
                                    <th className="py-2 pr-3 font-semibold">แถว</th>
                                    <th className="py-2 pr-3 font-semibold">External ID</th>
                                    <th className="py-2 pr-3 font-semibold">Project Slug</th>
                                    <th className="py-2 pr-3 font-semibold">Parser</th>
                                    <th className="py-2 pr-3 font-semibold">การจำแนก</th>
                                    <th className="py-2 pr-3 font-semibold">การดำเนินการ</th>
                                    <th className="py-2 pr-3 font-semibold">ปัญหา</th>
                                    <th className="py-2 pr-3 font-semibold">สถานะนำเข้า</th>
                                    <th className="py-2 font-semibold">Target ID</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.items.map((row) => {
                                    const classification = classificationLabel(row.dryRunStatus);
                                    return (
                                        <tr key={row.id} className="border-b border-neutral-100 align-top">
                                            <td className="py-2 pr-3 font-mono text-neutral-500">{row.sourceRowNumber}</td>
                                            <td className="py-2 pr-3 font-mono text-neutral-700">{row.externalRowId ?? "-"}</td>
                                            <td className="max-w-[140px] truncate py-2 pr-3 text-neutral-700" title={row.projectSlug ?? undefined}>
                                                {row.projectSlug ?? "-"}
                                            </td>
                                            <td className="py-2 pr-3 text-neutral-600">{row.parserStatus}</td>
                                            <td className="py-2 pr-3">
                                                <ImportStatusBadge label={classification.label} tone={classificationTone(row.dryRunStatus)} />
                                            </td>
                                            <td className="py-2 pr-3 text-neutral-600">{row.proposedOperation}</td>
                                            <td className="py-2 pr-3">
                                                {row.issueCodes.length > 0 ? (
                                                    <details>
                                                        <summary className="cursor-pointer font-semibold text-amber-700">
                                                            {row.warningCount + row.errorCount} รายการ
                                                        </summary>
                                                        <ul className="mt-1 space-y-0.5 text-neutral-500">
                                                            {row.issueCodes.map((code) => (
                                                                <li key={code}>{code}</li>
                                                            ))}
                                                        </ul>
                                                    </details>
                                                ) : (
                                                    <span className="text-neutral-400">-</span>
                                                )}
                                            </td>
                                            <td className="py-2 pr-3 text-neutral-700">{executionStatusLabel(row.executionStatus)}</td>
                                            <td className="max-w-[140px] truncate py-2 font-mono text-neutral-600" title={row.targetRecordId ?? undefined}>
                                                {row.targetRecordId ?? "-"}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    {data.totalPages > 1 && (
                        <div className="mt-3 flex items-center justify-between text-xs text-neutral-600">
                            <span>
                                หน้า {data.page} / {data.totalPages} ({data.totalItems} แถว)
                            </span>
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    disabled={data.page <= 1}
                                    onClick={() => onPageChange(data.page - 1)}
                                    className="rounded-lg border border-neutral-200 px-3 py-1.5 font-semibold hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-40"
                                >
                                    ก่อนหน้า
                                </button>
                                <button
                                    type="button"
                                    disabled={data.page >= data.totalPages}
                                    onClick={() => onPageChange(data.page + 1)}
                                    className="rounded-lg border border-neutral-200 px-3 py-1.5 font-semibold hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-40"
                                >
                                    ถัดไป
                                </button>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
