import Database from "better-sqlite3";
import { describe, expect, it } from "vitest";
import { APPROVALS_SCHEMA_SQL } from "@/lib/approvals/approvalsSchema";
import { ApprovalError } from "@/lib/approvals/errors";
import {
    approveOperation,
    getReviewDetail,
    listReviews,
    rejectOperation,
    revokeOperation,
} from "@/lib/approvals/service";
import { OPERATIONS_SCHEMA_SQL } from "@/lib/operations/operationsSchema";
import { createOperation } from "@/lib/operations/service";
import type { AgentPrincipal } from "@/lib/agent-auth/agentAuthentication";
import type { OperationRecord } from "@/lib/operations/types";

const HUMAN = { actorId: "human-1", displayName: "Owner" };
const T0 = "2026-08-12T10:00:00.000Z";
const T1 = "2026-08-12T10:31:00.000Z";

function createDb(): Database.Database {
    const db = new Database(":memory:");
    db.pragma("foreign_keys = ON");
    db.exec(OPERATIONS_SCHEMA_SQL);
    db.exec(APPROVALS_SCHEMA_SQL);
    db.exec(`
        CREATE TABLE projects (id TEXT PRIMARY KEY, slug TEXT NOT NULL UNIQUE, name TEXT NOT NULL, status TEXT NOT NULL, created_at TEXT, updated_at TEXT);
        CREATE TABLE project_items (id TEXT PRIMARY KEY, project_id TEXT NOT NULL, title TEXT NOT NULL, status TEXT NOT NULL, created_at TEXT, updated_at TEXT);
        CREATE TABLE project_doc_blocks (id TEXT PRIMARY KEY, project_id TEXT NOT NULL, title TEXT NOT NULL, created_at TEXT, updated_at TEXT);
        CREATE TABLE tasks (id TEXT PRIMARY KEY, title TEXT NOT NULL, workspace TEXT NOT NULL, status TEXT NOT NULL, created_at TEXT, updated_at TEXT);
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

function expectedReview(op: OperationRecord): Record<string, string> {
    return {
        expectedPreviewFingerprint: op.previewFingerprint,
        expectedPayloadHash: op.payloadHash,
        expectedContractVersion: op.contractVersion,
    };
}

function approvalCount(db: Database.Database): number {
    return (db.prepare("SELECT COUNT(*) AS c FROM operation_approvals").get() as { c: number }).c;
}

function eventCount(db: Database.Database): number {
    return (db.prepare("SELECT COUNT(*) AS c FROM operation_approval_events").get() as { c: number }).c;
}

function errorCode(fn: () => unknown): string {
    try {
        fn();
        throw new Error("expected ApprovalError");
    } catch (error) {
        if (error instanceof ApprovalError) return error.code;
        throw error;
    }
}

function businessSnapshot(db: Database.Database): Record<string, number> {
    return {
        projects: (db.prepare("SELECT COUNT(*) AS c FROM projects").get() as { c: number }).c,
        items: (db.prepare("SELECT COUNT(*) AS c FROM project_items").get() as { c: number }).c,
        docBlocks: (db.prepare("SELECT COUNT(*) AS c FROM project_doc_blocks").get() as { c: number }).c,
        tasks: (db.prepare("SELECT COUNT(*) AS c FROM tasks").get() as { c: number }).c,
    };
}

describe("Approve", () => {
    it("creates an approval with +30m expiry and server-derived human actor", () => {
        const db = createDb();
        const op = createValidOperation(db);
        const result = approveOperation(db, HUMAN, op.id, expectedReview(op), { now: T0 });
        expect(result.review.state).toBe("approved");
        expect(result.review.approval?.id).toMatch(/^apr-/);
        expect(result.review.approval?.approverActor).toBe("human:human-1");
        expect(result.review.approval?.approvedAt).toBe(T0);
        expect(result.review.approval?.expiresAt).toBe("2026-08-12T10:30:00.000Z");
        expect(result.review.approval?.binding.payloadHash).toBe(op.payloadHash);
        expect(approvalCount(db)).toBe(1);
        expect(eventCount(db)).toBe(1);
        db.close();
    });

    it("replays the same approval before expiry without TTL reset or new event", () => {
        const db = createDb();
        const op = createValidOperation(db);
        const first = approveOperation(db, HUMAN, op.id, expectedReview(op), { now: T0 });
        const second = approveOperation(db, HUMAN, op.id, expectedReview(op), { now: "2026-08-12T10:10:00.000Z" });
        expect(second.review.approval?.id).toBe(first.review.approval?.id);
        expect(second.review.approval?.approvedAt).toBe(T0);
        expect(second.review.approval?.expiresAt).toBe("2026-08-12T10:30:00.000Z");
        expect(approvalCount(db)).toBe(1);
        expect(eventCount(db)).toBe(1);
        db.close();
    });

    it("materializes an expired stored approval and issues a new one atomically", () => {
        const db = createDb();
        const op = createValidOperation(db);
        approveOperation(db, HUMAN, op.id, expectedReview(op), { now: T0 });
        const second = approveOperation(db, HUMAN, op.id, expectedReview(op), { now: T1 });
        expect(second.review.state).toBe("approved");
        expect(second.review.approval?.approvedAt).toBe(T1);
        expect(approvalCount(db)).toBe(2);
        const statuses = db.prepare("SELECT approval_status FROM operation_approvals ORDER BY created_at ASC").all() as Array<{ approval_status: string }>;
        expect(statuses.map((r) => r.approval_status)).toEqual(["expired", "approved"]);
        const eventTypes = db.prepare("SELECT event_type FROM operation_approval_events ORDER BY rowid ASC").all() as Array<{ event_type: string }>;
        expect(eventTypes.map((r) => r.event_type)).toEqual(["approved", "expired", "approved"]);
        db.close();
    });

    it("allows re-approval after revoke", () => {
        const db = createDb();
        const op = createValidOperation(db);
        const first = approveOperation(db, HUMAN, op.id, expectedReview(op), { now: T0 });
        revokeOperation(db, HUMAN, op.id, { approvalId: first.review.approval!.id }, { now: T0 });
        const second = approveOperation(db, HUMAN, op.id, expectedReview(op), { now: T0 });
        expect(second.review.state).toBe("approved");
        expect(approvalCount(db)).toBe(2);
        db.close();
    });

    it("rejects terminal rejection and non-pending operations", () => {
        const db = createDb();
        const op = createValidOperation(db);
        rejectOperation(db, HUMAN, op.id, { ...expectedReview(op) }, { now: T0 });
        expect(errorCode(() => approveOperation(db, HUMAN, op.id, expectedReview(op), { now: T0 })))
            .toBe("OPS_APPROVAL_REJECTED_TERMINAL");

        const op2 = createValidOperation(db, "Task B");
        db.prepare("UPDATE operations SET status = 'succeeded' WHERE id = ?").run(op2.id);
        expect(errorCode(() => approveOperation(db, HUMAN, op2.id, expectedReview(op2), { now: T0 })))
            .toBe("OPS_APPROVAL_NOT_REVIEWABLE");
        db.close();
    });
});

describe("Operation integrity verification", () => {
    it("fails safely with zero lifecycle writes when any snapshot field is corrupted", () => {
        const corruptions: Array<[string, string]> = [
            ["payload_json", '{"title":"Tampered","status":"planned"}'],
            ["payload_hash", "deadbeef"],
            ["resolved_target_id", "p-wrong"],
            ["preview_json", '{"operationType":"backlog.create","tampered":true}'],
            ["preview_fingerprint", "deadbeef"],
            ["contract_version", "backlog.create.v9"],
        ];
        for (const [column, value] of corruptions) {
            const db = createDb();
            const op = createValidOperation(db);
            db.prepare(`UPDATE operations SET ${column} = ? WHERE id = ?`).run(value, op.id);
            expect(errorCode(() => approveOperation(db, HUMAN, op.id, expectedReview(op), { now: T0 })))
                .toBe("OPS_APPROVAL_OPERATION_INTEGRITY_FAILED");
            expect(approvalCount(db)).toBe(0);
            expect(eventCount(db)).toBe(0);
            db.close();
        }
    });

    it("rejects stale expected review tokens independently", () => {
        const db = createDb();
        const op = createValidOperation(db);
        const base = expectedReview(op);
        const stale: Array<Record<string, string>> = [
            { ...base, expectedPreviewFingerprint: "stale-fp" },
            { ...base, expectedPayloadHash: "stale-hash" },
            { ...base, expectedContractVersion: "stale-version" },
        ];
        for (const body of stale) {
            expect(errorCode(() => approveOperation(db, HUMAN, op.id, body, { now: T0 })))
                .toBe("OPS_APPROVAL_STALE_SNAPSHOT");
        }
        expect(approvalCount(db)).toBe(0);
        expect(eventCount(db)).toBe(0);
        db.close();
    });
});

describe("Reject", () => {
    it("creates an operation-level rejected event, never an approval row", () => {
        const db = createDb();
        const op = createValidOperation(db);
        const result = rejectOperation(db, HUMAN, op.id, { ...expectedReview(op), reason: "Not now" }, { now: T0 });
        expect(result.review.state).toBe("rejected");
        expect(result.review.approval).toBeNull();
        expect(result.review.rejection?.reason).toBe("Not now");
        expect(approvalCount(db)).toBe(0);
        expect(eventCount(db)).toBe(1);
        const event = db.prepare("SELECT * FROM operation_approval_events LIMIT 1").get() as { approval_id: string | null; event_type: string };
        expect(event.approval_id).toBeNull();
        expect(event.event_type).toBe("rejected");
        db.close();
    });

    it("replays duplicate reject and rejects oversized reason", () => {
        const db = createDb();
        const op = createValidOperation(db);
        rejectOperation(db, HUMAN, op.id, { ...expectedReview(op) }, { now: T0 });
        const replay = rejectOperation(db, HUMAN, op.id, { ...expectedReview(op) }, { now: T0 });
        expect(replay.review.state).toBe("rejected");
        expect(eventCount(db)).toBe(1);
        expect(errorCode(() => rejectOperation(db, HUMAN, op.id, { ...expectedReview(op), reason: "x".repeat(201) }, { now: T0 })))
            .toBe("OPS_APPROVAL_INVALID_REQUEST");
        db.close();
    });

    it("conflicts with a valid active approval but allows rejection after expiry", () => {
        const db = createDb();
        const op = createValidOperation(db);
        approveOperation(db, HUMAN, op.id, expectedReview(op), { now: T0 });
        expect(errorCode(() => rejectOperation(db, HUMAN, op.id, { ...expectedReview(op) }, { now: T0 })))
            .toBe("OPS_APPROVAL_CONFLICT");

        const result = rejectOperation(db, HUMAN, op.id, { ...expectedReview(op) }, { now: T1 });
        expect(result.review.state).toBe("rejected");
        expect(approvalCount(db)).toBe(1);
        expect(eventCount(db)).toBe(3); // approved, expired, rejected
        db.close();
    });
});

describe("Revoke", () => {
    it("requires approvalId and revokes the identified approval", () => {
        const db = createDb();
        const op = createValidOperation(db);
        const approved = approveOperation(db, HUMAN, op.id, expectedReview(op), { now: T0 });
        expect(errorCode(() => revokeOperation(db, HUMAN, op.id, {}, { now: T0 })))
            .toBe("OPS_APPROVAL_INVALID_REQUEST");
        const result = revokeOperation(db, HUMAN, op.id, { approvalId: approved.review.approval!.id }, { now: T0 });
        expect(result.review.state).toBe("revoked");
        expect(result.review.approval?.revokedBy?.actorId).toBe("human:human-1");
        expect(eventCount(db)).toBe(2);
        expect(errorCode(() => revokeOperation(db, HUMAN, op.id, { approvalId: approved.review.approval!.id }, { now: T0 })))
            .toBe("OPS_APPROVAL_REVOKED");
        db.close();
    });

    it("never revokes a newer approval when a stale approvalId is used", () => {
        const db = createDb();
        const op = createValidOperation(db);
        const first = approveOperation(db, HUMAN, op.id, expectedReview(op), { now: T0 });
        const second = approveOperation(db, HUMAN, op.id, expectedReview(op), { now: T1 });
        expect(errorCode(() => revokeOperation(db, HUMAN, op.id, { approvalId: first.review.approval!.id }, { now: T1 })))
            .toBe("OPS_APPROVAL_EXPIRED");
        const latest = db.prepare("SELECT approval_status FROM operation_approvals WHERE id = ?").get(second.review.approval!.id) as { approval_status: string };
        expect(latest.approval_status).toBe("approved");
        db.close();
    });

    it("returns safe 404 for approvalId from another operation and missing approval", () => {
        const db = createDb();
        const opA = createValidOperation(db, "A");
        const opB = createValidOperation(db, "B");
        const approvedA = approveOperation(db, HUMAN, opA.id, expectedReview(opA), { now: T0 });
        expect(errorCode(() => revokeOperation(db, HUMAN, opB.id, { approvalId: approvedA.review.approval!.id }, { now: T0 })))
            .toBe("OPS_APPROVAL_NOT_FOUND");
        expect(errorCode(() => revokeOperation(db, HUMAN, opA.id, { approvalId: "apr-missing" }, { now: T0 })))
            .toBe("OPS_APPROVAL_NOT_FOUND");
        db.close();
    });
});

describe("Transaction arbitration and reads", () => {
    it("decides sequential approve/reject/revoke winners inside the write transaction", () => {
        const db = createDb();
        const op = createValidOperation(db);
        approveOperation(db, HUMAN, op.id, expectedReview(op), { now: T0 });
        expect(errorCode(() => rejectOperation(db, HUMAN, op.id, { ...expectedReview(op) }, { now: T0 })))
            .toBe("OPS_APPROVAL_CONFLICT");

        const db2 = createDb();
        const op2 = createValidOperation(db2, "B");
        rejectOperation(db2, HUMAN, op2.id, { ...expectedReview(op2) }, { now: T0 });
        expect(errorCode(() => approveOperation(db2, HUMAN, op2.id, expectedReview(op2), { now: T0 })))
            .toBe("OPS_APPROVAL_REJECTED_TERMINAL");

        const db3 = createDb();
        const op3 = createValidOperation(db3, "C");
        const approved = approveOperation(db3, HUMAN, op3.id, expectedReview(op3), { now: T0 });
        revokeOperation(db3, HUMAN, op3.id, { approvalId: approved.review.approval!.id }, { now: T0 });
        expect(errorCode(() => revokeOperation(db3, HUMAN, op3.id, { approvalId: approved.review.approval!.id }, { now: T0 })))
            .toBe("OPS_APPROVAL_REVOKED");
        db.close();
        db2.close();
        db3.close();
    });

    it("derives review states without writes and keeps business/operations data unchanged", () => {
        const db = createDb();
        const op = createValidOperation(db);
        const businessBefore = businessSnapshot(db);
        const opBefore = JSON.stringify(db.prepare("SELECT * FROM operations WHERE id = ?").get(op.id));

        expect(listReviews(db, 50, { now: T0 })[0].reviewState).toBe("awaiting_review");
        approveOperation(db, HUMAN, op.id, expectedReview(op), { now: T0 });
        expect(getReviewDetail(db, op.id, { now: T0 }).reviewState).toBe("approved");
        expect(getReviewDetail(db, op.id, { now: T1 }).reviewState).toBe("approval_expired");
        rejectOperation(db, HUMAN, op.id, { ...expectedReview(op) }, { now: T1 });
        expect(getReviewDetail(db, op.id, { now: T1 }).reviewState).toBe("rejected");

        expect(businessSnapshot(db)).toEqual(businessBefore);
        expect(JSON.stringify(db.prepare("SELECT * FROM operations WHERE id = ?").get(op.id))).toBe(opBefore);
        db.close();
    });
});
