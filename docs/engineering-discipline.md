# Engineering Discipline — WorkOS-Lite / ArborDesk

## Purpose

เอกสารนี้สรุปมาตรฐานการทำงานด้าน engineering สำหรับ WorkOS-Lite / ArborDesk เพื่อให้ AI coding agent และมนุษย์ทำงานร่วมกันได้อย่างปลอดภัย

## Core Rules

- Spec first
- Preserve behavior
- Small diff
- No unrelated refactor
- No schema change unless approved
- Lint/build before handoff
- Manual QA when touching workflow logic
- Document workflow changes

## Definition of Done

งานโค้ดหนึ่งชิ้นจะถือว่าเสร็จเมื่อ:

```text
1. Scope ชัด
2. Output ใช้ได้จริง
3. ไม่มีผลกระทบที่ไม่ตั้งใจ
4. lint ผ่าน
5. build ผ่าน
6. มี QA checklist ถ้าเกี่ยวกับ workflow
7. มี risk summary
8. มี files changed summary
```

## Protected Workflows

- Writing Desk Lite
- Article Studio
- GF Hub
- Publish Queue
- UTM Builder
- Article Import
- Topic ID Parsing
- Draft Save / Refresh Persistence
