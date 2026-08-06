# WorkOS Sheet — Import Review / Approval / Execute UI (Gate 7B, v1)

## 1. Page Route & Navigation

- Route: `/workspaces/project-import`
- Sidebar: "Project Import" under Active Workspaces (active state on `/workspaces/project-import`)
- Topbar: title "Project Import" for the path prefix

## 2. User Flow

```text
Open Project Import
→ Enter temporary agent password for this session
→ Select one .xlsx file
→ Upload and create dry run
→ Display workbook summary
→ Review Project Documentation
→ Review Backlog
→ Resolve any blocked state outside the importer
→ Approve eligible entity
→ Confirm execute
→ Execute entity
→ Display committed result
→ Refresh batch state
→ Repeat for other entity if eligible
→ View history
```

No automatic approval, no automatic execution, and no execution immediately after upload.

## 3. Authentication UX

- Password held in React memory only (current page session)
- masked input (`type="password"`, `autoComplete="off"`)
- clear action and explicit "ออกจากระบบ" (Sign Out) that clears password and all batch state
- 401 clears the in-memory credential and asks the user to authenticate again
- password never stored in LocalStorage / IndexedDB / cookies / URL / logs
- limitation documented in the UI: this is an internal agent-key UI, not full multi-user authentication; a future authentication redesign remains deferred

## 4. API Client Boundary

`src/lib/project-import/client/projectImportApiClient.ts` is the only client path to the backend. It:

- adds `x-agent-password` from React memory per request
- serializes JSON safely and sends multipart uploads
- parses typed error responses
- exposes: `createDryRun`, `listBatches`, `getBatchDetail`, `listRows`, `getApprovals`, `approveEntity`, `rejectEntity`, `revokeEntity`, `executeEntity`
- never imports server modules, never logs the password or request bodies, never persists the password

Supported endpoints:

```text
POST /api/project-import/dry-runs
GET  /api/project-import/batches
GET  /api/project-import/batches/[batchId]
GET  /api/project-import/batches/[batchId]/rows
GET  /api/project-import/batches/[batchId]/approvals
POST /api/project-import/batches/[batchId]/approvals/[entityType]/approve
POST /api/project-import/batches/[batchId]/approvals/[entityType]/reject
POST /api/project-import/batches/[batchId]/approvals/[entityType]/revoke
POST /api/project-import/batches/[batchId]/approvals/[entityType]/execute
```

## 5. Upload Panel

- drag-and-drop + keyboard-accessible file picker (`.xlsx`)
- one file only, ≤ 25 MB, client-side pre-check; backend remains authoritative
- displays filename and size; clear/reset; loading state
- no browser parsing, no Base64, no workbook byte caching; the `File` object is dropped after success
- Thai errors with safe technical code in expandable details

## 6. Dry-Run Summary

Shows sanitized filename, size, file hash excerpt, schema version, workbook ID, batch reference, workbook status, created time, classification counts, warnings/errors, and safe issues. No full hash, no metadata notes, no payloads, no SQL/paths.

Classification semantics:

```text
new              ready
duplicate        no action
conflict         manual review
review_required  manual review
invalid          blocked
skipped          no action
```

`duplicate` is never presented as an error.

## 7. Entity Review

Independent panels for Project Documentation and Backlog, each showing entity status, classification counts, approval state/expiry, execution state, and actions. A blocked entity explains why (invalid/conflict/review-required rows, no eligible rows, expired approval, already executed, in progress). One entity may proceed while the other remains blocked.

## 8. Row Table

Paginated rows API (default 25/page) with columns: source row, external ID, project slug, parser status, classification, proposed operation, issue codes, execution status, target record ID. Filters: classification, errors only. Safe empty/loading/retry states. No normalized payload, no raw cell content, no client-side editing in v1 — users fix data in the workbook/WorkOS and upload again.

## 9. Approval UX

- Approve requires explicit confirmation: entity, eligible new-row count, TTL 30 minutes, covers all eligible new rows, no row selection in v1, no automatic execution
- Reject with optional reason (≤ 200 chars, character counter, trimmed blank → null)
- Revoke requires confirmation and shows effect (execution no longer allowed; other entity unaffected)
- after every action the UI refreshes batch detail and preserves row filters/pages

