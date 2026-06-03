# ASTRO-APP-DOC-022 — MVP Feature Freeze & App Transition Plan

## Status

Accepted / Committed

## Latest HEAD at Time of Writing

```text
ad3e45f44b5331dc2beafe9a694412f9a4eb8ba5
```

## Purpose

Astro Strategy Lab Local-first MVP v2.x has reached a stable prototype checkpoint.

The next step should not be adding more small prototype features indefinitely.

The project should now move into app transition planning:

1. Freeze the current MVP feature set.
2. Define real app architecture.
3. Define data model and persistence strategy.
4. Define v1 development roadmap.
5. Keep future spiritual / meditation layers in the roadmap without distracting from core app foundation.

---

## 1. Current MVP v2.x Feature Freeze

The current Astro Strategy Lab MVP v2.x feature set is considered frozen for transition planning.

### What "Frozen" Means

* No more non-essential prototype features before app transition planning.
* Only bug fixes, QA records, documentation updates, or critical safety improvements.
* No schema changes.
* No database / API / AI / astrology calculation engine yet.
* No import / restore write-back flow yet.
* No new unrelated modules before app architecture is defined.

### Frozen Feature Set

```text
- Daily strategic check-in
- Today Dashboard and Priority Badge
- Reflection Draft persistence
- Reflection History
- Reflection History Filters
- Weekly Review Summary
- Weekly Pattern Hints
- Strategy Planning Notes
- Monthly Reflection Snapshot
- Monthly Planning Review
- Reflection Export Pack
- Reflection Export Pack scope selector
- WorkOS-friendly Markdown export
- Monthly Review Export Integration
- Local Backup / Import-Export Safety
- Local Backup Safety Enhancements
- Import Preview Validator
- Wai Kru / Teacher Reverence ethics layer
- Personal Timing Guide
- Personal Timing Guide Enhancements
```

---

## 2. What Should Not Be Built Yet

```text
- Full import/restore/merge write-back flow
- Cloud sync
- User accounts
- Payment system
- AI-generated personal readings
- Full astrology calculation engine
- Thai astrology calculation engine
- Chinese metaphysics calculation engine
- Chakra / meditation interaction engine
- Audio library / sound healing playback
- Health-related recommendations
- Public publishing or sharing features
```

These are future possibilities, not immediate MVP requirements.

---

## 3. App Transition Direction

### Recommended Direction

```text
Recommended direction:
Build the real app first as a Local-first PWA inside WorkOS-Lite / ArborDesk, then decide later whether to separate it into a standalone app.
```

### Why This Direction

* The current prototype already works inside WorkOS-Lite.
* Local-first fits privacy-sensitive reflection data.
* Easier to refactor gradually from the existing working prototype.
* Avoids premature cloud / data complexity.
* Allows later standalone deployment when the foundation is stable.

### Options

```text
Option A — Local-first PWA inside WorkOS-Lite
Recommended for v1 foundation.

Option B — Standalone PWA
Possible after core logic stabilizes.

Option C — Supabase-backed personal account app
Future phase only.

Option D — Mobile app
Future phase only, after the web app foundation is stable.
```

---

## 4. Proposed Real App Architecture Layers

```text
1.  App Shell & Navigation
2.  User Profile / Birth Profile Layer
3.  Local Data Store Layer
4.  Reflection & Planning Core
5.  Timing Guide Layer
6.  Export / Backup / Import Safety Layer
7.  Ethics / Wai Kru Layer
8.  Future Astrology Engine Layer
9.  Future Chakra & Meditation / Inner Alignment Layer
10. Future Sync / Cloud / Account Layer
```

### Layer Descriptions

1. **App Shell & Navigation** — Top-level layout, route structure, tab navigation, responsive shell, and component organization.

2. **User Profile / Birth Profile Layer** — Personal birth date, birth time, and location profile used as input context for timing and reflection. Stored locally.

3. **Local Data Store Layer** — Versioned local data models, localStorage adapter, migration safety plan, and data shape contracts for all reflection and planning records.

4. **Reflection & Planning Core** — Daily check-in, reflection draft, reflection history, strategy planning notes, weekly review, monthly review, filters, and pattern hints. The core workflow engine.

5. **Timing Guide Layer** — Personal timing guide, timing rules, future astrology engine integration point, and decision-support framing with disclaimers.

