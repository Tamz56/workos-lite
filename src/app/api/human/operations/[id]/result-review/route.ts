import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db/db";
import { getAuthenticatedHuman } from "@/lib/human-auth/authorization";
import {
    ResultReviewError,
    getResultReview,
    toResultReviewErrorResponse,
} from "@/lib/result-review/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    try {
        const human =
            getAuthenticatedHuman(req);

        if (!human) {
            throw new ResultReviewError(
                "RESULT_REVIEW_AUTH_REQUIRED",
                "Human authentication required",
                401,
            );
        }

        const { id } = await params;

        const review =
            getResultReview(
                getDb(),
                id,
            );

        return NextResponse.json({
            ok: true,
            review,
        });
    } catch (error) {
        const mapped =
            toResultReviewErrorResponse(
                error,
            );

        return NextResponse.json(
            {
                ok: false,
                error: mapped.error,
            },
            {
                status:
                    mapped.error.status,
            },
        );
    }
}
