# WorkOS Sheet — Execute Import API (Gate 7A, v1)

## 1. Scope

This Gate exposes the Gate 6 internal insert-only Execute Import service through a narrow authenticated HTTP route. It does **not** add Import UI, execute buttons, automatic execution, cleanup, payload purge, or any new business-write path. The Gate 6 service remains the sole business-write authority.

## 2. Route

```text
POST /api/project-import/batches/[batchId]/approvals/[entityType]/execute
Content-Type: application/json
```

- `runtime = "nodejs"`, `dynamic = "force-dynamic"`
- route import has no side effects; database access and execution happen only inside the handler after an authenticated POST
- request body (strict schema — unknown fields are rejected):

```json
{
  "approvalId": "apr-..."
}
```

The client may supply only `batchId`, `entityType`, and `approvalId`. Everything else — file hash, dry-run ID, schema/contract versions, summary fingerprint, normalized payloads, target IDs, approval timestamps, and execution counts — is loaded from persisted audit state. Actor identity is always server-derived.

## 3. Authentication & Authorization

Reuses the existing agent-key boundary (`x-agent-password` + `agent_keys.scopes_json`).

New dedicated capability:

```text
project_import:execute
```

Also allowed: `project_import:*` and `*`.

- anonymous or wrong password → 401 `AUTHENTICATION_REQUIRED`
- disabled agent key → 403 `IMPORT_EXECUTE_FORBIDDEN`
- actor without execute scope (`read`, `dry_run`, `approve`, `reject`, or `revoke` only) → 403 `IMPORT_EXECUTE_FORBIDDEN`
- `project_import:approve` does **not** imply execute and execute does not imply approval capabilities

Complete operational scope set:

```text
project_import:read
project_import:dry_run
project_import:approve
project_import:reject
project_import:revoke
project_import:execute
```

**Operational prerequisite:** before live API QA, the enabled agent key must include `project_import:execute` or `project_import:*`. This Gate does not mutate production agent-key records.

## 4. Request Validation

- `batchId` must match the source-backed batch ID shape (`batch-...`) → else 400 `INVALID_BATCH_ID`
- `entityType` must be `project_documentation` or `backlog` → else 400 `INVALID_IMPORT_ENTITY`
- `approvalId` required and syntactically valid (`apr-...`) → else 400 `INVALID_APPROVAL_ID`
- body must be valid JSON object; malformed JSON or non-object → 400 `INVALID_EXECUTION_REQUEST`
- unknown fields (including `force`, `retry`, `skipValidation`, `override`, or client actor fields) → 400 `INVALID_EXECUTION_REQUEST`

## 5. Success Response

HTTP 200:

```ts
{
  ok: true,
  data: {
    batchId: string
    entityType: "project_documentation" | "backlog"
    approvalId: string
    executionAttemptId: string
    status: "committed"
    insertedCount: number
    skippedCount: number
    targetRecordIds: string[]
    startedAt: string   // ISO 8601 UTC
    finishedAt: string  // ISO 8601 UTC
    approvalConsumed: true
    transactionCommitted: true
  }
}
```

The response never contains normalized payloads, Project Documentation details, Backlog notes, SQL, database paths, approval binding values, or the file hash. Target record IDs are returned because they are required for post-execution navigation and audit.

## 6. Error-to-HTTP Mapping

Gate 6 typed execution errors map deterministically:

| HTTP | Codes |
| --- | --- |
| 400 | `INVALID_IMPORT_ENTITY`, `INVALID_BATCH_ID`, `INVALID_APPROVAL_ID`, `INVALID_EXECUTION_REQUEST`, `EXECUTION_INVALID_ENTITY` |
| 401 | `AUTHENTICATION_REQUIRED` |
| 403 | `IMPORT_EXECUTE_FORBIDDEN` |
| 404 | `EXECUTION_BATCH_NOT_FOUND`, `EXECUTION_APPROVAL_NOT_FOUND` |
| 409 | `EXECUTION_APPROVAL_EXPIRED`, `EXECUTION_APPROVAL_REVOKED`, `EXECUTION_APPROVAL_CONSUMED`, `EXECUTION_APPROVAL_BINDING_MISMATCH`, `EXECUTION_ENTITY_BLOCKED`, `EXECUTION_NO_ELIGIBLE_ROWS`, `EXECUTION_ALREADY_COMPLETED`, `EXECUTION_ALREADY_IN_PROGRESS`, `EXECUTION_STALE_PROJECT`, `EXECUTION_STALE_DUPLICATE`, `EXECUTION_STALE_CONFLICT`, `EXECUTION_STALE_REVIEW_REQUIRED` |
| 500 | `EXECUTION_PROJECT_DOC_INSERT_FAILED`, `EXECUTION_BACKLOG_INSERT_FAILED`, `EXECUTION_AUDIT_UPDATE_FAILED`, `EXECUTION_TRANSACTION_ROLLED_BACK`, `EXECUTION_INTERNAL_ERROR`, `IMPORT_INTERNAL_ERROR` |

500 responses return a stable code and a safe generic message. They never expose the raw cause, SQL, local paths, or payload content. A rollback failure is never reported as success or partial success.

## 7. Stale-State Behavior

The endpoint surfaces Gate 6 stale-state protections: project deleted or slug changed after approval, documentation identity now matching / conflicting / archived, and exact backlog duplicates appearing after approval all return 409 with their typed code. In every stale-state failure:

- no business row is inserted
- the approval is not consumed
- audit rows are not marked committed
- the execution attempt is finalized as `failed_before_write`
- the other entity remains unaffected

## 8. Duplicate-Request Behavior

- first successful request commits the entity, consumes the approval, and returns 200
- the same request repeated after commit → 409 `EXECUTION_ALREADY_COMPLETED`; no duplicate rows are inserted and no second committed attempt is created
- the same request while an attempt is active → 409 `EXECUTION_ALREADY_IN_PROGRESS`
- after a network disconnect, the client should query batch detail/history to inspect the entity execution state, the attempt, and target IDs before resubmitting; blind resubmission is not safe and will be rejected

## 9. Rollback Behavior

The Gate 6 service runs one atomic transaction per entity. If any insert or audit finalization fails, all business inserts, audit row execution changes, and approval consumption roll back. The attempt is finalized as `rolled_back` (or `failed_before_write` for pre-write revalidation failures) in a controlled audit update; the API returns a safe 500 and never a success response.

## 10. Privacy & Logging

Allowed log fields: request ID, batch ID, entity type, approval ID, actor ID, execution attempt ID, safe error code, inserted count, and timestamps.

Forbidden: normalized payloads, documentation details, backlog notes, workbook content, SQL, database paths, stack traces, approval secrets, and raw key/hash values. The route does not log request bodies.

## 11. Known Limitations & Deferred

- no Import UI, execute button, or polling (Gate 7B)
- no idempotency-key system; repeat protection is derived from committed audit state
- GitHub Actions remains the final default (Turbopack) build validation
