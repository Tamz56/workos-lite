# ASTRO-APP-DOC-023 — Real App Architecture & Data Model Plan

Status: Accepted / Committed

## 1. Architecture Decision Summary

Recommended direction:
Build Astro Strategy Lab v1 as a Local-first PWA module inside WorkOS-Lite / ArborDesk first, then evaluate whether to extract it into a standalone PWA later.

### Why?
* The current prototype already lives inside WorkOS-Lite.
* Reflection, birth profile, planning notes, and personal timing data are privacy-sensitive.
* Local-first keeps early development simpler and safer.
* App logic can be refactored into clean modules before adding sync/account layers.
* Standalone app, cloud sync, mobile app, or Supabase-backed version can be future phases.

Decision:
The real app foundation should begin as a local-first WorkOS-Lite module, not a cloud-first account app.

---

## 2. Target App Layers

1. **App Shell & Navigation Layer**
   * **Purpose**: Defines routes, workspace entry points, layout shell, tab structure, responsive behavior.
   * **MVP v1 Status**: Required.
   * **Future Status**: Can be extracted to standalone app shell.
   * **Safety Notes**: Standard routing safety and access controls within the main workspace container.

2. **User / Birth Profile Layer**
   * **Purpose**: Stores birth profile and basic user timing context.
   * **MVP v1 Status**: Required local profile model. Birth data should remain local by default.
   * **Future Status**: Optional profile versioning, optional encrypted backup.
   * **Safety Notes**: Birth data is personal data and should not be sent externally without explicit user action.

3. **Local Data Store Layer**
   * **Purpose**: Centralizes local persistence instead of scattering localStorage logic through UI components.
   * **MVP v1 Status**: Required.
   * **Future Status**: Can be upgraded to IndexedDB, encrypted local storage, or optional cloud sync.
   * **Safety Notes**: Must support versioned local data shape and safe migration strategy.

4. **Reflection & Planning Core Layer**
   * **Purpose**: Daily check-in, reflection draft, reflection history, weekly/monthly summaries, strategy planning notes, filters.
   * **MVP v1 Status**: Required.
   * **Future Status**: Can support richer review templates and search.
   * **Safety Notes**: Should remain user-controlled and non-destructive.

5. **Timing Guide Layer**
   * **Purpose**: Converts reflection and timing context into decision-support guidance.
   * **MVP v1 Status**: Required as guide/orientation layer, not calculation engine.
   * **Future Status**: Can connect to astrology engine after data model is stable.
   * **Safety Notes**: Non-predictive, non-fatalistic, decision-support only.

6. **Export / Backup / Import Safety Layer**
   * **Purpose**: Markdown export, JSON backup preview, import preview validator, future non-destructive import flow.
   * **MVP v1 Status**: Required for data trust.
   * **Future Status**: Import/restore can be considered only after validator and data contracts are stable.
   * **Safety Notes**: No write-back without preview, confirmation, diff, and backup.

7. **Ethics / Wai Kru Layer**
   * **Purpose**: Thai cultural framing, humility, ethical use of astrology, teacher reverence.
   * **MVP v1 Status**: Required as static/educational layer.
   * **Future Status**: Can include deeper knowledge cards.
   * **Safety Notes**: Avoid superstition-heavy claims, fear framing, ritual instructions, or supernatural certainty.

8. **Future Astrology Engine Layer**
   * **Purpose**: Future calculation/interpretation engine for Thai astrology, planetary cycles, timing signals, possibly Chinese metaphysics.
   * **MVP v1 Status**: Not required. Keep as future architecture placeholder.
   * **Future Status**: Separate engine module with clear inputs/outputs, test data, and disclaimers.
   * **Safety Notes**: Must never become deterministic or fear-based. Must separate symbolic reading from practical strategy.

9. **Future Chakra & Meditation / Inner Alignment Layer**
   * **Purpose**: Supportive reflection and practice layer for meditation, breath awareness, energy awareness, chakra language, sound/bowl notes, inner balance, and Thai-language guidance.
   * **MVP v1 Status**: Not required. Future module only.
   * **Future Status**: Chakra check-in, meditation timer, breathing practice, sound/bowl notes, inner alignment prompts, Thai meditation knowledge cards.
   * **Safety Notes**:
     * **Not medical advice.**
     * **Not diagnosis.**
     * **Not treatment.**
     * **Not deterministic spiritual claim.**
     * **Not a replacement for professional care.**
     * Chakra should be framed as symbolic self-observation.
     * Meditation should be framed as practice for grounding, focus, and self-regulation.

10. **Future Sync / Cloud / Account Layer**
    * **Purpose**: Optional future sync, account, cloud backup, multi-device usage.
    * **MVP v1 Status**: Not required.
    * **Future Status**: Consider only after local data model and privacy policy are stable.
    * **Safety Notes**: Requires explicit consent, privacy model, export/delete controls, and security design.

