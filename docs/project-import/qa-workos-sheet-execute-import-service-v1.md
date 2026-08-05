# QA — WorkOS Sheet Execute Import Service (Gate 6, v1)

## 1. Scope

QA for the internal execute-import service, write adapters, revalidation, and focused tests. Business writes occur only in isolated in-memory test databases.

## 2. Sources Inspected

- Gate 3 classifiers + persisted normalized payload contract
- Gate 4B audit repositories (batch/rows/approval/events/attempts), lifecycle guards
- Gate 5 application services
- `project-doc-blocks` repository/validation/mappers/hashing (create + provenance)
- `project_items` DDL + create API zod contract
- `db.ts` transaction patterns, FK behavior

## 3. Test Database Strategy

Isolated in-memory SQLite with realistic CHECK/FK constraints (projects + registry columns, `project_doc_blocks`, `project_items`, audit tables). Seeds: projects, existing doc blocks/backlog items, persisted batches/rows, approvals/events, execution attempts.

## 4. Test Results

```text
Gate 6 focused:  4 files / 35 tests passed
Full suite:      71 files / 960 tests passed
TypeScript:      tsc --noEmit --incremental false -> exit 0
ESLint:          0 errors / 0 new warnings
```

Coverage: preconditions (approval/expired/revoked/consumed/binding/blocked/no-eligible/repeat/in-progress), stale-state (project missing/slug mismatch/doc identity/content/archived/backlog duplicate/no-write-on-stale), doc + backlog writes (single/multi/provenance/hash/rollback), consumption (append-only/one-time/retry-after-failed-before-write/retry-after-rollback), lifecycle, write boundaries, privacy-safe errors.

## 5. Transaction & Rollback Evidence

- rollback leaves `project_doc_blocks`/`project_items` at zero inserts
- audit rows stay `not_started` with null target IDs after rollback
- approval remains `approved` with no `consumed` event after rollback
- attempt records `rolled_back` / `failed_before_write` / `committed` appropriately
- attempt finalization failure inside the transaction rolls back all entity writes (business inserts + audit updates + approval consumption) — proven with a deterministic injected failure

## 6. Approval Consumption Evidence

- success consumes exactly once (cached status + `consumed_at` + append-only event)
- second execution fails `EXECUTION_ALREADY_COMPLETED` with no duplicate inserts
- in-transaction stale revalidation prevents double-insert under concurrency
- the attempt is finalized `committed` in the same transaction as consumption (Option A): no post-commit finalization failure window
- `isEntityCommittedBySourceOfTruth` treats consumed approval + committed audit target IDs as authoritative; a stale `started` attempt is never treated as safely retryable (tested)

## 7. Build

`next build --webpack` passed; default Turbopack build remains environment-limited in this sandbox (GitHub Actions is final validation). `next-env.d.ts` unchanged.

## 8. Active DB Safety

No Gate 6 test touches `data/workos.db`; the service writes only through the injected test database. No production data modified.

## 9. Exact Git Scope

```text
A  src/lib/project-import/executionTypes.ts
A  src/lib/project-import/executionErrors.ts
A  src/lib/project-import/executionRevalidation.ts
A  src/lib/project-import/projectDocumentationWriteAdapter.ts
A  src/lib/project-import/backlogWriteAdapter.ts
A  src/lib/project-import/executeImportService.ts
A  src/lib/project-import/executionResultSerializer.ts
A  tests/fixtures/executionTestDb.ts
A  tests/fixtures/executionHelpers.ts
A  tests/unit/executionPreconditions.test.ts
A  tests/unit/executionRevalidation.test.ts
A  tests/unit/executionWrite.test.ts
A  tests/unit/executionConsumptionLifecycle.test.ts
A  docs/project-import/workos-sheet-execute-import-service-v1.md
A  docs/project-import/qa-workos-sheet-execute-import-service-v1.md
```

No schema, migration, API, UI, dependency, Template, or production data change.

## 10. Unresolved Risks & Deferred

- Entity status cannot represent `execution_failed` (schema limitation, documented)
- Content hash not persisted as a column in v1
- Public execute API/UI deferred to Gate 7

## 11. Result

**Gate 6 Execute Import Service Ready for User Review**
