# WorkOS Sheet Importer — Readiness Checklist v1

## A. Ready Before Coding

Gate 1 policy decisions are **complete and owner-approved**. No unresolved owner blockers remain.

Approved baseline:

1. Import mode: dry run + human approval + insert-only; no overwrite/delete/create.
2. Approval TTL: 30 minutes; bound to file hash, schema version, dry-run ID, entity worksheet; per-entity approvals independent.
3. Operational limits: 5,000 data rows per worksheet; `details` ≤ 200 KB; over-limit → error; no silent truncation.
4. Backlog provenance: audit-table-only; no `project_items` columns; no notes embedding.
5. Archived Project Documentation records: `review_required`; no auto-recreate/unarchive.
6. Update support: deferred to importer v2; v1 insert-only.

Remaining pre-coding item is technical, not owner-level:

- Spreadsheet library selection (Gate 2 technical comparison) and dependency approval evidence.

## B. Required During Implementation (importer task)

1. **Parser selection (Gate 2)**: short technical comparison of spreadsheet libraries (server-side compatibility, security, maintenance, workbook feature handling, repository fit); choose one; record dependency approval evidence.
2. Create `src/lib/project-field-import/` modules: `types.ts`, `workbook.ts`, `normalization.ts`, `validation.ts`, `fingerprint.ts`, `preview.ts`, `audit.ts`.
3. Entity adapters: `entities/project-doc-blocks.ts`, `entities/backlog-items.ts`.
4. Workbook parser wiring: sheet detection, header row 5 contract, metadata read.
5. Normalization: Thai/English headers, dates `YYYY-MM-DD`, booleans, multiline, link lists, formula cached values.
6. Validation layers: file / sheet / row / database, including approved limits (5,000 rows/worksheet, `details` ≤ 200 KB, no truncation).
7. Duplicate & conflict detection per Gate 1 Decision 2.
8. Project resolution (exact case-sensitive slug, unknown → error).
9. Dry-run service producing the Gate 1 contract result, no-write guaranteed.
10. Approval flow: hash-bound, 30-minute expiry, per-entity, human-only.
11. Import execution: per-entity transaction + rollback; audit record + per-row results persisted.
12. Provenance: generic `import_batches` audit table (schema change executed in importer task); audit links batch, worksheet, external row ID, target item ID, file hash, import timestamp, dry-run and approval references.
13. Tests: parser, normalization, validation, limits, duplicates, dry-run no-write, import rollback, idempotent retry, archived-record policy.
14. Security: 25 MB cap, file handling via uploads pattern, generic errors, no sensitive logging.
15. Documentation updates (importer design + ops checklist).

## C. Deferred Beyond Importer v1

1. Update/overwrite mode (importer v2) with a dedicated contract.
2. Delete support (rejected for v1).
3. Unarchive support (rejected for v1).
4. Archived-record restoration and replacement workflows.
5. Backlog provenance columns on `project_items` (future schema decision).
6. Hidden-row/unknown-sheet policies remain warning-based; stricter modes considered in v2.
7. Row-level partial import inside an entity batch.
8. Cross-sheet single approval.
9. Fuzzy project matching or aliases (rejected for v1).
10. Direct Google Sheets connection (file upload only in v1).
