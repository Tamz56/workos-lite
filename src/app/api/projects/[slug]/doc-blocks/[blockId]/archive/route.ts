import { NextRequest, NextResponse } from "next/server";
import { humanMutationGuard } from "@/lib/human-auth/mutationGuard";
import {
    archiveProjectDocBlock,
    resolveProjectId
} from "@/lib/project-doc-blocks/repository";
import { isValidRouteIdentifier } from "@/lib/project-doc-blocks/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ slug: string; blockId: string }> }
) {
    const authGuard = humanMutationGuard(request);
    if (authGuard instanceof NextResponse) return authGuard;
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
            body = (await request.json()) as Record<string, unknown>;
        } catch {
            return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
        }

        const { expectedUpdatedAt } = body;
        if (!expectedUpdatedAt || typeof expectedUpdatedAt !== "string") {
            return NextResponse.json({ error: "expectedUpdatedAt is required" }, { status: 400 });
        }

        const result = archiveProjectDocBlock({
            id: blockId,
            projectId,
            expectedUpdatedAt
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
            { error: "Unable to archive project documentation block" },
            { status: 500 }
        );
    }
}
