# ASTRO-APP-DOC-024 — Real App v1 Development Roadmap

Status: Accepted / Committed

## 1. Roadmap Decision Summary

Astro Strategy Lab v1 should now move from prototype feature expansion into real app foundation development.

### Decision
The next development work should not add more prototype features.

The next development work should start a real app foundation track:
`ASTRO-REAL-APP-DEV-001 — Real App Shell / Foundation`.

### Why?
* MVP v2.x already has enough functionality to validate the core workflow.
* More prototype features will increase refactor cost.
* The next risk is architecture complexity, not missing features.
* The app needs clearer component boundaries, data model boundaries, and persistence contracts.
* Local-first privacy must be preserved before adding any cloud/account features.

---

## 2. v1 Product Definition

Astro Strategy Lab v1 is a local-first personal timing, reflection, and strategic planning app inside WorkOS-Lite / ArborDesk.

### v1 should help the user:
* check daily state,
* reflect on current timing,
* plan next strategic actions,
* review weekly/monthly patterns,
* export and back up personal reflection data,
* use astrology-inspired timing as decision support,
* keep ethical and non-fatalistic framing visible.

### v1 is not:
* a full astrology calculation engine,
* a fortune-telling app,
* a medical or mental health app,
* a cloud-sync personal account system,
* a public publishing platform,
* a chakra/meditation app yet,
* an AI-generated reading app yet.

---

## 3. v1 Core Scope

V1 Core includes:
1. **App Shell & Navigation**
2. **Local Birth Profile**
3. **Daily Check-in**
4. **Reflection Draft**
5. **Reflection History**
6. **Reflection History Filters**
7. **Strategy Planning Notes**
8. **Weekly Pattern Hints**
9. **Monthly Reflection Snapshot**
10. **Monthly Planning Review**
11. **Reflection Export Pack**
12. **Local Backup Safety**
13. **Import Preview Validator**
14. **Wai Kru / Ethics Layer**
15. **Personal Timing Guide**

*These features are migrated/refactored from the frozen MVP. The goal is not to redesign everything visually, but to make the app maintainable, modular, and safe.*

---

## 4. Explicit v1 Exclusions

Not in v1:
* Full import/restore write-back
* Cloud sync
* User accounts
* Payment system
* AI-generated personal readings
* Full astrology calculation engine
* Thai astrology calculation engine
* Chinese metaphysics calculation engine
* Chakra / Meditation interactive module
* Audio playback / sound bowl library
* Health recommendations
* Public sharing / publishing
* Mobile native app

*These are future phases and should not block the v1 foundation.*

---

## 5. Development Phases

### Phase 1 — Real App Shell / Foundation
* **Goal**: Create real app shell and component boundaries.
* **Includes**: `AstroStrategyAppShell`, stable navigation/tabs, layout boundaries, initial file structure. No data model migration yet.
* **Checkpoint**: `ASTRO-REAL-APP-DEV-001 — Real App Shell / Foundation`
* **Acceptance**: Current app still loads, no feature loss, no persistence changes, main panels can be split cleanly.

### Phase 2 — Component Split & UI Stabilization
* **Goal**: Break large prototype component into maintainable panels.
* **Possible Checkpoints**:
  * `ASTRO-REAL-APP-DEV-002 — Split Today Panel`
  * `ASTRO-REAL-APP-DEV-003 — Split Reflection Panel`
  * `ASTRO-REAL-APP-DEV-004 — Split Planning Panel`
  * `ASTRO-REAL-APP-DEV-005 — Split Export Backup Panel`
  * `ASTRO-REAL-APP-DEV-006 — Split Guide & Ethics Panels`
* **Rules**: One panel extraction per checkpoint. No feature changes during extraction. QA after every extraction. Do not change storage behavior during UI extraction.

### Phase 3 — Types & Data Model Foundation
* **Goal**: Add shared types and align prototype data to conceptual model.
* **Possible Checkpoints**:
  * `ASTRO-REAL-APP-DEV-007 — Add Astro Types`
  * `ASTRO-REAL-APP-DEV-008 — Normalize Reflection Entry Shape`
  * `ASTRO-REAL-APP-DEV-009 — Add Local Data Envelope Draft`
* **Rules**: Type definitions first. No destructive migration. Preserve old localStorage keys. Add compatibility mapping, not forced deletion.

### Phase 4 — Local Store Adapter
* **Goal**: Stop scattering localStorage logic directly in UI.
* **Possible Checkpoints**:
  * `ASTRO-REAL-APP-DEV-010 — Add AstroLocalStore Read Adapters`
  * `ASTRO-REAL-APP-DEV-011 — Add AstroLocalStore Write Adapters`
  * `ASTRO-REAL-APP-DEV-012 — Add Backup Preview Adapter`
  * `ASTRO-REAL-APP-DEV-013 — Add Import Preview Validator Adapter`
* **Rules**: Adapter must be tested/QA documented. No silent overwrite. No restore write-back yet.

