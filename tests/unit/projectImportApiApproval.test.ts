import Database from "better-sqlite3";
import { describe, expect, it } from "vitest";
import {
    approveEntityApi,
    approvalStateForEntity,
    rejectEntityApi,
    revokeEntityApi,
} from "@/lib/project-import/approvalApplicationService";
import { ProjectImportApiError } from "@/lib/project-import/apiErrors";
import { listApprovalEvents } from "@/lib/project-import/auditApprovalRepository";
import { getBatch } from "@/lib/project-import/auditBatchRepository";
import { createApiAuthDatabase, buildDryRunResult, persistDryRunBatch } from "../fixtures/projectImportApiFixtures";
import { createDryRunTestDatabase, seedDocBlock, seedProject } from "../fixtures/dryRunTestDb";
import { runWorkOSProjectFieldDryRun } from "@/lib/project-import/dryRunAssembler";
import { validWorkbook, workbookWithInvalidEnum } from "../fixtures/projectFieldSheetFixtures";
import type { WorkOSProjectFieldDryRunResult } from "@/lib/project-import/dryRunTypes";

const T0 = "2026-08-05T10:00:00.000Z";
const T0_PLUS_31 = "2026-08-05T10:31:00.000Z";

async function resultWith(seed: (db: Database.Database) => void, workbook?: Buffer): Promise<WorkOSProjectFieldDryRunResult> {
    const db = createDryRunTestDatabase();
    seedProject(db, "p-example", "example-project-slug", "Example");
    seed(db);
    const result = await runWorkOSProjectFieldDryRun({ workbook: workbook ?? (await validWorkbook()) }, { db });
    db.close();
    return result;
}

