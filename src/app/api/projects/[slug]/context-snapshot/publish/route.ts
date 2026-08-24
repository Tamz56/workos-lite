import { NextRequest, NextResponse } from "next/server";
import { humanMutationGuard } from "@/lib/human-auth/mutationGuard";
import { getDb } from "@/db/db";
import {
    ProjectContextPublicationError,
    publishProjectContextSnapshot,
    type ProjectContextPublicationErrorCode,
} from "@/lib/project-context-snapshots/publication";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PUBLICATION_ERROR_STATUS: Record<ProjectContextPublicationErrorCode, number> = {
    PROJECT_NOT_FOUND: 404,
    INVALID_SNAPSHOT_DRAFT: 400,
    SNAPSHOT_SOURCE_CORPUS_CHANGED: 409,
    PUBLICATION_TRANSACTION_FAILED: 500,
    FINGERPRINT_FINALIZATION_MISMATCH: 500,
    PUBLICATION_IDEMPOTENCY_CONFLICT: 409,
};

/**
 * POST /api/projects/[slug]/context-snapshot/publish
 *
 * Human-authorized snapshot publication. The authenticated Human mutation
 * principal is required (shared humanMutationGuard). The body accepts ONLY a
 * structured project-context.v1 draft ({ draft }). The server controls:
 * approval identity (from the session), publication state, version id,
 * rendered Markdown, content digest, publishedCorpusFingerprint, and approvedAt.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
    const authGuard = humanMutationGuard(req);
    if (authGuard instanceof NextResponse) return authGuard;
    try {
        const { slug } = await params;
        const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
        const db = getDb();
        const result = publishProjectContextSnapshot(db, {
            projectSlug: slug,
            draft: body.draft,
            approvedBy: authGuard.operatorId,
            // Required publication-operation identity; the service validates it.
            operationId: body.operationId as string,
        });
        return NextResponse.json({ success: true, ...result });
    } catch (error) {
        if (error instanceof ProjectContextPublicationError) {
            return NextResponse.json(
                { error: { code: error.code, message: error.message } },
                { status: PUBLICATION_ERROR_STATUS[error.code] },
            );
        }
        return NextResponse.json(
            { error: { code: "PUBLICATION_TRANSACTION_FAILED", message: "Unexpected publication failure" } },
            { status: 500 },
        );
    }
}
