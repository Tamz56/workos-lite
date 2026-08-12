import type {
    ApiErrorBody,
    ApprovalMutationResponse,
    ExecutionMutationResponse,
    OperationDetailResponse,
    OperationsListResponse,
    ReviewTokens,
    SessionResponse,
} from "./types";

export type ApiResult<T> =
    | { ok: true; data: T }
    | { ok: false; status: number; code: string; message: string; retryable?: boolean };

async function request<T>(url: string, init?: RequestInit): Promise<ApiResult<T>> {
    try {
        const res = await fetch(url, {
            credentials: "same-origin",
            ...init,
            headers: {
                "Content-Type": "application/json",
                ...init?.headers,
            },
        });
        const body = (await res.json().catch(() => null)) as
            | (T & { ok?: boolean })
            | ApiErrorBody
            | null;
        if (res.ok && body && (body as { ok?: boolean }).ok !== false) {
            return { ok: true, data: body as T };
        }
        const errorBody = body as ApiErrorBody | null;
        return {
            ok: false,
            status: res.status,
            code: errorBody?.error?.code ?? "UNKNOWN",
            message: errorBody?.error?.message ?? "Unable to complete the request.",
            retryable: errorBody?.error?.retryable,
        };
    } catch {
        return { ok: false, status: 0, code: "NETWORK_ERROR", message: "Unable to complete the request." };
    }
}

export function fetchHumanSession(): Promise<ApiResult<SessionResponse>> {
    return request<SessionResponse>("/api/human-auth/session");
}

export function fetchHumanOperations(): Promise<ApiResult<OperationsListResponse>> {
    return request<OperationsListResponse>("/api/human/operations");
}

export function fetchHumanOperationDetail(operationId: string): Promise<ApiResult<OperationDetailResponse>> {
    return request<OperationDetailResponse>(`/api/human/operations/${encodeURIComponent(operationId)}`);
}

export function postHumanLogin(password: string): Promise<ApiResult<{ ok: true }>> {
    return request<{ ok: true }>("/api/human-auth/login", {
        method: "POST",
        body: JSON.stringify({ password }),
    });
}

export function postHumanLogout(): Promise<ApiResult<{ ok: true }>> {
    return request<{ ok: true }>("/api/human-auth/logout", {
        method: "POST",
        body: JSON.stringify({}),
    });
}

export function postApproveOperation(
    operationId: string,
    tokens: ReviewTokens,
): Promise<ApiResult<ApprovalMutationResponse>> {
    return request<ApprovalMutationResponse>(`/api/human/operations/${encodeURIComponent(operationId)}/approve`, {
        method: "POST",
        body: JSON.stringify(tokens),
    });
}

export function postRejectOperation(
    operationId: string,
    tokens: ReviewTokens,
    reason?: string | null,
): Promise<ApiResult<ApprovalMutationResponse>> {
    const body: Record<string, unknown> = { ...tokens };
    if (typeof reason === "string" && reason.trim().length > 0) {
        body.reason = reason.trim();
    }
    return request<ApprovalMutationResponse>(`/api/human/operations/${encodeURIComponent(operationId)}/reject`, {
        method: "POST",
        body: JSON.stringify(body),
    });
}

export function postRevokeApproval(
    operationId: string,
    approvalId: string,
): Promise<ApiResult<ApprovalMutationResponse>> {
    return request<ApprovalMutationResponse>(`/api/human/operations/${encodeURIComponent(operationId)}/revoke`, {
        method: "POST",
        body: JSON.stringify({ approvalId }),
    });
}

export function postExecuteOperation(
    operationId: string,
    approvalId: string,
): Promise<ApiResult<ExecutionMutationResponse>> {
    return request<ExecutionMutationResponse>(`/api/human/operations/${encodeURIComponent(operationId)}/execute`, {
        method: "POST",
        body: JSON.stringify({ approvalId }),
    });
}

export function friendlyExecutionError(code: string): string {
    switch (code) {
        case "OPS_EXECUTION_APPROVAL_EXPIRED":
            return "This approval has expired. Review and approve the operation again before executing.";
        case "OPS_EXECUTION_APPROVAL_REVOKED":
            return "This approval has been revoked. Review and approve the operation again before executing.";
        case "OPS_EXECUTION_APPROVAL_CONSUMED":
            return "This approval has already been consumed. The operation status has been refreshed.";
        case "OPS_EXECUTION_TARGET_STALE":
            return "Execution was blocked because the approved target no longer matches the current project.";
        case "OPS_EXECUTION_APPROVAL_BINDING_MISMATCH":
        case "OPS_EXECUTION_OPERATION_INTEGRITY_FAILED":
            return "Execution was blocked because the stored operation no longer matches the approved review snapshot.";
        case "OPS_EXECUTION_ROLLED_BACK":
            return "The execution did not commit. The latest operation state has been refreshed.";
        case "OPS_EXECUTION_INTERNAL_ERROR":
            return "The execution could not be completed. The latest operation state has been refreshed.";
        case "OPS_EXECUTION_CONFLICT":
            return "The execution state changed. Review the refreshed operation before taking another action.";
        default:
            return "Unable to complete the request.";
    }
}

export function friendlyReviewError(code: string): string {
    switch (code) {
        case "OPS_APPROVAL_STALE_SNAPSHOT":
            return "This operation changed since it was loaded. Review the latest version before deciding.";
        case "OPS_APPROVAL_OPERATION_INTEGRITY_FAILED":
            return "Review unavailable. The stored operation could not be verified.";
        case "OPS_APPROVAL_REJECTED_TERMINAL":
            return "This operation has already been rejected and cannot be approved.";
        case "OPS_APPROVAL_EXPIRED":
            return "This approval has expired.";
        case "OPS_APPROVAL_REVOKED":
            return "This approval has already been revoked.";
        case "OPS_APPROVAL_CONFLICT":
            return "The approval state changed. Refresh to review the latest version before deciding.";
        case "OPS_APPROVAL_NOT_FOUND":
            return "The requested approval could not be found.";
        default:
            return "Unable to complete the request.";
    }
}
