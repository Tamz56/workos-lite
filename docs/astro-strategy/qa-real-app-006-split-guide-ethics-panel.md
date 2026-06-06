# QA Record — ASTRO-REAL-APP-DEV-006

## Task

Split Guide & Ethics Panels — presentational component extraction

## Scope

- Created `AstroGuideEthicsPanel.tsx` in `real-app/components/`
- Consolidates 5 guide/ethics sections from prototype:
  1. Quick Start Guide (ASTRO-APP-DEV-021)
  2. Ethical framing / คำแนะนำทางศีลธรรม
  3. Reflection-use guidance (การบันทึกเพื่อการสะท้อนคิด)
  4. Disclaimers / Guardrails (non-medical, non-deterministic)
  5. Personal Timing Guide orientation (ASTRO-APP-DEV-030)

## Files Changed

- `src/components/workspaces/astro-strategy/real-app/components/AstroGuideEthicsPanel.tsx` — **NEW**
- `docs/astro-strategy/qa-real-app-006-split-guide-ethics-panel.md` — **NEW**

## What Was Intentionally Not Changed

- `AstroStrategyPrototypeClient.tsx` — untouched
- Routes — no changes
- localStorage keys — no changes
- Autosave behavior — no changes
- Navigation — no changes
- Reflection persistence/export logic — no changes
- Existing prototype rendering path — no changes

## Content Principles Verified

- [x] Astrology framed as reflection/planning support, not deterministic truth
- [x] Non-medical disclaimer present
- [x] No fear-based or fatalistic language
- [x] Thai cultural respect maintained without supernatural certainty claims
- [x] Tone: calm, practical, strategic, respectful

## Verification

```
eslint (single file):    0 errors, 0 warnings ✅
tsc --noEmit (project):  0 errors ✅
next build:              Sandbox environment restriction (EPERM — not code-related)
npm run dev:             Already running, no compile errors observed
```

## Risk Notes

- Component is additive only — not wired into any route
- No localStorage reads or writes
- No imports from prototype file
- All content extracted from existing prototype text with matching visual direction
- Props-driven design allows future customization without modifying defaults

## Status

**PASSED** — additive extraction, lint clean, tsc clean, no behavior changes
