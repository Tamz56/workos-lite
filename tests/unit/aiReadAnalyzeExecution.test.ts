import Database from "better-sqlite3";
import { describe, expect, it, vi } from "vitest";
import { APPROVALS_SCHEMA_SQL } from "@/lib/approvals/approvalsSchema";
import { approveOperation } from "@/lib/approvals/service";
import { AiRuntimeError } from "@/lib/ai/openaiReadAnalyze";
import { ExecutionError } from "@/lib/execution/errors";
import { EXECUTION_SCHEMA_SQL } from "@/lib/execution/executionSchema";
import { executeAiReadAnalyze } from "@/lib/execution/aiReadAnalyze";
import { OPERATIONS_SCHEMA_SQL } from "@/lib/operations/operationsSchema";
import { createOperation } from "@/lib/operations/service";
import type { AgentPrincipal } from "@/lib/agent-auth/agentAuthentication";

const HUMAN = { actorId: "human-1", displayName: "Owner" };
const T0 = "2026-09-12T10:00:00.000Z";
const T1 = "2026-09-12T10:00:01.000Z";
const RESULT = { summary: "Summary", findings: ["Finding"], evidence: ["Evidence"], limitations: [] };

function createDb(): Database.Database {
    const db = new Database(":memory:");
    db.pragma("foreign_keys = ON");
    db.exec(OPERATIONS_SCHEMA_SQL);
    db.exec(APPROVALS_SCHEMA_SQL);
    db.exec(EXECUTION_SCHEMA_SQL);
    db.exec(`
        CREATE TABLE projects (id TEXT PRIMARY KEY, slug TEXT NOT NULL UNIQUE, name TEXT NOT NULL, status TEXT NOT NULL);
        CREATE TABLE project_items (id TEXT PRIMARY KEY, project_id TEXT NOT NULL, title TEXT NOT NULL);
    `);
    db.prepare("INSERT INTO projects (id, slug, name, status) VALUES (?,?,?,?)").run("p1", "project-a", "Project A", "active");
    return db;
}

function seed(db: Database.Database) {
    const principal: AgentPrincipal = { actorId: "agent-1", actorName: "Agent", scopes: ["operations:request"] };
    const op = createOperation(db, principal, {
        operationType: "ai.read_analyze",
        targetType: "project",
        targetRef: "project-a",
        payload: { analysisMode: "summary_findings_evidence", sourceLabel: "Source", sourceText: "Alpha" },
    });
    const approval = approveOperation(db, HUMAN, op.id, {
        expectedPreviewFingerprint: op.previewFingerprint,
        expectedPayloadHash: op.payloadHash,
        expectedContractVersion: op.contractVersion,
    }, { now: T0 }).review.approval!;
    return { op, approvalId: approval.id };
}

function clock(...times: string[]) {
    let i = 0;
    return () => times[Math.min(i++, times.length - 1)];
}

async function executionCode(promise: Promise<unknown>): Promise<string> {
    try {
        await promise;
        throw new Error("expected ExecutionError");
    } catch (error) {
        if (error instanceof ExecutionError) return error.code;
        throw error;
    }
}

