import Database from "better-sqlite3";
import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { APPROVALS_SCHEMA_SQL } from "@/lib/approvals/approvalsSchema";
import { OPERATIONS_SCHEMA_SQL } from "@/lib/operations/operationsSchema";
import { createOperation } from "@/lib/operations/service";
import { createHumanSession, SESSION_COOKIE_NAME } from "@/lib/human-auth/session";
import { HUMAN_AUTH_SCHEMA_SQL } from "@/lib/human-auth/humanAuthSchema";
import { EXECUTION_SCHEMA_SQL } from "@/lib/execution/executionSchema";
import type { AgentPrincipal } from "@/lib/agent-auth/agentAuthentication";
import type { OperationRecord } from "@/lib/operations/types";

const { mockGetDb } = vi.hoisted(() => ({ mockGetDb: vi.fn() }));
vi.mock("@/db/db", () => ({ getDb: mockGetDb }));

import { GET as listRoute } from "@/app/api/human/operations/route";
import { GET as detailRoute } from "@/app/api/human/operations/[id]/route";
import { POST as approveRoute } from "@/app/api/human/operations/[id]/approve/route";
import { POST as rejectRoute } from "@/app/api/human/operations/[id]/reject/route";
import { POST as revokeRoute } from "@/app/api/human/operations/[id]/revoke/route";

const ORIGIN = "http://localhost:3000";

afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
});

function createDb(): Database.Database {
    const db = new Database(":memory:");
    db.pragma("foreign_keys = ON");
    db.exec(HUMAN_AUTH_SCHEMA_SQL);
    db.exec(OPERATIONS_SCHEMA_SQL);
    db.exec(APPROVALS_SCHEMA_SQL);
    db.exec(EXECUTION_SCHEMA_SQL);
    db.exec(`
        CREATE TABLE projects (id TEXT PRIMARY KEY, slug TEXT NOT NULL UNIQUE, name TEXT NOT NULL, status TEXT NOT NULL, created_at TEXT, updated_at TEXT);
    `);
    db.prepare("INSERT INTO projects (id, slug, name, status, created_at, updated_at) VALUES (?,?,?,?,?,?)")
        .run("p1", "project-a", "Project A", "planned", "2026-01-01", "2026-01-01");
    return db;
}

function seedHumanSession(db: Database.Database): string {
    db.prepare("INSERT INTO human_operators (id, display_name, credential_hash, enabled, created_at, updated_at) VALUES (?,?,?,1,?,?)")
        .run("human-1", "Owner", "hash", "2026-01-01", "2026-01-01");
    return createHumanSession(db, "human-1").token;
}

function seedOperation(db: Database.Database): OperationRecord {
    const principal: AgentPrincipal = { actorId: "agent-test", actorName: "Test Agent", scopes: ["operations:request"] };
    return createOperation(db, principal, {
        operationType: "backlog.create",
        targetType: "project",
        targetRef: "project-a",
        payload: { title: "Task A" },
    });
}

function reviewBody(op: OperationRecord, extra: Record<string, unknown> = {}): Record<string, unknown> {
    return {
        expectedPreviewFingerprint: op.previewFingerprint,
        expectedPayloadHash: op.payloadHash,
        expectedContractVersion: op.contractVersion,
        ...extra,
    };
}

function mutationRequest(
    path: string,
    body: unknown,
    opts: { cookie?: string | null; origin?: string | null; agentPassword?: string | null } = {},
): NextRequest {
    const headers: Record<string, string> = { "content-type": "application/json" };
    if (opts.cookie) headers.cookie = `${SESSION_COOKIE_NAME}=${opts.cookie}`;
    if (opts.origin) headers.origin = opts.origin;
    if (opts.agentPassword) headers["x-agent-password"] = opts.agentPassword;
    return new NextRequest(`http://localhost${path}`, { method: "POST", headers, body: JSON.stringify(body) });
}

describe("Human review API auth and CSRF", () => {
    it("requires a human session; agent credential alone cannot approve", async () => {
        const db = createDb();
        const op = seedOperation(db);
        mockGetDb.mockReturnValue(db);

        const noSession = await approveRoute(
            mutationRequest(`/api/human/operations/${op.id}/approve`, reviewBody(op), { origin: ORIGIN }),
            { params: Promise.resolve({ id: op.id }) },
        );
        expect(noSession.status).toBe(401);

        const agentOnly = await approveRoute(
            mutationRequest(`/api/human/operations/${op.id}/approve`, reviewBody(op), { origin: ORIGIN, agentPassword: "secret" }),
            { params: Promise.resolve({ id: op.id }) },
        );
        expect(agentOnly.status).toBe(401);
        db.close();
    });

    it("accepts a valid human session and trusted Origin; rejects missing/foreign Origin", async () => {
        const db = createDb();
        const token = seedHumanSession(db);
        const op = seedOperation(db);
        mockGetDb.mockReturnValue(db);

        const ok = await approveRoute(
            mutationRequest(`/api/human/operations/${op.id}/approve`, reviewBody(op), { cookie: token, origin: ORIGIN }),
            { params: Promise.resolve({ id: op.id }) },
        );
        expect(ok.status).toBe(200);
        const approvalId = (await ok.json()).review.approval.id as string;
        const revoke = await revokeRoute(
            mutationRequest(`/api/human/operations/${op.id}/revoke`, { approvalId }, { cookie: token, origin: ORIGIN }),
            { params: Promise.resolve({ id: op.id }) },
        );
        expect(revoke.status).toBe(200);

        const missingOrigin = await rejectRoute(
            mutationRequest(`/api/human/operations/${op.id}/reject`, reviewBody(op), { cookie: token, origin: null }),
            { params: Promise.resolve({ id: op.id }) },
        );
        expect(missingOrigin.status).toBe(403);

        const foreign = await rejectRoute(
            mutationRequest(`/api/human/operations/${op.id}/reject`, reviewBody(op), { cookie: token, origin: "https://evil.example.com" }),
            { params: Promise.resolve({ id: op.id }) },
        );
        expect(foreign.status).toBe(403);
        db.close();
    });

    it("GET list/detail work without Origin and return safe fields with zero writes", async () => {
        const db = createDb();
        const token = seedHumanSession(db);
        const op = seedOperation(db);
        mockGetDb.mockReturnValue(db);
        const businessBefore = (db.prepare("SELECT COUNT(*) AS c FROM projects").get() as { c: number }).c;
        const opsBefore = (db.prepare("SELECT COUNT(*) AS c FROM operations").get() as { c: number }).c;

        const list = await listRoute(new NextRequest("http://localhost/api/human/operations", { headers: { cookie: `${SESSION_COOKIE_NAME}=${token}` } }));
        expect(list.status).toBe(200);
        const detail = await detailRoute(
            new NextRequest(`http://localhost/api/human/operations/${op.id}`, { headers: { cookie: `${SESSION_COOKIE_NAME}=${token}` } }),
            { params: Promise.resolve({ id: op.id }) },
        );
        expect(detail.status).toBe(200);
        const body = await detail.json();
        expect(body.operation.reviewState).toBe("awaiting_review");
        expect(JSON.stringify(body)).not.toContain("credential_hash");
        expect(JSON.stringify(body)).not.toContain(token);

        expect((db.prepare("SELECT COUNT(*) AS c FROM projects").get() as { c: number }).c).toBe(businessBefore);
        expect((db.prepare("SELECT COUNT(*) AS c FROM operations").get() as { c: number }).c).toBe(opsBefore);
        db.close();
    });
});
