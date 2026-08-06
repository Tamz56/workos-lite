// ---------------------------------------------------------------------------
// WorkOS Project Field Sheet v1 — Import UI typed error vocabulary
// WORKOS-SHEET-GATE-7B
// All messages are safe Thai user-facing text; codes remain machine-readable.
// ---------------------------------------------------------------------------

export type ProjectImportUiError = {
    kind: "api" | "network" | "validation";
    code: string;
    status: number | null;
    message: string;
    requestId?: string;
    cause?: unknown;
};

export class ProjectImportUiException extends Error {
    kind: "api" | "network" | "validation";
    code: string;
    status: number | null;
    requestId?: string;

    constructor(input: Omit<ProjectImportUiError, "message"> & { message: string }) {
        super(input.message);
        this.name = "ProjectImportUiException";
        this.kind = input.kind;
        this.code = input.code;
        this.status = input.status;
        this.requestId = input.requestId;
    }
}

export function uiMessageForError(error: unknown): string {
    if (error instanceof ProjectImportUiException) {
        return error.message;
    }
    return "เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ";
}

export function networkError(): ProjectImportUiException {
    return new ProjectImportUiException({
        kind: "network",
        code: "IMPORT_NETWORK_ERROR",
        status: null,
        message: "ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้ โปรดตรวจสอบเครือข่ายและลองอีกครั้ง",
    });
}

export function validationError(code: string, message: string): ProjectImportUiException {
    return new ProjectImportUiException({ kind: "validation", code, status: 400, message });
}

type ErrorEnvelope = {
    code?: unknown;
    message?: unknown;
    status?: unknown;
    requestId?: unknown;
};

function readEnvelope(body: unknown): ErrorEnvelope | null {
    if (body === null || typeof body !== "object") return null;
    const obj = body as Record<string, unknown>;
    if (obj.error && typeof obj.error === "object") {
        return obj.error as ErrorEnvelope;
    }
    if (typeof obj.code === "string" || typeof obj.message === "string" || typeof obj.status === "number") {
        return obj as ErrorEnvelope;
    }
    return null;
}

/**
 * Normalize any HTTP error response into a typed UI error. Supports both
 * `{ code, message, status }` and `{ error: { code, message, status } }`
 * envelopes, and falls back to `HTTP_<status>` when no safe code exists.
 * Never reduces a known HTTP failure to UNKNOWN.
 */
export function apiErrorFromBody(body: unknown, status: number): ProjectImportUiException {
    const envelope = readEnvelope(body);
    if (!envelope) {
        return new ProjectImportUiException({
            kind: "api",
            code: `HTTP_${status}`,
            status,
            message: "การดำเนินการไม่สำเร็จ",
        });
    }
    const code = typeof envelope.code === "string" && envelope.code.length > 0 ? envelope.code : `HTTP_${status}`;
    const responseStatus = typeof envelope.status === "number" ? envelope.status : status;
    const requestId = typeof envelope.requestId === "string" ? envelope.requestId : undefined;
    const message = typeof envelope.message === "string" && envelope.message.length > 0 ? envelope.message : "การดำเนินการไม่สำเร็จ";
    return new ProjectImportUiException({ kind: "api", code, status: responseStatus, requestId, message });
}

export function httpStatusError(status: number): ProjectImportUiException {
    return new ProjectImportUiException({
        kind: "api",
        code: `HTTP_${status}`,
        status,
        message: "การดำเนินการไม่สำเร็จ",
    });
}

export function invalidResponseError(status: number): ProjectImportUiException {
    return new ProjectImportUiException({
        kind: "api",
        code: "IMPORT_INVALID_RESPONSE",
        status,
        message: "เซิร์ฟเวอร์ส่งคำตอบที่อ่านไม่ได้",
    });
}

export function invalidSuccessDtoError(): ProjectImportUiException {
    return new ProjectImportUiException({
        kind: "api",
        code: "IMPORT_INVALID_SUCCESS_DTO",
        status: 200,
        message: "เซิร์ฟเวอร์ส่งข้อมูลที่ไม่สมบูรณ์",
    });
}

export function clientRuntimeError(cause: unknown): ProjectImportUiException {
    return new ProjectImportUiException({
        kind: "validation",
        code: "IMPORT_CLIENT_ERROR",
        status: null,
        message: "เกิดข้อผิดพลาดในการประมวลผลฝั่งผู้ใช้",
        cause,
    });
}

const STATUS_MESSAGES: Record<number, string> = {
    401: "การยืนยันตัวตนหมดอายุหรือไม่ถูกต้อง",
    403: "Agent Key นี้ไม่มีสิทธิ์ดำเนินการนี้",
    404: "ไม่พบ Batch หรือ Approval ที่ต้องการ",
    500: "ไม่สามารถดำเนินการนำเข้าได้",
};

export function uiStatusMessage(code: string, status: number): string {
    if (code === "IMPORT_EXECUTE_FORBIDDEN") {
        return "Agent Key นี้ไม่มีสิทธิ์ดำเนินการนี้ (ต้องมี scope project_import:execute)";
    }
    return STATUS_MESSAGES[status] ?? "การดำเนินการไม่สำเร็จ";
}

export function uiErrorSummary(error: unknown): { code: string; status: number | null; message: string; requestId?: string } {
    if (error instanceof ProjectImportUiException) {
        return {
            code: error.code,
            status: error.status,
            message: error.message,
            ...(error.requestId ? { requestId: error.requestId } : {}),
        };
    }
    return { code: "UNKNOWN", status: null, message: "เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ" };
}

export function safeErrorCode(error: unknown): string {
    return uiErrorSummary(error).code;
}
