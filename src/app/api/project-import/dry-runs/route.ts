import { NextRequest, NextResponse } from "next/server";
import { authenticateAndAuthorize } from "@/lib/project-import/authorization";
import { createDryRunFromUpload } from "@/lib/project-import/dryRunApplicationService";
import { ProjectImportApiError } from "@/lib/project-import/apiErrors";
import { apiErrorResponse, requestIdFrom } from "@/lib/project-import/apiRouteHelpers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
    const requestId = requestIdFrom(request);
    try {
        authenticateAndAuthorize(request, "project_import:dry_run");
        let formData: FormData;
        try {
            formData = await request.formData();
        } catch {
            throw new ProjectImportApiError("INVALID_MULTIPART_REQUEST", "Invalid multipart request", 400);
        }
        const files = formData.getAll("file");
        if (files.length === 0) {
            throw new ProjectImportApiError("MISSING_UPLOAD_FILE", "A file is required", 400);
        }
        if (files.length > 1) {
            throw new ProjectImportApiError("MULTIPLE_UPLOAD_FILES", "Exactly one file is allowed", 400);
        }
        const file = files[0];
        if (!(file instanceof File)) {
            throw new ProjectImportApiError("INVALID_MULTIPART_REQUEST", "Invalid multipart request", 400);
        }
        const response = await createDryRunFromUpload(file);
        return NextResponse.json(response, { status: 200 });
    } catch (error) {
        return apiErrorResponse(error, requestId);
    }
}
