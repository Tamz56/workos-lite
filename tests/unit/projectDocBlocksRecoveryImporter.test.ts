import crypto from "crypto";
import fs from "fs";
import os from "os";
import path from "path";
import Database from "better-sqlite3";
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { mockGetDb } = vi.hoisted(() => ({ mockGetDb: vi.fn() }));
vi.mock("@/db/db", () => ({ getDb: mockGetDb }));

import { runRecoveryImporter } from "../../scripts/import-recovery-blocks.js";
import { computeContentDuplicateHash, computeRecordIntegrityHash } from "../../src/lib/project-doc-blocks/hashing.js";
import { RECOVERY_FIXTURE_RECORDS } from "../fixtures/projectDocBlocksRecoveryFixtures";

type RecoveryRecord = {
  id: string;
  projectSlug: string;
  type: string;
  title: string;
  date: string;
  summary: string;
  details: string;
  evidenceLinks: string[];
  relatedFiles: string[];
  status: string;
  createdAt: string;
  updatedAt: string;
  [key: string]: unknown;
};

let db: Database.Database;
let tempDir: string;
let syntheticRecoveryPath = "";
let syntheticRecoveryHash = "";

function createTestSchema() {
  db.exec(`
    PRAGMA foreign_keys = ON;

    CREATE TABLE projects (
      id TEXT PRIMARY KEY,
      slug TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL
    );

    CREATE TABLE project_doc_blocks (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      legacy_project_slug TEXT NULL,
      import_source TEXT NULL CHECK(import_source IN ('localstorage_recovery', 'google_sheet', 'manual', 'arbor_summary') OR import_source IS NULL),
      import_batch_id TEXT NULL,
      migrated_at TEXT NULL,
      source_row_number INTEGER NULL,
      source_record_id TEXT NULL,
      block_type TEXT NOT NULL CHECK (block_type IN ('brief', 'structure', 'sop', 'process_note', 'decision', 'milestone', 'issue_fix', 'publish', 'qa_review')),
      title TEXT NOT NULL,
      block_date TEXT NOT NULL,
      summary TEXT NOT NULL,
      details_md TEXT NOT NULL,
      evidence_links_json TEXT NOT NULL DEFAULT '[]',
      related_files_json TEXT NOT NULL DEFAULT '[]',
      next_action TEXT NULL,
      status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
      order_index INTEGER NULL,
      source_text TEXT NULL,
      source_excerpt TEXT NULL,
      source_type TEXT NULL CHECK (source_type IN ('manual_paste', 'walkthrough', 'commit_log', 'qa_report', 'publish_log', 'chat_summary') OR source_type IS NULL),
      generated_by TEXT NULL CHECK (generated_by IN ('arbor') OR generated_by IS NULL),
      reviewed_by_user INTEGER NOT NULL DEFAULT 0 CHECK (reviewed_by_user IN (0, 1)),
      applied_at TEXT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE RESTRICT
    );

    CREATE TRIGGER trg_project_doc_blocks_updated_at
    AFTER UPDATE ON project_doc_blocks
    FOR EACH ROW
    WHEN NEW.updated_at = OLD.updated_at OR NEW.updated_at IS OLD.updated_at
    BEGIN
      UPDATE project_doc_blocks SET updated_at = datetime('now') WHERE id = NEW.id;
    END;

    CREATE INDEX idx_project_doc_blocks_proj_order
      ON project_doc_blocks(project_id, order_index, block_date);
    CREATE INDEX idx_project_doc_blocks_proj_date
      ON project_doc_blocks(project_id, block_date);

    INSERT INTO projects (id, slug, name) VALUES
      ('WniiRWTaGeEY7gt3XAsm7', 'workos-lite-arbordesk', 'WorkOS Lite'),
      ('RciepxjtyZYQSA6pmKZ0f', 'green-fineness-content', 'Green Fineness Content');
  `);
}

function recoveryRecords(): RecoveryRecord[] {
  return structuredClone(RECOVERY_FIXTURE_RECORDS) as RecoveryRecord[];
}

