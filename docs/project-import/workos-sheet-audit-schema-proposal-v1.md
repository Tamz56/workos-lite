# WorkOS Sheet — Audit Schema Proposal (Gate 4A, v1)

> Docs-only proposal. No SQL, migration, or implementation in this Gate.
>
> Reflects the owner-approved Gate 4A decisions (architecture §15): balanced retention, per-row audit, payload-for-execution with 90-day purge, 365-day provenance, entity-level approval, Global + Project history views, eligibility-only cleanup in Gate 4B.

## 1. Entity-Relationship Overview

```text
import_batches (1) ──── (N) import_batch_rows
     │                          │
     │ (1)                      │ (N, execution events)
     ├── (N) import_approvals   └── import_execution_attempts (entity-scoped, batch-linked)
     └── (N) import_cleanup_log
```

Relationships:

- `import_batches.id` ← `import_batch_rows.batch_id` (FK, RESTRICT)
- `import_batches.id` ← `import_approvals.batch_id` (FK, RESTRICT)
- `import_batches.id` ← `import_execution_attempts.batch_id` (FK, RESTRICT)
- `import_batches.id` ← `import_cleanup_log.batch_id` (FK, SET NULL allowed for cleanup of deleted batches)
- `import_batch_rows.id` ← `import_execution_attempts` via attempt payload (no hard FK to keep attempt append-only)

## 2. Table Responsibilities

| Table | Responsibility |
| --- | --- |
| `import_batches` | batch identity, source file identity, metadata, summaries, lifecycle, retention |
| `import_batch_rows` | per-candidate-row audit + execution outcome |
| `import_approvals` | independent per-entity approval lifecycle |
| `import_execution_attempts` | append-only execution attempts per entity |
| `import_cleanup_log` | append-only cleanup/deletion audit |

## 3. Field Dictionaries

Sensitivity: `operational` = safe to display/log; `user_content` = user-authored (mask in logs); `sensitive` = personal/health (never in logs); `security` = binding identity (mask); `forbidden` = never stored.

### `import_batches`

| Column | Type | Null | Default | Mutable | Source | Index | Sensitivity | Retention |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `id` | TEXT PK | No | `batch-<uuid>` | immutable | service | PK | operational | batch-linked |
| `dry_run_id` | TEXT | No | — | immutable | Gate 3 | ✅ | operational | batch-linked |
| `schema_version` | TEXT | No | — | immutable | metadata | — | operational | batch-linked |
| `parser_contract_version` | TEXT | No | — | immutable | parser const | — | operational | batch-linked |
| `dry_run_contract_version` | TEXT | No | — | immutable | dry-run const | — | operational | batch-linked |
| `workbook_id` | TEXT | Yes | — | immutable | metadata | ✅ | operational | batch-linked |
| `batch_reference` | TEXT | Yes | — | immutable | metadata | — | operational | batch-linked |
| `source_system` | TEXT | Yes | — | immutable | metadata | — | operational | batch-linked |
| `source_filename` | TEXT | Yes | — | immutable | input (escaped) | — | user_content | batch-linked |
| `source_filename_sanitized` | TEXT | Yes | — | immutable | derived | — | operational | batch-linked |
| `source_file_hash` | TEXT | No | — | immutable | parser | ✅ | operational | batch-linked |
| `source_file_size` | INTEGER | No | — | immutable | upload | — | operational | batch-linked |
| `source_mime_type` | TEXT | Yes | — | immutable | detected | — | operational | batch-linked |
| `timezone` | TEXT | Yes | — | immutable | metadata | — | operational | batch-linked |
| `prepared_by` | TEXT | Yes | — | immutable | metadata | — | user_content | batch-linked |
| `batch_status` | TEXT | No | `dry_run_created` | mutable | lifecycle | ✅ | operational | batch-linked |
| `project_documentation_status` | TEXT | Yes | — | mutable | per-entity | — | operational | batch-linked |
| `backlog_status` | TEXT | Yes | — | mutable | per-entity | — | operational | batch-linked |
| summary counts | INTEGER | Yes | 0 | mutable | totals | — | operational | batch-linked |
| `warning_count` | INTEGER | Yes | 0 | mutable | totals | — | operational | batch-linked |
| `error_count` | INTEGER | Yes | 0 | mutable | totals | — | operational | batch-linked |
| `created_at` | TEXT | No | `datetime('now')` | immutable | service | ✅ | operational | batch-linked |
| `updated_at` | TEXT | No | `datetime('now')` | mutable | lifecycle | — | operational | batch-linked |
| `retention_eligible_at` | TEXT | Yes | — | mutable | cleanup | ✅ | operational | batch-linked |
| `deleted_at` | TEXT | Yes | — | mutable | cleanup | — | operational | batch-linked |

### `import_batch_rows`

