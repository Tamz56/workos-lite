# WorkOS Sheet — Gate 8A Execute and Persistence QA Readiness, Backup and Rollback Plan

## 1. Summary

Gate 7B is closed (`PR #36`, merge `f8251d5`). Gate 8A is a read-only source-inspection and readiness-planning task: no Execute, no database write, no backup creation, no source change.

## 2. Next Action

Approve this plan, then run `Gate 8B — Verified Backup Checkpoint and Pre-Execution Baseline` (backup + baseline evidence only; still no Execute).

## 3. Source-Traced Execute Architecture

Call path (verified in source):

```text
UI: ProjectImportWorkspace.tsx → EntityReviewPanel.tsx (Execute button)
  → ExecuteConfirmationModal.tsx (ยืนยันนำเข้าข้อมูล)
  → handleConfirmExecute → executeEntity (client/projectImportApiClient.ts)
  → POST /api/project-import/batches/[batchId]/approvals/[entityType]/execute
  → route.ts (authenticateAndAuthorize "project_import:execute")
  → executeApiApplicationService.ts → executeImportService.ts
  → write adapters (projectDocumentationWriteAdapter / backlogWriteAdapter)
  → db.transaction(...) per entity
  → audit repositories (rows, approvals, attempts, batch lifecycle)
  → response DTO → UI refresh (getBatchDetail + listRows)
```

Exact files:

- UI button: `src/components/project-import/EntityReviewPanel.tsx` (execute button gated by `approvalValid && !alreadyExecuted && !busy && !executing`)
- Confirmation: `src/components/project-import/ExecuteConfirmationModal.tsx` (`ยืนยันนำเข้าข้อมูล` / `ยกเลิก`, non-dismissible while executing)
- Client: `src/lib/project-import/client/projectImportApiClient.ts` → `executeEntity(batchId, entityType, approvalId, password)`; request body `{ approvalId }` only
- API route: `src/app/api/project-import/batches/[batchId]/approvals/[entityType]/execute/route.ts` (nodejs runtime, `project_import:execute` scope)
- Application service: `src/lib/project-import/executeApiApplicationService.ts` (thin wrapper, typed error mapping)
- Execution service: `src/lib/project-import/executeImportService.ts` → `executeApprovedImportEntity`
- Write adapters: `src/lib/project-import/projectDocumentationWriteAdapter.ts` (`insertDocumentationBlock`), `src/lib/project-import/backlogWriteAdapter.ts` (`insertBacklogItem`)
- Revalidation: `src/lib/project-import/executionRevalidation.ts` (project slug/id, doc identity/content hash, backlog exact-content match)

Request/response shape:

- Request: `{ approvalId: "apr-..." }`; batchId/entityType from URL params; actor server-derived
- Success: `{ ok: true, data: { batchId, entityType, approvalId, executionAttemptId, status: "committed", insertedCount, skippedCount, targetRecordIds, startedAt, finishedAt, approvalConsumed, transactionCommitted } }`
- Errors: typed codes → 400/401/403/404/409/500 (see `executeApiSerialization.ts` + `apiErrors.ts`)

## 4. Project Documentation Write Path

- Target table: `project_doc_blocks`
- Adapter: `projectDocumentationWriteAdapter.ts` `insertDocumentationBlock(db, row, batchId)`
- Fields written: `id` (nanoid), `project_id` (from audit row `resolved_project_id`), `import_source='google_sheet'`, `import_batch_id`, `source_row_number`, `source_record_id` (= external_row_id), `block_type`, `title`, `block_date`, `summary`, `details_md`, `evidence_links_json`, `related_files_json`, `next_action`, `status`, `order_index`, `source_type`, `reviewed_by_user`, `created_at`/`updated_at` (server `new Date().toISOString()`)
- Target ID: adapter `nanoid()`; recorded on audit row only after successful insert inside the transaction
- Duplicate safeguards: revalidation inside transaction — identity `(project_id, source_record_id)` match → duplicate/conflict/archived blocks the entity; content-hash match under another identity → stale duplicate
- Transaction boundary: inserts + audit row statuses + approval consumption + attempt finalization in **one** `db.transaction()` per entity (`executeImportService.ts`)
- Audit behavior: `import_batch_rows.execution_status` attempted→committed with `target_record_id`; `import_execution_attempts` started (before tx) → committed (inside tx)
- Other side effects: no project-level Next Action update; no activity log creation (verified: only `project_doc_blocks` + audit tables)

## 5. Backlog Write Path

- Target table: `project_items`
- Adapter: `backlogWriteAdapter.ts` `insertBacklogItem(db, row)`
- Fields written: `id` (nanoid), `project_id`, `title`, `status` (inbox/planned/done only), `priority`, `schedule_bucket`, `start_date`, `end_date`, `is_milestone`, `workstream`, `dod_text`, `notes`; `created_at`/`updated_at` via SQLite `datetime('now')`
- Target ID: adapter `nanoid()`, recorded on audit row inside transaction
- Duplicate safeguards: revalidation — exact stable-field content match in `project_items` blocks the entity (`executionRevalidation.ts` `revalidateBacklogRow`)
- Transaction boundary: same single transaction per entity as Project Documentation
- Audit behavior: same row/attempt/approval linkage
- Other side effects: no Planner item creation, no project Next Action change, no activity log (verified)

## 6. Transaction Boundary

- One atomic transaction per entity (`db.transaction()` in `executeImportService.ts`, lines ~170–229)
- Contents: row revalidation, all eligible inserts, audit row `attempted`/`committed` updates, `consumeApproval`, batch/entity lifecycle, attempt finalize `committed`
- Attempt `started` is appended **before** the transaction; on failure the attempt is finalized `failed_before_write` or `rolled_back` in a separate controlled audit write after rollback
- No partial entity commit is possible; other entity unaffected

## 7. Audit Boundary

- `import_execution_attempts`: one row per attempt; append-only history; terminal states immutable (`auditLifecycle.ts` guards)
- `import_batch_rows.execution_status`: attempted → committed (or rolled_back) only through controlled repository functions
- `import_approvals` + `import_approval_events`: consumed event appended inside the entity transaction; one-time consumption enforced
- `import_batches`: lifecycle advanced (execution_started → executed / partially_executed)

## 8. Active Database Path

`/Users/tamz/projects/workos-lite/data/workos.db`

## 9. WAL / Connection Assessment

- Driver: `better-sqlite3` (synchronous)
- Journal mode: `WAL` (set in `src/db/db.ts` `getDb()`)
- Foreign keys: `ON` at the app connection (`newDb.pragma("foreign_keys = ON")`); the read-only CLI session reports `0` because `PRAGMA foreign_keys` is per-connection — the app connection enforces FKs
- WAL/SHM files present: `data/workos.db-wal` (~4 MB), `data/workos.db-shm` (32 KB)
- Connection lifecycle: module-level singleton (`g.__workosDb`) — a running dev server holds one connection for the process lifetime
- Integrity (read-only check): `PRAGMA integrity_check` = `ok`; `foreign_key_check` = no violations
- Side effects on init: `db.ts` runs `ensureProjectRegistryMetadataColumns` and `ensureAuditSchema` on first connection; no destructive migration
- Safe backup constraint: a plain `cp` of `workos.db` alone while WAL content exists is **not** a consistent snapshot; use SQLite `.backup` or stop the server and copy the db + wal + shm set

## 10. Recommended Backup Procedure

Selected method: **Option B — SQLite `.backup` via the existing `scripts/backup-db.sh`** (repo-approved, already used for prior backups).

Why:

- `.backup` produces a consistent snapshot even with WAL content and an active connection
- Reuses the existing script + retention policy + `data/backups/backup.log`
- Restore path already exists (`scripts/restore-db.sh`)

