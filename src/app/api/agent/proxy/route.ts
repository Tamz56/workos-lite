export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();

        // Server-side security: use env variable for Agent Key
        const agentKey = process.env.AGENT_KEY;
        if (!agentKey) {
            return NextResponse.json({ error: "Server configuration missing AGENT_KEY env variable." }, { status: 500 });
        }

        // Forward headers (Idempotency)
        const headers: Record<string, string> = {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${agentKey}`
        };

        const idempotencyKey = req.headers.get("x-idempotency-key");
        if (idempotencyKey) {
            headers["X-Idempotency-Key"] = idempotencyKey;
        }

        // Base URL is tricky in Next.js API, usually we just hit localhost or the deployment URL
        // However, we can construct it from req.url
        const url = new URL(req.url);
        const executeUrl = `${url.protocol}//${url.host}/api/agent/execute`;

        const response = await fetch(executeUrl, {
            method: "POST",
            headers,
            body: JSON.stringify(body)
        });

        const data = await response.json();
        return NextResponse.json(data, { status: response.status });

    } catch (e: any) {
        return NextResponse.json({ error: e.message || "Failed to proxy request" }, { status: 500 });
    }
}
