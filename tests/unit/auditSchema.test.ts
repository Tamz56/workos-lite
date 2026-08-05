import { readFileSync } from "fs";
import path from "path";
import Database from "better-sqlite3";
import { describe, expect, it } from "vitest";
import { ensureAuditSchema } from "@/lib/project-import/auditSchema";
import {
    AUDIT_TABLE_NAMES,
    createAuditTestDatabase,
    tableColumns,
    tableExists,
    tableIndexes,
} from "../fixtures/auditTestDb";

const EXPECTED_INDEXES = [
    "idx_import_batches_dry_run_id",
    "idx_import_batches_file_hash",
    "idx_import_batches_status",
    "idx_import_batches_created_at",
    "idx_import_batches_retention",
    "idx_import_batch_rows_batch_entity",
    "idx_import_batch_rows_batch_sheet_row",
    "idx_import_batch_rows_project_entity_ext",
    "idx_import_batch_rows_target",
    "idx_import_approvals_batch_entity",
    "idx_import_approvals_expiry",
    "idx_import_approvals_dry_run",
    "idx_import_approvals_file_hash",
    "idx_import_approval_events_approval",
    "idx_import_approval_events_type",
    "idx_import_approval_events_created",
    "idx_import_attempts_batch_entity",
    "idx_import_attempts_approval",
    "idx_import_attempts_created",
    "idx_import_cleanup_batch",
    "idx_import_cleanup_status",
];

describe("Audit schema creation", () => {
    it("creates all five audit tables on a new database", () => {
        const db = new Database(":memory:");
        ensureAuditSchema(db);
        for (const name of AUDIT_TABLE_NAMES) {
            expect(tableExists(db, name)).toBe(true);
        }
        db.close();
    });

    it("creates the required columns on each table", () => {
        const db = createAuditTestDatabase();
        expect(tableColumns(db, "import_batches")).toEqual(
            expect.arrayContaining([
                "id", "dry_run_id", "schema_version", "parser_contract_version", "dry_run_contract_version",
                "workbook_id", "batch_reference", "source_system", "source_filename", "source_filename_sanitized",
                "source_file_hash", "source_file_size", "source_mime_type", "timezone", "prepared_by",
                "batch_status", "project_documentation_status", "backlog_status",
                "total_rows", "new_rows", "duplicate_rows", "conflict_rows", "review_required_rows",
                "invalid_rows", "skipped_rows", "warning_count", "error_count",
                "created_at", "updated_at", "retention_eligible_at", "payload_purged_at", "deleted_at",
            ]),
        );
        expect(tableColumns(db, "import_batch_rows")).toEqual(
            expect.arrayContaining([
                "id", "batch_id", "entity_type", "worksheet_name", "source_row_number", "external_row_id",
                "project_slug", "resolved_project_id", "parser_status", "dry_run_status", "proposed_operation",
                "normalized_payload_json", "validation_issue_codes_json", "warning_count", "error_count",
                "existing_record_reference", "target_table", "target_record_id", "execution_status",
                "execution_error_code", "executed_at", "retry_count", "last_attempt_reference",
                "created_at", "updated_at",
            ]),
        );
        expect(tableColumns(db, "import_approvals")).toEqual(
            expect.arrayContaining([
                "id", "batch_id", "entity_type", "approval_status", "approved_by", "approved_at", "expires_at",
                "rejected_by", "rejected_at", "revoked_by", "revoked_at", "consumed_at",
                "bound_file_hash", "bound_dry_run_id", "bound_schema_version",
                "bound_parser_contract_version", "bound_dry_run_contract_version",
                "approval_summary_fingerprint", "reason_or_note", "created_at",
            ]),
        );
        expect(tableColumns(db, "import_approval_events")).toEqual(
            expect.arrayContaining([
                "id", "approval_id", "event_type", "actor", "occurred_at", "event_code", "safe_reason", "created_at",
            ]),
        );
        expect(tableColumns(db, "import_execution_attempts")).toEqual(
            expect.arrayContaining([
                "id", "batch_id", "entity_type", "approval_id", "attempt_number", "execution_status",
                "started_at", "finished_at", "eligible_row_count", "attempted_row_count",
                "committed_row_count", "skipped_row_count", "rolled_back_row_count",
                "failure_code", "safe_failure_message", "transaction_reference", "created_at",
            ]),
        );
        expect(tableColumns(db, "import_cleanup_log")).toEqual(
            expect.arrayContaining([
                "id", "batch_id", "cleanup_action", "cleanup_scope", "initiated_by", "reason",
                "rows_affected", "payloads_purged", "records_deleted", "started_at", "completed_at",
                "status", "error_code", "safe_error_message", "created_at",
            ]),
        );
        db.close();
    });

    it("creates the required indexes", () => {
        const db = createAuditTestDatabase();
        const allIndexes = AUDIT_TABLE_NAMES.flatMap((name) => tableIndexes(db, name));
        for (const index of EXPECTED_INDEXES) {
            expect(allIndexes).toContain(index);
        }
        db.close();
    });

    it("is idempotent under repeated initialization", () => {
        const db = new Database(":memory:");
        ensureAuditSchema(db);
        ensureAuditSchema(db);
        ensureAuditSchema(db);
        for (const name of AUDIT_TABLE_NAMES) {
            expect(tableExists(db, name)).toBe(true);
        }
        db.close();
    });

    it("adds missing audit tables to an existing database without touching unrelated tables", () => {
        const db = new Database(":memory:");
        db.exec("CREATE TABLE unrelated (id TEXT PRIMARY KEY, value TEXT)");
        db.prepare("INSERT INTO unrelated (id, value) VALUES (?, ?)").run("u1", "keep");
        ensureAuditSchema(db);
        for (const name of AUDIT_TABLE_NAMES) {
            expect(tableExists(db, name)).toBe(true);
        }
        const row = db.prepare("SELECT value FROM unrelated WHERE id = 'u1'").get() as { value: string };
        expect(row.value).toBe("keep");
        db.close();
    });

    it("is mirrored in the canonical schema.sql", () => {
        const schema = readFileSync(path.resolve(process.cwd(), "src/db/schema.sql"), "utf8");
        for (const name of AUDIT_TABLE_NAMES) {
            expect(schema).toContain(`CREATE TABLE IF NOT EXISTS ${name}`);
        }
    });
});