Precondition:

- Stop the dev server first (avoids app-side schema-ensure side effects and holds a clean connection state); verify no process listens on port 3000

Exact planned commands (Gate 8B, not run now):

```bash
cd /Users/tamz/projects/workos-lite
lsof -nP -iTCP:3000 -sTCP:LISTEN   # expect empty; stop server if present
sqlite3 data/workos.db "PRAGMA integrity_check; PRAGMA foreign_key_check;"
scripts/backup-db.sh               # creates data/backups/workos_YYYYMMDD_HHMM.db
```

Destination pattern: `data/backups/workos_<YYYYMMDD_HHMM>.db` (script-generated)

Verification after backup:

- `PRAGMA integrity_check` on the backup = `ok`
- `PRAGMA foreign_key_check` on the backup = no rows
- Row counts of key tables match pre-backup counts (`projects`, `project_doc_blocks`, `project_items`, `import_batches`, `import_batch_rows`, `import_approvals`, `import_approval_events`, `import_execution_attempts`)
- File size > 0 and matches the live DB size within expected WAL variance

Restore procedure (rollback boundary):

- Stop dev server
- Keep the failed-state DB: `mv data/workos.db data/workos.db.failed_<ts>` (also move `-wal`/`-shm` aside)
- `scripts/restore-db.sh <backup-file>` (moves current aside, copies backup back)
- Remove stale `workos.db-wal`/`workos.db-shm` for the restored file
- Verify `integrity_check` + `foreign_key_check` + key row counts

Limitations:

- Restore reverts the whole database (all audit + business rows created after the backup are lost)
- No point-in-time partial restore; no selective rollback

## 11. Backup Verification Procedure

As above: integrity, foreign keys, row-count parity, file-size check, and a fresh read-only open of the backup file before any Execute.

## 12. Restore Procedure

See §10. Restore is the default rollback mechanism; a verified snapshot taken immediately before Execute is the rollback boundary.

## 13. QA Fixture Assessment

- `workos-project-import-browser-qa-02.xlsx` (in repo): metadata valid (`workbook_id browser-qa-02`, `manual`, `Asia/Bangkok`), but data rows only contain `project_slug = personal-health-routine-tracker-0m8` — no external_row_id/title/data; **not** the batch used in Browser QA
- `workos-project-import-browser-qa-01.xlsx\`.xlsx` (malformed name): contains unsafe test content (Thai external_row_id `สวัสดี`, misspelled slug `สวัดี`, Buddhist-era date `2526-08-08`) — not import-safe
- The Gate 7B Browser QA batch used external IDs `ARBOR-QA-DOC-001` / `ARBOR-QA-BACKLOG-001` with slug `personal-health-routine-tracker-0m8`; that workbook is **not** present under the expected filename in the repo
- Project resolution (read-only): `personal-health-routine-tracker-0m8` → `e52db631-c74f-4b63-a7d6-8d4fae7fecef` (Personal Health Routine Tracker, status planned, created 2026-08-04)
- Existing matches: `project_doc_blocks` for that project = 3; `project_items` = 0; no `ARBOR-QA-*` collisions
- QA safety: project looks like a controlled target, but confirm with the owner that it is QA-safe before Execute
- Malformed filename: real backtick + double extension; housekeeping task separate from Gate 8 (do not rename in this Gate)

## 14. Pre-Execution Evidence Checklist

Capture before any Execute:

- Repository: branch, HEAD, origin/main, ahead/behind, `git status`
- Runtime: dev-server PID/port, Node version, active DB path
- DB health: `integrity_check`, `foreign_key_check`, journal mode
- Project: slug, internal id, title, status
- Doc baseline: total rows, rows for target project, rows matching `ARBOR-QA-DOC-001`, content/archived candidates
- Backlog baseline: total rows, rows for target project, rows matching `ARBOR-QA-BACKLOG-001`, exact-content candidates
- Audit baseline: batch id, audit row counts, execution counts, latest relevant rows
- Batch state: batch id, dry-run id, file hash, entity row counts, approval state/expiry, execution count

All queries are read-only (`PRAGMA query_only=ON` in CLI).

## 15. Exact Execution Order

Default (safe per source — no dependency between entities):

1. Execute Project Documentation only
2. Verify UI result
3. Verify DB persistence (project_doc_blocks +1, target id, fields)
4. Verify audit record (attempt committed, row committed, approval consumed)
5. Refresh browser; verify persistence
6. Confirm Backlog remains not executed
7. Execute Backlog only
8. Verify UI result
9. Verify DB persistence (project_items +1)
10. Verify audit record
11. Refresh browser; verify persistence
12. Confirm no cross-entity write

One entity at a time; no simultaneous execution.

## 16. Post-Execution Verification Checklist

Per entity: UI result status, imported row status, target id, success/error counts, approval state, execute button state, history entry, other entity unchanged; DB row count delta exactly +1 with correct project/external id/fields; no duplicate/unintended update; FKs/integrity pass; audit rows with correct batch/entity/count/target/status/actor/timestamps; after refresh, state persists.

## 17. Refresh Persistence Procedure

Hard refresh after each entity; confirm executed state, target ids, history, approval/execution state unchanged, and the imported record appears in the target project workspace.

## 18. Duplicate Rerun Procedure

- After both entities execute, upload the same workbook again (fresh dry run)
- Expected classification from source: exact duplicates → `duplicate` (doc identity/content-hash; backlog exact-content) → `none`/no insert; no new approval eligibility
- Execute button disabled for the new batch's duplicate rows; approval for the new batch would be blocked (`IMPORT_ENTITY_HAS_NO_ELIGIBLE_ROWS`)
- Expected result: no additional target rows; no duplicate business writes; audit records the new dry-run batch only
- Idempotency: execution is blocked by committed audit state (`EXECUTION_ALREADY_COMPLETED`) on the original batch

## 19. Rollback Triggers

Stop and restore the verified snapshot when any of: backup verification fails, integrity/foreign-key failure, approval coverage mismatch, expired approval, payload hash mismatch, wrong project resolution, pre-existing duplicate before first Execute, response contract mismatch, missing/wrong-entity target id, cross-entity write, missing audit record, row count above expected, partial transaction, refresh loses state, duplicate rerun creates extra rows, or unexplained source/DB drift.

## 20. Stop Conditions

On any trigger: do not retry Execute immediately, do not hand-edit data, do not DELETE rows, do not create additional approvals; capture evidence and report.

## 21. Known Risks

- WAL backup done incorrectly → inconsistent snapshot (mitigated: use `.backup` after stopping the server)
- Dev server holds a singleton connection → schema-ensure side effects on first open (mitigated: stop server before backup; snapshot before Execute)
- Fixture files in repo are not the verified Browser QA batch → Gate 8 requires a corrected/confirmed workbook (housekeeping task)
- Restore reverts the whole database → any post-backup data is lost (accepted boundary; backup taken immediately before Execute)

## 22. Open Questions

- Confirm the exact Gate 8 workbook (the file with `ARBOR-QA-DOC-001` / `ARBOR-QA-BACKLOG-001`) and its filename; decide malformed-name housekeeping separately
- Confirm `personal-health-routine-tracker-0m8` is a QA-safe target before Execute
- Confirm whether to keep the dev server running during Gate 8 verification (recommended: stop for backup, restart for Execute QA)

## 23. Gate 8B Readiness Recommendation

Gate 8A readiness is **passed for planning**; Gate 8B may proceed as: stop dev server → verified `.backup` → pre-execution baseline evidence → then (separate authorization) execute one entity at a time. Fixture correction/housekeeping should be completed before Gate 8B or explicitly approved as-is.

---

## 24. Gate 8A.1 Fixture Resolution

