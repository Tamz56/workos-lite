import { NextRequest } from "next/server";
import { getDb } from "@/db/db";
import { authenticateAndAuthorize } from "@/lib/project-import/authorization";
import { listRowsApi } from "@/lib/project-import/importHistoryService";
import { ProjectImportApiError } from "@/lib/project-import/apiErrors";
import {
    apiErrorResponse,
    isValidBatchId,
    parseOptionalBoolean,
    parseOptionalInt,
    parsePagination,
    requestIdFrom,
} from "@/lib/project-import/apiRouteHelpers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest, { params }: { params: Promise<{ batchId: string }> }) {
    const requestId = requestIdFrom(request);
    try {
        authenticateAndAuthorize(request, "project_import:read");
        const { batchId } = await params;
        if (!isValidBatchId(batchId)) {
            throw new ProjectImportApiError("INVALID_BATCH_ID", "Invalid batch ID", 400);
        }
        const searchParams = request.nextUrl.searchParams;
        const { page, pageSize } = parsePagination(searchParams);
        const result = listRowsApi(getDb(), batchId, {
            page,
            pageSize,
            entityType: searchParams.get("entityType") ?? undefined,
            dryRunStatus: searchParams.get("dryRunStatus") ?? undefined,
            parserStatus: searchParams.get("parserStatus") ?? undefined,
            proposedOperation: searchParams.get("proposedOperation") ?? undefined,
            projectSlug: searchParams.get("projectSlug") ?? undefined,
            sourceRowNumber: parseOptionalInt(searchParams, "sourceRowNumber"),
            hasErrors: parseOptionalBoolean(searchParams, "hasErrors"),
            hasWarnings: parseOptionalBoolean(searchParams, "hasWarnings"),
        });
        return Response.json(result);
    } catch (error) {
        return apiErrorResponse(error, requestId);
    }
}
