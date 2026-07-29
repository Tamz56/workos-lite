# WORKOS-DATA-002B — Canonical Project Registry Metadata Shared Persistence

## 1. Document Status

**Status:** Working Draft

**Gate Type:** Implementation Specification

**Parent Workstream:** WORKOS-DATA — Canonical Project Source of Truth

**Previous Gate:** WORKOS-DATA-002A — Project Registry Metadata Persistence and Import Readiness Audit

**Implementation Status:** Not Started

**Approval Authority:** คุณตั้ม

**Target Repository:** `/Users/tamz/projects/workos-lite`

**Last Updated:** 2026-07-29

---

## 2. Objective

ย้าย Project Registry Metadata ที่สำคัญจาก browser `localStorage` ไปยัง SQLite และ Project API ให้เป็น Shared Canonical Persistence

Gate นี้ต้องทำให้:

- Project List และ Project Detail อ่าน Registry Metadata จาก SQLite เป็นหลัก
- Detailed Project Status ไม่สูญเสียรายละเอียด
- Metadata คงอยู่หลัง refresh, restart และเปลี่ยน browser
- `localStorage` เดิมยังคงอยู่เป็น fallback ชั่วคราว
- ไม่มีการลบหรือ bulk migrate ข้อมูล localStorage อัตโนมัติ
- การกด Save ของผู้ใช้สามารถ promote ค่าเดิมจาก browser เข้า SQLite ได้อย่างชัดเจน
- ระบบเดิมที่ใช้ `projects.status = inbox | planned | done` ยังทำงานได้
- ไม่มีผลกระทบต่อ Context, Decisions, Deliverables, Loops, Gates, Docs หรือ Roadmap

---

## 3. Current Problem

Project Registry ปัจจุบันแบ่งข้อมูลเป็นสองส่วน

### SQLite

- `id`
- `slug`
- `name`
- `status`
- `owner`
- `start_date`
- `end_date`
- `created_at`
- `updated_at`

### Browser localStorage

Key:

`workos_projects_metadata_v1`

Fields:

- `category`
- `status`
- `priority`
- `currentGoal`
- `progressStage`
- `nextAction`
- `cadence`
- `riskOrBlockedBy`
- `lastUpdated`

ปัญหาปัจจุบัน:

- Metadata ไม่ตามไปเมื่อเปลี่ยน browser หรือ device
- List และ Detail ต้องประกอบข้อมูลจาก SQLite และ localStorage
- Registry Save เขียนสองปลายทางโดยไม่มี transaction
- Detailed status หลายค่าถูกย่อลงเป็น `planned`
- SQLite ไม่สามารถ reconstruct detailed status เดิมได้
- API ล้มเหลวแต่ localStorage อาจบันทึกสำเร็จ
- ไม่มี shared current state สำหรับ Arbor, Export หรือ Continuity Snapshot

---

## 4. Implementation Decision

### 4.1 Canonical Store

SQLite เป็น Canonical Source of Truth สำหรับ Registry Metadata หลัง Gate นี้ผ่าน

### 4.2 Compatibility Store

`localStorage` ยังคงอยู่ชั่วคราวในฐานะ Legacy Fallback

ห้าม:

- ลบ key
- clear key
- bulk import ค่าเดิมอัตโนมัติ
- overwrite SQLite จาก localStorage โดย silent migration

### 4.3 Additive Schema Only

Gate นี้ใช้การเพิ่ม column แบบ additive เท่านั้น

ห้าม:

- recreate `projects` table
- เปลี่ยน existing status CHECK constraint
- rename existing `projects.status`
- drop column
- rewrite existing rows แบบ bulk
- delete legacy metadata

---

## 5. Canonical Field Contract

เพิ่ม fields ต่อไปนี้ใน `projects`

| Column | Type | Nullable | Default | Purpose |
|---|---|---:|---|---|
| `category` | TEXT | Yes | `NULL` | Project classification |
| `registry_status` | TEXT | Yes | `NULL` | Detailed Project lifecycle status |
| `priority` | TEXT | Yes | `NULL` | Project priority |
| `current_goal` | TEXT | Yes | `NULL` | Current Project objective |
| `progress_stage` | TEXT | Yes | `NULL` | Current Project stage |
| `next_action` | TEXT | Yes | `NULL` | Current executable next action |
| `cadence` | TEXT | Yes | `NULL` | Review or work cadence |
| `risk_or_blocked_by` | TEXT | Yes | `NULL` | Current blocker or risk note |
| `metadata_updated_at` | TEXT | Yes | `NULL` | Canonicalization marker and last canonical metadata update |

### 5.1 Naming Decision

Gate นี้ใช้ชื่อ:

- `registry_status`
- `progress_stage`
- `risk_or_blocked_by`

