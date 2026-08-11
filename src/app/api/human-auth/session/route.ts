import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedHuman } from "@/lib/human-auth/authorization";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
    const human = getAuthenticatedHuman(req);
    if (!human) {
        return NextResponse.json({ authenticated: false });
    }
    return NextResponse.json({ authenticated: true, operator: human });
}
