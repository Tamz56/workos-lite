# RC1 Stabilization Triage Log

บันทึกประเด็นปัญหาที่พบจากการใช้งานจริงในเวอร์ชัน RC1

| ID | Surface | Symptom / Issue | Severity | Proposed Fix | Status |
|----|---------|-----------------|----------|--------------|--------|
| B1 | Inbox | "Tomorrow" button marks task as "Done" instead of scheduled | Friction | Fix handler for Tomorrow button in Inbox | FIXED |
| F01 | Project Detail | Rename input clearing is unreliable | Friction | Implement auto-focus and Enter support | FIXED |
| F02 | Search | Search navigation on Enter/Click is unreliable | Friction | Improve handler for search result selection | FIXED |
| F03 | Dashboard | Project Timeline shows no active projects incorrectly | Polish | Group tasks by list_id and project tags | FIXED |
| S01 | Security | Agent Access password exposed in chat | Critical | Rotate password in .env.local | FIXED |

---

## Issues by Surface

### Dashboard
### Dashboard
- [F03] FIXED: Project Timeline now grouping by database lists and tags.

### Inbox
- [B1] "Tomorrow" button incorrectly marks task as Done instead of just scheduling. (Severity: Friction)

### Today
*ยังไม่พบปัญหา*

### Projects
- [F01] Rename input clearing is unreliable (Severity: Friction)

### Notes
*ยังไม่พบปัญหา*

### Search
- [F02] Search navigation on Enter/Click is unreliable (Severity: Friction)

### Attachments
*ยังไม่พบปัญหา*

### Agent / Utilities
### Agent / Utilities
- [PASS] Agent UI accessed successfully with password.
- [S01] FIXED: Password rotated successfully (Verified).

---

## Final Status
**RC1 Baseline Verified** (2026-03-15)
- All critical and friction issues resolved.
- RC1.1 patch applied for dashboard timeline.
- Security rotation completed.
