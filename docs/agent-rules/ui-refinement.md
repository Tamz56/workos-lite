# UI Refinement Rules — WorkOS-Lite / ArborDesk

## Purpose

ใช้กติกานี้ทุกครั้งที่ให้ AI coding agent ปรับ UI เช่น Dashboard, Writing Desk Lite, Article Studio, GF Hub หรือ sidebar

## Rule

This is a UI refinement task, not a rebuild.

Design references are visual inspiration only. They are not instructions to replace existing logic.

## Hard Constraints

- Preserve existing component behavior.
- Preserve existing database schema.
- Preserve API routes.
- Preserve draft save logic.
- Preserve Arbor Review logic.
- Preserve Export Markdown logic.
- Preserve Link / Append to Task logic.
- Do not remove existing fields or controls.
- Do not introduce a new state management system.
- Do not rename core components or routes unless explicitly approved.

## Before Implementation

The agent must identify:

- current component structure
- safe areas to restyle
- risky areas that should not be touched
- likely files to change
- acceptance criteria

## Recommended Writing Desk Lite Layout

Desktop:

- Left panel: 280–320px
- Center editor: minmax(560px, 1fr)
- Right review panel: 360–420px

Preserve the three-column workflow:

```text
Left: Draft List + Context
Center: Editor
Right: Arbor Review
```

## After Implementation

Run:

```bash
npm run lint
npm run build
```

Then provide:

- files changed
- behavior preserved
- visual changes summary
- risks
- manual QA checklist
