# ASTRO-REAL-APP-DEV-103 — Thai Planet Placement Diagnostic Fixture Review

เอกสารทบทวนโครงร่างเคสวินิจฉัยควบคุม (Diagnostic Fixture Review) สำหรับตรวจสอบพฤติกรรมการกักกันความปลอดภัยตำแหน่งดวงดาวไทย v0.1 เพื่อทำหน้าที่กำหนดสเปกและชุดข้อมูลคาดหวังเชิงวินิจฉัย (Test Fixtures) ป้องกันผลลัพธ์คลาดเคลื่อนและคุมเข้มสัญญาข้อมูลก่อนเริ่มขยายโมดูลการทดสอบจริง

---

## 1. Purpose (วัตถุประสงค์)

ใบงาน **DEV-103** มีเป้าหมายเพื่อกำหนดและประเมินโครงร่างข้อมูลกรณีทดสอบวินิจฉัยควบคุม (Diagnostic Fixture Cases) สำหรับตรวจสอบชั้นพฤติกรรมความปลอดภัยของตัวแปลงและตัวประสานรันไทม์ปฏิทินไทย v0.1 โดยทำหน้าที่รับประกันว่าระบบจำลอง (Stub Results) ระบบกักกันภัย (Safety Harness) และระบบประสานงาน (Orchestrator) จะให้ผลลัพธ์ที่เทียบเคียงไม่ได้ (`not-comparable`) และไม่ผ่านกระบวนการตรวจสอบ (`non-validating`) เมื่อเผชิญกับชุดข้อมูลจำลองอย่างปลอดภัย

---

## 2. Scope & Non-Goals (ขอบเขตและสิ่งที่ไม่ใช่เป้าหมาย)

* **สิ่งที่ครอบคลุมการประเมิน (Scope)**:
  * การนิยามกลุ่มเคสวินิจฉัยควบคุมจำลอง (Diagnostic Fixture Groups) ทั้ง 5 กลุ่ม
  * การจัดเตรียมตารางเปรียบเทียบกรณีศึกษาจำลอง (Fixture Matrix)
  * การวิเคราะห์และกำหนดรายการตรวจสอบความถูกต้องเชิงพฤติกรรม (Expected Assertions)
  * การทบทวนความเสี่ยงทางเทคนิค (Risk Review) และการวางแผน Handoff สู่ DEV-104
* **สิ่งที่ไม่ใช่เป้าหมายในรอบนี้ (Non-Goals)**:
  * การสร้างสคริปต์ทดสอบจริงที่ทำงานบนรันไทม์ หรือการเขียน Unit Test ในไดเรกทอรี `src/`
  * การพัฒนาลอจิกระบบคำนวณลองจิจูด ราศีสถิต หรือองศาดวงดาวจริง
  * การปรับปรุง แก้ไข หรือเชื่อมต่อหน้าจอ UI และพฤติกรรมของ LocalStorage

---

## 3. Diagnostic Fixture Groups (กลุ่มเคสวินิจฉัยควบคุมจำลอง)

เพื่อครอบคลุมทุกจุดเปราะบางในกระบวนการส่งมอบข้อมูล ได้กำหนดกลุ่มเคสทดสอบจำลองออกเป็น 5 กลุ่มหลัก:

### กลุ่ม A: Stub-Only Input Fixture (ข้อมูลนำเข้าจำลองล้วน)
* **การจำลองเงื่อนไข (Setup)**:
  * `input.calendarSystem` = `'pending-reference-validation'`
  * `input.calculationSystem` = `'pending-reference-validation'`
* **ผลลัพธ์ที่คาดหวัง (Expected Results)**:
  * ผลลัพธ์จำนวนดาวเคราะห์ที่สกัดได้เท่ากับ 10 ดวง (IDs 0 ถึง 9)
  * ค่าราศีสถิต (`signRasi`) และองศา (`degree`) ทุกดวงเป็น `'pending-reference-validation'`
  * ค่า `adapterStatus` คืนค่า `'stub-only'` และ `comparableCount` ได้ผลลัพธ์เป็น 0

