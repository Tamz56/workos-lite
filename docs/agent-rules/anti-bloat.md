# Anti-Bloat Discipline — WorkOS-Lite / ArborDesk

## Purpose

This rule prevents AI coding agents from creating bloated, speculative, or hard-to-maintain code.

WorkOS-Lite / ArborDesk must stay focused, understandable, reviewable, and aligned with real workflows.

AI agents must not optimize for generating more code. They must optimize for useful, maintainable, verified changes.

---

## Core Rule

Do not build for an imagined future unless explicitly approved.

Build for the current validated workflow first.

---

## Non-Negotiable Rules

AI agents must not add:

- speculative features
- unused endpoints
- unused environment variables
- unused components
- unused utilities
- unused abstractions
- large generated documentation without a clear purpose
- new dependencies without justification
- new architecture layers without repeated use
- future-proof business logic unless explicitly approved

---

## Every New File Must Have a Reason

Before adding a new file, the agent must be able to explain:

1. Why this file is needed now.
2. What current workflow uses it.
3. What would break or become harder without it.
4. Whether an existing file could be safely extended instead.

If the answer is unclear, do not create the file.

---

## No Speculative Architecture

Avoid phrases like:

- “for future scalability”
- “in case we need it later”
- “this prepares the system for future features”
- “this makes the architecture more enterprise-ready”

unless the user explicitly approved that direction.

Future-proofing without a validated use case is technical debt.

---

## Diff Size Discipline

Keep changes small and reviewable.

If a task appears to require broad changes across many files, stop and propose phases first.

Do not mix:

- UI refinement
- database changes
- API changes
- state management changes
- unrelated refactors
- documentation rewrites

in the same change unless explicitly requested.

---

## Documentation Discipline

Documentation should help the project become easier to understand and maintain.

Do not generate large docs just to appear thorough.

Good documentation should explain:

- what this is
- why it exists
- how to use it
- what should not be changed
- what to do next

Avoid long logs, repeated summaries, or documentation that does not support an active workflow.

---

## Dependency Discipline

Before adding a dependency, explain:

1. Why the dependency is necessary.
2. Why existing tools are not enough.
3. What bundle/runtime/security risks it introduces.
4. Whether the feature can be implemented without it.

Do not add dependencies for convenience only.

---

## API / Endpoint Discipline

Do not add API routes or handlers unless they are used by a current UI, workflow, or integration.

Every new endpoint must have:

- a current caller
- a clear purpose
- validation
- error handling
- manual QA steps

Unused endpoints are not future-proofing. They are maintenance debt.

---

## Environment Variable Discipline

Do not add environment variables unless they are required now.

Every new environment variable must include:

- name
- purpose
- where it is used
- local/dev requirement
- production requirement
- fallback behavior if missing

Unused environment variables must not be added.

---

## Preferred Behavior

Prefer:

- simple existing patterns
- small focused changes
- current workflow support
- clear naming
- fewer files
- fewer abstractions
- evidence-backed completion

Avoid:

- clever architecture
- speculative scaling
- large rewrites
- unnecessary indirection
- generated complexity
- feature creep

---

## Required Final Handoff Addition

When completing a task, the agent must include:

```text
Anti-Bloat Check:
- New files added: [list or none]
- New dependencies added: [list or none]
- New endpoints added: [list or none]
- New env vars added: [list or none]
- Any speculative work added?: yes/no
- If yes, explain why it was explicitly required.