### Owner-approved QA target

- Project title: `GF Trial Lab`
- Project ID: `sYl_7W74AA9ffy65oLbqq`
- Project slug: `gf-trial-lab`
- Owner approval: **Granted** (rationale: trial-lab nature, existing QA documentation, zero backlog items, lowest real-data contamination risk)

### Canonical fixture

- Path: `docs/project-import/templates/workos-project-import-browser-qa-gate-8.xlsx` (untracked)
- SHA-256: `6fd32a040f59b334a4766f9550d05c5632907cd585512393f756ef2261ba084b`
- File size: 42,683 bytes
- Schema version: `workos-field-sheet-v1`
- Workbook ID: `browser-qa-gate-8`
- Batch reference: `Gate 8 Project Import Browser QA`
- Project Documentation external ID: `ARBOR-QA-G8-DOC-001`
- Backlog external ID: `ARBOR-QA-G8-BACKLOG-001`
- Project slug (both rows): `gf-trial-lab`

### Static validation

- Sheets: `00_Metadata`, `01_Project_Documentation`, `02_Backlog`
- Documentation data rows: 1; Backlog data rows: 1; total import rows: 2
- Required fields: complete; enums: valid (`process_note`, `active`, `manual_paste`, `inbox`, `none`, `FALSE`)
- Formulas in import fields: 0; hidden import rows: 0
- Example row: excluded (replaced by QA rows); validation result: **Passed**

### Database collision check (read-only)

- Project resolution: exactly 1 (`gf-trial-lab` → `sYl_7W74AA9ffy65oLbqq`)
- Documentation external ID matches: 0; identity conflicts: 0; content duplicates: 0; archived identity: 0
- Backlog provenance matches: 0; exact-content duplicates: 0
- Collision result: **Passed**

### Programmatic dry run (service-level, same path as API, read-only)

```text
Total: 2 | New: 2 | Duplicate: 0 | Conflict: 0 | Review required: 0 | Invalid: 0 | Skipped: 0 | Warnings: 0 | Errors: 0
Project Documentation: ready — [ARBOR-QA-G8-DOC-001, new, insert, gf-trial-lab]
Backlog: ready — [ARBOR-QA-G8-BACKLOG-001, new, insert, gf-trial-lab]
```

Browser UI Dry Run confirmation remains for the user; the service-level result matches the expected contract exactly.

### Confirmation

- No Approval was created; no Execute occurred; no database write occurred; no backup created; no source modified; no commit/push.
- Deprecated Browser QA workbooks (`browser-qa-01.xlsx\`.xlsx`, `browser-qa-02.xlsx`) remain unchanged and untracked.

### Gate 8B readiness

`Gate 8A.1 Fixture Review — Passed / Gate 8B Backup Checkpoint Ready`

## Gate 8B Verified Backup Checkpoint

### 1. Repository baseline (pre-execution)

```text
Branch: main
HEAD: f8251d57d080f6ab6105e3f1b5eefc70aaca8bcd
origin/main: f8251d57d080f6ab6105e3f1b5eefc70aaca8bcd
Ahead/behind: 0 / 0
Tracked working tree: clean
Untracked: qa-workos-sheet-import-gate-8-readiness.md, workos-project-import-browser-qa-gate-8.xlsx,
          workos-project-import-browser-qa-01.xlsx`.xlsx, workos-project-import-browser-qa-02.xlsx
```

Deprecated Browser QA fixtures untouched.

### 2. Runtime baseline

```text
Node version: v20.20.0 (system; no .nvmrc file present)
Dev server before backup: not running
Port 3000 before backup: no listener
Dev server stopped safely: n/a (was not running)
Dev server after backup: running (next-server PID 18439, port 3000, HTTP 200 at /dashboard after 307 redirect)
```

### 3. Source database health (pre-backup, read-only)

```text
Database path: data/workos.db
Journal mode: wal
Integrity check: ok
Foreign key check: none (0 violations)
Database SHA-256 before backup: 36921b900d83a1882babfda97533a521566c34564a820e2c7b6fa0476b37c031
WAL before backup: present (4.0 MB, hash ec073ffdafacebfd380f6bc4d3ef3e311014d97b6a0e903b799a0fa397e7808b)
SHM before backup: present (32 KB)
```

Note: the approved backup script opens the database read-write for the SQLite `.backup` command; on close SQLite
auto-checkpointed the WAL into the main file (WAL truncated to 0, `data/workos.db` mtime 15:20:55). This is a
physical-layout change only; logical row counts and integrity are unchanged (verified via parity below).

### 4. Domain baseline (pre-backup)

```text
Total projects: 19
gf-trial-lab resolution: sYl_7W74AA9ffy65oLbqq / GF Trial Lab / planned / not seed
Total project_doc_blocks: 28
Total project_items: 144
GF Trial Lab documentation rows: 3
GF Trial Lab backlog rows: 0
ARBOR-QA-G8-DOC-001 matches: 0
ARBOR-QA-G8-BACKLOG-001 matches: 0
Existing Gate 8 batch reference: 0
Import batches (prior QA-02 only): 4
Import batch rows: 8
Import approvals: 4 (prior QA-02 batches; no ARBOR-QA-G8-* bound)
Approval events: 8
Execution attempts: 0
Execution audit rows: 0
Target IDs created: 0
```

### 5. Backup evidence

```text
Backup script: scripts/backup-db.sh (inspected: source data/workos.db, .backup command, dest data/backups,
              pattern workos_YYYYMMDD_HHMM.db, no schema change, no source delete, no auto-restore, exit non-zero on error)
Backup path: data/backups/workos_20260807_1520.db
Created timestamp: 2026-08-07 15:20:55 (local)
Script exit code: 0 (backup.log: [20260807_1520] SUCCESS)
SHA-256: 82577dceb5937765523bdcf14f4761b3223857c5cfd00e6f9be5ff4361cee231
File size: 13,983,744 bytes
Integrity check: ok
Foreign key check: none (0 violations)
Journal mode: wal (backup file)
```

Note: read-only verification opened the backup, which caused SQLite to create untracked accessory files
`data/backups/workos_20260807_1520.db-shm` (32 KB) and `data/backups/workos_20260807_1520.db-wal` (0 bytes).
These are open artifacts only, not part of the backup; they were left in place (no cleanup performed under the
Gate 8B no-cleanup boundary).

### 6. Source-to-backup row-count parity

| Table | Source | Backup | Match |
|---|---:|---:|---|
| projects | 19 | 19 | yes |
| project_doc_blocks | 28 | 28 | yes |
| project_items | 144 | 144 | yes |
| import_batches | 4 | 4 | yes |
| import_batch_rows | 8 | 8 | yes |
| import_approvals | 4 | 4 | yes |
| import_approval_events | 8 | 8 | yes |
| import_execution_attempts | 0 | 0 | yes |
| import_cleanup_log | 0 | 0 | yes |
| GF Trial Lab doc rows | 3 | 3 | yes |
| GF Trial Lab backlog rows | 0 | 0 | yes |
| ARBOR-QA-G8-DOC-001 | 0 | 0 | yes |
| ARBOR-QA-G8-BACKLOG-001 | 0 | 0 | yes |

Parity result: **Passed**

### 7. Restore boundary (recorded, NOT run)

```text
Restore command pattern: bash scripts/restore-db.sh <backupfile>  (exactly 1 argument)
Server-stop requirement: script does not enforce it; operator must stop dev server before restore
Backup path argument: first CLI argument; missing/unknown file exits non-zero
Failed-state copy: yes — current DB moved to data/workos.db.bak_<timestamp> before copy
WAL handling: not handled by script (no delete/move of workos.db-wal)
SHM handling: not handled by script (no delete/move of workos.db-shm)
Post-restore integrity check: none in script (operator should run integrity_check + foreign_key_check)
Data-loss boundary: restore replaces the live DB with the backup snapshot; all writes after backup are discarded
                  (preserved only in the moved workos.db.bak_* copy); stale WAL/SHM must be cleared by the operator