### กลุ่ม B: Placeholder Reference Comparison Fixture (การเปรียบเทียบกรณีศึกษาจำลอง)
* **การจำลองเงื่อนไข (Setup)**:
  * ผลลัพธ์ดวงดาวที่รันได้เป็น Stub Results
  * ข้อมูลคาดหวังในกรณีศึกษา (`referenceCase.expectedPlacements`) ทุกดวงเป็น `'pending-reference-validation'`
* **ผลลัพธ์ที่คาดหวัง (Expected Results)**:
  * ค่าสถานะเปรียบเทียบรายดวง (`comparisonStatus`) ส่งคืน `'not-comparable'`
  * ตัวเลขประเมินความปลอดภัยได้ `comparableCount` = 0 และ `notComparableCount` = 10

### กลุ่ม C: Unavailable Value Fixture (เคสข้อมูลใช้งานไม่ได้/คลาดเคลื่อน)
* **การจำลองเงื่อนไข (Setup)**:
  * กำหนดให้ค่าพิกัดดาวเคราะห์บางดวงสถิตเป็น `'unavailable'` (เช่น ดาวรหัส 8 หรือ 9 ใน Stub)
* **ผลลัพธ์ที่คาดหวัง (Expected Results)**:
  * ข้อมูลถูกมองเป็นสถานะไม่พร้อมตรวจสอบ (Non-validating status)
  * ฟังก์ชันเปรียบเทียบส่งคืนสถานะ `'not-comparable'` ทันทีและไม่ถูกปะปนในชุดตรวจสอบผ่าน

### กลุ่ม D: No referenceCase Fixture (การละเว้นไม่ระบุข้อมูลกรณีศึกษา)
* **การจำลองเงื่อนไข (Setup)**:
  * เรียกใช้ Orchestrator โดยระบุค่า `referenceCase` เป็น `undefined` (ไม่ได้ป้อนพารามิเตอร์)
* **ผลลัพธ์ที่คาดหวัง (Expected Results)**:
  * ระบบสรุปความปลอดภัยทำงานในโหมดวินิจฉัยประเมินผลชั่วคราว (Diagnostic mode)
  * สถิติตัวเลขได้ `comparableCount` = 0 และไม่มีค่าที่ผ่านการ validated เป็น matched

### กลุ่ม E: System Mismatch Placeholder Fixture (เคสปฏิทินหรือวิธีการคำนวณคลาดเคลื่อน)
* **การจำลองเงื่อนไข (Setup)**:
  * อินพุตระบุ `calendarSystem` แตกต่างไปจากโครงสร้างกรณีศึกษาอ้างอิง
* **ผลลัพธ์ที่คาดหวัง (Expected Results)**:
  * ระบบตัวเปรียบเทียบปฏิเสธกระบวนการประเมิน (ผลลัพธ์เป็น `'not-comparable'` หรือ `'system-mismatch'`)
  * ป้องกันการนำผลลัพธ์ที่ประมวลผลต่างปฏิทินกันมาใช้คำนวณเปรียบเทียบ

---

## 4. Fixture Matrix (ตารางเปรียบเทียบกรณีศึกษาจำลอง)

เพื่อความมั่นคงทางโครงสร้างระบบ ข้อมูลคุณลักษณะและผลลัพธ์ทั้งหมดถูกตรึงอยู่ในระดับค่าจำลอง (Placeholder values เท่านั้น):

