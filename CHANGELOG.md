# Changelog

## [0.2.0] - 2026-03-16 (RC1.2 Stabilization Release)
### Fixed
- **Navigation Unification**: Unified project references to point towards `/projects/[slug]` across Dashboard, Timeline, and Lists.
- **Success Feedback**: Standardized all creation and renaming actions using a shared `<Toast />` component.
- **Hydration & Performance**: Fixed hydration mismatches caused by nested HTML/Body tags in layout; improved body scroll-locking.
- **Data Integrity**: Optimized Note metadata persistence to prevent title corruption and ensure immediate saves.
- **Reliability**: Fixed 404 regressions for Project Detail items when using refreshed Promise-based params in Next.js 15+.
- **UX Consistency**: Improved Note-to-Project linking with smoother interaction and immediate feedback.
- **Sidebar**: Fixed Settings link to point directly to Data Management.

## [0.1.1] - 2026-03-15 (RC1 Stabilization & Patch)
### Fixed
- **Inbox**: Fixed "Tomorrow" button marking tasks as Done.
- **Project Detail**: Added auto-focus and Enter support for renaming.
- **Search**: Improved navigation reliability using Enter/Click.
- **Dashboard**: Fixed Project Timeline missing active projects by linking database lists and tags.
- **Security**: Rotated Agent Access password after exposure.

## [0.1.0] - 2026-03-14 (Release Candidate 1)
### Added
- Dashboard (Today by bucket, hygiene/unscheduled/unbucketed, inbox by workspace)
- Docs (markdown, print)
- Import/Export + Export ZIP
- Attachments API + preview optimization
- CI (lint/build)
