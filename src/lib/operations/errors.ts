// ---------------------------------------------------------------------------
// WorkOS-Lite Operations typed errors + safe HTTP mapping
// AUTOMATION-001-P1B.1
// ---------------------------------------------------------------------------

import { AgentAuthError } from "@/lib/agent-auth/agentAuthentication";

export type OpsErrorCode =
    | "OPS_AUTH_REQUIRED"
    | "OPS_FORBIDDEN"
    | "OPS_INVALID_OPERATION_TYPE"
    | "OPS_INVALID_ENVELOPE"
    | "OPS_INVALID_PAYLOAD"
    | "OPS_TARGET_NOT_FOUND"
    | "OPS_IDEMPOTENCY_CONFLICT"
    | "OPS_OPERATION_NOT_FOUND"
    | "OPS_INTERNAL_ERROR";

export class OpsError extends Error {
    code: OpsErrorCode;
    status: number;

    constructor(code: OpsErrorCode, message: string, status: number) {
        super(message);
        this.name = "OpsError";
        this.code = code;
        this.status = status;
    }
}

export type OpsApiError = {
    ok: false;
    error: { code: OpsErrorCode; message: string; status: number };
};

export function toOpsErrorResponse(error: unknown): OpsApiError {
    if (error instanceof AgentAuthError) {
        switch (error.code) {
            case "AGENT_AUTH_NOT_CONFIGURED":
                return {
                    ok: false,
                    error: { code: "OPS_INTERNAL_ERROR", message: "An unexpected error occurred", status: 500 },
                };
            case "AGENT_AUTH_REQUIRED":
                return {
                    ok: false,
                    error: { code: "OPS_AUTH_REQUIRED", message: "Authentication required", status: 401 },
                };
            case "AGENT_AUTH_FORBIDDEN":
                return {
                    ok: false,
                    error: { code: "OPS_FORBIDDEN", message: "Access denied", status: 403 },
                };
        }
    }
    if (error instanceof OpsError) {
        return { ok: false, error: { code: error.code, message: error.message, status: error.status } };
    }
    return {
        ok: false,
        error: { code: "OPS_INTERNAL_ERROR", message: "An unexpected error occurred", status: 500 },
    };
}
