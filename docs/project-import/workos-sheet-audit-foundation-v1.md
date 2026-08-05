# WorkOS Sheet — Audit Foundation Design (Gate 4A, v1)

## 1. Purpose & Scope

This document locks the audit foundation contract required before any schema, repository, API, approval, or execution implementation (Gate 4B+). It is **docs-only**: no SQL, migrations, tables, repositories, APIs, UI, tests, or runtime code are created here.

The audit foundation must support:

- independent entity approval (Project Documentation / Backlog)
- append-only audit history
- execution traceability and retries
- target-record linkage
- future import-history UI
- privacy and log redaction

---

## 2. Baseline & Source Findings

### Existing import/audit tables

- `planner_import_batches` exists in the runtime database (`data/workos.db`, 43 rows) but its DDL is **not present in current source** (`src/db/db.ts`, `src/db/schema.sql`). The route `src/app/api/planner-import/execute/route.ts` SELECTs and INSERTs into it. This is a schema-drift precedent: the table was created historically and the creating DDL was lost during recovery.
  - **Implication:** Gate 4B must create source-backed DDL for the audit tables, and should reconcile or explicitly leave `planner_import_batches` as-is (entity-specific, planner only).

### Existing provenance columns

- `project_doc_blocks`: `import_source` (incl. `google_sheet`), `import_batch_id`, `source_row_number`, `source_record_id`, `migrated_at`, `legacy_project_slug` — already provide doc-block row provenance.
- `project_items`: **no provenance columns** — Backlog provenance must come from the audit layer.

### Existing conventions

- IDs: `batch-<uuid>` (planner import), `nanoid()` (doc blocks), `LP-`, `CTX-`, `DEC-`, `GE-` prefixes.
- Timestamps: SQLite `datetime('now')` (UTC text) in DB; JS ISO-8601 (`toISOString()`) in runtime.
- JSON storage: `evidence_links_json`, `related_files_json`, `planner_import_batches.result_json`.
- Fingerprint/idempotency: `computeImportedTaskFingerprint` + `fingerprint UNIQUE` in `planner_import_batches`; `computeContentDuplicateHash` for doc blocks.
- Retention precedent: backup housekeeping (`RETAIN_COUNT=5`, `RETAIN_DAYS=7` for restore-safety backups) and `backup-db.sh` (30 backups). No import-audit cleanup exists.
- Dry-run types (Gate 3) already expose: `dryRunId`, `fileHash`, `schemaVersion`, metadata (`workbookId`, `batchReference`, `sourceSystem`, `exportTimestamp`, `timezone`, `preparedBy`, `notes`), `workbookStatus`, entity results (statuses, counts, rows with `externalRowId`, `projectSlug`, `projectId`, `parserStatus`, `dryRunStatus`, `proposedOperation`, `existingRecordReference`, issues), `totals`.

---

## 3. Core Audit Architecture

Recommended minimum architecture — **five tables**:

| Table | Responsibility |
| --- | --- |
| `import_batches` | One record per submitted workbook dry run: batch identity, source file identity, workbook metadata, contract versions, entity summaries, lifecycle status, execution linkage, retention state |
| `import_batch_rows` | One record per candidate row: worksheet/source-row provenance, normalized identity, dry-run classification, issue codes, proposed operation, execution outcome, target record linkage |
| `import_approvals` | Independent approval per entity worksheet: TTL, approver, binding (file hash/dry-run/schema/contract), invalidation, consumption, outcome |
| `import_execution_attempts` | Append-only execution events per entity attempt: started/committed/rolled_back/failed, target IDs, error codes, attempt references |
| `import_cleanup_log` | Append-only deletion/cleanup events (who, what, when, retention basis) |

### Evaluated but not added

- `import_executions` — merged into `import_batches` lifecycle columns + `import_execution_attempts`; a separate table would overlap.
- `import_batch_events` — overlaps `import_approvals` + `import_execution_attempts` + `import_cleanup_log`; not needed.

`import_execution_attempts` is required because updating row lifecycle columns would erase attempt history (append-only execution trace). `import_cleanup_log` is required so deletion actions themselves are auditable.

---

## 4. Core Decisions (Gate 4A)

### Decision 1 — Batch Identity

