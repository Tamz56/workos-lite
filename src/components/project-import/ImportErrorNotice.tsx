"use client";

import { uiErrorSummary } from "@/lib/project-import/client/projectImportUiErrors";

export function ImportErrorNotice({ error }: { error: unknown }) {
    const summary = uiErrorSummary(error);
    return (
        <div
            role="alert"
            className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"
        >
            <div className="font-bold">การดำเนินการไม่สำเร็จ</div>
            <div className="mt-1">{summary.message}</div>
            <details className="mt-2">
                <summary className="cursor-pointer text-xs font-semibold text-red-600">
                    รายละเอียดทางเทคนิค (ปลอดภัย)
                </summary>
                <div className="mt-1 space-y-0.5 text-xs text-red-700">
                    <div>รหัส: {summary.code}</div>
                    {summary.status !== null && <div>สถานะ: {summary.status}</div>}
                    {summary.requestId && <div>Request ID: {summary.requestId}</div>}
                </div>
            </details>
        </div>
    );
}
