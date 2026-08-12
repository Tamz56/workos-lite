import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db/db";
import { assertTrustedHumanOrigin, getAuthenticatedHuman } from "@/lib/human-auth/authorization";
import { ExecutionError, toExecutionErrorResponse } from "@/lib/execution/errors";
import { executeOperation } from "@/lib/execution/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const human = getAuthenticatedHuman(req);
        if (!human) {
            throw new ExecutionError("OPS_EXECUTION_AUTH_REQUIRED", "Human authentication required", 401, false);
        }
        assertTrustedHumanOrigin(req);
        const { id } = await params;
        const body = (await req.json().catch(() => ({}))) as unknown;
        const outcome = executeOperation(
            getDb(),
            { actorId: human.operatorId, displayName: human.displayName },
            id,
            body,
        );
        return NextResponse.json({ ok: true, replay: outcome.replay, execution: outcome.execution });
    } catch (error) {
        const mapped = toExecutionErrorResponse(error);
        return NextResponse.json({ ok: false, error: mapped.error }, { status: mapped.error.status });
    }
}
