import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db/db";
import { assertTrustedHumanOrigin, getAuthenticatedHuman } from "@/lib/human-auth/authorization";
import { ApprovalError, toApprovalErrorResponse } from "@/lib/approvals/errors";
import { approveOperation } from "@/lib/approvals/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const human = getAuthenticatedHuman(req);
        if (!human) {
            throw new ApprovalError("OPS_APPROVAL_AUTH_REQUIRED", "Human authentication required", 401);
        }
        assertTrustedHumanOrigin(req);
        const { id } = await params;
        const body = (await req.json().catch(() => ({}))) as unknown;
        const result = approveOperation(getDb(), { actorId: human.operatorId, displayName: human.displayName }, id, body);
        return NextResponse.json(result);
    } catch (error) {
        const mapped = toApprovalErrorResponse(error);
        return NextResponse.json({ ok: false, error: mapped.error }, { status: mapped.error.status });
    }
}