เพื่อให้ตรงกับ implementation เดิมและลด migration risk

ยังไม่เปลี่ยนเป็น:

- `lifecycle_status`
- `stage`
- `blocker`

การ rename เชิง semantic อาจพิจารณาใน Gate หลังเมื่อ Project Pack และ Continuity Model พร้อมแล้ว

### 5.2 Canonicalization Marker

`metadata_updated_at` มีสองหน้าที่:

1. เป็นเวลาที่ canonical Registry Metadata ถูกบันทึกล่าสุด
2. แยก Project เดิมที่ยังไม่เคย canonicalize ออกจาก Project ที่ผู้ใช้ยืนยัน canonical snapshot แล้ว

Contract:

```text
metadata_updated_at IS NULL
= ยังไม่เคยมี user-confirmed canonical metadata snapshot
= legacy fallback อาจถูกใช้กับ DB fields ที่ยังเป็น NULL

metadata_updated_at IS NOT NULL
= canonical snapshot มีผลแล้ว
= ค่า NULL ใน canonical metadata เป็น intentional canonical blank
= ห้าม fallback ไปใช้ legacy localStorage
```

Marker นี้แก้ ambiguity ระหว่าง:

- `NULL` เพราะ existing Project ยังไม่ถูก migrate
- `NULL` เพราะผู้ใช้กด Save เพื่อล้างค่า

---

## 6. Allowed Values

### 6.1 `registry_status`

Accepted values:

- `idea`
- `planning`
- `active`
- `in_development`
- `testing`
- `in_use`
- `maintenance`
- `paused`
- `completed`

Gate นี้ยังไม่เพิ่ม `archived` เพื่อไม่เปลี่ยน behavior ของ Archive เดิม

Archive compatibility:

```text
registry_status = completed
projects.status = done
```

#### Legacy Core Mapping

| registry_status | projects.status |
|---|---|
| idea | inbox |
| planning | planned |
| active | planned |
| in_development | planned |
| testing | planned |
| in_use | planned |
| maintenance | planned |
| paused | planned |
| completed | done |

Important:

- SQLite `projects.status` ยังคงเป็น compatibility field
- UI ต้องแสดง `registry_status` เป็นค่าหลักเมื่อมี
- ห้าม reconstruct `registry_status` จาก core status หาก DB field มีค่าแล้ว

### 6.2 `priority`

Accepted values:

- `high`
- `medium`
- `low`
- `none`

Default semantic:

- `NULL` หมายถึงยังไม่มี canonical value หรือเป็น intentional blank หลัง canonicalization
- `none` หมายถึงผู้ใช้ระบุอย่างชัดเจนว่าไม่มี Priority

ห้ามใช้ `medium` เป็น automatic canonical default สำหรับ existing Projects

### 6.3 `progress_stage`

Gate นี้ยังไม่ล็อก enum แบบ database constraint

API validation รองรับ normalized non-empty string ตามค่าที่ UI เดิมใช้อยู่

เหตุผล:

- ต้องรักษาค่าจาก existing localStorage
- Category และ Stage inventory ยังไม่ผ่าน normalization gate
- หลีกเลี่ยงการ reject legacy values ที่ใช้งานจริง

UI สามารถใช้ list เดิมได้ แต่ API ต้อง trim ค่า

### 6.4 `category`

Gate นี้ใช้ normalized free-text string

Rules:

- trim whitespace
- empty string → `NULL`
- preserve Thai and English
- ไม่บังคับ enum
- ไม่ map `Other` เป็นค่าอื่นอัตโนมัติ

### 6.5 Text Fields

Fields:

- `current_goal`
- `next_action`
- `cadence`
- `risk_or_blocked_by`

Rules:

- trim leading and trailing whitespace
- preserve internal line breaks
- empty string → `NULL`
- preserve Thai text
- no automatic rewriting
- no AI normalization
- no placeholder auto-fill in API

---

## 7. Meaningful Blank Policy

Gate นี้กำหนด:

```text
NULL = ไม่มี canonical text value
```

Empty string จาก Client ต้อง normalize เป็น `NULL`

การล้างค่าโดยผู้ใช้:

```text
previous value → NULL
metadata_updated_at → current server timestamp
```

ต้องถือเป็น intentional update เมื่อผู้ใช้กด Save

Resolution behavior:

- ถ้า `metadata_updated_at` เป็น `NULL` ค่า metadata field ที่เป็น `NULL` ยังใช้ legacy fallback ได้
- ถ้า `metadata_updated_at` ไม่เป็น `NULL` ค่า metadata field ที่เป็น `NULL` ต้องแสดงเป็น blank/default presentation เท่านั้น และห้าม resurrect ค่า localStorage

Revision history และ Activity Event ยังอยู่นอก Scope

