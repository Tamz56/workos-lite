import Database from "better-sqlite3";
import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { APPROVALS_SCHEMA_SQL } from "@/lib/approvals/approvalsSchema";
import { approveOperation } from "@/lib/approvals/service";
import { EXECUTION_SCHEMA_SQL } from "@/lib/execution/executionSchema";
import { getOperationExecutionPresentation } from "@/lib/execution/read";
import { createHumanSession, SESSION_COOKIE_NAME } from "@/lib/human-auth/session";
import { HUMAN_AUTH_SCHEMA_SQL } from "@/lib/human-auth/humanAuthSchema";
import { OPERATIONS_SCHEMA_SQL } from "@/lib/operations/operationsSchema";
import { createOperation } from "@/lib/operations/service";
import type { AgentPrincipal } from "@/lib/agent-auth/agentAuthentication";
import type { OperationRecord } from "@/lib/operations/types";

const { mockGetDb } = vi.hoisted(() => ({ mockGetDb: vi.fn() }));
vi.mock("@/db/db", () => ({ getDb: mockGetDb }));

import { GET as detailRoute } from "@/app/api/human/operations/[id]/route";

const HUMAN = { actorId: "human-1", displayName: "Owner" };
const T0 = "2026-08-12T10:00:00.000Z";
const NOW = new Date().toISOString();

afterEach(() => {
    vi.restoreAllMocks();
});

