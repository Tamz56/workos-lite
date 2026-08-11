import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db/db";
import { authenticateAgentKey } from "@/lib/agent-auth/agentAuthentication";
import { requireOperationsScope } from "@/lib/operations/authorization";
import { toOpsErrorResponse } from "@/lib/operations/errors";
import { getOperationForRequester } from "@/lib/operations/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const principal = authenticateAgentKey(req);
        requireOperationsScope(principal, "operations:read");
        const { id } = await params;
        const operation = getOperationForRequester(getDb(), principal, id);
        return NextResponse.json({ ok: true, operation });
    } catch (error) {
        const mapped = toOpsErrorResponse(error);
        return NextResponse.json({ ok: false, error: mapped.error }, { status: mapped.error.status });
    }
}
