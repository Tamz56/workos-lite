import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db/db";
import {
    CoordinationCheckpointWriterError,
    createGovernedInitialLaneCheckpoint,
} from "@/lib/coordination/checkpointWriter";
import { CoordinationLaneResolutionError } from "@/lib/coordination/laneResolver";
import { HumanAuthError, toHumanAuthError } from "@/lib/human-auth/errors";
import { requireHumanMutation } from "@/lib/human-auth/mutationGuard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
    try {
        requireHumanMutation(request);
        const body = (await request.json().catch(() => ({}))) as unknown;
        const checkpoint = createGovernedInitialLaneCheckpoint(getDb(), body);
        return NextResponse.json({ ok: true, checkpoint }, { status: 201 });
    } catch (error) {
        if (error instanceof HumanAuthError) {
            const mapped = toHumanAuthError(error);
            return NextResponse.json({ ok: false, error: mapped }, { status: mapped.status });
        }
        if (error instanceof CoordinationCheckpointWriterError) {
            return NextResponse.json({ ok: false, error: { code: error.code, message: error.message } }, { status: 400 });
        }
        if (error instanceof CoordinationLaneResolutionError) {
            const status = error.code === "COORDINATION_PROJECT_NOT_FOUND" || error.code === "COORDINATION_LANE_NOT_FOUND"
                ? 404
                : 400;
            return NextResponse.json({ ok: false, error: { code: error.code, message: error.message } }, { status });
        }
        throw error;
    }
}
