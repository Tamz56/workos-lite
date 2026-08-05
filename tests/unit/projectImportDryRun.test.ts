import Database from "better-sqlite3";
import { describe, expect, it } from "vitest";
import { runWorkOSProjectFieldDryRun } from "@/lib/project-import/dryRunAssembler";
import { dryRunInvariantViolations } from "@/lib/project-import/dryRunSummary";
import type { WorkOSProjectFieldDryRunResult } from "@/lib/project-import/dryRunTypes";
import {
    createDryRunTestDatabase,
    seedBacklogItem,
    seedDocBlock,
    seedProject,
} from "../fixtures/dryRunTestDb";
import {
    setBacklogCell,
    setDocCell,
    unsupportedFileBytes,
    validWorkbook,
    workbookMissingSheet,
    workbookWithInvalidEnum,
} from "../fixtures/projectFieldSheetFixtures";

const EXAMPLE_SLUG = "example-project-slug";
const EXAMPLE_PROJECT_ID = "p-example";

function freshDb(): Database.Database {
    const db = createDryRunTestDatabase();
    seedProject(db, EXAMPLE_PROJECT_ID, EXAMPLE_SLUG, "Example");
    return db;
}

async function dryRun(workbook: Buffer, db: Database.Database): Promise<WorkOSProjectFieldDryRunResult> {
    return runWorkOSProjectFieldDryRun({ workbook, sourceFilename: "fixture.xlsx" }, { db });
}

function docRow(result: WorkOSProjectFieldDryRunResult, externalRowId: string) {
    return result.entities.projectDocumentation.rows.find((row) => row.externalRowId === externalRowId);
}

function backlogRow(result: WorkOSProjectFieldDryRunResult, externalRowId: string) {
    return result.entities.backlog.rows.find((row) => row.externalRowId === externalRowId);
}

function hasIssue(row: { issues: Array<{ code: string }> }, code: string): boolean {
    return row.issues.some((issue) => issue.code === code);
}

describe("Project resolution", () => {
    it("resolves an exact slug match", async () => {
        const result = await dryRun(await validWorkbook(), freshDb());
        expect(docRow(result, "TEST-DOC-001")?.projectId).toBe(EXAMPLE_PROJECT_ID);
        expect(docRow(result, "TEST-DOC-001")?.dryRunStatus).toBe("new");
        expect(docRow(result, "TEST-DOC-001")?.proposedOperation).toBe("insert");
    });

    it("fails on case mismatch", async () => {
        const workbook = await setDocCell(await validWorkbook(), 7, 2, "Example-Project-Slug");
        const result = await dryRun(workbook, freshDb());
        const row = docRow(result, "TEST-DOC-001");
        expect(row?.dryRunStatus).toBe("invalid");
        expect(hasIssue(row!, "PROJECT_NOT_FOUND")).toBe(true);
    });

    it("fails on an unknown slug", async () => {
        const workbook = await setDocCell(await validWorkbook(), 7, 2, "missing-project");
        const result = await dryRun(workbook, freshDb());
        expect(docRow(result, "TEST-DOC-001")?.dryRunStatus).toBe("invalid");
    });

    it("keeps a blank slug parser-invalid", async () => {
        const workbook = await setDocCell(await validWorkbook(), 7, 2, "");
        const result = await dryRun(workbook, freshDb());
        expect(docRow(result, "TEST-DOC-001")?.dryRunStatus).toBe("invalid");
    });
});

