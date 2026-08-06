# QA — WorkOS Sheet Import Review / Approval / Execute UI (Gate 7B, v1)

## 1. Scope

QA for the Gate 7B UI: page/route, authentication UX, client API boundary, upload, dry-run review, entity review, approval, execute confirmation, typed errors, network recovery, history, accessibility, and privacy.

## 2. Components & Routes

- Page: `src/app/(main)/workspaces/project-import/page.tsx`
- Navigation: `src/components/Sidebar.tsx`, `src/components/Topbar.tsx`
- Components under `src/components/project-import/`: workspace, upload panel, dry-run summary, entity review, rows table, approval panel, execute confirmation modal, execution result, history list, batch detail, status badge, error notice
- Shared modal enhancement: `src/components/ui/Modal.tsx` (focus trap, focus restore, dismissible flag)
- Client layer: `src/lib/project-import/client/` (API client, UI types, UI errors, UI state)

## 3. API Calls Used

`createDryRun`, `listBatches`, `getBatchDetail`, `listRows`, `getApprovals` (exported), `approveEntity`, `rejectEntity`, `revokeEntity`, `executeEntity` — all through the narrow client with `x-agent-password`.

## 4. State Architecture

React state groups inside the workspace: auth (password in memory), upload, currentBatch (detail + rows per entity), execution (per-entity busy + result), history, and UI (modals, error). No new state dependency was added. Execution success is only set after HTTP 200; approval updates only after server confirmation.

## 5. Authentication UX Verified

- masked input, `autoComplete="off"`, memory-only (rendering test)
- clear/sign-out clears all session state
- 401 path clears the credential
- no hardcoded password or env key in rendered markup
- no LocalStorage/IndexedDB usage in client code

## 6. Client Boundary Verified

- every client function attaches `x-agent-password` and never includes it in logged body content
- error bodies parse into typed UI errors with safe messages
- network failure is `kind: "network"` (uncertain state), not success
- upload validation (extension, 25 MB) happens before any request
- boundary audit asserts client and component modules never import `@/db/db`, repositories, Gate 6 service, or `better-sqlite3`, and never issue raw `fetch`/SQL

## 7. Accessibility & Scroll

- keyboard file picker and focus-visible styles
- modal focus trap + Escape (blocked during active execution) + focus restore to trigger
- `role="alert"` / `role="status"` semantics; status text alongside color
- shared `Modal` restores `document.body.style.overflow` on close

## 8. Test Results

```text
Gate 7B focused:  2 files / 21 tests passed
Full suite:       73 files / 1014 tests passed
TypeScript:       tsc --noEmit --incremental false -> exit 0
ESLint:           0 errors / 0 warnings in changed files
```

## 9. Build

Production build via the repository-supported Webpack path (`next build --webpack`) is run during verification. The default Turbopack build remains environment-limited in this sandbox (bind-port permission); GitHub Actions is the final default-build validation.

## 10. Privacy Verification

- rendered markup contains no normalized payload, raw cells, SQL, or local paths
- password/agent key never rendered or logged
- API tests confirm no payload leakage in error bodies

## 11. Exact Git Scope

```text
A  src/app/(main)/workspaces/project-import/page.tsx
A  src/components/project-import/ProjectImportWorkspace.tsx
A  src/components/project-import/WorkbookUploadPanel.tsx
A  src/components/project-import/DryRunSummary.tsx
A  src/components/project-import/EntityReviewPanel.tsx
A  src/components/project-import/ImportRowsTable.tsx
A  src/components/project-import/ApprovalPanel.tsx
A  src/components/project-import/ExecuteConfirmationModal.tsx
A  src/components/project-import/ExecutionResultPanel.tsx
A  src/components/project-import/ImportHistoryList.tsx
A  src/components/project-import/ImportBatchDetail.tsx
A  src/components/project-import/ImportStatusBadge.tsx
A  src/components/project-import/ImportErrorNotice.tsx
A  src/lib/project-import/client/projectImportApiClient.ts
A  src/lib/project-import/client/projectImportUiTypes.ts
A  src/lib/project-import/client/projectImportUiErrors.ts
A  src/lib/project-import/client/projectImportUiState.ts
M  src/components/ui/Modal.tsx
M  src/components/Sidebar.tsx
M  src/components/Topbar.tsx
A  tests/unit/projectImportUiClient.test.ts
A  tests/unit/projectImportUiRender.test.tsx
A  docs/project-import/workos-sheet-import-ui-v1.md
A  docs/project-import/qa-workos-sheet-import-ui-v1.md
```

