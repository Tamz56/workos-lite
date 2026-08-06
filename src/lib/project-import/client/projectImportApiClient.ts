// ---------------------------------------------------------------------------
// WorkOS Project Field Sheet v1 — Import UI API client
// WORKOS-SHEET-GATE-7B
// Narrow client that calls only the approved Gate 5 / Gate 7A endpoints.
// The agent password is supplied per call from React memory; it is never
// persisted, logged, or placed in URLs.
// ---------------------------------------------------------------------------

import {
    apiErrorFromBody,
    httpStatusError,
    invalidResponseError,
    invalidSuccessDtoError,
    networkError,
} from "./projectImportUiErrors";
import { ProjectImportUiException } from "./projectImportUiErrors";
import type {
    UiApprovalState,
    UiBatchDetail,
    UiBatchListItem,
    UiBatchRowItem,
    UiDryRunResponse,
    UiExecuteResult,
    UiPaginated,
} from "./projectImportUiTypes";

const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

export type ImportRowQuery = {
    page: number;
    pageSize?: number;
    entityType?: "project_documentation" | "backlog";
    dryRunStatus?: string;
    parserStatus?: string;
    proposedOperation?: string;
    projectSlug?: string;
    hasErrors?: boolean;
    hasWarnings?: boolean;
};

function authHeaders(password: string): Record<string, string> {
    return { "x-agent-password": password };
}

type SuccessDtoValidator<T> = (body: unknown) => T;

async function readBodyText(response: Response): Promise<string> {
    try {
        return await response.text();
    } catch {
        throw httpStatusError(response.status);
    }
}

function parseJsonText<T>(text: string, response: Response, validator: SuccessDtoValidator<T>): T {
    let body: unknown;
    try {
        body = JSON.parse(text);
    } catch {
        throw response.ok ? invalidResponseError(response.status) : httpStatusError(response.status);
    }
    if (!response.ok) {
        throw apiErrorFromBody(body, response.status);
    }
    try {
        return validator(body);
    } catch (error) {
        throw error instanceof ProjectImportUiException ? error : invalidSuccessDtoError();
    }
}

async function fetchJson<T>(url: string, password: string, init: RequestInit = {}, validator: SuccessDtoValidator<T>): Promise<T> {
    try {
        if (process.env.NODE_ENV !== "production") {
            const headers = new Headers(init.headers);
            // Safe diagnostic: presence only, never the password value.
            console.debug(
                "[project-import] request headerPresent:",
                headers.has("x-agent-password"),
                "url:",
                url,
            );
        }
        const response = await fetch(url, init);
        if (process.env.NODE_ENV !== "production") {
            console.debug(
                "[project-import] responseReceived: true",
                "status:",
                response.status,
                "contentType:",
                response.headers.get("content-type"),
            );
        }
        const text = await readBodyText(response);
        return parseJsonText<T>(text, response, validator);
    } catch (error) {
        if (error instanceof ProjectImportUiException) throw error;
        if (error instanceof TypeError) {
            // Any fetch rejection (regardless of browser error wording) is a
            // network failure, never a generic UNKNOWN.
            throw networkError();
        }
        throw error;
    }
}

function isValidDryRunResponse(body: unknown): body is UiDryRunResponse {
    if (body === null || typeof body !== "object") return false;
    const obj = body as Record<string, unknown>;
    return typeof obj.batchId === "string" && typeof obj.dryRunId === "string" && typeof obj.createdAt === "string";
}

function isValidPaginatedList(body: unknown): boolean {
    if (body === null || typeof body !== "object") return false;
    const obj = body as Record<string, unknown>;
    return Array.isArray(obj.items) && typeof obj.page === "number" && typeof obj.pageSize === "number";
}

function isValidBatchDetail(body: unknown): boolean {
    if (body === null || typeof body !== "object") return false;
    const obj = body as Record<string, unknown>;
    return typeof obj.id === "string" && Array.isArray(obj.approvals) && typeof obj.executionAttempts === "object";
}

function isValidApprovalEntities(body: unknown): boolean {
    if (body === null || typeof body !== "object") return false;
    return Array.isArray((body as Record<string, unknown>).entities);
}

function isValidExecuteResult(body: unknown): boolean {
    if (body === null || typeof body !== "object") return false;
    const obj = body as Record<string, unknown>;
    const data = obj.data as Record<string, unknown> | undefined;
    return obj.ok === true && Boolean(data && typeof data.executionAttemptId === "string" && typeof data.batchId === "string");
}

function isValidApprovalAction(body: unknown): boolean {
    if (body === null || typeof body !== "object") return false;
    const obj = body as Record<string, unknown>;
    return obj.ok === true && typeof obj.approvalId === "string" && typeof obj.approvalStatus === "string";
}

export function validateUploadFile(file: File): string | null {
    if (!file.name.toLowerCase().endsWith(".xlsx")) {
        return "รองรับเฉพาะไฟล์ .xlsx เท่านั้น";
    }
    if (file.size > MAX_UPLOAD_BYTES) {
        return "ไฟล์มีขนาดเกิน 25 MB";
    }
    return null;
}