| Fixture ID | Fixture Name | Input Condition (Calendar/Calculation) | Reference Condition (Validation Status) | Expected Runtime Status (Adapter Status) | Expected Safety Result (Comparable / Pending) | Pass Condition (เกณฑ์การผ่าน) |
|---|---|---|---|---|---|---|
| **FIX-TH-001** | Standard Stub Verification | pending-reference-validation | (No Reference Case Provided) | stub-only | comparableCount: 0 / pendingCount: 10 | คืนค่าดาวครบ 10 ดวง พิกัดทุกดวงเป็น pending |
| **FIX-TH-002** | Placeholder Reference Test | pending-reference-validation | pending-reference-validation | stub-only | comparableCount: 0 / notComparableCount: 10 | คืนสถานะเปรียบเทียบรายดวงเป็น not-comparable ทั้งหมด |
| **FIX-TH-003** | Partial Unavailable Check | pending-reference-validation | expected placements include 'unavailable' | stub-only | comparableCount: 0 / pendingCount: 10 | คัดกรองค่า unavailable ออกและให้ผลลัพธ์เปรียบเทียบเป็น false |
| **FIX-TH-004** | Diagnostic Mode Fallback | pending-reference-validation | (Reference case is undefined) | stub-only | comparableCount: 0 / validation: diagnostic | บันทึกข้อความแจ้งเตือน Diagnostic ลงในรายการ issues |
| **FIX-TH-005** | Calendar Mismatch Guard | system-specific mismatch | pending-reference-validation | stub-only | comparableCount: 0 / mismatch status | ส่งคืนสถานะเปรียบเทียบที่บล็อกความเข้ากันได้ |

---

## 5. Expected Assertions (ข้อตกลงการยืนยันพฤติกรรม)

การประเมินความสอดคล้องทางวิศวกรรมต้องเป็นไปตามข้อตกลงการยืนยันพฤติกรรมต่อไปนี้:
* **ปริมาณผลลัพธ์**: รายการผลลัพธ์ตำแหน่งดาวในเอาต์พุตต้องมีความยาวเท่ากับ 10 เสมอ และบรรจุรหัสประจำดาว 0 ถึง 9 อย่างครบถ้วน
* **การปกป้องข้อมูล**: พิกัดลองจิจูด ราศี และองศาทั้งหมดต้องคงสถานะ `'pending-reference-validation'` หรือ `'unavailable'`
* **ความปลอดภัยของข้อมูลจำลอง**: ค่า `'pending-reference-validation'` และ `'unavailable'` ต้องไม่มีกระบวนการตรวจสอบใดที่สามารถตีความและส่งผลให้จับคู่ผ่านสำเร็จ (`matched`)
* **สถิติความปลอดภัย**: สถิติตัวนับ `comparableCount` ต้องเป็น 0 สำหรับทุกกรณีศึกษาจำลอง และได้ `notComparableCount: 10` เมื่อทำสอบเทียบกับ Reference Matrix
* **เมทาดาตาเวลา**: ค่า `generatedAt` ในรายงานต้องแสดงเวลาปัจจุบันแบบสากล (ISO String) และไม่มีความเกี่ยวข้องกับลอจิกการประมาณค่าของดวงดาว

---

## 6. Risk Review (ทบทวนความเสี่ยงทางเทคนิค)

1. **ความเสี่ยงจากการที่ Fixture กลายเป็น Test Oracle ผิดประเภท (Fixture becoming a real test oracle)**:
   * *คำอธิบาย*: หากนำค่าทดสอบจำลองใน Fixture ไปเขียนผูกเป็นเป้าหมายความสำเร็จของปฏิทินจริงในอนาคต จะทำให้รันไทม์ประเมินผลผิดพลาดและไม่พบข้อบกพร่องจริง
   * *แนวทางควบคุม*: ควรกำหนดให้ชัดเจนว่า Fixture เหล่านี้ออกแบบมาเพื่อตรวจสอบสัญญาระบบและระบบกักกันความปลอดภัย (Safety Harness validation) เท่านั้น ไม่ใช่ผลลัพธ์ดาราศาสตร์จริง
2. **ความเสี่ยงจากการเผลอมองค่าจำลองเป็นความสำเร็จของการประมาณค่า (Placeholder treated as Success)**:
   * *คำอธิบาย*: รันไทม์ประเมินผลเปรียบเทียบใน UI อาจมองว่าสถานะเปรียบเทียบเปรียบเทียบไม่ได้ (`not-comparable`) เป็นผลลัพธ์ผ่านเนื่องจากไม่มีการแจ้งเตือน Error
   * *แนวทางควบคุม*: ต้องออกแบบส่วนคัดกรองในหน้าแสดงผลเพื่อแจ้งสถานะความเชื่อมั่นต่ำ (Unvalidated data status) เสมอ
