# WorkOS Sheet Parser & Normalization — Gate 2 Specification (v1)

## 1. Purpose & Scope

This document specifies the safe spreadsheet parsing and normalization layer for the WorkOS Project Field Sheet v1. The layer proves that a workbook can be loaded safely, structurally validated, parsed into canonical raw rows, normalized into typed import candidates, and classified **without writing to the database**.

Gate 2 does not:

- write Project Documentation or Backlog rows
- create import audit tables
- resolve project slugs against the database
- run database duplicate checks
- approve imports or persist dry runs
- create upload UI or API routes

---

## 2. Chosen Parser Library

**Selected: `exceljs@4.4.0`**

**Rejected: `xlsx` (SheetJS)**

| Criterion | `exceljs` 4.4.0 | `xlsx` (npm 0.18.5) |
| --- | --- | --- |
| Node 20 compatibility | ✅ | ✅ |
| Server-side `.xlsx` parsing | ✅ `xlsx.load(Buffer)` | ✅ |
| Formula detection | ✅ `cell.value.formula` | partial |
| Hidden row/sheet detection | ✅ `row.hidden`, `worksheet.state` | partial (sheet only) |
| Merged cell inspection | ✅ `worksheet.model.merges` | partial |
| Cell type preservation (dates, booleans, numbers) | ✅ | ✅ |
| Date handling | ✅ Date objects, UTC extraction | ✅ |
| Maintenance state | Active, regular releases | npm package stale (CE 0.18.5) |
| Security posture | 1 moderate advisory via `uuid` (documented) | Critical advisories, no npm fix |
| TypeScript support | ✅ bundled types | ✅ (community types) |
| Repository build/test fit | ✅ | ✅ |

**Known limitation:** exceljs 4.4.0 carries one moderate advisory transitively through `uuid`; the practical exposure for this parser is low because we only parse in-memory buffers (no archiving/uuid usage). See the Gate 2 QA report for the full audit context.

---

## 3. Module Architecture

```text
src/lib/project-import/
  constants.ts                        canonical headers, enums, limits, sheet names
  types.ts                            canonical result/issue/row types
  validationIssues.ts                 issue factory + stable issue code registry
  normalize.ts                        shared date/boolean/integer/list helpers
  metadataParser.ts                   00_Metadata normalization
  projectDocumentationNormalizer.ts   01_Project_Documentation row normalization
  backlogNormalizer.ts                02_Backlog row normalization
  workbookParser.ts                   entry point + file/sheet/structure validation
```

Fixtures and tests:

```text
tests/fixtures/projectFieldSheetFixtures.ts   deterministic in-memory fixture generator
tests/unit/projectImportParser.test.ts        parser/normalizer test matrix
tests/unit/projectImportNoWrite.test.ts       no-write guarantee tests
```

---

## 4. Entry Point & Parser Boundary

```ts
parseWorkOSProjectFieldWorkbook(input: Buffer, options?: ParserOptions): Promise<WorkbookParseResult>
```

The parser:

- accepts workbook bytes only (Buffer)
- is deterministic for identical input bytes (stable SHA-256 file hash)
- does not access SQLite, resolve projects, call repository write functions, call API routes, create import batches, approve imports, or mutate uploaded files
- does not write temporary files

`ParserOptions` supports testable overrides: `rowLimit` (default 5,000) and `detailsMaxBytes` (default 200 KB).

---

## 5. Result Types

```ts
type WorkbookParseResult = {
  ok: boolean
  fileHash: string
  schemaVersion: string | null
  metadata: ParsedWorkbookMetadata | null
  sheets: {
    projectDocumentation: ParsedEntitySheetResult
    backlog: ParsedEntitySheetResult
  }
  workbookIssues: ImportValidationIssue[]
  noWritePerformed: true
}
```

Each sheet result exposes `totalPhysicalRows`, `totalCandidateRows`, `blankRowsSkipped`, normalized `rows`, and sheet-level `issues`. Each normalized row retains entity type, worksheet name, source row number, external row ID, project slug, normalized data, raw cell values, row issues, and a classification.

---

## 6. Issue Codes & Severities

