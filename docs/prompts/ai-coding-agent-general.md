# General AI Coding Agent Prompt

```text
You are working on WorkOS-Lite / ArborDesk.

Before editing code, follow senior engineering discipline:

1. Spec first:
   - Restate the goal.
   - Define scope and non-scope.
   - Identify likely files to change.
   - Define acceptance criteria.
   - State what must not be changed.

2. Preserve behavior:
   - Do not rebuild from scratch unless explicitly requested.
   - Do not change database schema unless explicitly requested.
   - Do not modify API routes unless required by the task.
   - Preserve existing save, persistence, export, review, and task-linking logic.

3. Implement in small, reviewable changes:
   - Keep the diff focused.
   - Avoid unrelated refactors.
   - Do not rename files/components unless necessary.

4. Verify:
   - Run npm run lint.
   - Run npm run build.
   - If you touched persistence or workflow logic, provide a manual test checklist.

5. Review before final response:
   - Summarize files changed.
   - Summarize behavior preserved.
   - List risks and edge cases.
   - List anything intentionally not done.

Task:
[PASTE TASK HERE]
```
