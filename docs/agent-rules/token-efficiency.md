# Token Efficiency Discipline — WorkOS-Lite / ArborDesk

## Purpose

This rule helps AI coding agents use context, output, and tool calls efficiently without reducing work quality.

The goal is not to make the agent think less.

The goal is to reduce wasted context, repeated explanations, unnecessary output, long unfocused chats, and repeated failed attempts.

WorkOS-Lite / ArborDesk should use tokens for useful reasoning, focused implementation, and verified handoff.

---

## Core Rule

Use fewer tokens by making the work clearer, smaller, and better scoped.

Do not save tokens by skipping required verification, evidence, or safety checks.

---

## Default Working Pattern

For every task, prefer this pattern:

```text
1. Understand the task
2. Define scope and non-scope
3. Propose approach briefly
4. Implement only the approved scope
5. Verify
6. Handoff compactly
```

---

## Context Discipline

Do not carry unnecessary context forward.

Prefer:

- short task briefs
- phase summaries
- session summaries
- relevant file paths
- specific error messages
- current goal and constraints

Avoid:

- dumping entire logs without summary
- restating long project history
- including unrelated files
- continuing very long chats without recap
- repeating AGENTS.md content when a reference is enough

Use existing repo instructions instead of repeating them:

```text
Read AGENTS.md first.
Apply No Evidence = Not Done.
Apply Anti-Bloat Discipline.
Apply Token Efficiency Discipline.
```

---

## Phase Discipline

Break broad work into phases.

Good:

```text
Phase 1: UI-only refinement
Phase 2: Review panel structure
Phase 3: Persistence fix
Phase 4: Docs update
```

Bad:

```text
Refactor Dashboard, Writing Desk, Article Studio, DB, API, and docs in one pass.
```

If a task appears broad, stop and propose phases first.

---

## Approach Before Execution

Before editing code, provide a compact approach:

```text
Approach:
- likely files:
- intended change:
- not touching:
- acceptance criteria:
```

Do not write a long essay.

The purpose is to catch misunderstanding early before wasting tokens on the wrong implementation.

---

## Output Discipline

Keep technical output compact.

Do not explain general programming concepts unless asked.

Final handoff should include only:

```text
Summary:
Files changed:
Verification evidence:
Risks:
Manual QA:
Next step:
```

Avoid:

- long motivational summaries
- repeated explanations of the same decision
- excessive implementation narrative
- generic best practices not tied to the task

---

## Log Discipline

When debugging, do not paste or request huge logs by default.

Ask for or provide:

```text
- command that was run
- main error message
- relevant stack trace section
- changed files before the error
- environment/context if relevant
```

If a log is very long, summarize it first and include only the relevant section.

---

## Language Discipline

For coding and technical agent prompts, English is preferred when it reduces ambiguity and token usage.

For Green Fineness content, Thai is preferred when tone, audience, and final language matter.

Recommended pattern:

```text
Technical structure: English
Final content/tone: Thai when needed
```

Example:

```text
Goal:
Scope:
Non-scope:
Guardrails:
Acceptance Criteria:
Output language: Thai
```

---

## Verification Discipline

Do not save tokens by skipping verification.

For code changes, verification is still required before handoff or commit:

```bash
npm run lint
npm run build
```

If verification is not run, say so clearly:

```text
Not verified.
```

No Evidence = Not Done still applies.

---

## Failed Attempt Discipline

If the agent fails twice on the same issue, stop.

Do not continue blindly.

Instead, provide:

```text
Blocker Summary:
- what was attempted
- what failed
- evidence/error
- likely cause
- recommended next approach
```

Then wait for user confirmation or propose switching approach.

This prevents token waste from repeated wrong fixes.

---

## Chat Reset Discipline

After completing one meaningful phase, create a compact recap for the next session.

Use:

```text
Completed:
Files changed:
Decisions:
Current state:
Next step:
Risks:
```

Then start a new chat/session if context is becoming long.

---

## Skill / Rule Reuse

Prefer reusable instruction files over repeated prompting.

Use:

```text
AGENTS.md
docs/agent-rules/
docs/prompts/
docs/ai/
```

When a pattern repeats, turn it into:

- a rule
- a prompt
- a checklist
- a template
- a session summary

---

## Token Efficiency Checklist

Before starting:

- Is the task small enough?
- Is the scope clear?
- Are non-scope items listed?
- Can existing instructions be referenced instead of repeated?
- Is the expected output clear?

Before handoff:

- Is the final response compact?
- Did we include evidence?
- Did we avoid generic explanation?
- Did we avoid adding unnecessary docs/code?
- Is the next step clear?

---

## Required Final Handoff Addition

When completing a task, include:

```text
Token Efficiency Check:
- Context kept focused: yes/no
- Output kept compact: yes/no
- Broad work split into phases if needed: yes/no/not applicable
- Repeated failed attempts avoided: yes/no/not applicable
```

---

## Closing Rule

The best way to save tokens is to avoid doing the wrong work.

Clear scope, small phases, reusable rules, compact output, and verified handoff are the default.
