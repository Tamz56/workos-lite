# Project Documentation SQLite Persistence v1 — Implementation Specification

## 1. Final Status

**Implemented / Recovered / Merged / Operational**

Project Documentation storage runs on SQLite (`data/workos.db`, table `project_doc_blocks`) as the single source of truth on `main`. The feature was implemented, merged, and verified as part of the post-recovery closure sequence:

- PR #19 — Project Documentation SQLite Persistence
- PR #20 — Restore workspaces and related configuration (Astro Strategy Lab, Writing Lab, Nutrient Planner configuration)
- PR #21 — Register restored workspace navigation and SQLite schema fix
- PR #22 — Restore Nutrient Planner / Rose Trial Lab
- PR #23 — Restore original ArborDesk shell and historical applications
- PR #24 — Restore modern Project Detail workspace
- PR #25 — Remove obsolete AVA seed behavior

Verified merge commits from git history: PR #19 merge `abce0aa`, PR #20 merge `667f0fe`, PR #21 merge `31a7988`, PR #22 merge `dd324bf`, PR #23 merge `8cc09ce`, PR #24 merge `8cfcb7a`, PR #25 merge `516f379` (current HEAD).

---

## 2. Executive Summary & Problem Statement

Prior to this implementation, Project Documentation blocks were stored exclusively in LocalStorage under the key `workos_projects_docs_v1`. This client-side architecture suffered from key operational limitations:

- **Persistence Fragility**: Browser cache clear or browser switching led to loss of project records.
- **Cross-device & Multi-session Disconnect**: Documentation created in one browser environment was unavailable in another.
- **Workflow & Audit Gap**: Lack of a centralized relational database hindered transactional safety, strict schema validation, and server-side auditing.

This project migrates Project Documentation storage to **SQLite (`data/workos.db`)** as the single source of truth while maintaining LocalStorage purely as a read-only fallback. As of this closure, that design is merged and operational on `main`; LocalStorage deprecation itself remains a deferred decision.

---

## 3. Current Architecture

Data flow on current `main`:

```
Next.js frontend
  -> ProjectDetailClient.tsx (integration surface; Deliverables & Docs tab)
      -> useProjectDocBlocks (src/lib/project-doc-blocks/useProjectDocBlocks.ts)
          -> loadProjectDocBlocks (src/lib/project-doc-blocks/client.ts)
              -> GET /api/projects/[slug]/doc-blocks
                  -> repository layer (src/lib/project-doc-blocks/repository.ts)
                      -> SQLite table project_doc_blocks (data/workos.db)
```

Write path: ProjectDetailClient (form/modal state) -> client helpers (`createProjectDocBlockOnClient`, `updateProjectDocBlockOnClient`, `archiveProjectDocBlockOnClient`, `restoreProjectDocBlockOnClient`) -> API routes -> repository -> SQLite.

Supporting layers: `validation.ts` (route/schema validation), `mappers.ts` (row/API mapping), `hashing.ts` (record integrity hashes).

The current Project Detail integrates three tabs:

- **Deliverables & Docs** — contains the Project Documentation & Logs section (doc-block UI)
- **Context & Decisions**
- **Workflows & Loops**

---

## 4. Current Integration State

Observed on `main` at HEAD `516f379805877d2fc13ecdf92ff0dbb1d08f26d3` during a docs-only review; no source change was made as part of this task.

- `ProjectDetailClient.tsx` is the main integration surface for doc blocks. Doc-block state (`useProjectDocBlocks`, status/search/type filters, modal forms) and the Project Documentation & Logs UI are implemented inline in this file.
- `src/components/projects/ProjectDocBlocksSourceStatus.tsx` is still imported and rendered (`ProjectDocBlocksSourceStatus` render site in `ProjectDetailClient.tsx`); `ProjectDocBlocksReadOnlyActions` and `ProjectDocBlocksEmptyState` from the same file are also imported and used.
- `src/components/projects/ProjectDocBlocksSection.tsx` still exists in the repository, but on current `main` no active import of this component was found in application source (`src`). Its exported `countTopLevelHeadings` helper is referenced by a unit test (`tests/unit/projectDocBlockWriteUi.test.tsx`). This is the current observed integration state.
- The earlier "integration shell (2 lines modified)" description is no longer accurate after PR #24 restored the modern Project Detail.
- The decision on `ProjectDocBlocksSection.tsx` (reintegrate vs. remove) is a deferred technical-debt decision that requires a dedicated review; it must not be treated as immediately deletable.

---

## 5. Database Schema (`project_doc_blocks`)