---

## 8. Canonical Defaults

### 8.1 Existing Projects

ห้ามเติม default ลง database อัตโนมัติ

Existing Projects จะมี:

```text
new metadata columns = NULL
metadata_updated_at = NULL
```

จนกว่า:

- ผู้ใช้กด Save
- หรือมี Migration Preview ใน `WORKOS-DATA-002C`

### 8.2 New Projects

เมื่อสร้าง user-facing Project ใหม่โดยไม่มี explicit status ให้สร้าง canonical defaults ดังนี้:

| Field | Default |
|---|---|
| `category` | `NULL` |
| `registry_status` | `idea` |
| `priority` | `none` |
| `current_goal` | `NULL` |
| `progress_stage` | `Concept` |
| `next_action` | `NULL` |
| `cadence` | `NULL` |
| `risk_or_blocked_by` | `NULL` |
| `metadata_updated_at` | creation timestamp |

Core compatibility:

```text
projects.status = inbox
registry_status = idea
```

Generic Thai placeholder text ต้องไม่ถูกบันทึกเป็น canonical value

### 8.3 Explicit Legacy or Seed Creation

เพื่อรักษา compatibility ของ caller เดิม:

| Explicit `projects.status` | Default `registry_status` when omitted |
|---|---|
| `inbox` | `idea` |
| `planned` | `planning` |
| `done` | `completed` |

Rules:

- ถ้า caller ส่งทั้ง `status` และ `registry_status` ต้องผ่าน compatibility mapping
- ถ้า caller ส่งเฉพาะ `status` ให้ใช้ mapping ในตารางนี้สำหรับ Project ใหม่เท่านั้น
- Existing seed rows ห้ามถูก rewrite
- Missing-seed creation ที่ส่ง `status=planned` จะได้ `registry_status=planning`
- Standard user-facing create flow ที่ไม่ส่ง status จะได้ `inbox + idea`

---

## 9. Read Precedence

Project List และ Project Detail ต้องใช้ resolution helper และกฎเดียวกัน

### 9.1 Pre-Canonical Existing Project

เมื่อ `metadata_updated_at IS NULL`:

```text
Canonical DB field when non-NULL
→ legacy localStorage field when DB field is NULL
→ UI display default
```

### 9.2 Canonicalized or New Project

เมื่อ `metadata_updated_at IS NOT NULL`:

```text
Canonical DB field, including intentional NULL
→ UI display default for presentation only
```

ห้ามอ่าน legacy localStorage มาแทน canonical `NULL`

### 9.3 Important Values

ค่า DB ที่เป็น:

- `none`
- `completed`
- `paused`
- `NULL` หลัง canonicalization

ต้องไม่ถูก localStorage overwrite โดยอัตโนมัติ

### 9.4 Fallback Source Indicator

Resolved internal state ต้องทราบ source ต่อ field:

- `database`
- `legacy_local`
- `ui_default`

ไม่จำเป็นต้องแสดง badge ต่อผู้ใช้ใน Gate นี้ แต่ helper ต้อง expose source เพื่อการตรวจและทดสอบ

---

## 10. Write Policy

### 10.1 Canonical Write

เมื่อผู้ใช้กด Save Registry:

1. Validate all fields
2. Send one API request containing core and metadata fields
3. Server updates SQLite atomically
4. Server sets `metadata_updated_at` ด้วย server timestamp
5. Client checks `response.ok`
6. Client uses returned Project record as canonical state
7. UI updates only after successful response
8. Legacy localStorage may be updated as compatibility mirror after API success

ห้ามเขียน localStorage ก่อน API สำเร็จ

### 10.2 Legacy Promotion

หาก Project ยังมี `metadata_updated_at = NULL` และ UI กำลังแสดง value จาก localStorage:

- การเปิดหน้าเฉย ๆ ห้าม promote
- การ refresh ห้าม promote
- การ load ห้าม promote
- เมื่อผู้ใช้กด Save ให้ถือว่าเป็น explicit confirmation
- Save payload ต้องส่ง resolved Registry snapshot ทั้งชุดเข้า SQLite

นี่คือ user-confirmed promotion ไม่ใช่ silent migration

### 10.3 Full Registry Snapshot Save

Registry Edit Save ต้องส่ง metadata fields ทั้งชุด ไม่ใช่ field-by-field metadata patch

เหตุผล:

- เมื่อ `metadata_updated_at` ถูกตั้ง ค่า `NULL` ทั้งหมดจะกลายเป็น canonical
- Server ต้องทราบ snapshot ที่ผู้ใช้เห็นและยืนยันครบ
- ป้องกัน unresolved legacy fields สูญหายหลัง marker ถูกตั้ง

### 10.4 Atomic Project Update

