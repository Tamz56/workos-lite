# DEV-032 — Route Switch Readiness Review Report

## Goal
วิเคราะห์และประเมินความพร้อมขั้นสุดท้ายก่อนสลับเส้นทางหลักของระบบ Astro Strategy จากโปรโตไทป์เดิม (Legacy Prototype) ไปเป็นพรีวิวแอปพลิเคชันจริง (Real App Preview) เพื่อรับประกันความปลอดภัยของข้อมูลและรักษาเสถียรภาพการทำงานของระบบโดยรวม

## Scope
- การวิเคราะห์โครงสร้างเส้นทางและโฟลเดอร์ของระบบนำทาง
- การตรวจสอบความครบถ้วนของฟีเจอร์หลัก (Feature Completeness Checklist)
- การตรวจสอบความปลอดภัยของข้อมูลและการย้ายฐานข้อมูลจำลอง (Data Safety & Migration Safety)
- การตรวจสอบระดับข้อความทางจริยธรรมภาษาและการออกแบบอินเตอร์เฟซ (UX/Copy Safety)
- การตรวจสอบระดับคุณภาพของสคริปต์คอมไพเลอร์และการป้องกัน Regression

## Non-scope
- ไม่มีการปรับเปลี่ยนพฤติกรรมหรือสลับการเรนเดอร์ในสัญญาระบบนำทางจริงในรอบนี้ (Review/Documentation only)

## Current Route Map
- **เส้นทางโปรโตไทป์เดิม (Legacy/Prototype Route)**: `/workspaces/astro-strategy` 
  - เรนเดอร์: `<AstroStrategyPrototypeClient />`
  - ไฟล์ควบคุม: `src/app/(main)/workspaces/astro-strategy/page.tsx`
- **เส้นทางระบบพรีวิวแอปจริง (Real App Preview Route)**: `/workspaces/astro-strategy/real-app-preview`
  - เรนเดอร์: `<AstroRealAppPreview />`
  - ไฟล์ควบคุม: `src/app/(main)/workspaces/astro-strategy/real-app-preview/page.tsx`

---

## Real App Preview Feature Checklist

- [x] **Today Timing Engine Integration**: แสดงผลจังหวะวันทำงานจริงอ้างอิงข้อมูลดาราศาสตร์หลักร่วมกับ Birth Profile
- [x] **Weekly Timing Engine Integration**: แสดงแผนสรุปกลยุทธ์ 7 วันแบบ Non-deterministic
- [x] **Monthly Reflection Engine Integration**: แสดงแผนและธีมสรุปรายเดือนประเมินจากเดือนปัจจุบัน ร่วมกับสถิติประวัติสะท้อนคิดจริง (Optional Context)
- [x] **Birth Profile Form**: สนับสนุนการบันทึก ดูข้อมูล และล้างโปรไฟล์ที่ปลอดภัยพร้อม Validation แจ้งเตือน
- [x] **Reflection History with timingContext**: แนบเมทาดาทาการวิเคราะห์ในข้อมูลบันทึกสะท้อนคิดชิ้นใหม่ และเรนเดอร์ข้อมูลแบบเดิมได้ราบรื่น
- [x] **Strategy Planning Notes**: ซิงค์และบันทึกโน้ตกลยุทธ์ส่วนบุคคลใน LocalStorage ทันทีเมื่อเปลี่ยนค่า
- [x] **Active Reflection Draft Autosave**: บันทึกคำกรอกของฟอร์มสะท้อนคิดแบบเรียลไทม์ป้องกันข้อมูลสูญหายโดยไม่มีปัญหา Cursor jumping
- [x] **Data Tools / Reset Safety Panel**: แผงควบคุมและแสดงสถานะ Exist ของ Namespace ข้อมูลพรีวิวอย่างชัดเจน
- [x] **Legacy Migration Tools**: ฟังก์ชัน Dry-Run ตรวจสอบสิทธิ์ความพร้อม และปุ่มสำหรับสั่งย้ายคีย์จำลองด้วยวิธีจำกัดแบบปลอดภัย

---

