import Database from "better-sqlite3";
import { describe, expect, it } from "vitest";
import {
    APPROVALS_SCHEMA_SQL,
    ensureApprovalsSchema,
} from "@/lib/approvals/approvalsSchema";
import { OPERATIONS_SCHEMA_SQL } from "@/lib/operations/operationsSchema";

function createDb(): Database.Database {
    const db = new Database(":memory:");
    db.pragma("foreign_keys = ON");
    db.exec(OPERATIONS_SCHEMA_SQL);
    db.exec(APPROVALS_SCHEMA_SQL);
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
        ) VALUES (?, ?, ?, 'human', 'human-1', 'Owner', '2026-08-12T10:00:00.000Z', '2026-08-12T10:30:00.000Z', 'backlog.create', 'project', 'proj-a', 'p1', 'h', 'backlog.create.v1', 'fp', '{}', 't', 't')
    `).run(id, operationId, status);
}

function insertRejectedEvent(db: Database.Database, operationId: string, id: string): void {
    db.prepare(`
        INSERT INTO operation_approval_events (
            id, operation_id, approval_id, event_type, actor_type, actor_id,
            actor_display_name, occurred_at, event_code, safe_reason, created_at
        ) VALUES (?, ?, NULL, 'rejected', 'human', 'human-1', 'Owner', 't', 'APPROVAL_REJECTED', NULL, 't')
    `).run(id, operationId);
}

describe("Approvals schema", () => {
    it("creates both tables, is idempotent, and enforces FK RESTRICT", () => {
        const db = createDb();
        expect(db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='operation_approvals'").get()).toBeTruthy();
        expect(db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='operation_approval_events'").get()).toBeTruthy();
        ensureApprovalsSchema(db, () => undefined);
        seedOperation(db);
        insertApproval(db, "apr-1", "op-1", "approved");
        expect(() => db.prepare("DELETE FROM operations WHERE id = 'op-1'").run()).toThrow(); // RESTRICT
        db.close();
    });

    it("rejects invalid statuses, event types, and actor types", () => {
        const db = createDb();
        seedOperation(db);
        expect(() => insertApproval(db, "apr-1", "op-1", "rejected")).toThrow(); // approval rows have no rejected
        expect(() => db.prepare(`
            INSERT INTO operation_approval_events (
                id, operation_id, approval_id, event_type, actor_type, actor_id,
                actor_display_name, occurred_at, event_code, safe_reason, created_at
            ) VALUES ('ape-x', 'op-1', NULL, 'wat', 'human', 'h', NULL, 't', NULL, NULL, 't')
        `).run()).toThrow();
        expect(() => db.prepare(`
            INSERT INTO operation_approval_events (
                id, operation_id, approval_id, event_type, actor_type, actor_id,
                actor_display_name, occurred_at, event_code, safe_reason, created_at
            ) VALUES ('ape-y', 'op-1', NULL, 'approved', 'agent', 'a', NULL, 't', NULL, NULL, 't')
        `).run()).toThrow();
        db.close();
    });

    it("enforces at most one active approved approval per operation", () => {
        const db = createDb();
        seedOperation(db, "op-1");
        seedOperation(db, "op-2");
        insertApproval(db, "apr-1", "op-1", "approved");
        expect(() => insertApproval(db, "apr-2", "op-1", "approved")).toThrow();
        insertApproval(db, "apr-3", "op-2", "approved"); // different operation ok
        // lifecycle transitions free the slot
        db.prepare("UPDATE operation_approvals SET approval_status='revoked', updated_at='t' WHERE id='apr-1'").run();
        insertApproval(db, "apr-4", "op-1", "approved"); // allowed after revoke
        expect(db.prepare("SELECT COUNT(*) AS c FROM operation_approvals").get()).toEqual({ c: 3 });
        db.close();
    });

    it("enforces one terminal rejected event per operation with nullable approval_id", () => {
        const db = createDb();
        seedOperation(db, "op-1");
        seedOperation(db, "op-2");
        insertRejectedEvent(db, "op-1", "ape-r1");
        expect(() => insertRejectedEvent(db, "op-1", "ape-r2")).toThrow(); // second rejected blocked
        insertRejectedEvent(db, "op-2", "ape-r3"); // different operation ok
        const event = db.prepare("SELECT approval_id FROM operation_approval_events WHERE id='ape-r1'").get() as { approval_id: string | null };
        expect(event.approval_id).toBeNull();
        db.close();
    });

    it("enforces binding immutability while allowing lifecycle updates", () => {
        const db = createDb();
        seedOperation(db);
        insertApproval(db, "apr-1", "op-1", "approved");
        expect(() => db.prepare("UPDATE operation_approvals SET bound_payload_hash = 'x' WHERE id = 'apr-1'").run()).toThrow();
        expect(() => db.prepare("UPDATE operation_approvals SET approver_actor_id = 'human-2' WHERE id = 'apr-1'").run()).toThrow();
        db.prepare("UPDATE operation_approvals SET approval_status = 'revoked', updated_at = 't' WHERE id = 'apr-1'").run();
        const row = db.prepare("SELECT approval_status FROM operation_approvals WHERE id = 'apr-1'").get() as { approval_status: string };
        expect(row.approval_status).toBe("revoked");
        db.close();
    });
});

describe("P1D approval audit hardening", () => {
    function insertEvent(db: Database.Database, id: string, operationId: string, approvalId: string | null, eventType: string): void {
        db.prepare(`
            INSERT INTO operation_approval_events (
                id, operation_id, approval_id, event_type, actor_type, actor_id,
                actor_display_name, occurred_at, event_code, safe_reason, created_at
            ) VALUES (?, ?, ?, ?, 'system', 'system', NULL, 't', 'X', NULL, 't')
        `).run(id, operationId, approvalId, eventType);
    }

    it("blocks events whose approval belongs to another operation (F-02)", () => {
        const db = createDb();
        seedOperation(db, "op-1");
        seedOperation(db, "op-2");
        insertApproval(db, "apr-1", "op-1", "approved");
        expect(() => insertEvent(db, "ape-x", "op-2", "apr-1", "revoked")).toThrow();
        expect(() => insertEvent(db, "ape-y", "op-2", "apr-1", "consumed")).toThrow();
        db.close();
    });

    it("blocks consumed events without an approval id", () => {
        const db = createDb();
        seedOperation(db, "op-1");
        expect(() => insertEvent(db, "ape-x", "op-1", null, "consumed")).toThrow();
        db.close();
    });

    it("allows a valid consumed event and blocks a second one for the same approval", () => {
        const db = createDb();
        seedOperation(db, "op-1");
        insertApproval(db, "apr-1", "op-1", "approved");
        insertEvent(db, "ape-c1", "op-1", "apr-1", "consumed");
        expect(() => insertEvent(db, "ape-c2", "op-1", "apr-1", "consumed")).toThrow();
        db.close();
    });
});
