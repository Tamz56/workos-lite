"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { fetchHumanOperationDetail } from "./api";
import { useHumanSession } from "./HumanSessionGate";
import { ApproveOperationModal } from "./ApproveOperationModal";
import { ExecuteOperationModal } from "./ExecuteOperationModal";
import { RejectOperationModal } from "./RejectOperationModal";
import { RevokeApprovalModal } from "./RevokeApprovalModal";
import { ReviewStateBadge } from "./ReviewStateBadge";
import { SignOutButton } from "./SignOutButton";
import {
    approveLabel,
    canExecute,
    canApprove,
    canReject,
    canRevoke,
    formatDateTime,
    formatExpiryRemaining,
    shortHash,
} from "./reviewState";
import type { ReviewDetail } from "./types";

type Notice = { type: "success" | "error"; text: string } | null;
type ActiveModal = "approve" | "reject" | "revoke" | "execute" | null;

function HashRow({ label, value }: { label: string; value: string }) {
    const [copied, setCopied] = useState(false);
    const copy = async () => {
        try {
            await navigator.clipboard.writeText(value);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
        } catch {
            // Clipboard unavailable; full value still visible via title attribute.
        }
    };
    return (
        <div className="flex flex-wrap items-center gap-2 py-1">
            <span className="w-40 shrink-0 text-[10px] font-bold uppercase tracking-wider text-neutral-500">{label}</span>
            <code title={value} className="min-w-0 flex-1 break-all font-mono text-xs text-neutral-700">
                {shortHash(value)}
            </code>
            <button
                type="button"
                onClick={copy}
                className="rounded-md border border-neutral-200 px-2 py-0.5 text-[10px] font-semibold text-neutral-500 hover:bg-neutral-50"
            >
                {copied ? "Copied" : "Copy"}
            </button>
        </div>
    );
}

function previewFields(detail: ReviewDetail): Array<[string, unknown]> {
    const preview = (detail.preview ?? {}) as {
        proposed?: { fields?: Record<string, unknown> };
    };
    const fields = preview.proposed?.fields;
    if (fields && typeof fields === "object") {
        return Object.entries(fields);
    }
    const payload = (detail.payload ?? {}) as Record<string, unknown>;
    return Object.entries(payload);
}

