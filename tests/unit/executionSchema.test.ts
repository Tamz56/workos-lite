import Database from "better-sqlite3";
import { describe, expect, it } from "vitest";
import { APPROVALS_SCHEMA_SQL } from "@/lib/approvals/approvalsSchema";
import {
    EXECUTION_ATTEMPTS_INDEXES_TRIGGERS_SQL,
    EXECUTION_SCHEMA_SQL,
    ExecutionSchemaMigrationError,
    ensureExecutionSchema,
} from "@/lib/execution/executionSchema";
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
        targetTable?: string | null;
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
        input.status === "committed" ? (input.targetTable ?? "project_items") : null,
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

// Fixture reproducing the pre-P1G-D0.7B-3C-9D1 schema found in existing
// databases (committed branch restricts target_table to project_items only).
const OLD_EXECUTION_ATTEMPTS_TABLE_SQL = `
CREATE TABLE operation_execution_attempts (
  id TEXT PRIMARY KEY,
  operation_id TEXT NOT NULL,
  approval_id TEXT NOT NULL,
  execution_status TEXT NOT NULL CHECK (execution_status IN ('started', 'committed', 'failed_before_write', 'rolled_back')),
  trigger_actor_type TEXT NOT NULL CHECK (trigger_actor_type = 'human'),
  trigger_actor_id TEXT NOT NULL,
  trigger_display_name TEXT NULL,
  executor_actor_type TEXT NOT NULL CHECK (executor_actor_type = 'system'),
  executor_actor_id TEXT NOT NULL CHECK (executor_actor_id = 'system'),
  started_at TEXT NOT NULL,
  finished_at TEXT NULL,
  target_table TEXT NULL,
  target_record_id TEXT NULL,
  result_json TEXT NULL,
  failure_code TEXT NULL,
  safe_failure_message TEXT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY(operation_id) REFERENCES operations(id) ON DELETE RESTRICT,
  FOREIGN KEY(approval_id) REFERENCES operation_approvals(id) ON DELETE RESTRICT,
  CHECK (
    (execution_status = 'started' AND finished_at IS NULL AND target_table IS NULL AND target_record_id IS NULL AND result_json IS NULL AND failure_code IS NULL AND safe_failure_message IS NULL)
    OR
    (execution_status = 'committed' AND finished_at IS NOT NULL AND target_table = 'project_items' AND target_record_id IS NOT NULL AND result_json IS NOT NULL AND failure_code IS NULL AND safe_failure_message IS NULL)
    OR
    (execution_status IN ('failed_before_write', 'rolled_back') AND finished_at IS NOT NULL AND target_table IS NULL AND target_record_id IS NULL AND result_json IS NULL AND failure_code IS NOT NULL AND safe_failure_message IS NOT NULL)
  )
)
`;

// Unrecognized variant used to prove fail-closed behavior (no old/new markers).
const UNKNOWN_EXECUTION_ATTEMPTS_TABLE_SQL = `
CREATE TABLE operation_execution_attempts (
  id TEXT PRIMARY KEY,
  execution_status TEXT NOT NULL,
  target_table TEXT NULL,
  CHECK (execution_status = 'committed' AND target_table = 'project_doc_blocks')
)
`;

const EXECUTION_ATTEMPT_ROWS_COLUMNS = [
    "id",
    "operation_id",
    "approval_id",
    "execution_status",
    "trigger_actor_type",
    "trigger_actor_id",
    "trigger_display_name",
    "executor_actor_type",
    "executor_actor_id",
    "started_at",
    "finished_at",
    "target_table",
    "target_record_id",
    "result_json",
    "failure_code",
    "safe_failure_message",
    "created_at",
    "updated_at",
].join(", ");

function attemptsTableSql(db: Database.Database): string {
    const row = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='operation_execution_attempts'").get() as { sql: string } | undefined;
    if (!row) throw new Error("operation_execution_attempts table missing");
    return row.sql;
}

