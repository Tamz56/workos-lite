import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import React from "react";
import { ReviewStateBadge } from "@/components/operations-review/ReviewStateBadge";
import {
    REVIEW_STATE_LABEL,
    approveLabel,
    canApprove,
    canReject,
    canRevoke,
    formatDateTime,
    formatExpiryRemaining,
    shortHash,
} from "@/components/operations-review/reviewState";
import { friendlyReviewError } from "@/components/operations-review/api";
import type { ApprovalView, ReviewState } from "@/components/operations-review/types";

const STATES: ReviewState[] = [
    "awaiting_review",
    "approved",
    "approval_expired",
    "rejected",
    "revoked",
    "consumed",
];

const APPROVAL: ApprovalView = {
    id: "apr-1",
    operationId: "op-1",
    status: "approved",
    approvedAt: "2026-08-12T10:00:00.000Z",
    expiresAt: "2026-08-12T10:30:00.000Z",
    approverActor: "human:human-1",
    revokedAt: null,
    revokedBy: null,
    binding: {
        operationType: "backlog.create",
        targetType: "project",
        targetRef: "project-a",
        resolvedTargetId: "p1",
        payloadHash: "hash",
        contractVersion: "backlog.create.v1",
        previewFingerprint: "fp",
    },
    preview: {},
};

describe("Operations Review UI state helpers", () => {
    it("maps every review state to a human-readable label", () => {
        expect(REVIEW_STATE_LABEL).toEqual({
            awaiting_review: "Awaiting review",
            approved: "Approved",
            approval_expired: "Approval expired",
            rejected: "Rejected",
            revoked: "Revoked",
            consumed: "Consumed",
        });
    });

    it("shows approve only for reviewable non-terminal states on pending operations", () => {
        for (const state of ["awaiting_review", "approval_expired", "revoked"] as ReviewState[]) {
            expect(canApprove(state, "pending")).toBe(true);
            expect(canReject(state, "pending")).toBe(true);
        }
        for (const state of ["approved", "rejected", "consumed"] as ReviewState[]) {
            expect(canApprove(state, "pending")).toBe(false);
            expect(canReject(state, "pending")).toBe(false);
        }
        for (const state of STATES) {
            expect(canApprove(state, "executing")).toBe(false);
            expect(canApprove(state, "succeeded")).toBe(false);
            expect(canApprove(state, "failed")).toBe(false);
        }
    });

    it("shows revoke only for approved state with a displayed approval ID", () => {
        expect(canRevoke("approved", APPROVAL, "pending")).toBe(true);
        expect(canRevoke("approved", null, "pending")).toBe(false);
        expect(canRevoke("approved", undefined, "pending")).toBe(false);
        for (const state of ["awaiting_review", "approval_expired", "rejected", "revoked", "consumed"] as ReviewState[]) {
            expect(canRevoke(state, APPROVAL, "pending")).toBe(false);
        }
        expect(canRevoke("approved", APPROVAL, "executing")).toBe(false);
    });

    it("uses Approve again for expired and revoked states", () => {
        expect(approveLabel("awaiting_review")).toBe("Approve");
        expect(approveLabel("approval_expired")).toBe("Approve again");
        expect(approveLabel("revoked")).toBe("Approve again");
    });

    it("shortens hashes without changing the underlying value", () => {
        expect(shortHash("abc123def456789")).toBe("abc123…456789");
        expect(shortHash("short")).toBe("short");
    });

    it("derives TTL display from the server expiry timestamp only", () => {
        const now = new Date("2026-08-12T10:00:00.000Z").getTime();
        expect(formatExpiryRemaining("2026-08-12T10:30:00.000Z", now)).toBe("Expires in 00:30:00");
        expect(formatExpiryRemaining("2026-08-12T10:00:00.000Z", now)).toBe("Approval expired");
        expect(formatExpiryRemaining("not-a-date", now)).toBe("Approval expired");
    });

    it("formats display timestamps without throwing", () => {
        expect(formatDateTime("2026-08-12T10:00:00.000Z")).toContain("2026");
    });

    it("maps API errors to safe friendly messages", () => {
        expect(friendlyReviewError("OPS_APPROVAL_STALE_SNAPSHOT")).toContain("changed since it was loaded");
        expect(friendlyReviewError("OPS_APPROVAL_OPERATION_INTEGRITY_FAILED")).toContain("could not be verified");
        expect(friendlyReviewError("OPS_APPROVAL_REJECTED_TERMINAL")).toContain("already been rejected");
        expect(friendlyReviewError("OPS_APPROVAL_EXPIRED")).toContain("expired");
        expect(friendlyReviewError("OPS_APPROVAL_REVOKED")).toContain("revoked");
        expect(friendlyReviewError("OPS_APPROVAL_CONFLICT")).toContain("changed");
        expect(friendlyReviewError("OPS_APPROVAL_NOT_FOUND")).toContain("could not be found");
        expect(friendlyReviewError("SOME_UNKNOWN_CODE")).toBe("Unable to complete the request.");
    });
});

describe("Operations Review UI rendering", () => {
    it("renders a labeled badge for every review state without relying on color alone", () => {
        for (const state of STATES) {
            const html = renderToStaticMarkup(<ReviewStateBadge state={state} />);
            expect(html).toContain(REVIEW_STATE_LABEL[state]);
            expect(html).toContain("rounded-full");
        }
    });
});