- **Recommended rule:** every submitted dry-run request creates a distinct `batch_id` (`batch-<uuid>`); `dry_run_id` stays deterministic from workbook + contract inputs; multiple batches may share the same `dry_run_id`; repeated dry runs create a new batch (attempt history preserved).
- **Alternatives:** deterministic-only batch IDs (loses attempt separation), reuse existing batch (loses history).
- **Trade-offs:** attempt history vs. deduplication; deterministic `dry_run_id` still enables comparison.
- **Owner impact:** none (attempt history is user-visible history).
- **Technical impact:** batch table grows per dry run; retention policy controls growth.
- **Status:** Approved recommendation.

### Decision 2 — Summary vs Per-Row Storage

- **Recommended rule:** store batch summary + **every candidate row classification** + audit-relevant normalized fields; do **not** store fully blank skipped spreadsheet rows; preserve `source_row_number` and `external_row_id`.
- **Alternatives:** summary-only (no debugging/recovery), errors/conflicts only (loses duplicate/new audit), configurable tiers (complexity).
- **Owner impact:** storage volume and how much history is retained.
- **Technical impact:** row table size is the main growth driver.
- **Status:** Approved — every candidate row is persisted; blank rows, raw cell dumps, formulas, formatting, and unrelated cells are not.

### Decision 3 — Source File Identity

- **Recommended rule:** store original filename (escaped for display/logging) + sanitized filename + `source_file_hash` (required) + `source_file_size` + detected MIME + `schema_version` + `workbook_id` + `batch_reference` + `source_system`; sheet names stored per row/entity; never use the original filename as a filesystem path.
- **Status:** Approved recommendation.

### Decision 4 — Workbook Bytes

- **Recommended rule:** do **not** store workbook binary or Base64 in SQLite. Temporary upload bytes exist only during controlled parsing; execution runs from the **immutable persisted normalized payload** bound by `source_file_hash`; future file retention needs a separate storage contract.
- **Alternatives:** store bytes (recovery + re-parse, large blobs, privacy risk), require re-upload at execution (UX burden).
- **Owner impact:** data-recovery capability after approval; privacy.
- **Technical impact:** execution depends on persisted normalized payload integrity.
- **Status:** Approved — canonical normalized payload is persisted for execution; workbook bytes / Base64 workbook are never stored.

### Decision 5 — Approval Binding

- **Recommended rule:** one approval record per entity; approval is append-only history; rejection and revocation are recorded as state transitions (history preserved); approval can be consumed once (`consumed_at`); execution result updates approval state to `consumed`; bound to `batch_id`, `dry_run_id`, `file_hash`, `schema_version`, `contract_version`, `entity_type`, worksheet, summary fingerprint, approver, timestamps. No reusable approval for modified input.
- **Status:** Approved recommendation.

### Decision 6 — Approval TTL

- **Recommended rule:** TTL = 30 minutes starting at `approved_at`; store UTC; `expires_at = approved_at + 30 min`; execution must **begin** before expiry; once begun with a valid approval, the transaction may complete; expired approval requires a new dry run or re-approval (with file/state validation).
- **Status:** Approved (matches Gate 1).

### Decision 7 — Retention Policy

| Option | Unapproved/rejected/expired | Failed execution | Successful import | Normalized payload |
| --- | --- | --- | --- | --- |
| Short | 7 days | 30 days | 90 days | 30 days |
| **Balanced (recommended)** | **30 days** | **90 days** | **365 days** (summary/provenance) | **90 days, then purge payload, keep minimal provenance** |
| Long | 90 days | 180 days | 730 days | 365 days |

**Lifecycle timestamps used for each retention period:**

- unapproved/rejected/expired batch → `created_at`
- failed execution batch → latest attempt `finished_at`
- successful import summary/provenance → execution completion timestamp
- full normalized payload → row `created_at` (purge at 90 days, keep minimal provenance)

- **Status:** Approved — Balanced retention (30 / 90 / 365 days; payload purge at 90 days).

### Decision 8 — Cleanup Policy

- **Recommended rule:** Gate 4B creates schema only; **no automatic deletion** in the first implementation; `retention_eligible_at` is recorded; a controlled scheduled cleanup executor is a later task; manual SQL deletion is not the user workflow; future cleanup must preserve executed-import audit references per policy.
- **Status:** Approved — Gate 4B records retention eligibility and payload-purge timestamps only; no automatic/scheduled/user-facing deletion; cleanup is a later controlled, audited Gate.