Restore was run: No
```

### 8. Browser UI Dry Run

Executed in the browser UI with the canonical fixture. The UI displayed the expected file hash prefix
`6fd32a040f59` and the Batch Summary matched the contract exactly:

```text
Total: 2 | New: 2 | Duplicate: 0 | Conflict: 0 | Review required: 0 | Invalid: 0 | Skipped: 0 | Warnings: 0 | Errors: 0
Overall batch state: ready_for_approval
Project Documentation status: ready
Backlog status: ready
Execution count: 0
```

Project Documentation panel: external ID `ARBOR-QA-G8-DOC-001`, project slug `gf-trial-lab`, parser valid,
classification new, proposed operation insert, approval state none, eligible new rows 1, import state not
executed, target ID none, execute button disabled.

Backlog panel: external ID `ARBOR-QA-G8-BACKLOG-001`, project slug `gf-trial-lab`, parser valid,
classification new, proposed operation insert, approval state none, eligible new rows 1, import state not
executed, target ID none, execute button disabled.

Entity isolation verified: Project Documentation table contains only `ARBOR-QA-G8-DOC-001`; Backlog table
contains only `ARBOR-QA-G8-BACKLOG-001`; no cross-entity rows displayed.

Metadata recorded by the designed dry-run workflow (read-only database verification):

```text
Batch ID: batch-33a63b80-b5d4-4ab0-83b4-58788e8cdfd3
Dry Run ID: 42003743f870b30019a8088113066a7fc138a7341fde52efcb6530a7ef30f711
Workbook ID: browser-qa-gate-8
Batch reference: Gate 8 Project Import Browser QA
File SHA-256: 6fd32a040f59b334a4766f9550d05c5632907cd585512393f756ef2261ba084b
Batch rows: 2 (project_documentation row-121e2e8e-ba9a-4e24-bfa0-03e82eb84ec1, backlog row-1e33d0f7-56b5-44ab-822b-69c2145c2936)
Approvals: 0 | Approval events: 0 | Execution attempts: 0 | Cleanup log: 0
Target IDs: none
```

### 9. Post-dry-run domain verification

```text
GF Trial Lab documentation rows: still 3
GF Trial Lab backlog rows: still 0
ARBOR-QA-G8-DOC-001 target matches: 0
ARBOR-QA-G8-BACKLOG-001 target matches: 0
Import batches: 5 (4 prior QA-02 + 1 Gate 8 dry run)
Import batch rows: 10 (8 prior QA-02 + 2 Gate 8)
Execution attempts: still 0
Approvals: still 4 (prior QA-02 only)
Domain write result: No domain write
```

### 10. Confirmation

- Browser UI Dry Run performed (metadata only); no Approval occurred; no Execute occurred; no domain database
  write; no restore; no source modification; no stage/commit/push; no Gate 8C execution.
- Backup verified: integrity ok, foreign keys none, source-to-backup row-count parity passed.
- Canonical fixture SHA-256 and size unchanged; deprecated Browser QA fixtures unchanged.
- This document remains untracked; the canonical workbook remains untracked.

### 11. Recommended status

`Gate 8B Backup Checkpoint — Passed / Gate 8C Fresh Approval Ready`

## Gate 8C.1 — Batch Mismatch Incident and Rebind

### 1. Incident summary

During Gate 8C Browser Step A, Project Documentation approval was created against a newer import batch
(`batch-b77764f4-a8a4-4a4f-8f4c-72e5fa3a4523`) than the originally authorized Gate 8C batch
(`batch-33a63b80-b5d4-4ab0-83b4-58788e8cdfd3`). The mismatch was detected in DB verification **before any
Execute**. No domain write occurred; no restore was performed; the approval was left untouched.

### 2. Original authorized batch

```text
Batch ID: batch-33a63b80-b5d4-4ab0-83b4-58788e8cdfd3
Dry Run ID: 42003743f870b30019a8088113066a7fc138a7341fde52efcb6530a7ef30f711
Created: 2026-08-07 08:46:37 UTC
```

### 3. Replacement (current browser) batch

```text
Batch ID: batch-b77764f4-a8a4-4a4f-8f4c-72e5fa3a4523
Dry Run ID: 42003743f870b30019a8088113066a7fc138a7341fde52efcb6530a7ef30f711
Created: 2026-08-07 10:11:55 UTC
```

### 4. Equivalence verification (read-only DB)

| Field | Original | Replacement | Match |
|---|---|---|---|
| Source file hash | 6fd32a04...084b | 6fd32a04...084b | same |
| Dry Run ID | 42003743...f711 | 42003743...f711 | same |
| Workbook ID | browser-qa-gate-8 | browser-qa-gate-8 | same |
| Batch reference | Gate 8 Project Import Browser QA | Gate 8 Project Import Browser QA | same |
| Schema / parser / dry-run contract | workos-field-sheet-v1 / -parser-v1 / -dry-run-v1 | identical | same |
| Source filename / size / mime | gate-8 xlsx / 42683 / xlsx | identical | same |
| Timezone / prepared by | Asia/Bangkok / Tamz | identical | same |
| Total rows / new rows | 2 / 2 | 2 / 2 | same |
| Duplicate / conflict / review / invalid / skipped / warnings / errors | 0 each | 0 each | same |
| Project Documentation row | ARBOR-QA-G8-DOC-001, gf-trial-lab, valid/new/insert, not_started | identical | same |
| Backlog row | ARBOR-QA-G8-BACKLOG-001, gf-trial-lab, valid/new/insert, not_started | identical | same |
| Normalized payload (both entities) | byte-for-byte | byte-for-byte | SAME |

The only header difference is `project_documentation_status` (`ready` vs `approved`), produced by the stopped
approval, and `created_at`.

### 5. Domain no-write confirmation

```text
GF Trial Lab documentation rows: 3 (unchanged)
GF Trial Lab backlog rows: 0
ARBOR-QA-G8-DOC-001 target matches: 0
ARBOR-QA-G8-BACKLOG-001 target matches: 0
Execution attempts (all batches): 0
```

### 6. Existing approval state

```text
Approval ID: apr-cc5835e8-f439-48d7-9925-a50e93c2a3f9
Batch: batch-b77764f4-a8a4-4a4f-8f4c-72e5fa3a4523
Entity: project_documentation
Coverage: 1 eligible row
Approved at: 2026-08-07T10:13:17.758Z
Expires at: 2026-08-07T10:43:17.758Z
Current state: EXPIRED by TTL (verified 2026-08-07T11:01:09Z)
Consumed: false
Revoked: false
Execution authorized with this approval: NO
```

The expired approval is retained as evidence of the stopped round; it must not be used for Execute and a future
fresh approval will receive a different Approval ID.

### 7. Backlog isolation

```text
Backlog approvals (both Gate 8 batches): 0
Backlog execution attempts: 0
Backlog target IDs: none
GF Trial Lab backlog rows: 0
```

### 8. Incidental metadata-only QA-02 batch

```text
Batch ID: batch-a6cf9b7e-cb37-4a58-99a9-4f9c9daefdb5
Source: workos-project-import-browser-qa-02-filled-parser-safe.xlsx (62a8a59c...1b2e)
Rows: 2 (ARBOR-QA-DOC-001, ARBOR-QA-BACKLOG-001; valid/new/insert, not_started)
Domain writes: 0
Execution attempts: 0
Approvals: 0
Cleanup performed: none
Disposition: Incidental metadata-only QA batch — no domain execution; retained as audit evidence; housekeeping
deferred until after Gate 8 closes
```

### 9. Rebind recommendation

```text
Gate 8C Active Batch:     batch-b77764f4-a8a4-4a4f-8f4c-72e5fa3a4523
Superseded Gate 8C Batch: batch-33a63b80-b5d4-4ab0-83b4-58788e8cdfd3
```

The original batch is not invalid or deleted; it is simply no longer the active batch. Rebind is supported because
fixture hash, Dry Run ID, normalized import rows, classifications, warnings/errors, and domain baseline are
equivalent between the two batches.

### 10. Fresh approval preconditions (current state)

```text
Active batch: batch-b77764f4-a8a4-4a4f-8f4c-72e5fa3a4523
Project Documentation eligible rows: 1
Backlog eligible rows: 1
Domain targets: 0 / 0
Execution attempts: 0
Existing Project Documentation approval: expired / excluded from execution
Backlog approval: none
```

No fresh approval was created in this task.

### 11. Confirmation

- No fresh approval, no Execute, no Backlog approval, no restore, no cleanup, no source modification, no
  stage/commit/push, no Gate 8D execution.
- This document remains untracked; canonical workbook and backup unchanged; deprecated fixtures unchanged.

## Gate 8C.2 — Fresh Project Documentation Approval

### 1. Fresh approval (DB verified)

```text
Approval ID:          apr-409d7e58-607f-4455-aaa0-f8ddd0da3138
Previous expired ID:  apr-cc5835e8-f439-48d7-9925-a50e93c2a3f9
Different ID confirmed: yes (browser prefix apr-409d7e58-607f-44... matches)
Active batch:         batch-b77764f4-a8a4-4a4f-8f4c-72e5fa3a4523
Entity:               project_documentation
Coverage:             1 eligible row (ARBOR-QA-G8-DOC-001)
Approved at:          2026-08-07T12:12:52.500Z
Expires at:           2026-08-07T12:42:52.500Z
Remaining TTL:        ~28 minutes (verified 12:15:02Z)
Bound file hash:      6fd32a040f59b334a4766f9550d05c5632907cd585512393f756ef2261ba084b
Bound Dry Run ID:     42003743f870b30019a8088113066a7fc138a7341fde52efcb6530a7ef30f711
Payload/fingerprint:  965164f1b160c5fef984309fe878eb13fdde42268871cf2022c789fa94107813
Consumed:             false
Revoked:              false
Expired:              false
```

### 2. Approval events (fresh only)

```text
Created event:  ape-5586e017-4389-4bc4-8870-0627c8c379ad @ 2026-08-07T12:12:52.500Z
Approved event: ape-2c3ef322-2edf-4661-a919-96c56fb7b206 @ 2026-08-07T12:12:52.500Z
Approval ID match: yes (both bind apr-409d7e58-...)
Batch match: yes (batch-b77764f4-...)
Entity match: project_documentation
Actor: Local Debug Agent (approved event)
```

Events from the expired approval (ape-c267e4c9..., ape-06fa1d8d...) are excluded from this round.

### 3. Backlog isolation

```text
Backlog approvals (active batch):       0
Backlog approval events:                0
Backlog execution attempts:             0
Backlog target IDs:                     none
GF Trial Lab backlog rows:              0
Result:                                 untouched
```

### 4. Domain no-write

```text
GF Trial Lab documentation rows:        3
GF Trial Lab backlog rows:              0
ARBOR-QA-G8-DOC-001 target matches:     0
ARBOR-QA-G8-BACKLOG-001 target matches: 0
Documentation execution attempts:       0
Backlog execution attempts:             0
Domain write result:                    No domain write
```

### 5. Active batch row state

```text
Project Documentation: ARBOR-QA-G8-DOC-001 | gf-trial-lab | valid / new / insert / not_started | target none
Backlog:               ARBOR-QA-G8-BACKLOG-001 | gf-trial-lab | valid / new / insert / not_started | target none
```

### 6. Browser evidence

Modal showed Project Documentation / eligible rows 1 / TTL 30 minutes / no automatic import; post-approval state
approved, coverage 1, Execute enabled, import not executed, target none; Backlog none/disabled; execution count 0.

### 7. Execute readiness

`Gate 8C.2 Fresh Project Documentation Approval — Passed / Execute Ready`

Execute not performed in this task.

## Gate 8C.3 — Project Documentation Execute

### 1. Pre-execute state

```text
Active batch:        batch-b77764f4-a8a4-4a4f-8f4c-72e5fa3a4523
Approval ID:         apr-409d7e58-607f-4455-aaa0-f8ddd0da3138
Approval validity:   valid immediately before Execute (approved 12:12:52.500Z, expires 12:42:52.500Z)
Execute coverage:    1 (ARBOR-QA-G8-DOC-001)
GF Trial Lab docs:   3
GF Trial Lab backlog: 0
Execution attempts:  0 / 0
```

### 2. Execute result

```text
Execution attempt ID: att-dc34b13e-1579-4026-8d44-e247ab3fbb41
Batch:                batch-b77764f4-a8a4-4a4f-8f4c-72e5fa3a4523
Entity:               project_documentation
Approved rows:        1 | Executed rows: 1 (committed) | Skipped: 0 | Failed/rolled back: 0
Started / finished:   2026-08-07T12:20:07.199Z / 2026-08-07T12:20:07.199Z
Status:               committed (transaction_reference att-dc34b13e-...)
Target ID:            FxtEv7aGFBiSiTJTPZUna
Error:                none
```

Browser evidence showed imported rows 1, approval used yes, transaction committed, approval consumed,
execute disabled after execution.

### 3. Domain persistence

```text
GF Trial Lab documentation before/after: 3 → 4
GF Trial Lab backlog before/after:       0 → 0
ARBOR-QA-G8-DOC-001 matches:            exactly 1
ARBOR-QA-G8-BACKLOG-001 matches:        0
Target record:                          project_doc_blocks.id = FxtEv7aGFBiSiTJTPZUna
                                        = import_batch_rows.target_record_id = attempt target mapping