| Code | Severity | Scope |
| --- | --- | --- |
| `UNSUPPORTED_FILE_TYPE` | error | file |
| `FILE_TOO_LARGE` | error | file |
| `WORKBOOK_OPEN_FAILED` | error | file |
| `MACRO_WORKBOOK` | error | file |
| `EXTERNAL_LINK` | error | file |
| `UNSUPPORTED_SCHEMA_VERSION` | error | workbook |
| `MISSING_REQUIRED_SHEET` | error | workbook |
| `UNKNOWN_WORKSHEET` | error | workbook |
| `HIDDEN_WORKSHEET` | error | workbook |
| `METADATA_PLACEHOLDER_VALUE` | error | workbook |
| `HIDDEN_DATA_ROW` | error | row |
| `MERGED_CELL_IN_DATA_RANGE` | error | sheet |
| `FORMULA_IN_DATA_ROW` | error | row |
| `DUPLICATE_HEADER` | error | sheet |
| `UNKNOWN_HEADER` | error | sheet |
| `MISSING_REQUIRED_HEADER` | error | sheet |
| `SAMPLE_ROW_PRESENT` | error | row |
| `EMPTY_REQUIRED_FIELD` | error | row/workbook |
| `INVALID_ENUM` | error | cell |
| `INVALID_DATE` | error | cell |
| `INVALID_DATE_RANGE` | error | cell |
| `INVALID_BOOLEAN` | error | cell |
| `INVALID_INTEGER` | error | cell |
| `DUPLICATE_EXTERNAL_ROW_ID` | error | row |
| `ROW_LIMIT_EXCEEDED` | error | sheet |
| `CELL_SIZE_EXCEEDED` | error | cell |
| `DUPLICATE_LIST_ITEM` | info | cell |

Any `error` makes the workbook result `ok: false`. `warning` is reserved for future non-blocking policies. `info` records non-blocking normalization facts.

---

## 7. Workbook Safety Rules

- Only `.xlsx` (zip signature) accepted; macro-enabled workbooks (`xl/vbaProject.bin`) rejected; external workbook links (`xl/externalLinks/`) rejected.
- Maximum file size: 25 MB (matches `uploadRules.ts`).
- Required sheets exactly: `00_Metadata`, `01_Project_Documentation`, `02_Backlog`. Missing required sheet → error; unknown extra sheet → error; hidden required or unknown sheet → error.
- Header row = 5, description row = 6, data start row = 7. English canonical headers only; duplicate/unknown/missing headers → error.
- Merged cells are valid only in the approved display ranges (`00_Metadata!A1:F1`, `00_Metadata!A14:F14`, data-tab rows 1–3); any merge in rows 5+ → error.
- Formulas in data rows → error (cached values are still surfaced for diagnostics).
- Hidden data rows → error; blank rows → skipped silently.

### Policy deltas vs Gate 1 (documented)

Gate 1 defaulted some checks to warnings (`unknown sheet`, `unknown header`, `formula`, `hidden row`). Gate 2 deliberately tightens these to errors per the Gate 2 owner brief (fail-fast importer v1). The template contract itself is unchanged.

---

## 8. Metadata Normalization

Keys read from `00_Metadata`: `schema_version`, `workbook_id`, `batch_reference`, `source_system`, `export_timestamp`, `timezone`, `prepared_by`, `notes`.

- `schema_version` must equal `workos-field-sheet-v1`.
- Required: `workbook_id`, `batch_reference`, `source_system` (`google_sheet` | `manual`), `export_timestamp` (valid ISO 8601), `timezone`.
- Optional: `prepared_by`, `notes` (blank → `null`, exact content preserved).
- Placeholder values (containing `<`/`>` or matching `<...>`) → `METADATA_PLACEHOLDER_VALUE` error. Missing metadata is never silently invented.

---

## 9. Common Normalization Rules