---

## 5. Proposed Batch Lifecycle

### Top-level batch state

```text
dry_run_created → ready_for_approval | partially_ready | dry_run_invalid
ready_for_approval / partially_ready → approved | partially_approved | rejected | approval_expired
approved / partially_approved → execution_started → executed | partially_executed | execution_failed
execution_failed → execution_started (retry)
any post-created → cancelled
executed / partially_executed / execution_failed → retention_eligible → deleted
```

### Per-entity state

`ready | ready_with_warnings | blocked` → `approved | rejected | expired` → `executed`.

### Approval state

`pending → approved | rejected | expired | revoked → consumed`.

### Execution row status

`attempted | committed | rolled_back | failed_before_write | skipped`.

Separate state columns (`batch_status`, per-entity status, approval status, execution status) avoid combined-status ambiguity.

---

## 6. Approval Lifecycle (per entity)

- Warnings may be approved (non-blocking, recorded).
- Conflict rows block that entity's execution (manual review).
- `review_required` rows block that entity's execution.
- Invalid rows block the entity.
- Duplicate/skipped rows do not block.
- **v1 simplification:** approval applies to all eligible `new` rows in one entity; **no arbitrary row selection** in importer v1.
- The other entity may proceed independently.
- **Status:** Approved — entity-level approval; row selection deferred beyond importer v1.

---

## 7. Execution Linkage

For each row, audit records preserve: proposed operation, execution status, target table, target record ID, execution timestamp, error code, attempt reference, and commit/rollback state. Execution uses one atomic transaction per entity; target IDs are not marked committed if the transaction rolls back.

`import_execution_attempts` records: attempt ID, batch ID, entity type, started_at, finished_at, status, error code, created/committed target IDs, transaction outcome. Row lifecycle columns may be updated through controlled transitions; attempt history is append-only.

---

## 8. Retry & Idempotency Contract

- Repeated dry run of identical workbook → new batch, same `dry_run_id`, same classifications (deterministic).
- Repeated approval → new approval record; prior unconsumed approval remains valid only if not expired/revoked (execution consumes the earliest valid one).
- Execution retry after failure/rollback → new attempt; row identity prevents duplicate inserts (doc blocks: `source_record_id` identity + content hash; backlog: exact-content match + audit row uniqueness).
- Execution retry after partial/unknown state → attempt lookup decides; no blind retry.
- Repeated workbook after successful import → rows classify as `duplicate` (doc) or exact-content `duplicate` (backlog); backlog cross-import external-row identity depends on this audit foundation (documented limitation resolved by `import_batch_rows` provenance).
- Audit-row uniqueness proposal: `(entity_type, project_id, external_row_id, source_file_hash)` per batch — must not prevent legitimate future imports (analysis required before adding a UNIQUE constraint; recommended as an index, not a hard uniqueness rule, in v1).

---

## 9. Normalized Row Payload Storage

- Searchable identity/lifecycle fields as columns.
- Normalized entity payload as **canonical deterministic JSON** (stable key order).
- Validation issue codes as canonical JSON array.
- No raw workbook cell dump, no formulas, no unfiltered original-row JSON.
- **Execution model:** upload → parse & dry run → persist canonical payload + file hash → approve entity → execute from the **immutable persisted payload**. Payload immutability is enforced by treating the payload column as immutable after creation (code-level rule + optional later trigger).

---

## 10. Privacy & Sensitive Data

### Allowed in audit DB

file hash, workbook ID, batch reference, normalized import fields required for execution, row classifications, issue codes, target record IDs, approver identity, timestamps.

### Not allowed in application logs

full `details`, full `notes`, workbook metadata `notes`, full row payload, health-related project content, credentials, API keys, auth tokens, approval secrets, workbook bytes, raw stack traces containing row content.

### Log redaction

- Logs use safe identifiers (batch ID, row ID, counts); file display names truncated (e.g., ≤ 60 chars); error messages are generic; raw invalid values may appear in UI only (authorized), never in server logs; project data is never assumed non-sensitive (e.g., `Personal Health Routine Tracker`).