---

## 3. Proposed Route / Module Structure

### Workspace Routes Structure
While migration can be incremental, we aim for clean separation.

* **Phase 1**: Keep current route, split internal components.
* **Phase 2**: Create subroutes only when component boundaries are stable.

```text
/workspaces/astro-strategy
  /overview
  /today
  /reflection
  /planning
  /export-backup
  /guide
  /settings
```

### Module File Layout
```text
src/components/workspaces/astro-strategy/
  AstroStrategyAppShell.tsx
  AstroTodayPanel.tsx
  AstroReflectionPanel.tsx
  AstroPlanningPanel.tsx
  AstroExportBackupPanel.tsx
  AstroGuidePanel.tsx
  AstroEthicsPanel.tsx
  components/
  hooks/
  data/
  utils/
  types.ts
```

> [!NOTE]
> The current large `AstroStrategyPrototypeClient.tsx` should be gradually decomposed into smaller components only after DOC-024 roadmap is accepted.

---

## 4. Data Model Plan

Below are the conceptual TypeScript-like pseudo-types for the Astro Strategy Lab local data schema.

### BirthProfile
```typescript
type BirthProfile = {
  id: string
  displayName?: string
  birthDate: string
  birthTime?: string
  birthPlace?: string
  timezone?: string
  calendarSystem?: "gregorian" | "thai-buddhist"
  notes?: string
  createdAt: string
  updatedAt: string
}
```

### DailyCheckin
```typescript
type DailyCheckin = {
  id: string
  date: string // YYYY-MM-DD
  energyLevel?: "low" | "steady" | "high" | string
  intention?: string
  cautionNote?: string
  bodyMindNote?: string
  createdAt: string
  updatedAt: string
}
```

### ReflectionEntry
```typescript
type ReflectionEntry = {
  id: string
  date: string // YYYY-MM-DD
  mode?: string
  energyLevel?: string
  reflectionText?: string
  dailyCheckinSnapshot?: DailyCheckin
  strategySnapshot?: StrategyPlanningNotes
  tags?: string[]
  createdAt: string
  updatedAt: string
}
```

### StrategyPlanningNotes
```typescript
type StrategyPlanningNotes = {
  focusNext?: string
  slowDown?: string
  nextSmallAction?: string
  reviewLater?: string
  updatedAt?: string
}
```

### MonthlyReview
```typescript
type MonthlyReview = {
  id: string
  month: string // YYYY-MM
  direction?: string
  continueDoing?: string
  slowDownOrStop?: string
  nextMonthSeed?: string
  reviewQuestion?: string
  generatedFrom?: {
    reflectionEntryIds?: string[]
    strategyPlanningUpdatedAt?: string
  }
  createdAt: string
  updatedAt: string
}
```

### ExportRecord / BackupPreview
MVP v1 should not save export history by default. Below is the JSON backup preview contract:
```typescript
type BackupPreview = {
  kind: "astro-strategy-local-backup-preview"
  version: string
  generatedAt: string
  source: "local-browser-state-only"
  metadata: {
    backupMode: "preview-only"
    localOnly: boolean
    nonDestructive: boolean
    containsSensitiveReflectionData: boolean
    restoreSupported: boolean
  }
  data: {
    reflectionDraft?: unknown
    dailyCheckinSnapshot?: unknown
    strategyPlanningNotes?: StrategyPlanningNotes
    historyLogsPreview?: ReflectionEntry[]
    counts?: {
      historyLogs?: number
    }
  }
  notes?: string[]
}
```

### Future ChakraMeditationSession
Future-only model representation:
```typescript
type ChakraMeditationSession = {
  id: string
  date: string // YYYY-MM-DD
  practiceType?: "breath" | "meditation" | "sound" | "chakra-checkin" | string
  durationMinutes?: number
  focusArea?: string
  chakraSymbol?: string
  bodyMindNote?: string
  reflectionText?: string
  createdAt: string
  updatedAt: string
}
```

> [!IMPORTANT]
> **Safety Note**: This model is for self-reflection and practice logging only. It should not diagnose, prescribe, or claim healing outcomes.

---

## 5. Local Storage Adapter Plan

To avoid calling `localStorage` directly in UI components, all interactions must route through a consolidated store adapter: `AstroLocalStore`.

### Suggested Responsibilities
* Load/Save Birth Profile
* Load/Save Daily Reflection Draft
* Load/Append History Logs
* Load/Save Strategy Planning Notes
* Generate Backup Preview
* Validate Backup Preview
* Check schema versions & execute migration scripts

### Suggested Interface
```typescript
type AstroLocalStore = {
  loadBirthProfile(): BirthProfile | null
  saveBirthProfile(profile: BirthProfile): void
  loadDailyDraft(): unknown
  saveDailyDraft(draft: unknown): void
  loadHistoryLogs(): ReflectionEntry[]
  appendHistoryLog(entry: ReflectionEntry): void
  loadStrategyPlanningNotes(): StrategyPlanningNotes
  saveStrategyPlanningNotes(notes: StrategyPlanningNotes): void
  generateBackupPreview(): BackupPreview
  validateBackupPreview(rawText: string): ValidationResult
}
```