- **Strings**: trim outer whitespace; preserve internal/multiline whitespace; blank → `null` for optional fields; blank required field → error. Identity/enum casing is preserved (no auto-lowercase).
- **Project slug**: trim, preserve case; no lowercasing. Database resolution remains exact and case-sensitive in a later Gate.
- **External row ID**: trim; blank → error; `EXAMPLE-DO-NOT-IMPORT` → `SAMPLE_ROW_PRESENT`; duplicate within the same entity worksheet → error; never auto-generated.
- **Dates**: accept Excel date cells (extracted via UTC getters) and canonical text `YYYY-MM-DD`; reject timestamps, locale dates, ambiguous numbers, and invalid calendar dates.
- **Booleans**: accept real boolean cells and text `TRUE`/`FALSE` (case-insensitive); reject yes/no, 1/0, Thai alternatives, and arbitrary truthy values.
- **Integers**: accept integer cells and canonical integer text; reject decimals, formula results, and negatives where prohibited (`order_index` and `priority` are non-negative in v1).
- **Multiline lists** (`evidence_links`, `related_files`): split by line break, trim items, drop empty lines, preserve commas inside items, deduplicate exact repeats preserving order with an `info` issue.

---

## 10. Project Documentation Contract

Canonical fields: `external_row_id`, `project_slug`, `block_type`, `title`, `date`, `summary`, `details`, `evidence_links`, `related_files`, `next_action`, `status`, `order_index`, `source_type`, `reviewed_by_user`.

Required: `external_row_id`, `project_slug`, `block_type`, `title`, `date`, `summary`, `details`.

Enums (source-backed): `block_type` (9), `status` (`active`/`archived`), `source_type` (6).

Defaults:

- blank `status` → `active`
- blank `reviewed_by_user` → `false`
- blank `order_index`, `next_action`, `source_type`, links → `null`/empty (no invented values)
- `source_type` is **not** defaulted to `google_sheet`; `google_sheet` remains the future `import_source`

Limits: `details` ≤ 200 KB (UTF-8 bytes). No other source-defined length limits exist, so none are invented.

---

## 11. Backlog Contract

Canonical fields: `external_row_id`, `project_slug`, `title`, `status`, `priority`, `schedule_bucket`, `start_date`, `end_date`, `is_milestone`, `workstream`, `dod_text`, `notes`.

Required: `external_row_id`, `project_slug`, `title`, `status`.

Enums: `status` (`inbox`/`planned`/`done` only — wider UI statuses rejected), `schedule_bucket` (`none`/`morning`/`afternoon`/`evening`), `is_milestone` (`TRUE`/`FALSE`).

Rules: blank optional → `null`; `start_date` after `end_date` → error; `priority` follows the `project_items` integer contract; no provenance is embedded into `notes`; no database ID is generated in Gate 2.

---

## 12. Row Classification

Vocabulary: `valid`, `valid_with_warnings`, `invalid`, `skipped`.

- any `error` → `invalid`
- warnings without errors → `valid_with_warnings`
- otherwise → `valid`
- blank rows → `skipped` (counted as `blankRowsSkipped`, not candidate rows)

Gate 2 classifies syntax and normalization only. Database-level statuses (`new`, `duplicate`, `conflict`, `review_required`) are deferred to a later Gate that resolves projects and inspects the database.

---

## 13. Limits

- Maximum workbook size: 25 MB
- Maximum candidate rows per worksheet: 5,000
- Maximum `details` cell size: 200 KB
- No other source-defined limits; absent limits are documented, not invented

---

## 14. Known Limitations

- `exceljs` does not emit `row hidden` on write; hidden-row fixtures are produced by XML post-processing, and hidden rows in real files are detected by the reader.
- External links are detected at the zip-part level; exceljs itself does not surface them.
- Formula cells are rejected; cached values are only used for diagnostics.
- Hidden columns are not yet inspected (out of scope for v1).

---

## 15. Deferred Database Validation

Project resolution, database duplicate/conflict checks, archived-record handling, import batches, and approval are explicitly out of scope for Gate 2 and are owned by later Gates.

---

## 16. No-Write Guarantee

The parser:

- never imports the database module, repository, or API layer
- never opens `data/workos.db`
- never creates import batch rows or mutates fixture files
- always returns `noWritePerformed: true`

Tests assert the static dependency boundary and runtime behavior.

---

## 17. Future Gate Dependencies

- Gate 3: validation and dry-run result assembly using this parser's output
- Gate 4: import audit foundation
- Gate 5/6: entity-specific write adapters (insert-only, `expectedUpdatedAt`-compatible where applicable)
- Gate 7: UI review/approval flow
