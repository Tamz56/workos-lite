# Nutrient Planner Phase Lists Database Migration

This document outlines the purpose, configuration, and execution guidelines for the `migrate-nutrient-planner-lists` database migration script.

---

## 1. Overview

The **Green Fineness — Nutrient Planner App** (`travel` workspace) groups its tasks across different phases to maintain high logical hierarchy:
- Foundation tasks (Fertilizer Logic and Crop Database) must be grouped inside their respective Phase 2 lists.
- Rain season assistant and prototyping tasks should reside within the Phase 3A Home Trial list.

This migration ensures that whenever a database is restored, reset, or seeded, all 20 tasks inside the `travel` workspace are perfectly mapped into their proper lists under stable/fixed list IDs.

---

## 2. Migration Script Details

- **Script Path**: `scripts/migrate-nutrient-planner-lists.ts`
- **Execution Script**: `"migrate:nutrient"` inside `package.json`
- **Execution Command**:
  ```bash
  npm run migrate:nutrient
  ```

---

## 3. Task Mapping Rules

Tasks in the `travel` workspace are sorted using regex pattern-matching on their prefixes:

| Task Title Prefix | Target List Name | Stable Target List ID |
| :--- | :--- | :--- |
| `FL-*` | **Phase 2 — Fertilizer Logic** | `list_phase2_fertilizer_logic` |
| `CD-*` | **Phase 2 — Crop Database & Tomato Research** | `list_phase2_crop_db_tomato_research` |
| `GF-APP-*` | **Phase 3A — Tomato Home Trial** | `list_phase3a_tomato_home_trial` |

---

## 4. Operational Safety Guidelines

### 4.1 Idempotency
This migration script is fully **idempotent** and database-safe. You can run it multiple times safely without duplicate side-effects. If a list already exists with the target slug, the script skips insertion and simply aligns the list IDs and references cleanly.

### 4.2 Restoring Backups
When executing the restore script:
```bash
./scripts/restore-db.sh <backup_file>
```
Remember to run the migration immediately afterward to align all task references:
```bash
npm run migrate:nutrient
```

### 4.3 SQLite DB Files
> [!IMPORTANT]
> The SQLite database file (`data/workos.db` or similar local files) is strictly ignored via `.gitignore` and **must never be committed to git**. Changes to local database data must be driven through migration scripts like this one.
