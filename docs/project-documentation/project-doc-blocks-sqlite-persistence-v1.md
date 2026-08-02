# Project Documentation SQLite Persistence v1 — Implementation Specification

## 1. Executive Summary & Problem Statement
Prior to this implementation, Project Documentation blocks were stored exclusively in LocalStorage under the key `workos_projects_docs_v1`. This client-side architecture suffered from key operational limitations:
- **Persistence Fragility**: Browser cache clear or browser switching led to loss of project records.
- **Cross-device & Multi-session Disconnect**: Documentation created in one browser environment was unavailable in another.
- **Workflow & Audit Gap**: Lack of a centralized relational database hindered transactional safety, strict schema validation, and server-side auditing.

This project migrates Project Documentation storage to **SQLite (`data/workos.db`)** as the single Source of Truth while maintaining LocalStorage purely as a read-only fallback.

---

## 2. Architecture Overview & Data Flow
```
┌─────────────────────────────────────────────────────────────┐
│                      Next.js Frontend                       │
│  (ProjectDetailClient.tsx / ProjectDocBlocksSourceStatus)   │
└──────────────────────────────┬──────────────────────────────┘
                               │ HTTP API
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                       REST API Routes                       │
│       /api/projects/[slug]/doc-blocks/[blockId]             │
│        (Supports both Project ID & Project Slug)            │
└──────────────────────────────┬──────────────────────────────┘
                               │ SQLite Repository Call
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                      SQLite Repository                      │
│        (src/lib/project-doc-blocks/repository.ts)           │
└──────────────────────────────┬──────────────────────────────┘
                               │ SQL Transactions
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                 SQLite Database (data/workos.db)            │
│                     Table: project_doc_blocks               │
└──────────────────────────────┬──────────────────────────────┘
```

---

## 3. Database Schema (`project_doc_blocks`)
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
```

---

## 4. API Specification & Endpoints

### 4.1 Collection Endpoint (`/api/projects/[slug]/doc-blocks`)
- **GET**: Lists document blocks for a given project identifier (supports project `id` or `slug`). Filter by `status` (`active` | `archived` | `all`).
- **POST**: Creates a new document block.
  - Body: `{ type, title, date, summary, details, evidenceLinks, relatedFiles, status, nextAction, generatedBy, reviewedByUser }`
  - Response: `201 Created` with full block payload.

### 4.2 Item Endpoint (`/api/projects/[slug]/doc-blocks/[blockId]`)
- **GET**: Fetches a single block by project identifier and block ID.
- **PATCH**: Updates editable block details.
  - Body: `{ expectedUpdatedAt, type, title, date, summary, details, evidenceLinks, relatedFiles, status, nextAction, generatedBy, reviewedByUser }`
  - Optimistic Concurrency Control: Checks `expectedUpdatedAt === current.updated_at`. If mismatch, returns `409 Conflict`.
  - Immutable Fields Guard: Rejects requests containing immutable fields (`id`, `projectId`, `projectSlug`, `createdAt`, `updatedAt`, etc.) with `400 Bad Request`.

### 4.3 Archive Endpoint (`/api/projects/[slug]/doc-blocks/[blockId]/archive`)
- **POST**: Soft-archives a block (`status = 'archived'`). Requires `expectedUpdatedAt`.

### 4.4 Restore Endpoint (`/api/projects/[slug]/doc-blocks/[blockId]/restore`)
- **POST**: Restores an archived block (`status = 'active'`). Requires `expectedUpdatedAt`.

---

## 5. Key Domain & UI Features

### 5.1 Project Identifier Resolver
API routes utilize `resolveProjectId(slug)` to query projects by `id` first, and if not found, by `slug`. This allows frontend navigation using either Project ID (`WniiRWTaGeEY7gt3XAsm7`) or Slug (`gf-trial-lab`) without route failures.

### 5.2 Single-Record Import Log Heading Detection
Import Log validates input using line-by-line parsing:
- Counts top-level Markdown Level 1 headings (`^#[ \t]+\S`) while ignoring code blocks (```).
- Single-record input with `## Summary` or `## Details` sub-headings is recognized as a single record (`count <= 1`) and allowed.
- Multi-record input (`# Record 1` ... `# Record 2`) is rejected (`count > 1`) with an actionable UI warning.

### 5.3 Arbor Assistant Auto-Draft Confirmation
Arbor Assistant generated drafts require explicit user review (`reviewedByUser: true`). Upon confirmation, blocks are written to SQLite via `createProjectDocBlockOnClient` with `generatedBy: "arbor_assistant"` (mapped to `'arbor'` in SQLite).

---

## 6. Recovery & Data Safety Architecture
- **Recovery Importer (`scripts/import-recovery-blocks.ts`)**: Migrated legacy LocalStorage records into SQLite with full import metadata (`import_source = 'localstorage_recovery'`).
- **Integrity Hashes**: Each recovery record's SHA-256 integrity hash is computed and verified against pre-import baselines.
- **LocalStorage Read-Only Policy**: `localStorage.getItem("workos_projects_docs_v1")` is strictly read-only and serves as fallback when API connection is unavailable.
