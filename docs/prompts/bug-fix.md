# Bug Fix Prompt

```text
This is a bug fix task.

Goal:
Fix the reported bug with the smallest safe change.

Rules:
- Reproduce or explain the likely cause before editing.
- Do not refactor unrelated code.
- Do not change UI unless required.
- Do not change schema unless explicitly approved.
- Preserve existing behavior outside the bug.

After fixing:
- Explain root cause.
- Summarize files changed.
- Run npm run lint.
- Run npm run build.
- Provide manual QA steps to confirm the bug is fixed.
```