> [!CAUTION]
> **Safety Rule**: The adapter must never silently overwrite all local data. Any future restore process must require format validation, diff summary, explicit confirmation, and an automatic backup-before-restore checkpoint.

---

## 6. Versioning & Migration Strategy

Local data should have a versioned shape before the real app expands further.

### Envelope Concept
```typescript
type AstroLocalDataEnvelope = {
  app: "astro-strategy-lab"
  schemaVersion: "1.0"
  createdAt: string
  updatedAt: string
  data: {
    birthProfile?: BirthProfile
    dailyDraft?: unknown
    historyLogs?: ReflectionEntry[]
    strategyPlanningNotes?: StrategyPlanningNotes
  }
}
```

### Migration Rules
* No destructive migration without backup.
* Migration should be explicit, version-checked, and logged.
* Preserve unknown fields where possible during migration.
* Map old MVP `localStorage` keys cleanly instead of deleting them abruptly.

---

## 7. Export / Backup / Import Contracts

### Markdown Export
* **Purpose**: Human-readable export for external editor/WorkOS integration.
* **Requirements**: Must include YAML frontmatter, export metadata, selected scope, reflection/planning sections, and fallback text for missing values.

### JSON Backup Preview
* **Purpose**: Machine-readable preview for future restore validation.
* **Requirements**: Must strictly adhere to the `BackupPreview` type structure (kind, version, counts, metadata, data).

### Import Preview Validator
* **Purpose**: Validate schema and format correctness only.
* **Rules**: No import write-back or state restoration during validation.

#### Future Import Flow Requirements:
1. Paste/upload backup payload.
2. Parse JSON.
3. Validate format/schema.
4. Show parsing summary.
5. Show validation warnings or errors.
6. Show diff (current vs incoming data).
7. Create temporary safety backup of existing local state.
8. Require explicit user confirmation checkbox.
9. Write data only after approval.

> [!NOTE]
> Full import/restore is not part of MVP v1 foundation.

---

## 8. Safety & Ethics Boundaries

Astro Strategy Lab is designed for reflection, timing awareness, planning, and decision support.

```text
Astro Strategy Lab is not:
- medical advice,
- mental health treatment,
- financial advice,
- legal advice,
- deterministic fortune-telling,
- a replacement for professional care,
- a system for fear-based predictions.
```

### Astrology Interpretation Rules
* Frame timing signals as strategic tools rather than absolute constraints.
* Focus on strategic preparation, not fatalism or fear.

### Chakra & Meditation Rules
* Frame activities as tools for self-reflection, mindfulness, grounding, and self-observation.
* Never promise physical healing, financial success, or supernatural protection.

### Data Ownership
* Local-first by default.
* Backup and data transfer are strictly user-controlled.

---

## 9. Refactor Strategy

Incremental refactor approach: **Do not rewrite everything at once.**

1. Identify stable UI blocks.
2. Extract pure display components (e.g. static cards, indicators).
3. Extract hooks for local state and derived calculations.
4. Extract the consolidated local store adapter (`AstroLocalStore`).
5. Extract export/backup utilities.
6. Introduce formal TypeScript interfaces and types.
7. Add tests or QA documentation for each extracted piece.
8. Only then split routes or create standalone PWA packages.

### Rules
* Do not refactor code while adding major new features.
* Do not change data shape and UI layout simultaneously.
* Do not add cloud sync features during the modularization phase.

---

## 10. Open Questions for DOC-024

These questions must be resolved in the development roadmap (`ASTRO-APP-DOC-024`):

1. Should v1 remain entirely inside WorkOS-Lite or become standalone after the foundation is stable?
2. What is the minimum v1 feature set after freeze?
3. Which existing prototype features should be refactored first?
4. What local data schema version should be used?
5. Should IndexedDB be used instead of localStorage in v1?
6. When should astrology engine planning begin?
7. When should Chakra & Meditation / Inner Alignment begin?
8. What export/import safety level is required before any restore feature?
9. What is the first deploy target?
10. What should be excluded from v1?

---

## 11. Decision

Decision:
Astro Strategy Lab real app planning should proceed as a local-first WorkOS-Lite / ArborDesk module first.

Before building ASTRO-REAL-APP-DEV-001, the project must complete and accept:
1. ASTRO-APP-DOC-023 — Real App Architecture & Data Model Plan
2. ASTRO-APP-DOC-024 — Real App v1 Development Roadmap

The Chakra & Meditation / Inner Alignment Layer is included in the architecture as a future module, but it remains outside MVP v1 core until the app foundation, data model, and reflection/timing workflow are stable.
