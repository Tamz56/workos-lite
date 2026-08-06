"use client";

import { formatFileSize } from "@/lib/project-import/client/projectImportApiClient";
import type { UiDryRunResponse } from "@/lib/project-import/client/projectImportUiTypes";
import { ImportStatusBadge } from "./ImportStatusBadge";

function CountCell({ label, value, tone }: { label: string; value: number; tone?: "ready" | "muted" | "warning" | "blocked" }) {
    return (
        <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-3 text-center">
            <div className={`text-xl font-black ${tone === "blocked" ? "text-red-700" : tone === "warning" ? "text-amber-700" : tone === "ready" ? "text-emerald-700" : "text-neutral-800"}`}>
                {value}
            </div>
            <div className="mt-0.5 text-[11px] font-medium text-neutral-500">{label}</div>
        </div>
    );
}

export function DryRunSummary({ result }: { result: UiDryRunResponse }) {
    const totals = result.totals;
    return (
        <section className="rounded-2xl border border-neutral-200 bg-white p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-base font-black text-neutral-900">ผลลัพธ์ Dry Run</h2>
                <ImportStatusBadge
                    label={result.workbookStatus === "valid" ? "Workbook ถูกต้อง" : result.workbookStatus === "valid_with_warnings" ? "มีคำเตือน" : "Workbook ไม่ถูกต้อง"}
                    tone={result.workbookStatus === "valid" ? "success" : result.workbookStatus === "valid_with_warnings" ? "warning" : "blocked"}
                />
            </div>

            <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-3">
                <div>
                    <dt className="text-xs text-neutral-500">ไฟล์</dt>
                    <dd className="truncate font-semibold text-neutral-800" title={result.source.sanitizedFilename}>
                        {result.source.sanitizedFilename}
                    </dd>
                </div>
                <div>
                    <dt className="text-xs text-neutral-500">ขนาด</dt>
                    <dd className="font-semibold text-neutral-800">{formatFileSize(result.source.fileSize)}</dd>
                </div>
                <div>
                    <dt className="text-xs text-neutral-500">File Hash (ย่อ)</dt>
                    <dd className="font-mono text-xs font-semibold text-neutral-700">{result.source.fileHashExcerpt}</dd>
                </div>
                <div>
                    <dt className="text-xs text-neutral-500">Schema</dt>
                    <dd className="font-semibold text-neutral-800">{result.source.schemaVersion ?? "-"}</dd>
                </div>
                <div>
                    <dt className="text-xs text-neutral-500">Workbook ID</dt>
                    <dd className="font-semibold text-neutral-800">{result.source.workbookId ?? "-"}</dd>
                </div>
                <div>
                    <dt className="text-xs text-neutral-500">Batch Reference</dt>
                    <dd className="font-semibold text-neutral-800">{result.source.batchReference ?? "-"}</dd>
                </div>
            </dl>

            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                <CountCell label="แถวทั้งหมด" value={totals.totalCandidateRows} />
                <CountCell label="ใหม่ (นำเข้าได้)" value={totals.newRows} tone="ready" />
                <CountCell label="ซ้ำ" value={totals.duplicateRows} tone="muted" />
                <CountCell label="ขัดแย้ง" value={totals.conflictRows} tone="warning" />
                <CountCell label="ต้องตรวจสอบ" value={totals.reviewRequiredRows} tone="warning" />
                <CountCell label="ไม่ถูกต้อง" value={totals.invalidRows} tone="blocked" />
                <CountCell label="ข้าม" value={totals.skippedRows} tone="muted" />
                <CountCell label="คำเตือน / ข้อผิดพลาด" value={totals.warningCount + totals.errorCount} tone={totals.errorCount > 0 ? "blocked" : "muted"} />
            </div>

            {result.issues.length > 0 && (
                <details className="mt-4 rounded-xl border border-neutral-200 bg-neutral-50 p-3">
                    <summary className="cursor-pointer text-xs font-bold text-neutral-600">
                        ดูปัญหา ({result.issues.length} รายการ)
                    </summary>
                    <ul className="mt-2 max-h-48 space-y-1 overflow-y-auto text-xs text-neutral-600">
                        {result.issues.map((issue, index) => (
                            <li key={`${issue.code}-${index}`}>
                                [{issue.severity}] {issue.code}
                                {issue.sheetName ? ` · ${issue.sheetName}` : ""}
                                {issue.rowNumber !== undefined ? ` · แถว ${issue.rowNumber}` : ""}
                                {" — "}
                                {issue.message}
                            </li>
                        ))}
                    </ul>
                </details>
            )}
        </section>
    );
}