Gate นี้ไม่ควรใช้ field-by-field API requests

ใช้ Project-level update request เดียวเพื่อให้:

- name
- core status
- registry metadata

ถูก validate ก่อน write และบันทึกด้วย SQL update เดียวหรือ SQLite transaction เดียว

localStorage mirror ไม่ถือเป็นส่วนหนึ่งของ transaction

---

## 11. API Contract

### 11.1 Project List API

`GET /api/projects`

ต้องคืน fields เพิ่ม:

```json
{
  "category": null,
  "registry_status": null,
  "priority": null,
  "current_goal": null,
  "progress_stage": null,
  "next_action": null,
  "cadence": null,
  "risk_or_blocked_by": null,
  "metadata_updated_at": null
}
```

### 11.2 Project Detail API

`GET /api/projects/[slug]`

ต้องคืน canonical metadata fields ทั้งหมด

### 11.3 Create API

Project creation route ที่เกี่ยวข้องต้องสร้าง canonical defaults ตาม Section 8

ต้องตรวจทั้ง:

- Standard Project POST
- Create Project Wizard
- Create from Template route
- Missing-seed behavior

Create routes ต้องใช้ shared server-side default/mapping function หรือ contract เดียวกันเพื่อไม่ให้ผลต่างกัน

### 11.4 Update API

`PUT /api/projects/[slug]`

Request รองรับ:

```json
{
  "name": "string",
  "status": "inbox | planned | done",
  "category": "string | null",
  "registry_status": "supported value | null",
  "priority": "high | medium | low | none | null",
  "current_goal": "string | null",
  "progress_stage": "string | null",
  "next_action": "string | null",
  "cadence": "string | null",
  "risk_or_blocked_by": "string | null"
}
```

Server ต้อง:

- validate enum
- trim strings
- normalize blank to `NULL`
- verify status compatibility
- update `metadata_updated_at` เมื่อ request มี Registry metadata snapshot
- ไม่ update `metadata_updated_at` สำหรับ legacy core-only request
- update `updated_at` ผ่าน existing trigger
- return full updated Project record
- reject invalid payload ก่อน write
- ห้ามเกิด partial update

### 11.5 Response and Error Contract

Success:

- HTTP `200`
- full updated Project record
- canonical snake_case metadata fields

Validation failure:

- HTTP `400`
- stable `error` message
- ไม่มี database write

Compatibility conflict:

- HTTP `409`
- error code/message ระบุว่า core status ขัดกับ canonical `registry_status`
- ไม่มี database write

---

## 12. Status Compatibility Rules

### 12.1 Saving Detailed Status

Canonical Registry client ส่งทั้ง:

```text
registry_status
projects.status compatibility value
```

Server ต้อง verify mapping ตรงกัน

Valid:

```text
registry_status = testing
status = planned
```

Invalid:

```text
registry_status = testing
status = done
```

### 12.2 Legacy Core-Only Client

หาก legacy client ส่งเฉพาะ `status`:

#### Existing Project without canonical metadata

เมื่อ `metadata_updated_at IS NULL`:

- update core status ได้ตาม behavior เดิม
- ห้าม auto-map หรือ populate `registry_status`
- ห้ามตั้ง `metadata_updated_at`

#### Canonicalized Project

เมื่อ `metadata_updated_at IS NOT NULL` และ `registry_status` มีค่า:

- ถ้า core status ใหม่ตรงกับ mapping ของ existing `registry_status` ให้รับ request ได้
- ถ้า core status ใหม่ขัดกับ mapping ให้ reject `409`
- ห้าม overwrite populated `registry_status` โดยเดา detailed status จาก core status

เหตุผลคือ `planned` ไม่สามารถบอกได้ว่า detailed status เป็น planning, active, testing, paused หรือค่าอื่น

### 12.3 Archive

Existing Archive action ต้องส่ง:

```text
status = done
registry_status = completed
```

ห้ามเปลี่ยน semantics อื่นใน Gate นี้

---

## 13. localStorage Compatibility

Key เดิม:

`workos_projects_metadata_v1`

ยังต้องทำงานระหว่าง Transition

### 13.1 Read

- อ่านเป็น fallback เฉพาะ Project ที่ `metadata_updated_at IS NULL`
- ใน Project ดังกล่าว อ่านเฉพาะ field ที่ canonical DB เป็น `NULL`
- หลัง canonicalization ห้ามใช้ legacy metadata ใน resolved view

### 13.2 Write

หลัง API Save สำเร็จ สามารถเขียน compatibility mirror ด้วยค่าที่ server คืนมา

Mirror mapping:

