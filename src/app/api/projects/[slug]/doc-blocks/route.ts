import type { DocBlockSourceType } from "@/lib/types";
import { NextRequest, NextResponse } from "next/server";
import { humanMutationGuard } from "@/lib/human-auth/mutationGuard";
import {
    listProjectDocBlocks,
    resolveProjectId,
    ProjectDocBlockListStatus,
    createProjectDocBlock,
    getProjectSlug
} from "@/lib/project-doc-blocks/repository";
import {
    isValidRouteIdentifier,
    isNonEmptyString,
    isValidBlockType,
    isValidDateFormat,
    isStringArray,
    isValidSourceType
} from "@/lib/project-doc-blocks/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const LIST_STATUSES = new Set<ProjectDocBlockListStatus>(["active", "archived", "all"]);

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ slug: string }> }
) {
    try {
        const { slug } = await params;
        if (!isValidRouteIdentifier(slug)) {
            return NextResponse.json({ error: "Invalid project ID" }, { status: 400 });
        }

        const statusValue = new URL(request.url).searchParams.get("status") ?? "active";
        if (!LIST_STATUSES.has(statusValue as ProjectDocBlockListStatus)) {
            return NextResponse.json({ error: "Invalid status" }, { status: 400 });
        }

        const projectId = resolveProjectId(slug);
        if (!projectId) {
            return NextResponse.json({ error: "Project not found" }, { status: 404 });
        }

        return NextResponse.json(listProjectDocBlocks({
            projectId,
            status: statusValue as ProjectDocBlockListStatus
        }));
    } catch {
        return NextResponse.json(
            { error: "Unable to load project documentation blocks" },
            { status: 500 }
        );
    }
}

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ slug: string }> }
) {
    const authGuard = humanMutationGuard(request);
    if (authGuard instanceof NextResponse) return authGuard;
    try {
        const { slug } = await params;
        if (!isValidRouteIdentifier(slug)) {
            return NextResponse.json({ error: "Invalid project ID" }, { status: 400 });
        }

        const projectId = resolveProjectId(slug);
        if (!projectId) {
            return NextResponse.json({ error: "Project not found" }, { status: 404 });
        }

        let body: Record<string, unknown>;
        try {
            body = (await request.json()) as Record<string, unknown>;
        } catch {
            return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
        }

        const {
            type,
            title,
            date,
            summary,
            details,
            evidenceLinks,
            relatedFiles,
            status,
            nextAction,
            generatedBy,
            reviewedByUser,
            sourceText,
            sourceExcerpt,
            sourceType,
            appliedAt
        } = body;

        if (!isValidBlockType(type)) {
            return NextResponse.json({ error: "Invalid block type" }, { status: 400 });
        }
        if (!isNonEmptyString(title)) {
            return NextResponse.json({ error: "Title is required" }, { status: 400 });
        }
        if (!isValidDateFormat(date)) {
            return NextResponse.json({ error: "Invalid date format" }, { status: 400 });
        }
        if (typeof details !== "string") {
            return NextResponse.json({ error: "Details must be a string" }, { status: 400 });
        }
        if (evidenceLinks !== undefined && !isStringArray(evidenceLinks)) {
            return NextResponse.json({ error: "Evidence links must be an array of strings" }, { status: 400 });
        }
        if (relatedFiles !== undefined && !isStringArray(relatedFiles)) {
            return NextResponse.json({ error: "Related files must be an array of strings" }, { status: 400 });
        }
        if (status !== undefined && status !== "active" && status !== "archived") {
            return NextResponse.json({ error: "Invalid status" }, { status: 400 });
        }
        if (nextAction !== undefined && nextAction !== null && typeof nextAction !== "string") {
            return NextResponse.json({ error: "Next action must be a string or null" }, { status: 400 });
        }
        if (generatedBy !== undefined && generatedBy !== null && generatedBy !== "arbor" && generatedBy !== "arbor_assistant") {
            return NextResponse.json({ error: "Invalid generatedBy field" }, { status: 400 });
        }
        if (reviewedByUser !== undefined && typeof reviewedByUser !== "boolean") {
            return NextResponse.json({ error: "reviewedByUser must be a boolean" }, { status: 400 });
        }
        if (sourceType !== undefined && !isValidSourceType(sourceType)) {
            return NextResponse.json({ error: "Invalid sourceType" }, { status: 400 });
        }

        const createdBlock = createProjectDocBlock({
            projectSlug: getProjectSlug(projectId),
            type,
            title: title.trim(),
            date,
            summary: typeof summary === "string" ? summary.trim() : "",
            details,
            evidenceLinks: evidenceLinks || [],
            relatedFiles: relatedFiles || [],
            status: status || "active",
            nextAction: nextAction || undefined,
            generatedBy: generatedBy || undefined,
            reviewedByUser: !!reviewedByUser,
            sourceText: typeof sourceText === "string" ? sourceText : undefined,
            sourceExcerpt: typeof sourceExcerpt === "string" ? sourceExcerpt : undefined,
            sourceType: typeof sourceType === "string" ? (sourceType as DocBlockSourceType) : undefined,
            appliedAt: typeof appliedAt === "string" ? appliedAt : undefined
        }, {
            projectId
        });

        return NextResponse.json(createdBlock, { status: 201 });
    } catch {
        return NextResponse.json(
            { error: "Unable to create project documentation block" },
            { status: 500 }
        );
    }
}
