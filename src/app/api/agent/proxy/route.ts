export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

export async function POST(req: NextRequest) {
    const raw = (process.env.AGENT_KEY || "").trim();
    const keyHash = crypto.createHash("sha256").update(raw).digest("hex");
    const hashPrefix = keyHash.slice(0, 12);
    const isDev = process.env.NODE_ENV !== "production";

    try {
        const body = await req.json();

        // Server-side security: use env variable for Agent Key
        const agentKey = process.env.AGENT_KEY;
        if (!agentKey) {
            const respOpts: any = { status: 500 };
            if (isDev) respOpts.headers = { "x-agent-key-len": String(raw.length), "x-agent-key-hash-prefix": hashPrefix };
            return NextResponse.json({ error: "Server configuration missing AGENT_KEY env variable." }, respOpts);
        }

        // Forward headers (Idempotency)
        const headers: Record<string, string> = {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${agentKey}`
        };

        let idempotencyKey = req.headers.get("x-idempotency-key");
        // Auto-generate if it's an execute request and missing
        if (!body.dry_run && !idempotencyKey) {
            idempotencyKey = crypto.randomUUID();
        }

        if (idempotencyKey) {
            headers["X-Idempotency-Key"] = idempotencyKey;
        }

        // Base URL is tricky in Next.js API, usually we just hit localhost or the deployment URL
        // However, we can construct it from req.url
        const url = new URL(req.url);
        const executeUrl = `${url.protocol}//${url.host}/api/agent/execute`;

        if (isDev) {
            console.log("[agent-proxy] AGENT_KEY len =", raw.length);
            console.log("[agent-proxy] sha256(AGENT_KEY) =", hashPrefix + "...");
        }

        const response = await fetch(executeUrl, {
            method: "POST",
            headers,
            body: JSON.stringify(body)
        });

        const text = await response.text();
        let data;
        try {
            data = JSON.parse(text);
        } catch {
            data = { error: text || "Invalid JSON received from execute endpoint" };
        }

        return NextResponse.json(data, {
            status: response.status
        });

    } catch (e: any) {
        const respOpts: any = { status: 500 };
        if (isDev) respOpts.headers = { "x-agent-key-len": String(raw.length), "x-agent-key-hash-prefix": hashPrefix };
        return NextResponse.json({ error: e.message || "Failed to proxy request" }, respOpts);
    }
}
