# QA — WorkOS Sheet Dry-Run & Approval API (Gate 5, v1)

## 1. Scope

QA for the Gate 5 API boundary: routes, application services, authorization, serializers, and focused tests.

## 2. Sources Inspected

- Gate 2 parser, Gate 3 dry-run assembler/types, Gate 4B audit repositories/services
- `/api/agent/execute` (auth pattern), `/api/backup/restore` (upload pattern), `uploadRules.ts`
- `agent_keys` runtime rows, Next.js route conventions, Zod/pagination conventions

## 3. Authentication & Authorization Boundary

- Reuses the agent-key boundary (`x-agent-password` + `agent_keys.scopes_json`) — no invented user system
- Actor server-derived; client spoofing ignored (tested)
- Capability scopes enforced; read-only actor cannot approve (tested)
- Limitation documented: current agent key lacks `project_import:*` scope (operational step required)

## 4. Upload Validation

- exactly one file; `.xlsx`; ≤ 25 MB before parsing; Buffer parsing only
- file-level failures return `WORKBOOK_PARSE_FAILED` without a batch; safely parsed invalid workbooks persist as `dry_run_invalid`
- workbook bytes never stored; sensitive payload absent from responses/logs

## 5. Serializer Safety

- dry-run/list/detail/row/approval/error responses contain no normalized payload, raw cell values, sqlite errors, stack traces, or local paths (tested)
- file hash exposure limited to a 12-character excerpt

## 6. Approval Lifecycle

- approve eligible entity (TTL 30 min), independent entities, idempotent repeat, blocked/no-eligible-rows errors, reject/revoke append events, GET reports expiry without mutation (tested)

## 7. Test Results

```text
Gate 5 focused:  3 files / 26 tests passed
Full suite:      67 files / 920 tests passed
TypeScript:      tsc --noEmit --incremental false -> exit 0
ESLint:          0 errors / 0 new warnings in Gate 5 files
```

## 8. Audit-and-Approval-Only Write Boundary

API-level operations (upload, approve, reject) change only audit/approval tables; `projects`, `project_doc_blocks`, and `project_items` remain unchanged.

`Gate 5 audit-and-approval-only write boundary verified`

## 9. Build

Production build via the repository-supported Webpack path (`next build --webpack`) is run during verification; the default Turbopack build remains environment-limited in this sandbox (bind-port permission). GitHub Actions is the final default-build validation.

## 10. Exact Git Scope

```text
A  src/app/api/project-import/dry-runs/route.ts
A  src/app/api/project-import/batches/route.ts
A  src/app/api/project-import/batches/[batchId]/route.ts
A  src/app/api/project-import/batches/[batchId]/rows/route.ts
A  src/app/api/project-import/batches/[batchId]/approvals/route.ts
A  src/app/api/project-import/batches/[batchId]/approvals/[entityType]/approve/route.ts
A  src/app/api/project-import/batches/[batchId]/approvals/[entityType]/reject/route.ts
A  src/app/api/project-import/batches/[batchId]/approvals/[entityType]/revoke/route.ts
A  src/lib/project-import/apiErrors.ts
A  src/lib/project-import/apiTypes.ts
A  src/lib/project-import/apiSerialization.ts
A  src/lib/project-import/apiRouteHelpers.ts
A  src/lib/project-import/authorization.ts
A  src/lib/project-import/dryRunApplicationService.ts
A  src/lib/project-import/approvalApplicationService.ts
A  src/lib/project-import/importHistoryService.ts
A  tests/fixtures/projectImportApiFixtures.ts
A  tests/unit/projectImportApiAuthDryRun.test.ts
A  tests/unit/projectImportApiApproval.test.ts
A  tests/unit/projectImportApiHistoryPrivacy.test.ts
A  docs/project-import/workos-sheet-dry-run-approval-api-v1.md
A  docs/project-import/qa-workos-sheet-dry-run-approval-api-v1.md
```

No UI, execute-import, consumption, cleanup, Template v1, or dependency change.

## 11. Unresolved Risks & Deferred

- Current agent key needs `project_import:*` scope (ops action)
- No multi-user auth (documented limitation)
- Project-filtered history uses EXISTS subquery; UI and Execute Import deferred

## 12. Result

**Gate 5 Dry-Run & Approval API Ready for User Review**
