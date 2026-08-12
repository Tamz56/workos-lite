import Database from "better-sqlite3";
import { afterEach, describe, expect, it, vi } from "vitest";
import { APPROVALS_SCHEMA_SQL } from "@/lib/approvals/approvalsSchema";
import { approveOperation, revokeOperation } from "@/lib/approvals/service";
import { ExecutionError } from "@/lib/execution/errors";
import { EXECUTION_SCHEMA_SQL } from "@/lib/execution/executionSchema";
import { executeOperation } from "@/lib/execution/service";
import { OPERATIONS_SCHEMA_SQL } from "@/lib/operations/operationsSchema";
import { createOperation } from "@/lib/operations/service";
import type { AgentPrincipal } from "@/lib/agent-auth/agentAuthentication";
import type { OperationRecord } from "@/lib/operations/types";

const HUMAN = { actorId: "human-1", displayName: "Owner" };
const T0 = "2026-08-12T10:00:00.000Z";
const T1 = "2026-08-12T10:05:00.000Z";
const T_LATE = "2026-08-12T10:31:00.000Z";

function createDb(): Database.Database {
    const db = new Database(":memory:");
    db.pragma("foreign_keys = ON");
    db.exec(OPERATIONS_SCHEMA_SQL);
    db.exec(APPROVALS_SCHEMA_SQL);
    db.exec(EXECUTION_SCHEMA_SQL);
    db.exec(`
        CREATE TABLE projects (id TEXT PRIMARY KEY, slug TEXT NOT NULL UNIQUE, name TEXT NOT NULL, status TEXT NOT NULL, created_at TEXT, updated_at TEXT);
        CREATE TABLE project_items (
            id TEXT PRIMARY KEY,
            project_id TEXT NOT NULL,
            title TEXT NOT NULL,
            status TEXT NOT NULL CHECK (status IN ('inbox', 'planned', 'done')),
            priority INTEGER NULL,
            schedule_bucket TEXT NULL,
            start_date TEXT NULL,
            end_date TEXT NULL,
            is_milestone INTEGER NOT NULL DEFAULT 0,
            workstream TEXT NULL,
            dod_text TEXT NULL,
            notes TEXT NULL,
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            updated_at TEXT NOT NULL DEFAULT (datetime('now')),
            FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE
        );
    `);
    db.prepare("INSERT INTO projects (id, slug, name, status, created_at, updated_at) VALUES (?,?,?,?,?,?)")
        .run("p1", "project-a", "Project A", "planned", "2026-01-01", "2026-01-01");
    return db;
}

function principal(): AgentPrincipal {
    return { actorId: "agent-test", actorName: "Test Agent", scopes: ["operations:request"] };
}

function createValidOperation(db: Database.Database, title = "Task A"): OperationRecord {
    return createOperation(db, principal(), {
        operationType: "backlog.create",
        targetType: "project",
        targetRef: "project-a",
        payload: { title },
    });
}

function tokens(op: OperationRecord): Record<string, string> {
    return {
        expectedPreviewFingerprint: op.previewFingerprint,
        expectedPayloadHash: op.payloadHash,
        expectedContractVersion: op.contractVersion,
    };
}

function approve(db: Database.Database, op: OperationRecord, now = T0): string {
    const result = approveOperation(db, HUMAN, op.id, tokens(op), { now });
    return result.review.approval!.id;
}

function execute(db: Database.Database, op: OperationRecord, approvalId: string, now = T1) {
    return executeOperation(db, HUMAN, op.id, { approvalId }, { now });
}

function errorCode(fn: () => unknown): string {
    try {
        fn();
        throw new Error("expected ExecutionError");
    } catch (error) {
        if (error instanceof ExecutionError) return error.code;
        throw error;
    }
}

