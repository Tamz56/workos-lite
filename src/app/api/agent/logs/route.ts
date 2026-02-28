export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db/db";

export async function GET(req: NextRequest) {
    try {
        const url = new URL(req.url);

        // Parse params
        let limit = parseInt(url.searchParams.get("limit") || "100", 10);
        if (isNaN(limit) || limit <= 0) limit = 100;
        if (limit > 500) limit = 500;

        const actionType = url.searchParams.get("action_type") || null;
        const agentKeyId = url.searchParams.get("agent_key_id") || null;

        const db = getDb();

        let query = "SELECT id, agent_key_id, action_type, payload_json, result_json, created_at FROM agent_audit_log";
        const conditions: string[] = [];
        const params: Record<string, string | number> = {};

        if (actionType) {
            conditions.push("action_type = @action_type");
            params.action_type = actionType;
        }

        if (agentKeyId) {
            conditions.push("agent_key_id = @agent_key_id");
            params.agent_key_id = agentKeyId;
        }

        if (conditions.length > 0) {
            query += " WHERE " + conditions.join(" AND ");
        }

        query += " ORDER BY created_at DESC LIMIT @limit";
        params.limit = limit;

        const rows = db.prepare(query).all(params);

        return NextResponse.json({ logs: rows });

    } catch (e: any) {
        console.error("Agent logs API error:", e);
        return NextResponse.json({ error: "Failed to fetch logs" }, { status: 500 });
    }
}
