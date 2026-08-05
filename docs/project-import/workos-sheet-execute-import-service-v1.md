# WorkOS Sheet — Execute Import Service (Gate 6, v1)

## 1. Scope

Internal, insert-only business-write service. No public execute API, UI, agent command, scheduled execution, or automatic execution after approval.

## 2. Service Boundary

```ts
executeApprovedImportEntity(
  input: { batchId; entityType; approvalId; requestedBy },
  deps: { db; now? },
): ExecuteImportEntityResult
```

Only identifiers and the server actor are trusted. File hash, dry-run ID, schema/contract versions, summary fingerprint, normalized payloads, target IDs, approval timestamps, and execution counts are all loaded from persisted audit state.

## 3. Preconditions

1. Batch exists
2. No committed or in-progress execution for batch/entity
3. Entity is approved
4. Approval exists and belongs to batch/entity
5. Effective approval state is `approved` (not expired/revoked/consumed/rejected)
6. Current UTC is before `expires_at`
7. No blocking rows (`invalid`/`conflict`/`review_required`)
8. Eligible `new`/`insert` rows exist
9. Approval bindings match the batch (file hash, dry-run ID, schema version, parser/dry-run contract versions, summary fingerprint)

Precondition failures throw typed errors before any attempt or business write.

## 4. Stale-State Revalidation

Every eligible row is revalidated inside the business transaction:

- project still exists and the exact case-sensitive slug still resolves to the same project ID
- documentation: `(project_id, source_record_id)` identity re-checked (stale duplicate / conflict / archived review-required), plus same-content-different-identity candidate check
- backlog: exact stable-field content match re-checked against `project_items`

Any stale result blocks the entire entity; no silent skipping of changed rows.

## 5. Transaction Boundary

Exactly one atomic transaction per entity:

- revalidate all eligible rows
- insert all rows (dedicated write adapters)
- mark audit rows `attempted` → `committed` with target record IDs
- consume approval (append `consumed` event, cached status, `consumed_at`)
- advance batch to `execution_started`, entity to `executed`, batch to `executed`/`partially_executed`

Any failure rolls back the whole entity (business inserts + audit updates). The other entity is unaffected.

## 6. Project Documentation Write Contract

`projectDocumentationWriteAdapter` inserts into `project_doc_blocks` via the service-injected database:

- `import_source = 'google_sheet'`, `import_batch_id`, `source_row_number`, `source_record_id` preserved
- `generated_by` never fabricated (always NULL)
- content hash is computed via `computeContentDuplicateHash` for validation (no new column in v1 — schema limitation documented)
- no update, overwrite, unarchive, or delete

## 7. Backlog Write Contract

`backlogWriteAdapter` inserts into `project_items`:

- only `inbox`/`planned`/`done`
- `schedule_bucket`, `start_date`, `end_date`, `is_milestone`, `workstream`, `dod_text`, `notes` mapped from persisted normalized payload
- provenance never embedded in `notes`; provenance stays in audit tables

## 8. Approval Consumption

- consumes in the same transaction as successful inserts
- re-reads approval and derives effective state; expired/revoked/consumed cannot execute
- appends `consumed` event, updates cached status and `consumed_at`
- double execution prevented by committed-attempt check + in-transaction stale revalidation

## 9. Execution Attempt Lifecycle

- `started` attempt persisted before the business transaction
- success → attempt finalized `committed` **inside the same entity transaction** (Option A): atomic with business inserts, audit target linkage, approval consumption, and lifecycle updates — a post-commit finalization failure is impossible
- revalidation failure before any write → attempt `failed_before_write` (controlled audit finalization after rollback)
- insert/consume failure → transaction rollback, attempt `rolled_back`/`failed`
- terminal attempt states are immutable; retries create a new attempt

### Source-of-Truth Invariant

```text
If the approval is consumed and eligible audit rows contain committed target IDs,
the entity must be treated as committed even if an execution-attempt finalization
is incomplete.
```

- a stale `started` attempt alone never implies "safe retry"
- `isEntityCommittedBySourceOfTruth(db, batchId, entityType)` exposes this check for reconciliation
- reconciliation of a stale `started` attempt is a future controlled task (no job/UI in Gate 6)

## 10. Idempotency & Retry

- committed attempt → `EXECUTION_ALREADY_COMPLETED`
- in-progress attempt → `EXECUTION_ALREADY_IN_PROGRESS` (unknown state blocks auto retry)
- retry after `failed_before_write` or rollback creates a new attempt (approval remains valid because consumption is transactional)
- expired approval requires a new approval
- once the entity transaction commits, the operation is never represented as rolled back or safely retryable; a finalization failure inside the transaction rolls back all entity writes (business + audit + approval), leaving no "committed but unfinalized" ambiguity

## 11. Error Contract

Typed `ExecutionError` codes (batch/approval/stale/insert/audit/transaction). Errors never contain normalized payloads, documentation details, backlog notes, SQL, paths, health content, or approval secrets.

## 12. Business-Write Boundaries

- Documentation execution writes only `project_doc_blocks` + audit tables
- Backlog execution writes only `project_items` + audit tables
- `projects`, registry metadata, unrelated tables, cleanup tables, and Template files are untouched

## 13. Known Limitations & Deferred

- Entity status has no `execution_failed` value in the approved schema; failures are reflected in batch status + attempt records (no schema change in Gate 6)
- Content hash has no dedicated column in v1
- No public execute API / UI — the service is reviewed independently before exposure (Gate 7)