## 12. Browser QA Remaining

Gate 7B is not fully complete from automated tests alone. See the Browser QA checklist in `workos-sheet-import-ui-v1.md`; requires a controlled test workbook, an enabled agent key, and explicit user approval — no automatic production execution.

## 13. Operational Scope Prerequisite

Before Browser QA, the enabled agent key must include:

```text
project_import:read
project_import:dry_run
project_import:approve
project_import:reject
project_import:revoke
project_import:execute
```

or `project_import:*`. Agent-key records are not modified by this Gate.

---

## 14. Gate 7B Browser QA Round 1 — File Selection Hotfix

### User-observed defect (screen recording evidence)

Browser QA at `/workspaces/project-import` with `workos-project-import-browser-qa-02-filled.xlsx`:

- dragging the file into the drop zone turns the border green (`dragenter`/`dragover` fire)
- releasing the file shows no filename or size; the selected-file state stays empty
- the `อัปโหลด / สร้าง Dry Run` button stays disabled
- clicking the drop zone does not open the native file picker

### Root cause

The original `WorkbookUploadPanel` used a `role="button"` div whose click handler called `inputRef.current?.click()` on an `sr-only` (absolutely clipped) file input:

1. The file input was `disabled` whenever the agent password was not yet entered. A disabled file input's `.click()` is a no-op, and the drop handler silently ignored files while disabled, so neither path gave feedback.
2. Programmatic `.click()` on a clipped (`position: absolute; clip`) file input is unreliable across browsers; clicking the visible control did not reliably open the picker.
3. The drag-over visual state fired (green border) while the drop was then ignored/processed through a path that did not reach the workspace state.

### Fix

- Replaced the div with a native `<label htmlFor="project-import-workbook">` so the browser opens the file picker via label activation; the ref `.click()` remains as a cross-browser fallback.
- The file input is never disabled; when the password is missing, the panel explains why instead of failing silently.
- Both the change path and the drop path now call one shared `handleSelectedFile` function (extension/size validation + state update + error reset).
- `dragOver`/`drop` call `preventDefault()` + `stopPropagation()`; drop while disabled shows a safe Thai error.
- The input value is reset only after the File is captured, so the same file can be selected again.
- The disabled Dry Run button now explains the reason: `กรุณาเลือกไฟล์ .xlsx`, `กรุณากรอก Agent Password`, or `กำลังอัปโหลด`.
- Accessibility: label association, keyboard Enter/Space, visible focus, screen-reader label, remove/change action.

### MIME handling

`validateUploadFile` accepts `.xlsx` (case-insensitive) regardless of reported MIME type (standard XLSX MIME, empty, or generic macOS MIME) and rejects `.xls`, `.csv`, multiple files, and files over 25 MB. Server validation remains authoritative.

### Focused interaction tests

Added `tests/unit/projectImportFileSelection.test.ts` (no DOM dependency required; handler-level interaction tests with real `File` objects):

- change path stores a valid file; drop path stores a file with filename/size
- `dragOver` calls `preventDefault`/`stopPropagation`
- invalid file and multiple files rejected safely
- disabled (no password) drop shows a safe error instead of silently ignoring
- input value reset after capture; same file selectable again
- MIME matrix: standard MIME accepted, empty MIME accepted, uppercase `.XLSX` accepted, `.xls`/`.csv` rejected, >25 MB rejected

Result:

```text
Gate 7B file-selection focused tests: 16 interaction tests passed (34 focused UI tests total)
```

### Browser verification status

```text
Gate 7B File Selection Hotfix Ready for User Browser QA
```

Click-selection and drag/drop paths must be re-verified manually in the real page before any Dry Run API call.

---

## 15. Gate 7B Browser QA Round 2 — Browser Autofill Password Sync Defect

### User-observed defect (screen recording evidence)

Second real-browser screen recording confirmed:

1. The Agent Password field visibly displays masked characters (autofilled).
2. A valid `.xlsx` file is dragged from Finder into the upload drop zone.
3. Drag-over activates normally.
4. After drop, the UI shows `กรุณากรอก Agent Password ก่อนเลือกไฟล์`.
5. No filename, size, or clear-file action appears.
6. The Dry Run button remains disabled.

### Root cause

The password input was a **controlled** React input (`value={password}` + `onChange`). Browser autofill writes the value directly into the DOM without always firing React's synthetic `onChange`, so the React `password` state stayed empty while the visible DOM showed the autofilled masked value. Because the upload panel's `disabled` prop was `!hasPassword` (state-based), the drop zone rejected the drop with the password-required error, and the Dry Run button stayed disabled.