Project ID:                             sYl_7W74AA9ffy65oLbqq (GF Trial Lab)
```

Field mapping vs canonical fixture: block_type process_note; title "Gate 8 QA - Project Import Persistence
Verification"; block_date 2026-08-07; summary, details_md and next_action match fixture; status active;
order_index 1; source_type manual_paste; import_source google_sheet; source_record_id ARBOR-QA-G8-DOC-001;
source_row_number 7; import_batch_id batch-b77764f4-...; reviewed_by_user 1. All match.

### 4. Audit / approval lifecycle

```text
Approval consumed:  true  (consumed_at 2026-08-07T12:20:07.199Z)
Revoked:            false
Reusable:           false
Events (exact):     ape-5586e017 created → ape-2c3ef322 approved → ape-b2eda4e2 consumed
Execution attempt:  exactly 1 (committed, eligible 1, committed 1, skipped 0, rolled back 0)
```

### 5. Backlog isolation / cross-entity boundary

```text
Backlog approvals:           0
Backlog approval events:     0
Backlog execution attempts:  0
Backlog target IDs:          none
ARBOR-QA-G8-BACKLOG-001:     0
GF Trial Lab backlog rows:    0
Planner items for target:    0
Project items for project:   0
Project next_action:         unchanged (empty; projects.updated_at unchanged 2026-07-01)
Write pattern:               doc domain writes 1 / backlog writes 0 / attempts 1 / committed tx 1
Result:                      untouched
```

### 6. Database health + repository state

```text
Integrity:                ok
Foreign key violations:   0
Tracked working tree:     clean
Readiness doc:            untracked
Canonical workbook:       untracked, SHA-256 unchanged
Backup:                   unchanged (82577dce...e231)
Deprecated fixtures:      unchanged
No commit / push / restore / cleanup
```

### 7. Browser refresh persistence

After hard refresh: batch partially_executed, Project Documentation executed, execution count 1, approval
consumed, Execute disabled with already-imported notice, Target ID persists as FxtEv7aGFBiSiTJTPZUna; Backlog
ready / none / not executed / target none. GF Trial Lab Project UI shows the imported QA record
"Gate 8 QA - Project Import Persistence Verification" with summary/details/next action. No edit performed.
Refresh created no additional database write (attempts still 1/0; no new approval; no new record).

### 8. Final status

`Gate 8C.3 Project Documentation Execute — Passed / Gate 8D Backlog Fresh Approval Ready`

## Gate 8D — Backlog Fresh Approval

### 1. Backlog approval (DB verified)

```text
Approval ID:         apr-14f5a991-d4fa-4942-8dab-20c841cb68b8
Active batch:        batch-b77764f4-a8a4-4a4f-8f4c-72e5fa3a4523
Entity:              backlog
Coverage:            1 eligible row (ARBOR-QA-G8-BACKLOG-001)
Approved at:         2026-08-07T12:33:35.897Z
Expires at:          2026-08-07T13:03:35.897Z
Remaining TTL:       ~26 minutes (verified 12:37:42Z)
Bound file hash:     6fd32a040f59b334a4766f9550d05c5632907cd585512393f756ef2261ba084b
Bound Dry Run ID:    42003743f870b30019a8088113066a7fc138a7341fde52efcb6530a7ef30f711
Consumed:            false
Revoked:             false
Expired:             false
```

Browser prefix `apr-14f5a991-d4fa-49...` matches; approval is the newest of the three approvals on the active
batch (expired doc approval, consumed doc approval, new backlog approval).

### 2. Approval events

```text
Created event:  ape-53b5a9b1-bcfa-40c0-bd91-38bc683431de @ 2026-08-07T12:33:35.897Z
Approved event: ape-b7afa85f-7666-4f08-974c-fa8a9df20575 @ 2026-08-07T12:33:35.897Z
Approval ID match: yes (both bind apr-14f5a991-...)
Batch match: yes (batch-b77764f4-...)
Entity match: backlog
Actor: Local Debug Agent (approved event)
```

### 3. Domain no-write

```text
GF Trial Lab documentation rows: 4
GF Trial Lab backlog rows:       0
ARBOR-QA-G8-DOC-001 matches:     exactly 1
ARBOR-QA-G8-BACKLOG-001 matches: 0
Documentation execution attempts: 1
Backlog execution attempts:       0
Domain write from approval:       none
```

### 4. Project Documentation lock

```text
Target ID:            FxtEv7aGFBiSiTJTPZUna (record exists)
Approval:             consumed (12:20:07.199Z)
Execution:            committed
Execution attempts:   1
GF Trial Lab doc count: 4
Changed during Backlog approval: No
```

### 5. Backlog row + cross-entity checks

```text
Backlog row: ARBOR-QA-G8-BACKLOG-001 | gf-trial-lab | valid / new / insert / not_started | target none
Planner items for doc target: 0
Unrelated project_items for GF Trial Lab: 0
Total project_doc_blocks: 29 (no second documentation record)
Project next_action: unchanged (projects.updated_at unchanged)
```

### 6. Execute readiness

`Gate 8D Backlog Fresh Approval — Passed / Backlog Execute Ready`

Backlog Execute not performed in this task. Project Documentation remains locked and untouched.

## Gate 8E — Backlog Execute

### 1. Pre-execute state

```text
Active batch:        batch-b77764f4-a8a4-4a4f-8f4c-72e5fa3a4523
Backlog approval:    apr-14f5a991-d4fa-4942-8dab-20c841cb68b8
Approval validity:   valid immediately before Execute (approved 12:33:35.897Z, expires 13:03:35.897Z)
Execute coverage:    1 (ARBOR-QA-G8-BACKLOG-001)
GF Trial Lab backlog: 0
Backlog execution attempts: 0
```

### 2. Execute result

```text
Execution attempt ID: att-5852652b-816b-4b95-9fd5-99f001a34747
Batch:                batch-b77764f4-a8a4-4a4f-8f4c-72e5fa3a4523
Entity:               backlog
Approved rows:        1 | Executed rows: 1 (committed) | Skipped: 0 | Failed/rolled back: 0
Started / finished:   2026-08-07T12:40:41.424Z / 2026-08-07T12:40:41.424Z
Status:               committed (transaction_reference att-5852652b-...)
Backlog Target ID:    S-40cr1bW_oXxB55sIyCa
Error:                none
```

Browser evidence showed imported rows 1, skipped 0, approval used yes, transaction committed, approval consumed,
execute disabled. Execute modal referenced Backlog / 1 row only.

### 3. Domain persistence + field mapping

```text
GF Trial Lab backlog before/after: 0 → 1
GF Trial Lab documentation before/after: 4 → 4
Backlog target: project_items.id = S-40cr1bW_oXxB55sIyCa = import_batch_rows.target_record_id
Provenance chain: ARBOR-QA-G8-BACKLOG-001 (import_batch_rows.external_row_id) → S-40cr1bW_oXxB55sIyCa → project_items.id
Project ID: sYl_7W74AA9ffy65oLbqq (GF Trial Lab)
Field mapping: title "Gate 8 QA - Verify Project Import Persistence"; status inbox; schedule_bucket none;
priority null; start/end null; is_milestone 0; workstream QA; notes match fixture
```

Note: per the verified backlog write adapter contract, `project_items` has no external-ID column; the
ARBOR-QA-G8-BACKLOG-001 identity is carried by the audit row (`import_batch_rows.external_row_id`), which links
1:1 to the target record.

### 4. Approval lifecycle

```text
Backlog approval consumed: true (12:40:41.424Z) | revoked: false | reusable: false
Events: created (ape-53b5a9b1) → approved (ape-b7afa85f) → consumed (ape-b0cab720)
Documentation approval: consumed (12:20:07.199Z) | revoked: false | reusable: false
No lifecycle events added by refresh (3 events per consumed approval)
```

### 5. Batch final state

```text
Batch status: executed
Project Documentation: executed | Backlog: executed
Total entity execution attempts: 2 (doc att-dc34b13e committed, backlog att-5852652b committed)
Execution count matches UI: 2
```

### 6. Cross-entity / side-effect

```text
GF Trial Lab documentation: 4 | backlog: 1
Documentation targets: 1 | backlog targets: 1
Planner items for either target: 0
Total project_doc_blocks: 29 (no second documentation record)
projects.updated_at for gf-trial-lab: unchanged (2026-07-01)
Unexpected side effects: none
```

### 7. Database health + repository state

```text
Integrity: ok | Foreign key violations: 0
Tracked working tree: clean; readiness doc untracked; canonical workbook + backup hashes unchanged;
deprecated fixtures unchanged; no commit/push/restore/cleanup
```

### 8. Browser refresh + GF Trial Lab UI

After hard refresh: batch executed, both entities executed, execution count 2, both approvals consumed, both
Execute buttons disabled, both target IDs persist (FxtEv7aGFBiSiTJTPZUna / S-40cr1bW_oXxB55sIyCa). GF Trial Lab
UI shows the imported backlog item "Gate 8 QA - Verify Project Import Persistence" (INBOX, exactly one) and the
previous QA documentation record with summary/details/next action intact. No edit performed. Refresh created no
additional write.

### 9. Final status

`Gate 8E Backlog Execute — Passed / Gate 8F Duplicate Rerun Ready`

## Gate 8F — Duplicate Rerun and Idempotency Verification

### 0. Wrong-fixture incident (contained)

First Gate 8F attempt uploaded the QA-02 workbook by mistake
(`batch-f4c62280-1c1a-49c8-a8ad-128d6db8ba7c`, browser-qa-02 / Gate 7B Browser QA Round 1 / hash
62a8a59c...1b2e). Verified metadata-only: 0 approvals, 0 execution attempts, 0 target IDs, 0 domain writes.
Classified `Accidental wrong-fixture dry-run batch — metadata only / no approval / no execution`; retained as QA
evidence, no cleanup during Gate 8. Status: Contained / Canonical Rerun Ready.

### 1. Canonical duplicate rerun batch (DB verified)

```text
Batch ID:         batch-366a670a-7c19-49a1-aba5-670c672e2b42
Created at:       2026-08-07 13:33:10 UTC
Dry Run ID:       42003743f870b30019a8088113066a7fc138a7341fde52efcb6530a7ef30f711 (deterministic, same as canonical)
Workbook ID:      browser-qa-gate-8
Batch Reference:  Gate 8 Project Import Browser QA
File hash:        6fd32a040f59b334a4766f9550d05c5632907cd585512393f756ef2261ba084b
File size:        42683
Schema:           workos-field-sheet-v1
Batch status:     ready_for_approval
Entity status:    project_documentation ready_with_warnings | backlog ready_with_warnings
Batch summary:    Total 2 | New 0 | Duplicate 2 | Conflict 0 | Review required 0 | Invalid 0 | Skipped 0 | Warnings 0 | Errors 0
```

New Batch ID differs from the executed batch (`batch-b77764f4-...`).

### 2. Duplicate classification (DB verified)

```text
Project Documentation: ARBOR-QA-G8-DOC-001 | gf-trial-lab | valid | duplicate | operation none
  validation code: EXISTING_IDENTITY_DUPLICATE | warning 0 | error 0 | target none | not_started
