# QA — WorkOS Sheet Contract Gate 1 (v1)

## 1. Scope

QA for `docs/project-import/workos-sheet-contract-gate-1-v1.md` and `docs/project-import/workos-sheet-importer-readiness-checklist-v1.md`.

This gate is documentation-only. No importer, API route, schema change, migration, dependency, or data change was made.

---

## 2. Coverage Verification

| Requirement | Verified |
| --- | --- |
| Both import flows covered (Project Documentation + Backlog) | ✅ |
| Import mode (Decision 1) | ✅ |
| Duplicate detection per entity (Decision 2) | ✅ |
| Provenance contract per field (Decision 3) | ✅ |
| Project resolution + case-sensitivity justification (Decision 4) | ✅ |
| Validation severity model (Decision 5) | ✅ |
| Dry-run result contract + status vocabulary (Decision 6) | ✅ |
| Approval gate (Decision 7) | ✅ |
| Transaction/failure policy (Decision 8) | ✅ |
| Insert vs update policy (Decision 9) | ✅ |
| Workbook safety rules (Decision 10) | ✅ |
| Parsing library readiness (Decision 11) | ✅ |
| API/repository reuse boundary (Decision 12) | ✅ |
| Security & operational risks (Decision 13) | ✅ |
| Gate 1 decision table (Decision 14) | ✅ |
| Importer readiness checklist (3 buckets) | ✅ |

---

## 3. Source Contract Verification

Rules were checked against current `main` source, not only prior summaries:

| Claim in gate doc | Source evidence |
| --- | --- |
| 9 block types, 6 source types, `google_sheet` import source, `active`/`archived` | `src/lib/project-doc-blocks/validation.ts` |
| `resolveProjectId`/`findDuplicateCandidates`/create/insert/update/archive/restore | `src/lib/project-doc-blocks/repository.ts` |
| Content-hash semantics | `src/lib/project-doc-blocks/hashing.ts` |
| Doc-blocks DDL (provenance columns) | `src/db/db.ts`, `src/db/schema.sql` |
| Backlog status CHECK (3) and schedule_bucket CHECK (4) | `src/db/db.ts`, zod in items routes |
| Case-sensitive slug resolution | `WHERE slug = ?` in repository + routes; `projects.slug` UNIQUE TEXT |
| 25 MB upload cap + `.xlsx` allowed | `src/lib/uploadRules.ts` |
| No spreadsheet parser installed | `package.json` + `node_modules` scan |

---

## 4. Consistency Checks

- Approved rules do not contradict current source enums or CHECK constraints. ✅
- No unsupported assumption is presented as approved fact — items without source confirmation are marked `Deferred` or `Approved with limitation`. ✅
- Deferred items are explicit and listed in the readiness checklist. ✅
- No claim that any implementation was performed. ✅
- Sample-row, hidden-row, formula, and unknown-sheet policies align with the Template v1 contract. ✅

---

## 5. No-Change Verification

- No importer created ✅
- No API route / UI added ✅
- No schema/migration/DB change ✅
- No dependency installed ✅
- No stage/commit/push ✅

---

## 6. Git Scope

Expected: exactly three new untracked documents under `docs/project-import/`.

```text
?? docs/project-import/workos-sheet-contract-gate-1-v1.md
?? docs/project-import/qa-workos-sheet-contract-gate-1-v1.md
?? docs/project-import/workos-sheet-importer-readiness-checklist-v1.md
```

---

## 7. QA Result

**Pass — Gate 1 documentation is internally consistent and source-backed.**

All six previously blocking owner decisions were approved and recorded in the gate document:

1. Spreadsheet parsing dependency — approved; library selection deferred to Gate 2 as a technical task.
2. Approval TTL (30 minutes) and per-entity approval scope — approved.
3. Operational limits (5,000 rows/worksheet; `details` ≤ 200 KB; no silent truncation) — approved.
4. Backlog provenance — audit-table-only; no `project_items` columns; no notes embedding — approved.
5. Archived Project Documentation records — `review_required`; no auto-recreate/unarchive — approved.
6. Update support — deferred to importer v2; v1 insert-only — approved.

No unresolved owner blockers remain. No implementation is presented as completed.
