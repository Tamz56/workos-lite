# QA — WorkOS Project Field Sheet v1

## 1. Scope & Method

QA scope: `docs/project-import/templates/workos-project-field-sheet-v1.xlsx`.

Method:

- Programmatic verification with Python `openpyxl` (already installed, no new dependency).
- Rendered preview via Quick Look (headless) plus deterministic layout-fit and pixel-span analysis.
- Contract values cross-checked against current `main` source:
  - `src/lib/project-doc-blocks/validation.ts`
  - `src/db/db.ts` (`project_items` DDL)
  - `src/app/api/projects/[slug]/items/route.ts` (zod enums)

---

## 2. File QA

| Check | Result |
| --- | --- |
| xlsx opens successfully | ✅ |
| No corruption | ✅ (openpyxl load OK) |
| Exactly required tabs (`00_Metadata`, `01_Project_Documentation`, `02_Backlog`) | ✅ |
| No macros (`vba_archive` = None) | ✅ |
| No external links | ✅ |
| No hidden tabs | ✅ |

File size: `40654` bytes. SHA-256: `9be008e7603cd007c1d5a52141b8993d13b53a3af35d68d582dc8b2e466b8b25`.

---

## 3. Metadata QA

| Check | Result |
| --- | --- |
| `schema_version` present | ✅ `workos-field-sheet-v1` (B5) |
| `workbook_id` key present | ✅ (placeholder `<...>` for user fill) |
| `timezone` present | ✅ `Asia/Bangkok` (B10) |
| All required keys present | ✅ 8 keys |
| Named ranges for dropdowns | ✅ 6 defined names |
| Allowed merged ranges (display only) | ✅ `00_Metadata!A1:F1`, `00_Metadata!A14:F14` |
| No merged cells outside allowed ranges | ✅ |

---

## 4. Project Documentation QA

| Check | Result |
| --- | --- |
| Expected headers present (row 5) | ✅ 14/14 exact |
| Header row location correct (`header_row = 5`) | ✅ |
| Dropdowns/validation active | ✅ 4 lists (`block_type`, `status`, `source_type`, `reviewed_by_user`) on C/K/M/N, rows 7–500 |
| Date format correct | ✅ column E `yyyy-mm-dd` |
| Multiline cells supported | ✅ `details` wrap + vertical top alignment |
| Sample row clearly marked | ✅ `EXAMPLE-DO-NOT-IMPORT` / `example-project-slug`, amber highlight |
| Thai descriptions (row 6) | ✅ 14/14 |
| Freeze panes / filter | ✅ freeze `A6`, filter `A5:N500` |
| Allowed merged ranges (display only) | ✅ `A1:N1`, `A2:N2`, `A3:N3` |

---

## 5. Backlog QA

| Check | Result |
| --- | --- |
| Expected headers present (row 5) | ✅ 12/12 exact |
| Status values limited to 3 | ✅ dropdown = `inbox`, `planned`, `done` |
| Schedule bucket validation present | ✅ `none`, `morning`, `afternoon`, `evening` |
| Boolean validation present | ✅ `TRUE`/`FALSE` for `is_milestone` |
| Date format correct | ✅ columns G/H `yyyy-mm-dd` |
| Sample row clearly marked | ✅ `EXAMPLE-DO-NOT-IMPORT` / `example-project-slug` |
| Thai descriptions (row 6) | ✅ 12/12 |
| Freeze panes / filter | ✅ freeze `A6`, filter `A5:L500` |
| Allowed merged ranges (display only) | ✅ `A1:L1`, `A2:L2`, `A3:L3` |

---

## 6. Safety QA

| Check | Result |
| --- | --- |
| No formulas in data range | ✅ (scan rows 5–500, 0 formulas) |
| No merged cells in canonical data range (rows 5 onward) | ✅ |
| Display-only merged cells exist only in allowed ranges (rows 1–3, Metadata row 14) | ✅ |
| No real project data | ✅ (only `example-project-slug` sample) |
| No real credentials / API keys | ✅ |
| No absolute local paths | ✅ |
| No source/database changes | ✅ (assets/docs only) |
| No hidden sheets/rows | ✅ |

---

## 7. Programmatic Verification Output

