# WorkOS Sheet Dry-Run — Gate 3 Specification (v1)

## 1. Architecture

Gate 3 assembles a deterministic, read-only dry-run layer on top of the Gate 2 parser:

```text
workbook bytes
  → Gate 2 parser (parseWorkOSProjectFieldWorkbook)
  → read-only SQLite adapter (never @/db/db)
  → exact project slug resolution
  → Project Documentation classifier
  → Backlog classifier
  → dry-run summary + deterministic dry-run ID
```

The dry-run layer reads the database only. It never inserts, updates, archives, unarchives, deletes, creates projects, creates import batches, persists dry runs, or writes approval records.

---

## 2. Service Entry Point

```ts
type RunWorkOSProjectFieldDryRunInput = {
  workbook: Buffer
  sourceFilename?: string
}

async function runWorkOSProjectFieldDryRun(
  input: RunWorkOSProjectFieldDryRunInput,
  options?: { db?: Database }
): Promise<WorkOSProjectFieldDryRunResult>
```

`options.db` is used by tests with an isolated in-memory database. At runtime the service opens `data/workos.db` with a truly read-only better-sqlite3 connection.

---

## 3. Result Contract

Top-level result: `dryRunId`, `generatedAt`, `fileHash`, `sourceFilename`, `schemaVersion`, `metadata`, `workbookStatus` (`valid`/`valid_with_warnings`/`invalid`), `entities`, `workbookIssues`, `totals`, `noWritePerformed: true`.

Entity result: `entityType`, `sheetName`, `status` (`ready`/`ready_with_warnings`/`blocked`), row counts, `rows`, `issues`.

Row result: `entityType`, `sheetName`, `sourceRowNumber`, `externalRowId`, `projectSlug`, `projectId`, `parserStatus`, `dryRunStatus`, `proposedOperation`, `normalizedData`, `existingRecordReference`, `issues`.

Stable status vocabulary:

- `parserStatus`: `valid`, `valid_with_warnings`, `invalid`, `skipped`
- `dryRunStatus`: `new`, `duplicate`, `conflict`, `review_required`, `invalid`, `skipped`
- `proposedOperation`: `insert`, `none`, `manual_review`

---

## 4. Dry-Run ID

`dryRunId` is a SHA-256 over `DRY_RUN_CONTRACT_VERSION : fileHash : schemaVersion : workbookId`.

- deterministic for identical workbook bytes and contract version
- independent of `generatedAt`
- changes when workbook bytes change
- suitable for future approval binding

---

## 5. Project Resolution

- exact, case-sensitive `project_slug` lookup (`WHERE slug = ?`)
- trim surrounding whitespace only; case preserved
- no fuzzy matching, no title/ID fallback, no implicit project creation
- unknown slug → row `invalid` (`PROJECT_NOT_FOUND`)
- blank slug → parser-level `invalid` (and `PROJECT_SLUG_REQUIRED` if reached at dry-run layer)
- multiple matches → row `invalid` + `PROJECT_RESOLUTION_AMBIGUOUS` + `DATABASE_INTEGRITY_ANOMALY`

---

## 6. Project Documentation Classification

Identity baseline: `(project_id, source_record_id)`. Content comparison uses the existing canonical `computeContentDuplicateHash`.

| Existing state | Incoming content | Result |
| --- | --- | --- |
| no identity match, no content match | — | `new` / `insert` |
| active identity match | identical content | `duplicate` / `none` |
| active identity match | different content | `conflict` / `manual_review` |
| archived identity match | any | `review_required` / `manual_review` |
| active record with same content, different external id | — | `review_required` / `manual_review` |
| same title + date, different content (candidate) | — | `new` / `insert` + warning `SIMILAR_IDENTITY_CANDIDATE` |
| parser-invalid row | — | `invalid` / `none` |

No update, unarchive, or recreate happens automatically.

---

## 7. Backlog Classification

`project_items` has no provenance columns in v1 (schema unchanged).