## 10. Approval TTL

- expiry and remaining time displayed from server timestamps (`expires_at`, `validity_at`)
- client countdown is display-only; the server remains the source of truth
- state is refreshed before execute; effective `expired` returned by the API disables execute and offers re-approval

## 11. Execute Confirmation

Explicit modal before execution with: batch reference, entity, approval ID excerpt, eligible row count, insert-only / no-overwrite / no-update-delete-unarchive statements, stale-state revalidation, atomic transaction, rollback, and network-disconnect warning. Buttons: `ยืนยันนำเข้าข้อมูล` / `ยกเลิก`. During execution buttons are disabled, double-click is prevented, the modal cannot be dismissed, and there is no automatic retry.

## 12. Execute Success

After HTTP 200, the UI shows committed status, entity, inserted/skipped counts, attempt ID excerpt, completion time, target record IDs, approval consumed, and transaction committed, then refreshes batch detail, approvals, and rows. Execute is disabled for the completed entity.

## 13. Typed Error UX

- 401: "การยืนยันตัวตนหมดอายุหรือไม่ถูกต้อง" — clears credential
- 403: "Agent Key นี้ไม่มีสิทธิ์ดำเนินการนี้" (mentions required scope when safe)
- 404: "ไม่พบ Batch หรือ Approval ที่ต้องการ" — refresh history, no blind retry
- 409: mapped by code (already completed → completed state; in progress → block retry + inspect history; expired → re-approval; revoked/consumed → disabled; stale project/duplicate/conflict/review-required/binding mismatch → specific safe explanation)
- 500: "ไม่สามารถดำเนินการนำเข้าได้" with safe code and request ID
- never shows SQL, stacks, paths, payloads, or sensitive text

## 14. Network Failure Recovery

Network failure is not proof of failure:

1. no automatic retry
2. uncertain-state warning
3. refresh batch detail and approvals
4. inspect rows/execution state
5. committed target IDs → show completed
6. active `started` attempt → in-progress / reconciliation required
7. nothing executed and approval still valid → user-controlled retry only after refresh

## 15. Import History

`GET /api/project-import/batches` (page 1, size 10) renders batch reference, filename, created time, workbook status, per-entity statuses, approval/execution summary, and counts. Actions: open batch detail, refresh list. No normalized payload in the list. Project-filtered history remains deferred.

## 16. Accessibility

- keyboard-accessible file picker and visible focus states
- modal focus trap + Escape (disabled during active execution) + focus restored to the trigger
- labels associated with inputs, `role="alert"` notices, `role="status"` loading
- status communicated with text, not color alone
- accessible table headers and descriptive buttons

## 17. Responsive & Scroll Safety

- desktop: primary column + secondary status column (`lg:grid-cols-3`)
- narrow screens: stacked sections
- tables scroll inside their container; page scroll remains functional
- modal uses the shared `Modal` which locks body scroll only while open and restores it on close
- no persistent `overflow: hidden`

## 18. Security / Privacy

- UI writes only through approved APIs; no direct SQLite, repository, or Gate 6 calls
- password memory-only; cleared on reload/sign-out; never displayed or logged
- responses render safe DTO fields only; payloads never reach the client types

## 19. Known Limitations

- internal agent-key UI; not full multi-user authentication
- no row selection in v1; approval covers all eligible new rows
- project-filtered history deferred
- execute target links are ID chips only; safe navigation links deferred

## 20. Browser QA Checklist

1. Open `/workspaces/project-import`
2. Enter agent password (masked); confirm the session indicator
3. Upload Template v1 workbook; confirm dry-run summary
4. Review both entities; confirm counts and classifications
5. Approve one entity; confirm TTL display (30 minutes)
6. Execute with explicit confirmation; confirm success result and target IDs
7. Verify target records exist in WorkOS
8. Refresh the page and confirm history remains (batch persisted server-side)
9. Test expired/revoked/duplicate flows and their safe messages
10. Test modal scroll/responsive behavior on short viewport and narrow width
11. Reload the page and confirm the password field is empty
