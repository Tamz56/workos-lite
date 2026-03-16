# 7-Day Real Usage Feedback Sprint: WorkOS-Lite RC1.1

กระบวนการทดสอบและเก็บข้อมูลจากการใช้งานจริง (Real Usage) เป็นเวลา 7 วัน เพื่อเตรียมความพร้อมสำหรับ RC1.2

## Sprint Rules (กฎเหล็ก)
1. **No Major New Features**: ห้ามเพิ่มฟีเจอร์ใหม่ขนาดใหญ่
2. **Log Before Fix**: ทุกปัญหาต้องถูกบันทึกลง Log และจัดระดับความสำคัญก่อนเริ่มการแก้ไข
3. **Real Usage Only**: ประเมินผลจากการทำงานจริงในชีวิตประจำวัน

---

## Daily Usage Log (7-Day Sprint)

- **Issues Found**: D1-001, D1-002

#### Day 1 Verdict
- **Release confidence**: high
- **Main risk observed**: UI confidence gaps after actions, brief hydration trust issue
- **Most likely RC1.2 candidate so far**: D1-002

### [x] Day 2: Strategic Structure
- **Focus**: Projects, Project Detail, Rename/Archive Flow
- **Work Summary**: Created a project using the wizard, renamed it, and attempted to archive it from both the list and detail views.
- **Observations**: Renaming works but lacks feedback. Archive action is visually non-functional/unreliable. Encountered API 404s in the detail view.
- **Issues Found**: D2-001, D2-002, D2-003, D2-004

#### Day 2 Verdict
- **Release confidence**: medium
- **Main risk observed**: Archive status non-persistence/feedback, broken sub-entity API endpoints in detail view.
- **Most likely RC1.2 candidate so far**: D2-003 (Archive Fix) and the Toast notification system for all projects actions.

### [x] Day 3: Knowledge Base
- **Focus**: Notes, Note Linking, Attachments
- **Work Summary**: Created a new note, attempted project linking, and tested attachment visibility. Checked related notes linkage from the Project side.
- **Observations**: Significant regressions in UI stability (Title concatenation) and linking persistence. Navigation to `/notes` is broken.
- **Issues Found**: D3-001, D3-002, D3-003, D3-004, D3-005

#### Day 3 Verdict
- **Release confidence**: medium
- **Main risk observed**: UI state trust (data corruption in titles), navigation routing errors, and broken entity linking.
- **Most likely RC1.2 candidate so far**: D3-001 (Title Bug) and D3-004 (Loading Reliability).

### [x] Day 4: Navigation Speed
- **Focus**: Search / Command Palette (CMD+K), Cross-entity Navigation Consistency
- **Work Summary**: Used Search overlay to navigate between Dashboard, Projects, and Notes. Verified renamed entities and destination page consistency.
- **Observations**: Navigation routing is very stable. Search results for projects are accurate. Search results for notes suffer from name concatenation.
- **Issues Found**: D4-001, D4-002

#### Day 4 Verdict
- **Release confidence**: high (for search/navigation infrastructure)
- **Main risk observed**: note title state leakage into search results
- **Most likely RC1.2 candidate so far**: D3-001 root cause cluster, D2-003

### [x] Day 5: Insights Sanity
- **Focus**: Dashboard Analytics, Project Timeline Click-through, Timeline Sanity
- **Work Summary**: Verified 'Done Today' count updates after task completion. Observed Dashboard Timeline with renamed projects and checked click-through behavior.
- **Observations**: Analytics counts update correctly. However, a major UI bug (D5-001) causes project names to duplicate/concatenate in the timeline. Navigation from timeline is inconsistent with the Projects list.
- **Issues Found**: D5-001, D5-002, D5-003, D1-002 (confirmed)

#### Day 5 Verdict
- **Release confidence**: medium
- **Main risk observed**: high-visibility UI duplication and context inconsistency despite correct analytics counts
- **Most likely RC1.2 candidate so far**: D5-001 joins Tier A as a trust-impacting presentation bug

### [x] Day 6: Utility & Agent
- **Focus**: Agent Access, Return Navigation, Secure Utilities
- **Work Summary**: Verified Agent access and return navigation from various contexts (Dashboard, Project Detail). Checked for sidebar persistence and security friction.
- **Observations**: Return navigation is robust across all tested entities. Context and sidebar highlights are preserved correctly. No session or security friction observed. Confirmed D5-001 (UI Duplication) persists on multiple surfaces.
- **Issues Found**: None new (Confirmed D5-001)

