// ---------------------------------------------------------------------------
// WorkOS Project Field Sheet v1 — API route helpers
// WORKOS-SHEET-GATE-5
// ---------------------------------------------------------------------------

import type { NextRequest } from "next/server";
import { ProjectImportApiError, toProjectImportApiErrorResponse } from "./apiErrors";

export function requestIdFrom(request: NextRequest): string | undefined {
    return request.headers.get("x-request-id")?.trim() || undefined;
}

export function parsePagination(
    searchParams: URLSearchParams,
    limits: { defaultPageSize?: number; maxPageSize?: number } = {},
): { page: number; pageSize: number } {
    const defaultPageSize = limits.defaultPageSize ?? 25;
    const maxPageSize = limits.maxPageSize ?? 100;
    const pageRaw = searchParams.get("page") ?? "1";
    const pageSizeRaw = searchParams.get("pageSize") ?? String(defaultPageSize);
    const page = Number(pageRaw);
    const pageSize = Number(pageSizeRaw);
    if (!Number.isInteger(page) || page < 1 || !Number.isInteger(pageSize) || pageSize < 1 || pageSize > maxPageSize) {
        throw new ProjectImportApiError("INVALID_QUERY_PARAMETER", "Invalid pagination parameters", 400);
    }
    return { page, pageSize };
}

export function parseOptionalInt(searchParams: URLSearchParams, key: string): number | undefined {
    const raw = searchParams.get(key);
    if (raw === null) return undefined;
    const value = Number(raw);
    if (!Number.isInteger(value) || value < 1) {
        throw new ProjectImportApiError("INVALID_QUERY_PARAMETER", `Invalid ${key}`, 400);
    }
    return value;
}

export function parseOptionalBoolean(searchParams: URLSearchParams, key: string): boolean | undefined {
    const raw = searchParams.get(key);
    if (raw === null) return undefined;
    if (raw === "1" || raw === "true") return true;
    if (raw === "0" || raw === "false") return false;
    throw new ProjectImportApiError("INVALID_QUERY_PARAMETER", `Invalid ${key}`, 400);
}

export function parseOptionalIsoDate(searchParams: URLSearchParams, key: string): string | undefined {
    const raw = searchParams.get(key);
    if (raw === null || raw === "") return undefined;
    if (Number.isNaN(Date.parse(raw))) {
        throw new ProjectImportApiError("INVALID_QUERY_PARAMETER", `Invalid ${key}`, 400);
    }
    return raw;
}

export function isValidBatchId(value: string): boolean {
    return /^batch-[A-Za-z0-9-]+$/.test(value);
}

export function apiErrorResponse(error: unknown, requestId?: string): Response {
    const body = toProjectImportApiErrorResponse(error, requestId);
    const status = error instanceof ProjectImportApiError ? error.status : 500;
    return Response.json(body, { status });
}
