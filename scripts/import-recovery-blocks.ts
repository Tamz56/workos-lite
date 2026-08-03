import fs from "fs";
import path from "path";
import crypto from "crypto";
import { getDb } from "../src/db/db.js";
import {
  getProjectIdBySlug,
  findProjectDocBlockById,
  findDuplicateCandidates,
  insertProjectDocBlock,
  findProjectDocBlocksByProjectId
} from "../src/lib/project-doc-blocks/repository.js";
import {
  computeRecordIntegrityHash,
  computeContentDuplicateHash
} from "../src/lib/project-doc-blocks/hashing.js";
import {
  isNonEmptyString,
  isValidBlockType,
  isValidStatus,
  isValidDateFormat,
  isStringArray,
  isValidSourceType
} from "../src/lib/project-doc-blocks/validation.js";
import { ProjectDocumentationBlock } from "../src/lib/types.js";
import { ProjectDocBlockPersistenceContext } from "../src/lib/project-doc-blocks/mappers.js";

const EXPECTED_RECOVERY_HASH = "538ce39753174a2395d8e5c077e6c5ee8067a047b53c3639af34e8237425e452";
const DEFAULT_RECOVERY_FILE_PATH = "backup/workos_projects_docs_v1-recovery-2026-08-01-actual.json";
const STABLE_BATCH_ID = "localstorage-recovery-2026-08-01-project-doc-blocks";
const IMPORT_SOURCE = "localstorage_recovery";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function getDisplayString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value || fallback : fallback;
}

export interface RecordResult {
  sourceRow: number;
  id: string;
  projectSlug: string;
  resolvedProjectId: string | null;
  title: string;
  type: string;
  date: string;
  recordIntegrityHash: string;
  contentDuplicateHash: string;
  result: string;
  reason: string;
  beforeHash?: string;
  afterHash?: string;
  hashMatch?: boolean;
}

export interface ImporterOptions {
  write?: boolean;
  recoveryFilePath?: string;
  customBatchId?: string;
  overrideExpectedHash?: string;
}

export interface ImporterReport {
  mode: "Dry Run" | "Write";
  recoveryFile: string;
  recoveryHash: string;
  batchId: string;
  inputRecordCount: number;
  validRecords: number;
  invalidRecords: number;
  readyToInsert: number;
  insertedRecords: number;
  exactIdDuplicates: number;
  exactContentDuplicates: number;
  conflicts: number;
  failedRecords: number;
  databaseWritesPerformed: boolean;
  perRecordResults: RecordResult[];
  status: "Dry Run Passed — Awaiting Write Approval" | "Dry Run Passed — No Changes Required" | "Dry Run Partial — Review Required" | "Dry Run Failed — Import Blocked" | "Write Execution Passed" | "Write Execution Failed";
}

