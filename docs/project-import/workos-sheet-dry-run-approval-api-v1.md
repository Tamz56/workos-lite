# WorkOS Sheet — Dry-Run & Approval API (Gate 5, v1)

## 1. Scope

This Gate exposes the existing parser, dry-run engine, audit repositories, and approval services through narrow HTTP API routes. It does **not** execute imports, write business tables, create UI, consume approvals, or run cleanup.

## 2. Route Tree

```text
POST /api/project-import/dry-runs
GET  /api/project-import/batches
GET  /api/project-import/batches/[batchId]
GET  /api/project-import/batches/[batchId]/rows
GET  /api/project-import/batches/[batchId]/approvals
POST /api/project-import/batches/[batchId]/approvals/[entityType]/approve
POST /api/project-import/batches/[batchId]/approvals/[entityType]/reject
POST /api/project-import/batches/[batchId]/approvals/[entityType]/revoke
```

All routes: `runtime = "nodejs"`, `dynamic = "force-dynamic"`. Route import has no side effects; database access happens inside handlers.

## 3. Authentication & Authorization

WorkOS-Lite has no full multi-user system. The safest source-backed boundary is the existing **agent-key boundary**:

- header `x-agent-password` must equal `AGENT_UI_PASSWORD` (env)
- server derives the actor from `AGENT_KEY` → `agent_keys` lookup (hash, `is_enabled=1`)
- capability scopes from `agent_keys.scopes_json`: `project_import:read`, `project_import:dry_run`, `project_import:approve`, `project_import:reject`, `project_import:revoke` (plus `*` / `project_import:*`)
- actor identity (`approved_by` etc.) is always server-derived; client body never supplies identity
- errors: `AUTHENTICATION_REQUIRED` (401), `IMPORT_READ_FORBIDDEN` / `IMPORT_DRY_RUN_FORBIDDEN` / `IMPORT_APPROVAL_FORBIDDEN` (403)

**Operational note:** the current agent key has no `project_import:*` scope; operators must add it before enabling the API.

## 4. Dry-Run Upload (`POST /dry-runs`)

- multipart field `file`; exactly one file; `.xlsx` extension; ≤ 25 MB
- workbook bytes are never persisted or written to permanent disk (Buffer parsing only)
- server computes the file hash; client cannot supply hash/IDs/classifications
- flow: auth → multipart validation → read Buffer → parse+normalize → read-only dry run → atomic audit persistence (batch + all candidate rows) → safe response
- file-level failures (unreadable/macro/external-link) → `WORKBOOK_PARSE_FAILED` with **no batch persisted**; safely parsed invalid workbooks (e.g., bad schema version) → persisted as `dry_run_invalid`
- response = `CreateDryRunApiResponse` (batch ID, dry-run ID, safe source metadata, workbook/entity/totals, safe issues, `noBusinessWritePerformed: true`)

## 5. History APIs

### `GET /batches`

- pagination: default `pageSize` 25, max 100, `page` ≥ 1
- filters: `status`, `entityType`, `projectId`, `createdFrom`, `createdTo` (ISO)
- deterministic sort: `created_at DESC, id DESC`
- list items contain no payloads or full issues

### `GET /batches/[batchId]`

- safe source metadata, lifecycle/entity statuses, summary counts, retention, approval states (per entity), execution-attempt summaries
- `INVALID_BATCH_ID` (400) for malformed IDs; `IMPORT_BATCH_NOT_FOUND` (404)

### `GET /batches/[batchId]/rows`

- pagination + filters: `entityType`, `dryRunStatus`, `parserStatus`, `proposedOperation`, `projectSlug`, `sourceRowNumber`, `hasErrors`, `hasWarnings`
- safe row summaries only (no normalized payload)

## 6. Approval APIs

### `GET /batches/[batchId]/approvals`

Returns per-entity approval state + append-only event history. **GET is read-only**: effective expiry is reported without appending an `expired` event; explicit expiry persistence happens through controlled actions.

### `POST .../approve`

- actor from auth; binding derived server-side from the batch
- checks: entity not blocked, eligible `new` rows exist, binding + summary fingerprint match
- TTL = 30 minutes from server `approved_at`
- idempotent: an existing current valid approval is returned instead of duplicating

### `POST .../reject`

- appends `created` + `rejected` events (or rejects the existing pending approval)
- `reason` optional, ≤ 200 chars, control chars stripped, blank → null; never contains payload

### `POST .../revoke`

- requires an active approved approval; appends `revoked`; revoked approval cannot be consumed

Approval consumption is **not** exposed publicly (reserved for the future Execute Import service).

## 7. Approval Expiration

- `approved_at` server-generated UTC; `expires_at = approved_at + 30 min`
- validity checked against server UTC
- GET reports effective `expired` without mutation; actions reject expired/revoked/consumed approvals
- other entity approvals are unaffected

## 8. API Error Contract

```ts
{ ok: false, error: { code, message, status, requestId?, details? } }
```

Codes cover request/file, batch, entity/approval, authorization, and internal errors (e.g., `INVALID_BATCH_ID`, `IMPORT_APPROVAL_BINDING_MISMATCH`, `IMPORT_ENTITY_BLOCKED`, `IMPORT_ENTITY_HAS_NO_ELIGIBLE_ROWS`, `IMPORT_INTERNAL_ERROR`). Responses never include raw SQLite errors, stack traces, payloads, workbook bytes, or local paths.

## 9. Privacy & Serialization

- serializers convert domain types to API-safe DTOs; normalized payloads never appear in dry-run/list/detail/approval/error responses
- file hash exposed as a 12-character excerpt; issue output uses safe codes/messages
- logs contain IDs/codes/counts only

## 10. Known Limitations & Deferred

- no Import UI, execute-import API, approval consumption, cleanup API, or scheduled tasks
- project-filtered history uses an indexed EXISTS query; full-scan efficiency not optimized beyond that
- GitHub Actions remains the final default (Turbopack) build validation