export function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export async function createDryRun(file: File, password: string): Promise<UiDryRunResponse> {
    const form = new FormData();
    form.append("file", file);
    return fetchJson<UiDryRunResponse>("/api/project-import/dry-runs", password, {
        method: "POST",
        headers: authHeaders(password),
        body: form,
    }, (body) => {
        if (!isValidDryRunResponse(body)) throw invalidSuccessDtoError();
        return body;
    });
}

export async function listBatches(password: string, page = 1, pageSize = 10): Promise<UiPaginated<UiBatchListItem>> {
    return fetchJson<UiPaginated<UiBatchListItem>>(`/api/project-import/batches?page=${page}&pageSize=${pageSize}`, password, {
        headers: authHeaders(password),
        cache: "no-store",
    }, (body) => {
        if (!isValidPaginatedList(body)) throw invalidSuccessDtoError();
        return body as UiPaginated<UiBatchListItem>;
    });
}

export async function getBatchDetail(batchId: string, password: string): Promise<UiBatchDetail> {
    return fetchJson<UiBatchDetail>(`/api/project-import/batches/${batchId}`, password, {
        headers: authHeaders(password),
        cache: "no-store",
    }, (body) => {
        if (!isValidBatchDetail(body)) throw invalidSuccessDtoError();
        return body as UiBatchDetail;
    });
}

export async function listRows(batchId: string, password: string, query: ImportRowQuery): Promise<UiPaginated<UiBatchRowItem>> {
    const params = new URLSearchParams({ page: String(query.page), pageSize: String(query.pageSize ?? 25) });
    if (query.entityType) params.set("entityType", query.entityType);
    if (query.dryRunStatus) params.set("dryRunStatus", query.dryRunStatus);
    if (query.parserStatus) params.set("parserStatus", query.parserStatus);
    if (query.proposedOperation) params.set("proposedOperation", query.proposedOperation);
    if (query.projectSlug) params.set("projectSlug", query.projectSlug);
    if (query.hasErrors !== undefined) params.set("hasErrors", query.hasErrors ? "1" : "0");
    if (query.hasWarnings !== undefined) params.set("hasWarnings", query.hasWarnings ? "1" : "0");
    return fetchJson<UiPaginated<UiBatchRowItem>>(`/api/project-import/batches/${batchId}/rows?${params.toString()}`, password, {
        headers: authHeaders(password),
        cache: "no-store",
    }, (body) => {
        if (!isValidPaginatedList(body)) throw invalidSuccessDtoError();
        return body as UiPaginated<UiBatchRowItem>;
    });
}

export async function getApprovals(batchId: string, password: string): Promise<UiApprovalState[]> {
    const body = await fetchJson<{ entities: UiApprovalState[] }>(`/api/project-import/batches/${batchId}/approvals`, password, {
        headers: authHeaders(password),
        cache: "no-store",
    }, (value) => {
        if (!isValidApprovalEntities(value)) throw invalidSuccessDtoError();
        return value as { entities: UiApprovalState[] };
    });
    return body.entities;
}

async function postJson<T>(url: string, password: string, body: unknown, validator: SuccessDtoValidator<T>): Promise<T> {
    return fetchJson<T>(url, password, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders(password) },
        body: JSON.stringify(body),
    }, validator);
}

export async function approveEntity(batchId: string, entityType: string, password: string): Promise<{ approvalId: string; approvalStatus: string }> {
    return postJson<{ ok: true; approvalId: string; approvalStatus: string }>(
        `/api/project-import/batches/${batchId}/approvals/${entityType}/approve`,
        password,
        {},
        (body) => {
            if (!isValidApprovalAction(body)) throw invalidSuccessDtoError();
            return body as { ok: true; approvalId: string; approvalStatus: string };
        },
    );
}

export async function rejectEntity(batchId: string, entityType: string, password: string, reason: string | null): Promise<{ approvalId: string; approvalStatus: string }> {
    return postJson<{ ok: true; approvalId: string; approvalStatus: string }>(
        `/api/project-import/batches/${batchId}/approvals/${entityType}/reject`,
        password,
        { reason },
        (body) => {
            if (!isValidApprovalAction(body)) throw invalidSuccessDtoError();
            return body as { ok: true; approvalId: string; approvalStatus: string };
        },
    );
}

export async function revokeEntity(batchId: string, entityType: string, password: string): Promise<{ approvalId: string; approvalStatus: string }> {
    return postJson<{ ok: true; approvalId: string; approvalStatus: string }>(
        `/api/project-import/batches/${batchId}/approvals/${entityType}/revoke`,
        password,
        {},
        (body) => {
            if (!isValidApprovalAction(body)) throw invalidSuccessDtoError();
            return body as { ok: true; approvalId: string; approvalStatus: string };
        },
    );
}

export async function executeEntity(
    batchId: string,
    entityType: string,
    approvalId: string,
    password: string,
): Promise<UiExecuteResult> {
    const body = await postJson<{ ok: true; data: UiExecuteResult }>(
        `/api/project-import/batches/${batchId}/approvals/${entityType}/execute`,
        password,
        { approvalId },
        (body) => {
            if (!isValidExecuteResult(body)) throw invalidSuccessDtoError();
            return body as { ok: true; data: UiExecuteResult };
        },
    );
    return body.data;
}
