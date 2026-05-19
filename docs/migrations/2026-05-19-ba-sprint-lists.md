# BA Learning Lab Sprint Lists Database Migration

This document outlines the purpose, configuration, and execution guidelines for the `migrate-ba-sprint-lists` database migration script.

---

## 1. Overview

The **Business Analyst Learning Lab** (`other` workspace) hosts strategic sprints, portfolio tracking, and onboarding tasks:
- Setup, Orientation, and learning roadmaps must be grouped inside `Sprint 0`.
- Foundations, user stories, acceptance criteria, and stakeholder tasks reside in `Sprint 1`.
- Real case studies (Green Fineness / WorkOS) are placed in `Sprint 2`.
- Portfolio building, profiling, resume building, mock interviews, and final presentations are routed into `Sprint 3`.
- Reference notes and outdated sprint exercises are cleanly archived under `Archive / Reference`.

This migration ensures that whenever a database is restored, reset, or seeded, all BA tasks inside the `other` workspace are perfectly mapped into their proper lists under stable/fixed list IDs.

---

## 2. Migration Script Details

- **Script Path**: `scripts/migrate-ba-sprint-lists.ts`
- **Execution Script**: `"migrate:ba"` inside `package.json`
- **Execution Command**:
  ```bash
  npm run migrate:ba
  ```

---

## 3. Task Mapping Rules

Tasks in the `other` workspace are sorted using regex and title substring pattern-matching:

| Task Prefix / Keyword | Target List Name | Stable Target List ID |
| :--- | :--- | :--- |
| `BA-SPRINT-000`, `setup`, `roadmap` | **Sprint 0 — Setup & Orientation** | `list_sprint0_setup_orientation` |
| `BA-SPRINT-001`, `foundations`, `stories`, `stakeholder` | **Sprint 1 — BA Foundations** | `list_sprint1_ba_foundations` |
| `case study`, `green fineness`, `workos`, `analysis` | **Sprint 2 — Case Study: Green Fineness / WorkOS** | `list_sprint2_case_study_green_fineness_workos` |
| `portfolio`, `interview`, `profile`, `presentation` | **Sprint 3 — Portfolio & Interview Prep** | `list_sprint3_portfolio_interview_prep` |
| `archive`, `reference`, `old note` | **Archive / Reference** | `list_archive_reference` |

---

## 4. Operational Safety Guidelines

### 4.1 Idempotency
This migration script is fully **idempotent** and database-safe. You can run it multiple times safely without duplicate side-effects. If a list already exists with the target slug, the script skips insertion and simply aligns the list IDs and references cleanly.

### 4.2 Restoring Backups
When executing the restore script:
```bash
./scripts/restore-db.sh <backup_file>
```
Remember to run both migrations immediately afterward to align all task references:
```bash
npm run migrate:nutrient
npm run migrate:ba
```

### 4.3 SQLite DB Files
> [!IMPORTANT]
> The SQLite database file (`data/workos.db` or similar local files) is strictly ignored via `.gitignore` and **must never be committed to git**. Changes to local database data must be driven through migration scripts like this one.
