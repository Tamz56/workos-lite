# ASTRO-APP-QA-020 — Reflection History Filters v0.1 Regression QA

## Ticket

ASTRO-APP-DEV-039

## Scope

- เพิ่ม filter panel เหนือ Reflection History List
- text search, mode dropdown, energy dropdown, month dropdown
- count summary, empty filtered state, clear filters button
- ไม่เปลี่ยน schema, ไม่เพิ่ม localStorage key ใหม่, ไม่แตะ logic ดวง

## Checklist

### Build & Lint

- [x] `npm run lint` — 0 errors, 402 warnings (pre-existing)
- [x] `npm run build` — compiled successfully, all routes generated

### Filter UI Rendering

- [ ] Filter panel ปรากฏเหนือ history list เมื่อมี historyLogs > 0
- [ ] Title: "Reflection History Filters" + subtitle "ช่วยค้นและกรองประวัติสะท้อนคิดในเครื่องนี้"
- [ ] Cautious note: "ตัวกรองนี้ทำงานเฉพาะบนข้อมูลที่อยู่ในเครื่องนี้เท่านั้น ไม่เปลี่ยนแปลง ไม่ลบ และไม่บันทึกค่าการกรองลงในระบบ"
- [ ] Search input with placeholder "ค้นหา..."
- [ ] Mode dropdown (All + dynamic modes from history)
- [ ] Energy dropdown (All + dynamic energy levels from history)
- [ ] Month dropdown (All, This Month, Last Month)

### Filter Behavior

- [ ] Text search กรองจากข้อความ reflectionSummary, noticedNotes, nextRightAction, intention, cautionNote, modes
- [ ] Mode dropdown กรองตาม reflectionMode หรือ strategyMode
- [ ] Energy dropdown กรองตาม dailyCheckinSnapshot.energyLevel
- [ ] Month dropdown: "This Month" กรองเฉพาะเดือนปัจจุบัน, "Last Month" กรองเฉพาะเดือนที่แล้ว
- [ ] Filters ทำงานร่วมกัน (AND logic)

### Count Summary

- [ ] แสดง "Showing X of Y records" + "แสดง X จากทั้งหมด Y บันทึก"
- [ ] ตัวเลขอัปเดต real-time ตาม filter

### Empty Filtered State

- [ ] เมื่อ filter ไม่พบผลลัพธ์ แสดง "ไม่พบบันทึกที่ตรงกับตัวกรอง ลองล้างตัวกรองหรือค้นด้วยคำที่กว้างขึ้น"
- [ ] มีปุ่ม "Clear Filters (ล้างตัวกรอง)" ใน empty state

### Clear Filters

- [ ] ปุ่ม "Clear Filters (ล้างตัวกรอง)" ปรากฏเมื่อมี filter ใดเปิดอยู่
- [ ] กดแล้ว reset search, mode, energy, month กลับเป็นค่าเริ่มต้น

### Empty History State (No Records)

- [ ] เมื่อไม่มี historyLogs เลย แสดง empty state เดิม "ยังไม่มีบันทึกประวัติการสะท้อนคิดถาวร"
- [ ] Filter panel ไม่แสดงเมื่อ historyLogs = 0

### Existing Behavior Preserved

- [ ] ปุ่ม "คัดลอกประวัติทั้งหมด" ยังทำงานปกติ
- [ ] ปุ่ม "ล้างประวัติทั้งหมด" ยังทำงานปกติ
- [ ] ปุ่ม "คัดลอก" per-item ยังทำงานปกติ
- [ ] ปุ่ม "โหลดมาแทนที่" ยังทำงานปกติ
- [ ] ปุ่ม "ลบ" per-item ยังทำงานปกติ
- [ ] บันทึกเข้าประวัติ (Save as History) ยังทำงานปกติ
- [ ] Max 20 records limit ยังบังคับใช้

### No Persistence Side Effects

- [ ] ไม่มี localStorage key ใหม่ถูกสร้าง
- [ ] ค่า filter ไม่ถูก persist (รีโหลดแล้วกลับเป็น default)
- [ ] ไม่มีการ write-back หรือ modify historyLogs จาก filter

### Layout & Responsiveness

- [ ] Filter panel wrap cleanly บน mobile viewport
- [ ] History item cards ยังมี style เดิมทั้งหมด
- [ ] Scrollable area (max-h-[420px]) ยังทำงานปกติ

## Verification Commands

```bash
npm run lint    # 0 errors
npm run build   # compiled successfully
```

## Result

- Lint: ✅ PASS (0 errors)
- Build: ✅ PASS
- Manual QA: ⬜ Pending user verification

## Notes

- Filter UI จะแสดงเฉพาะเมื่อมี historyLogs > 0
- uniqueModes และ uniqueEnergies ดึงจาก historyLogs แบบ dynamic
- filteredHistoryLogs ใช้ AND logic ระหว่าง filter ทั้ง 4 ตัว
- ไม่มี mock data / ไม่มี test fixture commit เข้ามา