```text
SHA-256: 9be008e7603cd007c1d5a52141b8993d13b53a3af35d68d582dc8b2e466b8b25
Size bytes: 40654
Opens: OK
Sheet names: ['00_Metadata', '01_Project_Documentation', '02_Backlog']
Hidden sheets: []
Macros (vba_archive): None
External links: 0
Defined names: ['backlog_status_list', 'block_type_list', 'boolean_list', 'doc_status_list', 'schedule_bucket_list', 'source_type_list']

[01_Project_Documentation] headers exact: True
[01_Project_Documentation] autofilter: A5:N500 | freeze: A6
[01_Project_Documentation] merged ranges: ['A1:N1', 'A2:N2', 'A3:N3']
[01_Project_Documentation] merged in rows 5+: []
[01_Project_Documentation] data validations: 4
    list block_type_list -> C7:C500
    list doc_status_list -> K7:K500
    list source_type_list -> M7:M500
    list boolean_list -> N7:N500
[01_Project_Documentation] formulas in data region: 0
[01_Project_Documentation] sample row: ['EXAMPLE-DO-NOT-IMPORT', 'example-project-slug', 'process_note']

[02_Backlog] headers exact: True
[02_Backlog] autofilter: A5:L500 | freeze: A6
[02_Backlog] merged ranges: ['A1:L1', 'A2:L2', 'A3:L3']
[02_Backlog] merged in rows 5+: []
[02_Backlog] data validations: 3
    list backlog_status_list -> D7:D500
    list schedule_bucket_list -> F7:F500
    list boolean_list -> I7:I500
[02_Backlog] formulas in data region: 0
[02_Backlog] sample row: ['EXAMPLE-DO-NOT-IMPORT', 'example-project-slug', 'EXAMPLE ROW — DO NOT IMPORT']

Metadata merged ranges: ['A14:F14', 'A1:F1']
Metadata merged in rows 5+ (allowed A14 only): ['A14:F14']
schema_version cell B5: workos-field-sheet-v1
timezone cell B10: Asia/Bangkok
```

---

## 8. Visual QA

### Revision (WORKOS-SHEET-CONTRACT-002 Visual QA Revision)

The first rendered review found worksheet titles, instructions, and safety warnings visibly clipped. The workbook was revised as follows:

1. **Merged title/instruction rows outside the data range**
   - `00_Metadata`: `A1:F1`, `A14:F14`
   - `01_Project_Documentation`: `A1:N1`, `A2:N2`, `A3:N3`
   - `02_Backlog`: `A1:L1`, `A2:L2`, `A3:L3`
   - No merged cells in rows 5+ (verified programmatically).
2. **Row heights + wrapping**: Row 1 = 30pt, Row 2 = 38pt, Row 3 = 50pt; rows 2–3 wrap text with vertical center.
3. **Warning emphasis**: Row 3 dark red bold text (`9C0006`) on light warning fill (`FBE5E6`), full `EXAMPLE-DO-NOT-IMPORT` rule visible.
4. **AutoFilter fix**: Project Documentation is exactly `A5:N500`; Backlog stays `A5:L500`.

### Rendered verification

Quick Look (headless) rendered all three worksheets successfully to PNG thumbnails. In-session image inspection is not supported in this environment, so content completeness was verified with two objective checks:

- **Deterministic layout-fit**: every merged instruction row fits within its merged width and row height with margin (all rows need ≤ 1 line at conservative Thai character widths; available lines = 2–3 per row).
- **Pixel-span analysis of the rendered PNGs**: ink in the title/instruction/warning bands spans 97–98% of the full worksheet width on all three sheets, confirming the merged rows render across the full width with no clipping to a single column.

Layout checks also passed: headers readable, Thai instructions do not overlap data, long-text columns wrap with top alignment, dropdowns on intended columns, freeze panes at `A6`, filters on header row 5.

**Visual QA status: Passed (rendered thumbnails + layout-fit + pixel-span evidence). Thumbnails are available at `/tmp/xlrender/sheets/` for a quick user glance.**

---

## 9. Contract Clarification

The task brief's field rule "`source_type` default `google_sheet`" was reconciled against the current source contract:

- `source_type` accepts `manual_paste`, `walkthrough`, `commit_log`, `qa_report`, `publish_log`, `chat_summary` only.
- `google_sheet` is an `import_source` value (already allowed by the schema) that the future importer will set.

The template therefore validates `source_type` with the six source-contract values and documents `import_source = google_sheet` as a future importer concern.

---

## 10. Final Result

**Template v1 Passed / Ready for Commit**

All sections above reflect the current final workbook:

- Metadata: display merges `00_Metadata!A1:F1` and `00_Metadata!A14:F14` only.
- Project Documentation: AutoFilter `A5:N500`, display merges `A1:N1` / `A2:N2` / `A3:N3` only.
- Backlog: AutoFilter `A5:L500`, display merges `A1:L1` / `A2:L2` / `A3:L3` only.
- No merged cells in the canonical data range (rows 5 onward).
- Headers, validations, named ranges, sample rows, formula/macro/external-link results unchanged from revision QA.

No source code, API, database, or schema was modified. No importer was created.

---

## 11. Reconciliation Note

The following stale statements from the pre-revision QA were corrected so every section matches the final workbook:

- Metadata QA: removed the blanket "no merged cells" claim; now records the two allowed display merges.
- Project Documentation QA: AutoFilter corrected from `A5:O500` to `A5:N500`; allowed display merges recorded.
- Backlog QA: allowed display merges recorded (AutoFilter was already `A5:L500`).
- Safety QA: now distinguishes "no merges in rows 5 onward" from "display-only merges in allowed ranges".
- Programmatic Verification Output: replaced with output generated from the current final workbook.
- Final QA status unified to a single unambiguous value: `Template v1 Passed / Ready for Commit`.
