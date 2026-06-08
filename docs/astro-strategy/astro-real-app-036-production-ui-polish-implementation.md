# DEV-036 — Production UI Polish Implementation Report

## Goal
ดำเนินการปรับแต่งอินเตอร์เฟซสภาพแวดล้อมรันไทม์จริง (Production UI Polish) สำหรับระบบ Astro Strategy Lab ให้เหมาะสมสำหรับการใช้งานจริง โดยซ่อนข้อมูลจำลองพรีวิวและเครื่องมือข้อมูลในโหมดใช้งานจริง แต่คงเปิดใช้งานคีย์ความปลอดภัยและเครื่องมือทดสอบย่อยบนเส้นทางพรีวิวของการดูแลระบบ

## Scope
- เพิ่มพร็อพเพอร์ตี้ `variant?: "production" | "preview"` ให้แก่คอมโพเนนต์หลัก `<AstroRealAppPreview>`
- แก้ไขหน้าจอหลัก `/workspaces/astro-strategy` ให้เรนเดอร์ในโหมด `"production"`
- แก้ไขหน้าจอทดสอบภายใน `/workspaces/astro-strategy/real-app-preview` ให้เรนเดอร์ในโหมด `"preview"`
- ซ่อนแท็บนำทาง *"⚙️ เครื่องมือข้อมูล"* ในโหมดใช้งานจริง พร้อมย้ายคำเตือน Banner และ Footer ให้แสดงผลเป็นคำศัพท์ยึดแผนกลยุทธ์ส่วนบุคคลเชิงวิทยาศาสตร์
- เขียนคำแนะนำและขั้นตอน Rollback

## Non-scope
- ไม่เคลื่อนย้ายหรือลบคอมโพเนนต์โปรโตไทป์ย่อยเดิม หรือโครงสร้างตรรกะคำนวณส่วนกลาง

---

## Variant/Route Behavior & Visibility Map

| ฟีเจอร์ / องค์ประกอบ (Feature / Element) | โหมดจริง (`variant="production"`) | โหมดพรีวิว (`variant="preview"`) |
| :--- | :--- | :--- |
| **หัวข้อหลัก (Header Title)** | "Astro Strategy Lab" | "Astro Strategy Lab — Real App Preview" |
| **คำอธิบายแบนเนอร์ (Header Subtitle)** | "ระบบวิเคราะห์จังหวะชีวิตเชิงกลยุทธ์..." | "ตัวอย่างการประกอบคอมโพเนนต์แอปจริง..." |
| **ป้ายกำกับ (Header Badge)** | *ซ่อน (Hidden)* | "PREVIEW MODE" (แสดงสีม่วงเด่น) |
| **แท็บเครื่องมือข้อมูล (Data Tools Tab)** | *ซ่อน (Hidden)* | *แสดงตามปกติ (Visible)* |
| **ข้อความคำเตือนส่วนท้าย (Footer Captions)** | โน้ตแจ้งการเก็บข้อมูลแบบส่วนตัว และระบุลิงก์ย้ายคีย์พรีวิว | ข้อมูลจำลองและคำอธิบายการประพาสพรีวิว |
| **คำปฏิเสธความรับผิดชอบ (Disclaimers)** | *คงไว้ (Preserved)* | *คงไว้ (Preserved)* |

---

## Tab Navigation Hierarchy (Production Mode)
เมื่อผู้ใช้เข้าชมหน้าหลัก แท็บนำทางจะถูกจัดเรียงตามระดับยุทธศาสตร์และความสำคัญจริง ดังนี้:
1. **📊 สรุปวันนี้ (Today)**
2. **📅 สรุปสัปดาห์ (Weekly)**
3. **📅 สรุปรอบเดือน (Monthly)**
4. **✍️ สะท้อนคิด (Reflection)**
5. **📋 ประวัติ (History)**
6. **🎯 แผนกลยุทธ์ (Planning)**
7. **👤 โปรไฟล์ดวงเกิด (Birth Profile)**
8. **📖 คู่มือ (Guide)**

---

## Migration & Data Safety
- ฟังก์ชันเครื่องมือย้ายประวัติเก่า (Migration Tools) และ Dry-Run ยังไม่ถูกถอดถอนออกจากซอร์สโค้ด แต่ย้ายไปเก็บตัวไว้ที่เส้นทางพรีวิวย่อย `/workspaces/astro-strategy/real-app-preview` อย่างรัดกุม ทำให้ประวัติสะสมเดิมของผู้ใช้ยังรองรับการคัดลอกย้ายคีย์ได้สม่ำเสมอ
- มีการเพิ่มหมายเหตุการช่วยเหลือขนาดเล็กไว้ที่ Footer ของหน้างานจริงเพื่อความสะดวกในการย้ายประวัติการประเมิน

---

## Rollback Instruction
หากพบลำดับเพจผิดปกติหรือต้องการย้อนกลับ ให้แก้ไขในสองไฟล์หลักดังนี้:

1. **[src/app/(main)/workspaces/astro-strategy/page.tsx](file:///Users/tamz/projects/workos-lite/src/app/%28main%29/workspaces/astro-strategy/page.tsx)**:
   - สลับพร็อพเพอร์ตี้กลับเป็น `variant="preview"` หรือถอด prop ออก
2. **[src/app/(main)/workspaces/astro-strategy/real-app-preview/page.tsx](file:///Users/tamz/projects/workos-lite/src/app/%28main%29/workspaces/astro-strategy/real-app-preview/page.tsx)**:
   - ถอด prop `variant` ออกเพื่อให้ใช้ค่าเริ่มต้น `"preview"`

---

## Manual QA Steps
1. **หน้าจอหลัก**: ไปที่ `/workspaces/astro-strategy` ตรวจสอบว่าแบนเนอร์แสดงเป็นแอปจริง ปราศจากป้าย PREVIEW MODE สีม่วง และไม่มีแท็บนำทาง *"⚙️ เครื่องมือข้อมูล"*
2. **หน้าจอพรีวิว**: ไปที่ `/workspaces/astro-strategy/real-app-preview` ตรวจสอบว่าแผง Data Tools และป้าย PREVIEW MODE แสดงผลครบถ้วน
3. **การทำงานของสเตตนำทาง**: ในโหมดงานจริง ลองเข้าชมและบันทึกประวัติสะท้อนคิดสะสม เพื่อตรวจสอบว่าไม่มีปัญหาค้างและไม่มี Warning บนคอนโซล

---

## Recommendation for Future DEV-037
ดำเนินงานใน DEV-037 (หรือถัดไป) เพื่อประเมินผลตอบรับจากผู้ใช้งานจริงเกี่ยวกับการจัดวางหน้าจอและระดับความเร็วในการโหลดเพจ (INP / LCP) และเตรียมความพร้อมจัดทำสรุปเอกสารปิดรอบโครงการ MVP-v2 ในภาพรวมต่อไป
