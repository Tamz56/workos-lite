import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db/db";
import { assertTrustedHumanOrigin } from "@/lib/human-auth/authorization";
import { toHumanAuthError } from "@/lib/human-auth/errors";
import { revokeHumanSession, SESSION_COOKIE_NAME } from "@/lib/human-auth/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
    try {
        assertTrustedHumanOrigin(req);

        const token = req.cookies.get(SESSION_COOKIE_NAME)?.value ?? null;
        if (token) {
            revokeHumanSession(getDb(), token);
        }

        const response = NextResponse.json({ ok: true });
        response.cookies.set(SESSION_COOKIE_NAME, "", {
            httpOnly: true,
            sameSite: "lax",
            path: "/",
            secure: process.env.NODE_ENV === "production",
            maxAge: 0,
        });
        return response;
    } catch (error) {
        const mapped = toHumanAuthError(error);
        return NextResponse.json({ ok: false, error: mapped }, { status: mapped.status });
    }
}
