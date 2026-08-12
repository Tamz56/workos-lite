import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db/db";
import { getAuthenticatedHuman } from "@/lib/human-auth/authorization";
import { ApprovalError, toApprovalErrorResponse } from "@/lib/approvals/errors";
import { getReviewDetail } from "@/lib/approvals/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const human = getAuthenticatedHuman(req);
        if (!human) {
            throw new ApprovalError("OPS_APPROVAL_AUTH_REQUIRED", "Human authentication required", 401);
        }
        const { id } = await params;
        const detail = getReviewDetail(getDb(), id);
        return NextResponse.json({ ok: true, operation: detail });
    } catch (error) {
        const mapped = toApprovalErrorResponse(error);
        return NextResponse.json({ ok: false, error: mapped.error }, { status: mapped.error.status });
    }
}