describe("Project Documentation classification", () => {
    it("classifies an exact duplicate", async () => {
        const db = freshDb();
        seedDocBlock(db, {
            id: "doc-dup",
            project_id: EXAMPLE_PROJECT_ID,
            source_record_id: "TEST-DOC-001",
            next_action: "Next step",
            order_index: 1,
        });
        const result = await dryRun(await validWorkbook(), db);
        const row = docRow(result, "TEST-DOC-001");
        expect(row?.dryRunStatus).toBe("duplicate");
        expect(row?.proposedOperation).toBe("none");
        expect(row?.existingRecordReference).toBe("doc-dup");
    });

    it("classifies same identity different content as conflict", async () => {
        const db = freshDb();
        seedDocBlock(db, {
            id: "doc-conflict",
            project_id: EXAMPLE_PROJECT_ID,
            source_record_id: "TEST-DOC-001",
            details_md: "DIFFERENT details",
        });
        const result = await dryRun(await validWorkbook(), db);
        const row = docRow(result, "TEST-DOC-001");
        expect(row?.dryRunStatus).toBe("conflict");
        expect(row?.proposedOperation).toBe("manual_review");
        expect(hasIssue(row!, "EXISTING_IDENTITY_CONFLICT")).toBe(true);
    });

    it("classifies an archived identity match as review_required", async () => {
        const db = freshDb();
        seedDocBlock(db, {
            id: "doc-archived",
            project_id: EXAMPLE_PROJECT_ID,
            source_record_id: "TEST-DOC-001",
            status: "archived",
        });
        const result = await dryRun(await validWorkbook(), db);
        const row = docRow(result, "TEST-DOC-001");
        expect(row?.dryRunStatus).toBe("review_required");
        expect(row?.proposedOperation).toBe("manual_review");
        expect(hasIssue(row!, "ARCHIVED_IDENTITY_MATCH")).toBe(true);
    });

    it("classifies same content under a different external id as review_required", async () => {
        const db = freshDb();
        seedDocBlock(db, {
            id: "doc-other-id",
            project_id: EXAMPLE_PROJECT_ID,
            source_record_id: "OTHER-EXT",
            next_action: "Next step",
            order_index: 1,
        });
        const result = await dryRun(await validWorkbook(), db);
        const row = docRow(result, "TEST-DOC-001");
        expect(row?.dryRunStatus).toBe("review_required");
        expect(hasIssue(row!, "CONTENT_DUPLICATE_DIFFERENT_EXTERNAL_ID")).toBe(true);
    });

    it("keeps invalid parser rows invalid", async () => {
        const result = await dryRun(await workbookWithInvalidEnum(), freshDb());
        expect(docRow(result, "TEST-DOC-001")?.dryRunStatus).toBe("invalid");
    });
});

describe("Backlog classification", () => {
    it("classifies an exact content duplicate", async () => {
        const db = freshDb();
        seedBacklogItem(db, {
            id: "bl-dup",
            project_id: EXAMPLE_PROJECT_ID,
            title: "Backlog item one",
            status: "planned",
            priority: 2,
            schedule_bucket: "morning",
            start_date: "2026-03-01",
            end_date: "2026-03-15",
            is_milestone: 0,
            workstream: "Dev",
            dod_text: "DoD text",
            notes: "Note text",
        });
        const result = await dryRun(await validWorkbook(), db);
        const row = backlogRow(result, "TEST-BACKLOG-001");
        expect(row?.dryRunStatus).toBe("duplicate");
        expect(row?.proposedOperation).toBe("none");
    });

    it("classifies a similar but non-identical row as new", async () => {
        const db = freshDb();
        seedBacklogItem(db, {
            id: "bl-similar",
            project_id: EXAMPLE_PROJECT_ID,
            title: "Backlog item one",
            status: "planned",
            priority: 2,
            schedule_bucket: "morning",
            start_date: "2026-03-01",
            end_date: "2026-03-15",
            is_milestone: 0,
            workstream: "Dev",
            dod_text: "DoD text",
            notes: "Different notes",
        });
        const result = await dryRun(await validWorkbook(), db);
        expect(backlogRow(result, "TEST-BACKLOG-001")?.dryRunStatus).toBe("new");
    });

    it("keeps a repeated external id within the workbook invalid", async () => {
        const workbook = await setBacklogCell(await validWorkbook(), 8, 1, "TEST-BACKLOG-001");
        const result = await dryRun(workbook, freshDb());
        const row = result.entities.backlog.rows.find((item) => item.sourceRowNumber === 8);
        expect(row?.dryRunStatus).toBe("invalid");
        expect(hasIssue(row!, "DUPLICATE_EXTERNAL_ROW_ID")).toBe(true);
    });

    it("rejects unsupported wider statuses", async () => {
        const workbook = await setBacklogCell(await validWorkbook(), 7, 4, "in_progress");
        const result = await dryRun(workbook, freshDb());
        expect(backlogRow(result, "TEST-BACKLOG-001")?.dryRunStatus).toBe("invalid");
        expect(hasIssue(backlogRow(result, "TEST-BACKLOG-001")!, "INVALID_ENUM")).toBe(true);
    });
});

