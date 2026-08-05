import { NextRequest } from "next/server";
import { getDb } from "@/db/db";
import { authenticateAndAuthorize, type ImportActor } from "@/lib/project-import/authorization";
import { revokeEntityApi } from "@/lib/project-import/approvalApplicationService";
import { ProjectImportApiError } from "@/lib/project-import/apiErrors";
import { apiErrorResponse, isValidBatchId, requestIdFrom } from "@/lib/project-import/apiRouteHelpers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest, { params }: { params: Promise<{ batchId: string; entityType: string }> }) {
    const requestId = requestIdFrom(request);
    try {
        const actor: ImportActor = authenticateAndAuthorize(request, "project_import:revoke");
        const { batchId, entityType } = await params;
        if (!isValidBatchId(batchId)) {
            throw new ProjectImportApiError("INVALID_BATCH_ID", "Invalid batch ID", 400);
        }
        const approval = revokeEntityApi(batchId, entityType, actor.actorName, { db: getDb() });
        return Response.json({ ok: true, approvalId: approval.id, approvalStatus: approval.approval_status });
    } catch (error) {
        return apiErrorResponse(error, requestId);
    }
}