---

## 11. Retention & Deletion Semantics

- Non-executed batches may be hard-deleted after retention expiry.
- Successful-import audit keeps a minimal immutable trace longer.
- Normalized user content may be purged while summary/provenance remains.
- Target-record linkage must not become orphaned silently (retain linkage with trace).
- Deletion actions are themselves recorded in `import_cleanup_log`.
- Separate: batch retention / row payload retention / approval retention / execution trace retention.

---

## 12. Append-Only & Mutation Rules

### Immutable

batch ID, dry-run ID, source file hash, schema/contract versions, workbook ID, source row identity, normalized payload, approved-dry-run row classification, approval binding values.

### Controlled mutable

lifecycle status, approval status (validated transitions), execution status, target record ID, retention eligibility, cleanup timestamps.

### Append-only history

approval decisions, execution attempts, cleanup events, security-relevant failures.

---

## 13. User-Visible Audit History (future UI, not implemented)

- **Import History List:** batch reference, filename, created time, entity statuses, summary counts, approval state, execution state.
- **Batch Detail:** workbook metadata, file-hash excerpt, per-entity summary, row results, issues, approvals, execution result, target-record links.
- **Privacy:** no full sensitive cell content by default; expandable detail follows authorization; logs and UI are different disclosure boundaries.
- **Approved v1 placement:** Global Import History as the primary view; Project Detail shows filtered related import history.

---

## 14. Failure & Recovery Scenarios

1. Dry-run persistence fails → batch marked failed; no approval possible.
2. Row persistence fails midway → batch invalid; insert rollback; retry as new dry run.
3. Approval persistence fails → no approval; re-attempt.
4. Execution audit starts but entity insert fails → attempt `failed`; entity rollback; no target IDs marked committed.
5. Import commits but audit update fails → audit repair task; linkage derived from attempt payload.
6. Crash during execution → next attempt performs state lookup; no blind duplicate insert.
7. Approval expires during execution → if execution began before expiry, it may complete; otherwise aborted.
8. Cleanup runs during approval/execution → cleanup only touches `retention_eligible` batches; never in-flight ones.
9. Project deleted between dry run and execution → revalidation fails; entity blocked.
10. Existing records change between dry run and execution → revalidation fails for affected rows.

### Mandatory pre-execution revalidation

approval still valid; file-hash/dry-run binding unchanged; project still exists; duplicate/conflict state unchanged; execution has not already completed; batch not expired or under cleanup.

---

## 15. Approved Owner Decisions

All seven Owner-impacting decisions are approved (final rules):

1. **Retention durations** — Balanced: unapproved/rejected/expired 30 days; failed execution 90 days; successful import summary/provenance 365 days; full normalized payload purged at 90 days (minimal provenance retained); approval/execution records follow the applicable batch summary.
2. **All row details retained** — yes: every candidate row; no blank rows, raw cell dumps, formulas, formatting, or unrelated cells.
3. **Sensitive normalized content stored** — yes, in the audit database only, required for execution; never in application logs; not shown by default in future UI; workbook bytes / Base64 never stored; payload purged at 90 days with minimal provenance retained; future access authorization-controlled.
4. **Successful import history retained longer** — 365 days summary/provenance (batch ID, dry-run ID, file hash, workbook ID, sanitized filename, entity type, source row identity, classification, execution result, target record ID, approval/execution timestamps, required issue/failure codes).
5. **Approval scope** — entity-level; one approval covers all eligible `new` rows in the entity; no row selection in v1; warning-only rows may proceed; duplicate/skipped do not block; invalid/conflict/review-required block the entity; the other entity proceeds independently.
6. **Import history UI placement** — Global Import History primary; Project Detail filtered view; schema must support both queries; UI not implemented in 4A/4B.
7. **Cleanup in v1** — Gate 4B records retention eligibility and purge timestamps only; no automatic/scheduled/user-facing deletion; cleanup is a later controlled Gate and is itself audited.

---

## 16. Gate 4A Outcome

**Gate 4A Passed / Audit Schema Design Ready**

The audit design is complete, owner-approved, and consistent with Gates 1–3. Gate 4B may implement the approved schema (five tables), repositories, and tests — without APIs, upload UI, or execute-import in the same Gate.