function createOldSchemaDb(): Database.Database {
    const db = new Database(":memory:");
    db.pragma("foreign_keys = ON");
    db.exec(OPERATIONS_SCHEMA_SQL);
    db.exec(APPROVALS_SCHEMA_SQL);
    db.exec(OLD_EXECUTION_ATTEMPTS_TABLE_SQL);
    db.exec(EXECUTION_ATTEMPTS_INDEXES_TRIGGERS_SQL);
    return db;
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

describe("Execution schema migration (P1G-D0.7B-3C-9D1)", () => {
    it("creates the widened committed CHECK on a fresh database", () => {
        const db = createDb();
        expect(attemptsTableSql(db)).toContain("target_table IN ('project_items', 'project_doc_blocks')");
        ensureExecutionSchema(db, () => undefined);
        expect(attemptsTableSql(db)).toContain("target_table IN ('project_items', 'project_doc_blocks')");
        db.close();
    });

    it("accepts committed attempts for project_items and project_doc_blocks and rejects unknown target tables", () => {
        const db = createDb();
        seedOperation(db, "op-1");
        insertApproval(db, "apr-1", "op-1", "approved");
        seedOperation(db, "op-2");
        insertApproval(db, "apr-2", "op-2", "approved");
        seedOperation(db, "op-3");
        insertApproval(db, "apr-3", "op-3", "approved");
        insertAttempt(db, committedAttempt("c1", "op-1", "apr-1"));
        insertAttempt(db, { ...committedAttempt("c2", "op-2", "apr-2"), targetTable: "project_doc_blocks" });
        expect(() => insertAttempt(db, { ...committedAttempt("c3", "op-3", "apr-3"), targetTable: "notes" })).toThrow();
        db.close();
    });

    it("detects the old schema and upgrades it to the widened schema", () => {
        const db = createOldSchemaDb();
        seedOperation(db, "op-1");
        insertApproval(db, "apr-1", "op-1", "approved");
        expect(attemptsTableSql(db)).toContain("target_table = 'project_items'");
        expect(() => insertAttempt(db, { ...committedAttempt("c-old", "op-1", "apr-1"), targetTable: "project_doc_blocks" })).toThrow();

        ensureExecutionSchema(db, () => undefined);

        const migrated = attemptsTableSql(db);
        expect(migrated).toContain("target_table IN ('project_items', 'project_doc_blocks')");
        expect(migrated).not.toContain("target_table = 'project_items'");
        seedOperation(db, "op-2");
        insertApproval(db, "apr-2", "op-2", "approved");
        seedOperation(db, "op-3");
        insertApproval(db, "apr-3", "op-3", "approved");
        insertAttempt(db, { ...committedAttempt("c-pi", "op-2", "apr-2"), targetTable: "project_items" });
        insertAttempt(db, { ...committedAttempt("c-doc", "op-3", "apr-3"), targetTable: "project_doc_blocks" });
        db.close();
    });

    it("is idempotent and does not rebuild repeatedly", () => {
        const db = createOldSchemaDb();
        seedOperation(db, "op-1");
        insertApproval(db, "apr-1", "op-1", "approved");
        insertAttempt(db, { id: "s1", operationId: "op-1", approvalId: "apr-1", status: "started" });
        ensureExecutionSchema(db, () => undefined);
        const sqlAfterFirst = attemptsTableSql(db);
        ensureExecutionSchema(db, () => undefined);
        expect(attemptsTableSql(db)).toBe(sqlAfterFirst);
        expect(db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='operation_execution_attempts_new'").get()).toBeUndefined();
        const count = db.prepare("SELECT COUNT(*) AS c FROM operation_execution_attempts").get() as { c: number };
        expect(count.c).toBe(1);
        db.close();
    });

    it("preserves representative legacy rows across migration", () => {
        const db = createOldSchemaDb();
        seedOperation(db, "op-1");
        insertApproval(db, "apr-1", "op-1", "approved");
        seedOperation(db, "op-2");
        insertApproval(db, "apr-2", "op-2", "approved");
        insertAttempt(db, { id: "s1", operationId: "op-1", approvalId: "apr-1", status: "started" });
        insertAttempt(db, committedAttempt("c1", "op-1", "apr-1"));
        insertAttempt(db, failedAttempt("f1", "op-2", "apr-2", "rolled_back"));
        const before = db.prepare(`SELECT ${EXECUTION_ATTEMPT_ROWS_COLUMNS} FROM operation_execution_attempts ORDER BY id`).all();

        ensureExecutionSchema(db, () => undefined);

        const after = db.prepare(`SELECT ${EXECUTION_ATTEMPT_ROWS_COLUMNS} FROM operation_execution_attempts ORDER BY id`).all();
        expect(after).toEqual(before);
        const count = db.prepare("SELECT COUNT(*) AS c FROM operation_execution_attempts").get() as { c: number };
        expect(count.c).toBe(3);
        db.close();
    });

    it("preserves indexes, triggers, FKs, and the widened CHECK after migration", () => {
        const db = createOldSchemaDb();
        ensureExecutionSchema(db, () => undefined);
        const indexes = (db.prepare("SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='operation_execution_attempts'").all() as Array<{ name: string }>).map(r => r.name);
        expect(indexes).toEqual(expect.arrayContaining([
            "sqlite_autoindex_operation_execution_attempts_1",
            "idx_operation_execution_attempts_committed",
            "idx_operation_execution_attempts_operation",
            "idx_operation_execution_attempts_approval",
            "idx_operation_execution_attempts_created",
        ]));
        const committedIdx = db.prepare("SELECT sql FROM sqlite_master WHERE type='index' AND name='idx_operation_execution_attempts_committed'").get() as { sql: string };
        expect(committedIdx.sql).toContain("WHERE execution_status = 'committed'");
        const triggers = (db.prepare("SELECT name FROM sqlite_master WHERE type='trigger' AND tbl_name='operation_execution_attempts'").all() as Array<{ name: string }>).map(r => r.name);
        expect(triggers).toEqual(expect.arrayContaining([
            "trg_operation_execution_attempts_pair_integrity",
            "trg_operation_execution_attempts_binding_immutable",
        ]));
        const fks = db.prepare("PRAGMA foreign_key_list(operation_execution_attempts)").all() as Array<{ table: string; on_delete: string }>;
        expect(fks).toEqual(expect.arrayContaining([
            expect.objectContaining({ table: "operations", on_delete: "RESTRICT" }),
            expect.objectContaining({ table: "operation_approvals", on_delete: "RESTRICT" }),
        ]));
        expect(attemptsTableSql(db)).toContain("target_table IN ('project_items', 'project_doc_blocks')");
        // FK RESTRICT still enforced after migration.
        seedOperation(db, "op-1");
        insertApproval(db, "apr-1", "op-1", "approved");
        insertAttempt(db, { id: "s1", operationId: "op-1", approvalId: "apr-1", status: "started" });
        expect(() => db.prepare("DELETE FROM operations WHERE id = 'op-1'").run()).toThrow();
        db.close();
    });

    it("fails closed on an unrecognized schema without destructive rebuild", () => {
        const db = new Database(":memory:");
        db.pragma("foreign_keys = ON");
        db.exec(OPERATIONS_SCHEMA_SQL);
        db.exec(APPROVALS_SCHEMA_SQL);
        db.exec(UNKNOWN_EXECUTION_ATTEMPTS_TABLE_SQL);
        const before = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='operation_execution_attempts'").get();
        expect(() => ensureExecutionSchema(db, () => undefined)).toThrow(ExecutionSchemaMigrationError);
        const after = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='operation_execution_attempts'").get();
        expect(after).toEqual(before);
        expect(db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='operation_execution_attempts_new'").get()).toBeUndefined();
        db.close();
    });

    it("fails closed when a partial replacement table already exists", () => {
        const db = createOldSchemaDb();
        db.exec("CREATE TABLE operation_execution_attempts_new (id TEXT PRIMARY KEY)");
        const before = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='operation_execution_attempts'").get();
        expect(() => ensureExecutionSchema(db, () => undefined)).toThrow(ExecutionSchemaMigrationError);
        expect(db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='operation_execution_attempts'").get()).toEqual(before);
        expect(db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='operation_execution_attempts_new'").get()).toBeTruthy();
        db.close();
    });
});