| Canonical API | Legacy localStorage |
|---|---|
| `category` | `category` |
| `registry_status` | `status` |
| `priority` | `priority` |
| `current_goal` | `currentGoal` |
| `progress_stage` | `progressStage` |
| `next_action` | `nextAction` |
| `cadence` | `cadence` |
| `risk_or_blocked_by` | `riskOrBlockedBy` |
| `metadata_updated_at` | `lastUpdated` |

Null canonical valuesต้อง mirror เป็น empty legacy display valueหรือ omit fieldตาม existing parser compatibility ที่ tests ยืนยัน ห้ามเติม placeholder

### 13.3 Prohibited

ห้าม:

- clear key
- delete Project metadata entry
- bulk rewrite all records
- migrate on page load
- migrate on application startup
- use local `lastUpdated` เป็น DB timestamp
- treat local value as newerโดยอัตโนมัติ

### 13.4 Mirror Failure

หาก canonical API Save สำเร็จแต่ localStorage mirror ล้มเหลว:

- canonical Save ยังถือว่าสำเร็จ
- UI ต้องใช้ server response
- ห้าม rollback SQLite
- แจ้ง non-blocking warning หรือ log ที่ไม่เปิดเผย metadata content

### 13.5 Delete Project

การ cleanup localStorage ตอนลบ Project ยังอยู่นอก Scope เพราะต้องรวม Documentation Blocks และ Roadmap cleanup ใน Gate แยก

---

## 14. Database Migration Contract

### 14.1 Schema Bootstrap

`src/db/schema.sql` ต้องรวม columns ใหม่สำหรับ database ใหม่

### 14.2 Existing Database Migration

`src/db/db.ts` ต้องมี idempotent additive migration

Migration ต้อง:

- inspect existing columns
- add missing columns one-by-one
- not fail if column already exists
- not rewrite existing values
- not touch unrelated tables
- not seed metadata into existing Projects
- not modify Project rows beyond schema alteration

### 14.3 Migration Logging

ใช้ existing logging style

ต้องรายงานเฉพาะ:

- migration applied
- columns added
- already present
- error

ห้าม log Project content หรือ sensitive text values

### 14.4 Database Backup

ก่อนรัน implementation verification กับ database จริง ต้องสร้าง SQLite-consistent backup

Requirements:

- backup path อยู่นอก Git-tracked paths หรือใช้ existing ignored backup location
- ห้าม overwrite backup เดิม
- ต้องบันทึก source DB path, backup path, timestamp และ verification result
- ใน WAL mode ห้ามใช้ raw file copy ที่ไม่รับรอง consistency ขณะมี active writer
- ใช้ SQLite backup mechanism หรือหยุด writerอย่างปลอดภัยตาม implementation gate ที่ได้รับอนุมัติ

Gate นี้เป็น Specification เท่านั้นและยังไม่อนุญาตให้สร้าง backup หรือรัน migration

---

## 15. UI Contract

### 15.1 Projects Registry List

ต้อง:

- read canonical fields from API
- apply local fallback ตาม canonicalization rules
- display detailed status from resolved `registry_status`
- stop deriving all metadata from localStorage as primary
- preserve existing cards/table behavior
- preserve filters and badges
- prevent UI update if API save fails

### 15.2 Project Detail

ต้องใช้ resolution helper เดียวกับ Project List

ห้ามมี duplicate precedence/status mapping logic แยกกันระหว่างสอง components

### 15.3 Registry Edit Modal

ต้อง:

- initialize with resolved values
- indicate no behavioral change to user
- submit one canonical full Registry payload
- wait for API success
- show actionable error
- not close modal on failure
- not update localStorage on failure
- update displayed data from API response

### 15.4 Placeholder Handling

UI อาจแสดง helper placeholders แต่ต้องไม่บันทึก placeholder ลง DB จนผู้ใช้กรอกหรือเลือกจริง

Examples ที่ห้าม auto-save:

- กำหนดเป้าหมายโครงการ
- ระบุงานถัดไป
- ไม่มี
- Weekly
- Other

เว้นแต่ผู้ใช้เลือกหรือกรอกค่าเหล่านั้นจริง

---

## 16. Shared Type Contract

ปรับ `src/lib/types.ts` ให้มี canonical types

Suggested structure:

```ts
export type ProjectRegistryStatus =
  | "idea"
  | "planning"
  | "active"
  | "in_development"
  | "testing"
  | "in_use"
  | "maintenance"
  | "paused"
  | "completed";

export type ProjectPriority =
  | "high"
  | "medium"
  | "low"
  | "none";

export interface CanonicalProjectRegistryMetadata {
  category: string | null;
  registry_status: ProjectRegistryStatus | null;
  priority: ProjectPriority | null;
  current_goal: string | null;
  progress_stage: string | null;
  next_action: string | null;
  cadence: string | null;
  risk_or_blocked_by: string | null;
  metadata_updated_at: string | null;
}
```

