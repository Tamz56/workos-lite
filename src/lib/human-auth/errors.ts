// ---------------------------------------------------------------------------
// WorkOS-Lite Human Auth typed errors
// AUTOMATION-001-H2A
// Machine-readable codes + safe messages (no hash/DB/stack details).
// ---------------------------------------------------------------------------

export type HumanAuthErrorCode =
    | "HUMAN_AUTH_INVALID_CREDENTIALS"
    | "HUMAN_AUTH_SESSION_INVALID"
    | "HUMAN_AUTH_CSRF_REJECTED"
    | "HUMAN_AUTH_PASSWORD_TOO_SHORT"
    | "HUMAN_AUTH_BOOTSTRAP_ALREADY_EXISTS"
    | "HUMAN_AUTH_RESET_NO_OPERATOR";

export class HumanAuthError extends Error {
    code: HumanAuthErrorCode;
    status: number;

    constructor(code: HumanAuthErrorCode, message: string, status = 500) {
        super(message);
        this.name = "HumanAuthError";
        this.code = code;
        this.status = status;
    }
}

export function toHumanAuthError(error: unknown): { code: HumanAuthErrorCode | "HUMAN_AUTH_INTERNAL_ERROR"; message: string; status: number } {
    if (error instanceof HumanAuthError) {
        return { code: error.code, message: error.message, status: error.status };
    }
    return {
        code: "HUMAN_AUTH_INTERNAL_ERROR",
        message: "An unexpected error occurred",
        status: 500,
    };
}
