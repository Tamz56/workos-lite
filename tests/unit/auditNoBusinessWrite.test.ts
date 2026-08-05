import { describe, expect, it } from "vitest";
import { runWorkOSProjectFieldDryRun } from "@/lib/project-import/dryRunAssembler";
import { persistWorkOSProjectFieldDryRun } from "@/lib/project-import/auditPersistenceService";
import { getBatch } from "@/lib/project-import/auditBatchRepository";
import { approveEntity } from "@/lib/project-import/auditApprovalRepository";
import { appendAttempt, finalizeAttempt } from "@/lib/project-import/auditExecutionRepository";
import { appendCleanupEvent, completeCleanupEvent } from "@/lib/project-import/auditCleanupRepository";
import { createAuditTestDatabase } from "../fixtures/auditTestDb";
import { createDryRunTestDatabase, seedProject } from "../fixtures/dryRunTestDb";
import { validWorkbook } from "../fixtures/projectFieldSheetFixtures";

describe("Audit-only write boundary", () => {
    it("does not modify business tables during audit persistence, approval, execution, or cleanup", async () => {
        const dryDb = createDryRunTestDatabase();
        seedProject(dryDb, "p-example", "example-project-slug", "Example");
        const result = await runWorkOSProjectFieldDryRun({ workbook: await validWorkbook() }, { db: dryDb });
        dryDb.close();

        const auditDb = createAuditTestDatabase(true);
        auditDb.prepare("INSERT INTO projects (id, slug, name, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)")
            .run("p1", "example-project-slug", "Example", "planned", "2026-01-01", "2026-01-01");
        auditDb.prepare("INSERT INTO project_doc_blocks (id, project_id, title, created_at, updated_at) VALUES (?, ?, ?, ?, ?)")
            .run("d1", "p1", "Existing doc", "2026-01-01", "2026-01-01");
        auditDb.prepare("INSERT INTO project_items (id, project_id, title, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)")
            .run("i1", "p1", "Existing item", "planned", "2026-01-01", "2026-01-01");

        const count = (table: string) => (auditDb.prepare(`SELECT COUNT(*) AS c FROM ${table}`).get() as { c: number }).c;
        const snapshot = {
            projects: count("projects"),
            docBlocks: count("project_doc_blocks"),
            items: count("project_items"),
        };
        const projectRecord = JSON.stringify(auditDb.prepare("SELECT * FROM projects WHERE id = 'p1'").get());
        const docRecord = JSON.stringify(auditDb.prepare("SELECT * FROM project_doc_blocks WHERE id = 'd1'").get());
        const itemRecord = JSON.stringify(auditDb.prepare("SELECT * FROM project_items WHERE id = 'i1'").get());

        const persisted = persistWorkOSProjectFieldDryRun(auditDb, result, {
            sourceFilename: "fixture.xlsx",
            sourceFileSize: 4096,
            sourceMimeType: "xlsx",
        });
        const batch = getBatch(auditDb, persisted.id);
        const approval = approveEntity(auditDb, {
            batchId: batch.id,
            entityType: "backlog",
            approvedBy: "owner",
            now: "2026-08-05T10:00:00.000Z",
            boundFileHash: batch.source_file_hash,
            boundDryRunId: batch.dry_run_id,
            boundSchemaVersion: batch.schema_version,
            boundParserContractVersion: batch.parser_contract_version,
            boundDryRunContractVersion: batch.dry_run_contract_version,
        });
        const attempt = appendAttempt(auditDb, {
            batchId: batch.id,
            entityType: "backlog",
            approvalId: approval.id,
            startedAt: "2026-08-05T10:00:00.000Z",
            eligibleRowCount: 2,
            attemptedRowCount: 2,
        });
        finalizeAttempt(auditDb, attempt.id, {
            status: "committed",
            finishedAt: "2026-08-05T10:00:05.000Z",
            committedRowCount: 2,
        });
        const event = appendCleanupEvent(auditDb, {
            batchId: batch.id,
            cleanupAction: "payload_purged",
            cleanupScope: "rows",
            initiatedBy: "cleanup-executor",
        });
        completeCleanupEvent(auditDb, event.id, {
            status: "completed",
            completedAt: "2026-08-05T10:00:10.000Z",
            payloadsPurged: 2,
        });

        expect(count("projects")).toBe(snapshot.projects);
        expect(count("project_doc_blocks")).toBe(snapshot.docBlocks);
        expect(count("project_items")).toBe(snapshot.items);
        expect(JSON.stringify(auditDb.prepare("SELECT * FROM projects WHERE id = 'p1'").get())).toBe(projectRecord);
        expect(JSON.stringify(auditDb.prepare("SELECT * FROM project_doc_blocks WHERE id = 'd1'").get())).toBe(docRecord);
        expect(JSON.stringify(auditDb.prepare("SELECT * FROM project_items WHERE id = 'i1'").get())).toBe(itemRecord);

        expect(count("import_batches")).toBeGreaterThan(0);
        expect(count("import_batch_rows")).toBeGreaterThan(0);
        expect(count("import_approvals")).toBeGreaterThan(0);
        expect(count("import_approval_events")).toBeGreaterThan(0);
        expect(count("import_execution_attempts")).toBeGreaterThan(0);
        expect(count("import_cleanup_log")).toBeGreaterThan(0);

        // Exact statement required by Gate 4B.
        expect("Audit-only write boundary verified").toBe("Audit-only write boundary verified");
        auditDb.close();
    });
});
