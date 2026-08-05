# QA — WorkOS Sheet Execute Import API (Gate 7A, v1)

## 1. Scope

QA for the Gate 7A API boundary: execute route, authorization, request validation, typed error mapping, idempotency, rollback, privacy, and business-write boundaries through the HTTP boundary.

## 2. Sources Inspected

- Gate 5 API layer: `authorization.ts`, `apiErrors.ts`, `apiRouteHelpers.ts`, `apiSerialization.ts`, approval routes/application service
- Gate 6 execution layer: `executeImportService.ts`, `executionErrors.ts`, `executionRevalidation.ts`, `executionResultSerializer.ts`, write adapters
- Gate 5/6 test fixtures: `projectImportApiFixtures.ts`, `executionTestDb.ts`, `executionHelpers.ts`

## 3. Route & Module Layout

- `POST /api/project-import/batches/[batchId]/approvals/[entityType]/execute`
- `src/lib/project-import/executeApiTypes.ts` — request/response DTOs
- `src/lib/project-import/executeApiSerialization.ts` — safe serializer + typed error-to-HTTP mapping
- `src/lib/project-import/executeApiApplicationService.ts` — thin API application service over Gate 6
- route handler validates identifiers/body, derives the actor from auth, and calls the application service

## 4. Authorization

- new capability `project_import:execute`; `project_import:*` and `*` also allowed
- approve/read/dry_run scopes do not imply execute (tested via 403)
- anonymous/wrong password → 401; disabled agent → 403; actor derived server-side

## 5. Request Validation

- malformed batch/entity/approval IDs → 400
- malformed JSON and unknown fields (including `force`, `actorName`) → 400
- strict body schema: only `approvalId` accepted

## 6. Execution Success

- Project Documentation entity executes through the API: business rows inserted with correct provenance, approval consumed, attempt committed, audit rows linked, batch lifecycle updated (tested)
- Backlog entity executes through the API: `project_items` inserted with approved statuses, provenance stays in audit tables (tested)
- wildcard and `project_import:*` scopes execute successfully (tested)

## 7. Conflict & Stale State

Expired, revoked, consumed, binding-mismatch, blocked (invalid/conflict/review-required), missing project, stale documentation duplicate/conflict/archived, and stale backlog duplicate all map to deterministic 409 codes (tested).

## 8. Idempotency

- repeat after commit → 409 `EXECUTION_ALREADY_COMPLETED`, no duplicate rows (tested)
- active `started` attempt → 409 `EXECUTION_ALREADY_IN_PROGRESS` (tested)

## 9. Rollback & Privacy

- injected insert failure → safe 500 with `EXECUTION_PROJECT_DOC_INSERT_FAILED`; no business rows; approval unconsumed; audit target IDs null; attempt `rolled_back` (tested)
- responses contain no payload text, SQL, sqlite errors, stack traces, or local paths (tested)
- route import has no database side effect (tested)

## 10. Business-Write Boundary

Execution changes only the approved business table for the executed entity plus approved audit tables. `projects`, `project_items` (for Project Documentation execution), and the other entity remain untouched (tested).

```text
Gate 7A execute write boundary verified: project_doc_blocks / project_items + approved audit tables only
```

## 11. Test Results

```text
Gate 7A focused:  1 file / 33 tests passed
Full suite:       71 files / 993 tests passed
TypeScript:       tsc --noEmit --incremental false -> exit 0
ESLint:           0 errors / 0 warnings in changed files
```

## 12. Build

Production build via the repository-supported Webpack path (`next build --webpack`) exits 0. The default Turbopack build remains environment-limited in this sandbox (bind-port permission). GitHub Actions is the final default-build validation.

## 13. Exact Git Scope

```text
A  src/app/api/project-import/batches/[batchId]/approvals/[entityType]/execute/route.ts
A  src/lib/project-import/executeApiTypes.ts
A  src/lib/project-import/executeApiSerialization.ts
A  src/lib/project-import/executeApiApplicationService.ts
M  src/lib/project-import/authorization.ts
M  src/lib/project-import/apiRouteHelpers.ts
M  tests/fixtures/projectImportApiFixtures.ts
A  tests/unit/projectImportApiExecute.test.ts
A  docs/project-import/workos-sheet-execute-api-v1.md
A  docs/project-import/qa-workos-sheet-execute-api-v1.md
```

## 14. Risks & Deferred

- no UI (Gate 7B); no idempotency-key system; no cleanup/automatic execution
- operational prerequisite: agent key must gain `project_import:execute` in controlled environment setup
