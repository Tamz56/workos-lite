import { describe, expect, it, vi } from "vitest";
import { runWorkOSProjectFieldDryRun } from "@/lib/project-import/dryRunAssembler";
import {
    persistWorkOSProjectFieldDryRun,
    sanitizeSourceFilename,
    type PersistDryRunSource,
} from "@/lib/project-import/auditPersistenceService";
import { getBatch } from "@/lib/project-import/auditBatchRepository";
import { listRowsByBatchEntity } from "@/lib/project-import/auditRowRepository";
import { parseCanonicalJson } from "@/lib/project-import/auditSerialization";
import { createAuditTestDatabase, tableColumns } from "../fixtures/auditTestDb";
import { createDryRunTestDatabase, seedProject } from "../fixtures/dryRunTestDb";
import { validWorkbook, workbookWithBlankRow } from "../fixtures/projectFieldSheetFixtures";
import type { WorkOSProjectFieldDryRunResult } from "@/lib/project-import/dryRunTypes";

const SOURCE: PersistDryRunSource = {
    sourceFilename: "../evil/fixture.xlsx",
    sourceFileSize: 4096,
    sourceMimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
};

async function buildResult(): Promise<WorkOSProjectFieldDryRunResult> {
    const db = createDryRunTestDatabase();
    seedProject(db, "p-example", "example-project-slug", "Example");
    const result = await runWorkOSProjectFieldDryRun({ workbook: await validWorkbook(), sourceFilename: "fixture.xlsx" }, { db });
    db.close();
    return result;
}

async function buildResultFromWorkbook(workbook: Buffer): Promise<WorkOSProjectFieldDryRunResult> {
    const db = createDryRunTestDatabase();
    seedProject(db, "p-example", "example-project-slug", "Example");
    const result = await runWorkOSProjectFieldDryRun({ workbook }, { db });
    db.close();
    return result;
}

describe("Dry-run audit persistence", () => {
    it("persists the batch and every candidate row atomically", async () => {
        const db = createAuditTestDatabase();
        const result = await buildResult();
        const persisted = persistWorkOSProjectFieldDryRun(db, result, SOURCE);

        expect(persisted.id).toMatch(/^batch-/);
        expect(persisted.rowIds).toHaveLength(4);

        const batch = getBatch(db, persisted.id);
        expect(batch.dry_run_id).toBe(result.dryRunId);
        expect(batch.source_file_hash).toBe(result.fileHash);
        expect(batch.schema_version).toBe("workos-field-sheet-v1");
        expect(batch.batch_status).toBe("ready_for_approval");
        expect(batch.source_filename).toBe("../evil/fixture.xlsx");
        expect(batch.source_filename_sanitized).toBe("fixture.xlsx");
        expect(batch.total_rows).toBe(4);
        expect(batch.new_rows).toBe(4);
        expect(batch.warning_count).toBe(0);
        expect(batch.error_count).toBe(0);

        const rows = listRowsByBatchEntity(db, persisted.id, "project_documentation");
        expect(rows).toHaveLength(2);
        expect(rows.every((row) => row.normalized_payload_json !== null)).toBe(true);
        expect(rows.every((row) => parseCanonicalJson<string[]>(row.validation_issue_codes_json).length >= 0)).toBe(true);
        db.close();
    });

    it("does not persist fully blank physical rows", async () => {
        const db = createAuditTestDatabase();
        const result = await buildResultFromWorkbook(await workbookWithBlankRow());
        expect(result.totals.skippedRows).toBe(1);
        const persisted = persistWorkOSProjectFieldDryRun(db, result, SOURCE);
        const batch = getBatch(db, persisted.id);
        expect(batch.skipped_rows).toBe(1);
        expect(batch.total_rows).toBe(4);
        expect(persisted.rowIds).toHaveLength(4);
        db.close();
    });

    it("creates distinct batch ids for identical dry-run results", async () => {
        const db = createAuditTestDatabase();
        const result = await buildResult();
        const first = persistWorkOSProjectFieldDryRun(db, result, SOURCE);
        const second = persistWorkOSProjectFieldDryRun(db, result, SOURCE);
        expect(first.id).not.toBe(second.id);
        expect(getBatch(db, first.id).dry_run_id).toBe(getBatch(db, second.id).dry_run_id);
        db.close();
    });

    it("rolls back the entire batch when a row fails to persist", async () => {
        const db = createAuditTestDatabase();
        const result = await buildResult();
        (result.entities.projectDocumentation.rows[0] as { normalizedData: unknown }).normalizedData = { bad: undefined };

        expect(() => persistWorkOSProjectFieldDryRun(db, result, SOURCE)).toThrow(/Cannot serialize undefined/);
        expect((db.prepare("SELECT COUNT(*) AS c FROM import_batches").get() as { c: number }).c).toBe(0);
        expect((db.prepare("SELECT COUNT(*) AS c FROM import_batch_rows").get() as { c: number }).c).toBe(0);
        db.close();
    });

    it("never stores workbook bytes", () => {
        const db = createAuditTestDatabase();
        const columns = tableColumns(db, "import_batches");
        expect(columns).not.toContain("workbook_bytes");
        expect(columns).not.toContain("workbook_blob");
        expect(columns).not.toContain("workbook_base64");
        db.close();
    });

    it("does not write sensitive payload content to application logs", async () => {
        const logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);
        const db = createAuditTestDatabase();
        const result = await buildResult();
        persistWorkOSProjectFieldDryRun(db, result, SOURCE);
        const logs = logSpy.mock.calls.map((call) => String(call[0]));
        expect(logs.some((line) => line.includes("Details line 1") || line.includes("Note text"))).toBe(false);
        logSpy.mockRestore();
        db.close();
    });
});

describe("sanitizeSourceFilename", () => {
    it("removes path segments and unsafe characters", () => {
        expect(sanitizeSourceFilename("../evil/name.xlsx")).toBe("name.xlsx");
        expect(sanitizeSourceFilename("C:\\temp\\a b?.xlsx")).toBe("a_b_.xlsx");
        expect(sanitizeSourceFilename("..")).toBe("workbook.xlsx");
    });

    it("truncates long filenames", () => {
        const long = "a".repeat(200) + ".xlsx";
        expect(sanitizeSourceFilename(long)).toHaveLength(80);
    });
});