## Data Safety Review
- **การแยกคีย์ Namespace**: พรีวิวแอปพลิเคชันจริงใช้คีย์นำหน้า `astro-real-app:*` ทำให้จำกัดผลกระทบในการเขียนและอ่านข้อมูลไม่ให้ปะปนกับ Namespace โปรโตไทป์เดิม
- **การย้ายข้อมูลจำลอง (Migration)**: ใช้การจำลองย้ายข้อมูลแบบ "คัดลอก-สร้างใหม่" (Copy-only) ซึ่งจะไม่ลบข้อมูลเดิมในคีย์โปรโตไทป์เดิมทิ้ง รักษาความสมบูรณ์ของประวัติผู้ใช้งานได้
- **สเกลปุ่ม Reset**: ปุ่ม Reset ใน Data Tools จะล้างเฉพาะคีย์พรีวิวที่เกี่ยวข้อง ทำให้ไม่มีผลกระทบข้ามโฟลเดอร์ของแอปพลิเคชัน

---

## UX/Copy Safety Review
- ข้อความการนำเสนอวิเคราะห์ตามหลักการวางแผนและสมาธิส่วนบุคคล (Work-focused Strategy) ปราศจากเรื่องโชคลาง ชะตาชีวิต สุขภาพ หรือความรัก
- ปรับเปลี่ยนคำอธิบายเชิงสุ่มเสี่ยงออกทั้งหมด และใช้ Disclaimers แจ้งเตือนจริยธรรมข้อมูลอย่างเด่นชัดท้ายหน้าจอควบคุมเสมอ
- คำอธิบายความน่าเชื่อถือถูกปรับเป็น **"ระดับความสอดคล้องเชิงสัญลักษณ์"** เพื่อเน้นย้ำความจริงในการวิเคราะห์ข้อมูลเชิงตัวเลขเปรียบเทียบ

---

## Route Switch Candidate File(s)
ในขั้นตอนถัดไป (DEV-033) ไฟล์ที่จะต้องได้รับการแก้ไขเพื่อทำการสลับเส้นทางหลักคือ:
* **[page.tsx](file:///Users/tamz/projects/workos-lite/src/app/%28main%29/workspaces/astro-strategy/page.tsx)** (เส้นทางหลักของ Astro Strategy)
  - จะต้องนำเข้าและเรนเดอร์ `<AstroRealAppPreview />` (หรือคอมโพเนนต์ประกอบจริง) แทนตัวเดิม `<AstroStrategyPrototypeClient />`
  - หมายเหตุ: หน้าพรีวิวเดิม `/workspaces/astro-strategy/real-app-preview` ควรคงไว้ในลักษณะย้อนกลับไปทดสอบระบบภายใน หรือทำการ Redirect เข้าสู่เส้นทางหลักตามความประสงค์ในลำดับสุดท้าย

---

## Known Risks / Blockers
- **ไม่มีการพบ Blocker หรือข้อขัดข้องในการทำงาน**: ทั้งระบบ TypeScript บิวด์โปรเจกต์ และ ESLint ผ่านเกณฑ์ความสะอาดอย่างราบรื่น

---

## Readiness Verdict
```text
Ready for controlled active route switch.
```
(ระบบมีความพร้อมเต็มที่ในการดำเนินการสลับเส้นทางหลักอย่างระมัดระวังในภารกิจ DEV-033)

---

## Recommendation for DEV-033
1. ปรับเปลี่ยนการเรนเดอร์ใน [src/app/(main)/workspaces/astro-strategy/page.tsx](file:///Users/tamz/projects/workos-lite/src/app/%28main%29/workspaces/astro-strategy/page.tsx) ให้เรียกใช้คอมโพเนนต์พรีวิวแอปจริง
2. ซ่อนหรือปรับปรุงแผงควบคุม Header Banner ของ "PREVIEW MODE" และ Data Tools ในหน้าระบบจริงเพื่อประสบการณ์การใช้งานที่พรีเมียม แต่ยังสามารถเก็บปุ่มล้างข้อมูลจำลองไว้ในหน้าหลังบ้านของแอดมินหรือแท็บย่อยที่ปลอดภัยได้
3. ทดสอบการรันระบบนำทางและการโหลดในทุกอุปกรณ์อีกครั้ง