### Phase 5 — Reflection & Planning Core Stabilization
* **Goal**: Stabilize daily/weekly/monthly reflection workflows.
* **Possible Checkpoints**:
  * `ASTRO-REAL-APP-DEV-014 — Stabilize Daily Check-in Flow`
  * `ASTRO-REAL-APP-DEV-015 — Stabilize Reflection History Flow`
  * `ASTRO-REAL-APP-DEV-016 — Stabilize Strategy Planning Notes`
  * `ASTRO-REAL-APP-DEV-017 — Stabilize Weekly and Monthly Review Flow`
  * `ASTRO-REAL-APP-DEV-018 — Stabilize History Filters`
* **Rules**: Improve reliability and UX. No new spiritual/astrology engine features. No AI.

### Phase 6 — Export / Backup / Import Safety Stabilization
* **Goal**: Stabilize data trust layer.
* **Possible Checkpoints**:
  * `ASTRO-REAL-APP-DEV-019 — Stabilize Markdown Export`
  * `ASTRO-REAL-APP-DEV-020 — Stabilize JSON Backup Preview`
  * `ASTRO-REAL-APP-DEV-021 — Stabilize Import Preview Validator`
  * `ASTRO-REAL-APP-DEV-022 — Define Restore Safety Design Document`
* **Important**: `DEV-022` is design-only. No full restore write-back in v1 unless separately approved later.

### Phase 7 — Timing Guide & Ethics Stabilization
* **Goal**: Stabilize non-predictive decision-support guidance.
* **Possible Checkpoints**:
  * `ASTRO-REAL-APP-DEV-023 — Stabilize Personal Timing Guide`
  * `ASTRO-REAL-APP-DEV-024 — Stabilize Wai Kru / Ethics Layer`
  * `ASTRO-REAL-APP-DEV-025 — Add Safety Disclaimer Review`
* **Rules**: No deterministic prediction. No fear-based wording. No ritual instructions. Keep astrology as decision-support framing.

### Phase 8 — PWA / Offline / Deployment Preparation
* **Goal**: Prepare real app for stable use.
* **Possible Checkpoints**:
  * `ASTRO-REAL-APP-DEV-026 — PWA Metadata and Offline Readiness`
  * `ASTRO-REAL-APP-DEV-027 — Responsive Polish`
  * `ASTRO-REAL-APP-DEV-028 — Deployment Readiness Checklist`
  * `ASTRO-REAL-APP-DEV-029 — v1 Release Candidate QA`

---

## 6. First Real App Development Checkpoint

### `ASTRO-REAL-APP-DEV-001 — Real App Shell / Foundation`

* **Goal**: Create the real app foundation without changing user-facing behavior.
* **Scope**:
  * Create shell structure.
  * Keep current route working.
  * Start splitting the prototype safely.
  * Prepare folder/module structure.
  * Add comments or docs for future split boundaries if useful.
* **Non-scope**:
  * No new feature.
  * No localStorage migration.
  * No design overhaul.
  * No astrology calculation.
  * No chakra/meditation module.
  * No cloud sync.
  * No import/restore write-back.
* **Acceptance**:
  * App loads.
  * Current tabs still work.
  * No feature regression.
  * Lint/build pass.
  * Git diff is limited to structure/shell work.

---

## 7. Refactor Rules

1. Do not refactor and add new features in the same checkpoint.
2. Do not change storage behavior and UI layout in the same checkpoint.
3. Do not migrate localStorage without backup and rollback plan.
4. Do not start cloud sync before local data model is stable.
5. Do not start astrology engine before timing guide and profile model are stable.
6. Do not start Chakra & Meditation module before core app foundation is stable.
7. Every extraction needs lint, build, and regression QA.
8. Prefer small commits and docs records.

---

## 8. Chakra & Meditation / Inner Alignment Roadmap Position

Chakra & Meditation / Inner Alignment is accepted as a future module but not part of v1 core.

### Recommended Future Timing
Start after:
* App shell is stable.
* Local data model is stable.
* Reflection/timing core is stable.
* Export/backup safety layer is stable.

### Future Possible Checkpoints
* `ASTRO-INNER-DEV-001 — Inner Alignment Concept Card`
* `ASTRO-INNER-DEV-002 — Meditation Timer v0.1`
* `ASTRO-INNER-DEV-003 — Chakra Check-in v0.1`
* `ASTRO-INNER-DEV-004 — Breath Practice Guide v0.1`
* `ASTRO-INNER-DEV-005 — Sound / Bowl Practice Notes v0.1`

### Safety Guidelines
* **No medical claims.**
* **No diagnosis.**
* **No treatment.**
* **No deterministic spiritual claims.**
* **No promise of healing/success/protection.**
* Use Thai-language guidance with calm, grounded wording.

---

## 9. Release Criteria for v1

V1 can be considered ready when:
* App shell is stable.
* Core panels are split.
* Local data adapter exists.
* Existing MVP features still work.
* Export/backup/import preview is safe.
* Reflection history is usable.
* Local data shape is documented.
* Privacy boundaries are visible.
* Lint/build pass.
* Regression QA records exist.
* No known critical data-loss risk remains.

---

## 10. Decision

Decision:
Astro Strategy Lab should now proceed from MVP feature freeze into real app v1 foundation development.

The next executable development checkpoint is:
`ASTRO-REAL-APP-DEV-001 — Real App Shell / Foundation`.

Do not start Chakra & Meditation, full astrology engine, cloud sync, or restore write-back until the v1 app foundation and local data model are stable.
