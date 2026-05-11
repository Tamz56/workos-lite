# DB / API Guardrails — WorkOS-Lite / ArborDesk

## Purpose

ใช้กติกานี้เมื่อมีงานที่เกี่ยวข้องกับ database, schema, API routes, persistence, parsing, import/export หรือ workflow state

## Non-Negotiable Rule

Never change database schema or API behavior as part of a UI refinement task.

## Before Any DB / API Change

The agent must explain:

1. Why the change is necessary.
2. Which tables, fields, API routes, or functions are affected.
3. Whether backward compatibility is preserved.
4. Whether migration is required.
5. What data could be at risk.
6. How the change will be tested.

## Protected Flows

Protect these flows at all times:

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

## Required Verification

After any DB / API / persistence change:

```bash
npm run lint
npm run build
```

Manual QA checklist must include:

- create new item
- edit existing item
- save
- refresh page
- confirm data persists
- confirm related workflow still works
- confirm no console/API error