Legacy localStorage type ต้องคงไว้แยกต่างหาก

ห้าม reuse type เดียวกันโดยมี camelCase และ snake_case ปะปน

`Project` API type ควรรวม canonical metadata fields หรือ compose กับ `CanonicalProjectRegistryMetadata` โดยไม่เปลี่ยน legacy storage shape

---

## 17. Resolution Helper

สร้าง helper ขนาดเล็กสำหรับ:

```text
Canonical API Project
+ Legacy localStorage metadata
+ UI defaults
→ Resolved Registry View Model
```

Candidate location:

`src/lib/projects/registryMetadata.ts`

Helper ต้อง:

- pure function
- no localStorage access inside helper
- use `metadata_updated_at` canonicalization marker
- apply field-level precedence before canonicalization
- preserve canonical NULL after canonicalization
- expose source per fieldสำหรับ test
- preserve intentional canonical values
- not mutate input
- centralize detailed-to-core status mapping

การสร้าง helper ใหม่อยู่ใน Scope เพราะ List และ Detail มี mapping ซ้ำและต้องใช้ contract เดียวกัน

---

## 18. Candidate Files

### Expected Candidate Files

- `src/db/schema.sql`
- `src/db/db.ts`
- `src/lib/types.ts`
- `src/lib/projects/registryMetadata.ts` — new candidate
- `src/app/api/projects/route.ts`
- `src/app/api/projects/[slug]/route.ts`
- `src/app/api/admin/create-project-from-template/route.ts`
- `src/app/(main)/projects/ProjectsClient.tsx`
- `src/app/(main)/projects/[slug]/ProjectDetailClient.tsx`
- focused tests under `tests/unit/`

### Candidate Only If Required

- `src/components/dashboard/CreateProjectWizard.tsx`

เปลี่ยนไฟล์นี้เฉพาะเมื่อ request payloadหรือ UI create behavior จำเป็นต้องปรับเพื่อให้ creation defaults ตรง contract และ route ไม่สามารถรับผิดชอบได้เพียงจุดเดียว

### Must Not Change

- Context routes
- Decisions routes
- Loop routes
- Gate routes
- Project Item routes
- Planner Import
- Agent Execute API
- Backup/Restore
- Documentation Blocks
- Roadmap
- Google Drive integration
- MCP integration

---

## 19. Implementation Sequence

### Step 1 — Precondition Verification

ตรวจ:

- repository path
- branch
- HEAD
- git status
- baseline modified files
- database path
- current schema

ก่อนการเปลี่ยน schema หรือ verification กับ database จริง ต้องผ่าน explicit approval สำหรับ backup/migration action

### Step 2 — Shared Types and Mapping

เพิ่ม:

- canonical metadata types
- enum validation
- status compatibility mapper
- DB/local/default resolution helper

### Step 3 — Additive Database Migration

เพิ่ม columns ใน:

- `schema.sql`
- runtime migration

### Step 4 — API Read Contract

ปรับ List และ Detail API ให้คืน canonical fields

### Step 5 — API Create and Update

เพิ่ม defaults, validation, canonicalization marker และ atomic update

### Step 6 — UI DB-First Read

ปรับ Registry List และ Project Detail ให้ใช้ API fields เป็นหลักตาม resolution contract

### Step 7 — Save Flow

เปลี่ยนเป็น:

```text
submit full Registry snapshot
→ verify response
→ update canonical UI
→ update compatibility localStorage mirror
```

### Step 8 — Tests

รัน focused unit/integration tests

### Step 9 — Runtime Verification

ตรวจ Project เดิมและ Project ใหม่ตาม approved test environment

### Step 10 — Final Evidence

รายงาน:

- changed files
- commands
- tests
- runtime result
- database verification
- fallback behavior
- remaining risks
- final git status

---

## 20. Required Tests

### 20.1 Schema Tests

- Existing database fixture gains additive columns
- Re-running migration is safe
- Existing Project row values remain unchanged
- No table recreation
- No unrelated row count changes
- New database schema includes columns

### 20.2 API Read Tests

- List returns canonical metadata
- Detail returns canonical metadata
- NULL values serialize correctly
- `metadata_updated_at` serializes correctly
- Detailed status survives round trip
- Existing core fields remain unchanged

### 20.3 API Update Tests

- valid metadata update succeeds
- invalid registry status rejected
- invalid priority rejected
- blank strings normalize to NULL
- status compatibility mismatch rejected
- update is atomic
- response returns full updated record
- `metadata_updated_at` changes on full metadata update
- legacy core-only update does not set marker
- conflicting core-only update after canonicalization returns `409`

### 20.4 Creation Tests

