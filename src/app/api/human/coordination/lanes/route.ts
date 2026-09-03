import { NextRequest, NextResponse } from "next/server";

import { getDb } from "@/db/db";
import {
    CoordinationLaneWriterError,
    createGovernedCoordinationLane,
} from "@/lib/coordination/laneWriter";
import { HumanAuthError, toHumanAuthError } from "@/lib/human-auth/errors";
import { requireHumanMutation } from "@/lib/human-auth/mutationGuard";

export const runtime = "nodejs";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
    try {
        requireHumanMutation(request);

        const body = (await request.json().catch(() => ({}))) as unknown;
        const lane = createGovernedCoordinationLane(getDb(), body);

        return NextResponse.json(
            { ok: true, lane },
            { status: 201 },
        );
    } catch (error) {
        if (error instanceof HumanAuthError) {
            const mapped = toHumanAuthError(error);
            return NextResponse.json(
                { ok: false, error: mapped },
                { status: mapped.status },
            );
        }

        if (error instanceof CoordinationLaneWriterError) {
            return NextResponse.json(
                {
                    ok: false,
                    error: {
                        code: error.code,
                        message: error.message,
                    },
                },
                { status: error.status },
            );
        }

        throw error;
    }
}