function rowCount(): number {
  return (db.prepare("SELECT COUNT(*) AS count FROM project_doc_blocks").get() as { count: number }).count;
}

function writeRecoveryText(contents: string) {
  const filePath = path.join(tempDir, `${crypto.randomUUID()}.json`);
  fs.writeFileSync(filePath, contents, "utf8");
  return {
    recoveryFilePath: filePath,
    overrideExpectedHash: crypto.createHash("sha256").update(contents, "utf8").digest("hex")
  };
}

function writeRecoveryFixture(records: unknown) {
  return writeRecoveryText(JSON.stringify(records));
}

function runFixtureImporter(options: Parameters<typeof runRecoveryImporter>[0] = {}) {
  return runRecoveryImporter({
    recoveryFilePath: syntheticRecoveryPath,
    overrideExpectedHash: syntheticRecoveryHash,
    ...options,
  });
}

function projectIdForSlug(slug: string): string {
  const row = db.prepare("SELECT id FROM projects WHERE slug = ?").get(slug) as { id: string } | undefined;
  if (!row) throw new Error(`Missing project fixture for ${slug}`);
  return row.id;
}

function insertExistingRecord(record: RecoveryRecord, overrides: Partial<RecoveryRecord> = {}) {
  const value = { ...record, ...overrides };
  db.prepare(`
    INSERT INTO project_doc_blocks (
      id, project_id, legacy_project_slug, import_source, import_batch_id,
      migrated_at, source_row_number, source_record_id, block_type, title,
      block_date, summary, details_md, evidence_links_json, related_files_json,
      next_action, status, order_index, source_text, source_excerpt, source_type,
      generated_by, reviewed_by_user, applied_at, created_at, updated_at
    ) VALUES (
      ?, ?, ?, NULL, NULL,
      NULL, NULL, NULL, ?, ?,
      ?, ?, ?, ?, ?,
      NULL, ?, NULL, NULL, NULL, NULL,
      NULL, 0, NULL, ?, ?
    )
  `).run(
    value.id,
    projectIdForSlug(value.projectSlug),
    value.projectSlug,
    value.type,
    value.title,
    value.date,
    value.summary,
    value.details,
    JSON.stringify(value.evidenceLinks),
    JSON.stringify(value.relatedFiles),
    value.status,
    value.createdAt,
    value.updatedAt
  );
}

beforeEach(() => {
  db = new Database(":memory:");
  createTestSchema();
  mockGetDb.mockReturnValue(db);
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "workos-recovery-importer-"));
  const fixtureWrite = writeRecoveryText(JSON.stringify(recoveryRecords()));
  syntheticRecoveryPath = fixtureWrite.recoveryFilePath;
  syntheticRecoveryHash = fixtureWrite.overrideExpectedHash;
});

afterEach(() => {
  db.close();
  fs.rmSync(tempDir, { recursive: true, force: true });
  vi.clearAllMocks();
});

afterAll(() => {
  vi.restoreAllMocks();
});