- user-facing new Project gets approved defaults
- create-from-template gets same user-facing defaults
- explicit legacy `planned` creation maps to `registry_status=planning`
- missing-seed creation preserves planned semantics
- generic placeholder text is not stored
- core status and registry status mapping is consistent

### 20.5 Resolution Helper Tests

- pre-canonical DB value wins over legacy local value
- pre-canonical local value is used when DB is NULL
- pre-canonical UI default is used when both are missing
- canonicalized DB NULL does not fall back to legacy
- `none` is treated as canonical value
- `paused` is preserved
- empty legacy value does not overwrite canonical
- source metadata is correct per field
- inputs are not mutated

### 20.6 UI Save Behavior

- API failure does not update canonical UI
- API failure does not update localStorage mirror
- API failure keeps modal open
- successful save updates UI from server response
- legacy values are promoted only after Save
- full resolved snapshot is sent on first promotion
- refresh reads DB value
- clearing browser localStorage does not lose saved metadata
- mirror failure does not roll back canonical state

### 20.7 Regression Tests

- Deliverables unchanged
- Context unchanged
- Decisions unchanged
- Loops unchanged
- Gate events unchanged
- SQLite docs unchanged
- Documentation Blocks unchanged
- Roadmap unchanged

---

## 21. Runtime Verification Scenarios

### Scenario A — Existing Project with localStorage only

1. Open Project
2. Confirm UI shows legacy fallback
3. Do not save
4. Confirm SQLite fields and `metadata_updated_at` remain NULL
5. Save Registry
6. Confirm SQLite receives resolved full snapshot
7. Confirm `metadata_updated_at` is set by server
8. Refresh
9. Confirm DB is used

### Scenario B — DB and localStorage conflict

1. DB has canonical value and marker
2. localStorage has different value
3. Open Project
4. Confirm UI shows DB value
5. Confirm no silent overwrite

### Scenario C — Intentional Canonical Blank

1. Existing Project has legacy `nextAction`
2. Promote metadata by Save
3. Clear Next Action and Save again
4. Confirm `next_action = NULL`
5. Refresh
6. Confirm legacy Next Action does not reappear

### Scenario D — Browser localStorage cleared

1. Save canonical metadata
2. Clear localStorage ใน isolated test profile
3. Refresh
4. Confirm metadata remains

### Scenario E — Detailed Status

1. Set `testing`
2. Save
3. Confirm:
   - `registry_status = testing`
   - `status = planned`
4. Refresh
5. Confirm UI still displays `testing`

### Scenario F — Archive

1. Archive Project
2. Confirm:
   - `registry_status = completed`
   - `status = done`
3. Confirm existing archive view still works

### Scenario G — API Failure

1. Simulate validation or server failure
2. Confirm Modal remains open
3. Confirm error visible
4. Confirm UI and localStorage not updated

### Scenario H — Legacy Core-Only Status Request

1. Use pre-canonical Project and send core-only status update
2. Confirm core status updates without setting metadata marker
3. Use canonicalized Project and send matching core-only status
4. Confirm request succeeds without changing detailed status
5. Send mismatched core-only status
6. Confirm request returns `409` and writes nothing

---

## 22. Data Verification

ก่อนและหลัง implementation ต้องตรวจ:

- Project row count
- Project Item row count
- Context row count
- Decision row count
- Loop row count
- Gate Event row count
- Docs row count
- Notes row count
- `PRAGMA foreign_key_check`
- schema columns
- selected Project values
- no unintended status changes

Existing Project metadata columns และ `metadata_updated_at` ต้องยังเป็น NULL ก่อน user-confirmed Save

Verification ต้องแยก:

- schema-only change
- explicit test fixture writes
- user-confirmed runtime Save
- unrelated pre-existing database state

---

## 23. Risk Assessment

### High

#### Runtime Schema Migration

`db.ts` มี side effects และ runtime migrations

Mitigation:

- additive only
- idempotent column checks
- SQLite-consistent database backup
- schema verification
- row-count verification

#### DB/localStorage Precedence

ความผิดพลาดอาจทำให้ legacy value ทับ canonical valueหรือทำให้ intentional blank ฟื้นกลับมา

Mitigation:

- strict DB-first helper
- `metadata_updated_at` canonicalization marker
- field-level tests
- no load-time promotion

#### Status Compatibility

Detailed status กับ core status อาจไม่ตรงกัน

Mitigation:

- central mapper
- server validation
- reject incompatible core-only update after canonicalization
- round-trip tests

### Medium

#### List/Detail Logic Divergence

สอง component มี mapping ซ้ำ

Mitigation:

- shared resolution helper

#### API/UI Partial State

UI อาจอัปเดตก่อน response

Mitigation:

- update only from successful server response
- full Project-level update request

#### Creation Path Differences

Wizard, standard route และ seed flow อาจสร้าง defaults ไม่เหมือนกัน

