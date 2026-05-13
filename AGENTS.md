# AGENTS.md — WorkOS-Lite / ArborDesk

## Project Context

WorkOS-Lite / ArborDesk is a personal and strategic operating system for managing projects, content production, article workflows, writing review, publishing queues, and knowledge assets.

The system supports projects such as:

- Green Fineness Learning Content Project
- ArborDesk / WorkOS-Lite
- Article Studio
- Writing Desk Lite
- GF Content Hub
- Publish Queue / UTM workflow
- Ava Farm / AVAONE related content systems

This project is not a generic task app. It is a workflow and knowledge operating system. Preserve workflow integrity at all times.

---

## Core Engineering Principle

Do not optimize only for code completion.

Optimize for reliable, reviewable, maintainable work.

Every change must protect:

- existing data
- existing workflows
- save/persistence behavior
- article/content production logic
- task linking logic
- export behavior
- user trust

---

## Before Editing Code

Always perform a short spec first:

1. Restate the goal.
2. Define scope.
3. Define non-scope.
4. Identify likely files to change.
5. Identify files or systems that must not be changed.
6. Define acceptance criteria.
7. List possible risks.

Do not start editing until the scope is clear.

---

## Non-Negotiable Guardrails

Unless explicitly requested:

- Do not rebuild from scratch.
- Do not change database schema.
- Do not modify API routes.
- Do not change persistence logic.
- Do not remove existing fields or controls.
- Do not rename core components or routes.
- Do not introduce a new state management system.
- Do not make broad refactors unrelated to the task.
- Do not change content workflow semantics.
- Do not modify production-critical behavior for cosmetic reasons.

If a requested UI change appears to require logic or schema changes, stop and explain the tradeoff first.

---

## UI Refinement Rules

For UI-only tasks:

- Treat design references as visual inspiration, not as a full rebuild instruction.
- Preserve existing behavior.
- Keep the diff focused.
- Do not touch DB/API unless absolutely required.
- Preserve save, export, review, and task-linking flows.
- Improve visual hierarchy without hiding important workflow controls.
- Keep layouts practical for long-form Thai content.

Recommended desktop layout for Writing Desk Lite:

- Left panel: 280–320px
- Center editor: minmax(560px, 1fr)
- Right review panel: 360–420px

---

## Data / DB / API Rules

For any database, API, or persistence change:

- Explain why the change is necessary.
- Identify affected tables, fields, routes, or functions.
- Preserve backward compatibility where possible.
- Provide a migration or safe update path if schema changes are required.
- Provide manual QA steps.

Never change schema as part of a UI refinement task.

---

## Testing Requirements

After implementation, run:

```bash
npm run lint
npm run build
```

If either command fails, fix the issue or clearly report why it cannot be fixed within scope.

If the task touches save, persistence, parsing, import, export, review, task linking, or UTM generation, provide a manual QA checklist.

---

## Required Final Handoff

Every final response must include:

1. Summary of what changed.
2. Files changed.
3. Behavior preserved.
4. Verification performed.
5. Risks or edge cases.
6. Manual QA checklist if relevant.
7. Recommended next step.

---

## Anti-Rationalization Rules

Do not use these excuses:

- “This is small, no spec needed.”
- “Tests can be added later.”
- “It builds locally in theory.”
- “Simple UI changes cannot break logic.”
- “Docs can be updated later.”
- “The user probably wants a full rebuild.”

Default response:

- Small work still needs scope.
- Important logic needs tests or QA.
- UI can break workflow.
- Documentation must follow workflow changes.
- Rebuilds require explicit approval.

---

## Commit Discipline

Prefer small, focused commits.

A good commit changes one coherent thing:

- UI refinement only
- parser fix only
- persistence fix only
- workflow update only
- documentation update only

Avoid mixed commits such as:

- UI + DB + API + refactor
- feature + unrelated cleanup
- redesign + route changes

---

## WorkOS-Lite Specific Priorities

Protect these flows:

- Writing Desk Lite draft save / refresh persistence
- Arbor Review panel behavior
- Export Markdown
- Copy Clean
- Link / Append to Task
- Article Studio import / parse
- GF Content Hub status mapping
- topic_id detection
- article title parsing
- UTM generation
- Publish Queue flow


No evidence = not done.

ห้าม claim ว่า commit / push / migrate / deploy / verify / สร้าง field / แก้ production แล้ว
ถ้าไม่มีหลักฐานจาก command output, git log, git status, schema check, deploy log หรือ production check