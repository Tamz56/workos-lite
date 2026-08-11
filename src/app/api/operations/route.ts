import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db/db";
import { authenticateAgentKey } from "@/lib/agent-auth/agentAuthentication";
import { requireOperationsScope } from "@/lib/operations/authorization";
import { toOpsErrorResponse } from "@/lib/operations/errors";
import { createOperation } from "@/lib/operations/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
    try {
        const principal = authenticateAgentKey(req);
        requireOperationsScope(principal, "operations:request");
        const body = (await req.json().catch(() => ({}))) as unknown;
        const operation = createOperation(getDb(), principal, body);
        return NextResponse.json({ ok: true, operation });
    } catch (error) {
        const mapped = toOpsErrorResponse(error);
        return NextResponse.json({ ok: false, error: mapped.error }, { status: mapped.error.status });
    }
}
