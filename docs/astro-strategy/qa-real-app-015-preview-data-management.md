# QA Record: ASTRO-REAL-APP-DEV-015 — Preview Data Management & Safety Tools

## Task Name
ASTRO-REAL-APP-DEV-015 — Preview Data Management & Safety Tools

## Scope
- Create a developer and QA utility panel (`AstroPreviewDataToolsPanel.tsx`) showing keys status and reset options.
- Integrate the panel into a new preview tab "⚙️ เครื่องมือข้อมูล".
- Enable individual key clears and global clears, safely syncing React state back to MOCK fallbacks without page reload.

## Files Changed
- `src/components/workspaces/astro-strategy/real-app/data/astroRealAppTypes.ts`
- `src/components/workspaces/astro-strategy/real-app/data/astroRealAppLocalStorageAdapter.ts`
- `src/components/workspaces/astro-strategy/real-app/AstroRealAppPreview.tsx`

## New Components Added
- `src/components/workspaces/astro-strategy/real-app/components/AstroPreviewDataToolsPanel.tsx`

## LocalStorage Keys Managed
- `astro-real-app:reflection-history:v1`
- `astro-real-app:planning-notes:v1`
- `astro-real-app:reflection-draft:v1`

## What can be Reset
- **Reflection History** (resets key and falls back in-memory to `MOCK_HISTORY_LOGS`).
- **Planning Notes** (resets key and falls back in-memory to `MOCK_PLANNING_NOTES`).
- **Reflection Draft** (clears key and resets in-memory to empty strings).
- **All Data** (runs all three resets simultaneously).

## What is Intentionally Not Touched (Out of Scope)
- Existing prototype keys (`astro-strategy:*`, `astro.strategy.*`).
- Active prototype page (`AstroStrategyPrototypeClient.tsx`).
- Active route `/workspaces/astro-strategy`.
- Remote database, sync features, API endpoints.

## Verification Commands & Output
- **ESLint & TypeScript Typecheck**:
  ```bash
  ./node_modules/.bin/eslint src/components/workspaces/astro-strategy/real-app/ --max-warnings=100
  ./node_modules/.bin/tsc --noEmit --pretty
  ```
  Result: **Passed with 0 errors / 0 warnings**.

- **Next.js Project Build**:
  Build check passes cleanly.

## Manual QA Checklist
- [x] Navigate to `/workspaces/astro-strategy/real-app-preview` and click **"⚙️ เครื่องมือข้อมูล"** tab.
- [x] Check the status column -> verify keys show "ว่างเปล่า / ใช้ค่า Mock" or "ไม่มีดราฟต์ชั่วคราว" initially.
- [x] Edit Planning Notes or write a Reflection Log to trigger key creation.
- [x] Go back to the **"เครื่องมือข้อมูล"** tab -> verify the key status changes to "มีข้อมูลเก็บอยู่ (Exists)".
- [x] Click **"ล้างเฉพาะดราฟต์"** or **"ล้างเฉพาะแผนงาน"** -> verify that a confirmation pop-up displays, and on accept, the corresponding key is deleted from LocalStorage and the UI resets immediately in memory.
- [x] Click **"ล้างข้อมูลพรีวิวทั้งหมด (Reset All Data)"** -> verify that all preview keys are removed, and states reset back to default fallbacks.
- [x] Confirm that prototype keys in DevTools are fully untouched and intact.

## Risk Notes
- **Low Risk**: Scoped fully under namespace `astro-real-app:` and preview tab. Completely isolated and protects production/prototype storage keys.

## Status
**PASSED** / Committed / Verified

## Local Verification Update

Status: Passed / Verified locally

- Lint: Passed with warnings / Verified locally
  - `npm run lint`: 0 errors
  - Existing warnings are not blocking this preview data management task
- Build: Passed / Verified locally
  - `npm run build`: Passed
  - Verified at HEAD: `a6517d6`

Manual QA evidence:
- Data Tools tab is visible in the real app preview route.
- Real-app LocalStorage key status is displayed.
- Reflection draft can be reset.
- Reflection history can be reset.
- Strategy planning notes can be reset.
- Reset all preview data clears only real-app preview keys and restores mock/default state.
- Prototype route and prototype keys remain untouched.

Verification note:
- This task is isolated to real-app preview.
- No prototype behavior change.
- No active route behavior change.
- No prototype localStorage keys changed.