function insertRawApproval(db: Database.Database, op: OperationRecord, overrides: Record<string, unknown> = {}): string {
    const row = db.prepare("SELECT * FROM operations WHERE id = ?").get(op.id) as Record<string, unknown>;
    const values = {
        id: "apr-raw",
        operation_id: op.id,
        approval_status: "approved",
        approver_actor_type: "human",
        approver_actor_id: "human-1",
        approver_display_name: "Owner",
        approved_at: T0,
        expires_at: "2026-08-12T10:30:00.000Z",
        bound_operation_type: row.operation_type,
        bound_target_type: row.target_type,
        bound_target_ref: row.target_ref,
        bound_resolved_target_id: row.resolved_target_id,
        bound_payload_hash: row.payload_hash,
        bound_contract_version: row.contract_version,
        bound_preview_fingerprint: row.preview_fingerprint,
        preview_json: row.preview_json,
        created_at: T0,
        updated_at: T0,
        ...overrides,
    };
    db.prepare(`
        INSERT INTO operation_approvals (
            id, operation_id, approval_status, approver_actor_type, approver_actor_id,
            approver_display_name, approved_at, expires_at,
            bound_operation_type, bound_target_type, bound_target_ref,
            bound_resolved_target_id, bound_payload_hash, bound_contract_version,
            bound_preview_fingerprint, preview_json, created_at, updated_at
        ) VALUES (
            @id, @operation_id, @approval_status, @approver_actor_type, @approver_actor_id,
            @approver_display_name, @approved_at, @expires_at,
            @bound_operation_type, @bound_target_type, @bound_target_ref,
            @bound_resolved_target_id, @bound_payload_hash, @bound_contract_version,
            @bound_preview_fingerprint, @preview_json, @created_at, @updated_at
        )
    `).run(values);
    return values.id;
}

function injectFailure(db: Database.Database, pattern: string): void {
    const originalPrepare = db.prepare.bind(db);
    vi.spyOn(db, "prepare").mockImplementation((sql: string) => {
        if (sql.includes(pattern)) throw new Error("boom");
        return originalPrepare(sql);
    });
}

function counts(db: Database.Database) {
    return {
        items: (db.prepare("SELECT COUNT(*) AS c FROM project_items").get() as { c: number }).c,
        committed: (db.prepare("SELECT COUNT(*) AS c FROM operation_execution_attempts WHERE execution_status='committed'").get() as { c: number }).c,
        failed: (db.prepare("SELECT COUNT(*) AS c FROM operation_execution_attempts WHERE execution_status IN ('failed_before_write','rolled_back')").get() as { c: number }).c,
        consumedEvents: (db.prepare("SELECT COUNT(*) AS c FROM operation_approval_events WHERE event_type='consumed'").get() as { c: number }).c,
    };
}

afterEach(() => {
    vi.restoreAllMocks();
});

describe("Execution success", () => {
    it("commits one project item, consumes the approval once, records one consumed event and a committed attempt", () => {
        const db = createDb();
        const op = createValidOperation(db);
        const approvalId = approve(db, op);
        const outcome = execute(db, op, approvalId);
        expect(outcome.replay).toBe(false);
        expect(outcome.execution.status).toBe("committed");
        expect(outcome.execution.targetRecordId).toBeTruthy();

        expect(counts(db)).toEqual({ items: 1, committed: 1, failed: 0, consumedEvents: 1 });
        const item = db.prepare("SELECT * FROM project_items WHERE id = ?").get(outcome.execution.targetRecordId) as Record<string, unknown>;
        expect(item.project_id).toBe("p1");
        expect(item.title).toBe("Task A");
        expect(item.status).toBe("planned");
        expect(item.created_at).toBeTruthy();
        expect(item.updated_at).toBeTruthy();
        const approval = db.prepare("SELECT approval_status, consumed_at FROM operation_approvals WHERE id = ?").get(approvalId) as { approval_status: string; consumed_at: string | null };
        expect(approval.approval_status).toBe("consumed");
        expect(approval.consumed_at).toBe(T1);
        const operation = db.prepare("SELECT status FROM operations WHERE id = ?").get(op.id) as { status: string };
        expect(operation.status).toBe("succeeded");
        const projects = db.prepare("SELECT COUNT(*) AS c FROM projects").get() as { c: number };
        expect(projects.c).toBe(1);
        db.close();
    });
});

