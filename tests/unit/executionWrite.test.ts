import { describe, expect, it } from "vitest";
import { computeContentDuplicateHash } from "@/lib/project-doc-blocks/hashing";
import { mapRowToBlock } from "@/lib/project-doc-blocks/mappers";
import { executeApprovedImportEntity } from "@/lib/project-import/executeImportService";
import { ExecutionError, EXECUTION_ERROR_CODES } from "@/lib/project-import/executionErrors";
import { parseCanonicalJson, serializeCanonicalJson } from "@/lib/project-import/auditSerialization";
import { listApprovalEvents } from "@/lib/project-import/auditApprovalRepository";
import { buildApprovedBatch, singleDocRowWorkbook, T0 } from "../fixtures/executionHelpers";

function errorCode(fn: () => unknown): string {
    try {
        fn();
        throw new Error("expected execution error");
    } catch (error) {
        if (error instanceof ExecutionError) return error.code;
        throw error;
    }
}

describe("Project Documentation execution", () => {
    it("inserts a single document row with correct provenance", async () => {
        const { db, batchId, approvalId } = await buildApprovedBatch("project_documentation", await singleDocRowWorkbook());
        const result = executeApprovedImportEntity({ batchId, entityType: "project_documentation", approvalId, requestedBy: "x" }, { db, now: T0 });
        expect(result.insertedCount).toBe(1);
        const row = db.prepare("SELECT * FROM project_doc_blocks LIMIT 1").get() as Record<string, unknown>;
        expect(row.import_source).toBe("google_sheet");
        expect(row.import_batch_id).toBe(batchId);
        expect(row.source_record_id).toBe("TEST-DOC-001");
        expect(row.source_row_number).toBe(7);
        expect(row.generated_by).toBeNull();
        expect(row.reviewed_by_user).toBe(1);
        db.close();
    });

    it("inserts multiple document rows atomically and stores the correct content hash", async () => {
        const { db, batchId, approvalId } = await buildApprovedBatch("project_documentation");
        const result = executeApprovedImportEntity({ batchId, entityType: "project_documentation", approvalId, requestedBy: "x" }, { db, now: T0 });
        expect(result.insertedCount).toBe(2);
        const audit = db.prepare("SELECT * FROM import_batch_rows WHERE entity_type = 'project_documentation' AND dry_run_status = 'new' ORDER BY source_row_number ASC").all() as Array<Record<string, unknown>>;
        const inserted = db.prepare("SELECT * FROM project_doc_blocks ORDER BY created_at ASC").all() as Parameters<typeof mapRowToBlock>[];
        expect(inserted).toHaveLength(2);
        for (let index = 0; index < 2; index++) {
            const incoming = parseCanonicalJson<Record<string, unknown>>(String(audit[index].normalized_payload_json));
            const incomingHash = computeContentDuplicateHash({
                projectSlug: incoming.projectSlug,
                type: incoming.blockType,
                title: incoming.title,
                date: incoming.date,
                summary: incoming.summary,
                details: incoming.details,
                evidenceLinks: incoming.evidenceLinks,
                relatedFiles: incoming.relatedFiles,
                nextAction: (incoming.nextAction as string | null | undefined) ?? undefined,
                orderIndex: (incoming.orderIndex as number | null | undefined) ?? undefined,
                status: incoming.status,
            });
            const existingHash = computeContentDuplicateHash(mapRowToBlock(inserted[index], "example-project-slug"));
            expect(existingHash).toBe(incomingHash);
        }
        db.close();
    });

    it("rolls back all document inserts on a single row failure", async () => {
        const { db, batchId, approvalId } = await buildApprovedBatch("project_documentation");
        const rows = db.prepare("SELECT id, normalized_payload_json FROM import_batch_rows WHERE entity_type = 'project_documentation' ORDER BY source_row_number ASC").all() as Array<{ id: string; normalized_payload_json: string }>;
        const payload = parseCanonicalJson<Record<string, unknown>>(rows[1].normalized_payload_json);
        payload.status = "bogus";
        db.prepare("UPDATE import_batch_rows SET normalized_payload_json = ? WHERE id = ?").run(serializeCanonicalJson(payload), rows[1].id);

        expect(errorCode(() =>
            executeApprovedImportEntity({ batchId, entityType: "project_documentation", approvalId, requestedBy: "x" }, { db, now: T0 }),
        )).toBe(EXECUTION_ERROR_CODES.PROJECT_DOC_INSERT_FAILED);

        expect((db.prepare("SELECT COUNT(*) AS c FROM project_doc_blocks").get() as { c: number }).c).toBe(0);
        const approval = db.prepare("SELECT approval_status FROM import_approvals WHERE id = ?").get(approvalId) as { approval_status: string };
        expect(approval.approval_status).toBe("approved");
        expect(listApprovalEvents(db, approvalId).map((event) => event.event_type)).not.toContain("consumed");
        const audit = db.prepare("SELECT execution_status, target_record_id FROM import_batch_rows WHERE entity_type = 'project_documentation'").all() as Array<{ execution_status: string; target_record_id: string | null }>;
        expect(audit.every((row) => row.execution_status === "not_started" && row.target_record_id === null)).toBe(true);
        db.close();
    });
});

describe("Backlog execution", () => {
    it("inserts backlog rows with correct field mapping", async () => {
        const { db, batchId, approvalId } = await buildApprovedBatch("backlog");
        const result = executeApprovedImportEntity({ batchId, entityType: "backlog", approvalId, requestedBy: "x" }, { db, now: T0 });
        expect(result.insertedCount).toBe(2);
        const items = db.prepare("SELECT * FROM project_items ORDER BY start_date ASC").all() as Array<{ status: string; schedule_bucket: string | null; is_milestone: number; notes: string | null; title: string }>;
        expect(items).toHaveLength(2);
        expect(items.every((item) => ["inbox", "planned", "done"].includes(item.status))).toBe(true);
        expect(items.some((item) => item.schedule_bucket === "morning")).toBe(true);
        expect(items.some((item) => item.is_milestone === 1)).toBe(true);
        expect(items.every((item) => item.notes === "Note text" || item.notes === null)).toBe(true);
        db.close();
    });

    it("rolls back all backlog inserts on a single row failure", async () => {
        const { db, batchId, approvalId } = await buildApprovedBatch("backlog");
        const rows = db.prepare("SELECT id, normalized_payload_json FROM import_batch_rows WHERE entity_type = 'backlog' ORDER BY source_row_number ASC").all() as Array<{ id: string; normalized_payload_json: string }>;
        const payload = parseCanonicalJson<Record<string, unknown>>(rows[1].normalized_payload_json);
        payload.status = "bogus";
        db.prepare("UPDATE import_batch_rows SET normalized_payload_json = ? WHERE id = ?").run(serializeCanonicalJson(payload), rows[1].id);

        expect(errorCode(() =>
            executeApprovedImportEntity({ batchId, entityType: "backlog", approvalId, requestedBy: "x" }, { db, now: T0 }),
        )).toBe(EXECUTION_ERROR_CODES.BACKLOG_INSERT_FAILED);
        expect((db.prepare("SELECT COUNT(*) AS c FROM project_items").get() as { c: number }).c).toBe(0);
        const approval = db.prepare("SELECT approval_status FROM import_approvals WHERE id = ?").get(approvalId) as { approval_status: string };
        expect(approval.approval_status).toBe("approved");
        db.close();
    });
});
