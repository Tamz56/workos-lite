import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db/db";
import {
    assertTrustedHumanOrigin,
    getAuthenticatedHuman,
} from "@/lib/human-auth/authorization";
import {
    HumanAuthError,
    toHumanAuthError,
} from "@/lib/human-auth/errors";
import {
    ResultReviewError,
    recordHumanResultDecision,
    toResultReviewErrorResponse,
} from "@/lib/result-review/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
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

        assertTrustedHumanOrigin(req);

        const { id } = await params;

        const body =
            (await req.json().catch(
                () => ({}),
            )) as unknown;

        const result =
            recordHumanResultDecision(
                getDb(),
                {
                    actorId:
                        human.operatorId,
                    displayName:
                        human.displayName,
                },
                id,
                body,
            );

        return NextResponse.json(
            result,
        );
    } catch (error) {
        if (
            error instanceof HumanAuthError
        ) {
            const mapped =
                toHumanAuthError(error);

            return NextResponse.json(
                {
                    ok: false,
                    error: mapped,
                },
                {
                    status:
                        mapped.status,
                },
            );
        }

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