describe("Committed replay", () => {
    it("replays the committed result after lost response with zero deltas (checked before pending/approved)", () => {
        const db = createDb();
        const op = createValidOperation(db);
        const approvalId = approve(db, op);
        const first = execute(db, op, approvalId);
        // Post-success state is succeeded + consumed; replay must still work.
        const before = counts(db);
        const second = execute(db, op, approvalId);
        expect(second.replay).toBe(true);
        expect(second.execution.attemptId).toBe(first.execution.attemptId);
        expect(second.execution.targetRecordId).toBe(first.execution.targetRecordId);
        expect(counts(db)).toEqual(before);
        db.close();
    });

    it("returns conflict when replaying with a different approval id and never executes", () => {
        const db = createDb();
        const opA = createValidOperation(db, "A");
        const opB = createValidOperation(db, "B");
        const approvalA = approve(db, opA);
        const approvalB = approve(db, opB);
        execute(db, opA, approvalA);
        expect(errorCode(() => execute(db, opA, approvalB))).toBe("OPS_EXECUTION_CONFLICT");
        expect(counts(db)).toEqual({ items: 1, committed: 1, failed: 0, consumedEvents: 1 });
        db.close();
    });
});

describe("Explicit approval staleness", () => {
    it("never switches to a newer approval when the requested one is revoked", () => {
        const db = createDb();
        const op = createValidOperation(db);
        const approvalA = approve(db, op);
        revokeOperation(db, HUMAN, op.id, { approvalId: approvalA }, { now: T0 });
        const approvalB = approve(db, op);
        expect(errorCode(() => execute(db, op, approvalA))).toBe("OPS_EXECUTION_APPROVAL_REVOKED");
        expect(counts(db)).toEqual({ items: 0, committed: 0, failed: 1, consumedEvents: 0 });
        const b = db.prepare("SELECT approval_status FROM operation_approvals WHERE id = ?").get(approvalB) as { approval_status: string };
        expect(b.approval_status).toBe("approved");
        const operation = db.prepare("SELECT status FROM operations WHERE id = ?").get(op.id) as { status: string };
        expect(operation.status).toBe("pending");
        db.close();
    });

    it("returns expired for a stale approval even when a newer one is active", () => {
        const db = createDb();
        const op = createValidOperation(db);
        const approvalA = approve(db, op);
        // A expires; B is issued at T_LATE after materialization.
        const approvalB = approve(db, op, T_LATE);
        expect(approvalB).not.toBe(approvalA);
        expect(errorCode(() => execute(db, op, approvalA))).toBe("OPS_EXECUTION_APPROVAL_EXPIRED");
        expect(counts(db)).toEqual({ items: 0, committed: 0, failed: 1, consumedEvents: 0 });
        db.close();
    });
});

describe("Approval state matrix", () => {
    it("expired by timestamp", () => {
        const db = createDb();
        const op = createValidOperation(db);
        const approvalId = approve(db, op);
        expect(errorCode(() => execute(db, op, approvalId, T_LATE))).toBe("OPS_EXECUTION_APPROVAL_EXPIRED");
        expect(counts(db)).toEqual({ items: 0, committed: 0, failed: 1, consumedEvents: 0 });
        db.close();
    });

    it("stored expired", () => {
        const db = createDb();
        const op = createValidOperation(db);
        const approvalId = approve(db, op);
        db.prepare("UPDATE operation_approvals SET approval_status='expired', updated_at=? WHERE id=?").run(T1, approvalId);
        expect(errorCode(() => execute(db, op, approvalId))).toBe("OPS_EXECUTION_APPROVAL_EXPIRED");
        expect(counts(db).items).toBe(0);
        db.close();
    });

    it("revoked", () => {
        const db = createDb();
        const op = createValidOperation(db);
        const approvalId = approve(db, op);
        revokeOperation(db, HUMAN, op.id, { approvalId }, { now: T0 });
        expect(errorCode(() => execute(db, op, approvalId))).toBe("OPS_EXECUTION_APPROVAL_REVOKED");
        expect(counts(db).items).toBe(0);
        db.close();
    });

    it("consumed without a committed attempt", () => {
        const db = createDb();
        const op = createValidOperation(db);
        const approvalId = approve(db, op);
        db.prepare("UPDATE operation_approvals SET approval_status='consumed', consumed_at=?, updated_at=? WHERE id=?").run(T1, T1, approvalId);
        expect(errorCode(() => execute(db, op, approvalId))).toBe("OPS_EXECUTION_APPROVAL_CONSUMED");
        expect(counts(db).items).toBe(0);
        db.close();
    });

    it("approval belonging to another operation behaves as not found without an audit row", () => {
        const db = createDb();
        const opA = createValidOperation(db, "A");
        const opB = createValidOperation(db, "B");
        const approvalB = approve(db, opB);
        expect(errorCode(() => execute(db, opA, approvalB))).toBe("OPS_EXECUTION_APPROVAL_NOT_FOUND");
        expect(counts(db)).toEqual({ items: 0, committed: 0, failed: 0, consumedEvents: 0 });
        db.close();
    });

    it("missing approval behaves as not found without an audit row", () => {
        const db = createDb();
        const op = createValidOperation(db);
        expect(errorCode(() => execute(db, op, "apr-missing"))).toBe("OPS_EXECUTION_APPROVAL_NOT_FOUND");
        expect(counts(db)).toEqual({ items: 0, committed: 0, failed: 0, consumedEvents: 0 });
        db.close();
    });
});