describe("Approval application service", () => {
    it("approves an eligible entity with a 30-minute TTL", async () => {
        const db = createApiAuthDatabase(["project_import:*"]);
        const batch = persistDryRunBatch(db, await buildDryRunResult());
        const approval = approveEntityApi(batch.id, "project_documentation", "Test Agent", { db, now: T0 });
        expect(approval.approval_status).toBe("approved");
        expect(approval.expires_at).toBe("2026-08-05T10:30:00.000Z");
        expect(getBatch(db, batch.id).project_documentation_status).toBe("approved");
        db.close();
    });

    it("is idempotent for repeated identical approval requests", async () => {
        const db = createApiAuthDatabase(["project_import:*"]);
        const batch = persistDryRunBatch(db, await buildDryRunResult());
        const first = approveEntityApi(batch.id, "project_documentation", "Test Agent", { db, now: T0 });
        const second = approveEntityApi(batch.id, "project_documentation", "Test Agent", { db, now: T0 });
        expect(second.id).toBe(first.id);
        db.close();
    });

    it("keeps entity approvals independent", async () => {
        const db = createApiAuthDatabase(["project_import:*"]);
        const batch = persistDryRunBatch(db, await buildDryRunResult());
        const doc = approveEntityApi(batch.id, "project_documentation", "Test Agent", { db, now: T0 });
        const backlog = approveEntityApi(batch.id, "backlog", "Test Agent", { db, now: T0 });
        expect(doc.id).not.toBe(backlog.id);
        expect(getBatch(db, batch.id).backlog_status).toBe("approved");
        db.close();
    });

    it("blocks approval when the entity has invalid rows", async () => {
        const db = createApiAuthDatabase(["project_import:*"]);
        const batch = persistDryRunBatch(db, await resultWith(() => undefined, await workbookWithInvalidEnum()));
        expect(() => approveEntityApi(batch.id, "project_documentation", "Test Agent", { db, now: T0 })).toThrowError(
            expect.objectContaining({ code: "IMPORT_ENTITY_BLOCKED" }),
        );
        db.close();
    });

    it("blocks approval when the entity has conflict rows", async () => {
        const db = createApiAuthDatabase(["project_import:*"]);
        const batch = persistDryRunBatch(
            db,
            await resultWith((dryDb) => {
                seedDocBlock(dryDb, {
                    id: "doc-conflict",
                    project_id: "p-example",
                    source_record_id: "TEST-DOC-001",
                    details_md: "DIFFERENT details",
                });
            }),
        );
        expect(() => approveEntityApi(batch.id, "project_documentation", "Test Agent", { db, now: T0 })).toThrowError(
            expect.objectContaining({ code: "IMPORT_ENTITY_BLOCKED" }),
        );
        db.close();
    });

    it("blocks approval when the entity has review_required rows", async () => {
        const db = createApiAuthDatabase(["project_import:*"]);
        const batch = persistDryRunBatch(
            db,
            await resultWith((dryDb) => {
                seedDocBlock(dryDb, {
                    id: "doc-archived",
                    project_id: "p-example",
                    source_record_id: "TEST-DOC-001",
                    status: "archived",
                });
            }),
        );
        expect(() => approveEntityApi(batch.id, "project_documentation", "Test Agent", { db, now: T0 })).toThrowError(
            expect.objectContaining({ code: "IMPORT_ENTITY_BLOCKED" }),
        );
        db.close();
    });

    it("rejects approval when the entity has no eligible new rows", async () => {
        const db = createApiAuthDatabase(["project_import:*"]);
        const batch = persistDryRunBatch(db, await resultWith((dryDb) => {
            seedDocBlock(dryDb, {
                id: "d1",
                project_id: "p-example",
                source_record_id: "TEST-DOC-001",
                next_action: "Next step",
                order_index: 1,
            });
            seedDocBlock(dryDb, {
                id: "d2",
                project_id: "p-example",
                source_record_id: "TEST-DOC-002",
                title: "Fixture doc two",
                block_date: "2026-02-10",
                summary: "Summary two",
                details_md: "Details two",
            });
        }));
        expect(() => approveEntityApi(batch.id, "project_documentation", "Test Agent", { db, now: T0 })).toThrowError(
            expect.objectContaining({ code: "IMPORT_ENTITY_HAS_NO_ELIGIBLE_ROWS" }),
        );
        db.close();
    });

    it("rejects an entity and appends created+rejected history with a sanitized reason", async () => {
        const db = createApiAuthDatabase(["project_import:*"]);
        const batch = persistDryRunBatch(db, await buildDryRunResult());
        const approval = rejectEntityApi(batch.id, "backlog", "Test Agent", "  not ready\u0000 yet  ", { db, now: T0 });
        expect(approval.approval_status).toBe("rejected");
        expect(approval.reason_or_note).toBe("not ready yet");
        const events = listApprovalEvents(db, approval.id);
        expect(events.map((event) => event.event_type)).toEqual(["created", "rejected"]);
        expect(events[0].actor).toBeNull();
        expect(events[1].actor).toBe("Test Agent");
        db.close();
    });

    it("revokes an active approval", async () => {
        const db = createApiAuthDatabase(["project_import:*"]);
        const batch = persistDryRunBatch(db, await buildDryRunResult());
        approveEntityApi(batch.id, "project_documentation", "Test Agent", { db, now: T0 });
        const revoked = revokeEntityApi(batch.id, "project_documentation", "Test Agent", { db, now: T0 });
        expect(revoked.approval_status).toBe("revoked");
        expect(listApprovalEvents(db, revoked.id).map((event) => event.event_type)).toEqual(["created", "approved", "revoked"]);
        db.close();
    });

    it("reports effective expiry on read without mutating event history", async () => {
        const db = createApiAuthDatabase(["project_import:*"]);
        const batch = persistDryRunBatch(db, await buildDryRunResult());
        const approval = approveEntityApi(batch.id, "project_documentation", "Test Agent", { db, now: T0 });
        const state = approvalStateForEntity(batch.id, "project_documentation", { db, now: T0_PLUS_31 });
        expect(state.effectiveStatus).toBe("expired");
        expect(state.isValidNow).toBe(false);
        expect(listApprovalEvents(db, approval.id).map((event) => event.event_type)).toEqual(["created", "approved"]);
        db.close();
    });

    it("throws machine-readable errors for unknown batches", async () => {
        const db = createApiAuthDatabase(["project_import:*"]);
        try {
            approveEntityApi("batch-missing", "project_documentation", "Test Agent", { db, now: T0 });
            throw new Error("expected failure");
        } catch (error) {
            expect(error).toBeInstanceOf(ProjectImportApiError);
            expect((error as ProjectImportApiError).code).toBe("IMPORT_BATCH_NOT_FOUND");
            expect((error as ProjectImportApiError).message).not.toContain("SqliteError");
        }
        db.close();
    });
});
