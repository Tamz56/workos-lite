# Decision Log Template

ใช้บันทึกการตัดสินใจสำคัญของโปรเจกต์ เพื่อให้ไม่ลืมเหตุผลของระบบ

---

## Why Decision Log Matters

หลายงานของคุณตั้มมี decision เชิงระบบ เช่น:

- ไม่ rebuild Writing Desk Lite ใหม่
- ใช้ Stitch เป็น visual reference เท่านั้น
- ใช้ AGENTS.md เป็นกติกากลางสำหรับ AI coding agent
- เริ่ม productization จาก Template / Workflow Pack ก่อน SaaS
- แยกงาน Green Fineness เป็น step-gated workflow
- ใช้ WorkOS เป็น memory และ operating system

Decision Log ช่วยเก็บว่า:

```text
เราตัดสินใจอะไร
ทำไมถึงตัดสินใจแบบนั้น
กระทบอะไร
สถานะของ decision คืออะไร
```

---

## Copy Template

```md
# Decision Log

## YYYY-MM-DD — [Decision Title]

### Decision
[เราตัดสินใจอะไร]

### Why
[เหตุผลที่ตัดสินใจแบบนี้]

### Alternatives Considered
- [ทางเลือกอื่น 1]
- [ทางเลือกอื่น 2]

### Impact
[ผลกระทบต่อระบบ งาน workflow หรืออนาคต]

### Risks
[ความเสี่ยงหรือข้อควรระวัง]

### Status
Adopted / Testing / Revisit Later / Rejected

### Related Files / Notes
- [ไฟล์]
- [task]
- [commit]
- [link]
```

---

## Example

```md
## 2026-05-11 — Use AGENTS.md as AI Agent Guardrail

### Decision
เพิ่ม `AGENTS.md` ที่ root repo เพื่อให้ AI coding agent อ่านกติกาก่อนทำงาน

### Why
ลดความเสี่ยงจากการ rebuild, แก้ DB/API โดยไม่จำเป็น, ข้าม lint/build/test หรือทำงานเกิน scope

### Alternatives Considered
- ใช้ prompt เฉพาะครั้งต่อครั้ง
- เก็บ rules ไว้ในแชทเท่านั้น

### Impact
ทุก dev brief ต่อจากนี้ควรเริ่มด้วย:
“Read AGENTS.md first and follow the WorkOS-Lite / ArborDesk engineering discipline.”

### Risks
ถ้า AGENTS.md ไม่ถูกอัปเดตตามระบบจริง อาจกลายเป็น rule ที่ล้าสมัย

### Status
Adopted

### Related Files / Notes
- AGENTS.md
- docs/engineering-discipline.md
- docs/agent-rules/
```