#### Day 6 Verdict
- **Release confidence**: high (for utility/navigation infrastructure)
- **Main risk observed**: D5-001 persistent trust bug
- **Most likely RC1.2 candidate so far**: D5-001 (Presentation Trust), D3-001 (Data Trust)

### [x] Day 7: Full End-to-End Cycle & RC1.2 Filtering
- **Focus**: Capture -> Review -> Plan -> Execute -> Document -> Search (Full Cycle)
- **Work Summary**: Executed a complete lifecycle for a task named 'Day 7 Final Verification Task' and documented it in a note. Verified related notes linkage and search indexing.
- **Observations**: The end-to-end flow is functional, but a NEW critical failure was found: Note-to-Project metadata assignment does not persist (D7-001). Persistent UI bugs (D5-001, D3-001) remain highly visible.
- **Issues Found**: D7-001 (Critical), D3-001 (Confirmed), D5-001 (Confirmed), D3-004 (Intermittent)

#### Day 7 Verdict
- **Release confidence**: medium-low (due to core feature failure in note-project linking)
- **Main risk observed**: Data link degradation (Metadata loss) and pervasive high-visibility trust bugs.
- **Most likely RC1.2 candidate so far**: RC1.2 is strongly recommended to restore feature baseline and presentation trust.

---

## Issue Triage Criteria (RC1.2 Filter)

| Severity | Definition | Action |
|----------|------------|--------|
| **Critical** | Flow พัง, ข้อมูลผิดพลาด,Security Issue | Fix Now (RC1.1.x) |
| **Friction** | ใช้งานได้แต่ขัดมือ, State งง, Navigation ไม่นิ่ง | RC1.2 Candidate |
| **Polish** | Visual/Copy consistency, Spacing | RC1.2 or Later |
 
 ---
 
## RC1.2 Shortlist v1.0 (Final Audit)