### Fix

In `ProjectImportWorkspace`:

- The password input is now **uncontrolled** (`defaultValue=""` + `ref`) with `onInput`/`onChange`/`onFocus`/`onBlur` handlers that sync React state from the DOM. `input` events are fired by browser autofill in mainstream browsers, and focus/blur cover remaining cases.
- `hasPassword` and every action (`refreshBatch`, `loadRows`, `refreshHistory`, `handleUpload`, approve/reject/revoke/execute) read the effective password through `effectivePassword()`, which reads the live DOM value from the ref and syncs state — the DOM is the source of truth.
- The upload panel is no longer disabled by password state; it is disabled only while uploading. Dropping a file is always accepted, and the upload action validates the password with a safe Thai message only when it is genuinely absent.
- `clearSession` and the "ล้าง" button clear both the DOM value and state; a 401 clears both too.
- Password remains memory-only (never stored by WorkOS, never persisted to LocalStorage/IndexedDB).

### Automated coverage added

- Render test: password input renders as `type="password"` with `autoComplete="off"`, uncontrolled `value=""`, and the upload panel/drop zone stays interactive when password state is empty.
- File-selection tests: drop path works regardless of password state; missing password surfaces a safe error at upload time.

Browser-autofill itself cannot be simulated in the Node test environment; it must be verified in a real browser.

### Browser verification status

```text
Gate 7B Autofill Password Sync Fix Ready for User Browser QA
```

Required manual re-verification:

1. Refresh `/workspaces/project-import` with browser autofill enabled.
2. Confirm the password field shows a visibly autofilled masked value.
3. Drop the `.xlsx` file without retyping the password.
4. Filename, size, and clear-file action appear; Dry Run button becomes enabled.
5. Password remains memory-only and is not stored by WorkOS.

---

## 16. Gate 7B Browser QA Round 3 — Agent Password Missing from Dry-Run Upload

### Browser QA evidence (screen recording)

- File selection now passes: filename `workos-project-import-browser-qa-02-filled.xlsx`, size, `ล้าง / เปลี่ยนไฟล์`, and the enabled `อัปโหลด / สร้าง Dry Run` button all appear.
- After clicking Upload, the UI shows `การดำเนินการไม่สำเร็จ / กรุณากรอก Agent Password ก่อนอัปโหลด / รหัส: AUTH_REQUIRED / สถานะ: 401` even though the password field visibly contains an autofilled masked value.

Status:

```text
Gate 7B File Selection Browser QA Passed
Gate 7B Dry Run Browser QA Failed — Agent Password Missing from Upload Request
```

### Confirmed root cause

The header conditionally unmounted the password input once `hasPassword` became true:

```text
hasPassword true → password input removed from DOM → passwordRef.current === null
→ effectivePassword() returned "" at upload time → client AUTH_REQUIRED error
```

The UI "saw" a password (via the ref during render) and enabled the button, but the upload action read a detached ref and produced an empty credential. The value was never sent in `x-agent-password`.

### Fix

- The password input now stays mounted in the DOM at all times (hidden with a `hidden` class once authenticated) so `passwordRef.current` is never detached.
- A single credential accessor `requireEffectivePassword()` (backed by the pure `readEffectivePassword` helper) is called immediately before every privileged action (upload, batch refresh, rows, approve, reject, revoke, execute, history). It reads the live DOM value at action time, never a stale render-time capture.
- Client-side `AUTH_REQUIRED` now uses status 401 to match the authentication contract.
- `createDryRun` sends `x-agent-password` via `fetch` headers with a `FormData` body; `Content-Type` is intentionally not set (browser generates the multipart boundary).

### Tests added

- `readEffectivePassword` returns the DOM value when React state is empty (autofill simulation) and returns null + safe `AUTH_REQUIRED` when DOM is empty; the password value never appears in the error object.
- `createDryRun` sends `x-agent-password` with FormData and does not manually set `Content-Type`.
- Existing file-selection and render tests continue to pass.

### Browser re-verification status

```text
Gate 7B Dry Run Authentication Hotfix Ready for User Browser QA
```

Re-verify up to the Dry Run summary appearing; do not Approve or Execute yet.

### Round 3 re-test result (latest screen recording)

The third recording still shows the same failure after Upload:

