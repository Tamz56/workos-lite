import type { ApprovalView, ReviewState } from "./types";

export const REVIEW_STATE_LABEL: Record<ReviewState, string> = {
    awaiting_review: "Awaiting review",
    approved: "Approved",
    approval_expired: "Approval expired",
    rejected: "Rejected",
    revoked: "Revoked",
    consumed: "Consumed",
};

export function isReviewableOperationStatus(status: string): boolean {
    return status === "pending";
}

export function canApprove(state: ReviewState, operationStatus: string): boolean {
    if (!isReviewableOperationStatus(operationStatus)) return false;
    return state === "awaiting_review" || state === "approval_expired" || state === "revoked";
}

export function canReject(state: ReviewState, operationStatus: string): boolean {
    if (!isReviewableOperationStatus(operationStatus)) return false;
    return state === "awaiting_review" || state === "approval_expired" || state === "revoked";
}

export function canRevoke(
    state: ReviewState,
    approval: ApprovalView | null | undefined,
    operationStatus: string,
): boolean {
    if (!isReviewableOperationStatus(operationStatus)) return false;
    if (state !== "approved") return false;
    return Boolean(approval?.id);
}

export function approveLabel(state: ReviewState): string {
    return state === "awaiting_review" ? "Approve" : "Approve again";
}

export function shortHash(value: string, head = 6, tail = 6): string {
    if (value.length <= head + tail + 1) return value;
    return `${value.slice(0, head)}…${value.slice(-tail)}`;
}

export function formatExpiryRemaining(expiresAt: string, now: number): string {
    const remainingMs = new Date(expiresAt).getTime() - now;
    if (!Number.isFinite(remainingMs) || remainingMs <= 0) return "Approval expired";
    const totalSeconds = Math.floor(remainingMs / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    const pad = (value: number) => String(value).padStart(2, "0");
    return `Expires in ${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

export function formatDateTime(value: string): string {
    return new Date(value).toLocaleString();
}
