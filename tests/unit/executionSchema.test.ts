import Database from "better-sqlite3";
import { describe, expect, it } from "vitest";
import { APPROVALS_SCHEMA_SQL } from "@/lib/approvals/approvalsSchema";
import { EXECUTION_SCHEMA_SQL, ensureExecutionSchema } from "@/lib/execution/executionSchema";
import { OPERATIONS_SCHEMA_SQL } from "@/lib/operations/operationsSchema";

function createDb(): Database.Database {
    const db = new Database(":memory:");
    db.pragma("foreign_keys = ON");
    db.exec(OPERATIONS_SCHEMA_SQL);
    db.exec(APPROVALS_SCHEMA_SQL);
    db.exec(EXECUTION_SCHEMA_SQL);
    return db;
}

function seedOperation(db: Database.Database, id = "op-1"): void {
    db.prepare(`
        INSERT INTO operations (
            id, operation_type, target_type, target_ref, resolved_target_id,
            payload_json, payload_hash, idempotency_key, source,
            requester_actor_type, requester_actor_id, status,
            validation_result_json, preview_json, preview_fingerprint,
            contract_version, requested_at, created_at, updated_at
        ) VALUES (?, 'backlog.create', 'project', 'proj-a', 'p1', '{}', 'h', NULL, 'agent', 'agent', 'agent-1', 'pending', '{}', '{}', 'fp', 'backlog.create.v1', 't', 't', 't')
    `).run(id);
}

function insertApproval(db: Database.Database, id: string, operationId: string, status: string): void {
    db.prepare(`
        INSERT INTO operation_approvals (
            id, operation_id, approval_status, approver_actor_type, approver_actor_id,
            approver_display_name, approved_at, expires_at,
            bound_operation_type, bound_target_type, bound_target_ref,
            bound_resolved_target_id, bound_payload_hash, bound_contract_version,
            bound_preview_fingerprint, preview_json, created_at, updated_at
        ) VALUES (?, ?, ?, 'human', 'human-1', 'Owner', 't', 't', 'backlog.create', 'project', 'proj-a', 'p1', 'h', 'backlog.create.v1', 'fp', '{}', 't', 't')
    `).run(id, operationId, status);
}

function insertAttempt(
    db: Database.Database,
    input: {
        id: string;
        operationId: string;
        approvalId: string;
        status: "started" | "committed" | "failed_before_write" | "rolled_back";
        finishedAt?: string | null;
        targetRecordId?: string | null;
        resultJson?: string | null;
        failureCode?: string | null;
        safeMessage?: string | null;
    },
): void {
    db.prepare(`
        INSERT INTO operation_execution_attempts (
            id, operation_id, approval_id, execution_status,
            trigger_actor_type, trigger_actor_id, trigger_display_name,
            executor_actor_type, executor_actor_id,
            started_at, finished_at, target_table, target_record_id, result_json,
            failure_code, safe_failure_message, created_at, updated_at
        ) VALUES (?, ?, ?, ?, 'human', 'h1', 'Owner', 'system', 'system', 't', ?, ?, ?, ?, ?, ?, 't', 't')
    `).run(
        input.id,
        input.operationId,
        input.approvalId,
        input.status,
        input.finishedAt ?? null,
        input.status === "committed" ? "project_items" : null,
        input.targetRecordId ?? null,
        input.resultJson ?? null,
        input.failureCode ?? null,
        input.safeMessage ?? null,
    );
}

function committedAttempt(id: string, operationId: string, approvalId: string): Parameters<typeof insertAttempt>[1] {
    return {
        id,
        operationId,
        approvalId,
        status: "committed",
        finishedAt: "t",
        targetRecordId: "item-1",
        resultJson: "{}",
    };
}

function failedAttempt(id: string, operationId: string, approvalId: string, status: "failed_before_write" | "rolled_back"): Parameters<typeof insertAttempt>[1] {
    return {
        id,
        operationId,
        approvalId,
        status,
        finishedAt: "t",
        failureCode: "OPS_EXECUTION_ROLLED_BACK",
        safeMessage: "safe",
    };
}