```text
การดำเนินการไม่สำเร็จ
กรุณากรอก Agent Password ก่อนอัปโหลด
รหัส: AUTH_REQUIRED
สถานะ: 401
```

with a visibly masked autofilled password. File selection remains passed.

### Follow-up hardening (current code)

- The password input is already permanently mounted (hidden class once authenticated), so the conditional-unmount root cause from Round 3 is fixed in code.
- Added a short polling effect (750 ms) that syncs React state from the live DOM value, catching browsers that autofill asynchronously or after re-renders without firing a React event.
- Added safe dev-only diagnostics that log only presence/length (never the value):
  - `[project-import] upload passwordPresent / passwordLength` at the upload action
  - `[project-import] request headerPresent / url` in the API client
- These diagnostics let the next browser run pinpoint whether the failure is a detached/empty DOM ref or a missing request header without exposing the credential.

Next browser run should confirm `passwordPresent: true` and `headerPresent: true` in the dev console when Upload succeeds.

---

## 17. Project Import Agent Key Scope Setup (Operational)

### Browser QA evidence (Round 4)

The latest real-browser test reached the backend successfully:

```text
POST /api/project-import/dry-runs
403 Forbidden
Code: IMPORT_DRY_RUN_FORBIDDEN
Message: Insufficient permissions
```

This confirms: file selection works, the agent password reaches the backend, authentication succeeds, and the dry-run request is sent correctly. The active Agent Key simply lacked the Project Import scopes.

### Scope setup performed

- Database: `data/workos.db` (local development environment, confirmed)
- Integrity check before change: `ok`
- Agent key: `agent_debugger_local` (Local Debug Agent), enabled
- Scopes before: `tasks:*`, `docs:*`, `events:*`, `attachments:*` (8 scopes) — no project_import scopes
- Missing scopes appended: `project_import:read`, `project_import:dry_run`, `project_import:approve`, `project_import:reject`, `project_import:revoke`, `project_import:execute`
- Backup created: `data/backups/workos-2026-08-06T08-38-38-710Z-before-project-import-scopes.db`
- Method: `scripts/grant-project-import-agent-scopes.ts` (idempotent, append-only, refuses disabled keys, never prints secrets; dry-run + apply modes)
- Scopes after: existing 8 scopes preserved + 6 project_import scopes appended; key remains enabled; verification passed
- Idempotency re-check: `Missing project_import scopes: []` — no further change needed

### Authorization tests

```text
projectImportApiAuthDryRun / Approval / Execute: 3 files / 52 tests passed
Full suite: 74 files / 1033 tests passed
```

### Status

```text
Project Import Agent Key Scopes Ready for Browser QA
```

Re-test: create the Dry Run and confirm the summary appears (Project Documentation rows = 1, Backlog rows = 1), then stop before Approve or Execute.

---

## 18. Gate 7B Dry Run UNKNOWN Error — Request Trace (Hotfix 4)

### Browser QA evidence (Round 5)

Confirmed: file selection, authentication, session indicator, and scope authorization all pass. After clicking Upload, the UI shows:

```text
การดำเนินการไม่สำเร็จ
เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ
รหัส: UNKNOWN
```

No HTTP status is visible in the expanded error details, and the console recording does not prove whether the request reached the backend.

### Request-path findings

- `handleUpload` calls `requireEffectivePassword()` at click time, then `createDryRun(file, effective)`.
- `createDryRun` sends `POST /api/project-import/dry-runs` with `x-agent-password` and a FormData body (no manual Content-Type).
- The route authenticates with `project_import:dry_run`, parses multipart, runs the dry-run service, persists the batch, and serializes the response; every route failure is wrapped in `{ ok:false, error:{ code, message, status } }`.
- Client error normalization had gaps that could surface `UNKNOWN`:
  1. Network rejections were only converted when the TypeError message contained "fetch" (e.g. Safari "Network request failed" fell through).
  2. Non-JSON and empty error bodies had no `HTTP_<status>` fallback.
  3. A successful HTTP response with an invalid/unknown DTO shape fell through to `UNKNOWN`.
  4. Runtime exceptions in the upload handler were rethrown raw instead of receiving a specific client code.

### Error-normalization fix (client)

