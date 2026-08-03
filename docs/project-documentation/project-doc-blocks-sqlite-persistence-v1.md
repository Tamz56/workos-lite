# Project Documentation SQLite Persistence v1 — Implementation Specification

## 1. Executive Summary & Problem Statement
Prior to this implementation, Project Documentation blocks were stored exclusively in LocalStorage under the key `workos_projects_docs_v1`. This client-side architecture suffered from key operational limitations:
- **Persistence Fragility**: Browser cache clear or browser switching led to loss of project records.
- **Cross-device & Multi-session Disconnect**: Documentation created in one browser environment was unavailable in another.
- **Workflow & Audit Gap**: Lack of a centralized relational database hindered transactional safety, strict schema validation, and server-side auditing.

This project migrates Project Documentation storage to **SQLite (`data/workos.db`)** as the single Source of Truth while maintaining LocalStorage purely as a read-only fallback.

---

## 2. Clean Architecture Overview & Data Flow
Built cleanly on `origin/main` without pulling in unmerged modules (Project Loops, Registry Metadata, Content Roadmap, Planner, Writing Lab, Astro, Rose Trial).

```
┌─────────────────────────────────────────────────────────────┐
│                      Next.js Frontend                       │
│     ProjectDetailClient.tsx (Integration Shell, 2 lines)    │
│                            │                                │
│                            ▼                                │
│     src/components/projects/ProjectDocBlocksSection.tsx     │
│             (Isolated Clean Component Architecture)          │
└──────────────────────────────┬──────────────────────────────┘
                               │ HTTP API Calls
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
└─────────────────────────────────────────────────────────────┘
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

## 4. Key Engineering Contracts & Security Rules
1. **Identifier Resolver**: API routes accept both Project ID (`sYl_7W74AA9ffy65oLbqq`) and Project Slug (`gf-trial-lab`), resolving to canonical `projectId` before DB query execution.
2. **Immutable Field Guarantee**: PATCH payloads containing `projectId`, `projectSlug`, `id`, `createdAt`, or import metadata are rejected with `400 Bad Request`.
3. **Concurrency Protection**: Stale updates (mismatched `expectedUpdatedAt`) return `409 Conflict`.
4. **Heading Detection**: Import Log enforces single-record Markdown policy by counting top-level `# ` headings (`##` and `###` are treated as internal subheadings).
5. **Arbor Assistant Policy**: Draft generation requires explicit user preview and manual `Apply Draft` confirmation. Automatic draft saving is strictly prohibited.
6. **Isolated UI Component**: `ProjectDetailClient.tsx` remains a minimal integration shell (2 lines modified). All UI state, modals, filters, and rendering logic reside inside `src/components/projects/ProjectDocBlocksSection.tsx`.