describe("Target re-resolution", () => {
    it("blocks when the project is missing", () => {
        const db = createDb();
        const op = createValidOperation(db);
        const approvalId = approve(db, op);
        db.prepare("DELETE FROM projects WHERE id = 'p1'").run();
        expect(errorCode(() => execute(db, op, approvalId))).toBe("OPS_EXECUTION_TARGET_STALE");
        expect(counts(db)).toEqual({ items: 0, committed: 0, failed: 1, consumedEvents: 0 });
        const operation = db.prepare("SELECT status FROM operations WHERE id = ?").get(op.id) as { status: string };
        expect(operation.status).toBe("failed");
        db.close();
    });

    it("blocks when the slug now resolves to a different project id", () => {
        const db = createDb();
        const op = createValidOperation(db);
        const approvalId = approve(db, op);
        db.prepare("UPDATE projects SET id = 'p2' WHERE id = 'p1'").run();
        expect(errorCode(() => execute(db, op, approvalId))).toBe("OPS_EXECUTION_TARGET_STALE");
        expect(counts(db).items).toBe(0);
        const operation = db.prepare("SELECT status FROM operations WHERE id = ?").get(op.id) as { status: string };
        expect(operation.status).toBe("failed");
        db.close();
    });

    it("blocks when operation.resolved_target_id is corrupted (integrity failure, zero write)", () => {
        const db = createDb();
        const op = createValidOperation(db);
        const approvalId = approve(db, op);
        db.prepare("UPDATE operations SET resolved_target_id = 'wrong' WHERE id = ?").run(op.id);
        expect(errorCode(() => execute(db, op, approvalId))).toBe("OPS_EXECUTION_OPERATION_INTEGRITY_FAILED");
        expect(counts(db).items).toBe(0);
        const operation = db.prepare("SELECT status FROM operations WHERE id = ?").get(op.id) as { status: string };
        expect(operation.status).toBe("failed");
        db.close();
    });

    it("blocks when approval.bound_resolved_target_id is corrupted (binding mismatch, zero write)", () => {
        const db = createDb();
        const op = createValidOperation(db);
        const approvalId = insertRawApproval(db, op, { bound_resolved_target_id: "wrong" });
        expect(approvalId).toBe("apr-raw");
        expect(errorCode(() => execute(db, op, approvalId))).toBe("OPS_EXECUTION_APPROVAL_BINDING_MISMATCH");
        expect(counts(db).items).toBe(0);
        db.close();
    });

    it("blocks when bound_target_ref mismatches", () => {
        const db = createDb();
        const op = createValidOperation(db);
        const approvalId = insertRawApproval(db, op, { bound_target_ref: "other-project" });
        expect(errorCode(() => execute(db, op, approvalId))).toBe("OPS_EXECUTION_APPROVAL_BINDING_MISMATCH");
        expect(counts(db).items).toBe(0);
        db.close();
    });
});