describe("ACC-P5-001 bounded AI execution", () => {
    it("commits structured evidence, consumes approval once, and writes zero project_items", async () => {
        const db = createDb();
        const { op, approvalId } = seed(db);
        const runtime = vi.fn().mockResolvedValue(RESULT);
        const outcome = await executeAiReadAnalyze(db, HUMAN, op.id, { approvalId }, { runtime, now: clock(T0, T1) });
        expect(outcome.replay).toBe(false);
        expect(runtime).toHaveBeenCalledTimes(1);
        expect((db.prepare("SELECT COUNT(*) c FROM project_items").get() as { c: number }).c).toBe(0);
        const attempt = db.prepare("SELECT * FROM operation_execution_attempts WHERE operation_id=? AND execution_status='committed'").get(op.id) as Record<string, unknown>;
        expect(attempt.execution_kind).toBe("ai_read_analyze");
        expect(attempt.target_table).toBeNull();
        expect(attempt.target_record_id).toBeNull();
        const persisted = JSON.parse(String(attempt.result_json));
        expect(persisted.result).toEqual(RESULT);
        expect(persisted.executionMetadata).toMatchObject({
            operationId: op.id,
            approvalId,
            executionAttemptId: attempt.id,
            contractVersion: "ai.read_analyze.v1",
            provider: "openai",
            model: "gpt-5.6-terra",
        });
        expect((db.prepare("SELECT approval_status FROM operation_approvals WHERE id=?").get(approvalId) as { approval_status: string }).approval_status).toBe("consumed");
        expect((db.prepare("SELECT status FROM operations WHERE id=?").get(op.id) as { status: string }).status).toBe("succeeded");
        db.close();
    });

    it("replays the committed result without a second provider call", async () => {
        const db = createDb();
        const { op, approvalId } = seed(db);
        const runtime = vi.fn().mockResolvedValue(RESULT);
        const first = await executeAiReadAnalyze(db, HUMAN, op.id, { approvalId }, { runtime, now: clock(T0, T1) });
        const second = await executeAiReadAnalyze(db, HUMAN, op.id, { approvalId }, { runtime, now: clock(T1) });
        expect(second.replay).toBe(true);
        expect(second.execution.attemptId).toBe(first.execution.attemptId);
        expect(runtime).toHaveBeenCalledTimes(1);
        expect((db.prepare("SELECT COUNT(*) c FROM operation_execution_attempts WHERE execution_status='committed'").get() as { c: number }).c).toBe(1);
        db.close();
    });

    it("records timeout failure, returns operation to pending, and does not consume approval", async () => {
        const db = createDb();
        const { op, approvalId } = seed(db);
        const runtime = vi.fn().mockRejectedValue(new AiRuntimeError("AI_TIMEOUT"));
        expect(await executionCode(executeAiReadAnalyze(db, HUMAN, op.id, { approvalId }, { runtime, now: clock(T0, T1) }))).toBe("OPS_EXECUTION_AI_TIMEOUT");
        expect((db.prepare("SELECT status FROM operations WHERE id=?").get(op.id) as { status: string }).status).toBe("pending");
        expect((db.prepare("SELECT approval_status FROM operation_approvals WHERE id=?").get(approvalId) as { approval_status: string }).approval_status).toBe("approved");
        const failure = db.prepare("SELECT * FROM operation_execution_attempts WHERE operation_id=? AND execution_status='failed_before_write'").get(op.id) as Record<string, unknown>;
        expect(failure.failure_code).toBe("OPS_EXECUTION_AI_TIMEOUT");
        expect((db.prepare("SELECT COUNT(*) c FROM project_items").get() as { c: number }).c).toBe(0);
        db.close();
    });

    it("rejects a second execute while the first model call is in progress", async () => {
        const db = createDb();
        const { op, approvalId } = seed(db);
        let resolveRuntime!: (value: typeof RESULT) => void;
        const runtime = vi.fn(() => new Promise<typeof RESULT>((resolve) => { resolveRuntime = resolve; }));
        const first = executeAiReadAnalyze(db, HUMAN, op.id, { approvalId }, { runtime, now: clock(T0, T1) });
        expect((db.prepare("SELECT status FROM operations WHERE id=?").get(op.id) as { status: string }).status).toBe("executing");
        expect(await executionCode(executeAiReadAnalyze(db, HUMAN, op.id, { approvalId }, { runtime, now: clock(T0) }))).toBe("OPS_EXECUTION_IN_PROGRESS");
        expect(runtime).toHaveBeenCalledTimes(1);
        resolveRuntime(RESULT);
        await first;
        expect(runtime).toHaveBeenCalledTimes(1);
        db.close();
    });

    it("rejects invalid structured result and never commits it", async () => {
        const db = createDb();
        const { op, approvalId } = seed(db);
        const runtime = vi.fn().mockResolvedValue({ ...RESULT, unexpected: true });
        expect(await executionCode(executeAiReadAnalyze(db, HUMAN, op.id, { approvalId }, { runtime: runtime as never, now: clock(T0, T1) }))).toBe("OPS_EXECUTION_AI_RESULT_INVALID");
        expect((db.prepare("SELECT COUNT(*) c FROM operation_execution_attempts WHERE execution_status='committed'").get() as { c: number }).c).toBe(0);
        expect((db.prepare("SELECT status FROM operations WHERE id=?").get(op.id) as { status: string }).status).toBe("pending");
        db.close();
    });
});
