# QA Real App 066 — Chinese Metaphysics Today Panel Optional Context Plan

เอกสารตรวจสอบคุณภาพของแผนผสานหน้าจอระบบย่อยเมตาฟิสิกส์จีน (Chinese Metaphysics Today Panel Optional Context Plan) สำหรับเฟส MVP-v4

---

## 1. การตรวจสอบตำแหน่งจัดวางและการพับเก็บได้บนหน้าจอ (UI Placement & Collapsible Card Check)

* **สถานะ**: Passed
* **หลักฐาน (Evidence)**:
  - กำหนดให้ตำแหน่งการ์ดจีนอยู่ด้านล่างสุดใต้การ์ดยามไทยใน [astro-real-app-066-chinese-metaphysics-today-panel-optional-context-plan.md](file:///Users/tamz/projects/workos-lite/docs/astro-strategy/astro-real-app-066-chinese-metaphysics-today-panel-optional-context-plan.md)
  - กำหนดพฤติกรรมให้ปิดพับเป็นค่าเริ่มต้น (Collapsed by default) เพื่อไม่เบียดบังข้อมูลหลักและรักษาพื้นที่สายตา
* **บันทึก (Notes)**:
  - การกำหนดเป็นลักษณะการ์ดเสริมลำดับสอง (Secondary optional) ช่วยแก้ปัญหาความแออัดของข้อมูล (Anti-clutter) ได้ดีเลิศ

---

## 2. การควบคุมความปลอดภัยของลำดับสิทธิและการป้องกันการพัง (Hierarchy & Safety Check)

* **สถานะ**: Passed
* **หลักฐาน (Evidence)**:
  - กำหนดกฎลำดับความสำคัญให้เอนจิ้นหลัก (Today Timing Engine) ชี้ขาดระดับพลังงานและขีดจำกัดความเหนื่อยล้าสูงสุด
  - วางระบบเตือนสเตตัสสัญญะกึ่งขัดแย้งเป็น **"Mixed Reflection Signals"** เพื่อความยืดหยุ่นในการชงคำชี้แนะ
* **บันทึก (Notes)**:
  - ไม่ทำลายตรรกะความมั่นคงปลอดภัยเดิมของ Today Panel

---

## 3. ความปลอดภัยต่อข้อมูลสำรองและกระบวนการ Hydration (Data Safety & Hydration Check)

* **สถานะ**: Passed
* **หลักฐาน (Evidence)**:
  - ยึดแนวทางแบบเดียวกับยามไทย โดยการคำนวณและส่งผ่านเอาท์พุตเฉพาะภายหลังจากสถานะ `mounted` บนไคลเอนต์เป็นจริงผ่าน `useEffect`
  - ไม่มีการบันทึกข้อมูลวิเคราะห์ลงใน LocalStorage หรือฐานข้อมูลประวัติสะสม ทำให้ Backup JSON นำเข้า/ส่งออก ทำงานยืดหยุ่นไม่พัง
* **บันทึก (Notes)**:
  - ขจัดความเสี่ยงต่อการเกิด Hydration error และความเสียหายข้ามเบราว์เซอร์

---

## 4. ความสมบูรณ์ของการรันและทดสอบระบบคอมไพล์ (Runtime Build Verification)

* **สถานะ**: Passed
* **หลักฐาน (Evidence)**:
  - ไม่มีโค้ดรันไทม์ใดๆ ถูกแก้ไขใน `src/` (Documentation-only)
  - การตรวจสอบคุณภาพซอร์สโค้ดผ่าน ESLint และการทดสอบ Next.js Production Build ผ่านราบรื่น 100%
* **บันทึก (Notes)**:
  - แพลตฟอร์มการทำงานและ Preview route ทำงานได้อย่างเสถียรปกติ

---

## 5. การดำเนินการที่ต้องติดตาม (Follow-up Required)

1. **การเริ่มเชื่อมโยงหน้าจอรันไทม์จริง (DEV-067)**:
   - ดำเนินงานเข้าสู่ขั้นตอนถัดไปเพื่อนำแนวทางการวางแผนนี้ไปโค้ดจริงในไฟล์ [AstroTodayPanel.tsx](file:///Users/tamz/projects/workos-lite/src/components/workspaces/astro-strategy/real-app/components/AstroTodayPanel.tsx) และ [AstroRealAppPreview.tsx](file:///Users/tamz/projects/workos-lite/src/components/workspaces/astro-strategy/real-app/AstroRealAppPreview.tsx) ในสัปดาห์ถัดไป
