# Testing Rules — WorkOS-Lite / ArborDesk

## Minimum Required Checks

For most code changes:

```bash
npm run lint
npm run build
```

## When Manual QA Is Required

Manual QA is required when touching:

- save / persistence logic
- draft editor
- Article Studio import
- parser logic
- export Markdown
- Link / Append to Task
- topic_id detection
- UTM generation
- Publish Queue
- GF Hub status logic
- DB / API routes

## Manual QA Template

```text
1. Open the affected page.
2. Confirm existing data loads.
3. Create or edit a record.
4. Save.
5. Refresh.
6. Confirm data persists.
7. Run the affected workflow.
8. Check browser console.
9. Check terminal/API logs.
10. Confirm no unrelated UI regression.
```

## Rule

If a test was not run, say it was not run.
Do not imply verification that did not happen.
