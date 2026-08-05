# QA — WorkOS Sheet Dry-Run (Gate 3, v1)

## 1. Scope

QA for the Gate 3 dry-run layer: `dryRunTypes.ts`, `readOnlyAdapter.ts`, `projectResolver.ts`, `projectDocumentationClassifier.ts`, `backlogClassifier.ts`, `dryRunSummary.ts`, `dryRunAssembler.ts`, plus fixtures and tests.

No database write, schema change, migration, API route, UI, or production data change was made.

---

## 2. Sources Inspected

- Gate 2 parser modules (`workbookParser.ts`, normalizers, `types.ts`)
- `src/lib/project-doc-blocks/hashing.ts`, `mappers.ts`, `repository.ts`
- `src/db/db.ts` (module-level schema ensures confirmed — the reason `@/db/db` is avoided)
- `src/db/schema.sql`
- Gate 1 decision documents + Template v1

---

## 3. Read-Only Database Boundary Decision

**Selected:** dedicated `better-sqlite3` read-only connection (`{ readonly: true, fileMustExist: true }`) + narrow `DryRunReadAdapter` with SELECT-only queries. Tests inject isolated in-memory databases.

**Rejected:** reusing `@/db/db` or repository read functions — importing them runs schema ensures (`ALTER TABLE`/`CREATE TABLE`) at module initialization, which violates the no-write guarantee on databases missing columns.

---

## 4. Test Database Strategy

`tests/fixtures/dryRunTestDb.ts` builds an isolated in-memory SQLite database with the exact `projects`/`project_doc_blocks`/`project_items` column sets used by classification, plus deterministic seed helpers. No production database is touched.

Fixture scenarios cover: exact slug, case-different slug, unknown slug; doc no-match / active duplicate / same-identity conflict / archived identity / same-content-different-external-id; backlog no-match / exact duplicate / similar row / repeated external id / wider status.

---

## 5. Focused Tests

```text
Test Files  2 passed (2)
     Tests  24 passed (24)
```

Coverage: project resolution, Project Documentation classification (new/duplicate/conflict/review_required/invalid), Backlog classification (new/duplicate/invalid), entity independence, warnings-not-errors, totals invariants, deterministic dry-run ID, database-unavailable, malformed parser input, no-write.

---

## 6. Full Suite

```text
Test Files  56 passed (56)
     Tests  847 passed (847)
```

---

## 7. TypeScript & ESLint

- `npx tsc --noEmit --incremental false` → exit 0
- ESLint on all changed TypeScript files → exit 0

---

## 8. No-Write Evidence

- Static: dry-run modules contain no write SQL and never import `@/db/db`/API routes/write services.
- Runtime: isolated DB business-row counts and representative records unchanged; no `import_batches` table created; fixture workbook bytes unchanged.
- Readonly connection test: SELECT works, INSERT throws `SQLITE_READONLY`, file size/mtime unchanged.

---

## 9. Exact Git Scope

```text
A  src/lib/project-import/dryRunTypes.ts
A  src/lib/project-import/readOnlyAdapter.ts
A  src/lib/project-import/projectResolver.ts
A  src/lib/project-import/projectDocumentationClassifier.ts
A  src/lib/project-import/backlogClassifier.ts
A  src/lib/project-import/dryRunSummary.ts
A  src/lib/project-import/dryRunAssembler.ts
M  src/lib/project-import/validationIssues.ts
A  tests/fixtures/dryRunTestDb.ts
M  tests/fixtures/projectFieldSheetFixtures.ts
A  tests/unit/projectImportDryRun.test.ts
A  tests/unit/projectImportDryRunNoWrite.test.ts
A  docs/project-import/workos-sheet-dry-run-v1.md
A  docs/project-import/qa-workos-sheet-dry-run-v1.md
```

No schema, migration, API, UI, Template v1, or unrelated file changed.

---

## 10. Unresolved Risks

- Backlog cross-import idempotency deferred until audit foundation (Gate 4).
- Backlog `conflict` classification intentionally absent in v1.
- Advisory similarity detection is exact title+date only.

---

## 11. Result

**Gate 3 Validation & Dry Run Ready for User Review**