export function OperationReviewDetail({ operationId }: { operationId: string }) {
    const router = useRouter();
    const human = useHumanSession();
    const [detail, setDetail] = useState<ReviewDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [notice, setNotice] = useState<Notice>(null);
    const [activeModal, setActiveModal] = useState<ActiveModal>(null);
    const [nowTick, setNowTick] = useState(0);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    const load = useCallback(
        async (asRefresh: boolean) => {
            if (asRefresh) setRefreshing(true);
            const result = await fetchHumanOperationDetail(operationId);
            if (!asRefresh) setLoading(false);
            setRefreshing(false);
            if (result.ok) {
                setDetail(result.data.operation);
                setError(null);
                return;
            }
            if (result.status === 401) {
                setDetail(null);
                router.replace("/human/login");
                return;
            }
            setError("Unable to load this operation. Please try again.");
        },
        [operationId, router],
    );

    useEffect(() => {
        load(false);
    }, [load]);

    useEffect(() => {
        setNowTick(Date.now());
        if (!detail || detail.reviewState !== "approved" || !detail.approval) return;
        const timer = window.setInterval(() => setNowTick(Date.now()), 1000);
        return () => window.clearInterval(timer);
    }, [detail]);

    const handleSessionExpired = useCallback(() => {
        setDetail(null);
        setNotice(null);
        router.replace("/human/login");
    }, [router]);

    const handleExecuteSuccess = useCallback((replay: boolean) => {
        setNotice({
            type: "success",
            text: replay
                ? "This operation was already executed. Showing the committed result."
                : "Backlog item created successfully.",
        });
        setActiveModal(null);
        load(true);
    }, [load]);

    const handleMutationSuccess = useCallback((text: string) => {
        setNotice({ type: "success", text });
        load(true);
    }, [load]);

    const handleStaleOrConflict = useCallback((text: string) => {
        setNotice({ type: "error", text });
        setActiveModal(null);
        load(true);
    }, [load]);

    if (loading) {
        return (
            <div className="p-6 text-sm text-neutral-400" role="status" aria-live="polite">
                Loading operation…
            </div>
        );
    }

    if (error || !detail) {
        return (
            <div className="p-6">
                <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
                    {error ?? "Unable to load this operation."}
                </div>
                <button
                    type="button"
                    onClick={() => load(false)}
                    className="mt-3 rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-xs font-semibold text-neutral-600 hover:bg-neutral-50"
                >
                    Retry
                </button>
            </div>
        );
    }

    const showApprove = canApprove(detail.reviewState, detail.status);
    const showReject = canReject(detail.reviewState, detail.status);
    const showRevoke = canRevoke(detail.reviewState, detail.approval, detail.status);
    const showExecute =
        mounted &&
        nowTick > 0 &&
        canExecute(detail.status, detail.reviewState, detail.approval, nowTick);
    const ttlText =
        mounted && nowTick > 0 && detail.reviewState === "approved" && detail.approval
            ? formatExpiryRemaining(detail.approval.expiresAt, nowTick)
            : null;
    const preview = (detail.preview ?? {}) as { target?: { resolvedId?: string } };
    const resolvedTargetId =
        preview.target?.resolvedId ?? detail.approval?.binding.resolvedTargetId ?? "—";

    return (
        <div className="p-6">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h1 className="text-xl font-bold text-neutral-900">Operation Review</h1>
                    <p className="mt-0.5 text-xs text-neutral-500">
                        Human operator: {human?.displayName ?? "Unknown"}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => load(true)}
                        disabled={refreshing}
                        className="rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-xs font-semibold text-neutral-600 shadow-sm hover:bg-neutral-50 disabled:opacity-50"
                    >
                        {refreshing ? "Refreshing…" : "Refresh"}
                    </button>
                    <SignOutButton />
                </div>
            </div>

            {notice && (
                <div
                    role={notice.type === "success" ? "status" : "alert"}
                    className={`mb-4 rounded-lg border p-3 text-xs font-medium ${
                        notice.type === "success"
                            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                            : "border-amber-200 bg-amber-50 text-amber-700"
                    }`}
                >
                    {notice.text}
                </div>
            )}

            <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-3">
                    <ReviewStateBadge state={detail.reviewState} />
                    {ttlText && (
                        <span className={`text-xs font-semibold tabular-nums ${ttlText === "Approval expired" ? "text-amber-600" : "text-neutral-600"}`}>
                            {ttlText}
                        </span>
                    )}
                    {detail.status !== "pending" && (
                        <span className="text-xs text-neutral-400">
                            Operation status: {detail.status}
                        </span>
                    )}
                </div>

                <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
                    <h2 className="mb-3 text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                        Operation
                    </h2>
                    <dl className="grid grid-cols-1 gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
                        <div>
                            <dt className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">Operation ID</dt>
                            <dd className="mt-0.5 font-mono text-xs break-all">{detail.operationId}</dd>
                        </div>
                        <div>
                            <dt className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">Operation type</dt>
                            <dd className="mt-0.5 text-xs">{detail.operationType}</dd>
                        </div>
                        <div>
                            <dt className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">Requester</dt>
                            <dd className="mt-0.5 text-xs">
                                {detail.requesterActorType}:{detail.requesterActorId}
                            </dd>
                        </div>
                        <div>
                            <dt className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">Requested</dt>
                            <dd className="mt-0.5 text-xs">
                                {mounted ? formatDateTime(detail.requestedAt) : "—"}
                            </dd>
                        </div>
                        <div>
                            <dt className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">Target type</dt>
                            <dd className="mt-0.5 text-xs">{detail.targetType}</dd>
                        </div>
                        <div>
                            <dt className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">Target ref</dt>
                            <dd className="mt-0.5 font-mono text-xs break-all">{detail.targetRef}</dd>
                        </div>
                        <div>
                            <dt className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                                Resolved target ID
                            </dt>
                            <dd className="mt-0.5 font-mono text-xs break-all">{resolvedTargetId}</dd>
                        </div>
                    </dl>
                </div>

                <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
                    <h2 className="mb-3 text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                        Proposed change
                    </h2>
                    <div className="space-y-1">
                        {previewFields(detail).map(([key, value]) => (
                            <div key={key} className="flex flex-wrap gap-2 py-0.5 text-sm">
                                <span className="w-36 shrink-0 font-semibold text-neutral-600">{key}</span>
                                <span className="min-w-0 flex-1 break-all text-neutral-800">{String(value ?? "—")}</span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
                    <h2 className="mb-3 text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                        Review snapshot
                    </h2>
                    <HashRow label="Payload hash" value={detail.payloadHash} />
                    <HashRow label="Contract version" value={detail.contractVersion} />
                    <HashRow label="Preview fingerprint" value={detail.previewFingerprint} />
                </div>

                {detail.approval && (
                    <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
                        <h2 className="mb-3 text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                            Approval
                        </h2>
                        <dl className="grid grid-cols-1 gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
                            <div>
                                <dt className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">Approval ID</dt>
                                <dd className="mt-0.5 font-mono text-xs break-all">{detail.approval.id}</dd>
                            </div>
                            <div>
                                <dt className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">Status</dt>
                                <dd className="mt-0.5 text-xs">{detail.approval.status}</dd>
                            </div>
                            <div>
                                <dt className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">Approved at</dt>
                                <dd className="mt-0.5 text-xs">
                                    {mounted ? formatDateTime(detail.approval.approvedAt) : "—"}
                                </dd>
                            </div>
                            <div>
                                <dt className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">Expires at</dt>
                                <dd className="mt-0.5 text-xs">
                                    {mounted ? formatDateTime(detail.approval.expiresAt) : "—"}
                                </dd>
                            </div>
                            <div>
                                <dt className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">Approver</dt>
                                <dd className="mt-0.5 text-xs">{detail.approval.approverActor}</dd>
                            </div>
                        </dl>
                    </div>
                )}

                {detail.rejection && (
                    <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
                        <h2 className="mb-3 text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                            Rejection
                        </h2>
                        <dl className="grid grid-cols-1 gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
                            <div>
                                <dt className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">Event</dt>
                                <dd className="mt-0.5 font-mono text-xs break-all">{detail.rejection.eventId}</dd>
                            </div>
                            <div>
                                <dt className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">Rejected at</dt>
                                <dd className="mt-0.5 text-xs">
                                    {mounted ? formatDateTime(detail.rejection.rejectedAt) : "—"}
                                </dd>
                            </div>
                            <div>
                                <dt className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">Actor</dt>
                                <dd className="mt-0.5 text-xs">{detail.rejection.actor}</dd>
                            </div>
                            {detail.rejection.reason && (
                                <div className="sm:col-span-2">
                                    <dt className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">Reason</dt>
                                    <dd className="mt-0.5 text-xs whitespace-pre-wrap">{detail.rejection.reason}</dd>
                                </div>
                            )}
                        </dl>
                    </div>
                )}

                {detail.execution?.committed && (
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-5 shadow-sm">
                        <div className="mb-3 flex items-center gap-2">
                            <h2 className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">Execution</h2>
                            <span
                                role="status"
                                className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700"
                            >
                                <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-current" />
                                Executed
                            </span>
                        </div>
                        <dl className="grid grid-cols-1 gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
                            <div>
                                <dt className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                                    Execution attempt ID
                                </dt>
                                <dd className="mt-0.5 font-mono text-xs break-all">{detail.execution.committed.attemptId}</dd>
                            </div>
                            <div>
                                <dt className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">Approval ID</dt>
                                <dd className="mt-0.5 font-mono text-xs break-all">{detail.execution.committed.approvalId}</dd>
                            </div>
                            <div>
                                <dt className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">Target table</dt>
                                <dd className="mt-0.5 font-mono text-xs">{detail.execution.committed.targetTable}</dd>
                            </div>
                            <div>
                                <dt className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">Target record ID</dt>
                                <dd className="mt-0.5 font-mono text-xs break-all">{detail.execution.committed.targetRecordId}</dd>
                            </div>
                            <div>
                                <dt className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">Started at</dt>
                                <dd className="mt-0.5 text-xs">
                                    {mounted && detail.execution.committed.startedAt
                                        ? formatDateTime(detail.execution.committed.startedAt)
                                        : "—"}
                                </dd>
                            </div>
                            <div>
                                <dt className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">Finished at</dt>
                                <dd className="mt-0.5 text-xs">
                                    {mounted && detail.execution.committed.finishedAt
                                        ? formatDateTime(detail.execution.committed.finishedAt)
                                        : "—"}
                                </dd>
                            </div>
                        </dl>
                    </div>
                )}

                {!detail.execution?.committed && detail.execution?.latestFailure && (
                    <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-5 shadow-sm">
                        <div className="mb-3 flex items-center gap-2">
                            <h2 className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">Execution</h2>
                            <span
                                role={detail.status === "failed" ? "alert" : "status"}
                                className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-[11px] font-semibold text-amber-700"
                            >
                                <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-current" />
                                {detail.status === "failed" ? "Execution blocked" : "Not committed"}
                            </span>
                        </div>
                        <p className="text-xs font-medium text-neutral-700">
                            {detail.status === "failed"
                                ? "Execution was blocked and the operation can no longer be safely executed."
                                : "Last execution attempt did not commit."}
                        </p>
                        <dl className="mt-3 grid grid-cols-1 gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
                            <div>
                                <dt className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">Attempt ID</dt>
                                <dd className="mt-0.5 font-mono text-xs break-all">{detail.execution.latestFailure.attemptId}</dd>
                            </div>
                            <div>
                                <dt className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">Failure</dt>
                                <dd className="mt-0.5 text-xs">{detail.execution.latestFailure.failureCode}</dd>
                            </div>
                            <div>
                                <dt className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">Detail</dt>
                                <dd className="mt-0.5 text-xs">{detail.execution.latestFailure.safeFailureMessage}</dd>
                            </div>
                            <div>
                                <dt className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">Finished at</dt>
                                <dd className="mt-0.5 text-xs">
                                    {mounted && detail.execution.latestFailure.finishedAt
                                        ? formatDateTime(detail.execution.latestFailure.finishedAt)
                                        : "—"}
                                </dd>
                            </div>
                        </dl>
                    </div>
                )}

                <div className="flex flex-wrap gap-2 pt-1">
                    {showExecute && (
                        <button
                            type="button"
                            onClick={() => setActiveModal("execute")}
                            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
                        >
                            Execute operation
                        </button>
                    )}
                    {showApprove && (
                        <button
                            type="button"
                            onClick={() => setActiveModal("approve")}
                            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700"
                        >
                            {approveLabel(detail.reviewState)}
                        </button>
                    )}
                    {showReject && (
                        <button
                            type="button"
                            onClick={() => setActiveModal("reject")}
                            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-700"
                        >
                            Reject
                        </button>
                    )}
                    {showRevoke && detail.approval && (
                        <button
                            type="button"
                            onClick={() => setActiveModal("revoke")}
                            className="rounded-lg border border-neutral-300 bg-white px-4 py-2 text-sm font-semibold text-neutral-700 shadow-sm hover:bg-neutral-50"
                        >
                            Revoke approval
                        </button>
                    )}
                </div>
            </div>

            {activeModal === "approve" && (
                <ApproveOperationModal
                    open
                    operation={detail}
                    onClose={() => setActiveModal(null)}
                    onSuccess={handleMutationSuccess}
                    onRefetch={handleStaleOrConflict}
                    onSessionExpired={handleSessionExpired}
                />
            )}
            {activeModal === "reject" && (
                <RejectOperationModal
                    open
                    operation={detail}
                    onClose={() => setActiveModal(null)}
                    onSuccess={handleMutationSuccess}
                    onRefetch={handleStaleOrConflict}
                    onSessionExpired={handleSessionExpired}
                />
            )}
            {activeModal === "revoke" && detail.approval && (
                <RevokeApprovalModal
                    open
                    operation={detail}
                    approval={detail.approval}
                    onClose={() => setActiveModal(null)}
                    onSuccess={handleMutationSuccess}
                    onRefetch={handleStaleOrConflict}
                    onSessionExpired={handleSessionExpired}
                />
            )}
            {activeModal === "execute" && detail.approval && (
                <ExecuteOperationModal
                    open
                    operation={detail}
                    onClose={() => setActiveModal(null)}
                    onSuccess={handleExecuteSuccess}
                    onRefetch={handleStaleOrConflict}
                    onSessionExpired={handleSessionExpired}
                />
            )}
        </div>
    );
}
