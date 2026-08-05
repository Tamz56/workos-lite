import { describe, expect, it } from "vitest";
import { executeApprovedImportEntity } from "@/lib/project-import/executeImportService";
import { ExecutionError, EXECUTION_ERROR_CODES } from "@/lib/project-import/executionErrors";
import { seedExistingBacklogItem, seedExistingDocBlock } from "../fixtures/executionTestDb";
import { buildApprovedBatch, T0 } from "../fixtures/executionHelpers";

function errorCode(fn: () => unknown): string {
    try {
        fn();
        throw new Error("expected execution error");
    } catch (error) {
        if (error instanceof ExecutionError) return error.code;
        throw error;
    }
}

const DOC_MATCH = {
    title: "Fixture doc one",
    blockDate: "2026-01-05",
    summary: "Summary one",
    detailsMd: "Details line 1\nDetails line 2",
    evidenceLinksJson: JSON.stringify(["https://a.example", "https://b.example"]),
    relatedFilesJson: JSON.stringify(["file-a.txt"]),
    nextAction: "Next step",
    orderIndex: 1,
};

describe("Stale-state revalidation", () => {
    it("blocks when the project is deleted", async () => {
        const { db, batchId, approvalId } = await buildApprovedBatch("project_documentation");
        db.prepare("DELETE FROM projects WHERE id = 'p-example'").run();
        expect(errorCode(() =>
            executeApprovedImportEntity({ batchId, entityType: "project_documentation", approvalId, requestedBy: "x" }, { db, now: T0 }),
        )).toBe(EXECUTION_ERROR_CODES.STALE_PROJECT);
        expect((db.prepare("SELECT COUNT(*) AS c FROM project_doc_blocks").get() as { c: number }).c).toBe(0);
        db.close();
    });

    it("blocks when the project slug no longer matches", async () => {
        const { db, batchId, approvalId } = await buildApprovedBatch("project_documentation");
        db.prepare("UPDATE projects SET slug = 'changed-slug' WHERE id = 'p-example'").run();
        expect(errorCode(() =>
            executeApprovedImportEntity({ batchId, entityType: "project_documentation", approvalId, requestedBy: "x" }, { db, now: T0 }),
        )).toBe(EXECUTION_ERROR_CODES.STALE_PROJECT);
        db.close();
    });

    it("blocks when documentation identity now exists with identical content", async () => {
        const { db, batchId, approvalId } = await buildApprovedBatch("project_documentation");
        seedExistingDocBlock(db, { id: "x-dup", projectId: "p-example", sourceRecordId: "TEST-DOC-001", ...DOC_MATCH });
        expect(errorCode(() =>
            executeApprovedImportEntity({ batchId, entityType: "project_documentation", approvalId, requestedBy: "x" }, { db, now: T0 }),
        )).toBe(EXECUTION_ERROR_CODES.STALE_DUPLICATE);
        db.close();
    });

    it("blocks when documentation identity now exists with different content", async () => {
        const { db, batchId, approvalId } = await buildApprovedBatch("project_documentation");
        seedExistingDocBlock(db, { id: "x-conf", projectId: "p-example", sourceRecordId: "TEST-DOC-001", detailsMd: "Different" });
        expect(errorCode(() =>
            executeApprovedImportEntity({ batchId, entityType: "project_documentation", approvalId, requestedBy: "x" }, { db, now: T0 }),
        )).toBe(EXECUTION_ERROR_CODES.STALE_CONFLICT);
        db.close();
    });

    it("blocks when documentation identity now points to an archived record", async () => {
        const { db, batchId, approvalId } = await buildApprovedBatch("project_documentation");
        seedExistingDocBlock(db, { id: "x-arch", projectId: "p-example", sourceRecordId: "TEST-DOC-001", status: "archived" });
        expect(errorCode(() =>
            executeApprovedImportEntity({ batchId, entityType: "project_documentation", approvalId, requestedBy: "x" }, { db, now: T0 }),
        )).toBe(EXECUTION_ERROR_CODES.STALE_REVIEW_REQUIRED);
        db.close();
    });

    it("blocks backlog when an exact duplicate appears after approval", async () => {
        const { db, batchId, approvalId } = await buildApprovedBatch("backlog");
        seedExistingBacklogItem(db, {
            id: "bl-dup",
            projectId: "p-example",
            title: "Backlog item one",
            status: "planned",
            priority: 2,
            scheduleBucket: "morning",
            startDate: "2026-03-01",
            endDate: "2026-03-15",
            isMilestone: 0,
            workstream: "Dev",
            dodText: "DoD text",
            notes: "Note text",
        });
        expect(errorCode(() =>
            executeApprovedImportEntity({ batchId, entityType: "backlog", approvalId, requestedBy: "x" }, { db, now: T0 }),
        )).toBe(EXECUTION_ERROR_CODES.STALE_DUPLICATE);
        expect((db.prepare("SELECT COUNT(*) AS c FROM project_items").get() as { c: number }).c).toBe(1);
        db.close();
    });
});
