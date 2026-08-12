"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { friendlyReviewError, postRejectOperation } from "./api";
import type { ReviewDetail } from "./types";

const REASON_MAX_LENGTH = 200;

type RejectOperationModalProps = {
    open: boolean;
    operation: ReviewDetail;
    onClose: () => void;
    onSuccess: (message: string) => void;
    onRefetch: (message: string) => void;
    onSessionExpired: () => void;
};

export function RejectOperationModal({
    open,
    operation,
    onClose,
    onSuccess,
    onRefetch,
    onSessionExpired,
}: RejectOperationModalProps) {
    const [reason, setReason] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleReject = async () => {
        if (submitting) return;
        setSubmitting(true);
        setError(null);
        const result = await postRejectOperation(
            operation.operationId,
            {
                expectedPreviewFingerprint: operation.previewFingerprint,
                expectedPayloadHash: operation.payloadHash,
                expectedContractVersion: operation.contractVersion,
            },
            reason,
        );
        setSubmitting(false);
        if (result.ok) {
            onClose();
            onSuccess("Operation rejected.");
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
            title="Reject operation"
            onClose={onClose}
            maxWidth="max-w-xl"
            focusTrap
            closeOnOutsideClick={!submitting}
            dismissible={!submitting}
        >
            <div className="space-y-4">
                <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-800">
                    Rejecting this operation is terminal. A new operation request will be required for future review.
                </div>

                <div className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between">
                        <label
                            htmlFor="reject-reason"
                            className="text-[10px] uppercase font-bold tracking-wider text-neutral-500 ml-1"
                        >
                            Reason (optional)
                        </label>
                        <span className="text-[10px] font-semibold text-neutral-400 tabular-nums">
                            {reason.length} / {REASON_MAX_LENGTH}
                        </span>
                    </div>
                    <textarea
                        id="reject-reason"
                        value={reason}
                        onChange={(event) => setReason(event.target.value)}
                        maxLength={REASON_MAX_LENGTH}
                        rows={4}
                        placeholder="Optional note for the requester…"
                        className="w-full resize-y rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm outline-none focus:border-red-400 focus:ring-1 focus:ring-red-400"
                    />
                </div>

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
                        onClick={handleReject}
                        disabled={submitting}
                        className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-700 disabled:opacity-50"
                    >
                        {submitting ? "Submitting…" : "Reject operation"}
                    </button>
                </div>
            </div>
        </Modal>
    );
}