### Tier A: Must-Address / Immediate (Fix-Now Class)
- **[D7-001]** Note Metadata Sync Failure (Linking doesn't persist)
- **[D3-001 / D4-001]** Note Title 'Untitled' Prefix Corrupting Data Search/Display
- **[D5-001]** Project Name Duplication in UI (Presentation Trust)
- **[D2-003]** Archive Project Action Reliability/Feedback
- **[D3-004]** Loading Reliability: ปัญหาการค้างหน้า Loading (D3-004) เกิดขึ้นเป็นระยะในหน้า Docs (Knowledge Bank)
- **[D2-004]** API Wiring: ปัญหาการโหลด Project Items ไม่สำเร็จ (D2-004) ส่งผลให้ Project Detail ใช้งานไม่ได้สมบูรณ์

### Tier B: High Value Friction Fixes
- **[D5-002]** Unify Dashboard vs Projects List Navigation
- **[D3-005]** Note-to-Project Dropdown Interaction Friction
- **[D1-002]** Hydration/Badge False-Positives (State Sync Trust)
- **[D1-001, D2-001, D2-002]** Success Toast Confirmation System

### Tier C: Polish & Minor
- **[D5-003]** Dashboard Statistic Alignment (Definitions/Semantics)
- **[D3-003]** /notes Route 404/SEO Cleanup
- **[D4-002]** "Untitled" Sticky State in Lists

---

## Daily Entry Template (Copy for new issues)

```markdown
### [D1-001] Missing Success Toast for Quick Task
- **ID**: D1-001
- **Date**: 2026-03-15
- **Surface**: Dashboard
- **Severity**: Polish
- **Title**: Missing Success Toast for Quick Task
- **Repro steps**: Click Quick Task -> Fill title -> Click Create Task
- **Expected**: Modal closes and a success toast appears.
- **Actual**: Modal closes immediately; no visual confirmation.
- **Frequency**: every time
- **Impact**: annoying only
- **Recommendation**: RC1.2
- **Status**: logged
- **Notes**: Impact is low because task appears in DB, but UX feels incomplete.

### [D1-002] Hydration Issue Badge near Settings
- **ID**: D1-002
- **Date**: 2026-03-15
- **Surface**: Global
- **Layer**: state sync / filter logic
- **Severity**: Friction
- **Title**: Hydration Issue Badge near Settings
- **Repro steps**: Observe the badge near the settings icon.
- **Expected**: Badge should only appear when there's a genuine hydration issue.
- **Actual**: Badge appears intermittently, even when data seems consistent.
- **Frequency**: sometimes
- **Impact**: annoying only
- **Recommendation**: RC1.2
- **Status**: logged
- **Notes**: Leads to user distrust in the system's state.

### [D2-001] Missing toast after project creation
- **ID**: D2-001
- **Date**: 2026-03-15
- **Surface**: Projects
- **Layer**: UI feedback
- **Severity**: Polish
- **Title**: Missing toast after project creation
- **Repro steps**: Use wizard to create project.
- **Expected**: Project appears in list with a success toast.
- **Actual**: Project appears, but no toast (unlike the wizard's success state which might be shadowed or unmounted too fast).
- **Frequency**: every time
- **Impact**: annoying only
- **Recommendation**: RC1.2
- **Status**: logged
- **Notes**: Consistency issue with D1-001.

### [D2-002] Missing toast after project renaming
- **ID**: D2-002
- **Date**: 2026-03-15
- **Surface**: Projects
- **Layer**: UI feedback
- **Severity**: Polish
- **Title**: Missing toast after project renaming
- **Repro steps**: Rename project via modal.
- **Expected**: Name updates with a success toast.
- **Actual**: Name updates, no toast.
- **Frequency**: every time
- **Impact**: annoying only
- **Recommendation**: RC1.2
- **Status**: logged

### [D2-003] Archive project action non-functional
- **ID**: D2-003
- **Date**: 2026-03-15
- **Surface**: Projects
- **Layer**: state sync / filter logic
- **Severity**: Critical
- **Title**: Archive project action non-functional (UI/State Mismatch)
- **Repro steps**: Click Archive on a project card or detail page.
- **Expected**: Project moves to 'Archived' list; UI updates/removes card from active view.
- **Actual**: DB update may succeed, but UI/state/filter feedback makes archive appear non-functional (stays in Planned list).
- **Frequency**: often
- **Impact**: blocked
- **Recommendation**: fix now
- **Status**: logged
- **Notes**: WATCHLIST. High risk of user frustration due to perceived non-persistence. Confirmed reproducible on Day 7.

### [D3-001] Note Title Concatenation Bug
- **ID**: D3-001
- **Date**: 2026-03-15
- **Surface**: Notes Detail
- **Layer**: state sync / UI feedback
- **Severity**: Critical
- **Title**: Note Title Concatenation Bug
- **Repro steps**: Click New Note -> Type title immediately.
- **Expected**: New title replaces "Untitled".
- **Actual**: New title is appended/concatenated to "Untitled".
- **Frequency**: every time
- **Impact**: slows me down
- **Recommendation**: fix now
- **Status**: logged
- **Notes**: High risk for data quality; makes system feel unpolished.

### [D3-002] Project Title Duplication in Grid
- **ID**: D3-002
- **Date**: 2026-03-15
- **Surface**: Projects List
- **Layer**: UI feedback
- **Severity**: Polish
- **Title**: Project Title Duplication in Grid
- **Repro steps**: Navigate to Projects page.
- **Expected**: Project name shown once.
- **Actual**: Project name appears duplicated in the card title.
- **Frequency**: every time
- **Impact**: annoying only
- **Recommendation**: RC1.2
- **Status**: logged

### [D3-003] /notes Route Returns 404
- **ID**: D3-003
- **Date**: 2026-03-15
- **Surface**: Navigation
- **Layer**: API Route
- **Severity**: Friction
- **Title**: /notes Route Returns 404
- **Repro steps**: Type /notes in browser URL.
- **Expected**: Redirect to /docs or list notes.
- **Actual**: 404 page.
- **Frequency**: every time
- **Impact**: annoying only
- **Recommendation**: RC1.2 / routing fix
- **Status**: logged

### [D3-004] Knowledge Bank Stuck on Loading
- **ID**: D3-004
- **Date**: 2026-03-15
- **Surface**: Notes List
- **Layer**: state sync
- **Severity**: Critical
- **Title**: Knowledge Bank Stuck on Loading
- **Repro steps**: Open /docs page.
- **Expected**: Notes list loads.
- **Actual**: Occasionally stays on "Loading knowledge bank..." indefinitely.
- **Frequency**: sometimes
- **Impact**: blocked
- **Recommendation**: fix now
- **Status**: logged

### [D3-005] Linked Project Dropdown Friction
- **ID**: D3-005
- **Date**: 2026-03-15
- **Surface**: Notes Detail
- **Layer**: UI feedback
- **Severity**: Friction
- **Title**: Linked Project Dropdown Friction
- **Repro steps**: Click 'Linked Project' in a note.
- **Expected**: Smooth selection.
- **Actual**: Clicks/keys often ignore selection or dropdown closes prematurely.
- **Frequency**: often
- **Impact**: slows me down
- **Recommendation**: RC1.2
- **Status**: logged

### [D4-001] Note Search Result Name Concatenation Bug (Linked to D3-001)
- **ID**: D4-001
- **Date**: 2026-03-15
- **Surface**: Search Overlay
- **Layer**: UI feedback / state sync
- **Severity**: Friction
- **Title**: Note Search Result Name Concatenation Bug (Linked to D3-001)
- **Repro steps**: Search for a note in the search overlay.
- **Expected**: Precise note name.
- **Actual**: Name is concatenated with "Untitled" (e.g., "UntitledMy Note").
- **Frequency**: every time
- **Impact**: annoying only
- **Recommendation**: Fix Now (Derivative of D3-001; solve via shared root cause)
- **Status**: logged
- **Notes**: High visibility in Search; affects user trust in data quality. Root cause likely same as D3-001.

### [D4-002] "Untitled" Prefix Sticky State
- **ID**: D4-002
- **Date**: 2026-03-15
- **Surface**: Notes Detail / Search
- **Layer**: state sync
- **Severity**: Polish
- **Title**: "Untitled" Prefix Sticky State
- **Repro steps**: View renamed notes in list or search.
- **Expected**: Renamed title only.
- **Actual**: Sometimes "Untitled" persists as a prefix or suffix even after rename.
- **Frequency**: often
- **Impact**: annoying only
- **Recommendation**: RC1.2
- **Status**: logged

### [D5-001] Project Name Duplication in UI
- **ID**: D5-001
- **Date**: 2026-03-15
- **Surface**: Dashboard Timeline / Projects List
- **Layer**: UI feedback / state sync
- **Severity**: Critical
- **Title**: Project Name Duplication/Concatenation in UI
- **Repro steps**: View Dashboard Timeline or Projects grid.
- **Expected**: Accurate project names.
- **Actual**: Project names appear duplicated or corrupted with partial name concatenations (e.g., "NameNameMe").
- **Frequency**: every time
- **Impact**: slows me down
- **Recommendation**: fix now
- **Status**: logged
- **Notes**: High risk for user trust; makes app look broken. Likely related to a render loop or state map key collision. **Crucial**: Backend counts and API data appear sane; duplication occurs specifically in UI rendering/state presentation layer. Confirmed again on Day 6 across multiple surfaces.

### [D5-002] Dashboard Timeline Navigation Inconsistency
- **ID**: D5-002
- **Date**: 2026-03-15
- **Surface**: Dashboard Timeline
- **Layer**: filter logic
- **Severity**: Friction
- **Title**: Dashboard Timeline Navigation Inconsistency
- **Repro steps**: Click a project name in Dashboard Timeline.
- **Expected**: Navigate to Project Detail (as it does in the Projects list).
- **Actual**: Navigates to Planner with project filter.
- **Frequency**: every time
- **Impact**: annoying only
- **Recommendation**: RC1.2 (Unify navigation)
- **Status**: logged

### [D5-003] Timeline vs Project Health Count Mismatch
- **ID**: D5-003
- **Date**: 2026-03-15
- **Surface**: Dashboard
- **Layer**: filter logic
- **Severity**: Polish
- **Title**: Timeline vs Project Health Count Mismatch
- **Repro steps**: View Dashboard.
- **Expected**: Mismatched headline counts explained (e.g., "Active Projects with Tasks").
- **Actual**: Timeline says "4 Projects" while health card says "12 Active", confusing the user about data scope.
- **Frequency**: every time
- **Impact**: annoying only
- **Recommendation**: RC1.2
- **Status**: logged
### [D7-001] Note Metadata Sync Failure
- **ID**: D7-001
- **Date**: 2026-03-16
- **Surface**: Notes Detail
- **Layer**: API / State persistence
- **Severity**: Critical
- **Title**: Note Metadata Sync Failure (Project Linking)
- **Repro steps**: Open a note -> Select a project in the dropdown -> Refresh or navigate away.
- **Expected**: Linking persists.
- **Actual**: Linking is lost; metadata returns to 'None'.
- **Frequency**: every time
- **Impact**: blocked (Breaks knowledge-project connection)
- **Recommendation**: fix now
- **Status**: logged
- **Notes**: Discovered during Day 7 cycle. Breaks a core value proposition of WorkOS-Lite (connected context).