describe("Approval binding corruption matrix", () => {
    const corruptions: Array<[string, Record<string, unknown>]> = [
        ["bound_operation_type", { bound_operation_type: "other.type" }],
        ["bound_target_type", { bound_target_type: "workspace" }],
        ["bound_target_ref", { bound_target_ref: "other" }],
        ["bound_resolved_target_id", { bound_resolved_target_id: "other" }],
        ["bound_payload_hash", { bound_payload_hash: "deadbeef" }],
        ["bound_contract_version", { bound_contract_version: "other.v9" }],
        ["bound_preview_fingerprint", { bound_preview_fingerprint: "deadbeef" }],
        ["approval.preview_json", { preview_json: '{"tampered":true}' }],
    ];
    it.each(corruptions)("blocks %s with zero writes and terminal failure", (_label, overrides) => {
        const db = createDb();
        const op = createValidOperation(db);
        const approvalId = insertRawApproval(db, op, overrides);
        expect(errorCode(() => execute(db, op, approvalId))).toBe("OPS_EXECUTION_APPROVAL_BINDING_MISMATCH");
        expect(counts(db)).toEqual({ items: 0, committed: 0, failed: 1, consumedEvents: 0 });
        const approval = db.prepare("SELECT approval_status FROM operation_approvals WHERE id = ?").get(approvalId) as { approval_status: string };
        expect(approval.approval_status).toBe("approved");
        const operation = db.prepare("SELECT status FROM operations WHERE id = ?").get(op.id) as { status: string };
        expect(operation.status).toBe("failed");
        db.close();
    });
});

describe("Operation integrity corruption matrix", () => {
    const corruptions: Array<[string, string]> = [
        ["payload_json", '{"title":"Tampered","status":"planned"}'],
        ["payload_hash", "deadbeef"],
        ["preview_json", '{"operationType":"backlog.create","tampered":true}'],
        ["preview_fingerprint", "deadbeef"],
        ["contract_version", "backlog.create.v9"],
    ];
    it.each(corruptions)("blocks %s with zero writes and terminal failure", (column, value) => {
        const db = createDb();
        const op = createValidOperation(db);
        const approvalId = approve(db, op);
        db.prepare(`UPDATE operations SET ${column} = ? WHERE id = ?`).run(value, op.id);
        expect(errorCode(() => execute(db, op, approvalId))).toBe("OPS_EXECUTION_OPERATION_INTEGRITY_FAILED");
        expect(counts(db)).toEqual({ items: 0, committed: 0, failed: 1, consumedEvents: 0 });
        const approval = db.prepare("SELECT approval_status FROM operation_approvals WHERE id = ?").get(approvalId) as { approval_status: string };
        expect(approval.approval_status).toBe("approved");
        const operation = db.prepare("SELECT status FROM operations WHERE id = ?").get(op.id) as { status: string };
        expect(operation.status).toBe("failed");
        db.close();
    });
});

describe("Failure injection inside the success transaction", () => {
    const injections: Array<[string, string]> = [
        ["project item insert", "INSERT INTO project_items"],
        ["approval consume", "approval_status = 'consumed'"],
        ["consumed event insert", "INSERT INTO operation_approval_events"],
        ["attempt finalize", "SET execution_status = 'committed'"],
        ["operation succeeded", "status = 'succeeded'"],
    ];
    it.each(injections)("rolls back everything on %s", (_label, pattern) => {
        const db = createDb();
        const op = createValidOperation(db);
        const approvalId = approve(db, op);
        injectFailure(db, pattern);
        expect(errorCode(() => execute(db, op, approvalId))).toBe("OPS_EXECUTION_ROLLED_BACK");
        expect(counts(db)).toEqual({ items: 0, committed: 0, failed: 1, consumedEvents: 0 });
        const approval = db.prepare("SELECT approval_status, consumed_at FROM operation_approvals WHERE id = ?").get(approvalId) as { approval_status: string; consumed_at: string | null };
        expect(approval.approval_status).toBe("approved");
        expect(approval.consumed_at).toBeNull();
        const operation = db.prepare("SELECT status FROM operations WHERE id = ?").get(op.id) as { status: string };
        expect(operation.status).toBe("pending");
        const audit = db.prepare("SELECT execution_status, failure_code FROM operation_execution_attempts").all() as Array<{ execution_status: string; failure_code: string }>;
        expect(audit).toHaveLength(1);
        expect(audit[0].execution_status).toBe("rolled_back");
        expect(audit[0].failure_code).toBe("OPS_EXECUTION_ROLLED_BACK");
        db.close();
    });
});

