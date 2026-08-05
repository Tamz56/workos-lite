# QA — WorkOS Sheet Audit Foundation (Gate 4A, v1)

## 1. Scope

QA for the three Gate 4A documents:

- `workos-sheet-audit-foundation-v1.md`
- `workos-sheet-audit-schema-proposal-v1.md`
- this report

Docs-only. No code, schema, migration, repository, API, UI, dependency, or data change was made.

## 2. Coverage Verification

| Phase / area | Covered |
| --- | --- |
| Baseline + source inspection | ✅ |
| Audit entity responsibilities | ✅ (5 tables) |
| Batch identity | ✅ Decision 1 |
| Summary vs per-row storage | ✅ Decision 2 |
| Source file identity | ✅ Decision 3 |
| Workbook bytes | ✅ Decision 4 |
| Approval binding | ✅ Decision 5 |
| Approval TTL | ✅ Decision 6 |
| Retention options + recommendation | ✅ Decision 7 |
| Cleanup policy | ✅ Decision 8 |
| Batch lifecycle | ✅ |
| Approval lifecycle | ✅ |
| Execution linkage | ✅ |
| Retry & idempotency | ✅ |
| Normalized payload storage | ✅ |
| Privacy & log redaction | ✅ |
| Retention/deletion semantics | ✅ |
| Indexes & constraints | ✅ |
| Append-only & mutation rules | ✅ |
| User-visible audit history / UI placement | ✅ |
| Failure & recovery scenarios | ✅ |
| Schema proposal (ER, dictionaries, constraints, migration, transactions) | ✅ |
| Owner decision summary | ✅ |
| Decision table | ✅ (in Architecture §15 + schema proposal) |

## 3. Source Contracts Inspected

- Gate 1 contract, Gate 2 parser spec, Gate 3 dry-run spec + QA docs
- `src/lib/project-import/` (parser types, dry-run types, assembler, summary, read-only adapter)
- `src/lib/project-doc-blocks/repository.ts` (provenance columns, hashing)
- `src/db/schema.sql`, `src/db/db.ts` (ensure patterns)
- `planner_import_batches` runtime DDL + planner-import route (existing audit-table precedent; **runtime-only DDL finding documented**)
- `src/lib/backup/housekeeping.ts`, `scripts/backup-db.sh` (retention precedents)

## 4. Consistency with Gates 1–3

- Approval TTL remains 30 minutes, starting at `approved_at` ✅
- Entity approvals remain independent ✅
- Importer v1 remains insert-only (no overwrite/update/delete/unarchive) ✅
- Workbook bytes are **not stored** unless explicitly approved ✅
- Sensitive content is excluded from application logs ✅
- Dry-run classifications (`new/duplicate/conflict/review_required/invalid/skipped`) preserved ✅
- Proposed operations (`insert/none/manual_review`) preserved ✅
- Backlog cross-import idempotency is explicitly tied to the audit foundation (known limitation resolved, not over-claimed) ✅

## 5. Owner vs Technical Separation

- Owner decisions isolated to §15 of the architecture document (retention, row detail volume, sensitive content, success-history retention, approval scope, UI placement, cleanup) ✅
- Technical decisions (column names, types, indexes, JSON, event codes, repository names) are not presented as Owner questions ✅
- Every Owner decision has a recommended default ✅

## 6. No-Change Verification

- No SQL/migration/tables created ✅
- No `src/db/schema.sql` / `src/db/db.ts` modification ✅
- No repository/API/UI/dependency change ✅
- No dry-run/approval/execution persistence ✅
- No production data change ✅
- No stage/commit/push ✅

## 7. Git Scope

Expected: exactly three new documents under `docs/project-import/`.

```text
?? docs/project-import/workos-sheet-audit-foundation-v1.md
?? docs/project-import/workos-sheet-audit-schema-proposal-v1.md
?? docs/project-import/qa-workos-sheet-audit-foundation-v1.md
```

## 8. QA Result

**Pass — Gate 4A design is complete, internally consistent, source-backed, and owner-approved.**

All seven Owner decisions are approved and recorded consistently across the architecture and schema documents:

1. Balanced retention (30 / 90 / 365 days; payload purge at 90 days)
2. Per-row audit of every candidate row
3. Normalized payload stored for execution; workbook bytes never stored; no payload in logs
4. Successful-import summary/provenance retained 365 days
5. Entity-level approval; no row selection in v1
6. Global Import History primary + Project Detail filtered view
7. Gate 4B records retention eligibility only; cleanup deferred and audited

No unresolved Owner blocker remains. Outcome: `Gate 4A Passed / Audit Schema Design Ready`
