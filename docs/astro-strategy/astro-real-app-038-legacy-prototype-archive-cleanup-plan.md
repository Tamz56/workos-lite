# DEV-038 — Legacy Prototype Archive & Cleanup Plan

## Goal
จัดทำแผนและแนวทางการจัดเก็บรหัสคอมโพเนนต์โปรโตไทป์จำลองเดิม (Legacy Prototype Archive Note & Cleanup Plan) ของระบบ Astro Strategy เพื่อรักษาทางเลือกในการแก้ไขปัญหาฉุกเฉินและการกู้คืนข้อมูล และวางขั้นตอนการปลดระวางโค้ดเก่าออกจากระบบอย่างมั่นคงในอนาคต

## Scope
- การตรวจสอบคลังโค้ดจำลองเดิม (Legacy Prototype File Inventory)
- การบันทึกเหตุผลความจำเป็นในการคงสภาพไฟล์เก่าไว้ชั่วคราว
- การทบทวนกระบวนการย้อนคืนระบบสองระดับ (Rollback Level 1 & 2)
- การวางแผนขั้นตอนจัดเก็บและทำความสะอาดโค้ดแบ่งรายเฟส (Proposed Cleanup Phases)

## Non-scope
- ไม่ทำการเคลื่อนย้าย ลบ หรือปรับแต่งซอร์สโค้ดโปรโตไทป์จำลองและรันไทม์ใด ๆ ในขั้นตอนนี้ (Planning/Documentation only)

---

## Legacy Prototype File Inventory
จากการตรวจสอบโครงสร้างโฟลเดอร์หลัก คลังโค้ดของระบบโปรโตไทป์เก่าประกอบด้วย:
1. **[AstroStrategyPrototypeClient.tsx](file:///Users/tamz/projects/workos-lite/src/components/workspaces/astro-strategy/AstroStrategyPrototypeClient.tsx)**
   - ขนาด: 432,788 ไบต์ (ประมาณ 422 KB)
   - หน้าที่: ควบคุมการแสดงผล, การคำนวณจำลอง และการอ่านเซฟประวัติของระบบยุค MVP-v1 ทั้งหมด

---

## Why the Prototype Should Remain for Now
1. **เป็นเบาะรองรับย้อนกลับเชิงเทคนิค (Technical Rollback Plan)**: หากมีข้อผิดพลาดร้ายแรงของดาราศาสตร์หลักหรือเกิด hydration crash บนสภาพแวดล้อมจริง เราสามารถสลับนำทางกลับไปเปิดหน้าโปรโตไทป์จำลองเดิมได้ทันทีภายใน 1 นาที
2. **ทางผ่านของการถ่ายโอนข้อมูลประวัติ (Migration Support)**: หน้าพรีวิวย่อย `/workspaces/astro-strategy/real-app-preview` จำเป็นต้องเข้าถึงประวัติเก่าผ่านคีย์ความจำเดิม หากลบโปรโตไทป์หรือคีย์ทิ้งในทันที ผู้ใช้เดิมจะไม่สามารถสั่งดึงประวัติสะท้อนคิดมาอัปเดตลง Namespace ใหม่ได้
3. **การตรวจสอบเปรียบเทียบตรรกะคำนวณ (Behavior Verification)**: คงสภาพไว้สำหรับการตรวจสอบความเหมือนของผลลัพธ์การประมวลผลในช่วง 1-2 สัปดาห์แรกของการเปิดใช้งานจริง

---

## Proposed Cleanup Phases (แผนขั้นตอนทำความสะอาดในอนาคต)

### เฟส 1 — การคงสภาพและประคับประคองข้อมูล (สัปดาห์ที่ 1 - 2)
* **การปฏิบัติ**: 
  - คงสภาพไฟล์ `AstroStrategyPrototypeClient.tsx` ไว้ในตำแหน่งเดิม
  - เปิดเส้นทางย่อย `/workspaces/astro-strategy/real-app-preview` ไว้เพื่อให้เข้าใช้งาน Data Tools และสั่งทำงานคัดลอกประวัติสะสมเก่าได้เสรี
  - **ไฟล์ที่ห้ามลบเด็ดขาด**: `AstroStrategyPrototypeClient.tsx`

### เฟส 2 — ย้ายเข้าสู่คลังเอกสารเก่า (สัปดาห์ที่ 3 - 4)
* **การปฏิบัติ**: 
  - ย้ายไฟล์ `AstroStrategyPrototypeClient.tsx` เข้าสู่โฟลเดอร์จัดเก็บสำรอง (เช่น `src/components/workspaces/astro-strategy/archive/`) หรือปรับโครงสร้างโดยเขียนป้ายกำกับ `@deprecated`
  - ลบหรือซ่อนพฤติกรรมการเข้าชมเส้นทางพรีวิวย่อยไม่ให้บุคคลภายนอกเข้าถึง หรือปิดกั้นสิทธิ์ (Access Control) เพื่อความปลอดภัยสูงสุด

### เฟส 3 — การทำความสะอาด codebase ถาวร (เดือนถัดไป)
* **การปฏิบัติ**: 
  - ลบไฟล์ `AstroStrategyPrototypeClient.tsx` ออกจาก codebase อย่างถาวร (โดยทีมพัฒนายังสามารถย้อนดึงโค้ดประวัติในระบบ git ได้ตลอดเวลาเมื่อจำเป็น)
  - ลบหน้าจอและเส้นทางย่อย `/real-app-preview` ออกจาก App router ของแอปพลิเคชัน Next.js
  - ตรวจลินต์และบิวด์ซ้ำเพื่อทำความสะอาดเสร็จสิ้น

---

## Rollback Procedures Reference

### Rollback Level 1: ย้อนกลับหน้าตา UI
สลับค่าของ prop `variant` ในไฟล์เพจหลัก `page.tsx` จาก `"production"` คืนเป็น `"preview"` เพื่อเรียกแสดง Badge ทดสอบและ Data Tools

### Rollback Level 2: ย้อนกลับไปใช้หน้าโปรโตไทป์เดิม
เปลี่ยนตัวเรนเดอร์ในไฟล์เพจหลัก `page.tsx` ให้เรียกใช้คอมโพเนนต์ `<AstroStrategyPrototypeClient />` ดั้งเดิม

---

## Recommendation for DEV-039
ดำเนินงานภารกิจถัดไปเพื่อประเมินความสมบูรณ์และจัดทำเอกสารปิดรอบโครงการ Astro Strategy MVP-v2 (MVP-v2 Checkpoint Summary) เพื่อจัดระบบรายงานและประวัติพัฒนาอย่างเป็นทางการ