describe("Failure audit classification", () => {
    it("persists failed_before_write and keeps operation pending for expired approval", () => {
        const db = createDb();
        const op = createValidOperation(db);
        const approvalId = approve(db, op);
        expect(errorCode(() => execute(db, op, approvalId, T_LATE))).toBe("OPS_EXECUTION_APPROVAL_EXPIRED");
        const audit = db.prepare("SELECT execution_status FROM operation_execution_attempts").all() as Array<{ execution_status: string }>;
        expect(audit).toHaveLength(1);
        expect(audit[0].execution_status).toBe("failed_before_write");
        const operation = db.prepare("SELECT status FROM operations WHERE id = ?").get(op.id) as { status: string };
        expect(operation.status).toBe("pending");
        db.close();
    });

    it("persists failed_before_write and terminal failure for target stale", () => {
        const db = createDb();
        const op = createValidOperation(db);
        const approvalId = approve(db, op);
        db.prepare("DELETE FROM projects WHERE id = 'p1'").run();
        expect(errorCode(() => execute(db, op, approvalId))).toBe("OPS_EXECUTION_TARGET_STALE");
        const audit = db.prepare("SELECT execution_status FROM operation_execution_attempts").all() as Array<{ execution_status: string }>;
        expect(audit).toHaveLength(1);
        expect(audit[0].execution_status).toBe("failed_before_write");
        const operation = db.prepare("SELECT status FROM operations WHERE id = ?").get(op.id) as { status: string };
        expect(operation.status).toBe("failed");
        db.close();
    });

    it("creates no attempt rows when no valid operation/approval pair exists", () => {
        const db = createDb();
        const op = createValidOperation(db);
        expect(errorCode(() => executeOperation(db, HUMAN, op.id, { approvalId: "not-a-real" }, { now: T1 })))
            .toBe("OPS_EXECUTION_INVALID_REQUEST");
        expect(errorCode(() => executeOperation(db, HUMAN, "op-missing", { approvalId: "apr-x" }, { now: T1 })))
            .toBe("OPS_EXECUTION_OPERATION_NOT_FOUND");
        expect(counts(db)).toEqual({ items: 0, committed: 0, failed: 0, consumedEvents: 0 });
        db.close();
    });

    it("returns the original execution error when failure-audit persistence itself fails", () => {
        const db = createDb();
        const op = createValidOperation(db);
        const approvalId = approve(db, op);
        const originalPrepare = db.prepare.bind(db);
        vi.spyOn(db, "prepare").mockImplementation((sql: string) => {
            if (sql.includes("INSERT INTO project_items")) throw new Error("boom");
            if (sql.includes("failure_code") && sql.includes("INSERT INTO operation_execution_attempts")) throw new Error("audit boom");
            return originalPrepare(sql);
        });
        expect(errorCode(() => execute(db, op, approvalId))).toBe("OPS_EXECUTION_ROLLED_BACK");
        expect(counts(db)).toEqual({ items: 0, committed: 0, failed: 0, consumedEvents: 0 });
        db.close();
    });
});

describe("Operation status matrix", () => {
    it("keeps succeeded intact when a later execution hits inconsistent state", () => {
        const db = createDb();
        const op = createValidOperation(db);
        const approvalId = approve(db, op);
        execute(db, op, approvalId);
        // Simulate a damaged control plane: succeeded without a committed attempt.
        db.prepare("DELETE FROM operation_execution_attempts").run();
        expect(errorCode(() => execute(db, op, approvalId))).toBe("OPS_EXECUTION_STATE_INCONSISTENT");
        const operation = db.prepare("SELECT status FROM operations WHERE id = ?").get(op.id) as { status: string };
        expect(operation.status).toBe("succeeded");
        expect(counts(db).items).toBe(1);
        db.close();
    });

    it("returns not executable for a failed operation", () => {
        const db = createDb();
        const op = createValidOperation(db);
        const approvalId = approve(db, op);
        db.prepare("DELETE FROM projects WHERE id = 'p1'").run();
        expect(errorCode(() => execute(db, op, approvalId))).toBe("OPS_EXECUTION_TARGET_STALE");
        expect(errorCode(() => execute(db, op, approvalId))).toBe("OPS_EXECUTION_NOT_EXECUTABLE");
        db.close();
    });
});
