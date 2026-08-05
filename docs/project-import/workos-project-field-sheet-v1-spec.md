# WorkOS Project Field Sheet v1 — Specification

## 1. Purpose

This workbook is the controlled staging layer used to prepare WorkOS Project data before any future import. It covers two entity flows only:

1. **Project Documentation** → target table `project_doc_blocks`
2. **Backlog / Deliverables** → target table `project_items`

**Template v1 is not an importer.** Completing the workbook does not write to WorkOS. Import requires a future dry-run and approval workflow.

---

## 2. Architecture Role as Controlled Staging Layer

```text
Arbor or Human
→ Fill WorkOS Project Field Sheet
→ Review
→ Export / Upload
→ Future Dry Run Import
→ Human Approval
→ SQLite
```

The template only guarantees the *shape* of the data. Validation of project existence, duplicates, conflicts, and database constraints happens in the future importer, not in the workbook.

---

## 3. Workbook Structure

The workbook contains exactly 3 tabs:

```text
00_Metadata
01_Project_Documentation
02_Backlog
```

No other tabs, no hidden tabs, no sample business tabs.

---

## 4. Schema Version

`schema_version = workos-field-sheet-v1` (cell `B5` in `00_Metadata`).

Any change to the header contract requires a version bump and a documented mapping from the previous version.

---

## 5. Header Row Contract

Locked layout on both data tabs:

```text
Row 1: Tab title
Row 2: Thai instructions
Row 3: Warning (sample row must be deleted)
Row 4: Blank
Row 5: Canonical English headers  (header_row = 5)
Row 6: Thai field descriptions   (description_row = 6)
Row 7+: Data rows                (data_start_row = 7)
```

Rules:

- Only English canonical headers in row 5.
- Thai descriptions in row 6 are informational and must never be parsed as headers.
- Merged cells are permitted only outside the canonical data range for display: rows 1–3 on the data tabs and rows 1 / 14 on `00_Metadata`.
- No merged cells in rows 5 onward (the canonical data range).
- No formulas in data rows.

---

## 6. Metadata Contract

`00_Metadata` uses a key/value/description layout. Required keys:

| Key | Value / Example | Required |
| --- | --- | --- |
| `schema_version` | `workos-field-sheet-v1` | Yes |
| `workbook_id` | stable user-defined ID | Yes |
| `batch_reference` | human-readable batch name | Yes |
| `source_system` | `google_sheet` or `manual` | Yes |
| `export_timestamp` | ISO 8601 | Yes |
| `timezone` | `Asia/Bangkok` | Yes |
| `prepared_by` | person or agent name | Optional |
| `notes` | workbook-level notes | Optional |

Values still to be filled by the user use `<...>` placeholders. `schema_version` and `timezone` are pre-filled.

---

## 7. Project Documentation Field Contract

| Column | Required | Rule | Target |
| --- | ---: | --- | --- |
| `external_row_id` | Yes | stable, unique per project and entity | `source_record_id` |
| `project_slug` | Yes | exact WorkOS project slug | project resolution |
| `block_type` | Yes | must match current allowed type | `block_type` |
| `title` | Yes | non-empty | `title` |
| `date` | Yes | `YYYY-MM-DD` | `block_date` |
| `summary` | Yes | plain text | `summary` |
| `details` | Yes | multiline Markdown allowed | `details_md` |
| `evidence_links` | No | one item per line | `evidence_links_json` |
| `related_files` | No | one item per line | `related_files_json` |
| `next_action` | No | plain text | `next_action` |
| `status` | No | `active` or `archived`; default `active` | `status` |
| `order_index` | No | integer >= 0 | `order_index` |
| `source_type` | No | use allowed current value | `source_type` |
| `reviewed_by_user` | No | TRUE/FALSE | `reviewed_by_user` |

### Contract clarification: `source_type` vs `import_source`

The `source_type` column follows the current source contract (`manual_paste`, `walkthrough`, `commit_log`, `qa_report`, `publish_log`, `chat_summary`). The value `google_sheet` belongs to `import_source` (already allowed by the schema), which the future importer will set — it is **not** a `source_type` value.

---

## 8. Backlog Field Contract

| Column | Required | Rule | Target |
| --- | ---: | --- | --- |
| `external_row_id` | Yes | stable, unique per project and entity | future provenance |
| `project_slug` | Yes | exact WorkOS project slug | project resolution |
| `title` | Yes | non-empty | `title` |
| `status` | Yes | `inbox`, `planned`, or `done` only | `status` |
| `priority` | No | integer or blank | `priority` |
| `schedule_bucket` | No | `none`, `morning`, `afternoon`, `evening` | `schedule_bucket` |
| `start_date` | No | `YYYY-MM-DD` | `start_date` |
| `end_date` | No | `YYYY-MM-DD` | `end_date` |
| `is_milestone` | No | TRUE/FALSE | `is_milestone` |
| `workstream` | No | free text | `workstream` |
| `dod_text` | No | Definition of Done | `dod_text` |
| `notes` | No | multiline text | `notes` |

