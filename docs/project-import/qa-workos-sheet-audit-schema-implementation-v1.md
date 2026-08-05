# QA — WorkOS Sheet Audit Schema Implementation (Gate 4B, v1)

## 1. Scope

QA for the six audit tables (including the append-only `import_approval_events`), repositories, persistence service, lifecycle guards, and tests.

## 2. Source Contracts Inspected

- Gate 4A architecture + schema proposal + QA
- Gate 3 dry-run types/result contract, Gate 2 normalized types
- `src/db/schema.sql`, `src/db/db.ts` (init order, PRAGMA, ensure patterns)
- `planner_import_batches` runtime DDL (legacy/schema-drift finding)
- Project Documentation provenance columns, JSON/timestamp/ID conventions

## 3. Schema Verification

- New DB creates all six tables ✅
- `import_approval_events` created with CHECK/FK (RESTRICT) and indexes ✅
- Required columns per table ✅
- Required indexes (18) ✅
- CHECK constraints reject invalid statuses ✅
- FK behavior: RESTRICT for rows/approvals/attempts, SET NULL for cleanup log ✅
- Repeated ensure idempotent ✅
- Canonical `schema.sql` contains all five tables ✅
- Existing DB receives missing tables without touching unrelated tables ✅

## 4. Persistence Verification

- Batch + all candidate rows persisted atomically ✅
- Blank physical rows not persisted (skipped count) ✅
- Normalized payload + issue codes preserved ✅
- Distinct batch IDs for identical results ✅
- Full rollback on row failure ✅
- Workbook bytes not stored ✅
- Sensitive payload not logged ✅
- Source filename sanitized ✅

## 5. Approval Verification

- Per-entity approval; 30-minute TTL from `approved_at` ✅
- Warning-only entities approvable; invalid/conflict/review-required blocked ✅
- Duplicate/skipped rows do not block ✅
- Binding mismatch fails; expired/revoked/consumed cannot be consumed; consume-once ✅
- Independent entity approvals ✅
- Approval creation appends `created`; decisions append `approved`/`rejected`; expiry/revocation/consumption append their events ✅
- Prior approval events remain unchanged; history returns in deterministic append order ✅
- Effective state derives from the latest event and stays consistent with the cached status ✅
- Double consumption cannot succeed (transaction + fresh read) ✅
- Approval errors never expose normalized payload ✅

## 6. Execution & Cleanup Verification

- Attempt numbers deterministic and incrementing ✅
- Finalize transitions guarded ✅
- Safe failure messages only ✅
- Cleanup events append-only; completion guarded; no deletion mutation ✅
- Retention eligibility: 30/90/365 + payload purge 90 ✅
- Payload-purge and batch-deletion eligible queries read-only ✅

## 7. Audit-Only Write Boundary

Business row counts and representative records unchanged after dry-run persistence, approval, execution attempt, and cleanup events. Only the five audit tables changed.

`Audit-only write boundary verified`

## 8. Test & Tool Results

```text
Gate 4B focused:  5 files / 41 tests passed
Full suite:       62 files / 894 tests passed
TypeScript:       tsc --noEmit --incremental false -> exit 0
ESLint:           0 errors / 0 new warnings in Gate 4B files
```

ESLint retains 6 pre-existing `any` warnings in `src/db/db.ts` unrelated to this Gate.

## 9. Build

Production build via the repository-supported Webpack path (`next build --webpack`) is run during verification; default Turbopack build is environment-limited in this sandbox (bind-port permission). GitHub Actions remains the final build validation.

## 10. Exact Git Scope

```text
M  src/db/schema.sql
M  src/db/db.ts
A  src/lib/project-import/auditSchema.ts
A  src/lib/project-import/auditTypes.ts
A  src/lib/project-import/auditIds.ts
A  src/lib/project-import/auditSerialization.ts
A  src/lib/project-import/auditLifecycle.ts
A  src/lib/project-import/auditBatchRepository.ts
A  src/lib/project-import/auditRowRepository.ts
A  src/lib/project-import/auditApprovalRepository.ts
A  src/lib/project-import/auditExecutionRepository.ts
A  src/lib/project-import/auditCleanupRepository.ts
A  src/lib/project-import/auditPersistenceService.ts
A  tests/fixtures/auditTestDb.ts
A  tests/unit/auditSchema.test.ts
A  tests/unit/auditPersistence.test.ts
A  tests/unit/auditApproval.test.ts
A  tests/unit/auditExecutionCleanup.test.ts
A  tests/unit/auditNoBusinessWrite.test.ts
A  docs/project-import/workos-sheet-audit-schema-implementation-v1.md
A  docs/project-import/qa-workos-sheet-audit-schema-implementation-v1.md
```

No API, UI, execute-import, cleanup job, Template v1, or dependency change.

## 11. Unresolved Risks

- Backlog cross-import hard uniqueness deferred (index only).
- Approval history uses the append-only `import_approval_events` table; the cached status column is derived state kept consistent within the same transaction.
- No automatic cleanup or purge (intentional).

## 12. Result

**Gate 4B Audit Schema & Repository Ready for User Review**