describe("Execution schema", () => {
    it("creates the table, is idempotent, and enforces FK RESTRICT", () => {
        const db = createDb();
        expect(db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='operation_execution_attempts'").get()).toBeTruthy();
        ensureExecutionSchema(db, () => undefined);
        seedOperation(db);
        insertApproval(db, "apr-1", "op-1", "approved");
        insertAttempt(db, { id: "opexec-1", operationId: "op-1", approvalId: "apr-1", status: "started" });
        expect(() => db.prepare("DELETE FROM operations WHERE id = 'op-1'").run()).toThrow();
        expect(() => db.prepare("DELETE FROM operation_approvals WHERE id = 'apr-1'").run()).toThrow();
        db.close();
    });

    it("rejects invalid statuses and actor identities", () => {
        const db = createDb();
        seedOperation(db);
        insertApproval(db, "apr-1", "op-1", "approved");
        expect(() => insertAttempt(db, { id: "a1", operationId: "op-1", approvalId: "apr-1", status: "cancelled" as never })).toThrow();
        expect(() => db.prepare(`
            INSERT INTO operation_execution_attempts (
                id, operation_id, approval_id, execution_status,
                trigger_actor_type, trigger_actor_id, trigger_display_name,
                executor_actor_type, executor_actor_id,
                started_at, created_at, updated_at
            ) VALUES ('a2', 'op-1', 'apr-1', 'started', 'agent', 'a', NULL, 'system', 'system', 't', 't', 't')
        `).run()).toThrow();
        expect(() => db.prepare(`
            INSERT INTO operation_execution_attempts (
                id, operation_id, approval_id, execution_status,
                trigger_actor_type, trigger_actor_id, trigger_display_name,
                executor_actor_type, executor_actor_id,
                started_at, created_at, updated_at
            ) VALUES ('a3', 'op-1', 'apr-1', 'started', 'human', 'h1', NULL, 'worker', 'w', 't', 't', 't')
        `).run()).toThrow();
        db.close();
    });

    it("enforces row-shape CHECKs per status", () => {
        const db = createDb();
        seedOperation(db);
        insertApproval(db, "apr-1", "op-1", "approved");
        expect(() => insertAttempt(db, { ...committedAttempt("c1", "op-1", "apr-1"), targetRecordId: null })).toThrow();
        expect(() => insertAttempt(db, { ...failedAttempt("f1", "op-1", "apr-1", "rolled_back"), failureCode: null })).toThrow();
        expect(() => insertAttempt(db, { ...failedAttempt("f2", "op-1", "apr-1", "failed_before_write"), safeMessage: null })).toThrow();
        expect(() => insertAttempt(db, { id: "s1", operationId: "op-1", approvalId: "apr-1", status: "started", finishedAt: "t" })).toThrow();
        db.close();
    });

    it("blocks attempts whose approval belongs to another operation (pair integrity)", () => {
        const db = createDb();
        seedOperation(db, "op-1");
        seedOperation(db, "op-2");
        insertApproval(db, "apr-1", "op-1", "approved");
        expect(() => insertAttempt(db, { id: "x1", operationId: "op-2", approvalId: "apr-1", status: "started" })).toThrow();
        db.close();
    });

    it("blocks binding-field updates while allowing lifecycle updates", () => {
        const db = createDb();
        seedOperation(db);
        insertApproval(db, "apr-1", "op-1", "approved");
        insertAttempt(db, { id: "opexec-1", operationId: "op-1", approvalId: "apr-1", status: "started" });
        expect(() => db.prepare("UPDATE operation_execution_attempts SET operation_id = 'op-x' WHERE id = 'opexec-1'").run()).toThrow();
        expect(() => db.prepare("UPDATE operation_execution_attempts SET approval_id = 'apr-x' WHERE id = 'opexec-1'").run()).toThrow();
        expect(() => db.prepare("UPDATE operation_execution_attempts SET trigger_actor_id = 'h2' WHERE id = 'opexec-1'").run()).toThrow();
        expect(() => db.prepare("UPDATE operation_execution_attempts SET started_at = 'other' WHERE id = 'opexec-1'").run()).toThrow();
        db.prepare(`
            UPDATE operation_execution_attempts
            SET execution_status = 'committed', finished_at = 't',
                target_table = 'project_items', target_record_id = 'item-1',
                result_json = '{}', updated_at = 't'
            WHERE id = 'opexec-1'
        `).run();
        const row = db.prepare("SELECT execution_status FROM operation_execution_attempts WHERE id = 'opexec-1'").get() as { execution_status: string };
        expect(row.execution_status).toBe("committed");
        db.close();
    });

    it("enforces one committed attempt per operation while allowing retries", () => {
        const db = createDb();
        seedOperation(db, "op-1");
        seedOperation(db, "op-2");
        seedOperation(db, "op-3");
        insertApproval(db, "apr-1", "op-1", "approved");
        insertApproval(db, "apr-2", "op-2", "approved");
        insertApproval(db, "apr-3", "op-3", "approved");
        insertAttempt(db, committedAttempt("c1", "op-1", "apr-1"));
        expect(() => insertAttempt(db, committedAttempt("c2", "op-1", "apr-1"))).toThrow();
        // failed old + committed new allowed
        insertAttempt(db, failedAttempt("f1", "op-2", "apr-2", "rolled_back"));
        insertAttempt(db, committedAttempt("c3", "op-2", "apr-2"));
        // multiple failed attempts same approval allowed
        insertAttempt(db, failedAttempt("f2", "op-2", "apr-2", "failed_before_write"));
        insertAttempt(db, failedAttempt("f3", "op-2", "apr-2", "rolled_back"));
        // different operations commit independently
        insertAttempt(db, committedAttempt("c4", "op-3", "apr-3"));
        const committed = db.prepare("SELECT COUNT(*) AS c FROM operation_execution_attempts WHERE execution_status = 'committed'").get() as { c: number };
        expect(committed.c).toBe(3);
        db.close();
    });
});
