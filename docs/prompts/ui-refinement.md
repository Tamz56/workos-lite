# UI Refinement Prompt

```text
This is a UI refinement task, not a rebuild.

Use the provided design reference for visual direction only.

Hard constraints:
- Preserve existing component behavior.
- Preserve existing database schema.
- Preserve API routes.
- Preserve draft save logic.
- Preserve Arbor Review logic.
- Preserve Export Markdown logic.
- Preserve Link/Append to Task logic.
- Do not remove existing fields or controls.
- Do not introduce a new state management system.

Before implementation:
- Identify the current component structure.
- Identify which parts are safe to restyle.
- Identify any risky areas that should not be touched.

After implementation:
- Run npm run lint.
- Run npm run build.
- Provide a short QA checklist for the user to test in the browser.
```
