import { NextRequest } from "next/server";
import { getDb } from "@/db/db";
import { authenticateAndAuthorize, type ImportActor } from "@/lib/project-import/authorization";
import { executeImportFromApi } from "@/lib/project-import/executeApiApplicationService";
import { ProjectImportApiError } from "@/lib/project-import/apiErrors";
import {
    apiErrorResponse,
    isValidApprovalId,
    isValidBatchId,
    requestIdFrom,
} from "@/lib/project-import/apiRouteHelpers";
import { assertEntityTypeValue } from "@/lib/project-import/executeApiSerialization";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED_BODY_KEYS = new Set(["approvalId"]);

async function parseExecuteBody(request: NextRequest): Promise<{ approvalId: string }> {
    let parsed: unknown;
    try {
        parsed = await request.json();
    } catch {
        throw new ProjectImportApiError("INVALID_EXECUTION_REQUEST", "Request body must be valid JSON", 400);
    }
    if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
        throw new ProjectImportApiError("INVALID_EXECUTION_REQUEST", "Request body must be a JSON object", 400);
    }
    const body = parsed as Record<string, unknown>;
    const hasUnknownKeys = Object.keys(body).some((key) => !ALLOWED_BODY_KEYS.has(key));
    if (hasUnknownKeys) {
        throw new ProjectImportApiError("INVALID_EXECUTION_REQUEST", "Request body contains unsupported fields", 400);
    }
    const approvalId = body.approvalId;
    if (typeof approvalId !== "string" || approvalId.trim() === "" || !isValidApprovalId(approvalId)) {
        throw new ProjectImportApiError("INVALID_APPROVAL_ID", "Invalid approval ID", 400);
    }
    return { approvalId };
}

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ batchId: string; entityType: string }> },
    options: { now?: string } = {},
) {
    const requestId = requestIdFrom(request);
    try {
        const actor: ImportActor = authenticateAndAuthorize(request, "project_import:execute");
        const { batchId, entityType } = await params;
        if (!isValidBatchId(batchId)) {
            throw new ProjectImportApiError("INVALID_BATCH_ID", "Invalid batch ID", 400);
        }
        assertEntityTypeValue(entityType);
        const { approvalId } = await parseExecuteBody(request);
        const response = executeImportFromApi(
            {
                batchId,
                entityType,
                approvalId,
                actorId: actor.actorId,
                actorName: actor.actorName,
            },
            { db: getDb(), ...(options.now ? { now: options.now } : {}) },
        );
        return Response.json(response);
    } catch (error) {
        return apiErrorResponse(error, requestId);
    }
}
