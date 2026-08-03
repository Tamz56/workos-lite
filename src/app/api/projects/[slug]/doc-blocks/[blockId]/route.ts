import { NextRequest, NextResponse } from "next/server";
import {
    getProjectDocBlockByProjectAndId,
    resolveProjectId,
    updateProjectDocBlock
} from "@/lib/project-doc-blocks/repository";
import {
    isValidRouteIdentifier,
    checkImmutableFields,
    isNonEmptyString,
    isValidBlockType,
    isValidDateFormat,
    isStringArray,
    isValidSourceType
} from "@/lib/project-doc-blocks/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
    _request: NextRequest,
    { params }: { params: Promise<{ slug: string; blockId: string }> }
) {
    try {
        const { slug, blockId } = await params;
        if (!isValidRouteIdentifier(slug)) {
            return NextResponse.json({ error: "Invalid project ID" }, { status: 400 });
        }
        if (!isValidRouteIdentifier(blockId)) {
            return NextResponse.json({ error: "Invalid block ID" }, { status: 400 });
        }

        const projectId = resolveProjectId(slug);
        if (!projectId) {
            return NextResponse.json({ error: "Project not found" }, { status: 404 });
        }

        const block = getProjectDocBlockByProjectAndId(projectId, blockId);
        if (!block) {
            return NextResponse.json({ error: "Documentation block not found" }, { status: 404 });
        }

        return NextResponse.json(block);
    } catch {
        return NextResponse.json(
            { error: "Unable to load project documentation block" },
            { status: 500 }
        );
    }
}

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ slug: string; blockId: string }> }
) {
    try {
        const { slug, blockId } = await params;
        if (!isValidRouteIdentifier(slug)) {
            return NextResponse.json({ error: "Invalid project ID" }, { status: 400 });
        }
        if (!isValidRouteIdentifier(blockId)) {
            return NextResponse.json({ error: "Invalid block ID" }, { status: 400 });
        }

        const projectId = resolveProjectId(slug);
        if (!projectId) {
            return NextResponse.json({ error: "Project not found" }, { status: 404 });
        }

        let body: Record<string, unknown>;
        try {
            body = await request.json();
        } catch {
            return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
        }

        const { expectedUpdatedAt, ...payload } = body;
        if (!expectedUpdatedAt || typeof expectedUpdatedAt !== "string") {
            return NextResponse.json({ error: "expectedUpdatedAt is required" }, { status: 400 });
        }

        const immutableViolations = checkImmutableFields(payload);
        if (immutableViolations.length > 0) {
            return NextResponse.json({ error: `Immutable fields cannot be updated: ${immutableViolations.join(", ")}` }, { status: 400 });
        }

        if (payload.type !== undefined && !isValidBlockType(payload.type)) {
            return NextResponse.json({ error: "Invalid block type" }, { status: 400 });
        }
        if (payload.title !== undefined && !isNonEmptyString(payload.title)) {
            return NextResponse.json({ error: "Title cannot be empty" }, { status: 400 });
        }
        if (payload.date !== undefined && !isValidDateFormat(payload.date)) {
            return NextResponse.json({ error: "Invalid date format" }, { status: 400 });
        }
        if (payload.details !== undefined && typeof payload.details !== "string") {
            return NextResponse.json({ error: "Details must be a string" }, { status: 400 });
        }
        if (payload.evidenceLinks !== undefined && !isStringArray(payload.evidenceLinks)) {
            return NextResponse.json({ error: "Evidence links must be an array of strings" }, { status: 400 });
        }
        if (payload.relatedFiles !== undefined && !isStringArray(payload.relatedFiles)) {
            return NextResponse.json({ error: "Related files must be an array of strings" }, { status: 400 });
        }
        if (payload.nextAction !== undefined && payload.nextAction !== null && typeof payload.nextAction !== "string") {
            return NextResponse.json({ error: "Next action must be a string or null" }, { status: 400 });
        }
        if (payload.generatedBy !== undefined && payload.generatedBy !== null && payload.generatedBy !== "arbor" && payload.generatedBy !== "arbor_assistant") {
            return NextResponse.json({ error: "Invalid generatedBy field" }, { status: 400 });
        }
        if (payload.reviewedByUser !== undefined && typeof payload.reviewedByUser !== "boolean") {
            return NextResponse.json({ error: "reviewedByUser must be a boolean" }, { status: 400 });
        }
        if (payload.sourceType !== undefined && !isValidSourceType(payload.sourceType)) {
            return NextResponse.json({ error: "Invalid sourceType" }, { status: 400 });
        }

        const mappedPayload: Record<string, unknown> = {};
        if (payload.type !== undefined) mappedPayload.block_type = payload.type;
        if (payload.title !== undefined) mappedPayload.title = payload.title.trim();
        if (payload.date !== undefined) mappedPayload.block_date = payload.date;
        if (payload.summary !== undefined) mappedPayload.summary = typeof payload.summary === "string" ? payload.summary.trim() : "";
        if (payload.details !== undefined) mappedPayload.details_md = payload.details;
        if (payload.evidenceLinks !== undefined) mappedPayload.evidence_links_json = JSON.stringify(payload.evidenceLinks);
        if (payload.relatedFiles !== undefined) mappedPayload.related_files_json = JSON.stringify(payload.relatedFiles);
        if (payload.nextAction !== undefined) mappedPayload.next_action = payload.nextAction;
        if (payload.generatedBy !== undefined) mappedPayload.generated_by = payload.generatedBy;
        if (payload.reviewedByUser !== undefined) mappedPayload.reviewed_by_user = payload.reviewedByUser ? 1 : 0;
        if (payload.sourceText !== undefined) mappedPayload.source_text = payload.sourceText;
        if (payload.sourceExcerpt !== undefined) mappedPayload.source_excerpt = payload.sourceExcerpt;
        if (payload.sourceType !== undefined) mappedPayload.source_type = payload.sourceType;
        if (payload.appliedAt !== undefined) mappedPayload.applied_at = payload.appliedAt;

        const result = updateProjectDocBlock({
            id: blockId,
            projectId,
            expectedUpdatedAt,
            payload: mappedPayload
        });

        if (!result.success) {
            if (result.errorType === "conflict") {
                return NextResponse.json({ error: "This record has changed. Reload before saving." }, { status: 409 });
            }
            return NextResponse.json({ error: "Documentation block not found" }, { status: 404 });
        }

        return NextResponse.json(result.block);
    } catch {
        return NextResponse.json(
            { error: "Unable to update project documentation block" },
            { status: 500 }
        );
    }
}