Backlog:               ARBOR-QA-G8-BACKLOG-001 | gf-trial-lab | valid | duplicate | operation none
  validation code: BACKLOG_EXACT_DUPLICATE | warning 0 | error 0 | target none | not_started
Eligible inserts: 0 both entities
```

Classification is entity-specific (no cross-entity matching). Browser confirmed Approve disabled and Execute
disabled for both entities.

### 3. Pre/post counts (official Gate 8F.1 baseline)

```text
                         Before   After   Delta
import_batches:          8        9       +1
import_batch_rows:       16       18      +2
import_approvals:        7        7       0
approval_events:         16       16      0
execution_attempts:      2        2       0
project_doc_blocks:      29       29      0
project_items:           145      145     0
```

Metadata-only rerun confirmed. Domain + audit tables unchanged.

### 4. Domain idempotency + target integrity

```text
GF Trial Lab documentation: 4 | backlog: 1
Documentation target: FxtEv7aGFBiSiTJTPZUna (count 1, updated_at unchanged 12:20:07.202Z)
Backlog target:       S-40cr1bW_oXxB55sIyCa (count 1, updated_at unchanged 12:40:41)
Documentation attempts: 1 | Backlog attempts: 1
Domain writes from rerun: 0
```

### 5. Duplicate guard

```text
New approvals on rerun batch:    0
New approval events:             0
New execution attempts:          0
New target IDs:                  0
Approve blocked:                 yes (UI) | Execute blocked: yes (UI)
```

### 6. `ready_with_warnings` semantic note

Entity status is `ready_with_warnings` while the batch summary reports Warnings 0. Source inspection
(`dryRunAssembler.ts`): entity status becomes `ready_with_warnings` when any row has row-level issues, and
duplicate rows carry informational issue codes (`EXISTING_IDENTITY_DUPLICATE` / `BACKLOG_EXACT_DUPLICATE`);
the batch `warning_count` counts only issues with severity `warning` (0 here). Assessment: status-aggregation
semantics are loose (duplicate informational codes raise entity status to "ready_with_warnings" without any
warning count); cosmetic/semantic terminology issue, not a functional guard defect. Non-blocking for Gate 8F;
recorded for later UX/semantic review.

### 7. Database health

```text
Integrity: ok | Foreign key violations: 0
```

### 8. Final status

`Gate 8F Duplicate Rerun — DB Idempotency Verification Passed / Browser Refresh Ready`

### 9. Browser refresh persistence (final)

After hard refresh, the duplicate-rerun batch (`batch-366a670a-...`) remained loaded with row-level duplicate
state persisted for both entities: Project Documentation and Backlog both show duplicate / operation none /
eligible new rows 0 / approval none / Approve disabled / Execute disabled (UI label "ซ้ำ (ไม่ต้องดำเนินการ)").
Batch-level UI still shows `ready_for_approval` with both entities `ready_with_warnings` and execution 0. The
aggregate 2/0/2 counter card was not visible in the post-refresh screenshots, so row-level evidence is the
basis for duplicate persistence confirmation (noted in browser evidence).

Final post-refresh counts (baseline 8/16/7/16/2/29/145):

```text
                         Expected   Actual   Delta
