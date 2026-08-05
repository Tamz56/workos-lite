import Database from "better-sqlite3";
import { describe, expect, it } from "vitest";
import { runWorkOSProjectFieldDryRun } from "@/lib/project-import/dryRunAssembler";
import { persistWorkOSProjectFieldDryRun } from "@/lib/project-import/auditPersistenceService";
import { getBatch, type BatchRecord } from "@/lib/project-import/auditBatchRepository";
import {
    approveEntity,
    consumeApproval,
    createApproval,
    deriveEffectiveApprovalState,
    findLatestValidApproval,
    getApproval,
    listApprovalEvents,
    listApprovalHistory,
    markApprovalExpired,
    rejectApproval,
    revokeApproval,
} from "@/lib/project-import/auditApprovalRepository";
import {
    AuditBindingMismatchError,
    AuditBlockedError,
    AuditTransitionError,
    type ApprovalBinding,
} from "@/lib/project-import/auditTypes";
import { createAuditTestDatabase } from "../fixtures/auditTestDb";
import { createDryRunTestDatabase, seedDocBlock, seedProject } from "../fixtures/dryRunTestDb";
import { validWorkbook, workbookWithInvalidEnum } from "../fixtures/projectFieldSheetFixtures";
import type { WorkOSProjectFieldDryRunResult } from "@/lib/project-import/dryRunTypes";

const T0 = "2026-08-05T10:00:00.000Z";
const T0_PLUS_31 = "2026-08-05T10:31:00.000Z";

const SOURCE = { sourceFilename: "fixture.xlsx", sourceFileSize: 4096, sourceMimeType: "xlsx" };

async function persistScenario(seed: (db: Database.Database) => void, workbook?: Buffer): Promise<{ auditDb: Database.Database; batchId: string; batch: BatchRecord }> {
    const dryDb = createDryRunTestDatabase();
    seedProject(dryDb, "p-example", "example-project-slug", "Example");
    seed(dryDb);
    const result: WorkOSProjectFieldDryRunResult = await runWorkOSProjectFieldDryRun(
        { workbook: workbook ?? (await validWorkbook()) },
        { db: dryDb },
    );
    dryDb.close();

    const auditDb = createAuditTestDatabase();
    const persisted = persistWorkOSProjectFieldDryRun(auditDb, result, SOURCE);
    return { auditDb, batchId: persisted.id, batch: getBatch(auditDb, persisted.id) };
}

function bindingFor(batch: BatchRecord, entityType: "project_documentation" | "backlog"): ApprovalBinding {
    return {
        batchId: batch.id,
        entityType,
        boundFileHash: batch.source_file_hash,
        boundDryRunId: batch.dry_run_id,
        boundSchemaVersion: batch.schema_version,
        boundParserContractVersion: batch.parser_contract_version,
        boundDryRunContractVersion: batch.dry_run_contract_version,
        approvalSummaryFingerprint: "",
    };
}

function approveInput(batch: BatchRecord, entityType: "project_documentation" | "backlog", boundFileHash?: string) {
    return {
        batchId: batch.id,
        entityType,
        approvedBy: "owner",
        now: T0,
        boundFileHash: boundFileHash ?? batch.source_file_hash,
        boundDryRunId: batch.dry_run_id,
        boundSchemaVersion: batch.schema_version,
        boundParserContractVersion: batch.parser_contract_version,
        boundDryRunContractVersion: batch.dry_run_contract_version,
    };
}

