export type McpBridgeErrorCode =
    | "MCP_CONFIG_MISSING"
    | "PROJECT_NOT_ALLOWED"
    | "INVALID_RESULT_ID"
    | "STALE_CORPUS"
    | "SOURCE_NOT_FOUND"
    | "READ1_REQUEST_FAILED"
    | "READ1_PROTOCOL_ERROR"
    | "INCOMPLETE_SOURCE";

export class McpBridgeError extends Error {
    readonly code: McpBridgeErrorCode;

    constructor(code: McpBridgeErrorCode, message: string) {
        super(message);
        this.name = "McpBridgeError";
        this.code = code;
    }
}

export function safeMcpError(error: unknown): { code: McpBridgeErrorCode; message: string } {
    if (error instanceof McpBridgeError) {
        return { code: error.code, message: error.message };
    }
    return { code: "READ1_REQUEST_FAILED", message: "The read-only source request failed" };
}
