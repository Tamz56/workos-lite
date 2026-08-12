import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db/db";
import { getAuthenticatedHuman } from "@/lib/human-auth/authorization";
import { ApprovalError, toApprovalErrorResponse } from "@/lib/approvals/errors";
import { listReviews } from "@/lib/approvals/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function parseLimit(req: NextRequest): number {
    const raw = req.nextUrl.searchParams.get("limit");
    if (raw === null) return 50;
    const value = Number(raw);
    if (!Number.isInteger(value) || value < 1 || value > 100) {
        throw new ApprovalError("OPS_APPROVAL_INVALID_REQUEST", "Invalid limit", 400);
    }
    return value;
}

export async function GET(req: NextRequest) {
    try {
        const human = getAuthenticatedHuman(req);
        if (!human) {
            throw new ApprovalError("OPS_APPROVAL_AUTH_REQUIRED", "Human authentication required", 401);
        }
        const limit = parseLimit(req);
        const operations = listReviews(getDb(), limit);
        return NextResponse.json({ ok: true, operations });
    } catch (error) {
        const mapped = toApprovalErrorResponse(error);
        return NextResponse.json({ ok: false, error: mapped.error }, { status: mapped.error.status });
    }
}