describe("Approval lifecycle", () => {
    it("creates a pending approval with binding fields", async () => {
        const { auditDb, batch } = await persistScenario(() => undefined);
        const approval = createApproval(auditDb, bindingFor(batch, "project_documentation"));
        expect(approval.approval_status).toBe("pending");
        expect(approval.bound_file_hash).toBe(batch.source_file_hash);
        expect(approval.bound_dry_run_id).toBe(batch.dry_run_id);
        expect(listApprovalEvents(auditDb, approval.id).map((event) => event.event_type)).toEqual(["created"]);
        auditDb.close();
    });

    it("approves an entity with only eligible new rows and sets a 30-minute TTL", async () => {
        const { auditDb, batch } = await persistScenario(() => undefined);
        const approval = approveEntity(auditDb, approveInput(batch, "project_documentation"));
        expect(approval.approval_status).toBe("approved");
        expect(approval.approved_at).toBe(T0);
        expect(approval.expires_at).toBe("2026-08-05T10:30:00.000Z");
        expect(getBatch(auditDb, batch.id).project_documentation_status).toBe("approved");
        expect(listApprovalEvents(auditDb, approval.id).map((event) => event.event_type)).toEqual(["created", "approved"]);
        expect(deriveEffectiveApprovalState(auditDb, approval.id)).toBe("approved");
        auditDb.close();
    });

    it("allows approval of warning-only entities", async () => {
        const { auditDb, batch } = await persistScenario((db) => {
            seedDocBlock(db, {
                id: "doc-sim",
                project_id: "p-example",
                source_record_id: "SIM-EXT",
                title: "Fixture doc one",
                block_date: "2026-01-05",
                details_md: "Different content",
            });
        });
        const approval = approveEntity(auditDb, approveInput(batch, "project_documentation"));
        expect(approval.approval_status).toBe("approved");
        auditDb.close();
    });

    it("blocks approval when the entity has invalid rows", async () => {
        const { auditDb, batch } = await persistScenario(() => undefined, await workbookWithInvalidEnum());
        expect(() => approveEntity(auditDb, approveInput(batch, "project_documentation"))).toThrow(AuditBlockedError);
        auditDb.close();
    });

    it("does not expose normalized payload in approval errors", async () => {
        const { auditDb, batch } = await persistScenario(() => undefined, await workbookWithInvalidEnum());
        try {
            approveEntity(auditDb, approveInput(batch, "project_documentation"));
            throw new Error("expected failure");
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            expect(message).not.toContain("Details line 1");
            expect(message).not.toContain("Note text");
        }
        auditDb.close();
    });

    it("blocks approval when the entity has conflict rows", async () => {
        const { auditDb, batch } = await persistScenario((db) => {
            seedDocBlock(db, {
                id: "doc-conflict",
                project_id: "p-example",
                source_record_id: "TEST-DOC-001",
                details_md: "DIFFERENT details",
            });
        });
        expect(() => approveEntity(auditDb, approveInput(batch, "project_documentation"))).toThrow(AuditBlockedError);
        auditDb.close();
    });

    it("blocks approval when the entity has review-required rows", async () => {
        const { auditDb, batch } = await persistScenario((db) => {
            seedDocBlock(db, {
                id: "doc-archived",
                project_id: "p-example",
                source_record_id: "TEST-DOC-001",
                status: "archived",
            });
        });
        expect(() => approveEntity(auditDb, approveInput(batch, "project_documentation"))).toThrow(AuditBlockedError);
        auditDb.close();
    });

    it("allows approval when only duplicate/skipped rows exist", async () => {
        const { auditDb, batch } = await persistScenario((db) => {
            seedDocBlock(db, {
                id: "doc-dup",
                project_id: "p-example",
                source_record_id: "TEST-DOC-001",
                next_action: "Next step",
                order_index: 1,
            });
        });
        expect(() => approveEntity(auditDb, approveInput(batch, "project_documentation"))).not.toThrow();
        auditDb.close();
    });

    it("fails on approval binding mismatch", async () => {
        const { auditDb, batch } = await persistScenario(() => undefined);
        expect(() => approveEntity(auditDb, approveInput(batch, "project_documentation", "wrong-hash"))).toThrow(AuditBindingMismatchError);
        auditDb.close();
    });

    it("expires approvals after 30 minutes and cannot consume an expired approval", async () => {
        const { auditDb, batch } = await persistScenario(() => undefined);
        const approval = approveEntity(auditDb, approveInput(batch, "project_documentation"));
        expect(findLatestValidApproval(auditDb, batch.id, "project_documentation", T0_PLUS_31)).toBeNull();
        markApprovalExpired(auditDb, approval.id, T0_PLUS_31);
        expect(listApprovalEvents(auditDb, approval.id).map((event) => event.event_type)).toEqual(["created", "approved", "expired"]);
        expect(deriveEffectiveApprovalState(auditDb, approval.id)).toBe("expired");
        expect(() => consumeApproval(auditDb, approval.id, T0_PLUS_31)).toThrow(AuditTransitionError);
        auditDb.close();
    });

    it("cannot consume a revoked approval or consume twice", async () => {
        const { auditDb, batch } = await persistScenario(() => undefined);
        const approval = approveEntity(auditDb, approveInput(batch, "project_documentation"));
        revokeApproval(auditDb, approval.id, { revokedBy: "owner", now: T0 });
        expect(listApprovalEvents(auditDb, approval.id).map((event) => event.event_type)).toEqual(["created", "approved", "revoked"]);
        expect(() => consumeApproval(auditDb, approval.id, T0)).toThrow(AuditTransitionError);

        const second = approveEntity(auditDb, approveInput(batch, "project_documentation"));
        consumeApproval(auditDb, second.id, T0);
        expect(listApprovalEvents(auditDb, second.id).map((event) => event.event_type)).toEqual(["created", "approved", "consumed"]);
        expect(deriveEffectiveApprovalState(auditDb, second.id)).toBe("consumed");
        expect(() => consumeApproval(auditDb, second.id, T0)).toThrow(AuditTransitionError);
        auditDb.close();
    });

    it("keeps entity approvals independent", async () => {
        const { auditDb, batch } = await persistScenario(() => undefined, await workbookWithInvalidEnum());
        const approval = approveEntity(auditDb, approveInput(batch, "backlog"));
        expect(approval.approval_status).toBe("approved");
        expect(getBatch(auditDb, batch.id).backlog_status).toBe("approved");
        expect(() => approveEntity(auditDb, approveInput(batch, "project_documentation"))).toThrow(AuditBlockedError);
        expect(listApprovalHistory(auditDb, batch.id, "project_documentation")).toHaveLength(0);
        auditDb.close();
    });

    it("preserves approval history through irreversible controlled transitions", async () => {
        const { auditDb, batch } = await persistScenario(() => undefined);
        const pending = createApproval(auditDb, bindingFor(batch, "backlog"));
        const createdBefore = pending.created_at;
        rejectApproval(auditDb, pending.id, { rejectedBy: "owner", now: T0, reason: "not ready" });
        const history = listApprovalHistory(auditDb, batch.id, "backlog");
        expect(history).toHaveLength(1);
        const rejected = getApproval(auditDb, pending.id);
        expect(rejected.approval_status).toBe("rejected");
        expect(rejected.created_at).toBe(createdBefore);
        expect(rejected.rejected_at).toBe(T0);
        expect(rejected.rejected_by).toBe("owner");
        const events = listApprovalEvents(auditDb, pending.id);
        expect(events.map((event) => event.event_type)).toEqual(["created", "rejected"]);
        expect(events[0].event_type).toBe("created");
        expect(deriveEffectiveApprovalState(auditDb, pending.id)).toBe("rejected");
        auditDb.close();
    });

    it("rejects approval after approval is invalid", async () => {
        const { auditDb, batch } = await persistScenario(() => undefined);
        const approval = approveEntity(auditDb, approveInput(batch, "project_documentation"));
        expect(() => rejectApproval(auditDb, approval.id, { rejectedBy: "owner", now: T0 })).toThrow(AuditTransitionError);
        auditDb.close();
    });
});