function createDb(): Database.Database {
    const db = new Database(":memory:");
    db.pragma("foreign_keys = ON");
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

function seedOp(db: Database.Database, title = "Read Task"): { op: OperationRecord; approvalId: string } {
    const principal: AgentPrincipal = { actorId: "agent-test", actorName: "Test Agent", scopes: ["operations:request"] };
    const op = createOperation(db, principal, {
        operationType: "backlog.create",
        targetType: "project",
        targetRef: "project-a",
        payload: { title },
    });
    const approvalId = approveOperation(db, HUMAN, op.id, {
        expectedPreviewFingerprint: op.previewFingerprint,
        expectedPayloadHash: op.payloadHash,
        expectedContractVersion: op.contractVersion,
    }, { now: NOW }).review.approval!.id;
    return { op, approvalId };
}

function insertFailedAttempt(db: Database.Database, opId: string, approvalId: string, status: "failed_before_write" | "rolled_back", createdAt: string): void {
    db.prepare(`
        INSERT INTO operation_execution_attempts (
            id, operation_id, approval_id, execution_status,
            trigger_actor_type, trigger_actor_id, trigger_display_name,
            executor_actor_type, executor_actor_id,
            started_at, finished_at, failure_code, safe_failure_message, created_at, updated_at
        ) VALUES (?, ?, ?, ?, 'human', 'h1', 'Owner', 'system', 'system', ?, ?, ?, ?, ?, ?)
    `).run(`opexec-${status}-${createdAt}`, opId, approvalId, status, T0, T0, "OPS_EXECUTION_ROLLED_BACK", "safe message", createdAt, createdAt);
}

function insertCommittedAttempt(db: Database.Database, opId: string, approvalId: string): void {
    db.prepare(`
        INSERT INTO operation_execution_attempts (
            id, operation_id, approval_id, execution_status,
            trigger_actor_type, trigger_actor_id, trigger_display_name,
            executor_actor_type, executor_actor_id,
            started_at, finished_at, target_table, target_record_id, result_json, created_at, updated_at
        ) VALUES (?, ?, ?, 'committed', 'human', 'h1', 'Owner', 'system', 'system', ?, ?, 'project_items', ?, '{"safe":true}', ?, ?)
    `).run("opexec-committed", opId, approvalId, T0, T0, "item-123", T0, T0);
}

describe("getOperationExecutionPresentation", () => {
    it("A: returns nulls when no execution exists", () => {
        const db = createDb();
        const { op } = seedOp(db);
        const presentation = getOperationExecutionPresentation(db, op.id);
        expect(presentation.committed).toBeNull();
        expect(presentation.latestFailure).toBeNull();
        db.close();
    });

    it("B: surfaces rolled_back as the latest failure", () => {
        const db = createDb();
        const { op, approvalId } = seedOp(db);
        insertFailedAttempt(db, op.id, approvalId, "rolled_back", T0);
        const presentation = getOperationExecutionPresentation(db, op.id);
        expect(presentation.committed).toBeNull();
        expect(presentation.latestFailure?.status).toBe("rolled_back");
        expect(presentation.latestFailure?.failureCode).toBe("OPS_EXECUTION_ROLLED_BACK");
        db.close();
    });

    it("C: surfaces failed_before_write safely", () => {
        const db = createDb();
        const { op, approvalId } = seedOp(db);
        insertFailedAttempt(db, op.id, approvalId, "failed_before_write", T0);
        const presentation = getOperationExecutionPresentation(db, op.id);
        expect(presentation.committed).toBeNull();
        expect(presentation.latestFailure?.status).toBe("failed_before_write");
        expect(presentation.latestFailure?.safeFailureMessage).toBe("safe message");
        db.close();
    });

    it("D: committed stays authoritative alongside historical failure", () => {
        const db = createDb();
        const { op, approvalId } = seedOp(db);
        insertFailedAttempt(db, op.id, approvalId, "rolled_back", T0);
        insertCommittedAttempt(db, op.id, approvalId);
        const presentation = getOperationExecutionPresentation(db, op.id);
        expect(presentation.committed?.status).toBe("committed");
        expect(presentation.committed?.targetRecordId).toBe("item-123");
        // Historical failure remains visible but never overrides committed success.
        expect(presentation.latestFailure?.status).toBe("rolled_back");
        db.close();
    });

    it("E: projects a safe DTO without raw result_json/payload/preview", () => {
        const db = createDb();
        const { op, approvalId } = seedOp(db);
        insertCommittedAttempt(db, op.id, approvalId);
        const presentation = getOperationExecutionPresentation(db, op.id);
        const json = JSON.stringify(presentation);
        expect(json).not.toContain("result_json");
        expect(json).not.toContain("payload");
        expect(json).not.toContain("preview");
        expect(json).not.toContain("created_at");
        db.close();
    });
});

describe("Human detail API execution read", () => {
    it("exposes safe committed execution to an authenticated human", async () => {
        const db = createDb();
        db.exec(HUMAN_AUTH_SCHEMA_SQL);
        db.prepare("INSERT INTO human_operators (id, display_name, credential_hash, enabled, created_at, updated_at) VALUES (?,?,?,1,?,?)")
            .run("human-1", "Owner", "hash", "2026-01-01", "2026-01-01");
        const token = createHumanSession(db, "human-1").token;
        const { op, approvalId } = seedOp(db);
        insertCommittedAttempt(db, op.id, approvalId);
        mockGetDb.mockReturnValue(db);

        const res = await detailRoute(
            new NextRequest(`http://localhost/api/human/operations/${op.id}`, {
                headers: { cookie: `${SESSION_COOKIE_NAME}=${token}` },
            }),
            { params: Promise.resolve({ id: op.id }) },
        );
        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.operation.execution.committed).toBeTruthy();
        expect(body.operation.execution.committed.targetRecordId).toBe("item-123");
        expect(JSON.stringify(body)).not.toContain("result_json");
        // Existing P1C detail fields remain present.
        expect(body.operation.reviewState).toBe("approved");
        expect(body.operation.payloadHash).toBeTruthy();
        db.close();
    });

    it("requires a human session", async () => {
        const db = createDb();
        const { op } = seedOp(db);
        mockGetDb.mockReturnValue(db);
        const res = await detailRoute(
            new NextRequest(`http://localhost/api/human/operations/${op.id}`),
            { params: Promise.resolve({ id: op.id }) },
        );
        expect(res.status).toBe(401);
        db.close();
    });
});
