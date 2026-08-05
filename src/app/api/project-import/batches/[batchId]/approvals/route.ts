import { NextRequest } from "next/server";
import { getDb } from "@/db/db";
import { authenticateAndAuthorize } from "@/lib/project-import/authorization";
import { approvalStatesForBatch } from "@/lib/project-import/approvalApplicationService";
import { ProjectImportApiError } from "@/lib/project-import/apiErrors";
import { apiErrorResponse, isValidBatchId, requestIdFrom } from "@/lib/project-import/apiRouteHelpers";

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
        return Response.json({ entities: approvalStatesForBatch(batchId, { db: getDb() }) });
    } catch (error) {
        return apiErrorResponse(error, requestId);
    }
}
