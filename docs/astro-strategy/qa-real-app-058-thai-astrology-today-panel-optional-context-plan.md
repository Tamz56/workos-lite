# QA Real App 058 — Thai Astrology Today Panel Optional Context Plan

เอกสารตรวจสอบคุณภาพของแผนผสานกล่องข้อมูลยามไทยบนหน้าจอ (Thai Astrology Today Panel Optional Context Plan) สำหรับเฟส MVP-v4

---

## 1. การตรวจสอบแผนการผสานและจุดจัดวางตำแหน่งหน้าจอ (UI Placement & Layout Check)

* **สถานะ**: Passed
* **หลักฐาน (Evidence)**:
  - เอกสาร [astro-real-app-058-thai-astrology-today-panel-optional-context-plan.md](file:///Users/tamz/projects/workos-lite/docs/astro-strategy/astro-real-app-058-thai-astrology-today-panel-optional-context-plan.md) กำหนดจุดจัดวางตำแหน่งของกล่องยามไทยไว้ที่ด้านล่างของ `AstroTodayPanel` อย่างเป็นสัดส่วนเหนือข้อความ Metadata
  - มีแผนการทำงานของปุ่มยุบพับ (Accordion) เพื่อซ่อนรายละเอียดเมื่อไม่ต้องการดู
* **บันทึก (Notes)**:
  - การจัดวางเช่นนี้ช่วยรักษาทัศนวิสัยที่ดีบน Desktop Layout ตามเกณฑ์ AGENTS.md และคงความสงบทางสายตา (Cognitive Calmness)

---

## 2. การควบคุมความปลอดภัยของการเรนเดอร์ Next.js และทางเลี่ยงระบบล่ม (Hydration & Fallback Check)

* **สถานะ**: Passed
* **หลักฐาน (Evidence)**:
  - ล็อกแนวทางให้ดึงเวลา `clientTime` เฉพาะหลัง mount สำเร็จในเบราว์เซอร์ผ่าน `useEffect` เพื่อขจัดปัญหา Hydration mismatch
  - กำหนดกลไกซ่อนกล่อง (Graceful Fallback) เมื่อไม่มีข้อมูลดวงเกิดหรือคำนวณผิดพลาด โดยเครื่องยนต์ Today Engine ดั้งเดิมยังทำงานได้เสถียรปกติ
* **บันทึก (Notes)**:
  - เป็นมาตรการที่ปกป้องเสถียรภาพของแอปพลิเคชันรันไทม์หลักได้อย่างมีนัยสำคัญ

---

## 3. ความปลอดภัยต่อข้อจำกัดพื้นที่และการกู้คืนข้อมูล (Storage & Data Portability Check)

* **สถานะ**: Passed
* **หลักฐาน (Evidence)**:
  - แผนงานระบุให้ผลลัพธ์ใน UI v0.1 รันสดบนหน่วยความจำเบราว์เซอร์เท่านั้น ปราศจากการบันทึกลง LocalStorage
  - ข้อมูลสำรอง JSON เดิมจาก v2 และ v3 เก่าจะยังสามารถโอนย้ายนำเข้ากู้คืนเข้าสู่ระบบได้ราบรื่น 100%
* **บันทึก (Notes)**:
  - ปลอดภัยต่อโครงสร้าง Namespace ข้อมูลสะสมเก่า

---

## 4. ความสมบูรณ์ของการรันและทดสอบระบบคอมไพล์ (Runtime Build Verification)

* **สถานะ**: Passed
* **หลักฐาน (Evidence)**:
  - ไม่มีการแก้ไขโค้ดโปรแกรมรันไทม์ในโฟลเดอร์ `src/` (Documentation-only)
  - การตรวจสอบคุณภาพซอร์สโค้ดผ่าน ESLint และการทดสอบ Next.js Production Build สำเร็จราบรื่นดี
* **บันทึก (Notes)**:
  - การบิวด์ผ่านลุล่วงดี

---

## 5. การดำเนินการที่ต้องติดตาม (Follow-up Required)

1. **การดีไซน์เมตาฟิสิกส์จีน (DEV-059)**:
   - ดำเนินการต่อตามแผนงานเฟสถัดไปเพื่อนำแนวทางออกแบบและการผสานหน้าจอ UI นี้ ไปประยุกต์ใช้กับเลเยอร์อื่นๆ ในอนาคต
2. **การพัฒนารันไทม์และเชื่อมโยงหน้าจอ (DEV-059/060)**:
   - เมื่อดำเนินการแก้ไขโค้ดและเชื่อมโยงใน Today Panel จริง ให้ปฏิบัติตามแผน Hydration state และสวิตช์ปิด/เปิด Toggle อย่างเคร่งครัด