import_batches:          9          9        0
import_batch_rows:       18         18       0
import_approvals:        7          7        0
approval_events:         16         16       0
execution_attempts:      2          2        0
project_doc_blocks:      29         29       0
project_items:           145        145      0
```

Refresh produced zero metadata/domain writes. Existing targets unchanged (doc updated_at 12:20:07.202Z, backlog
updated_at 12:40:41). Integrity ok, foreign key violations 0. `ready_for_approval` / `ready_with_warnings`
naming on a duplicate-only batch remains a recorded semantic/UX inconsistency for post-Gate-8 review
(non-blocking; functional guards verified).

### 10. Gate 8F closure

`Gate 8F Duplicate Rerun — Passed / Gate 8G Audit and Housekeeping Review Ready`

## Gate 8G — Audit and Housekeeping Review

Review-only. No housekeeping action was performed (no delete, rename, move, restore, stage, commit, push).

### 1. Technical Gate 8 summary

```text
Execute Project Documentation:  passed (committed, target FxtEv7aGFBiSiTJTPZUna)
Execute Backlog:                passed (committed, target S-40cr1bW_oXxB55sIyCa)
Persistence:                    passed (docs 4, backlog 1, refresh-stable)
Audit:                          passed (2 attempts committed, approvals consumed, event trails complete)
Approval consumption:           passed (both consumed, non-reusable)
Entity isolation:               passed (no cross-entity writes, Backlog untouched during Gate 8C)
Refresh persistence:            passed (no refresh write; state stable)
Duplicate classification:       passed (Gate 8F rerun: 2 duplicate / operation none)
Idempotency:                    passed (metadata-only rerun; domain delta 0)
Database health:                passed (integrity ok, foreign keys 0)
```

### 2. Audit inventory

Batches (all 9):

| Batch ID | Created | Workbook | Purpose | Rows | New/Dup | Approvals | Attempts | Targets |
|---|---|---|---|---:|---:|---:|---:|---:|
| batch-0b9a6b37 | 08-06 09:30 | QA-02 | Gate 7B QA (early) | 2 | 2/0 | 0 | 0 | 0 |
| batch-4d816fe2 | 08-06 09:38 | QA-02 | Gate 7B QA (early) | 2 | 2/0 | 0 | 0 | 0 |
| batch-c038418b | 08-06 11:31 | QA-02 | Gate 7B QA approvals | 2 | 2/0 | 2 | 0 | 0 |
| batch-e84a65b7 | 08-06 13:43 | QA-02 | Gate 7B QA approvals | 2 | 2/0 | 2 | 0 | 0 |
| batch-a6cf9b7e | 08-07 08:43 | QA-02 | incidental re-upload | 2 | 2/0 | 0 | 0 | 0 |
| batch-33a63b80 | 08-07 08:46 | Gate 8 | superseded canonical (Gate 8B dry run) | 2 | 2/0 | 0 | 0 | 0 |
| batch-b77764f4 | 08-07 10:11 | Gate 8 | canonical execution (active) | 2 | 2/0 | 3 | 2 | 2 |
| batch-f4c62280 | 08-07 13:09 | QA-02 | wrong-fixture incident | 2 | 2/0 | 0 | 0 | 0 |
| batch-366a670a | 08-07 13:33 | Gate 8 | Gate 8F duplicate rerun | 2 | 0/2 | 0 | 0 | 0 |

Approvals (7):

| Approval ID | Entity | Batch | State | Events | Purpose |
|---|---|---|---|---:|---|
| apr-741d3c8d | doc | c038418b | approved (QA-02, historical) | 2 | Gate 7B history |
| apr-c32376e9 | backlog | c038418b | approved (QA-02, historical) | 2 | Gate 7B history |
| apr-9d8cc58a | doc | e84a65b7 | approved (QA-02, historical) | 2 | Gate 7B history |
| apr-a2a58e4f | backlog | e84a65b7 | approved (QA-02, historical) | 2 | Gate 7B history |
| apr-cc5835e8 | doc | b77764f4 | approved / expired by TTL | 2 | Gate 8C.1 mismatch evidence |
| apr-409d7e58 | doc | b77764f4 | consumed | 3 | Gate 8C.2/8C.3 success |
| apr-14f5a991 | backlog | b77764f4 | consumed | 3 | Gate 8D/8E success |

Execution attempts (2): att-dc34b13e (doc, committed, 1/0/0, 12:20:07) and att-5852652b (backlog, committed,
1/0/0, 12:40:41).

Domain QA records (GF Trial Lab): documentation rows 4 (3 pre-existing + 1 Gate 8); backlog rows 1 (Gate 8).

### 3. Incident register

1. **Batch binding mismatch (Gate 8C.1)** — fresh approval landed on newer canonical batch before Execute;
   stopped, semantic equivalence verified, old approval expired naturally, replacement batch formally rebound,
   fresh approval created. Impact: no domain write before resolution. Contained.
2. **Target ID transcription ambiguity** — Browser-evidence transcripts for both targets differed from DB
   canonical values by 1-2 ambiguous characters; DB chain + refreshed UI confirmed canonical values. Impact:
   evidence transcription only, no data defect.
3. **Wrong fixture upload (Gate 8F)** — QA-02 workbook uploaded instead of canonical; stopped before approval;
   metadata-only batch (batch-f4c62280), no approval/execution/domain write; canonical rerun restarted from
   fresh baseline. Contained.
4. **Duplicate status semantic inconsistency** — duplicate-only batch shows ready_for_approval /
   ready_with_warnings with warning count 0 and 0 eligible rows. Non-blocking; functional guards verified.
   Disposition: post-Gate-8 product backlog candidate.

### 4. Artifact classification

A. Retain as product/audit record: import batch/row/approval/event/attempt metadata, domain QA records (pending
   owner decision).
B. Candidate for Git commit: Gate 8 readiness/QA document; canonical workbook only if repo convention supports
   committed fixtures (repo currently commits the field-sheet template; QA browser fixtures are untracked local).
C. Temporary local QA artifact: malformed QA-01 workbook (`...qa-01.xlsx\`.xlsx`), QA-02 workbook, backup
   WAL/SHM accessories (`workos_20260807_1520.db-wal` 0B, `-shm` 32KB), historical pre-Gate backups, `.DS_Store`.
