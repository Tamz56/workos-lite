// ---------------------------------------------------------------------------
// WorkOS-Lite — READ1A
// Read API errors + deterministic mapping
// ---------------------------------------------------------------------------
import { ProjectContextCuratorError } from "@/lib/project-curator/contracts";

export type ReadApiErrorCode =
    | "READ_AUTH_CONFIG_MISSING"
    | "READ_AUTH_FAILED"
    | "READ_AGENT_DISABLED"
    | "READ_SCOPE_REJECTED"
    | "PROJECT_NOT_FOUND"
    | "INVALID_CURSOR"
    | "CORPUS_CHANGED"
    | "INVALID_PAGE_SIZE"
    | "UNKNOWN_SOURCE"
    | "CROSS_PROJECT_SOURCE"
    | "UNSUPPORTED_SOURCE_KIND"
    | "DERIVED_CONTEXT_REJECTED"
    | "INVALID_OFFSET"
    | "INVALID_CHUNK_LIMIT"
    | "INTERNAL";

export class ReadApiError extends Error {
    readonly code: ReadApiErrorCode;
    readonly status: number;

    constructor(code: ReadApiErrorCode, message: string, status: number) {
        super(message);
        this.name = "ReadApiError";
        this.code = code;
        this.status = status;
    }
}

const CURATOR_TO_READ: Record<string, { code: ReadApiErrorCode; status: number }> = {
    PROJECT_NOT_FOUND: { code: "PROJECT_NOT_FOUND", status: 404 },
    UNSUPPORTED_SOURCE_KIND: { code: "UNSUPPORTED_SOURCE_KIND", status: 400 },
    UNKNOWN_SOURCE: { code: "UNKNOWN_SOURCE", status: 400 },
    CROSS_PROJECT_SOURCE: { code: "CROSS_PROJECT_SOURCE", status: 400 },
    DERIVED_CONTEXT_REJECTED: { code: "DERIVED_CONTEXT_REJECTED", status: 400 },
    INVALID_OFFSET: { code: "INVALID_OFFSET", status: 400 },
    INVALID_CHUNK_LIMIT: { code: "INVALID_CHUNK_LIMIT", status: 400 },
    MAX_SELECTED_SOURCES_EXCEEDED: { code: "INVALID_CHUNK_LIMIT", status: 400 },
    MAX_TOTAL_CHARS_EXCEEDED: { code: "INVALID_CHUNK_LIMIT", status: 400 },
};

/** Maps any thrown error to a deterministic ReadApiError (no secret leakage). */
export function toReadApiError(err: unknown): ReadApiError {
    if (err instanceof ReadApiError) return err;
    if (err instanceof ProjectContextCuratorError) {
        const mapped = CURATOR_TO_READ[err.code];
        if (mapped) return new ReadApiError(mapped.code, err.message, mapped.status);
        return new ReadApiError("INTERNAL", "Unexpected error", 500);
    }
    return new ReadApiError("INTERNAL", "Unexpected error", 500);
}

/** Builds a JSON error body; never exposes internal values. */
export function readErrorJson(err: unknown): { ok: false; error: { code: ReadApiErrorCode; message: string; status: number } } {
    const mapped = toReadApiError(err);
    return {
        ok: false,
        error: { code: mapped.code, message: mapped.message, status: mapped.status },
    };
}
