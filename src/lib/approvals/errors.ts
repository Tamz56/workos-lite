// ---------------------------------------------------------------------------
// WorkOS-Lite approvals typed errors + safe HTTP mapping
// AUTOMATION-001-P1C.1
// ---------------------------------------------------------------------------

import { HumanAuthError } from "@/lib/human-auth/errors";

export type ApprovalErrorCode =
    | "OPS_APPROVAL_AUTH_REQUIRED"
    | "OPS_APPROVAL_CSRF_REJECTED"
    | "OPS_APPROVAL_OPERATION_NOT_FOUND"
    | "OPS_APPROVAL_NOT_REVIEWABLE"
    | "OPS_APPROVAL_OPERATION_INTEGRITY_FAILED"
    | "OPS_APPROVAL_STALE_SNAPSHOT"
    | "OPS_APPROVAL_REJECTED_TERMINAL"
    | "OPS_APPROVAL_CONFLICT"
    | "OPS_APPROVAL_NOT_FOUND"
    | "OPS_APPROVAL_EXPIRED"
    | "OPS_APPROVAL_REVOKED"
    | "OPS_APPROVAL_INVALID_REQUEST"
    | "OPS_APPROVAL_INTERNAL_ERROR";

export class ApprovalError extends Error {
    code: ApprovalErrorCode;
    status: number;

    constructor(code: ApprovalErrorCode, message: string, status: number) {
        super(message);
        this.name = "ApprovalError";
        this.code = code;
        this.status = status;
    }
}

export type ApprovalApiError = {
    ok: false;
    error: { code: ApprovalErrorCode; message: string; status: number };
};

export function toApprovalErrorResponse(error: unknown): ApprovalApiError {
    if (error instanceof HumanAuthError) {
        if (error.code === "HUMAN_AUTH_CSRF_REJECTED") {
            return {
                ok: false,
                error: { code: "OPS_APPROVAL_CSRF_REJECTED", message: "Origin is not trusted", status: 403 },
            };
        }
        return {
            ok: false,
            error: { code: "OPS_APPROVAL_AUTH_REQUIRED", message: "Human authentication required", status: 401 },
        };
    }
    if (error instanceof ApprovalError) {
        return { ok: false, error: { code: error.code, message: error.message, status: error.status } };
    }
    return {
        ok: false,
        error: { code: "OPS_APPROVAL_INTERNAL_ERROR", message: "An unexpected error occurred", status: 500 },
    };
}