- `networkError()` now uses `IMPORT_NETWORK_ERROR` and any `TypeError` from `fetch` maps to it regardless of browser wording.
- `apiErrorFromBody(body, status)` supports both `{ error: {...} }` and top-level `{ code, message, status }` envelopes, and falls back to `HTTP_<status>` when no safe code exists.
- Non-JSON error responses become `HTTP_<status>`; unreadable success responses become `IMPORT_INVALID_RESPONSE`.
- Success DTOs are validated per endpoint; an invalid success body becomes `IMPORT_INVALID_SUCCESS_DTO` (never `UNKNOWN`).
- Upload-handler runtime errors are normalized to `IMPORT_CLIENT_ERROR` with a safe message.
- Dev-only diagnostics log only presence/size/status/content-type (never the password or workbook contents): `request headerPresent`, `responseReceived`, `status`, `contentType`.

### Focused tests added

- Nested and top-level error envelopes normalize correctly.
- Empty error body → `HTTP_409`; non-JSON error → `HTTP_502`; 500 keeps its safe code/status.
- Fetch rejection (any wording) → `IMPORT_NETWORK_ERROR`.
- Invalid success DTO → `IMPORT_INVALID_SUCCESS_DTO` (not `UNKNOWN`).
- Password value never appears in error normalization.

```text
projectImportUiClient: 21 tests passed
```

### Browser re-verification required

Use Chrome DevTools Network (Preserve log, filter `dry-runs`) and record: request URL/method, status, `x-agent-password: present`, file field name, response content type, safe response code, and whether a batch ID is returned. Stop after the Dry Run summary appears.

---

## 19. Gate 7B Dry Run Summary and Entity Count Fix (Hotfix 5)

### Browser QA result

The real-browser Dry Run now succeeds:

```text
Workbook parse / Authentication / Authorization / Batch creation / Dry Run summary — Passed
Batch status: ready_for_approval
Project Documentation: ready | Backlog: ready
Total candidate rows: 2 | New: 2 | Duplicate: 0 | Conflict: 0 | Review required: 0 | Invalid: 0 | Warnings/errors: 0
```

Two misleading count defects remained:

1. `skipped = 984` — 492 blank template rows per sheet × 2 sheets were counted as skipped.
2. Project Documentation panel showed "ครอบคลุมแถวใหม่ 2 แถว" using batch-global totals instead of the entity's own 1 new row.

### Root cause

- `dryRunAssembler.assembleEntity` and `dryRunSummary.buildDryRunTotals` computed `skippedRows` as `totalPhysicalRows - totalCandidateRows`, which includes blank template capacity. Blank rows are already skipped before classification by the parser, but they leaked into `skippedRows` and `totalRows`.
- `EntityReviewPanel` fed the batch-global `detail.totals` into each entity's approval panel, so Project Documentation inherited Backlog's rows.

### Fix

- `assembleEntity` now reports `totalRows` as candidate rows only and `skippedRows` as rows classified `skipped` (blank capacity is invisible).
- `buildDryRunTotals.skippedRows` now counts rows with `dryRunStatus === "skipped"`; `totalPhysicalRows`/`totalCandidateRows` reflect candidate rows only.
- `EntityReviewPanel` computes entity-specific counts from that entity's `rows` (new/duplicate/skipped/warnings/errors) instead of `detail.totals`; approval coverage and the execute eligible-row count use the entity's own new rows.

### Focused tests added

- Blank row is ignored: `skippedRows = 0`, `totalCandidateRows = 4`, no persisted skipped rows.
- Whitespace-only rows and 492 blank template rows per sheet: totals stay 4/4/0, batch totals unchanged.
- One candidate row per entity: `project_documentation.newRows = 1`, `backlog.newRows = 1`, total new = 2.
- UI: entity panel renders "ครอบคลุมแถวใหม่ 1 แถว" and never "ข้าม 984" even when batch-global totals contain those numbers.

```text
auditPersistence: 11 tests | UI render: 13 tests
```

### Browser re-verification

Re-run with `workos-project-import-browser-qa-02-filled-parser-safe.xlsx`; expect Total rows 2 / New 2 / Skipped 0, and each entity panel showing New 1 / Approval covers 1. Stop before Approve and Execute.

---

## 20. Gate 7B Entity Row Isolation Fix (Hotfix 6)

### Browser QA result

Batch totals now pass:

```text
Total 2 | New 2 | Duplicate 0 | Conflict 0 | Review required 0 | Invalid 0 | Skipped 0 | Warnings/errors 0
```

Entity isolation failed:

- Both panels displayed "ครอบคลุมแถวใหม่ 2 แถว".
- Both row tables showed `ARBOR-QA-DOC-001` and `ARBOR-QA-BACKLOG-001` together.

Expected per entity: coverage 1, one visible row (`ARBOR-QA-DOC-001` for Project Documentation, `ARBOR-QA-BACKLOG-001` for Backlog).