| Column | Type | Null | Default | Mutable | Source | Index | Sensitivity | Retention |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `id` | TEXT PK | No | `row-<uuid>` | immutable | service | PK | operational | row tier |
| `batch_id` | TEXT | No | — | immutable | batch | ✅ | operational | batch-linked |
| `entity_type` | TEXT | No | — | immutable | parser | ✅ | operational | row tier |
| `worksheet_name` | TEXT | No | — | immutable | parser | ✅ | operational | row tier |
| `source_row_number` | INTEGER | No | — | immutable | parser | ✅ | operational | row tier |
| `external_row_id` | TEXT | Yes | — | immutable | parser | ✅ | operational | row tier |
| `project_slug` | TEXT | Yes | — | immutable | parser | ✅ | operational | row tier |
| `resolved_project_id` | TEXT | Yes | — | mutable (execution revalidation) | resolver | ✅ | operational | row tier |
| `parser_status` | TEXT | No | — | immutable | parser | — | operational | row tier |
| `dry_run_status` | TEXT | No | — | immutable (approved run) | classifier | ✅ | operational | row tier |
| `proposed_operation` | TEXT | No | — | immutable | classifier | — | operational | row tier |
| normalized identity fields | TEXT | Yes | — | immutable | normalized payload | — | user_content | payload tier |
| `payload_json` | TEXT | Yes | — | immutable | normalized payload | — | user_content | payload tier |
| `validation_issue_codes_json` | TEXT | Yes | `[]` | immutable | issues | — | operational | row tier |
| `warning_count` | INTEGER | Yes | 0 | immutable | issues | — | operational | row tier |
| `error_count` | INTEGER | Yes | 0 | immutable | issues | — | operational | row tier |
| `existing_record_reference` | TEXT | Yes | — | immutable | classifier | — | operational | row tier |
| `target_table` | TEXT | Yes | — | mutable | execution | — | operational | row tier |
| `target_record_id` | TEXT | Yes | — | mutable | execution | ✅ | operational | trace |
| `execution_status` | TEXT | Yes | — | mutable | execution | ✅ | operational | trace |
| `execution_error_code` | TEXT | Yes | — | mutable | execution | — | operational | trace |
| `payload_purged_at` | TEXT | Yes | — | mutable | cleanup | — | operational | retention |
| `created_at` | TEXT | No | `datetime('now')` | immutable | service | — | operational | row tier |
| `updated_at` | TEXT | No | `datetime('now')` | mutable | lifecycle | — | operational | row tier |

### `import_approvals`

| Column | Type | Null | Default | Mutable | Source | Index | Sensitivity | Retention |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `id` | TEXT PK | No | `apr-<uuid>` | immutable | service | PK | security | trace |
| `batch_id` | TEXT | No | — | immutable | batch | ✅ | operational | trace |
| `entity_type` | TEXT | No | — | immutable | entity | ✅ | operational | trace |
| `approval_status` | TEXT | No | `pending` | mutable | lifecycle | ✅ | operational | trace |
| `approved_by` | TEXT | Yes | — | immutable | auth | — | sensitive | trace |
| `approved_at` | TEXT | Yes | — | immutable | service | — | operational | trace |
| `expires_at` | TEXT | Yes | — | immutable | TTL | ✅ | operational | trace |
| `rejected_by` / `rejected_at` | TEXT | Yes | — | immutable | service | — | sensitive | trace |
| `revoked_by` / `revoked_at` | TEXT | Yes | — | immutable | service | — | sensitive | trace |
| `consumed_at` | TEXT | Yes | — | mutable | execution | — | operational | trace |
| `bound_file_hash` | TEXT | No | — | immutable | dry run | ✅ | operational | trace |
| `bound_dry_run_id` | TEXT | No | — | immutable | dry run | ✅ | operational | trace |
| `bound_schema_version` | TEXT | No | — | immutable | dry run | — | operational | trace |
| `bound_contract_version` | TEXT | No | — | immutable | dry run | — | operational | trace |
| `approval_summary_fingerprint` | TEXT | No | — | immutable | summary | — | operational | trace |
| `reason_or_note` | TEXT | Yes | — | immutable | approver | — | user_content | trace |
| `created_at` | TEXT | No | `datetime('now')` | immutable | service | — | operational | trace |

No approval secret/token is stored in plain text.

### `import_execution_attempts` (append-only)

| Column | Type | Null | Mutable | Notes |
| --- | --- | --- | --- | --- |
| `id` | TEXT PK | No | immutable | `att-<uuid>` |
| `batch_id` | TEXT | No | immutable | FK RESTRICT |
| `entity_type` | TEXT | No | immutable | doc/backlog |
| `started_at` / `finished_at` | TEXT | Yes | mutable (within attempt) | UTC |
| `status` | TEXT | No | mutable | `started/failed/committed/rolled_back` |
| `error_code` | TEXT | Yes | mutable | generic code |
| `committed_target_ids_json` | TEXT | Yes | immutable after commit | target IDs |
| `attempt_reference` | TEXT | Yes | immutable | prior attempt link |

