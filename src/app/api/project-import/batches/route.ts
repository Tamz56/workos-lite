import { NextRequest } from "next/server";
import { getDb } from "@/db/db";
import { authenticateAndAuthorize } from "@/lib/project-import/authorization";
import { listBatchesApi } from "@/lib/project-import/importHistoryService";
import {
    apiErrorResponse,
    parseOptionalIsoDate,
    parsePagination,
    requestIdFrom,
} from "@/lib/project-import/apiRouteHelpers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
    const requestId = requestIdFrom(request);
    try {
        authenticateAndAuthorize(request, "project_import:read");
        const searchParams = request.nextUrl.searchParams;
        const { page, pageSize } = parsePagination(searchParams);
        const result = listBatchesApi(getDb(), {
            page,
            pageSize,
            status: searchParams.get("status") ?? undefined,
            entityType: searchParams.get("entityType") ?? undefined,
            projectId: searchParams.get("projectId") ?? undefined,
            createdFrom: parseOptionalIsoDate(searchParams, "createdFrom"),
            createdTo: parseOptionalIsoDate(searchParams, "createdTo"),
        });
        return Response.json(result);
    } catch (error) {
        return apiErrorResponse(error, requestId);
    }
}