3. **ความเสี่ยงจากการที่ UI นำข้อมูลวินิจฉัยไปนำเสนอในรูปแบบตำแหน่งดาวจริง (UI displaying Stub as Real Placement)**:
   * *คำอธิบาย*: หน้าจอ Preview ดึงออบเจกต์ Orchestrator ไปเรนเดอร์ในลักษณะค่าตำแหน่งดาวปกติ ทำให้ผู้ใช้เห็นคำว่า pending-reference-validation เสมอจนเกิดความสับสน
   * *แนวทางควบคุม*: ต้องมีการกรองตรวจสอบเงื่อนไขสถานะตัวแปร `adapterStatus === 'stub-only'` เพื่อขึ้นเตือนข้อจำกัดข้อมูลแก่ผู้ใช้
4. **ความเสี่ยงจากการพยายามขยายขอบเขต Fixture ไปสู่การคำนวณจริงเร็วเกินไป (Over-expanding scope to calculation)**:
   * *คำอธิบาย*: การเพิ่มลอจิกคำนวณเฉลี่ยความเร็วเพื่อเติมองศาจริงลงใน Fixture ก่อนที่ Contract จะผ่านการทดสอบ ย่อมส่งผลให้เกิดความล้มเหลวเชิงโครงสร้างรันไทม์
   * *แนวทางควบคุม*: ล็อคโครงสร้างข้อมูลให้ทำงานแบบ stub-only จนกว่าระบบกักกันความปลอดภัยจะเสร็จสมบูรณ์
5. **ความเสี่ยงจากการนำตัวแปรประทับเวลาไปพัวพันในการคำนวณ (generatedAt misuse)**:
   * *คำอธิบาย*: ระบบนำเอาเวลาสร้างรายงานไปใช้ประมวลร่วมกับสมการวิถีดวงดาว ทำให้ตำแหน่งดวงดาวผิดเพี้ยนตามช่วงเวลาโหลด
   * *แนวทางควบคุม*: กำหนดให้ `generatedAt` คงบทบาทในกลุ่มข้อมูลบันทึกประวัติ (Metadata) เท่านั้น

---

## 7. DEV-104 Handoff Recommendation (ข้อเสนอแนะการส่งมอบงานถัดไป)

เพื่อเป็นแนวทางที่ปลอดภัย รัดกุม และมั่นคงเชิงวิศวกรรมก่อนการเริ่มเขียนโค้ดผูกกับ UI ขอเสนอแนวทางดำเนินการใบงาน **DEV-104** ออกเป็น 2 ทางเลือก:

### ทางเลือกที่ A (แนะนำ): `DEV-104 — Thai Planet Placement Manual Diagnostic Script Plan`
* **รายละเอียด**: ออกแบบและจัดทำแบบแผนทดสอบเชิงลึก (Manual Diagnostic Script Plan) เพื่อจัดเตรียมคำสั่งสคริปต์สแกนค่าตัวแปรใน Working Tree เปรียบเทียบกับตาราง Fixture Matrix ให้เป็นระบบ ก่อนจะนำไปผูกโยงเข้าสู่กลไกหลัก
* **เหตุผลที่แนะนำ**: ช่วยขยายความต่อเนื่องในการทดสอบความปลอดภัยของสัญญาข้อมูลโดยไม่มีผลข้างเคียง และไม่พัวพันกับโค้ด UI ใดๆ

### ทางเลือกที่ B: `DEV-104 — Thai Planet Placement Runtime Adapter Integration Plan`
* **รายละเอียด**: จัดทำข้อตกลงและแผนพัฒนาการควบรวมตัวประสานงาน (Orchestrator) เข้าเป็นส่วนหนึ่งของระบบจัดการสถิติกลยุทธ์ส่วนกลาง
* **ข้อจำกัด**: อาจมีความซับซ้อนเชิงลอจิกเนื่องจากระบบแกนคำนวณสากลเดิมและระบบไทยยังไม่มีการสอบทานความแม่นยำข้อมูลนำเข้าจริง
