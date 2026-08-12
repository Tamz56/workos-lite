import Database from "better-sqlite3";
import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { APPROVALS_SCHEMA_SQL } from "@/lib/approvals/approvalsSchema";
import { createHumanSession, SESSION_COOKIE_NAME } from "@/lib/human-auth/session";
import { HUMAN_AUTH_SCHEMA_SQL } from "@/lib/human-auth/humanAuthSchema";
import { EXECUTION_SCHEMA_SQL } from "@/lib/execution/executionSchema";
import { OPERATIONS_SCHEMA_SQL } from "@/lib/operations/operationsSchema";
import { createOperation } from "@/lib/operations/service";
import { approveOperation } from "@/lib/approvals/service";
import type { AgentPrincipal } from "@/lib/agent-auth/agentAuthentication";
import type { OperationRecord } from "@/lib/operations/types";

const { mockGetDb } = vi.hoisted(() => ({ mockGetDb: vi.fn() }));
vi.mock("@/db/db", () => ({ getDb: mockGetDb }));

import { POST as executeRoute } from "@/app/api/human/operations/[id]/execute/route";

const ORIGIN = "http://localhost:3000";
const NOW = new Date().toISOString();

afterEach(() => {
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
        CREATE TABLE project_items (
            id TEXT PRIMARY KEY, project_id TEXT NOT NULL, title TEXT NOT NULL,
            status TEXT NOT NULL, priority INTEGER NULL, schedule_bucket TEXT NULL,
            start_date TEXT NULL, end_date TEXT NULL, is_milestone INTEGER NOT NULL DEFAULT 0,
            workstream TEXT NULL, dod_text TEXT NULL, notes TEXT NULL,
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            updated_at TEXT NOT NULL DEFAULT (datetime('now')),
            FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE
        );
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

function seedOperation(db: Database.Database): { op: OperationRecord; approvalId: string } {
    const principal: AgentPrincipal = { actorId: "agent-test", actorName: "Test Agent", scopes: ["operations:request"] };
    const op = createOperation(db, principal, {
        operationType: "backlog.create",
        targetType: "project",
        targetRef: "project-a",
        payload: { title: "API Task" },
    });
    const approvalId = approveOperation(db, { actorId: "human-1", displayName: "Owner" }, op.id, {
        expectedPreviewFingerprint: op.previewFingerprint,
        expectedPayloadHash: op.payloadHash,
        expectedContractVersion: op.contractVersion,
    }, { now: NOW }).review.approval!.id;
    return { op, approvalId };
}

function executeRequest(
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

async function callExecute(db: Database.Database, path: string, body: unknown, opts: { cookie?: string | null; origin?: string | null; agentPassword?: string | null } = {}) {
    mockGetDb.mockReturnValue(db);
    return executeRoute(executeRequest(path, body, opts), { params: Promise.resolve({ id: path.split("/")[4] }) });
}

describe("Human execute API", () => {
    it("requires a human session; agent credential alone cannot execute", async () => {
        const db = createDb();
        const { op, approvalId } = seedOperation(db);
        const path = `/api/human/operations/${op.id}/execute`;
        const noSession = await callExecute(db, path, { approvalId }, { origin: ORIGIN });
        expect(noSession.status).toBe(401);
        const agentOnly = await callExecute(db, path, { approvalId }, { origin: ORIGIN, agentPassword: "secret" });
        expect(agentOnly.status).toBe(401);
        db.close();
    });

    it("rejects missing and foreign Origin with 403", async () => {
        const db = createDb();
        const token = seedHumanSession(db);
        const { op, approvalId } = seedOperation(db);
        const path = `/api/human/operations/${op.id}/execute`;
        const missing = await callExecute(db, path, { approvalId }, { cookie: token, origin: null });
        expect(missing.status).toBe(403);
        const foreign = await callExecute(db, path, { approvalId }, { cookie: token, origin: "https://evil.example.com" });
        expect(foreign.status).toBe(403);
        db.close();
    });

    it("rejects unknown body fields and missing operations/approvals safely", async () => {
        const db = createDb();
        const token = seedHumanSession(db);
        const { op, approvalId } = seedOperation(db);
        const path = `/api/human/operations/${op.id}/execute`;
        const unknown = await callExecute(db, path, { approvalId, payload: { title: "x" } }, { cookie: token, origin: ORIGIN });
        expect(unknown.status).toBe(400);
        const missingApproval = await callExecute(db, path, { approvalId: "apr-missing" }, { cookie: token, origin: ORIGIN });
        expect(missingApproval.status).toBe(404);
        const missingOp = await callExecute(db, "/api/human/operations/op-missing/execute", { approvalId }, { cookie: token, origin: ORIGIN });
        expect(missingOp.status).toBe(404);
        db.close();
    });

    it("executes successfully and replays the committed result", async () => {
        const db = createDb();
        const token = seedHumanSession(db);
        const { op, approvalId } = seedOperation(db);
        const path = `/api/human/operations/${op.id}/execute`;
        const first = await callExecute(db, path, { approvalId }, { cookie: token, origin: ORIGIN });
        expect(first.status).toBe(200);
        const firstBody = await first.json();
        expect(firstBody.ok).toBe(true);
        expect(firstBody.replay).toBe(false);
        const second = await callExecute(db, path, { approvalId }, { cookie: token, origin: ORIGIN });
        expect(second.status).toBe(200);
        const secondBody = await second.json();
        expect(secondBody.replay).toBe(true);
        expect(secondBody.execution.attemptId).toBe(firstBody.execution.attemptId);
        const itemCount = (db.prepare("SELECT COUNT(*) AS c FROM project_items").get() as { c: number }).c;
        expect(itemCount).toBe(1);
        db.close();
    });

    it("keeps error responses privacy-safe", async () => {
        const db = createDb();
        const token = seedHumanSession(db);
        const { op, approvalId } = seedOperation(db);
        const path = `/api/human/operations/${op.id}/execute`;
        const res = await callExecute(db, path, { approvalId, unexpected: true }, { cookie: token, origin: ORIGIN });
        const body = await res.json();
        expect(JSON.stringify(body)).not.toContain("stack");
        expect(JSON.stringify(body)).not.toContain("sqlite");
        expect(JSON.stringify(body)).not.toContain("workos.db");
        expect(JSON.stringify(body)).not.toContain(token);
        db.close();
    });
});