D. QA domain record requiring owner decision: FxtEv7aGFBiSiTJTPZUna (doc) and S-40cr1bW_oXxB55sIyCa (backlog).
E. Deferred product follow-up: duplicate-only status semantics (`ready_for_approval` / `ready_with_warnings`
   on zero-eligible batch); suggested future state naming like no_action_required / duplicates_only.

### 5. Housekeeping plan (not executed)

- Phase 1 Safe repository cleanup: decide canonical fixture Git disposition; remove malformed/deprecated local
  workbooks only with approval; decide backup accessory cleanup (WAL/SHM + stale backups) with explicit path
  allowlist.
- Phase 2 Documentation closure: finalize readiness doc, prepare commit scope, feature branch + PR.
- Phase 3 QA domain record decision: owner decides retain vs remove Gate 8 QA records in GF Trial Lab.
- Phase 4 Audit metadata: default retain; do not delete batches/approvals/events/attempts for cosmetic
  cleanliness.
- Phase 5 UX follow-up: create later task for duplicate-only status semantics.

Risks: any DB deletion = High (audit chain, FK, provenance); backup accessory cleanup = Low-Medium (verify
backup self-contained first); fixture removal = Low-Medium (evidence loss); doc commit = Low.

### 6. Candidate commit scope (not committed)

```text
Commit (proposal):    docs/project-import/qa-workos-sheet-import-gate-8-readiness.md
                      docs/project-import/templates/workos-project-import-browser-qa-gate-8.xlsx (if fixture convention approved)
Do not commit:        database backup (data/backups/*), WAL/SHM accessories, QA-01 malformed + QA-02 fixtures,
                      QA domain records (live DB data, not Git), source code (no source change in Gate 8)
Owner decision:       QA domain records, canonical fixture disposition, deprecated fixture deletion
```

### 7. Owner decisions (approved)

1. Canonical Gate 8 workbook (`workos-project-import-browser-qa-gate-8.xlsx`): **COMMIT** as reusable
   regression QA fixture (verified across new/approval/execute/persistence/audit/isolation/refresh/duplicate/
   idempotency).
2. Gate 8 QA domain records (FxtEv7aGFBiSiTJTPZUna, S-40cr1bW_oXxB55sIyCa): **RETAIN** in GF Trial Lab as
   stable regression/provenance targets; do not delete/archive/modify during closure; future dedicated
   QA-data cleanup task may reconsider.
3. Deprecated local fixtures (QA-01 malformed, QA-02 workbooks) and backup WAL/SHM accessories:
   **CLEANUP AFTER Gate 8 closure merge** (after commit succeeds, CI passes, PR merged, local main synced);
   explicit allowlist with exact paths required; never delete the verified backup before that point.
4. Verified backup `workos_20260807_1520.db`: **RETAIN until after closure merge**; not a commit candidate.
5. Audit metadata (batches/rows/approvals/events/attempts + wrong-fixture batch): **RETAIN**; no DB cleanup
   merely to reduce row counts.
6. Duplicate-only status semantics (`ready_for_approval` / `ready_with_warnings` on zero-eligible batch):
   **CREATE POST-GATE-8 FOLLOW-UP TASK**; non-blocking; no source change during closure; final status model
   (e.g. duplicates_only / no_action_required) to be selected in that task.

Approved closure commit scope:

```text
Commit:    docs/project-import/qa-workos-sheet-import-gate-8-readiness.md
           docs/project-import/templates/workos-project-import-browser-qa-gate-8.xlsx
Do not commit: deprecated QA-01/QA-02 fixtures, data/backups/* (+ WAL/SHM), live DB files,
               QA domain records, source code, incidental Browser QA artifacts
```

Verified (read-only): tracked working tree clean, no source diff; canonical workbook SHA
6fd32a04...084b; `*.db` and `data/workos.db` are gitignored (backups/live DB excluded from Git by rules).

### 8. Technical closure assessment

```text
Technical Gate 8:      Passed
Housekeeping:          Pending owner decision
Recommended status:    Gate 8G Audit and Housekeeping Review — Passed / Owner Housekeeping Decisions Pending
```
