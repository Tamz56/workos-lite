# QA — WorkOS Sheet Parser & Normalization (Gate 2, v1)

## 1. Scope

QA for `src/lib/project-import/`, the fixture generator, parser tests, and the Gate 2 specification.

No database write, project resolution, audit table, schema change, migration, or production data change was made.

---

## 2. Sources Inspected

- `package.json` + `package-lock.json` (dependency state)
- `vitest.config.ts` (test framework)
- `src/lib/project-doc-blocks/validation.ts`, `repository.ts` (enum/date/repository contracts)
- `src/db/db.ts`, `src/db/schema.sql` (`project_doc_blocks`, `project_items` DDL)
- `src/app/api/projects/[slug]/items/route.ts`, `src/app/api/project_items/[id]/route.ts` (zod enums)
- `src/lib/uploadRules.ts` (25 MB cap, `.xlsx` allowed)
- `docs/project-import/` (Template v1 + Gate 1 documents)
- Approved Template v1 workbook (`docs/project-import/templates/workos-project-field-sheet-v1.xlsx`)

---

## 3. Dependency Selection Evidence

Selected: `exceljs@4.4.0` (runtime dependency).

Rejected: `xlsx` (npm 0.18.5) — stale npm release, critical advisories without an npm fix, weaker hidden-row/merge/formula introspection.

Selection criteria: Node 20 compatibility, server-side `.xlsx` parsing, formula detection, hidden row/sheet detection, merged-cell inspection, cell type preservation, date handling, external-link visibility (via zip inspection), macro rejection, maintenance state, TypeScript support, repository fit.

### Dependency audit

`npm audit --omit=dev` reports 14 vulnerable packages. Of these, the entries relevant to Gate 2 are:

- `exceljs` — **moderate**, via `uuid` (npm recommends a breaking downgrade to 3.4.0, which was rejected).
- `yauzl` — **moderate** (off-by-one advisory); `yauzl` is a **pre-existing direct dependency** already used by the backup restore route — not introduced by Gate 2.

The remaining entries (e.g., `next`, `next-auth`/`@auth/core` critical, `lodash`, `minimatch`, `brace-expansion`, `form-data`, `markdown-it`, `linkify-it`, `uuid`, `sharp`, `postcss`) are pre-existing application dependencies unrelated to Gate 2. Full remediation (framework upgrades) is out of scope for Gate 2.

### Test-runner restoration

`vitest` was previously present in `node_modules` but **not declared** in `package.json`; `npm install exceljs` pruned it. It is re-declared as `devDependencies.vitest@^4.1.9` so the 54-file suite remains runnable. Installation required `--legacy-peer-deps` to work around an npm 10 arborist peer-resolution bug (`edgesOut`). This is a test-infrastructure correction, not a parser-library decision.

### Fixture post-processing dependency

`tests/fixtures/projectFieldSheetFixtures.ts` imports `jszip` directly to inject hidden rows, external links, and macro parts into generated workbooks (the `exceljs` writer cannot emit `row hidden` and cannot add those zip parts). `jszip@^3.10.1` is therefore declared as a **direct devDependency** — it must not be relied on transitively.

### Clean-install verification

`npm ci --legacy-peer-deps` was run against the committed `package.json` + `package-lock.json` (793 packages installed). Focused Gate 2 tests, the full suite, TypeScript, and ESLint all passed after the clean install.

---

## 4. Fixtures

All fixtures are **generated in-memory during tests** (no binary fixtures committed) via `tests/fixtures/projectFieldSheetFixtures.ts`, using `example-project-slug` and `TEST-*` IDs only.

| Fixture | Purpose |
| --- | --- |
| `validWorkbook` | valid metadata + doc + backlog rows |
| `workbookWithSchemaVersion` | unsupported schema version |
| `workbookMissingSheet` | missing required sheet |
| `workbookWithUnknownSheet` | unknown extra sheet |
| `workbookWithHiddenSheet` | hidden required sheet |
| `workbookWithMergedCellInDataRange` | merged cell in rows 5+ |
| `workbookWithFormulaInDataRow` | formula in data row |
| `workbookWithDuplicateHeader` / `workbookWithUnknownHeader` | header errors |
| `workbookWithSampleRow` | sample row retained |
| `workbookWithInvalidEnum/Date/AmbiguousDate/Boolean` | row enum/date/boolean errors |
| `workbookWithDuplicateExternalRowId` | duplicate external ID |
| `workbookWithNegativeOrderIndex` / `NonIntegerOrderIndex` | integer errors |
| `workbookWithStartDateAfterEndDate` | date range error |
| `workbookWithOversizedDetails` | details > 200 KB |
| `workbookWithOverRowLimit` | row limit (deterministic, via `options.rowLimit`) |
| `workbookWithHiddenDataRow` | hidden row (XML injection) |
| `workbookWithExternalLink` / `workbookWithMacro` | zip-part injection |
| `unsupportedFileBytes` / `oversizedFileBytes` | file-level errors |

---

## 5. Tests & Results

New focused tests: **36** (parser matrix + no-write).

```text
Test Files  2 passed (2)
     Tests  36 passed (36)
```

Full suite after Gate 2:

```text
Test Files  54 passed (54)
     Tests  823 passed (823)
```

TypeScript: `npx tsc --noEmit --incremental false` → exit 0.

ESLint (changed files only): `npx eslint src/lib/project-import tests/fixtures/projectFieldSheetFixtures.ts tests/unit/projectImportParser.test.ts tests/unit/projectImportNoWrite.test.ts` → exit 0.

---

## 6. No-Write Evidence

- `noWritePerformed: true` asserted in tests.
- Static test asserts parser modules never import `@/db/db`, `@/app/api`, `project-doc-blocks/repository`, or `better-sqlite3`.
- Runtime test asserts `data/workos.db` size and mtime are unchanged by parsing.

---

## 7. File Scope (Gate 2)

```text
M  package.json                         (exceljs runtime dep; vitest devDep)
M  package-lock.json
A  src/lib/project-import/              (8 modules)
A  tests/fixtures/projectFieldSheetFixtures.ts
A  tests/unit/projectImportParser.test.ts
A  tests/unit/projectImportNoWrite.test.ts
A  docs/project-import/workos-sheet-parser-normalization-v1.md
A  docs/project-import/qa-workos-sheet-parser-normalization-v1.md
```

---

## 8. Unresolved Risks

- `exceljs` moderate advisory via `uuid` — accepted with documented mitigation (in-memory parsing only).
- Pre-existing framework advisories (`next`, `next-auth`) remain; remediation is a separate effort.
- Hidden-column inspection and external-link rendering are not covered in v1.
- Strict fail-fast policies (unknown sheet/header, formula, hidden row = error) are intentionally tighter than Gate 1 warnings; documented in the spec.

---

## 9. Result

**Gate 2 Parser & Normalization Ready for User Review**
