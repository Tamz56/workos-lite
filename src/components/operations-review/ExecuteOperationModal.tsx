"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { friendlyExecutionError, postExecuteOperation } from "./api";
import type { ReviewDetail } from "./types";

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

export function ExecuteOperationModalContent({
    operation,
    submitting = false,
    error = null,
    onExecute,
    onCancel,
}: {
    operation: ReviewDetail;
    submitting?: boolean;
    error?: string | null;
    onExecute?: () => void;
    onCancel?: () => void;
}) {
    return (
        <div className="space-y-4">
            <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4 text-sm">
                <dl className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <div>
                        <dt className="text-[10px] uppercase font-bold tracking-wider text-neutral-500">Operation ID</dt>
                        <dd className="mt-0.5 font-mono text-xs break-all">{operation.operationId}</dd>
                    </div>
                    <div>
                        <dt className="text-[10px] uppercase font-bold tracking-wider text-neutral-500">Operation type</dt>
                        <dd className="mt-0.5 text-xs">{operation.operationType}</dd>
                    </div>
                    <div>
                        <dt className="text-[10px] uppercase font-bold tracking-wider text-neutral-500">Target type</dt>
                        <dd className="mt-0.5 text-xs">{operation.targetType}</dd>
                    </div>
                    <div>
                        <dt className="text-[10px] uppercase font-bold tracking-wider text-neutral-500">Target ref</dt>
                        <dd className="mt-0.5 font-mono text-xs break-all">{operation.targetRef}</dd>
                    </div>
                    <div className="sm:col-span-2">
                        <dt className="text-[10px] uppercase font-bold tracking-wider text-neutral-500">Approval ID</dt>
                        <dd className="mt-0.5 font-mono text-xs break-all">{operation.approval?.id ?? "—"}</dd>
                    </div>
                </dl>
                <div className="mt-3">
                    <dt className="text-[10px] uppercase font-bold tracking-wider text-neutral-500">Proposed change</dt>
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

            <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm font-medium text-blue-900">
                This action will create the backlog item in WorkOS.
            </div>
            <p className="text-xs text-neutral-600">
                The operation will be executed exactly as approved. The payload cannot be changed here.
            </p>
            <p className="text-xs text-neutral-500">
                The approval is consumed only if the operation commits successfully.
            </p>

            {error && (
                <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs font-medium text-red-700">
                    {error}
                </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
                <button
                    type="button"
                    onClick={onCancel}
                    disabled={submitting}
                    className="rounded-lg border border-neutral-200 px-4 py-2 text-sm font-semibold text-neutral-600 hover:bg-neutral-50 disabled:opacity-50"
                >
                    Cancel
                </button>
                <button
                    type="button"
                    onClick={onExecute}
                    disabled={submitting}
                    className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50"
                >
                    {submitting ? "Executing…" : "Execute operation"}
                </button>
            </div>
        </div>
    );
}

type ExecuteOperationModalProps = {
    open: boolean;
    operation: ReviewDetail;
    onClose: () => void;
    onSuccess: (replay: boolean) => void;
    onRefetch: (message: string) => void;
    onSessionExpired: () => void;
};

export function ExecuteOperationModal({
    open,
    operation,
    onClose,
    onSuccess,
    onRefetch,
    onSessionExpired,
}: ExecuteOperationModalProps) {
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleExecute = async () => {
        if (submitting || !operation.approval) return;
        setSubmitting(true);
        setError(null);
        // Exact approval issuance currently displayed; never falls back.
        const result = await postExecuteOperation(operation.operationId, operation.approval.id);
        setSubmitting(false);
        if (result.ok) {
            onClose();
            onSuccess(result.data.replay);
            return;
        }
        if (result.status === 401) {
            onSessionExpired();
            return;
        }
        if (result.status === 0) {
            onClose();
            onRefetch("Connection interrupted. The operation status has been refreshed before any further execution attempt.");
            return;
        }
        const message = friendlyExecutionError(result.code);
        onClose();
        onRefetch(message);
    };

    return (
        <Modal
            isOpen={open}
            title="Execute operation"
            onClose={onClose}
            maxWidth="max-w-xl"
            focusTrap
            closeOnOutsideClick={!submitting}
            dismissible={!submitting}
        >
            <ExecuteOperationModalContent
                operation={operation}
                submitting={submitting}
                error={error}
                onExecute={handleExecute}
                onCancel={onClose}
            />
        </Modal>
    );
}
