import Database from "better-sqlite3";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { APPROVALS_SCHEMA_SQL } from "@/lib/approvals/approvalsSchema";
import { approveOperation } from "@/lib/approvals/service";
import { EXECUTION_SCHEMA_SQL } from "@/lib/execution/executionSchema";
import { executeOperation } from "@/lib/execution/service";
import { OPERATIONS_SCHEMA_SQL } from "@/lib/operations/operationsSchema";
import { createOperation } from "@/lib/operations/service";

const HUMAN = { actorId: "human-1", displayName: "Owner" };
const T0 = "2026-08-12T10:00:00.000Z";
const T1 = "2026-08-12T10:05:00.000Z";

function seed(db: Database.Database): { opId: string; approvalId: string } {
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
    const op = createOperation(db, { actorId: "agent-1", actorName: "Agent", scopes: ["operations:request"] } as never, {
        operationType: "backlog.create",
        targetType: "project",
        targetRef: "project-a",
        payload: { title: "Concurrent Task" },
    });
    const approvalId = approveOperation(db, HUMAN, op.id, {
        expectedPreviewFingerprint: op.previewFingerprint,
        expectedPayloadHash: op.payloadHash,
        expectedContractVersion: op.contractVersion,
    }, { now: T0 }).review.approval!.id;
    return { opId: op.id, approvalId };
}

describe("Two-connection execution serialization", () => {
    it("blocks the second writer while BEGIN IMMEDIATE is held, then replays after commit", () => {
        const dir = fs.mkdtempSync(path.join(os.tmpdir(), "p1d-"));
        const file = path.join(dir, "proof.db");
        const a = new Database(file);
        const b = new Database(file);
        a.pragma("journal_mode = WAL");
        a.pragma("busy_timeout = 0");
        b.pragma("busy_timeout = 0");
        const { opId, approvalId } = seed(a);
        b.pragma("foreign_keys = ON");

        // Connection A holds the write lock; connection B cannot acquire a
        // write transaction concurrently (raw SQLite-level proof).
        a.exec("BEGIN IMMEDIATE");
        let busy = false;
        try {
            b.exec("BEGIN IMMEDIATE");
        } catch (error) {
            busy = String(error).toLowerCase().includes("locked") || (error as { code?: string }).code === "SQLITE_BUSY";
        }
        expect(busy).toBe(true);
        a.exec("ROLLBACK");

        // A commits the execution; the second writer then observes the
        // committed source-of-truth and replays instead of re-executing.
        const first = executeOperation(a, HUMAN, opId, { approvalId }, { now: T1 });
        expect(first.replay).toBe(false);
        const second = executeOperation(b, HUMAN, opId, { approvalId }, { now: T1 });
        expect(second.replay).toBe(true);
        expect(second.execution.attemptId).toBe(first.execution.attemptId);
        expect(second.execution.targetRecordId).toBe(first.execution.targetRecordId);

        const itemCount = (a.prepare("SELECT COUNT(*) AS c FROM project_items").get() as { c: number }).c;
        const committed = (a.prepare("SELECT COUNT(*) AS c FROM operation_execution_attempts WHERE execution_status='committed'").get() as { c: number }).c;
        const consumedEvents = (a.prepare("SELECT COUNT(*) AS c FROM operation_approval_events WHERE event_type='consumed'").get() as { c: number }).c;
        const approval = a.prepare("SELECT approval_status FROM operation_approvals WHERE id = ?").get(approvalId) as { approval_status: string };
        expect(itemCount).toBe(1);
        expect(committed).toBe(1);
        expect(consumedEvents).toBe(1);
        expect(approval.approval_status).toBe("consumed");

        a.close();
        b.close();
        fs.rmSync(dir, { recursive: true, force: true });
    });
});
