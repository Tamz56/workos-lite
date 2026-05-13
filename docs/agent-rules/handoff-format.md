# Handoff Format — AI Agent Final Response

ทุกครั้งที่ AI coding agent ส่งงานกลับมา ต้องตอบตามรูปแบบนี้

## Required Final Handoff

```text
Summary:
- What changed?

Files Changed:
- path/to/file.tsx
- path/to/file.ts

Behavior Preserved:
- What existing flows were intentionally preserved?

Verification:
- npm run lint: pass/fail
- npm run build: pass/fail

Manual QA:
- Step 1
- Step 2
- Step 3

Risks / Edge Cases:
- Known risk
- Possible follow-up

Not Done:
- Anything intentionally left out of scope

Recommended Next Step:
- What should the user test or do next?
```

## Rules

- Do not hide failed checks.
- Do not claim tests passed if they were not run.
- Do not omit risks.
- Do not say “done” unless verification is complete or limitations are clearly stated.

## Verification & Evidence Discipline

Never claim an external state change without evidence.

External state changes include:
- database schema changes
- migrations
- commits
- pushes
- deployments
- production updates
- environment variable changes
- file uploads

Required rule:

No evidence = not done.

If you claim that something was completed, include direct evidence:
- command output
- git log
- git status
- migration file path
- SQL/schema inspection
- deploy log
- production URL check

If you cannot verify it, say:
"Not verified."

Do not blame the user, server, or environment until you have shown evidence from the local repo, build logs, git status, and relevant runtime logs.