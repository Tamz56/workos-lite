// ---------------------------------------------------------------------------
// WorkOS Sheet Gate 6 — execution test helpers
// WORKOS-SHEET-GATE-6
// ---------------------------------------------------------------------------

import type Database from "better-sqlite3";
import { runWorkOSProjectFieldDryRun } from "@/lib/project-import/dryRunAssembler";
import { persistDryRunBatch } from "./projectImportApiFixtures";
import { approveEntityApi } from "@/lib/project-import/approvalApplicationService";
import { createExecutionTestDatabase, seedProject } from "./executionTestDb";
import { createDryRunTestDatabase, seedProject as seedDryProject } from "./dryRunTestDb";
import { setDocCell, validWorkbook } from "./projectFieldSheetFixtures";
import type { EntityType } from "@/lib/project-import/auditTypes";
import type { WorkOSProjectFieldDryRunResult } from "@/lib/project-import/dryRunTypes";

export const T0 = "2026-08-05T10:00:00.000Z";
export const T0_PLUS_31 = "2026-08-05T10:31:00.000Z";

export async function buildResultFromWorkbook(workbook: Buffer): Promise<WorkOSProjectFieldDryRunResult> {
    const dry = createDryRunTestDatabase();
    seedDryProject(dry, "p-example", "example-project-slug", "Example");
    const result = await runWorkOSProjectFieldDryRun({ workbook }, { db: dry });
    dry.close();
    return result;
}

export async function buildApprovedBatch(
    entityType: EntityType,
    workbook?: Buffer,
): Promise<{ db: Database.Database; batchId: string; approvalId: string }> {
    const db = createExecutionTestDatabase();
    seedProject(db, "p-example", "example-project-slug", "Example");
    const result = await buildResultFromWorkbook(workbook ?? (await validWorkbook()));
    const batch = persistDryRunBatch(db, result);
    const approval = approveEntityApi(batch.id, entityType, "Test Agent", { db, now: T0 });
    return { db, batchId: batch.id, approvalId: approval.id };
}

export async function singleDocRowWorkbook(): Promise<Buffer> {
    let workbook = await validWorkbook();
    for (let column = 1; column <= 14; column++) {
        workbook = await setDocCell(workbook, 8, column, undefined);
    }
    return workbook;
}