6. **Export / Backup / Import Safety Layer** — Markdown export, JSON backup preview, import preview validator, non-destructive validation, and future restore design (but not immediate write-back).

7. **Ethics / Wai Kru Layer** — Teacher reverence section, ethics guardrails, Thai cultural framing, and responsible-use boundaries.

8. **Future Astrology Engine Layer** — Future placeholder for actual astrology calculation logic (Thai, Western, or other systems). Not part of MVP. Requires separate research, validation, and ethical review before implementation.

9. **Future Chakra & Meditation / Inner Alignment Layer** — A supportive reflection and practice layer for meditation, breath awareness, energy awareness, inner balance, and Thai-language guidance. It should be framed as self-reflection and well-being support, not medical advice, not diagnosis, not deterministic spiritual claims, and not a replacement for professional care.

10. **Future Sync / Cloud / Account Layer** — Future placeholder for cloud sync, user accounts, multi-device access, and data portability. Not part of MVP.

---

## 5. Future Module — Chakra & Meditation / Inner Alignment Layer

### Status

```text
Status:
Future Phase / Not MVP Core / Not urgent
```

### Purpose

This layer will support the user's interest in chakra, meditation, breath, sound, and inner balance as a complement to astrology-based timing and reflection.

### Recommended Framing

```text
- Use chakra as symbolic language for self-observation.
- Use meditation as a practice for grounding, focus, and self-regulation.
- Use sound/bowl guidance carefully as optional support.
- Keep Thai-language explanations clear, calm, and non-fear-based.
- Avoid medical claims.
- Avoid saying chakra imbalance causes specific life outcomes.
- Avoid promising healing, success, protection, or fixed results.
```

### Possible Future Features

```text
- Chakra Check-in
- Meditation Timer
- Breathing Practice Guide
- Sound / Bowl Practice Notes
- Inner Alignment Reflection Prompts
- Astro Timing + Meditation Suggestion
- Thai meditation knowledge cards
- Practice History / Reflection Notes
```

### Priority Note

This module should not outrank the app foundation, data architecture, and core reflection/timing system.

---

## 6. Suggested Real App Roadmap

```text
Phase 0 — MVP Freeze & Transition Planning
- DOC-022 MVP Feature Freeze & App Transition Plan
- DOC-023 Real App Architecture & Data Model Plan
- DOC-024 Real App v1 Development Roadmap

Phase 1 — Real App Foundation
- App shell
- Navigation
- Component split
- Route structure
- UI system cleanup

Phase 2 — Local Data Model & Persistence
- Data models
- Local storage adapter
- Versioned local data shape
- Migration safety plan
- Backup/import contracts

Phase 3 — Reflection & Planning Core
- Daily check-in
- Reflection history
- Strategy planning notes
- Weekly/monthly review
- Filters

Phase 4 — Export / Backup / Import Safety
- Markdown export
- JSON backup preview
- Import preview validator
- Non-destructive validation
- Future restore design but not immediate write-back

Phase 5 — Timing & Strategy Layer
- Personal timing guide
- Timing rules
- Future astrology engine planning
- Disclaimers and decision-support framing

Phase 6 — Ethics / Wai Kru Layer
- Teacher reverence section
- Ethics guardrails
- Thai cultural framing

Phase 7 — Future Inner Alignment Layer
- Chakra check-in
- Meditation timer
- Breathing guidance
- Sound/bowl notes
- Thai-language meditation content

Phase 8 — Polish / PWA / Deploy
- Responsive polish
- PWA metadata
- Offline readiness
- Deployment plan
```

---

## 7. Immediate Next Documents

```text
1. ASTRO-APP-DOC-023 — Real App Architecture & Data Model Plan
2. ASTRO-APP-DOC-024 — Real App v1 Development Roadmap
3. ASTRO-REAL-APP-DEV-001 — Real App Shell / Foundation
```

Do not start `ASTRO-REAL-APP-DEV-001` until `DOC-023` and `DOC-024` are accepted.

---

## 8. Decision

```text
Decision:
The Astro Strategy Lab Local-first MVP v2.x feature set is frozen for transition planning.

The next priority is not to add more prototype features, but to prepare the real app foundation through architecture, data model, and roadmap planning.

The Chakra & Meditation / Inner Alignment Layer is accepted as a future module, but it should be introduced after the core app foundation and reflection/timing workflow are stable.
```