Mitigation:

- shared server creation contract
- explicit legacy/seed mapping
- focused create tests

### Low

#### Compatibility Mirror

localStorage mirror อาจล้มเหลวหลัง DB สำเร็จ

Mitigation:

- DB remains canonical
- non-blocking warning/log
- no rollback of successful canonical write

---

## 24. Rollback Plan

### 24.1 Code Rollback

คืน UI read path ไปใช้ legacy localStorage-first behavior

### 24.2 Database Rollback

ไม่ drop columns

New columns สามารถคงอยู่แบบ inert ได้

เหตุผล:

- destructive schema rollback มีความเสี่ยงสูงกว่า
- Gate ใช้ additive migration
- existing code สามารถ ignore columns ได้

### 24.3 Data Rollback

ก่อน verification กับ database จริงต้องมี SQLite-consistent backup

หากมี canonical data ที่บันทึกผิด:

- restore backup เฉพาะเมื่อ approved rollback scope ครอบ database ทั้งก้อน
- หรือแก้ field แบบ controlled update ตาม evidence

Gate นี้ยังไม่มี Migration ID-based rollback เพราะไม่มี bulk metadata migration

### 24.4 localStorage

ห้ามลบ localStorage จึงยังเป็น fallback สำหรับ functional rollback

หลัง Project ถูก canonicalize แล้ว code rollback เท่านั้นที่อาจกลับไปอ่าน legacy-first; implementation report ต้องระบุความเสี่ยงหาก legacy mirror ไม่สำเร็จ

---

## 25. Acceptance Criteria

Gate นี้ถือว่า `Passed` เมื่อ:

- additive schema migration ผ่าน
- canonical metadata fields อยู่ใน SQLite
- API อ่านและเขียน fields ได้
- List และ Detail ใช้ DB-first precedence
- detailed status round-trip ได้โดยไม่สูญเสีย
- localStorage fallback ยังทำงานสำหรับ pre-canonical Project
- canonical NULL ไม่ถูก legacy value resurrect
- ไม่มี silent localStorage promotion
- Save เป็น explicit full-snapshot promotion
- API failure ไม่สร้าง split state ใหม่
- new Project defaults ตรงกันตาม creation contract
- legacy/seed explicit status mapping ตรง contract
- refresh persistence ผ่าน
- browser-local data loss ไม่กระทบ canonical metadata
- regression checks ผ่าน
- database counts ไม่เปลี่ยนโดยไม่ตั้งใจ
- no changes outside approved candidate files
- no commit
- no push
- no deploy
- user review ผ่าน

---

## 26. Out of Scope

- Bulk localStorage migration
- Migration Preview UI
- Delete legacy localStorage key
- Project delete localStorage cleanup
- Context revision
- Decision redesign
- Evidence records
- Review records
- Handoff records
- Activity Event records
- Continuity Snapshot
- Project Pack Export
- Unified Project Pack Import
- Project backup redesign
- Google Drive
- API/MCP Connector
- Authentication redesign
- Deployment
- Commit

---

## 27. Required Implementation Report

Implementation Agent ต้องรายงาน:

1. Precondition and baseline
2. Database backup method and path
3. Candidate files confirmed
4. Changed files
5. Schema changes
6. API contract changes
7. UI precedence behavior
8. localStorage compatibility behavior
9. Commands executed
10. Tests executed
11. Runtime verification
12. Data verification
13. Remaining risks
14. Rollback path
15. Final Git status
16. Commit status

---

## 28. Approval Gate

ก่อนเริ่มแก้โค้ด ผู้ใช้ต้องอนุมัติ:

- additive columns
- field names
- `metadata_updated_at` canonicalization semantics
- allowed registry status values
- DB-first precedence
- NULL policy
- explicit full-snapshot Save promotion
- creation defaults
- explicit legacy/seed creation mapping
- compatibility status mapping
- legacy core-only conflict policy
- localStorage mirror policy
- SQLite-consistent backup requirement
- non-destructive rollback
- candidate file scope

Approval ของเอกสารนี้ไม่ถือเป็น approval ให้:

- รัน migration
- สร้าง database backup
- เปลี่ยน source code
- เปลี่ยน database data
- commit, push หรือ deploy

Implementation ต้องเริ่มจาก approval message แยกต่างหาก

---

## 29. Current Gate Status

**Status:** Ready for Approval

### Passed

- current architecture audited
- field contract defined
- canonicalization marker defined
- meaningful blank behavior defined
- precedence defined
- compatibility mapping defined
- legacy status conflict behavior defined
- creation behavior defined
- migration approach defined
- tests defined
- rollback defined
- candidate files identified

### Pending

- user approval
- implementation prompt
- code changes
- validation
- user review
