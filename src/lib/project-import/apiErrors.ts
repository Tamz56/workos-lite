// ---------------------------------------------------------------------------
// WorkOS Project Field Sheet v1 — API error vocabulary
// WORKOS-SHEET-GATE-5
// ---------------------------------------------------------------------------

export type SafeErrorDetail = {
    code: string;
    message: string;
};

export type ProjectImportApiErrorResponse = {
    ok: false;
    error: {
        code: string;
        message: string;
        status: number;
        requestId?: string;
        details?: SafeErrorDetail[];
    };
};

export class ProjectImportApiError extends Error {
    code: string;
    status: number;
    details?: SafeErrorDetail[];

    constructor(code: string, message: string, status: number, details?: SafeErrorDetail[]) {
        super(message);
        this.name = "ProjectImportApiError";
        this.code = code;
        this.status = status;
        this.details = details;
    }
}

export function toProjectImportApiErrorResponse(error: unknown, requestId?: string): ProjectImportApiErrorResponse {
    if (error instanceof ProjectImportApiError) {
        return {
            ok: false,
            error: {
                code: error.code,
                message: error.message,
                status: error.status,
                ...(requestId ? { requestId } : {}),
                ...(error.details && error.details.length > 0 ? { details: error.details } : {}),
            },
        };
    }
    return {
        ok: false,
        error: {
            code: "IMPORT_INTERNAL_ERROR",
            message: "An unexpected error occurred",
            status: 500,
            ...(requestId ? { requestId } : {}),
        },
    };
}
