# Session Summary Template

ใช้ก่อนจบแชท ย้ายแชท หรือบันทึกลง WorkOS

---

## Copy Template

````md
# Session Summary

## Project
[ชื่อโปรเจกต์]

## Session Date
[วันที่]

## Context
[บริบทสั้น ๆ ว่า session นี้ทำเรื่องอะไร]

## What We Completed
- [สิ่งที่ทำเสร็จ 1]
- [สิ่งที่ทำเสร็จ 2]
- [สิ่งที่ทำเสร็จ 3]

## Current Status
[สถานะปัจจุบัน เช่น committed / draft ready / waiting review / next step planned]

## Files / Commits / Outputs
- [ไฟล์ที่สร้างหรือแก้]
- [commit message ถ้ามี]
- [link หรือ artifact ถ้ามี]

## Decisions Made
- [decision 1]
- [decision 2]

## Risks / Watchouts
- [risk 1]
- [risk 2]
- [สิ่งที่ต้องระวังรอบหน้า]

## Next Recommended Step
[ขั้นตอนถัดไปที่ควรทำ]

## Prompt to Continue in New Chat
```text
Arbor ช่วยต่อจาก Session Summary นี้

Project:
[ชื่อโปรเจกต์]

Current Status:
[สถานะล่าสุด]

Next Step:
[ขั้นตอนถัดไป]

Constraints:
- ทำทีละ scope
- ไม่ข้ามขั้นตอนสำคัญ
- ถ้าเป็นงานโค้ด ให้อ้างอิง AGENTS.md
- ถ้าเป็นงานบทความ Green Fineness ให้ใช้ Editorial Guardrails

เริ่มจากสรุปความเข้าใจและเสนอ next step ที่ปลอดภัยที่สุด
```
````

---

## Short Version

ใช้เมื่ออยากสรุปเร็ว:

```md
# Quick Session Wrap

## Done
- ...

## Status
- ...

## Next
- ...

## Watchouts
- ...

## Continue Prompt
Arbor ช่วยต่อจากสถานะนี้: ...
```