describe("Audit schema constraints", () => {
    it("rejects invalid CHECK statuses", () => {
        const db = createAuditTestDatabase();
        expect(() =>
            db.prepare(`INSERT INTO import_batches (
                id, dry_run_id, schema_version, parser_contract_version, dry_run_contract_version,
                source_file_hash, source_file_size, batch_status
            ) VALUES ('b1', 'd1', 'v1', 'p1', 'r1', 'h1', 1, 'bogus')`).run(),
        ).toThrow(/CHECK/i);

        db.prepare(`INSERT INTO import_batches (
            id, dry_run_id, schema_version, parser_contract_version, dry_run_contract_version,
            source_file_hash, source_file_size, batch_status
        ) VALUES ('b1', 'd1', 'v1', 'p1', 'r1', 'h1', 1, 'dry_run_created')`).run();

        expect(() =>
            db.prepare(`INSERT INTO import_batch_rows (
                id, batch_id, entity_type, worksheet_name, source_row_number,
                parser_status, dry_run_status, proposed_operation
            ) VALUES ('r1', 'b1', 'project_documentation', '01_Project_Documentation', 7, 'valid', 'bogus', 'insert')`).run(),
        ).toThrow(/CHECK/i);

        expect(() =>
            db.prepare(`INSERT INTO import_approvals (
                id, batch_id, entity_type, approval_status,
                bound_file_hash, bound_dry_run_id, bound_schema_version,
                bound_parser_contract_version, bound_dry_run_contract_version, approval_summary_fingerprint
            ) VALUES ('a1', 'b1', 'backlog', 'bogus', 'h1', 'd1', 'v1', 'p1', 'r1', 'f1')`).run(),
        ).toThrow(/CHECK/i);

        expect(() =>
            db.prepare(`INSERT INTO import_execution_attempts (
                id, batch_id, entity_type, attempt_number, execution_status
            ) VALUES ('e1', 'b1', 'backlog', 1, 'bogus')`).run(),
        ).toThrow(/CHECK/i);

        expect(() =>
            db.prepare(`INSERT INTO import_approval_events (id, approval_id, event_type) VALUES ('x1', 'b1', 'bogus')`).run(),
        ).toThrow(/CHECK/i);
        db.close();
    });

    it("enforces foreign keys for rows and approvals", () => {
        const db = createAuditTestDatabase();
        db.pragma("foreign_keys = ON");
        expect(() =>
            db.prepare(`INSERT INTO import_batch_rows (
                id, batch_id, entity_type, worksheet_name, source_row_number,
                parser_status, dry_run_status, proposed_operation
            ) VALUES ('r1', 'missing-batch', 'project_documentation', '01_Project_Documentation', 7, 'valid', 'new', 'insert')`).run(),
        ).toThrow(/FOREIGN KEY/i);
        expect(() =>
            db.prepare(`INSERT INTO import_approval_events (id, approval_id, event_type) VALUES ('x1', 'missing-approval', 'created')`).run(),
        ).toThrow(/FOREIGN KEY/i);
        db.close();
    });

    it("restricts batch deletion while rows exist and set-nulls cleanup events", () => {
        const db = createAuditTestDatabase();
        db.pragma("foreign_keys = ON");
        db.prepare(`INSERT INTO import_batches (
            id, dry_run_id, schema_version, parser_contract_version, dry_run_contract_version,
            source_file_hash, source_file_size, batch_status
        ) VALUES ('b1', 'd1', 'v1', 'p1', 'r1', 'h1', 1, 'dry_run_created')`).run();
        db.prepare(`INSERT INTO import_batch_rows (
            id, batch_id, entity_type, worksheet_name, source_row_number,
            parser_status, dry_run_status, proposed_operation
        ) VALUES ('r1', 'b1', 'project_documentation', '01_Project_Documentation', 7, 'valid', 'new', 'insert')`).run();

        expect(() => db.prepare("DELETE FROM import_batches WHERE id = 'b1'").run()).toThrow(/FOREIGN KEY/i);

        db.prepare("DELETE FROM import_batch_rows WHERE id = 'r1'").run();
        db.prepare(`INSERT INTO import_cleanup_log (id, batch_id, cleanup_action, cleanup_scope) VALUES ('c1', 'b1', 'batch_deleted', 'batch')`).run();
        db.prepare("DELETE FROM import_batches WHERE id = 'b1'").run();
        const event = db.prepare("SELECT batch_id FROM import_cleanup_log WHERE id = 'c1'").get() as { batch_id: string | null };
        expect(event.batch_id).toBeNull();
        db.close();
    });
});