- exact-content comparison on stable user fields: `project_id`, `title`, `status`, `priority`, `schedule_bucket`, `start_date`, `end_date`, `is_milestone`, `workstream`, `dod_text`, `notes` (normalized consistently on both sides)
- exact match → `duplicate` / `none`
- no exact match → `new` / `insert`
- similar but non-identical → `new` (no fuzzy matching)
- `conflict` is not invented without a source-backed identity in v1
- repeated `external_row_id` within a workbook → parser error `DUPLICATE_EXTERNAL_ROW_ID` → row `invalid`
- cross-import identity comparison is deferred until the audit foundation exists

---

## 8. Issue Vocabulary Additions

| Code | Severity | Scope | Effect |
| --- | --- | --- | --- |
| `PROJECT_NOT_FOUND` | error | row | row invalid |
| `PROJECT_RESOLUTION_AMBIGUOUS` | error | row | row invalid |
| `PROJECT_SLUG_REQUIRED` | error | row | row invalid |
| `EXISTING_IDENTITY_DUPLICATE` | info | row | row duplicate, non-blocking |
| `EXISTING_IDENTITY_CONFLICT` | warning | row | row conflict, manual review |
| `ARCHIVED_IDENTITY_MATCH` | warning | row | row review_required |
| `CONTENT_DUPLICATE_DIFFERENT_EXTERNAL_ID` | warning | row | row review_required |
| `BACKLOG_EXACT_DUPLICATE` | info | row | row duplicate, non-blocking |
| `DATABASE_READ_FAILED` | error | workbook/row | entity blocked |
| `DATABASE_INTEGRITY_ANOMALY` | error | row | row review_required / invalid |
| `DRY_RUN_ENTITY_BLOCKED` | error | workbook | entity blocked |
| `SIMILAR_IDENTITY_CANDIDATE` | warning | row | row stays new, flagged |

---

## 9. Blocking Policy

- **Workbook blocked**: cannot parse, unsupported schema version, required sheet missing, file/workbook safety failure (macro, external link, file type/size, hidden/unknown sheet).
- **Entity blocked**: required sheet structure invalid (headers, merged cells, row limit), database read failure, or workbook-level block affecting that entity.
- **Row blocked**: parser row invalid, project not found, ambiguous resolution, invalid normalized data.
- `duplicate`/`conflict`/`review_required` never block other rows or entities.
- No import is performed.

---

## 10. Summary Invariants

Totals are derived from the row results and entity physical/candidate counts:

- `totalPhysicalRows` = entity `totalRows` (sum)
- `totalCandidateRows` = row result count (sum)
- `skippedRows` = physical − candidate
- `new + duplicate + conflict + review_required + invalid + skipped` = row count

Invariant tests (`dryRunInvariantViolations`) guard against count drift.

---

## 11. Read-Only Database Boundary

The dry-run layer must **not** import `@/db/db`: its module-level initialization runs schema ensures (`ALTER TABLE`/`CREATE TABLE`), which would mutate the database during a "dry run".

Instead:

- runtime opens `data/workos.db` via better-sqlite3 `{ readonly: true, fileMustExist: true }`
- tests inject an isolated in-memory database
- only SELECT queries are issued through a narrow adapter (`DryRunReadAdapter`)
- canonical content hashing is reused from `hashing.ts`; row mapping from `mappers.ts` (neither touches the database)

---

## 12. No-Write Guarantee

Static: dry-run modules contain no `INSERT INTO`, `UPDATE`, `DELETE FROM`, `CREATE TABLE`, or `ALTER TABLE`; they never import `@/db/db`, API routes, or write services.

Runtime (tests): business row counts and representative records unchanged; no audit tables created; fixture workbook bytes unchanged; readonly connection rejects writes (`SQLITE_READONLY`) and file size/mtime are unchanged.

---

## 13. Known Limitations

- Backlog cross-import idempotency is not guaranteed until the audit foundation exists.
- Backlog `conflict` classification is intentionally absent in v1 (no persisted identity).
- "Similar title/date" detection is advisory (warning) and uses exact title+date matching only.
- Database-level concurrency (`expectedUpdatedAt` style) is not exercised in a dry run.

---

## 14. Deferred Behavior

Approval records, dry-run persistence, import audit tables, and actual writes remain outside Gate 3 and belong to later Gates.
