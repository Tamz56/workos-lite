// ---------------------------------------------------------------------------
// WorkOS-Lite execution typed errors + safe HTTP mapping
// AUTOMATION-001-P1D.1
// Messages are safe: no SQL, stacks, payloads, or internal state.
// ---------------------------------------------------------------------------

import { HumanAuthError } from "@/lib/human-auth/errors";

export type ExecutionErrorCode =
    | "OPS_EXECUTION_AUTH_REQUIRED"
    | "OPS_EXECUTION_CSRF_REJECTED"
    | "OPS_EXECUTION_INVALID_REQUEST"
    | "OPS_EXECUTION_OPERATION_NOT_FOUND"
    | "OPS_EXECUTION_APPROVAL_NOT_FOUND"
    | "OPS_EXECUTION_NOT_EXECUTABLE"
    | "OPS_EXECUTION_STATE_INCONSISTENT"
    | "OPS_EXECUTION_APPROVAL_EXPIRED"
    | "OPS_EXECUTION_APPROVAL_REVOKED"
    | "OPS_EXECUTION_APPROVAL_CONSUMED"
    | "OPS_EXECUTION_OPERATION_INTEGRITY_FAILED"
    | "OPS_EXECUTION_APPROVAL_BINDING_MISMATCH"
    | "OPS_EXECUTION_TARGET_STALE"
    | "OPS_EXECUTION_CONFLICT"
    | "OPS_EXECUTION_ROLLED_BACK"
    | "OPS_EXECUTION_INTERNAL_ERROR";

export class ExecutionError extends Error {
    code: ExecutionErrorCode;
    status: number;
    retryable: boolean;

    constructor(code: ExecutionErrorCode, message: string, status: number, retryable: boolean) {
        super(message);
        this.name = "ExecutionError";
        this.code = code;
        this.status = status;
        this.retryable = retryable;
    }
}

export type ExecutionApiError = {
    ok: false;
    error: { code: ExecutionErrorCode; message: string; status: number; retryable: boolean };
};

export function toExecutionErrorResponse(error: unknown): ExecutionApiError {
    if (error instanceof HumanAuthError) {
        if (error.code === "HUMAN_AUTH_CSRF_REJECTED") {
            return {
                ok: false,
                error: { code: "OPS_EXECUTION_CSRF_REJECTED", message: "Origin is not trusted", status: 403, retryable: false },
            };
        }
        return {
            ok: false,
            error: { code: "OPS_EXECUTION_AUTH_REQUIRED", message: "Human authentication required", status: 401, retryable: false },
        };
    }
    if (error instanceof ExecutionError) {
        return {
            ok: false,
            error: { code: error.code, message: error.message, status: error.status, retryable: error.retryable },
        };
    }
    return {
        ok: false,
        error: { code: "OPS_EXECUTION_INTERNAL_ERROR", message: "An unexpected error occurred", status: 500, retryable: true },
    };
}

export function executionSafeMessage(code: ExecutionErrorCode): string {
    switch (code) {
        case "OPS_EXECUTION_AUTH_REQUIRED":
            return "Human authentication required";
        case "OPS_EXECUTION_CSRF_REJECTED":
            return "Origin is not trusted";
        case "OPS_EXECUTION_INVALID_REQUEST":
            return "Invalid execution request";
        case "OPS_EXECUTION_OPERATION_NOT_FOUND":
            return "Operation not found";
        case "OPS_EXECUTION_APPROVAL_NOT_FOUND":
            return "Approval not found";
        case "OPS_EXECUTION_NOT_EXECUTABLE":
            return "Operation is not executable";
        case "OPS_EXECUTION_STATE_INCONSISTENT":
            return "Operation state is inconsistent";
        case "OPS_EXECUTION_APPROVAL_EXPIRED":
            return "Approval has expired";
        case "OPS_EXECUTION_APPROVAL_REVOKED":
            return "Approval has been revoked";
        case "OPS_EXECUTION_APPROVAL_CONSUMED":
            return "Approval has already been consumed";
        case "OPS_EXECUTION_OPERATION_INTEGRITY_FAILED":
            return "Operation integrity verification failed";
        case "OPS_EXECUTION_APPROVAL_BINDING_MISMATCH":
            return "Approval binding no longer matches the operation";
        case "OPS_EXECUTION_TARGET_STALE":
            return "Target project could not be verified";
        case "OPS_EXECUTION_CONFLICT":
            return "Execution request conflicts with committed state";
        case "OPS_EXECUTION_ROLLED_BACK":
            return "Execution transaction rolled back";
        default:
            return "An unexpected error occurred";
    }
}
