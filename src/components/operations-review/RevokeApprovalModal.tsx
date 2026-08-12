"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { friendlyReviewError, postRevokeApproval } from "./api";
import type { ApprovalView, ReviewDetail } from "./types";

type RevokeApprovalModalProps = {
    open: boolean;
    operation: ReviewDetail;
    approval: ApprovalView;
    onClose: () => void;
    onSuccess: (message: string) => void;
    onRefetch: (message: string) => void;
    onSessionExpired: () => void;
};

export function RevokeApprovalModal({
    open,
    operation,
    approval,
    onClose,
    onSuccess,
    onRefetch,
    onSessionExpired,
}: RevokeApprovalModalProps) {
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleRevoke = async () => {
        if (submitting) return;
        setSubmitting(true);
        setError(null);
        const result = await postRevokeApproval(operation.operationId, approval.id);
        setSubmitting(false);
        if (result.ok) {
            onClose();
            onSuccess("Approval revoked.");
            return;
        }
        if (result.status === 401) {
            onSessionExpired();
            return;
        }
        const message = friendlyReviewError(result.code);
        if (
            result.code === "OPS_APPROVAL_EXPIRED" ||
            result.code === "OPS_APPROVAL_REVOKED" ||
            result.code === "OPS_APPROVAL_NOT_FOUND" ||
            result.code === "OPS_APPROVAL_CONFLICT"
        ) {
            onClose();
            onRefetch(message);
            return;
        }
        setError(message);
    };

    return (
        <Modal
            isOpen={open}
            title="Revoke approval"
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
                            <dt className="text-[10px] uppercase font-bold tracking-wider text-neutral-500">Approval</dt>
                            <dd className="mt-0.5 font-mono text-xs break-all">{approval.id}</dd>
                        </div>
                        <div>
                            <dt className="text-[10px] uppercase font-bold tracking-wider text-neutral-500">Expires</dt>
                            <dd className="mt-0.5 text-xs">
                                {new Date(approval.expiresAt).toLocaleString()}
                            </dd>
                        </div>
                    </dl>
                </div>

                <p className="text-xs text-neutral-600">
                    Revoking this approval prevents future execution using this approval.
                </p>
                <p className="text-xs text-neutral-500">
                    It does not undo a business change that may already have been executed.
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
                        onClick={handleRevoke}
                        disabled={submitting}
                        className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-neutral-800 disabled:opacity-50"
                    >
                        {submitting ? "Submitting…" : "Revoke approval"}
                    </button>
                </div>
            </div>
        </Modal>
    );
}