```sql
CREATE TABLE IF NOT EXISTS project_doc_blocks (
  id                  TEXT PRIMARY KEY,
  project_id          TEXT NOT NULL,
  legacy_project_slug TEXT NULL,
  import_source       TEXT NULL CHECK(import_source IN ('localstorage_recovery', 'google_sheet', 'manual', 'arbor_summary') OR import_source IS NULL),
  import_batch_id     TEXT NULL,
  migrated_at         TEXT NULL,
  source_row_number   INTEGER NULL,
  source_record_id    TEXT NULL,
  block_type          TEXT NOT NULL CHECK (block_type IN ('brief', 'structure', 'sop', 'process_note', 'decision', 'milestone', 'issue_fix', 'publish', 'qa_review')),
  title               TEXT NOT NULL,
  block_date          TEXT NOT NULL, -- YYYY-MM-DD
  summary             TEXT NOT NULL,
  details_md          TEXT NOT NULL,
  evidence_links_json TEXT NOT NULL DEFAULT '[]',
  related_files_json  TEXT NOT NULL DEFAULT '[]',
  next_action         TEXT NULL,
  status              TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  order_index         INTEGER NULL,

  -- Source tracking & Arbor Assistant
  source_text         TEXT NULL,
  source_excerpt      TEXT NULL,
  source_type         TEXT NULL CHECK (source_type IN ('manual_paste', 'walkthrough', 'commit_log', 'qa_report', 'publish_log', 'chat_summary') OR source_type IS NULL),
  generated_by        TEXT NULL CHECK (generated_by IN ('arbor') OR generated_by IS NULL),
  reviewed_by_user    INTEGER NOT NULL DEFAULT 0 CHECK (reviewed_by_user IN (0, 1)),
  applied_at          TEXT NULL,

  created_at          TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at          TEXT NOT NULL DEFAULT (datetime('now')),

  FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE RESTRICT
);

CREATE TRIGGER IF NOT EXISTS trg_project_doc_blocks_updated_at
AFTER UPDATE ON project_doc_blocks
FOR EACH ROW
WHEN NEW.updated_at = OLD.updated_at OR NEW.updated_at IS OLD.updated_at
BEGIN
  UPDATE project_doc_blocks SET updated_at = datetime('now') WHERE id = NEW.id;
END;

CREATE INDEX IF NOT EXISTS idx_project_doc_blocks_proj_order ON project_doc_blocks(project_id, order_index, block_date);
CREATE INDEX IF NOT EXISTS idx_project_doc_blocks_proj_date ON project_doc_blocks(project_id, block_date);
```

---

## 6. Key Engineering Contracts & Security Rules

1. **Identifier Resolver**: API routes accept both Project ID (`sYl_7W74AA9ffy65oLbqq`) and Project Slug (`gf-trial-lab`), resolving to canonical `projectId` before DB query execution.
2. **Immutable Field Guarantee**: PATCH payloads containing `projectId`, `projectSlug`, `id`, `createdAt`, or import metadata are rejected with `400 Bad Request`.
3. **Concurrency Protection**: Stale updates (mismatched `expectedUpdatedAt`) return `409 Conflict`.
4. **Heading Detection**: Import Log enforces single-record Markdown policy by counting top-level `# ` headings (`##` and `###` are treated as internal subheadings).
5. **Arbor Assistant Policy**: Draft generation requires explicit user preview and manual `Apply Draft` confirmation. Automatic draft saving is strictly prohibited.
6. **UI Integration**: Doc-block UI lives inside the Project Detail workspace (Deliverables & Docs tab). Write controls are disabled whenever the UI is rendering LocalStorage fallback data (read-only fallback policy).

---

## 7. Persistence Behavior

- **SQLite source of truth**: `project_doc_blocks` table with `updated_at` trigger and ordering indexes, created in `src/db/db.ts` (`ensureProjectDocBlocks`).
- **Create**: POST `/api/projects/[slug]/doc-blocks` with route-level validation; returns `201` with the created block.
- **Edit**: PATCH `/api/projects/[slug]/doc-blocks/[blockId]` with `expectedUpdatedAt`; returns the updated block.
- **Archive / Restore**: POST `/api/projects/[slug]/doc-blocks/[blockId]/archive` and `/restore`, soft-status transitions between `active` and `archived`.
- **Slug / ID resolver**: `resolveProjectId` in the repository layer resolves either identifier before any query.
- **Concurrency**: `expectedUpdatedAt` mismatch returns `409 Conflict` ("This record has changed. Reload before saving.").
- **Immutable fields**: rejected on PATCH with `400 Bad Request`.
- **Import Log**: single-record Markdown import via the UI, enforced by `countTopLevelHeadings`; multi-record (`> 1` top-level `#`) imports are rejected.
- **Arbor Assistant**: preview generated first, draft applied only via explicit user confirmation; records created with `generated_by = 'arbor'` and `reviewed_by_user` flow.
- **LocalStorage fallback**: read-only; the client reads `workos_projects_docs_v1` only when the API is unavailable (5xx, timeout, network error) and never writes to it.
- **Recovery importer**: `scripts/import-recovery-blocks.ts` with dry-run, recovery-file SHA-256 verification, per-record duplicate/content-hash checks, and a single transactional write with rollback on failure.
- **Backup and rollback policy**: manual DB snapshots under `backup/` (e.g., `workos-before-project-doc-*`), automated backups via `scripts/backup-db.sh` into `data/backups` (keeps last 30), restore via `scripts/restore-db.sh`, and housekeeping for restore-safety backups in `src/lib/backup/housekeeping.ts`. Manual snapshot retention for `backup/` itself remains deferred.

---

## 8. Recovery Outcome

- **5 active project doc-block records** in `data/workos.db` (2 records recovered from LocalStorage + 3 QA records), preserved unchanged.
- **Recovery JSON**: 3 copies (`backup/workos_projects_docs_v1-recovery-2026-08-01.json`, `-actual.json`, `-copy.json`) with identical SHA-256 `538ce39753174a2395d8e5c077e6c5ee8067a047b53c3639af34e8237425e452` (re-verified during this closure).
- **SQLite integrity**: `ok`; **FK violations**: `0`.
- **LocalStorage** remains a read-only fallback; no writes to `workos_projects_docs_v1` exist in current source.
- **AVA seed cleanup** (PR #25) is unrelated to doc-block content but is part of the final repository recovery closure.

---

## 9. Deferred Work

- LocalStorage deprecation decision (read-only fallback retained by design).
- Backup retention policy for manual snapshots in `backup/`.
- Recovery artifact cleanup.
- `ProjectDocBlocksSection.tsx` integration decision (reintegrate or remove after dedicated review).
- Context & Decisions unit tests.
- Workflows & Loops unit tests.
- Project Detail documentation beyond doc-block persistence.
