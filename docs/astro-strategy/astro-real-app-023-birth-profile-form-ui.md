# ASTRO-REAL-APP-DEV-023 — Birth Profile Form UI

เอกสารนี้ระบุการออกแบบและพัฒนารายละเอียดหน้าจอจัดการข้อมูลวันเกิด (Birth Profile Form UI) ในIsolated Real App Preview เพื่อให้ผู้ใช้สามารถตรวจสอบ แก้ไข บันทึก หรือรีเซ็ตข้อมูลวันเกิดของตัวเองที่ถูกจัดเก็บแบบปลอดภัยในเครื่องคอมพิวเตอร์เบราว์เซอร์ได้

## Goal
เพิ่มแถบจัดการข้อมูลโปรไฟล์วันเกิด (Birth Profile Panel) ในระบบ Real App Preview และอนุญาตให้แก้ไข ฟอร์แมต บันทึก ลงคีย์ `astro-real-app:birth-profile:v1` ผ่านกลไกการรับรองความถูกต้อง (Validation)

## Scope
- พัฒนาส่วนประกอบ `AstroBirthProfilePanel.tsx` ภายใต้ `src/components/workspaces/astro-strategy/real-app/components/`
- นำส่วนประกอบไปจัดวางแสดงผลเป็นแท็บใหม่ภายใต้แผงควบคุมระบบนำทางหลักของ Real App Preview
- รองรับฟิลด์ข้อมูลการแก้ไขที่จำเป็น:
  - `displayName`
  - `fullName`
  - `birthDate` (รูปแบบ YYYY-MM-DD)
  - `birthTime` (รูปแบบ HH:mm)
  - `birthPlace`
  - `timezone`
  - `utcOffset`
  - `birthWeekday`
  - `notes`
- แสดงข้อผิดพลาดการกรอกข้อมูล (Validation errors) ใต้ฟิลด์ที่เกี่ยวข้อง
- รองรับการกด บันทึก (Save) และ การรีเซ็ตเป็นค่าตั้งต้น (Reset to default) แบบผ่านการกดยืนยัน (Confirmation)
- แสดงแถบเตือนจริยธรรมข้อมูล (Ethics/Medical Disclaimer Callout)

## Non-Scope
- ไม่ยุ่งเกี่ยวกับเส้นทางหลัก `/workspaces/astro-strategy` หรือ Logic เดิมของ Prototype
- ไม่เชื่อมต่อข้อมูลวันเกิดไปใช้คำนวณสรุปเวลาดาราศาสตร์ดั้งเดิมในวันนี้/สะท้อนคิดรอบสัปดาห์ (การเชื่อมโยงจะเกิดขึ้นใน DEV-024)
- ไม่ทำการปรับปรุงหรือเปลี่ยนแปลงระบบการดึงข้อมูลและคีย์อื่นๆ นอกเหนือจากที่ระบุ

## UI Layout & Design
- แสดงฟิลด์กรอกข้อมูลเป็นแบบ Grid layout สีธีมมืดหรูหรา (Premium dark mode matching) พร้อมการจัดแนวแบบ Responsive
- แสดงแถบสถานะการบันทึกล่าสุดและเวอร์ชันข้อมูลมุมบนขวา
- แสดงผลกล่องจริยธรรมคำเตือนความปลอดภัยส่วนล่าง:
  > **คำเตือนความปลอดภัยและจริยธรรมดาราศาสตร์**
  > ข้อมูลนี้ใช้เพื่อการสะท้อนและวางแผนเชิงกลยุทธ์เท่านั้น ไม่ใช่คำทำนายตายตัวหรือคำแนะนำทางการแพทย์

## Files Changed/Created
- `src/components/workspaces/astro-strategy/real-app/components/AstroBirthProfilePanel.tsx` [NEW]
- `src/components/workspaces/astro-strategy/real-app/AstroRealAppPreview.tsx` (เพิ่มแท็บ Birth Profile และแสดงผล Panel)
- `docs/astro-strategy/astro-real-app-023-birth-profile-form-ui.md` [NEW]
- `docs/astro-strategy/qa-real-app-023-birth-profile-form-ui.md` [NEW]

## Future DEV-024 Recommendation
ใน DEV-024 จะเชื่อมโยงระบบบันทึกโปรไฟล์วันเกิดที่กรอกนี้เข้าไปในตัวคำนวณจริง `calculateAstroTimingBrief` โดยนำข้อมูลที่เซฟใน LocalStorage นี้ไปใช้คำนวณแนวทางรายวันและการสะท้อนคิดรอบสัปดาห์สดแทนการดึง Mock ข้อมูลชั่วคราว
