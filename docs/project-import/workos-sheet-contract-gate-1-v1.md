# WorkOS Sheet Contract — Gate 1 Contract Approval & Importer Readiness (v1)

## 1. Purpose & Scope

This document locks the design decisions required before any WorkOS Project Field Sheet importer implementation begins. It covers both import flows:

1. **Project Documentation** → `project_doc_blocks`
2. **Backlog / Deliverables** → `project_items`

This is a contract and readiness gate only. No importer, API route, UI, schema change, migration, or dependency is created here.

---

## 2. Baseline

- Template v1 approved and merged (PR #27, source commit `1ca16be`, merge commit `0ab471b`).
- Template sheets: `00_Metadata`, `01_Project_Documentation`, `02_Backlog`.
- Schema version: `workos-field-sheet-v1`.
- Backlog statuses supported by DB/API: `inbox`, `planned`, `done` only.

---

## 3. Source Contracts Inspected

Decisions below are based on direct inspection of current `main` source:

| Source | What was verified |
| --- | --- |
| `src/lib/project-doc-blocks/validation.ts` | block types (9), source types (6), import sources (incl. `google_sheet`), statuses (`active`/`archived`), date rule |
| `src/lib/project-doc-blocks/repository.ts` | `resolveProjectId`, `findDuplicateCandidates`, `createProjectDocBlock`, `insertProjectDocBlock`, update/archive/restore, immutable handling |
| `src/lib/project-doc-blocks/mappers.ts` / `hashing.ts` | field mapping, `computeContentDuplicateHash`, `computeRecordIntegrityHash` |
| `src/db/db.ts` + `src/db/schema.sql` | `project_doc_blocks` DDL (import_source CHECK incl. `google_sheet`, `source_record_id`, `source_row_number`, `import_batch_id`), `project_items` DDL (status CHECK 3 values, schedule_bucket CHECK 4 values), `projects.slug` UNIQUE |
| Project Documentation API routes | GET/POST/PATCH/archive/restore, `expectedUpdatedAt` concurrency, immutable field rejection |
| Project Items API routes | `zod` enums: status 3, schedule_bucket 4; PUT/DELETE semantics |
| `src/lib/uploadRules.ts` | existing upload contract: `MAX_UPLOAD_BYTES = 25MB`, `.xlsx` already allowed |
| `src/app/api/import` / `planner-import` / `scripts/import-recovery-blocks.ts` | existing import patterns: preview/execute, fingerprint, batch audit, dry-run, transactional rollback |
| `docs/project-import/` | Template v1 spec + QA |

---

## 4. Decision 1 — Import Mode

| Rule | Status | Note |
| --- | --- | --- |
| Dry run required before write | **Approved** | Preview is mandatory; no write path without preview. |
| Human approval required before write | **Approved** | Mirrors planner-import `confirmed = true` contract. |
| Insert-only by default | **Approved** | No automatic update in v1. |
| No automatic overwrite | **Approved** | Existing records are never overwritten silently. |
| No automatic delete | **Approved** | Importer never deletes rows. |
| No automatic project creation | **Approved** | Unknown slug fails validation; project creation stays on the separate admin path. |

---

## 5. Decision 2 — Duplicate Detection Policy

### Project Documentation

Identity key: `(project_id, source_record_id)` where `source_record_id` = sheet `external_row_id`.

| Condition | Outcome |
| --- | --- |
| No matching `source_record_id`; no content match | **New** |
| Same `source_record_id`; same content hash | **Duplicate** (skipped) |
| Same `source_record_id`; different content hash | **Conflict** (blocks entity batch) |
| No `source_record_id` match; same title + date + block_type; identical content hash | **Duplicate** (skipped) |
| Same title + date + block_type; different content hash | **Conflict** (review required; blocks batch) |
| Matching `source_record_id` exists with `status = archived`, incoming `active` | **Review Required** (row blocked; batch can proceed for other rows) |
| Invalid/blank required field | **Invalid** (blocks batch) |

Reuses the existing recovery-importer semantics (`computeContentDuplicateHash`, `findDuplicateCandidates`).

### Backlog

`project_items` has no provenance columns, so identity is defined in two layers:

1. **Within workbook**: duplicate `external_row_id` per `(project, sheet)` → **Invalid** (error).
2. **Against database + audit**: normalized content match `(project_id, normalized title, start_date)` against existing `project_items` → **Duplicate**; cross-batch repeats detected via audit record lookup by `(workbook_id, sheet_name, external_row_id)` → **Duplicate**.
3. Same logical row with different content → **Conflict** (blocks entity batch).

| Condition | Outcome |
| --- | --- |
| No match in DB or audit; no within-batch duplicate | **New** |
| Matches existing `project_items` content (title+date normalized) | **Duplicate** (skipped) |
| Audit shows same `(workbook_id, sheet, external_row_id)` | **Duplicate** (skipped) |
| Same external identity, different content | **Conflict** (blocks entity batch) |
| Invalid/blank required field | **Invalid** (blocks batch) |

---

## 6. Decision 3 — Provenance Contract

| Field | Required | Existing storage | Missing capability | Proposed future storage |
| --- | --- | --- | --- | --- |
| workbook_id | Required | None | No column | Import audit table (`import_batches`) |
| batch_reference | Required | None | No column | Import audit table |
| schema_version | Required | None | No column | Import audit table |
| source_system | Required | `project_doc_blocks.import_source` (values incl. `google_sheet`) | Backlog has none | Import audit table + doc-blocks `import_source` |
| source_filename | Required | None | No column | Import audit table |
| source_file_hash | Required | None | No column | Import audit table |
| worksheet_name | Required | None | No column | Import audit table (future: optional column) |
| external_row_id | Required | `project_doc_blocks.source_record_id` / `source_row_number` | Backlog has none | Doc-blocks: existing columns; Backlog: audit per-row result |
| import_timestamp | Required | `project_doc_blocks.created_at`/`migrated_at` | Backlog has none | Import audit table |
| importer_version | Required | None | No column | Import audit table |
| dry_run_id | Required | None | No column | Import audit table |
| approval_reference | Required | None | No column | Import audit table |

**Decision**: v1 provenance is persisted in a new generic `import_batches` audit table (created during importer implementation, not now) plus per-row results. Doc-blocks additionally reuse existing columns (`import_source`, `import_batch_id`, `source_record_id`, `source_row_number`). No schema change is made in this gate.

---

## 7. Decision 4 — Project Resolution

- Resolve only by exact `project_slug`.
- **Case-sensitive** — justified by current source: `projects.slug` is `TEXT NOT NULL UNIQUE`, and all resolvers (`resolveProjectId`, items routes, planner-import preview) use `WHERE slug = ?` with SQLite's default BINARY collation (case-sensitive exact match).
- Unknown slug → `error` (Failed Validation). No fuzzy matching, no implicit project creation, no silent fallback to title or ID.

---

## 8. Decision 5 — Validation Severity Model

Severity vocabulary: `error` (blocks entity batch), `warning` (row processed, flagged), `info` (no action), plus per-row outcomes: `new`, `duplicate`, `conflict`, `invalid`, `skipped`, `review_required`.

| Case | Severity |
| --- | --- |
| Missing required field | error |
| Unknown project | error |
| Invalid enum | error |
| Invalid date | error |
| Duplicate external row ID inside workbook | error |
| Duplicate record already in database | per-row outcome `duplicate` (row skipped, batch proceeds) |
| Optional field blank | info |
| Archived target record | per-row outcome `review_required` (warning-level, row blocked) |
| Unsupported schema version | error (file-level abort) |
| Sample row still present (`EXAMPLE-DO-NOT-IMPORT`) | error (file-level abort) |
| Formula in data row | warning (cached value used) |
| Hidden row | warning (row skipped) |
| Extra unknown worksheet | warning (worksheet ignored) |
| Extra unknown column | warning (column ignored) |

---

## 9. Decision 6 — Dry-Run Result Contract

Required structure:

```text
workbook metadata   (schema_version, workbook_id, batch_reference, source_system,
                     export_timestamp, timezone, prepared_by, notes)
parser result       (detected sheets, header rows, warnings)
sheet summary       (per sheet: totals)
total rows / valid rows / new rows / duplicate rows / conflict rows /
invalid rows / skipped rows / warnings / errors
per-row result      (sheet, row_number, external_row_id, entity_type, project_slug,
                     status, errors[], warnings[], normalized_values,
                     proposed_database_operation, existing_record_reference,
                     conflict_details)
no-write confirmation (explicit flag; dry run never writes)
```

Stable per-row status vocabulary: `new`, `duplicate`, `conflict`, `invalid`, `skipped`, `review_required`.

---

## 10. Decision 7 — Approval Gate

| Question | Decision |
| --- | --- |
| Who/what can approve | Human owner via UI only (no API-only approval) |
| Approval tied to file hash | Yes |
| File modification invalidates approval | Yes |
| Second dry run required after modification | Yes |
| Approval expires | Yes — **30 minutes** (owner-approved) |
| One approval covers both sheets | No — one approval per entity batch (Project Documentation and Backlog approved separately) |
| Partial import allowed | Per entity batch only (all-or-nothing per entity); no row-level partial in v1 |
| Rows with warnings may be imported | Yes — warnings are non-blocking and recorded |
| Errors block the whole batch | Yes — any `error` blocks the affected entity batch |

---

## 11. Decision 8 — Transaction & Failure Policy

Recommended baseline for importer v1:

- **One transaction per worksheet (entity)** with full rollback per entity.
- A workbook import runs two sequential entity batches (Project Documentation, then Backlog).
- Errors abort the affected entity batch entirely; the other entity batch remains independent.
- Retry = new dry run; stable keys + audit records make retries idempotent (duplicates are skipped, never re-inserted).
- Partial success across entities is allowed and clearly reported.

Trade-off: per-entity atomicity is simpler to audit and avoids a single row invalidating an entire unrelated entity; whole-workbook atomicity is rejected because it couples the two flows and complicates partial re-imports.

---

## 12. Decision 9 — Insert vs Update Policy

- Importer v1 remains **insert-only**.
- Existing `external_row_id`:
  - Doc-blocks: same content → `duplicate`; different content → `conflict` (batch blocked).
  - Backlog: audit/DB match → `duplicate`; different content → `conflict`.
- Archived records (doc-blocks) are **not silently recreated**: incoming `active` on an archived `source_record_id` → `review_required` (owner decides; default is reject).
- Update support is **deferred to importer v2**.
- Contract changes required for updates (future): unique index on `(project_id, source_record_id)` for doc-blocks, provenance columns or audit linkage for backlog, an explicit `update_mode` with row diffing, and reuse of `expectedUpdatedAt`-style concurrency.

---

## 13. Decision 10 — Workbook Safety Rules

| Item | Locked rule |
| --- | --- |
| Required sheet names | Exactly `00_Metadata`, `01_Project_Documentation`, `02_Backlog`; missing required tab → error |
| Unknown sheets | warning + ignored |
| Hidden sheets | error (rejected) |
| Hidden rows | warning + skipped |
| Merged cells in data range (rows 5+) | error |
| Formulas | warning + cached value used (no formula evaluation) |
| Macros | error (rejected) |
| External links | warning + ignored (parser capability limitation) |
| Blank rows | skipped silently (info) |
| Trailing formatted rows | skipped (info) |
| Duplicate headers | error |
| Unknown headers | warning + ignored |
| Thai description row (row 6) | ignored by contract (never parsed as headers) |
| Sample rows (`EXAMPLE-DO-NOT-IMPORT`) | error (file-level abort) |
| Maximum file size | **25 MB** (existing `MAX_UPLOAD_BYTES`) |
| Maximum row count | **5,000 data rows per worksheet** (owner-approved; over-limit → error, no parse/write) |
| Multiline text | Supported (details/dod_text/notes) |
| Long cell values | **details ≤ 200 KB per cell** (owner-approved); other text-field limits defined during implementation; over-limit → error; never silently truncated |

---

## 14. Decision 11 — Parsing Library Readiness

Findings from current repository:

- No spreadsheet parser in `package.json` dependencies or `node_modules` (`xlsx`, `exceljs`, sheetjs — none).
- Node runtime: `v20.20.0`; Next.js `16.1.1`.
- `openpyxl` exists only in the system Python environment (used by the AVAONE CLI tooling, not a server runtime dependency).
- Server-side file handling: `.workos-lite/uploads/` pattern exists and is git-ignored; `uploadRules.ts` already permits `.xlsx` up to 25 MB.
- **Approved rule (owner decision)**: importer implementation may add **one** spreadsheet parsing dependency. The exact library is a **Gate 2 technical decision** — not an owner blocker. Gate 2 must compare candidates on server-side compatibility, security, maintenance, workbook feature handling, and repository fit. No dependency is installed during this gate or this reconciliation.
- **Conclusion**: a JavaScript spreadsheet parsing dependency will be required for server-side import; none is installed in this gate.

---

## 15. Decision 12 — Existing API and Repository Reuse

Recommended boundary:

- Future imports write through a **dedicated import service** that wraps existing repository functions — never direct ad-hoc DB writes that bypass validation.
- Project Documentation writes reuse `repository.createProjectDocBlock` / `insertProjectDocBlock` so immutable and provenance fields are handled consistently.
- Backlog writes go through a new entity adapter that respects the existing zod enums and `project_items` CHECK constraints.
- API routes stay thin orchestrators (preview/approve/status); validation and persistence live in the service/entity layer.
- Immutable and audit-sensitive fields must not be bypassed accidentally; `expectedUpdatedAt` concurrency semantics are reused where updates are supported (v2).

---

## 16. Decision 13 — Security & Operational Risks

| Risk | Mitigation (v1) |
| --- | --- |
| Spreadsheet formula injection | Formulas treated as data only; no evaluation; cached values read |
| Malformed files | Parse errors → file-level `error`, no write |
| Oversized uploads | 25 MB cap (existing upload rules) |
| Unexpected cell types | Normalization layer coerces to expected types or marks `invalid` |
| Path traversal / unsafe filenames | Server-generated upload IDs (existing `.workos-lite/uploads` pattern); never trust user filename for storage paths |
| Duplicate import | Stable keys + audit lookup; duplicates skipped |
| Partial write | Per-entity transaction with rollback; clear result |
| Unauthorized approval | Human-only approval via UI; no API-only approval |
| Stale approval | Approval tied to file hash + expiry; re-dry-run after modification |
| Sensitive content in logs | Log counts and IDs, never cell content |
| Temporary upload retention | Temp files cleaned after import per policy (retention value deferred to implementation) |
| Error-message data exposure | Generic errors; no SQL/stack details in responses |

---

## 17. Decision 14 — Gate 1 Decision Table

| Decision Area | Status | Approved Rule | Deferred Work | Blocking Importer Implementation |
| --- | --- | --- | --- | --- |
| Import mode | Approved | Dry run + human approval + insert-only + no overwrite/delete/create | — | No |
| Duplicate detection — doc-blocks | Approved | `(project_id, source_record_id)` identity + content hash; conflict blocks batch | — | No |
| Duplicate detection — backlog | Approved | Audit-table-only provenance + content match; no provenance column in `project_items`; no notes embedding | Future provenance columns considered in a later version | No |
| Provenance contract | Approved | New generic `import_batches` audit table at implementation time; no `project_items` schema change in v1 | Optional future columns | No |
| Project resolution | Approved | Exact case-sensitive `project_slug`; unknown → error | — | No |
| Validation severity | Approved | error/warning/info + per-row outcomes | — | No |
| Dry-run contract | Approved | Structure and status vocabulary locked | — | No |
| Approval gate | Approved | Human UI approval; per-entity; bound to file hash + schema version + dry-run ID + entity worksheet; 30 min TTL | — | No |
| Transaction policy | Approved | Per-entity transaction + rollback | — | No |
| Insert vs update | Approved | Insert-only v1; update deferred to v2 | Update mode + schema for updates (v2) | No |
| Workbook safety | Approved | Rules locked; 25 MB cap; 5,000 rows/worksheet; details ≤ 200 KB | Other text-field limits set during implementation | No |
| Parsing library | Approved with technical selection deferred to Gate 2 | One dependency allowed; library chosen by Gate 2 technical comparison | Gate 2 library selection + dependency approval evidence | No |
| API/repo reuse | Approved | Dedicated import service wrapping repository | — | No |
| Security & operations | Approved | Mitigations locked | Temp retention value | No |

---

## 18. Approved Owner Decisions

All six blocking decisions were reviewed and approved by the owner:

1. **Parsing library** — one spreadsheet parsing dependency allowed; exact library is a Gate 2 technical decision (server-side compatibility, security, maintenance, workbook feature handling, repository fit).
2. **Approval TTL & scope** — 30 minutes; approval bound to file hash, schema version, dry-run ID, and entity worksheet; any file modification invalidates approval; new dry run required; Project Documentation and Backlog approvals are independent.
3. **Operational limits** — max 5,000 data rows per worksheet; `details` max 200 KB per cell; other text limits defined during implementation; over-limit → error; no silent truncation.
4. **Backlog provenance** — audit-table-only for importer v1; no `project_items` provenance columns; no provenance embedded in user-facing `notes`; audit preserves batch, worksheet, external row ID, target item ID, file hash, import timestamp, dry-run and approval references.
5. **Archived Project Documentation records** — existing archived identity matches → `review_required`; no auto-recreate, no auto-unarchive, no overwrite/update in v1; restore and replacement workflows deferred.
6. **Update support** — importer v1 insert-only; same identity + same content → `duplicate`; same identity + different content → `conflict`; no overwrite/update/delete/unarchive; update mode deferred to importer v2 with a dedicated contract.

---

## 19. Gate Outcome

**Gate 1 Passed / Importer Design Ready**

No unresolved owner blockers remain. Spreadsheet library selection is assigned to Gate 2 as a technical task.