export async function runRecoveryImporter(options: ImporterOptions = {}): Promise<ImporterReport> {
  const isWriteMode = options.write === true;
  const relPath = options.recoveryFilePath || DEFAULT_RECOVERY_FILE_PATH;
  const fullPath = path.resolve(process.cwd(), relPath);
  const batchId = options.customBatchId || STABLE_BATCH_ID;
  const expectedHash = options.overrideExpectedHash || EXPECTED_RECOVERY_HASH;

  const report: ImporterReport = {
    mode: isWriteMode ? "Write" : "Dry Run",
    recoveryFile: relPath,
    recoveryHash: "",
    batchId,
    inputRecordCount: 0,
    validRecords: 0,
    invalidRecords: 0,
    readyToInsert: 0,
    insertedRecords: 0,
    exactIdDuplicates: 0,
    exactContentDuplicates: 0,
    conflicts: 0,
    failedRecords: 0,
    databaseWritesPerformed: false,
    perRecordResults: [],
    status: "Dry Run Failed — Import Blocked"
  };

  // Step 1: Verify file existence and hash
  if (!fs.existsSync(fullPath)) {
    console.error(`[Error] Recovery file not found at ${fullPath}`);
    report.status = "Dry Run Failed — Import Blocked";
    return report;
  }

  const rawBuffer = fs.readFileSync(fullPath);
  const computedHash = crypto.createHash("sha256").update(rawBuffer).digest("hex");
  report.recoveryHash = computedHash;

  if (computedHash !== expectedHash) {
    console.error(`[Error] Recovery file hash mismatch! Expected: ${expectedHash}, Computed: ${computedHash}`);
    report.status = "Dry Run Failed — Import Blocked";
    return report;
  }

  // Step 2: Parse and validate JSON structure
  let parsedRecords: unknown;
  try {
    const rawText = rawBuffer.toString("utf8");
    parsedRecords = JSON.parse(rawText);
  } catch (error: unknown) {
    console.error(`[Error] Failed to parse JSON in recovery file: ${getErrorMessage(error)}`);
    report.status = "Dry Run Failed — Import Blocked";
    return report;
  }

  if (!Array.isArray(parsedRecords)) {
    console.error(`[Error] Recovery file root is not an Array.`);
    report.status = "Dry Run Failed — Import Blocked";
    return report;
  }

  const records: unknown[] = parsedRecords;
  report.inputRecordCount = records.length;
  const migrationTimestamp = new Date().toISOString();

  // Step 3: Process each record
  const db = getDb();
  const recordsToInsert: {
    block: ProjectDocumentationBlock;
    context: ProjectDocBlockPersistenceContext;
    recResult: RecordResult;
  }[] = [];
  const seenSourceIds = new Map<string, {
    projectSlug: string;
    recordIntegrityHash: string;
  }>();

  for (let idx = 0; idx < records.length; idx++) {
    const rawValue = records[idx];
    const raw = isRecord(rawValue) ? rawValue : {};
    const sourceRow = idx + 1;

    const recResult: RecordResult = {
      sourceRow,
      id: getDisplayString(raw.id, `row-${sourceRow}`),
      projectSlug: getDisplayString(raw.projectSlug),
      resolvedProjectId: null,
      title: getDisplayString(raw.title),
      type: getDisplayString(raw.type),
      date: getDisplayString(raw.date),
      recordIntegrityHash: "",
      contentDuplicateHash: "",
      result: "Pending",
      reason: ""
    };

    // Validation checks
    if (!isNonEmptyString(raw.id)) {
      recResult.result = "Failed";
      recResult.reason = "Invalid or empty record ID";
      report.invalidRecords++;
      report.failedRecords++;
      report.perRecordResults.push(recResult);
      continue;
    }

    if (!isNonEmptyString(raw.projectSlug)) {
      recResult.result = "Failed";
      recResult.reason = "Missing projectSlug";
      report.invalidRecords++;
      report.failedRecords++;
      report.perRecordResults.push(recResult);
      continue;
    }

    if (!isValidBlockType(raw.type)) {
      recResult.result = "Failed";
      recResult.reason = `Invalid block type '${String(raw.type)}'`;
      report.invalidRecords++;
      report.failedRecords++;
      report.perRecordResults.push(recResult);
      continue;
    }

    if (!isNonEmptyString(raw.title)) {
      recResult.result = "Failed";
      recResult.reason = "Missing title";
      report.invalidRecords++;
      report.failedRecords++;
      report.perRecordResults.push(recResult);
      continue;
    }

    if (!isValidDateFormat(raw.date)) {
      recResult.result = "Failed";
      recResult.reason = `Invalid date format '${String(raw.date)}' (expected YYYY-MM-DD)`;
      report.invalidRecords++;
      report.failedRecords++;
      report.perRecordResults.push(recResult);
      continue;
    }

    if (!isNonEmptyString(raw.details)) {
      recResult.result = "Failed";
      recResult.reason = "Missing details content";
      report.invalidRecords++;
      report.failedRecords++;
      report.perRecordResults.push(recResult);
      continue;
    }

    if (raw.status && !isValidStatus(raw.status)) {
      recResult.result = "Failed";
      recResult.reason = `Invalid status '${String(raw.status)}'`;
      report.invalidRecords++;
      report.failedRecords++;
      report.perRecordResults.push(recResult);
      continue;
    }

    if (raw.evidenceLinks && !isStringArray(raw.evidenceLinks)) {
      recResult.result = "Failed";
      recResult.reason = "evidenceLinks must be an array of strings";
      report.invalidRecords++;
      report.failedRecords++;
      report.perRecordResults.push(recResult);
      continue;
    }

    if (raw.relatedFiles && !isStringArray(raw.relatedFiles)) {
      recResult.result = "Failed";
      recResult.reason = "relatedFiles must be an array of strings";
      report.invalidRecords++;
      report.failedRecords++;
      report.perRecordResults.push(recResult);
      continue;
    }

    // Resolve project ID
    const projectId = getProjectIdBySlug(raw.projectSlug);
    if (!projectId) {
      recResult.result = "Failed";
      recResult.reason = `Cannot resolve projectSlug '${raw.projectSlug}' to project ID`;
      report.invalidRecords++;
      report.failedRecords++;
      report.perRecordResults.push(recResult);
      continue;
    }
    recResult.resolvedProjectId = projectId;
    report.validRecords++;

    // Construct domain block representation
    const block: ProjectDocumentationBlock = {
      id: raw.id,
      projectSlug: raw.projectSlug,
      type: raw.type,
      title: raw.title,
      date: raw.date,
      summary: getDisplayString(raw.summary),
      details: raw.details,
      evidenceLinks: isStringArray(raw.evidenceLinks) ? raw.evidenceLinks : [],
      relatedFiles: isStringArray(raw.relatedFiles) ? raw.relatedFiles : [],
      status: isValidStatus(raw.status) ? raw.status : "active",
      createdAt: getDisplayString(raw.createdAt, migrationTimestamp),
      updatedAt: getDisplayString(raw.updatedAt, migrationTimestamp),
      ...(isNonEmptyString(raw.nextAction) && { nextAction: raw.nextAction }),
      ...(typeof raw.orderIndex === "number" && { orderIndex: raw.orderIndex }),
      ...(isNonEmptyString(raw.sourceText) && { sourceText: raw.sourceText }),
      ...(isNonEmptyString(raw.sourceExcerpt) && { sourceExcerpt: raw.sourceExcerpt }),
      ...(isValidSourceType(raw.sourceType) && raw.sourceType && { sourceType: raw.sourceType }),
      ...(raw.generatedBy === "arbor" && { generatedBy: raw.generatedBy }),
      reviewedByUser: raw.reviewedByUser === true,
      ...(isNonEmptyString(raw.appliedAt) && { appliedAt: raw.appliedAt })
    };

    // Calculate integrity hashes
    const recHash = computeRecordIntegrityHash(block);
    const contentHash = computeContentDuplicateHash(block);
    recResult.recordIntegrityHash = recHash;
    recResult.contentDuplicateHash = contentHash;

    // Source-batch IDs are global primary keys and must be deterministic before DB checks.
    const seenSourceRecord = seenSourceIds.get(block.id);
    if (seenSourceRecord) {
      if (seenSourceRecord.projectSlug !== block.projectSlug) {
        recResult.result = "Conflict — Duplicate Source ID Different Project";
        recResult.reason = `Source ID '${block.id}' is repeated under different projects.`;
        report.conflicts++;
      } else if (seenSourceRecord.recordIntegrityHash === recHash) {
        recResult.result = "Skipped — Duplicate ID in Source Batch";
        recResult.reason = `Source ID '${block.id}' is repeated with matching record integrity.`;
        report.exactIdDuplicates++;
      } else {
        recResult.result = "Conflict — Duplicate Source ID Different Content";
        recResult.reason = `Source ID '${block.id}' is repeated with different record integrity.`;
        report.conflicts++;
      }
      report.perRecordResults.push(recResult);
      continue;
    }
    seenSourceIds.set(block.id, {
      projectSlug: block.projectSlug,
      recordIntegrityHash: recHash
    });

    // Check duplicate rules (Gate T2.5)
    // 1. Exact ID check
    const existingById = findProjectDocBlockById(raw.id);
    if (existingById) {
      const existingRecHash = computeRecordIntegrityHash(existingById);
      if (existingRecHash === recHash) {
        recResult.result = "Skipped — Exact ID Exists";
        recResult.reason = `Block with ID '${raw.id}' already exists with matching record integrity.`;
        report.exactIdDuplicates++;
        report.perRecordResults.push(recResult);
        continue;
      } else {
        recResult.result = "Conflict — Same ID Different Content";
        recResult.reason = `Block with ID '${raw.id}' exists but has different integrity content.`;
        report.conflicts++;
        report.perRecordResults.push(recResult);
        continue;
      }
    }

    // 2. Project + Title + Date check
    const candidates = findDuplicateCandidates(projectId, raw.title, raw.date);
    let isDuplicateContent = false;
    let isConflictContent = false;

    for (const cand of candidates) {
      const candContentHash = computeContentDuplicateHash(cand);
      if (candContentHash === contentHash) {
        isDuplicateContent = true;
        break;
      } else {
        isConflictContent = true;
      }
    }

    if (isDuplicateContent) {
      recResult.result = "Skipped — Exact Duplicate";
      recResult.reason = "Matching title, date, and content hash exists under project.";
      report.exactContentDuplicates++;
      report.perRecordResults.push(recResult);
      continue;
    }

    if (isConflictContent) {
      recResult.result = "Conflict — Similar Metadata Different Content";
      recResult.reason = "Matching title and date exists under project but content hash differs.";
      report.conflicts++;
      report.perRecordResults.push(recResult);
      continue;
    }

    // 3. Same Content Hash under project
    const allProjectBlocks = findProjectDocBlocksByProjectId(projectId, true);
    const sameContentMatch = allProjectBlocks.find(b => computeContentDuplicateHash(b) === contentHash);
    if (sameContentMatch) {
      recResult.result = "Skipped — Exact Duplicate";
      recResult.reason = `Matching content hash exists under project under ID '${sameContentMatch.id}'.`;
      report.exactContentDuplicates++;
      report.perRecordResults.push(recResult);
      continue;
    }

    // 4. No Match -> Ready for insert
    const context: ProjectDocBlockPersistenceContext = {
      projectId,
      legacyProjectSlug: raw.projectSlug,
      importSource: IMPORT_SOURCE,
      importBatchId: batchId,
      migratedAt: migrationTimestamp,
      sourceRowNumber: sourceRow,
      sourceRecordId: raw.id
    };

    if (!isWriteMode) {
      recResult.result = "Ready to Insert";
      recResult.reason = "Validation and duplicate checks passed. Ready for database insertion.";
      report.readyToInsert++;
      report.perRecordResults.push(recResult);
    } else {
      recResult.beforeHash = recHash;
      recordsToInsert.push({ block, context, recResult });
    }
  }

  // Abort if conflicts or failures exist
  if (report.conflicts > 0 || report.failedRecords > 0) {
    report.status = isWriteMode ? "Write Execution Failed" : "Dry Run Failed — Import Blocked";
    return report;
  }

  // Step 4: Write mode execution inside a single transaction
  if (isWriteMode && recordsToInsert.length > 0) {
    try {
      const insertedResults: RecordResult[] = [];
      const executeTransaction = db.transaction(() => {
        for (const item of recordsToInsert) {
          insertProjectDocBlock(item.block, item.context);

          // Post-insert verification (Gate T2.6)
          const inserted = findProjectDocBlockById(item.block.id);
          if (!inserted) {
            throw new Error(`Verification Error: Block '${item.block.id}' not found after insertion.`);
          }
          const afterHash = computeRecordIntegrityHash(inserted);
          item.recResult.afterHash = afterHash;
          item.recResult.hashMatch = (item.recResult.beforeHash === afterHash);

          if (!item.recResult.hashMatch) {
            throw new Error(`Integrity Hash Mismatch for '${item.block.id}'! Before: ${item.recResult.beforeHash}, After: ${afterHash}`);
          }

          item.recResult.result = "Inserted";
          item.recResult.reason = "Inserted successfully into database and integrity hash verified.";
          insertedResults.push(item.recResult);
        }
      });

      executeTransaction();
      report.insertedRecords = insertedResults.length;
      report.perRecordResults.push(...insertedResults);
      report.databaseWritesPerformed = true;
      report.status = "Write Execution Passed";
    } catch (error: unknown) {
      console.error(`[Transaction Error] Import transaction failed and rolled back: ${getErrorMessage(error)}`);
      report.databaseWritesPerformed = false;
      report.status = "Write Execution Failed";
      return report;
    }
  } else if (isWriteMode) {
    report.databaseWritesPerformed = false;
    report.status = "Write Execution Passed";
  } else {
    report.databaseWritesPerformed = false;
    report.status = report.readyToInsert > 0
      ? "Dry Run Passed — Awaiting Write Approval"
      : "Dry Run Passed — No Changes Required";
  }

  return report;
}

