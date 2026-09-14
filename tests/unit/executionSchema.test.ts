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


function preP5ExecutionTableSql(
    committedTargetPredicate: string,
): string {
    return `
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
    (execution_status = 'committed' AND finished_at IS NOT NULL AND ${committedTargetPredicate} AND target_record_id IS NOT NULL AND result_json IS NOT NULL AND failure_code IS NULL AND safe_failure_message IS NULL)
    OR
    (execution_status IN ('failed_before_write', 'rolled_back') AND finished_at IS NOT NULL AND target_table IS NULL AND target_record_id IS NULL AND result_json IS NULL AND failure_code IS NOT NULL AND safe_failure_message IS NOT NULL)
  )
)
`;
}

const PRE_P5_BACKLOG_ONLY_SQL = preP5ExecutionTableSql(
    "target_table = 'project_items'",
);

const PRE_P5_WIDENED_SQL = preP5ExecutionTableSql(
    "target_table IN ('project_items', 'project_doc_blocks')",
);

const PRE_P5_UNKNOWN_SQL = preP5ExecutionTableSql(
    "target_table IN ('project_items', 'notes')",
);

const PRE_P5_AUX_SQL = `
CREATE UNIQUE INDEX idx_operation_execution_attempts_committed
  ON operation_execution_attempts(operation_id)
  WHERE execution_status = 'committed';
CREATE INDEX idx_operation_execution_attempts_operation
  ON operation_execution_attempts(operation_id);
CREATE INDEX idx_operation_execution_attempts_approval
  ON operation_execution_attempts(approval_id);
CREATE INDEX idx_operation_execution_attempts_created
  ON operation_execution_attempts(created_at);

CREATE TRIGGER trg_operation_execution_attempts_pair_integrity
BEFORE INSERT ON operation_execution_attempts
FOR EACH ROW
BEGIN
  SELECT CASE
    WHEN NOT EXISTS (
      SELECT 1 FROM operation_approvals a
      WHERE a.id = NEW.approval_id AND a.operation_id = NEW.operation_id
    )
    THEN RAISE(ABORT, 'execution approval/operation pair mismatch')
  END;
END;

CREATE TRIGGER trg_operation_execution_attempts_binding_immutable
BEFORE UPDATE OF
  operation_id,
  approval_id,
  trigger_actor_type,
  trigger_actor_id,
  trigger_display_name,
  executor_actor_type,
  executor_actor_id,
  started_at,
  created_at
ON operation_execution_attempts
FOR EACH ROW
BEGIN
  SELECT RAISE(ABORT, 'execution attempt binding fields are immutable');
END;
`;

function createPreP5Db(
    tableSql: string,
    withAux = true,
): Database.Database {
    const db = new Database(":memory:");
    db.pragma("foreign_keys = ON");
    db.exec(OPERATIONS_SCHEMA_SQL);
    db.exec(APPROVALS_SCHEMA_SQL);
    db.exec(tableSql);

    if (withAux) {
        db.exec(PRE_P5_AUX_SQL);
    }

    return db;
}

function executionTableSql(db: Database.Database): string {
    const row = db.prepare(
        "SELECT sql FROM sqlite_master WHERE type='table' AND name='operation_execution_attempts'",
    ).get() as { sql: string } | undefined;

    if (!row) {
        throw new Error("operation_execution_attempts missing");
    }

    return row.sql;
}

function executionTableRootPage(db: Database.Database): number {
    return (
        db.prepare(
            "SELECT rootpage FROM sqlite_master WHERE type='table' AND name='operation_execution_attempts'",
        ).get() as { rootpage: number }
    ).rootpage;
}

