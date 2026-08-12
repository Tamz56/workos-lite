"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { friendlyReviewError, postApproveOperation } from "./api";
import { approveLabel } from "./reviewState";
import type { ReviewDetail } from "./types";

type ApproveOperationModalProps = {
    open: boolean;
    operation: ReviewDetail;
    onClose: () => void;
    onSuccess: (message: string) => void;
    onRefetch: (message: string) => void;
    onSessionExpired: () => void;
};

function proposedFields(operation: ReviewDetail): Array<[string, unknown]> {
    const preview = (operation.preview ?? {}) as {
        proposed?: { fields?: Record<string, unknown> };
    };
    const fields = preview.proposed?.fields;
    if (fields && typeof fields === "object") {
        return Object.entries(fields);
    }
    const payload = (operation.payload ?? {}) as Record<string, unknown>;
    return Object.entries(payload);
}

export function ApproveOperationModal({
    open,
    operation,
    onClose,
    onSuccess,
    onRefetch,
    onSessionExpired,
}: ApproveOperationModalProps) {
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleApprove = async () => {
        if (submitting) return;
        setSubmitting(true);
        setError(null);
        const result = await postApproveOperation(operation.operationId, {
            expectedPreviewFingerprint: operation.previewFingerprint,
            expectedPayloadHash: operation.payloadHash,
            expectedContractVersion: operation.contractVersion,
        });
        setSubmitting(false);
        if (result.ok) {
            onClose();
            onSuccess("Approval issued. Valid for 30 minutes.");
            return;
        }
        if (result.status === 401) {
            onSessionExpired();
            return;
        }
        if (result.code === "OPS_APPROVAL_STALE_SNAPSHOT") {
            const message = friendlyReviewError(result.code);
            onClose();
            onRefetch(message);
            return;
        }
        setError(friendlyReviewError(result.code));
    };

    return (
        <Modal
            isOpen={open}
            title={approveLabel(operation.reviewState)}
            onClose={onClose}
            maxWidth="max-w-xl"
            focusTrap
            closeOnOutsideClick={!submitting}
            dismissible={!submitting}
        >
            <div className="space-y-4">
                <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4 text-sm">
                    <dl className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        <div>
                            <dt className="text-[10px] uppercase font-bold tracking-wider text-neutral-500">Operation</dt>
                            <dd className="mt-0.5 font-mono text-xs break-all">{operation.operationId}</dd>
                        </div>
                        <div>
                            <dt className="text-[10px] uppercase font-bold tracking-wider text-neutral-500">Target</dt>
                            <dd className="mt-0.5 text-xs break-all">
                                {operation.targetType} · {operation.targetRef}
                            </dd>
                        </div>
                    </dl>
                    <div className="mt-3">
                        <dt className="text-[10px] uppercase font-bold tracking-wider text-neutral-500">
                            Proposed change
                        </dt>
                        <dd className="mt-1 text-xs">
                            {proposedFields(operation).map(([key, value]) => (
                                <div key={key} className="flex gap-2 py-0.5">
                                    <span className="w-32 shrink-0 font-semibold text-neutral-600">{key}</span>
                                    <span className="break-all text-neutral-800">{String(value ?? "—")}</span>
                                </div>
                            ))}
                        </dd>
                    </div>
                </div>

                <p className="text-xs font-medium text-neutral-600">
                    Approval validity: 30 minutes
                </p>
                <p className="text-xs text-neutral-500">
                    Approving does not execute the operation. Execution happens only when a human operator explicitly chooses Execute while the approval is valid.
                </p>

                {error && (
                    <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs font-medium text-red-700">
                        {error}
                    </div>
                )}

                <div className="flex justify-end gap-2 pt-2">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={submitting}
                        className="rounded-lg border border-neutral-200 px-4 py-2 text-sm font-semibold text-neutral-600 hover:bg-neutral-50 disabled:opacity-50"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={handleApprove}
                        disabled={submitting}
                        className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50"
                    >
                        {submitting ? "Submitting…" : approveLabel(operation.reviewState)}
                    </button>
                </div>
            </div>
        </Modal>
    );
}
