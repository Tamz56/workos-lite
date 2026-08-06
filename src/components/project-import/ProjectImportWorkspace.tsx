"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import {
    approveEntity as apiApproveEntity,
    createDryRun,
    executeEntity,
    getBatchDetail,
    listBatches,
    listRows,
    rejectEntity as apiRejectEntity,
    revokeEntity as apiRevokeEntity,
} from "@/lib/project-import/client/projectImportApiClient";
import {
    clientRuntimeError,
    ProjectImportUiException,
    uiErrorSummary,
} from "@/lib/project-import/client/projectImportUiErrors";
import {
    approvalForEntity,
    countEligibleNewRows,
    isApprovalValid,
} from "@/lib/project-import/client/projectImportUiState";
import type {
    ImportEntityType,
    UiBatchDetail,
    UiBatchListItem,
    UiBatchRowItem,
    UiDryRunResponse,
    UiExecuteResult,
    UiPaginated,
} from "@/lib/project-import/client/projectImportUiTypes";
import { WorkbookUploadPanel, type UploadState } from "./WorkbookUploadPanel";
import { DryRunSummary } from "./DryRunSummary";
import { EntityReviewPanel } from "./EntityReviewPanel";
import type { RowFilter } from "./ImportRowsTable";
import { ImportHistoryList } from "./ImportHistoryList";
import { ImportBatchDetail } from "./ImportBatchDetail";
import { ExecutionResultPanel } from "./ExecutionResultPanel";
import { ImportErrorNotice } from "./ImportErrorNotice";

const EMPTY_UPLOAD: UploadState = { file: null, error: null, uploading: false };

export type EffectivePasswordAccessorDeps = {
    getDomValue: () => string;
    setUiError: (error: unknown) => void;
};

/**
 * Pure credential accessor used by every privileged action. Reads the live
 * DOM value at action time (never a stale render-time capture). Exported for
 * interaction tests: the DOM value may be autofilled while React state is
 * still empty, and this accessor must still return it.
 */
export function readEffectivePassword(deps: EffectivePasswordAccessorDeps): string | null {
    const value = deps.getDomValue();
    if (!value.trim()) {
        deps.setUiError(
            new ProjectImportUiException({
                kind: "validation",
                code: "AUTH_REQUIRED",
                status: 401,
                message: "กรุณากรอก Agent Password ก่อนอัปโหลด",
            }),
        );
        return null;
    }
    return value;
}