function managedExecutionAuxNames(db: Database.Database): string[] {
    return (
        db.prepare(`
            SELECT type || ':' || name AS value
            FROM sqlite_master
            WHERE tbl_name = 'operation_execution_attempts'
              AND type IN ('index', 'trigger')
              AND sql IS NOT NULL
            ORDER BY type, name
        `).all() as { value: string }[]
    ).map((row) => row.value);
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

describe("ACC-P5-001 execution result invariants", () => {
    it("keeps backlog.create committed rows bound to project_items", () => {
        const db = createDb();
        seedOperation(db);
        insertApproval(db, "apr-1", "op-1", "approved");
        expect(() => db.prepare(`
            INSERT INTO operation_execution_attempts (
                id, operation_id, approval_id, execution_kind, execution_status,
                trigger_actor_type, trigger_actor_id, executor_actor_type, executor_actor_id,
                started_at, finished_at, result_json, created_at, updated_at
            ) VALUES ('bad-backlog', 'op-1', 'apr-1', 'backlog_create', 'committed',
                'human', 'h1', 'system', 'system', 't', 't', '{}', 't', 't')
        `).run()).toThrow();
        db.close();
    });

    it("allows ai.read_analyze committed result with no fake domain target and rejects kind mismatch", () => {
        const db = createDb();
        db.prepare(`
            INSERT INTO operations (
                id, operation_type, target_type, target_ref, resolved_target_id,
                payload_json, payload_hash, source, requester_actor_type, requester_actor_id,
                status, validation_result_json, preview_json, preview_fingerprint, contract_version,
                requested_at, created_at, updated_at
            ) VALUES ('op-ai', 'ai.read_analyze', 'project', 'proj-a', 'p1', '{}', 'h', 'agent', 'agent', 'agent-1',
                'pending', '{}', '{}', 'fp', 'ai.read_analyze.v1', 't', 't', 't')
        `).run();
        db.prepare(`
            INSERT INTO operation_approvals (
                id, operation_id, approval_status, approver_actor_type, approver_actor_id,
                approver_display_name, approved_at, expires_at, bound_operation_type,
                bound_target_type, bound_target_ref, bound_resolved_target_id, bound_payload_hash,
                bound_contract_version, bound_preview_fingerprint, preview_json, created_at, updated_at
            ) VALUES ('apr-ai','op-ai','approved','human','h1','Owner','t','z','ai.read_analyze','project','proj-a','p1','h','ai.read_analyze.v1','fp','{}','t','t')
        `).run();
        db.prepare(`
            INSERT INTO operation_execution_attempts (
                id, operation_id, approval_id, execution_kind, execution_status,
                trigger_actor_type, trigger_actor_id, executor_actor_type, executor_actor_id,
                started_at, finished_at, result_json, created_at, updated_at
            ) VALUES ('ai-ok','op-ai','apr-ai','ai_read_analyze','committed',
                'human','h1','system','system','t','t','{}','t','t')
        `).run();
        const row = db.prepare("SELECT target_table, target_record_id FROM operation_execution_attempts WHERE id='ai-ok'").get() as { target_table: string | null; target_record_id: string | null };
        expect(row).toEqual({ target_table: null, target_record_id: null });
        expect(() => db.prepare(`
            INSERT INTO operation_execution_attempts (
                id, operation_id, approval_id, execution_kind, execution_status,
                trigger_actor_type, trigger_actor_id, executor_actor_type, executor_actor_id,
                started_at, created_at, updated_at
            ) VALUES ('kind-bad','op-ai','apr-ai','backlog_create','started','human','h1','system','system','t','t','t')
        `).run()).toThrow();
        db.close();
    });

    it("migrates the legacy execution table by classifying all proven legacy rows as backlog_create", () => {
        const db = new Database(":memory:");
        db.pragma("foreign_keys = ON");
        db.exec(OPERATIONS_SCHEMA_SQL);
        db.exec(APPROVALS_SCHEMA_SQL);
        db.exec(PRE_P5_BACKLOG_ONLY_SQL);
        seedOperation(db);
        insertApproval(db, "apr-1", "op-1", "approved");
        db.prepare(`INSERT INTO operation_execution_attempts (
            id, operation_id, approval_id, execution_status, trigger_actor_type, trigger_actor_id,
            executor_actor_type, executor_actor_id, started_at, finished_at, target_table,
            target_record_id, result_json, created_at, updated_at
        ) VALUES ('legacy','op-1','apr-1','committed','human','h1','system','system','t','t','project_items','item-1','{}','t','t')`).run();
        ensureExecutionSchema(db, () => undefined);
        const columns = db.prepare("PRAGMA table_info(operation_execution_attempts)").all() as { name: string }[];
        expect(columns.map((c) => c.name)).toContain("execution_kind");
        expect((db.prepare("SELECT execution_kind FROM operation_execution_attempts WHERE id='legacy'").get() as { execution_kind: string }).execution_kind).toBe("backlog_create");
        db.close();
    });
});


describe("ACC-P5-RTP-07 execution schema normalization", () => {
    it("recognizes exact widened PRE-P5 zero-row state and migrates deterministically", () => {
        const db = createPreP5Db(PRE_P5_WIDENED_SQL);

        db.exec(`
            CREATE TABLE rtp07_non_execution_sentinel (
                id TEXT PRIMARY KEY,
                value TEXT NOT NULL
            );
            INSERT INTO rtp07_non_execution_sentinel (id, value)
            VALUES ('s1', 'preserve-me');
        `);

        expect(
            (
                db.prepare(
                    "SELECT COUNT(*) AS c FROM operation_execution_attempts",
                ).get() as { c: number }
            ).c,
        ).toBe(0);

        ensureExecutionSchema(db, () => undefined);

        const sql = executionTableSql(db);

        expect(sql).toContain(
            "execution_kind TEXT NOT NULL DEFAULT 'backlog_create'",
        );
        expect(sql).toContain(
            "(execution_kind = 'backlog_create' AND target_table = 'project_items' AND target_record_id IS NOT NULL)",
        );
        expect(sql).toContain(
            "(execution_kind = 'ai_read_analyze' AND target_table IS NULL AND target_record_id IS NULL)",
        );
        expect(sql).not.toContain("project_doc_blocks");

        expect(
            (
                db.prepare(
                    "SELECT COUNT(*) AS c FROM operation_execution_attempts",
                ).get() as { c: number }
            ).c,
        ).toBe(0);

        expect(
            db.prepare(
                "SELECT value FROM rtp07_non_execution_sentinel WHERE id='s1'",
            ).get(),
        ).toEqual({ value: "preserve-me" });

        expect(managedExecutionAuxNames(db)).toEqual([
            "index:idx_operation_execution_attempts_approval",
            "index:idx_operation_execution_attempts_committed",
            "index:idx_operation_execution_attempts_created",
            "index:idx_operation_execution_attempts_operation",
            "trigger:trg_operation_execution_attempts_binding_immutable",
            "trigger:trg_operation_execution_attempts_kind_integrity",
            "trigger:trg_operation_execution_attempts_pair_integrity",
        ]);

        db.close();
    });

    it("fails closed when widened PRE-P5 state contains a committed project_doc_blocks attempt", () => {
        const db = createPreP5Db(PRE_P5_WIDENED_SQL);

        seedOperation(db);
        insertApproval(db, "apr-1", "op-1", "approved");

        db.prepare(`
            INSERT INTO operation_execution_attempts (
                id,
                operation_id,
                approval_id,
                execution_status,
                trigger_actor_type,
                trigger_actor_id,
                executor_actor_type,
                executor_actor_id,
                started_at,
                finished_at,
                target_table,
                target_record_id,
                result_json,
                created_at,
                updated_at
            )
            VALUES (
                'legacy-doc',
                'op-1',
                'apr-1',
                'committed',
                'human',
                'h1',
                'system',
                'system',
                't',
                't',
                'project_doc_blocks',
                'doc-1',
                '{}',
                't',
                't'
            )
        `).run();

        const sqlBefore = executionTableSql(db);
        const rootPageBefore = executionTableRootPage(db);

        expect(
            () => ensureExecutionSchema(db, () => undefined),
        ).toThrow(/committed project_doc_blocks attempts/);

        expect(executionTableSql(db)).toBe(sqlBefore);
        expect(executionTableRootPage(db)).toBe(rootPageBefore);

        expect(
            db.prepare(
                "SELECT target_table FROM operation_execution_attempts WHERE id='legacy-doc'",
            ).get(),
        ).toEqual({ target_table: "project_doc_blocks" });

        const columns = db.prepare(
            "PRAGMA table_info(operation_execution_attempts)",
        ).all() as { name: string }[];

        expect(columns.map((column) => column.name)).not.toContain(
            "execution_kind",
        );

        db.close();
    });

    it("fails closed on an unrecognized PRE-P5 schema variant without destructive rebuild", () => {
        const db = createPreP5Db(PRE_P5_UNKNOWN_SQL, false);

        const sqlBefore = executionTableSql(db);
        const rootPageBefore = executionTableRootPage(db);

        expect(
            () => ensureExecutionSchema(db, () => undefined),
        ).toThrow(/unrecognized schema variant/);

        expect(executionTableSql(db)).toBe(sqlBefore);
        expect(executionTableRootPage(db)).toBe(rootPageBefore);

        const columns = db.prepare(
            "PRAGMA table_info(operation_execution_attempts)",
        ).all() as { name: string }[];

        expect(columns.map((column) => column.name)).not.toContain(
            "execution_kind",
        );

        db.close();
    });

    it("migrates exact PRE-P5 backlog-only rows while preserving row counts and non-execution data", () => {
        const db = createPreP5Db(PRE_P5_BACKLOG_ONLY_SQL);

        db.exec(`
            CREATE TABLE rtp07_non_execution_sentinel (
                id TEXT PRIMARY KEY,
                value TEXT NOT NULL
            );
            INSERT INTO rtp07_non_execution_sentinel (id, value)
            VALUES ('s1', 'unchanged');
        `);

        seedOperation(db);
        insertApproval(db, "apr-1", "op-1", "approved");

        db.prepare(`
            INSERT INTO operation_execution_attempts (
                id,
                operation_id,
                approval_id,
                execution_status,
                trigger_actor_type,
                trigger_actor_id,
                executor_actor_type,
                executor_actor_id,
                started_at,
                finished_at,
                target_table,
                target_record_id,
                result_json,
                created_at,
                updated_at
            )
            VALUES (
                'legacy-backlog',
                'op-1',
                'apr-1',
                'committed',
                'human',
                'h1',
                'system',
                'system',
                't',
                't',
                'project_items',
                'item-1',
                '{}',
                't',
                't'
            )
        `).run();

        const countsBefore = {
            operations: (
                db.prepare("SELECT COUNT(*) AS c FROM operations").get() as { c: number }
            ).c,
            approvals: (
                db.prepare(
                    "SELECT COUNT(*) AS c FROM operation_approvals",
                ).get() as { c: number }
            ).c,
            attempts: (
                db.prepare(
                    "SELECT COUNT(*) AS c FROM operation_execution_attempts",
                ).get() as { c: number }
            ).c,
        };

        ensureExecutionSchema(db, () => undefined);

        const countsAfter = {
            operations: (
                db.prepare("SELECT COUNT(*) AS c FROM operations").get() as { c: number }
            ).c,
            approvals: (
                db.prepare(
                    "SELECT COUNT(*) AS c FROM operation_approvals",
                ).get() as { c: number }
            ).c,
            attempts: (
                db.prepare(
                    "SELECT COUNT(*) AS c FROM operation_execution_attempts",
                ).get() as { c: number }
            ).c,
        };

        expect(countsAfter).toEqual(countsBefore);

        expect(
            db.prepare(`
                SELECT execution_kind, target_table, target_record_id
                FROM operation_execution_attempts
                WHERE id='legacy-backlog'
            `).get(),
        ).toEqual({
            execution_kind: "backlog_create",
            target_table: "project_items",
            target_record_id: "item-1",
        });

        expect(
            db.prepare(
                "SELECT value FROM rtp07_non_execution_sentinel WHERE id='s1'",
            ).get(),
        ).toEqual({ value: "unchanged" });

        expect(executionTableSql(db)).not.toContain("project_doc_blocks");

        db.close();
    });

    it("keeps the P5-current table idempotent without rebuilding it", () => {
        const db = createDb();

        const sqlBefore = executionTableSql(db);
        const rootPageBefore = executionTableRootPage(db);
        const auxBefore = managedExecutionAuxNames(db);

        ensureExecutionSchema(db, () => undefined);

        expect(executionTableSql(db)).toBe(sqlBefore);
        expect(executionTableRootPage(db)).toBe(rootPageBefore);
        expect(managedExecutionAuxNames(db)).toEqual(auxBefore);

        db.close();
    });

    it("fails closed when a recognized legacy row is not safely classifiable as backlog_create", () => {
        const db = createPreP5Db(PRE_P5_BACKLOG_ONLY_SQL);

        db.prepare(`
            INSERT INTO operations (
                id,
                operation_type,
                target_type,
                target_ref,
                resolved_target_id,
                payload_json,
                payload_hash,
                source,
                requester_actor_type,
                requester_actor_id,
                status,
                validation_result_json,
                preview_json,
                preview_fingerprint,
                contract_version,
                requested_at,
                created_at,
                updated_at
            )
            VALUES (
                'op-ai-legacy',
                'ai.read_analyze',
                'project',
                'proj-a',
                'p1',
                '{}',
                'h',
                'agent',
                'agent',
                'agent-1',
                'pending',
                '{}',
                '{}',
                'fp',
                'ai.read_analyze.v1',
                't',
                't',
                't'
            )
        `).run();

        db.prepare(`
            INSERT INTO operation_approvals (
                id,
                operation_id,
                approval_status,
                approver_actor_type,
                approver_actor_id,
                approver_display_name,
                approved_at,
                expires_at,
                bound_operation_type,
                bound_target_type,
                bound_target_ref,
                bound_resolved_target_id,
                bound_payload_hash,
                bound_contract_version,
                bound_preview_fingerprint,
                preview_json,
                created_at,
                updated_at
            )
            VALUES (
                'apr-ai-legacy',
                'op-ai-legacy',
                'approved',
                'human',
                'h1',
                'Owner',
                't',
                'z',
                'ai.read_analyze',
                'project',
                'proj-a',
                'p1',
                'h',
                'ai.read_analyze.v1',
                'fp',
                '{}',
                't',
                't'
            )
        `).run();

        db.prepare(`
            INSERT INTO operation_execution_attempts (
                id,
                operation_id,
                approval_id,
                execution_status,
                trigger_actor_type,
                trigger_actor_id,
                executor_actor_type,
                executor_actor_id,
                started_at,
                created_at,
                updated_at
            )
            VALUES (
                'unsafe-ai-legacy',
                'op-ai-legacy',
                'apr-ai-legacy',
                'started',
                'human',
                'h1',
                'system',
                'system',
                't',
                't',
                't'
            )
        `).run();

        expect(
            () => ensureExecutionSchema(db, () => undefined),
        ).toThrow(/cannot be classified safely as historical backlog_create/);

        const columns = db.prepare(
            "PRAGMA table_info(operation_execution_attempts)",
        ).all() as { name: string }[];

        expect(columns.map((column) => column.name)).not.toContain(
            "execution_kind",
        );

        expect(
            (
                db.prepare(
                    "SELECT COUNT(*) AS c FROM operation_execution_attempts",
                ).get() as { c: number }
            ).c,
        ).toBe(1);

        db.close();
    });
});