---

## 9. Required and Optional Fields

- Required: `external_row_id`, `project_slug`, and entity-specific required fields (see sections 7–8).
- Optional: everything else. Blank optional cells are allowed.

---

## 10. Enum Values

### Project Documentation

```text
block_type:
brief, process_note, sop, structure, decision, milestone, issue_fix, publish, qa_review

status:
active, archived

source_type:
manual_paste, walkthrough, commit_log, qa_report, publish_log, chat_summary
```

### Backlog

```text
status:
inbox, planned, done

schedule_bucket:
none, morning, afternoon, evening

is_milestone:
TRUE, FALSE
```

Values are sourced from `src/lib/project-doc-blocks/validation.ts` and the `project_items` schema/API zod enums on current `main`.

---

## 11. Date Format

- All date columns use `YYYY-MM-DD`.
- Cells are formatted `yyyy-mm-dd` in the workbook.
- Time components and timezone offsets are not supported in v1.

---

## 12. Boolean Format

- `reviewed_by_user` and `is_milestone` use text values `TRUE` or `FALSE` only.

---

## 13. Multiline Text Handling

- `details` (Project Documentation), `dod_text`, and `notes` (Backlog) support multiline text inside a single cell.
- Line breaks are preserved as entered.

---

## 14. Link/List Handling

- `evidence_links` and `related_files`: one item per line. The future importer splits by line before writing the JSON array.
- Commas inside a line are treated as part of the item, not as separators.

---

## 15. Project Resolution Policy

- Sheet references projects by **exact `project_slug`**.
- The importer must resolve the slug to an existing WorkOS project before any write.
- Unknown project → failed validation (no silent creation).
- The importer must never create projects implicitly. Project creation has a separate admin path.

---

## 16. Stable External Row ID Policy

- `external_row_id` must be stable and unique per `(project, entity)`.
- It maps to `source_record_id` for Project Documentation and to future provenance for Backlog.
- The value `EXAMPLE-DO-NOT-IMPORT` is reserved for the sample row and must be rejected by any future parser.

---

## 17. Sample-Row Policy

Both data tabs contain exactly one clearly marked sample row:

```text
external_row_id = EXAMPLE-DO-NOT-IMPORT
project_slug    = example-project-slug
```

- The sample row must be deleted before real use.
- A future importer must reject any row whose `external_row_id` is `EXAMPLE-DO-NOT-IMPORT`.

---

## 18. Validation Rules

### File-level

- `.xlsx` only; workbook must open; `schema_version` must be `workos-field-sheet-v1`; required tabs must exist.

### Sheet-level

- Row 5 must contain exactly the canonical headers; unknown/duplicate headers are validation errors.

### Row-level

- Required fields non-empty; enums from section 10; dates `YYYY-MM-DD`; project slug resolvable.

### Database-level (future importer)

- Existing record checks, duplicate content checks, archived-record checks, and FK resolution.

---

## 19. Unsupported Features

- Thai canonical headers (Thai text is description-only).
- Formulas in data rows.
- Merged cells in the data range.
- Backlog statuses beyond `inbox/planned/done`.
- Hidden sheets or hidden data rows.
- Macros or external workbook links.
- Automatic project creation.
- Update/overwrite semantics in v1 (insert-only by default in the future importer).

---

## 20. Future Importer Assumptions

- `header_row = 5`, `description_row = 6`, `data_start_row = 7`.
- Metadata keys read from `00_Metadata`.
- Dropdown lists are defined as named ranges in `00_Metadata`: `block_type_list`, `doc_status_list`, `source_type_list`, `boolean_list`, `backlog_status_list`, `schedule_bucket_list`.
- The sample row (`EXAMPLE-DO-NOT-IMPORT`) must be rejected.
- For Project Documentation, the importer sets `import_source = google_sheet` (or `manual`) and writes through the existing doc-block repository contract; immutable fields are preserved.
- For Backlog, the importer writes only the three DB-supported statuses.

---

## 21. Backlog Status Limitation

The database CHECK constraint and API zod enums on current `main` support only:

```text
inbox, planned, done
```

The wider 8-value UI/TypeScript set (`in_progress`, `drafted`, `ready_for_review`, `blocked`, `archived`) must **not** be used in Template v1.

---

## 22. Deferred Decisions

- Storage location for `source_file_hash` / `sheet_name` (audit table vs. new columns).
- Backlog import provenance (new columns vs. embedded in `notes`).
- Update mode (v1 is insert-only; update semantics need a dedicated design).
- Hidden-row handling policy.
- Upload size / temporary file retention for the future importer.
- Spreadsheet parsing library choice for the future importer.
- Final contract confirmation once the actual WorkOS Project Field Sheet is reviewed.

---

## 23. Versioning Policy

- `schema_version` lives in `00_Metadata`.
- Any change to headers, tabs, enums, or row layout requires a version bump and a mapping from the previous version.
- Template file, specification, and QA report are versioned together.