export default function ProjectImportWorkspace() {
    const [password, setPassword] = useState("");
    const passwordRef = useRef<HTMLInputElement>(null);
    const [authError, setAuthError] = useState<string | null>(null);

    const [upload, setUpload] = useState<UploadState>(EMPTY_UPLOAD);
    const [dryRun, setDryRun] = useState<UiDryRunResponse | null>(null);

    const [currentBatchId, setCurrentBatchId] = useState<string | null>(null);
    const [detail, setDetail] = useState<UiBatchDetail | null>(null);
    const [rowsByEntity, setRowsByEntity] = useState<Record<ImportEntityType, UiPaginated<UiBatchRowItem> | null>>({
        project_documentation: null,
        backlog: null,
    });
    const [rowFilters, setRowFilters] = useState<Record<ImportEntityType, RowFilter>>({
        project_documentation: {},
        backlog: {},
    });
    const [rowsLoading, setRowsLoading] = useState<Record<ImportEntityType, boolean>>({
        project_documentation: false,
        backlog: false,
    });
    const [rowsError, setRowsError] = useState<Record<ImportEntityType, unknown>>({
        project_documentation: null,
        backlog: null,
    });

    const [executing, setExecuting] = useState<Record<ImportEntityType, boolean>>({
        project_documentation: false,
        backlog: false,
    });
    const [executionResult, setExecutionResult] = useState<UiExecuteResult | null>(null);
    const [busy, setBusy] = useState(false);
    const [globalError, setGlobalError] = useState<unknown>(null);

    const [history, setHistory] = useState<UiPaginated<UiBatchListItem> | null>(null);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [historyError, setHistoryError] = useState<unknown>(null);
    const [showHistory, setShowHistory] = useState(false);

    const [approveTarget, setApproveTarget] = useState<ImportEntityType | null>(null);
    const [rejectTarget, setRejectTarget] = useState<ImportEntityType | null>(null);
    const [rejectReason, setRejectReason] = useState("");
    const [revokeTarget, setRevokeTarget] = useState<ImportEntityType | null>(null);
    const approveButtonRef = useRef<HTMLButtonElement>(null);

    // The DOM input is the source of truth. Browser autofill writes the DOM
    // without always firing React onChange, so actions read the value from the
    // ref (after syncing state) instead of relying on state alone.
    const effectivePassword = useCallback((): string => {
        const domValue = passwordRef.current?.value ?? "";
        if (domValue !== password) setPassword(domValue);
        return domValue;
    }, [password]);

    // Single credential accessor for every privileged action. Reads the live
    // DOM value at action time (never a stale render-time capture) and fails
    // with a safe client message when the password is genuinely absent.
    const requireEffectivePassword = useCallback((): string | null => {
        return readEffectivePassword({
            getDomValue: () => passwordRef.current?.value ?? "",
            setUiError: (error) => setGlobalError(error),
        });
    }, []);

    // Browser autofill can populate the DOM asynchronously without firing a
    // reliable React event. Poll the live DOM value briefly so the UI state
    // (and the ref-based hasPassword check) catches late autofill.
    useEffect(() => {
        const timer = window.setInterval(() => {
            const domValue = passwordRef.current?.value ?? "";
            if (domValue && domValue !== password) setPassword(domValue);
        }, 750);
        return () => window.clearInterval(timer);
    }, [password]);

    // DOM is the source of truth. Reading the ref here (combined with the
    // state-driven re-renders from user actions) lets browser-autofilled
    // passwords enable the UI without requiring React onChange to fire.
    const hasPassword = Boolean(passwordRef.current?.value.trim());

    const refreshBatch = useCallback(
        async (batchId: string) => {
            const effective = requireEffectivePassword();
            if (!effective) return;
            const nextDetail = await getBatchDetail(batchId, effective);
            setDetail(nextDetail);
        },
        [requireEffectivePassword],
    );

    const loadRows = useCallback(
        async (batchId: string, entityType: ImportEntityType, filter: RowFilter, page: number) => {
            const effective = requireEffectivePassword();
            if (!effective) return;
            setRowsLoading((prev) => ({ ...prev, [entityType]: true }));
            setRowsError((prev) => ({ ...prev, [entityType]: null }));
            try {
                const result = await listRows(batchId, effective, { ...filter, entityType, page, pageSize: 25 });
                setRowsByEntity((prev) => ({ ...prev, [entityType]: result }));
            } catch (error) {
                setRowsError((prev) => ({ ...prev, [entityType]: error }));
            } finally {
                setRowsLoading((prev) => ({ ...prev, [entityType]: false }));
            }
        },
        [requireEffectivePassword],
    );

    const refreshHistory = useCallback(async () => {
        const effective = requireEffectivePassword();
        if (!effective) return;
        setHistoryLoading(true);
        setHistoryError(null);
        try {
            setHistory(await listBatches(effective, 1, 10));
        } catch (error) {
            setHistoryError(error);
        } finally {
            setHistoryLoading(false);
        }
    }, [requireEffectivePassword]);

    const handleUpload = async () => {
        const effective = requireEffectivePassword();
        if (process.env.NODE_ENV !== "production") {
            // Safe diagnostic: presence/length only, never the password value.
            console.debug(
                "[project-import] upload passwordPresent:",
                Boolean(passwordRef.current?.value),
                "passwordLength:",
                passwordRef.current?.value.length ?? 0,
            );
        }
        if (!upload.file) return;
        if (!effective) return;
        setUpload((prev) => ({ ...prev, uploading: true, error: null }));
        setGlobalError(null);
        try {
            const result = await createDryRun(upload.file, effective);
            setDryRun(result);
            setCurrentBatchId(result.batchId);
            setUpload({ file: null, error: null, uploading: false });
            await refreshBatch(result.batchId);
            await Promise.all([
                loadRows(result.batchId, "project_documentation", {}, 1),
                loadRows(result.batchId, "backlog", {}, 1),
            ]);
        } catch (error) {
            const normalized = error instanceof ProjectImportUiException ? error : clientRuntimeError(error);
            setGlobalError(normalized);
            const summary = uiErrorSummary(normalized);
            if (summary.status === 401) {
                if (passwordRef.current) passwordRef.current.value = "";
                setPassword("");
            }
            setUpload((prev) => ({ ...prev, uploading: false }));
        }
    };

    const handleApprove = async (entityType: ImportEntityType) => {
        const effective = requireEffectivePassword();
        if (!currentBatchId || !effective) return;
        setBusy(true);
        setGlobalError(null);
        try {
            await apiApproveEntity(currentBatchId, entityType, effective);
            await refreshBatch(currentBatchId);
        } catch (error) {
            setGlobalError(error);
        } finally {
            setBusy(false);
            setApproveTarget(null);
        }
    };

    const handleReject = async (entityType: ImportEntityType) => {
        const effective = requireEffectivePassword();
        if (!currentBatchId || !effective) return;
        setBusy(true);
        setGlobalError(null);
        try {
            const reason = rejectReason.trim() === "" ? null : rejectReason.trim().slice(0, 200);
            await apiRejectEntity(currentBatchId, entityType, effective, reason);
            await refreshBatch(currentBatchId);
        } catch (error) {
            setGlobalError(error);
        } finally {
            setBusy(false);
            setRejectTarget(null);
            setRejectReason("");
        }
    };

    const handleRevoke = async (entityType: ImportEntityType) => {
        const effective = requireEffectivePassword();
        if (!currentBatchId || !effective) return;
        setBusy(true);
        setGlobalError(null);
        try {
            await apiRevokeEntity(currentBatchId, entityType, effective);
            await refreshBatch(currentBatchId);
        } catch (error) {
            setGlobalError(error);
        } finally {
            setBusy(false);
            setRevokeTarget(null);
        }
    };

    const handleConfirmExecute = async (entityType: ImportEntityType): Promise<void> => {
        const effective = requireEffectivePassword();
        if (!currentBatchId || !effective) return;
        const approval = approvalForEntity(detail, entityType);
        if (!approval?.approvalId || !isApprovalValid(approval)) return;
        setExecuting((prev) => ({ ...prev, [entityType]: true }));
        setGlobalError(null);
        try {
            const result = await executeEntity(currentBatchId, entityType, approval.approvalId, effective);
            setExecutionResult(result);
            await refreshBatch(currentBatchId);
            await loadRows(currentBatchId, entityType, rowFilters[entityType], rowsByEntity[entityType]?.page ?? 1);
        } catch (error) {
            const summary = uiErrorSummary(error);
            setGlobalError(error);
            await refreshBatch(currentBatchId).catch(() => undefined);
            if (summary.status === 409 && summary.code === "EXECUTION_ALREADY_COMPLETED") {
                await loadRows(currentBatchId, entityType, rowFilters[entityType], rowsByEntity[entityType]?.page ?? 1).catch(() => undefined);
            }
        } finally {
            setExecuting((prev) => ({ ...prev, [entityType]: false }));
        }
    };

    const openBatch = async (batchId: string) => {
        setCurrentBatchId(batchId);
        setShowHistory(false);
        setExecutionResult(null);
        setDryRun(null);
        try {
            await refreshBatch(batchId);
            await Promise.all([
                loadRows(batchId, "project_documentation", {}, 1),
                loadRows(batchId, "backlog", {}, 1),
            ]);
        } catch (error) {
            setGlobalError(error);
        }
    };

    const clearSession = () => {
        if (passwordRef.current) passwordRef.current.value = "";
        setPassword("");
        setAuthError(null);
        setDryRun(null);
        setCurrentBatchId(null);
        setDetail(null);
        setExecutionResult(null);
        setGlobalError(null);
        setHistory(null);
    };

    const approval = (entityType: ImportEntityType) => approvalForEntity(detail, entityType);

    return (
        <div className="min-h-screen bg-neutral-50 p-4 md:p-8">
            <header className="flex flex-wrap items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black tracking-tight text-neutral-900">Project Import</h1>
                    <p className="mt-1 text-sm text-neutral-500">Dry Run → อนุมัติ → นำเข้าข้อมูล (ทีละ Entity)</p>
                </div>
                <div className="flex items-center gap-2">
                    {hasPassword && (
                        <>
                            <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
                                มีการยืนยันตัวตนในเซสชันนี้
                            </span>
                            <button
                                type="button"
                                onClick={() => setShowHistory((prev) => !prev)}
                                className="rounded-xl border border-neutral-200 bg-white px-4 py-2 text-xs font-bold text-neutral-700 hover:bg-neutral-100"
                            >
                                {showHistory ? "ซ่อนประวัติ" : "ประวัติการนำเข้า"}
                            </button>
                            <button
                                type="button"
                                onClick={clearSession}
                                className="rounded-xl border border-neutral-200 bg-white px-4 py-2 text-xs font-bold text-neutral-700 hover:bg-neutral-100"
                            >
                                ออกจากระบบ
                            </button>
                        </>
                    )}
                    <div className={`flex items-center gap-2 ${hasPassword ? "hidden" : ""}`}>
                        <label className="text-xs font-semibold text-neutral-500" htmlFor="agent-password">
                            Agent Password
                        </label>
                        <input
                            ref={passwordRef}
                            id="agent-password"
                            type="password"
                            defaultValue=""
                            autoComplete="off"
                            onInput={(event) => {
                                setPassword(event.currentTarget.value);
                                setAuthError(null);
                            }}
                            onChange={(event) => {
                                setPassword(event.currentTarget.value);
                                setAuthError(null);
                            }}
                            onFocus={() => effectivePassword()}
                            onBlur={() => effectivePassword()}
                            className="rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                            placeholder="********"
                        />
                        {password && (
                            <button
                                type="button"
                                onClick={() => {
                                    if (passwordRef.current) passwordRef.current.value = "";
                                    setPassword("");
                                }}
                                className="rounded-lg border border-neutral-200 px-3 py-2 text-xs font-bold text-neutral-600 hover:bg-neutral-100"
                            >
                                ล้าง
                            </button>
                        )}
                        {authError && <span className="text-xs text-red-600">{authError}</span>}
                    </div>
                </div>
            </header>

            <p className="mt-2 text-xs text-neutral-500">
                รหัสผ่านถูกเก็บในหน่วยความจำของหน้านี้เท่านั้น และจะหายไปเมื่อรีเฟรชหรือออกจากระบบ เป็น UI ภายในสำหรับ Agent Key ยังไม่ใช่ระบบยืนยันตัวตนแบบหลายผู้ใช้
            </p>

            {Boolean(globalError) && (
                <div className="mt-4">
                    <ImportErrorNotice error={globalError} />
                </div>
            )}

            <main className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
                <div className="space-y-6 lg:col-span-2">
                    {showHistory ? (
                        <>
                            <ImportHistoryList
                                data={history}
                                loading={historyLoading}
                                error={historyError}
                                onOpen={(batchId) => void openBatch(batchId)}
                                onRefresh={() => void refreshHistory()}
                            />
                            {currentBatchId && detail && (
                                <ImportBatchDetail detail={detail} onBack={() => setShowHistory(false)} />
                            )}
                        </>
                    ) : (
                        <>
                            <WorkbookUploadPanel
                                disabled={upload.uploading}
                                state={upload}
                                onChange={(file) => setUpload((prev) => ({ ...prev, file, error: null }))}
                                onError={(message) => setUpload((prev) => ({ ...prev, error: message }))}
                                onClear={() => setUpload((prev) => ({ ...prev, file: null, error: null }))}
                                onUpload={() => void handleUpload()}
                            />

                            {executionResult && <ExecutionResultPanel result={executionResult} />}

                            {dryRun && <DryRunSummary result={dryRun} />}

                            {currentBatchId && detail && (
                                <>
                                    <EntityReviewPanel
                                        entityType="project_documentation"
                                        entityLabel="Project Documentation"
                                        detail={detail}
                                        approval={approval("project_documentation")}
                                        rows={rowsByEntity.project_documentation}
                                        rowsLoading={rowsLoading.project_documentation}
                                        rowsError={rowsError.project_documentation}
                                        rowFilter={rowFilters.project_documentation}
                                        executing={executing.project_documentation}
                                        busy={busy}
                                        onRowFilterChange={(filter) => {
                                            setRowFilters((prev) => ({ ...prev, project_documentation: filter }));
                                            void loadRows(currentBatchId, "project_documentation", filter, 1);
                                        }}
                                        onRowPageChange={(page) => void loadRows(currentBatchId, "project_documentation", rowFilters.project_documentation, page)}
                                        onRowsRetry={() => void loadRows(currentBatchId, "project_documentation", rowFilters.project_documentation, rowsByEntity.project_documentation?.page ?? 1)}
                                        onApprove={() => setApproveTarget("project_documentation")}
                                        onReject={() => {
                                            setRejectReason("");
                                            setRejectTarget("project_documentation");
                                        }}
                                        onRevoke={() => setRevokeTarget("project_documentation")}
                                        onConfirmExecute={() => handleConfirmExecute("project_documentation")}
                                    />
                                    <EntityReviewPanel
                                        entityType="backlog"
                                        entityLabel="Backlog"
                                        detail={detail}
                                        approval={approval("backlog")}
                                        rows={rowsByEntity.backlog}
                                        rowsLoading={rowsLoading.backlog}
                                        rowsError={rowsError.backlog}
                                        rowFilter={rowFilters.backlog}
                                        executing={executing.backlog}
                                        busy={busy}
                                        onRowFilterChange={(filter) => {
                                            setRowFilters((prev) => ({ ...prev, backlog: filter }));
                                            void loadRows(currentBatchId, "backlog", filter, 1);
                                        }}
                                        onRowPageChange={(page) => void loadRows(currentBatchId, "backlog", rowFilters.backlog, page)}
                                        onRowsRetry={() => void loadRows(currentBatchId, "backlog", rowFilters.backlog, rowsByEntity.backlog?.page ?? 1)}
                                        onApprove={() => setApproveTarget("backlog")}
                                        onReject={() => {
                                            setRejectReason("");
                                            setRejectTarget("backlog");
                                        }}
                                        onRevoke={() => setRevokeTarget("backlog")}
                                        onConfirmExecute={() => handleConfirmExecute("backlog")}
                                    />
                                </>
                            )}
                        </>
                    )}
                </div>

                <aside className="space-y-4">
                    <div className="rounded-2xl border border-neutral-200 bg-white p-5">
                        <h2 className="text-sm font-black text-neutral-900">สถานะ Batch</h2>
                        {detail ? (
                            <dl className="mt-3 space-y-2 text-xs">
                                <div className="flex justify-between">
                                    <dt className="text-neutral-500">สถานะ</dt>
                                    <dd className="font-bold text-neutral-800">{detail.batchStatus}</dd>
                                </div>
                                <div className="flex justify-between">
                                    <dt className="text-neutral-500">Project Documentation</dt>
                                    <dd className="font-bold text-neutral-800">{detail.projectDocumentationStatus ?? "-"}</dd>
                                </div>
                                <div className="flex justify-between">
                                    <dt className="text-neutral-500">Backlog</dt>
                                    <dd className="font-bold text-neutral-800">{detail.backlogStatus ?? "-"}</dd>
                                </div>
                                <div className="flex justify-between">
                                    <dt className="text-neutral-500">Execution</dt>
                                    <dd className="font-bold text-neutral-800">{detail.executionAttempts.count} ครั้ง</dd>
                                </div>
                            </dl>
                        ) : (
                            <p className="mt-2 text-xs text-neutral-500">ยังไม่มี Batch ที่โหลด</p>
                        )}
                    </div>

                    <div className="rounded-2xl border border-neutral-200 bg-white p-5 text-xs leading-relaxed text-neutral-600">
                        <h2 className="text-sm font-black text-neutral-900">ข้อตกลงการใช้งาน</h2>
                        <ul className="mt-2 list-disc space-y-1 pl-4">
                            <li>อนุมัติทีละ Entity อย่างอิสระ</li>
                            <li>TTL การอนุมัติ 30 นาที</li>
                            <li>นำเข้าแบบ insert-only หนึ่ง transaction ต่อ Entity</li>
                            <li>ตรวจสอบข้อมูลซ้ำก่อนเขียนเสมอ</li>
                            <li>ไม่มีการเลือกแถวใน v1 — อนุมัติครอบคลุมทุกแถวใหม่</li>
                        </ul>
                    </div>
                </aside>
            </main>

            <Modal
                isOpen={approveTarget !== null}
                title="ยืนยันการอนุมัติ"
                onClose={() => setApproveTarget(null)}
                maxWidth="max-w-md"
                focusRestoreRef={approveButtonRef}
                focusTrap
            >
                <div className="space-y-3 text-sm text-neutral-700">
                    <p>
                        อนุมัติ <strong>{approveTarget === "project_documentation" ? "Project Documentation" : "Backlog"}</strong> ครอบคลุมแถวใหม่ทั้งหมด{" "}
                        <strong>{approveTarget ? countEligibleNewRows(rowsByEntity[approveTarget]) : 0}</strong> แถว
                    </p>
                    <p className="text-xs text-neutral-500">
                        การอนุมัติมีอายุ 30 นาที และไม่มีการนำเข้าอัตโนมัติหลังอนุมัติ
                    </p>
                    <div className="flex justify-end gap-2">
                        <button
                            type="button"
                            onClick={() => setApproveTarget(null)}
                            className="rounded-xl border border-neutral-200 px-4 py-2 text-sm font-bold text-neutral-700 hover:bg-neutral-50"
                        >
                            ยกเลิก
                        </button>
                        <button
                            type="button"
                            disabled={busy}
                            onClick={() => approveTarget && void handleApprove(approveTarget)}
                            className="rounded-xl bg-emerald-600 px-5 py-2 text-sm font-black text-white hover:bg-emerald-700 disabled:opacity-50"
                        >
                            {busy ? "กำลังอนุมัติ..." : "ยืนยันอนุมัติ"}
                        </button>
                    </div>
                </div>
            </Modal>

            <Modal
                isOpen={rejectTarget !== null}
                title="ไม่อนุมัติ (Reject)"
                onClose={() => setRejectTarget(null)}
                maxWidth="max-w-md"
                focusTrap
            >
                <div className="space-y-3 text-sm text-neutral-700">
                    <label className="block">
                        <span className="text-xs font-semibold text-neutral-500">เหตุผล (ไม่บังคับ, สูงสุด 200 ตัวอักษร)</span>
                        <textarea
                            value={rejectReason}
                            maxLength={200}
                            onChange={(event) => setRejectReason(event.target.value)}
                            rows={3}
                            className="mt-1 w-full rounded-xl border border-neutral-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                        <span className="mt-1 block text-right text-[11px] text-neutral-400">{rejectReason.length}/200</span>
                    </label>
                    <div className="flex justify-end gap-2">
                        <button
                            type="button"
                            onClick={() => setRejectTarget(null)}
                            className="rounded-xl border border-neutral-200 px-4 py-2 text-sm font-bold text-neutral-700 hover:bg-neutral-50"
                        >
                            ยกเลิก
                        </button>
                        <button
                            type="button"
                            disabled={busy}
                            onClick={() => rejectTarget && void handleReject(rejectTarget)}
                            className="rounded-xl bg-red-600 px-5 py-2 text-sm font-black text-white hover:bg-red-700 disabled:opacity-50"
                        >
                            {busy ? "กำลังดำเนินการ..." : "ยืนยันไม่อนุมัติ"}
                        </button>
                    </div>
                </div>
            </Modal>

            <Modal
                isOpen={revokeTarget !== null}
                title="เพิกถอนการอนุมัติ"
                onClose={() => setRevokeTarget(null)}
                maxWidth="max-w-md"
                focusTrap
            >
                <div className="space-y-3 text-sm text-neutral-700">
                    <p>
                        เพิกถอนการอนุมัติของ <strong>{revokeTarget === "project_documentation" ? "Project Documentation" : "Backlog"}</strong>?
                    </p>
                    <p className="text-xs text-neutral-500">หลังเพิกถอน จะไม่สามารถนำเข้า Entity นี้ได้จนกว่าจะอนุมัติใหม่ Entity อีกฝั่งไม่ได้รับผลกระทบ</p>
                    <div className="flex justify-end gap-2">
                        <button
                            type="button"
                            onClick={() => setRevokeTarget(null)}
                            className="rounded-xl border border-neutral-200 px-4 py-2 text-sm font-bold text-neutral-700 hover:bg-neutral-50"
                        >
                            ยกเลิก
                        </button>
                        <button
                            type="button"
                            disabled={busy}
                            onClick={() => revokeTarget && void handleRevoke(revokeTarget)}
                            className="rounded-xl bg-red-600 px-5 py-2 text-sm font-black text-white hover:bg-red-700 disabled:opacity-50"
                        >
                            {busy ? "กำลังดำเนินการ..." : "ยืนยันเพิกถอน"}
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