// CLI Execution Entry Point
async function main() {
  const args = process.argv.slice(2);
  const isWrite = args.includes("--write");
  const options: ImporterOptions = { write: isWrite };

  console.log("=================================================");
  console.log(`WORKOS-LITE RECOVERY IMPORTER [Mode: ${isWrite ? "WRITE" : "DRY RUN"}]`);
  console.log("=================================================\n");

  const report = await runRecoveryImporter(options);

  console.log("--- BATCH SUMMARY ---");
  console.log(`Mode:                     ${report.mode}`);
  console.log(`Recovery File:            ${report.recoveryFile}`);
  console.log(`Recovery Hash:            ${report.recoveryHash}`);
  console.log(`Batch ID:                 ${report.batchId}`);
  console.log(`Input Record Count:       ${report.inputRecordCount}`);
  console.log(`Valid Records:            ${report.validRecords}`);
  console.log(`Invalid Records:          ${report.invalidRecords}`);
  console.log(`Ready to Insert:          ${report.readyToInsert}`);
  console.log(`Inserted Records:         ${report.insertedRecords}`);
  console.log(`Exact ID Duplicates:      ${report.exactIdDuplicates}`);
  console.log(`Exact Content Duplicates: ${report.exactContentDuplicates}`);
  console.log(`Conflicts:                ${report.conflicts}`);
  console.log(`Failed Records:           ${report.failedRecords}`);
  console.log(`Database Writes:          ${report.databaseWritesPerformed ? "Yes" : "No"}`);
  console.log(`Final Status:             ${report.status}\n`);

  console.log("--- PER-RECORD RESULTS ---");
  report.perRecordResults.forEach(r => {
    console.log(`[Row ${r.sourceRow}] ID: ${r.id}`);
    console.log(`  Project Slug:   ${r.projectSlug} -> ${r.resolvedProjectId}`);
    console.log(`  Title:          ${r.title}`);
    console.log(`  Type:           ${r.type} | Date: ${r.date}`);
    console.log(`  Integrity Hash: ${r.recordIntegrityHash}`);
    console.log(`  Content Hash:   ${r.contentDuplicateHash}`);
    console.log(`  Result:         ${r.result}`);
    console.log(`  Reason:         ${r.reason}`);
    if (r.beforeHash) {
      console.log(`  Hash Match:     ${r.hashMatch ? "YES" : "NO"} (Before: ${r.beforeHash}, After: ${r.afterHash})`);
    }
    console.log("");
  });

  if (report.status.includes("Failed") || report.conflicts > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

// Only execute CLI if run directly
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith("import-recovery-blocks.ts")) {
  main().catch(err => {
    console.error("Unhandled exception:", err);
    process.exit(1);
  });
}