describe("Project Doc Blocks Recovery Importer", () => {
  it("preserves Thai Unicode, Markdown whitespace, and hash array semantics", () => {
    const [record] = recoveryRecords();
    const newlineVariant = { ...record, details: record.details.replace(/\n/g, "\r\n") };
    const reversedArrays = {
      ...record,
      evidenceLinks: ["https://example.com/b", "https://example.com/a"],
      relatedFiles: ["b.ts", "a.ts"]
    };
    const reorderedArrays = {
      ...reversedArrays,
      evidenceLinks: [...reversedArrays.evidenceLinks].reverse(),
      relatedFiles: [...reversedArrays.relatedFiles].reverse()
    };

    expect(record.details).toContain("ศึกษาปัญหาการกลับมาทำงาน");
    expect(record.details).toContain("```text");
    expect(computeRecordIntegrityHash(newlineVariant)).toBe(computeRecordIntegrityHash(record));
    expect(computeRecordIntegrityHash(reorderedArrays)).not.toBe(computeRecordIntegrityHash(reversedArrays));
    expect(computeContentDuplicateHash(reorderedArrays)).toBe(computeContentDuplicateHash(reversedArrays));
  });

  it("defaults to dry-run, resolves projects, writes zero rows, and leaves the recovery file unchanged", async () => {
    const sourceHashBefore = crypto.createHash("sha256").update(fs.readFileSync(syntheticRecoveryPath)).digest("hex");

    const report = await runFixtureImporter();

    const sourceHashAfter = crypto.createHash("sha256").update(fs.readFileSync(syntheticRecoveryPath)).digest("hex");
    expect(report.mode).toBe("Dry Run");
    expect(report.recoveryHash).toBe(syntheticRecoveryHash);
    expect(report.inputRecordCount).toBe(2);
    expect(report.validRecords).toBe(2);
    expect(report.readyToInsert).toBe(2);
    expect(report.databaseWritesPerformed).toBe(false);
    expect(report.status).toBe("Dry Run Passed — Awaiting Write Approval");
    expect(report.perRecordResults.map(result => result.resolvedProjectId)).toEqual([
      "WniiRWTaGeEY7gt3XAsm7",
      "RciepxjtyZYQSA6pmKZ0f"
    ]);
    expect(rowCount()).toBe(0);
    expect(sourceHashAfter).toBe(sourceHashBefore);
  });

  it("blocks a recovery hash mismatch before processing records", async () => {
    const report = await runFixtureImporter({
      overrideExpectedHash: "0000000000000000000000000000000000000000000000000000000000000000"
    });

    expect(report.status).toBe("Dry Run Failed — Import Blocked");
    expect(report.inputRecordCount).toBe(0);
    expect(report.databaseWritesPerformed).toBe(false);
    expect(rowCount()).toBe(0);
  });

  it("blocks invalid JSON", async () => {
    const report = await runRecoveryImporter(writeRecoveryText("{invalid-json"));

    expect(report.status).toBe("Dry Run Failed — Import Blocked");
    expect(report.databaseWritesPerformed).toBe(false);
    expect(rowCount()).toBe(0);
  });

  it("blocks a recovery root that is not an array", async () => {
    const report = await runRecoveryImporter(writeRecoveryFixture({ record: recoveryRecords()[0] }));

    expect(report.status).toBe("Dry Run Failed — Import Blocked");
    expect(report.databaseWritesPerformed).toBe(false);
    expect(rowCount()).toBe(0);
  });

  it.each([
    {
      name: "missing required title",
      mutate: (record: RecoveryRecord) => { delete record.title; },
      reason: "Missing title"
    },
    {
      name: "unknown project slug",
      mutate: (record: RecoveryRecord) => { record.projectSlug = "unknown-project"; },
      reason: "Cannot resolve projectSlug"
    },
    {
      name: "invalid block type",
      mutate: (record: RecoveryRecord) => { record.type = "unknown_type"; },
      reason: "Invalid block type"
    },
    {
      name: "invalid status",
      mutate: (record: RecoveryRecord) => { record.status = "deleted"; },
      reason: "Invalid status"
    },
    {
      name: "invalid date",
      mutate: (record: RecoveryRecord) => { record.date = "2026-02-31"; },
      reason: "Invalid date format"
    },
    {
      name: "invalid string array",
      mutate: (record: RecoveryRecord) => { record.evidenceLinks = ["valid", 42] as unknown as string[]; },
      reason: "evidenceLinks must be an array of strings"
    }
  ])("blocks $name", async ({ mutate, reason }) => {
    const [record] = recoveryRecords();
    mutate(record);

    const report = await runRecoveryImporter(writeRecoveryFixture([record]));

    expect(report.failedRecords).toBe(1);
    expect(report.invalidRecords).toBe(1);
    expect(report.perRecordResults[0].reason).toContain(reason);
    expect(report.databaseWritesPerformed).toBe(false);
    expect(rowCount()).toBe(0);
  });

  it("detects duplicate IDs within the source batch before write approval", async () => {
    const [record] = recoveryRecords();
    const report = await runRecoveryImporter(writeRecoveryFixture([record, { ...record }]));

    expect(report.readyToInsert).toBe(1);
    expect(report.exactIdDuplicates).toBe(1);
    expect(report.perRecordResults[1].result).toBe("Skipped — Duplicate ID in Source Batch");
    expect(report.databaseWritesPerformed).toBe(false);
    expect(rowCount()).toBe(0);
  });

  it("blocks a repeated source ID with different content", async () => {
    const [record] = recoveryRecords();
    const changed = { ...record, details: `${record.details}\nChanged` };

    const report = await runRecoveryImporter(writeRecoveryFixture([record, changed]));

    expect(report.readyToInsert).toBe(1);
    expect(report.conflicts).toBe(1);
    expect(report.status).toBe("Dry Run Failed — Import Blocked");
    expect(report.perRecordResults[1].result).toBe("Conflict — Duplicate Source ID Different Content");
    expect(rowCount()).toBe(0);
  });

  it("skips the second and third identical occurrences of a source ID", async () => {
    const [record] = recoveryRecords();

    const report = await runRecoveryImporter(writeRecoveryFixture([record, { ...record }, { ...record }]));

    expect(report.readyToInsert).toBe(1);
    expect(report.exactIdDuplicates).toBe(2);
    expect(report.perRecordResults.slice(1).map(result => result.result)).toEqual([
      "Skipped — Duplicate ID in Source Batch",
      "Skipped — Duplicate ID in Source Batch"
    ]);
    expect(rowCount()).toBe(0);
  });

  it("blocks a repeated global source ID assigned to a different project", async () => {
    const [record] = recoveryRecords();
    const differentProject = { ...record, projectSlug: "green-fineness-content" };

    const report = await runRecoveryImporter(writeRecoveryFixture([record, differentProject]));

    expect(report.conflicts).toBe(1);
    expect(report.status).toBe("Dry Run Failed — Import Blocked");
    expect(report.perRecordResults[1].result).toBe("Conflict — Duplicate Source ID Different Project");
    expect(rowCount()).toBe(0);
  });

  it("detects an exact existing ID with matching integrity", async () => {
    const [record] = recoveryRecords();
    insertExistingRecord(record);

    const report = await runRecoveryImporter(writeRecoveryFixture([record]));

    expect(report.exactIdDuplicates).toBe(1);
    expect(report.readyToInsert).toBe(0);
    expect(report.perRecordResults[0].result).toBe("Skipped — Exact ID Exists");
    expect(rowCount()).toBe(1);
  });

  it("treats a dry-run containing only exact existing records as a successful no-op", async () => {
    const records = recoveryRecords();
    records.forEach(record => insertExistingRecord(record));

    const report = await runFixtureImporter();

    expect(report.status).toBe("Dry Run Passed — No Changes Required");
    expect(report.readyToInsert).toBe(0);
    expect(report.exactIdDuplicates).toBe(2);
    expect(report.databaseWritesPerformed).toBe(false);
    expect(rowCount()).toBe(2);
  });

  it("detects an existing ID with different content as a conflict", async () => {
    const [record] = recoveryRecords();
    insertExistingRecord(record, { summary: `${record.summary} changed` });

    const report = await runRecoveryImporter(writeRecoveryFixture([record]));

    expect(report.conflicts).toBe(1);
    expect(report.status).toBe("Dry Run Failed — Import Blocked");
    expect(report.perRecordResults[0].result).toBe("Conflict — Same ID Different Content");
    expect(rowCount()).toBe(1);
  });

  it("detects matching metadata and content under a different ID", async () => {
    const [record] = recoveryRecords();
    insertExistingRecord(record, { id: "existing-content-id" });

    const report = await runRecoveryImporter(writeRecoveryFixture([record]));

    expect(report.exactContentDuplicates).toBe(1);
    expect(report.perRecordResults[0].result).toBe("Skipped — Exact Duplicate");
    expect(rowCount()).toBe(1);
  });

  it("detects matching metadata with different content as a conflict", async () => {
    const [record] = recoveryRecords();
    insertExistingRecord(record, { id: "metadata-conflict-id", details: `${record.details}\nChanged` });

    const report = await runRecoveryImporter(writeRecoveryFixture([record]));

    expect(report.conflicts).toBe(1);
    expect(report.perRecordResults[0].result).toBe("Conflict — Similar Metadata Different Content");
    expect(rowCount()).toBe(1);
  });

  it("atomically inserts all recovery records with metadata and matching integrity hashes", async () => {
    const sourceRecords = recoveryRecords();

    const report = await runFixtureImporter({ write: true });

    expect(report.status).toBe("Write Execution Passed");
    expect(report.databaseWritesPerformed).toBe(true);
    expect(report.insertedRecords).toBe(2);
    expect(rowCount()).toBe(2);
    expect(report.perRecordResults.every(result => result.hashMatch === true)).toBe(true);

    const rows = db.prepare(`
      SELECT id, legacy_project_slug, import_source, import_batch_id,
             source_row_number, source_record_id, details_md,
             evidence_links_json, related_files_json, created_at, updated_at
      FROM project_doc_blocks ORDER BY source_row_number
    `).all() as Array<{
      id: string;
      legacy_project_slug: string;
      import_source: string;
      import_batch_id: string;
      source_row_number: number;
      source_record_id: string;
      details_md: string;
      evidence_links_json: string;
      related_files_json: string;
      created_at: string;
      updated_at: string;
    }>;

    expect(rows.map(row => row.legacy_project_slug)).toEqual(sourceRecords.map(record => record.projectSlug));
    expect(rows.every(row => row.import_source === "localstorage_recovery")).toBe(true);
    expect(rows.every(row => row.import_batch_id === "localstorage-recovery-2026-08-01-project-doc-blocks")).toBe(true);
    expect(rows.map(row => row.source_row_number)).toEqual([1, 2]);
    expect(rows.map(row => row.source_record_id)).toEqual(sourceRecords.map(record => record.id));
    expect(rows.map(row => row.details_md)).toEqual(sourceRecords.map(record => record.details));
    expect(rows.map(row => row.evidence_links_json)).toEqual(sourceRecords.map(record => JSON.stringify(record.evidenceLinks)));
    expect(rows.map(row => row.related_files_json)).toEqual(sourceRecords.map(record => JSON.stringify(record.relatedFiles)));
    expect(rows.map(row => row.created_at)).toEqual(sourceRecords.map(record => record.createdAt));
    expect(rows.map(row => row.updated_at)).toEqual(sourceRecords.map(record => record.updatedAt));
  });

  it("preserves timestamps, Thai Markdown whitespace, and array order after DB round-trip", async () => {
    const [record] = recoveryRecords();
    record.id = "round-trip-preservation";
    record.details = "  \n```text\nรากและจุลินทรีย์\n```\n  ";
    record.evidenceLinks = ["https://example.com/b", "https://example.com/a"];
    record.relatedFiles = ["src/z.ts", "src/a.ts"];

    const report = await runRecoveryImporter({
      ...writeRecoveryFixture([record]),
      write: true
    });
    const stored = db.prepare(`
      SELECT details_md, evidence_links_json, related_files_json, created_at, updated_at
      FROM project_doc_blocks WHERE id = ?
    `).get(record.id) as {
      details_md: string;
      evidence_links_json: string;
      related_files_json: string;
      created_at: string;
      updated_at: string;
    };

    expect(report.status).toBe("Write Execution Passed");
    expect(report.perRecordResults[0].hashMatch).toBe(true);
    expect(stored.details_md).toBe(record.details);
    expect(JSON.parse(stored.evidence_links_json)).toEqual(record.evidenceLinks);
    expect(JSON.parse(stored.related_files_json)).toEqual(record.relatedFiles);
    expect(stored.created_at).toBe(record.createdAt);
    expect(stored.updated_at).toBe(record.updatedAt);
  });

  it("rolls back the entire batch when one insert fails", async () => {
    const records = recoveryRecords();
    const currentDbTime = (db.prepare("SELECT datetime('now') AS value").get() as { value: string }).value;
    records.forEach(record => {
      record.createdAt = currentDbTime;
      record.updatedAt = currentDbTime;
    });
    db.exec(`
      CREATE TRIGGER fail_second_recovery_insert
      BEFORE INSERT ON project_doc_blocks
      WHEN NEW.id = '${records[1].id}'
      BEGIN
        SELECT RAISE(ABORT, 'forced second insert failure');
      END;
    `);

    const report = await runRecoveryImporter({
      ...writeRecoveryFixture(records),
      write: true
    });

    expect(report.status).toBe("Write Execution Failed");
    expect(report.databaseWritesPerformed).toBe(false);
    expect(report.insertedRecords).toBe(0);
    expect(rowCount()).toBe(0);
  });

  it("rolls back the entire batch when post-insert integrity comparison fails", async () => {
    const records = recoveryRecords();
    db.exec(`
      CREATE TRIGGER corrupt_second_recovery_insert
      AFTER INSERT ON project_doc_blocks
      WHEN NEW.id = '${records[1].id}'
      BEGIN
        UPDATE project_doc_blocks SET details_md = details_md || 'corrupted' WHERE id = NEW.id;
      END;
    `);

    const report = await runFixtureImporter({ write: true });

    expect(report.status).toBe("Write Execution Failed");
    expect(report.databaseWritesPerformed).toBe(false);
    expect(report.insertedRecords).toBe(0);
    expect(rowCount()).toBe(0);
  });

  it("treats a write rerun of an already imported batch as an idempotent no-op", async () => {
    const firstReport = await runFixtureImporter({ write: true });
    const rowsBeforeRerun = db.prepare("SELECT * FROM project_doc_blocks ORDER BY id").all();

    const report = await runFixtureImporter({ write: true });
    const rowsAfterRerun = db.prepare("SELECT * FROM project_doc_blocks ORDER BY id").all();

    expect(firstReport.status).toBe("Write Execution Passed");
    expect(report.status).toBe("Write Execution Passed");
    expect(report.databaseWritesPerformed).toBe(false);
    expect(report.insertedRecords).toBe(0);
    expect(report.exactIdDuplicates).toBe(2);
    expect(rowCount()).toBe(2);
    expect(rowsAfterRerun).toEqual(rowsBeforeRerun);
  });

  it("writes only the new record in a mixed exact-duplicate and new batch", async () => {
    const records = recoveryRecords();
    insertExistingRecord(records[0]);

    const report = await runFixtureImporter({ write: true });

    expect(report.status).toBe("Write Execution Passed");
    expect(report.exactIdDuplicates).toBe(1);
    expect(report.insertedRecords).toBe(1);
    expect(report.databaseWritesPerformed).toBe(true);
    expect(rowCount()).toBe(2);
  });

  it("blocks a mixed exact-duplicate and conflict batch without changing existing rows", async () => {
    const records = recoveryRecords();
    insertExistingRecord(records[0]);
    insertExistingRecord(records[1], { details: `${records[1].details}\nExisting conflict` });
    const rowsBefore = db.prepare("SELECT * FROM project_doc_blocks ORDER BY id").all();

    const report = await runFixtureImporter({ write: true });

    expect(report.status).toBe("Write Execution Failed");
    expect(report.exactIdDuplicates).toBe(1);
    expect(report.conflicts).toBe(1);
    expect(report.databaseWritesPerformed).toBe(false);
    expect(db.prepare("SELECT * FROM project_doc_blocks ORDER BY id").all()).toEqual(rowsBefore);
  });
});
