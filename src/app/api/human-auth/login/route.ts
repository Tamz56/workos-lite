import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db/db";
import { assertTrustedHumanOrigin } from "@/lib/human-auth/authorization";
import { HumanAuthError, toHumanAuthError } from "@/lib/human-auth/errors";
import { verifyPassword } from "@/lib/human-auth/password";
import { createHumanSession, SESSION_COOKIE_NAME, SESSION_TTL_HOURS } from "@/lib/human-auth/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
    try {
        assertTrustedHumanOrigin(req);

        const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
        const password = typeof body.password === "string" ? body.password : "";
        if (!password) {
            throw new HumanAuthError("HUMAN_AUTH_INVALID_CREDENTIALS", "Invalid credentials", 401);
        }

        const db = getDb();
        // Single trusted operator (H1): password-only login, operator identity
        // is server-derived. No username/email complexity for P1.
        const operator = db.prepare(`
            SELECT id, display_name, credential_hash, enabled
            FROM human_operators
            ORDER BY created_at ASC
            LIMIT 1
        `).get() as { id: string; display_name: string; credential_hash: string; enabled: number } | undefined;

        if (!operator || operator.enabled !== 1 || !verifyPassword(password, operator.credential_hash)) {
            // Generic non-sensitive error: never reveal operator existence/hash details.
            throw new HumanAuthError("HUMAN_AUTH_INVALID_CREDENTIALS", "Invalid credentials", 401);
        }

        const { token } = createHumanSession(db, operator.id);
        const response = NextResponse.json({
            ok: true,
            operator: { id: operator.id, displayName: operator.display_name, actorType: "human" },
        });
        response.cookies.set(SESSION_COOKIE_NAME, token, {
            httpOnly: true,
            sameSite: "lax",
            path: "/",
            secure: process.env.NODE_ENV === "production",
            maxAge: SESSION_TTL_HOURS * 60 * 60,
        });
        return response;
    } catch (error) {
        const mapped = toHumanAuthError(error);
        return NextResponse.json({ ok: false, error: mapped }, { status: mapped.status });
    }
}
