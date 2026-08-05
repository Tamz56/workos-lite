# WorkOS Sheet — Audit Schema Implementation (Gate 4B, v1)

## 1. Scope

This Gate implements the approved Gate 4A audit foundation: six tables, repositories, dry-run persistence, approval persistence, execution-attempt records, cleanup-event records, retention queries, lifecycle guards, and tests.

Not implemented: upload API, dry-run API, approval API, execute-import API, Import UI, business writes, cleanup jobs, payload purge, or deletion.

## 2. Schema Implementation

### Six tables (source-backed)

```text
import_batches
import_batch_rows
import_approvals
import_approval_events
import_execution_attempts
import_cleanup_log
```

- Canonical DDL: `src/db/schema.sql` (mirror) and `src/lib/project-import/auditSchema.ts` (`AUDIT_SCHEMA_SQL` + `ensureAuditSchema`).
- Runtime initialization: `src/db/db.ts` calls `ensureAuditSchema(db)` at module init (after the registry ensure).
- Idempotency: `CREATE TABLE IF NOT EXISTS` + `CREATE INDEX IF NOT EXISTS` — no check-then-create races.
- Timestamps: UTC (`datetime('now')` default; runtime writes ISO-8601 UTC).
- IDs: `batch-<uuid>`, `row-<uuid>`, `apr-<uuid>`, `att-<uuid>`, `cln-<uuid>`.
- JSON: canonical deterministic serialization (`auditSerialization.ts`).

### Table responsibilities (non-overlapping)

| Table | Responsibility |
| --- | --- |
| `import_batches` | batch/source identity, metadata, contract versions, summaries, lifecycle, retention |
| `import_batch_rows` | per-candidate-row audit + controlled execution result fields |
| `import_approvals` | per-entity approval identity + binding + TTL basis + cached current status |
| `import_approval_events` | **append-only** approval lifecycle history (created/approved/rejected/expired/revoked/consumed) |
| `import_execution_attempts` | append-only execution attempts (incrementing `attempt_number`) |
| `import_cleanup_log` | append-only cleanup events + retention-eligibility queries |

## 3. Schema Initialization Strategy

- `schema.sql` is the canonical DDL for new databases.
- `auditSchema.ts` is the runtime ensure for existing databases; it is also the canonical DDL path invoked by `db.ts`.
- Both are idempotent and safe under repeated initialization and concurrent workers.
- `planner_import_batches` (runtime-only DDL) is documented as a separate legacy/schema-drift finding; it is not deleted, renamed, or reused.

## 4. Repositories

Intent-specific repositories only (no generic CRUD patch surface):

- `auditBatchRepository`: create/get/list/query by file hash or dry-run ID; controlled batch/entity status transitions; retention eligibility.
- `auditRowRepository`: insert rows (batch persistence), list by batch/entity, controlled execution-status updates, prior backlog provenance lookup, payload/issue-code accessors.
- `auditApprovalRepository`: create pending, approve entity (eligibility + binding checks), reject/revoke/expire/consume (each appends an event), latest-valid lookup, approval history, approval event history, effective-state derivation.
- `auditExecutionRepository`: append attempt (deterministic `attempt_number` inside a transaction), finalize attempt (guarded), list attempts.
- `auditCleanupRepository`: append/complete cleanup events, payload-purge-eligible and batch-deletion-eligible queries.

## 5. Transaction Boundaries

- Dry-run persistence: one transaction for batch + all candidate rows; any row failure rolls back the whole batch.
- Approval decision: one transaction per action.
- Execution attempt: one transaction per append/finalize.
- Cleanup event: one transaction per event.
- No business-table transaction exists in Gate 4B.

## 6. Lifecycle Guards

Centralized vocabularies + transition guards in `auditLifecycle.ts`:

- Batch: 15 statuses with a transition map; invalid transitions throw `AUDIT_INVALID_TRANSITION`.
- Entity: `ready/ready_with_warnings/blocked → approved/rejected/expired → executed`.
- Approval: `pending → approved|rejected|expired|revoked`, `approved → expired|revoked|consumed`; irreversible.
- Row execution: `not_started → attempted → committed|rolled_back|failed_before_write`, `not_started → skipped`.
- Attempt: `started → committed|rolled_back|failed|failed_before_write|cancelled`.

## 7. Deterministic Serialization

`auditSerialization.ts`:

- `serializeCanonicalJson`: stable key ordering, no `undefined`/bigint/function/symbol, no circular references, no raw workbook objects.
- `parseCanonicalJson` + validation; payloads round-trip to the approved normalized types.
- `computeAuditFingerprint`: SHA-256 over canonical JSON (used for approval summary binding).
- Full payloads are never logged.

## 8. Approval TTL

- `expires_at = approved_at + 30 minutes` (UTC).
- Execution may begin only while an approval is valid (`findLatestValidApproval`).
- Approval binding is verified against the batch (file hash, dry-run ID, schema version, contract versions, summary fingerprint).
- Expired/revoked/consumed approvals cannot be consumed.

### Approval history is append-only

- `import_approvals` stores immutable identity + binding; `approval_status` is a **cached current state** kept consistent with events inside the same transaction.
- `import_approval_events` is the append-only source of audit history: one row per `created/approved/rejected/expired/revoked/consumed` event, with actor, timestamp, code, and safe reason; prior events are never overwritten or deleted.
- `deriveEffectiveApprovalState` derives the current state from the latest event.
- Consumption is race-safe: it runs in a transaction that re-reads the approval and event history, then appends `consumed`; a second caller cannot consume the same approval.

The Gate 4A schema proposal explicitly allowed a minimum additional event/attempt table when the three-table model could not preserve append-only history; `import_approval_events` is that addition, so the architecture grows from five to six tables.

## 9. Retention Calculations

`retentionPolicyForBatchStatus` + `retentionEligibleAt`:

- rejected / approval_expired → 30 days
- execution_failed → 90 days
- executed / partially_executed → 365 days (batch/provenance), payload purge eligible at 90 days
- eligibility is recorded only; no deletion or purge runs in Gate 4B.

## 10. Privacy & Logging

- Logs may contain batch ID, dry-run/file-hash excerpts, entity type, row ID, issue codes, safe error codes, counts, timestamps.
- Logs never contain normalized payloads, doc details, backlog notes, metadata notes, health content, credentials, tokens, approval secrets, workbook bytes, or raw cell values.
- Repository errors expose machine-readable codes + safe messages.

## 11. Audit-Only Write Boundary

Gate 4B writes only the five audit tables. Business tables (`projects`, `project_doc_blocks`, `project_items`, registry metadata) are untouched — verified by tests (`Audit-only write boundary verified`).

## 12. Known Limitations & Deferred

- No API, UI, execute-import, cleanup job, purge, or deletion.
- Backlog cross-import hard uniqueness remains an index (not a UNIQUE constraint).
- Approval history is append-only via `import_approval_events`; the cached `approval_status` column is derived state, not history.
- Future Gates: execution service (Gate 5/6), approval/upload API, cleanup executor.