### `import_cleanup_log` (append-only)

| Column | Type | Null | Mutable | Notes |
| --- | --- | --- | --- | --- |
| `id` | TEXT PK | No | immutable | `cln-<uuid>` |
| `batch_id` | TEXT | Yes | immutable | NULL after hard delete |
| `action` | TEXT | No | immutable | `payload_purged`/`batch_deleted`/`trace_retained` |
| `performed_by` | TEXT | Yes | immutable | cleanup executor |
| `performed_at` | TEXT | No | immutable | UTC |
| `retention_basis` | TEXT | Yes | immutable | policy rule id |
| `details_json` | TEXT | Yes | immutable | counts, no content |

## 4. Constraints & Indexes (proposed)

- PKs: all five tables.
- FKs: `import_batch_rows.batch_id → import_batches.id` RESTRICT; `import_approvals.batch_id → import_batches.id` RESTRICT; `import_execution_attempts.batch_id → import_batches.id` RESTRICT; `import_cleanup_log.batch_id → import_batches.id` SET NULL.
- CHECK: `entity_type IN ('project_documentation','backlog')`; `dry_run_status IN (…)`; `proposed_operation IN ('insert','none','manual_review')`; `approval_status IN (…)`; `execution_status IN (…)`.
- Indexes: `dry_run_id`, `source_file_hash`, `workbook_id`, `batch_status`, `created_at`, `retention_eligible_at`, `(batch_id, entity_type)`, `(batch_id, worksheet_name, source_row_number)`, `(resolved_project_id, entity_type, external_row_id)`, `target_record_id`, approval `(batch_id, entity_type, expires_at)`.
- No premature UNIQUE on `(entity_type, project_id, external_row_id, source_file_hash)` — index only, until cross-import idempotency is analyzed (prevents blocking legitimate future imports).

## 5. Lifecycle States & Transitions

See the Architecture document (batch/per-entity/approval/execution vocabularies). Transitions are the only allowed state writes; all others are append-only events.

## 6. Immutable vs Mutable

- Immutable: identity, source identity, contract versions, normalized payload, approved-dry-run classifications, approval binding.
- Controlled mutable: lifecycle/approval/execution status columns, target record IDs, retention timestamps.
- Append-only: approval decisions, execution attempts, cleanup events.

## 7. Retention Fields

- `import_batches.retention_eligible_at` — eligibility per policy (unapproved 30d, failed 90d, successful 365d).
- `import_batch_rows.payload_purged_at` — normalized payload purge timestamp (successful imports: 90 days).
- `deleted_at` — marks hard deletion (set only by a later controlled cleanup Gate).
- Gate 4B records these fields only; no automatic or user-facing deletion is implemented.

## 8. Privacy Classification

- `operational` → safe in logs/UI.
- `user_content` → stored in audit DB; masked in logs; shown in UI with authorization.
- `sensitive` → never in logs; stored only as required for execution (approver identity, health-adjacent payloads); payload purge per policy.
- `security` → binding identity fields, masked.
- `forbidden` → credentials, tokens, approval secrets, workbook bytes, raw stack traces with content.

## 9. Migration Considerations

- Gate 4B creates source-backed DDL in `db.ts` (ensure-pattern) — the `planner_import_batches` precedent shows runtime-only DDL drifts; avoid repeating it.
- New tables are additive; no change to existing tables in v1.
- No migration script in Gate 4A; Gate 4B migration runs only after Owner decisions.

## 10. Repository Boundaries

- One repository per audit entity (`importBatchesRepository`, `importBatchRowsRepository`, `importApprovalsRepository`, `importExecutionAttemptsRepository`, `importCleanupLogRepository`) — read/write through repositories only; dry-run remains read-only via the Gate 3 adapter.

## 11. Transaction Boundaries

- Dry-run persistence: one transaction for batch + rows (all-or-nothing).
- Approval: single-row transaction.
- Execution: one atomic transaction per entity (rows + attempt outcome); target IDs marked committed only on commit.

## 12. Rollback Behavior

- Any write failure rolls back the enclosing transaction; audit distinguishes `attempted / committed / rolled_back / failed_before_write / skipped`.

## 13. Deferred v2

- update mode, arbitrary row selection in approval, automatic cleanup executor, cross-import hard uniqueness, workbook-bytes storage contract, per-user history scoping.

---

## 14. Gate 4A Outcome

**Gate 4A Passed / Audit Schema Design Ready** — schema contract approved for Gate 4B implementation (five tables, source-backed DDL, repositories, tests; no API/UI/execute-import in the same Gate).
