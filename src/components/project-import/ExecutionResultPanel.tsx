"use client";

import { formatDateTime } from "@/lib/project-import/client/projectImportUiState";
import type { UiExecuteResult } from "@/lib/project-import/client/projectImportUiTypes";

export function ExecutionResultPanel({ result }: { result: UiExecuteResult }) {
    return (
        <section
            role="status"
            className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5"
        >
            <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-base font-black text-emerald-900">นำเข้าสำเร็จ</h2>
                <span className="rounded-full border border-emerald-300 bg-white px-2.5 py-0.5 text-xs font-bold text-emerald-800">
                    committed
                </span>
            </div>

            <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-3">
                <div>
                    <dt className="text-xs text-emerald-700">จำนวนที่นำเข้า</dt>
                    <dd className="font-black text-emerald-900">{result.insertedCount}</dd>
                </div>
                <div>
                    <dt className="text-xs text-emerald-700">ข้าม</dt>
                    <dd className="font-semibold text-emerald-900">{result.skippedCount}</dd>
                </div>
                <div>
                    <dt className="text-xs text-emerald-700">เสร็จสิ้น</dt>
                    <dd className="font-semibold text-emerald-900">{formatDateTime(result.finishedAt)}</dd>
                </div>
                <div>
                    <dt className="text-xs text-emerald-700">Attempt ID</dt>
                    <dd className="truncate font-mono text-xs text-emerald-900">{result.executionAttemptId.slice(0, 24)}...</dd>
                </div>
                <div>
                    <dt className="text-xs text-emerald-700">Approval ถูกใช้</dt>
                    <dd className="font-semibold text-emerald-900">{result.approvalConsumed ? "ใช่" : "ไม่"}</dd>
                </div>
                <div>
                    <dt className="text-xs text-emerald-700">Transaction</dt>
                    <dd className="font-semibold text-emerald-900">{result.transactionCommitted ? "committed" : "-"}</dd>
                </div>
            </dl>

            <div className="mt-3">
                <div className="text-xs font-bold text-emerald-800">Target Record IDs</div>
                <ul className="mt-1 flex max-h-32 flex-wrap gap-1.5 overflow-y-auto">
                    {result.targetRecordIds.length === 0 ? (
                        <li className="text-xs text-emerald-700">-</li>
                    ) : (
                        result.targetRecordIds.map((id) => (
                            <li key={id} className="rounded-lg border border-emerald-300 bg-white px-2 py-1 font-mono text-xs text-emerald-900">
                                {id}
                            </li>
                        ))
                    )}
                </ul>
            </div>
        </section>
    );
}