### Root cause

`ProjectImportWorkspace.loadRows` called `listRows(batchId, password, { ...filter, page, pageSize })` **without `entityType`**. The rows API therefore returned both entities for every request, and each `EntityReviewPanel` rendered the same global row list while entity counts were derived from that mixed list.

### Fix

- `loadRows` now passes `entityType` in the query: `{ ...filter, entityType, page, pageSize: 25 }`.
- The client sends `entityType=project_documentation` / `entityType=backlog` in the rows URL; the API route and repository already filter by `entity_type` (unchanged, verified).
- State remains entity-keyed (`rowsByEntity`), and each panel receives only its own entity's rows, so counts, coverage, and the visible table are isolated.

### Tests added

- Client: `listRows` sends `entityType=project_documentation` / `entityType=backlog` in separate requests, without cross-contamination.
- API: `listRowsApi` returns only the requested entity's rows and the two entity ID sets never overlap.
- UI: Project Documentation panel contains only `ARBOR-QA-DOC-001` (coverage 1) and Backlog panel only `ARBOR-QA-BACKLOG-001` (coverage 1).

```text
Focused: client/render/history/audit 54 tests passed
```

### Browser re-verification

Re-run with the same workbook; expect each entity panel to show coverage 1 with only its own row visible. Stop before Approve and Execute.

---

## 21. Gate 7B.1 Approval Modal Entity Coverage Count Fix

### Browser QA evidence

Entity row isolation now passes (Batch 2 rows; Project Documentation 1 row `ARBOR-QA-DOC-001`; Backlog 1 row `ARBOR-QA-BACKLOG-001`; tables and approval states isolated). The Approval Confirmation Modal still showed `ครอบคลุมแถวใหม่ทั้งหมด 2 แถว` for both entities while the Approval Card showed coverage 1.

### Root cause

- Modal count source: `ProjectImportWorkspace.tsx` Approval Modal rendered `detail?.totals.newRows` — the **batch-global** total (2).
- Approval Card count source: `EntityReviewPanel` uses entity-scoped rows (correct, 1).
- The modal and the card read different sources; only the modal was wrong.

### Fix

- Added `countEligibleNewRows(rows)` helper (new + `proposedOperation === "insert"` within the entity's row page) in `projectImportUiState.ts`.
- Approval Modal now renders `countEligibleNewRows(rowsByEntity[approveTarget])` instead of `detail?.totals.newRows`.
- `EntityReviewPanel` reuses the same helper for `entityCounts.newRows` and `eligibleRowCount`, so the modal, approval card, and execute confirmation agree.

### Tests added

- `countEligibleNewRows`: counts new+insert rows only (duplicate excluded), returns 0 for null.
- Source wiring: modal no longer contains `detail?.totals.newRows`; uses `countEligibleNewRows(rowsByEntity[approveTarget])`; TTL text and no-auto-execute text remain.

```text
Focused (client/render): 39 tests passed
Full suite: 74 files / 1051 tests passed
TypeScript / ESLint / build: passed
```

### Status

```text
Gate 7B Approval Browser QA Passed
```

### Browser QA evidence (user-confirmed, screenshots provided)

**Project Documentation Approval Confirmation Modal:**

- Entity: Project Documentation
- Eligible new rows: 1
- Approval TTL: 30 minutes
- No automatic import after approval
- Post-approval: status `approved`, coverage 1 new row, entity-specific Approval ID, Execute button enabled, external ID `ARBOR-QA-DOC-001`, import status not executed, Target ID none

**Backlog Approval Confirmation Modal:**

- Entity: Backlog
- Eligible new rows: 1
- Approval TTL: 30 minutes
- No automatic import after approval
- Post-approval: status `approved`, coverage 1 new row, separate Approval ID from Project Documentation, Execute button enabled, external ID `ARBOR-QA-BACKLOG-001`, import status not executed, Target ID none

**Regression confirmation:**

- Batch-level total remains 2
- Project Documentation modal uses entity-scoped count = 1
- Backlog modal uses entity-scoped count = 1
- Entity row tables remain isolated
- Approval states remain independent
- Approval IDs remain entity-specific
- Approval does not trigger automatic execution
- No Target ID created; no Execute action occurred

**Automated verification:** focused approval/UI 39/39, full suite 74 files / 1051 tests, TypeScript / ESLint / build passed.

Stop point: do not Execute either entity; do not stage/commit/push until the QA document and current diff scope are reviewed.