describe("Workbook and entity behavior", () => {
    it("keeps one entity ready while the other is blocked", async () => {
        const result = await dryRun(await workbookMissingSheet("02_Backlog"), freshDb());
        expect(result.entities.projectDocumentation.status).toBe("ready");
        expect(result.entities.backlog.status).toBe("blocked");
        expect(result.entities.backlog.issues.some((issue) => issue.code === "DRY_RUN_ENTITY_BLOCKED")).toBe(true);
    });

    it("does not turn warnings into errors", async () => {
        const db = freshDb();
        seedDocBlock(db, {
            id: "doc-sim",
            project_id: EXAMPLE_PROJECT_ID,
            source_record_id: "SIM-EXT",
            title: "Fixture doc one",
            block_date: "2026-01-05",
            details_md: "Different content",
        });
        const result = await dryRun(await validWorkbook(), db);
        const row = docRow(result, "TEST-DOC-001");
        expect(row?.dryRunStatus).toBe("new");
        expect(hasIssue(row!, "SIMILAR_IDENTITY_CANDIDATE")).toBe(true);
        expect(result.entities.projectDocumentation.status).toBe("ready_with_warnings");
        expect(result.workbookStatus).toBe("valid_with_warnings");
    });

    it("keeps totals consistent with row results", async () => {
        const db = freshDb();
        seedDocBlock(db, {
            id: "doc-dup",
            project_id: EXAMPLE_PROJECT_ID,
            source_record_id: "TEST-DOC-001",
            next_action: "Next step",
            order_index: 1,
        });
        seedBacklogItem(db, {
            id: "bl-dup",
            project_id: EXAMPLE_PROJECT_ID,
            title: "Backlog item one",
            status: "planned",
            priority: 2,
            schedule_bucket: "morning",
            start_date: "2026-03-01",
            end_date: "2026-03-15",
            is_milestone: 0,
            workstream: "Dev",
            dod_text: "DoD text",
            notes: "Note text",
        });
        const result = await dryRun(await validWorkbook(), db);
        expect(dryRunInvariantViolations(result)).toEqual([]);
        expect(result.totals.newRows).toBe(2);
        expect(result.totals.duplicateRows).toBe(2);
    });

    it("produces a deterministic dry-run id independent of generatedAt", async () => {
        const workbook = await validWorkbook();
        const db = freshDb();
        const first = await dryRun(workbook, db);
        const second = await dryRun(workbook, db);
        expect(second.dryRunId).toBe(first.dryRunId);
        expect(second.generatedAt).not.toBe(first.generatedAt);

        const changed = await setDocCell(workbook, 8, 4, "Changed title");
        const third = await dryRun(changed, freshDb());
        expect(third.dryRunId).not.toBe(first.dryRunId);
    });
});

describe("Failure handling", () => {
    it("blocks both entities when the database is unavailable", async () => {
        const db = freshDb();
        db.close();
        const result = await dryRun(await validWorkbook(), db);
        expect(result.entities.projectDocumentation.status).toBe("blocked");
        expect(result.entities.backlog.status).toBe("blocked");
        expect(result.entities.projectDocumentation.issues.some((issue) => issue.code === "DATABASE_READ_FAILED")).toBe(true);
    });

    it("handles malformed parser input defensively", async () => {
        const result = await dryRun(await unsupportedFileBytes(), freshDb());
        expect(result.workbookStatus).toBe("invalid");
        expect(result.entities.projectDocumentation.status).toBe("blocked");
        expect(result.entities.backlog.status).toBe("blocked");
    });
});
