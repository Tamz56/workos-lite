# QA Real App 100 — Thai Planet Placement Safety Harness QA Record

เอกสารรายงานการประกันคุณภาพและการตรวจสอบความถูกต้องของระบบกักกันความปลอดภัยตำแหน่งดวงดาวไทย (Thai Planet Placement Safety Harness / Contract Verification Layer) เพื่อความมั่นใจว่าข้อมูลจำลองหรือข้อมูลที่ไม่สมบูรณ์จะไม่ส่งผลให้ระบบประมวลผลกลางนำไปใช้วิเคราะห์กลยุทธ์อย่างผิดพลาด

---

## 1. Quality Assurance Metrics (เกณฑ์การวัดผลคุณภาพ)

การประเมินคุณภาพในรอบนี้ครอบคลุมความถูกต้องของสัญญาระบบรันไทม์ (Contract Verification) และมาตรการป้องกันความปลอดภัยทางข้อมูล (Data Safety Guardrails) โดยไม่มีการแก้ไขโค้ดที่รันจริงในระบบ:

| ดัชนีการตรวจสอบ | รายละเอียดความต้องการ | ผลการประเมิน (QA Status) | หมายเหตุเชิงวิชาการ |
|---|---|---|---|
| **Isolated Safety Harness** | ฟังก์ชันประมวลความปลอดภัยต้องแยกอยู่ในไฟล์เดียวและไม่กระทบโครงร่าง Adapter หลัก | **PASS** | ฟังก์ชันทั้งหมดจัดอยู่ใน `astroRealAppThaiPlanetPlacementSafety.ts` อย่างอิสระ |
| **Placeholder / Unavailable Rejection** | ค่า `pending-reference-validation` และ `unavailable` ต้องถูกปฏิเสธ (ถือเป็น non-validating) | **PASS** | `isPendingThaiPlanetPlacementValue` ตรวจจับค่าจำลองและคืนค่าบวกเพื่อคัดกรองออกทันที |
| **Placeholder Reference Handling** | กรณีใช้ Reference Case ที่เป็นค่าจำลอง ต้องคืนค่าความสอดคล้องเป็น 0 และประเมินไม่ได้เป็น 10 | **PASS** | ตรวจสอบผ่านลูปประเมินใน `buildThaiPlanetPlacementSafetySummary` |
| **Diagnostic Fallback** | หากไม่ระบุ Reference Case ระบบต้องทำงานในโหมดวินิจฉัย (Diagnostic) ปราศจากการเทียบเคียง | **PASS** | ตั้งค่า `comparableCount` เป็น 0 และแจ้งเตือนลงในรายการข้อบกพร่อง (issues) |
| **No Real Astrology Calculation** | ห้ามมีลอจิกการคำนวณตำแหน่ง องศา หรือการสอดแทรกตำแหน่งดาวจริงเข้าสู่ระบบ | **PASS** | ไม่มีลอจิกวิถีดาราศาสตร์จริง มีเพียงการจับคู่สัญญาระบบตัวแปร |
| **Zero Side-effects** | ห้ามมีการแก้ไขไฟล์หน้าจอ UI หรือชุดคำสั่งการจัดการ LocalStorage เดิม | **PASS** | ไม่มีการแก้ไขไฟล์ตระกูล `.tsx` หรือคลาสบันทึกข้อมูลใดๆ |

---

## 2. Test Verification Plan & Steps (แผนการทดสอบและการสอบเทียบ)

การตรวจสอบความถูกต้องของระบบกระทำผ่านการประเมินโครงสร้างและพฤติกรรมของฟังก์ชันความปลอดภัยทั้ง 3 ฟังก์ชัน:

### กรณีทดสอบที่ 1: ตรวจจับค่าจำลอง (Placeholder Values Detection)
* **ข้อมูลนำเข้า (Inputs)**: 
  * `value` = `'pending-reference-validation'`
  * `value` = `'unavailable'`
  * `value` = `undefined`
* **ผลลัพธ์คาดหวัง (Expected Output)**: `isPendingThaiPlanetPlacementValue` ต้องส่งคืนค่า `true` ในทุกกรณีข้างต้น และส่งคืน `false` เมื่อมีตัวแปรข้อมูลอื่นปะปน

### กรณีทดสอบที่ 2: การวัดความสอดคล้องของข้อมูล (Comparability Constraint)
* **ข้อมูลนำเข้า (Inputs)**:
  * Runtime Result ที่มี `signRasi` หรือ `degree` เป็น `'pending-reference-validation'` หรือ `'unavailable'`
  * Reference Case ที่มี expected placement ของดาวดวงเดียวกันเป็น `'pending-reference-validation'`
* **ผลลัพธ์คาดหวัง (Expected Output)**: `isThaiPlanetPlacementComparable` ต้องส่งคืนค่า `false` เพื่อห้ามไม่ให้ตัวสแกนนำค่าจำลองไปเปรียบเทียบ

### กรณีทดสอบที่ 3: สรุปผลความปลอดภัยสำหรับกรณีศึกษาจำลอง (Placeholder Reference Summary)
* **ข้อมูลนำเข้า (Inputs)**:
  * `results` = ผลลัพธ์จากการรัน `buildThaiPlanetPlacementStub` (ดาว 10 ดวง มี ID 0-9)
  * `referenceCase` = Reference Case เปล่า/จำลอง (เช่น `validationStatus` เป็น `'pending-reference-validation'`)
* **ผลลัพธ์คาดหวัง (Expected Output)**: `buildThaiPlanetPlacementSafetySummary` ส่งคืนออบเจกต์ที่มีคุณสมบัติดังนี้:
  * `comparableCount` = `0`
  * `notComparableCount` = `10`
  * `validatedCount` = `0`
  * `pendingCount` = `10`
  * `issues` ประกอบด้วยการแจ้งเตือนความปลอดภัยเชิงวินิจฉัย

---

## 3. Engineering Constraints Check (เกณฑ์การจำกัดโครงสร้างทางวิศวกรรม)

* **ห้าม stage / commit โดยไม่ได้รับการอนุมัติ**: ซอร์สโค้ดและรายงานการตรวจสอบนี้จะคงสถานะ Unstaged และ Untracked ใน Working Directory เพื่อรอการพิจารณาสอบทาน
* **การพึ่งพาไลบรารีภายนอก**: ไม่มีการนำเข้าแพ็กเกจหรือไลบรารีเพิ่มเติมใน `package.json`
* **ความสะอาดของรายงาน Lint และกระบวนการ Build**: โค้ดทั้งหมดต้องคอมไพล์ผ่าน Next.js webpack build ได้โดยปราศจากข้อบกพร่องสะสม

---

## 4. Quality Review Logs (บันทึกผลการทดสอบการรันอัตโนมัติ)

*(ผลลัพธ์คำสั่ง ESLint และ Next.js Build จริงจะแสดงอยู่ในรายงานสรุปการทำงานของ Antigravity)*
