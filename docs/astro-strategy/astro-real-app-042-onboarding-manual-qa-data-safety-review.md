# ASTRO-REAL-APP-DEV-042 — Onboarding Manual QA & Data Safety Review

เอกสารรายงานการประเมินคุณภาพและการตรวจสอบความปลอดภัยของระบบ Onboarding / First-Run Detection ของ Astro Real App MVP-v3

## Goal
ตรวจสอบและยืนยันการทำหน้าที่ของระบบแนะแนวการใช้งานครั้งแรก (Onboarding) และความมั่นคงปลอดภัยด้านข้อมูลส่วนบุคคล (Data Safety/Ethics Boundary) โดยระบุการทำงานทั้งในโหมดใช้งานจริง (Production) และโหมดทดสอบ (Preview) เพื่อรองรับจริยธรรมการเก็บข้อมูลท้องถิ่นในเครื่องบราวเซอร์ของผู้ใช้อย่างรัดกุม

---

## Scope & Non-Scope

### ขอบเขตการรีวิว (Scope)
1. การทำงานของอะแดปเตอร์ตรวจจับสถานะ First-run (`astroRealAppOnboardingAdapter.ts`)
2. การเก็บบันทึกและยืนยันความคงอยู่ของการ Dismiss แผง Onboarding ผ่านคีย์ `astro-real-app:onboarding:v1`
3. การรีเซ็ต Onboarding แยกเฉพาะ และการรีเซ็ตข้อมูลพรีวิวทั้งหมดผ่านเครื่องมือ Data Tools
4. พฤติกรรมความแตกต่างระหว่างเส้นทางจริง (Production `/workspaces/astro-strategy`) และเส้นทางจำลอง (Preview `/workspaces/astro-strategy/real-app-preview`)
5. ความสุภาพและจริยธรรมการใช้คำแนะแนว (Copy-safety) ปราศจากการทำนายที่เด็ดขาดและเรื่องการวินิจฉัยทางการแพทย์

### สิ่งที่ไม่ได้ตรวจสอบ/ไม่แก้ไข (Non-Scope)
- การสลับสเตตเส้นทางนำทางหลัก หรือการเคลื่อนย้ายไฟล์โครงสร้าง
- การปรับโครงสร้างข้อมูลหรือโค้ดคำนวณด้านเวลาของเอนจิ้นหลัก (Today, Weekly, Monthly)
- การพัฒนาแอนิเมชันช่วงการปิดแผง

---

## QA Environment & Methodology
- **Browser**: Chrome/Safari (Localhost client-side environment)
- **Local Storage keys checked**:
  - `astro-real-app:onboarding:v1` (Onboarding status)
  - `astro-real-app:birth-profile:v1` (Birth Profile status)
  - `astro-real-app:reflection-history:v1` (History logs status)
  - Legacy keys (e.g. `astro-strategy:reflection-history:v1`)

---

## First-Run Detection & LocalStorage Safety Review

### พฤติกรรมการตรวจจับครั้งแรก
- ตรวจจับความไม่มีอยู่ของคีย์หลักโดยไม่มีการเขียนค่าลงบราวเซอร์อัตโนมัติ (Read-only check) ทำให้มั่นใจได้ว่าระบบจะไม่แทรกแซงหรือสร้างไฟล์ข้อมูลปลอมขึ้นมาก่อนได้รับความเห็นชอบจากผู้ใช้
- เมื่อไม่มีโปรไฟล์ดวงเกิดหรือประวัติบันทึก แผงแนะนำ Onboarding Panel จะทำงานขึ้นมาทันทีอย่างถูกต้อง

### ความปลอดภัยของระดับข้อมูล (LocalStorage Safety)
- ข้อมูล Onboarding status ถูกจัดเก็บอย่างเป็นสัดส่วนลงในคีย์ `astro-real-app:onboarding:v1` เท่านั้น
- ปุ่มกดซ่อนแผงคำแนะนำจะไม่ส่งผลหรือกระทำการเขียนข้อมูลลงในคีย์ความจำตัวอื่น ๆ นอกเหนือจากคีย์ onboarding
- ข้อมูลดั้งเดิม (Legacy Keys) ปลอดภัย 100% ไม่มีการลบหรือปรับแก้อัตโนมัติระหว่างการสแกนหาสัญญาณ Onboarding

---

## Production vs Preview Behavior Review

1. **โหมดจำลองสถานะ (Preview Mode)**:
   - แสดงแผงแนะนำและมีบัตรแนะนำข้อ 4 ในรูปแบบการเตือนการย้ายข้อมูลประวัติเดิม (Migration tools)
   - แถบนำทางแสดงเมนูเครื่องมือข้อมูล (Data Tools) และแสดงความคงอยู่ของคีย์ `astro-real-app:onboarding:v1` ชัดเจน
2. **โหมดใช้งานจริง (Production Mode)**:
   - บัตรคำแนะนำข้อ 4 ปรับเปลี่ยนการแนะนำไปยัง "คู่มือและจริยธรรมข้อมูล" (Guide & Ethics) โดยชี้ทางไปยังแท็บคู่มือแทน
   - เมนูและสิทธิของ Data Tools ถูกซ่อนออกจากสายตาผู้ใช้อย่างถาวร เพื่อความสะดอาดและปลอดภัยระดับใช้งานจริง

---

## Copy & Safety Language Review

- **ภาษาแนะแนว**: เป็นกลาง สุภาพ และเน้นความเพียรพยายามส่วนบุคคลเป็นหลัก
- **Non-medical disclaimer**: มีการชี้แจงชัดเจนที่ขอบล่างของแผง Onboarding ว่าคำแนะนำเป็นเพียงกรอบสะท้อนเชิงสัญลักษณ์ (Symbolic reflection aids) เพื่อการสะท้อนตนเอง ไม่สามารถนำไปใช้แทนดุลยพินิจของตนเอง คำสั่งของแพทย์ หรือผู้เชี่ยวชาญการรักษา
- **Supernatural Avoidance**: ไม่ระบุเคราะห์กรรม กรรมเก่า หรือการฟันธงในเรื่องที่ไม่สามารถควบคุมได้

---

## Verdict & Recommendation for Next Task

### คำตัดสิน (Verdict)
> [!TIP]
> **VERDICT: PASSED**
> ระบบตรวจจับ Onboarding และการจัดเก็บข้อมูลทำงานได้อย่างราบรื่นและมั่นคงปลอดภัย ข้อมูลผู้ใช้ไม่มีการเขียนทับโดยไม่ได้รับคำสั่ง โหมดการทำงานแยกของ Production และ Preview สอดรับกันสมบูรณ์แบบ

### ข้อเสนอแนะในขั้นตอนถัดไป (Recommendation for Next Task)
- ระบบมีความเสถียรพร้อมสำหรับการพัฒนาฟีเจอร์ส่งออกและกู้คืนข้อมูลสำรอง (**DEV-043 — Export / Backup & Import Mechanics Implementation**)
